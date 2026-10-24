"""Pull the company pool from akta.pro once and write companies.json.

  python pull.py            pull until MAX_COMPANIES or the credit budget is reached

Steps:
  1. List Generation: private US companies at pre-seed or seed, founded 2022 to 2026.
  2. For each company, enrich firmographic, industry, management_profile, strategic_signal.
  3. Write a flat record per company to companies.json.

Raw responses are cached in data/raw, so a rerun never pays for a company twice.
The API key is read from .env and is never printed.
"""
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()
KEY = os.environ.get("AKTA_API_KEY", "")
BASE = "https://api.akta.pro/api/v1"
SECTIONS = "firmographic,industry,management_profile,strategic_signal"

MAX_COMPANIES = 180
POOL_SIZE = 260  # a margin over MAX_COMPANIES, because some records are skipped
CREDIT_BUDGET = float(os.environ.get("CREDIT_BUDGET", "1000"))  # stop before spending more than this

DATA = Path("data")
RAW = DATA / "raw"
POOL_FILE = DATA / "pool.json"
OUT_FILE = Path("companies.json")

# Not startups a partner would source. Dropped from the pool before any credits are spent.
SKIP_CATEGORIES = ("venture capital", "private equity")


def fail(msg: str) -> None:
    print(f"STOP: {msg}")
    sys.exit(1)


def get_pool(client: httpx.Client) -> tuple[list[dict], float]:
    if POOL_FILE.exists():
        pool = json.loads(POOL_FILE.read_text(encoding="utf-8"))
        print(f"pool: {len(pool)} companies loaded from {POOL_FILE} (0 credits)")
        return pool, 0.0
    body = {
        "limit": POOL_SIZE,
        "filters": {
            "firmographic.company_type": ["private"],
            "firmographic.operating_status": ["operating"],
            "firmographic.founded_year": {"gte": 2022, "lte": 2026},
            "funding_detail.funding_overview.funding_stage": ["pre_seed", "seed"],
            "location.hq.country": ["USA"],
        },
    }
    r = client.post(f"{BASE}/list/generate/companies/", json=body)
    if r.status_code != 200:
        fail(f"List Generation HTTP {r.status_code}: {r.text}")
    j = r.json()
    cost = float(j.get("credits_consumed") or 0)
    pool = [
        h for h in j["data"]
        if not any(s in (h.get("product_category") or "").lower() for s in SKIP_CATEGORIES)
    ]
    DATA.mkdir(exist_ok=True)
    POOL_FILE.write_text(json.dumps(pool, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"pool: {len(j['data'])} returned, {len(pool)} kept, "
          f"{j.get('total_count')} match in total, credits {cost}")
    return pool, cost


def enrich(client: httpx.Client, uuid: str) -> tuple[dict | None, float]:
    """Return (response body, credits spent now). Cached responses cost 0."""
    cache = RAW / f"{uuid}.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8")), 0.0
    for attempt in range(4):
        r = client.get(f"{BASE}/company/enrichment/",
                       params={"company": uuid, "sections": SECTIONS})
        if r.status_code == 200:
            body = r.json()
            RAW.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
            return body, float(body.get("credits_consumed") or 0)
        if r.status_code in (401, 403):
            fail(f"HTTP {r.status_code} for {uuid}: {r.text}")
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(5 * (attempt + 1))
            continue
        print(f"  skip {uuid}: HTTP {r.status_code} {r.text[:200]}")
        return None, 0.0
    print(f"  skip {uuid}: still failing after retries")
    return None, 0.0


def iso_date(d: dict | None) -> str | None:
    """{'year': 2026, 'month': 3, 'day': 5} -> '2026-03-05'. Partial dates stay partial."""
    if not d or not d.get("year"):
        return None
    out = f"{int(d['year']):04d}"
    if d.get("month"):
        out += f"-{int(d['month']):02d}"
        if d.get("day"):
            out += f"-{int(d['day']):02d}"
    return out


def is_founder(p: dict) -> bool:
    code = (p.get("designation_category") or {}).get("code", "")
    return "founder" in (p.get("designation") or "").lower() or code in ("co_founder", "founder")


def first_source(item: dict) -> str | None:
    src = item.get("source") or []
    return src[0] if src else None


def build_record(body: dict) -> dict | None:
    data = body.get("data") or {}
    firm = data.get("firmographic") or {}
    if not firm.get("name"):
        return None
    industry = data.get("industry") or {}
    primary = next((i.get("label") for i in industry.get("industry") or []
                    if i.get("is_primary") and i.get("label")), None)
    sector = primary or industry.get("product_category")

    founders = []
    for p in (data.get("management_profile") or {}).get("profiles") or []:
        if not is_founder(p) or not p.get("name"):
            continue
        f = {"name": p["name"], "title": p.get("designation")}
        if p.get("previous_companies"):
            f["previous_companies"] = p["previous_companies"]
        linkedin = (p.get("social") or {}).get("linkedin")
        if linkedin:
            f["linkedin"] = linkedin
        founders.append(f)

    signal = data.get("strategic_signal") or {}
    return {
        "uuid": data.get("uuid"),
        "name": firm["name"],
        "website": firm.get("website"),
        "description": firm.get("company_description_short") or firm.get("company_description"),
        "sector": sector,
        "keywords": industry.get("keyword") or [],
        "founded_year": firm.get("founded_year"),
        "headcount_range": firm.get("headcount_range"),
        "founders": founders,
        "recent_moves": [
            {"type": (m.get("type") or {}).get("label"), "description": m.get("description"),
             "date": iso_date(m.get("date")), "source": first_source(m)}
            for m in signal.get("recent_move") or []
        ],
        "scale_indicators": [
            {"type": (s.get("type") or {}).get("label"), "value": s.get("value"),
             "description": s.get("description"), "source": first_source(s)}
            for s in signal.get("scale_indicator") or []
        ],
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not KEY:
        fail("AKTA_API_KEY is empty in .env")
    total = 0.0
    records: list[dict] = []
    seen: set[str] = set()
    with httpx.Client(timeout=120, headers={"x-api-key": KEY}) as client:
        pool, cost = get_pool(client)
        total += cost
        for i, hit in enumerate(pool, 1):
            if len(records) >= MAX_COMPANIES:
                break
            uuid = hit["uuid"]
            if uuid in seen:
                continue
            seen.add(uuid)
            if total + 5.5 > CREDIT_BUDGET and not (RAW / f"{uuid}.json").exists():
                print(f"STOP: credit budget {CREDIT_BUDGET} reached at {total}")
                break
            body, cost = enrich(client, uuid)
            total += cost
            rec = build_record(body) if body else None
            if rec:
                records.append(rec)
            print(f"[{i}/{len(pool)}] {hit['name'][:40]:40} credits +{cost}  "
                  f"total {total}  kept {len(records)}")
    OUT_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
    with_founders = sum(1 for r in records if r["founders"])
    with_prev = sum(1 for r in records if any(f.get("previous_companies") for f in r["founders"]))
    print(f"\nwrote {OUT_FILE}: {len(records)} companies, {with_founders} with founders, "
          f"{with_prev} with a founder previous_companies. credits this run: {total}")


if __name__ == "__main__":
    main()
