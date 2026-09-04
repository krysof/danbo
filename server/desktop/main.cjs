'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app, Menu, Tray, nativeImage, safeStorage, shell } = require('electron');
const { SecureStore } = require('./lib/secure-store.cjs');
const { CloudflareManager } = require('./lib/cloudflare-manager.cjs');
const { ProcessManager } = require('./lib/process-manager.cjs');
const { createAdminServer } = require('./lib/admin-server.cjs');

if (process.env.DANBO_TEST_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.DANBO_TEST_USER_DATA));
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();

let tray = null;
let admin = null;
let store = null;
let processes = null;
let quitting = false;
let shutdownFinished = false;
const recovery = {
  server: { timer: null, attempts: 0 },
  tunnel: { timer: null, attempts: 0 },
};

function markFailure(process, error) {
  process.fail(error);
  updateTray();
}

function scheduleRecovery(kind, expected) {
  if (expected || quitting || !store || !processes) {
    recovery[kind].attempts = 0;
    return;
  }
  const settings = store.loadSettings();
  const enabled = kind === 'server' ? settings.serverEnabled : settings.tunnelEnabled;
  if (!enabled) return;
  const slot = recovery[kind];
  clearTimeout(slot.timer);
  const delay = Math.min(60000, 3000 * (2 ** slot.attempts));
  slot.attempts += 1;
  slot.timer = setTimeout(() => {
    slot.timer = null;
    if (quitting) return;
    const latest = store.loadSettings();
    const stillEnabled = kind === 'server' ? latest.serverEnabled : latest.tunnelEnabled;
    if (!stillEnabled) return;
    try {
      if (kind === 'server') processes.startServer(latest);
      else processes.startTunnel(latest, store.getSecret('tunnelToken'));
      const child = processes[kind].child;
      setTimeout(() => { if (processes[kind].child === child) slot.attempts = 0; }, 60000).unref();
    } catch (error) {
      markFailure(processes[kind], error);
    }
  }, delay);
  slot.timer.unref();
}

function openAdmin() {
  if (!admin || !store) return;
  const port = store.loadSettings().adminPort;
  shell.openExternal(`http://127.0.0.1:${port}${admin.loginPath}`);
}

function updateTray() {
  if (!tray || !store || !processes) return;
  const settings = store.loadSettings();
  const state = processes.status(settings);
  const serverRunning = state.server.state === 'running';
  const tunnelRunning = state.tunnel.state === 'running';
  tray.setToolTip(`DANBO Server · ${serverRunning ? '服务器运行中' : '服务器已停止'} · ${tunnelRunning ? '外网已连接' : 'Tunnel 已停止'}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开 Web 管理中心', click: openAdmin },
    { type: 'separator' },
    {
      label: serverRunning ? '停止联机服务器' : '启动联机服务器',
      click: async () => {
        try {
          if (serverRunning) {
            store.saveSettings({ serverEnabled: false, tunnelEnabled: false });
            await processes.stopServer();
          } else {
            const next = store.saveSettings({ serverEnabled: true });
            processes.startServer(next);
          }
        } catch (error) { markFailure(processes.server, error); openAdmin(); }
        updateTray();
      },
    },
    {
      label: tunnelRunning ? '停止 Cloudflare Tunnel' : '启动 Cloudflare Tunnel',
      enabled: serverRunning,
      click: async () => {
        try {
          if (tunnelRunning) {
            store.saveSettings({ tunnelEnabled: false }); await processes.stopTunnel();
          } else {
            processes.startTunnel(settings, store.getSecret('tunnelToken')); store.saveSettings({ tunnelEnabled: true });
          }
        } catch (error) { markFailure(processes.tunnel, error); openAdmin(); }
        updateTray();
      },
    },
    { type: 'separator' },
    { label: '退出 DANBO Server', click: () => app.quit() },
  ]));
}

async function bootstrap() {
  app.setAppUserModelId('com.ff18.danbo.server');
  const appPath = app.getAppPath();
  // The game server is a real child process rather than code hosted inside the
  // tray process. Packaged builds therefore execute the unpacked application
  // tree: an .asar archive cannot be used as a child process working directory.
  const serverRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : appPath;
  const userData = app.getPath('userData');
  store = new SecureStore(userData, safeStorage);
  const settings = store.loadSettings();
  processes = new ProcessManager({
    userData,
    serverRoot,
    serverEntry: path.join(serverRoot, 'build', 'index.js'),
    electronExecutable: process.execPath,
    isElectron: true,
  });
  processes.on('change', updateTray);
  processes.server.on('exit', ({ expected }) => scheduleRecovery('server', expected));
  processes.tunnel.on('exit', ({ expected }) => scheduleRecovery('tunnel', expected));
  const cloudflare = new CloudflareManager();
  admin = createAdminServer({
    store,
    processes,
    cloudflare,
    staticDir: path.join(__dirname, 'admin'),
    onStateChange: updateTray,
    onLaunchAtLogin: (enabled) => app.setLoginItemSettings({ openAtLogin: !!enabled, args: ['--hidden'] }),
    onQuit: () => app.quit(),
  });
  await admin.listen(settings.adminPort);
  // Explicit opt-in hook used only by the packaged smoke test. Production
  // launches never write the one-time tray login URL to disk.
  if (process.env.DANBO_TEST_ACCESS_FILE) {
    fs.writeFileSync(process.env.DANBO_TEST_ACCESS_FILE, admin.loginPath, { mode: 0o600 });
  }

  const trayIconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'tray-icon.png')
    : path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(trayIconPath);
  if (icon.isEmpty()) icon = await app.getFileIcon(process.execPath, { size: 'small' });
  if (icon.isEmpty()) throw new Error(`无法加载托盘图标：${trayIconPath}`);
  icon = icon.resize({ width: 24, height: 24, quality: 'best' });
  tray = new Tray(icon);
  tray.on('click', openAdmin);
  tray.on('double-click', openAdmin);
  updateTray();

  if (settings.serverEnabled) {
    try { processes.startServer(settings); } catch (error) { markFailure(processes.server, error); }
  }
  if (settings.tunnelEnabled) {
    setTimeout(() => {
      try { processes.startTunnel(store.loadSettings(), store.getSecret('tunnelToken')); }
      catch (error) { markFailure(processes.tunnel, error); }
    }, 1200);
  }
  if (!process.argv.includes('--hidden')) openAdmin();
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error(error);
  app.quit();
});
app.on('second-instance', openAdmin);
app.on('window-all-closed', () => {});
app.on('before-quit', (event) => {
  if (shutdownFinished) return;
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  for (const slot of Object.values(recovery)) clearTimeout(slot.timer);
  Promise.resolve()
    .then(() => admin && admin.close())
    .then(() => processes && processes.shutdown())
    .catch(() => {})
    .finally(() => { shutdownFinished = true; app.quit(); });
});
