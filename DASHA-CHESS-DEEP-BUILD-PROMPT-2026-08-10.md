---
status: execution-prompt
scope: Dasha Chess research, implementation, verification, publication
date: 2026-08-10
---

# Dasha Chess — deep research and build execution prompt

## Role and objective

Act as the senior product engineer, online-chess systems designer, security reviewer, accessibility
reviewer, mobile interaction designer, and release operator for Dasha Chess. Improve the existing
first-party game at `https://lobby.getdasha.com/chess`; do not replace it with an iframe, hosted chess
vendor, new framework, second identity system, embedded wallet, or speculative platform rewrite.

Build a distinctive, reliable Dasha-forward online chess experience that works on small mobile screens
and desktop, creates public artifacts worth sharing, and turns interested viewers into voluntary
holders through real access utility. Anna is the opposing black side; Dasha remains the dominant voice,
visual identity, white side, and invitation frame. Theme must never obscure chess state, accessibility,
trust, or controls.

The requested outcome is not “more controls.” It is a stronger loop:

`public challenge/result → exact Chess scene → linked X → current holder proof → live game → replay/bracket → public share`

## Authority and hard boundaries

- Dasha is the only active project. Do not touch Demigod or Eat the Sounds.
- Preserve the exact $dasha mint and the single Jupiter transaction venue.
- Playing, matchmaking, accepting challenges, and tournament participation require linked X, existing
  enrollment, and current holder proof. Public challenge inspection, brackets, and completed replays
  remain identity-free.
- Wallet proof stays sign-message-only: no transaction, custody, delegated signer, stored wallet,
  public balance, token weighting, holding-duration requirement, stake, burn, lock, or sell penalty.
- Ratings and results belong to linked X identity; wallet details do not.
- Never promise price performance, safety, endorsement, official token control, fair-play certainty, or
  FIDE status. Do not reward buying, holding, posting, likes, reposts, reach, or not selling.
- Publishing is authorized by the current request, but only after complete gates pass and live readback
  proves the synchronized Worker asset identity.
- Use Ponytail: reuse the current server-authoritative game, Durable Object, browser APIs, polling,
  event counters, renderer, and tests. Add no dependency without a proven need.

## Evidence ledger

Read current sources and tests before editing. Verify rather than assume:

- legal moves, promotion, check, mate, stalemate, repetition, fifty-move and material draws;
- server clock, increment, timeout adjudication and stale-version rejection;
- OAuth origin validation and current-holder sign-message flow;
- matchmaking, draw offers, resignation, rating settlement and rematches;
- tournaments, byes, drawn-match rematches, cancellation, expiry, deletion and replay history;
- dynamic metadata, replay frames, SAN, native share card and X fallback;
- 320/390/1440 layouts, touch targets, overflow, focus, keyboard board navigation and axe;
- thresholded identity-free metrics;
- hidden-tab polling, reconnects and exact deep-link restoration.

Apply research conditionally:

- FIDE: reject illegal moves; make clocks/results authoritative; keep draw/resign explicit.
- FIDE Online Regulations: clocks continue through disconnection and reconnect resumes remaining state;
  avoid unsupported accusations or fair-play claims.
- Lichess exposes distinct challenge, rematch, replay and puzzle objects.
- Chessground demonstrates click/touch moves, last move, destinations, check and fluid layout, but its
  GPL implementation must not be copied.
- Lichess non-visual work shows replay navigation should not require repeated focus switching.
- Cloudflare recommends one coordination atom per game at scale and hibernatable WebSockets for high
  frequency. Current use does not justify replacing visible-only polling; retain a scale trigger.
- Base and Phantom favor durable standard URLs and deep links. Do not fork a mini-app codebase.

## Selected coherent release

Primary feature: **direct holder challenge links**.

- Converts a passive share into an exact invitation.
- Public inspection needs no identity; accepting naturally uses the existing X/holder gate.
- Reuses engine, clock, rating, replay, sharing, metadata, polling and Durable Object state.
- Dasha initiates as white; the invited opponent takes Anna's black side.

