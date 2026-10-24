# Company Tinder — UI/UX System Instructions

> Applies across the frontend, backend contracts that drive UI state, and all product copy. Treat this document as the implementation contract for Company Tinder. MUST denotes a requirement; SHOULD denotes the default unless a documented product constraint justifies an exception. Explicit user instructions take precedence. Build within the existing repository; this document describes intended behavior, not features or integrations already implemented.

## 0. Product Intent, Scope, and Design Principles

Company Tinder is a Tinder-style startup sourcing workspace for venture capitalists at a NYC VC hackathon. A user reviews one startup at a time, understands why it fits their investment thesis, inspects supporting signals, and chooses Pass, Match, or Super-Invest. Real-time signals are intended to come from akta.pro; live execution traces are intended to come from Block Convey.

The emotional brief combines Linear's restraint and information hierarchy, Arc's focused workspace, and Tinder's immediate, tactile decisions. Borrow interaction principles rather than copying brand assets or entire screens. The primary surface is a working product, not a marketing landing page.

### 0.1 Design invariants

1. **One company, one decision.** The active startup is the visual center. Ancillary telemetry must support the decision without competing with it.
2. **Evidence before excitement.** A compelling signal has a source, an observation time, and understandable context. A rising number alone is insufficient.
3. **Fast, reversible triage.** Make the three actions available through pointer, touch, keyboard, and assistive technology. Provide Undo with durable state recovery.
4. **Progressive detail.** Show identity, thesis fit, and the strongest signals first. Put full evidence and agent events in a drawer or secondary panel.
5. **Calm instrumentation.** Motion confirms causality. Color conveys meaning. Neither runs continuously merely to make the interface appear alive.
6. **Honest live state.** Distinguish live connections, recent observations, stale evidence, cached data, and demo fixtures.

### 0.2 MVP boundary and vocabulary

- The MVP includes thesis setup, discovery deck, startup detail, saved matches, a priority shortlist, filters, signal evidence, and an agent activity view.
- **Match** means the investor saved a startup to their shortlist. It does not imply reciprocal founder interest.
- **Super-Invest** means the investor marked a startup as a priority sourcing opportunity. It does not execute an investment, transfer money, or initiate outreach. Explain this on first use and in the action's help text.
- **Pass** removes the startup from the current discovery queue. It does not alter source records or contact the company.
- A **thesis fit score** describes alignment with the user's selected criteria. It is not investment-return probability, company quality, or a financial forecast.
- Do not add billing, social chat, founder consent flows, real transactions, or autonomous outreach unless separately requested.
- External integration names in this brief are intended providers. Their APIs, capabilities, payloads, auth requirements, and event semantics must be verified against supplied credentials and official documentation during implementation. Do not invent provider endpoints or claim a connection exists before it does.

## 1. Design System & Tokens

### 1.1 Semantic palette

Use a dark-first interface with pitch black as the page canvas. Define semantic CSS variables once in the global stylesheet, map them through the existing Tailwind configuration, and consume those tokens throughout components. Existing Next.js and Tailwind conventions take precedence over introducing another styling system.

| Token | Value | Usage |
| --- | --- | --- |
| `--canvas` | `#09090b` | App background; default dark theme |
| `--surface-solid` | `#18181b` | Opaque panels and blur fallback |
| `--surface-glass` | `rgb(24 24 27 / 0.80)` | Main startup card and floating dock |
| `--surface-raised` | `#27272a` | Menus, selected rows, nested interactive surfaces |
| `--border-subtle` | `rgb(255 255 255 / 0.10)` | Standard 1px dividers and card outlines |
| `--border-strong` | `rgb(255 255 255 / 0.20)` | Hover or selected outline where appropriate |
| `--text-primary` | `#fafafa` | Titles and essential information |
| `--text-secondary` | `#d4d4d8` | Body copy and supporting labels |
| `--text-muted` | `#a1a1aa` | Timestamps, helper copy, minor metadata |
| `--text-on-accent` | `#09090b` | Text and icons on bright accent fills |
| `--accent-coral` | `#FF385C` | Match, primary action, pass directional feedback |
| `--accent-amber` | `#FFB800` | Super-Invest, priority, attention required |
| `--signal-mint` | `#10B981` | Fresh positive signals and successful completion |
| `--focus-ring` | `#FFB800` | Keyboard focus, distinct from selected state |

Required glass recipe: `bg-zinc-900/80 border border-white/10 backdrop-blur-xl`. Apply it to the swipe card and selectively to floating chrome. Use solid surfaces for dense tables, long text, nested menus, and environments without `backdrop-filter` support. Do not stack multiple full-screen blur layers.

Use translucent accents for badge backgrounds, normally 10–15% opacity with a clear label and a matching icon. Decorative alpha strokes may be subtle; essential control boundaries must meet non-text contrast requirements. A `border-white/10` outline alone is not enough to identify an input or keyboard focus.

Coral is the brand action color; mint signals evidence freshness or positive observations. Pass and Match must differ by label, icon, direction, and surface treatment even when both use coral. Error states use an error icon, explicit copy, and coral treatment; color alone never distinguishes error from Match.

Use dark ink on solid coral, amber, and mint buttons unless measured contrast supports another foreground. White text on a bright accent is not an automatic default. Measure foreground/background combinations after opacity compositing.

### 1.2 Typography

