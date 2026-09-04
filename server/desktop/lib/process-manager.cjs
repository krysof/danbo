'use strict';

const { EventEmitter } = require('node:events');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

class OwnedProcess extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;
    this.runtimeDir = options.runtimeDir;
    this.logFile = options.logFile;
    this.spawnImpl = options.spawnImpl || spawn;
    this.child = null;
    this.startedAt = null;
    this.lastError = '';
    this.lines = [];
    this.stopping = false;
  }

  status() {
    return {
      state: this.child ? (this.stopping ? 'stopping' : 'running') : (this.lastError ? 'error' : 'stopped'),
      pid: this.child ? this.child.pid : null,
      startedAt: this.startedAt,
      lastError: this.lastError,
    };
  }

  _log(text) {
    const clean = String(text || '').replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
    if (!clean) return;
    const entry = `${new Date().toISOString()} ${clean}`;
    this.lines.push(entry);
    if (this.lines.length > 300) this.lines.splice(0, this.lines.length - 300);
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
    fs.appendFileSync(this.logFile, `${entry}\n`);
    this.emit('change', this.status());
  }

  tail(limit = 120) { return this.lines.slice(-Math.max(1, Math.min(300, limit))); }

  fail(error) {
    this.lastError = error && error.message ? error.message : String(error || '进程启动失败');
    this._log(`[error] ${this.lastError}`);
    return this.status();
  }

  start(command, args, options = {}) {
    if (this.child) return this.status();
    this.lastError = '';
    this.stopping = false;
    fs.mkdirSync(this.runtimeDir, { recursive: true });
    const child = this.spawnImpl(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    this.startedAt = new Date().toISOString();
    fs.writeFileSync(path.join(this.runtimeDir, `${this.name}.pid.json`), JSON.stringify({
      pid: child.pid, startedAt: this.startedAt, executable: command,
    }, null, 2), { mode: 0o600 });
    child.stdout && child.stdout.on('data', (data) => this._log(data.toString()));
    child.stderr && child.stderr.on('data', (data) => this._log(data.toString()));
    child.once('error', (error) => this.fail(error));
    let finalized = false;
    const finalize = (code, signal) => {
      if (finalized) return;
      finalized = true;
      const wasStopping = this.stopping;
      this.child = null;
      this.stopping = false;
      if (!wasStopping && code !== 0 && !this.lastError) this.lastError = `进程异常退出（code=${code}, signal=${signal || 'none'}）`;
      this._log(`[exit] code=${code}, signal=${signal || 'none'}`);
      try { fs.unlinkSync(path.join(this.runtimeDir, `${this.name}.pid.json`)); } catch (_) {}
      this.emit('exit', { code, signal, expected: wasStopping });
    };
    child.once('exit', finalize);
    child.once('close', finalize);
    this._log(`[start] pid=${child.pid}`);
    return this.status();
  }

  async stop(timeout = 5000) {
    const child = this.child;
    if (!child) return this.status();
    this.stopping = true;
    this.emit('change', this.status());
    await new Promise((resolve) => {
      let finished = false;
      const done = () => { if (!finished) { finished = true; resolve(); } };
      child.once('exit', done);
      child.once('close', done);
      child.kill('SIGTERM');
      const timer = setTimeout(() => {
        if (this.child === child) child.kill('SIGKILL');
        done();
      }, timeout);
      if (timer.unref) timer.unref();
    });
    return this.status();
  }
}

