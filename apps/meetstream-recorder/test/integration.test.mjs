import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { LibraryStore } from '../src/store.mjs';
import { RecorderService } from '../src/service.mjs';
import { createServers } from '../src/server.mjs';
import { projectRoot } from '../src/config.mjs';

const waitUntil = async predicate => {
  for (let i = 0; i < 200; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error('Timed out waiting for test condition');
};

async function fixture(t) {
  const testRoot = path.join(projectRoot, '.data', 'tests');
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'meetstream-recorder-test-'));
  let service;
  let servers;
  let media;
  t.after(async () => {
    await servers?.close();
    await service?.close();
    if (media?.listening) await new Promise(resolve => media.close(resolve));
    assert.equal(path.dirname(directory), testRoot);
    assert.ok(path.basename(directory).startsWith('meetstream-recorder-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const participant = { id: 7, name: 'Jane Smith', extra_data: { google_meet: { static_participant_id: 'spaces/meeting/devices/7' } } };
  let downloadAttempts = 0;
  media = http.createServer((request, response) => {
    downloadAttempts++;
    if (request.url.includes('expired')) { response.writeHead(403); response.end(); }
    else { response.writeHead(200, { 'Content-Length': 12 }); response.end('sample-media'); }
  });
  await new Promise(resolve => media.listen(0, '127.0.0.1', resolve));
  const mediaUrl = `http://127.0.0.1:${media.address().port}`;
  let audioRequests = 0;
  const client = {
    apiKey: 'test-only',
    async createBot(payload) { return { bot_id: 'bot-' + randomUUID(), transcript_id: 'transcript-id', status: 'Active' }; },
    async status() { return { status: 'InMeeting' }; },
    async stop() { return { status: 'stop_requested', bot_status: 'InMeeting' }; },
    async pause() {},
    async streams(id, kind) {
      if (kind === 'audio') audioRequests++;
      return { processing: false, streams: [{ id: kind + '-stream', participant, download_url: `${mediaUrl}/${kind === 'audio' && audioRequests === 1 ? 'expired' : 'fresh'}.${kind === 'audio' ? 'webm' : 'mp4'}`, type: 'webcam', start_timestamp: { relative: kind === 'audio' ? 0 : 12.4 }, duration: 100 }] };
    },
    async transcript() { return { processing: false, transcriptId: 'transcript-id', segments: [{ speaker: 'Jane Smith', transcript: 'Hello from the meeting.', start_time: 0, end_time: 2 }] }; },
  };
  service = await new RecorderService({ store: new LibraryStore(directory), client, allowHttpDownloads: true, pollMs: 100_000 }).init();
  clearInterval(service.timer);
  service.setConnection({ state: 'connected', url: 'https://callback.example' });
  servers = await createServers({ service, port: 0 });
  const launch = await fetch(servers.launchUrl, { redirect: 'manual' });
  const cookie = launch.headers.get('set-cookie').split(';')[0];
  const recording = await service.create({ meetingLink: 'https://meet.google.com/abc-defg-hij', title: 'Integration meeting' });
  return { service, servers, recording, cookie, directory, client, getDownloadAttempts: () => downloadAttempts };
}

test('local UI requires a session; callback listener never exposes the library or credentials', async t => {
  const { service, servers, cookie } = await fixture(t);
  assert.equal((await fetch(`${servers.url}/api/state`)).status, 401);
  const response = await fetch(`${servers.url}/api/state`, { headers: { Cookie: cookie } });
  const state = await response.json();
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(state).includes('test-only'), false);
  assert.equal(JSON.stringify(state).includes('hookToken'), false);
  assert.equal((await fetch(`http://127.0.0.1:${servers.callbackPort}/api/state`)).status, 404);
  assert.equal((await fetch(`${servers.url}/api/reconnect`, { method: 'POST', headers: { Cookie: cookie } })).status, 403);
  assert.equal((await fetch(`${servers.url}/api/reconnect`, { method: 'POST', headers: { Cookie: cookie, Origin: 'https://evil.example', 'X-Recorder-Request': '1' } })).status, 403);
  assert.ok(service.snapshot().configured);
});

test('callbacks authenticate tokens and bot IDs, persist before ACK, deduplicate, and preserve partial/final captions', async t => {
  const { service, servers, recording } = await fixture(t);
  const endpoint = `http://127.0.0.1:${servers.callbackPort}/hooks/${recording.id}/${recording.hookToken}`;
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post(endpoint.replace(recording.hookToken, '0'.repeat(64)), { bot_id: recording.botId })).status, 403);
  assert.equal((await post(endpoint, { bot_id: 'someone-elses-bot' })).status, 400);
  const final = { bot_id: recording.botId, speakerName: 'Jane Smith', speakerId: '7', timestamp: '2026-11-12T10:00:00Z', transcript: 'Hello', is_final: true };
  assert.equal((await post(endpoint + '/live', { ...final, transcript: 'Hel', is_final: false })).status, 202);
  assert.equal((await post(endpoint + '/live', final)).status, 202);
  await post(endpoint + '/live', final);
  await waitUntil(() => recording.captions.length === 1 && !Object.keys(recording.partials).length);
  const saved = JSON.parse(await readFile(service.store.file, 'utf8'));
  assert.equal(saved.recordings[0].captions[0].speaker, 'Jane Smith');
  assert.equal(saved.recordings[0].captions[0].transcript, 'Hello');
});