| Role | Family | Default sizing | Usage |
| --- | --- | --- | --- |
| Display | Space Grotesk; Cal Sans as an approved alternative | 28–36px, 1.1–1.2 line height, weight 600–700 | Company names, page headings |
| Body/UI | Geist Sans, then SF Pro/system sans | 14–16px, 1.45–1.6 line height | Description, controls, navigation |
| Data | Geist Mono or system monospace; `font-mono` | 12–14px, 1.4–1.5 line height | Scores, timestamps, durations, numerical metrics |
| Caption | Body or mono according to content | 12px minimum, 1.4 line height | Secondary metadata and badge labels |

- Choose one display face for the implementation; do not alternate Space Grotesk and Cal Sans between routes.
- Reuse the existing local Geist font assets where available. Load additional licensed display assets through the project's font mechanism with a stable fallback; avoid runtime external font fetches when local assets are available.
- Keep controls legible. Use 16px text on mobile text inputs to avoid focus zoom where applicable.
- Use sentence case. Reserve uppercase for short drag stamps or tiny telemetry headings; never uppercase body paragraphs.
- Use `font-variant-numeric: tabular-nums` for changing values. Reserve width for scores and live durations to avoid layout movement.
- Limit the card's summary to two visible lines; expose the complete description in detail. Essential identity and action labels must remain available without relying on hover truncation.
- Allow wrapping for long company names; do not reduce font size until the name becomes unreadable. Support full names in accessible text.

### 1.3 Borders, radii, elevation, and spacing

- Standard border: razor-thin **1px**, `border-white/10`.
- Main startup cards and major modal surfaces: `rounded-3xl` / 24px.
- Pills, badges, circular action controls, and the floating dock: `rounded-full`.
- Form fields and compact panels: 12px; evidence rows: 8px. Nested content should have smaller radii than its containing card.
- Use the spacing scale 4, 8, 12, 16, 24, 32, 48, and 64px. Card padding is 20px on phones and 24–32px on larger screens.
- Separate dense labels and values by 4–8px; related rows by 12–16px; major card regions by 24px.
- Default shadow: `0 16px 48px rgb(0 0 0 / 0.32)`; floating overlays may use `0 24px 64px rgb(0 0 0 / 0.48)`.
- Accent glows are brief feedback, bounded to the action or drag overlay. Do not put ambient neon around every panel.
- Layer tokens: canvas 0, passive deck 10, active card 20, action dock 30, sticky navigation 40, popover 50, modal/sheet 60, toast 70. Modal-local menus belong inside the modal's overlay layer; avoid escalating arbitrary z-index values.

### 1.4 Theme and icon rules

- Set `color-scheme: dark`; browser-provided controls and scrollbars should fit the theme.
- Use one SVG icon family, preferably Lucide, with consistent 1.5–2px strokes. Do not mix unrelated icon libraries.
- The requested concepts ❌ Pass, ⚡ Super-Invest, and 💖 Match should be rendered as consistent X, bolt, and heart SVG icons plus readable labels. Emoji are useful in the specification, not the production icon system.
- Icons adjacent to visible text are decorative. Icon-only controls require accessible names and keyboard-accessible tooltips.
- Do not use a stock hero photograph as a startup's identity. Use actual supplied logos/avatars or neutral initials fallbacks.

## 2. Component Design & Micro-Interactions

### 2.1 Tinder Swipe Card Deck — `components/SwipeCard.tsx`

`SwipeCard` renders a single startup and emits an intent. The parent deck owns queue ordering, prefetching, decision persistence, reconciliation, and Undo. Keep provider fetching and mutation orchestration out of the presentational card.

#### Card layout: top to bottom

1. **Identity row.** Left: a 48px startup logo with a 1px outline and 12px radius. Center: startup name, one-line sector/stage/location metadata. Right: a labeled thesis fit percentage in monospace, e.g. `Thesis fit 92%`. Never show a bare percentage without its meaning.
2. **Founder row.** A 32–40px founder avatar, founder name, role, and one credible background fact if supported. Use a neutral initials avatar when missing. Multiple founders appear as up to three avatars with an accessible total; the detail view contains everyone.
3. **Company proposition.** A strong two-line plain-English summary describing what the startup does and for whom. Avoid generated hype such as “revolutionizing the future.”
4. **Signal badge strip.** Show at most three ranked badges, e.g. `Hiring +4 roles`, `Product launch`, or `Revenue: company reported`. Overflow becomes a `+N signals` button. Each badge includes an icon and label and opens evidence. Badge source, freshness, and confidence appear in the associated evidence view.
5. **Metric row.** Up to three relevant metrics with labels, values, units, and time windows. Example: `Open roles · 12 · checked 8m ago`. Missing data displays `Not available`; never coerce it to zero. Avoid simulated sparklines without underlying time-series data.
6. **Why this fits.** Two concise thesis-alignment reasons with links to supporting signals where available. Disclose that reasons are generated if agent-generated.
7. **Evidence footer.** A source/freshness summary such as `3 sources · last observed 8m ago`, an `Inspect company` control, and a count of relevant agent events. Detail controls remain usable without dragging.

Place the action dock directly below the card, outside the draggable element. Never make buttons move away from the pointer during a swipe. On mobile the dock stays reachable above the safe area and bottom navigation. On short screens, allow the page to scroll rather than clipping the card to force everything above the fold.

#### Deck geometry

- Active card width: `min(100%, 480px)`; desktop may expand to 520px if the content remains easy to scan. Center it in the discovery region.
- Let content determine height. Use an approximate 560–640px resting height only where viewport space permits; never enforce a minimum that clips the action dock on a small phone.
- Render at most three visual layers. Active card: scale 1, y 0, opacity 1. Second: scale 0.96, y 12px, opacity 0.65. Third: scale 0.92, y 24px, opacity 0.35.
- Only the active card accepts focus, clicks, and drag. Passive cards are `aria-hidden`, inert, and must not duplicate reachable interactive elements.
- Prefetch the next batch when three or fewer eligible companies remain. Keep existing cards stable while requests complete.
- Freeze the active company's visible snapshot during dragging or a pending decision; apply signal updates after it settles. New signals must never reshuffle the card under the user's pointer.

