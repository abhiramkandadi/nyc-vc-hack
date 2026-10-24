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
READBACK_EVERY = 5  # write a new readback after every this many actions

lock = threading.Lock()
state: dict = {"ranker": None, "readback": None, "readback_error": None, "readback_at": 0}


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


def write_readback(n: int, weights: dict, saved: list[str], passed: list[str]) -> None:
    """Runs in the background so the swipe response never waits on the LLM."""
    try:
        text, error = generate(weights, saved, passed), None
    except Exception as e:  # shown to the partner as it is, never replaced with made-up text
        text, error = None, str(e)
    with lock:
        if n >= state["readback_at"]:
            state.update(readback=text, readback_error=error, readback_at=n)


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
        if n % READBACK_EVERY == 0:
            background.add_task(write_readback, n, r.weights(),
                                _names(r, ("save", "intro")), _names(r, ("pass",)))
        return {"n_actions": n, "remaining": len(r.companies) - len(r.seen()),
                "readback_pending": n % READBACK_EVERY == 0}


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
        }


@app.post("/reset")
def reset() -> dict:
    with lock:
        state["ranker"].reset()
        state.update(readback=None, readback_error=None, readback_at=0)
    return {"ok": True}
