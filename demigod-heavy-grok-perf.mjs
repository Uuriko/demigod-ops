#!/usr/bin/env node
/** Ask SuperGrok Heavy: best Grok Build performance for Demigod agent work. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-GROK-BUILD-PERF.md');
const JSON_OUT = path.join(ROOT, 'DEMIGOD-GROK-PERF.json');

const SYS = `free -h | head -2; uptime; pgrep -c chrome; du -sh ~/.grok/chrome-heavy 2>/dev/null`;
const { execSync } = await import('child_process');
const sysSnap = execSync(SYS, { encoding: 'utf8' });

const PROMPT = `SuperGrok Heavy — GROK BUILD PERFORMANCE ADVISOR.

John runs Grok Build (grok CLI / Cursor agent) on Pop!_OS COSMIC for Demigod Webflow site work.
Laptop feels slow. Agent should be fast + accurate.

SYSTEM NOW:
${sysSnap}

CURRENT GROK CONFIG (~/.grok/config.toml):
- permission_mode = always-approve
- MCP: chrome-devtools @ :9223, firecrawl
- plugins: chrome-devtools-mcp, firecrawl
- No codebase_indexing / session / tools overrides set

AGENT WORKLOAD:
- CDP Webflow Designer automation (Puppeteer :9223)
- demigod-foot-core.js CDN deploy
- npm run demigod:verify:all
- Heavy consultations via grok.com tab
- Home workspace is entire /home/potter (large, many untracked files)

Deliver numbered GROK BUILD PERF PLAN (max 16 items):
1. config.toml changes (exact keys/values)
2. MCP/plugin trim — what to disable when
3. Chrome/CDP tab hygiene for agent speed
4. Subagent vs parallel tool call strategy
5. Background task rules (webhook, long audits)
6. Context/session management (auto-compact, compact_mode)
7. Workspace scope — should agent cwd be demigod-only subfolder?
8. Model selection for fast vs heavy tasks
9. COSMIC/Linux OS tweaks (cosmic-comp CPU)
10. What NOT to do (anti-patterns)
11. Top 5 changes to apply THIS HOUR (copy-paste ready)
12. One-line success metric for "agent feels fast"

Blunt. Actionable. No essays.`;

async function main() {
  wlog('=== HEAVY GROK PERF START ===');
  const browser = await connectBrowser();
  const pages = await browser.pages();
  const page = pages.find((p) => /grok\.com/i.test(p.url()));
  if (!page) throw new Error('open grok.com tab for Heavy');

  await sendToGrok(page, PROMPT);
  let reply = { text: '', thinking: true };
  for (let i = 0; i < 8; i++) {
    await sleep(15000);
    reply = await collectGrokReply(page, { waitMs: 5000, minGrowth: 200 });
    if (!reply.thinking && !reply.stale && reply.text.length > 400) break;
    wlog(`heavy wait ${i + 1} thinking=${reply.thinking} len=${reply.text.length}`);
  }

  const body = `# SuperGrok Heavy — Grok Build Performance\n\n_${new Date().toISOString()}_\n\n${reply.text || '_no reply_'}\n`;
  fs.writeFileSync(OUT, body);
  fs.writeFileSync(JSON_OUT, JSON.stringify({ at: new Date().toISOString(), ok: !!reply.text, chars: reply.text?.length || 0, path: OUT }, null, 2));
  console.log(JSON.stringify({ ok: !!reply.text, path: OUT, chars: reply.text?.length }));
  await browser.disconnect();
  wlog('=== HEAVY GROK PERF END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });