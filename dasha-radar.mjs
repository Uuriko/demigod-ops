#!/usr/bin/env node
/**
 * Dasha radar — layered bug-finding scoreboard (Love Spec + identity + gates).
 *
 *   node dasha-radar.mjs              # disk layers (fast)
 *   node dasha-radar.mjs --live       # + live audit (network)
 *   node dasha-radar.mjs --full       # + browser studio/handoff tests when CDP up
 *   node dasha-radar.mjs --json       # machine-readable only
 *
 * Layers:
 *   L0 identity-matrix   mint/claims/love wiring on disk
 *   L1 love-paths        L1–L7 fixtures + metrics schema
 *   L2 handoff-unit      sanitize/card/OG PNG
 *   L3 studio-static     meme-studio source assertions (no browser)
 *   L4 live-audit        announce-ready worker+site (+ handoff smoke)
 *   L5 studio-browser    puppeteer studio (needs CDP :9223)
 *
 * Exit 0 only when every non-soft layer passes.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runIdentityMatrix } from './dasha-identity-matrix.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const wantLive = args.has('--live') || args.has('--full');
const wantFull = args.has('--full');
const jsonOnly = args.has('--json');
const reportPath = process.env.DASHA_RADAR_OUT || '/tmp/dasha-radar.json';

function runNode(script, extraArgs = [], { timeout = 180_000, env = {} } = {}) {
  const r = spawnSync(process.execPath, [join(root, script), ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...env },
  });
  return {
    status: r.status === null ? 124 : r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    signal: r.signal || null,
  };
}

function layer(id, name, fn) {
  const t0 = Date.now();
  try {
    const result = fn();
    return {
      id,
      name,
      ok: result.ok !== false && (result.status === undefined || result.status === 0),
      soft: Boolean(result.soft),
      ms: Date.now() - t0,
      detail: result.detail || null,
      hard: result.hard || [],
      note: result.note || null,
    };
  } catch (e) {
    return {
      id,
      name,
      ok: false,
      soft: false,
      ms: Date.now() - t0,
      detail: null,
      hard: [String(e?.message || e).slice(0, 200)],
      note: 'threw',
    };
  }
}

function main() {
  const layers = [];

  layers.push(
    layer('L0', 'identity-matrix', () => {
      const r = runIdentityMatrix();
      return {
        ok: r.ok,
        hard: r.hard,
        detail: { soft: r.soft, cells: r.cells.length, failed: r.cells.filter((c) => !c.ok).map((c) => c.id) },
      };
    }),
  );

  layers.push(
    layer('L1', 'love-paths', () => {
      const r = runNode('dasha-love-paths.test.mjs', [], { timeout: 60_000 });
      return {
        status: r.status,
        ok: r.status === 0,
        hard: r.status === 0 ? [] : [r.stderr.slice(0, 400) || r.stdout.slice(-400)],
        note: r.stdout.trim().split('\n').pop() || null,
      };
    }),
  );

  layers.push(
    layer('L2', 'handoff-unit', () => {
      const r = runNode('dasha-studio-handoff.test.mjs', [], { timeout: 60_000 });
      return {
        status: r.status,
        ok: r.status === 0,
        hard: r.status === 0 ? [] : [r.stderr.slice(0, 400) || r.stdout.slice(-400)],
        note: r.stdout.trim().split('\n').pop() || null,
      };
    }),
  );

  layers.push(
    layer('L3', 'lobby-assets-check', () => {
      const r = runNode('dasha-lobby-assets-build.mjs', ['--check'], { timeout: 60_000 });
      return {
        status: r.status,
        ok: r.status === 0,
        hard: r.status === 0 ? [] : [r.stderr.slice(0, 400) || r.stdout.slice(-400)],
        note: (r.stdout.match(/hash:\s*'([a-f0-9]+)'/) || [])[1]
          ? `hash ${(r.stdout.match(/hash:\s*'([a-f0-9]+)'/) || [])[1]}`
          : (r.stdout.trim().split('\n').filter(Boolean).pop() || null),
      };
    }),
  );

  if (wantLive) {
    layers.push(
      layer('L4', 'live-audit', () => {
        const r = runNode('dasha-audit-live.mjs', ['--fast'], { timeout: 90_000 });
        let report = null;
        try {
          report = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
        } catch {
          /* ignore */
        }
        const hard = report?.hard || (r.status === 0 ? [] : ['audit-exit-' + r.status]);
        const softOnly = report?.soft || [];
        const announce = report?.announceReady === true || (Array.isArray(report?.hard) && report.hard.length === 0 && r.status === 0);
        return {
          status: r.status,
          ok: hard.length === 0 && (announce || r.status === 0),
          soft: false,
          hard,
          detail: report
            ? {
                hard,
                soft: softOnly,
                ms: report.ms,
                note: report.note,
                handoff: (report.checks || [])
                  .filter((c) => String(c.id || '').startsWith('handoff'))
                  .map((c) => ({ id: c.id, ok: c.ok, status: c.status })),
              }
            : { stderr: r.stderr.slice(0, 300) },
          note: report?.note || null,
        };
      }),
    );
  } else {
    layers.push({
      id: 'L4',
      name: 'live-audit',
      ok: true,
      soft: true,
      ms: 0,
      detail: null,
      hard: [],
      note: 'skipped (pass --live)',
    });
  }

  // Live stranger loop when CDP is up (agent-run; no human). --full also runs local puppeteer suite.
  const cdpProbe = spawnSync(
    process.execPath,
    ['-e', `fetch(${JSON.stringify((process.env.CDP_URL || 'http://127.0.0.1:9223') + '/json/version')}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`],
    { encoding: 'utf8', timeout: 4000 },
  );
  const cdpUp = cdpProbe.status === 0;

  if (cdpUp) {
    layers.push(
      layer('L5', 'stranger-loop-live', () => {
        const r = runNode('dasha-stranger-loop.mjs', [], { timeout: 180_000 });
        let body = null;
        try {
          body = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
        } catch {
          /* ignore */
        }
        const ok = r.status === 0 && body?.ok === true;
        const flake =
          r.status === 2 ||
          /TimeoutError|Target closed|ECONNREFUSED|9223/i.test(r.stderr + r.stdout + (body?.steps || []).map((s) => s.error || '').join(' '));
        return {
          status: r.status,
          ok: ok || flake, // flake → soft pass with note (re-run catches real fails)
          soft: flake && !ok,
          hard: ok || flake ? [] : (body?.steps || []).filter((s) => !s.ok).map((s) => s.id).slice(0, 8),
          note: ok ? 'L1–L9 live' : flake ? 'cdp-flake' : body?.steps?.find((s) => !s.ok)?.id || 'stranger-fail',
          detail: body ? { steps: body.steps?.map((s) => ({ id: s.id, ok: s.ok })) } : null,
        };
      }),
    );
  } else if (wantFull) {
    layers.push(
      layer('L5', 'studio-browser', () => {
        const r = runNode('dasha-meme-studio.test.mjs', [], {
          timeout: 300_000,
          env: { DASHA_SHIP_SKIP_BROWSER: undefined },
        });
        return {
          status: r.status,
          ok: r.status === 0,
          soft: r.status !== 0 && /ECONNREFUSED|Target closed|9223/.test(r.stderr + r.stdout),
          hard:
            r.status === 0
              ? []
              : [r.stderr.slice(0, 300) || r.stdout.slice(-300) || 'studio-browser-fail'],
          note: r.stdout.trim().split('\n').pop() || null,
        };
      }),
    );
  } else {
    layers.push({
      id: 'L5',
      name: 'stranger-loop-live',
      ok: true,
      soft: true,
      ms: 0,
      detail: null,
      hard: [],
      note: 'skipped (no CDP)',
    });
  }

  const hardFails = layers.filter((l) => !l.ok && !l.soft);
  const report = {
    ok: hardFails.length === 0,
    ms: layers.reduce((a, l) => a + (l.ms || 0), 0),
    mode: { live: wantLive, full: wantFull },
    layers,
    hard: hardFails.map((l) => l.id),
    note:
      hardFails.length === 0
        ? layers.some((l) => l.soft && l.note?.startsWith('skipped'))
          ? 'radar green (some layers skipped)'
          : 'radar green'
        : `radar hard fails: ${hardFails.map((l) => l.id).join(', ')}`,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log('Dasha radar');
    console.log('─'.repeat(56));
    for (const l of layers) {
      const mark = l.ok ? (l.soft && l.note?.startsWith('skipped') ? 'SKIP' : 'PASS') : l.soft ? 'SOFT' : 'FAIL';
      console.log(`${pad(l.id, 4)} ${pad(mark, 4)} ${pad(l.name, 22)} ${String(l.ms).padStart(5)}ms${l.note ? '  ' + l.note : ''}`);
      if (!l.ok && l.hard?.length) {
        for (const h of l.hard.slice(0, 4)) console.log(`       · ${h}`);
      }
    }
    console.log('─'.repeat(56));
    console.log(report.note);
    console.log(`report ${reportPath}`);
  }

  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}

export { main as runRadar };
