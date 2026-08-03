# Grok self-prompt — research human voice, then write Demigod blog posts that survive Pangram / AI detectors

**How to use:** Paste everything from `BEGIN PROMPT` through `END PROMPT` as your next task.  
Optional scope line at top:

```text
SCOPE: research-only | draft-3-posts | ship-2-posts | full
```

Default if omitted: **full** (research → craft → draft 3 posts → humanize pass → integrate into SoR if ready).

---

## BEGIN PROMPT

You are Grok on the Demigod machine (`/home/potter`). You will **not** dump generic AI blog filler into the site. You will (1) deeply research how modern AI detectors—especially **Pangram**—classify text, (2) extract a practical **human-voice craft doctrine** for Demigod product writing, (3) write new blog posts under that doctrine, (4) self-audit against a concrete anti-pattern checklist, and only then (5) integrate into `demigod-blog-posts.json` + foot embed if quality holds.

This is **writing craft + product honesty**, not “bypass tools for cheating.” Goal: posts that read like a sharp founder wrote them after real work—because that is the product brand—and that do not trip detectors that look for machine statistical uniformity.

### 0. Absolute project constraints (never violate)

| Constraint | Rule |
|------------|------|
| Product | Demigod = SF startup talent matching; humans in the loop; mutual approval; 10% on hire; free for talent |
| Honesty | No fake placements, fake volume, SLA promises, founder names on live site, “48h” claims, Stripe/SMS as live |
| Contact | Public contact is **potter@trydemigod.com** only (never hello@) |
| Outbound | No auto-DM, no real cold sends |
| Events | SF-only in-person; multi-event days OK; no auto-booking |
| Game | Eat the Sounds archived — do not touch |
| Foot ship | Blog UI lives in `demigod-foot-core.js`; posts SoR is `demigod-blog-posts.json`; ship with `bin/dg-lock` |
| Ponytail | Min code; no new CMS; no new deps for “humanizer” SaaS |
| User comms | Do not assign the human homework |

### 1. Mission

Produce **2–4 new Demigod Blog posts** (or 1 deep rewrite of a weak existing post if new topics are thin) that:

1. Teach something specific about matching, privacy, pricing, SF GTM, or Events Bot.
2. Sound **operator-written**: concrete, slightly uneven, opinionated, local.
3. Survive a **human-voice audit** designed around Pangram / GPTZero / Originality-class detectors (perplexity, burstiness, template cadence, “AI lexicon”).
4. Stay **factually honest** to current product truth (read `AGENT-STATE.md`, `DEMIGOD-EVENTS-BOT.md`, live copy rules).

**Success is not “zero AI score at any cost.”** Success is **true human craft** that happens to not look like LLM slurry.

### 2. Phase A — Deep research (mandatory before any drafting)

#### 2.1 Read these (or open_page / web_search equivalents)

Research pack (update with latest if tools available):

- Pangram product + false-positive materials: https://www.pangram.com/ and blog posts on false positives / how the model works
- Booth / BFI “Artificial Writing and Automated Detection” style findings (commercial detectors vs open-source; short vs long passages)
- Practical craft guides on what detectors measure: **perplexity** (predictability), **burstiness** (variance in sentence complexity), template structure, AI-favored vocabulary
- Demigod existing posts: full `demigod-blog-posts.json`
- Live page: `/?p=blog` behavior in foot (`blogPageMount`, `DG_BLOG_POSTS`, homepage `#dg-blog-home`)

Write research notes to:

```text
/tmp/dg-busy/blog/RESEARCH-HUMAN-VOICE.md
```

Must include:

1. **What detectors actually score** (in plain language):
   - Token predictability / low-perplexity smooth prose
   - Low burstiness (uniform sentence length and structure)
   - Section templates: “In today’s landscape… Furthermore… In conclusion…”
   - Overused AI lexicon (list at least 25 words/phrases to ban or use once max)
   - “Humanizer” tools and why Pangram-class systems still catch many of them (do **not** recommend StealthGPT-class tools as a strategy)
2. **What high-quality human product writing does** that models underuse:
   - Specific nouns over abstract nouns
   - Local detail (SF neighborhoods, real workflow steps)
   - Asymmetry (one sharp opinion, one admitted limit)
   - Mixed sentence lengths; occasional fragments; rare asides
   - Concrete “I / we observed” only when true to Demigod ops (no invented anecdotes)
3. **What not to do**:
   - Synonym-spamming “humanizers”
   - Homoglyph / Cyrillic tricks (spam / dishonest / fragile)
   - Keyword stuffing “undetectable”
   - Long perfectly parallel bullet pyramids with identical rhythm
4. **Demigod-specific voice rules** (derive from existing good lines in foot + posts):
   - Short titles
   - Evidence / decision / privacy framing
   - Pending services called pending
   - No bravado volume claims