Secondary feature: **direct replay keyboard navigation**.

- Left/Right moves one ply; Home/End moves to start/final.
- Never intercept typing, buttons, promotion choices, or the native replay range.
- Preserve roving board focus and screen-reader labels.

Explicit non-goals: premoves, arrows, engine evaluation, analysis board, opening explorer, puzzles,
chat, voice/video, live casual spectators, correspondence, custom clocks, teams, Swiss pairing, prizes,
wagers, NFTs, economic badges, notifications, PWA packaging, WebSockets, second auth/wallet SDK,
automatic cheat detection, public suspicion scores, or extra visual theme selectors.

## Direct challenge contract

### State and lifecycle

Persist the minimum challenge object: random bounded ID; private creator X ID and normalized handle;
`open`, `accepted`, `cancelled`, or `expired`; created/expiry timestamps; accepted game ID only after an
atomic accept. Use a 30-minute lifetime. Keep one open challenge per creator. Expire during Chess
requests and alarms. Bound retention; the completed replay, not the invitation, is the durable artifact.

### Create

- POST, exact first-party origin, linked X, enrollment, current holder proof.
- Reject an active game or active tournament; remove creator from casual matchmaking.
- Reuse an existing open challenge instead of link spam.
- Return no X ID, wallet, balance, cookie, or holder timestamp.

### Inspect

- GET is public and identity-free.
- Show creator, rating, `Dasha has white`, expiry and viewer-valid action.
- Never expose active casual game state publicly.
- Expired/cancelled/unknown links have a clear bounded state or 404.

### Accept

- POST, exact origin, linked X, enrollment, current proof.
- Reject self-acceptance, stale links, active game/tournament, or unqualified creator.
- Atomically create exactly one rated 10+5 game: creator white/Dasha, accepter black/Anna.
- Remove both from casual matchmaking; duplicate accepts create no second game.

### Cancel

- Creator-only, exact-origin POST, open only; deterministic on repeats.

### Share and metrics

- URL: `https://lobby.getdasha.com/chess?challenge=<id>`.
- Concise copy: Dasha has white; invite the opponent to take Anna's side. No price or endorsement copy.
- X intent remains user-controlled.
- Dynamic metadata names the challenger and scene with escaped text.
- Reuse identity-free thresholded counters for created, accepted and share intent only if cleanly
  supportable. They are events, not people, purchases, conversion or causality.

## Interface and thematic direction

- Board remains dominant; header stays Home plus one exact-mint Buy link.
- Reuse the side panel, not a new page/modal stack.
- Near the existing cup tool, provide one concise `Challenge` action.
- A challenge deep link shows one valid next action: Accept for qualified opponent, Share/Cancel for
  creator, or the existing X/holder gate for everyone else.
- Theme through Dasha-white/acid versus Anna-black/blue state and concise typography. No photos,
  caricatures, quotes, endorsements, sounds, animated backgrounds, or lore paragraphs.
- Maintain 44px targets, safe areas, 320px no-overflow, contrast, reduced motion and thumb reach.

## Security and concurrency proof

Prove:

- public IDs are unguessable but never authentication;
- every mutation requires origin/session and each holder action rechecks proof;
- public JSON has no `xId`, wallet, balance, session, rate key or secret beyond public ID;
- simultaneous accepts create one game;
- creator cannot be casually matched after create; accepter exits queue;
- tournament participants cannot enter challenges;
- server-time expiry persists; identity deletion invalidates owned challenges;
- challenge state counts toward storage budget and alarm cleanup;
- malformed methods/actions/IDs/bodies fail 4xx;
- user strings never enter `innerHTML`; metadata is escaped;
- wrong-side and stale-version moves remain rejected.

## Test matrix

Server:

- create requires X/profile/current holder/origin; exits queue; reuses open link;
- inspect leaks no identity keys;
- self/nonholder/active-game/tournament accepts fail;
- accept makes one game with creator white and accepter black; double accept makes no duplicate;
- cancel authorization, expiry, alarm cleanup and identity deletion;
- resulting move, clock, draw, resign, rating, replay and rematch paths remain green;
- metrics suppress below five and contain no identities.

