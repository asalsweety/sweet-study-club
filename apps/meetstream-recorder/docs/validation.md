# Validation — November 12, 2026

## Passed

- `npm test`: 16 deterministic API/HTTP/storage integration tests, including resync of completed jobs and recovery of a late webcam after an initially empty result.
- `npm run check`: syntax checks for application, Electron, UI, scripts and tests.
- `npm run test:ui`: actual Electron renderer tested with a local fake API. Verified empty library, deploy form, normalization of `/meet/<code>` links, live speaker captions, escaped title rendering, stop control, explicit missing-webcam notices and counts, settings and a 960-pixel-wide layout. Screenshots were inspected.
- Supplied MeetStream key validated with HTTP 200 without printing its value.
- Automatic Cloudflare tunnel connected without another account or secret.
- A real `create_bot` request with separate participant video/audio and hosted live plus post-call transcription succeeded.
- Lifecycle callback was received and persisted from the real service.

## Live-test result

The test bot reached `InWaitingRoom` for the supplied Google Meet link. It was not admitted during the four-minute test window. The test requested a stop and observed `Stopped`; it returned nonzero as designed because speech, participant files and a final transcript were not captured. No test bot was left running.

The user subsequently ran two admitted Google Meet tests manually. Both saved separate audio for two participants and transcripts; the second also saved a separate screen-share MP4. The user reported that their webcam was on and visible to the other participant. Direct inspection of MeetStream's completed bot request confirmed `video_required: true`, `video_separate_streams: true`, and `audio_separate_streams: true`. MeetStream reported successful per-participant video processing but returned zero webcam files from `get_recording_streams` for both tests. The second bot returned exactly one screen-share stream. The provider's camera-event file recorded `webcam_off` for the user but contained no `webcam_on` event. Sampled combined-recording frames contained black name tiles and the screen share; no webcam footage was found there.

This narrows the missing webcam to the provider/platform capture path; it is not a failed local download. The exact cause remains unresolved. No replacement bot was launched during this investigation. A suggested diagnostic for the next attended test is to switch the camera off and back on after the bot is admitted, then speak for 15–20 seconds. This is an unverified diagnostic, not a confirmed fix.

Version 0.1.1 fixes an independent app issue: Retry sync now requeues completed jobs, and later processed events can recover newly published streams. Existing saved files are checked and retained. The UI shows actual webcam/screen-share counts and explicitly says when the provider returned no webcam file, rather than implying that all video was saved. These changes do not reconstruct footage that MeetStream did not return.

## Platform scope

Development and Electron UI verification ran on Windows. Complete Apple Silicon and Intel `.app` ZIP bundles were subsequently built in a temporary Linux environment with Electron 45.3.1 and bundled cloudflared 2026.11.0. The app icon and application metadata were included before recursive ad-hoc signing with rcodesign 0.29.0.

For each architecture, verification covered 15 Mach-O binaries' embedded code-page hashes, 240 resource SHA-256 seals, executable permissions, framework symlinks, correct CPU architecture for runtime and helper, ZIP CRC integrity, and transferred archive SHA-256 integrity. A deliberate executable-byte corruption was rejected by the independent code-hash checker. The packed ASAR was inspected to confirm the bundled-helper path and absence of the actual API key and private runtime files.

rcodesign's `verify` subcommand incorrectly reports missing CMS for these ad-hoc signatures and documents that it is buggy. The independent CodeDirectory/resource checker was used instead; its scope is data integrity, not Apple trust assessment. No Developer ID certificate or notarization was used. macOS execution, native `codesign --verify`, Gatekeeper assessment, and DMG creation remain unverified. The provided application bundles require macOS 13.0 or newer.

## Delivery boundaries

All new application source is under `apps/meetstream-recorder`. The existing study application's source was not modified. The supplied key is stored only in the ignored local `.env.local`; recording state and temporary callback tokens are under ignored `.data`. Neither is included in the source archive or desktop package configuration.
