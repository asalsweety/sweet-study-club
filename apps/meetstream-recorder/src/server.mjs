import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeEqual, verifySignature } from './contracts.mjs';
import { inside } from './store.mjs';

const uiDirectory = fileURLToPath(new URL('../ui/', import.meta.url));
const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error('Request too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server.address().port;
}
const closeServer = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });

export async function createServers({ service, port = 4317, callbackPort: requestedCallbackPort = 0, webhookSecret = '', openFolder, saveKey }) {
  const sessionToken = randomBytes(32).toString('hex');
  const launchToken = randomBytes(32).toString('hex');
  const clients = new Set();
  let baseUrl;
  const broadcast = () => {
    const data = `event: state\ndata: ${JSON.stringify(service.snapshot())}\n\n`;
    for (const client of clients) client.write(data);
  };
  service.on('change', broadcast);

  const callbacks = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') return json(response, 200, { ok: true });
      const match = /^\/hooks\/([0-9a-f-]{36})\/([a-f0-9]{64})(\/live)?$/.exec(url.pathname);
      if (request.method !== 'POST' || !match) return json(response, 404, { error: 'Not found.' });
      const recording = service.store.recording(match[1]);
      if (!recording || !safeEqual(match[2], recording.hookToken)) return json(response, 403, { error: 'Invalid callback token.' });
      const raw = await readBody(request);
      // Per-bot callbacks are unsigned. If a workspace signature is present, validate it.
      if (request.headers['x-meetstream-signature'] && !verifySignature(raw, request.headers['x-meetstream-signature'], webhookSecret)) return json(response, 403, { error: 'Invalid webhook signature.' });
      const payload = JSON.parse(raw.toString());
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Expected a JSON object.');
      const accepted = await service.receive(recording.id, payload, Boolean(match[3]));
      json(response, 202, { accepted });
    } catch (error) {
      json(response, error.status || 400, { error: error.message });
    }
  });

  const app = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const url = new URL(request.url, baseUrl || 'http://127.0.0.1');
      if (url.pathname === `/launch/${launchToken}` && request.method === 'GET') {
        response.writeHead(302, { 'Set-Cookie': `recorder_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/`, Location: '/' });
        return response.end();
      }
      const cookie = /(?:^|;\s*)recorder_session=([^;]+)/.exec(request.headers.cookie || '')?.[1];
      if (!safeEqual(cookie, sessionToken)) return json(response, 401, { error: 'Open the app using its launch link.' });
      if (request.headers.origin && request.headers.origin !== baseUrl) return json(response, 403, { error: 'Origin not allowed.' });
      if (!['GET', 'HEAD'].includes(request.method) && request.headers['x-recorder-request'] !== '1') return json(response, 403, { error: 'Missing request header.' });

      if (request.method === 'GET' && url.pathname === '/api/state') return json(response, 200, service.snapshot());
      if (request.method === 'GET' && url.pathname === '/api/events') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        response.write(`event: state\ndata: ${JSON.stringify(service.snapshot())}\n\n`);
        clients.add(response);
        const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15_000);
        request.on('close', () => { clearInterval(heartbeat); clients.delete(response); });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/recordings') {
        const input = JSON.parse((await readBody(request)).toString());
        const recording = await service.create(input);
        return json(response, 201, { id: recording.id, botId: recording.botId });
      }
      const action = /^\/api\/recordings\/([0-9a-f-]{36})\/(stop|pause|retry|rename|archive|folder)$/.exec(url.pathname);
      if (request.method === 'POST' && action) {
        const [, id, name] = action;
        const recording = service.get(id);
        if (['stop', 'pause', 'retry'].includes(name)) await service[name](id);
        if (name === 'rename') {
          const input = JSON.parse((await readBody(request)).toString());
          const title = String(input.title || '').trim().slice(0, 140);
          if (!title) throw new Error('A meeting title is required.');
          recording.title = title;
          await service.update(recording);
        }
        if (name === 'archive') {
          if (!recording.endedAt && recording.botId) throw new Error('Stop the recording before archiving it.');
          recording.archived = !recording.archived;
          await service.update(recording);
        }
        if (name === 'folder') {
          if (!openFolder) throw new Error('Opening Finder is available in the desktop app. Your storage folder is shown in Settings.');
          await openFolder(id);
        }
        return json(response, 200, { ok: true });
      }
      if (request.method === 'POST' && url.pathname === '/api/reconnect') {
        service.emit('reconnect');
        return json(response, 202, { ok: true });
      }
      if (request.method === 'POST' && url.pathname === '/api/key') {
        const { key } = JSON.parse((await readBody(request)).toString());
        if (typeof key !== 'string' || !/^ms_[A-Za-z0-9_-]{12,}$/.test(key.trim())) throw new Error('Enter a valid MeetStream API key.');
        const previous = service.client.apiKey;
        service.client.apiKey = key.trim();
        try {
          await service.client.request('/bots');
          if (saveKey) await saveKey(key.trim());
        } catch (error) { service.client.apiKey = previous; throw error; }
        service.changed();
        return json(response, 200, { ok: true, persisted: Boolean(saveKey) });
      }
      const media = /^\/api\/recordings\/([0-9a-f-]{36})\/(tracks\/([a-f0-9]{20})|export\/(manifest|transcript-json|transcript-txt))$/.exec(url.pathname);
      if (request.method === 'GET' && media) {
        const recording = service.get(media[1]);
        const folder = service.store.folder(recording.id);
        if (media[4]) {
          if (media[4] === 'manifest') await service.store.manifest(recording);
          const filename = { manifest: 'manifest.json', 'transcript-json': 'transcript.json', 'transcript-txt': 'transcript.txt' }[media[4]];
          const body = await readFile(path.join(folder, filename));
          response.writeHead(200, { 'Content-Type': filename.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
          return response.end(body);
        }
        const track = recording.tracks.find(item => item.id === media[3] && item.state === 'saved');
        if (!track) return json(response, 404, { error: 'This track has not been saved yet.' });
        const target = inside(folder, track.relativePath);
        const size = (await stat(target)).size;
        const ext = path.extname(target);
        const contentType = ext === '.mp4' ? 'video/mp4' : ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : `${track.kind}/webm`;
        const headers = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
        if (url.searchParams.has('download')) headers['Content-Disposition'] = `attachment; filename="${track.source}-${track.id}${ext}"`;
        const range = request.headers.range;
        if (range) {
          const matched = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!matched || (!matched[1] && !matched[2])) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); return response.end(); }
          const start = matched[1] ? Number(matched[1]) : Math.max(0, size - Number(matched[2]));
          const end = matched[1] && matched[2] ? Math.min(size - 1, Number(matched[2])) : size - 1;
          if (start > end || start >= size) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); return response.end(); }
          response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
          await pipeline(createReadStream(target, { start, end }), response);
        } else {
          response.writeHead(200, { ...headers, 'Content-Length': size });
          await pipeline(createReadStream(target), response);
        }
        return;
      }
      const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/icon.svg': ['icon.svg', 'image/svg+xml'] };
      if (request.method === 'GET' && assets[url.pathname]) {
        const [filename, type] = assets[url.pathname];
        const body = await readFile(path.join(uiDirectory, filename));
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        return response.end(body);
      }
      json(response, 404, { error: 'Not found.' });
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      const status = error.code === 'ENOENT' ? 404 : error.status || 400;
      json(response, status, { error: error.code === 'ENOENT' ? 'The requested file is not available locally.' : error.message });
    }
  });
  const callbackPort = await listen(callbacks, requestedCallbackPort);
  let localPort;
  try { localPort = await listen(app, port); }
  catch (error) { await closeServer(callbacks); throw error; }
  baseUrl = `http://127.0.0.1:${localPort}`;
  return {
    url: baseUrl, launchUrl: `${baseUrl}/launch/${launchToken}`, callbackPort,
    async close() {
      service.off('change', broadcast);
      for (const client of clients) client.end();
      await Promise.all([closeServer(app), closeServer(callbacks)]);
    },
  };
}
