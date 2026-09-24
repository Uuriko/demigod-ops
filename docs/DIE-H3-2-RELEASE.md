# Hosted company-route release

Prepared against public source master `1d5b883` and the privately retained
2026-09-24 live h3.1 Worker capture. The capture itself is not committed.

Baseline SHA-256: `2a0e61cf35a33c4d97b07d65ad2facf4f53aba0b3c37466037139a240124a09a`
Baseline size: 13,251 bytes.

## Semantic changes relative to captured live

- Keep all 27 catalog rows (OpenAI and 26 public company identities), including
  Mythic, Fonoa, Standard Bots, Modal, Mercury and PsiQuantum. These six were
  already live but absent from the older public source mirror.
- Serve HTML and JSON identity routes for all advertised company IDs, using
  current master's bounded catalog resolver. Previously only OpenAI resolved.
- Identify this release as `hosted-read-only-h3.2` in public health.

No other behavior changes are intended. Unknown/malformed IDs still fail;
mutations remain disabled. The upstream Cloudflare Access contract and the
Worker's existing JWT-shape check are unchanged. A synthetic test header
is not production authorization or cryptographic JWT verification.

## Validation

Nine source tests pass, including six preserved identities, every catalog
HTML/API link, encoded/raw IDs, read/method gates and unknown IDs. CI now
runs both hosted-desk test files.

A local comparison imported the retained capture without uploading it:
companyList() and roleList() are deeply equal; 78 GET/HEAD/POST route cases
with and without a synthetic header retain identical status, headers and
body. 52 advertised company HTML/API routes change from 404 to 200. The
health release marker is the sole intentional difference outside those routes.

Before release, compare a fresh live capture to the baseline hash above.
If it differs, reconcile the new changes before uploading. Preserve existing
Worker bindings, variables and Access configuration. This document is release
evidence, not a claim that deployment occurred.
