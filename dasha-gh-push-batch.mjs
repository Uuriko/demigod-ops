import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const batchNum = process.argv[2] ?? '0';
const batchPath = `/tmp/gh-mcp-batches/batch-${batchNum}.json`;
const payload = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

const auth = JSON.parse(fs.readFileSync(`${process.env.HOME}/.grok/auth.json`, 'utf8'));
const entry = Object.values(auth)[0];
const token = entry?.key || entry?.access_token || entry?.token;
if (!token) { console.error('NO_TOKEN', Object.keys(entry||{})); process.exit(2); }

for (const f of payload.files) {
  if (!f.content || f.content.length < 10) {
    console.error(JSON.stringify({ ok: false, error: 'invalid content', path: f.path }));
    process.exit(3);
  }
}

const transport = new StreamableHTTPClientTransport(new URL('https://api.githubcopilot.com/mcp/x/all'), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: 'dasha-mcp-push', version: '1.0.0' });
await client.connect(transport);
const names = ['push_files', 'github__push_files'];
let last;
for (const name of names) {
  try {
    console.error('trying', name, 'batch', batchNum);
    const result = await client.callTool({
      name,
      arguments: {
        owner: payload.owner,
        repo: payload.repo,
        branch: payload.branch,
        message: payload.message + (batchNum !== '0' ? ` (${batchNum})` : ''),
        files: payload.files,
      },
    });
    fs.writeFileSync(`/tmp/gh-mcp-batches/result-${batchNum}.json`, JSON.stringify(result, null, 2));
    const text = result?.content?.[0]?.text || JSON.stringify(result);
    console.log(JSON.stringify({
      ok: !result?.isError,
      batch: batchNum,
      name,
      paths: payload.files.map((f) => f.path),
      text: String(text).slice(0, 600),
    }));
    await client.close();
    process.exit(result?.isError ? 1 : 0);
  } catch (e) {
    last = e;
    console.error('fail', name, String(e).slice(0, 300));
  }
}
console.error(String(last));
process.exit(1);
