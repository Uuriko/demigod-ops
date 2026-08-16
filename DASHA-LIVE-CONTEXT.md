# DASHA NOW

**Rewrite in place after meaningful work.** All agents (Grok / Claude / Codex) read this first for Dasha; keep NOW short. No secrets.

Updated: 2026-08-16T03:05:22.351Z · Agent: meta

## Live

- Home / Studio / Desk — public getdasha routes (embed ship path)
- Lobby — lobby.getdasha.com (health/WS/clients; assets acf906a8)
- Soft lag — none reported
- Meta gate — FAIL landing-sitemap-link,ship-readback,ship-readback-test,publish-retired,legacy-headers,metadata-contract,docs-lobby-live,workflow-ship,domain-runbook-current,meta-doc,context-scripts,script-audit-tools,script-audit-live,script-meta
- Announce-ready — yes hard: landing-sitemap-link, ship-readback, ship-readback-test, publish-retired, legacy-headers, metadata-contract, docs-lobby-live, workflow-ship, domain-runbook-current, meta-doc, context-scripts, script-audit-tools, script-audit-live, script-meta
- Verified — offline stamp via context-refresh

## Just shipped / in flight

- 2026-08-16T03:05:22Z · meta: meta FAIL landing-sitemap-link,ship-readback,ship-readback-test,publish-retired,legacy-headers,metadata-contract,docs-lobby-live,workflow-ship,domain-runbook-current,meta-doc,context-scripts,script-au
- 2026-08-16T03:05:15Z · meta: meta FAIL landing-sitemap-link,ship-readback,ship-readback-test,publish-retired,legacy-headers,metadata-contract,docs-lobby-live,workflow-ship,domain-runbook-current,meta-doc,live-context,context-scri

## Blocked

- landing-sitemap-link
- ship-readback
- ship-readback-test
- publish-retired
- legacy-headers
- metadata-contract
- docs-lobby-live
- workflow-ship
- domain-runbook-current
- meta-doc
- context-scripts
- script-audit-tools
- script-audit-live
- script-meta

## Next unblocked

1. Keep `npm run dasha:meta` + `dasha:audit:live:fast` green
2. Observe Lobby/Simp opt-in before new scoring machinery
3. Webflow www SEO when convenient (soft lag only)

## Peers

- last refresh — meta @ 2026-08-16T03:05:22.351Z
- peer inbox — `docs/exchange/DASHA-PEER-INBOX.md` (append via `dasha:peer-ping`)
- bus messages — `/tmp/dg-busy/agent-bus/messages.jsonl` when `dg-bus send` works

## Commands that must stay green

```bash
npm run dasha:meta
npm run dasha:audit:live:fast
```

Refresh: `npm run dasha:context:refresh -- --agent=meta --note="…"`  
Notify peers: `npm run dasha:peer-ping -- --note="…"`
