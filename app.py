"""FastAPI app. Serves the API and index.html from one origin, so there is no CORS.

  uvicorn app:app --reload

State lives in memory for one partner session. POST /reset starts over.
"""
import json
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from model import ACTIONS, Ranker, load_embeddings

COMPANIES_FILE = Path("companies.json")
INDEX_FILE = Path("index.html")

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
    return FileResponse(INDEX_FILE)


@app.get("/next")
def next_company() -> dict:
    with lock:
        r: Ranker = state["ranker"]
        ranked = r.ranked_unseen()
        out = {"n_actions": len(r.actions), "remaining": len(ranked), "company": None}
        if ranked:
            top = ranked[0]
            out.update(company=top["company"], score=top["score"],
                       reasons=r.reasons(top["company"]["uuid"]))
        return out


@app.post("/action")
def post_action(body: ActionIn) -> dict:
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
        return {"n_actions": len(r.actions), "remaining": len(r.companies) - len(r.seen())}


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
