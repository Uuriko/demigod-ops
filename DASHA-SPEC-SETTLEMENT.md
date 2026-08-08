---
status: historical
superseded_by: DASHA-PRODUCT-BRIEF.md
archived: 2026-08-08
---

# Spec — automatic settlement, and how the two products become one

> Scrapped Thesis Card/settlement direction. Historical research only; do not implement.

Written 2026-08-06. Every data claim below comes from a live fetch made while writing this,
not from documentation.

---

## 0. The finding that shapes everything

I fetched `api.dexscreener.com/latest/dex/tokens/<mint>` for the candidate mint. HTTP 200,
1520 bytes, no key required. What it returns:

```
priceUsd  "0.00005323"        liquidity  {usd, base, quote}
marketCap 53234               volume     {m5, h1, h6, h24}
fdv       53234               priceChange{m5, h1, h6, h24}
pairCreatedAt 1738596555000   txns       {m5, h1, h6, h24}{buys, sells}
```

**There is no historical series. None.** Only the current snapshot plus rolled-up windows,
and the longest window is 24 hours. There is also **no holder count**.

Two consequences, both immediate:

1. **"X for seven consecutive days" is not checkable** from this feed. Duration conditions
   need history the feed does not have.
2. **My own worked Example 02 is not settleable** — it uses holder count, which is not in
   the feed at all. That example is still fine as free text; it just cannot be automated,
   and I should not have assumed otherwise.

---

## 1. The architectural conflict, stated plainly

Settling *"below X for seven days"* requires somebody observing across those seven days.
Something must run while the user is away. That directly contradicts the Card's strongest
promise, which appears on the page three times:

> Nothing leaves your browser. There is no account and no wallet prompt.

That promise is a real reason to trust the tool. It cannot be quietly dropped to make a
feature fit.

### The options, with what each costs

| | Approach | Cost |
|---|---|---|
| A | **Local only** — the browser keeps your cards and checks them when you come back | Settlement happens only on return. No server, no account, promise intact. |
| B | **Server watcher** — we poll and settle on schedule | Breaks the promise, needs infra, storage, and a privacy policy. Now we hold user claims. |
| C | **Public artifact** — publish the card so anyone can check it | No settlement UI at all; we provide the format, the crowd provides the enforcement. |

### Recommendation: **A**, with one change to the condition grammar

Local-only works far better than it first appears, because of a distinction that is easy to
miss:

- *"Liquidity below $15k **for seven consecutive days**"* — needs history. **Not checkable.**
- *"Liquidity below $15k **at the seven-day mark**"* — needs one snapshot, taken at the right
  time. **Checkable, with no server at all.**

Point-in-time conditions collapse the entire infrastructure requirement. The check is a
single read of a public endpoint at the moment the user returns.

And the limitation is *on thesis* rather than a compromise: **coming back to settle is the
accountability behaviour.** A tool about honouring your own conditions should require you to
show up and honour them. A card whose author never returned is not a gap in the product —
it is a result, and it should be displayed as one.

The privacy line needs a small, honest correction under A. Not "nothing leaves your browser"
— settling reads a public feed. The true version is narrower and still strong:

> No account, no wallet, and nothing you write is ever uploaded. Settling a card reads a
> public price feed — that request contains the token address and nothing about you.

---

## 2. The credibility problem settlement does *not* fix — and a free fix for it

Auto-settlement makes the product alive. It does **not** make it credible, because the
timestamp is still local and unverified. An auto-settled result still rests on an unproven
claim about *when* the call was made. Settlement without a trustworthy timestamp answers
"did the condition fire" but never "did you really say it first."

**The share button is already the answer.** Posting the card publicly — X, or anywhere with
a public post time — gets the claim timestamped by a third party nobody controls. The
SHA-256 already binds the text: the post proves *when*, the hash proves *what*, and neither
requires a server, a chain, or an account.

That reframes the product in one sentence, honestly:

> Write the call, post it, and the post is the timestamp. The checksum proves the words
> have not changed since.

This costs nothing to build. It is a copy and flow change, and it is a bigger credibility
unlock than settlement is.

---

## 3. Condition grammar — small, and every type maps to a proven field

Only these, because only these map to fields the fetch above confirmed exist:

| Type | Field | Example condition |
|---|---|---|
| `price_below` / `price_above` | `priceUsd` | price under $0.00004 at the 7-day mark |
| `mcap_below` / `mcap_above` | `marketCap` | market cap under $40k at the 30-day mark |
| `liq_below` / `liq_above` | `liquidity.usd` | liquidity under $15k at the 7-day mark |
| `vol24h_below` / `vol24h_above` | `volume.h24` | 24h volume under $10k at the 7-day mark |

Each is `{type, field, comparator, threshold, horizon}` — evaluated **at horizon**, never
across it.

Deliberately excluded, and why: holder count and any duration-based condition, because the
feed carries neither. Adding them would produce confidently wrong settlements, which on a
product about accountability is far worse than settling nothing.

**Free text stays first class.** It is the honest majority of what people actually write —
"the team stops shipping" is a good invalidation and no feed will ever check it. Structured
conditions are an *option* alongside the text, not a replacement, and the UI must not make
free text look like the lesser choice.

---

## 4. Settlement states

```
PENDING          horizon not reached
INVALIDATED      checked at horizon; the condition fired
HELD             checked at horizon; it did not fire
UNSETTLED        horizon passed, never checked — the author did not come back
UNKNOWN          checked, but the answer could not be established
```

`UNSETTLED` is the most valuable state in the product and every competitor hides it. Show it.

`UNKNOWN` exists so that "we could not tell" is never silently rendered as success or
failure. It is the outcome when: the feed is unreachable, the mint returns no pairs (delisted
or never listed), or the response is missing the field the condition needs. Each of those
must produce `UNKNOWN` with the reason attached — never a default.

Transitions are one-way. Once a card is settled it is never re-settled, or a later price
move could silently rewrite a past result, which is precisely the behaviour this product
exists to prevent.

---

## 5. How this makes the two products one

Today the Desk has live token data and the Card has conditions that need checking, and they
do not know about each other.

The join is one field: **the mint address**, which the Card already collects and the Desk
already tracks.

- The Card gains teeth: conditions get checked rather than self-reported.
- The Desk gains a reason to return: a public record of calls made on `$dasha` and how they
  settled.
- Together they stop being a meme page and a form, and become **the place where calls get
  settled instead of spun.**

**Score the process, not the outcome.** From the Tetlock research: accountability for
outcomes people do not control produces escalating commitment to bad calls — the exact
pathology this is meant to fix. So the public record shows *did you state an invalidation
and did you honour it*, never *were you right*. A leaderboard of who was right recreates
the disease.

---

## 6. Ownership and sequence

`dasha-desk` is Grok's lane and this touches its data layer. This document is a spec, not an
edit; nothing in that repo was changed.

Recommended order, cheapest and highest-leverage first:

1. **Post-as-timestamp** (§2) — copy and flow only, no infrastructure, biggest credibility gain.
2. **Structured conditions + local settlement** (§3, §4) — no server, promise intact.
3. **Public record on the Desk** (§5) — needs a decision about where settled cards live.
4. **Server-sealed timestamps** — only if 1 proves insufficient. Do not start here.

**Decide first:** whether the privacy line can move from *"nothing leaves your browser"* to
the narrower true statement in §1. Everything downstream depends on that one call, and it is
the user's to make.
