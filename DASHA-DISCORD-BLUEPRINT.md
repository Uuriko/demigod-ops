# Dasha Discord blueprint

Updated: 2026-08-06

## Purpose

The Dasha Discord will be the official community and product home for:

- `$dasha` culture and memes
- Dasha Desk support and source verification
- Dasha Thesis Card testing
- Future community Rounds and resolution recaps
- Builder coordination

It is not a trading-signals server, wallet-support desk, token-gated investment club or substitute for X distribution.

## Minimum launch structure

### START HERE

- `#welcome` — what Dasha is and is not
- `#official-links` — the only canonical mint, website, X and Discord invite
- `#rules-and-safety` — no-DM, no-seed-phrase and anti-impersonation rules
- `#announcements` — admin-only product and community updates

### COMMUNITY

- `#general`
- `#memes`
- `#dasha-desk` — site feedback and verification questions
- `#thesis-cards` — cards, counter-theses and resolved examples
- `#spaces-and-rounds` — scheduled X Spaces and community forecast rounds

### BUILDERS

- `#build-log` — read-only public progress
- `#ideas-and-feedback`
- `#bug-reports`

### MODERATION

- private `#mod-log`
- private `#reports`
- private `#incident-response`

No extra channels at launch. Empty channel trees make the server feel abandoned and multiply moderation surfaces.

## Roles

| Role | Purpose | Key permissions |
|---|---|---|
| Admin | Server ownership and configuration | Full; use hardware-backed 2FA |
| Moderator | Safety and community operations | Timeout, delete, ban, manage threads; no server ownership |
| Builder | Product contributors | Builder channels; no moderation power by default |
| Member | Normal participation | Standard community channels |
| New | First-day/restricted member | No embeds or external links until basic verification/age threshold |
| Bot | Native or reviewed automation | Least privilege, never administrator |

Do not create token-holder, whale, alpha or paid roles initially.

## Non-negotiable safety copy

Place this in `#welcome`, `#official-links` and `#rules-and-safety`:

> Dasha staff and moderators never DM first, never ask for a seed phrase or private key, never ask you to “verify” a wallet in DMs, and never send surprise mint or trading links. The only official links are in #official-links. Report impersonators publicly or through the server report flow.

Additional rules:

- No coordinated pumping, wash trading or guaranteed-return claims.
- No unsolicited DMs, referral spam or paid promotion without disclosure.
- No wallet-drainer, shortened or disguised links.
- No doxxing, harassment or impersonation.
- Full mint address required when discussing a token; symbol alone is insufficient.
- Conflicts, token holdings, payments, gifts and referral revenue must be disclosed with relevant promotional posts.

## Native Discord controls

- Require moderator 2FA.
- Enable Community, Rules Screening and the highest verification level compatible with onboarding.
- Use Discord AutoMod for mention spam, scam phrases and malicious-link patterns.
- Restrict new accounts from posting embeds and links.
- Disable `@everyone` and `@here` mentions for normal members.
- Keep bot permissions minimal; avoid third-party wallet-verification bots at launch.
- Maintain a visible report and appeal flow.
- Log every moderation action and reason.

## Bot boundary

The first server does not need a custom bot.

A future Dasha bot may:

- post new public Thesis Card rounds;
- announce cutoff, reveal and resolution;
- link to canonical Dasha receipts;
- surface server status.

It must never:

- DM first;
- request wallet signatures, keys or seed phrases;
- accept trading commands;
- promise token access or rewards;
- auto-post user content without confirmation;
- infer that a member owns a token from a claimed address.

## Launch content

The server should not open empty. Prepare:

1. Canonical project explanation
2. Official-link registry with observation date
3. Scam-prevention guide
4. Three Thesis Card examples: bull, bear and invalidated
5. Current build log
6. One first community prompt
7. Named moderation coverage and incident owner

## Relationship to X

X remains the public distribution surface. Discord is the durable home for discussion, support, builders and recurring Rounds. Every Discord link shown on the website must be created and controlled by the Dasha operators; never import a link merely because a DEX profile lists it.

## Creation gate

The user has decided that Dasha will have a Discord server. Actual creation remains pending because no Discord connector or authenticated server-management surface is available in this session. The blueprint is the authoritative setup specification when that surface is available.

