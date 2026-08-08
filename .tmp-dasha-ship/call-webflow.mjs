import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = fs.readFileSync('/tmp/dasha-wf-token.txt', 'utf8').trim();
const args = JSON.parse(fs.readFileSync('/tmp/dasha-mcp-tool-input.json', 'utf8'));

const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json, text/event-stream',
    },
  },
});

const client = new Client({ name: 'dasha-embed-updater', version: '1.0.0' });
try {
  await client.connect(transport);
  // Try both tool name styles
  const names = ['data_element_settings_tool', 'webflow__data_element_settings_tool'];
  let lastErr;
  for (const name of names) {
    try {
      console.error('trying', name);
      const result = await client.callTool({ name, arguments: args });
      fs.writeFileSync('/tmp/dasha-set-result-new.json', JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ ok: !result?.isError, name, result: result?.content?.[0]?.text?.slice?.(0, 800) || result }, null, 2));
      await client.close();
      process.exit(result?.isError ? 1 : 0);
    } catch (e) {
      lastErr = e;
      console.error('fail', name, String(e).slice(0, 300));
    }
  }
  throw lastErr || new Error('all names failed');
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e).slice(0, 1500) }));
  process.exit(1);
}
