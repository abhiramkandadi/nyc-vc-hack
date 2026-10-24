# Thesis

Track 1, Sourcing. Deal Flow at Betaworks, 24 October 2026.

Tagline: Tinder for deal flow. The swipe is the input. The thesis is the product.

## The problem

VCs do not have a sourcing problem. They have a filtering problem.

They already see too many companies. They cannot state what they want. A partner says "technical founders, B2B infrastructure, pre-seed". Then the partner passes on six companies that fit that sentence.

The real filter is not written down. No tool can read it.

So every sourcing tool ranks companies against a thesis the fund cannot write.

## What we build

We show a partner one company at a time. The partner acts on each one. After about 20 actions the system knows the partner's filter. It then re-ranks the rest.

The learning layer is the product. The swipe is a fast input device.

Track 1 asks for "a clear reason each one deserves a meeting". We generate that reason from the partner's own actions, not from a generic score.

## Why this is not another dashboard

Harmonic, Specter, Affinity and PitchBook show ranked lists. A new interface on the same list has no value.

Our data runs the other way. The tool learns from the partner. The partner does not configure the tool. There are no filter forms, no saved searches, no sector checkboxes.

## The name

The title slide says Company Tinder. The first sentence out of our mouths says what the product does.

The name is a hook and it is memorable, which has value when judges watch many demos. But uniqueness is not scored on the name. The swipe is the part that is not new. The learning layer is. Do not let the name do the explaining.

## The three things we demo

1. Thesis readback. After about 20 actions, we print the fund's thesis in plain English. This includes the parts the partner never said. Example: "You pass on solo founders. You weight shipping speed over pedigree. You say you are sector-agnostic. 80% of your saves are infrastructure."
2. Partner diff. Two partners act on the same 30 companies. We show where they disagree. This is the Monday partner meeting, on a screen, before the meeting. We record this in advance. The pitch is 2 minutes 30 seconds, so a live session with a judge does not fit. If we show a recording, we say it is a recording.
3. Precision at 10, before and after. We compare the baseline ranking to the post-swipe ranking. Cut this if time runs short. It is the least visible of the three and the most work to get right.

## Cold start

We ask for the fund name. We pull the fund's public portfolio. We embed it.

The model has a thesis before the partner acts once. The first screen is already correct. The demo never starts cold.

## Actions

A left-right swipe throws away the most useful answer at pre-seed, which is "too early". We use four actions.

| Action | Meaning | Key |
|---|---|---|
| Pass | Not for us | Left |
| Save | Add to pipeline | Right |
| Track | Right company, wrong time. Alert me on the next signal | Up |
| Intro | Get me to them now | Down |

Track is also the retention story. The tool has a reason to exist tomorrow.

All four actions have keyboard shortcuts. Partners use laptops, not phones.

## The card front

The partner decides in three seconds. The card has seven items and no more.

1. Company name and one flat line on what it does. No marketing copy.
2. Fit badge. Stage, check size and sector against this fund. If the company is outside the fund's range, the badge says so on the front.
3. Founders. Name, last role, last company, years there. One line each, three founders maximum.
4. One signal with a change over time. Not a static number. Example: "GitHub 0 to 2,400 stars in 72 hours". Example: "Headcount 3 to 11 in 30 days".
5. Why now. One line.
6. Match score and the two reasons behind it.
7. Age of the signal. Example: "Signal fired 6 days ago". An old signal means another fund already called.

The card does not show market size estimates, logos, long biographies or general market text. We cannot source a market size estimate, so we do not print one.

## The drill-down

The partner opens one card to build conviction. This view is also the memo we export, so we build it once and use it twice. The judging criteria ask for outputs a VC can forward as they are.

The drill-down is not more facts. It answers one question: why should I believe the card.

Founders. A timeline for each person. Where they worked, when, what they shipped, how long they stayed. The partner reads this to answer "why these people". Tenure matters. A person who stayed four years and shipped is a different bet from a person who stayed eight months.

Market. Who else is in this space, and what is different here. We do not print a market size. We cannot source that number, and a wrong one costs more than a missing one.

