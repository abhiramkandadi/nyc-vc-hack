"""Convert companies.json into the Next.js seed shape (lib/seededAktaData.local.json).

  python export_profiles.py

The Next.js app reads that file in preference to the committed 50-profile seed. It is
gitignored because the records are licensed akta.pro data and the repo is public.

His schema needs fields the akta pull does not have. Where one is missing this script uses
an explicit label ("Not disclosed") and adds a warning to the profile. It never invents a
founder, a former employer or a photograph.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "lib" / "seededAktaData.local.json"

# His schema accepts four sector tags. The rules run in order, and the last one is the default.
SECTOR_RULES = [
    ("Physical AI", r"robot|drone|hardware|wearable|\bdevices?\b|spacecraft|avionics|electronic|accelerator|sensor"),
    ("AI Agents", r"\bagents?\b|copilot|conversational|assistant|orchestration"),
    ("AI Infra", r"infrastructure|inference|compute|\bgpu|model|mlops|compiler|serving|\bai\b"),
]
DEFAULT_SECTOR = "B2B SaaS"
HEADSHOTS = [  # the same stock portraits his seed uses, marked as placeholders
    "photo-1573496359142-b8d87734a5a2", "photo-1494790108377-be9c29b29330",
    "photo-1500648767791-00dcc994a43e", "photo-1507003211169-0a1dd7228f2d",
    "photo-1534528741775-53994a69daeb", "photo-1519085360753-af0119f7cbe7",
]
NOT_DISCLOSED = "Not disclosed"


def target_sector(c: dict) -> str:
    label = (c.get("sector") or "").lower()
    for tag, pattern in SECTOR_RULES:
        if re.search(pattern, label):
            return tag
    return DEFAULT_SECTOR


def clip(text: str, n: int = 90) -> str:
    text = " ".join((text or "").split())
    if len(text) <= n:
        return text
    return text[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def iso(date: str | None) -> str | None:
    """'2026-03' -> '2026-03-01T00:00:00'. A partial date is rounded to the first day."""
    if not date:
        return None
    parts = date.split("-")
    y, m, d = (int(parts[0]), int(parts[1]) if len(parts) > 1 else 1, int(parts[2]) if len(parts) > 2 else 1)
    return f"{y:04d}-{m:02d}-{d:02d}T00:00:00"


def employer(name: str) -> str:
    return name.split(" (")[0].strip()


def convert(c: dict, i: int) -> dict:
    founders = c.get("founders") or []
    lead = founders[0] if founders else None
    with_prev = next((f for f in founders if f.get("previous_companies")), None)
    moves = sorted([m for m in c.get("recent_moves", []) if m.get("description")],
                   key=lambda m: m.get("date") or "", reverse=True)
    scale = [s for s in c.get("scale_indicators", []) if s.get("value")]

    signals = [clip(m["description"]) for m in moves]
    signals += [clip(f"{s['type']}: {s['value']}") for s in scale if s.get("type")]
    if c.get("founded_year"):
        signals.append(f"Founded {c['founded_year']}")
    signals.append(clip(f"Sector: {c.get('sector') or 'not classified'}"))
    signals = signals[:3]

    description = c.get("description") or clip(f"{c['name']}. Sector: {c.get('sector') or 'not classified'}.", 300)
    tag = target_sector(c)
    prev = [employer(p) for p in (with_prev or {}).get("previous_companies", [])][:3]
    co_founders = [f["name"] for f in founders[1:3]]

    # Evidence coverage, not quality: how much of the card the source could fill.
    points = sum([bool(c.get("description")), bool(founders), bool(prev),
                  any(m.get("date") for m in moves), sum(1 for m in moves if m.get("date")) >= 3, bool(scale)])
    score = 85 + round(13 * points / 6)

    first = (lead["name"].split()[0] if lead else None)
    portrait = f"https://images.unsplash.com/{HEADSHOTS[i % len(HEADSHOTS)]}?auto=format&fit=crop&crop=faces&q=90&w=1200"
    warnings = ["Portrait is illustrative, not a verified photograph of the founder.",
                "Stage is not in the source. Seed is a default, and the pool was filtered to pre-seed and seed.",
                f"Sector tag '{tag}' is the nearest of four tags to '{c.get('sector')}'."]
    if not founders:
        warnings.append("The source lists no founders for this company.")

    background = f"Previously at {', '.join(prev)}" if prev else "Background not disclosed in source"
    if co_founders:
        background += f". Co-founders: {', '.join(co_founders)}."
    return {
        "id": c["uuid"], "name": c["name"],
        "founderName": lead["name"] if lead else NOT_DISCLOSED,
        "founderImage": portrait, "founderAvatar": portrait,
        "exCompany": prev[0] if prev else NOT_DISCLOSED,
        "founderBackground": background, "headline": signals[0], "signalScore": score,
        "stage": "Seed", "signals": signals, "pitchSummary": description, "targetSector": tag,
        "sectorLabel": (c.get("sector") or "").split(" (")[0] or tag,
        "draftEmail": (f"Hi {first or 'team'},\n\nI came across {c['name']}'s recent update: \"{signals[0]}\". "
                       f"We are researching {tag.lower()} and would enjoy learning more about your product, "
                       "early customer feedback, and roadmap.\n\nWould you be open to a brief introductory "
                       "conversation?\n\nBest,\nThe investment team"),
        "dataSource": "akta.pro", "imageIsPlaceholder": True, "imageSource": "unsplash-placeholder",
        "stageIsInferred": True, "sectorIsInferred": True, "signalScoreMethod": "evidence-coverage-v1",
        "signalEvidence": [{"text": m["description"], "sourceUrl": m.get("source"), "observedAt": iso(m.get("date"))}
                           for m in moves[:12]],
        "warnings": warnings, "discoverySector": tag,
    }


def main() -> None:
    companies = json.loads((HERE / "companies.json").read_text(encoding="utf-8"))
    profiles = [convert(c, i) for i, c in enumerate(companies)]
    doc = {
        "schemaVersion": 1, "provider": "akta.pro", "sourceApiUrl": "https://api.akta.pro/api/v1",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "data": profiles,
        "provenance": {"transport": "rest", "newsIds": [], "notes": [
            "One List Generation call plus Company Data (firmographic, industry, management_profile, strategic_signal).",
            "Converted from companies.json by services/thesis/export_profiles.py."]},
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    sizes = {t: sum(p["targetSector"] == t for p in profiles) for t in ("AI Infra", "AI Agents", "B2B SaaS", "Physical AI")}
    print(f"wrote {OUT} with {len(profiles)} profiles, {OUT.stat().st_size // 1024} KB; sectors {sizes}")


if __name__ == "__main__":
    main()
