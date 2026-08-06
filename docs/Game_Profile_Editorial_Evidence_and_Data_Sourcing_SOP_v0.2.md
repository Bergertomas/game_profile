# Game Profile — Editorial Evidence & Data Sourcing SOP v0.2
**Date:** 2026-08-06  
**Status:** Working operating procedure

# 1. Principle

Every visible score should answer:
1. What does this score mean?
2. What evidence justified it?

External sources provide evidence. Rubric v1.0 provides the measurement framework. The editor makes the final scored judgment.

# 2. Data layers

## Factual metadata
Automate where licensing allows:
- title
- cover
- developer/publisher
- platforms
- release date/status
- genres
- external IDs
- runtime estimates

Preferred MVP provider: IGDB.

## Evidence
Store source-by-source:
- direct evaluator play/hands-on
- critic reviews
- technical analyses
- specialist/creator coverage
- player sentiment/signals
- first-party material for facts/pre-release claims

## Editorial judgment
For each dimension:
- five subcriteria,
- each 0 / 0.5 / 1 / 1.5 / 2,
- rationale,
- linked evidence,
- confidence.

Dimension score = sum of the five subcriteria.

# 3. Released-game evidence pack

Editorial target, not inflexible quota:

- 5–8 substantive critic reviews
- 1–3 specialist/creator deep dives where useful
- at least one technical source when performance matters
- player signal where permitted/useful
- direct play when available

Do not choose sources because they agree with the expected score.

# 4. Scoring workflow

For each dimension:
1. Review its five canonical subcriteria.
2. Collect relevant evidence.
3. Tag evidence to subcriteria.
4. Record meaningful disagreement.
5. Score each subcriterion independently.
6. Write a concise rationale.
7. Assign Low / Medium / High dimension confidence.
8. System sums the five values.

Example:

Atmosphere & World Pull — 9.5
- Sense of Place — 2.0
- Mood Strength — 2.0
- Audiovisual Identity — 2.0
- World Coherence / Myth — 1.5
- Memory Residue — 2.0

Confidence: High
Linked evidence: 11 substantive sources

The public 9.5 is therefore reproducible:
2 + 2 + 2 + 1.5 + 2 = 9.5

# 5. Confidence

High:
- broad post-release evidence,
- strong agreement,
- relevant platform/current-state coverage.

Medium:
- credible evidence but material disagreement,
- recent release,
- incomplete platform coverage,
- active patching.

Low:
- pre-release evidence dominates,
- major unknowns,
- sources substantially conflict,
- very small evidence base.

Dimension confidence may differ from overall profile confidence.

# 6. Public transparency

Compact trust line example:

`VERIFIED · High confidence · 14 substantive sources · checked 6 Aug 2026 · Rubric v1.0`

`Evidence & scoring` drawer:
- source-category counts
- direct-play status
- full source list
- methodology link

Per-dimension `Why this score?`:
- five subcriteria
- exact 0–2 scores
- rationale
- confidence
- linked source count/list

Avoid wording such as:
`Calculated from 11 reviews.`

Prefer:
`Supported by 11 linked sources.`

Sources are evidence, not votes in an average.

# 7. Runtime / playtime

Preferred MVP source: IGDB `game_time_to_beats`.

Consumer-facing fields:
- Main path
- Main + extras
- Completionist
- Based on N submissions

Runtime never affects the eight dimension scores automatically.

# 8. HowLongToBeat

Do not use an unofficial HLTB scraper/wrapper as a production dependency.

If official/licensed HLTB access becomes available later, add it behind the same runtime-provider adapter.

# 9. Steam/player reviews

Steam is valuable for:
- recurring friction,
- current technical state,
- post-launch changes,
- large-scale sentiment.

Do not:
- treat 500 reviews as 500 editorial sources,
- map Steam % directly to a dimension,
- let review bombing/business-practice sentiment become gameplay quality without context.

Review Valve usage/commercial terms before making Steam data a persistent public product dependency.

---

# 10. Pre-release profiles

Pre-release coverage is a first-class product use case, especially in crowded release windows. The goal is to be useful **without pretending we know the finished game**.

## 10.1 Pre-release states

Use four editorial maturity states internally:

### ANNOUNCED
Only basic first-party information exists.

Public treatment:
- normal game metadata page may exist,
- no full numerical Game Profile,
- show `Not enough evidence to score yet`,
- show known facts and clearly sourced experience tags only.

### SHOWCASED
Substantial official gameplay, developer demonstrations or a public demo exists, but little/no independent hands-on evidence.

Public treatment:
- `PRE-RELEASE`,
- Low overall confidence,
- score only dimensions/subcriteria directly observable with adequate evidence,
- prefer ranges or `Unknown` elsewhere.

### HANDS-ON
Independent outlets/creators have played meaningful portions, or a substantial public demo is available.

Public treatment:
- `PRE-RELEASE`,
- Low or Medium overall confidence,
- more dimensions may receive ranges/numbers,
- dangerous late-game dimensions remain conservative.

### REVIEW-CODE / PRE-LAUNCH REVIEWS
Multiple reviewers have access to a near-final/full build before street date.