test('out-of-order artifact events queue independent downloads; expired URLs refresh; manifest preserves alignment', async t => {
  const { service, recording, servers, cookie, directory } = await fixture(t);
  // Artifacts can arrive before the terminal event; neither should be lost.
  service.applyEvent(recording, { event: 'video.processed', bot_id: recording.botId });
  service.applyEvent(recording, { event: 'bot.inmeeting', bot_status: 'InMeeting' });
  service.applyEvent(recording, { event: 'bot.stopped', bot_event: 'bot.kicked', bot_status: 'Stopped' });
  assert.equal(recording.endReason, 'bot.kicked');
  await service.runTask(recording, 'audio');
  assert.equal(recording.tasks.audio.state, 'pending');
  await service.runTask(recording, 'audio');
  await service.runTask(recording, 'video');
  await service.runTask(recording, 'transcript');
  assert.equal(recording.tracks.filter(track => track.state === 'saved').length, 2);
  assert.equal(recording.tracks[0].participantId, recording.tracks[1].participantId);
  const video = recording.tracks.find(track => track.kind === 'video');
  const manifest = JSON.parse(await readFile(path.join(service.store.folder(recording.id), 'manifest.json'), 'utf8'));
  assert.equal(manifest.tracks.find(track => track.kind === 'video').start, 12.4);
  const response = await fetch(`${servers.url}/api/recordings/${recording.id}/tracks/${video.id}`, { headers: { Cookie: cookie, Range: 'bytes=0-5' } });
  assert.equal(response.status, 206);
  assert.equal(await response.text(), 'sample');
  const suffix = await fetch(`${servers.url}/api/recordings/${recording.id}/tracks/${video.id}`, { headers: { Cookie: cookie, Range: 'bytes=-5' } });
  assert.equal(await suffix.text(), 'media');
  assert.equal((await fetch(`${servers.url}/api/recordings/${recording.id}/tracks/${video.id}`, { headers: { Cookie: cookie, Range: 'bytes=100-200' } })).status, 416);
  const freshStore = await new LibraryStore(directory).init();
  assert.equal(freshStore.recording(recording.id).tracks.length, 2);
  await access(path.join(service.store.folder(recording.id), 'transcript.txt'));
});

