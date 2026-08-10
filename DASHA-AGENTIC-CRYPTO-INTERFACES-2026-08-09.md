---
status: reference
canonical_for: agentic-crypto-interface-decision-2026-08-09
scope: Dasha agentic payments, machine interfaces and wallet-agent boundary
updated: 2026-08-09
---

# Dasha agentic crypto interfaces — build/no-build decision

## Decision

Do not add x402, MCP, an autonomous wallet, a posting agent or a paid “culture compiler.” Do not yet
publish a Studio agent skill or schema. The existing Studio fragment already performs the only useful
machine job for free and without a server: construct an editable Dasha artifact and hand the same
object to a person. The missing public grammar is real, but it is a discoverability gap without a
demonstrated consumer. Under the project’s evidence rules and Ponytail, a speculative contract is
another surface to version, not current user value.

The next action in this lane is therefore a trigger, not a build: publish the smallest static grammar
only after either (a) an external agent/tool author requests stable construction rules or (b) the
human Relay experiment produces repeated non-operator edits and the recipient asks to automate
creation. If that trigger fires, use one static JSON Schema plus examples. Still do not create a
server, MCP transport, wallet, payment requirement or dependency.

## Current Dasha machine surface

A Studio object is a URL fragment on `https://www.getdasha.com/studio`:

```text
#look=<look>&format=<format>&line=<1..120 characters>
```

Current bounded values are `photo|poster|ticket|print|marquee|signal|face` for `look` and
`square|story|banner` for `format`. Optional `photo`, `effect`, `sticker`, `zoom`, `tilt`, `x`, `y`
and one-hop `pLook`/`pFormat`/`pLine` state are implementation details, not a promised public agent
contract. `arm=flat` deliberately removes the editable URL from sharing. State remains in the URL
fragment, so it is not sent in the HTTP request. It is editable state, not identity, authorship,
permission, provenance or endorsement.

The independently implemented Relay parser reconstructs and validates the bounded recipe without
importing Studio code. On 2026-08-09 both `dasha-relay-lab.test.mjs` and
`dasha-meme-studio.test.mjs` passed across mobile/desktop parsing, validation, lineage and sharing.
This proves semantic implementability. It does not prove external demand or cultural relay.

## Fit test

| Interface | What it is good at now | Dasha input/resource | Result |
|---|---|---|---|
| x402 v2 | Pricing an HTTP resource for programmatic buyers; Solana support uses `@x402/svm` | No scarce server resource; the browser already constructs the output locally | Reject now |
| x402 Bazaar | Discovering paid services with input/output schemas | Nothing to sell per request; discovery would misframe a free URL grammar as a paid API | Reject now |
| MCP | Discovering and calling externally hosted tools with schemas and authorization | No remote action is needed to assemble a Studio link | Reject server; static grammar only on trigger |
| Coinbase AgentKit | Giving agents wallets and onchain actions | Dasha intentionally hands buying to an exact external Jupiter URL and never signs in-origin | Reject wallet integration |
| Solana Agent Kit | Autonomous swaps, transfers, launches and other protocol actions | These are commodity financial actions, not Dasha’s differentiated creative job | Reject integration |
| Plain URL fragment | Deterministic, browser-native, free, portable state | Exact fit for editable Studio recipes | Keep |

## Why x402 is not the opportunity

The x402 v2 flow is valuable when a resource server can return `402 Payment Required`, describe a
payment in `PAYMENT-REQUIRED`, verify a client’s `PAYMENT-SIGNATURE`, perform scarce work and return
the resource with settlement evidence. Dasha has no such work. Charging for a URL that any client can
construct would be rent on syntax, not product value.

Current research also weakens transaction count as a reason to chase the protocol. A July 2026
population study finds extreme concentration and a large manufacturable/internal component in x402
settlements; count is not independent demand. Separate 2026 analyses identify context-binding,
atomicity, duplicate-settlement, facilitator and execution-conservation risks. These findings do not
make x402 useless. They increase the burden of proof for adding it to a project that presently has
neither a paid resource nor an independent buyer.

## Why MCP and wallet agents are not the opportunity

MCP standardizes discovery and invocation of external tools. A Dasha MCP server with one
`make_studio_link` function would replace a native URL constructor with a remote dependency and
ongoing protocol/version ownership. Cloudflare’s current guidance itself emphasizes progressive
discovery and small tool catalogs because tool schemas consume model context; a single deterministic
string operation does not need transport-level discovery.

Wallet agents solve a different problem. Coinbase AgentKit and Solana Agent Kit expose broad wallet,
swap, token, lending and protocol actions. Adding one would move Dasha from a script-free exact-link
handoff into private-key custody, permissions, simulation, transaction approval and supply-chain
security. It would not make Studio creation better and would contradict the current trust boundary.

## Reconsideration contract

Reconsider a static Studio grammar when there is one named external consumer and one reproducible
construction failure caused by missing documentation. Then publish only:

1. one versioned JSON Schema for the stable `look`, `format` and `line` subset;
2. three valid example URLs and three invalid fixtures;
3. a statement that the fragment is editable state, not provenance;
4. one parity test against the Studio and Relay parsers.

Reconsider MCP only when Dasha owns a remote operation that cannot be expressed as a URL and at least
two independent clients need to invoke it. Reconsider x402 only when that remote operation has real
per-request cost or scarcity and independent buyers have already requested paid access. Reconsider a
wallet integration only as a deliberate product pivot with a new threat model, never as homepage or
Studio polish.

## Primary and academic sources

- [Coinbase x402 overview](https://docs.cdp.coinbase.com/x402/welcome) and
  [v2 migration/specification guide](https://docs.cdp.coinbase.com/x402/migration-guide)
- [x402 Foundation reference repository and specification](https://github.com/x402-foundation/x402)
- [Solana x402 overview](https://solana.com/x402/what-is-x402)
- [Model Context Protocol](https://modelcontextprotocol.io/) and
  [Cloudflare MCP tool guidance](https://developers.cloudflare.com/agents/model-context-protocol/protocol/tools/)
- [Coinbase AgentKit](https://github.com/coinbase/agentkit)
- [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit)
- Ling et al., [How Agentic Is Agentic Commerce?](https://arxiv.org/abs/2607.12575), 2026
- Ling et al., [Free-Riding in the AI Economy](https://arxiv.org/abs/2605.30998), 2026
- Jin et al., [The Web4 Agent Economy](https://arxiv.org/abs/2606.25876), 2026
- Li et al., [A402: Atomic Service Channels](https://arxiv.org/abs/2603.01179), 2026
