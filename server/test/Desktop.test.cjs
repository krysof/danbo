'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  validateHostname, validateApiToken, validateTunnelToken, assertTokensDistinct,
} = require('../desktop/lib/validation.cjs');
const { SecureStore } = require('../desktop/lib/secure-store.cjs');
const { CloudflareManager, mergeIngressConfig } = require('../desktop/lib/cloudflare-manager.cjs');
const { OwnedProcess } = require('../desktop/lib/process-manager.cjs');
const { createAdminServer } = require('../desktop/lib/admin-server.cjs');

function tunnelToken() {
  return Buffer.from(JSON.stringify({ a: 'account', t: '11111111-1111-4111-8111-111111111111', s: 'secret-secret-secret-secret' })).toString('base64');
}
function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`safe:${value}`),
    decryptString: (value) => value.toString().replace(/^safe:/, ''),
  };
}
function jsonResponse(result, status = 200, success = true) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ success, result, errors: success ? [] : [{ message: 'failed' }] }) };
}

describe('Desktop server validation and secure storage', () => {
  it('validates separate token types and full hostnames', () => {
    assert.equal(validateHostname('ONLINE.FF18.COM'), 'online.ff18.com');
    assert.throws(() => validateHostname('https://bad/path'));
    assert.equal(validateApiToken('a'.repeat(40)), 'a'.repeat(40));
    assert.equal(validateTunnelToken(tunnelToken()), tunnelToken());
    assert.throws(() => validateTunnelToken('a'.repeat(80)));
    assert.throws(() => assertTokensDistinct('same', 'same'));
  });

  it('encrypts tokens separately from public settings and persists switches', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eggy-store-'));
    const store = new SecureStore(directory, fakeSafeStorage());
    store.saveSecrets({ apiToken: 'api-secret', tunnelToken: tunnelToken() });
    const settings = store.saveSettings({ serverEnabled: false, tunnelEnabled: true });
    assert.equal(settings.serverEnabled, false);
    assert.equal(settings.tunnelEnabled, true);
    assert.equal(store.getSecret('apiToken'), 'api-secret');
    assert.equal(fs.readFileSync(store.settingsFile, 'utf8').includes('api-secret'), false);
    assert.equal(fs.readFileSync(store.secretsFile, 'utf8').includes('api-secret'), false);
  });

  it('refuses plaintext secret persistence when OS encryption is unavailable', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eggy-store-'));
    const store = new SecureStore(directory, { isEncryptionAvailable: () => false });
    assert.throws(() => store.saveSecrets({ apiToken: 'secret' }), /拒绝/);
  });
});

