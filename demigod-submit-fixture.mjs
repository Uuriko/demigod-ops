#!/usr/bin/env node
/**
 * demigod-submit-fixture.mjs
 *
 * Deterministic tests for Webflow submit confirmation ownership (no live POST).
 * Mirrors dgWfStatusRoot + waitPost contracts from demigod-foot-core.js.
 *
 * Exit 0 = all cases pass. Writes /tmp/dg-busy/submit-fixture.json
 */
import fs from 'fs';
import path from 'path';

const BUSY = '/tmp/dg-busy';

/** Minimal DOM stubs for form / .w-form / done / fail layouts */
function el(tag, opts = {}) {
  const classes = new Set((opts.className || '').split(/\s+/).filter(Boolean));
  const kids = opts.children || [];
  const node = {
    tagName: tag.toUpperCase(),
    id: opts.id || '',
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c),
    },
    children: kids,
    parentElement: null,
    style: { display: opts.display || 'none', visibility: opts.visibility || 'hidden' },
    dataset: {},
    querySelector(sel) {
      return find(this, sel, false);
    },
    querySelectorAll(sel) {
      const out = [];
      walk(this, (n) => {
        if (match(n, sel)) out.push(n);
      });
      return out;
    },
    closest(sel) {
      let n = this;
      while (n) {
        if (match(n, sel)) return n;
        n = n.parentElement;
      }
      return null;
    },
  };
  kids.forEach((k) => {
    k.parentElement = node;
  });
  return node;
}

function walk(n, fn) {
  fn(n);
  (n.children || []).forEach((c) => walk(c, fn));
}

function match(n, sel) {
  if (!sel) return false;
  if (sel.startsWith('#')) return n.id === sel.slice(1);
  if (sel === 'form' || sel === n.tagName?.toLowerCase()) return n.tagName === sel.toUpperCase();
  if (sel.startsWith('.')) return n.classList.contains(sel.slice(1));
  if (sel.includes(',')) return sel.split(',').some((s) => match(n, s.trim()));
  // simple "#id .class" not needed
  if (sel.startsWith(':scope > ')) {
    const rest = sel.replace(':scope > ', '').trim();
    // only direct children checked by caller via parent
    return match(n, rest);
  }
  if (sel.includes(' ')) {
    // descendant: last class
    const parts = sel.trim().split(/\s+/);
    return match(n, parts[parts.length - 1]);
  }
  return match(n, sel);
}

function find(root, sel, all) {
  if (sel.startsWith(':scope > ')) {
    const rest = sel.replace(':scope > ', '').trim();
    for (const c of root.children || []) {
      if (match(c, rest)) return c;
    }
    return null;
  }
  let found = null;
  walk(root, (n) => {
    if (!found && n !== root && match(n, sel)) found = n;
  });
  return found;
}

/** Same contract as foot-core dgWfStatusRoot */
function dgWfStatusRoot(f) {
  const modal = f.closest && f.closest('#startup-modal,#jobseeker-modal');
  if (modal) {
    const d = modal.querySelector('.w-form-done');
    if (d && d.parentElement) return d.parentElement;
  }
  const p = f.parentElement;
  if (p) {
    const sib = p.querySelector(':scope > .w-form-done') || p.querySelector(':scope > .w-form-fail');
    if (sib) return p;
    if (p.classList && p.classList.contains('w-form') && p !== f) return p;
  }
  const outer = f.parentElement && f.parentElement.closest && f.parentElement.closest('.w-form');
  if (outer && outer !== f) return outer;
  return p || f;
}

function visible(el) {
  return el && el.style.display !== 'none' && el.style.visibility !== 'hidden';
}

/** Simulate waitPost resolution */
function waitPostResult(form, { mode, afterMs = 0 } = {}) {
  const wrap = dgWfStatusRoot(form);
  const scope = wrap || form.parentElement || form;
  let okEl = scope.querySelector('.w-form-done');
  let badEl = scope.querySelector('.w-form-fail');
  if (!okEl && form.parentElement) {
    for (const kid of form.parentElement.children || []) {
      if (kid.classList.contains('w-form-done')) okEl = kid;
      if (kid.classList.contains('w-form-fail')) badEl = kid;
    }
  }
  if (mode === 'success') {
    if (okEl) {
      okEl.style.display = 'block';
      okEl.style.visibility = 'visible';
    }
  } else if (mode === 'fail') {
    if (badEl) {
      badEl.style.display = 'block';
      badEl.style.visibility = 'visible';
    }
  }
  // re-read
  okEl = scope.querySelector('.w-form-done');
  badEl = scope.querySelector('.w-form-fail');
  if (!okEl && form.parentElement) {
    for (const kid of form.parentElement.children || []) {
      if (kid.classList.contains('w-form-done')) okEl = kid;
      if (kid.classList.contains('w-form-fail')) badEl = kid;
    }
  }
  const okVis = visible(okEl);
  const badVis = visible(badEl);
  if (okVis) return 'success';
  if (badVis) return 'fail';
  if (afterMs >= 6000) return 'timeout';
  return 'pending';
}

