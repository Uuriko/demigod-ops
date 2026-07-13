#!/usr/bin/env node
/**
 * Boot smoke test for demigod-foot-core.js.
 * Executes the foot IIFE in a minimal DOM shim; fails if boot throws
 * (e.g. call to an undefined function) or __dgFootVer never sets.
 * Closes the gap where verify:source skips coreJs checks when cdnFoot=true.
 */
import fs from 'fs';
import vm from 'vm';

const SRC = process.argv[2] || '/home/potter/demigod-foot-core.js';
const code = fs.readFileSync(SRC, 'utf8');

function makeEl() {
  return {
    style: { setProperty() {}, removeProperty() {}, cssText: '' },
    dataset: {}, children: [], files: null,
    classList: { add() {}, remove() {}, toggle() {} },
    parentElement: null, parentNode: null,
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    appendChild() {}, insertBefore() {}, insertAdjacentElement() {},
    prepend() {}, remove() {}, replaceWith() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, scrollIntoView() {},
    textContent: '', innerHTML: '', value: '',
  };
}

const document = {
  body: makeEl(), head: makeEl(), documentElement: makeEl(),
  createElement: () => makeEl(),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {},
};
const thenable = { then() { return this; }, catch() { return this; } };
const sandbox = {
  document,
  location: { hash: '', href: 'https://www.trydemigod.com/' },
  navigator: { userAgent: 'smoke' },
  getComputedStyle: () => ({ display: 'block' }),
  MutationObserver: class { observe() {} disconnect() {} },
  fetch: () => thenable,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

let threw = null;
try { vm.runInNewContext(code, sandbox, { filename: SRC, timeout: 5000 }); }
catch (e) { threw = e; }

const ver = sandbox.window.__dgFootVer;
const pass = !threw && !!ver;
console.log(JSON.stringify({ pass, version: ver || null, error: threw ? String(threw.message || threw) : null }));
process.exit(pass ? 0 : 1);
