#!/usr/bin/env python3
"""
Reverse SHA-256(password + salt) hashes from claims-portal-demo using wordlist.txt.

Usage:
    echo 'HASH:SALT' | python3 crack.py
    cat hashes.txt | python3 crack.py    # multiple HASH:SALT pairs, one per line

Output:
    HASH  →  CRACKED_PASSWORD
    or nothing if the password isn't in the wordlist.
"""
import sys
import hashlib

# Load wordlist once
with open('wordlist.txt') as f:
    wordlist = [w.strip() for w in f if w.strip()]

# Process each HASH:SALT pair on stdin
for line in sys.stdin:
    line = line.strip()
    if not line or ':' not in line:
        continue
    target, salt = line.split(':', 1)
    target = target.upper()
    for pw in wordlist:
        if hashlib.sha256((pw + salt).encode()).hexdigest().upper() == target:
            print(f'{target[:16]}…  →  {pw}')
            break