### 2.2 Framer Motion gesture contract

Use Framer Motion motion values for translation, rotation, and overlay opacity. Avoid React state updates on every pointer movement. The following constants are product defaults, adjustable only in one central motion configuration after device verification.

| Parameter | Required default |
| --- | --- |
| Drag activation slop | 8px from pointer down |
| Axis intent ratio | 1.25:1 horizontal movement over vertical movement |
| Commit displacement | `clamp(80px, cardWidth * 0.28, 140px)` |
| Flick velocity | At least 800px/s horizontally, in the same direction as displacement |
| Flick minimum travel | 32px horizontally; horizontal intent must already be established |
| Rotation | Map x from `-cardWidth/2 … +cardWidth/2` to `-12deg … +12deg`, clamped |
| Feedback opacity | 0 at 16px travel, increasing to 1 at commit displacement |
| Return spring | stiffness 420, damping 32, mass 0.8 |
| Exit animation | 180–240ms; translate beyond viewport edge plus card width; fade to 0 |
| Next-card promotion | 180–220ms, coordinated with exit |
| Button press | scale 0.96 for 80–120ms; disabled under reduced motion |

**Release algorithm:** Commit Pass on a qualifying leftward release; commit Match on a qualifying rightward release. Qualify when absolute horizontal displacement meets the threshold, or when the minimum-travel and same-direction flick conditions both hold. Otherwise spring back. Direction comes from displacement, with velocity only validating a flick. Reversing the flick against displacement does not qualify for the velocity shortcut.

**Gesture arbitration:** Preserve native vertical scrolling with `touch-action: pan-y` on the drag region. When vertical movement wins before horizontal intent, cancel the drag and allow page scroll. Implement pointer intent handling if the motion library alone cannot provide this behavior. Horizontal swipes cannot begin from buttons, links, inputs, selected text, or evidence controls. Do not prevent default for every touch move.

**Super-Invest:** Use the explicit center dock button and keyboard shortcut. Do not ship an upward-swipe action in the MVP; it conflicts with vertical page scrolling and is difficult to discover. If later requested, it requires a dedicated opt-in gesture region and equivalent controls.

**Directional feedback:** Left shows an X and `PASS`; right shows a heart and `MATCH`. Place the stamp near the upper card edge with a subtle rotation. Button-triggered Super-Invest uses a bolt and `PRIORITY SAVED` in amber. All feedback supplements the static labels.

**Execution rules:** Disable the card's decision controls synchronously once an intent is accepted. Route drag and dock activation through the same guarded decision handler. No decision is written on pointer down or during a drag preview. A canceled gesture produces no mutation. A released swipe or button action produces exactly one logical decision.

### 2.3 Action dock

| Position | Action | Visual treatment | Behavior |
| --- | --- | --- | --- |
| Left | ❌ Pass | 56px circular outlined button; muted at rest, coral hover/press | Remove from discovery; offer Undo |
| Center | ⚡ Super-Invest | 64px circular amber-accent button; dark ink on solid amber | Save with priority; offer Undo |
| Right | 💖 Match | 56px circular coral-filled button; dark ink | Save to matches; offer Undo |

- Each hit target is at least 48×48px with at least 12px clear separation. A 44px minimum is acceptable only in space-constrained secondary controls.
- Include visible labels beneath or beside the icons. Tooltips may reinforce shortcuts but never serve as the only mobile explanation.
- Dock container: dark glass, 1px subtle outline, pill radius, generous horizontal padding, no oversized glow.
- Hover uses a stronger border and at most a 2px lift. Press uses a small scale change. Focus uses the dedicated focus ring; hover and focus are independent.
- Show a local progress indicator for persistence without shifting the labels. Disable all three actions while the decision request is unresolved; the next card may be visible but cannot be decided yet.
- Do not hijack the screen with a celebration. A short heart or bolt flourish and a concise saved confirmation are enough.

### 2.4 Signal badges and evidence popover

- `SignalBadge` variants: positive/fresh mint, attention amber, neutral zinc. A negative observation needs an explicit descriptor such as `Hiring down`, not just a color shift.
- Badge anatomy: 14–16px icon, 12–13px label, 6–8px vertical padding, 10–12px horizontal padding, rounded-full.
- Evidence view shows the claim, provider, linked original source when available, `observedAt`, `fetchedAt`, age, confidence label with rationale, and whether the claim is observed, reported, inferred, or demo data.
- Every source link has a meaningful label. External links use the app's standard external-link behavior and safe link attributes.
- Desktop uses an anchored popover or the detail panel. Mobile uses a bottom sheet with a visible close button. Escape dismisses; focus returns to the trigger.
- A provider label alone is not source verification. Unsupported claims display `Unverified` and must not be styled as verified evidence.

### 2.5 Thesis fit score

- Render an integer `0–100%` only when the backend has a meaningful score; clamp invalid values at the contract boundary and log validation errors. A missing score displays `Not scored`.
- Label the score `Thesis fit`, including its accessible name. A decorative ring may accompany the value but is never the only representation.
- `Why this score?` reveals criteria contributions, coverage, scoring version, and calculation time. Missing criteria are explicitly marked unknown rather than scored as failure.
- Scores are comparable only within a known scoring version and thesis revision. Recalculate after thesis changes; display `Updating fit` while preserving the previous labeled score.
- Do not derive a fake percentage from a random number, event count, model verbosity, or frontend-only heuristic. A demo score is allowed only within clearly labeled synthetic data.
- Score bands may use neutral `<60`, amber `60–79`, and mint `80–100` as an interface grouping; they must not be described as evidence of investment quality. This banding is a product convention, not a statistical claim.

