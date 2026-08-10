# Dasha supply-chain trust — runtime lean, CI pins prepared

**Checked:** 2026-08-09  
**Public repository:** `Uuriko/dasha-desk`

## Current evidence

The deployed Dasha runtime has a small executable dependency surface:

- Home and Lobby execute Dasha-owned clients from `lobby.getdasha.com` with SHA-384 SRI and
  anonymous CORS. Studio is inline in its Webflow embed. No page executes Jupiter's plugin;
- Desk runtime is plain generated HTML/CSS/JavaScript with no package dependency;
- the public repository has one exact-version development dependency, `puppeteer-core@25.1.0`, used for tests;
- its lockfile contains 26 development packages and `npm audit --package-lock-only` currently reports zero known vulnerabilities;
- GitHub secret scanning and push protection are enabled;
- private vulnerability reporting is enabled and the repository publishes `SECURITY.md`;
- `main` is not branch-protected;
- Dependabot security updates are disabled;
- public workflows currently reference third-party Actions by mutable major tags.

The private operator worktrees are a separate supply-chain boundary from the deployed site. They use
the MCP SDK, WebSocket client and browser/build tools for Webflow publication and verification; none
of those packages is bundled into Home, Studio, Desk or the Cloudflare Worker. A 2026-08-09
`npm audit --omit=dev` initially found five production-classified advisories through the MCP SDK
chain. Both synchronized worktrees now resolve `@modelcontextprotocol/sdk@1.30.0`,
`@hono/node-server@2.1.0`, `hono@4.13.1`, `fast-uri@3.1.5`, `ip-address@10.4.0` and `ws@8.21.3`;
the same audit reports zero vulnerabilities in each tree. The ship/resume, documentation, product
coherence and Lobby page checks pass after the refresh.

The full development audit still reports advisories in optional browser/CLI chains. Do not describe
that as a clean full audit or as public-runtime exposure. Upgrade those tools only through their
direct packages and tests; do not use `npm audit fix --force`, whose proposed changes include
breaking or regressive package moves.

### Live Lobby execution repair

The canonical worktree Lobby already pinned `client/lobby.js`, but the root Webflow artifact had
drifted: it used an ordinary unpinned cross-origin script tag and loaded Jupiter's mutable plugin
after four seconds even without a buy click. The latter was unnecessary because the visible buy
control is already an exact-mint `jup.ag/swap` anchor.

The live root artifact now uses the release-generated SHA-384 digest with `crossOrigin =
'anonymous'` and removes the Jupiter plugin execution entirely. The Worker responds with
`Access-Control-Allow-Origin: *`; a mobile/desktop browser test proves the digest accepts the current
bytes, the chat mounts, and the exact-mint link remains usable. W3C SRI requires browsers to compare
fetched bytes with declared integrity metadata, and the HTML standard assigns that metadata to the
script fetch. This is a supply-chain boundary, not a performance decoration.

Worker release identity now also covers `dasha-lobby-wrangler.jsonc`. Executable source and static
assets were already hashed; leaving routes outside that identity allowed a routing-policy change to
look deployed when it was not.

### OAuth callback execution boundary

The X OAuth callback is the Worker's most identity-sensitive HTML route. Its error pages already
escaped reflected provider text, invalidated the short-lived OAuth state cookie, denied framing and
were noindexed, but the shared HTML policy did not restrict script execution. The prepared Worker
now gives private OAuth pages `default-src 'none'`, denies scripts entirely on error pages, and
allows the one successful `postMessage`/close script only through a fresh per-response nonce.
Connections, images, fonts, forms, objects, framing and base-URL changes remain denied; the existing
inline visual style is the only broad allowance. This follows the strict-CSP model without adding a
dependency or trying to force a nonce policy onto Webflow's separately managed runtime.

The focused Worker regression pins both the deny-by-default error policy and the nonce connection
between success markup and its response header. Worker release `bb009443b06e8e7d`, whose identity
also covers direct imported server modules, was deployed and passed the broad live audit on
2026-08-09.

## Prepared local hardening

The local open-source source tree now:

1. pins every `actions/*` reference to the exact current 40-character commit SHA;
2. retains the readable major version as a comment;
3. gives the verification and production-watch workflows only `contents: read`, while Pages retains
   only `contents: read`, `pages: write`, and `id-token: write`;
4. adds bounded monthly `github-actions` and `npm` Dependabot updates;
5. fails `dasha-oss-docs.test.mjs` if an Action returns to a mutable tag, permissions become
   implicit, or dependency maintenance disappears;
6. prevents checkout credential persistence and installs the lockfile with lifecycle scripts disabled;
   no package in the current lockfile declares a required lifecycle script.

The local pins were resolved directly from the corresponding upstream Git tags. Both production-only
and full public-repository audits report zero known vulnerabilities, and the complete local suite
passes. This patch is prepared only; the public repository still exposes mutable tags until an
authorized GitHub update is applied and read back.

## Decision

Do not add artifact attestations, a dependency-review workflow, a package scanner, or another build service yet.

The Desk is a static site with no production dependency. Immutable Action references and least privilege close the concrete execution risk. Artifact attestations become useful if Dasha distributes executable packages or asks users to verify downloaded build artifacts; they add little to a browser-rendered GitHub Pages mirror today.

Branch protection is a separate remote setting. It should not be claimed from a YAML patch, and a one-maintainer repository should not invent a required-review rule that makes urgent fixes impossible. The durable minimum is a required green verification check once repository settings are deliberately configured.

## Sources

- [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)
- [W3C Subresource Integrity](https://www.w3.org/TR/SRI/)
- [WHATWG script integrity semantics](https://html.spec.whatwg.org/dev/scripting.html)
- [MDN strict CSP implementation](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP)
- [Cloudflare Workers — attach security headers from generated responses](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Webflow — custom security headers require Enterprise](https://help.webflow.com/hc/en-us/articles/46651836279059-Custom-security-headers)
