# Talent Engineering Research + Site Ship — 2026-07-10

**Agents:** Grok (research/build/publish) · Claude Sonnet (review authority)  
**Phase:** retired setup framing

## Research (cited)

1. **a16z Talent Engineer Fellowship** (Jun 18, 2026) — engineer who recruits; many-to-many matchmaking; judgment over spam tooling; builds agents/graphs/workflows.
2. **Kim & Pergler, SMJ 2025** — firm-driven search ↑ hire likelihood, ~77% higher quit risk; candidates dial down own search.
3. **Bidwell, ASQ 2011** — external hires paid ~18–20% more, weaker early performance, higher exit.
4. **Gale–Shapley / Roth** — two-sided stable matching; employer-only optimize → unstable.
5. **Industry contingency** — 15–25% first-year base (~20% median); Demigod 10%.

Full synthesis: `docs/DEMIGOD-TALENT-ENGINEERING-RESEARCH.md`

## Positioning (approved thesis)

Demigod = **human matchmaking layer** for SF startups: systems exist to earn the human conversation; mutual yes + 90-day outcome counters firm-driven retention risk; 10% fee is secondary to fit.

## Shipped

| Asset | Detail |
|-------|--------|
| foot **v176** live | CDN `8tjw79.js` — mutual-yes FAQ, 15–25% honesty, judgment trust copy, privacy de-hype |
| foot **v177** disk | Softens 90-day guarantee until payments + placement (Claude flag) — catbox reupload returning 0-byte; retry later |
| Events | `https://files.catbox.moe/m22wy3.html` research FAQs |
| GTM | `RESEARCH-DM-SNIPPETS-2026-07-10.md`, TOP3 + 8 ready-emails research hook |
| Gates | source PASS, smoke 177 disk, board OK, loop-state v177, metrics 115/100 live v176 |

## Claude review (Sonnet)

- Approve v176 honesty overall.
- Flag: hard “90-day replacement guarantee” before real placements/payments → fixed on disk as v177.
- Next: **GTM human DMs**, not more code.

## Human next

1. Send `demigod-outreach/SEND-PACK-TOP3.md` → `node demigod-dm-mark-sent.mjs --name=…`
2. Douglas call **2026-07-14 13:30 PT**
3. Agent: retry catbox for v177 when healthy; do not invent pilots