### 2.6 Startup detail drawer

- Desktop: right-side panel, 420–480px wide, with company identity pinned at the top. Compact desktop/tablet: modal drawer. Mobile: full-height sheet with a header and explicit close control.
- Sections appear in this order: Overview, Founders, Signals & sources, Thesis fit, Agent activity, Investor notes.
- Keep actions available in the detail view, routed through the same decision controller. Never show multiple independently active controllers for one startup.
- A persistent wide-screen evidence panel is non-modal. A modal drawer traps focus, makes background content inert, and restores focus on close.
- Preserve the user's scroll position and deck selection when details close. Do not allow Escape to accidentally Pass a company.

## 3. Information Architecture & Responsive Layout

### 3.1 Core navigation and routes

| Route | Purpose | Primary action |
| --- | --- | --- |
| `/` | Discovery deck; main signed-in workspace | Pass, Super-Invest, Match |
| `/matches` | Saved startups, searchable and filterable | Inspect company; change priority |
| `/activity` | Agent runs and connector status | Inspect a run; retry eligible failures |
| `/settings` | Thesis criteria, source connections, preferences | Save settings |

Use a desktop navigation rail or compact sidebar with product name, Discover, Matches, Activity, and Settings. On mobile use bottom navigation with visible labels. Priority lives as a filter within Matches, avoiding an unnecessary top-level destination.

An optional shareable company URL may be added when required; detail opening should preserve navigation history so Back closes details before leaving discovery. Do not expose private company notes or investor-specific decisions through a public URL.

### 3.2 Breakpoints

| Viewport | Layout |
| --- | --- |
| 320–767px | Single column; 16px side gutters; bottom navigation; evidence in sheets; dock near card |
| 768–1199px | Compact left rail; centered deck; evidence in an on-demand drawer |
| 1200px and above | Navigation 200–224px; flexible deck region; optional 360–400px evidence/activity panel |

- Treat 1200px as permission for the third column only when the content fits. Collapse the evidence panel before shrinking the card below comfortable reading width.
- Limit the full workspace to approximately 1600px and center it on ultrawide screens. Grow whitespace rather than stretching text indefinitely.
- Use `100dvh` for viewport-aware shells and `env(safe-area-inset-bottom)` / top insets for mobile chrome.
- Reserve bottom space for both dock and navigation. Ensure toast placement, focus scrolling, and virtual-keyboard appearance never obscure the primary controls.
- At 320px width or 200% zoom, content reflows into one column. Use horizontal scrolling only inside a clearly bounded data table or trace code block.
- Avoid nested scroll traps. Discovery scrolls as a page; a separate evidence panel may scroll independently on wide screens with an obvious boundary.

### 3.3 First-run thesis setup and filters

- Explain the product in one sentence: `Discover startups that fit your thesis, with signals you can inspect.`
- Collect sectors, stages, geography, and optional check-size range. Ask for no more than these core choices before showing discovery.
- Make defaults visible. Geography is not silently locked to NYC merely because the hackathon is in NYC.
- Check-size inputs require explicit currency and interval validation. If company funding data is unknown, show that rather than asserting a match.
- The user can skip to a labeled demo dataset. Show a persistent `Demo data` indicator and a clear way to connect a source later.
- Keep current filter chips above the deck, a visible result count where known, `Reset filters`, and a concise no-results recovery path.
- Applying filters takes effect after the current gesture settles; announce that the queue changed. Do not mix the previous queue with stale filter results.
- Empty required settings use inline validation. Preserve entered values on errors; focus the first invalid field on submission.

## 4. Real-Time Signals — Intended akta.pro Integration

### 4.1 Adapter boundary and provenance

Provider-specific code runs on the server behind an adapter. The client consumes a normalized, validated application contract. Never put provider API keys in browser bundles or public environment variables.

Each normalized signal needs these application fields. These are proposed internal fields, not claims about the provider's native schema:

| Field | Requirement |
| --- | --- |
| `id`, `companyId`, `provider` | Stable IDs and provider attribution |
| `kind`, `title`, `summary` | Normalized category and human-readable claim |
| `sourceUrl`, `sourceLabel` | Original evidence location when supplied; nullable with an explicit absence state |
| `observedAt`, `fetchedAt` | Nullable observation time and actual retrieval time as UTC ISO timestamps |
| `value`, `unit`, `window` | Optional structured metric, unit, and measurement interval |
| `confidence`, `confidenceReason` | Optional calibrated confidence and explanation; unknown is valid |
| `evidenceType` | `observed`, `reported`, `inferred`, or `demo` |
| `freshnessPolicy` | Adapter/category policy identifier and expiration interval |
| `supersedesId` | Optional link to a correction or replacement |

- Deduplicate by stable provider identity plus company and observation version. Do not infer duplicates solely from similar titles.
- Validate timestamps and units; future timestamps beyond a documented clock-skew tolerance display `Time unavailable` and are excluded from freshness assertions.
- Distinguish a delta from a total, a count from a currency, and reported revenue from verified revenue. Preserve period and currency in every metric.
- Keep historical corrections auditable. When a claim is retracted, remove its positive badge and show the correction in details.

### 4.2 Freshness and connection states