Browser:

- anonymous deep link shows exact challenge and Link X gate;
- qualified holder can Accept; creator sees Share/Cancel rather than Accept;
- share contains exact URL and sides; accepted response opens the game;
- offline challenge recovers exact invitation;
- 320, 390 and 1440 have no overflow or serious/critical axe violations;
- replay Left/Right/Home/End work without hijacking inputs;
- loaded replay position survives hide/show; failed replay retries online;
- no page errors or duplicate successful events.

Release:

- focused engine, Worker, page, privacy, metadata and audit tests;
- asset build/check and exact hash;
- full `npm run dasha:test:all` and scoped `git diff --check`;
- deploy Worker/assets first;
- verify `/health`, Chess, metrics, six public routes, sitemap, robots, metadata, mint links and hash;
- publish Webflow only if its artifact differs and authentication works; report any block honestly.

## Stop condition

Stop only after the coherent release is built, trust boundaries have direct evidence, browser matrices
pass, assets are current, full Dasha gates are green, authorized deployment is live, and public readback
matches disk. Delete or defer anything that harms the clean board, privacy, legal chess, accessibility,
server authority, or exact deep-link loop.

## Research-backed continuation release

Treat direct challenges, rematches, tournaments, clocks, rating, replay, native image sharing, and
deep-link restoration as the existing baseline. Do not duplicate them. Before making another change,
inspect the current source and prove the missing behavior with a focused test.

Build the smallest coherent continuation:

1. **Orientation-aware board coordinates.** Show file and rank labels at the board edges, derived from
   the already-rendered square order so black orientation remains correct. Labels must be decorative,
   high-contrast, pointer-inert, and must not create 64 more accessibility nodes.
2. **Portable completed-game record.** Offer one secondary `PGN` control only after a game is complete.
   Generate standards-shaped headers and numbered SAN movetext entirely from the public replay/game
   already in memory. Include Event, Site, UTC Date, Dasha-white handle, Anna-black handle, Result, and
   a Dasha/Anna variant label. Escape header values and terminate movetext with the result. Use the
   browser's native download path; do not add a server endpoint, database field, library, or analysis
   service.
3. **Thematic accessible move status.** When a move exists, make the live status identify Dasha or Anna
   and the SAN move in concise text. Preserve draw, rematch, check, waiting, and completion priority.
4. **Network recovery.** When the browser is explicitly offline, stop game/tournament polling and clock
   refresh requests, announce that clocks continue on the server, and restore the exact route once the
   browser returns online. Never pause or alter the authoritative clock.

Why this set: FIDE's online regulations require moves and clocks to remain visible and clocks to keep
running through disconnects; the WAI grid pattern supports one tab stop with arrow-key navigation;
WCAG requires programmatically exposed status changes and sufficiently visible controls; Chessground's
documented feature set validates fluid touch/click boards, coordinates, last moves and check; PGN is the
portable artifact that lets a completed Dasha game outlive this interface. Cloudflare's hibernating
WebSockets are the correct later transport only when observed concurrency or polling cost warrants the
migration.

Do not add premoves, drag/drop, analysis, engine evaluation, chat, spectator identity, opening names,
sounds, WebSockets, custom PGN parsing, or decorative animation in this release. They add correctness,
abuse, accessibility, or interface costs without evidence that the current audience needs them.

Continuation tests must prove coordinate orientation at both colors, no coordinate accessibility
noise, valid escaped PGN with paired move numbers and final result, no PGN action during active play,
the Dasha/Anna SAN announcement, offline request quiescence, exact-route online recovery, 320px reflow,
keyboard play, and zero serious/critical accessibility violations. Then rebuild Worker assets, run the
focused Chess suite and full Dasha suite, deploy, and read back the live asset identity.

## Primary references

