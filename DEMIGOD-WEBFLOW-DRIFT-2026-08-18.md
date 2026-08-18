---
status: finding
generated_by: claude
generated_at: 2026-08-18
severity: latent — fires on the next Webflow publish
---

# Webflow's saved custom code is older than what is live, and loads the foot without SRI

Found while researching whether the Webflow paste could be done without a browser. It could — and
looking established something more important than the answer.

## The three pins

| Where | Commit | Date | Note |
|---|---|---|---|
| Webflow **saved** head + footer | `e0fe769c` | 2026-08-14 03:20 | "Show an honest empty bounties page" (Cursor Agent) |
| **Live page actually loads** | `85246d21` | 2026-08-14 11:11 | "Link SF directory names to internal /c/{id}" |
| Disk canonical / manifest | `0f854947db71` | 2026-08-17 18:32 | site v1104, published to the CDN today |

The saved custom code points at a commit **older than the one the live site is serving**. The two
builds are not the same bytes: live is `4914c80f…`, the saved pin is `f7d7c1ae…`.

**So the next Webflow publish — for any reason, including an unrelated CMS edit by anyone — rolls the
foot backwards to an Aug 14 build that no manifest describes.** Nothing warns about this, because
nothing on our side reads Webflow's *saved* state; `bin/dg truth` reads what the published page
loads, which is a different thing and currently fine.

## The saved footer has no SRI

Comparing Webflow's saved blocks against disk canonical, with the pin and SRI normalised so only
real differences show:

**Footer** — the saved block loads the foot as
`<script id="demigod-foot-cdn-loader" src="…/foot-latest.js" defer>`, with **no `integrity` and no
`crossorigin`**. Disk canonical carries
`integrity="sha384-wnZPnK8jjlU6MiFYRY55XdCw9OyXDpebjeaRGiO0nnPLsKTcmh7kPpNBOVRCGjo5"
crossorigin="anonymous"`. Every SRI check this repo runs is verifying a pin that the live footer does
not actually enforce.

The saved footer also carries `__dgPublicRoles` generated **2026-08-06** — eleven days stale against
disk's 2026-08-17.

**Head** — three substitutions, all of which disk gets right and the saved block gets wrong:
the Blog JSON-LD `url` is `https://www.trydemigod.com/?p=blog` where disk uses the pretty
`/blog`; and a CTA reads "Share privately" where disk reads "Sign up to Demigod", aria-label
included.

## Overwriting loses nothing

This was the thing worth checking before recommending anything. Every difference in both blocks is a
**substitution at the same line number** — no insertions, no deletions. There is no analytics tag,
verification meta, or hand-edit present in Webflow that disk canonical lacks. Writing disk canonical
over both blocks strictly gains: correct pin, SRI enforcement, eleven days fresher role data, a
pretty canonical URL, and current copy.

## How to fix it

`bin/dg ship run` does exactly this and reads the files from disk, so there is no transcription risk:

    bin/dg lock claim --owner "$USER" --why ship
    DEMIGOD_CURRENT_REQUEST_PUBLISH=1 DG_LOCK_TOKEN=… bin/dg ship run

It needs a browser session with the Webflow custom-code page open — the paste step drives Webflow's
internal `/api/sites/talentlink-sf/code` endpoint with session cookies, and it verifies the saved
payload byte-for-byte against `demigod-head-minimal.html` and `demigod-footer-lite.html` before it
will queue a publish. Today's run failed at exactly that step with
`expected exactly 2 editors; found 0`, which is what "no browser" looks like.

The Webflow MCP can also write these blocks (`set_site_freeform_code`), and its OAuth works where the
`WEBFLOW_API_TOKEN` on this box does not — that token now 401s on every v2 endpoint, including
`GET /sites/{id}`, so it is expired and worth reissuing. The MCP route means re-emitting 56 KB of
markup by hand into a tool call, which introduces a transcription risk the CM6 path does not have.
Prefer the browser.

## Already verified, so the publish is safe when it happens

- CDN publish succeeded: jsDelivr serves `@0f854947db71/foot-latest.js` at 436,302 bytes.
- Hashing the bytes jsDelivr **actually returns** gives
  `83071e8d2ce984de20dadf487193b14d0e0418ad524f0582995b30c1760dd850`, identical to disk and to
  `DEMIGOD-FOOT-CDN.json`. SRI hashes fetched bytes, not source, so this is the check that counts.
- `bin/dg ship prepare` was 9/9. Route audit passed all 41 declared paths. Suite green at 257.

## One thing this does not cover

Publishing the site ships every unpublished Webflow change, not only ours. The site last published
2026-08-16 18:42, and the saved custom code has been edited since — so at least one other change is
already staged there. Whoever publishes should expect to ship that too.