function findOnPath(executable) {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(command, [executable], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? String(result.stdout).split(/\r?\n/).find(Boolean) || '' : '';
}

async function downloadCloudflared(destination, fetchImpl = global.fetch, onProgress = () => {}) {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  const suffix = process.platform === 'win32' ? `windows-${arch}.exe` : `${process.platform}-${arch}`;
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-${suffix}`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.download`;
  const response = await fetchImpl(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`cloudflared 下载失败：HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  let received = 0;
  const file = fs.createWriteStream(temporary, { mode: 0o700 });
  const { Readable, Transform } = require('node:stream');
  const progress = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      onProgress({ received, total, percent: total ? Math.round(received / total * 100) : null });
      callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body), progress, file);
    fs.chmodSync(temporary, 0o700);
    fs.renameSync(temporary, destination);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch (_) {}
    throw error;
  }
  return destination;
}

class ProcessManager extends EventEmitter {
  constructor(options) {
    super();
    this.userData = options.userData;
    this.serverRoot = options.serverRoot;
    this.serverEntry = options.serverEntry;
    this.electronExecutable = options.electronExecutable || process.execPath;
    this.isElectron = !!options.isElectron;
    this.fetch = options.fetch || global.fetch;
    this.systemCloudflared = findOnPath(process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    const runtime = path.join(this.userData, 'runtime');
    const logs = path.join(this.userData, 'logs');
    this.server = new OwnedProcess('server', { runtimeDir: runtime, logFile: path.join(logs, 'server.log'), spawnImpl: options.spawnImpl });
    this.tunnel = new OwnedProcess('tunnel', { runtimeDir: runtime, logFile: path.join(logs, 'tunnel.log'), spawnImpl: options.spawnImpl });
    this.downloadState = { state: 'idle', percent: null, error: '' };
    for (const process of [this.server, this.tunnel]) process.on('change', () => this.emit('change'));
  }

  status(settings) {
    return {
      server: this.server.status(),
      tunnel: this.tunnel.status(),
      cloudflared: {
        path: this.resolveCloudflared(settings),
        installed: !!this.resolveCloudflared(settings),
        download: this.downloadState,
      },
    };
  }

  resolveCloudflared(settings) {
    const names = process.platform === 'win32' ? ['cloudflared.exe'] : ['cloudflared'];
    const bundled = path.join(this.userData, 'bin', names[0]);
    const candidates = [settings.cloudflaredPath, bundled, this.systemCloudflared].filter(Boolean);
    return candidates.find((candidate) => { try { return fs.statSync(candidate).isFile(); } catch (_) { return false; } }) || '';
  }

  startServer(settings) {
    const env = {
      ...process.env,
      PORT: String(settings.serverPort),
      ALLOWED_ORIGINS: settings.allowedOrigins,
    };
    if (this.isElectron) env.ELECTRON_RUN_AS_NODE = '1';
    return this.server.start(this.electronExecutable, [this.serverEntry], { cwd: this.serverRoot, env });
  }

  async stopServer() {
    await this.stopTunnel();
    return this.server.stop();
  }

  startTunnel(settings, tunnelToken) {
    if (!this.server.child) throw new Error('请先启动联机服务器');
    const executable = this.resolveCloudflared(settings);
    if (!executable) throw new Error('尚未安装 cloudflared');
    if (!tunnelToken) throw new Error('尚未保存 Tunnel Token');
    return this.tunnel.start(executable, ['tunnel', '--no-autoupdate', '--loglevel', 'info', 'run'], {
      cwd: this.userData,
      env: { ...process.env, TUNNEL_TOKEN: tunnelToken },
    });
  }

  stopTunnel() { return this.tunnel.stop(); }

  async installCloudflared(settings) {
    if (this.downloadState.state === 'downloading') throw new Error('cloudflared 正在下载');
    const destination = path.join(this.userData, 'bin', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    this.downloadState = { state: 'downloading', percent: 0, error: '' };
    this.emit('change');
    try {
      await downloadCloudflared(destination, this.fetch, (progress) => {
        this.downloadState = { state: 'downloading', percent: progress.percent, error: '' };
        this.emit('change');
      });
      this.downloadState = { state: 'ready', percent: 100, error: '' };
      this.emit('change');
      return destination;
    } catch (error) {
      this.downloadState = { state: 'error', percent: null, error: error.message };
      this.emit('change');
      throw error;
    }
  }

  logs() { return { server: this.server.tail(), tunnel: this.tunnel.tail() }; }
  async shutdown() { await this.stopTunnel(); await this.server.stop(); }
}

module.exports = { OwnedProcess, ProcessManager, downloadCloudflared, findOnPath };
