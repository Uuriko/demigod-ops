# Implement OAuth-linked Dasha Simp Board v1

Work only in `/home/potter/.grok/worktrees/potter/dasha`, which currently owns the uncommitted Lobby OAuth implementation. Do not publish or deploy. Preserve unrelated dirty work.

## Goal

Reuse the existing Lobby X OAuth session for an opt-in Simp Board. A user who has linked X in the Lobby can join the Board without another authorization flow. Build the smallest server-side enrollment, public board response, and homepage UI necessary to demonstrate the loop locally.

## Required existing sources

Read fully before editing:

- `dasha-lobby-x.mjs`
- `dasha-lobby-worker.mjs`
- `dasha-lobby-client.js`
- `dasha-lobby-x.test.mjs`
- `dasha-lobby.test.mjs`
- `dasha-lobby-wrangler.jsonc`
- `dasha-landing.html`
- `/home/potter/dasha-simp-board.json`
- `/home/potter/dasha-simp-oss-scorer.mjs`
- `/home/potter/DASHA-ROADMAP.md`

## Product and trust contract

1. X OAuth proves control of an X account and supplies public profile identity. It does not prove endorsement, contribution quality, wallet ownership, or humanity.
2. Participation is opt-in. Do not enroll on OAuth callback or Lobby chat automatically. The Board needs an explicit join action.
3. Store only the public X ID, normalized handle, public avatar/verification fields, enrollment/update times, score components, and evidence URLs. Never store OAuth access/refresh tokens in Board state.
4. Public output must not expose X numeric IDs, cookies, tokens, IPs, wallets, balances, private moderation notes, or unapproved evidence.
5. Unlinking Lobby OAuth does not silently delete a public Board entry. Provide a signed-session opt-out/removal action and make its effect clear.
6. PerryALPHA remains the disclosed editorial founding #1 spot for now. Do not falsely mark Perry OAuth-linked or fabricate points.

## Scoring v1

Create one pure, tested scoring module and reuse it in the Worker. Keep components explicit in public output.

- `linked_x`: 10 points once. This is a small eligibility credit, not a verification or endorsement score.
- `creative`: operator-approved public Dasha artifacts or materially changed Studio remixes. 25 points per accepted item, capped at 100 per rolling 28 days. Every award requires an HTTPS public evidence URL on `x.com`, `twitter.com`, or `getdasha.com`.
- `community`: operator-approved helpful public work such as moderation, documentation, event help, or meaningful community support. 10 points per award, capped at 40 per rolling 28 days. Same evidence requirement.
- `oss`: accept externally computed points only from the existing `dasha-simp-oss/v0` contract, capped at 300 per season. Do not reimplement the GitHub scorer in the Worker.
- `holder`: badge only when a later signed-wallet proof exists; zero points in v1. Do not implement wallet linking now.

Follower count, verification tier, likes, reposts, replies, chat messages, referrals, purchases, token balances, bag size, and payments award zero. State this in the public rules response.

Ranking order: total descending, then most recent evidenced contribution, then enrollment time, then normalized handle. Perry's editorial founding row stays pinned before measured rows and is clearly labeled non-measured.

## Minimal API

Reuse the existing Lobby Durable Object and signed session:

- `GET /simp/board` — public sanitized measured entries, Perry editorial row, and scoring rules.
- `GET /simp/me` — credentialed status for the linked session; no X session returns `linked:false`.
- `POST /simp/join` — credentialed explicit enrollment; idempotent.
- `POST /simp/leave` — credentialed removal of that X account's Board profile and awards.

Do not add an award-management API in this pass. Leave a tested pure scoring contract plus storage shape that can accept evidence-backed awards later. This avoids creating an unaudited admin surface.

Use the existing CORS allowlist, `credentials:true`, security headers, normalized session identity, and Durable Object storage. Apply a conservative public board limit. Reject non-POST mutation methods. No new dependencies.

## Homepage UI

Add a compact Board section or enhance the existing Board if present:

- Publicly show Perry's founding row plus measured opt-in entries.
- If not linked: `Link X to join` starts the existing `/oauth/x/start` flow.
- If linked but not enrolled: `Join board` calls `/simp/join`.
- If enrolled: show the user's handle, total and breakdown, plus `Leave board`.
- Explain in one short line: `Linked identity + recognized work. No follower, bag, purchase or spam points.`
- Do not turn the Board into the hero or add it to main navigation.
- Accessible button labels, live status, graceful API/OAuth unavailable fallback.

Prefer a small standalone `dasha-simp-board-client.js` and inline it through the existing landing embed/build mechanism only if that is simpler than coupling it to chat client. Do not duplicate OAuth primitives.

## Tests

Add the smallest tests that fail on:

- score/cap/ranking errors;
- automatic enrollment;
- public X ID/token/wallet/balance leakage;
- non-idempotent join;
- unauthorized leave;
- invalid evidence hosts;
- points from followers, verification, chat volume, referrals, purchases or balances;
- homepage missing link/join/leave states or privacy copy;
- Perry falsely marked measured or linked.

Run all Lobby, Board, landing and product-coherence tests available in this worktree. Report exact changes, test results, and remaining deployment/configuration work. Do not publish.
