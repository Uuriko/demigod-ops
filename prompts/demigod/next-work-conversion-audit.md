# Next work — Conversion-path audit (measured on the rendered artifact)

## Why this, now (grounded in the retrospective)

`DEMIGOD-BUILD-RETROSPECTIVE.md` reaches one blunt conclusion: **site health is rarely the
bottleneck — demand is — and the site's job is to convert and to never lie, not to be endlessly
rebuilt.** This session finished the demand *asset* (the Hiring Pulse is now sharp, honest, and
converts into `/startups` · `/hire` · `/talent`). The untested half is the **destination**: when a
real SF founder or candidate lands on the site, does the path to "I'm in" actually work, or does it
confuse / distrust / break?

We have never audited that path as a skeptical human. Do it now — it needs no traffic and no
distribution, it directly serves the standing "consistency / bugs / excellent copy" concern, and it
readies the page every Pulse click lands on.

## The one rule that governs this task (retro meta-lesson #1 + #8)

**Measure the artifact the user actually gets.** The site rewrites itself at runtime (`foot-core`
scrubs copy, renders routes). Served HTML is only the *pre-scrub input*; the real page is the
**rendered DOM**. So:
- Walk the **live site in a real browser via CDP** (Chrome at `127.0.0.1:9223`), not `curl`.
- Assert on **computed style / innerText / bounding rect**, never just `querySelector` presence — a
  `display:none` subtree passes every DOM query (P8).
- A scrubbed string having 0 source occurrences is **not** evidence of a bug — the scrub replaces the
  element. Verify what renders, not what's absent from source.

## The walk (as two skeptical personas)

Load each on a desktop AND a 390px mobile viewport. Persona A = **SF founder who needs to hire**.
Persona B = **strong candidate deciding whether to join the network**.

1. **Homepage** — In 5 seconds, is it clear *what this is* and *why to trust it*? First CTA obvious?
   Any copy that overclaims (the honesty gate's live RED items: `hello@`, "Human-Matched",
   "FIND TALENT") visible in the rendered page?
2. **How it works / method** — Does the "tech ranks, humans review, mutual intro only" model come
   across, or read as vague/AI-hype?
3. **The hire path** (`/hire`, WIZ startup flow) — Walk the actual form. Does submit work? Is any
   step confusing, broken, or asking too much? (Note: CDP POST-abort kills Turnstile — a false
   negative; don't claim submit is broken from that alone.)
4. **The candidate path** (`/talent`, WIZ talent flow) — same walk.
5. **The Pulse destinations** (`/startups`, and back to home) — do the CTA links actually resolve and
   render? Is the directory usable on mobile?

## For each finding, capture
`{persona, step, viewport, what a real user sees (rendered), why it costs a conversion or trust,
severity P0/P1/P2, fix-owner: headless | foot-lock | Designer-gated}`. Rank most-severe first. Prove
each on the rendered DOM (screenshot or computed-style evidence), per the rule above.

## Then fix what's cheaply fixable, honestly
- **Headless** (Pulse/directory copy, SEO/meta via pages API, generator scripts): fix + selftest.
- **Foot-lock** (foot-core copy/routing): only under the lock, with a smoke/parse pass, never
  untracked (P4).
- **Designer-gated** (homepage body copy — the honesty RED items): append to
  `WEBFLOW-HONESTY-FIX-READY.md` with exact element IDs; do **not** claim fixed.

## Guardrails
- Don't presume the site is finished or that "demand not site" ends the discussion — show findings,
  let the user set scope.
- Every fix: prove it can fail before, passes after, on the rendered artifact.
- No auto-outbound, no publish without exact authorization, no thrash-publish.
