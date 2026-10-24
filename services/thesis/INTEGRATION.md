# Next.js integration of Abhi's thesis service

Imported from `origin/master` at `f38525539d888139bd05b0423460651f82189757`.
The branches have unrelated histories. The application files are preserved here
instead of merging a Python-only root over the Next.js application. `README.md`
is Abhi's product direction document; it includes planned features and is not a
list of completed integrations. Probe scripts were inspected but are not needed
by the runtime.

## Execution plan and contract

- [x] Inspect both remote branches and their file/commit diffs.
- [x] Preserve Next.js UI, the 50-entry seed, PRISM and the akta live/mock hierarchy.
- [x] Import Python ranking, readback, standalone UI and pull utility in this folder.
- [x] Export existing profiles without changing IDs or inventing headcounts/employers.
- [x] Add read-only `/ranking` and a bounded Next.js adapter with automatic fallback.
- [x] Keep named-thesis scoring and three-bullet IC memos separate from learned probabilities.
- [x] Complete TypeScript, regression, Python service and final Git checks.

`export_seed.py` maps `id` -> `uuid`, `pitchSummary` -> `description`,
`targetSector` -> `sector`, `signalEvidence` -> `recent_moves`, and the known
founder -> `founders`. Unknown headcounts remain null. Stage defaults, inferred
pedigree and source scores are never learning labels. `companies.json` and
embedding caches are ignored. Do not run `pull.py` for this demo: it buys a new,
independent pool whose UUIDs need not match the 50 profiles.

## Local startup (Python 3.10+)

From the repository root:

```sh
python3 -m venv services/thesis/.venv
services/thesis/.venv/bin/pip install -r services/thesis/requirements.txt
python3 services/thesis/export_seed.py
cd services/thesis
# Set NICRRON_API_KEY in the process environment or this directory's ignored .env.
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000
```

Embedding setup calls Nicrron `/embeddings` using
`openai/text-embedding-3-small` and stores a text-hashed cache. Startup needs a
valid `NICRRON_API_KEY` or complete cached embeddings. Readback uses
`anthropic/claude-haiku-5-5` through `https://api.nicrron.ai/v1`.
The optional original pull utility also requires `AKTA_API_KEY` and supports
`CREDIT_BUDGET`. Next.js continues loading its own `.env.local` normally.

Next.js defaults to `http://localhost:8000`; optionally set
`THESIS_RANKER_URL` to another private service address and restart Next.js.
`GET /api/signals` automatically requests `/ranking`. A `thesis=AI%20Agents`
query strictly filters the deck before ranking; all other named theses retain
their existing filtering rules. `ranking=baseline` explicitly bypasses the
Python request and uses the original named-thesis order.

Both ranking and feedback enforce a 750ms total upstream deadline, including
response streaming, and cap upstream bodies at 200 KB. Connection errors,
timeouts, bad JSON, invalid schemas and nonmatching ranking IDs automatically
use TypeScript. With no feedback, that scorer keeps baseline order. Recorded
save/intro actions favor the same sector, passes reduce sector preference, and
track does not train preferences. Reviewed profiles move to the end; none of the
50 source records are removed or modified. `learnedMatch.preferenceScore` is an
uncalibrated local count; `probability` stays null locally. Only a fitted Python
model supplies a probability. Neither backend changes `signalScore` or
`thesisScore`. `meta.ranking.backend` identifies `python` or `typescript`, and
PRISM dispatch traces keep recording the output count and ordering source.

`POST /api/feedback` accepts `{id, action}` (or `{uuid, action}`) with
`pass`, `save`, `track`, or `intro`. It validates the ID against the hydrated
profiles and proxies `{uuid, action}` to Python `/action`. Feedback is recorded
in the local TypeScript store before the proxy call, so a service failure does
not lose the demo decision. Successful responses include `meta.backend`,
`meta.reason` when falling back, `meta.duplicate`, and action counts. Repeating
the same action is idempotent; a different action for an already reviewed ID
returns 409. Invalid inputs return 400/413/415 and unknown IDs return 404.
Upstream failures, including 404/409 from an out-of-sync Python pool, retain the
local decision and return success with `backend: "typescript"`. No uncertain
POST is retried, and offline feedback is not automatically replayed to Python.
Frontend callers should use `/api/feedback`, not the private Python URL.

The service accepts `POST /action {uuid, action}` with pass/save/track/intro;
save+intro are positive, pass negative, track excluded from fitting. It exposes
`GET /next`, `GET /thesis`, `POST /reset`, and the added `GET /ranking`.
Readback is scheduled after 10 actions and every 10 thereafter. Next.js does not
automatically record current frontend swipes; frontend wiring is a separate team
handoff. The standalone UI in this folder exercises these endpoints directly.

## Deployment boundary

This inherited service has one in-memory partner session, no authentication or
fund isolation, and resets on restart. Keep it private and run one worker for a
single-partner demo. Do not expose it as a multi-user public service; introduce
session-scoped persistent state and authentication before doing that.
The TypeScript feedback store is also process-local and single-partner: it
survives route-bundle reuse but not a restart, multiple workers, or serverless
instances. This is a heuristic fallback rather than logistic regression.
Next.js continues serving the seed and accepting feedback if Python is offline.
Inference availability
and real PRISM delivery require configured credentials; regression checks use
stubs and do not claim sponsor delivery.

## Checks

```sh
npx tsc --noEmit
node tests/backend/thesis-memo.cjs
node tests/backend/ranker.cjs
node tests/backend/feedback-fallback.cjs
services/thesis/.venv/bin/python tests/backend/test_thesis_service.py
```

The Node regression harness uses Node 22.18+ native TypeScript support.

Validation: TypeScript and targeted lint passed. Offline HTTP tests exercised
50-profile dispatch, strict thesis selection, ranking fallback, memo generation,
PRISM payloads, feedback fitting, the 10-action readback and reset. Sponsor calls
were stubbed; real inference and PRISM delivery were not tested with credentials.

The proxy was also exercised over real HTTP against a local FastAPI process
with stubbed embeddings/readback, then exercised again after terminating that
process. Both routes switched from Python to TypeScript and retained all 50
profiles. A never-resolving upstream returned the fallback in about 750ms.