describe('Cloudflare safe configuration merge', () => {
  it('preserves other hostnames, path, originRequest and unknown fields with catch-all last', () => {
    const original = {
      ingress: [
        { hostname: 'other.example.com', path: '/api/*', service: 'http://localhost:9000', originRequest: { connectTimeout: 12 }, custom: { keep: true } },
        { hostname: 'online.ff18.com', service: 'http://localhost:1111', originRequest: { httpHostHeader: 'old' } },
        { service: 'http_status:404', extra: 'keep' },
      ],
      originRequest: { tcpKeepAlive: 30 },
      'warp-routing': { enabled: true },
      unknown: { nested: 1 },
    };
    const merged = mergeIngressConfig(original, 'online.ff18.com', 'http://localhost:2567', 'online.ff18.com');
    assert.equal(merged.ingress[0].custom.keep, true);
    assert.equal(merged.ingress[0].path, '/api/*');
    assert.equal(merged.ingress[1].originRequest.httpHostHeader, 'old');
    assert.equal(merged.ingress[1].service, 'http://localhost:2567');
    assert.equal(merged.ingress.at(-1).service, 'http_status:404');
    assert.equal(merged.ingress.at(-1).extra, 'keep');
    assert.deepEqual(merged.unknown, { nested: 1 });
    assert.equal(original.ingress[1].service, 'http://localhost:1111');
  });

  it('aborts instead of replacing another project hostname', () => {
    assert.throws(() => mergeIngressConfig({ ingress: [
      { hostname: 'online.ff18.com', service: 'http://localhost:9999' }, { service: 'http_status:404' },
    ] }, 'online.ff18.com', 'http://localhost:2567', ''), /其它/);
  });

  it('performs GET planning before PUT and creates the proxied CNAME', async () => {
    const calls = [];
    const originalConfig = { ingress: [{ hostname: 'keep.ff18.com', path: '/x', service: 'http://localhost:8', originRequest: { noTLSVerify: true } }, { service: 'http_status:404' }], extra: { keep: 1 } };
    const fetch = async (url, options = {}) => {
      const pathname = new URL(url).pathname;
      const method = options.method || 'GET'; calls.push({ pathname, method, body: options.body && JSON.parse(options.body) });
      if (pathname.endsWith('/user/tokens/verify')) return jsonResponse({ status: 'active' });
      if (pathname === '/client/v4/zones') {
        const name = new URL(url).searchParams.get('name');
        return jsonResponse(name === 'ff18.com' ? [{ id: 'zone', name: 'ff18.com', account: { id: 'account' } }] : []);
      }
      if (pathname.endsWith('/cfd_tunnel/tunnel-id') && method === 'GET') return jsonResponse({ id: 'tunnel-id', name: 'eggy-multiplayer', config_src: 'cloudflare' });
      if (pathname.endsWith('/configurations') && method === 'GET') return jsonResponse({ config: originalConfig });
      if (pathname.endsWith('/dns_records') && method === 'GET') return jsonResponse([]);
      if (pathname.endsWith('/configurations') && method === 'PUT') return jsonResponse({ config: calls.at(-1).body.config });
      if (pathname.endsWith('/dns_records') && method === 'POST') return jsonResponse({ id: 'dns' });
      if (pathname.endsWith('/token')) return jsonResponse(tunnelToken());
      throw new Error(`unexpected ${method} ${pathname}`);
    };
    const manager = new CloudflareManager({ fetch });
    const result = await manager.configure({ hostname: 'online.ff18.com', apiToken: 'a'.repeat(40), service: 'http://localhost:2567', tunnelId: 'tunnel-id', tunnelName: 'eggy-multiplayer' });
    assert.equal(result.websocketUrl, 'wss://online.ff18.com');
    const getIndex = calls.findIndex((call) => call.pathname.endsWith('/configurations') && call.method === 'GET');
    const putIndex = calls.findIndex((call) => call.pathname.endsWith('/configurations') && call.method === 'PUT');
    assert.ok(getIndex >= 0 && putIndex > getIndex);
    assert.equal(calls[putIndex].body.config.extra.keep, 1);
    assert.equal(calls[putIndex].body.config.ingress.at(-1).service, 'http_status:404');
    const dnsCreate = calls.find((call) => call.pathname.endsWith('/dns_records') && call.method === 'POST');
    assert.equal(dnsCreate.body.type, 'CNAME');
    assert.equal(dnsCreate.body.proxied, true);
    assert.equal(dnsCreate.body.content, 'tunnel-id.cfargotunnel.com');
  });

  it('never PUTs when the full Tunnel configuration GET fails', async () => {
    const calls = [];
    const fetch = async (url, options = {}) => {
      const pathname = new URL(url).pathname; const method = options.method || 'GET'; calls.push({ pathname, method });
      if (pathname.endsWith('/user/tokens/verify')) return jsonResponse({ status: 'active' });
      if (pathname === '/client/v4/zones') return jsonResponse([{ id: 'zone', name: new URL(url).searchParams.get('name'), account: { id: 'account' } }]);
      if (pathname.endsWith('/cfd_tunnel/tunnel-id')) return jsonResponse({ id: 'tunnel-id', config_src: 'cloudflare' });
      if (pathname.endsWith('/configurations')) return jsonResponse(null, 500, false);
      throw new Error('unexpected request');
    };
    await assert.rejects(() => new CloudflareManager({ fetch }).configure({ hostname: 'online.ff18.com', apiToken: 'a'.repeat(40), service: 'http://localhost:2567', tunnelId: 'tunnel-id' }), (error) => error.code === 'CONFIG_READ_FAILED');
    assert.equal(calls.some((call) => call.method === 'PUT'), false);
  });

  it('updates an existing project CNAME and rolls ingress back if DNS update fails', async () => {
    const calls = [];
    let failDns = false;
    const original = { ingress: [{ service: 'http_status:404' }], marker: 'original' };
    const fetch = async (url, options = {}) => {
      const parsed = new URL(url); const pathname = parsed.pathname; const method = options.method || 'GET';
      calls.push({ pathname, method, body: options.body && JSON.parse(options.body) });
      if (pathname.endsWith('/user/tokens/verify')) return jsonResponse({ status: 'active' });
      if (pathname === '/client/v4/zones') return jsonResponse([{ id: 'zone', name: parsed.searchParams.get('name'), account: { id: 'account' } }]);
      if (pathname.endsWith('/cfd_tunnel/tunnel-id') && method === 'GET') return jsonResponse({ id: 'tunnel-id', name: 'eggy-multiplayer', config_src: 'cloudflare' });
      if (pathname.endsWith('/configurations') && method === 'GET') return jsonResponse({ config: original });
      if (pathname.endsWith('/configurations') && method === 'PUT') return jsonResponse({ config: calls.at(-1).body.config });
      if (pathname.endsWith('/dns_records') && method === 'GET') return jsonResponse([{ id: 'dns-id', name: 'online.ff18.com', type: 'CNAME', content: 'old.cfargotunnel.com', proxied: false }]);
      if (pathname.endsWith('/dns_records/dns-id') && method === 'PUT') return failDns ? jsonResponse(null, 500, false) : jsonResponse({ id: 'dns-id' });
      if (pathname.endsWith('/token')) return jsonResponse(tunnelToken());
      throw new Error(`unexpected ${method} ${pathname}`);
    };
    const manager = new CloudflareManager({ fetch });
    await manager.configure({ hostname: 'online.ff18.com', apiToken: 'a'.repeat(40), service: 'http://localhost:2567', tunnelId: 'tunnel-id', managedHostname: 'online.ff18.com' });
    const dnsUpdate = calls.find((call) => call.pathname.endsWith('/dns_records/dns-id') && call.method === 'PUT');
    assert.equal(dnsUpdate.body.content, 'tunnel-id.cfargotunnel.com');
    assert.equal(dnsUpdate.body.proxied, true);

    calls.length = 0; failDns = true;
    await assert.rejects(() => manager.configure({ hostname: 'online.ff18.com', apiToken: 'a'.repeat(40), service: 'http://localhost:2567', tunnelId: 'tunnel-id', managedHostname: 'online.ff18.com' }), (error) => error.code === 'DNS_UPDATE_FAILED');
    const configPuts = calls.filter((call) => call.pathname.endsWith('/configurations') && call.method === 'PUT');
    assert.equal(configPuts.length, 2, 'DNS failure must trigger one rollback PUT');
    assert.deepEqual(configPuts[1].body.config, original);
  });
});