Freshness is category-specific and separate from transport connectivity. For hackathon demo fixtures, use a documented provisional 15-minute freshness interval for stream-style signals. Real provider data must use an adapter policy grounded in its actual cadence; a daily dataset cannot honestly promise minute-level freshness.

| State | Visible treatment | Meaning |
| --- | --- | --- |
| Connected | Mint dot + `Connected` | Transport/session is healthy; does not prove every signal is current |
| Refreshing | Neutral spinner + `Refreshing` | A fetch is in progress; previous data stays visible |
| Recent signal | `Observed 8m ago` | Timestamp falls within its category policy |
| Stale signal | Amber clock + `Stale · observed 3h ago` | Observation exceeds its freshness policy |
| Observation unknown | `Observation time unavailable` | Retrieval time cannot substitute for observation time |
| Reconnecting | Amber status + retry information | Connection was interrupted; cached data remains usable |
| Offline | Explicit offline label | Browser/network unavailable; no live claims |
| Unavailable | Neutral/error label + recovery action | Provider could not supply data |
| Demo | `Demo data` badge | Synthetic fixture, whether animated or static |

- Display relative time in summary and exact localized time in details, including timezone. Store timestamps in UTC.
- Aggregate `last observed` uses the newest valid observation time among the company's visible signals and says so in details. Show per-signal times when evidence ages differ.
- Never display `Live` based on an animation, a timer, or a page being open. Reserve it for a functioning live channel; show connection state separately from data age.
- Prefer server-sent events when supported by the backend integration; otherwise use bounded polling, with the transport chosen after provider verification.
- Polling default: every 30 seconds while visible; pause while hidden, avoid overlapping requests, and refresh on visibility return. Honor provider limits and retry headers; this is a client scheduling default, not a freshness guarantee.
- Reconnect with exponential backoff and jitter, capped at 30 seconds. After five consecutive failures, enter a degraded state with a manual Retry control; browser-online or explicit user retry can restart the bounded sequence.
- Announce meaningful source failure once. Avoid a toast for each retry or every incoming signal.

## 5. Live Agent Traces — Intended Block Convey Integration

### 5.1 Activity presentation

Expose an activity panel with a compact default view: run name, current step, elapsed time, state, and a link to inspect details. A typical sequence might be `Find company → Collect signals → Check sources → Score thesis fit → Ready`, but show only steps the actual implementation performs.

Use a narrow vertical timeline with 1px connectors, small state icons, concise summaries, and monospace timestamps. Keep raw payloads collapsed. The active company can show its run in context; `/activity` provides historical and cross-company views.

### 5.2 Run and event contracts

Normalize provider events on the server to application fields such as `eventId`, `runId`, `companyId`, `sequence`, `timestamp`, `step`, `status`, `summary`, `durationMs`, `sourceReferences`, and optional sanitized details. These are internal contract requirements; do not assume Block Convey exposes identically named fields.

- Run states: queued, running, succeeded, failed, canceled, interrupted, unknown.
- Step states: pending, running, succeeded, failed, skipped. A run may be running while a parallel step has completed.
- Neutral dot = pending; small spinner = running; mint check = succeeded; coral error icon = failed; neutral slash = skipped or canceled with an explicit label.
- Use monotonic duration tracking while a run is active and the server's duration after completion. Do not count time forever after disconnect.
- Never infer success from a closed stream or elapsed time. Missing completion yields `Status unavailable` or `Interrupted` until reconciled.
- Deduplicate events by stable event ID, order using server sequence when available, and reconcile after reconnect. Late events update their proper position without erasing existing context.
- Preserve the last known run state during disconnection and show `Connection interrupted`. The backend must reconcile state before showing a terminal outcome.

### 5.3 Scroll, detail, and privacy behavior

- Auto-follow only when the user is already at the end of the trace. Scrolling upward pauses following and shows `N new events` / `Jump to latest`.
- Batch frequent events for rendering; virtualize long histories while preserving accessible navigation and event search. Cap browser memory with paginated history.
- Show verifiable execution summaries, tool/action names, source references, outcomes, and timing. Do not invent or expose private model chain-of-thought.
- Redact credentials, authorization headers, private prompts, personal contact details, and sensitive provider payloads on the server before delivery. Do not rely on CSS masking.
- Use Retry only for actions known to be safe to repeat or backed by idempotency. Disable unavailable retry operations with a reason.
- In demo mode, simulated events are labeled demo events and tied to synthetic runs. Simulated timing must never be presented as a measured production benchmark.

## 6. Decision State, Persistence, Undo, and Concurrency

### 6.1 Decision state machine

Use explicit states: `idle → dragging → idle` for a canceled gesture; `idle|dragging → submitting → saved|error` for an accepted decision. After a saved decision, the controller returns to idle for the next card. Keep `exiting` as an animation state separate from persistence state.

1. On intent acceptance, capture `companyId`, immutable card snapshot, previous decision, deck position, thesis revision, and a client-generated idempotency key.
2. Start the exit animation and mutation together. Promote the next card visually, but lock further decisions until the current request resolves.
3. On success, reconcile the server's canonical decision, unlock the next card, update counts once, and announce the result.
4. On definitive failure, restore the exact company to the active position, restore the prior count/state, display a concise error, and provide Retry. Preserve any inspection context.
5. On timeout or uncertain delivery, show `Checking save status`. Query or retry with the same idempotency key before permitting another decision. Do not assume failure and create a second independent write.
6. On refresh or reconnect, reconstruct the queue from canonical saved decisions. Do not silently reshow decided companies or permanently hide unsaved ones.