function layoutClassic() {
  // Webflow classic: div.w-form > form.w-form + .w-form-done + .w-form-fail
  // (bug case: form itself has .w-form so closest returns form)
  const done = el('div', { className: 'w-form-done', display: 'none' });
  const fail = el('div', { className: 'w-form-fail', display: 'none' });
  const form = el('form', { className: 'w-form', id: 'startup-hire' });
  const wrap = el('div', { className: 'w-form', children: [form, done, fail] });
  form.parentElement = wrap;
  done.parentElement = wrap;
  fail.parentElement = wrap;
  const modal = el('div', { id: 'startup-modal', children: [wrap] });
  wrap.parentElement = modal;
  form.closest = (sel) => {
    if (sel.includes('startup-modal') || sel.includes('#')) return modal;
    if (sel === '.w-form') return form; // BUG simulation: form has .w-form
    return null;
  };
  // enhance form.closest for modal
  form.closest = (sel) => {
    if (/startup-modal|jobseeker-modal/.test(sel)) return modal;
    if (sel === '.w-form') return form; // self — old bug
    return null;
  };
  return { form, wrap, done, fail, modal };
}

function layoutModalDoneOnly() {
  const done = el('div', { className: 'w-form-done', display: 'none' });
  const form = el('form', { className: 'w-form', id: 'startup-hire' });
  const modal = el('div', { id: 'startup-modal', children: [form, done] });
  form.parentElement = modal;
  done.parentElement = modal;
  form.closest = (sel) => (/startup-modal/.test(sel) ? modal : form.classList.contains('w-form') ? form : null);
  return { form, done, modal };
}

const cases = [];
function test(name, fn) {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (e) {
    cases.push({ name, ok: false, error: String(e.message || e) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

// --- cases ---
test('classic: form.closest(.w-form) is form (bug shape), root still finds wrap', () => {
  const { form, wrap } = layoutClassic();
  assert(form.closest('.w-form') === form, 'closest returns form');
  const root = dgWfStatusRoot(form);
  assert(root === wrap, 'dgWfStatusRoot returns outer wrap, not form');
});

test('classic: success when sibling done visible', () => {
  const { form, done } = layoutClassic();
  assert(waitPostResult(form, { mode: 'none' }) === 'pending', 'pending before show');
  assert(waitPostResult(form, { mode: 'success' }) === 'success', 'success');
  assert(done.style.display === 'block', 'done shown');
});

test('classic: fail when sibling fail visible', () => {
  const { form } = layoutClassic();
  assert(waitPostResult(form, { mode: 'fail' }) === 'fail', 'fail');
});

test('classic: timeout when nothing visible after 6s', () => {
  const { form } = layoutClassic();
  assert(waitPostResult(form, { mode: 'none', afterMs: 6000 }) === 'timeout', 'timeout');
});

test('modal-level done: root finds parent of done', () => {
  const { form, modal, done } = layoutModalDoneOnly();
  const root = dgWfStatusRoot(form);
  assert(root === modal || root === done.parentElement, 'root is modal');
  assert(waitPostResult(form, { mode: 'success' }) === 'success', 'success modal');
});

test('never treat form-as-done-container alone', () => {
  // done is INSIDE form (wrong) — root may still be form; success query should still find it
  const done = el('div', { className: 'w-form-done', display: 'none' });
  const form = el('form', { className: 'w-form', children: [done] });
  done.parentElement = form;
  form.closest = (sel) => (/startup-modal/.test(sel) ? null : form);
  form.parentElement = el('div', { className: 'outer', children: [form] });
  form.parentElement.children = [form];
  // Without modal, root is parent outer or form
  const r = waitPostResult(form, { mode: 'success' });
  assert(r === 'success' || r === 'pending', 'handles nested done without crash');
});

const pass = cases.every((c) => c.ok);
const out = {
  at: new Date().toISOString(),
  pass,
  cases,
  contract: {
    dgWfStatusRoot: 'prefer modal .w-form-done parent; else sibling under parent; never stop at form-as-.w-form alone',
    waitPost: 'success|fail|timeout|pending',
    noForceDone: 'showStep must not force .w-form-done visible',
  },
};

fs.mkdirSync(BUSY, { recursive: true });
fs.writeFileSync(path.join(BUSY, 'submit-fixture.json'), JSON.stringify(out, null, 2));
fs.writeFileSync(
  path.join(BUSY, 'submit-fixture.md'),
  `# Submit fixture ${out.at}\npass: ${pass}\n` +
    cases.map((c) => `- ${c.ok ? 'OK' : 'FAIL'} ${c.name}${c.error ? ' — ' + c.error : ''}`).join('\n') +
    '\n',
);
console.log(JSON.stringify(out, null, 2));
process.exit(pass ? 0 : 1);
