"""FastAPI app. Serves the API and index.html from one origin, so there is no CORS.

  uvicorn app:app --reload

State lives in memory for one partner session. POST /reset starts over.
"""
import json
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from model import ACTIONS, Ranker, load_embeddings
from readback import generate

COMPANIES_FILE = Path("companies.json")
INDEX_FILE = Path("index.html")
READBACK_EVERY = 10  # first readback at this many actions, then again every this many

lock = threading.Lock()
state: dict = {"ranker": None, "readback": None, "readback_error": None, "readback_at": 0,
               "readback_pending": False, "epoch": 0}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not COMPANIES_FILE.exists():
        raise RuntimeError("companies.json not found. Run pull.py first.")
    companies = json.loads(COMPANIES_FILE.read_text(encoding="utf-8"))
    state["ranker"] = Ranker(companies, load_embeddings(companies))
    yield


app = FastAPI(title="Thesis", lifespan=lifespan)


class ActionIn(BaseModel):
    uuid: str
    action: str


def _names(ranker: Ranker, actions: tuple[str, ...]) -> list[str]:
    return [ranker.companies[ranker.index[u]]["name"] for u, a in ranker.actions if a in actions]


def _described(ranker: Ranker, actions: tuple[str, ...]) -> list[str]:
    """'Name (sector, team size)' for the readback. The sector drops its bracketed detail."""
    out = []
    for u, a in ranker.actions:
        if a in actions:
            c = ranker.companies[ranker.index[u]]
            sector = (c.get("sector") or "unknown sector").split(" (")[0]
            out.append(f"{c['name']} ({sector}, {c.get('headcount_range') or 'unknown'} people)")
    return out


@app.get("/")
def index() -> FileResponse:
    return FileResponse(INDEX_FILE, headers={"Cache-Control": "no-store"})


@app.get("/next")
def next_company() -> dict:
    with lock:
        r: Ranker = state["ranker"]
        ranked = r.ranked_unseen()
        out = {"n_actions": len(r.actions), "remaining": len(ranked), "company": None}
        if ranked:
            top = ranked[0]
            # Only a fitted model gives a probability. Before that the score is just an ordering.
            fitted = r.clf is not None
            out.update(company=top["company"], score=top["score"] if fitted else None,
                       reasons=r.reasons(top["company"]["uuid"]))
        return out


def write_readback(epoch: int, n: int, weights: dict, saved: list[str], passed: list[str]) -> None:
    """Runs in the background so the swipe response never waits on the LLM."""
    try:
        text, error = generate(weights, saved, passed), None
    except Exception as e:  # shown to the partner as it is, never replaced with made-up text
        text, error = None, str(e)
    with lock:
        if epoch != state["epoch"]:  # the session was reset while this was running
            return
        state.update(readback=text, readback_error=error, readback_at=n, readback_pending=False)


@app.post("/action")
def post_action(body: ActionIn, background: BackgroundTasks) -> dict:
    if body.action not in ACTIONS:
        raise HTTPException(422, f"action must be one of {ACTIONS}")
    with lock:
        r: Ranker = state["ranker"]
        try:
            r.record(body.uuid, body.action)
        except KeyError:
            raise HTTPException(404, f"unknown company {body.uuid}")
        except ValueError as e:
            raise HTTPException(409, str(e))
        n = len(r.actions)
        due = n % READBACK_EVERY == 0
        if due:
            state["readback_pending"] = True
            background.add_task(write_readback, state["epoch"], n, r.weights(),
                                _described(r, ("save", "intro")), _described(r, ("pass",)))
        return {"n_actions": n, "remaining": len(r.companies) - len(r.seen()),
                "readback_pending": due}


@app.get("/thesis")
def thesis() -> dict:
    with lock:
        r: Ranker = state["ranker"]
        return {
            "n_actions": len(r.actions),
            "weights": r.weights(),
            "saved": _names(r, ("save", "intro")),
            "passed": _names(r, ("pass",)),
            "readback": state["readback"],
            "readback_error": state["readback_error"],
            "readback_at": state["readback_at"],
            "readback_pending": state["readback_pending"],
        }


@app.post("/reset")
def reset() -> dict:
    with lock:
        state["ranker"].reset()
        state.update(readback=None, readback_error=None, readback_at=0, readback_pending=False,
                     epoch=state["epoch"] + 1)
    return {"ok": True}