Store decisions per authenticated investor/workspace and company, with decision type, priority, version, and timestamp. Server-side authorization must protect company notes, saved lists, and trace access. A no-auth hackathon demo must use isolated synthetic/local state rather than suggesting production multi-user isolation exists.

### 6.2 Undo contract

- Show `Passed [Company]`, `Matched [Company]`, or `Prioritized [Company]` with an Undo button after confirmed persistence.
- Keep Undo available in the current-session decision history until the user takes the next decision or navigates away. The toast may auto-dismiss after 8 seconds only because an equivalent visible `Undo last decision` control remains available.
- Pause toast dismissal on hover or keyboard focus. Announce the confirmation once through a polite live region.
- Undo is a compensating server mutation that restores the previous decision and priority, guarded by the saved decision version. It is not merely re-adding a local card.
- While undoing, lock new decisions. On success, restore the company at the front of the current eligible queue, update counts once, and focus its heading. Preserve filter eligibility; if it no longer qualifies, confirm the reversal and offer to inspect it without silently violating filters.
- On Undo failure, keep the saved decision intact, explain the failure, and allow retry. Never display an undone card while the server still considers it saved.
- Resolve multi-tab or multi-user conflicts from the server version. Show `This decision changed elsewhere` and refresh the affected item rather than overwriting silently.

### 6.3 Offline behavior

Cached evidence remains inspectable with an offline banner and per-signal age. In the MVP, disable server-backed decisions while offline and explain why. A pending decision that loses connectivity enters uncertain-delivery reconciliation; do not silently discard it. Durable offline writes require a separately implemented outbox, not an optimistic toast alone.

## 7. Loading, Empty, Error, and Edge States

| Situation | Required experience |
| --- | --- |
| Initial deck loading | Skeleton with the same identity, content, and dock footprint; `Loading companies` status |
| Slow loading | After roughly 5 seconds, show `Still loading companies` without blocking other navigation |
| No startup data | Explain whether no source is connected; offer Connect source or labeled demo data |
| No filter results | `No startups match these filters` with Reset filters; preserve thesis settings |
| Deck exhausted | `You're caught up` with Matches and Refresh actions; no endless blank spinner |
| Missing founder/avatar | Neutral initials, explicit unknown fields; keep layout stable |
| Partial provider failure | Keep valid sources and cached evidence visible; isolate the failed source's warning |
| Decision failed | Restore active company, preserve context, offer Retry |
| Rate limited | Show retry timing when supplied; disable aggressive manual refresh loops |
| Authentication expired | Explain session expiry and preserve a safe return location for sign-in |
| Trace interrupted | Preserve timeline, show connection state, reconcile before terminal status |
| Image failed | Replace with initials without collapsing geometry |
| Source link missing | Show `Original source unavailable`; do not render a dead button |
| Company removed | Explain unavailable record, invalidate its actions, advance with an announcement |

Use skeleton shimmer sparingly; static placeholders under reduced motion. Errors name the failed operation and recovery step. Do not leak raw stack traces, provider errors, or secret-bearing payloads into user-facing messages.

## 8. Accessibility & Inclusive Interaction

Target WCAG 2.2 AA. This is a verification target, not a claim of certification.

- Text contrast: at least 4.5:1 for normal text, 3:1 for qualifying large text. Essential UI boundaries, icons, and focus indicators need at least 3:1 against adjacent colors.
- Focus ring: at least 2px solid amber with 2px offset; preserve visibility over glass and accent buttons using a dark separator where needed. Do not remove outlines without an equivalent.
- Every swipe action has a real `<button type="button">`. Use semantic landmarks, headings, links, lists, and form labels; do not turn arbitrary divs into controls.
- Represent the deck as a labeled region and the active company as an article. Reading order follows identity → founder → proposition → signals → metrics → reasons → actions.
- Never use `aria-grabbed` as a substitute for accessible actions. Keyboard users do not need to simulate a drag.
- Shortcuts: `P` = Pass, `S` = Super-Invest, `M` = Match, `Z` = Undo, and `?` = shortcut help. Display mappings in help and button tooltips. Do not capture shortcuts while typing, while modifiers are held, when a modal owns focus, or when no eligible active card exists.
- Escape dismisses the topmost transient overlay. Tab follows visible order. Use native button Enter/Space activation.
- After a deliberate card decision, move focus to the next company's heading only if focus was inside the departing card or its dock. Never steal focus from a user reading another region. If no next card exists, focus the deck-complete heading.
- Announce decision outcomes and deck exhaustion in a concise `aria-live="polite"` region. Announce blocking errors assertively only when necessary. Raw trace streams and time counters are not live regions.
- Honor `prefers-reduced-motion`: disable rotation, fling, stacked-card movement, shimmer, and celebratory effects. Keep equivalent state transitions immediate or use a brief opacity fade of at most 100ms.
- Honor forced colors and increased contrast where available; provide solid-surface fallbacks. No information depends on blur or translucency.
- Tooltips work on focus as well as hover. Essential evidence is accessible by click/tap. Do not gate functionality behind precision gestures.
- Reflow at 200% text zoom and a 320px CSS viewport. Respect user font settings, long localized labels, text spacing, and browser zoom.

## 9. Motion, Sound, and Interaction Feedback

| Interaction | Timing | Purpose |
| --- | --- | --- |
| Hover/focus treatment | 120–160ms | Show interactivity |
| Dock press | 80–120ms | Acknowledge activation |
| Popover reveal | 120–160ms | Anchor supporting detail |
| Drawer/sheet | 180–240ms | Preserve spatial context |
| Card exit/promotion | 180–240ms | Complete the decision |
| Small success feedback | 240–400ms once | Confirm saved outcome |

