"""Export the Next.js snapshot without buying data or modifying the source seed."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def export() -> list[dict]:
    seed = json.loads((ROOT / "lib/seededAktaData.json").read_text())
    profiles = seed["data"]
    if not profiles or len({p["id"] for p in profiles}) != len(profiles):
        raise ValueError("Seed must contain nonempty, unique profile IDs")
    return [{"uuid": p["id"], "name": p["name"],
             "description": p["pitchSummary"], "sector": p["targetSector"],
             "keywords": [], "headcount_range": None,
             "founders": [{"name": p["founderName"], "title": "Founder",
                           "previous_companies": [p["exCompany"]] if p.get("backgroundVerified") and p["exCompany"] != "Not disclosed" else []}],
             "recent_moves": [{"description": e["text"], "source": e["sourceUrl"],
                               "date": e["observedAt"]} for e in p["signalEvidence"]],
             "scale_indicators": []} for p in profiles]

if __name__ == "__main__":
    output = Path(__file__).resolve().parent / "companies.json"
    output.write_text(json.dumps(export(), indent=2))
    print(f"Exported {len(export())} profiles to {output}")
