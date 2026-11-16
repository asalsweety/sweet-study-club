# Install MeetStream Recorder on a Mac

Requires macOS 13 or newer. There is no Node.js, npm, or terminal setup for the bundled app.

## Choose a download

- **Apple Silicon:** Macs with an Apple M-series chip.
- **Intel:** Macs with an Intel processor.

Apple menu → About This Mac shows your chip or processor type.

## Install and connect

1. Open the ZIP in Finder.
2. Drag **MeetStream Recorder.app** into **Applications**.
3. Open it from Applications.
4. Open **Settings**, enter your MeetStream API key, and click **Save key**.
5. Wait for **Webhooks connected**, then click **Record a meeting** and paste a Google Meet link.

The key is encrypted using the Mac's credential storage. It is not included in either download. Recordings are saved by default in **Documents → MeetStream Recordings**.

These are local ad-hoc signed builds, not Developer ID signed or notarized releases. If macOS blocks the app, follow [Apple's app-specific Open Anyway instructions](https://support.apple.com/en-us/102445) in System Settings → Privacy & Security. No global security-setting change is needed.

Keep the app running during meetings and while tracks are processing. Closing the window on a Mac leaves the app running; use its Dock icon to reopen the window. Real Google Meet tests captured audio, transcripts and a screen share, but the provider returned no webcam files despite video being enabled. Webcam capture remains unresolved. Mac execution and Apple Gatekeeper verification have not been performed in this build environment.
