import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = fs.readFileSync('/tmp/dasha-wf-token.txt', 'utf8').trim();
const argsPath = process.argv[2] || '/tmp/dasha-mcp-tool-input.json';
const toolName = process.argv[3] || 'data_element_settings_tool';
const outPath = process.argv[4] || '/tmp/dasha-get-settings-result-new.json';
const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));

const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json, text/event-stream',
    },
  },
});

const client = new Client({ name: 'dasha-ship', version: '1.0.0' });
await client.connect(transport);
const names = [toolName, toolName.startsWith('webflow__') ? toolName : `webflow__${toolName}`];
let result, lastErr;
for (const name of names) {
  try {
    console.error('trying', name);
    result = await client.callTool({ name, arguments: args });
    break;
  } catch (e) {
    lastErr = e;
    console.error('fail', name, String(e).slice(0, 200));
  }
}
await client.close();
if (!result) throw lastErr || new Error('no result');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
const text = result?.content?.[0]?.text || JSON.stringify(result);
console.log(JSON.stringify({ ok: !result?.isError, text: String(text).slice(0, 2000) }, null, 2));
// For get_settings, check markers
if (String(text).includes('dd-sticky')) {
  const markers = {
    dd_sticky: String(text).includes('dd-sticky'),
    dd_banner: String(text).includes('dd-banner'),
    dd_px: String(text).includes('dd-px'),
  };
  console.log('MARKERS', JSON.stringify(markers));
}
process.exit(result?.isError ? 1 : 0);