- [FIDE Laws](https://rcc.fide.com/fide-laws-of-chess_fulltexthtml/)
- [FIDE Online Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations)
- [Lichess server](https://github.com/lichess-org/lila)
- [Chessground](https://github.com/lichess-org/chessground)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)
- [Cloudflare WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Base standard web apps](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
- [Phantom deep links](https://docs.phantom.com/phantom-deeplinks/deeplinks-ios-and-android)
- [WAI ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)
- [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

## Research-to-release pass: the Dasha / Anna scorebook

### Execute this prompt now

Begin from live and disk evidence, not a feature wish list. Read the complete Chess page, engine,
Worker routes, public data shapes, tests, asset builder, Wrangler configuration, and ship scripts.
Inventory what already works before proposing anything. Exercise the current game at 320px, 390px,
desktop, keyboard-only, touch emulation, anonymous replay, linked-player play, offline/reconnect, and
completed-game sharing. Search current primary sources for online-chess rules, established product
patterns, realtime infrastructure, accessibility, and browser sharing. Record the exact source,
retrieval date, useful requirement, and the decision it changes. Never copy GPL implementation code.

Use the following product test for every candidate feature:

1. Does it improve legal play, comprehension, recovery, or an exact public handoff today?
2. Can it reuse the existing authoritative state, SAN, replay frames, deep links, controls, and tests?
3. Does it preserve one dominant board and one obvious next action on mobile?
4. Does it add no new custody, token incentive, identity leak, moderation surface, dependency, or
   unsupported claim?
5. Is there a focused test that fails before the change and proves the user-visible outcome after it?

Reject premoves, engine analysis, opening explorer, chat, wagers, prizes, token-weighted ratings,
spectator identity, custom piece packs, sounds, animations, correspondence, Swiss pairing, a PWA,
WebSockets, and Durable Object reshaping in this release. They are either unsupported by observed use,
create substantial correctness or abuse scope, or solve a scale problem the current metrics do not
show. Keep the server authoritative; do not pause clocks on disconnect; do not add a client chess
library; do not expose wallet or private X identifiers.

Build one coherent scorebook improvement:

- Keep the existing semantic ordered move record visible throughout a game, as required by FIDE's
  online regulations. Preserve SAN as the source of truth and the current Dasha-white / Anna-black
  board theme.
- In a public completed replay, make each move itself a native button that jumps to that exact frame.
  The selected move must be programmatically exposed, visually obvious without relying on color,
  keyboard-focusable, at least 44 CSS pixels on touch layouts, and synchronized with the existing
  range, previous/next buttons, Left/Right/Home/End shortcuts, board, last-move highlight, and polite
  status output.
- Keep the currently viewed replay move scrolled into view. During live play, keep the newest move in
  view after the board updates so a long game never hides its latest record.
- Use concise Dasha/Anna labeling only where it clarifies sides. Do not add lore, quotes, photos,
  tooltips, a second timeline, or extra top-level controls.

Prove the release with focused browser tests: replay move controls exist only for completed replays;
clicking a SAN move renders that frame and updates the range/output; keyboard activation works through
native button semantics; the active item exposes `aria-current`; replay Prev/Next updates that state;
the current move is scrolled into view; live moves remain plain semantic list entries; the scorebook
does not overflow at 320px or introduce serious/critical axe violations. Retain engine perft vectors,
Worker concurrency/security tests, current-holder gates, tournaments, challenge links, clocks,
ratings, PGN, native/X sharing, route metadata, and offline recovery.

Then regenerate the canonical Worker asset bundle, run the focused engine/Worker/page suites, run the
full Dasha gate, inspect the scoped diff for accidental Demigod/game changes, deploy with the existing
ship path, and read back production `/health`, `/chess`, a public replay when available, asset hash,
metadata, console errors, responsive layout, and click behavior. A deploy receipt alone is not proof;
disk, bundle, Worker version, and live asset identity must agree. If any gate fails, fix the root cause
and rerun it. Publish only the verified Dasha artifacts authorized in the current request.

### Additional primary research applied

- [FIDE Online Chess Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations): the move
  list and clocks remain visible; moves and clock times are recorded; clocks continue during a
  disconnect.
- [Lichess features](https://lichess.org/features): challenges, tournaments, studies, and portable PGN
  are mature distinct objects; do not collapse them into one overloaded screen.
- [Chessground](https://github.com/lichess-org/chessground): fluid mobile boards, click moves, last-move
  and legal-destination feedback are established interaction primitives; its GPL code is not copied.
- [Cloudflare Durable Object rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/):
  a game is an atom of coordination and a global singleton is a later scale risk. Do not migrate the
  proven low-traffic release merely to satisfy architecture fashion.
- [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) and
  [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced): announce replay
  position without stealing focus and keep frequent touch controls at 44 by 44 CSS pixels.
- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API): native sharing
  requires transient activation and broad-browser fallback, both retained by the existing share path.

### Fresh research check — 2026-08-09

- [FIDE Online Chess Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations) explicitly
  say that a reconnected player continues with the time remaining on the authoritative clock. Keep the
  current offline notice and exact-route recovery; never pretend that disconnecting pauses play.
- [Lichess blind-mode tutorial](https://lichess.org/page/blind-mode-tutorial) treats portable PGN and a
  simple, navigable game viewer as first-class access to a completed game. This supports the existing
  PGN export and the scorebook's native move buttons before any engine-analysis surface.
- [Chess.com mobile Game Review](https://support.chess.com/en/articles/10328363-how-do-i-use-game-review-on-the-app)
  puts replay, sharing, rematch, and starting another game immediately after completion. Preserve that
  compact ending loop; do not bury it under new modes.
- [Chess.com open challenges](https://support.chess.com/en/articles/8648672-how-do-i-create-or-cancel-an-open-challenge)
  validates a shareable challenge as a distinct matchmaking object. Keep Dasha's exact challenge URL
  and one-open-challenge limit rather than adding friends, DMs, or a second social graph.
- [Chess.com 2026 product direction](https://www.chess.com/blog/thombonbadidom/chess-coms-10-new-years-resolutions-for-2026)
  emphasizes easier connection with friends. For this small community, exact challenge URLs and mutual
  rematches are the weakest sufficient implementation; presence and recommendations remain deferred.

Release decision after this check: ship the tested scorebook, orientation-aware coordinates, PGN,
offline recovery, challenges, rematches, tournaments, and shares as one coherent existing build. Add no
new dependency or top-level control. The next feature must be selected from observed completed games or
failed funnel stages, not competitor completeness.

## Route-integrity release prompt — execute after the scorebook

Audit every Chess URL as a durable product object, not incidental browser state. The canonical public
objects are only the Chess home, one challenge, one tournament, and one completed game at an optional
replay ply. A route must never claim to represent two of those objects at once. Preserve the existing
priority that a valid `game` route opens the replay, but once replay state is known, rewrite browser
history to the weakest complete representation: `?game=<bounded-id>` at the final position or
`?game=<bounded-id>&ply=<clamped-integer>` at any other position. Discard stale `challenge`,
`tournament`, campaign, and unknown parameters from that browser entry. Do this in the existing shared
replay-render function so the range, move-list buttons, previous/next controls, and keyboard shortcuts
cannot diverge. Keep `replaceState`; replay browsing must not flood Back history.

Prove that a mixed inbound URL resolves to one replay, becomes clean after load, preserves the selected
ply across reload, omits `ply` at the final frame, and produces the same exact URL in native/X sharing.
Retain server canonical metadata on the durable game URL without a ply. Do not add a router, redirect
endpoint, analytics parameter allowlist, URL helper abstraction, dependency, or another visible
control. This is a correctness and privacy repair, not a new navigation system.

The release remains bounded by the full trust contract: no wallet retention, no balance-weighted
rating, no reward for trading or social engagement, no unsupported fair-play claims, no engine
analysis, and no speculative realtime rewrite. Run the focused browser suite, rebuild the one Worker
asset bundle, run the complete Dasha gate, inspect the scoped diff, deploy through the existing Dasha
ship path, and require live asset-hash readback before calling publication complete.
