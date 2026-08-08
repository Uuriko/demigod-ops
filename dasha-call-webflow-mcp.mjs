import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = fs.readFileSync('/tmp/dasha-wf-token.txt', 'utf8').trim();
const SITE = '5f1458122ba25e70a3ff2bd0', HOME = '5f1458136c15aa41639b8538', STUDIO = '6a763858748c216defe621b9';
const nav = `<style>.dgnav{position:sticky;top:0;z-index:60;background:rgba(7,6,8,.94);backdrop-filter:blur(10px);border-bottom:1px solid rgba(245,238,220,.18)}.dgnav-in{width:min(1080px,calc(100% - 32px));margin:auto;min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:12px}.dgnav a{display:inline-flex;align-items:center;min-height:44px;color:#f5eedc!important;text-decoration:none;font:800 14px Arial,sans-serif}.dgnav a:focus-visible{outline:3px solid #c4a5ff;outline-offset:3px}.dgnav .dgbrand{font-size:18px}.dgnav .dgcta{padding:9px 15px;border:1px solid #dfff00;border-radius:999px;color:#08070a!important;background:#dfff00;text-transform:uppercase;font-size:12px;letter-spacing:.06em}.dg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}</style><nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a class="dgcta" href="/#token">Buy / verify →</a></div></nav>`;
let tool = 'data_element_settings_tool';
let args = process.argv.includes('--studio') ? {
  siteId: SITE,
  pageId: STUDIO,
  context: 'Publish the verified remixable Dasha Meme Studio embed to its existing Webflow page.',
  actions: [{
    label: 'set_studio_embed',
    set_settings: {
      operations: [{
        label: 'studio_code',
        element_id: { component: STUDIO, element: 'b1681188-19dd-6175-7472-68887d3c6e10' },
        settings: [{ key: 'code', static_text: { value: fs.readFileSync('dasha-studio-embed.html', 'utf8') } }],
      }],
    },
  }],
} : JSON.parse(fs.readFileSync('/tmp/dasha-mcp-tool-input.json', 'utf8'));
if (process.argv.includes('--home')) args = {
  siteId: SITE, pageId: HOME,
  context: 'Publish five curated remix starting points on the Dasha homepage to connect discovery with immediate creative participation.',
  actions: [{ label: 'set_home_embed', set_settings: { operations: [{ label: 'home_code',
    element_id: { component: HOME, element: 'b1681188-19dd-6175-7472-68887d3c6e10' },
    settings: [{ key: 'code', static_text: { value: fs.readFileSync('dasha-landing.html', 'utf8') } }],
  }] } }],
};
if (process.argv.includes('--studio-nav')) args = {
  siteId: SITE, pageId: STUDIO,
  context: 'Replace the Studio self-link with a clear verified purchase path while preserving its compact shared navigation.',
  actions: [{ label: 'set_studio_nav', set_settings: { operations: [{ label: 'studio_nav',
    element_id: { component: STUDIO, element: '111587a0-9244-9044-dd65-d53ad8cd314e' },
    settings: [{ key: 'code', static_text: { value: nav } }],
  }] } }],
};
if (process.argv.includes('--studio-meta')) {
  tool = 'data_pages_tool';
  args = { context: 'Correct stale Studio metadata so search and social previews accurately describe its five remixable visual formats.', actions: [{
    label: 'update_studio_metadata', update_page_settings: { page_id: STUDIO,
      seo: { title: 'Dasha Meme Studio — make something, post it', description: 'Make a loud $dasha image in under a minute. Five original looks, remix links, PNG export and native sharing. Free, no wallet, nothing uploaded.' },
      openGraph: { title: 'Dasha Meme Studio — make something, post it', titleCopied: false, description: 'Type one line, pick one of five looks, then post it or pass an editable remix to someone else.', descriptionCopied: false },
    },
  }] };
}

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
  const names = [tool, `webflow__${tool}`];
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