- Use ease-out for entering content and ease-in for leaving; use a spring for canceled drag recovery. Do not make every element spring or bounce.
- Animate transforms and opacity. Avoid animating blur, layout dimensions, large shadows, or continuous full-screen gradients.
- Keep one focal motion at a time. A live trace panel must not pulse every row while a company is swiping.
- Sound is off by default. Haptics are optional enhancement only when supported and user-enabled; never depend on them for confirmation.
- No autoplay audio, screen-filling confetti, randomly drifting particles, or endlessly bouncing action buttons.

## 10. UX Writing & Data Presentation

- Voice: concise, informed, direct. A VC should understand the company and its evidence in seconds.
- Use `Saved to matches`, `Marked as priority`, `Couldn't save your decision. Try again.`, and `Signals may be out of date` as reference patterns.
- Explain Super-Invest once: `Mark as priority. No money is moved and no message is sent.` Keep a reachable help explanation afterward.
- Do not say `It's a match!` in a way that suggests reciprocal founder consent. Prefer `Added to your matches`.
- Use `Reported`, `Observed`, `Estimated`, `Inferred`, `Unverified`, and `Demo` accurately. Avoid `Verified` without a documented verification rule.
- Format metrics with explicit units and useful precision: `$2.4M reported ARR`, `12 open roles`, `+4 roles in 30 days`. Include the data period and source in evidence.
- Use one locale-aware number/date formatter. Compact notation in summaries must expand to an exact value in detail. Missing is distinct from zero; unknown confidence is distinct from low confidence.
- Keep generated descriptions attributable to evidence. Never invent founder credentials, customer logos, funding rounds, or revenue to make a card look complete.
- Notes save with clear pending/saved/error states and preserve unsaved text on failure. Long notes cannot expand the discovery card uncontrollably.

## 11. Full-Stack Implementation Boundaries

The current starter uses Next.js App Router, TypeScript, React, and Tailwind. Preserve that baseline unless the user requests a migration. Framer Motion and any other additions must be deliberately installed during implementation; do not assume this rules file installs packages.

### 11.1 Suggested responsibility map

| Module | Responsibility |
| --- | --- |
| `components/SwipeCard.tsx` | Company presentation, gesture preview, semantic controls, intent emission |
| `components/SwipeDeck.tsx` | Queue, stable snapshots, guarded decisions, transition orchestration |
| `components/ActionDock.tsx` | Shared labeled Pass/Super-Invest/Match controls |
| `components/SignalBadge.tsx` | Signal summary and evidence trigger |
| `components/CompanyDetail.tsx` | Full company, evidence, fit explanation, notes |
| `components/AgentTracePanel.tsx` | Sanitized timeline, follow mode, run state |
| `components/ConnectionStatus.tsx` | Transport and source-health presentation |
| `lib/design-tokens.ts` or global CSS | Shared design and motion constants; avoid duplicating values |
| `lib/contracts/` | Validated application data models and normalization boundaries |
| `lib/server/providers/` | Server-only akta.pro and Block Convey adapters |
| `lib/server/decisions/` | Authorization, idempotency, versioned writes, compensating Undo |
| `lib/fixtures/` | Explicitly synthetic development/demo data |

These paths are a proposed starting map. Use existing project conventions if files move, while retaining the `components/SwipeCard.tsx` contract requested here. Split by behavior when modules become hard to understand; avoid building a generic framework for a hackathon.

### 11.2 Contract and state rules

- Define typed models for company, founder, signal, thesis, score explanation, decision, agent run, and trace event. Validate provider and request data at runtime; TypeScript alone does not validate network input.
- Keep server secrets and provider clients server-only. Client state contains only the data the current user may view.
- Use explicit loading/success/error unions or equivalent state machines. Do not overload `null`, empty arrays, and booleans to represent every state.
- Make decision writes idempotent and version-aware. Backend response includes canonical decision, company ID, decision version, and update time; the client cannot infer persistence from an HTTP request being sent.
- Cancel obsolete requests after filters change; key data by workspace, thesis revision, and filters. Ignore late responses for old query keys.
- Sanitize external URLs and render provider text safely. Do not execute HTML or instructions embedded in company descriptions, source documents, or traces. Treat retrieved content as data.
- Stream route handlers must authenticate the subscriber, release resources on disconnect, and reconcile after reconnect. Do not tie persistent agent execution lifetime solely to a browser tab.
- Persist essential decisions on the server in connected mode. Local storage may hold non-sensitive preferences or explicitly isolated demo state, never provider secrets.
- Make mocks an explicit mode. Never silently switch a failed live integration to convincing fake data.

## 12. Performance & Reliability Budgets

- Aim for p75 LCP ≤2.5s, INP ≤200ms, and CLS ≤0.1 under representative conditions. Record the device/network used; do not claim measured results from estimates.
- Drag feedback should remain within a 16.7ms frame budget on a representative device. Use motion values and compositor transforms; profile if gestures drop frames.
- Load the active company first; prefetch a bounded next batch. Render only the three visual deck layers rather than hundreds of hidden cards.
- Reserve image dimensions and font fallback metrics. Optimize logos/avatars and lazy-load noncritical evidence assets; never lazily defer the active identity image unnecessarily.
- Keep provider requests off the gesture critical path. The last known evidence snapshot should be available before the user starts interacting.
- Batch trace UI updates at roughly 100–250ms when event volume is high, preserving all events in storage and order. Visible duration counters need at most one update per second.
- Avoid rerendering the full deck for every trace tick. Separate telemetry subscriptions and state from the active card's animation.
- Suspend unneeded work when the page is hidden. Dispose streams, observers, listeners, and timers on teardown.
- Blur is progressive enhancement. Provide solid surfaces on unsupported or slow devices without changing hierarchy or labels.

