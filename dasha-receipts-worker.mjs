/** LEGACY / SCRAPPED — thesis/receipts product. Do not ship or revive. */
import { createHash, randomBytes } from 'node:crypto';
import { createReceipt, verifyManagementSecret } from './dasha-receipt-core.mjs';

const OUTCOMES = new Set(['invalidated', 'held', 'expired', 'disputed']);
const REPORT_REASONS = new Set(['spam_scam', 'harassment', 'impersonation', 'personal_information', 'illegal_safety', 'deceptive_token_claim', 'other']);
const RECEIPT_COLUMNS = 'id, schema_version, asset_kind, asset_id, thesis, invalidation, confidence, resolution_date, received_at, payload_hash, manage_token_hash';
const SECURITY = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const responseHeaders = (origin, type = 'application/json; charset=utf-8', nonce) => ({ ...SECURITY, ...(nonce ? { 'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` } : {}), 'Content-Type': type, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) });
const json = (value, status, origin) => new Response(JSON.stringify(value), { status, headers: responseHeaders(origin) });
const authAllowed = async (env, request, scope) => env.AUTH_RATE_LIMITER && (await env.AUTH_RATE_LIMITER.limit({ key: `${scope}:${request.headers.get('CF-Connecting-IP') || 'unknown'}` })).success;

async function body(request) {
  if (Number(request.headers.get('content-length')) > 4096) throw new RangeError('request body is too large');
  const raw = await request.text();
  if (raw.length > 4096) throw new RangeError('request body is too large');
  return JSON.parse(raw);
}

function outcomeInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('outcome must be an object');
  if (!OUTCOMES.has(value.status)) throw new RangeError('unsupported outcome status');
  if (typeof value.postmortem !== 'string') throw new TypeError('postmortem must be text');
  const postmortem = value.postmortem.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (!postmortem || [...postmortem].length > 280 || /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/.test(postmortem)) throw new RangeError('postmortem must be 1–280 safe characters');
  let sourceUrl = null;
  if (value.sourceUrl) {
    if (typeof value.sourceUrl !== 'string' || value.sourceUrl.length > 500) throw new RangeError('sourceUrl is too long');
    const parsed = new URL(value.sourceUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new RangeError('sourceUrl must be a credential-free HTTPS URL');
    sourceUrl = parsed.href;
  }
  return { status: value.status, postmortem, sourceUrl };
}

function publicReceipt(row, outcome) {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    assetKind: row.asset_kind,
    assetId: row.asset_id,
    thesis: row.thesis,
    invalidation: row.invalidation,
    confidence: row.confidence,
    resolutionDate: row.resolution_date,
    receivedAt: row.received_at,
    payloadHash: row.payload_hash,
    outcome: outcome ? { status: outcome.status, postmortem: outcome.postmortem, sourceUrl: outcome.source_url, recordedAt: outcome.recorded_at, outcomeHash: outcome.outcome_hash } : null,
  };
}

const pageStyle = 'body{max-width:48rem;margin:3rem auto;padding:0 1rem;background:#0b0a0c;color:#f2ede7;font:16px/1.55 system-ui}h1,h2{font-family:Georgia,serif}article,section,form{display:grid;gap:1rem;margin:2rem 0;padding:1.4rem;border:1px solid #353039;border-radius:1rem}label{display:grid;gap:.35rem;font-weight:700}input,textarea,select,button,a.button{min-height:48px;padding:.7rem;border:1px solid #353039;border-radius:.6rem;background:#151317;color:#f2ede7;font:inherit}button,a.button{display:inline-flex;align-items:center;justify-content:center;background:#c8b6ff;color:#17141a;font-weight:800;text-decoration:none;cursor:pointer}dt{color:#ada5ae}dd{margin:0 0 1rem;overflow-wrap:anywhere}a{color:#c8b6ff}.error{color:#ff9e91}.note{color:#ada5ae;overflow-wrap:anywhere}[hidden]{display:none}';

function creatorPage(nonce) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Create a Dasha receipt</title><style>${pageStyle}</style></head><body><main><p>Dasha · invited beta</p><h1>Record a bounded crypto call</h1><p>Dasha's server will record when it receives the exact original. This does not prove authorship, identity, a trade, truth, completeness, or token safety.</p><form id="create"><label>Beta invite code<input name="inviteCode" type="password" required autocomplete="off"></label><label>Solana token address<input name="assetId" required minlength="32" maxlength="44" autocomplete="off" spellcheck="false"></label><label>Thesis<textarea name="thesis" required maxlength="280"></textarea></label><label>Invalid if<textarea name="invalidation" required maxlength="180"></textarea></label><label>Confidence<select name="confidence"><option value="55">55%</option><option value="65">65%</option><option value="75">75%</option><option value="85">85%</option><option value="95">95%</option></select></label><label>Resolution date · closes 23:59 UTC<input name="resolutionDate" type="date" required></label><label><input name="publicAcknowledgment" type="checkbox" value="yes" required> Anyone with the link can view, copy, screenshot, and reshare this receipt. It is not private and may persist in caches.</label><button id="review" type="button">Review receipt</button><section id="preview" hidden><h2>Exact public original</h2><pre id="preview-text" class="note"></pre><p>This original cannot be edited after publication.</p><button id="back" type="button">Back and edit</button><button id="seal">Confirm and seal public receipt</button></section><p id="error" class="error" role="alert"></p></form><section id="result" hidden><h2>Receipt recorded</h2><p>Save the private management link. Anyone who obtains it can add the outcome; Dasha has not verified their identity. Losing it may mean losing management access.</p><label>Public receipt<input id="public" readonly></label><button id="copy-public" type="button">Copy public link</button><label>Private management link<input id="manage" readonly></label><button id="copy-manage" type="button">Copy management link</button><a id="open" class="button">Open receipt</a></section></main><script nonce="${nonce}">
const form=document.querySelector('#create'),error=document.querySelector('#error'),result=document.querySelector('#result'),preview=document.querySelector('#preview'),review=document.querySelector('#review'),seal=document.querySelector('#seal'),date=form.elements.resolutionDate;
let reviewedPayload;
date.min=new Date().toISOString().slice(0,10);
review.onclick=()=>{if(!form.reportValidity())return;reviewedPayload=Object.fromEntries(new FormData(form));reviewedPayload.confidence=Number(reviewedPayload.confidence);document.querySelector('#preview-text').textContent=['Token: '+reviewedPayload.assetId,'Confidence: '+reviewedPayload.confidence+'%','Resolution deadline: '+reviewedPayload.resolutionDate+' at 23:59 UTC','Thesis: '+reviewedPayload.thesis,'Invalid if: '+reviewedPayload.invalidation].join('\\n');preview.hidden=false;review.hidden=true;preview.scrollIntoView({behavior:'smooth'})};
document.querySelector('#back').onclick=()=>{reviewedPayload=null;preview.hidden=true;review.hidden=false};
form.addEventListener('submit',async event=>{event.preventDefault();if(!reviewedPayload)return;error.textContent='';seal.disabled=true;const response=await fetch('/api/receipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reviewedPayload)}),data=await response.json();if(!response.ok){seal.disabled=false;error.textContent=data.error||'Could not create receipt.';return}form.elements.inviteCode.value='';document.querySelector('#public').value=data.publicUrl;document.querySelector('#manage').value=data.manageUrl;document.querySelector('#open').href=data.manageUrl;result.hidden=false;result.scrollIntoView({behavior:'smooth'})});
for(const [button,input] of [['copy-public','public'],['copy-manage','manage']])document.querySelector('#'+button).onclick=async()=>{await navigator.clipboard.writeText(document.querySelector('#'+input).value);document.querySelector('#'+button).textContent='Copied'};
</script></body></html>`;
}

function receiptPage(row, outcome, nonce) {
  const result = outcome ? `<section><h2>Manager-added outcome</h2><p><strong>${escapeHtml(outcome.status.replaceAll('_', ' '))}</strong> · recorded ${escapeHtml(outcome.recorded_at)}</p><p>${escapeHtml(outcome.postmortem)}</p>${outcome.source_url ? `<p><a href="${escapeHtml(outcome.source_url)}" rel="nofollow ugc noopener noreferrer">Submitter-provided source · ${escapeHtml(new URL(outcome.source_url).hostname)} (not verified)</a></p>` : ''}</section>` : '<p><strong>Open.</strong> No outcome has been added.</p>';
  const manage = outcome ? '' : `<form id="outcome" hidden><h2>Add outcome</h2><p class="note">This action is append-only and cannot rewrite the original. “Held” means the declared invalidation did not fire by the deadline; it does not prove the thesis true. “Expired” means the declared rule could not decide it.</p><label>Status<select name="status"><option value="invalidated">Invalidated</option><option value="held">Held through deadline</option><option value="expired">Expired undecided</option><option value="disputed">Disputed</option></select></label><label>Postmortem<textarea name="postmortem" required maxlength="280"></textarea></label><label>Resolution source (optional HTTPS URL)<input name="sourceUrl" type="url"></label><button>Record outcome</button><p id="manage-error" class="error" role="alert"></p></form>`;
  const managementScript = outcome ? '' : `const secret=new URLSearchParams(location.hash.slice(1)).get('manage'),manageForm=document.querySelector('#outcome'),manageError=document.querySelector('#manage-error');if(secret){history.replaceState(null,'',location.pathname);manageForm.hidden=false;manageForm.addEventListener('submit',async event=>{event.preventDefault();manageError.textContent='';const payload=Object.fromEntries(new FormData(manageForm));payload.manageToken=secret;if(!payload.sourceUrl)delete payload.sourceUrl;const response=await fetch('/api/receipts/${escapeHtml(row.id)}/outcome',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok){manageError.textContent=data.error||'Could not record outcome.';return}location.reload()})}`;
  const report = `<details><summary>Report this receipt</summary><form id="report"><label>Reason<select name="reason"><option value="spam_scam">Spam or scam</option><option value="harassment">Harassment, hate, or threat</option><option value="impersonation">Impersonation</option><option value="personal_information">Personal information</option><option value="illegal_safety">Illegal or urgent safety issue</option><option value="deceptive_token_claim">Deceptive token claim</option><option value="other">Other</option></select></label><label>Context (optional)<textarea name="detail" maxlength="280"></textarea></label><button>Send report</button><p id="report-status" role="status"></p></form></details>`;
  const script = `<script nonce="${nonce}">${managementScript}document.querySelector('#share').href='https://x.com/intent/post?text='+encodeURIComponent('Dasha thesis receipt\\n'+location.href);const reportForm=document.querySelector('#report'),reportStatus=document.querySelector('#report-status');reportForm.addEventListener('submit',async event=>{event.preventDefault();reportStatus.textContent='';const payload=Object.fromEntries(new FormData(reportForm));if(!payload.detail)delete payload.detail;const response=await fetch('/api/receipts/${escapeHtml(row.id)}/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});reportStatus.textContent=response.ok?'Report received. Reports do not guarantee removal.':'Could not send report.';if(response.ok)reportForm.querySelector('button').disabled=true})</script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Dasha receipt ${escapeHtml(row.id)}</title><style>${pageStyle}</style></head><body><main><p>Dasha · public-by-link beta receipt</p><h1>Thesis receipt</h1><article><dl><dt>Token</dt><dd>${escapeHtml(row.asset_id)}</dd><dt>Thesis</dt><dd>${escapeHtml(row.thesis)}</dd><dt>Invalid if</dt><dd>${escapeHtml(row.invalidation)}</dd><dt>Confidence</dt><dd>${row.confidence}%</dd><dt>Resolution deadline</dt><dd>${escapeHtml(row.resolution_date)} at 23:59 UTC</dd><dt>Dasha recorded</dt><dd>${escapeHtml(row.received_at)}</dd><dt>SHA-256</dt><dd>${escapeHtml(row.payload_hash)}</dd></dl></article>${result}${manage}<p>Dasha's server recorded this submission at the displayed UTC time. The original is locked against ordinary product edits. This does not prove authorship, identity, a trade, truth, completeness, or token safety. An outcome is an assertion added by whoever holds the private management secret.</p><p class="note">Anyone with this link can view and reshare it. It is unlisted and marked noindex, not private.</p><p><a id="share" class="button" target="_blank" rel="noopener noreferrer" aria-label="Share public receipt on X (opens in a new tab)">Share on X</a> <a class="button" href="/r/${escapeHtml(row.id)}.ics">Add resolution reminder</a></p>${report}<p><a href="/">Write another receipt</a></p></main>${script}</body></html>`;
}

function tombstonePage(id, tombstone) {
  const reason = tombstone.reason === 'legal' ? 'a legal requirement' : tombstone.reason === 'privacy_safety' ? 'privacy or safety requirements' : 'the community rules';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Dasha receipt unavailable</title><style>${pageStyle}</style></head><body><main><p>Dasha · receipt ${escapeHtml(id)}</p><h1>Receipt unavailable</h1><article><p>This receipt was removed for ${reason}.</p><p>Removed ${escapeHtml(tombstone.tombstoned_at)}.</p></article><p>The stable URL remains as a removal record. The original public text and outcome are no longer displayed.</p></main></body></html>`;
}

export async function handleDashaReceiptRequest(request, env) {
  const url = new URL(request.url);
  const allowedOrigin = env.ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin || requestOrigin !== allowedOrigin) return new Response(null, { status: 403, headers: SECURITY });
    return new Response(null, { status: 204, headers: { ...responseHeaders(allowedOrigin), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  try {
    if (request.method === 'GET' && url.pathname === '/') {
      const nonce = randomBytes(18).toString('base64');
      return new Response(creatorPage(nonce), { headers: responseHeaders(null, 'text/html; charset=utf-8', nonce) });
    }

    if (request.method === 'POST' && url.pathname === '/api/receipts') {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!await authAllowed(env, request, 'create')) return json({ error: env.AUTH_RATE_LIMITER ? 'authentication limit reached' : 'creation is temporarily unavailable' }, env.AUTH_RATE_LIMITER ? 429 : 503, allowedOrigin);
      const submitted = await body(request);
      if (!env.BETA_INVITE_HASH || !verifyManagementSecret(submitted.inviteCode, env.BETA_INVITE_HASH)) return json({ error: 'beta invite code rejected' }, 403, allowedOrigin);
      if (submitted.publicAcknowledgment !== 'yes') return json({ error: 'public receipt acknowledgment is required' }, 400, allowedOrigin);
      if (!env.CREATE_RATE_LIMITER) return json({ error: 'creation is temporarily unavailable' }, 503, allowedOrigin);
      const inviteKey = createHash('sha256').update(submitted.inviteCode).digest('hex');
      if (!(await env.CREATE_RATE_LIMITER.limit({ key: inviteKey })).success) return json({ error: 'creation limit reached; try again shortly' }, 429, allowedOrigin);
      delete submitted.inviteCode;
      delete submitted.publicAcknowledgment;
      if (!Number.isInteger(env.BETA_MAX_RECEIPTS)) return json({ error: 'beta receipt capacity is not configured' }, 503, allowedOrigin);
      const created = createReceipt(submitted);
      const row = created.record;
      const inserted = await env.DB.prepare(`INSERT INTO receipts (${RECEIPT_COLUMNS}) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11 WHERE (SELECT count(*) FROM receipts) < ?12`).bind(row.id, row.schemaVersion, row.assetKind, row.assetId, row.thesis, row.invalidation, row.confidence, row.resolutionDate, row.receivedAt, row.payloadHash, row.manageTokenHash, env.BETA_MAX_RECEIPTS).run();
      if (inserted.meta?.changes !== 1) return json({ error: 'beta receipt capacity reached' }, 503, allowedOrigin);
      const publicUrl = `${env.PUBLIC_ORIGIN.replace(/\/$/, '')}/r/${row.id}`;
      return json({ id: row.id, receivedAt: row.receivedAt, payloadHash: row.payloadHash, publicUrl, manageUrl: `${publicUrl}#manage=${created.manageToken}` }, 201, allowedOrigin);
    }

    const match = url.pathname.match(/^\/r\/([A-Za-z0-9_-]{22})$/);
    const calendarMatch = url.pathname.match(/^\/r\/([A-Za-z0-9_-]{22})\.ics$/);
    if (request.method === 'GET' && calendarMatch) {
      const row = await env.DB.prepare(`SELECT ${RECEIPT_COLUMNS} FROM receipts WHERE id = ?1`).bind(calendarMatch[1]).first();
      if (!row) return new Response('Not found', { status: 404, headers: responseHeaders(null, 'text/plain; charset=utf-8') });
      if (await env.DB.prepare('SELECT receipt_id FROM tombstones WHERE receipt_id = ?1').bind(row.id).first()) return new Response('Receipt unavailable', { status: 410, headers: responseHeaders(null, 'text/plain; charset=utf-8') });
      const publicUrl = `${env.PUBLIC_ORIGIN.replace(/\/$/, '')}/r/${row.id}`;
      const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Dasha//Receipt Resolution//EN\r\nBEGIN:VEVENT\r\nUID:${row.id}@getdasha.com\r\nDTSTAMP:${row.received_at.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}\r\nDTSTART;VALUE=DATE:${row.resolution_date.replaceAll('-', '')}\r\nSUMMARY:Resolve Dasha thesis receipt\r\nDESCRIPTION:${publicUrl}\r\nURL:${publicUrl}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
      return new Response(calendar, { headers: { ...responseHeaders(null, 'text/calendar; charset=utf-8'), 'Content-Disposition': `attachment; filename="dasha-resolution-${row.resolution_date}.ics"` } });
    }
    if (request.method === 'GET' && match) {
      const row = await env.DB.prepare(`SELECT ${RECEIPT_COLUMNS} FROM receipts WHERE id = ?1`).bind(match[1]).first();
      if (!row) return new Response('Not found', { status: 404, headers: responseHeaders(null, 'text/plain; charset=utf-8') });
      const tombstone = await env.DB.prepare('SELECT reason, tombstoned_at FROM tombstones WHERE receipt_id = ?1').bind(row.id).first();
      if (tombstone) {
        if (url.searchParams.get('format') === 'json') return json({ id: row.id, status: 'tombstoned', removedAt: tombstone.tombstoned_at }, 200, allowedOrigin);
        return new Response(tombstonePage(row.id, tombstone), { headers: responseHeaders(null, 'text/html; charset=utf-8') });
      }
      const outcome = await env.DB.prepare('SELECT status, postmortem, source_url, recorded_at, outcome_hash FROM outcomes WHERE receipt_id = ?1').bind(row.id).first();
      if (url.searchParams.get('format') === 'json') return json(publicReceipt(row, outcome), 200, allowedOrigin);
      const nonce = randomBytes(18).toString('base64');
      return new Response(receiptPage(row, outcome, nonce), { headers: responseHeaders(null, 'text/html; charset=utf-8', nonce) });
    }

    const outcomeMatch = url.pathname.match(/^\/api\/receipts\/([A-Za-z0-9_-]{22})\/outcome$/);
    if (request.method === 'POST' && outcomeMatch) {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!env.OUTCOME_AUTH_RATE_LIMITER) return json({ error: 'outcomes are temporarily unavailable' }, 503, allowedOrigin);
      const attemptKey = `${outcomeMatch[1]}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
      if (!(await env.OUTCOME_AUTH_RATE_LIMITER.limit({ key: attemptKey })).success) return json({ error: 'outcome authentication limit reached' }, 429, allowedOrigin);
      const submitted = await body(request);
      const row = await env.DB.prepare(`SELECT ${RECEIPT_COLUMNS} FROM receipts WHERE id = ?1`).bind(outcomeMatch[1]).first();
      if (!row) return json({ error: 'receipt not found' }, 404, allowedOrigin);
      if (await env.DB.prepare('SELECT receipt_id FROM tombstones WHERE receipt_id = ?1').bind(row.id).first()) return json({ error: 'receipt is unavailable' }, 410, allowedOrigin);
      if (!verifyManagementSecret(submitted.manageToken, row.manage_token_hash)) return json({ error: 'management secret rejected' }, 403, allowedOrigin);
      if (!env.OUTCOME_RATE_LIMITER) return json({ error: 'outcomes are temporarily unavailable' }, 503, allowedOrigin);
      if (!(await env.OUTCOME_RATE_LIMITER.limit({ key: row.id })).success) return json({ error: 'outcome limit reached; try again shortly' }, 429, allowedOrigin);
      const clean = outcomeInput(submitted);
      if (['held', 'expired'].includes(clean.status) && new Date(`${row.resolution_date}T23:59:59.999Z`) > new Date()) return json({ error: 'receipt is not due for review' }, 409, allowedOrigin);
      const recordedAt = new Date().toISOString();
      const outcomeHash = createHash('sha256').update(JSON.stringify([1, row.id, row.payload_hash, clean.status, clean.postmortem, clean.sourceUrl, recordedAt])).digest('hex');
      const inserted = await env.DB.prepare('INSERT OR IGNORE INTO outcomes (receipt_id, status, postmortem, source_url, recorded_at, outcome_hash) VALUES (?1,?2,?3,?4,?5,?6)').bind(row.id, clean.status, clean.postmortem, clean.sourceUrl, recordedAt, outcomeHash).run();
      const stored = await env.DB.prepare('SELECT status, postmortem, source_url, recorded_at, outcome_hash FROM outcomes WHERE receipt_id = ?1').bind(row.id).first();
      if (inserted.meta?.changes === 1) return json({ outcome: stored }, 201, allowedOrigin);
      return stored.status === clean.status && stored.postmortem === clean.postmortem && stored.source_url === clean.sourceUrl ? json({ outcome: stored }, 200, allowedOrigin) : json({ error: 'receipt already has a different outcome' }, 409, allowedOrigin);
    }

    const tombstoneMatch = url.pathname.match(/^\/api\/moderation\/receipts\/([A-Za-z0-9_-]{22})\/tombstone$/);
    if (request.method === 'POST' && tombstoneMatch) {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!await authAllowed(env, request, 'moderation')) return json({ error: env.AUTH_RATE_LIMITER ? 'authentication limit reached' : 'moderation is temporarily unavailable' }, env.AUTH_RATE_LIMITER ? 429 : 503, allowedOrigin);
      const submitted = await body(request);
      if (!env.MODERATOR_TOKEN_HASH || !verifyManagementSecret(submitted.moderatorToken, env.MODERATOR_TOKEN_HASH)) return json({ error: 'moderator credential rejected' }, 403, allowedOrigin);
      if (!['community_rules', 'privacy_safety', 'legal'].includes(submitted.reason)) return json({ error: 'unsupported removal reason' }, 400, allowedOrigin);
      const receipt = await env.DB.prepare('SELECT id FROM receipts WHERE id = ?1').bind(tombstoneMatch[1]).first();
      if (!receipt) return json({ error: 'receipt not found' }, 404, allowedOrigin);
      const tombstonedAt = new Date().toISOString();
      await env.DB.prepare('INSERT OR IGNORE INTO tombstones (receipt_id, reason, tombstoned_at) VALUES (?1,?2,?3)').bind(receipt.id, submitted.reason, tombstonedAt).run();
      return json({ id: receipt.id, status: 'tombstoned' }, 200, allowedOrigin);
    }

    if (request.method === 'POST' && url.pathname === '/api/moderation/reports') {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!await authAllowed(env, request, 'moderation')) return json({ error: env.AUTH_RATE_LIMITER ? 'authentication limit reached' : 'moderation is temporarily unavailable' }, env.AUTH_RATE_LIMITER ? 429 : 503, allowedOrigin);
      const submitted = await body(request);
      if (!env.MODERATOR_TOKEN_HASH || !verifyManagementSecret(submitted.moderatorToken, env.MODERATOR_TOKEN_HASH)) return json({ error: 'moderator credential rejected' }, 403, allowedOrigin);
      const result = await env.DB.prepare('SELECT reports.id, reports.receipt_id, reports.reason, reports.detail, reports.received_at FROM reports LEFT JOIN report_decisions ON report_decisions.report_id = reports.id WHERE report_decisions.report_id IS NULL ORDER BY reports.received_at LIMIT 100').all();
      return json({ reports: result.results }, 200, allowedOrigin);
    }

    const decisionMatch = url.pathname.match(/^\/api\/moderation\/reports\/([A-Za-z0-9_-]{22})\/decision$/);
    if (request.method === 'POST' && decisionMatch) {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!await authAllowed(env, request, 'moderation')) return json({ error: env.AUTH_RATE_LIMITER ? 'authentication limit reached' : 'moderation is temporarily unavailable' }, env.AUTH_RATE_LIMITER ? 429 : 503, allowedOrigin);
      const submitted = await body(request);
      if (!env.MODERATOR_TOKEN_HASH || !verifyManagementSecret(submitted.moderatorToken, env.MODERATOR_TOKEN_HASH)) return json({ error: 'moderator credential rejected' }, 403, allowedOrigin);
      if (!['dismissed', 'actioned'].includes(submitted.decision)) return json({ error: 'unsupported report decision' }, 400, allowedOrigin);
      if (!await env.DB.prepare('SELECT id FROM reports WHERE id = ?1').bind(decisionMatch[1]).first()) return json({ error: 'report not found' }, 404, allowedOrigin);
      await env.DB.prepare('INSERT OR IGNORE INTO report_decisions (report_id, decision, decided_at) VALUES (?1,?2,?3)').bind(decisionMatch[1], submitted.decision, new Date().toISOString()).run();
      const stored = await env.DB.prepare('SELECT decision, decided_at FROM report_decisions WHERE report_id = ?1').bind(decisionMatch[1]).first();
      return stored.decision === submitted.decision ? json({ decision: stored }, 200, allowedOrigin) : json({ error: 'report already has a different decision' }, 409, allowedOrigin);
    }

    const reportMatch = url.pathname.match(/^\/api\/receipts\/([A-Za-z0-9_-]{22})\/report$/);
    if (request.method === 'POST' && reportMatch) {
      if (!allowedOrigin || requestOrigin !== allowedOrigin) return json({ error: 'origin not allowed' }, 403, allowedOrigin);
      if (!env.REPORT_RATE_LIMITER) return json({ error: 'reporting is temporarily unavailable' }, 503, allowedOrigin);
      const key = `${reportMatch[1]}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
      if (!(await env.REPORT_RATE_LIMITER.limit({ key })).success) return json({ error: 'report limit reached' }, 429, allowedOrigin);
      const submitted = await body(request);
      if (!REPORT_REASONS.has(submitted.reason)) return json({ error: 'unsupported report reason' }, 400, allowedOrigin);
      let detail = null;
      if (submitted.detail) {
        if (typeof submitted.detail !== 'string') return json({ error: 'report detail must be text' }, 400, allowedOrigin);
        detail = submitted.detail.normalize('NFC').trim();
        if (!detail || [...detail].length > 280 || /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/.test(detail)) return json({ error: 'report detail must be 1–280 safe characters' }, 400, allowedOrigin);
      }
      const receipt = await env.DB.prepare('SELECT id FROM receipts WHERE id = ?1').bind(reportMatch[1]).first();
      if (!receipt) return json({ error: 'receipt not found' }, 404, allowedOrigin);
      if (await env.DB.prepare('SELECT receipt_id FROM tombstones WHERE receipt_id = ?1').bind(receipt.id).first()) return json({ error: 'receipt is unavailable' }, 410, allowedOrigin);
      await env.DB.prepare('INSERT INTO reports (id, receipt_id, reason, detail, received_at) VALUES (?1,?2,?3,?4,?5)').bind(randomBytes(16).toString('base64url'), receipt.id, submitted.reason, detail, new Date().toISOString()).run();
      return json({ status: 'received' }, 202, allowedOrigin);
    }

    return new Response('Method not allowed', { status: 405, headers: responseHeaders(null, 'text/plain; charset=utf-8') });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) return json({ error: error.message }, 400, allowedOrigin);
    console.error(error);
    return json({ error: 'internal error' }, 500, allowedOrigin);
  }
}

export default { fetch: handleDashaReceiptRequest };
