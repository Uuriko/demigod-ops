# Homepage honesty fix — ready to execute (Designer-gated)

**Status:** blocked only on an open Webflow Designer session. Element edits via the Webflow MCP
(`data_element_tool` / `designer_tool`) need the Designer app **open and foregrounded** — they ride a
live socket to the canvas, unlike the REST tools (pages / custom code / publish) which work headless.
When the Designer is open at `https://talentlink-sf.design.webflow.com`, the edits below take ~30s.

**Why it matters:** `node demigod-live-honesty-audit.mjs` is RED — the crawler-visible homepage still
ships dishonest authored copy. The ~15 runtime scrub scripts patch it for JS users, but crawlers and
no-JS clients index the source. Honesty is the whole moat; this is the one live trust-leak.

Site `6a34c484dcedc18a17408187` · homepage page `6a34c486dcedc18a174081b8`.

## The 4 content fixes (element IDs verified 07-24)

| # | Element | Type | Now → Honest | Action |
|---|---------|------|--------------|--------|
| 1 | `2051290e-bf0f-e5d8-be09-a410aef33f2c` | Heading h2 | "HUMAN-MATCHED STARTUP TALENT" → "TECH-MATCHED SF STARTUP TALENT" | `set_text` ✅ works |
| 2 | `4c500027-e80d-b420-9282-a142044ffc8c` | Paragraph | "Human-matched SF startup talent • …" → "Tech-matched SF startup talent • Startups hire • Candidates join" | `set_text` ✅ works |
| 3 | `4c500027-e80d-b420-9282-a142044ffc8e` | Link (email) | `mailto:hello@` + text "hello@…" → potter@ | `set_text` "potter@trydemigod.com" **+** `set_link` email potter@trydemigod.com |
| 4 | `d3d146f0-daf6-6cfe-644b-bc21d77f090e` | Block (button_label) | "FIND TALENT" → "Hire talent" | **Block rejects set_text** — target the parent Link/Button element instead, or type it in the Designer. Re-query its parent with `return_parent:"parent"`. |

Plus two lower-priority items:
- **Form success msg** `0f3f8bbb-0ad4-1818-a931-1f8c491a4752` (Block, "Thank you! hello@… will follow up.")
  — Block rejects `set_text`; it's hidden until form submit so low crawl weight. Target parent or edit in Designer → "Thank you! potter@trydemigod.com will follow up."
- ~~Stray `<title>Untitled</title>`~~ — **NOT a real issue** (checked 07-24). Only the correct
  `<title>Demigod · SF startup talent matching</title>` is served; the "Untitled" string is just text
  inside a `/* comment */` in the footer redirect script documenting the old `/untitled` soft-404, which
  is already redirected (`'/untitled':'/'`). No action.

## Then (all headless — no Designer needed)

1. `data_sites_tool > publish_site` — both domain IDs (`6a3c6494a3294571dc5e6ae8`, `6a3c6494176efddaf45beb8e`) + `publishToWebflowSubdomain:true`. (429 → wait, retry.)
2. `node demigod-live-honesty-audit.mjs` → must be GREEN (exit 0).
3. **Remove the now-redundant scrubs** from the footer custom code (`data_scripts_tool`): the hello@→potter@,
   Human-Matched-title, and CTA-label scrubs are dead weight once source is clean. Keep any scrub whose
   target isn't yet fixed at source. Re-run `demigod-foot-smoke.mjs`, republish.
4. Wire the gate into `demigod-verify-all.mjs` (now that it's green) so a regression fails the suite.

## The exact set_text/set_link call (copy-paste when Designer is open)

```
data_element_tool siteId=6a34c484dcedc18a17408187 pageId=6a34c486dcedc18a174081b8 actions=[
  {label:"h2",  set_text:{id:{component:"6a34c486dcedc18a174081b8",element:"2051290e-bf0f-e5d8-be09-a410aef33f2c"}, text:"TECH-MATCHED SF STARTUP TALENT"}},
  {label:"tag", set_text:{id:{component:"6a34c486dcedc18a174081b8",element:"4c500027-e80d-b420-9282-a142044ffc8c"}, text:"Tech-matched SF startup talent • Startups hire • Candidates join"}},
  {label:"mail",set_text:{id:{component:"6a34c486dcedc18a174081b8",element:"4c500027-e80d-b420-9282-a142044ffc8e"}, text:"potter@trydemigod.com"}},
  {label:"mailL",set_link:{id:{component:"6a34c486dcedc18a174081b8",element:"4c500027-e80d-b420-9282-a142044ffc8e"}, linkType:"email", link:"potter@trydemigod.com"}}
]
```
