'use strict';

const crypto = require('node:crypto');
const { validateHostname, validateApiToken } = require('./validation.cjs');

const API_ROOT = 'https://api.cloudflare.com/client/v4';

class CloudflareError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'CloudflareError';
    this.code = code;
    this.detail = detail || '';
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isCatchAll(rule) {
  return rule && /^http_status:\d+$/i.test(String(rule.service || '')) && !rule.hostname && !rule.path;
}

function mergeIngressConfig(originalConfig, hostname, service, managedHostname = '') {
  const config = clone(originalConfig || {});
  const ingress = Array.isArray(config.ingress) ? config.ingress.map(clone) : [];
  const catchAll = ingress.find(isCatchAll) || { service: 'http_status:404' };
  const normal = ingress.filter((rule) => !isCatchAll(rule));
  const exactGeneral = normal.filter((rule) => String(rule.hostname || '').toLowerCase() === hostname && !rule.path);
  if (exactGeneral.length > 1) {
    throw new CloudflareError('INGRESS_CONFLICT', '域名存在多条无 path 的 ingress，已中止以避免覆盖');
  }
  if (exactGeneral.length === 1) {
    const current = exactGeneral[0];
    if (current.service !== service && managedHostname !== hostname) {
      throw new CloudflareError('INGRESS_CONFLICT', '该域名已由其它 ingress 服务使用，已中止操作');
    }
    current.service = service;
  } else {
    normal.push({ hostname, service });
  }
  config.ingress = [...normal, catchAll];
  return config;
}

function zoneCandidates(hostname) {
  const labels = hostname.split('.');
  const values = [];
  for (let index = 0; index < labels.length - 1; index += 1) values.push(labels.slice(index).join('.'));
  return values;
}

class CloudflareManager {
  constructor(options = {}) {
    this.fetch = options.fetch || global.fetch;
    this.apiRoot = options.apiRoot || API_ROOT;
  }

  async request(path, token, options = {}) {
    const response = await this.fetch(`${this.apiRoot}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
    let payload;
    try { payload = await response.json(); } catch (_) { payload = null; }
    if (!response.ok || !payload || payload.success === false) {
      const detail = payload && Array.isArray(payload.errors) ? payload.errors.map((item) => item.message).join('; ') : `HTTP ${response.status}`;
      const code = response.status === 403 ? 'API_PERMISSION_DENIED' : 'CLOUDFLARE_API_ERROR';
      throw new CloudflareError(code, response.status === 403 ? 'Cloudflare API 权限不足' : 'Cloudflare API 请求失败', detail);
    }
    return payload.result;
  }

  async verifyApiToken(apiToken) {
    validateApiToken(apiToken);
    const result = await this.request('/user/tokens/verify', apiToken);
    if (!result || result.status !== 'active') throw new CloudflareError('TOKEN_INVALID', 'Cloudflare API Token 无效');
    return result;
  }

  async findZone(hostname, apiToken) {
    for (const candidate of zoneCandidates(hostname)) {
      const zones = await this.request(`/zones?name=${encodeURIComponent(candidate)}&status=active&per_page=50`, apiToken);
      const exact = Array.isArray(zones) ? zones.find((zone) => zone.name === candidate) : null;
      if (exact) return exact;
    }
    throw new CloudflareError('ZONE_NOT_FOUND', '找不到该域名所属的 Cloudflare Zone');
  }

  async selectTunnel({ apiToken, accountId, tunnelId, tunnelName }) {
    if (tunnelId) {
      const selected = await this.request(`/accounts/${accountId}/cfd_tunnel/${encodeURIComponent(tunnelId)}`, apiToken);
      if (selected.config_src !== 'cloudflare') throw new CloudflareError('TUNNEL_CONFIG_SOURCE', '所选 Tunnel 不是远程托管配置');
      return selected;
    }
    const tunnels = await this.request(`/accounts/${accountId}/cfd_tunnel?is_deleted=false&name=${encodeURIComponent(tunnelName)}`, apiToken);
    const matches = (Array.isArray(tunnels) ? tunnels : []).filter((item) => item.name === tunnelName);
    if (matches.length > 1) throw new CloudflareError('TUNNEL_CONFLICT', '发现多个同名 Tunnel，请使用独立 Tunnel 后重试');
    if (matches.length === 1) {
      if (matches[0].config_src !== 'cloudflare') throw new CloudflareError('TUNNEL_CONFIG_SOURCE', '同名 Tunnel 不是远程托管配置');
      return matches[0];
    }
    return this.request(`/accounts/${accountId}/cfd_tunnel`, apiToken, {
      method: 'POST',
      body: {
        name: tunnelName,
        config_src: 'cloudflare',
        tunnel_secret: crypto.randomBytes(32).toString('base64'),
      },
    });
  }

  async inspectDns(zoneId, hostname, apiToken) {
    const records = await this.request(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}&per_page=100`, apiToken);
    if (!Array.isArray(records)) return [];
    return records.filter((record) => String(record.name || '').toLowerCase() === hostname);
  }

