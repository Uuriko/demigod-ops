#!/usr/bin/env node
// An Orca tab title survives the agent that earned it. Reporting that pane as a live
// agent is worse than reporting none: `terminal send` types into bash, which runs it.
// This locks the predicate that decides "agent" vs "idle shell wearing an agent title".
import assert from 'node:assert/strict';
import { tailShowsAgent } from './demigod-orca-bridge.mjs';

// Idle shell — the exact tail Orca returns for a pane whose agent has exited.
assert.equal(tailShowsAgent(['Aliases added: dg-up, dg-publish', 'potter@pop-os:~$']), false);
assert.equal(tailShowsAgent(['root@box:/srv#']), false);
assert.equal(tailShowsAgent(['potter@pop-os:~$ ', '', '  ']), false, 'trailing blanks must not hide the prompt');

// Live agent TUIs.
assert.equal(tailShowsAgent(['• Working (24s • esc to interrupt) » Explain this codebase']), true);
assert.equal(tailShowsAgent(['──⏵⏵ bypass permissions on (shift+tab to cycle)']), true);

// Unknown is not a yes.
assert.equal(tailShowsAgent(null), false);
assert.equal(tailShowsAgent([]), false);
assert.equal(tailShowsAgent(['', '   ']), false);

console.log('orca agent-liveness: 9/9 PASS');
