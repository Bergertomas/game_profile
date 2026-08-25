# Should I Play? — Public Product P0 Decision Set

- **Decision date:** 24 August 2026
- **Recorded:** 25 August 2026
- **Authority:** Governing owner decisions unless explicitly superseded
- **Scope:** Homepage, scoring protocol direction, catalog/production target, homepage curation, accountability, and artwork launch posture
- **Design status:** No explored mockup is the final implementation specification

This document preserves the complete P0 decision record supplied by Tomas. It
owns the product decisions summarized here; the Rubric continues to own scoring
meaning, the Evidence SOP owns evidence practice except where an explicit later
decision is recorded, and the candidate Scoring Protocol remains provisional
until its calibration gates pass.

One role-name transcription has been normalized while preserving the repeated
substantive decision: GPT Chat is the initial primary scoring editor; Codex and
Claude handle engineering, validation and import. No AI process may publish
without Tomas's approval.

---

Homepage P0 Resolution
Date: 24 August 2026
Scope: Homepage proposition, primary journey, functional hierarchy, and role within the public product
Outcome: Resolved sufficiently to leave this branch
Authority: Governing product decision until explicitly superseded
Design status: No explored mockup is the final design
1. Governing decision
The homepage will be an:
Art-led, utility-first entrance to a profile-first field guide.

It should immediately feel like a product about video games, then help visitors perform one of three tasks:
1. Find a game they already have in mind.
2. Compare two games they are choosing between.
3. Explore games through a question, experience, or curated collection.
The homepage is not merely a marketing page. It is also not a search engine, rankings feed, editorial magazine, personalized recommendation engine, or full comparison report.
It combines:
- a decision tool at the entrance;
- a profile-first reference library underneath;
- selective editorial guidance where human judgment adds value.
“Field Guide” remains the most appropriate product metaphor. “Registry” may describe an underlying search or catalog pattern, but it should not become the homepage’s public proposition.
2. Primary promise
The homepage should help visitors understand whether a game may fit the way they play by making the character of its experience visible.
It should answer “Should I play this?” through:
- eight descriptive dimensions;
- explicit scope and confidence;
- evidence-backed profiles;
- comparison of meaningful trade-offs;
- editorial explanation where useful.
It must not answer through:
- an overall score;
- a universal winner;
- rankings;
- false personalization;
- an unexplained recommendation.
The product helps the visitor make the decision. It does not pretend there is one objectively correct answer.
3. Primary user journeys
Journey A — known game
1. Visitor arrives with a specific title in mind.
2. Uses Find a game.
3. Selects a matching profile or scope.
4. Opens the substantive profile page.
This is expected to be the most basic and common journey.
Journey B — active choice
1. Visitor is choosing between two games.
2. Uses Compare two.
3. Selects both profiles.
4. Receives a compact, shape-first homepage preview.
5. Opens the dedicated comparison experience for full detail.
Compare is therefore launch-critical and accessible directly from the homepage, while remaining subordinate to the underlying profiles and evidence.
Journey C — open-ended exploration
1. Visitor does not have a specific title in mind.
2. Uses Start with a question or browses a curated collection.
3. Discovers a relevant profile or editorial comparison.
4. Continues into the profile or Compare.
The precise semantics of “Start with a question” remain part of the Search/Discovery P0 discussion.
4. Homepage functional hierarchy
A. Global navigation
The governing public navigation remains approximately:
- Profiles
- Compare
- Methodology
- About
Exact labels and mobile navigation behavior remain design questions.
B. Compact art-led hero
The opening section should combine:
- the primary promise;
- prominent product utility;
- authentic game artwork;
- the three entry modes.
Artwork should immediately establish the product category and create emotional identity. It should not occupy so much of the opening screen that the product utility becomes secondary.
The explored full-height featured-game treatment was too dominant. The governing direction is a more compact composition in which artwork supports the decision interface.
Acceptable future treatments include:
- one manually curated featured profile;
- a composition using artwork from several profiles;
- a user-controlled selection of featured profiles.
An automatically rotating carousel is not currently required.
C. Three-mode decision console
The homepage’s primary interactive element will contain:
1. Find a game
2. Compare two
3. Start with a question
The control should be highly visible and inviting without becoming a generic oversized search page.
Find a game
Searches known profile identifiers such as:
- canonical titles;
- aliases;
- supported scopes or editions where relevant.
Detailed search semantics belong to the Search P0.
Compare two
Provides two profile selectors and leads to either:
- a compact inline comparison preview;
- the dedicated /compare experience.
The homepage preview should make the comparison useful without reproducing the entire dedicated page.
Start with a question
Provides discovery based on an experience, constraint, category, or curated prompt.
It must not imply an intelligent natural-language recommendation engine unless that capability genuinely exists.
Potential MVP implementations include:
- structured categories;
- profile tags;
- dimension-informed prompts;
- curated questions;
- limited lexical search across suitable profile content.
The precise implementation is still open.
5. Homepage comparison result
Shape before interpretation
A selected comparison should lead with the visual representation of the two eight-dimensional profiles.
The governing hierarchy is:
1. Comparative shape.
2. Concise interpretation.
3. Route to the complete comparison.
The previous design that led with a three-row “Where they differ” list is superseded. That presentation made secondary detail look like the comparison’s primary result.
Radar/spider chart
An overlaid radar or spider chart is the current preferred representation because it makes the relative profile shapes immediately visible.
However:
- the shape-first hierarchy is locked;
- the exact chart implementation remains provisional pending Compare design and accessibility review.
The comparison design must not imply that the larger enclosed area represents the better game.
Mandatory explanation
Wherever comparative shapes are introduced, the interface must visibly explain:
A bigger shape is not better.

