"""Validate bundled executables, resource seals, architectures and required app files."""
from pathlib import Path
import hashlib
import os
import plistlib
import struct

root = Path(__file__).resolve().parent.parent
mach_magic = {b"\xcf\xfa\xed\xfe", b"\xce\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xfe\xed\xfa\xce", b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca"}


def verify_code_hashes(data):
    """Check Apple's CodeDirectory page/blob hashes; this does not assess Gatekeeper trust.

    Layout reference: apple-oss-distributions/xnu/osfmk/kern/cs_blobs.h.
    rcodesign's verify command incorrectly requires CMS data for ad-hoc signatures.
    """
    if data[:4] in {b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca"}:
        endian = ">" if data[:4] == b"\xca\xfe\xba\xbe" else "<"
        count = struct.unpack_from(endian + "I", data, 4)[0]
        for index in range(count):
            offset, size = struct.unpack_from(endian + "II", data, 8 + index * 20 + 8)
            verify_code_hashes(data[offset:offset + size])
        return
    endian = "<" if data[:4] in {b"\xcf\xfa\xed\xfe", b"\xce\xfa\xed\xfe"} else ">"
    command_count = struct.unpack_from(endian + "I", data, 16)[0]
    position = 32 if data[:4] in {b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf"} else 28
    signature = None
    for _ in range(command_count):
        command, size = struct.unpack_from(endian + "II", data, position)
        assert size >= 8
        if command == 0x1D:  # LC_CODE_SIGNATURE
            offset, length = struct.unpack_from(endian + "II", data, position + 8)
            signature = data[offset:offset + length]
        position += size
    assert signature, "Missing embedded code signature"
    magic, length, count = struct.unpack_from(">III", signature)
    assert magic == 0xFADE0CC0 and length <= len(signature)
    blobs = {}
    for index in range(count):
        slot, offset = struct.unpack_from(">II", signature, 12 + index * 8)
        blob_length = struct.unpack_from(">I", signature, offset + 4)[0]
        blobs[slot] = signature[offset:offset + blob_length]
    directories = [blob for blob in blobs.values() if blob[:4] == b"\xfa\xde\x0c\x02"]
    assert directories
    for directory in directories:
        version, flags, hash_offset, _identifier, special_count, code_count, code_limit = struct.unpack_from(">7I", directory, 8)
        hash_size, hash_type, _platform, page_exp = struct.unpack_from("4B", directory, 36)
        assert flags & 2, "Expected ad-hoc signature flag"
        algorithm = {1: "sha1", 2: "sha256", 3: "sha256", 4: "sha384"}[hash_type]
        digest = lambda value: hashlib.new(algorithm, value).digest()[:hash_size]
        if not code_limit and version >= 0x20300:
            code_limit = struct.unpack_from(">Q", directory, 56)[0]
        page_size = 1 << page_exp if page_exp else code_limit
        assert code_count == (code_limit + page_size - 1) // page_size
        for index in range(code_count):
            actual = digest(data[index * page_size:min((index + 1) * page_size, code_limit)])
            expected = directory[hash_offset + index * hash_size:hash_offset + (index + 1) * hash_size]
            assert actual == expected, f"Code page {index} hash mismatch"
        for slot in [2, 5, 7]:
            if slot in blobs and special_count >= slot:
                expected = directory[hash_offset - slot * hash_size:hash_offset - (slot - 1) * hash_size]
                assert digest(blobs[slot]) == expected, f"Special slot {slot} hash mismatch"


for arch, folder, cpu in [("arm64", "mac-arm64", 0x0100000C), ("x64", "mac", 0x01000007)]:
    bundle = root / "release" / "cross-mac" / folder / "MeetStream Recorder.app"
    info = plistlib.loads((bundle / "Contents" / "Info.plist").read_bytes())
    main = bundle / "Contents" / "MacOS" / info["CFBundleExecutable"]
    assert int.from_bytes(main.read_bytes()[4:8], "little") == cpu
    helper = bundle / "Contents" / "Resources" / "cloudflared" / arch / "cloudflared"
    assert int.from_bytes(helper.read_bytes()[4:8], "little") == cpu
    count = 0
    for directory, _subdirs, files in os.walk(bundle, followlinks=False):
        for name in files:
            source = Path(directory) / name
            if source.is_symlink():
                continue
            with source.open("rb") as handle:
                magic = handle.read(4)
            if magic in mach_magic:
                try:
                    verify_code_hashes(source.read_bytes())
                except Exception as error:
                    raise RuntimeError(f"Embedded code hash verification failed for {source}: {error}") from error
                count += 1
    assert count >= 7, f"Expected Electron main, helpers and framework binaries; found {count}"
    checked = 0
    for seal_path in bundle.rglob("_CodeSignature/CodeResources"):
        seal = plistlib.loads(seal_path.read_bytes())
        for relative, specification in seal.get("files2", {}).items():
            if not isinstance(specification, dict):
                continue
            source = seal_path.parent.parent / relative
            if "hash2" in specification:
                assert hashlib.sha256(source.read_bytes()).digest() == specification["hash2"], relative
                checked += 1
            if "symlink" in specification:
                assert source.is_symlink() and os.readlink(source) == specification["symlink"], relative
    assert checked > 0
    # A changed executable byte must fail independently of the signing tool.
    corrupted = bytearray(main.read_bytes())
    corrupted[0x1000] ^= 1
    try:
        verify_code_hashes(bytes(corrupted))
        raise RuntimeError("Corrupted code unexpectedly passed verification")
    except AssertionError:
        pass
    print(f"Verified macOS {arch}: {count} Mach-O code-page hashes, {checked} resource SHA-256 seals, matching runtime/helper architectures.", flush=True)
