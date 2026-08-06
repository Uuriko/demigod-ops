# Loop iteration CK — make the tool a real webapp people can use

## The question

"How can we get the product live on the website as a webapp the user can use easily?"

## What is already true, and it is more than it looks

The tool is **one self-contained 28K HTML file** that needs no server, no build step, no
network and no account. Verified today: it runs from `file://`, `crypto.subtle` works,
`localStorage` works, it makes **zero off-disk network requests**, and it has no relative
links to break.

That is the hard part of shipping a webapp, and it is done. What remains is hosting and
making it feel like an app rather than a page.

## Task 1 — make it installable, which is the part I can actually do

A self-contained page that works offline is one manifest away from being an installable app:
"Add to Home Screen" on a phone, its own icon, its own window, no browser chrome. For a tool
someone is meant to reach for at a specific moment — writing a call before they post — that
is a materially different product from a bookmark.

Add a web app manifest with name, short name, theme and background colours matching the
palette, `display: standalone`, and an icon.

**Test whether a `data:` URI manifest actually works** rather than assuming. Chrome has
historically been inconsistent about `<link rel="manifest" href="data:...">`, and if it does
not resolve, the manifest has to be a real file — which changes the single-file property that
makes this thing easy to send around. Find out before committing to it, and if a data URI
fails, say so plainly and keep the file self-contained instead.

The icon can reuse the existing favicon mark; it is already an inline SVG in the right
palette, and the whole asset set was made coherent earlier today.

Do **not** add a service worker. It is the standard next step and it is wrong here: a service
worker adds a caching layer, an update lifecycle and a class of stale-content bugs, in
exchange for offline support this page already has by being one file with no fetches.

## Task 2 — lay out the hosting options honestly, with the real constraints

The user asked how to get it live *on the website*. There are genuinely different answers and
they trade off differently. Establish facts rather than repeating folklore:

- **Webflow embed.** Same mechanism grok used for the Desk. Keeps one domain, no new
  infrastructure. But Webflow's HtmlEmbed has a character cap — **check what the Desk
  actually does before asserting a number**, since the Desk is ~33K and is embedded somehow.
  If the cap is real, say how it is worked around.
- **Static host** (Cloudflare Pages, Netlify, Vercel). A single file deploys in seconds and a
  subdomain like `card.getdasha.com` is trivial. Needs an account I do not have.
- **GitHub Pages.** `dasha-desk` already has a Pages workflow; it needs a one-time enable and
  the GitHub auth that is already blocked.

Give a recommendation, not a menu. Note which need the user and which I can do once
`getdasha.com` resolves.

## Task 3 — do not break what makes it portable

Every change here is measured against the properties that make this easy to ship:

- one file, no external fetches, no relative links
- works from `file://`
- both gates green, drift guard intact, tool region untouched

If the manifest costs any of those, it is not worth it. Re-verify all of them afterwards,
not just the gates.

## Task 4 — say what "easily" actually requires

Being honest about the current friction is more useful than more features. The tool asks for
a Solana mint address before it will do anything, and a person being shown this will not have
one to hand. That is the single biggest usability barrier and it is a product question, not a
hosting one — worth naming even though the fix is not mine to decide.

## Constraints

- No service worker.
- Verify the data-URI manifest works before relying on it; report honestly if it does not.
- No new dependency, no external fetch, no build step.
- Do not touch the drift-guarded tool region.
- Re-verify `file://`, zero network requests, and both gates after the change.