describe('Owned process and local web administration', () => {
  it('stops only the child process instance it created', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eggy-process-'));
    const children = [];
    const spawnImpl = () => {
      const child = new EventEmitter();
      child.pid = 4242; child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = (signal) => { child.killedWith = signal; setImmediate(() => child.emit('exit', 0, signal)); return true; };
      children.push(child); return child;
    };
    const managed = new OwnedProcess('owned', { runtimeDir: directory, logFile: path.join(directory, 'log.txt'), spawnImpl });
    managed.start('fake.exe', [], {});
    await managed.stop();
    assert.equal(children.length, 1);
    assert.equal(children[0].killedWith, 'SIGTERM');
  });

  it('keeps the admin API loopback-authenticated and never exposes secrets in status', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eggy-admin-'));
    const store = new SecureStore(directory, fakeSafeStorage());
    store.saveSecrets({ apiToken: 'a'.repeat(40), tunnelToken: tunnelToken() });
    const processes = {
      status: () => ({ server: { state: 'stopped', pid: null, lastError: '' }, tunnel: { state: 'stopped', pid: null, lastError: '' }, cloudflared: { path: '', installed: false, download: { state: 'idle', percent: null, error: '' } } }),
      logs: () => ({ server: [], tunnel: [] }), startServer() {}, stopServer: async () => {}, startTunnel() {}, stopTunnel: async () => {}, installCloudflared: async () => '',
    };
    let configureCalls = 0;
    const cloudflare = { configure: async (settings) => { configureCalls += 1; return { hostname: settings.hostname, publicUrl: `https://${settings.hostname}`, accountId: 'a', zoneId: 'z', tunnelId: 't', tunnelName: 'eggy-multiplayer', tunnelToken: tunnelToken() }; } };
    const admin = createAdminServer({ store, processes, cloudflare, staticDir: path.join(__dirname, '..', 'desktop', 'admin'), fetch: async (url) => {
      if (String(url).startsWith('https://play.ff18.com/health')) return { ok: true, status: 200, json: async () => ({ ok: true }) };
      throw new Error('offline');
    } });
    const server = await admin.listen(0); const port = server.address().port;
    try {
      const unauthorized = await fetch(`http://127.0.0.1:${port}/api/status`);
      assert.equal(unauthorized.status, 401);
      const direct = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });
      assert.equal(direct.status, 302);
      assert.equal(direct.headers.get('location'), '/admin');
      assert.match(direct.headers.get('set-cookie'), /^eggy_admin=/);
      const login = await fetch(`http://127.0.0.1:${port}${admin.loginPath}`, { redirect: 'manual' });
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const status = await fetch(`http://127.0.0.1:${port}/api/status`, { headers: { cookie } });
      const payload = await status.json();
      assert.equal(JSON.stringify(payload).includes('aaaaaaaaaaaaaaaaaaaa'), false);
      const noCsrf = await fetch(`http://127.0.0.1:${port}/api/secrets/reveal`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' });
      assert.equal(noCsrf.status, 403);
      const emptyDomain = await fetch(`http://127.0.0.1:${port}/api/settings`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-eggy-csrf': payload.csrfToken }, body: JSON.stringify({ hostname: '', tunnelName: 'eggy-multiplayer', serverPort: 2567, allowedOrigins: 'https://eggy.ff18.com' }) });
      assert.equal(emptyDomain.status, 200);
      assert.equal(configureCalls, 0, 'empty hostname must not configure Cloudflare');
      const changedDomain = await fetch(`http://127.0.0.1:${port}/api/settings`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-eggy-csrf': payload.csrfToken }, body: JSON.stringify({ hostname: 'play.ff18.com', tunnelName: 'eggy-multiplayer', serverPort: 2567, allowedOrigins: 'https://eggy.ff18.com' }) });
      assert.equal(changedDomain.status, 200);
      assert.equal(configureCalls, 1, 'hostname change must reconfigure Cloudflare');
      const publicCheck = await fetch(`http://127.0.0.1:${port}/api/public/check`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-eggy-csrf': payload.csrfToken }, body: '{}' });
      assert.equal(publicCheck.status, 200, 'external availability check must be exposed to the trusted admin session');
      assert.ok(store.loadSettings().lastPublicCheck);
      const logout = await fetch(`http://127.0.0.1:${port}/api/logout`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-eggy-csrf': payload.csrfToken }, body: '{}' });
      assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    } finally { await admin.close(); }
  });
});
