---
status: reference
updated: 2026-08-09
---

# Dasha Studio portable distribution

## Decision

Treat the external Studio embed as executable supply-chain surface, not merely a sharing snippet.
The prepared snippet pins the reviewed `embed.js` bytes with SHA-384 and
`crossorigin="anonymous"`; the public Studio gate derives the digest from the generated script and
fails whenever README and code differ.

This is deliberately smaller than a plugin registry, SDK or release service. No external adopter
has been observed. An immutable, content-addressed URL becomes justified after either the first
outside embed or the second reviewed embed release. Until then, a changed hosted script failing
closed is preferable to silently gaining the authority of every adopter page.

## Observed state

- Local generated script: 44,685 bytes; SHA-256
  `ea894302cb3ba9ec9d294323ff8f49d4906ee2f0a5d6b26b24ce02415979f144`.
- Prepared SRI: `sha384-2oMrqr4kchUeevSYOdRHLl2cscFt12GTvqEtq4qynPgQWEspZzhCOEvGH5BnsLsC`.
- GitHub Pages returns `Access-Control-Allow-Origin: *`, satisfying the CORS side of cross-origin
  SRI.
- The currently hosted script is still the older 46,089-byte artifact with SHA-256
  `9f606e6dbe12fc63398d02533fec480f854605aea5caeda261c7baad34cd1e91`.
- Therefore the prepared snippet and reviewed local script must ship together. Using the new hash
  against the old public bytes correctly refuses execution.

## Why this boundary

The W3C Subresource Integrity specification defines the `integrity` attribute as a content pin and
requires CORS for cross-origin validation. It recommends SHA-384 as a current baseline. MDN's
implementation guide likewise requires HTTPS, integrity metadata and a CORS-enabled origin. The
same supply-chain principle appears in GitHub's guidance to pin Actions to full commit SHAs; the
repository workflows already do that.

Sources:

- [W3C Subresource Integrity](https://www.w3.org/TR/SRI/)
- [MDN Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)
- [GitHub Actions settings and full-SHA policy](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)

## Release contract

1. Build `embed.html` and `embed.js` from the canonical Studio.
2. Update the README SHA-384 to the exact reviewed `embed.js` bytes.
3. Run `studio.test.mjs`; digest or missing-CORS markup drift must fail.
4. Sync the generated public tree and run its build check.
5. On an explicitly authorized release, publish code and snippet in the same repository commit.
6. Fetch the public bytes and verify their digest before calling the embed usable.

Do not advertise automatic updates: SRI prevents them by design. Do not add multi-version hosting
until adoption or a second release proves the compatibility problem is real.
