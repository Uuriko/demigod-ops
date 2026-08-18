# Dasha Chess — look, play, and features

Working spec for `/chess`. Job: **1v1**. Invite link or sit down and play. Not a growth farm.

Live is still the last Worker ship. This file is what disk must satisfy before the next chess publish.

## Job

| Mode | Who | What |
|---|---|---|
| Practice | Anyone, no account | Play as Dasha (white) or Anna (black). Same engine as rated. No clock, no rating, no network. |
| Challenge | Anyone can *open* the link | Creator is Dasha (white). Friend who opens `?challenge=` takes Anna. Rated only after both are linked holders. |
| Rated queue | Linked holder | Find match. 10+5. Public result. |
| Replay | Anyone | `?game=` walks the finished game. Share + PGN after it ends. |

Dasha is always white. Anna is always black. That is the variant name, not a claim about people.

## Look

- Ink `#08070a`, paper `#f5eedf`, acid `#dfff00`, hot `#ff3b81`, Anna `#72d6ff`.
- Type: Arial / Helvetica 900. Hero “DASHA VS ANNA”. No second display face.
- Geometry: pills or 0px. 4px hot offset on primary. Board 2px paper, hot shadow.
- Practice board: bone / oxblood (Giallo). Rated board: bone / mauve.
- Thumb: primary ≥ 48×48. No hover-only path to play or copy.
- First HTML is honest. **Banned:** disabled “Wait” / “Checking your seat…” as the first thing a person reads.

## First paint / first scroll

When the board comes into view, these are already there (JS-off counts):

1. The starting position.
2. **Play as Dasha** and **Play as Anna**.
3. **A challenge link field + Copy**, filled with `https://lobby.getdasha.com/chess` until a private table exists.
4. Hint: whoever opens a *table* link takes Anna.

Home grows a `#chess-door` you scroll to: one sentence, Copy challenge link, Open chess. Not a second board.

## Shareable challenge link

- One URL, one table: `https://lobby.getdasha.com/chess?challenge=<id>`.
- Copy is fail-closed (write, then read-back). Never invent “Copied”.
- Fallback is select-the-field + “press Ctrl/Cmd+C”. Never open a public X composer for a private table.
- Holder: Copy creates or reuses the open table, then copies that URL.
- Not a holder: Copy still copies the chess door URL so the friend lands on a playable board. Hint says a private table needs Link X.
- Creator reuses one open challenge (server already does this). Do not mint a new id on every click.

## Play (practice)

- Click or keyboard (one tab stop, arrows). Legal dots / capture rings.
- Last move and check marked the same way as rated (Dasha/Anna labels, not white/black).
- Illegal move refused. Opponent replies. Undo rewinds a full exchange.
- Resign, New game, switch colour after a finish.
- Move list is selectable text (1. e4 g6). Sidebar Moves must not stay “The board is quiet” during a local game.
- Promotion picker on the board, not a surprise dialog only.

## Play (rated)

- Clock 10+5, both sides, urgent under 30s.
- Draw offer after two plies. Resign confirm. Rematch. Push + poll floor.
- Share / PGN only when finished. Replay `?game=` + ply.
- Holder proof: one signature, no tx, 24h. Wallet discarded.

## Must not

- Telegram, points for buys/likes/referrals, “safe” / official token.
- Forum door. `/graph`. Soft 8px chrome.
- A second chess engine.
- Guest rated games (ratings stay on linked X).

## Checklist

- [x] First HTML: invite row visible, play buttons visible, no Wait.
- [x] Home `#chess-door` copies the chess URL; Open goes to `/chess`.
- [x] Copy read-back fail-closed (chess invite + home door).
- [x] Practice: e2 offers 2, 1.e4 applies, illegal e4-e3 refused, Anna replies.
- [x] Practice as Anna flips the board.
- [x] Undo / resign / new game.
- [x] Challenge URL shape `?challenge=` 6–24 url-safe (existing worker).
- [x] Acceptor sees “takes Anna”; creator is Dasha white (existing flow).
- [x] Mobile 390 and desktop 1440: no horizontal overflow, 48px controls.
- [x] `dasha-chess-local.test.mjs` and `dasha-chess-rules.test.mjs` green.
- [ ] Live Worker/Webflow ship — prepared on disk only.
