'use strict';

let csrfToken = '';
let lastStatus = null;
let settingsDirty = false;
const $ = (id) => document.getElementById(id);

function notice(message, error = false) {
  const box = $('notice');
  box.textContent = message || '';
  box.className = message ? `notice${error ? ' error' : ''}` : 'notice hidden';
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'x-danbo-csrf': csrfToken } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok || data.ok === false) throw new Error(data.error || `请求失败：HTTP ${response.status}`);
  return data;
}
function value(id) { return $(id).value.trim(); }
function stateText(element, text, online = false, error = false) {
  element.textContent = text;
  element.className = online ? 'state-online' : error ? 'state-error' : '';
}
function fillSettings(settings) {
  // Status refreshes run every 2.5 seconds. Never replace any part of an
  // unfinished form after the user moves focus from one field to another.
  if (settingsDirty) return;
  if (document.activeElement !== $('server-port')) $('server-port').value = settings.serverPort;
  if (document.activeElement !== $('allowed-origins')) $('allowed-origins').value = settings.allowedOrigins;
  if (document.activeElement !== $('domain-prefix')) $('domain-prefix').value = settings.domainPrefix || '';
  if (document.activeElement !== $('zone-domain')) $('zone-domain').value = settings.zoneDomain || '';
  if (document.activeElement !== $('tunnel-name')) $('tunnel-name').value = settings.tunnelName;
  $('local-service').value = `http://localhost:${settings.serverPort}`;
  $('launch-at-login').checked = !!settings.launchAtLogin;
}
function render(data) {
  csrfToken = data.csrfToken;
  lastStatus = data;
  fillSettings(data.settings);
  const serverRunning = data.processes.server.state === 'running';
  const serverReady = serverRunning && data.health.ok;
  const tunnelRunning = data.processes.tunnel.state === 'running';
  stateText($('server-state'), serverReady ? '运行中' : serverRunning ? '正在启动' : '已停止', serverReady, data.processes.server.state === 'error');
  $('server-detail').textContent = serverRunning ? `PID ${data.processes.server.pid} · 127.0.0.1:${data.settings.serverPort}` : `127.0.0.1:${data.settings.serverPort}`;
  stateText($('tunnel-state'), tunnelRunning ? '已运行' : '已停止', tunnelRunning, data.processes.tunnel.state === 'error');
  $('tunnel-detail').textContent = tunnelRunning ? `PID ${data.processes.tunnel.pid}` : (data.processes.tunnel.lastError || '尚未连接');
  $('player-count').textContent = data.health.players;
  $('room-count').textContent = `${data.health.rooms} 个房间`;
  stateText($('domain-state'), data.settings.domainConfigured ? '已配置' : data.settings.hostname ? '等待配置' : '未配置', data.settings.domainConfigured);
  $('domain-detail').textContent = data.settings.hostname || '—';
  const url = data.publicUrl || '';
  $('public-url').textContent = url || '尚未配置域名';
  $('public-url').href = url || '#';
  $('api-saved').textContent = data.secrets.apiTokenSaved ? '已安全保存' : '未保存';
  $('api-saved').className = data.secrets.apiTokenSaved ? 'saved' : '';
  $('tunnel-saved').textContent = data.secrets.tunnelTokenSaved ? '已安全保存' : '未保存';
  $('tunnel-saved').className = data.secrets.tunnelTokenSaved ? 'saved' : '';
  $('cloudflared-path').textContent = data.processes.cloudflared.path || '尚未安装';
  const progress = data.processes.cloudflared.download;
  $('download-progress').value = progress.percent || 0;
  $('server-start').disabled = serverRunning;
  $('server-stop').disabled = !serverRunning;
  $('tunnel-start').disabled = !serverRunning || tunnelRunning;
  $('tunnel-stop').disabled = !tunnelRunning;
  $('overall-dot').className = serverReady && tunnelRunning ? 'online' : '';
  $('overall-text').textContent = serverReady && tunnelRunning ? '公网联机运行中' : serverReady ? '本地服务器运行中' : '服务未就绪';
  if (data.lastOperation.state === 'error') notice(data.lastOperation.message, true);
}
async function refresh() {
  try { render(await api('/api/status')); } catch (error) { notice(error.message, true); }
}
async function action(path, body, success, onSuccess) {
  try {
    notice('正在处理，请稍候…');
    const result = await api(path, { method: 'POST', body });
    if (onSuccess) onSuccess(result);
    notice(success || '操作完成');
    await refresh();
  } catch (error) { notice(error.message, true); }
}

