"""management_profile previous_companies probe. Data check only, not product code.

  python probe_mgmt.py list OUT.json     one List Generation call (identity fields only),
                                         pre_seed or seed, founded 2023 to 2026, USA
  python probe_mgmt.py pull OUT.json NAME=UUID ...
                                         management_profile ONLY, one call per company
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


def die(resp: httpx.Response) -> None:
    print(f"ERROR HTTP {resp.status_code} {resp.request.url}\n{resp.text}")
    sys.exit(1)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not KEY:
        print("AKTA_API_KEY is empty in .env")
        sys.exit(1)
    mode, out = sys.argv[1], sys.argv[2]
    with httpx.Client(timeout=120, headers={"x-api-key": KEY}) as c:
        if mode == "list":
            body = {
                "limit": 60,
                "filters": {
                    "firmographic.founded_year": {"gte": 2023, "lte": 2026},
                    "funding_detail.funding_overview.funding_stage": ["pre_seed", "seed"],
                    "location.hq.country": ["USA"],
                },
            }
            r = c.post(f"{BASE}/list/generate/companies/", json=body)
            if r.status_code != 200:
                die(r)
            j = r.json()
            json.dump(j, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            print("count", j.get("count"), "total_count", j.get("total_count"),
                  "credits_consumed", j.get("credits_consumed"),
                  "warnings", j.get("warnings"))
            for h in j["data"]:
                print(f"{h['uuid']}  {h['name']!r}  {h.get('website')}  {h.get('product_category')!r}")
        elif mode == "pull":
            total, saved = 0.0, {}
            for pair in sys.argv[3:]:
                name, uuid = pair.split("=", 1)
                r = c.get(f"{BASE}/company/enrichment/",
                          params={"company": uuid, "sections": "management_profile"})
                if r.status_code != 200:
                    die(r)
                b = r.json()
                total += b.get("credits_consumed") or 0
                saved[name] = b
                print(f"{name} ({uuid}): credits_consumed={b.get('credits_consumed')} "
                      f"running_total={total}")
            json.dump(saved, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            print("saved", out)


if __name__ == "__main__":
    main()
