"""Preserve Mach-O executability and framework symlinks in installable .app ZIPs."""
from pathlib import Path
import hashlib
import json
import os
import plistlib
import stat
import zipfile

ROOT = Path(__file__).resolve().parent.parent
RELEASE = ROOT / "release"
package = json.loads((ROOT / "package.json").read_text())
results = []

for arch, folder, label in [("arm64", "mac-arm64", "Apple-Silicon"), ("x64", "mac", "Intel")]:
    bundle = RELEASE / "cross-mac" / folder / "MeetStream Recorder.app"
    info = plistlib.loads((bundle / "Contents" / "Info.plist").read_bytes())
    assert info["CFBundleIdentifier"] == "local.meetstream.recorder"
    assert (bundle / "Contents" / "Resources" / "app.asar").is_file()
    assert (bundle / "Contents" / "Resources" / "cloudflared" / arch / "cloudflared").is_file()
    executable = bundle / "Contents" / "MacOS" / info["CFBundleExecutable"]
    assert executable.stat().st_mode & stat.S_IXUSR
    archive = RELEASE / f"MeetStream-Recorder-{package['version']}-macOS-{label}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for directory, subdirs, files in os.walk(bundle, followlinks=False):
            for name in sorted(subdirs + files):
                source = Path(directory) / name
                relative = source.relative_to(bundle.parent).as_posix()
                if source.is_symlink():
                    entry = zipfile.ZipInfo(relative)
                    entry.create_system = 3
                    entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                    output.writestr(entry, os.readlink(source))
                elif source.is_file():
                    output.write(source, relative)
        output.writestr("Install.txt", "MeetStream Recorder\n\n1. Extract this ZIP.\n2. Move MeetStream Recorder.app into Applications.\n3. Open the app and enter your MeetStream API key in Settings.\n\nNode.js, npm, and a separate webhook-helper installation are not required.\nThis build is ad-hoc signed, not Developer ID signed or notarized. If macOS blocks it, use System Settings > Privacy & Security > Open Anyway for this app.\n")
    with zipfile.ZipFile(archive) as check:
        assert check.testzip() is None
        names = check.namelist()
        assert not any(".env" in name or "/.data/" in name for name in names)
        assert any(stat.S_ISLNK(entry.external_attr >> 16) for entry in check.infolist())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    results.append({"arch": arch, "file": archive.name, "bytes": archive.stat().st_size, "sha256": digest})
    print(f"Built {archive.name}: {archive.stat().st_size // 1024 // 1024} MB", flush=True)

(RELEASE / "mac-bundles.json").write_text(json.dumps(results, indent=2) + "\n")
(RELEASE / "SHA256SUMS.txt").write_text("".join(f"{item['sha256']}  {item['file']}\n" for item in results))
