import { EventEmitter } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { inside } from './store.mjs';
import { END_EVENTS, FAILED_JOIN, TERMINAL_STATUSES, normalizeMeetingLink, createBotPayload, eventKey, liveSegment, trackMetadata } from './contracts.mjs';

class Processing extends Error {}
const now = () => new Date().toISOString();

export class RecorderService extends EventEmitter {
  constructor({ store, client, fetchImpl = fetch, allowHttpDownloads = false, pollMs = 15_000 }) {
    super();
    this.store = store;
    this.client = client;
    this.fetch = fetchImpl;
    this.allowHttpDownloads = allowHttpDownloads;
    this.pollMs = pollMs;
    this.connection = { state: 'offline', message: 'Preparing webhook connection…' };
    this.busy = new Set();
    this.polling = new Set();
    this.draining = false;
  }
  async init() {
    await this.store.init();
    for (const recording of this.store.data.recordings) {
      for (const task of Object.values(recording.tasks)) {
        if (task.state === 'running') task.state = 'pending';
      }
      recording.nextPollAt = 0;
    }
    await this.store.save();
    this.timer = setInterval(() => this.tick().catch(() => {}), 1000);
    this.timer.unref();
    return this;
  }
  snapshot() {
    return {
      connection: this.connection,
      recordings: this.store.data.recordings.map(({ hookToken, idempotencyKey, ...recording }) => structuredClone(recording)),
      dataDir: this.store.directory,
      configured: Boolean(this.client.apiKey),
    };
  }
  changed() { this.emit('change'); }
  setConnection(connection) { this.connection = connection; this.changed(); }
  async update(recording) {
    recording.updatedAt = now();
    await this.store.save();
    this.changed();
  }
  get(id) {
    const recording = this.store.recording(id);
    if (!recording) throw new Error('Recording not found.');
    return recording;
  }
  async create({ meetingLink, title = '', botName = 'MeetStream Recorder', live = true }) {
    if (this.connection.state !== 'connected') throw new Error('Wait for the webhook connection before sending a bot.');
    const normalized = normalizeMeetingLink(meetingLink);
    const recording = {
      id: randomUUID(), botId: null, idempotencyKey: randomUUID(), hookToken: randomBytes(32).toString('hex'),
      meetingLink: normalized, title: String(title).trim().slice(0, 140) || `Meeting ${normalized.split('/').pop()}`,
      botName: String(botName).trim().slice(0, 80) || 'MeetStream Recorder', live: live !== false,
      status: 'Creating', createdAt: now(), updatedAt: now(), endedAt: null, endReason: null,
      paused: false, tracks: [], transcript: [], captions: [], partials: {}, activity: [],
      pipelineDone: false, ready: {}, tasks: {}, nextPollAt: 0,
    };
    this.store.data.recordings.unshift(recording);
    await this.update(recording);
    try {
      await this.deploy(recording);
    } catch (error) {
      // Keep the original idempotency key; a timed-out create may already have succeeded remotely.
      recording.status = 'Create error';
      recording.createError = error.message;
      await this.update(recording);
      throw error;
    }
    return recording;
  }
  async deploy(recording) {
    const bot = await this.client.createBot(createBotPayload(recording, this.connection.url), recording.idempotencyKey);
    recording.botId = bot.bot_id;
    recording.transcriptId = bot.transcript_id || null;
    recording.status = 'Joining';
    delete recording.createError;
    await this.update(recording);
  }
  schedule(recording, kind, immediate = false) {
    const task = recording.tasks[kind];
    if (!task || (immediate && ['done', 'failed'].includes(task.state))) {
      recording.tasks[kind] = { state: 'pending', attempts: 0, nextAt: Date.now(), startedAt: Date.now(), error: null };
    } else if (task.state === 'pending' && immediate) {
      task.nextAt = Date.now();
    }
  }
  end(recording, status, reason) {
    recording.endedAt ||= now();
    recording.status = status || 'Stopped';
    if (!recording.endReason || END_EVENTS.has(reason)) recording.endReason = reason;
    if (recording.admittedAt || (!FAILED_JOIN.has(String(status).toLowerCase()) && !recording.cancelledBeforeAdmission)) {
      for (const kind of ['audio', 'video', 'transcript']) this.schedule(recording, kind);
    } else {
      recording.pipelineDone = true;
      recording.captureSkipped = true;
    }
  }
  async receive(id, payload, live = false) {
    const recording = this.get(id);
    if (typeof payload?.bot_id !== 'string') throw new Error('Webhook must include bot_id.');
    if (recording.botId && payload.bot_id !== recording.botId) throw new Error('Webhook bot_id does not match this recording.');
    // Early callbacks may beat the create response. Only accept their recorder correlation until bot_id is known.
    if (!recording.botId && payload.custom_attributes?.recorder_id !== id) throw new Error('Unrecognized bot.');
    const key = eventKey(payload, live);
    if (this.store.data.processedEvents.includes(key) || this.store.data.inbox.some(item => item.key === key)) return false;
    this.store.data.inbox.push({ key, recordingId: id, live, payload, receivedAt: now() });
    await this.store.save(); // Durable receipt before the server acknowledges.
    this.drain().catch(() => {});
    return true;
  }
  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.store.data.inbox.length) {
        const item = this.store.data.inbox[0];
        const recording = this.get(item.recordingId);
        if (!this.store.data.processedEvents.includes(item.key)) {
          const payload = item.payload;
          if (item.live) {
            const segment = liveSegment(payload);
            if (segment?.final) {
              if (!recording.captions.some(existing => existing.id === segment.id)) recording.captions.push(segment);
              delete recording.partials[segment.speakerId];
            } else if (segment) recording.partials[segment.speakerId] = segment;
            if (segment) this.emit('transcript', { recordingId: recording.id, ...segment });
          } else {
            this.applyEvent(recording, payload);
          }
          this.store.data.processedEvents.push(item.key);
        }
        this.store.data.inbox.shift();
        await this.update(recording);
      }
    } finally { this.draining = false; }
  }
  applyEvent(recording, payload) {
    const event = payload.bot_event || payload.event;
    if (!event) return;
    recording.activity.push({ event, status: payload.bot_status, message: String(payload.message || '').slice(0, 1000), timestamp: payload.timestamp || now() });
    recording.activity = recording.activity.slice(-200);
    if (event === 'bot.error') return; // Nonfatal streaming warning.
    if (['bot.inmeeting', 'bot.recording'].includes(event)) recording.admittedAt ||= now();
    if (END_EVENTS.has(event)) this.end(recording, payload.bot_status || 'Stopped', event);
    else if (event === 'bot.done') {
      recording.pipelineDone = true;
      this.end(recording, payload.bot_status || 'Done', 'bot.done');
    } else if (event.startsWith('bot.') && payload.bot_status && !recording.endedAt) recording.status = payload.bot_status;
    for (const [prefix, kind] of [['audio', 'audio'], ['video', 'video'], ['transcription', 'transcript']]) {
      if (event === `${prefix}.processed`) {
        recording.ready[kind] = true;
        this.schedule(recording, kind, true);
      } else if (event === `${prefix}.failed`) {
        recording.tasks[kind] = { state: 'failed', attempts: 0, error: payload.message || `${kind} processing failed.` };
      } else if (event === `${prefix}.skipped` || event === `${prefix}.not_required`) {
        recording.tasks[kind] = { state: 'done', attempts: 0, empty: true };
      }
    }
    if (event === 'data_deletion') {
      recording.remoteExpired = true;
      for (const task of Object.values(recording.tasks)) {
        if (!['done', 'failed'].includes(task.state)) { task.state = 'failed'; task.error = 'Remote recording expired. Locally saved files remain available.'; }
      }
    }
  }
  async stop(id) {
    const recording = this.get(id);
    if (!recording.botId) throw new Error('The bot has not been created yet.');
    let currentStatus;
    try {
      currentStatus = (await this.client.status(recording.botId))?.status?.toLowerCase();
      if (['inmeeting', 'recording'].includes(currentStatus)) recording.admittedAt ||= now();
    } catch { /* Stop remains available when reconciliation is temporarily unavailable. */ }
    const result = await this.client.stop(recording.botId);
    recording.cancelledBeforeAdmission = !recording.admittedAt && ['joining', 'inwaitingroom', 'scheduled'].includes(currentStatus);
    recording.stopRequestedAt = now();
    recording.status = 'Leaving';
    // remove_bot acknowledges a request; polling/events establish when capture actually ended.
    if (String(result.bot_status).toLowerCase() === 'stopped' || ['stopped', 'already_stopped', 'cancelled'].includes(result.status)) this.end(recording, 'Stopped', 'removed');
    await this.update(recording);
    return result;
  }
  async pause(id) {
    const recording = this.get(id);
    if (!recording.botId || recording.endedAt) throw new Error('Only an active meeting can be paused.');
    await this.client.pause(recording.botId, !recording.paused);
    recording.paused = !recording.paused;
    await this.update(recording);
  }
  async retry(id) {
    const recording = this.get(id);
    if (!recording.botId) {
      if (this.connection.state !== 'connected') throw new Error('Reconnect webhooks first.');
      await this.deploy(recording);
    } else {
      for (const kind of ['audio', 'video', 'transcript']) this.schedule(recording, kind, true);
      recording.nextPollAt = 0;
      await this.update(recording);
    }
  }
  async reconcile(recording) {
    if (this.polling.has(recording.id)) return;
    this.polling.add(recording.id);
    try {
      const data = await this.client.status(recording.botId);
      const status = data?.status;
      if (typeof status !== 'string') throw new Error('Unexpected MeetStream status response.');
      recording.lastSyncedAt = now();
      delete recording.syncError;
      if (TERMINAL_STATUSES.has(status.toLowerCase())) {
        if (status.toLowerCase() === 'done') recording.pipelineDone = true;
        this.end(recording, status, 'status-poll');
      } else if (!recording.endedAt) {
        recording.status = status;
        if (['inmeeting', 'recording'].includes(status.toLowerCase())) recording.admittedAt ||= now();
      }
      await this.update(recording);
    } catch (error) {
      recording.syncError = error.message;
      await this.update(recording);
    } finally {
      recording.nextPollAt = Date.now() + this.pollMs;
      this.polling.delete(recording.id);
    }
  }
  async tick() {
    await this.drain();
    for (const recording of this.store.data.recordings) {
      if (!recording.botId) continue;
      const pending = Object.values(recording.tasks).some(task => ['pending', 'running'].includes(task.state));
      if ((!recording.pipelineDone || pending) && recording.nextPollAt <= Date.now() && !this.polling.has(recording.id)) this.reconcile(recording).catch(() => {});
      if (this.busy.has(recording.id) || this.busy.size >= 2) continue;
      const entry = Object.entries(recording.tasks).find(([, task]) => task.state === 'pending' && task.nextAt <= Date.now());
      if (entry) this.runTask(recording, entry[0]).catch(() => {});
    }
  }
  async runTask(recording, kind) {
    if (this.busy.has(recording.id)) return;
    this.busy.add(recording.id);
    const task = recording.tasks[kind];
    task.state = 'running';
    await this.update(recording);
    try {
      if (kind === 'transcript') await this.fetchTranscript(recording);
      else {
        const streams = await this.fetchTracks(recording, kind);
        task.empty = streams.length === 0;
      }
      task.state = 'done';
      task.error = null;
      await this.store.manifest(recording);
    } catch (error) {
      task.attempts++;
      task.error = error instanceof Processing ? 'Waiting for MeetStream processing…' : error.message;
      const elapsed = Date.now() - task.startedAt;
      const permanent = [400, 401, 402, 403, 422].includes(error.status);
      task.state = permanent || elapsed > 60 * 60_000 || (!(error instanceof Processing) && task.attempts >= 10) ? 'failed' : 'pending';
      task.nextAt = Date.now() + Math.min(60_000, 3000 * 2 ** Math.min(task.attempts, 5));
    } finally {
      this.busy.delete(recording.id);
      await this.update(recording);
    }
  }
  async fetchTranscript(recording) {
    const result = await this.client.transcript(recording.botId);
    if (result.processing) throw new Processing();
    recording.transcript = result.segments;
    recording.transcriptId = result.transcriptId;
    const folder = this.store.folder(recording.id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    await writeFile(path.join(folder, 'transcript.json'), JSON.stringify(result.segments, null, 2), { mode: 0o600 });
    await writeFile(path.join(folder, 'transcript.txt'), result.segments.map(segment => `[${segment.speaker || 'Unknown speaker'}] ${segment.transcript || ''}`).join('\n\n'), { mode: 0o600 });
  }
  async fetchTracks(recording, kind) {
    const result = await this.client.streams(recording.botId, kind);
    if (result.processing || (!result.streams.length && !recording.pipelineDone && !recording.ready[kind])) throw new Processing();
    for (const stream of result.streams) {
      const metadata = trackMetadata(stream, kind);
      let track = recording.tracks.find(existing => existing.id === metadata.id);
      if (!track) { track = { ...metadata, state: 'pending', bytes: 0 }; recording.tracks.push(track); }
      const target = inside(this.store.folder(recording.id), track.relativePath);
      if (track.state === 'saved') {
        try { if ((await stat(target)).size === track.bytes) continue; } catch {}
      }
      track.state = 'downloading';
      await this.update(recording);
      try { await this.download(stream.download_url, target, track); }
      catch (error) { track.state = 'failed'; track.error = error.message; throw error; }
      track.state = 'saved';
      delete track.error;
      await this.update(recording);
    }
    return result.streams;
  }
  async download(url, target, track) {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'https:' && !(this.allowHttpDownloads && parsed.protocol === 'http:')) || parsed.username || parsed.password) throw new Error('Invalid recording download URL.');
    const response = await this.fetch(url, { signal: AbortSignal.timeout(15 * 60_000), redirect: 'error' });
    if (!response.ok || !response.body) throw new Error(`Download returned HTTP ${response.status}; the next attempt will request a fresh media link.`);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    track.bytes = 0;
    track.totalBytes = Number(response.headers.get('content-length')) || null;
    let lastUpdate = 0;
    const meter = new Transform({ transform: (chunk, encoding, callback) => {
      track.bytes += chunk.length;
      if (Date.now() - lastUpdate > 500) { this.changed(); lastUpdate = Date.now(); }
      callback(null, chunk);
    } });
    try {
      await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(`${target}.part`, { mode: 0o600 }));
      if (track.totalBytes && track.bytes !== track.totalBytes) throw new Error('Download was incomplete.');
      await rename(`${target}.part`, target);
    } catch (error) {
      await unlink(`${target}.part`).catch(() => {});
      throw error;
    }
  }
  async close() {
    clearInterval(this.timer);
    // Active downloads are allowed to flush before the library is closed.
    const deadline = Date.now() + 20_000;
    while ((this.busy.size || this.polling.size || this.draining) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    await this.store.save();
  }
}
