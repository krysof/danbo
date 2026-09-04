'use strict';

function normalizeHostname(value) {
  return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function validateHostname(value, allowEmpty = true) {
  const hostname = normalizeHostname(value);
  if (!hostname && allowEmpty) return '';
  if (!hostname || hostname.length > 253 || hostname.includes('/') || hostname.includes(':')) {
    throw new Error('请输入完整域名，例如 server.example.com');
  }
  const labels = hostname.split('.');
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error('域名格式不正确');
  }
  return hostname;
}

function validateDomainPrefix(value, allowEmpty = true) {
  const prefix = String(value || '').trim().toLowerCase();
  if (!prefix && allowEmpty) return '';
  if (!prefix || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(prefix)) {
    throw new Error('域名前缀格式不正确，例如 danbo');
  }
  return prefix;
}

function validatePort(value, name = '端口') {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name}必须是 1-65535 的整数`);
  return port;
}

function validateApiToken(value) {
  const token = String(value || '').trim();
  if (token.length < 20 || token.length > 512 || /\s/.test(token)) throw new Error('Cloudflare API Token 格式不正确');
  return token;
}

function decodeTunnelToken(token) {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
}

function validateTunnelToken(value) {
  const token = String(value || '').trim();
  const decoded = decodeTunnelToken(token);
  const knownShape = decoded && typeof decoded === 'object' &&
    (decoded.a || decoded.accountTag || decoded.AccountTag) &&
    (decoded.t || decoded.tunnelID || decoded.TunnelID) &&
    (decoded.s || decoded.tunnelSecret || decoded.TunnelSecret);
  if (token.length < 50 || token.length > 4096 || /\s/.test(token) || !token.startsWith('eyJ') || !knownShape) {
    throw new Error('Tunnel Token 格式不正确，应使用 Cloudflare “运行连接器”提供的 eyJ… Token');
  }
  return token;
}

function assertTokensDistinct(apiToken, tunnelToken) {
  if (apiToken && tunnelToken && apiToken === tunnelToken) throw new Error('API Token 与 Tunnel Token 类型不同，禁止混用');
}

module.exports = {
  normalizeHostname,
  validateHostname,
  validateDomainPrefix,
  validatePort,
  validateApiToken,
  validateTunnelToken,
  assertTokensDistinct,
};
