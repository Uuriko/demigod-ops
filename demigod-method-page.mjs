#!/usr/bin/env node
/**
 * demigod-method-page — how the numbers are gathered, and what this data refuses to say.
 *
 * WHY THIS IS A PAGE
 * Every competitor publishes hiring counts. What nobody publishes is the rule for what happens when
 * a board cannot be read — and that rule is the difference between a directory and a rumour. This
 * codebase spends most of its comments on one distinction: an absent observation is not an
 * observation of absence. A board we failed to open is not a company that stopped hiring; a role
 * mix we never classified is not a company with no roles; an ATS that cannot express pay is not a
 * company that hides it.
 *
 * That is the differentiator, and it has never been readable by anyone outside the repo.
 *
 * NO HAND-TYPED NUMBERS
 * Every figure is read from a live artifact at render time. A methodology page whose numbers drift
 * from the data it describes is worse than no page: it is a documented claim that is false.
 *
 *   node demigod-method-page.mjs            # HTML fragment
 *   node demigod-method-page.mjs --json
 *   node demigod-method-page.mjs --selftest
 *
 * Schema: demigod.method-page/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (value) => Number(value || 0).toLocaleString('en-US');

/** Read the live artifacts this page describes. Missing ones are reported, never guessed around. */
export function methodFacts({ root = ROOT } = {}) {
  const read = (file) => {
    try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch { return null; }
  };
  const map = read('DEMIGOD-SF-STARTUP-MAP.json');
  const pay = read('DEMIGOD-BOARD-PAY.json');
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const counted = companies.filter((row) => Number.isSafeInteger(row?.openRoles));
  const attempts = {};
  for (const row of companies) if (row?.lastAttempt) attempts[row.lastAttempt] = (attempts[row.lastAttempt] || 0) + 1;
  /* What each refusal COSTS, read from the ledger.
     A rule nobody can price is a slogan. "We never report an unread board as empty" is worth
     nothing to a reader until they can see it means 2,181 companies we decline to call not-hiring,
     and that every competitor's larger number is partly those companies. The refusals are the
     product; their price is the evidence they are real. */
  const ledger = read('DEMIGOD-ROLE-LEDGER.json');
  const roles = ledger?.roles ? Object.values(ledger.roles) : [];
  const open = roles.filter((r) => !r?.closedAt);
  const attributable = open.filter((r) => r?.nativeDateField === 'first_published' && r?.nativePostedAt);

  return {
    schema: 'demigod.method-page/1',
    at: map?.coverage?.openRolesAt || null,
    companies: companies.length,
    boards: counted.length,
    openRoles: counted.reduce((sum, row) => sum + row.openRoles, 0),
    attempts,
    unreadable: (attempts.error || 0) + (attempts.rate_limited || 0),
    payCapableBoards: pay?.stats?.comparable ?? null,
    payUnreadableBoards: pay?.stats?.excludedUnreadable ?? null,
    cost: {
      // No board found: not counted, and never counted as "not hiring".
      noBoardFound: attempts.missing || 0,
      // Says it is hiring, publishes nothing we can read. Shown apart from the counted set.
      reportedNotReadable: companies.filter((c) => c?.hiring === 'yes' && !c?.atsSource).length,
      // Read failed: previous count carried as stale rather than zeroed.
      readFailed: attempts.error || 0,
      // Open roles with no date we can attribute — excluded from the posting-age denominator.
      openRoles: open.length,
      datedRoles: attributable.length,
      undatedRoles: open.length - attributable.length,
      // Things only observation can produce.
      observedClosures: roles.filter((r) => r?.closedAt).length,
      rewrittenPostedDates: roles.filter((r) => (r?.postedDateChangeCount || 0) > 0).length,
    },
  };
}

/**
 * PURE. The page.
 *
 * Written so that the rules are stated as things the system refuses to do, because a reader can
 * check a refusal. "We are careful" is not checkable; "a board we could not read keeps its previous
 * count and is marked stale rather than reported as zero" is.
 */
