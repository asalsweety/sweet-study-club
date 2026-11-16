import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function loadEnvironment(root = projectRoot) {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    // Environment wins; never inject server credentials into renderer code.
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
      }
    }
  }
}

export function configuration(overrides = {}) {
  loadEnvironment();
  return {
    apiKey: process.env.MEETSTREAM_API_KEY?.trim() || '',
    dataDir: process.env.MEETSTREAM_DATA_DIR || path.join(homedir(), 'Documents', 'MeetStream Recordings'),
    port: Number(process.env.MEETSTREAM_PORT || 4317),
    callbackPort: Number(process.env.MEETSTREAM_CALLBACK_PORT || 0),
    publicUrl: process.env.MEETSTREAM_PUBLIC_URL || '',
    webhookSecret: process.env.MEETSTREAM_WEBHOOK_SECRET || '',
    tunnelBinary: process.env.MEETSTREAM_CLOUDFLARED_PATH || '',
    ...overrides,
  };
}
