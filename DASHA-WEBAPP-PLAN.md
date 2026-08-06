# Getting the Thesis Card live as a usable webapp

Verified 2026-08-06. Every number below comes from a fetch or a test in this session.

## The hard part is already done

The tool is **one self-contained file, 35,315 characters**. No server, no build step, no
external fetch, no account, no relative links. Confirmed today: it runs from `file://`,
`crypto.subtle` works, `localStorage` works, and it makes **zero off-origin network
requests**.

Anything that can serve one HTML file can serve this product.

## Recommendation: embed it in Webflow, exactly like the Desk already is

I checked how the live Desk is actually built rather than trusting the usual advice about
Webflow embed limits:

| Live Desk (`/dasha`) | |
|---|---|
| Page size | 51,152 chars |
| `w-embed` blocks | **1** |
| Desk markup inline | yes |
| iframe | **no** |
| Largest inline `<style>` | 16,563 chars |
| Largest inline `<script>` | 6,570 chars |

So a single Webflow HtmlEmbed is already carrying well over 30K of markup, style and script
on this exact site. **The Thesis Card is smaller than what the Desk embed already holds**
(9,404 chars of style, 9,023 across three scripts, the rest markup).

That means:

- add a page in Webflow, e.g. `/card`
- paste the tool into **one HtmlEmbed**, the same way the Desk was done
- publish

No new hosting, no new account, no new bill, one domain, and `getdasha.com` covers it
automatically once the custom domain is attached. This is the shortest path and it reuses a
mechanism already proven on this site.

**Needs:** the Webflow OAuth (user), then I can do the rest.

### If a separate host is preferred instead

A single file deploys to Cloudflare Pages, Netlify or Vercel in seconds, and a subdomain like
`card.getdasha.com` is trivial. It needs an account I do not have. GitHub Pages is also
viable — `dasha-desk` already carries a Pages workflow — but it needs the GitHub auth that is
already blocked and a one-time Pages enable.

Both are fine. Neither is faster than the embed, given the embed needs nothing new.

## It is now installable

Added a web app manifest so it can be added to a home screen and open in its own window with
no browser chrome — a real app icon rather than a bookmark.

Verified rather than assumed: the manifest is a `data:` URI and the browser **does** fetch and
parse it, over HTTP *and* from `file://` (`name`, `display: standalone`, `theme_color`, one
icon). Off-origin requests stayed at zero, so the single-file property is intact.

**No service worker.** It is the conventional next step and it is wrong here: it would add a
caching layer, an update lifecycle and a class of stale-content bugs, in exchange for offline
support this page already has by being one file that fetches nothing.

## The real usability barrier, which is not hosting

The tool will not do anything until you paste a **Solana mint address**, and a person being
shown this will not have one to hand. That is the biggest friction in the product and no
amount of deployment fixes it.

Options, all product decisions rather than mine to make:

- prefill the `$dasha` mint when arriving from the Desk, since that page already knows it
- allow a token *name* and resolve it, though that means a network call and weakens the
  no-fetch promise
- allow the field to be left blank for a call that is not about a specific token

The worked examples deliberately do **not** prefill an address, because the page promises
"we never guess an address" one section down. Any change here has to keep that true.
