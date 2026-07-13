#!/usr/bin/env node
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isSeedRole,
  ledgerRoleNote,
  ledgerRoles,
  appendPilot,
  latestReceipt,
} from './demigod-board-lib.mjs';

describe('demigod-board-lib', () => {
  it('flags seed roles', () => {
    assert.equal(isSeedRole({ id: 'role-seed1' }), true);
    assert.equal(isSeedRole({ sample: true }), true);
    assert.equal(isSeedRole({ id: 'role-abc', pilot: true }), false);
  });

  it('builds ledger notes for pilots and seeds', () => {
    assert.match(ledgerRoleNote({ pilot: true, intros: 3 }), /3 human intros delivered/);
    assert.equal(ledgerRoleNote({ pilot: true }), 'Brief received · human review in progress.');
    assert.match(ledgerRoleNote({ id: 'role-seed2' }), /Sample pipeline/);
  });

  it('appendPilot sets outcome and mints one receipt', () => {
    const board = { roles: [], receipts: [], candidates: [] };
    const { board: next, role, receipt } = appendPilot(board, {
      brief: 'Founding PM',
      intros: 2,
      stageType: 'Seed · B2B SaaS',
    });
    assert.equal(role.sample, false);
    assert.equal(role.pilot, true);
    assert.match(role.outcome, /2 human intros delivered/);
    assert.equal(next.roles[0].title, 'Founding PM');
    assert.equal(receipt?.intros, 2);
    assert.equal(next.receipts.length, 1);
    assert.equal(latestReceipt(next).hash, receipt.hash);
  });

  it('ledgerRoles dedupes and sorts by featuredAt', () => {
    const board = {
      roles: [
        { id: 'role-seed1', title: 'PM', stageType: 'Seed', featuredAt: '2026-01-01' },
        { id: 'role-real', title: 'Designer', stageType: 'Seed', featuredAt: '2026-06-30', pilot: true, outcome: '2 intros' },
      ],
    };
    const rows = ledgerRoles(board, 4);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].title, 'Designer');
  });
});