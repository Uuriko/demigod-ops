/**
 * DIE operator desk — hosted read-only Worker for app.trydemigod.com.
 * Access JWT *shape* gate on app routes. Public GET/HEAD /healthz only.
 * Named OpenAI · Account Director stub. No people-data. Mutations off.
 * Header: x-demigod-die: hosted-read-only
 */
const PUBLIC_HOST = "app.trydemigod.com";
const NAMED = Object.freeze({
  roleId: "named:wd:Q21708200",
  title: "Account Director, Digital Native",
  companyId: "wd:Q21708200",
  companyName: "OpenAI",
  domain: "openai.com",
  website: "https://openai.com/",
  source: "named_brief",
  state: "named_brief",
  stage: "brief_ready",
  demo: false,
  href: "/roles/named:wd:Q21708200",
  companyHref: "/companies/wd:Q21708200",
  checkpoints: [
    { id: "named_brief", ok: true, reason: null },
    { id: "calibrated_packet", ok: false, reason: "named_brief_blanks" },
    { id: "company_context", ok: true, reason: null },
  ],
  channelCounts: {
    inbound: 0,
    referrals: 0,
    shortlist: 0,
    rediscovery: 0,
    priorPairs: 0,
    reviewed: 0,
  },
});

export function accessJwtShapeOk(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return false;
  try {
    const json = atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
    const header = JSON.parse(json);
    return Boolean(header && typeof header.alg === "string" && header.alg);
  } catch {
    return false;
  }
}

export function hostedPath(pathname) {
  const p = String(pathname || "/");
  if (p === "/" || p === "/roles" || p === "/roles/") return "roles";
  if (p === "/companies" || p === "/companies/") return "companies";
  if (p === "/healthz") return "healthz";
  if (p === `/roles/${NAMED.roleId}` || p === `/roles/${encodeURIComponent(NAMED.roleId)}`) return "role";
  if (p === `/companies/${NAMED.companyId}` || p === `/companies/${encodeURIComponent(NAMED.companyId)}`) {
    return "company";
  }
  if (p === "/api/v1/roles") return "api-roles";
  if (p === `/api/v1/roles/${NAMED.roleId}` || p === `/api/v1/roles/${encodeURIComponent(NAMED.roleId)}`) {
    return "api-role";
  }
  if (
    p === `/api/v1/roles/${NAMED.roleId}/workspace` ||
    p === `/api/v1/roles/${encodeURIComponent(NAMED.roleId)}/workspace`
  ) {
    return "api-workspace";
  }
  if (p === "/api/v1/companies") return "api-companies";
  if (
    p === `/api/v1/companies/${NAMED.companyId}` ||
    p === `/api/v1/companies/${encodeURIComponent(NAMED.companyId)}`
  ) {
    return "api-company";
  }
  if (p === "/api/v1/session") return "api-session";
  return null;
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "x-demigod-die": "hosted-read-only",
      ...extra,
    },
  });
}

