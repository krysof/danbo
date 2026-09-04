'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const {
  validateHostname, validatePort, validateApiToken, validateTunnelToken, assertTokensDistinct,
} = require('./validation.cjs');

function loopback(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}
function parseCookies(value = '') {
  return Object.fromEntries(value.split(';').map((part) => part.trim().split(/=(.*)/s)).filter((entry) => entry[0]).map(([key, val]) => [key, decodeURIComponent(val || '')]));
}
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}
function cleanTunnelName(value) {
  const name = String(value || '').trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,62}$/.test(name)) throw new Error('Tunnel 名称格式不正确');
  return name;
}

function createAdminServer(options) {
  const store = options.store;
  const processes = options.processes;
  const cloudflare = options.cloudflare;
  const staticDir = options.staticDir;
  const fetchImpl = options.fetch || global.fetch;
  const onStateChange = options.onStateChange || (() => {});
  const onLaunchAtLogin = options.onLaunchAtLogin || (() => {});
  const onQuit = options.onQuit || (() => {});
  const accessToken = crypto.randomBytes(32).toString('hex');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  let lastOperation = { state: 'idle', message: '', at: '' };
  let lastHealth = { ok: false, rooms: 0, players: 0, checkedAt: '' };
  let httpServer = null;

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const hostname = String(req.headers.host || '').split(':')[0].replace(/^\[|\]$/g, '');
    if (!loopback(req.socket.remoteAddress) || !['127.0.0.1', 'localhost'].includes(hostname)) return res.status(403).send('Local access only');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });
  function issueSession(res, location = '/admin') {
    res.setHeader('Set-Cookie', `eggy_admin=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
    res.redirect(302, location);
  }
  // The control server is bound to loopback and rejects non-local Host headers.
  // Allow a local browser to establish the same protected cookie session even
  // when Windows hides or suppresses the tray icon.
  app.get('/', (_req, res) => issueSession(res));
  app.get(`/login/${accessToken}`, (req, res) => {
    issueSession(res);
  });
  app.use((req, res, next) => {
    if (parseCookies(req.headers.cookie).eggy_admin !== sessionToken) return res.status(401).send('请从 EGGY Server 托盘菜单打开管理页面');
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/assets', express.static(staticDir, { fallthrough: false, etag: false, maxAge: 0 }));

  function requireCsrf(req, res, next) {
    if (req.get('x-eggy-csrf') !== csrfToken) return res.status(403).json({ ok: false, error: '安全校验失败，请重新打开管理页面' });
    next();
  }
  app.use('/api', (req, res, next) => req.method === 'GET' ? next() : requireCsrf(req, res, next));

  async function localHealth(settings) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetchImpl(`http://127.0.0.1:${settings.serverPort}/health`, { signal: controller.signal, cache: 'no-store' });
      const data = response.ok ? await response.json() : {};
      lastHealth = {
        ok: response.ok && data.ok === true,
        rooms: Number(data.rooms) || 0,
        players: Number(data.players) || 0,
        checkedAt: new Date().toISOString(),
      };
    } catch (_) {
      lastHealth = { ok: false, rooms: 0, players: 0, checkedAt: new Date().toISOString() };
    } finally { clearTimeout(timeout); }
    return lastHealth;
  }

  async function statusPayload() {
    const settings = store.loadSettings();
    const processStatus = processes.status(settings);
    if (processStatus.server.state === 'running') await localHealth(settings);
    else lastHealth = { ok: false, rooms: 0, players: 0, checkedAt: new Date().toISOString() };
    return {
      ok: true,
      csrfToken,
      settings,
      secrets: store.secretStatus(),
      encryptionAvailable: store.encryptionAvailable(),
      processes: processStatus,
      health: lastHealth,
      lastOperation,
      publicUrl: settings.hostname ? `https://${settings.hostname}` : '',
      websocketUrl: settings.hostname ? `wss://${settings.hostname}` : '',
    };
  }

  async function configureDomain(settingsOverride = null) {
    const settings = settingsOverride || store.loadSettings();
    if (!settings.hostname) return { skipped: true, reason: '域名为空，未执行配置' };
    const apiToken = store.getSecret('apiToken');
    if (!apiToken) throw new Error('请先保存 Cloudflare API Token');
    lastOperation = { state: 'working', message: '正在安全读取并合并 Cloudflare 配置…', at: new Date().toISOString() };
    onStateChange();
    try {
      const result = await cloudflare.configure({
        hostname: settings.hostname,
        service: `http://localhost:${settings.serverPort}`,
        apiToken,
        tunnelName: settings.tunnelName,
        tunnelId: settings.tunnelId,
        managedHostname: settings.managedHostname,
      });
      if (result.tunnelToken) store.saveSecrets({ tunnelToken: validateTunnelToken(result.tunnelToken) });
      const next = store.saveSettings({
        ...settings,
        accountId: result.accountId,
        zoneId: result.zoneId,
        tunnelId: result.tunnelId,
        managedHostname: result.hostname,
        domainConfigured: true,
      });
      lastOperation = { state: 'success', message: `域名已配置：${result.publicUrl}`, at: new Date().toISOString() };
      onStateChange();
      return { result, settings: next };
    } catch (error) {
      lastOperation = { state: 'error', message: error.message, code: error.code || 'CONFIG_FAILED', detail: error.detail || '', at: new Date().toISOString() };
      onStateChange();
      throw error;
    }
  }

  app.get('/admin', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  app.get('/api/status', asyncRoute(async (_req, res) => res.json(await statusPayload())));
  app.get('/api/logs', (_req, res) => res.json({ ok: true, logs: processes.logs() }));
  app.post('/api/secrets', asyncRoute(async (req, res) => {
    const currentApi = store.getSecret('apiToken');
    const currentTunnel = store.getSecret('tunnelToken');
    const apiToken = req.body.apiToken === undefined ? currentApi : (req.body.apiToken ? validateApiToken(req.body.apiToken) : '');
    const tunnelToken = req.body.tunnelToken === undefined ? currentTunnel : (req.body.tunnelToken ? validateTunnelToken(req.body.tunnelToken) : '');
    assertTokensDistinct(apiToken, tunnelToken);
    store.saveSecrets({ apiToken, tunnelToken });
    lastOperation = { state: 'success', message: 'Token 已保存到系统安全存储', at: new Date().toISOString() };
    res.json({ ok: true, secrets: store.secretStatus() });
  }));
  app.post('/api/secrets/reveal', (_req, res) => res.json({
    ok: true,
    apiToken: store.getSecret('apiToken'),
    tunnelToken: store.getSecret('tunnelToken'),
  }));
  app.post('/api/settings', asyncRoute(async (req, res) => {
    const previous = store.loadSettings();
    const candidate = {
      ...previous,
      hostname: validateHostname(req.body.hostname, true),
      tunnelName: cleanTunnelName(req.body.tunnelName || previous.tunnelName),
      serverPort: validatePort(req.body.serverPort === undefined ? previous.serverPort : req.body.serverPort, '服务器端口'),
      allowedOrigins: String(req.body.allowedOrigins || previous.allowedOrigins).trim(),
      launchAtLogin: !!req.body.launchAtLogin,
    };
    if (!candidate.allowedOrigins) throw new Error('必须填写允许访问的游戏网页 Origin');
    const domainChanged = candidate.hostname !== previous.hostname || candidate.tunnelName !== previous.tunnelName || candidate.serverPort !== previous.serverPort;
    let saved;
    if (domainChanged && candidate.hostname) saved = (await configureDomain(candidate)).settings;
    else saved = store.saveSettings({ ...candidate, domainConfigured: candidate.hostname ? previous.domainConfigured : false });
    onLaunchAtLogin(saved.launchAtLogin);
    onStateChange();
    res.json({ ok: true, settings: saved, domainReconfigured: domainChanged && !!candidate.hostname });
  }));
  app.post('/api/cloudflare/configure', asyncRoute(async (_req, res) => res.json({ ok: true, ...(await configureDomain()) })));
  app.post('/api/server/start', asyncRoute(async (_req, res) => {
    const settings = store.saveSettings({ serverEnabled: true });
    const result = processes.startServer(settings);
    lastOperation = { state: 'success', message: '联机服务器已启动', at: new Date().toISOString() };
    onStateChange(); res.json({ ok: true, result });
  }));
  app.post('/api/server/stop', asyncRoute(async (_req, res) => {
    await processes.stopServer();
    store.saveSettings({ serverEnabled: false, tunnelEnabled: false });
    lastOperation = { state: 'success', message: '联机服务器已停止', at: new Date().toISOString() };
    onStateChange(); res.json({ ok: true });
  }));
  app.post('/api/tunnel/download', asyncRoute(async (_req, res) => {
    const destination = await processes.installCloudflared(store.loadSettings());
    store.saveSettings({ cloudflaredPath: destination });
    lastOperation = { state: 'success', message: 'cloudflared 已安装', at: new Date().toISOString() };
    onStateChange(); res.json({ ok: true, path: destination });
  }));
  app.post('/api/tunnel/start', asyncRoute(async (_req, res) => {
    const settings = store.loadSettings();
    const result = processes.startTunnel(settings, store.getSecret('tunnelToken'));
    store.saveSettings({ tunnelEnabled: true });
    lastOperation = { state: 'success', message: 'Cloudflare Tunnel 已启动', at: new Date().toISOString() };
    onStateChange(); res.json({ ok: true, result });
  }));
  app.post('/api/tunnel/stop', asyncRoute(async (_req, res) => {
    await processes.stopTunnel(); store.saveSettings({ tunnelEnabled: false });
    lastOperation = { state: 'success', message: 'Cloudflare Tunnel 已停止', at: new Date().toISOString() };
    onStateChange(); res.json({ ok: true });
  }));
  app.post('/api/public/check', asyncRoute(async (_req, res) => {
    const settings = store.loadSettings();
    if (!settings.hostname) throw new Error('尚未设置外网域名');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchImpl(`https://${settings.hostname}/health?check=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
      const data = response.ok ? await response.json() : {};
      if (!response.ok || data.ok !== true) throw new Error(`外网返回 HTTP ${response.status}`);
      store.saveSettings({ lastPublicCheck: new Date().toISOString() });
      lastOperation = { state: 'success', message: '外网访问正常', at: new Date().toISOString() };
      res.json({ ok: true, data });
    } catch (error) {
      lastOperation = { state: 'error', message: `外网访问失败：${error.name === 'AbortError' ? '连接超时' : error.message}`, at: new Date().toISOString() };
      throw new Error(lastOperation.message);
    } finally { clearTimeout(timeout); onStateChange(); }
  }));
  app.post('/api/app/quit', (_req, res) => {
    res.json({ ok: true });
    setTimeout(onQuit, 100);
  });
  app.post('/api/logout', (_req, res) => {
    res.setHeader('Set-Cookie', 'eggy_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  app.use((error, _req, res, _next) => {
    const status = error.code === 'API_PERMISSION_DENIED' ? 403 : 400;
    res.status(status).json({ ok: false, error: error.message || '操作失败', code: error.code || 'ERROR', detail: error.detail || '' });
  });

  return {
    accessToken,
    loginPath: `/login/${accessToken}`,
    listen(port) {
      return new Promise((resolve, reject) => {
        httpServer = app.listen(port, '127.0.0.1', () => resolve(httpServer));
        httpServer.once('error', reject);
      });
    },
    close() { return new Promise((resolve) => httpServer ? httpServer.close(resolve) : resolve()); },
    app,
  };
}

module.exports = { createAdminServer, loopback, parseCookies, cleanTunnelName };
