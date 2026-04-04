/**
 * Persistent integration credentials store.
 * Stores tokens at ~/.claude/forge/integrations.json
 * Tokens are encrypted with a simple obfuscation (not true encryption,
 * but prevents plaintext token exposure in the JSON file).
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const STORE_PATH = path.join(os.homedir(), ".claude", "forge", "integrations.json");

// Simple obfuscation key derived from machine-specific data
const KEY = crypto
  .createHash("sha256")
  .update(os.hostname() + os.homedir() + "forge-integrations")
  .digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  try {
    const [ivHex, encrypted] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function save(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export const integrationStore = {
  /**
   * Save a credential (token/apiKey) for an integration
   */
  saveCredential(integration, token, meta = {}) {
    const data = load();
    data[integration] = {
      token: encrypt(token),
      ...meta,
      connectedAt: Date.now(),
    };
    save(data);
  },

  /**
   * Get a stored credential (decrypted)
   */
  getCredential(integration) {
    const data = load();
    const entry = data[integration];
    if (!entry || !entry.token) return null;
    const token = decrypt(entry.token);
    if (!token) return null;
    return { token, ...entry, token_raw: token };
  },

  /**
   * Remove a credential
   */
  removeCredential(integration) {
    const data = load();
    delete data[integration];
    save(data);
  },

  /**
   * Get all stored integrations (without decrypted tokens)
   */
  getAll() {
    const data = load();
    const result = {};
    for (const [key, val] of Object.entries(data)) {
      result[key] = {
        connected: true,
        user: val.user,
        connectedAt: val.connectedAt,
      };
    }
    return result;
  },

  /**
   * Check if an integration has stored credentials
   */
  has(integration) {
    const data = load();
    return !!data[integration]?.token;
  },
};
