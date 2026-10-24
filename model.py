"""Embeddings, partner actions and the ranker.

Each company becomes an embedding (cached on disk) plus a few readable features.
A logistic regression learns save/intro against pass and re-ranks unseen companies.
The weights on the readable features are what the thesis readback talks about.
The API key is read from .env and is never printed.
"""
import hashlib
import json
import os
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import httpx
import numpy as np
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression

load_dotenv()
NICRRON_BASE = "https://api.nicrron.ai/v1"
EMBED_MODEL = "openai/text-embedding-3-small"
EMBED_CACHE = Path("data/embeddings.json")
EMBED_BATCH = 64
EMBED_SCALE = 3.0  # puts the unit-length embedding on a scale comparable to the 0/1 features

ACTIONS = ("pass", "save", "track", "intro")
POSITIVE = ("save", "intro")  # track is "right company, wrong time", so it is not used to fit


def company_text(c: dict) -> str:
    parts = [f"{c['name']}.", c.get("description") or ""]
    if c.get("sector"):
        parts.append(f"Sector: {c['sector']}.")
    if c.get("keywords"):
        parts.append("Keywords: " + ", ".join(c["keywords"]) + ".")
    for f in c.get("founders", []):
        line = f"Founder {f['name']}, {f.get('title') or 'founder'}"
        if f.get("previous_companies"):
            line += ", previously " + "; ".join(f["previous_companies"])
        parts.append(line + ".")
    return " ".join(p for p in parts if p)[:3000]


def load_embeddings(companies: list[dict]) -> dict[str, np.ndarray]:
    """Return {uuid: vector}. Only companies missing from the disk cache are sent to Nicrron."""
    cache = json.loads(EMBED_CACHE.read_text(encoding="utf-8")) if EMBED_CACHE.exists() else {}
    texts = {c["uuid"]: company_text(c) for c in companies}
    hashes = {u: hashlib.sha1(t.encode("utf-8")).hexdigest() for u, t in texts.items()}
    todo = [u for u in texts if cache.get(u, {}).get("h") != hashes[u]]
    if todo:
        key = os.environ.get("NICRRON_API_KEY", "")
        if not key:
            raise RuntimeError("NICRRON_API_KEY is empty in .env")
        with httpx.Client(timeout=120, headers={"Authorization": f"Bearer {key}"}) as client:
            for i in range(0, len(todo), EMBED_BATCH):
                batch = todo[i:i + EMBED_BATCH]
                r = client.post(f"{NICRRON_BASE}/embeddings",
                                json={"model": EMBED_MODEL, "input": [texts[u] for u in batch]})
                if r.status_code != 200:
                    raise RuntimeError(f"embeddings HTTP {r.status_code}: {r.text}")
                for u, item in zip(batch, sorted(r.json()["data"], key=lambda d: d["index"])):
                    cache[u] = {"h": hashes[u], "v": item["embedding"]}
        EMBED_CACHE.parent.mkdir(exist_ok=True)
        EMBED_CACHE.write_text(json.dumps(cache), encoding="utf-8")
    return {u: np.array(cache[u]["v"], dtype=np.float32) for u in texts}


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    for fmt, n in (("%Y-%m-%d", 10), ("%Y-%m", 7), ("%Y", 4)):
        try:
            return datetime.strptime(s[:n], fmt).date()
        except ValueError:
            continue
    return None


def _first_number(s: str | None) -> int | None:
    digits = "".join(ch if ch.isdigit() else " " for ch in (s or "")).split()
    return int(digits[0]) if digits else None


