# Security policy

## Supported versions

Security fixes land on the default branch (`master`).

## How to report

Use a **private** GitHub security advisory:

https://github.com/Uuriko/demigod-ops/security/advisories/new

Do **not** open a public issue, discussion, or pull request for a vulnerability,
leaked secret, or suspected exposure of hiring data.

## What to include

- What you ran and where (module or URL, not a dump of the machine)
- Expected vs observed
- A minimal repro if you have one

## What not to include

Do **not** paste hiring PII, résumés, emails, OAuth tokens, wallet keys, live
secrets, or full env files. Describe the class of secret and how it leaked.

## Scope

In scope: this repository’s kernel, in-repo website sources, and shipped scripts.

Out of scope: live Webflow / CDN publish, third-party ATS products, and anything
that would require us to publish, send outbound mail/DMs, or move money.

## Conduct reports

The same private advisory form is the contact for [code of conduct](CODE_OF_CONDUCT.md)
reports. Title the advisory `Code of Conduct` so it is not treated as a product
vulnerability.