This should be accompanied by a concise “How to read the shape” route where appropriate.
This is a core methodological safeguard, not optional marketing copy.
Derived interpretation
Below the chart, the homepage may show:
- the largest meaningful contrast;
- where the games align most closely;
- one concise summary of the comparison.
The fixed eight-dimensional model makes a basic deterministic interpretation feasible for arbitrary pairs. It can identify:
- the largest dimension gaps;
- the direction of those gaps;
- the closest dimensions;
- dimensions on which both profiles have similar characteristics.
This does not require bespoke prose or an LLM for every pair.
Nuanced editorial interpretation will be reserved for selected curated comparisons.
6. “Choosing between…” editorial module
The homepage should include a secondary module featuring selected comparisons.
Each entry may contain:
- two games;
- one meaningful tension or decision;
- compact artwork;
- a route into Compare;
- optional editorial context.
Example:
Atmosphere first—or absolute control?

These entries provide value while the catalog is still small. They transform a collection of 12–15 profiles into a set of meaningful decisions rather than a sparse inventory.
The editorial module should not attempt to cover every possible pair.
7. Profile shelf
The homepage should include an artwork-led shelf of available profiles.
Its purposes are:
- make the library tangible;
- support browsing;
- give authentic game artwork a strong role;
- expose the catalog without turning the homepage into a registry table;
- establish the Field Guide character of the product.
Potential shelf behavior includes:
- featured profiles;
- recently published profiles;
- deliberately curated collections;
- a route to all profiles.
“Recently published” must refer truthfully to publication on Should I Play?, not necessarily the game’s release date.
The exact number of visible profiles, shelf labels, and collection logic remain design decisions.
8. Profile-page comparison entry points
Individual profile pages should offer a compact Compare with section containing relevant sibling profiles.
These should initially be editor-selected rather than described as “popular” or “commonly compared,” unless usage evidence exists to support those labels.
Selecting an option should open Compare with the current profile already populated.
Presence of this capability is governing. Its exact placement belongs to the individual-profile P0 discussion.
9. Messaging direction
The governing messaging direction is:
Eyebrow, provisional
Make the shape visible.

Primary headline, provisional
Know what you’re getting into.

Explanation, provisional
Look up one game, compare two, or explore a small field guide built around real experience—not rankings.

A fit-oriented line may support the search interaction:
See whether a game fits the way you play.

