'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = Object.freeze({
  serverEnabled: true,
  tunnelEnabled: false,
  launchAtLogin: false,
  hostname: 'online.ff18.com',
  managedHostname: '',
  tunnelName: 'eggy-multiplayer',
  tunnelId: '',
  accountId: '',
  zoneId: '',
  domainConfigured: false,
  lastPublicCheck: '',
  serverPort: 2567,
  adminPort: 2568,
  allowedOrigins: 'https://eggy.ff18.com',
  cloudflaredPath: '',
});

function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

class SecureStore {
  constructor(directory, safeStorage) {
    this.directory = directory;
    this.safeStorage = safeStorage;
    this.settingsFile = path.join(directory, 'settings.json');
    this.secretsFile = path.join(directory, 'secrets.bin.json');
  }

  loadSettings() {
    return { ...DEFAULTS, ...readJson(this.settingsFile, {}) };
  }

  saveSettings(patch) {
    const next = { ...this.loadSettings(), ...patch };
    atomicJson(this.settingsFile, next);
    return next;
  }

  encryptionAvailable() {
    return !!(this.safeStorage && this.safeStorage.isEncryptionAvailable());
  }

  _readSecrets() { return readJson(this.secretsFile, {}); }

  saveSecrets(patch) {
    if (!this.encryptionAvailable()) throw new Error('系统安全存储不可用，已拒绝以明文保存 Token');
    const current = this._readSecrets();
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (value === null || value === '') delete current[key];
      else current[key] = this.safeStorage.encryptString(String(value)).toString('base64');
    }
    atomicJson(this.secretsFile, current);
  }

  getSecret(key) {
    const encoded = this._readSecrets()[key];
    if (!encoded) return '';
    if (!this.encryptionAvailable()) throw new Error('系统安全存储当前不可用');
    return this.safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  }

  secretStatus() {
    const secrets = this._readSecrets();
    return { apiTokenSaved: !!secrets.apiToken, tunnelTokenSaved: !!secrets.tunnelToken };
  }
}

module.exports = { SecureStore, DEFAULTS, atomicJson };
