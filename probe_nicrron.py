"""Probe the Nicrron gateway: one embedding call and one chat completion call.

The API key is read from .env and is never printed.
"""
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()
KEY = os.environ.get("NICRRON_API_KEY", "")
BASE = "https://api.nicrron.ai/v1"
EMBED_MODEL = "openai/text-embedding-3-small"
CHAT_MODEL = "anthropic/claude-haiku-5-5"


def fail(label: str, resp: httpx.Response) -> None:
    print(f"{label} FAILED: HTTP {resp.status_code}\n{resp.text}")
    sys.exit(1)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not KEY:
        print("NICRRON_API_KEY is empty in .env")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    with httpx.Client(timeout=60, headers=headers) as c:
        r = c.post(f"{BASE}/embeddings", json={
            "model": EMBED_MODEL,
            "input": "Seed-stage robotics company with technical founders.",
        })
        if r.status_code != 200:
            fail("embedding", r)
        j = r.json()
        vec = j["data"][0]["embedding"]
        print("EMBEDDING OK")
        print("  model requested:", EMBED_MODEL, "| model returned:", j.get("model"))
        print("  vector length:", len(vec), "| first 3 values:", vec[:3])
        print("  usage:", j.get("usage"))

        r = c.post(f"{BASE}/chat/completions", json={
            "model": CHAT_MODEL,
            "messages": [{"role": "user", "content": "Reply with one short sentence: what is a seed-stage startup?"}],
            "max_tokens": 80,
        })
        if r.status_code != 200:
            fail("chat", r)
        j = r.json()
        print("\nCHAT OK")
        print("  model requested:", CHAT_MODEL, "| model returned:", j.get("model"))
        print("  response:", j["choices"][0]["message"]["content"])
        print("  usage:", j.get("usage"))


if __name__ == "__main__":
    main()
