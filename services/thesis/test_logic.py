"""Checks for the ranker's logic. No network and no API key needed.

  python test_logic.py
"""
import numpy as np

import app as A
from model import Ranker, _first_number


def companies(n: int) -> list[dict]:
    return [{"uuid": f"u{i}", "name": f"C{i}", "sector": "Security" if i % 2 else "Healthcare",
             "headcount_range": "11-50", "founders": [], "description": "d"} for i in range(n)]


def ranker(n: int = 30) -> Ranker:
    rng = np.random.default_rng(2)
    cs = companies(n)
    return Ranker(cs, {c["uuid"]: rng.normal(size=8).astype("float32") for c in cs})


def test_headcount_keeps_thousands_separators() -> None:
    assert _first_number("51-200") == 51
    assert _first_number("1,001-5,000") == 1001
    assert _first_number("10,001+") == 10001
    assert _first_number(None) is None and _first_number("unknown") is None


def test_fit_needs_a_save_and_a_pass_and_track_is_ignored() -> None:
    r = ranker()
    r.record("u1", "save")
    assert r.clf is None
    r.record("u0", "pass")
    assert r.clf is not None
    weights = r.weights()
    r.record("u2", "track")
    assert r.weights() == weights and "u2" in r.seen()


def test_duplicate_action_is_rejected_and_undo_resets() -> None:
    r = ranker()
    r.record("u1", "save")
    try:
        r.record("u1", "pass")
        raise AssertionError("duplicate accepted")
    except ValueError:
        pass
    r.record("u0", "pass")
    assert r.undo() == "u0" and r.undo() == "u1" and r.undo() is None
    assert r.clf is None and r.weights() == {}


def test_undo_drops_a_readback_that_described_the_undone_action() -> None:
    r = ranker()
    A.state["ranker"] = r
    for i in range(10):
        r.record(f"u{i}", "save" if i % 2 else "pass")
    A.state.update(readback="old", readback_at=10, readback_pending=False, epoch=0)
    A.undo()
    assert A.state["readback"] is None and A.state["epoch"] == 1
    A.state.update(readback="kept", readback_at=4, readback_pending=False, epoch=9)
    A.undo()
    assert A.state["readback"] == "kept"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