Public treatment:
- still `PRE-RELEASE` until release,
- overall confidence may reach Medium but not High,
- some dimension confidence may be High when evidence is broad and the dimension is directly observable,
- launch technical state, day-one patch effects and broad player signal remain unknown.

## 10.2 Pre-release evidence hierarchy

### Strongest
- our own public demo / preview build hands-on, honestly disclosed,
- substantial public demo available to players,
- multiple independent hands-on previews with meaningful playtime,
- unedited or long-form gameplay from credible independent sources,
- pre-launch reviews based on near-final/full code.

### Useful but limited
- official extended gameplay,
- developer interviews explaining systems,
- official FAQ/store/platform descriptions,
- producer/director demonstrations.

Use these primarily for **facts and intended design**, not claims such as `excellent`, `deep`, `well-paced`, or `polished`.

### Weak / non-scoring
- trailers with no representative gameplay,
- marketing superlatives,
- rumor/leaks without reliable verification,
- social-media speculation,
- isolated second-hand impressions.

These may inform a watchlist but should not drive numerical scoring.

## 10.3 Minimum evidence before publishing scores

### First-party only
Do not publish a complete eight-dimension numerical profile.

Allowed:
- factual tags,
- selected observable subcriteria with Low confidence,
- `Unknown` for the rest,
- a clear `Based primarily on first-party material` warning.

### Independent preview coverage
As a working target, seek:
- at least **3 substantive independent hands-on sources** for a Medium-confidence pre-release profile,
- ideally from different outlets/voices,
- plus official material for factual verification.

This is a target, not a mechanical quota. Two unusually deep independent sources may be more useful than six shallow previews.

### Public demo
A substantial public demo strengthens evidence because:
- we may assess it directly,
- player footage/reactions broaden signal,
- mechanics can be observed without relying only on marketing.

The evaluation scope must explicitly say `Demo / preview build` and must not imply full-game coverage.

## 10.4 What can be scored early

Often safer:
- visible camera/form,
- basic combat feel and control response from real hands-on,
- moment-to-moment agency,
- audiovisual identity,
- broad structural form,
- onboarding in the sampled section,
- observable UI/interaction friction,
- known multiplayer/co-op structure.

Score only the portion actually supported.

## 10.5 What should usually remain ranged or Unknown

Often unsafe before full release:
- narrative payoff,
- character arcs over the full game,
- late-game narrative coherence,
- runtime justification,
- long-term repetition/bloat,
- progression depth across the full campaign,
- late-game enemy/mission variety,
- technical stability at launch,
- endgame,
- lasting thematic/emotional impact,
- memory residue,
- post-launch economy/live-service health.

Do not infer these from developer promises.

## 10.6 Pre-release score format

Use one of three representations per dimension:

### Confirmed-enough estimate
Example:
`Agency & Satisfaction — 8.0 · Medium confidence`

Use only when most subcriteria are directly supported.

### Range
Example:
`Structure & Focus — 7.0–8.0 · Low confidence`

Use when evidence supports a bounded estimate but not a precise value.

### Unknown
Example:
`Thematic & Emotional Impact — Not enough evidence`

Unknown is preferable to false precision.

A dimension with more than one unknown subcriterion should normally not display a single precise /10 value.

## 10.7 Public transparency for pre-release

The trust line should identify the evidence type, not merely source count.

Example:

`PRE-RELEASE · Medium confidence · 5 hands-on previews + public demo · checked 6 Aug 2026`

Evidence drawer:
- Direct play: public demo, 2.1 hours
- Independent hands-on previews: 5
- Official gameplay/interviews: 3
- Technical launch analysis: not yet available
- Full-game reviews: not yet available
- Player launch signal: not yet available

Every pre-release profile should prominently state:

`This profile describes currently available evidence, not the finished release. It will be reassessed after launch.`

## 10.8 Pre-release recommendation wording

Do not use language that sounds like a final purchase verdict.

Prefer:
- `Looks promising if…`
- `Watch before buying…`
- `Biggest unknowns…`

Once the game receives a post-release evaluation, switch to:
- `Great fit if…`
- `Know before buying…`
- `Probably not for you if…`

## 10.9 Launch transition

Never overwrite the pre-release evaluation.

At release:
1. preserve the pre-release evaluation in history,
2. automatically flag the game for reassessment,
3. create a new post-release evaluation,
4. ingest full reviews/technical evidence/player signal as available,
5. reassess every subcriterion rather than simply carrying numbers forward,
6. show meaningful score changes in revision history.

The first post-release profile may be `PROVISIONAL` until evidence is mature.

Example history:
- Aug 10 — Pre-release profile: Agency 8.0–9.0
- Sep 18 — Launch provisional: Agency 8.5
- Oct 02 — Verified profile: Agency 8.5

This history is useful product information: it shows where preview expectations were right or wrong.

## 10.10 Pre-order boundary

Game Profile should not encourage pre-ordering merely because a pre-release profile looks strong.

If store links exist later:
- pre-release CTA should favor `Wishlist / Follow` over `Buy now`,
- any pre-order link must remain visually secondary,
- uncertainty must stay adjacent to the recommendation.
