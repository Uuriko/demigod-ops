# Showing Dasha to people — right now

## The website (already live, nothing needed)

**https://johns-awesome-project-39b1b5.webflow.io/dasha**

This is the **Desk** — the coin's landing page. Mint evidence, links, the story. It is
grok's, it is live, and per `DASHA-PRODUCT-BRIEF.md` it is *the* landing page. If someone
asks "what is Dasha", send this.

Backup single-file copy: `https://files.catbox.moe/9qs77u.html` (also live).

## The Thesis Card tool (mine — not deployed yet)

Three ways to show it today:

| How | Where | Good for |
|---|---|---|
| **Send the file** | `/home/potter/dasha-landing.html` (26K) | Anyone, anywhere. Email it, AirDrop it, put it on a stick. |
| **Your browser** | http://localhost:8899 | Showing someone over your shoulder |
| **Same wifi** | http://192.168.12.53:8899 | Their phone, in the room with you |

**The file works with no internet and no server.** Verified: opened straight from disk it
generates cards, the checksum works, prefill works, there are no dead links, and it makes
**zero network requests**. Nothing you send phones home.

## What to say

The two are different things and calling them the same thing is the only way to look
confused here:

- **The Desk** is the landing page — what the coin is, where to look, sourced evidence.
- **The Thesis Card** is the first tool — write your call and the condition that would
  prove you wrong, *before* you post it. Get a timestamped, fingerprinted card.

The line that lands: *"Anyone can explain a trade after it moves."*

If you only show one thing on the tool page, show **Example 03** — a call that was wrong,
where the invalidation condition fired and the call got settled instead of quietly
rewritten. Everyone shows their winners. That is the differentiator.

## Two things to know before someone asks

**Pasting the tool link in X or Discord gives a blank preview.** The social card image
points at a path that is not deployed yet. The page itself looks fine — only the unfurl
thumbnail is missing. One file upload fixes it once we know the final host.

**The GitHub Pages link in the desk README is dead** (`uuriko.github.io/dasha-desk/`
returns 404). Pages was never enabled. Do not send that one.

## If you want a public link for the tool

Say **"publish to catbox"** and it is live in under a minute — same host the Desk backup
already uses. Everything is prepared and verified; the upload is the only remaining step.
I will not send anything outbound without you saying so.

The better long-term home is Webflow alongside the Desk, which needs your publish
authorization.

## Restarting the local preview

If the preview stops working:

```
node /tmp/dg-busy/preview/serve.mjs
```

The file itself never needs a server — that is only for showing it at a URL.