The exact words are not locked. What is locked is that the homepage should communicate:
- practical decision value;
- the ability to find, compare, and explore;
- an experience-based field guide;
- no rankings or universal winner.
“Know what you’re getting into” is currently stronger than the existing product logline and should govern the next writing pass unless improved.
10. Artwork decision
Authentic game artwork should materially participate in:
- the opening section;
- profile cards;
- the shelf;
- curated comparison features;
- search results where appropriate.
Artwork should establish emotional and category identity while the surrounding interface maintains a coherent Should I Play? identity.
The homepage must retain a deliberate no-art fallback.
The private mockups used promotional artwork only to evaluate atmosphere. They do not resolve the production artwork rights or sourcing policy.
11. Personalization and rotation
MVP
The homepage will not depend on:
- inferred user taste;
- account-based personalization;
- most-searched rankings;
- behavioral recommendation systems;
- an automatic artwork carousel.
These capabilities would add complexity without sufficient catalog size or usage evidence.
Permitted MVP curation
The homepage may use:
- manually selected featured profiles;
- manually selected comparison pairs;
- recently published profiles;
- stable editorial collections.
Reopening personalization
Taste-based homepage content should be reconsidered only after the product has:
- a materially larger profile catalog;
- a defined taste model;
- sufficient visitor behavior or explicit user preferences;
- a clear advantage over straightforward search and curation.
12. Small-catalog value
The homepage remains useful with approximately 12–15 profiles because it does more than expose a search index.
Its small-catalog value comes from:
- substantive individual profiles;
- comparisons between available profiles;
- curated “Choosing between…” decisions;
- editorial collections;
- authentic artwork;
- evidence and methodological trust.
The product should present the catalog as deliberate rather than apologizing for its size.
It must not create empty filters, inflated categories, or programmatic SEO pages to simulate scale.
13. Decision register
Area	Decision	Status	Governing now?	Notes
Homepage role	Art-led, utility-first entrance to a profile-first Field Guide	LOCKED	Yes	Decision tool plus library, not rankings
Primary journeys	Find one, compare two, or explore through a question	LOCKED	Yes	Governs homepage IA
Compare prominence	Available directly from the homepage	LOCKED	Yes	Dedicated /compare remains
Three-mode console	Find, Compare, Start with a question	LOCKED	Yes	Third mode’s semantics remain open
Authentic artwork	Prominent but subordinate to product utility	LOCKED	Yes	Rights policy unresolved
Oversized featured hero	Do not let one featured game dominate the opening screen	LOCKED	Yes	Supersedes full-height treatment
Automatic carousel	Not required for MVP	DEFERRED	No	Manual curation is sufficient
Personalization	No taste-based homepage for MVP	DEFERRED	No	Requires catalog and taste model
Comparative shape	Visualized before textual interpretation	LOCKED	Yes	Governs result hierarchy
Radar/spider chart	Preferred comparison visualization	PROVISIONAL	Provisionally	Requires accessibility/design review
Difference list before chart	Large multi-row result preceding the shape	SUPERSEDED	No	Concise interpretation follows chart
“Bigger shape” guidance	Explain that greater area is not better	LOCKED	Yes	Mandatory methodological safeguard
Automatic pair summary	Deterministic summary from dimension differences	PROVISIONAL	Provisionally	Detailed rules belong to Compare P0
Bespoke writing for every pair	Do not require manually authored copy for all pairs	LOCKED	Yes	Not scalable or necessary
Curated comparisons	Manually authored “Choosing between…” features	LOCKED	Yes	Small selected set
Profile shelf	Artwork-led browsing module	LOCKED	Yes	Exact organization is design work
Profile-page comparison links	Editor-selected “Compare with” options	LOCKED	Yes	Placement remains open
Homepage copy	Current headline and explanation direction	PROVISIONAL	Provisionally	Finalized during UX writing
Final visual design	Cinematic, deliberate, artwork-aware direction	PROVISIONAL	Provisionally	Requires dedicated art direction
Registry-first homepage	Table/workbench as the dominant public entrance	SUPERSEDED	No	May inform internal search patterns
Search-only homepage	Oversized search as the entire proposition	SUPERSEDED	No	Too generic and visually stale
Rankings/feed homepage	Popularity, scores, or universal winners	SUPERSEDED	No	Conflicts with product methodology


