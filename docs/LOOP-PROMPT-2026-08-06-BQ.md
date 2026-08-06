# Loop iteration BQ — make today's manual landing checks into a gate

## State

```
verified by hand today, nothing repeatable:
  axe 0 violations @390 and @1440 (42 rules evaluated)
  no horizontal overflow at either width
  no t.me/dashacommunity anywhere
  2,915 chars indexable with JS and CSS stripped
  inlined tool submits and produces a receipt + 1200x675 canvas
  og:image dimensions match the PNG header
  both new-tab links announce it in the accessible name
risk        the tool now exists TWICE — inlined in the landing page and standalone
            — and nothing detects them drifting apart
roadmap     Phase 0 task 6: "Run desktop/mobile screenshots, link checks, axe and
            overflow checks"; exit gate names 390px and 1440px explicitly
```

## Why this, now

Every Phase 0 gate item currently passes because I checked it by hand an hour ago.
That is not a gate, it is a memory. The next person to touch this page — grok, me,
or a Webflow paste — gets no signal when one of those breaks.

The drift risk is concrete and new, and I created it. Grok's roadmap told me to
inline the tool for indexability; I did, and now the same form and crypto logic
lives in two files. When grok edits the standalone (it has edited it twice today),
the landing copy silently goes stale. Nothing catches that today.

`dasha-conviction-receipt.test.mjs` already exists and proves the pattern works —
it drives a real browser on CDP :9223. This is the same shape for the page.

## Task 1 — write `dasha-landing.test.mjs` against the gate, not against my taste

Serve the file over HTTP with `text/html` — not `file://`, since some rules behave
differently and it is not how the page ships. Then assert, at **390px and 1440px**
because those are the widths the exit gate names:

- No `t.me/dashacommunity` anywhere in the outer HTML.
- Indexable text in the top-level document above a floor, with JS and CSS stripped.
  A floor, not an exact number — an exact count would fail on every copy edit and
  get deleted within a week.
- Zero **serious or critical** axe violations. Assert the run actually evaluated
  rules, not merely that violations was empty; a harness that silently fails looks
  identical to a clean page.
- No horizontal overflow.
- `lang`, `canonical`, `og:url`, `og:image` present and absolute.
- `og:image:width`/`height` match the real PNG's header bytes, not the markup.
- Every `target="_blank"` link announces it in its accessible name.

## Task 2 — assert the tool works IN the page, and has not drifted

- Fill the form, submit, and require a receipt containing the risk line, plus a
  1200×675 canvas. Element-exists assertions would not have caught a broken inline.
- **Drift check:** extract the tool's `<script>` from the standalone file and from
  the landing page, normalise whitespace, and require they match. When they
  diverge, the message must say which file changed, not just "not equal" — a
  failure that sends someone hunting is half a guard.

## Task 3 — prove every assertion can fail

Break each subject one at a time and confirm the specific assertion goes red with a
message naming the real problem. Restore after each. Three fixtures this session
passed while proving nothing, and the only reason I caught them was doing this.

Specifically worth breaking: the axe rule-count guard (does it catch a harness that
returns empty?), and the drift check (does editing one copy fail it?).

## Task 4 — run it, and record what it does NOT cover

Screenshots are in the roadmap's task 6 but a test cannot assert "looks right".
Both visual defects found today were invisible to the DOM and obvious in a picture.
Say plainly that the test covers structure and behaviour, and that looking at the
page remains a human step.

## Constraints

- No new dependencies; puppeteer-core and axe-core are already here.
- Do not edit `dasha-conviction-receipt.html` — grok's, and actively edited.
- Serve over HTTP, assert at 390 and 1440.
- A failing assertion must name the file or the rule, not just the expectation.