document.querySelectorAll('.reveal').forEach((button) => button.addEventListener('click', () => {
  const input = $(button.dataset.target);
  input.type = input.type === 'password' ? 'text' : 'password';
  button.textContent = input.type === 'password' ? '显示' : '隐藏';
}));
$('save-secrets').addEventListener('click', () => action('/api/secrets', {
  apiToken: value('api-token') || undefined,
  tunnelToken: value('tunnel-token') || undefined,
}, 'Token 已安全保存'));
$('load-secrets').addEventListener('click', async () => {
  try {
    const data = await api('/api/secrets/reveal', { method: 'POST', body: {} });
    $('api-token').value = data.apiToken || '';
    $('tunnel-token').value = data.tunnelToken || '';
    notice('已从系统安全存储读取；离开页面前建议再次隐藏');
  } catch (error) { notice(error.message, true); }
});
$('clear-secrets').addEventListener('click', () => action('/api/secrets', { apiToken: '', tunnelToken: '' }, 'Token 已清除'));
$('server-port').addEventListener('input', () => { settingsDirty = true; });
$('allowed-origins').addEventListener('input', () => { settingsDirty = true; });
$('domain-prefix').addEventListener('input', () => { settingsDirty = true; });
$('zone-domain').addEventListener('input', () => { settingsDirty = true; });
$('tunnel-name').addEventListener('input', () => { settingsDirty = true; });
$('launch-at-login').addEventListener('change', () => { settingsDirty = true; });
$('save-settings').addEventListener('click', () => action('/api/settings', {
  serverPort: Number(value('server-port')),
  allowedOrigins: value('allowed-origins'),
  domainPrefix: value('domain-prefix'),
  zoneDomain: value('zone-domain'),
  tunnelName: value('tunnel-name'),
  launchAtLogin: $('launch-at-login').checked,
}, '设置已保存', () => { settingsDirty = false; }));
$('configure-domain').addEventListener('click', () => action('/api/cloudflare/configure', {}, '域名和 Tunnel 已安全配置'));
$('server-start').addEventListener('click', () => action('/api/server/start', {}, '服务器已启动'));
$('server-stop').addEventListener('click', () => action('/api/server/stop', {}, '服务器已停止'));
$('download-cloudflared').addEventListener('click', () => action('/api/tunnel/download', {}, 'cloudflared 已安装'));
$('tunnel-start').addEventListener('click', () => action('/api/tunnel/start', {}, 'Tunnel 已启动'));
$('tunnel-stop').addEventListener('click', () => action('/api/tunnel/stop', {}, 'Tunnel 已停止'));
$('check-public').addEventListener('click', () => action('/api/public/check', {}, '外网访问正常'));
$('copy-url').addEventListener('click', async () => {
  if (!lastStatus || !lastStatus.publicUrl) return notice('尚未配置外网域名', true);
  try { await navigator.clipboard.writeText(lastStatus.publicUrl); notice('外网地址已复制'); } catch (_) { notice('浏览器拒绝复制，请手动复制', true); }
});
$('quit-app').addEventListener('click', async () => {
  try {
    notice('托盘程序正在退出…');
    await api('/api/app/quit', { method: 'POST', body: {} });
  } catch (error) { notice(error.message, true); }
});
$('logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST', body: {} });
    document.body.innerHTML = '<main class="shell"><section class="panel"><h2>已退出登录</h2><p class="hint">请从 DANBO Server 托盘菜单重新打开管理中心。</p></section></main>';
  } catch (error) { notice(error.message, true); }
});
$('refresh-logs').addEventListener('click', async () => {
  try {
    const data = await api('/api/logs');
    $('server-log').textContent = data.logs.server.join('\n') || '暂无日志';
    $('tunnel-log').textContent = data.logs.tunnel.join('\n') || '暂无日志';
  } catch (error) { notice(error.message, true); }
});

refresh();
setInterval(refresh, 2500);
setInterval(() => $('refresh-logs').click(), 5000);
