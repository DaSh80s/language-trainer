/**
 * Configuration and environment loading.
 *
 * Everything installation-specific — database IDs, property names, thresholds —
 * lives in config/config.json. Nothing in src/ hardcodes a value from Daniel's
 * workspace, so the same code runs against a test workspace unchanged.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env reader: KEY=value, # comments, optional quotes. Never overrides real env vars. */
export async function loadDotEnv(path = resolve(packageRoot, '.env')) {
  if (!existsSync(path)) return {};

  const contents = await readFile(path, 'utf8');
  const parsed = {};

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return parsed;
}

export async function loadConfig(explicitPath) {
  const candidates = explicitPath
    ? [resolve(explicitPath)]
    : [resolve(packageRoot, 'config/config.json'), resolve(packageRoot, 'config/config.example.json')];

  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error(`No config file found. Copy config/config.example.json to config/config.json.`);
  }

  const config = JSON.parse(await readFile(path, 'utf8'));
  config._path = path;
  config._isExample = path.endsWith('config.example.json');
  return config;
}

/** Calendar feeds come from the environment, not the config file, because they contain secrets. */
export function loadFeedsFromEnv(env = process.env) {
  const raw = env.ICS_FEEDS;
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('ICS_FEEDS must be a JSON array');
    return parsed.filter((feed) => feed?.url).map((feed, index) => ({
      label: feed.label ?? `Feed ${index + 1}`,
      url: feed.url,
    }));
  } catch (error) {
    throw new Error(`ICS_FEEDS is not valid JSON: ${error.message}`);
  }
}

export { packageRoot };
