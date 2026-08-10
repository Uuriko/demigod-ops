#!/usr/bin/env node
/** LEGACY — do not ship. Prefer: node dasha-ship.mjs (push+readback+publish+audit). */
/** Read-only Webflow MCP probe for Dasha desk embed. Prefer: npm run dasha:token:check */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function token() {
  const env = (process.env.DASHA_WF_TOKEN || process.env.WEBFLOW_TOKEN || '').trim();
  if (env) return env;
  const p = '/tmp/dasha-wf-token.txt';
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p, 'utf8').trim();
    if (t) return t;
  }
  console.error(
    JSON.stringify({
      ok: false,
      error: 'no_token',
      hint: "printf %s 'TOKEN' > /tmp/dasha-wf-token.txt && npm run dasha:token:check",
    }),
  );
  process.exit(2);
}

const tok = token();
const args = {
  siteId: '5f1458122ba25e70a3ff2bd0',
  pageId: '6a74b59530c70741b1c574c4',
  context: 'Reads dasha embed code setting to confirm polished desk was applied.',
  actions: [
    {
      label: 'get-dasha-code',
      get_settings: {
        type: 'query_settings',
        element_id: {
          component: '6a74b59530c70741b1c574c4',
          element: 'f4239e35-08c6-0874-27bc-8ce5b8ca547f',
        },
        queries: [{ label: 'code', key: 'code' }],
      },
    },
  ],
};

const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${tok}`,
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json, text/event-stream',
    },
  },
});

const client = new Client({ name: 'dasha-get', version: '1.0.0' });
try {
  await client.connect(transport);
} catch (e) {
  const msg = String(e?.message || e);
  console.error(
    JSON.stringify({
      ok: false,
      error: 'auth_failed',
      detail: msg.slice(0, 300),
      hint: "Webflow token invalid. Re-auth, then: printf %s 'NEW' > /tmp/dasha-wf-token.txt && npm run dasha:token:check",
    }),
  );
  process.exit(1);
}

const result = await client.callTool({ name: 'data_element_settings_tool', arguments: args });
const text = result?.content?.[0]?.text || JSON.stringify(result);
fs.writeFileSync('/tmp/dasha-get-settings-now.json', text);
const hasReveal = text.includes('dd-reveal');
const hasApp = text.includes('dd-app');
const hasMint = text.includes('53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump');
const hasCasino = text.includes('casino open');
const m = text.match(/dd-reveal/g);
console.log(
  JSON.stringify(
    {
      ok: !result?.isError,
      hasReveal,
      hasApp,
      hasMint,
      hasCasino,
      revealCount: m ? m.length : 0,
      textLen: text.length,
      snippetStart: text.slice(0, 200),
    },
    null,
    2,
  ),
);
await client.close();
process.exit(result?.isError ? 1 : 0);
