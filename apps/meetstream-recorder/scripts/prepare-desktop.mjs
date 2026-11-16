import { mkdir, writeFile, chmod, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { projectRoot } from '../src/config.mjs';

// Pinned official helper release. The binary is bundled so installation needs no package manager.
const version = '2026.11.0';
const directory = path.join(projectRoot, 'build-resources', 'cloudflared');
const metadata = await fetch(`https://api.github.com/repos/cloudflare/cloudflared/releases/tags/${version}`, {
  headers: { 'User-Agent': 'MeetStream-Recorder-Build', Accept: 'application/vnd.github+json' },
  signal: AbortSignal.timeout(30_000),
});
if (!metadata.ok) throw new Error(`Cannot load official cloudflared release metadata: HTTP ${metadata.status}.`);
const release = await metadata.json();
for (const [arch, filename] of [['arm64', 'cloudflared-darwin-arm64.tgz'], ['x64', 'cloudflared-darwin-amd64.tgz']]) {
  const asset = release.assets.find(item => item.name === filename);
  if (!asset) throw new Error(`Missing official release asset ${filename}.`);
  const target = path.join(directory, arch);
  await mkdir(target, { recursive: true });
  const archive = path.join(target, filename);
  const response = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`Cannot download ${filename}: HTTP ${response.status}.`);
  const body = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(body).digest('hex');
  if (asset.digest?.startsWith('sha256:') && asset.digest !== `sha256:${digest}`) throw new Error(`Checksum mismatch for ${filename}.`);
  await writeFile(archive, body);
  const result = spawnSync('tar', ['-xzf', archive, '-C', target, 'cloudflared'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || 'Could not extract cloudflared.');
  await chmod(path.join(target, 'cloudflared'), 0o755);
  const size = (await stat(path.join(target, 'cloudflared'))).size;
  await writeFile(path.join(target, 'provenance.json'), JSON.stringify({ version, arch, source: asset.browser_download_url, sha256: digest, officialDigest: asset.digest || null, size }, null, 2));
  console.log(`Bundled cloudflared ${version} for macOS ${arch} (${Math.round(size / 1024 / 1024)} MB).`);
}
