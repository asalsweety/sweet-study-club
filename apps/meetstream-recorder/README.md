# MeetStream Recorder

A local desktop app for managing Google Meet recordings. Send a recording bot, follow its status and live captions, and save each participant's microphone, webcam video, and screen shares into separate files. The library stays on your computer.

The app is isolated from the Sweet Study Club project. It has its own dependencies, lockfile, scripts, tests, and desktop packaging configuration.

## Install the bundled macOS app

Use the **Apple Silicon** ZIP for M-series Macs or the **Intel** ZIP for Intel Macs from `release/`. These are complete Electron `.app` bundles for macOS 13 or newer.

1. Double-click the ZIP to extract it.
2. Move **MeetStream Recorder.app** into **Applications**.
3. Open the app and enter your MeetStream key in **Settings**.

Node.js, npm, and a separate webhook-helper installation are not required. The ZIP includes Electron, the app code, and the matching macOS cloudflared binary. Your API key is not included.

These builds are **ad-hoc signed**, without Developer ID signing or Apple notarization. If macOS blocks the first launch, the app-specific **Open Anyway** control is under **System Settings → Privacy & Security**. See [Apple's instructions](https://support.apple.com/en-us/102445). The bundle and code hashes were checked on the build host; execution on a Mac remains unverified.

## Run from source (development)

Install Node.js 22.12 or newer, then open Terminal in this folder:

```sh
npm ci
export MEETSTREAM_API_KEY="your-key-from-the-MeetStream-dashboard"
npm start
```

After installation, `Start Recorder.command` is also a macOS Terminal launcher for this folder. If its executable bit was lost while transferring a ZIP, run `chmod +x "Start Recorder.command"` once.

Alternatively copy `.env.example` to `.env.local` and set the key there. The key is excluded from source control and desktop packages. In the desktop app you can also enter a key in Settings; Electron encrypts it using the operating system's credential storage. An environment key takes precedence over a stored key.

Only the MeetStream API key is required. No separate transcription-provider key, Cloudflare account, webhook hostname, database, or backend deployment is necessary. Internet access is required: the app starts a temporary Cloudflare HTTPS tunnel for authenticated recording callbacks. Source mode downloads the tunnel binary on first launch; installed macOS bundles already include it.

1. Click **Record a meeting**.
2. Paste any Google Meet link and optionally choose a meeting title and bot name.
3. Click **Send recording bot**, then admit the named bot from Google Meet if asked.
4. Follow the status and **Transcript** tab during the call. Pause/resume and stop controls are available in the meeting detail view.
5. Keep the app running after the call while tracks and the final transcript are processed and saved. **Open folder** reveals the local files.

Links in the form `https://meet.google.com/meet/abc-defg-hij` are normalized to the canonical `https://meet.google.com/abc-defg-hij`. New meeting links can be entered for every recording; none is hardcoded.

MeetStream recording and transcription use your account credits. Google Meet supports up to 16 audio speakers and 16 simultaneous video streams, with screen shares included in the video limit. Muted microphones and disabled cameras cannot produce content; unidentified audio may remain only in the mixed recording on MeetStream. Live caption labels follow the active speaker; the final transcript uses post-call attribution.

If a webcam is missing, the detail view shows the actual webcam and screen-share counts returned by MeetStream. **Retry sync** rechecks completed jobs and downloads any newly available files while preserving saved files. A missing-camera notice means no webcam file was returned; it does not establish whether the participant's camera was off. In the first user-admitted tests, audio, captions and a screen share were captured, but MeetStream returned no webcam files despite video being enabled. Webcam capture remains unverified; see `docs/validation.md`.

## Local files

Default location: `~/Documents/MeetStream Recordings`.

```text
MeetStream Recordings/
  library.json
  recordings/<local-recording-id>/
    manifest.json
    transcript.json
    transcript.txt
    participants/
      Jane-Smith-<identity-hash>/
        audio-<stream-hash>.webm
        webcam-<stream-hash>.mp4
        screenshare-<stream-hash>.mp4
```

The files preserve their original formats. Audio may be WAV instead of WebM when MeetStream returns a WAV file. Audio and video are not merged. `manifest.json` retains each participant's stable identity, stream type, duration, and start offset in seconds, so editors can align the original tracks. Identical display names do not share a folder unless the participant identity is also the same.

Search recordings by meeting title, meeting code, or participant name. Rename and archive actions change only the local library. Archiving is reversible and does not delete recordings from MeetStream or your disk. No remote deletion is implemented.

## Browser mode

```sh
npm run start:web
```

Open the full local launch URL printed in the terminal. It establishes a private session cookie; opening `/` or `/api/state` without that session is refused. The browser app has the same recording features; opening Finder and securely persisting a key require the desktop app. A key entered in browser Settings remains in memory for that session.

## Verification

```sh
npm test
npm run check
npm run test:ui
npm run test:live -- https://meet.google.com/abc-defg-hij --seconds 180
```

The deterministic tests use local HTTP servers and documented response fixtures. They exercise authentication, retry-after handling, idempotent create replay, HTTP 202, transcript failures, callback authorization/deduplication, out-of-order events, expiring download URLs, local media seeking, and restart recovery.

The Electron UI smoke test launches a hidden window with a fake API client, exercises the actual form, captions, rename, stop and settings flows, checks HTML injection handling and narrow layouts, and saves screenshots in `artifacts/`. It does not create a real meeting bot.

The explicit live test creates a **real** recording bot, prints live speaker-labeled transcript contents to the terminal, requests a stop after the chosen duration, and waits up to eight minutes for downloaded tracks and the post-call transcript. It returns nonzero when admission, speech, audio/video capture, or final transcription cannot be verified. The meeting host must admit the bot and someone must speak with a camera on. Ctrl+C requests a bot stop before the script exits. Normal app logs never print transcript contents or the API key.

## Build a macOS app

Run this **on macOS**:

```sh
npm ci
npm run dist:mac
```

DMG and ZIP builds for Apple Silicon and Intel are written to `release/`. The default identity `-` creates ad-hoc signatures; Developer ID signing and notarization credentials are not included. `prepare:desktop` downloads the pinned official helper binaries before packaging. The native app icon is rendered from the existing SVG mark. Runtime files, `.env.local`, and recording libraries are excluded from packages. First launch can use Settings to store the API key securely; a packaged app does not require a separate Node.js installation.

The provided ZIPs were assembled in a temporary Linux environment using electron-builder, then ad-hoc signed recursively with [rcodesign](https://github.com/indygreg/apple-platform-rs). `scripts/package-mac-linux.sh` records this build path and requires Linux Node.js, Python 3 and rcodesign. `verify-mac-bundles.py` independently checks CodeDirectory code-page/blob hashes and resource seals, including a deliberate corruption rejection check. It does not perform Apple's Gatekeeper/notarization assessment. ZIP creation preserves Unix executable permissions and framework symlinks. SHA-256 sums accompany the downloads in `release/SHA256SUMS.txt`.

## Reliability and security

- REST credentials stay in the main/server process and are sent only to the MeetStream API.
- The public tunnel forwards to a **callback-only** listener, not to the local library or management API.
- Each recording receives a cryptographically random callback URL token. Callback payloads must identify the bot assigned to that recording; early events must contain its recorder correlation ID.
- Per-bot callbacks and live transcript updates are unsigned by MeetStream. Their URLs authenticate delivery. If a workspace signature is present, it must pass exact-body HMAC verification using `MEETSTREAM_WEBHOOK_SECRET`.
- Incoming work is written to disk before ACK, then processed asynchronously. Duplicate deliveries are suppressed across restarts.
- MeetStream sends webhook events once, without automatic delivery retries. The app retries its own API/download jobs and reconciles status through polling. Post-call jobs stop after one hour or repeated failures, and can be retried from the UI.
- Expired download URLs are fetched again rather than saved in the library. Downloads stream to a partial file, then rename on completion; interrupted downloads restart on the next run.
- A temporary tunnel URL changes on restart. Existing bots may stop delivering live captions after a tunnel interruption; polling still recovers post-call media/transcripts while they remain available. A persistent callback hostname can avoid this limitation.
- Keep the app open during capture and processing. Closing a macOS window leaves the app running. Quitting with active bots offers to stop them; on restart, any unfinished recording jobs resume.

## Optional configuration

See `.env.example`. To use a persistent public callback URL, set `MEETSTREAM_PUBLIC_URL`, set a fixed `MEETSTREAM_CALLBACK_PORT`, and forward that public URL to the callback port. Do not forward the UI port. `MEETSTREAM_DATA_DIR` changes storage location on the next launch; copy an existing library to that directory yourself if you want to move it.

## Contract sources

Implementation was based on the requested [MeetStream Claude plugin](https://github.com/meetstream-ai/claude-plugin), its core/getting-started/test-bot skills and Node patterns, together with the current [OpenAPI specification](https://meetstream.ai/openapi.json) and official documentation, checked November 12, 2026. Codex followed the non-Claude path in the supplied instructions and read these sources directly.

The generated brief's `bot.status_change`, `transcript.partial`, and `transcript.final` names do not describe the current native webhook format. The app consumes the documented equivalents: lifecycle events under `bot_event`, live caption payloads with `transcript`/`utterance` and finality flags, and `transcription.processed` for the post-call transcript.

- [Create Bot](https://docs.meetstream.ai/api-reference/api-endpoints/bot-endpoints/create-bot)
- [Webhooks and events](https://docs.meetstream.ai/guides/webhooks/webhooks-and-events)
- [Live transcription](https://docs.meetstream.ai/guides/transcription-recordings/live-transcription)
- [Post-call transcription](https://docs.meetstream.ai/guides/transcription-recordings/post-call-transcription)
- [Transcription providers](https://docs.meetstream.ai/guides/transcription-recordings/providers/transcription-providers)
- [Participant audio](https://docs.meetstream.ai/guides/transcription-recordings/per-participant-audio)
- [Participant video](https://docs.meetstream.ai/guides/transcription-recordings/per-participant-video)

Final transcripts are resolved from `/bots/{id}/detail` → `bot_details.transcript_id` → `/transcript/{transcript_id}/get_transcript`. Call termination does not imply media readiness: audio, video and transcript jobs are tracked independently.
