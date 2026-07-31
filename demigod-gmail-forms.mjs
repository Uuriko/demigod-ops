#!/usr/bin/env node
/**
 * demigod-gmail-forms — rehydrate WIZ contacts from Webflow form-notification emails.
 *
 * Webhook inbox often stores incomplete raw (role-title only). Gmail notifications
 * include contact-email / seeker-email. This CLI parses dumps and reports real vs synthetic.
 * Never invents. Never auto-sends. --apply merges real forms into submissions inbox only.
 *
 *   node demigod-gmail-forms.mjs
 *   node demigod-gmail-forms.mjs --file=/tmp/demigod-gmail-inbound.json
 *   node demigod-gmail-forms.mjs --apply   # human-gated inbox merge of real contacts only
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import {
  applyInboxContactPatches,
  ingestSubmission,
  loadInbox,
  planGmailFormCandidates,
  planInboxContactPatches,
  updateInbox,
} from './demigod-submissions-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DUMP = '/tmp/demigod-gmail-inbound.json';
const REPORT = '/tmp/dg-busy/funnel/gmail-forms-latest.json';

function loadDump(fileArg) {
  const p = fileArg || DEFAULT_DUMP;
  if (!fs.existsSync(p)) return { ok: false, error: `missing dump: ${p}`, path: p };
  try {
    return { ok: true, path: p, payload: JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch (e) {
    return { ok: false, error: String(e.message || e), path: p };
  }
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const fileArg = (args.find((a) => a.startsWith('--file=')) || '').slice('--file='.length) || null;
  const dump = loadDump(fileArg);
  if (!dump.ok) {
    console.log(JSON.stringify({ ok: false, ...dump, note: 'Save Gmail MCP search → /tmp/demigod-gmail-inbound.json' }, null, 2));
    process.exit(1);
  }
  const plan = planGmailFormCandidates(dump.payload);
  let applied = 0;
  const errors = [];

  // Report (and optionally apply) patches: Gmail contact → incomplete webhook rows
  // so funnel join can form_filled (webhook often has role-title only).
  let inboxItems = [];
  try {
    inboxItems = loadInbox().items || [];
  } catch {
    inboxItems = [];
  }
  const patchPlan = planInboxContactPatches(plan.real, inboxItems);
  let inboxPatched = 0;

  if (apply) {
    for (const f of plan.real) {
      try {
        const r = ingestSubmission(
          { name: f.form, data: f.raw },
          { source: 'gmail-form-rehydrate', at: f.at || new Date().toISOString() },
        );
        if (r?.record?.id) applied++;
      } catch (e) {
        errors.push({ email: f.email, error: String(e.message || e).slice(0, 200) });
      }
    }
    // Patch existing incomplete submissions (primary form_filled conversion path)
    try {
      inboxPatched = updateInbox((inbox) => {
        const items = inbox.items || [];
        // Re-plan under the lock because ingest may have added rows.
        const livePlan = planInboxContactPatches(plan.real, items);
        return applyInboxContactPatches(items, livePlan.patches);
      });
    } catch (e) {
      errors.push({ error: `inbox_patch: ${e.message || e}` });
    }
  }

  // Also: attach email onto existing no-email inbox-* leads when form+role match (report only unless apply)
  // Skip self/noise emails (trydemigod) — same gate as patch plan.
  let leadsAttached = 0;
  if (apply && plan.real.length) {
    try {
      const leadsPath = path.join(ROOT, 'DEMIGOD-LEADS.json');
      if (fs.existsSync(leadsPath)) {
        const doc = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
        const all = [...(doc.partners || []), ...(doc.talent || [])];
        for (const f of plan.real) {
          const email = String(f.email || '').toLowerCase();
          if (!email || /@trydemigod\.com$|@example\.|@pending\.example/i.test(email)) continue;
          const title = f.raw['role-title'] || f.raw.role || '';
          const company = f.raw['company-name'] || f.raw.company || '';
          for (const lead of all) {
            if (lead.email || lead.contactEmail) continue;
            if (!String(lead.source || '').startsWith('submissions-inbox')) continue;
            const sameTitle = title && String(lead.title || '') === String(title);
            const sameCo =
              company &&
              String(lead.company || '').toLowerCase() === String(company).toLowerCase() &&
              company !== '(from WIZ)';
            // Require company match when present; title-only is too loose (duplicate Head of Growth)
            if ((company && sameCo) || (!company && sameTitle)) {
              // Attach contact only — form_filled still requires funnel join + evidence
              lead.email = f.email;
              lead.contactEmail = f.email;
              if (company && (!lead.company || lead.company === '(from WIZ)')) lead.company = company;
              if (f.raw['role-title'] && (!lead.title || lead.title === 'Role')) {
                lead.title = f.raw['role-title'];
              }
              leadsAttached++;
            }
          }
        }
        if (leadsAttached) {
          atomicWrite(leadsPath, JSON.stringify(doc, null, 2) + '\n');
        }
      }
    } catch (e) {
      errors.push({ error: `leads_attach: ${e.message || e}` });
    }
  }

  const out = {
    ok: true,
    at: new Date().toISOString(),
    dump: dump.path,
    forms: plan.forms.length,
    real: plan.real.length,
    synthetic: plan.synthetic.length,
    applied,
    inboxPatches: patchPlan.patches.length,
    inboxPatched,
    inboxPatchSkipped: patchPlan.skipped.slice(0, 10),
    leadsAttached,
    apply,
    realSample: plan.real.slice(0, 5).map((f) => ({
      form: f.form,
      email: f.email,
      company: f.raw['company-name'] || null,
      title: f.raw['role-title'] || f.raw['full-name'] || null,
    })),
    patchSample: patchPlan.patches.slice(0, 5).map((p) => ({
      submissionId: p.submissionId,
      email: p.email,
      form: p.form,
    })),
    syntheticSample: plan.synthetic.slice(0, 3).map((f) => ({
      form: f.form,
      email: f.email,
      company: f.raw['company-name'] || null,
    })),
    errors,
    note: 'Never invents. example.com/Acme/self stay synthetic. --apply: ingest + patch incomplete inbox + lead attach. Then: node demigod-funnel.mjs join --apply',
  };
  try {
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    atomicWrite(REPORT, JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });
  } catch {
    /* */
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
