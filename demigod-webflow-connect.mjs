#!/usr/bin/env node
/**
 * demigod-webflow-connect — deepen agent ↔ Webflow links (MCP, Bridge, token, webhooks).
 *
 *   node demigod-webflow-connect.mjs status
 *   node demigod-webflow-connect.mjs bridge     # open Designer Bridge deep-link via CDP
 *   node demigod-webflow-connect.mjs all        # status + open bridge
 *   node demigod-webflow-connect.mjs setup      # doctor + auth steps (optionally open bridge)
 *
 * Out: /tmp/dg-busy/webflow-connect.json
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  resolveWebflowApiToken,
  WEBFLOW_MCP_BRIDGE_URL,
  WEBFLOW_SITE_ID,
  WEBFLOW_SITE_SLUG,
} from './demigod-webflow-token.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';
import { openUrl, listPages, cdpUp, DESIGNER } from './demigod-webflow-lib.mjs';
import { ensureBusy, atomicWrite, BUSY } from './demigod-agent-tools-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(BUSY, 'webflow-connect.json');
const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const asJson = args.includes('--json');
const CMDS = ['status', 'bridge', 'all', 'setup'];

if (!CMDS.includes(cmd) || args.slice(1).some((arg) => arg !== '--json') || args.filter((arg) => arg === '--json').length > 1) {
  console.error('usage: demigod-webflow-connect.mjs status|bridge|all|setup [--json]');
  process.exit(2);
}

function fileHas(file, re) {
  try {
    return re.test(fs.readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
}

function mcpConfigs() {
  const home = os.homedir();
  const grokToml = path.join(home, '.grok/config.toml');
  return {
    grok: fileHas(grokToml, /mcp\.webflow\.com/),
    claude: fileHas(path.join(home, '.claude.json'), /mcp\.webflow\.com/),
    codex: fileHas(path.join(home, '.codex/config.toml'), /mcp\.webflow\.com/),
    grokChromeDevtools: fileHas(grokToml, /chrome.devtools|chrome_devtools|chrome-devtools-mcp/),
    grokWebflowDocs: fileHas(grokToml, /fern-docs\/mcp|webflow_docs/),
  };
}

function mcpCreds() {
  try {
    const p = path.join(os.homedir(), '.grok/mcp_credentials.json');
    if (!fs.existsSync(p)) {
      return {
        ok: false,
        reason: 'no ~/.grok/mcp_credentials.json — authorize Webflow MCP',
        authHow: grokOauthSteps(),
      };
    }
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const keys = Object.keys(d).filter((k) => /webflow/i.test(k));
    const wf = d['webflow:https://mcp.webflow.com/mcp'] || (keys[0] ? d[keys[0]] : null);
    if (!wf?.token_response?.access_token) {
      return {
        ok: false,
        reason: 'webflow entry present but no access_token',
        authHow: grokOauthSteps(),
      };
    }
    const at = Number(wf.token_received_at) || 0;
    const exp = Number(wf.token_response.expires_in) || 3600;
    // token_received_at may be wall-clock epoch (ms or s) — accept either
    const receivedMs = at > 1e12 ? at : at * 1000;
    const ageSec = receivedMs ? Math.round((Date.now() - receivedMs) / 1000) : null;
    return {
      ok: true,
      ageSec,
      expiresIn: exp,
      // MCP refreshes; age alone is informational
      note: 'MCP OAuth present (Grok). REST Data API still needs site token.',
    };
  } catch (e) {
    return { ok: false, reason: String(e.message || e), authHow: grokOauthSteps() };
  }
}

function grokOauthSteps() {
  return [
    'In Grok TUI: /mcps  (or Ctrl+L → MCP Servers)',
    'Select webflow → press i to authenticate OAuth',
    'Browser opens Webflow — log in, authorize talentlink-sf site',
    'Confirm: grok mcp doctor webflow  (should be healthy)',
    'Designer MCP also needs Bridge open: bin/dg-webflow connect bridge',
  ];
}

function grokMcpDoctorWebflow() {
  try {
    const r = spawnSync('grok', ['mcp', 'doctor', 'webflow', '--json'], {
      encoding: 'utf8',
      timeout: 25000,
      env: process.env,
    });
    const raw = (r.stdout || r.stderr || '').trim();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    const healthy =
      r.status === 0 &&
      (parsed?.ok === true ||
        parsed?.healthy === true ||
        /healthy|pass|ok/i.test(raw) && !/AuthorizationRequired|auth|fail/i.test(raw));
    // Prefer structured fail signals
    const authRequired =
      /AuthorizationRequired|OAuth authorization required|auth required/i.test(raw) ||
      parsed?.error?.includes?.('Auth') ||
      false;
    return {
      ok: Boolean(healthy) && !authRequired,
      exit: r.status,
      authRequired,
      snippet: raw.slice(0, 400),
    };
  } catch (e) {
    return { ok: false, exit: null, authRequired: null, snippet: String(e.message || e) };
  }
}

function agentInstructionsMirror() {
  const local = path.join(ROOT, 'docs/WEBFLOW-AGENT-INSTRUCTIONS.md');
  return {
    localPath: local,
    localExists: fs.existsSync(local),
    webflowPath: 'rules/demigod-agent.md',
    siteId: WEBFLOW_SITE_ID,
  };
}

async function buildConnectStatus() {
  const token = resolveWebflowApiToken();
  const configs = mcpConfigs();
  const creds = mcpCreds();
  const doctor = grokMcpDoctorWebflow();
  const webhookPublic = resolveWebhookPublicUrl();
  let designerOpen = false;
  let pages = [];
  const cdp = await cdpUp();
  const cdpOk = Boolean(cdp.ok);
  if (cdpOk) {
    try {
      pages = await listPages();
      designerOpen = pages.some(
        (p) => p.type === 'page' && /talentlink-sf\.design\.webflow\.com/i.test(p.url || ''),
      );
    } catch {
      pages = [];
    }
  }

  let webhookLocal = false;
  try {
    const port = process.env.DEMIGOD_WEBHOOK_PORT || 9877;
    const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
    webhookLocal = r.ok || r.status < 500;
  } catch {
    webhookLocal = false;
  }

  const layers = {
    mcpConfigCore: Boolean(configs.grok && configs.claude && configs.codex),
    mcpConfigAllAgents: Boolean(configs.grok && configs.claude && configs.codex),
    mcpChromeDevtools: Boolean(configs.grokChromeDevtools),
    mcpWebflowDocs: Boolean(configs.grokWebflowDocs),
    mcpOAuthGrok: creds.ok,
    mcpDoctorHealthy: doctor.ok,
    cdp: cdpOk,
    designerTab: designerOpen,
    siteTokenRest: Boolean(token.token),
    webhookPublic: Boolean(webhookPublic),
    webhookLocal,
  };

  return {
    at: new Date().toISOString(),
    site: WEBFLOW_SITE_SLUG,
    siteId: WEBFLOW_SITE_ID,
    bridgeUrl: WEBFLOW_MCP_BRIDGE_URL,
    designer: DESIGNER,
    layers,
    mcpConfigs: configs,
    mcpOAuth: creds,
    mcpDoctor: doctor,
    cdp: cdp,
    siteToken: {
      ok: Boolean(token.token),
      source: token.source,
      envFile: path.join(os.homedir(), '.config/demigod/webflow.env'),
      hint: token.token
        ? null
        : 'Create site token in Webflow → Apps & integrations → API access; write to ~/.config/demigod/webflow.env as WEBFLOW_API_TOKEN=…',
    },
    webhooks: {
      publicUrl: webhookPublic || null,
      localListening: webhookLocal,
      localPort: Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877),
      register: webhookPublic
        ? 'node demigod-webflow-webhook-setup.mjs  # or MCP data_webhook_tool'
        : 'Set DEMIGOD_WEBHOOK_PUBLIC_URL (tunnel) then run webhook setup / MCP create',
    },
    agentInstructions: agentInstructionsMirror(),
    spine: {
      dataMcp: 'CMS, SEO, pages, publish, webhooks, agent instructions (no Bridge)',
      designerMcp: 'Canvas structure/styles — Bridge App open in Designer',
      cdpShip: 'CM6 head/footer paste + queue-publish — bin/dg ship',
      footCdn: 'Product runtime demigod-foot-core.js',
      eyes: 'chrome-devtools MCP on live trydemigod.com',
    },
    authHow: creds.ok ? null : grokOauthSteps(),
    tips: [
      !configs.grok && 'Grok: [mcp_servers.webflow] url = https://mcp.webflow.com/mcp in ~/.grok/config.toml',
      !configs.codex && 'Codex: ensure [mcp_servers.webflow] in ~/.codex/config.toml',
      !creds.ok && 'Grok Webflow MCP needs OAuth: /mcps → select webflow → i',
      !doctor.ok && creds.ok && 'grok mcp doctor webflow still unhealthy — re-auth or check network',
      !cdpOk && 'CDP down — ~/agent-dev.sh up (Chrome :9223, Webflow-logged profile)',
      !designerOpen && cdpOk && 'Open Bridge: bin/dg-webflow connect bridge',
      !configs.grokChromeDevtools && 'Add chrome_devtools MCP (browserUrl http://127.0.0.1:9223)',
      !token.token && 'Optional REST: site token in ~/.config/demigod/webflow.env',
      !webhookPublic && 'Webhooks need public HTTPS URL (DEMIGOD_WEBHOOK_PUBLIC_URL)',
      !webhookLocal && 'Local receiver: npm run demigod:submissions:webhook',
    ].filter(Boolean),
  };
}

async function openBridge() {
  const r = await openUrl(WEBFLOW_MCP_BRIDGE_URL);
  return { ok: true, opened: WEBFLOW_MCP_BRIDGE_URL, result: r };
}

function printHumanStatus(status, title = 'Webflow agent connect') {
  console.log(`# ${title} · ${status.site}`);
  console.log(`at: ${status.at}`);
  console.log('');
  const L = status.layers;
  const row = (ok, name, detail) => console.log(`  ${ok ? '✓' : '·'} ${name}${detail ? ' — ' + detail : ''}`);
  row(L.mcpConfigAllAgents, 'MCP config (Grok/Claude/Codex)', JSON.stringify({
    grok: status.mcpConfigs.grok,
    claude: status.mcpConfigs.claude,
    codex: status.mcpConfigs.codex,
  }));
  row(L.mcpChromeDevtools, 'chrome-devtools MCP in Grok config');
  row(L.mcpWebflowDocs, 'webflow-docs MCP in Grok config');
  row(L.mcpOAuthGrok, 'MCP OAuth (Grok credentials)', status.mcpOAuth.ok ? status.mcpOAuth.note : status.mcpOAuth.reason);
  row(L.mcpDoctorHealthy, 'grok mcp doctor webflow', status.mcpDoctor?.authRequired ? 'auth required' : status.mcpDoctor?.ok ? 'healthy' : 'failing');
  row(L.cdp, 'CDP Chrome :9223', status.cdp?.browser || status.cdp?.error || '');
  row(L.designerTab, 'Designer tab open (Bridge when app panel running)');
  row(L.siteTokenRest, 'Site token for REST scripts', status.siteToken.source || status.siteToken.hint?.slice(0, 60));
  row(L.webhookPublic, 'Webhook public URL', status.webhooks.publicUrl || 'unset');
  row(L.webhookLocal, 'Local webhook receiver', `:${status.webhooks.localPort}`);
  row(status.agentInstructions.localExists, 'Local agent instructions mirror', 'docs/WEBFLOW-AGENT-INSTRUCTIONS.md');
  console.log('');
  console.log('Bridge deep-link:');
  console.log(`  ${status.bridgeUrl}`);
  console.log('');
  console.log('Spine: Data MCP · Designer MCP+Bridge · CDP ship · foot CDN · chrome-devtools eyes');
  if (status.authHow?.length) {
    console.log('');
    console.log('## Authorize Webflow MCP (required once)');
    for (const step of status.authHow) console.log(`  ${step}`);
  }
  if (status.tips.length) {
    console.log('');
    console.log('tips:');
    for (const t of status.tips) console.log('  ·', t);
  }
  console.log(`\njson: ${OUT}`);
}

async function main() {
  ensureBusy();
  if (cmd === 'bridge' || cmd === 'all') {
    const opened = await openBridge();
    if (cmd === 'bridge') {
      const out = { at: new Date().toISOString(), ...opened };
      atomicWrite(OUT, JSON.stringify(out, null, 2) + '\n');
      console.log(asJson ? JSON.stringify(out, null, 2) : `bridge opened: ${WEBFLOW_MCP_BRIDGE_URL}`);
      process.exit(0);
    }
  }

  let bridgeOpened = false;
  if (cmd === 'setup') {
    try {
      await openBridge();
      bridgeOpened = true;
    } catch {
      bridgeOpened = false;
    }
  }

  const status = await buildConnectStatus();
  if (cmd === 'all') status.bridgeOpened = true;
  if (cmd === 'setup') status.bridgeOpened = bridgeOpened;
  atomicWrite(OUT, JSON.stringify(status, null, 2) + '\n');

  if (asJson) {
    console.log(JSON.stringify(status, null, 2));
  } else if (cmd === 'setup') {
    printHumanStatus(status, 'Webflow setup');
    const ready = status.layers.mcpOAuthGrok && status.layers.cdp;
    console.log('');
    if (ready) console.log('setup: READY — Data MCP + CDP ship path available');
    else {
      console.log('setup: NOT READY');
      if (!status.layers.mcpOAuthGrok) console.log('blocker: Webflow MCP OAuth (Grok /mcps → webflow → i)');
      if (!status.layers.cdp) console.log('blocker: CDP — ~/agent-dev.sh up  (or launch-chrome-automation.sh)');
    }
  } else if (cmd === 'status' || cmd === 'all') {
    printHumanStatus(status);
  } else {
    console.error('usage: demigod-webflow-connect.mjs status|bridge|all|setup [--json]');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
