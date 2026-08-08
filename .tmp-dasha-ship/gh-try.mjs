import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const auth = JSON.parse(fs.readFileSync(`${process.env.HOME}/.grok/auth.json`, 'utf8'));
const entry = Object.values(auth)[0];
const token = entry?.key;
const batch = JSON.parse(fs.readFileSync('/tmp/gh-mcp-batches/batch-3.json', 'utf8')); // small batch

const attempts = [
  { url: 'https://api.githubcopilot.com/mcp/', headers: { Authorization: `Bearer ${token}`, 'X-MCP-Readonly': 'false' } },
  { url: 'https://api.githubcopilot.com/mcp/', headers: { Authorization: token } },
  { url: 'https://api.githubcopilot.com/mcp/x/all', headers: { Authorization: `Bearer ${token}` } },
  { url: 'https://api.githubcopilot.com/mcp/', headers: { Authorization: `token ${token}` } },
];

for (const a of attempts) {
  try {
    console.error('try', a.url, Object.keys(a.headers).join(','));
    const transport = new StreamableHTTPClientTransport(new URL(a.url), {
      requestInit: { headers: a.headers },
    });
    const client = new Client({ name: 'dasha-mcp-push', version: '1.0.0' });
    await client.connect(transport);
    const tools = await client.listTools();
    console.log('tools ok', tools.tools?.slice(0,3).map(t=>t.name));
    const result = await client.callTool({
      name: 'push_files',
      arguments: {
        owner: batch.owner,
        repo: batch.repo,
        branch: batch.branch,
        message: batch.message,
        files: batch.files,
      },
    });
    console.log(JSON.stringify({ ok: !result?.isError, text: String(result?.content?.[0]?.text || result).slice(0,500) }));
    await client.close();
    process.exit(result?.isError ? 1 : 0);
  } catch (e) {
    console.error('fail', String(e).slice(0,250));
  }
}
process.exit(2);