#### 2.2 Deliverable from Phase A

A **Human Voice Doctrine** section with:

- **Hard bans** (never use these openers or transitions)
- **Soft limits** (max 1 per post)
- **Required human signals** (must include N of these per post)
- **Length band** (e.g. body 120–280 words for card + full note; not 800-word SEO sludge)
- **Self-test questions** (10 yes/no)

### 3. Phase B — Topic selection (only after Phase A)

Pick **3 topics** from this backlog (or invent better ones that fit product truth). Prefer topics that **do not duplicate** existing slugs:

Existing slugs: `90-day-outcomes`, `both-approve`, `ten-percent`, `private-match-notes`, `human-review-over-volume`, `sf-events-calendar`

Candidate topics (research may replace):

1. **Warm intros vs public talent feeds** — why Demigod refuses a public candidate marketplace
2. **What “both approve” costs** — speed tradeoff, why it’s still faster to a real yes
3. **SF founder hiring without inventing urgency** — anti-48h, anti-SLA honesty as a GTM feature
4. **When not to intro** — the pass is a product feature
5. **Events Bot as demand surface** — SF nights as trust, not spam (no auto-DM)
6. **What a bad match note looks like** — anti-pattern list from real reviewer failure modes (no private data)
7. **10% economics for seed-stage** — cash vs equity caution, free talent side

For each chosen topic write a 5-line outline: claim · stakes · one concrete scene · one limit · close.

Save:

```text
/tmp/dg-busy/blog/TOPIC-OUTLINES.md
```

### 4. Phase C — Write under the doctrine (no detector-gaming kits)

For each post produce:

| Field | Rules |
|-------|--------|
| `slug` | kebab-case, unique |
| `category` | Product \| Privacy \| Pricing \| Market \| Ops |
| `title` | ≤ 70 chars; no colon spam; no “Ultimate Guide” |
| `summary` | 1–2 sentences; specific; no “In today’s…” |
| `body` | 140–320 words; full note text |
| `image` | reuse existing catbox brand images if no new asset; honest alt |
| `imageAlt` | concrete, not “AI abstract concept” |
| `published` | true only if ready |
| `publishedAt` | YYYY-MM-DD |

#### 4.1 Craft process (per post) — follow in order

1. **Hand outline** (bullets, not prose)
2. **Ugly first draft** in first person plural or second person (“you”) — messy is fine
3. **Cut pass**: delete throat-clearing first paragraph if it exists
4. **Burstiness pass**: mark sentence lengths; break any run of 5+ medium-length similar sentences
5. **Lexicon pass**: kill banned AI words; replace with concrete Demigod terms
6. **Honesty pass**: check pending services, no fake metrics, potter@ only
7. **Read aloud pass**: if you trip over a line, rewrite
8. **Self-score** the 10 yes/no tests; must pass ≥ 8/10

#### 4.2 Banned openers / transitions (extend after research)

At minimum ban as openers:

- “In today’s fast-paced…”
- “In the ever-evolving landscape…”
- “It’s no secret that…”
- “When it comes to…”
- “In conclusion,”
- “Furthermore,” / “Moreover,” stacked
- “Let’s dive in”
- “At the end of the day”
- “Navigating the complexities of…”

At minimum limit (≤1 total per post unless quoted):

- delve, tapestry, realm, landscape (metaphorical), leverage (verb), robust, seamless, cutting-edge, game-changer, unlock, empower, holistic, synergy, multifaceted, foster, pivotal, crucial, comprehensive, underscore, testament, vibrant

#### 4.3 Required human signals (include ≥ 4 per post)

1. One **specific workflow step** (e.g. “evidence packet before names”)
2. One **explicit tradeoff** (“slower than a public board; faster at real decisions”)
3. One **refusal** (“we don’t …”)
4. One **local or operational detail** (SF, email follow-up, draft autonomy, etc.)
5. One **imperfect rhythm** (short fragment or parenthetical that isn’t symmetrical)
6. One **reader action** that is real (submit role, share profile, open calendar) — not “share this article”

#### 4.4 Honesty red lines inside posts

- Never invent user counts, placement numbers, time-to-intro SLAs
- Never imply SMS/Stripe live
- Never “guarantee” hires or cultural fit
- Events posts: SF-only; multi-event days OK; no auto-send
- Talent is free; 10% is first-year cash on hire only

### 5. Phase D — Anti-detection self-audit (without lying about authorship)

For each draft, fill a table in:

```text
/tmp/dg-busy/blog/AUDIT-{slug}.md
```

| Check | Pass? | Evidence (quote 1 line) |
|-------|-------|-------------------------|
| No banned opener | | |
| Sentence length variance visible | | |
| ≤1 AI-lexicon soft-limit word | | |
| Concrete noun density high | | |
| Explicit tradeoff present | | |
| Explicit refusal present | | |
| No fake metrics | | |
| potter@ not hello@ | | |
| Title not listicle spam | | |
| Would a tired SF founder finish it? | | |

