"""Apply the source-controlled icon before the app bundles are sealed."""
from pathlib import Path
import plistlib
import shutil

root = Path(__file__).resolve().parent.parent
for folder in ["mac-arm64", "mac"]:
    contents = root / "release" / "cross-mac" / folder / "MeetStream Recorder.app" / "Contents"
    plist = contents / "Info.plist"
    info = plistlib.loads(plist.read_bytes())
    target = contents / "Resources" / "MeetStreamRecorder.icns"
    shutil.copyfile(root / "build-resources" / "icon.icns", target)
    info["CFBundleIconFile"] = target.name
    plist.write_bytes(plistlib.dumps(info))
