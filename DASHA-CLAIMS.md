---
status: reference
last_verified: 2026-08-08
---

# Dasha claims ledger

Public copy uses the narrowest supported statement. “Project authority,” token control, account control, endorsement and safety are separate claims.

| ID | Claim status and evidence owner | Allowed public wording | Do not infer |
|---|---|---|---|
| **C1 PROJECT_AUTHORITY** | Operator-provided project fact: developed by John Potter with @perryalpha, working directly with Dasha. Owner: `DASHA-PRODUCT-BRIEF.md` | That exact relationship, when the context needs it | Token control, account control, endorsement of a token purchase |
| **C2 ASSOCIATED_MINT** | Associated Solana mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`. Owners: release contract and mint consistency gates | Show the full address; “associated mint” | “Safe,” “guaranteed,” or control of the deployer wallet |
| **C3 TOKEN_CONTROL** | Unestablished | No public claim | Ownership, deployer access, supply control or authority to promise outcomes |
| **C4 ACCOUNT_CONTROL** | `@dash_eats` is a public source used for links and media discovery; project control is unestablished | Link or attribute a specific public post | That the project controls the account |
| **C5 ENDORSEMENT** | No blanket endorsement claim is established | No public endorsement claim | That Dasha endorses the token, a purchase or third-party media |
| **C6 STUDIO_MEDIA** | Registered sources and rights notes live in `dasha-studio-media.json`; project-drawn assets have the separate kit license | Source attribution and the exact Studio rights notice | That third-party photos are CC0 or project-owned |
| **C7 STUDIO_PRIVACY** | User uploads and editable state are processed locally; opening the gallery fetches registered remote images | “Your upload stays in your browser” | “Nothing leaves the browser” or that remote hosts receive no request |
| **C8 HOLDER_BADGE** | A dated signature can establish a positive raw balance at one finalized observation; it scores zero and publishes no wallet or balance | That narrow point-in-time badge description | Continuous holding, identity, Sybil resistance, rank or financial status |
| **C9 SIMP_POINTS** | Explicit opt-in through Join or X-linked quiz submission; fixed server-scored quiz, automatic events and reviewed public GitHub work; manual evidence submission is disabled | “Opt-in,” “measured,” the quiz’s one-attempt terms, and the disclosed editorial Perry row | Airdrop entitlement, payment, purchase score, objective human worth or unreviewed X activity |
| **C10 SWAP_LINKS** | Jupiter and other market destinations are external services; Dasha does not custody a swap | “Buy on Jupiter” or “Open Jupiter” with the exact mint | Safety, execution quality, return, availability or project custody |

## Enforcement

Run `npm run dasha:test:docs` for claim-language coherence and `npm run dasha:test:growth` for mint and buy-route consistency. Unestablished claims remain absent; repetition does not promote them into evidence.
