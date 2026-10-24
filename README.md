# CompanyTinder

Swipe through pre-seed and seed startups. CompanyTinder learns your investment thesis from what you save and pass, then re-ranks the rest.

VCs do not have a sourcing problem. They have a filtering problem. A partner cannot write down the filter they use, so no tool can rank against it. CompanyTinder reads the filter from the partner's actions instead. The swipe is the input. The learned thesis is the product.

Built for the Deal Flow track at Betaworks, 24 October 2026.

## What it does

You see one company at a time and act on it:

| Action | Meaning | Gesture | Button |
|---|---|---|---|
| Pass | Not for us | Drag left | X |
| Save | Add to the pipeline | Drag right | Heart |
| Track | Right company, wrong time | Drag up | Clock |
| Intro | Get me to them now | none | Star |

After every action the app sends it to a small ranking service, which refits a model and reorders the cards you have not seen. Saves and intros count as positive examples, and passes count as negative. A track is recorded but is not used to fit the model.

- **Match badge.** Each card shows a learned match percentage. It appears only after the model has seen at least one save or intro and one pass. Before that the badge is hidden, because the model knows nothing about your taste yet. With fewer than about 20 actions the percentages are rough, so read them as a ranking and not as a calibrated probability.
- **Thesis panel.** The right sidebar shows what the model currently weighs, as bars that lean toward or away from each feature. After 10 actions, and every 10 after that, an LLM writes a short plain-English readback of your filter and names one contradiction in your choices. A spinner shows while it writes.
- **Match screen.** Saving or requesting an intro opens a screen with a three-bullet investment memo and an editable intro email draft.
- **Rewind.** Rewind takes the last action back in the model too.

### What the card shows

The card shows the founder's name. If the source lists no founder, it shows the company name instead. It shows the stage. If the source has the founder's former employer, the card shows it. Otherwise it shows the sector. It also shows a short pitch, three recent events from the source, and the learned match badge.

Be aware of three limits in the data. The source does not give a company's stage, so every card says Seed, marked as inferred. Founder photos are stock placeholders, not real photographs. The sector tag on each card is our best match to one of four tags. The source's own sector label is finer.

### What it learns from

The model combines two things. The first is an embedding of each company's description, from `openai/text-embedding-3-small`. The second is a few readable features. Six are topics: security, developer tools and AI agents, crypto and blockchain, healthcare, hardware and robotics, and services and consulting. Two are team size (51 or more people, and 10 or fewer). One marks whether the source lists named founders. The bars in the thesis panel show only these readable features.

### Funds

The service holds five hand-written fund profiles in `services/thesis/funds.json`: Everywhere Ventures, Plug and Play, Wischoff Ventures, Forum Ventures and a generic seed B2B software profile. Selecting one starts the ranking from that fund's thesis, so the first cards already fit it. This works through the service API (`GET /funds`, `POST /fund`) and the standalone page at `http://127.0.0.1:8001/`. The main UI does not have the fund selector yet. Its three presets (Plug & Play, Everywhere VC, AI Agents) are sector filters.

### What is not built

- Signals that change over time, such as GitHub stars or headcount growth. The three events on a card are dated news items from the source, not time series.
- The GitHub API. Nothing in this repo calls it.
- A founder drill-down with timelines, and a source link on every claim.
- A partner-versus-partner comparison, a precision-at-10 chart, and CSV or memo export.
- Seeding the ranking from a fund's real public portfolio. The five fund profiles are hand-written.
- Multiple users. The ranking service keeps one session in memory. A restart resets it.

## How it is built

Two services run side by side.

| Service | What it is | Port |
|---|---|---|
| Web app | Next.js 14. The swipe interface and the `/api` routes. | 3000 |
| Ranking service | Python, FastAPI. Embeddings, the model, the readback. In `services/thesis`. | 8001 |

The browser talks only to the web app. The web app calls the ranking service on the server side, at the address in `THESIS_RANKER_URL`.

```
browser  ->  Next.js :3000  ->  ranking service :8001  ->  Nicrron (embeddings, readback)
                  |
          company data file (seed)
```

Company data comes from akta.pro, pulled once and saved to a file. The app reads that file and never calls akta.pro. Only `services/thesis/pull.py` calls it. You run that script by hand.

## Run it

### Prerequisites

