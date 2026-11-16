# MeetStream Recorder implementation plan

Build an isolated macOS-compatible Electron application with a browser mode. The existing Sweet Study Club application is outside this change.

## Required behavior

- Accept new Google Meet links, normalize the supplied `/meet/<code>` link, and deploy clearly named recording bots.
- Record video plus separate participant audio, webcam video, and screen shares. Save original files locally with participant IDs and timeline offsets in a manifest.
- Show a searchable recording library, meeting status, download progress, track playback, live speaker-labeled captions, and post-call transcripts.
- Keep the API key in the main/server process. Only MEETSTREAM_API_KEY is required; create a temporary HTTPS Cloudflare tunnel automatically for per-bot callbacks.
- Persist received webhook work before acknowledging, deduplicate deliveries, retry asynchronous API/download work, and reconcile with status polling after missed events or restart.
- Include automated contract/integration tests and a real-meeting smoke test that prints speaker-labeled live captions and stops its bot on exit.

## Verified contracts

Read the meetstream, getting-started, and test-bot skills in https://github.com/meetstream-ai/claude-plugin before implementation, together with current https://docs.meetstream.ai and the published OpenAPI specification. Current docs override older plugin examples where they disagree.

- REST authentication: `Authorization: Token <key>`.
- Create: `POST /api/v1/bots/create_bot`; retain one idempotency key across retries; HTTP 507 can replay a successful create.
- Enable `video_required`, `audio_separate_streams`, and `video_separate_streams`; explicitly choose `recording_config.video_layout`.
- Live transcription: `live_transcription_required.webhook_url` and `meetstream_streaming` configuration; native payloads contain speakerName/speakerId and transcript/utterance rather than transcript.partial/final events.
- Lifecycle: use `bot_event` with `event` fallback; all endings use the `bot.stopped` envelope. Do not assume media is ready when a call ends.
- Fetch tracks following `audio.processed` and `video.processed`, or a bounded reconciliation loop; per-participant endpoints return arrays.
- Post-call transcript: resolve `bot_details.transcript_id` from `/bots/{id}/detail`, then `GET /transcript/{transcript_id}/get_transcript` after `transcription.processed`.
- Per-bot callbacks and live transcript callbacks are unsigned. Authenticate with per-recording random URL secrets and known bot IDs. Verify HMAC signatures when a workspace signing secret is configured.
- MeetStream does not automatically retry webhook deliveries. Local durable work retries and reconciliation are necessary.

## Implementation and verification

1. API client, storage, contract adapters, durable jobs, authenticated local server and callback-only tunnel listener.
2. Electron shell, automatic tunnel lifecycle, browser mode, recording-management UI, local playback and exports.
3. Deterministic tests for API retry/replay, 202 processing, webhook auth/deduplication/order, participant identity/path safety, downloads, restart recovery and UI interactions.
4. Run a live bot against the supplied meeting, observe speaker-labeled transcript and end-of-call artifacts. Report separately any admission, provider, network, or macOS-only checks that remain unverified.
5. Provide macOS packaging commands and concise run instructions. Do not claim a signed macOS build was tested from Windows.
