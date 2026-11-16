import { createHash, timingSafeEqual, createHmac } from 'node:crypto';

export const TERMINAL_STATUSES = new Set(['stopped', 'done', 'mediaprocessing', 'kicked', 'denied', 'notallowed', 'failed', 'error', 'cancelled', 'mediaexpired']);
export const FAILED_JOIN = new Set(['denied', 'notallowed', 'failed', 'error', 'cancelled']);
export const END_EVENTS = new Set(['bot.stopped', 'bot.kicked', 'bot.denied', 'bot.notallowed', 'bot.failed']);

export function normalizeMeetingLink(value) {
  const text = String(value || '').trim();
  const url = new URL(text.includes('://') ? text : `https://${text}`);
  const code = /^(?:\/meet)?\/([a-z]{3}-[a-z]{4}-[a-z]{3})\/?$/i.exec(url.pathname)?.[1];
  if (url.hostname !== 'meet.google.com' || !['http:', 'https:'].includes(url.protocol) || !code || url.username || url.password) {
    throw new Error('Enter a Google Meet link such as https://meet.google.com/abc-defg-hij.');
  }
  return `https://meet.google.com/${code.toLowerCase()}`;
}

export function createBotPayload(recording, callbackBase) {
  const webhook = `${callbackBase.replace(/\/$/, '')}/hooks/${recording.id}/${recording.hookToken}`;
  return {
    meeting_link: recording.meetingLink,
    bot_name: recording.botName,
    video_required: true,
    audio_separate_streams: true,
    video_separate_streams: true,
    callback_url: webhook,
    ...(recording.live ? { live_transcription_required: { webhook_url: `${webhook}/live` } } : {}),
    recording_config: {
      video_layout: 'speaker_view',
      transcript: {
        provider: {
          ...(recording.live ? { meetstream_streaming: { transcription_mode: 'sentence' } } : {}),
          meetstream: { language: 'auto', translate: false },
        },
      },
    },
    custom_attributes: { recorder_id: recording.id },
    automatic_leave: { waiting_room_timeout: 600, everyone_left_timeout: 60, voice_inactivity_timeout: 1800 },
  };
}

export function safeEqual(a, b) {
  const first = Buffer.from(String(a || ''));
  const second = Buffer.from(String(b || ''));
  return first.length === second.length && timingSafeEqual(first, second);
}

export function verifySignature(rawBody, signature, secret) {
  if (!secret) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(signature, expected);
}

export function eventKey(payload, live = false) {
  const content = live
    ? [payload.bot_id, payload.timestamp, payload.speakerId, payload.transcript, payload.utterance, payload.is_final, payload.end_of_turn]
    : [payload.bot_id, payload.bot_event || payload.event, payload.timestamp || '', payload.bot_status || '', payload.message || ''];
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

export function liveSegment(payload) {
  const text = payload.utterance || payload.transcript;
  if (typeof text !== 'string' || !text.trim()) return null;
  return {
    id: eventKey(payload, true),
    speaker: String(payload.speakerName || 'Unknown speaker'),
    speakerId: String(payload.speakerId || ''),
    transcript: text.trim(),
    timestamp: payload.timestamp || new Date().toISOString(),
    start_time: Number(payload.words?.[0]?.start || 0),
    final: payload.transcription_mode === 'sentence' || payload.is_final === true || payload.end_of_turn === true,
  };
}

export function participantKey(participant) {
  return String(participant?.extra_data?.google_meet?.static_participant_id || participant?.id || 'unknown');
}

export function safeName(value) {
  return String(value || 'unnamed').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\.+/g, '-').replace(/[. ]+$/g, '').slice(0, 70) || 'unnamed';
}

export function trackMetadata(stream, kind) {
  if (!stream || typeof stream.download_url !== 'string' || typeof stream.id !== 'string') throw new Error('A participant stream is missing its id or download_url.');
  const id = createHash('sha256').update(`${kind}:${stream.id}`).digest('hex').slice(0, 20);
  const participantId = participantKey(stream.participant);
  const suffix = createHash('sha256').update(participantId).digest('hex').slice(0, 8);
  let extension = /\.(mp4|webm|wav|mp3)(?:\?|$)/i.exec(stream.download_url)?.[1]?.toLowerCase();
  extension ||= kind === 'audio' ? 'webm' : 'mp4';
  const source = kind === 'audio' ? 'audio' : stream.type === 'screenshare' ? 'screenshare' : 'webcam';
  return {
    id, streamId: stream.id, kind, source, participantId,
    participantName: String(stream.participant?.name || 'Unknown participant'),
    relativePath: `participants/${safeName(stream.participant?.name)}-${suffix}/${source}-${id}.${extension}`,
    start: Number(stream.start_timestamp?.relative || 0),
    absoluteStart: stream.start_timestamp?.absolute || null,
    duration: Number(stream.duration || 0),
  };
}
