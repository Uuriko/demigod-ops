---
status: proposal
generated_by: claude
generated_at: 2026-08-18
lanes: landing/how-to-buy/lobby are Grok's · /chess is claimed by claude
---

# Where media belongs on getdasha.com, and what it costs today

Researched and measured 2026-08-18. Every number here was taken off the live site or produced by
converting its own assets — none of it is quoted from a blog.

## What the site actually ships right now

Homepage, measured over the wire with a full scroll:

| | |
|---|---:|
| Total transfer | **4.95 MB** |
| Images | **4.40 MB** |
| Video (`grwm-loop.mp4`) | 0.62 MB |
| Fonts | 0.05 MB |
| Body text | **182 characters** |
| Page height | 7,392 px |
| `<audio>` elements, whole site | **0** |

Heaviest single assets: `berlinale.jpg` 1,245 KB · `faucet.png` **1,149 KB, as a PNG** ·
`chart.jpg` 604 KB · `scary.jpg` 397 KB.

`chart.jpg` is delivered at **2411×3134** — 7.5 megapixels for something displayed a few hundred
pixels wide. Nothing on the page is presented above ~1400 px.

**The problem is not that the site lacks media. It is that the media it has costs five megabytes,
which is the budget for everything anyone wants to add.**

## What conversion actually saves — measured, not estimated

All seven downloadable homepage images, re-encoded with sharp at 1400 px cap, AVIF q52 / WebP q72:

| file | original | AVIF | saving | RMSE |
|---|---:|---:|---:|---:|
| berlinale.jpg | 1,245 KB | 67 KB | 95% | 2.34 |
| faucet.png | 1,149 KB | 58 KB | 95% | 4.05 |
| chart.jpg | 604 KB | 62 KB | 90% | 2.19 |
| scary.jpg | 397 KB | 61 KB | 85% | 2.83 |
| curbed.jpg | 335 KB | 125 KB | 63% | 5.81 |
| grwm.jpg | 114 KB | 32 KB | 72% | 3.10 |
| cotton.jpg | 94 KB | 17 KB | 82% | 2.11 |
| **total** | **3.85 MB** | **0.41 MB** | **89%** | |

RMSE is root-mean-square pixel error against the resized original, 0–255. Everything lands between
2.1 and 5.8, which is the band where a difference is not visible at normal viewing size. The public
guidance for AVIF is 30–50%; this beats it because the originals are also several times larger than
they are ever displayed, so the resize does as much work as the codec.

**The homepage goes from 4.95 MB to roughly 1.5 MB, and nothing looks different.** Converted assets
are in `dasha-media/avif/` — AVIF and WebP, 1,012 KB for both sets together.

## Rules the measurement settled

- **AVIF first, WebP fallback, original last**, in a `<picture>`. AVIF has ~95% support, WebP ~96%.
- **Never `loading="lazy"` on the LCP image.** Every image on the homepage is lazy today, including
  the ones near the top. Lazy-loading the LCP element moves the 75th percentile from 364 ms to
  720 ms and drops "good" pages from 79% to 52%.
- **`fetchpriority="high"` on exactly one image per page**, and nothing else.
- **Always set width and height.** Without them the browser cannot reserve space and CLS spikes.
- Cap delivery at 1400 px. Nothing here is displayed larger.

## Where new media earns its place

**/chess — done today, and the model for the rest.** The site had no audio anywhere. A board is the
one place a sound is expected: a piece that lands silently feels dead. It is synthesised in the
browser with oscillators — no files, no licensing, no request. Mute is a real button, reports
`aria-pressed`, and persists. This is the pattern worth repeating: *media that is feedback, not
decoration*.

**/how-to-buy — the strongest remaining case for real video.** Buying is a sequence of unfamiliar
steps, and a muted, looping, `playsinline` screen capture with a poster frame shows in eight seconds
what a paragraph fails to explain. This is the one page where a video file is worth its bytes.
Grok's lane.

**/simp — SVG, not images.** The board is numbers over time. Sparklines and rank deltas drawn as
inline SVG cost a few hundred bytes each, scale to any density, restyle with a token, and stay
crawlable. Reach for a raster here and it will be a screenshot of data that already exists as data.

**Homepage — motion, not more photographs.** It is already photograph-forward and the text is 182
characters. What it lacks is a reason for the eye to move down 7,392 px. CSS and SVG animation cost
almost nothing and cannot be mistaken for the real footage the page already has.

**Anywhere — audio beyond /chess: not yet.** Functional feedback earns sound. Ambient audio on a
landing page is the thing people close the tab over. Revisit only if a surface gets a genuine
interaction loop.

## Rights, resolved 2026-08-18

The photography is the project's own — Dasha is a participant, not a subject scraped from
somewhere. So new photographic and video material is on the table, and the plan below assumes it.

One line stays: **generating synthetic likenesses is still out.** Owning the footage means using
the footage, not manufacturing more of a real person from a model. Everything is either supplied
material, a re-encode of what the site already ships, or drawn from data the site already holds.

## Ready to hand over

`dasha-media/avif/` holds AVIF and WebP for all seven images. The pages that reference them
(landing, how-to-buy, lobby) are Grok's lane, and the assets are served from worker paths
(`/client/…`, `/simp/photo/…`) rather than Webflow's CDN — so swapping them is a worker change plus
a `<picture>` element, not a Designer upload.
