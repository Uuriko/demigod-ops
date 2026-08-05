# Does Bennett's weakness result transfer to Demigod?

Assessment run against the prompt Codex produced for arXiv:2301.12987v4 —
Michael Timothy Bennett (ANU), *"The Optimal Choice of Hypothesis Is the Weakest,
Not the Shortest."*

---

## Verdict

**HEURISTIC TRANSFER ONLY.** Confidence: high on the negative half (the formalism
does not transfer), moderate on the positive half (the razor is a real but modest
reasoning discipline, and Demigod already implements most of it).

Attempting the formal version would produce a cardinality number attached to a
hypothesis about a candidate. That is a score under any honest reading, and it
would collide with `structured_hiring_no_score`
(`demigod-control-board.mjs:502`). Renaming it "weakness" to slip past the poison
check would be precisely the dishonesty that control exists to catch.

**Claims that may be made:** that Demigod's review notes follow a
least-specific-defensible discipline consistent with Bennett's Razor.

**Claims that may NOT be made:** that Demigod maximises \|Z_h\|, that its matching
is optimal or generalisation-maximising, or that any theorem-level guarantee from
this paper applies to it.

---

## What the paper actually establishes

Proved, given the paper's formalism:

- **Prop 1 (sufficiency, p.4–5).** Weakness is sufficient to maximise
  P(induction generalises α→ω). The probability is
  `p(h∈M_ω | h∈M_α, α⊑ω) = 2^|Z̄_Sα ∩ Z_h| / 2^|Z̄_Sα|`, maximised when `|Z_h|` is.
- **Prop 2 (necessity, p.5).** To maximise that probability it is necessary to use
  weakness, or a function thereof.
- **Prop 3 (p.6).** Description length is neither necessary nor sufficient. Proved
  by explicit counterexample: a vocabulary and task where weakness selects `{j,k}`
  and MDL selects `{z}`.
- **Bennett's Razor (p.8).** *"Explanations should be no more specific than
  necessary."*

Assumptions, and this is where transfer dies:

1. **Def 4: uniform distribution over Γ_𝔳.** Both propositions rest on it. The
   paper is explicit in its conclusion — *"if tasks are uniformly distributed,
   then weakness maximisation is necessary and sufficient"* — and concedes
   *"another proxy may perform better given cherry-picked combinations of child and
   parent task."*
2. **Enactive-cognition formalism (Def 1–3).** Requires a set Φ of states,
   declarative programs `f: Φ → {true,false}`, and a *finite* implementable
   language `L_𝔳` whose statements have enumerable extensions `Z_l`.
3. **Finiteness.** 𝔳 finite ⇒ `L_𝔳` finite ⇒ `p` computable. The result is not
   stated for open-ended domains.

Author interpretation, not proved: that this explains DeepMind's Apperception
Engine, and the broader claim about compression and intelligence.

Experimental evidence is narrow: 8-bit string prediction, binary addition and
multiplication, `|D_k|` from 4 to 14, 75–256 trials. Generalisation rate for `c_w`
was 110–500% of `c_mdl`; extent 103–156%. Toy arithmetic with known ground truth —
not human judgement.

---

## Demigod mapping

| Paper object | Demigod counterpart | Evidence |
| :--- | :--- | :--- |
| situation `s ∈ S_α` | a role brief + a candidate profile | `demigod-matching-engine.mjs` `matchEvidence(role, candidate)` |
| hypothesis `h` | a human's reviewed judgement that an intro is worth making | `demigod-role-packet` — "evidence-required review notes; no AI verdict" |
| extension `Z_h` | **no counterpart** | see below |
| decision `z ∈ D_α` | mutual-yes intro | `DEMIGOD-SIMPLE.md` — "mutual yes"; `pairs-lib` consent path |
| task distribution Γ_𝔳 | **no counterpart, and known non-uniform** | strategy research §3: senior AI engineers hold 5 offers, entry-level down 73.4% |
| ground truth `D_n` | **none exists** | control board: `pairs_has_real real=0 sample=0` |

Unknown from the repository: whether any completed placement outcome has ever been
recorded. `acceptedForDelivery=0` says no.

### Why `|Z_h|` has no counterpart

