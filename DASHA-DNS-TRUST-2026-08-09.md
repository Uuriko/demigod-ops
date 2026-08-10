# Dasha DNS trust — current evidence and safe transition

**Checked:** 2026-08-09  
**Scope:** `getdasha.com`, `www.getdasha.com`, and `lobby.getdasha.com`

## Current truth

The public domain works and TLS policy is healthy, but DNSSEC is fully disabled.

- authoritative nameservers are Cloudflare (`troy` and `vera`);
- no parent-zone `DS` record;
- no zone `DNSKEY`, `CDS`, or `CDNSKEY` record;
- valid Google Trust Services certificates on apex, `www`, and `lobby` with 88 days remaining at check time;
- HTTP → HTTPS and apex → `www` redirects match the canonical layout;
- HTTP → HTTPS and apex → `www` preserve paths and query strings used by Studio, Lobby, quiz,
  and permanent result links;
- `www` and Lobby send one-year HSTS;
- Lobby HTML denies framing and restricts base/object execution.
- the domain has no MX, SPF, or DMARC record and the product exposes no `@getdasha.com` mail workflow.

All six current www sitemap routes also return a consistent browser policy: one-year HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, denial of camera/microphone/geolocation/payment/USB capabilities, and a narrow CSP denying framing, base retargeting, and plugin objects. `dasha:audit:live:fast` now evaluates the entire sitemap route set rather than assuming the Home header represents every Worker/Webflow path.

This is an **off** state, not propagation. It is not currently breaking resolution.

## Why DNSSEC is the remaining domain control

DNSSEC authenticates DNS answers through a chain from the `.com` parent delegation to Cloudflare's signed zone. That matters more for a crypto site than adding decorative trust copy: a forged DNS answer could send a visitor to an attacker-controlled frontend while preserving the familiar hostname in a link.

Cloudflare Registrar supports a one-click activation path and publishes CDS/CDNSKEY for registry pickup. Cloudflare documents a one-to-two-day parent-delegation window. During that window the safe observable state is `awaiting-parent-delegation` (zone DNSKEY present, parent DS absent). A parent DS without the matching zone key is `broken-delegation` and must be a hard failure.

## Automated evidence

`npm run dasha:domain:check` now distinguishes:

| State | Parent DS | Zone DNSKEY | Interpretation |
|---|---:|---:|---|
| `off` | no | no | Current state; resolves but is unsigned |
| `awaiting-parent-delegation` | no | yes | Cloudflare signing enabled; registrar propagation pending |
| `active` | yes | yes | Chain is present |
| `broken-delegation` | yes | no | Hard failure; validating resolvers may return `SERVFAIL` |

The check also records CDS and CDNSKEY so automatic registrar pickup is observable. Activation remains an external Cloudflare configuration change and is not implied by this document.

## Live disclosure route

The Worker serves RFC 9116 `/.well-known/security.txt` on `www.getdasha.com` and `lobby.getdasha.com`. It points to the existing GitHub private vulnerability-report flow and repository security policy, includes a canonical URL for each host, and expires on 2027-08-01. No new email address or unsupported response promise was invented.

Both canonical files returned HTTP 200 after the 2026-08-09 release. The GitHub advisory target resolves through GitHub authentication, and the repository policy provides the fallback when private reporting is unavailable.

The apex `https://getdasha.com/.well-known/security.txt` currently returns Webflow's 404 while
ordinary apex traffic redirects to `www`. This is not Worker release lag: live DNS resolves the apex
to Webflow's documented `198.202.211.1`, while www/Lobby resolve through Cloudflare. Cloudflare says
Worker routes require an orange-clouded/proxied record; Webflow says standard hosting must remain DNS
only and warns that enabling the proxy can cause TLS 525 errors. The ineffective apex Worker route
has therefore been removed from the deployment config instead of pretending it protects traffic it
never receives. Migrating to Webflow's supported Orange-to-Orange flow would be a separate hosting
change, not a security.txt patch.

`dasha-domain-check.mjs` records this topology and validates contact, canonical URL, content type,
and at least 30 days of remaining expiry on all three hosts. The apex 404 remains a soft, explicit
coverage limitation; the canonical `www` and Lobby files are hard checks. RFC 9116 applies a fetched
file to the URI used to retrieve it and requires each web canonical to name that retrieval URI, so
the existing www/Lobby files do not falsely claim to cover the unavailable apex path.

## No-mail anti-impersonation boundary

The project currently uses GitHub private advisories instead of domain email. An absent MX record is not an explicit no-mail declaration: SMTP can fall back to the apex address, and receivers have no SPF/DMARC instruction for spoofed `@getdasha.com` senders. The prepared profile in [`DASHA-DNS-TEMPLATE.txt`](DASHA-DNS-TEMPLATE.txt) is:

- RFC 7505 null MX (`0 .`) — accept no inbound mail;
- RFC 7208 `v=spf1 -all` — authorize no outbound sender;
- `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` — request rejection for non-aligned apex and subdomain mail.

`dasha-domain-check.mjs` reports all three as soft gaps. They do not affect web availability and remain external DNS changes, not local completion. No reporting address is included because no supported mailbox exists. If domain email is ever introduced, null MX, SPF, DMARC, and provider DKIM must be migrated together before the first message is sent.

The redirect gate now probes representative nested paths and query strings on apex, `www`, and
Lobby. Root-only checks were insufficient: a redirect rule could keep the homepage healthy while
silently collapsing `/studio`, `/lobby?quiz=1`, or permanent result URLs to `/`. The current chain
preserves all tested path/query components across both redirect hops.

`DASHA-DNS-TEMPLATE.txt` now labels the old bracketed Webflow setup records as completed history. Only the exact no-mail profile remains a prepared change; the live web A/CNAME records must not be reconstructed from that worksheet.

## Sources

- [Cloudflare Registrar — enable DNSSEC](https://developers.cloudflare.com/registrar/get-started/enable-dnssec/)
- [Cloudflare DNSSEC setup and rollback](https://developers.cloudflare.com/dns/dnssec/)
- [Cloudflare DNSSEC validation and key management](https://developers.cloudflare.com/dns/dnssec/validation-and-key-management/)
- [Cloudflare DNSSEC troubleshooting](https://developers.cloudflare.com/dns/dnssec/troubleshooting/)
- [RFC 9116 — security.txt](https://www.rfc-editor.org/info/rfc9116/)
- [Webflow: standard Cloudflare DNS must remain DNS-only](https://help.webflow.com/hc/en-us/articles/33961315914515-Connect-your-Cloudflare-domain-to-Webflow)
- [Cloudflare: Worker routes require proxied DNS](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [RFC 7505 — Null MX](https://www.rfc-editor.org/info/rfc7505/)
- [RFC 7208 — SPF](https://www.rfc-editor.org/info/rfc7208/)
- [RFC 9989 — DMARC](https://www.rfc-editor.org/info/rfc9989/)
- [GitHub — privately reporting a vulnerability](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)