  async configure(options) {
    const hostname = validateHostname(options.hostname, false);
    const apiToken = validateApiToken(options.apiToken);
    const service = String(options.service || 'http://localhost:2567');
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(service)) {
      throw new CloudflareError('LOCAL_SERVICE_INVALID', 'Tunnel 本地服务地址必须是 localhost 或 127.0.0.1');
    }

    await this.verifyApiToken(apiToken);
    const zone = await this.findZone(hostname, apiToken);
    const accountId = zone.account && zone.account.id;
    if (!accountId) throw new CloudflareError('ACCOUNT_NOT_FOUND', 'Zone 未返回 Cloudflare Account ID');
    const tunnel = await this.selectTunnel({
      apiToken,
      accountId,
      tunnelId: options.tunnelId,
      tunnelName: options.tunnelName || 'danbo-multiplayer',
    });
    const tunnelId = tunnel.id;
    if (!tunnelId) throw new CloudflareError('TUNNEL_INVALID', 'Cloudflare 未返回 Tunnel ID');

    let configurationResult;
    try {
      configurationResult = await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, apiToken);
    } catch (error) {
      throw new CloudflareError('CONFIG_READ_FAILED', 'Tunnel 配置读取失败；为避免覆盖其它服务，已中止操作', error.message);
    }
    if (!configurationResult || !configurationResult.config || typeof configurationResult.config !== 'object' ||
        (configurationResult.config.ingress !== undefined && !Array.isArray(configurationResult.config.ingress))) {
      throw new CloudflareError('CONFIG_READ_FAILED', 'Tunnel 返回的完整配置无效；为避免覆盖其它服务，已中止操作');
    }

    const originalConfig = clone(configurationResult.config);
    const mergedConfig = mergeIngressConfig(originalConfig, hostname, service, options.managedHostname || '');
    const existingDns = await this.inspectDns(zone.id, hostname, apiToken);
    if (existingDns.length > 1) throw new CloudflareError('DNS_CONFLICT', '该域名存在多条 DNS 记录，已中止操作');
    const target = `${tunnelId}.cfargotunnel.com`;
    const currentDns = existingDns[0];
    if (currentDns && currentDns.type !== 'CNAME') throw new CloudflareError('DNS_CONFLICT', '该域名已有非 CNAME 记录，已中止操作');
    if (currentDns && currentDns.content !== target && options.managedHostname !== hostname) {
      throw new CloudflareError('DNS_CONFLICT', '该域名已指向其它服务，已中止操作');
    }

    await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, apiToken, {
      method: 'PUT', body: { config: mergedConfig },
    });
    try {
      const record = {
        type: 'CNAME', name: hostname, content: target, ttl: 1, proxied: true,
        comment: currentDns && currentDns.comment ? currentDns.comment : 'Managed by DANBO Server',
      };
      if (currentDns) {
        await this.request(`/zones/${zone.id}/dns_records/${currentDns.id}`, apiToken, { method: 'PUT', body: record });
      } else {
        await this.request(`/zones/${zone.id}/dns_records`, apiToken, { method: 'POST', body: record });
      }
    } catch (dnsError) {
      try {
        await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, apiToken, {
          method: 'PUT', body: { config: originalConfig },
        });
      } catch (rollbackError) {
        throw new CloudflareError('ROLLBACK_FAILED', 'DNS 配置失败，且 Tunnel 配置回滚失败；请立即检查 Cloudflare 控制台', `${dnsError.message}; ${rollbackError.message}`);
      }
      throw new CloudflareError('DNS_UPDATE_FAILED', 'DNS 配置失败，Tunnel ingress 已安全回滚', dnsError.message);
    }

    const tunnelToken = await this.request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`, apiToken);
    return {
      hostname,
      publicUrl: `https://${hostname}`,
      websocketUrl: `wss://${hostname}`,
      accountId,
      zoneId: zone.id,
      zoneName: zone.name,
      tunnelId,
      tunnelName: tunnel.name,
      tunnelToken: typeof tunnelToken === 'string' ? tunnelToken : '',
    };
  }
}

module.exports = { CloudflareManager, CloudflareError, mergeIngressConfig, zoneCandidates };
