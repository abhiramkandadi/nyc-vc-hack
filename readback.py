"""The thesis readback: three short sentences describing the partner's filter.

Sends the learned weights and the saved and passed company names to a small chat model
through Nicrron. The API key is read from .env and is never printed.
"""
import os
import re

import httpx
from dotenv import load_dotenv

load_dotenv()
NICRRON_BASE = "https://api.nicrron.ai/v1"
CHAT_MODEL = "anthropic/claude-haiku-5-5"
MAX_WORDS = 60
MAX_NAMES = 20  # most recent saved and passed names that go into the prompt
# The model thinks before it writes and the thinking counts against this cap. Measured use was
# 1,200 to 2,400 tokens for about 50 words. At 160 and at 1,500 it ran out and returned no text.
MAX_TOKENS = 6000

SYSTEM = (
    "You write the thesis readback for a venture investor's sourcing tool. "
    "Plain, direct sentences. No preamble, no lists, no hedging."
)


def build_prompt(weights: dict[str, float], saved: list[str], passed: list[str]) -> str:
    w = "\n".join(f"- {name}: {v:+.2f}" for name, v in list(weights.items())[:8]) or "- none yet"
    return (
        "A partner swiped through startups. Positive weights mean the partner leans toward that "
        "feature, negative weights mean away from it. Each company is shown as "
        "name (sector, team size).\n\n"
        f"Learned weights:\n{w}\n\n"
        f"Saved: {', '.join(saved[-MAX_NAMES:]) or 'none'}\n"
        f"Passed: {', '.join(passed[-MAX_NAMES:]) or 'none'}\n\n"
        f"Write exactly three short sentences, {MAX_WORDS} words at most in total, describing this "
        "partner's filter in plain words. Do not quote numbers or weights. The first two sentences "
        "state what the partner favors and avoids. The third sentence must be a contradiction: "
        "name one saved company and one passed company that look alike but got opposite "
        "decisions, or a feature the partner seems to like that the data says they avoid. "
        "Use only what the data shows."
    )


def cap_words(text: str, limit: int = MAX_WORDS) -> str:
    """Trim to `limit` words, ending on a sentence boundary when one exists."""
    text = " ".join(text.split())
    words = text.split(" ")
    if len(words) <= limit:
        return text
    cut = " ".join(words[:limit])
    ends = [m.end() for m in re.finditer(r"[.!?](?=\s|$)", cut)]
    return cut[:ends[-1]] if ends else cut.rstrip(",;:") + "."


def generate(weights: dict[str, float], saved: list[str], passed: list[str]) -> str:
    key = os.environ.get("NICRRON_API_KEY", "")
    if not key:
        raise RuntimeError("NICRRON_API_KEY is empty in .env")
    r = httpx.post(
        f"{NICRRON_BASE}/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": CHAT_MODEL,
            "messages": [{"role": "system", "content": SYSTEM},
                         {"role": "user", "content": build_prompt(weights, saved, passed)}],
            "max_tokens": MAX_TOKENS,
            "temperature": 0.3,
        },
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"chat HTTP {r.status_code}: {r.text}")
    choice = r.json()["choices"][0]
    content = choice["message"].get("content")
    if not content:
        raise RuntimeError(f"model returned no text (finish_reason={choice.get('finish_reason')})")
    return cap_words(content)
