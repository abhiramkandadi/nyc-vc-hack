"""Founder data quality probe for akta.pro. Data check only, not product code.

  python probe_founders.py search            top search hits for the five names (free)
  python probe_founders.py enrich OUT.json NAME=UUID ...
                                             enrich each UUID with four sections,
                                             print credits per call and running total,
                                             save raw responses to OUT.json
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
SECTIONS = "firmographic,industry,management_profile,strategic_signal"
NAMES = ["Replit", "Anysphere Cursor", "Modal Labs", "Sieve", "Baseten"]


def die(resp: httpx.Response) -> None:
    print(f"ERROR HTTP {resp.status_code} {resp.request.url}\n{resp.text}")
    sys.exit(1)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not KEY:
        print("AKTA_API_KEY is empty in .env")
        sys.exit(1)
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    with httpx.Client(timeout=90, headers={"x-api-key": KEY}) as c:
        if mode == "search":
            for name in NAMES:
                r = c.get(f"{BASE}/company/search/", params={"query": name})
                if r.status_code != 200:
                    die(r)
                print(f"\n## {name}")
                for h in r.json()["data"][:6]:
                    print(f"  {h['uuid']}  {h['name']!r}  {h['website']}  "
                          f"{h['product_category']!r}  rank={h.get('akta_rank')}")
        elif mode == "enrich":
            out, pairs = sys.argv[2], sys.argv[3:]
            total, saved = 0.0, {}
            for pair in pairs:
                name, uuid = pair.split("=", 1)
                r = c.get(f"{BASE}/company/enrichment/",
                          params={"company": uuid, "sections": SECTIONS})
                if r.status_code != 200:
                    die(r)
                body = r.json()
                cost = body.get("credits_consumed") or 0
                total += cost
                saved[name] = body
                print(f"{name} ({uuid}): credits_consumed={cost}  running_total={total}")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(saved, f, ensure_ascii=False, indent=1)
            print(f"saved raw responses to {out}")
        else:
            print(__doc__)


if __name__ == "__main__":
    main()