`matchEvidence` returns a list of prose strings — `"self-reported skills: …"`,
`"compensation alignment needs review"`, `"availability unconfirmed · reconfirm
before introduction"`. There is no Φ, no declarative program, no lattice, and
nothing whose extension can be counted. `|Z_h|` is not definable here, let alone
finite, observable, or decision-relevant.

Constructing one would mean formalising candidate and role attributes into an
implementable language and counting extension cardinality per hypothesis. The
output of that construction is a number per candidate-role pair. That is a score.

---

## Transfer test — three interpretations

**(A) The theorem transfers substantially. — REJECTED.**
Requires uniform task distribution (Def 4), a finite implementable language, and
enumerable extensions. All three fail. SF hiring is the opposite of uniform, and
the paper itself says non-uniform distributions void the necessity/sufficiency
result. Distinguishing prediction would be that weakness-maximising selections
generalise better across roles; no data exists to test it because no outcomes have
been recorded.

**(B) Only the reasoning heuristic transfers. — ACCEPTED.**
Bennett's Razor — *no more specific than necessary* — is a discipline about
claim-making, independent of the maths. Extra assumption required: none. It is
already substantially implemented: `matchEvidence` attributes rather than asserts
("self-reported"), and emits `"needs review"` instead of resolving a judgement it
cannot support. Cheapest discriminating evidence: read the emitted review notes
and check whether any claim is more specific than its evidence. Already true today.

**(C) The transfer is misleading. — PARTIALLY ACCEPTED, as a live risk.**
Not because the razor is wrong, but because importing the vocabulary invites two
errors: (i) building the cardinality metric and calling it weakness rather than a
score; (ii) conflating this with Ponytail. Both are addressed below.

---

## The Ponytail conflation — the real hazard

`DEMIGOD-SIMPLE.md` mandates Ponytail for all agents: *"write code like a lazy
senior (YAGNI → reuse → stdlib → native → min)."* This paper's title says the
shortest hypothesis is the **wrong** choice. In a repo where both are canonical,
someone will read them as contradicting.

They do not, and the distinction matters:

- **Ponytail is about code.** An engineering-cost argument: less code is cheaper to
  maintain and has fewer defects. It concerns *form*.
- **Bennett is about hypotheses.** A generalisation argument: the least-specific
  claim consistent with evidence is likeliest to hold on unseen cases. It concerns
  *extension*.

Bennett states this himself (p.8): *"Weakness should not be conflated with
Ockham's Razor. A simple statement need not be weak, for example 'all things are
blue crabs'. Likewise, a complex utterance can assert nothing. Weakness is a
consequence of extension, not form."*

Practical rule: **Ponytail governs the diff. Bennett's Razor governs the claim.**
Write the shortest code; assert the least-specific defensible thing. A short
review note that over-claims violates Bennett. A long one that carefully attributes
does not.

---

## Smallest defensible application

None in code. The defensible content is already implemented:

- `matchEvidence` attributes every claim to its source ("self-reported")
- it emits `"needs review"` rather than resolving under-evidenced comparisons
- `demigod-role-packet` — "no AI verdict"
- `demigod-call-note` — "no score; never auto-changes pair"
- `structured_hiring_no_score` enforces the boundary mechanically

Per step 8 of the prompt — prefer documentation over new code — the deliverable is
this file plus the Ponytail/Bennett distinction above. **No source edits made.**

---

## Discriminating pilot

**Not currently possible, and saying so is the honest result.**

The pilot would compare a weakness-style (least-specific) review note against a
more restrictive one, measured against outcomes. Demigod has no outcomes:
`pairs_has_real real=0 sample=0`, `acceptedForDelivery=0`. There is no
retrospective evidence set.

Human decisions cannot substitute for ground truth — that would make the pilot
circular, and the prompt explicitly forbids it.

Earliest point this becomes testable: after enough recorded real placements to
compare note-specificity against retention. Given the referral-retention finding
(10–30% lower quit rate, Burks et al. 2015), retention is the natural outcome
variable. That is many placements away.

---

## Residual uncertainty

- I read pp.1–8 of v4. Appendices are on GitHub and unread; they may bear on
  whether the formalism admits non-uniform distributions.
- Whether a defensible non-score formalisation of `|Z_h|` exists is not something I
  can rule out absolutely — only that I could not construct one that survives
  `structured_hiring_no_score` honestly.
- The claim that `matchEvidence` never over-claims is from reading its evidence
  strings, not from an exhaustive audit of every output path.
