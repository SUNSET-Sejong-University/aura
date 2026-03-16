#!/usr/bin/env python3
"""
mock_puck.py – Software simulator for an AURA hardware Puck.

Sends TAG_PLACED / TAG_REMOVED events to the gateway over HTTP,
mimicking the behaviour of a real ESP32-S3 Puck.

Usage:
    python3 tests/hardware/mock_puck.py [--gateway http://localhost:3000] [--uid AABBCCDD]
"""

import argparse
import json
import random
import time
import urllib.request
import urllib.error
from datetime import datetime

# ── CLI args ──────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AURA mock hardware Puck")
parser.add_argument("--gateway", default="http://localhost:3000",
                    help="Base URL of the AURA gateway")
parser.add_argument("--uid", default=None,
                    help="NFC tag UID to simulate (random 4-byte hex if omitted)")
parser.add_argument("--device-id", default="puck-mocktest",
                    help="Device ID to report")
parser.add_argument("--cycles", type=int, default=3,
                    help="Number of place/remove cycles to run (0 = infinite)")
parser.add_argument("--interval", type=float, default=1.0,
                    help="Seconds between place and remove events")
args = parser.parse_args()

GATEWAY_URL = f"{args.gateway.rstrip('/')}/api/events"
DEVICE_ID   = args.device_id
TAG_UID     = args.uid or "".join(f"{random.randint(0, 255):02X}" for _ in range(4))

print(f"[mock_puck] Gateway : {GATEWAY_URL}")
print(f"[mock_puck] Device  : {DEVICE_ID}")
print(f"[mock_puck] Tag UID : {TAG_UID}")
print()


def post_event(event_type: str) -> bool:
    """POST a single tag event. Returns True on success."""
    payload = json.dumps({
        "event":     event_type,
        "uid":       TAG_UID,
        "deviceId":  DEVICE_ID,
        "timestamp": int(time.time() * 1000),
    }).encode()

    req = urllib.request.Request(
        GATEWAY_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode())
            ts   = datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] ✓ {event_type:14s}  intent={body.get('intent', '?'):<12s} "
                  f"workflows={body.get('workflows', [])}")
            return True
    except urllib.error.URLError as exc:
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] ✗ {event_type:14s}  error: {exc.reason}")
        return False


def run_cycles(n: int) -> None:
    cycle = 0
    while n == 0 or cycle < n:
        cycle += 1
        print(f"── Cycle {cycle} {'(∞)' if n == 0 else f'/ {n}'} ──")
        post_event("TAG_PLACED")
        time.sleep(args.interval)
        post_event("TAG_REMOVED")
        time.sleep(args.interval)


if __name__ == "__main__":
    run_cycles(args.cycles)
    print("\n[mock_puck] Done.")
