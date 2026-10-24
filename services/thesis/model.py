"""Embeddings, partner actions and the ranker.

Each company becomes an embedding (cached on disk) plus a few readable features.
A logistic regression learns save/intro against pass and re-ranks unseen companies.
The weights on the readable features are what the thesis readback talks about.
The API key is read from .env and is never printed.
"""
import hashlib
import json
import os
import re
from pathlib import Path

import httpx
import numpy as np
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression

load_dotenv()
NICRRON_BASE = "https://api.nicrron.ai/v1"
EMBED_MODEL = "openai/text-embedding-3-small"
EMBED_CACHE = Path("data/embeddings.json")
FUND_CACHE = Path("data/fund_embeddings.json")
EMBED_BATCH = 64
NO_FIT_ACTION_WEIGHT = 1 / 3  # how much saves and passes count against the fund thesis before a fit
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
    return _embed_cached({c["uuid"]: company_text(c) for c in companies}, EMBED_CACHE)


def load_fund_embeddings(funds: list[dict]) -> dict[str, np.ndarray]:
    """Return {fund id: vector} for each fund's thesis text, embedded once and cached."""
    return _embed_cached({f["id"]: f["thesis"] for f in funds}, FUND_CACHE)


def _embed_cached(texts: dict[str, str], cache_file: Path) -> dict[str, np.ndarray]:
    """Embed {key: text}. A key is sent to Nicrron only if its text changed since it was cached."""
    cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
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
        cache_file.parent.mkdir(exist_ok=True)
        cache_file.write_text(json.dumps(cache), encoding="utf-8")
    return {u: np.array(cache[u]["v"], dtype=np.float32) for u in texts}


def _first_number(s: str | None) -> int | None:
    digits = "".join(ch if ch.isdigit() else " " for ch in (s or "")).split()
    return int(digits[0]) if digits else None


# Themes are matched against the sector label only, never the description. A security
# company that sells to hospitals must not count as healthcare. Patterns use word
# boundaries because "securities" is not security and "(DEX)" is not a crypto exchange.
THEMES = {
    "security": r"\bsecurity\b|penetration|identity\W+(access|orchestration)|zero trust|red team"
                r"|incident response|privacy",
    "developer tools and AI agents": r"developer|devsecops|\bsdks?\b|ci/cd|compiler|\bagents?\b",
    "crypto and blockchain": r"blockchain|crypto|token|defi|on-chain|\bnfts?\b|stablecoin|cross-chain"
                             r"|layer 2|rollup|decentral|\bamms?\b|digital asset|self-custody"
                             r"|mining pool|liquidity|lending protocol",
    "healthcare": r"health|clinic|medical|pharma|drug|prescription|\bcare\b|mrna",
    "hardware and robotics": r"robot|wearable|\bdevices?\b|electronic|accelerator|cabling|avionics"
                             r"|spacecraft|reactor|equipment|fiber optic",
    "services and consulting": r"\bservices\b|consult|advisory|agenc|outsourc|wealth management"
                               r"|property management",
}
_THEME_RE = {name: re.compile(p, re.IGNORECASE) for name, p in THEMES.items()}


class Features:
    """Readable features. The names go straight into the thesis readback."""

    def __init__(self, companies: list[dict]):
        self.names = list(THEMES) + ["team of 51 or more", "team of 10 or fewer", "has named founders"]

    def vector(self, c: dict) -> np.ndarray:
        sector = c.get("sector") or ""
        headcount = _first_number(c.get("headcount_range"))
        v = [1.0 if rx.search(sector) else 0.0 for rx in _THEME_RE.values()]
        v += [
            1.0 if headcount is not None and headcount >= 51 else 0.0,
            1.0 if headcount is not None and headcount <= 10 else 0.0,
            1.0 if c.get("founders") else 0.0,
        ]
        return np.array(v, dtype=np.float32)


class Ranker:
    def __init__(self, companies: list[dict], embeddings: dict[str, np.ndarray]):
        self.companies = companies
        self.index = {c["uuid"]: i for i, c in enumerate(companies)}
        self.features = Features(companies)
        self.F = np.array([self.features.vector(c) for c in companies])
        self.E = np.array([embeddings[c["uuid"]] for c in companies])
        self.X = np.hstack([self.E * EMBED_SCALE, self.F])
        # The selected fund's thesis is the starting reference, before the partner has acted.
        self.fund_id: str | None = None
        self.fund_sim = np.zeros(len(companies))
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

    def undo(self) -> str | None:
        """Drop the latest action and refit. Returns that company's uuid, or None if there was none."""
        if not self.actions:
            return None
        uuid, _ = self.actions.pop()
        self._fit()
        return uuid

    def reset(self) -> None:
        self.actions, self.clf = [], None

    def set_fund(self, fund_id: str, vector: np.ndarray) -> None:
        """Start from this fund's thesis vector. Clears the actions, since they belonged to another run."""
        self.reset()
        self.fund_id = fund_id
        unit = vector / (np.linalg.norm(vector) + 1e-9)
        self.fund_sim = self.E @ unit / (np.linalg.norm(self.E, axis=1) + 1e-9)

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
        # No fit yet: start from the fund's thesis, then lean toward saves and away from passes.
        # Actions count for a third, so a few of them cannot pull the ranking off the fund.
        score = self.fund_sim[idx].copy()
        for rows, sign in ((pos, 1.0), (neg, -1.0)):
            if rows:
                ref = self.X[rows].mean(axis=0)
                sim = X @ ref / (np.linalg.norm(X, axis=1) * np.linalg.norm(ref) + 1e-9)
                score += sign * NO_FIT_ACTION_WEIGHT * sim
        return score

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
