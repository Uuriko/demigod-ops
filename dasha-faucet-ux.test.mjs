#!/usr/bin/env node
/**
 * Encodes docs/exchange/DASHA-FAUCET-UX-CHECKLIST-2026-08-17.md §§A–G.
 * Source + extracted humanError/destShapeError. No deploy.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
const page = readFileSync(join(root, 'dasha-faucet-page.html'), 'utf8');
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const TREASURY = 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb';

function mapVoice(code, voice) {
  assert.ok(client.includes(`'${voice}'`), `${code} voice '${voice}' missing`);
  assert.ok(client.includes(code), `${code} key missing`);
}

// C — distinguishable errors (client map, not the helper echo)
mapVoice('dest_not_wallet', 'not a wallet');
mapVoice('dest_mint', 'that is the mint');
mapVoice('dest_treasury', 'that is the tip jar');
mapVoice('last-4 does not match', 'last 4 miss');
mapVoice('siws_domain', 'wrong sign-in site');
mapVoice('link X first', 'link X');
mapVoice('prove wallet', 'prove wallet');
mapVoice('x_reauth', 'Link X again');
mapVoice('sig miss', 'sig miss');
mapVoice('treasury_empty', 'jar empty');
mapVoice('already claimed', 'already claimed');
mapVoice('confirming', 'confirming');
const voices = ['not a wallet', 'that is the mint', 'that is the tip jar', 'last 4 miss', 'wrong sign-in site'];
assert.equal(new Set(voices).size, 5, 'dest/phishing errors must not collapse to one string');
assert.doesNotMatch(client, /dest_treasury:\s*'dest miss'/);
assert.doesNotMatch(client, /siws_domain:\s*'dest miss'/);

// E — dest shape in the client (same codes the map speaks)
assert.match(client, /dest === MINT\) return 'dest_mint'/);
assert.match(client, /return 'dest_treasury'/);
assert.match(client, /t\\\.me\|telegram/);
assert.ok(client.includes(TREASURY), 'client pins treasury');
assert.ok(client.includes(MINT), 'client pins mint');

// A/B — naming
assert.ok(client.includes("'free $dasha'"), 'door claim is free $dasha');
assert.ok(!client.includes("faucet-send', 'Send'"), 'door is not Send');
assert.ok(client.includes("el('button', 'faucet-back faucet-fill', 'Donate')"), 'door donate word');
assert.ok(client.includes("el('p', 'faucet-q', 'Donate')"), 'donate card heading matches button');
assert.ok(!/el\('p', 'faucet-q', 'Pitch in'\)/.test(client), 'donate card is not a second product named Pitch in');
assert.ok(client.includes("el('button', 'faucet-go', 'tip me')"), 'confirm is tip me');
assert.match(client, /kind !== 'IS_WALLET'[\s\S]{0,200}Prove wallet/, 'unproven dest cannot fire tip me');
assert.ok(client.includes("el('p', 'faucet-q', 'jar empty')"), 'empty headline');
assert.ok(client.includes("el('p', 'faucet-q', 'confirming')"), 'sending headline');
assert.ok(client.includes("el('p', 'faucet-q', 'tipped')"), 'success headline');
assert.ok(client.includes("el('p', 'faucet-q', 'already claimed')"), 'claimed headline');

// D — empty honesty
assert.ok(client.includes('jarEmpty'), 'empty helper');
assert.match(client, /if \(empty\) \{\s*send\.disabled = true/);
assert.match(client, /box\.appendChild\(hero\(!empty\)\)/);
assert.ok(client.includes('Donate to refill'), 'empty door still offers donate');

// dest field not gated solely behind linked
assert.doesNotMatch(client, /else if \(!state\.dest\)/);
assert.ok(client.includes("labeledInput('dasha-faucet-dest'"), 'wallet field exists');
assert.ok(client.includes('Link X, then your wallet'), 'dest order is explicit');

// F — a11y
assert.ok(client.includes("img.alt = 'Dasha tip faucet'"), 'hero alt');
assert.ok(client.includes("aria-label', 'free $dasha'"));
assert.ok(client.includes("aria-label', 'Wallet'"));
assert.ok(client.includes("aria-label', 'Last 4'"));
assert.ok(client.includes("aria-label', 'Transaction signature'"));
assert.ok(client.includes("role', 'status'"));
assert.ok(client.includes('prefers-reduced-motion'));
assert.ok(/min-height:5[28]px/.test(client), '52px+ targets');

// donate shows full treasury, not last-4 only
assert.ok(client.includes("el('p', 'faucet-ca', treas)"), 'donate shows full treasury');
assert.ok(client.includes('(state.status && state.status.treasury) || TREASURY'), 'donate falls back to the known tip jar');
assert.doesNotMatch(client, /el\('p', 'faucet-ca', last4Of\(treas\)\)/);
{
  const body = client.match(/function destCopiedOk\(got, want\) \{\s*return ([^;]+);/);
  assert.ok(body, 'donate COPY must ship destCopiedOk');
  const destCopiedOk = new Function('got', 'want', `return ${body[1]};`);
  assert.equal(destCopiedOk(TREASURY, TREASURY), true);
  assert.equal(destCopiedOk(TREASURY + '\n', TREASURY), true);
  assert.equal(destCopiedOk(TREASURY.slice(0, -4) + 'XXXX', TREASURY), false);
  assert.match(client, /destCopiedOk\(got, treas\)/, 'COPY read-back must use the shipped helper');
}

// G — claims
assert.ok(/Not a farm/.test(client), 'not a farm on widget');
assert.ok(client.includes('Not a purchase'), 'donate is not a purchase');
assert.ok(client.includes("res.data.ok && (res.data.awarded || res.data.funded)"), '+simp only after award');
assert.doesNotMatch(page, /earn free|guaranteed/i);
assert.match(page, /Not an airdrop farm/);
assert.doesNotMatch(page, /(?<!Not an )airdrop farm/i);
assert.ok(page.includes('free $dasha'));
assert.ok(!/Send/.test(page) || page.includes('free $dasha'));

// Layout — stacked actions, not a tight Send/Donate or input+Paste row
assert.match(client, /flex-direction:column;gap:16px/, 'primary actions stack with 16px gutters');
assert.match(client, /min-height:52px/, 'targets stay at least 52px');
assert.ok(client.includes("el('button', 'faucet-back', 'Copy address')"), 'donate copy is its own full-width control');
assert.ok(client.includes("el('button', 'faucet-go', 'Check')"), 'typed donate sig has a Check, not only Enter');
assert.ok(client.includes("el('button', 'faucet-go', 'Link X')"), 'dest Link X is a full word, not a 1-letter chip');
assert.ok(client.includes("el('button', 'faucet-go', 'Prove wallet')"), 'SIWS is not jammed next to Paste as another acid chip');
assert.doesNotMatch(client, /faucet-row input\{flex:1 1 160px/, 'wallet/sig fields are not squeezed beside a button');
assert.ok(client.includes('.catch(miss)'), 'COPY is fail-closed when read-back throws');

// paste / dest-check contracts (overlap with faucet.test, keep the UX ones tight)
assert.ok(client.includes("state.fillMiss = 'try again'"), 'donate network fail is not “empty”');
assert.ok(client.includes("kind || 'PASTED'"));
assert.doesNotMatch(client, /function bindPaste[\s\S]*kind \|\| 'IS_WALLET'/);
assert.ok(client.includes("showDestError(err || 'dest_not_wallet')"));

console.log('dasha-faucet-ux: PASS (checklist A–G encoded)');
