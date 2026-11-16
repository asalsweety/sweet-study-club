import test from 'node:test';
import assert from 'node:assert/strict';
import { MeetStreamClient } from '../src/client.mjs';
import { createBotPayload, normalizeMeetingLink, trackMetadata, verifySignature, eventKey } from '../src/contracts.mjs';
import { createHmac } from 'node:crypto';

test('create retries with the same idempotency key and accepts a 507 replay', async () => {
  const calls = [];
  const client = new MeetStreamClient({ apiKey: 'test-key', sleep: async () => {}, fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    if (calls.length === 1) throw new TypeError('Connection reset after server accepted the create');
    return Response.json({ bot_id: 'already-created', status: 'Active' }, { status: 507 });
  } });
  assert.equal((await client.createBot({ meeting_link: 'x' }, 'one-logical-request')).bot_id, 'already-created');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Authorization, 'Token test-key');
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
});

test('auth failures are not retried; rate limits honor retry-after', async () => {
  let calls = 0;
  const waits = [];
  const client = new MeetStreamClient({ apiKey: 'private-test-key', sleep: async ms => waits.push(ms), fetchImpl: async () => {
    calls++;
    return calls === 1 ? Response.json({ message: 'busy' }, { status: 429, headers: { 'Retry-After': '2' } }) : Response.json({ message: 'private-test-key denied' }, { status: 403 });
  } });
  await assert.rejects(client.status('bot'), error => error.status === 403 && error.message === '[redacted] denied');
  assert.equal(calls, 2);
  assert.deepEqual(waits, [2000]);
});

test('202 is pending, and transcripts resolve by canonical transcript_id', async () => {
  const calls = [];
  const client = new MeetStreamClient({ apiKey: 'test', fetchImpl: async url => {
    calls.push(url);
    if (url.endsWith('/detail')) return Response.json({ bot_details: { transcript_id: 'transcript-123', TranscriptStatus: 'Processing' } });
    return Response.json({ message: 'processing' }, { status: 202 });
  } });
  assert.equal((await client.streams('bot', 'audio')).processing, true);
  assert.equal((await client.transcript('bot')).processing, true);
  assert.ok(calls.at(-1).endsWith('/transcript/transcript-123/get_transcript'));
});

test('failed transcript breaks out instead of polling indefinitely', async () => {
  let calls = 0;
  const client = new MeetStreamClient({ apiKey: 'test', fetchImpl: async () => { calls++; return Response.json({ bot_details: { transcript_id: 't', TranscriptStatus: 'Failed' } }); } });
  await assert.rejects(client.transcript('bot'), /transcription failed/i);
  assert.equal(calls, 1);
});

test('accepts new meeting links and normalizes the user-supplied link format', () => {
  assert.equal(normalizeMeetingLink('https://meet.google.com/meet/guf-tjiw-msq'), 'https://meet.google.com/guf-tjiw-msq');
  assert.equal(normalizeMeetingLink('meet.google.com/abc-defg-hij?authuser=1'), 'https://meet.google.com/abc-defg-hij');
  for (const link of ['https://evil.example/abc-defg-hij', 'https://meet.google.com.evil.example/abc-defg-hij', 'javascript:alert(1)', 'https://meet.google.com/']) assert.throws(() => normalizeMeetingLink(link));
});

test('recording payload explicitly enables isolated tracks and hosted live/post-call providers', () => {
  const payload = createBotPayload({ id: 'recording', hookToken: 'secret', meetingLink: 'https://meet.google.com/abc-defg-hij', botName: 'Recorder', live: true }, 'https://callback.example');
  assert.equal(payload.video_required, true);
  assert.equal(payload.audio_separate_streams, true);
  assert.equal(payload.video_separate_streams, true);
  assert.equal(payload.recording_config.video_layout, 'speaker_view');
  assert.equal(payload.live_transcription_required.webhook_url, 'https://callback.example/hooks/recording/secret/live');
  assert.deepEqual(Object.keys(payload.recording_config.transcript.provider), ['meetstream_streaming', 'meetstream']);
});

test('same-named participants cannot overwrite one another or traverse paths', () => {
  const base = { id: 'stream', participant: { name: '../../Jane / Smith', extra_data: { google_meet: { static_participant_id: 'person-1' } } }, download_url: 'https://files.example/audio.wav', start_timestamp: { relative: 12.4 }, duration: 100 };
  const first = trackMetadata(base, 'audio');
  const second = trackMetadata({ ...base, id: 'stream-2', participant: { ...base.participant, extra_data: { google_meet: { static_participant_id: 'person-2' } } } }, 'audio');
  assert.notEqual(first.relativePath, second.relativePath);
  assert.ok(!first.relativePath.includes('..'));
  assert.ok(first.relativePath.endsWith('.wav'));
  assert.equal(first.start, 12.4);
});

test('HMAC verification uses the exact raw body, not reserialized JSON', () => {
  const raw = Buffer.from('{ "bot_id": "b", "event": "bot.done" }');
  const signature = 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.equal(verifySignature(raw, signature, 'secret'), true);
  assert.equal(verifySignature(Buffer.from(JSON.stringify(JSON.parse(raw))), signature, 'secret'), false);
  assert.equal(verifySignature(raw, signature, 'wrong'), false);
  assert.notEqual(eventKey({ bot_id: 'b', event: 'bot.stopped', bot_event: 'bot.kicked' }), eventKey({ bot_id: 'b', event: 'bot.stopped', bot_event: 'bot.stopped' }));
});
