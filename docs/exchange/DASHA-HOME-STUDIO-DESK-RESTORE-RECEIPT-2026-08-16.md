# Dasha Home / Studio / Desk restore receipt — 2026-08-16

Status: live and verified.

- Worker version: `c25e320a-5686-4e1a-aca3-9a870a0c0c68`
- Migration-safe deploy source: `.grok/worktrees/potter/dasha-2/dasha-lobby-wrangler.deploy.jsonc`
- Durable Object migration: `v2`; `DashaLobby` and `DashaFaucet` bindings preserved; no `deleted_classes`
- Base live version read before patch: `763ed273-1dde-4f5c-b525-6d609393de4b`, etag `c311802b4cdca1761ce3f6839866187d38ac6b1e7865f4103273f589cbf7ccb4`
- Downloaded base bundle SHA-256: `cb9672e49a28cea059d8b7ee604f432d1ef56ee6867d8fdc47edce9313bec2e7`
- Deployed source bundle SHA-256: `07d72bbaf3bd7e5ce6812072fd146836d0787f8226ff1de02feb57486f70bd23`
- Worker assets: unchanged; live hash `e7a149198aa95dc7`

The deployed delta is deliberately limited to:

1. Remove the three Studio/Desk-to-Home redirect branches so `/studio` and `/dasha` pass through to their existing Webflow pages.
2. Stop `rewriteHomeFirstViewport` from reinjecting retired Home rooms, a Simp mount, and Jupiter plugin code.
3. Replace the old Home `#simp` section with a door-only `/simp` section; remove the Simp and dead X-connect clients.
4. Add `rel="noopener noreferrer"` to Webflow blank-target anchors that lack it.
5. Bound the Worker sitemap to `/`, `/simp`, `/studio`, `/dasha`, and `/chess`; remove `/airdrop`, `/earn`, and `/claim`.

Verification:

- `npm run dasha:check` — PASS before deploy.
- Wrangler 4.120.1 dry run — PASS, 773.17 KiB / 193.34 KiB gzip, both Durable Objects present.
- Local request-level Worker test — PASS for Home, Studio, Desk, and sitemap.
- `npm run dasha:verify:live` — PASS after deploy: all five canonical surfaces 200, no redirects, Home door-only, sitemap current, no warnings.
- Scoped `dasha-audit-live.mjs --fast` checks — PASS for Home/Studio/Desk 200, Home door/no mount/no client, execution policy, external-link safety, sitemap route/scope/indexability, Worker health/assets.

Webflow was not changed. The scoped ship attempted preflight and stopped before any push or publish because local Studio and X-connect pins do not match the live Worker assets. Publishing that checkpoint would have blanked clients. The existing Webflow Studio and Desk pages already match the release markers and became live when the edge redirects were removed.

The broad audit remains red for work outside this restore: local/live asset hash drift; newer Studio handoff paths; Simp result card/image; Lobby page/mount/metadata; and How-to-buy metadata/copy. Do not describe this receipt as full-site announce-ready.