14. Mockup status
The five explored homepage concepts and the later normalized comparison are research artifacts.
They helped isolate useful components, but none should be treated as an implementation specification.
The governing synthesis is:
- #1’s overall art-plus-utility composition;
- #2’s prominent search invitation;
- #3’s accessible actions and cinematic shelf;
- #4/#5’s concise post-chart interpretation;
- a smaller, controlled art treatment;
- a radar-led comparison result.
The next design should start from this synthesis rather than selecting and reproducing one previous concept.
15. Questions transferred out of this branch
Search/Discovery P0
- What exactly does Start with a question search?
- Is it structured discovery, text search, curated prompts, or a combination?
- Which profile fields and editorial metadata support it?
- What happens when the small catalog contains no suitable result?
- Does the homepage produce results inline or route elsewhere?
Compare P0
- Exact comparative chart implementation.
- Axis order, labels, legend, and mobile behavior.
- Automatic “largest contrast” and “closest alignment” rules.
- Handling small or insignificant score differences.
- Full /compare contents and hierarchy.
- Compare URL and noindex policy.
- Which comparison state appears inline on the homepage.
Individual-profile P0
- Placement and prominence of Compare with.
- How candidates are editorially selected.
- Relationship between profile summary, dimensions, evidence, and artwork.
- What belongs above the fold.
Artwork P0/P1
- Lawful, scalable artwork sources.
- Attribution and recordkeeping.
- Key art versus screenshots.
- Crop and responsive rules.
- No-art fallback.
Dedicated design phase
- Exact hero composition and dimensions.
- Final typography, palette, motion, and shape language.
- Mobile navigation and reflow.
- Final copy.
- Interaction states and accessibility.
- Design-system components.
16. Branch closure
The homepage P0 question is answered.
The homepage should no longer remain listed as an undefined proposition or an open question about whether it is a Field Guide, registry, search engine, or decision tool.
It is deliberately:
A decision-tool entrance to an evidence-backed, profile-first Field Guide.



### P0 — Scoring protocol and reproducibility

**Existing state**

The project already had:

- Game Profile Scoring Rubric v1.0;
- the eight dimensions and forty subcriteria;
- exact half-step/Unknown rules;
- deterministic dimension derivation;
- an Evidence and Data Sourcing SOP;
- broad instructions to map evidence, score independently, record disagreement, and write rationales.

It did **not** have a complete operational protocol explaining reproducibly how online evidence becomes a particular half-step value.

**Decision**

Adopt claim-level rubric synthesis—Option A—as the governing methodological direction.

Sources are not averaged, voted, or converted from review scores. AI extracts concrete, scoped observations from critical reviews, creators/specialists, technical analysis, documented gameplay, direct play where available, first-party facts, and bounded player-signal samples. Each accepted claim is mapped to one subcriterion consequence and tested against explicit behavioral anchors and counterevidence.

There is no outlet blacklist or fixed outlet weighting. External review grades, aggregates, popularity, and general positive/negative sentiment are not scoring inputs. Future source curation or weighting may be reconsidered only if calibration and production audits demonstrate a repeated systematic failure; that would require a new protocol version and would not rewrite historical profiles.

**Evidence standard**

- Five independent substantive sources is a genuine-scarcity floor.
- Eight to ten is the normal AA/AAA target.
- Additional sources are used only for material platform variance, instability, disagreement, live-service change, or unusual complexity.
- Source count establishes collection sufficiency, never a score.

**Operational workflow**

1. Freeze scope, edition, mode, platforms, build, maturity, stability, and evidence cutoff.
2. Conduct a separate research pass and freeze/hash the normalized evidence corpus.
3. Run a clean-context primary scoring pass.
4. Run one byte-identical, clean-context blind audit pass.
5. Compare claims, mappings, values, Unknown reasons, and confidence before adjudication.
6. Resolve differences to one exact half-step or Unknown.
7. Derive dimensions and confidence mechanically.
8. Write fit interpretation only after adjudication.
9. Tomas approves the content-addressed package.
10. Claude/import tooling may create a draft, but cannot score or publish automatically.

**Reproducibility standard**

“Reproducible” has two distinct meanings:

- Computational, evidentiary, and procedural reproducibility must be complete.
- Independent qualitative agreement must be measured rather than assumed.

Before Protocol v1.0 becomes governing, it must pass a ten-game blind calibration program: six development games and four untouched holdout games. The holdout requires, before owner adjudication:

- at least 90% numeric coverage in each pass;
- at least 36/40 numeric decisions per game;
- at least 70% exact agreement;
- at least 95% exact-or-adjacent agreement;
- no more than 5% material disagreement;
- at least 90% exact-or-adjacent agreement within every dimension;
- at least 80% exact confidence agreement;
- no material endpoint disagreement;
- complete evidence/anchor traceability and deterministic derivation parity.

Owner adjudication produces the accountable final profile but never counts as independent agreement.

**Status**

