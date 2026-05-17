#!/usr/bin/env python3
"""
Reverse the InsecureShield CryptoJS-encrypted SP config blob from main.js.

Usage:
    echo 'U2FsdGVkX1+...' | python3 decrypt.py
    pbpaste                | python3 decrypt.py   # decrypt whatever's on the clipboard

The blob lives at line 40 of public/js/main.js; the key (SP_CONFIG_KEY)
lives three lines below at line 43. Both are visible in the browser's
JavaScript source — this script proves "encrypted in the browser" buys
exactly zero protection when the key ships in the same file.

Implementation: wraps the system `openssl` binary so there are zero Python
dependencies. CryptoJS uses the OpenSSL "Salted__" envelope with AES-256-CBC
and MD5-based EVP_BytesToKey, so plain openssl decrypts it directly.
"""
import sys
import json
import subprocess

KEY = "InsecureShield-Config-Key-2024Q4"   # same string as SP_CONFIG_KEY in main.js

blob = sys.stdin.read().strip()
if not blob:
    sys.exit("Usage: echo 'BLOB' | python3 decrypt.py")

result = subprocess.run(
    ['openssl', 'enc', '-d', '-aes-256-cbc', '-a', '-A',
     '-md', 'md5', '-pass', f'pass:{KEY}'],
    input=blob, capture_output=True, text=True
)
if result.returncode != 0:
    sys.exit(f"Decryption failed: {result.stderr.strip() or 'bad blob or wrong key'}")

try:
    print(json.dumps(json.loads(result.stdout), indent=2))
except json.JSONDecodeError:
    print(result.stdout, end='')
