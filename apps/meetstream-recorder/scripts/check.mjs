import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { projectRoot } from '../src/config.mjs';
import path from 'node:path';

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await check(file);
    else if (/\.(mjs|cjs|js)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) { process.stderr.write(result.stderr); process.exitCode = 1; }
    }
  }
}
for (const name of ['src', 'scripts', 'electron', 'ui', 'test']) await check(path.join(projectRoot, name));
if (!process.exitCode) console.log('All application JavaScript passed syntax checks.');