- Python 3.10 or newer
- Node.js 18.17 or newer, with npm (the tests need Node 22.18 or newer)
- A Nicrron API key. See [Environment variables](#environment-variables).

### Setup on Windows (PowerShell)

```powershell
git clone https://github.com/abhiramkandadi/nyc-vc-hack.git
cd nyc-vc-hack
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r services\thesis\requirements.txt
npm install
copy .env.example .env
```

If PowerShell blocks the activation script, run `Set-ExecutionPolicy -Scope Process RemoteSigned` once in that window and try again.

### Setup on Mac or Linux

```bash
git clone https://github.com/abhiramkandadi/nyc-vc-hack.git
cd nyc-vc-hack
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/thesis/requirements.txt
npm install
cp .env.example .env
```

Then open `.env` and paste your Nicrron key. See the next section.

### Environment variables

The app reads `.env` in the repo root. The file is git-ignored, so your keys stay on your machine.

| Variable | Needed for | Where to get it |
|---|---|---|
| `NICRRON_API_KEY` | Required. Embeds each company and writes the thesis readback. It also writes the memo text on the match screen. | Create a key in your account at [nicrron.ai](https://nicrron.ai). |
| `THESIS_RANKER_URL` | Required. Tells the web app where the ranking service runs. | Not a secret. Keep the value `http://127.0.0.1:8001` from `.env.example`. |
| `PRISMTRACE_API_KEY` | Optional. Exports a trace of each run to PRISM by Block Convey. Leave it empty to skip. | Create a key in your PRISM account at Block Convey. |
| `AKTA_API_KEY` | Only for `pull.py`, which buys the full company pool. You do not need it to run the app. | Request access at [playground.akta.pro](https://playground.akta.pro). |

A `GITHUB_TOKEN` is not needed. No code reads it.

Optional and off by default: `SEED_FILE` (path to a seed file), `CREDIT_BUDGET` (credit cap for `pull.py`), and the keys for the extra integrations in `lib/sponsorStack.ts` and `lib/llm.ts`.

### Get the company data

The full set of 180 companies is licensed akta.pro data. It is not in this repo, because the repo is public. You have two choices.

**Use the demo set (no credits).** The repo includes a 50-company seed, and the web app uses it automatically. Build the matching file for the ranking service once:

```bash
python services/thesis/export_seed.py
```

This writes `services/thesis/companies.json` from the committed seed and spends nothing.

**Use the full 180 companies.** Get `lib/seededAktaData.local.json` and `services/thesis/companies.json` from the maintainers and put them at those paths. Or build them yourself. This costs about 950 akta credits:

```bash
cd services/thesis
python pull.py                 # writes companies.json (set CREDIT_BUDGET to cap the spend)
python export_profiles.py      # writes ../../lib/seededAktaData.local.json
```

When `lib/seededAktaData.local.json` exists, the web app uses it instead of the demo seed. Both files are git-ignored.

### Start both servers

Use two terminals. Activate the virtual environment in the first one.

Terminal 1, the ranking service:

```powershell
# Windows
cd services\thesis
uvicorn app:app --host 127.0.0.1 --port 8001
```

```bash
# Mac or Linux
cd services/thesis
uvicorn app:app --host 127.0.0.1 --port 8001
```

The first start embeds the companies and the five funds, which takes under a minute. The vectors are cached in `services/thesis/data`, so later starts are fast.

Terminal 2, the web app, from the repo root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To check the service on its own, open [http://127.0.0.1:8001/ranking](http://127.0.0.1:8001/ranking).

### Try it

1. Swipe or click through about 10 companies. Save the ones that fit and pass on the ones that do not.
2. Watch the match badge appear on the cards and the bars move in the thesis panel.
3. At your 10th action the panel shows a spinner, then a short readback of your filter.

## Tests

```bash
npx tsc --noEmit
node tests/backend/thesis-memo.cjs
node tests/backend/ranker.cjs
cd services/thesis && python ../../tests/backend/test_thesis_service.py
```

The tests use stubs. They make no network calls and spend no credits.

## Project layout

```
app/                  Next.js pages and API routes (/api/signals, /api/feedback, /api/thesis, /api/memo)
components/           Swipe card, thesis panel, match screen, sidebars
lib/                  Data loading, thesis scoring, the ranking adapter, the seed files
services/thesis/      The ranking service (app.py, model.py, readback.py), fund profiles, data scripts
tests/backend/        Regression tests
```

## Data and privacy

- The company data is public company information from akta.pro. No confidential fund, LP or company data is loaded.
- Founder photos are stock placeholders, and each profile says so.
- The ranking service keeps one partner's session in memory. It has no accounts and no storage, and it resets on restart. Keep it private. Do not expose it as a public multi-user service.
- Keys live in `.env`, which is git-ignored. The full git history was checked for keys before this release.
