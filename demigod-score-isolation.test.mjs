#!/usr/bin/env node
// D-005 / D-012: company research is sidecar EVIDENCE. It may inform human review; it must never
// influence the automated score, reasons, match decision, or resulting review state.
import assert from 'node:assert/strict';
import { decideMatch } from './demigod-matching-engine.mjs';

{
  const role = {
    id: 'role-1', title: 'Founding Engineer', skills: 'typescript, postgres',
    comp: '$180k-$220k', 'work-location': 'sf-hybrid',
  };
  const candidate = {
    id: 'cand-1', 'skills-stack': 'typescript, postgres, react',
    experience: 'shipped a billing system', 'salary-expectation': '$190k-$210k',
    availability: 'now', 'sf-bay': 'yes',
  };
  const first = decideMatch(role, candidate);
  // Attaching research-shaped fields to BOTH inputs must not move the result. If scoring ever
  // starts reading them, these two calls diverge and this assertion fails.
  const withResearch = decideMatch(
    {
      ...role,
      research: { status: 'verified_with_conflict' },
      companyResearch: { fields: { productCategory: { value: 'fintech' } } },
      companyEvidence: { confidence: 1 },
      quarantineHiring: true,
    },
    {
      ...candidate,
      research: { status: 'verified' },
      companyResearch: { status: 'verified' },
      companyEvidence: { confidence: 0 },
      quarantineHiring: true,
    },
  );
  assert.deepEqual(withResearch, first, 'research-shaped input must not change the match decision');
}

console.log('score isolation (D-005/D-012): all cases PASS');