Traction. Signal history as a line, not a number. A repository at 2,400 stars means nothing. A repository that went from 0 to 2,400 in 72 hours and still climbs means something. Show the shape.

Fit. Why this company matched the thesis, and which weights fired. No other tool has this, so give it room.

Why now. One paragraph. What changed that makes this possible this year.

What would make me pass. The bear case, from the same data. A thin team, a crowded space, a flat signal, an old date. A memo with no bear case reads like marketing.

Every claim carries a source link and a date, inline on the line itself, not in a list at the bottom. The criteria say judges look for products that make it clear where every claim comes from. Most teams will show numbers with no origin.

The drill-down also shows the PRISM agent trace, which says why we surfaced this company.

Scope warning: build the card front first and finish it. The drill-down only has value if the card makes the partner open it. A finished card with no drill-down still demos. A half-finished drill-down behind a rough card demos badly.

## The thesis panel

This panel stays on screen and updates as the partner acts. It shows:

- Weight bars for the factors the model learned
- The thesis readback in English, rewritten every few actions
- Contradictions between what the fund says and what the fund does
- The partner diff, after two people act

## End of session

After the session the partner gets the thesis readback, the pipeline as a table, an export button and the precision chart.

The judging criteria ask for outputs a VC can forward as they are. The export is a scoring item, not an extra. Ship a one-page memo for each saved company and a CSV of the pipeline.

## Build plan

The project has four parts. Nothing outside these four gets built today.

1. The data. About 200 companies, pulled once, saved to a file. Each company has a name, a one-line description, a sector, a stage, founders with their last job, one signal with a change over time, and a date. Pull from akta.pro. Fill the GitHub numbers from the GitHub API. This is a script we run once, not a live service. After it runs we do not call akta again.
2. The model. Embed each company's text into a vector. Store every action as a company and an action. Fit a logistic regression on save against pass. Re-rank the companies the partner has not seen. This is about 20 lines. Do not make it bigger. Twenty swipes give twenty data points, so a larger model does not fit the data.
3. The interface. One screen. The card in the middle, the thesis panel on the right. Four buttons with arrow keys. On each action: save, refit, re-rank, show the next card.
4. The readback. Every five actions, send the model weights and the saved and passed lists to an LLM through NicrronNinoo. Ask for three sentences that describe this partner's filter, with one contradiction. Print it in the panel.

## Split

Two people. Agree on the company JSON shape first and write it down. After that, neither person waits for the other.

Abhiram takes the akta pull, the GitHub pull, the embeddings, the regression and the readback.

Shirkar takes the card, the four actions, the thesis panel and the export.

Shirkar builds against fake JSON until the real data lands.

Order for Abhiram: get the akta key working first. If it does not work in 20 minutes, change the plan, because the rest sits on it. Then pull 200 companies to a file. Then embed. Then the action store and the regression. Then the readback.

Order for Shirkar: card renders from fake JSON. Four buttons and arrow keys. Panel with static bars. Then connect to the real endpoints. Export last.

## Rules for the build

If a piece is not one of the four parts above, it does not get built today.

At 15:15 we stop adding and start recording the video, whatever state the product is in.

## Stack

All four sponsor tools are required for prize eligibility. Each one has a real job.

| Tool | Job |
|---|---|
| akta.pro by Wokelo | Company data, signals and news. Primary source. Also our entry for Best Use of External Data. |
| PRISM by Block Convey | Agent trace. Shows why each company surfaced and how we computed the score. |
| Roundtable | Development tooling during the build. Not integrated in the product. |
| NicrronNinoo | Model routing for embeddings and readback text, with failover. |

We also use the GitHub API for velocity signals.

The model is embeddings plus logistic regression over the partner's actions. That is all. A simple model that runs beats a complex model that breaks at 15:58.

We use public and synthetic data only. We never load confidential fund, LP or company data. Say this on stage.

Decision on Roundtable: we use it during the build, not inside the product. If a judge asks, say what we used it for and do not claim more. If time opens after the feature freeze, move the signal-to-scoring handoff onto it.

## Not building

- LinkedIn scraping. It fails on terms of service and on reliability. We do not build it and we do not claim it.
- A two-sided founder marketplace. It starts empty, so it demos badly.
- Continuous background scanning. We cannot demo continuous. We pre-compute 200 to 300 companies and re-rank live.
- More agents than the two named above.
- The word "gamify". VCs want speed and status, not games.

