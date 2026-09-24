# Demigod HTML source reconciliation

This candidate reconciles master `1d5b883` with the privately retained live
Worker captured on 2026-09-24. The raw capture is not committed. Its public
application functions/data were reviewed and reconstructed into the existing
Worker/home-IA module boundary; redundant bundler name annotations and the
unavailable source-map pointer were removed.

Live baseline SHA-256:
`4d1a6f98e77f9614d9bda68e678d803a261c4f5d95bf9fd6fa406c3058db5097`
(349,569 bytes).

Candidate Worker source SHA-256:
`a4f1fcf947436a090207ad3831eb0d45504aa9e1fca723e8de6157435600ccc3`.
Unchanged master home-IA module SHA-256:
`e4ed910670eb344891bc1effdf04f00f2fb060f13d6aed7160b79f382aff4b3d`.
These are source hashes, not claims about a future Wrangler bundle hash.

## Preserved live behavior absent from the old mirror

- Same-host opt-in API, validation and health handling.
- Compute entry, via parameter handling and existing compute links.
- Expanded legacy route mappings, directory redirect and discovery aliases.
- CDN-backed honesty faces and existing same-host exceptions.
- Canonical Project Room origin and direct discovery alias responses.
- `/hire` to startup-wizard redirect with company context.
- Public map/catalog, hardware content, pinned assets and other page data.

No credentials or deployed configuration are embedded in this change. Existing
bindings, variables, routes, secrets and Access configuration must be preserved
by the deployment owner. This source reconciliation does not provision them.

## Deliberate changes versus live

1. Keep master's newer home-IA module, rather than downgrading it to the bundled
   live version. It provides FAQ topic chips/panels and their responsive styles,
   and readable walk-section label/divider colors. Home is 1,823 characters
   longer than the captured rendered home. Existing IA tests cover these features.
2. Port the bounded company-slug portion of PR43: exact IDs still render; unique
   case-insensitive IDs/names/compact slugs redirect302 to an encoded canonical
   ID. Unknown, ambiguous and punctuation-only names do not redirect. Role links
   and ATS destinations are unchanged. The old PR's unrelated `/startups` HTML
   rewrite is not included.
3. Preserve master's static same-host honesty documents as a fallback when CDN
   returns unavailable, times out, throws, or returns an empty body, after preferring the existing live CDN faces. This does
   not replace working live content. The old mirror's parked-compute404 and
   redirect-only Room discovery assumptions were superseded by live routes.

## Evidence and fresh-live guard

215 deterministic HTML/IA/company tests pass; their CDN calls use local fixtures.
Source contract passes. The private-capture comparison exercises 46 paths with
GET and HEAD: 91 responses retain identical status, headers and body; only GET /
changes for the reviewed source-only home-IA improvements. Separate tests cover
new slug redirects, ambiguity and exact-ID pages. This is bounded regression
coverage, not proof of every possible environment or input.

Immediately before deployment, the release owner must capture the **current**
live demigod-html Worker into a private file using the authenticated read-only
Cloudflare capture procedure, then run from this checkout:

```sh
node workers/demigod-html/reconcile-baseline.mjs /absolute/private/fresh-demigod-html-worker.js
```

The comparison refuses a different baseline hash before evaluating the module.
It mocks downstream fetches, so it performs no network writes. A fixed mirror
vs-live deploy guard will flag this intentional source change; this receipt and
a matching freshly captured baseline distinguish it from an unreviewed rollback.
If baseline differs, stop and reconcile the intervening work. Record the actual
built bundle hash and deployed version in the final release receipt.

No main merge or deployment has occurred in this branch.
