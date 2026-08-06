# getdasha.com — actual state and what to do

Checked 2026-08-06. Read-only. Nothing was purchased or changed.

## The finding

**getdasha.com is not registered. Nobody owns it.**

| Check | Result |
|---|---|
| RDAP `rdap.verisign.com/com/v1/domain/getdasha.com` | **HTTP 404 — unregistered** |
| RDAP `dasha.com` (control) | HTTP 200 — registered by someone else |
| RDAP `google.com` (control) | HTTP 200 — proves the endpoint works |
| DNS NS / A / CNAME / MX / TXT | **all empty** — a registered-but-unconfigured domain still has NS |
| `http(s)://getdasha.com`, `www.` | connection failed, no response |

So there is no Webflow admin console for it to find. The domain has to exist before it can
be attached to anything.

## The two things I cannot do

1. **Register the domain.** That is spending money, which needs explicit authorisation —
   this is the "unless absolutely needed" case. ~$10–15/yr at any registrar.
2. **Webflow OAuth.** A browser login only the account holder can complete. I started the
   flow; the URL is in the chat and stays valid for a short window.

Everything else I will do without further input.

## Order of operations

1. **Register `getdasha.com`** at any registrar (Namecheap, Cloudflare, Porkbun). Cloudflare
   sells at cost and its DNS is the simplest to point at Webflow.
2. **Authorise Webflow** — open the OAuth URL from the chat. If the redirect page fails to
   load, copy the whole `localhost:3118/callback?...` URL from the address bar and paste it
   back; I can finish from there.
3. **I do the rest**: add the custom domain in Webflow, read back the exact DNS records it
   issues, and verify propagation and SSL.

## The DNS shape to expect

Webflow issues the real values once the domain is added to the project — do not pre-create
these from memory, use whatever Webflow shows:

| Host | Type | Points to |
|---|---|---|
| `www` | CNAME | `proxy-ssl.webflow.com` |
| `@` (root) | A | Webflow's two A records, shown in the project's hosting settings |

Webflow expects `www` as the canonical host with the root redirecting to it. That choice
affects the meta tags below, so it should be made once and then followed everywhere.

## What changes on my page the moment it resolves

`dasha-landing.html` currently pins three tags to the Webflow staging origin, and they must
move **together** — a canonical and an og:url that disagree is its own defect:

- `link[rel=canonical]`
- `meta[property="og:url"]`
- `meta[property="og:image"]`

**Do not repoint them before the domain answers.** Aiming a canonical at a hostname that
does not resolve is worse than a staging URL, and it is the exact defect I already fixed
once today when I retired an invented domain.

This is also what fixes the **blank social preview**: the unfurl is empty because
`dasha-og-card.png` is not reachable at the origin the tag names. Once the domain is live
and the card is deployed beside the page, pasting the link produces a real card.

## One thing that is fine and looks like it isn't

`getdasha.com` is already hardcoded in the ICS calendar export, in both tool copies:

```
UID:${crypto.randomUUID()}@getdasha.com
```

This is **not** a defect. An iCalendar `UID` uses a domain only as a namespace suffix to
make the identifier globally unique — it is never fetched and does not need to resolve. No
change needed, and it is unrelated to the canonical/og tags above.
