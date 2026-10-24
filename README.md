# Thesis

Tinder for deal flow. The swipe is the input. The thesis is the product.

Thesis is a sourcing tool for pre-seed and seed investors. It learns a fund's real filter from the partner's actions and then re-ranks every company it has not shown yet. This document describes what the product does and how each claim is sourced.

## The problem

VCs do not have a sourcing problem. They have a filtering problem.

They already see too many companies. They cannot state what they want. A partner says "technical founders, B2B infrastructure, pre-seed". Then the partner passes on six companies that fit that sentence.

The real filter is not written down. No tool can read it. So every sourcing tool ranks companies against a thesis that the fund cannot write.

## What Thesis does

Thesis shows a partner one company at a time. The partner acts on each one. After about 20 actions, the system knows the partner's filter and re-ranks the rest.

The learning layer is the product. The swipe is a fast input device.

Each company comes with a clear reason it deserves a meeting. Thesis builds that reason from the partner's own actions, not from a generic score.

## Why this is not another dashboard

Harmonic, Specter, Affinity and PitchBook show ranked lists. Thesis works the other way. The tool learns from the partner. The partner does not configure the tool. There are no filter forms, no saved searches and no sector checkboxes.

## Core features

1. Thesis readback. After about 20 actions, Thesis prints the fund's thesis in plain English. This includes the parts the partner never said. Example: "You pass on solo founders. You weight shipping speed over pedigree. You say you are sector-agnostic. 80% of your saves are infrastructure."
2. Partner diff. Two partners act on the same set of companies. Thesis shows where they disagree. This is the Monday partner meeting, on a screen, before the meeting.
3. Precision at 10, before and after. Thesis compares the baseline ranking to the ranking after the partner acts. This shows whether the learning works.

## Cold start

The partner enters the fund name. Thesis pulls the fund's public portfolio and embeds it. An embedding is a list of numbers that captures what a text means.

The model has a thesis before the partner acts once. The first screen is already relevant.

## Actions

A left-right swipe loses the most useful answer at pre-seed, which is "too early". Thesis uses four actions.

| Action | Meaning | Key |
|---|---|---|
| Pass | Not for us | Left |
| Save | Add to pipeline | Right |
| Track | Right company, wrong time. Alert me on the next signal | Up |
| Intro | Get me to them now | Down |

Track gives the tool a reason to exist tomorrow. All four actions have keyboard shortcuts because partners use laptops, not phones.

## The card front

The partner decides in three seconds. The card has seven items and no more.

1. Company name and one flat line on what it does. No marketing copy.
2. Fit badge. Stage, check size and sector against this fund. If the company is outside the fund's range, the badge says so on the front.
3. Founders. Name, last role, last company, years there. One line each, three founders at most.
4. One signal with a change over time, not a static number. Example: "GitHub 0 to 2,400 stars in 72 hours". Example: "Headcount 3 to 11 in 30 days".
5. Why now. One line.
6. Match score and the two reasons behind it.
7. Age of the signal. Example: "Signal fired 6 days ago". An old signal means that another fund probably called already.

The card does not show market size estimates, logos, long biographies or general market text. Thesis cannot source a market size estimate, so it does not print one.

## The drill-down

The partner opens one card to build conviction. This view is also the memo that Thesis exports, so the partner can forward it as it is.

The drill-down is not more facts. It answers one question: what makes the card believable.

- Founders. A timeline for each person. Where they worked, when, what they shipped and how long they stayed. Tenure matters. A person who stayed four years and shipped is a different bet from a person who stayed eight months.
- Market. Who else is in this space and what is different here. Thesis does not print a market size, because a wrong number costs more than a missing one.
- Traction. Signal history as a line, not a number. A repository at 2,400 stars means nothing. A repository that went from 0 to 2,400 in 72 hours and still climbs means something. The line shows the shape.
- Fit. Why this company matched the thesis and which weights fired.
- Why now. One paragraph on what changed that makes this possible this year.
- Reasons to pass. The bear case, from the same data. A thin team, a crowded space, a flat signal or an old date. A memo with no bear case reads like marketing copy.

Every claim carries a source link and a date, inline on the line itself, not in a list at the bottom.

The drill-down also shows the PRISM agent trace, which says why Thesis surfaced the company.

## The thesis panel

This panel stays on screen and updates as the partner acts. It shows:

- Weight bars for the factors the model learned
- The thesis readback in English, rewritten every few actions
- Contradictions between what the fund says and what the fund does
- The partner diff, after two people act

## End of session

After a session, the partner gets:

- The thesis readback
- The pipeline as a table
- A one-page memo for each saved company
- A CSV of the pipeline
- The precision chart

## How it works

Thesis has four parts.

1. The data. About 200 companies, pulled once and saved to a file. Each company has these fields: name, one-line description, sector, stage, founders with their last job, one signal with a change over time, and a date. akta.pro supplies the company data. The GitHub API supplies the velocity numbers. The pull is a script that runs once. It is not a live service.
2. The model. Thesis embeds each company's text into a vector. It stores every action as a company and an action. It fits a logistic regression on save against pass, then re-ranks the companies that the partner has not seen. Twenty actions give twenty data points, so a larger model cannot fit the data.
3. The interface. One screen. The card is in the middle and the thesis panel is on the right. On each action, Thesis saves it, refits the model, re-ranks the companies and shows the next card.
4. The readback. Every five actions, Thesis sends the model weights and the saved and passed lists to an LLM through NicrronNinoo. The LLM returns three sentences that describe the partner's filter, with one contradiction. Thesis prints them in the panel.

## Data sources and tools

| Tool | Job |
|---|---|
| akta.pro by Wokelo | Company data, signals and news. Primary source. |
| GitHub API | Velocity signals, such as stars over time. |
| PRISM by Block Convey | Agent trace. Shows why each company surfaced and how Thesis computed the score. |
| NicrronNinoo | Model routing for embeddings and readback text, with failover. |
| Roundtable | Development tooling. Not part of the product. |

The model is embeddings plus logistic regression over the partner's actions. A simple model that runs is better than a complex model that breaks.

## Privacy and data handling

- Thesis uses public and synthetic data only.
- Thesis never loads confidential fund, LP or company data.
- Thesis does not scrape LinkedIn.
- Thesis stores each thesis per fund.

## What Thesis does not do

- It does not scrape LinkedIn. That fails on terms of service and on reliability.
- It does not run a two-sided founder marketplace.
- It does not scan the market continuously. It re-ranks a pre-computed set of 200 to 300 companies live.
- It does not use more agents than the two it names.

## Who it is for

- Buyer: a partner at a pre-seed or seed fund, or the associate who runs sourcing.
- Pricing: per seat, per year.
- Use: cut 500 companies to the 10 that match the partner, and say why. This is filtering, not finding.
- Why now: embeddings are cheap enough to score a whole market. Licensed company data APIs like akta did not exist as infrastructure three years ago.
