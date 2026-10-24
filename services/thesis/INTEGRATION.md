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
- [x] Add read-only `/ranking` and an opt-in, bounded Next.js ranking adapter.
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
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8001
```

Embedding setup calls Nicrron `/embeddings` using
`openai/text-embedding-3-small` and stores a text-hashed cache. Startup needs a
valid `NICRRON_API_KEY` or complete cached embeddings. Readback uses
`anthropic/claude-haiku-5-5` through `https://api.nicrron.ai/v1`.
The optional original pull utility also requires `AKTA_API_KEY` and supports
`CREDIT_BUDGET`. Next.js continues loading its own `.env.local` normally.

Set `THESIS_RANKER_URL=http://127.0.0.1:8001` in Next.js and restart it.
`GET /api/signals?ranking=learned&thesis=AI%20Agents` first strictly filters for
thesis, then applies the service order. Without `ranking=learned`, no model
request is made. The adapter has a 750ms deadline; timeout, invalid data and
nonmatching IDs retain baseline order. Unmatched/seen profiles stay at the end
so the deck never silently loses source data. The client must manage seen cards.
`learnedMatch.probability` is null until the logistic model is fitted; it never
replaces `signalScore` or `thesisScore`. PRISM dispatch traces include output
count and whether model or baseline ordering was used.

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
session-scoped persistent state and authentication before doing that. Next.js
continues serving the seed if the service is not deployed. Inference availability
and real PRISM delivery require configured credentials; regression checks use
stubs and do not claim sponsor delivery.

## Checks

```sh
npx tsc --noEmit
node tests/backend/thesis-memo.cjs
node tests/backend/ranker.cjs
services/thesis/.venv/bin/python tests/backend/test_thesis_service.py
```

The Node regression harness uses Node 22.18+ native TypeScript support.

Validation: TypeScript and targeted lint passed. Offline HTTP tests exercised
50-profile dispatch, strict thesis selection, ranking fallback, memo generation,
PRISM payloads, feedback fitting, the 10-action readback and reset. Sponsor calls
were stubbed; real inference and PRISM delivery were not tested with credentials.