- **LOCKED:** Option A—claim-level rubric synthesis; GPT Chat as the initial primary scoring editor; Tomas as final authority; Codex or Claude as implementation/import executor; no source-score aggregation; future weighting asterisk.
- **PROVISIONAL:** The detailed Protocol v1.0 anchors, thresholds, confidence formulas, and package contract until blind development/holdout calibration passes.
- The protocol must not yet be described publicly as proven reproducible.


P0.2 — What constitutes the launch catalog, and how is it produced?
Decision: LOCKED
The previously proposed 12–15-profile catalog is not the public product launch. It is a proof/catalog-development milestone used to validate the product design, real content states, Search, Compare, mobile behavior, and the editorial pipeline.
Should I Play? should not be presented or marketed as a broadly useful public product until it has approximately 100 substantive profiles. A smaller private preview or limited product test is acceptable, but it is not the real launch.
The catalog will be produced through a deliberately manual, AI-assisted workflow initially:
- GPT Chat performs the research and scoring.
- Each evaluation follows Game Profile Scoring Rubric v1.0 plus the new reproducible Scoring Protocol.
- GPT Chat produces a validated structured scoring package—JSON initially, with YAML permitted as an authoring convenience.
- A separate GPT scoring context performs the blind audit.
- Tomas reviews and approves the final evaluation.
- Codex or Claude handles validation, import, and engineering work; Claude is not the default editorial scorer.
- No scoring API, automated agent, or dedicated scoring skill is required before launch. Those become worthwhile only after the manual workflow is proven and automation would materially improve throughput.
The evidence standard is:
- Five substantive independent sources is the minimum when credible coverage is genuinely scarce.
- Eight to ten substantive independent sources is the normal target for AA/AAA games.
- More may be used where platform variance, technical instability, live-service changes, disagreement, or unusual complexity requires it.
- Sources are evidence inputs, not votes. Their review scores, outlet prestige, popularity, and aggregate ratings do not enter the calculation.
- Useful evidence can include full-game reviews, specialist or creator analysis, technical analysis, documented gameplay, player-signal synthesis, first-party facts, and disclosed direct play.
- Claims are assessed individually for relevance, specificity, independence, demonstrated access, scope, and currency.
- There is no outlet blacklist and no fixed source weighting in Protocol v1.0. Curated source sets or weighting may be reconsidered later if audits demonstrate a repeated systematic failure that claim-level evaluation cannot solve.
The scoring process must be reproducible and provenance-auditable. Rubric v1.0 remains the governing definition of the scores; the new protocol supplies the missing evidence-to-number procedure. The protocol must pass its ten-game calibration before bulk catalog production: six development cases and four untouched holdouts.
Update policy:
- Newly released games receive a three-month stabilization check.
- A six-month check occurs only where instability, active remediation, live-service change, or unresolved uncertainty remains.
- A twelve-month maturity check follows.
- A material-change review can occur at any time after a major patch, systems redesign, material performance change, expansion affecting the base game, important port, service-availability change, credible correction, or meaningful new late-game evidence.
- Mature games assessed for the launch catalog receive one current-state evaluation and then become trigger-based.
- General sentiment movement, controversy, or a changed aggregate review score does not by itself justify rescoring.
Catalog selection should prioritize real user usefulness:
- recognizable games people are actively deciding whether to play;
- meaningful variation across the eight profile dimensions;
- enough related titles to produce useful comparisons;
- a reasonable spread of genres, eras, scales, and experience shapes;
- evidence availability sufficient to support truthful profiles.
Rigid genre quotas are unnecessary. The exact 100-title lineup is a curation/execution task under these rules, not a reason to reopen the product model.

P0.3 — What editorial shelves appear on the homepage, and who owns them?
Decision: LOCKED
The homepage will use a hybrid editorial model:
A stable decision-oriented structure combined with a regularly refreshed editorial layer.