Optional: if a detector API is available in-environment and allowed, run it **after** craft passes—not before as a rewrite oracle. Do not chase score with synonym spam. If detector flags, fix craft causes (uniformity, template, lexicon), not “humanizer” paste.

### 6. Phase E — Integrate (only posts that pass audit)

1. Append/update posts in `demigod-blog-posts.json` (schema `demigod.blog-posts/1`)
2. Regenerate foot embed `DG_BLOG_POSTS` in `demigod-foot-core.js` (or run existing blog embed script if present)
3. Bump foot version markers
4. Update deep-link slug allowlist if needed
5. Optionally extend head Blog JSON-LD for new posts
6. `npm run demigod:verify:source`
7. Ship with `DG_LOCK_OWNER=… bin/dg-lock node demigod-ship.mjs cdn` (+ paste if footer pin required)
8. CDP spot-check `/?p=blog` and homepage `#dg-blog-home`

### 7. Collaboration with Fable / Codex swarm

**Fable** (`bin/df review "…"`):

- Critique doctrine for Demigod brand fit
- Kill topics that invent product promises
- Prefer shorter posts over SEO length

**Codex** (Orca tracked task or a bounded `codex exec`):

- Adversarial review: mark every sentence that “sounds like ChatGPT”
- Check foot/blog integration recipes
- Do **not** thrash foot without lock

Grok remains the writer of record for final prose that ships.

### 8. Output files (mandatory)

| Path | Content |
|------|---------|
| `/tmp/dg-busy/blog/RESEARCH-HUMAN-VOICE.md` | Research + doctrine |
| `/tmp/dg-busy/blog/TOPIC-OUTLINES.md` | Outlines |
| `/tmp/dg-busy/blog/DRAFTS.md` | Full post drafts (all fields) |
| `/tmp/dg-busy/blog/AUDIT-*.md` | Per-post audits |
| `/tmp/dg-busy/blog/SHIP-NOTES.md` | What integrated, verify results |

If shipping code: also touch `demigod-blog-posts.json` and foot as needed.

### 9. Stop conditions

**Stop and ship** when:

- ≥ 2 posts pass audit ≥ 8/10
- SoR updated
- verify:source green if foot/json touched
- No honesty violations

**Stop without shipping prose** when:

- Research shows a topic would require fake claims
- Only detector-gaming tactics remain (then document and refuse)

### 10. First actions (do these in order)

1. Write this prompt’s research notes to `RESEARCH-HUMAN-VOICE.md` (do not skip)
2. Lock Human Voice Doctrine (bans + required signals)
3. Outline 3 topics
4. Draft post 1 ugly → craft passes → audit
5. Draft post 2 same
6. Draft post 3 or cut to 2 strong posts
7. Integrate strongest 2
8. Verify + ship if appropriate
9. Report what shipped with slugs + one-line claims

### 11. Style samples (Demigod — emulate spirit, not clone)

Good direction (paraphrase spirit):

- “Profiles stay private. Evidence packets move first.”
- “Volume is not the product — mutual yes is.”
- “Talent never pays.”

Bad direction (never):

- “In today’s competitive talent landscape, organizations must leverage robust, seamless matching solutions to unlock holistic synergy.”

### 12. Remember

Detectors are imperfect. **Craft for humans first.** If a sentence exists only to “beat Pangram,” delete it. If a sentence exists because a founder needed it before an intro, keep it.

## END PROMPT

---

## Compact invocation (swarm / Fable)

```text
Run docs/agents/GROK-BLOG-HUMAN-VOICE-SELF-PROMPT.md in full.
SCOPE: full
Write research + doctrine first, then 2–3 Demigod blog posts under the doctrine.
No humanizer SaaS. No fake metrics. potter@ only. Integrate passing posts into demigod-blog-posts.json + foot DG_BLOG_POSTS if quality holds.
```

## Fable one-liner

```bash
bin/df review "Demigod. Read docs/agents/GROK-BLOG-HUMAN-VOICE-SELF-PROMPT.md and demigod-blog-posts.json. Produce: (1) tightened Human Voice Doctrine for Demigod, (2) 3 topic outlines that do not invent product claims, (3) adversarial list of AI-sounding patterns to kill in our drafts. Output full markdown."
```

## Codex one-liner

```bash
codex exec --full-auto -C /home/potter "Read docs/agents/GROK-BLOG-HUMAN-VOICE-SELF-PROMPT.md. Research Pangram/detector craft (tools ok). Write /tmp/dg-busy/blog/RESEARCH-HUMAN-VOICE.md + 3 draft posts in /tmp/dg-busy/blog/DRAFTS.md following the doctrine. Adversarial self-mark every AI-ish sentence. No site ship unless drafts pass honesty."
```
