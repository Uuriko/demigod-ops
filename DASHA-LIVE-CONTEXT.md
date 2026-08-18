---
status: generated
generated_from: dasha-context-refresh.mjs
---

# DASHA NOW

**Rewrite in place after meaningful work.** All agents (Grok / Claude / Codex) read this first for Dasha; keep NOW short. No secrets.

Updated: 2026-08-18T10:49:18.049Z · Agent: pi

## Live

- Home / Studio / Desk — public getdasha routes (embed ship path)
- Lobby — lobby.getdasha.com (health/WS/clients; assets 16123d95)
- Soft lag — none reported
- Meta gate — ok
- Announce-ready — no hard: assets-hash-match, client-studio-handoff, client-studio-after-share, handoff-reject-invalid, handoff-mint, handoff-card, handoff-og, simp-result-card, lobby-sitemap, home-mint-source, home-lobby-link, lobby-page-mount, lobby-page-client, home-no-simp-mount, home-no-simp-client, metadata-studio, metadata-desk, metadata-lobby, metadata-howto, parity-lobby-link, studio-current, howto-mint-source, howto-swap-step, howto-concise, sitemap-routes, home-sitemap-navigation, execution-home, execution-faucet, sitemap-social-cards
- Verified — 2026-08-18T10:49:18.049Z via context-refresh

## Just shipped / in flight

- 2026-08-18T10:49:18Z · pi: Fixed privacy page copy drift: aligned dasha-privacy.html with Worker PRIVACY_HTML (referral tracking, lobby history, chess replays, third-party hosts, deletion scope); added regression assertions to
- 2026-08-18T10:23:54Z · pi: pi agent registered on bus; F1 test-theater audit done
- 2026-08-18T10:19:12Z · meta: meta ok
- 2026-08-18T09:39:15Z · meta: meta ok
- 2026-08-18T08:56:54Z · meta: meta ok
- 2026-08-17T20:28:57Z · meta: meta ok
- 2026-08-17T08:29:47Z · claude: backlog re-verified against live; live-verify gained dead-link + board SRI checks
- 2026-08-17T08:26:52Z · meta: meta FAIL meta-doc,context-scripts,script-audit-tools
- 2026-08-16T19:03:33Z · meta: meta FAIL meta-doc,context-scripts,script-audit-tools
- 2026-08-16T19:03:23Z · meta: meta FAIL meta-doc,context-scripts,script-audit-tools
- 2026-08-16T07:20:26Z · meta: meta FAIL meta-doc,context-scripts,script-audit-tools
- 2026-08-16T07:11:07Z · meta: meta FAIL publish-retired,domain-runbook-current,meta-doc,context-scripts,script-audit-tools
- 2026-08-16T07:10:32Z · meta: meta FAIL landing-sitemap-link,publish-retired,domain-runbook-current,meta-doc,context-scripts,script-audit-tools

## Blocked

- assets-hash-match
- client-studio-handoff
- client-studio-after-share
- handoff-reject-invalid
- handoff-mint
- handoff-card
- handoff-og
- simp-result-card
- lobby-sitemap
- home-mint-source
- home-lobby-link
- lobby-page-mount
- lobby-page-client
- home-no-simp-mount
- home-no-simp-client
- metadata-studio
- metadata-desk
- metadata-lobby
- metadata-howto
- parity-lobby-link
- studio-current
- howto-mint-source
- howto-swap-step
- howto-concise
- sitemap-routes
- home-sitemap-navigation
- execution-home
- execution-faucet
- sitemap-social-cards

## Next unblocked

1. Keep `npm run dasha:meta` + `dasha:audit:live:fast` green
2. Observe Lobby/Simp opt-in before new scoring machinery
3. Webflow www SEO when convenient (soft lag only)

## Peers

- last refresh — pi @ 2026-08-18T10:49:18.049Z
- peer inbox — `docs/exchange/DASHA-PEER-INBOX.md` (append via `dasha:peer-ping`)
- bus messages — `/tmp/dg-busy/agent-bus/messages.jsonl` when `dg-bus send` works

## Commands that must stay green

```bash
npm run dasha:meta
npm run dasha:audit:live:fast
```

Refresh: `npm run dasha:context:refresh -- --agent=pi --note="…"`
Notify peers: `npm run dasha:peer-ping -- --note="…"`