export function methodFragment(facts) {
  if (!facts || !Number.isInteger(facts.companies) || !facts.companies) {
    throw new Error('method-page: no live map to describe — refusing to publish a methodology for data that is not there');
  }
  const day = String(facts.at || '').slice(0, 10);
  const dated = day ? `<p><time datetime="${esc(day)}">Figures as of ${esc(day)}</time>.</p>` : '';
  const unreadableLine = facts.unreadable
    ? `<p>On the most recent pass, ${num(facts.unreadable)} boards could not be read. They are counted as unread, not as empty.</p>`
    : `<p>On the most recent pass, every board we hold was read successfully. When that is not true, the ones we miss are counted as unread rather than as empty.</p>`;
  const payLine = Number.isInteger(facts.payCapableBoards) && Number.isInteger(facts.payUnreadableBoards)
    ? `<li><strong>An ATS that cannot show pay is not a company that hides it.</strong> ${num(facts.payUnreadableBoards)} of our boards run on software whose public interface has no pay field. They are excluded from the pay-transparency denominator instead of counted against the company, leaving ${num(facts.payCapableBoards)} boards that could have answered.</li>`
    : '';
  return `<section id="dg-static-method" data-dg-static="method" aria-labelledby="dg-method-h">`
    + `<h2 id="dg-method-h">How we count, and what we refuse to say</h2>`
    + `<p>We read ${num(facts.boards)} public employer job boards across ${num(facts.companies)} San Francisco`
    + ` technology companies, holding ${num(facts.openRoles)} open roles. Everything below is a rule about what`
    + ` happens when a reading fails, because that is where hiring data usually starts lying.</p>`
    + `<ul>`
    + `<li><strong>A board we could not read is never reported as empty.</strong> The last verified count stays,`
    + ` marked stale, with the date it was actually verified — never restamped as fresh. Past a bounded window it`
    + ` drains out rather than advertising roles forever.`
    + (facts.cost?.readFailed ? ` <em>Cost today: ${num(facts.cost.readFailed)} boards failed to read and kept their previous count instead of dropping to zero.</em>` : '')
    + `</li>`
    + `<li><strong>A count of zero requires a successful read.</strong> Zero open roles is a fact we only record`
    + ` after opening the board and finding none. Everywhere else, absent means unknown.`
    + (facts.cost?.noBoardFound ? ` <em>Cost today: ${num(facts.cost.noBoardFound)} companies where we found no board at all. They are not counted, and they are not called not-hiring either.</em>` : '')
    + `</li>`
    + `<li><strong>A date is not an observation.</strong> A company only reads as an observed board when we hold`
    + ` both the date and the count. A directory link with a timestamp is a link, not a sighting.`
    + (facts.cost?.undatedRoles ? ` <em>Cost today: ${num(facts.cost.undatedRoles)} of ${num(facts.cost.openRoles)} open roles carry no date we can attribute, so they are excluded from every posting-age figure rather than assumed recent.</em>` : '')
    + `</li>`
    + (facts.cost?.reportedNotReadable
      ? `<li><strong>Saying you are hiring is not the same as showing it.</strong> ${num(facts.cost.reportedNotReadable)} companies`
        + ` state they are hiring and publish no board we can read. They are counted nowhere above, and named as their own group,`
        + ` because folding them in would make our coverage look like the market.</li>`
      : '')
    + (facts.cost?.observedClosures || facts.cost?.rewrittenPostedDates
      ? `<li><strong>Two things only watching can produce.</strong> ${num(facts.cost.observedClosures)} roles were seen closing —`
        + ` once a role is off a board nothing can recover it — and ${num(facts.cost.rewrittenPostedDates)} had their posted date`
        + ` rewritten by the company itself, which is invisible to anyone who was not holding the previous value.</li>`
      : '')
    + `<li><strong>A failed crawl is never published as a company decision.</strong> Boards we could not open are`
    + ` excluded from "paused hiring" and named separately, and when we cannot tell a recovered board from a new`
    + ` one, the started-hiring count is withheld rather than guessed.</li>`
    + `<li><strong>Posting age is posting age.</strong> Where a company's own system reports when a role was`
    + ` posted, we use that date. We do not present a long-open role as evidence of a fake one; hard roles stay`
    + ` open.</li>`
    + payLine
    + `</ul>`
    + unreadableLine
    + dated
    + `</section>\n`;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`method-page selftest: ${msg}`); };
  const facts = methodFacts();
  assert(facts.companies > 2000, `expected the live map, got ${facts.companies} companies`);
  assert(facts.boards > 100, `expected live boards, got ${facts.boards}`);

  const html = methodFragment(facts);
  // Every number in the page has to be one of the numbers we just read. A methodology page that
  // drifts from its data is a documented false claim, which is worse than having no page.
  for (const value of [facts.companies, facts.boards, facts.openRoles]) {
    assert(html.includes(num(value)), `figure ${num(value)} is missing from the page it describes`);
  }
  assert(!/undefined|NaN/.test(html), 'no placeholder may reach a published fragment');
  assert(/never reported as empty/.test(html), 'the unread-board rule is the reason this page exists');
  assert(/requires a successful read/.test(html), 'the zero rule must be stated');

  /* A rule nobody can price is a slogan. Every refusal on this page carries what it costs, read
     from the ledger, because "we never report an unread board as empty" means nothing to a reader
     until they can see it is thousands of companies we decline to call not-hiring. */
  assert(/Cost today: [\d,]+ boards failed to read/.test(html), 'the unread-board rule states its price');
  assert(/Cost today: [\d,]+ companies where we found no board/.test(html), 'the zero rule states its price');
  assert(/excluded from every posting-age figure/.test(html), 'the undated roles are named as excluded');
  assert(/only watching can produce/.test(html), 'the two unreproducible facts are claimed');
  const priceless = methodFragment({ ...facts, cost: undefined });
  assert(!/Cost today/.test(priceless), 'with no measured cost the page makes no cost claim rather than a zero');

  // Refuse rather than publish a methodology for data that is not there.
  let threw = false;
  try { methodFragment({ companies: 0 }); } catch { threw = true; }
  assert(threw, 'an empty map must not produce a confident methodology page');
  threw = false;
  try { methodFragment(null); } catch { threw = true; }
  assert(threw, 'no facts, no page');

  // A missing pay report drops that claim rather than inventing a denominator.
  const withoutPay = methodFragment({ ...facts, payCapableBoards: null, payUnreadableBoards: null });
  assert(!/pay-transparency denominator/.test(withoutPay), 'a missing pay report must drop its bullet, not guess it');
  console.log(JSON.stringify({ ok: true, selftest: 'method-page', companies: facts.companies, boards: facts.boards }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--json')) console.log(JSON.stringify(methodFacts(), null, 2));
  else process.stdout.write(methodFragment(methodFacts()));
}
