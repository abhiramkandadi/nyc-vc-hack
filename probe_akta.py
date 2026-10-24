"""Probe the akta.pro API: look up ONE company and print the raw response.

Usage: python probe_akta.py [query] [sections]
  query     company name, domain or UUID (default: replit.com)
  sections  comma-separated enrichment sections

Prints HTTP status, rate-limit or credit headers, and the full raw JSON.
The API key is read from .env and is never printed.
"""
import json
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()
KEY = os.environ.get("AKTA_API_KEY", "")
BASE = "https://api.akta.pro/api/v1"
DEFAULT_SECTIONS = (
    "firmographic,industry,management_profile,strategic_signal,"
    "digital_presence,financial_estimate"
)
HEADER_HINTS = ("rate", "limit", "credit", "remaining", "retry", "quota", "balance")


def show(label: str, resp: httpx.Response) -> None:
    print(f"\n=== {label} ===")
    print(f"HTTP {resp.status_code} {resp.request.method} {resp.request.url}")
    hits = {k: v for k, v in resp.headers.items() if any(h in k.lower() for h in HEADER_HINTS)}
    print("rate-limit / credit headers:", hits or "none")
    print("all response header names:", sorted(resp.headers.keys()))
    try:
        print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
    except ValueError:
        print(resp.text)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if not KEY:
        print("AKTA_API_KEY is empty in .env")
        return 1
    query = sys.argv[1] if len(sys.argv) > 1 else "replit.com"
    sections = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_SECTIONS
    headers = {"x-api-key": KEY}
    with httpx.Client(timeout=60, headers=headers) as client:
        search = client.get(f"{BASE}/company/search/", params={"query": query})
        show("company/search (free)", search)
        if search.status_code != 200:
            return 1
        results = search.json().get("data") or []
        if not results:
            print("no search results")
            return 1
        uuid = results[0]["uuid"]
        print(f"\nusing first result: {results[0].get('name')} ({uuid})")
        enrich = client.get(
            f"{BASE}/company/enrichment/", params={"company": uuid, "sections": sections}
        )
        show(f"company/enrichment sections={sections}", enrich)
        print("\ncredits_consumed (from body):", enrich.json().get("credits_consumed"))
        return 0 if enrich.status_code == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
