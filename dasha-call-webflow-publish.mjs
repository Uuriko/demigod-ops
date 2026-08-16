/**
 * LEGACY — quarantined 2026-08-16. Do not use for a release.
 *
 * These direct Webflow MCP callers predate dasha-ship.mjs and bypass its gate, its publish lock
 * and the SRI drift guard. Publishing around dasha-ship is what killed the Simp Board on
 * 2026-08-11 and again on 2026-08-16. Kept as reference for the MCP call shapes only.
 *
 * The supported path is DASHA-WORKFLOW.md -> node dasha-ship.mjs.
 */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = fs.readFileSync('/tmp/dasha-wf-token.txt', 'utf8').trim();
const args = process.argv.includes('--dasha') ? {
  actions: [{ label: 'publish_dasha', publish_site: {
    site_id: '5f1458122ba25e70a3ff2bd0',
    publishToWebflowSubdomain: true,
    customDomains: ['6a762e813cfcf91448a83e3b', '6a762e833cfcf91448a83e58'],
  } }],
  context: 'Publish the verified remixable Meme Studio checkpoint to both configured Dasha production domains and staging.',
} : JSON.parse(fs.readFileSync('/tmp/dasha-mcp-tool-input.json', 'utf8'));

const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json, text/event-stream',
    },
  },
});

const client = new Client({ name: 'dasha-publish', version: '1.0.0' });
await client.connect(transport);
const names = ['data_sites_tool', 'webflow__data_sites_tool'];
for (const name of names) {
  try {
    console.error('trying', name);
    const result = await client.callTool({ name, arguments: args });
    fs.writeFileSync('/tmp/dasha-publish-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ok: !result?.isError, name, text: result?.content?.[0]?.text?.slice?.(0, 1500) || result }, null, 2));
    await client.close();
    process.exit(result?.isError ? 1 : 0);
  } catch (e) {
    console.error('fail', name, String(e).slice(0, 400));
  }
}
process.exit(1);