function html(status, title, body) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body>${body}</body></html>`;
  return new Response(page, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "x-demigod-die": "hosted-read-only",
    },
  });
}

function esc(value) {
  return String(value || "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[ch]);
}

function roleList() {
  return {
    schema: "demigod.die-role-list/1",
    q: "",
    total: 1,
    limit: 20,
    cursor: 0,
    nextCursor: null,
    rows: [{
      roleId: NAMED.roleId,
      title: NAMED.title,
      companyId: NAMED.companyId,
      demo: false,
      state: NAMED.state,
      stage: NAMED.stage,
      checkpoints: NAMED.checkpoints,
      channelCounts: NAMED.channelCounts,
      updatedAt: null,
      version: 0,
      editable: false,
      href: NAMED.href,
    }],
  };
}

function companyList() {
  return {
    schema: "demigod.die-company-list/1",
    q: "",
    total: 1,
    limit: 20,
    cursor: 0,
    nextCursor: null,
    rows: [{
      id: NAMED.companyId,
      name: NAMED.companyName,
      domain: NAMED.domain,
      website: NAMED.website,
      href: NAMED.companyHref,
    }],
  };
}

function workspace() {
  return {
    schema: "demigod.role-workspace/1",
    roleId: NAMED.roleId,
    state: NAMED.state,
    calibration: {
      status: "named_brief",
      demo: false,
      title: NAMED.title,
      outcome90d: "",
      mustHaves: [],
      dealBreakers: [],
      stage: NAMED.stage,
    },
    company: {
      companyId: NAMED.companyId,
      identity: { name: NAMED.companyName, domain: NAMED.domain, website: NAMED.website },
      status: "known",
    },
    evidenceReview: { schema: "demigod.evidence-review/1", state: "named_brief_blanks", questions: [] },
    candidateChannels: {
      inbound: { count: 0, candidates: [] },
      referrals: { count: 0, candidates: [] },
      shortlist: { active: 0, max: 3, total: 0, candidates: [] },
      rediscovery: { count: 0, candidates: [] },
      priorPairs: { count: 0, pairs: [] },
      reviewed: { noteCount: 0, candidateCount: 0, candidateIds: [] },
    },
    pairPackets: [],
    checkpoints: NAMED.checkpoints,
    authority: {
      review: "human",
      employmentDecision: "human",
      consent: "existing_pair_receipts_only",
      intro: "existing_mutual_consent_gate_only",
      externalAction: "none",
    },
  };
}

function session() {
  return {
    schema: "demigod.die-session/1",
    mode: "hosted_read_only",
    modeLabel: "Private",
    authenticated: true,
    hosted: true,
    mutations: false,
    access: { publicHost: PUBLIC_HOST, publicUrl: `https://${PUBLIC_HOST}` },
  };
}

export async function handleRequest(request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return json(405, { ok: false, error: "method_not_allowed" }, { Allow: "GET, HEAD" });
  }
  const kind = hostedPath(url.pathname);
  if (kind === "healthz") {
    return json(200, { ok: true, service: "demigod-die", release: "hosted-read-only-h2.1" });
  }
  if (!accessJwtShapeOk(request.headers.get("Cf-Access-Jwt-Assertion"))) {
    return json(403, { ok: false, error: "access_required" });
  }
  if (!kind) return json(404, { ok: false, error: "not_found" });
  if (kind === "api-session") return json(200, session());
  if (kind === "api-roles") return json(200, roleList());
  if (kind === "api-companies") return json(200, companyList());
  if (kind === "api-role") {
    return json(200, {
      schema: "demigod.die-role-definition/1",
      roleId: NAMED.roleId,
      version: 0,
      editable: false,
      packet: null,
    });
  }
  if (kind === "api-workspace") return json(200, workspace());
  if (kind === "api-company") {
    return json(200, {
      schema: "demigod.die-company/1",
      identity: { id: NAMED.companyId, name: NAMED.companyName, domain: NAMED.domain, website: NAMED.website },
    });
  }
  if (kind === "roles") {
    return html(
      200,
      "Roles · DIE",
      `<h1>Roles</h1><p>${esc(NAMED.companyName)} · ${esc(NAMED.title)}</p><p><a href="${esc(NAMED.href)}">Open workspace</a></p><p>Read-only. Mutations stay off.</p>`,
    );
  }
  if (kind === "companies") {
    return html(
      200,
      "Companies · DIE",
      `<h1>Companies</h1><p><a href="${esc(NAMED.companyHref)}">${esc(NAMED.companyName)}</a> · ${esc(NAMED.companyId)}</p>`,
    );
  }
  if (kind === "role") {
    return html(
      200,
      `${NAMED.title} · DIE`,
      `<h1>${esc(NAMED.title)}</h1><p>${esc(NAMED.companyName)} · ${esc(NAMED.companyId)}</p><p>Named brief. Must-haves and the 90-day outcome stay blank until a person writes them.</p>`,
    );
  }
  if (kind === "company") {
    return html(
      200,
      `${NAMED.companyName} · DIE`,
      `<h1>${esc(NAMED.companyName)}</h1><p>${esc(NAMED.companyId)}</p>`,
    );
  }
  return json(404, { ok: false, error: "not_found" });
}

export default {
  async fetch(request) {
    return handleRequest(request);
  },
};
