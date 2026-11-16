import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export class MeetStreamError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'MeetStreamError';
    this.status = status;
  }
}

export class MeetStreamClient {
  constructor({ apiKey, baseUrl = 'https://api.meetstream.ai/api/v1', fetchImpl = fetch, sleep = delay, maxRetries = 3 }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
    this.sleep = sleep;
    this.maxRetries = maxRetries;
  }

  async request(endpoint, { method = 'GET', body, idempotencyKey, retry = method === 'GET' || Boolean(idempotencyKey) } = {}) {
    if (!this.apiKey) throw new MeetStreamError(401, 'Set MEETSTREAM_API_KEY in .env.local or your environment, then restart.');
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await this.fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            Authorization: `Token ${this.apiKey}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(25_000),
          redirect: 'error',
        });
      } catch (error) {
        if (!retry || attempt >= this.maxRetries) throw new MeetStreamError(503, 'Could not reach MeetStream. Check your internet connection and retry.');
        await this.sleep(Math.min(10_000, 500 * 2 ** attempt));
        continue;
      }
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (response.ok || (response.status === 507 && idempotencyKey && data?.bot_id)) {
        return { status: response.status, data };
      }
      const retryable = response.status === 429 || [500, 502, 503, 504].includes(response.status);
      if (retry && retryable && attempt < this.maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const seconds = Number(retryAfter);
        const wait = retryAfter && Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || 500 * 2 ** attempt;
        await this.sleep(Math.min(30_000, wait));
        continue;
      }
      const message = data?.message || data?.detail || `MeetStream returned HTTP ${response.status}.`;
      throw new MeetStreamError(response.status, String(message).replaceAll(this.apiKey, '[redacted]').slice(0, 1000));
    }
  }

  async createBot(payload, key = randomUUID()) {
    const { data } = await this.request('/bots/create_bot', { method: 'POST', body: payload, idempotencyKey: key });
    if (typeof data?.bot_id !== 'string') throw new MeetStreamError(502, 'MeetStream did not return a bot_id.');
    return data;
  }
  async status(id) { return (await this.request(`/bots/${encodeURIComponent(id)}/status`)).data; }
  async detail(id) { return (await this.request(`/bots/${encodeURIComponent(id)}/detail`)).data; }
  async stop(id) { return (await this.request(`/bots/${encodeURIComponent(id)}/remove_bot`, { method: 'POST', retry: true })).data; }
  async pause(id, paused) { return (await this.request(`/bots/${encodeURIComponent(id)}/${paused ? 'pause_recording' : 'resume_recording'}`, { method: 'POST', retry: false })).data; }
  async streams(id, kind) {
    const response = await this.request(`/bots/${encodeURIComponent(id)}/${kind === 'audio' ? 'get_audio_streams' : 'get_recording_streams'}`);
    if (response.status === 202) return { processing: true, streams: [] };
    if (!Array.isArray(response.data)) throw new MeetStreamError(502, 'Unexpected participant streams response; expected an array.');
    return { processing: false, streams: response.data };
  }
  async transcript(botId) {
    const details = (await this.detail(botId))?.bot_details;
    if (!details || typeof details !== 'object') throw new MeetStreamError(502, 'Unexpected bot details response.');
    if (String(details.TranscriptStatus).toLowerCase() === 'failed') throw new MeetStreamError(422, 'Post-call transcription failed. Check the meeting activity for the provider error.');
    if (!details.transcript_id) return { processing: true, segments: [] };
    const response = await this.request(`/transcript/${encodeURIComponent(details.transcript_id)}/get_transcript`);
    if (response.status === 202) return { processing: true, segments: [] };
    if (!Array.isArray(response.data)) throw new MeetStreamError(502, 'Unexpected transcript response; expected an array.');
    return { processing: false, segments: response.data, transcriptId: details.transcript_id };
  }
}
