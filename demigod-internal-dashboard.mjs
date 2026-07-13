#!/usr/bin/env node
import http from 'http'; import fs from 'fs'; import { execSync } from 'child_process';
const PORT = 3456;
function getData() {
  let matches = "";
  try { matches = require("fs").readFileSync("DEMIGOD-MATCHES.json", "utf8"); } catch(e){}
  let eventsNote = "Events flow (human loop + auto): source->reviewed->matched(90d/skills/stage decide)->intro->piloted->receipted->invoiced(10% on hire pending). See DEMIGOD-EVENTS-FLOW.md + MATCHES.json";

  const b = JSON.parse(fs.readFileSync('demigod-board.json','utf8'));
  let pilots = 'none'; try { pilots = execSync('node demigod-pilot-tracker.mjs --report 2>&1').toString(); } catch(e){}
  let gtm = ''; try { gtm = fs.readFileSync('demigod-outreach/dm-send-log.txt','utf8'); } catch(e){}
  let challenge = ''; try { challenge = fs.readFileSync('/tmp/demigod-ledger-challenge.txt','utf8'); } catch(e){}
  let variants = ''; try { variants = fs.readFileSync('/tmp/demigod-x-variants.txt','utf8'); } catch(e){}
  return {board: b.roles, pilots, gtm, challenge, variants, matches, eventsNote, ts: new Date().toISOString()};
}
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const d = getData();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Demigod Internal</title><style>body{background:#0a0a0a;color:#f5f0e6;font-family:Manrope,sans-serif;padding:1rem} h1,h2{color:#c9a84c;font-family:Cinzel} .card{border:1px solid #c9a84c33;padding:1rem;margin:.5rem 0;border-radius:8px} pre{background:#111;padding:.5rem;overflow:auto} .good{color:#c9a84c}</style></head><body>
<h1>Demigod Internal • Execution Phase</h1>
<p>Updated ${d.ts} | Site perfect (WIZ 90d+review) | Board 3 honest | <a href="https://www.trydemigod.com">live</a></p>
<div class="card"><h2>Board (90d samples)</h2><ul>${d.board.map(r=>'<li>'+r.title+' · '+r.stageType+'</li>').join('')}</ul></div>
<div class="card"><h2>GTM Log (90d in DMs)</h2><pre>${d.gtm}</pre></div>
<div class="card"><h2>90d Pilots</h2><pre>${d.pilots}</pre></div>
<div class="card"><h2>Events / Matches (human-in-loop)</h2><pre style="font-size:0.75em">${d.matches || "no matches yet"}</pre><p class="good">${d.eventsNote || "Human review at reviewed/matched/intro/invoice. Auto: sourcer+decide(90d+skills+stage)+intro+pending Stripe. See DEMIGOD-EVENTS-FLOW.md + MATCHES.json"}</p></div>
<div class="card"><h2>Challenge (creative GTM)</h2><pre>${d.challenge}</pre></div>
<div class="card"><h2>X Variants</h2><pre>${d.variants}</pre></div>
<p class="good">Run: node demigod-gtm-prep-sends.mjs ; node demigod-pilot-logger.mjs --90d-outcome="..." ; node demigod-internal-dashboard.mjs</p>
</body></html>`;
  res.end(html);
});
server.listen(PORT, () => console.log('http://localhost:'+PORT));