test('pending media stays pending; a denied bot stops polling without fabricating saved tracks', async t => {
  const { service, recording, client } = await fixture(t);
  service.end(recording, 'Stopped', 'test');
  client.streams = async () => ({ processing: true, streams: [] });
  await service.runTask(recording, 'audio');
  assert.equal(recording.tasks.audio.state, 'pending');
  assert.equal(recording.tracks.length, 0);
  const denied = { ...recording, tasks: {}, endedAt: null, admittedAt: null, pipelineDone: false };
  service.applyEvent(denied, { event: 'bot.stopped', bot_event: 'bot.denied', bot_status: 'Denied' });
  assert.equal(denied.endReason, 'bot.denied');
  assert.equal(denied.pipelineDone, true);
  assert.deepEqual(denied.tasks, {});
});

test('restart recovers durable inbox work and interrupted downloads', async t => {
  const { service, directory, recording, client } = await fixture(t);
  recording.tasks.audio = { state: 'running', attempts: 0, nextAt: 0, startedAt: Date.now() };
  service.store.data.inbox.push({ key: 'restart-event', recordingId: recording.id, live: false, payload: { event: 'audio.processed', bot_id: recording.botId } });
  await service.store.save();
  const recovered = await new RecorderService({ store: new LibraryStore(directory), client }).init();
  clearInterval(recovered.timer);
  assert.equal(recovered.get(recording.id).tasks.audio.state, 'pending');
  await recovered.drain();
  assert.equal(recovered.get(recording.id).ready.audio, true);
  assert.equal(recovered.store.data.inbox.length, 0);
  assert.ok(recovered.store.data.processedEvents.includes('restart-event'));
  await recovered.close();
});

test('stop checks admission with the API so a missed join webhook cannot discard captured media', async t => {
  const { service, recording, client } = await fixture(t);
  assert.equal(recording.admittedAt, undefined);
  await service.stop(recording.id);
  assert.ok(recording.admittedAt);
  assert.equal(recording.cancelledBeforeAdmission, false);
  client.status = async () => ({ status: 'Stopped' });
  await service.reconcile(recording);
  assert.ok(recording.tasks.audio);
  assert.ok(recording.tasks.video);
  assert.ok(recording.tasks.transcript);
});

test('retry sync rechecks completed media and saves a late webcam without downloading saved shares again', async t => {
  const { service, recording, client, getDownloadAttempts } = await fixture(t);
  const originalStreams = client.streams.bind(client);
  let webcamAvailable = false;
  client.streams = async (id, kind) => {
    const result = await originalStreams(id, kind);
    if (kind !== 'video') return result;
    const webcam = result.streams[0];
    const share = { ...webcam, id: 'screen-share', type: 'screenshare' };
    return { processing: false, streams: webcamAvailable ? [share, webcam] : [share] };
  };
  service.end(recording, 'Done', 'test');
  recording.pipelineDone = true;
  await service.runTask(recording, 'video');
  assert.equal(recording.tasks.video.state, 'done');
  assert.deepEqual(recording.tracks.map(track => track.source), ['screenshare']);
  const previousDownloads = getDownloadAttempts();
  webcamAvailable = true;
  await service.retry(recording.id);
  assert.equal(recording.tasks.video.state, 'pending');
  await service.runTask(recording, 'video');
  assert.equal(recording.tasks.video.state, 'done');
  assert.equal(recording.tracks.filter(track => track.source === 'webcam' && track.state === 'saved').length, 1);
  assert.equal(getDownloadAttempts(), previousDownloads + 1);
});

test('a later processed event can recover an initially empty completed video result', async t => {
  const { service, recording, client } = await fixture(t);
  const originalStreams = client.streams.bind(client);
  client.streams = async () => ({ processing: false, streams: [] });
  service.end(recording, 'Done', 'test');
  recording.pipelineDone = true;
  await service.runTask(recording, 'video');
  assert.equal(recording.tasks.video.state, 'done');
  assert.equal(recording.tasks.video.empty, true);
  client.streams = originalStreams;
  service.applyEvent(recording, { event: 'video.processed', bot_id: recording.botId });
  assert.equal(recording.tasks.video.state, 'pending');
  await service.runTask(recording, 'video');
  assert.equal(recording.tasks.video.empty, false);
  assert.equal(recording.tracks[0].source, 'webcam');
});