It will contain three kinds of collections.
1. Automatically fresh factual shelves
Examples:
- Recent releases in the Field Guide
- Newly profiled
- Recently reassessed
These may be generated automatically from objective publication, release, and reassessment dates. Automation cannot make qualitative claims or infer editorial membership from dimension scores.
2. Evergreen decision shelves
Three or four durable shelves will help visitors browse according to the experience they want, rather than only by genre.
Representative directions include:
- I want a world to disappear into
- I want something focused and manageable
- Story first
- Systems I can master
The final wording and presentation can be refined during design. Membership is explicitly authored: profile data may nominate candidates, but no score threshold automatically places a game into an editorial shelf.
3. A living editorial layer
One or two rotating collections will respond to:
- notable recent releases;
- seasonal playing patterns;
- newly completed catalog clusters;
- useful comparisons;
- major reassessments;
- relevant industry or release-calendar moments.
Examples could include:
- What to play after…
- Three very different kinds of open world
- Choosing between this month’s major releases
The living layer refreshes at least monthly or when a meaningful release/content event warrants it, whichever comes first.
Every time-sensitive collection must have:
- a publication window;
- an expiry date;
- an evergreen fallback;
- explicitly authored membership and copy.
Expired material must never remain visibly dated because nobody replaced it. The homepage must also never randomize or reorder material merely to simulate activity.
Ownership and implementation
- GPT proposes shelf concepts, membership, copy, comparisons, and future rotations.
- Tomas approves every qualitative editorial claim.
- A small version-controlled configuration stores the approved collections, membership, copy, publication window, expiry, and fallback.
- Changes are reviewed like editorial content.
- Rotations may be prepared and approved in batches.
- A dedicated curation admin console is not required.
- If a shelf lacks enough credible members, it disappears honestly rather than being padded.
This provides freshness and a reason to return without manipulative gamification, fake activity, points, streaks, or an opaque recommendation algorithm.

P0.4 — What is the launch accountability posture?
Decision: LOCKED
Should I Play? will launch as an independently operated, editor-led publication with a practical correction channel and explicit commercial disclosures.
The public accountability system will state:
- Should I Play? is currently self-funded.
- It does not accept paid placement or payment for coverage.
- It currently contains no affiliate links or advertising.
- Any future commercial change must be disclosed when introduced.
- Complimentary review access may be accepted, but it must be disclosed on the relevant profile.
- Complimentary access does not guarantee coverage or influence scoring.
- The public byline remains “the editor.”
- The product claims editorial independence, not impossible human “impartiality.”
- Corrections and relevant contrary evidence can be submitted through corrections@shouldiplay.gg.
- Profiles provide a contextual correction link that identifies the relevant game and scope.
- Material corrections follow the existing versioned evaluation and publication process rather than silently overwriting the record.
- A disagreement with a score is not automatically a correction, but concrete contrary evidence can trigger review.
- No response-time commitment will be published unless a one-editor operation can reliably meet it.
Public methodology language
The methodology must not say or imply:
“GPT goes online, considers the reviews, and gives the game a score.”

It must also not market the result as an “AI verdict,” “objective AI score,” or automated review.
The accurate public framing is:
Should I Play? uses a structured, AI-assisted editorial process. Evidence is collected from multiple independent sources, converted into concrete experience claims, and mapped against a fixed eight-dimension rubric. External review scores and aggregate ratings are not scoring inputs. A separate audit pass checks the evidence mapping and rubric application. Every profile is reviewed and approved by the editor before publication.

The deeper methodology may explain that AI tools assist with:
- source discovery;
- evidence extraction and normalization;
- mapping claims to rubric criteria;
- consistency checking;
- independent scoring and audit passes.
But the editorial process—not the model vendor—is the public subject. The exact model and execution details remain part of internal provenance and reproducibility records. Tomas remains accountable for the final published profile, and no AI process may publish automatically.


