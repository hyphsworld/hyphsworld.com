#!/usr/bin/env python3
"""Normalize the nine reviewed soundtrack assets and verify the encoded MP3s."""
import argparse
import concurrent.futures
import hashlib
import json
import math
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/audio/street-empire"
TARGET_LUFS = -16.0
MAX_TRUE_PEAK = -1.5


def run(args):
    return subprocess.run(args, text=True, capture_output=True, check=True)


def sha256(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def probe(file):
    info = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                          "format=duration:stream=sample_rate,channels", "-of", "json", str(file)]).stdout)
    return {"duration_seconds": float(info["format"]["duration"]),
            "sample_rate": int(info["streams"][0]["sample_rate"]),
            "channels": int(info["streams"][0]["channels"])}


def measure(file):
    result = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(file), "-map", "0:a:0",
                  "-af", "loudnorm=I=-16:TP=-2:LRA=50:print_format=json", "-f", "null", "-"])
    stats = json.loads(result.stderr[result.stderr.rfind("{"):])
    if not all(math.isfinite(float(stats[k])) for k in ["input_i", "input_tp", "input_lra", "input_thresh"]):
        raise ValueError(f"Invalid audio measurements: {file.name}")
    return stats


def normalize(entry, output):
    name = entry["file"]
    source = SOURCE / name
    if sha256(source) != entry["sha256"]:
        raise ValueError(f"{name} changed since the source measurements; refusing to overwrite user edits")
    original = probe(source)
    measured = measure(source)
    destination = output / name
    # MP3 encoding can add intersample peaks. Retry with more encoding headroom
    # if the decoded MP3 exceeds the final -1.5 dBTP ceiling.
    for ceiling in [-2.0, -2.5, -3.0]:
        filt = (f"loudnorm=I={TARGET_LUFS}:TP={ceiling}:LRA=50:"
                f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
                f"offset={measured['target_offset']}:linear=true:print_format=json")
        encoded = run(["ffmpeg", "-nostdin", "-hide_banner", "-y", "-i", str(source),
                       "-map", "0:a:0", "-map", "0:v?", "-map_metadata", "0",
                       "-af", filt, "-ar", str(original["sample_rate"]), "-ac", str(original["channels"]),
                       "-c:a", "libmp3lame", "-b:a", "320k", "-c:v", "copy", str(destination)])
        encoded_stats = json.loads(encoded.stderr[encoded.stderr.rfind("{"):])
        final = measure(destination)
        if float(final["input_tp"]) <= MAX_TRUE_PEAK:
            break
    else:
        raise ValueError(f"{name}: decoded MP3 still exceeds the true-peak ceiling")
    if abs(float(final["input_i"]) - TARGET_LUFS) > 0.3:
        raise ValueError(f"{name}: loudness {final['input_i']} LUFS is outside the target tolerance")
    encoded_info = probe(destination)
    if (encoded_info["sample_rate"] != original["sample_rate"] or encoded_info["channels"] != original["channels"] or
            abs(encoded_info["duration_seconds"] - original["duration_seconds"]) > 0.1):
        raise ValueError(f"{name}: sample rate, channels, or duration changed unexpectedly")
    return {"file": name, "source_sha256": entry["sha256"], "sha256": sha256(destination),
            "original_lufs": float(measured["input_i"]), "original_true_peak_dbtp": float(measured["input_tp"]),
            "integrated_lufs": float(final["input_i"]), "true_peak_dbtp": float(final["input_tp"]),
            "loudness_range_lu": float(final["input_lra"]), "normalization_type": encoded_stats["normalization_type"],
            **encoded_info}


def verify():
    report = json.loads((SOURCE / "normalization.json").read_text())
    for entry in report["tracks"]:
        file = SOURCE / entry["file"]
        if sha256(file) != entry["sha256"]:
            raise ValueError(f"{file.name}: checksum changed; rerun audio measurements")
        stats = measure(file)
        if abs(float(stats["input_i"]) - TARGET_LUFS) > 0.3 or float(stats["input_tp"]) > MAX_TRUE_PEAK:
            raise ValueError(f"{file.name}: loudness or true peak is out of bounds")
    print(f"Verified {len(report['tracks'])} MP3s: -16 LUFS ±0.3, decoded true peak ≤-1.5 dBTP")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        verify()
        return
    if not args.output or args.output.resolve() == SOURCE.resolve():
        parser.error("Use a separate --output directory to preserve the source files")
    args.output.mkdir(parents=True, exist_ok=True)
    entries = json.loads((SOURCE / "normalization-source.json").read_text())["tracks"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(lambda entry: normalize(entry, args.output), entries))
    report = {"target_lufs": TARGET_LUFS, "maximum_true_peak_dbtp": MAX_TRUE_PEAK,
              "tolerance_lu": 0.3, "tracks": results}
    (args.output / "normalization.json").write_text(json.dumps(report, indent=2) + "\n")
    for entry in results:
        print(f"{entry['file']}: {entry['original_lufs']:.2f} → {entry['integrated_lufs']:.2f} LUFS, peak {entry['true_peak_dbtp']:.2f} dBTP")


if __name__ == "__main__":
    main()
