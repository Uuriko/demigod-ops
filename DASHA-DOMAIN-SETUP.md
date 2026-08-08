---
status: reference
---

# Dasha domains — actual state

Verified 2026-08-06 ~19:40 UTC from RDAP, DNS, HTTP and the user's email. Nothing purchased
or changed by me.

## Headline

**You bought `getdasha.com` today.** IONOS order confirmation, 2026-08-06 **18:40 UTC**,
**$1 for the first year** (renews $20/yr), customer ID 316710768. The email says the order
*"is currently being reviewed… in rare cases it can take up to 48 hours."*

That is why it is not resolving yet: RDAP still returns 404 and there are no nameservers.
Nothing is wrong — it is a brand-new registration still being processed. **No action until
it appears.**

There is also a **Webflow receipt from 18:33 UTC today**, seven minutes before the domain
purchase. Custom domains require a paid Webflow Site plan, so that is very likely already
handled.

## What is blocking trydasha.com

Nothing is broken. It was simply never pointed at Webflow.

| | |
|---|---|
| Registered | yes — 2026-01-08, expires 2027-01-08 |
| Registrar | Wild West Domains (GoDaddy reseller) |
| Nameservers | `NS65.DOMAINCONTROL.COM`, `NS66.DOMAINCONTROL.COM` — GoDaddy default |
| Serves | `<script>window.location.href="/lander"</script>` — **the GoDaddy parked-domain page** |

So `trydasha.com` returns HTTP 200, which looks alive, but it is GoDaddy's placeholder. To
serve the Dasha site it needs all four of:

1. a paid Webflow **Site plan** on that project (the 18:33 receipt probably covers this)
2. the domain **added as a custom domain** in the Webflow project's hosting settings
3. **DNS records at GoDaddy** changed from parking to the values Webflow issues
4. the site **published to the custom domain**, not just to the `.webflow.io` staging URL

## Which domain is the real one

`getdasha.com`, and the codebase already assumes it — grok hardcodes `getdasha.com` in the
ICS calendar UID in both tool copies. Buying it today settles the question.

`trydasha.com` matches the `trydemigod.com` naming and is already paid for through Jan 2027.
Cheapest use is to **redirect it to `getdasha.com`** once that resolves, so the name is not
wasted and nobody lands on a parking page.

## What happens next, and who does it

**Wait for IONOS** (up to 48h, usually far less). I will re-check RDAP; the moment
nameservers appear the rest can proceed.

Then, needing you:

- **Webflow OAuth** — a browser login only you can do. Auth URL is in the chat.

Then, me, unattended:

- add `getdasha.com` as a custom domain in the Webflow project
- read back the **exact** A / CNAME records Webflow issues, and set them at IONOS
- verify propagation and SSL
- repoint `canonical`, `og:url` and `og:image` together — **which is what fixes the blank
  social preview**, since the OG card is currently unreachable at the origin the tag names
- optionally point `trydasha.com` at `getdasha.com` at GoDaddy

## Do not

- Pre-create DNS records from memory. Use the values Webflow shows for this project.
- Repoint the meta tags before the domain answers. Aiming a canonical at a hostname that
  does not resolve is worse than a staging URL — I fixed exactly that defect earlier today.
- "Fix" the `getdasha.com` in the ICS `UID`. An iCalendar UID uses a domain purely as a
  namespace suffix; it is never fetched and does not need to resolve.
