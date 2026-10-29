#!/usr/bin/env python3
"""HYPHSWORLD CI guard: inspect NEW diff lines only, never echo secret values.

No network calls, dependencies, repository modifications, or access to secrets.
Historical repository content needs a separate controlled audit.
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Strict signatures detect likely real credentials while avoiding public
# publishable/anon keys, placeholders, and ordinary documentation.
RULES = (
    ("Stripe secret or restricted API key",
     re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("Stripe webhook signing secret",
     re.compile(r"\bwhsec_[A-Za-z0-9]{16,}\b")),
    ("Supabase secret API key",
     re.compile(r"\bsb_secret_[A-Za-z0-9_-]{16,}\b")),
    ("Resend API credential",
     re.compile(r"\bre_[A-Za-z0-9]{28,}\b")),
    ("GitHub personal access token",
     re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{24,}\b")),
    ("Private key material",
     re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----")),
)
RESTRICTED_FILENAMES = re.compile(
    r"(^|/)(?:\.env(?:\.[^/]+)?|id_rsa|id_ed25519|[^/]+\.(?:pem|p12|pfx))$",
    re.IGNORECASE,
)


def changed_diff():
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    if event == "pull_request":
        base = os.environ.get("GITHUB_BASE_REF", "main")
        rev = "origin/" + base + "...HEAD"
    elif event == "push":
        before = ""
        path = os.environ.get("GITHUB_EVENT_PATH")
        if path and Path(path).is_file():
            try:
                before = str(json.loads(Path(path).read_text()).get("before", ""))
            except (ValueError, OSError):
                pass
        if re.fullmatch(r"[0-9a-f]{40}", before) and set(before) != {"0"}:
            rev = before + "..HEAD"
        else:
            rev = "HEAD^..HEAD"
    else:
        rev = "HEAD^..HEAD"
    return subprocess.check_output(
        ["git", "diff", "--no-ext-diff", "--no-textconv",
         "--unified=0", "--diff-filter=ACMR", rev, "--"],
        text=True, stderr=subprocess.PIPE,
    )


def scan_diff(diff):
    findings = []
    file_path = "unknown"
    line_number = 0
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            file_path = line[6:]
            if (RESTRICTED_FILENAMES.search(file_path)
                    and not file_path.endswith(".env.example")):
                findings.append((file_path, 0, "Private credential file path"))
        elif line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            if match:
                line_number = int(match.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            content = line[1:]
            for description, pattern in RULES:
                if pattern.search(content):
                    findings.append((file_path, line_number, description))
            line_number += 1
        elif line.startswith(" "):
            line_number += 1
    return findings


def validate_disclosure_file():
    path = Path(".well-known/security.txt")
    if not path.is_file():
        return "Missing .well-known/security.txt"
    fields = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition(":")
        if separator:
            fields.setdefault(key, []).append(value.strip())
    if not fields.get("Contact"):
        return "security.txt is missing a Contact field"
    if fields.get("Canonical") != ["https://hyphsworld.com/.well-known/security.txt"]:
        return "security.txt Canonical is missing or wrong"
    expiration = fields.get("Expires", [""])[0]
    try:
        expires = dt.datetime.fromisoformat(expiration.replace("Z", "+00:00"))
        if expires.tzinfo is None or expires <= dt.datetime.now(dt.timezone.utc):
            return "security.txt has expired or lacks a timezone"
    except ValueError:
        return "security.txt Expires is invalid"
    return None


def run_selftest():
    # Assemble fixtures instead of embedding strings that look like real keys.
    examples = [
        "sk_" + "live_" + "X" * 24,
        "rk_" + "test_" + "Y" * 24,
        "whsec_" + "K" * 24,
        "sb_" + "secret_" + "Z" * 24,
        "-----BEGIN PRIVATE KEY-----",
    ]
    for example in examples:
        if not scan_diff("+++ b/testfile.txt\n@@ -0,0 +1 @@\n+" + example):
            raise AssertionError("Secret fixture was not detected")
    safe = "sb_" + "publishable_" + "P" * 24
    if scan_diff("+++ b/index.html\n@@ -0,0 +1 @@\n+" + safe):
        raise AssertionError("Publishable key was incorrectly flagged")
    print("Security guard self-test passed.")


def main():
    if "--self-test" in sys.argv:
        run_selftest()
        return 0
    disclosure_error = validate_disclosure_file()
    if disclosure_error:
        print("FAIL: " + disclosure_error, file=sys.stderr)
        return 1
    try:
        diff = changed_diff()
    except subprocess.CalledProcessError:
        print("FAIL: unable to inspect repository diff", file=sys.stderr)
        return 1
    findings = scan_diff(diff)
    if findings:
        for path, line, kind in findings:
            print(f"FAIL: {kind} detected in {path} near added line {line}.",
                  file=sys.stderr)
        print("Remove credential material, then rotate any exposed keys.",
              file=sys.stderr)
        return 1
    print("Security guard passed: no known credential signatures in added lines; security.txt valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