## The objection we will get

"I do not have a sourcing problem. I have a conviction problem."

This is true for the top funds. They see the good deals.

Our answer: we do not find more companies. We cut 500 to 10 that match you, and we say why. This is filtering, not finding. Do not say "sourcing" on stage.

## Judges

| Judge | Focus | What they see |
|---|---|---|
| D. J. Patel | Real data, not hype | A source link and timestamp on every claim |
| Radhika Khandelwal | Working code and a real business | The thesis panel updating during a live swipe |
| Abeera Saeed | B2B SaaS scale | The export: 50 signals to a structured pipeline in five minutes |
| Michael Barone | High pre-seed volume | The stage and sector filter, learned instead of configured |
| Akhil A. | Security and privacy | No scraping, public and synthetic data only, thesis stored per fund |
| Bettina Sosa | Use by non-technical people | No walkthrough needed, which matches the Design criteria |
| Erzsebet Abram | Non-obvious sourcing | One card shows a stealth or academic founder, not a known name |
| Arjun Padmajan | Data between agents | Roundtable carrying payloads between our two agents |

## Validation, before 13:00

Investors and judges are in the room. Do five conversations of five minutes each. The founder brief needs this evidence.

1. "When you pass on a company, can you write down why in one sentence?" If they can, the readback has no value. This is the kill question.
2. "Do you and your partners disagree on deals? How do you resolve it?" If they shrug, cut the partner diff.
3. "Where does your deal flow come from today?" If the answer is inbound and warm intros only, move further toward filtering.
4. "What tool would you remove from your stack tomorrow?" This tells us who we replace.
5. Show ten cards on paper. Watch them. If a card takes 30 seconds, the swipe is the wrong interface and we fall back to a ranked list.

Kill criterion: if two of three investors can state their own filter, cut the readback and demo the partner diff alone.

Write down names, funds and exact words. These go in the brief.

## Business model

- Buyer: a partner at a pre-seed or seed fund, or the associate who runs sourcing.
- Price: per seat, per year. Compare against what Harmonic and Affinity charge a fund today.
- First 10 customers: the funds judging today. The criteria ask for a credible path to the first 10. This is one.
- Why now: embeddings are cheap enough to score a whole market, and licensed company data APIs like akta did not exist as infrastructure three years ago.

## Schedule

| Time | Task |
|---|---|
| 11:30 | Repository up. Data pool pulled from akta. Sponsor keys work. |
| 11:30 to 13:00 | Interviews on the floor, during the build |
| 13:00 | Card front renders real data |
| 14:00 | Four actions wired. Ranker updates. |
| 14:45 | Thesis readback generates |
| 15:15 | Feature freeze. Export and precision chart only. |
| 15:30 | Devpost draft in. Founder brief written. Demo video recorded. |
| 16:00 | Submissions close. Hard deadline. The rules page also says 16:30 in one place. Ignore it. |
| 16:15 | Live demos |

The demo video must be three minutes or less. The submission needs the project name, the description, the track, the founder brief, the four tool names, a repository link, a live demo link and the video.

## Content award

The content award is 150 USD and costs little time.

Post to LinkedIn and X during the build. Tag SeedLegals, NicrronNinoo, Roundtable, akta.pro and Block Convey. Tag somgupnyc on X and Somya Gupta on LinkedIn. Add the post links to the Devpost submission.

Post twice: one screenshot during the build, one demo clip. Give this to whoever is least blocked.

## Demo plan

The pitch is 2 minutes 30 seconds. Abhiram and Shirkar run it. Nobody from the audience touches the product.

Swipe ten cards fast and let the thesis panel update while we talk. That shows the interface and proves the model in the same 30 seconds.

Then open one card to the drill-down and show the sourced claims.

Then show the exported memo.

Then one line on who buys it and why now.

Design is 5 points of 20. The other 15 are uniqueness, technical execution and business feasibility. A walkthrough of the interface alone scores the 5 and leaves the rest. Let the interface carry the proof instead of being the subject.