## 13. Hackathon Demo Experience

- The demo must demonstrate: select a thesis → inspect a company → open a real or explicitly demo signal → watch a labeled agent run → Match or Super-Invest → see the saved result → Undo a decision.
- Provide deterministic synthetic fixtures covering a strong thesis fit, an unknown score, stale evidence, missing founder data, no more cards, failed save, and an interrupted run.
- Synthetic company identities must be clearly fictional. Never attach invented metrics to recognizable real startups or founders.
- Demo mode has a persistent indicator on discovery, matches, evidence, and activity. Animated fixtures remain labeled throughout.
- Connection setup and health are visible in settings. A missing credential shows `Not connected` with an actionable setup path; it is not a blank screen.
- Offer Reset demo only inside demo mode. It clears isolated demo state, asks for confirmation before discarding demo notes/decisions, and never touches connected production records.
- Graceful failure is part of the presentation: source outages leave cached cards inspectable, expose the freshness issue, and provide recovery.

## 14. Implementation Verification & Acceptance Criteria

During development, verify behavior at appropriate boundaries. Do not write tests that merely mirror CSS classes or implementation details. This documentation change alone requires content review rather than an app build.

### 14.1 Visual and responsive acceptance

- [ ] Canvas is exactly `#09090b`; required coral, amber, mint, card glass recipe, 1px borders, `rounded-3xl` cards, and `rounded-full` dock controls are present.
- [ ] Display/body/mono roles are consistent; metric digits do not jitter; critical text passes measured contrast checks.
- [ ] At 320×568, 390×844, 768×1024, 1280×800, and 1440×900, the active company, actions, and navigation remain reachable without accidental page-level horizontal overflow.
- [ ] At 200% zoom, content reflows and focus remains visible. Mobile safe areas, short landscape viewports, and the virtual keyboard do not cover actionable content.
- [ ] Long company names, missing logos, expanded text, and high signal counts preserve hierarchy without clipping controls.

### 14.2 Interaction and state acceptance

- [ ] Below-threshold drags return without a write. Threshold and flick cases commit in the intended direction exactly once.
- [ ] A reverse-velocity flick fails the flick shortcut; a displacement already beyond threshold still follows the displacement rule.
- [ ] Vertical touch scrolling works; inner links/buttons never start a swipe; pointer cancellation produces no decision.
- [ ] Pass, Match, and Super-Invest share identical persistence behavior across buttons, keyboard, and drag where supported.
- [ ] Double clicks, concurrent drag/button input, request retries, and reconnects create one logical decision.
- [ ] Definitive save failure restores the correct startup. Uncertain delivery reconciles before enabling another decision.
- [ ] Undo reverses the canonical decision, restores eligible deck position, handles version conflicts, and leaves state consistent on failure.
- [ ] Filter changes, late responses, incoming signals, and multi-tab updates cannot swap the active card mid-gesture.

### 14.3 Evidence, traces, and accessibility acceptance

- [ ] Every displayed claim exposes its provenance, observation time or explicit absence, retrieval time, and evidence type.
- [ ] Connected, live, recent, stale, offline, and demo are distinct states; missing metrics and scores never become zero or fabricated percentages.
- [ ] Trace events deduplicate and reconcile; scrolled-up users are not forced to the bottom; stream closure alone never signals success.
- [ ] No provider keys, private reasoning, or sensitive raw payloads reach the browser or visible trace exports.
- [ ] Keyboard-only users can complete discovery, inspect sources, save, Undo, and dismiss overlays. Hidden cards are absent from tab order and the accessibility tree.
- [ ] Screen-reader announcements are concise; reduced motion disables fling/rotation; source and decision states remain understandable without color.

### 14.4 Required development checks

When implementing application changes, run the repository's applicable type, lint, build, and meaningful behavioral checks. Add focused gesture/persistence tests for boundary thresholds, failure reconciliation, idempotency, and Undo. Validate accessibility with automated tooling plus manual keyboard and screen-reader checks; automation alone is insufficient.

Inspect desktop and mobile screenshots together, fix observed defects in a single batch, and confirm the fixes. Report actual checks and any unverified live integration clearly. Never mark live provider behavior verified using fixture-only tests.

## 15. Design Anti-Patterns to Reject

- A marketing hero, massive slogan, or decorative dashboard between the investor and the first startup.
- Generic purple/blue AI gradients replacing the requested pitch-black/coral/amber/mint palette.
- Neon outlines, excessive blur, glass inside glass, or a card for every minor piece of metadata.
- Three equally loud primary buttons, unclear action labels, emoji-only controls, or interactions available only by swiping.
- Match celebrations that imply founder reciprocity, actual investment execution, or messages being sent.
- Fake live dots, synthetic confidence percentages presented as measured data, fabricated metrics, or stale observations shown as fresh.
- Logs that expose secrets or private chain-of-thought, constantly steal scroll, or announce every event to screen readers.
- Optimistic success with no rollback, duplicate writes on retry, Undo that changes only the browser, or silently dropped offline decisions.
- Whole-page reflows on every event, deeply nested scrolling on mobile, or gestures that trap normal scrolling.
- Placeholder links, inaccessible dark-on-dark controls, unreadable tiny telemetry, and missing recovery states disguised as minimalism.

Before completing any product surface, review it against the core sequence: **understand the startup → inspect the evidence → make a deliberate decision → recover or revise it confidently.**