P0.5 — What is the launch artwork operating posture?
Decision: LOCKED
Should I Play? will pursue an artwork-forward mixed launch.
Authentic game artwork is a material part of the intended product experience because it improves recognition, emotional identity, browsing, and the perceived richness of a large catalog. However, artwork will not become a binary requirement for every profile or a reason to withhold otherwise valuable content.
The product will support both:
- cleared authentic artwork where a defensible production basis exists; and
- the deliberately designed artless composition as a complete first-class state.
A launch catalog may therefore contain a considered mixture of art-led and artless profiles.
Governing visual rules
- Authentic game artwork is preferred where responsibly available.
- Cover and hero artwork remain separate roles.
- A cover must not be stretched or awkwardly cropped into a landscape hero.
- Search, catalog cards, profiles, and homepage editorial collections may use artwork under the approved policy.
- Compare remains intentionally artwork-free so that comparison is analytical, neutral, compact, and usable on mobile.
- An individual game may launch artless when its artwork remains unresolved.
- Missing artwork must never produce an empty frame, placeholder icon, layout hole, or visibly inferior card.
- Artwork supports the editorial visual system; it does not replace it or turn the product into a generic game storefront.
Eligible sources
Artwork candidates may come from:
- official publisher or developer websites;
- official press kits;
- official storefront assets supplied by the publisher, including Steam capsules;
- licensed metadata/artwork providers;
- direct publisher or rights-holder permission.
Community artwork, fan art, user-uploaded Steam screenshots, and unattributed image-search results are excluded unless the individual creator has granted suitable permission.
Public access versus reuse basis
The fact that artwork can be loaded publicly from Steam means that it is publicly viewable. It does not by itself place the artwork in the public domain or grant an unrestricted republication license.
Steam may be recorded as the source, while the legal basis must be recorded separately.
Possible production bases are:
- licence;
- provider-terms;
- press-kit;
- permission;
- and, after the deferred implementation and legal-policy review, editorial-fair-use.
Editorial fair-use posture
Should I Play? is a substantive evaluation and review publication. Official promotional artwork used to identify the game, navigate to its profile, or accompany direct criticism and analysis has a credible editorial fair-use basis.
Criticism and review are expressly recognized as potential fair uses under both the Israeli and U.S. frameworks. Neither treats the label “review site” as an automatic exemption; the purpose, amount, nature of the work, and effect on the original market still matter. Israeli Ministry of Justice, U.S. Copyright Office
The product will therefore distinguish between uses:
Placement	Governing posture
Official artwork identifying the game on its substantive profile	Strong editorial use
Cover thumbnail linking from Search or the catalog to that profile	Reasonable identification/indexing use
Artwork in an authored homepage collection linking to relevant profiles	Permitted under the approved editorial policy
Large artwork used mainly as unrelated decorative atmosphere	Avoid or require a clearer licensed basis
Original-resolution downloads or standalone galleries	Prohibited
Community/fan artwork	Prohibited without creator permission
Merchandise, advertising, or unrelated brand material	Not covered by the editorial-use policy
Compare	Artwork-free


Commerciality is only one factor in a fair-use analysis, but the launch posture is also favorable because Should I Play? is currently self-funded, contains no advertising or affiliate links, adds extensive original evaluation, and does not substitute for either the game or a market for its promotional art.
Asset-use safeguards
Every production asset must record:
- game and artwork role;
- originating source;
- source page;
- asserted production basis;
- rights-holder or publisher credit;
- retrieval date;
- intrinsic dimensions;
- any provider identifier;
- production or evaluation clearance.
The operating policy will also require:
- official promotional assets only;
- web-appropriate resolution rather than downloadable originals;
- no standalone artwork distribution;
- no generative alteration;
- no material distortion or misleading crop;
- attribution and an official source/store link where appropriate;
- a rights-holder removal channel;
- prompt removal or replacement if a credible rights objection is received;
- preservation of the artless fallback;
- continued production containment of evaluation-only assets.
Storage, proxying, caching, and hotlinking must follow the applicable provider terms and approved policy. Technical reachability is not treated as permission.
Production priorities
Artwork acquisition should prioritize:
1. homepage editorial features;
2. major recent releases;
3. high-interest and frequently searched profiles;
4. cards where visual recognition materially improves discovery;
5. the remainder of the catalog as sourcing permits.
No arbitrary percentage of artwork coverage is a launch gate. What must be proven before launch is that:
- the lawful sourcing policy works;
- the catalog looks deliberate in mixed art/artless conditions;
- representative desktop and mobile states pass visual review;
- no uncleared asset reaches production;
- removal and correction procedures exist;
- the product remains visually strong when artwork is unavailable.
Deferred implementation requirement
Before any asset is production-cleared specifically on an editorial-fair-use basis:
1. obtain a one-time, jurisdiction-aware legal review of the written policy;
2. amend ADR 0011 to make editorial-fair-use a fully governing basis;
3. add it to the database enum through a forward migration;
4. update application types, validation and schema boundaries;
5. update admin/import paths, fixtures, and regression tests;
6. document eligible sources, placements, attribution, resolution, storage, and takedown handling;
7. verify that containment and artless fallback behavior remain intact.
Until that work is completed, the existing artwork bases and clearance rules remain authoritative.
Ownership
- GPT may identify official artwork candidates and prepare provenance records.
- Codex or Claude may implement ingestion, validation, and asset handling.
- Tomas approves the production basis and final visual selection.
- No automated process may mark artwork production-cleared without the required policy and validation controls.