class Features:
    """Readable features. The names go straight into the thesis readback."""

    def __init__(self, companies: list[dict], top_sectors: int = 10):
        counts = Counter(c.get("sector") for c in companies if c.get("sector"))
        self.sectors = [s for s, n in counts.most_common(top_sectors) if n >= 3]
        self.names = (
            [f"sector: {s}" for s in self.sectors]
            + ["has named founders", "two or more founders", "founder has prior employers",
               "recent funding round", "signal in last 180 days", "founded 2025 or later",
               "team of 10 or fewer"]
        )

    def vector(self, c: dict, today: date | None = None) -> np.ndarray:
        today = today or date.today()
        founders = c.get("founders", [])
        moves = c.get("recent_moves", [])
        dates = [d for d in (_parse_date(m.get("date")) for m in moves) if d]
        headcount = _first_number(c.get("headcount_range"))
        v = [1.0 if c.get("sector") == s else 0.0 for s in self.sectors]
        v += [
            1.0 if founders else 0.0,
            1.0 if len(founders) >= 2 else 0.0,
            1.0 if any(f.get("previous_companies") for f in founders) else 0.0,
            1.0 if any(m.get("type") == "Funding Round" for m in moves) else 0.0,
            1.0 if dates and (today - max(dates)).days <= 180 else 0.0,
            1.0 if (c.get("founded_year") or 0) >= 2025 else 0.0,
            1.0 if headcount is not None and headcount <= 10 else 0.0,
        ]
        return np.array(v, dtype=np.float32)


class Ranker:
    def __init__(self, companies: list[dict], embeddings: dict[str, np.ndarray]):
        self.companies = companies
        self.index = {c["uuid"]: i for i, c in enumerate(companies)}
        self.features = Features(companies)
        self.F = np.array([self.features.vector(c) for c in companies])
        E = np.array([embeddings[c["uuid"]] for c in companies])
        self.X = np.hstack([E * EMBED_SCALE, self.F])
        self.actions: list[tuple[str, str]] = []
        self.clf: LogisticRegression | None = None

    # --- actions -----------------------------------------------------------------
    def seen(self) -> set[str]:
        return {u for u, _ in self.actions}

    def record(self, uuid: str, action: str) -> None:
        if action not in ACTIONS:
            raise ValueError(f"unknown action {action!r}, expected one of {ACTIONS}")
        if uuid not in self.index:
            raise KeyError(uuid)
        if uuid in self.seen():
            raise ValueError(f"{uuid} already has an action")
        self.actions.append((uuid, action))
        self._fit()

    def reset(self) -> None:
        self.actions, self.clf = [], None

    def _fit(self) -> None:
        rows = [(self.index[u], a in POSITIVE) for u, a in self.actions if a != "track"]
        y = np.array([p for _, p in rows])
        if len(set(y.tolist())) < 2:
            self.clf = None  # needs at least one positive and one pass
            return
        X = self.X[[i for i, _ in rows]]
        self.clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000).fit(X, y)

    # --- outputs -----------------------------------------------------------------
    def _scores(self, idx: list[int]) -> np.ndarray:
        X = self.X[idx]
        if self.clf is not None:
            return self.clf.predict_proba(X)[:, 1]
        pos = [self.index[u] for u, a in self.actions if a in POSITIVE]
        neg = [self.index[u] for u, a in self.actions if a == "pass"]
        if pos or neg:  # only one kind of action so far: similarity to the centroid
            ref = self.X[pos if pos else neg].mean(axis=0)
            sim = X @ ref / (np.linalg.norm(X, axis=1) * np.linalg.norm(ref) + 1e-9)
            return sim if pos else -sim
        richness = self.F[idx, 1:4].sum(axis=1) + self.F[idx, 4:6].sum(axis=1)  # cold start
        return richness.astype(float)

    def ranked_unseen(self) -> list[dict]:
        seen = self.seen()
        idx = [i for i, c in enumerate(self.companies) if c["uuid"] not in seen]
        if not idx:
            return []
        scores = self._scores(idx)
        order = np.argsort(-scores, kind="stable")
        return [{"company": self.companies[idx[o]], "score": float(scores[o])} for o in order]

    def weights(self) -> dict[str, float]:
        """Weights on the readable features, largest magnitude first. Empty until a fit exists."""
        if self.clf is None:
            return {}
        w = self.clf.coef_[0][-len(self.features.names):]
        pairs = sorted(zip(self.features.names, w.tolist()), key=lambda p: -abs(p[1]))
        return {n: round(x, 3) for n, x in pairs}

    def reasons(self, uuid: str, k: int = 2) -> list[str]:
        """The k readable features that push this company's score up the most."""
        if self.clf is None:
            return []
        i = self.index[uuid]
        w = self.clf.coef_[0][-len(self.features.names):]
        contrib = self.F[i] * w
        top = [j for j in np.argsort(-contrib)[:k] if contrib[j] > 0]
        return [self.features.names[j] for j in top]
