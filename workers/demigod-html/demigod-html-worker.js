/**
 * demigod-html — www.trydemigod.com Motley edge.
 * Snapshot of live Worker (2026-09-10) + Motley home IA splice.
 * Do not wrangler deploy from this PR (Instinct/Potter lane).
 */
import {
  applyMotleyHomeIa,
  motleyHomeIaMarkdown,
} from "./demigod-home-ia.js";

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// demigod-html-worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __defProp22 = Object.defineProperty;
var __name22 = /* @__PURE__ */ __name2((target, value) => __defProp22(target, "name", { value, configurable: true }), "__name");
var __defProp222 = Object.defineProperty;
var __name222 = /* @__PURE__ */ __name22((target, value) => __defProp222(target, "name", { value, configurable: true }), "__name");
var HOME_DESCRIPTION = "You\u2019re deciding who\u2019s in the boat. A person picks, then knocks once.";
var OG_IMAGE = "https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@a1a851ac48e9/art/frege-hero.jpg";
function demigodHomeHtml(map) {
  return applyMotleyHomeIa(demigodHomeHtmlRaw(map));
}
function demigodHomeHtmlRaw(map) {
  const week = homeWeekHtml(map);
  const packet = homePacketCompany(map);
  const packetDir = packet ? `<a class="dir" href="${escapeHtml(companyHref(packet.id))}">one packet</a>` : "";
  const briefHref = "/?wiz=startup";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demigod</title>
<!-- demigod-html disk-2026-08-27 sitemap /grok -->
<meta name="description" content="${HOME_DESCRIPTION}">
<link rel="canonical" href="https://www.trydemigod.com/">
<meta name="theme-color" content="#0B120F">
<meta property="og:type" content="website">
<meta property="og:title" content="Demigod">
<meta property="og:description" content="${HOME_DESCRIPTION}">
<meta property="og:url" content="https://www.trydemigod.com/">
<meta property="og:site_name" content="Demigod">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:alt" content="Demigod">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Demigod">
<meta name="twitter:description" content="${HOME_DESCRIPTION}">
<meta name="twitter:image" content="${OG_IMAGE}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IM+Fell+English&family=Hanken+Grotesk:wght@300;400;500&family=JetBrains+Mono:wght@400&family=Sorts+Mill+Goudy&display=swap">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230B120F'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='Georgia,serif' font-size='16' fill='%23D3A093'%3ED%3C/text%3E%3C/svg%3E">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://www.trydemigod.com/#org","name":"Demigod","url":"https://www.trydemigod.com/","email":"potter@trydemigod.com","areaServed":{"@type":"AdministrativeArea","name":"San Francisco Bay Area"}},{"@type":"Service","@id":"https://www.trydemigod.com/#desk","name":"Demigod","url":"https://www.trydemigod.com/","email":"potter@trydemigod.com","areaServed":{"@type":"AdministrativeArea","name":"San Francisco Bay Area"},"description":"SF Bay Area recruiting desk. A person picks better candidates. Names move after mutual yes. 10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.","image":"https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@a1a851ac48e9/art/frege-hero.jpg","priceRange":"10% of first-year base after a verified start","provider":{"@id":"https://www.trydemigod.com/#org"}},{"@type":"WebSite","name":"Demigod","url":"https://www.trydemigod.com/","publisher":{"@id":"https://www.trydemigod.com/#org"}},{"@type":"HowTo","name":"How it goes","description":"Every crew starts with two people who recognized each other.","step":[{"@type":"HowToStep","position":1,"name":"Say it once","text":"One brief. The actual work."},{"@type":"HowToStep","position":2,"name":"A person chooses","text":"A person reads. Only names they chose."},{"@type":"HowToStep","position":3,"name":"Meet","text":"Mutual yes. Nothing moves until you do."}]}]}<\/script>
<style>
:root{
  --ink:#0B120F;
  --bone:#EFE9DD;
  --light:#E4DED2;
  --dark:#23211D;
  --clay:#D3A093;
  --muted-body:#4a463f;
  --muted-step:#6b665e;
  --muted-label:#8a8378;
  --hair-dark:rgba(228,222,210,.16);
  --hair-bone:rgba(35,33,29,.18);
  --hair-bone-soft:rgba(35,33,29,.14);
}
*{box-sizing:border-box}
html,body{margin:0;background:#0B120F;color:#E4DED2}
body{min-height:100vh;font-family:'Hanken Grotesk',system-ui,sans-serif}
a{color:#D3A093;text-decoration:none}
a:hover{color:#E4DED2}
:focus-visible{outline:1px solid #D3A093;outline-offset:3px}
.band{position:relative;overflow:hidden}
.band-ink{background:#0B120F}
.band-bone{background:#EFE9DD;color:#23211D}
.wrap{position:relative;max-width:1160px;margin:0 auto;padding:0 48px}
.grain{position:absolute;inset:0;pointer-events:none}
.grain-dark{
  opacity:.45;
  mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='150' height='150' filter='url(%23n)' opacity='0.42'/></svg>");
}
.grain-bone{
  opacity:.6;
  mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/></filter><rect width='150' height='150' filter='url(%23n)' opacity='0.3'/></svg>");
}
.mast{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(228,222,210,.16);padding:32px 0 14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.word{font-family:'IM Fell English',Georgia,serif;font-size:26px;letter-spacing:0;color:#E4DED2;text-transform:none}
.word:hover{color:#E4DED2}
.facts{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.42);text-transform:uppercase;padding:12px 0 0}
.hero-inner{display:flex;flex-direction:column;gap:26px;padding:92px 0 34px}
.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.2em;color:#D3A093;text-transform:uppercase}
h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-size:76px;font-weight:400;line-height:1.02;letter-spacing:-.02em;color:#E4DED2;max-width:800px;text-wrap:balance}
.hero-split{display:flex;gap:44px;align-items:flex-start;padding-top:4px}
.lede{flex:1.4;margin:0;max-width:380px;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.55;color:rgba(228,222,210,.68);text-wrap:pretty}
.tonight{flex:1;display:flex;flex-direction:column;gap:12px;border-left:1px solid rgba(228,222,210,.16);padding-left:26px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;line-height:1.7;color:rgba(228,222,210,.5)}
.tonight-label{letter-spacing:.16em;color:rgba(228,222,210,.35);text-transform:uppercase}
.tonight-live{display:flex;align-items:center;gap:8px;color:#D3A093}
.dot{width:7px;height:7px;border-radius:50%;background:#D3A093;flex:0 0 7px}
.actions{display:flex;align-items:center;gap:14px;padding-top:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;padding:13px 26px;border-radius:0;box-shadow:none}
.btn-primary{background:#E4DED2;color:#0B120F;border:0}
.btn-primary:hover{color:#0B120F;background:#EFE9DD}
.btn-secondary{background:transparent;border:1px solid rgba(228,222,210,.3);color:rgba(228,222,210,.8)}
.btn-secondary:hover{color:#E4DED2;border-color:#E4DED2}
.btn-ink{background:#0B120F;color:#E4DED2;border:0}
.btn-ink:hover{color:#E4DED2;background:#162019}
.btn-bone-ghost{background:transparent;border:1px solid rgba(35,33,29,.24);color:#23211D}
.btn-bone-ghost:hover{color:#23211D;border-color:#23211D}
.siwg{display:inline-flex;align-items:center;gap:12px;padding:9px 22px 9px 9px;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#22d3ee);color:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;font-weight:500;letter-spacing:.01em;box-shadow:-10px 0 28px rgba(124,58,237,.42),10px 0 28px rgba(34,211,238,.38);border:0;text-decoration:none;line-height:1}
.siwg:hover{color:#fff;filter:brightness(1.07)}
.siwg-icon{display:block;width:28px;height:28px;flex:0 0 28px;border-radius:8px}
.actions-siwg{padding-top:6px}
.siwg-pair{margin:22px 0 8px;min-height:3em}
.siwg-code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:28px;letter-spacing:.18em;color:#E4DED2;margin:12px 0}
.siwg-credit{margin-top:48px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.siwg-credit a{color:rgba(228,222,210,.35)}
.siwg-credit a:hover{color:#D3A093}

.week{margin-top:28px;padding-top:22px;border-top:1px solid rgba(228,222,210,.16);display:flex;flex-direction:column;gap:10px;max-width:640px}
.week-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.week-row{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.55;color:rgba(228,222,210,.68)}
.week-foot{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;color:rgba(228,222,210,.42);text-transform:uppercase;padding-top:4px}
.week-foot a{color:rgba(228,222,210,.5)}
.week-foot a:hover{color:#E4DED2}
.dir{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(228,222,210,.5)}
.dir:hover{color:#E4DED2}
.mast>a:not(.word){color:inherit}
.process .wrap{padding:72px 48px}
.process-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(35,33,29,.18);padding-bottom:14px;margin-bottom:56px}
.process-word{font-family:'IM Fell English',Georgia,serif;font-size:24px;color:#23211D}
.process-kicker{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:#8a8378;text-transform:uppercase}
.process-h{font-family:'Instrument Serif',Georgia,serif;font-size:52px;line-height:1.06;letter-spacing:-.015em;color:#23211D;max-width:620px;text-wrap:balance;margin:0 0 36px}
.process-cols{display:flex;gap:0}
.step{flex:1;display:flex;flex-direction:column;gap:10px}
.step-1{padding-right:34px}
.step-2{padding:0 34px;border-left:1px solid rgba(35,33,29,.14)}
.step-3{padding-left:34px;border-left:1px solid rgba(35,33,29,.14)}
.step-n{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#8a8378}
.step-t{font-family:'Instrument Serif',Georgia,serif;font-size:26px;line-height:1.15;color:#23211D}
.step-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;line-height:1.75;color:#6b665e;text-wrap:pretty}
.checked .wrap,.who .wrap{padding:96px 48px}
.check-head,.who-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:38px;gap:24px}
.check-h,.who-h{font-family:'Instrument Serif',Georgia,serif;font-size:42px;line-height:1.06;letter-spacing:-.015em;color:#E4DED2}
.check-label,.who-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase;white-space:nowrap}
.check-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(228,222,210,.16);border:1px solid rgba(228,222,210,.16)}
.cell{background:#0B120F;padding:20px 22px;display:flex;flex-direction:column;gap:7px;font-family:'JetBrains Mono',ui-monospace,monospace}
.cell-k{font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.42);text-transform:uppercase}
.cell-v{font-size:13px;color:#E4DED2}
.cell-human{color:#D3A093}
.who-cols{display:flex;gap:0}
.who-col{flex:1;display:flex;flex-direction:column;gap:10px}
.who-col-a{padding-right:40px}
.who-col-b{padding-left:40px;border-left:1px solid rgba(228,222,210,.16)}
.who-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#D3A093;text-transform:uppercase}
.who-t{font-family:'Instrument Serif',Georgia,serif;font-size:26px;line-height:1.15;color:#E4DED2}
.who-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.8;color:rgba(228,222,210,.68);max-width:420px;text-wrap:pretty}
.pricing .wrap,.doors .wrap{padding:88px 48px;display:flex;gap:56px;align-items:flex-end}
.price-copy,.doors-copy{flex:1.2;display:flex;flex-direction:column;gap:14px}
.price-kicker,.doors-kicker{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.2em;color:#8a8378;text-transform:uppercase}
.price-h,.doors-h{font-family:'Instrument Serif',Georgia,serif;font-size:44px;line-height:1.08;letter-spacing:-.015em;color:#23211D;text-wrap:balance}
.price-b,.doors-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.8;color:#4a463f;max-width:470px;text-wrap:pretty}
.quote,.doors-side{flex:1;display:flex;flex-direction:column;gap:16px;border-left:1px solid rgba(35,33,29,.18);padding-left:40px}
.quote-t{font-family:'Sorts Mill Goudy',Georgia,serif;font-size:21px;line-height:1.5;color:#23211D;text-wrap:pretty}
.quote-a,.doors-side-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#8a8378;text-transform:uppercase}
.doors-side-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.8;color:#4a463f;text-wrap:pretty}
.close .wrap{padding:110px 48px 40px;display:flex;flex-direction:column;gap:30px;align-items:center}
.close-h{font-family:'Instrument Serif',Georgia,serif;font-size:56px;line-height:1.04;letter-spacing:-.02em;color:#E4DED2;text-align:center;max-width:660px;text-wrap:balance;font-weight:400;margin:0}
.foot{width:100%;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(228,222,210,.16);padding-top:18px;margin-top:56px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.3);text-transform:uppercase}
.foot a{color:rgba(228,222,210,.3);text-transform:none;letter-spacing:.16em}
.foot a:hover{color:#D3A093}
@media(max-width:760px){
  .wrap,.process .wrap,.checked .wrap,.who .wrap,.pricing .wrap,.doors .wrap,.close .wrap{padding-left:22px;padding-right:22px}
  .hero-inner{padding:56px 0 28px;gap:20px}
  h1{font-size:42px}
  .hero-split{flex-direction:column;gap:28px}
  .tonight{border-left:0;padding-left:0;border-top:1px solid rgba(228,222,210,.16);padding-top:18px}
  .process-h{font-size:36px;margin-bottom:36px}
  .process-cols,.who-cols{flex-direction:column}
  .step-1,.step-2,.step-3{padding:22px 0 0;border-left:0;border-top:1px solid rgba(35,33,29,.14)}
  .step-1{border-top:0;padding-top:0}
  .who-col-a,.who-col-b{padding:22px 0 0;border-left:0}
  .who-col-b{border-top:1px solid rgba(228,222,210,.16);padding-top:22px}
  .check-head,.who-head{flex-direction:column;gap:12px}
  .check-h,.who-h{font-size:32px}
  .check-grid{grid-template-columns:1fr 1fr}
  .pricing .wrap,.doors .wrap{flex-direction:column;align-items:stretch;gap:36px;padding-top:64px;padding-bottom:64px}
  .quote,.doors-side{border-left:0;padding-left:0;border-top:1px solid rgba(35,33,29,.18);padding-top:24px}
  .close-h{font-size:36px}
  .foot{flex-direction:column;gap:10px;align-items:flex-start}
}
@media(prefers-reduced-motion:reduce){
  .grain{display:none}
}
</style>
</head>
<body>
<section class="band band-ink" data-screen-label="Hero">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <header class="mast">
      <a href="/weekly">SF BAY AREA</a>
      <a class="word" href="/">Demigod</a>
      <span>EST. 2025</span>
    </header>
    <div class="facts">SF \xB7 Seed and Series A \xB7 First engineering seats</div>
    <div class="hero-inner">
      <div class="eyebrow">CHAPTER ONE</div>
      <h1>A motley crew is assembled quietly.</h1>
      <div class="hero-split">
        <p class="lede">You're deciding who's in the boat. A person picks, then knocks once.</p>
        <aside class="tonight" aria-label="Tonight">
          <span class="tonight-label">TONIGHT</span>
          <span class="tonight-live"><span class="dot"></span>A person reads every brief.</span>
          <span>Names move after mutual yes.</span>
        </aside>
      </div>
      <div class="actions">
        <a class="btn btn-primary" id="brief" href="${escapeHtml(briefHref)}">Start a brief</a>
        ${packetDir}
      </div>
      <div class="actions actions-siwg">
        ${siwgButtonHtml("/grok")}
      </div>
      ${week}
    </div>
  </div>
</section>

<section class="band band-bone process" data-screen-label="Process">
  <div class="grain grain-bone" aria-hidden="true"></div>
  <div class="wrap">
    <div class="process-head">
      <span class="process-word">Demigod</span>
      <span class="process-kicker">HOW IT GOES</span>
    </div>
    <div class="process-h">Every crew starts with two people who recognized each other.</div>
    <div class="process-cols">
      <div class="step step-1">
        <span class="step-n">01</span>
        <span class="step-t">Say it once</span>
        <span class="step-b">One brief. The actual work.</span>
      </div>
      <div class="step step-2">
        <span class="step-n">02</span>
        <span class="step-t">A person chooses</span>
        <span class="step-b">A person reads. Only names they chose.</span>
      </div>
      <div class="step step-3">
        <span class="step-n">03</span>
        <span class="step-t">Meet</span>
        <span class="step-b">Mutual yes. Nothing moves until you do.</span>
      </div>
    </div>
  </div>
</section>

<section class="band band-ink checked" data-screen-label="What gets checked">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <div class="check-head">
      <span class="check-h">Some things arrive like weather.</span>
      <span class="check-label">WHAT WE LOOK AT</span>
    </div>
    <div class="check-grid">
      <div class="cell">
        <span class="cell-k">ROLE</span>
        <span class="cell-v">the actual work</span>
      </div>
      <div class="cell">
        <span class="cell-k">COMP</span>
        <span class="cell-v">the real range</span>
      </div>
      <div class="cell">
        <span class="cell-k">LOCATION</span>
        <span class="cell-v">SF Bay</span>
      </div>
      <div class="cell">
        <span class="cell-k">REVIEWED BY</span>
        <span class="cell-v cell-human">a person</span>
      </div>
    </div>
  </div>
</section>

<section class="band band-bone pricing" data-screen-label="Pricing">
  <div class="grain grain-bone" aria-hidden="true"></div>
  <div class="wrap">
    <div class="price-copy">
      <span class="price-kicker">BETTER CANDIDATES</span>
      <span class="price-h">You only meet the ones that hold.</span>
      <span class="price-b">10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.</span>
    </div>
    <div class="quote">
      <span class="quote-t">The two who'd still be here in three years.</span>
      <span class="quote-a">FOUNDER, SEED-STAGE \xB7 SF</span>
    </div>
  </div>
</section>


<section class="band band-ink close" data-screen-label="Close">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <h2 class="close-h">The first five decide what it becomes.</h2>
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(briefHref)}">Start a brief</a>
      <a class="btn btn-secondary" href="/?wiz=engineer">Join the network</a>
    </div>
    <footer class="foot">
      <span>\xA9 2026 DEMIGOD \xB7 10% ON HIRE, NOTHING BEFORE</span>
      <span><a href="/contact">Contact</a> \xB7 <a href="/legal">Privacy</a> \xB7 <a href="/companies">Companies</a> \xB7 <a href="/weekly">Weekly</a> \xB7 <a href="/packets">Packets</a> \xB7 <a href="/journal">Journal</a> \xB7 <a href="/peers">Peers</a> \xB7 <a href="/memo">Memo</a> \xB7 <a href="/ticket">Ticket</a> \xB7 <a href="/room">Project Room</a> \xB7 <a href="/app">Your hiring</a> \xB7 <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></span>
    </footer>
  </div>
</section>
</body>
</html>`;
}
__name(demigodHomeHtml, "demigodHomeHtml");
__name2(demigodHomeHtml, "demigodHomeHtml");
__name22(demigodHomeHtml, "demigodHomeHtml");
__name222(demigodHomeHtml, "demigodHomeHtml");
function demigodContactHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contact \xB7 Demigod</title>
<meta name="description" content="Write potter@trydemigod.com. Or start a brief.">
<link rel="canonical" href="https://www.trydemigod.com/contact">
<meta name="theme-color" content="#0B120F">
<meta property="og:type" content="website">
<meta property="og:title" content="Contact \xB7 Demigod">
<meta property="og:description" content="Write potter@trydemigod.com. Or start a brief.">
<meta property="og:url" content="https://www.trydemigod.com/contact">
<meta property="og:image" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@a1a851ac48e9/art/frege-hero.jpg">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Contact \xB7 Demigod">
<meta name="twitter:description" content="Write potter@trydemigod.com. Or start a brief.">
<meta name="twitter:image" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@a1a851ac48e9/art/frege-hero.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"ContactPage","name":"Contact \xB7 Demigod","url":"https://www.trydemigod.com/contact","mainEntity":{"@id":"https://www.trydemigod.com/#org"}},{"@type":"Organization","@id":"https://www.trydemigod.com/#org","name":"Demigod","url":"https://www.trydemigod.com/","email":"potter@trydemigod.com"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Demigod","item":"https://www.trydemigod.com/"},{"@type":"ListItem","position":2,"name":"Contact","item":"https://www.trydemigod.com/contact"}]}]}<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IM+Fell+English&family=Hanken+Grotesk:wght@400&family=JetBrains+Mono:wght@400&display=swap">
<style>
html,body{margin:0;min-height:100vh;background:#0B120F;color:#E4DED2;font-family:'Hanken Grotesk',system-ui,sans-serif}
a{color:#D3A093;text-decoration:none}
a:hover{color:#E4DED2}
.wrap{max-width:720px;margin:0 auto;padding:32px 48px 48px}
.mast{display:flex;justify-content:space-between;border-bottom:1px solid rgba(228,222,210,.16);padding-bottom:14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.word{font-family:'IM Fell English',Georgia,serif;font-size:26px;color:#E4DED2;text-transform:none;letter-spacing:0}
h1{font-family:'Instrument Serif',Georgia,serif;font-size:56px;font-weight:400;line-height:1.04;margin:72px 0 18px}
p{max-width:460px;font-size:16px;line-height:1.8;color:rgba(228,222,210,.68)}
.mail{display:inline-block;margin:8px 0 28px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;letter-spacing:.04em;color:#D3A093}
.actions{display:flex;gap:14px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;padding:13px 26px;font-size:14px;border-radius:0}
.btn-primary{background:#E4DED2;color:#0B120F}
.btn-primary:hover{color:#0B120F;background:#EFE9DD}
.btn-secondary{border:1px solid rgba(228,222,210,.3);color:rgba(228,222,210,.8)}
@media(max-width:760px){.wrap{padding:22px}h1{font-size:36px;margin-top:48px}}
</style>
</head>
<body>
<div class="wrap">
  <header class="mast"><a href="/companies">SF BAY AREA</a><a class="word" href="/">Demigod</a><span>EST. 2025</span></header>
  <h1>Write once.</h1>
  <p>A person picks better candidates. Names move after mutual yes.</p>
  <a class="mail" href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>
  <div class="actions">
    <a class="btn btn-primary" href="/?wiz=startup">Start a brief</a>
    <a class="btn btn-secondary" href="/?wiz=engineer">Join the network</a>
    <a class="dir" href="/app">Your hiring</a>
  </div>
  <p style="margin-top:48px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase"><a href="/companies">Companies</a> \xB7 <a href="/legal">Privacy</a> \xB7 <a href="/room">Project Room</a> \xB7 <a href="/app">Your hiring</a></p>
</div>
</body>
</html>`;
}
__name(demigodContactHtml, "demigodContactHtml");
__name2(demigodContactHtml, "demigodContactHtml");
__name22(demigodContactHtml, "demigodContactHtml");
__name222(demigodContactHtml, "demigodContactHtml");
function demigodLegalHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy &amp; terms \xB7 Demigod</title>
<meta name="description" content="A person picks better candidates. 10% of first-year base when a hire starts. Talent is free.">
<link rel="canonical" href="https://www.trydemigod.com/legal">
<meta name="theme-color" content="#0B120F">
<meta property="og:type" content="website">
<meta property="og:title" content="Privacy &amp; terms \xB7 Demigod">
<meta property="og:description" content="A person picks better candidates. 10% of first-year base when a hire starts. Talent is free.">
<meta property="og:url" content="https://www.trydemigod.com/legal">
<meta property="og:site_name" content="Demigod">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Privacy &amp; terms \xB7 Demigod">
<meta name="twitter:description" content="A person picks better candidates. 10% of first-year base when a hire starts. Talent is free.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Privacy & terms \xB7 Demigod","url":"https://www.trydemigod.com/legal","isPartOf":{"@type":"WebSite","name":"Demigod","url":"https://www.trydemigod.com/"}}<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IM+Fell+English&family=Hanken+Grotesk:wght@400&family=JetBrains+Mono:wght@400&display=swap">
<style>
html,body{margin:0;min-height:100vh;background:#0B120F;color:#E4DED2;font-family:'Hanken Grotesk',system-ui,sans-serif}
a{color:#D3A093;text-decoration:none}
a:hover{color:#E4DED2}
.wrap{max-width:720px;margin:0 auto;padding:32px 48px 48px}
.mast{display:flex;justify-content:space-between;border-bottom:1px solid rgba(228,222,210,.16);padding-bottom:14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.word{font-family:'IM Fell English',Georgia,serif;font-size:26px;color:#E4DED2;text-transform:none;letter-spacing:0}
h1{font-family:'Instrument Serif',Georgia,serif;font-size:56px;font-weight:400;line-height:1.04;margin:72px 0 18px}
h2{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(228,222,210,.5);margin:36px 0 12px}
p{max-width:540px;font-size:16px;line-height:1.8;color:rgba(228,222,210,.68)}
.mail{display:inline-block;margin:8px 0 28px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;letter-spacing:.04em;color:#D3A093}
.actions{display:flex;gap:14px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;padding:13px 26px;font-size:14px;border-radius:0}
.btn-primary{background:#E4DED2;color:#0B120F}
.btn-primary:hover{color:#0B120F;background:#EFE9DD}
.btn-secondary{border:1px solid rgba(228,222,210,.3);color:rgba(228,222,210,.8)}
@media(max-width:760px){.wrap{padding:22px}h1{font-size:36px;margin-top:48px}}
</style>
</head>
<body>
<div class="wrap">
  <header class="mast"><a href="/companies">SF BAY AREA</a><a class="word" href="/">Demigod</a><span>EST. 2025</span></header>
  <h1>Better candidates.</h1>
  <p>A person reads every brief and only proposes names they chose. 10% of first-year base when a hire starts. Talent is free.</p>
  <h2>Fee</h2>
  <p>Startups pay 10% of first-year base salary when a hire starts. Nothing upfront. Talent pays nothing.</p>
  <h2>Privacy</h2>
  <p>We collect what you submit and use it to run a named brief. Identity moves only after both sides approve that exact role. We do not sell contact lists. Questions: <a class="mail" href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>.</p>
  <div class="actions">
    <a class="btn btn-primary" href="/?wiz=startup">Start a brief</a>
    <a class="btn btn-secondary" href="/contact">Contact</a>
    <a class="dir" href="/app">Your hiring</a>
  </div>
</div>
</body>
</html>`;
}
__name(demigodLegalHtml, "demigodLegalHtml");
__name2(demigodLegalHtml, "demigodLegalHtml");
__name22(demigodLegalHtml, "demigodLegalHtml");
__name222(demigodLegalHtml, "demigodLegalHtml");
function demigodCompHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Founding engineer salary, SF \xB7 Demigod</title>
<meta name="description" content="Observed SF founding and early engineer comp bands: cash and equity by stage, from employer-posted ranges. As of September 2026.">
<link rel="canonical" href="https://www.trydemigod.com/comp/founding-engineer-sf">
<meta name="theme-color" content="#0B120F">
<meta property="og:type" content="article">
<meta property="og:title" content="Founding engineer salary, SF \xB7 Demigod">
<meta property="og:description" content="Observed SF founding and early engineer comp bands: cash and equity by stage, from employer-posted ranges. As of September 2026.">
<meta property="og:url" content="https://www.trydemigod.com/comp/founding-engineer-sf">
<meta property="og:site_name" content="Demigod">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Founding engineer salary, SF \xB7 Demigod">
<meta name="twitter:description" content="Observed SF founding and early engineer comp bands: cash and equity by stage, from employer-posted ranges. As of September 2026.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","name":"Founding engineer salary, SF","url":"https://www.trydemigod.com/comp/founding-engineer-sf","dateModified":"2026-09-08","isPartOf":{"@type":"WebSite","name":"Demigod","url":"https://www.trydemigod.com/"}}<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IM+Fell+English&family=Hanken+Grotesk:wght@400&family=JetBrains+Mono:wght@400&display=swap">
<style>
html,body{margin:0;min-height:100vh;background:#0B120F;color:#E4DED2;font-family:'Hanken Grotesk',system-ui,sans-serif}
a{color:#D3A093;text-decoration:none}
a:hover{color:#E4DED2}
.wrap{max-width:720px;margin:0 auto;padding:32px 48px 48px}
.mast{display:flex;justify-content:space-between;border-bottom:1px solid rgba(228,222,210,.16);padding-bottom:14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.word{font-family:'IM Fell English',Georgia,serif;font-size:26px;color:#E4DED2;text-transform:none;letter-spacing:0}
h1{font-family:'Instrument Serif',Georgia,serif;font-size:52px;font-weight:400;line-height:1.04;margin:72px 0 18px}
h2{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(228,222,210,.5);margin:36px 0 12px}
p,li{max-width:560px;font-size:16px;line-height:1.8;color:rgba(228,222,210,.68)}
ul{padding-left:20px}
li{margin:6px 0}
.band{border:1px solid rgba(228,222,210,.16);padding:18px 22px;margin:18px 0;max-width:560px}
.band h3{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:24px;margin:0 0 6px;color:#E4DED2}
.band .nums{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;color:#D3A093;letter-spacing:.04em;margin:0 0 10px}
.band p{margin:0 0 8px;font-size:15px}
.stamp{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(228,222,210,.42)}
.actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}
.btn{display:inline-flex;align-items:center;padding:13px 26px;font-size:14px;border-radius:0}
.btn-primary{background:#E4DED2;color:#0B120F}
.btn-primary:hover{color:#0B120F;background:#EFE9DD}
.btn-secondary{border:1px solid rgba(228,222,210,.3);color:rgba(228,222,210,.8)}
@media(max-width:760px){.wrap{padding:22px}h1{font-size:34px;margin-top:48px}}
</style>
</head>
<body>
<div class="wrap">
  <header class="mast"><a href="/companies">SF BAY AREA</a><a class="word" href="/">Demigod</a><span>EST. 2025</span></header>
  <h1>What founding engineers make in SF.</h1>
  <p>Observed comp bands from 42 employer-posted ranges in the September 2026 HN "Who is hiring?" thread - companies stating their own numbers, not survey data or self-reported candidates. <span class="stamp">Data as of September 2026</span></p>
  <div class="band">
    <h3>Founding engineer</h3>
    <p class="nums">$120k&ndash;$190k cash \xB7 1&ndash;2% equity, up to cofounder-level</p>
    <p>Pre-seed and seed. The equity does the negotiating. Observed: Axo $120&ndash;160k + founding equity; Cascade Space $150&ndash;190k + equity (SF); Astoria AI equity-only pre-seed converting to $190&ndash;280k post-seed.</p>
  </div>
  <div class="band">
    <h3>Early engineer</h3>
    <p class="nums">$150k&ndash;$250k cash \xB7 0.2&ndash;1% equity</p>
    <p>Seed to Series A. SF onsite. Observed: Silkline $150&ndash;225k; Uncountable $130&ndash;220k (SF); Loft Orbital $180&ndash;240k (SF); Paramark $199&ndash;249k (SF); Mondrio $200&ndash;250k (SF); Balerion AI $250k+ base + seed equity (SF).</p>
  </div>
  <div class="band">
    <h3>Senior / staff</h3>
    <p class="nums">$200k&ndash;$400k+ cash \xB7 smaller equity, refreshers matter</p>
    <p>Growth stage. Observed: Mechanize $300&ndash;400k (SF); AIUC $200&ndash;400k (SF); DualEntry $250&ndash;375k; Amplify Renewables $200&ndash;375k all cash (SF); Discord $280&ndash;330k (SF).</p>
  </div>
  <h2>How to read this</h2>
  <ul>
    <li>SF early-engineer cash median sits around $200k this month. Founding roles trade $30&ndash;60k of cash for equity.</li>
    <li>Remote-first companies post 20&ndash;40% below SF onsite for the same seniority.</li>
    <li>"All cash, no equity" shows up at the top of the senior band - one counter-position, not a trend.</li>
  </ul>
  <h2>Method</h2>
  <p>Every range above is from a public September 2026 HN hiring post written by the hiring company itself (<a href="https://news.ycombinator.com/item?id=49522897">source thread</a>, 42 posts with ranges). Bands are read off those postings, not invented. Refreshed from each month's thread plus our own mandate outcomes.</p>
  <h2>How we use this</h2>
  <p>We price mandates against real first-year cash, and our fee stays fixed whatever the band: 10% of first-year cash when a hire starts. No retainer. Talent pays nothing.</p>
  <div class="actions">
    <a class="btn btn-primary" href="/?wiz=startup">Start a brief</a>
    <a class="btn btn-secondary" href="/companies">Companies</a>
    <a class="btn btn-secondary" href="/legal">Fee &amp; privacy</a>
  </div>
</div>
</body>
</html>`;
}
__name(demigodCompHtml, "demigodCompHtml");
__name2(demigodCompHtml, "demigodCompHtml");
var LLMS_TXT = `# Demigod

> SF Bay Area recruiting desk. Seed and Series A. First engineering seats.

A person picks better candidates. Names move after mutual yes.
10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.
potter@trydemigod.com

## Pages

- [Home](https://www.trydemigod.com/): the desk
- [Contact](https://www.trydemigod.com/contact): write potter@trydemigod.com
- [Companies](https://www.trydemigod.com/companies): public SF company facts
- [Weekly](https://www.trydemigod.com/weekly): observed board movement in the snapshot (first-seen is ours)
- [Packets](https://www.trydemigod.com/packets): public company packets
- [Journal](https://www.trydemigod.com/journal): dated hiring journal
- [Peers](https://www.trydemigod.com/peers): observed ATS family overlap
- [Memo](https://www.trydemigod.com/memo): public one-pagers
- [Ticket](https://www.trydemigod.com/ticket): review-only hiring ticket
- [Privacy](https://www.trydemigod.com/legal): fee and privacy
- [Founding engineer salary, SF](https://www.trydemigod.com/comp/founding-engineer-sf): observed SF comp bands by stage, employer-posted ranges
- [Start a brief](https://www.trydemigod.com/?wiz=startup)
- [Your hiring](https://www.trydemigod.com/app)
- [Join the network](https://www.trydemigod.com/?wiz=engineer)

## Hardware

- [Hardware hub](https://www.trydemigod.com/hardware): the SF hardware scene map
- [Hardware directory](https://www.trydemigod.com/hardware/directory): 135 hardware companies with SF/Bay presence, sector-tagged
- [Hardware signals](https://www.trydemigod.com/hardware/signals): weekly observed hardware hiring signals
- [Guide: Prototyping](https://www.trydemigod.com/hardware/guides/prototyping): prototype shops and iteration
- [Guide: Certification](https://www.trydemigod.com/hardware/guides/certification): certification labs and test paths
- [Guide: Contract manufacturers](https://www.trydemigod.com/hardware/guides/contract-manufacturers): CMs and production ramp
- [Guide: Community](https://www.trydemigod.com/hardware/guides/community): meetups and local community
- [Guide: Fundraising](https://www.trydemigod.com/hardware/guides/fundraising): hardware fundraising notes

Grok Bot compatible. Sign in: /grok
`;
var LLMS_FULL_TXT = `# Demigod

SF Bay Area recruiting desk. Seed and Series A. First engineering seats.
A person picks better candidates. Names move after mutual yes.

## How it goes

Every crew starts with two people who recognized each other.

1. Say it once. One brief. The actual work.
2. A person reads. Only names they chose.
3. Meet. Mutual yes. Nothing moves until you do.

## Fee

10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.

## Contact

potter@trydemigod.com
https://www.trydemigod.com/contact

## Doors

- Start a brief: https://www.trydemigod.com/?wiz=startup
- Companies: https://www.trydemigod.com/companies
- Join the network: https://www.trydemigod.com/?wiz=engineer
- Weekly: https://www.trydemigod.com/weekly
- Packets: https://www.trydemigod.com/packets
- Journal: https://www.trydemigod.com/journal
- Peers: https://www.trydemigod.com/peers
- Memo: https://www.trydemigod.com/memo
- Ticket: https://www.trydemigod.com/ticket
- Privacy: https://www.trydemigod.com/legal
`;
function demigodHomeMarkdown() {
  return `${demigodHomeMarkdownRaw()}\n${motleyHomeIaMarkdown()}`;
}
function demigodHomeMarkdownRaw() {
  return `# Demigod

SF \xB7 Seed and Series A \xB7 First engineering seats.

# A motley crew is assembled quietly.

You are deciding who is in the boat. A person picks, then knocks once.

Names move after mutual yes.

## How it goes

Every crew starts with two people who recognized each other.

1. Say it once. One brief. The actual work.
2. A person reads. Only names they chose.
3. Meet. Mutual yes. Nothing moves until you do.

## What we look at

Role, the actual work. Comp, the real range. Location, SF Bay. Reviewed by a person.

## Fee

10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.

## Doors

- [Start a brief](https://www.trydemigod.com/?wiz=startup)
- [Contact](https://www.trydemigod.com/contact)
- [Companies](https://www.trydemigod.com/companies)
- [Join the network](https://www.trydemigod.com/?wiz=engineer)
`;
}
__name(demigodHomeMarkdown, "demigodHomeMarkdown");
__name2(demigodHomeMarkdown, "demigodHomeMarkdown");
__name22(demigodHomeMarkdown, "demigodHomeMarkdown");
__name222(demigodHomeMarkdown, "demigodHomeMarkdown");
function demigodContactMarkdown() {
  return `# Contact \xB7 Demigod

Write potter@trydemigod.com. Or start a brief.

A person reads it. Names move after mutual yes.

- [Start a brief](https://www.trydemigod.com/?wiz=startup)
- [Join the network](https://www.trydemigod.com/?wiz=engineer)
- [Companies](https://www.trydemigod.com/companies)
- [Home](https://www.trydemigod.com/)
`;
}
__name(demigodContactMarkdown, "demigodContactMarkdown");
__name2(demigodContactMarkdown, "demigodContactMarkdown");
__name22(demigodContactMarkdown, "demigodContactMarkdown");
__name222(demigodContactMarkdown, "demigodContactMarkdown");
var FEED_SCHEMA = "demigod-bounties-feed/v1";
var FEED_NOTE = "Declared USDC. We don't hold it. Unused bounty rail \u2014 not the 10% on-hire fee. Demigod listings only \u2014 not extraSeed/dasha-desk.";
var FEED_PAGE = "https://www.trydemigod.com/bounties";
var FEED_SOURCES = [
  "https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/26de647f7000/bounties-feed.json",
  "https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@26de647f7000/bounties-feed.json"
];
var PINNED_BOUNTIES_FEED = {
  name: "demigod bounties",
  schema: FEED_SCHEMA,
  note: "Declared USDC. We don't hold it. Demigod listings only \u2014 not extraSeed/dasha-desk.",
  url: "https://www.trydemigod.com/?p=bounties",
  listings: []
};
var CDN_PIN_FROM = "b100a610ad40";
var CDN_PIN_TO = "26de647f7000";
var CDN_FOOT_SRI_FROM = "sha384-aichFBWmRqq2KSp674hCQP1uTTX0+vmbWPtbAEk3QMUgb2sTVEcLjPoPKC8k17rR";
var CDN_FOOT_SRI_TO = "sha384-QOz+1a+0qQt0RzcVTXG7PKDkCmPMSNy2KU4NqrW0m7dqaBzP/b8D3khuyeVkbc2c";
var LIVE_MAP_DATE = "2026-08-21";
var LIVE_MAP_GENERATED_AT = "2026-08-21T18:44:45.305Z";
var LIVE_MAP_PIN = "a1a851ac48e9c6bf09e17a4a2decbd75004b4f61";
var STALE_ROLES_GENERATED_AT = "2026-08-06T14:33:36.175Z";
var CDN_JSON_TTL = 300;
var PAGE_CSS = `
:root{
  --ink:#0B120F;
  --bone:#EFE9DD;
  --light:#E4DED2;
  --dark:#23211D;
  --clay:#D3A093;
}
*{box-sizing:border-box}
html,body{margin:0;background:#0B120F;color:#E4DED2}
body{position:relative;min-height:100vh;font-family:'Hanken Grotesk',system-ui,sans-serif}
a{color:#D3A093;text-decoration:none}
a:hover{color:#E4DED2}
:focus-visible{outline:1px solid #D3A093;outline-offset:3px}
.grain{position:absolute;inset:0;pointer-events:none}
.grain-dark{
  opacity:.45;
  mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='150' height='150' filter='url(%23n)' opacity='0.42'/></svg>");
}
.wrap{position:relative;max-width:1160px;margin:0 auto;padding:0 48px 48px}
.mast{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(228,222,210,.16);padding:32px 0 14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;color:rgba(228,222,210,.42);text-transform:uppercase}
.mast>a:not(.word){color:inherit}
.word{font-family:'IM Fell English',Georgia,serif;font-size:26px;letter-spacing:0;color:#E4DED2;text-transform:none}
.word:hover{color:#E4DED2}
.quiet{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(228,222,210,.42);padding:14px 0 0}
.quiet a{color:rgba(228,222,210,.5)}
.quiet a:hover{color:#E4DED2}
.facts-line{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.42);text-transform:uppercase;padding:12px 0 0}
h1{margin:28px 0 8px;font-family:'Instrument Serif',Georgia,serif;font-size:52px;font-weight:400;line-height:1.04;letter-spacing:-.015em;color:#E4DED2}
h2{font-family:'Instrument Serif',Georgia,serif;font-size:26px;font-weight:400;margin:36px 0 10px;color:#E4DED2}
.lede{margin:0 0 18px;max-width:520px;font-size:16px;line-height:1.8;color:rgba(228,222,210,.68)}
.muted,.count{color:rgba(228,222,210,.5);font-size:14px;line-height:1.7}
.filters{display:flex;flex-direction:column;gap:10px;padding:22px 0 6px;border-top:1px solid rgba(228,222,210,.16);margin-top:22px}
.filt{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;color:rgba(228,222,210,.42);line-height:1.8}
.filt a{color:rgba(228,222,210,.48);margin-right:16px}
.filt a.on{color:#D3A093}
.filt form{display:inline}
.filt input{
  background:transparent;border:0;border-bottom:1px solid rgba(228,222,210,.16);
  color:#E4DED2;font:inherit;padding:3px 0;border-radius:0;width:min(280px,70vw);
}
.list{margin:10px 0 0}
a.row,.list>.row{
  display:flex;justify-content:space-between;align-items:baseline;gap:28px;
  padding:15px 0;border-bottom:1px solid rgba(228,222,210,.16);color:inherit;
}
a.row:hover{color:#E4DED2}
a.row .name,.list>.row .name{font-family:'Instrument Serif',Georgia,serif;font-size:22px;line-height:1.2;color:#E4DED2}
a.row .domain,.list>.row .domain{display:block;margin-top:4px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.04em;color:rgba(228,222,210,.42)}
a.row .meta,.list>.row .meta{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.05em;color:rgba(228,222,210,.48);text-align:right;max-width:52%}
.facts-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(228,222,210,.16);border:1px solid rgba(228,222,210,.16);margin:28px 0 8px}
.cell{background:#0B120F;padding:18px 20px;display:flex;flex-direction:column;gap:7px}
.cell-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.42);text-transform:uppercase}
.cell-v{font-size:14px;line-height:1.5;color:#E4DED2}
.packet p{max-width:640px;font-size:15px;line-height:1.8;color:rgba(228,222,210,.72)}
.packet ul{margin:.4rem 0 0;padding-left:1.15rem;color:rgba(228,222,210,.72)}
.honesty{margin:0 0 10px;max-width:640px;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;line-height:1.7;letter-spacing:0;text-transform:none;color:rgba(228,222,210,.5)}
.foot{border-top:1px solid rgba(228,222,210,.16);margin-top:48px;padding:18px 0 8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.3);text-transform:uppercase}
.foot a{color:rgba(228,222,210,.3)}
.foot a:hover{color:#D3A093}
@media(max-width:760px){
  .wrap{padding:0 22px 36px}
  h1{font-size:36px}
  .facts-grid{grid-template-columns:1fr}
  a.row,.list>.row{flex-direction:column;gap:8px}
  a.row .meta,.list>.row .meta{text-align:left;max-width:100%}
}
.siwg{display:inline-flex;align-items:center;gap:12px;padding:9px 22px 9px 9px;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#22d3ee);color:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;font-weight:500;letter-spacing:.01em;box-shadow:-10px 0 28px rgba(124,58,237,.42),10px 0 28px rgba(34,211,238,.38);border:0;text-decoration:none;line-height:1}
.siwg:hover{color:#fff;filter:brightness(1.07)}
.siwg-icon{display:block;width:28px;height:28px;flex:0 0 28px;border-radius:8px}
.actions-siwg{padding-top:6px}
.siwg-pair{margin:22px 0 8px;min-height:3em}
.siwg-code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:28px;letter-spacing:.18em;color:#E4DED2;margin:12px 0}
.siwg-credit{margin-top:48px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.siwg-credit a{color:rgba(228,222,210,.35)}
.siwg-credit a:hover{color:#D3A093}
@media(prefers-reduced-motion:reduce){.grain{display:none}}
`;
var HTML_SECURITY = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
};
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
__name(escapeHtml, "escapeHtml");
__name2(escapeHtml, "escapeHtml");
__name22(escapeHtml, "escapeHtml");
__name222(escapeHtml, "escapeHtml");
function ensureHtmlLang(html) {
  return String(html || "").replace(/<html\b([^>]*)>/i, (tag, attrs) => /\blang\s*=/i.test(attrs) ? tag : `<html lang="en"${attrs}>`);
}
__name(ensureHtmlLang, "ensureHtmlLang");
__name2(ensureHtmlLang, "ensureHtmlLang");
__name22(ensureHtmlLang, "ensureHtmlLang");
__name222(ensureHtmlLang, "ensureHtmlLang");
function applyHtmlSecurity(headers) {
  for (const [name, value] of Object.entries(HTML_SECURITY))
    headers.set(name, value);
  return headers;
}
__name(applyHtmlSecurity, "applyHtmlSecurity");
__name2(applyHtmlSecurity, "applyHtmlSecurity");
__name22(applyHtmlSecurity, "applyHtmlSecurity");
__name222(applyHtmlSecurity, "applyHtmlSecurity");
function isProductHost(host) {
  const h = String(host || "").toLowerCase();
  return h === "www.trydemigod.com" || h === "trydemigod.com";
}
__name(isProductHost, "isProductHost");
__name2(isProductHost, "isProductHost");
__name22(isProductHost, "isProductHost");
__name222(isProductHost, "isProductHost");
function isBountiesPath(pathname) {
  return pathname === "/bounties" || pathname === "/bounties/";
}
__name(isBountiesPath, "isBountiesPath");
__name2(isBountiesPath, "isBountiesPath");
__name22(isBountiesPath, "isBountiesPath");
__name222(isBountiesPath, "isBountiesPath");
function isBountiesJsonPath(pathname) {
  return pathname === "/bounties.json" || pathname === "/bounties.json/";
}
__name(isBountiesJsonPath, "isBountiesJsonPath");
__name2(isBountiesJsonPath, "isBountiesJsonPath");
__name22(isBountiesJsonPath, "isBountiesJsonPath");
__name222(isBountiesJsonPath, "isBountiesJsonPath");
function isCompaniesPath(pathname) {
  return pathname === "/companies" || pathname === "/companies/";
}
__name(isCompaniesPath, "isCompaniesPath");
__name2(isCompaniesPath, "isCompaniesPath");
__name22(isCompaniesPath, "isCompaniesPath");
__name222(isCompaniesPath, "isCompaniesPath");
function isCompanyPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "");
  return path.startsWith("/c/") && path.length > 3;
}
__name(isCompanyPath, "isCompanyPath");
__name2(isCompanyPath, "isCompanyPath");
__name22(isCompanyPath, "isCompanyPath");
__name222(isCompanyPath, "isCompanyPath");
function isWeeklyPath(pathname) {
  return pathname === "/weekly" || pathname === "/weekly/";
}
__name(isWeeklyPath, "isWeeklyPath");
__name2(isWeeklyPath, "isWeeklyPath");
__name22(isWeeklyPath, "isWeeklyPath");
__name222(isWeeklyPath, "isWeeklyPath");
function isPacketsPath(pathname) {
  return pathname === "/packets" || pathname === "/packets/";
}
__name(isPacketsPath, "isPacketsPath");
__name2(isPacketsPath, "isPacketsPath");
__name22(isPacketsPath, "isPacketsPath");
__name222(isPacketsPath, "isPacketsPath");
function isJournalPath(pathname) {
  return pathname === "/journal" || pathname === "/journal/";
}
__name(isJournalPath, "isJournalPath");
__name2(isJournalPath, "isJournalPath");
__name22(isJournalPath, "isJournalPath");
__name222(isJournalPath, "isJournalPath");
function isPeersPath(pathname) {
  return pathname === "/peers" || pathname === "/peers/";
}
__name(isPeersPath, "isPeersPath");
__name2(isPeersPath, "isPeersPath");
__name22(isPeersPath, "isPeersPath");
__name222(isPeersPath, "isPeersPath");
function isMemoPath(pathname) {
  return pathname === "/memo" || pathname === "/memo/";
}
__name(isMemoPath, "isMemoPath");
__name2(isMemoPath, "isMemoPath");
__name22(isMemoPath, "isMemoPath");
__name222(isMemoPath, "isMemoPath");
function isTicketPath(pathname) {
  return pathname === "/ticket" || pathname === "/ticket/";
}
__name(isTicketPath, "isTicketPath");
__name2(isTicketPath, "isTicketPath");
__name22(isTicketPath, "isTicketPath");
__name222(isTicketPath, "isTicketPath");
function isBriefPath(pathname) {
  return pathname === "/brief" || pathname === "/brief/";
}
__name(isBriefPath, "isBriefPath");
__name2(isBriefPath, "isBriefPath");
__name22(isBriefPath, "isBriefPath");
__name222(isBriefPath, "isBriefPath");
function isJoinPath(pathname) {
  return pathname === "/join" || pathname === "/join/";
}
__name(isJoinPath, "isJoinPath");
__name2(isJoinPath, "isJoinPath");
__name22(isJoinPath, "isJoinPath");
__name222(isJoinPath, "isJoinPath");
function companyIdFromPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "");
  if (!path.startsWith("/c/") || path.length <= 3)
    return "";
  const raw = path.slice(3);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
__name(companyIdFromPath, "companyIdFromPath");
__name2(companyIdFromPath, "companyIdFromPath");
__name22(companyIdFromPath, "companyIdFromPath");
__name222(companyIdFromPath, "companyIdFromPath");
function honestPayTo(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(honestPayTo, "honestPayTo");
__name2(honestPayTo, "honestPayTo");
__name22(honestPayTo, "honestPayTo");
__name222(honestPayTo, "honestPayTo");
function rewriteCdnPin(html) {
  return String(html || "").replaceAll(CDN_PIN_FROM, CDN_PIN_TO).replaceAll(CDN_FOOT_SRI_FROM, CDN_FOOT_SRI_TO).replaceAll("foot v1106", "foot v1107").replaceAll("Human-reviewed matching", "Better candidates");
}
__name(rewriteCdnPin, "rewriteCdnPin");
__name2(rewriteCdnPin, "rewriteCdnPin");
__name22(rewriteCdnPin, "rewriteCdnPin");
__name222(rewriteCdnPin, "rewriteCdnPin");
function rewriteStaleSnapshotDates(html) {
  return String(html || "").replaceAll('data-generated-at="2026-08-02"', `data-generated-at="${LIVE_MAP_DATE}"`).replaceAll("2026-08-02 snapshot", `${LIVE_MAP_DATE} snapshot`).replaceAll("observed 2026-08-02", `observed ${LIVE_MAP_DATE}`).replaceAll(`"generatedAt":"${STALE_ROLES_GENERATED_AT}"`, `"generatedAt":"${LIVE_MAP_GENERATED_AT}"`);
}
__name(rewriteStaleSnapshotDates, "rewriteStaleSnapshotDates");
__name2(rewriteStaleSnapshotDates, "rewriteStaleSnapshotDates");
__name22(rewriteStaleSnapshotDates, "rewriteStaleSnapshotDates");
__name222(rewriteStaleSnapshotDates, "rewriteStaleSnapshotDates");
function stripGoldAccent(html) {
  return String(html || "").replace(
    /<span\b(?=[^>]*\bclass=["'][^"']*\btitle-accent-gold\b)[^>]*>[\s\S]*?<\/span>/gi,
    ""
  );
}
__name(stripGoldAccent, "stripGoldAccent");
__name2(stripGoldAccent, "stripGoldAccent");
__name22(stripGoldAccent, "stripGoldAccent");
__name222(stripGoldAccent, "stripGoldAccent");
var LEFTOVER_SHELLS = {
  "/look": "/contact",
  "/looks": "/contact",
  "/hello": "/contact",
  "/hello.json": "/contact",
  "/how-it-works": "/",
  "/sample": "/",
  "/events": "/",
  "/startups": "/companies",
  "/packet": "/packets",
  "/map": "/companies",
  "/login": "/app/login",
  "/signup": "/app/login",
  "/sign-up": "/app/login",
  "/sign_up": "/app/login",
  "/register": "/app/login",
  "/signin": "/app/login",
  "/sign-in": "/app/login",
  "/sign_in": "/app/login",
  "/auth": "/app/login",
  "/log-in": "/app/login",
  "/log_in": "/app/login",
  "/roles": "/journal",
  "/blog": "/",
  "/jobs": "/",
  "/openings": "/",
  "/start": "/",
  "/briefs": "/",
  "/recruit": "/",
  "/recruit-family": "/",
  "/hire-me": "/",
  "/die": "/",
  "/recruiter": "/",
  "/hiring": "/",
  "/talent-pool": "/",
  "/ats": "/",
  "/greenhouse": "/",
  "/ashby": "/",
  "/lever": "/",
  "/intros": "/",
  "/intro": "/",
  "/intro.json": "/",
  "/match": "/",
  "/match.json": "/",
  "/matching": "/",
  "/operators": "/",
  "/operator": "/",
  "/apply": "/",
  "/careers": "/",
  "/agency": "/",
  "/agencies": "/",
  "/search-firm": "/",
  "/search_firm": "/",
  "/searchfirm": "/",
  "/talent-partner": "/",
  "/talent_partner": "/",
  "/talentpartner": "/",
  "/headhunter": "/",
  "/headhunters": "/",
  "/opportunities": "/",
  "/opportunity": "/",
  "/posting": "/",
  "/postings": "/",
  "/vacancy": "/",
  "/vacancies": "/",
  "/engineers": "/",
  "/candidates": "/",
  "/fees": "/",
  "/about": "/",
  "/network": "/talent",
  "/pilot": "/hire",
  "/method": "/",
  "/founders": "/",
  "/founder": "/",
  "/compare": "/pricing",
  "/status": "/",
  "/security": "/",
  "/notes": "/",
  "/partnership": "/",
  "/partnerships": "/",
  "/press": "/",
  "/refer": "/",
  "/private": "/",
  "/tryouts": "/",
  "/terms": "/legal",
  "/cookies": "/",
  "/desk": "/",
  "/motley": "/",
  "/project-room": "/room",
  "/project_room": "/room",
  "/skill.md": "/room/llms.txt",
  "/agents.md": "/room/llms.txt",
  "/claude.md": "/room/llms.txt",
  "/room/skill.md": "/room/llms.txt",
  "/room/agents.md": "/room/llms.txt",
  "/room/claude.md": "/room/llms.txt",
  "/mcp": "/room/.well-known/agent.json",
  "/api": "/room",
  "/docs": "/room",
  "/help": "/room",
  "/privacy": "/legal",
  "/posting-age": "/",
  "/posting-age-index": "/",
  "/data": "/",
  "/404": "/",
  "/proof": "/"
};
var LEFTOVER_PEOPLE = [
  "Jordan Avery",
  "Morgan Ellis",
  "Taylor Quinn",
  "Riley Shaw",
  "Casey Lin",
  "Alex Harper",
  "Sydney Blake",
  "Drew Patel",
  "Jamie Rowan",
  "Riley Chen",
  "Taylor Kim",
  "Morgan Lee",
  "Jordan Patel"
];
function leftoverRedirectPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return LEFTOVER_SHELLS[path] || LEFTOVER_SHELLS[path.toLowerCase()] || "";
}
__name(leftoverRedirectPath, "leftoverRedirectPath");
__name2(leftoverRedirectPath, "leftoverRedirectPath");
__name22(leftoverRedirectPath, "leftoverRedirectPath");
__name222(leftoverRedirectPath, "leftoverRedirectPath");
function leftoverRedirect(url) {
  const dest = leftoverRedirectPath(url.pathname);
  if (!dest)
    return null;
  return new Response(null, {
    status: 308,
    headers: {
      Location: `https://www.trydemigod.com${dest}`,
      "Cache-Control": "public, max-age=3600",
      "X-Demigod-Edge": "leftover-redirect"
    }
  });
}
__name(leftoverRedirect, "leftoverRedirect");
__name2(leftoverRedirect, "leftoverRedirect");
__name22(leftoverRedirect, "leftoverRedirect");
__name222(leftoverRedirect, "leftoverRedirect");
function isFounderAppPath(pathname) {
  const p = String(pathname || "");
  return p === "/app" || p === "/app/" || p.startsWith("/app/");
}
__name(isFounderAppPath, "isFounderAppPath");
__name2(isFounderAppPath, "isFounderAppPath");
__name22(isFounderAppPath, "isFounderAppPath");
__name222(isFounderAppPath, "isFounderAppPath");
async function briefJoinRedirect(url) {
  let dest = "";
  if (isBriefPath(url.pathname)) {
    const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
    const href = namedBriefHref(map, url);
    dest = href === "/?wiz=startup" ? "https://www.trydemigod.com/?wiz=startup" : `https://www.trydemigod.com${href}`;
  } else if (isJoinPath(url.pathname))
    dest = "https://www.trydemigod.com/?wiz=engineer";
  else
    return null;
  return new Response(null, {
    status: 308,
    headers: {
      Location: dest,
      "Cache-Control": "public, max-age=3600",
      "X-Demigod-Edge": "brief-join-redirect"
    }
  });
}
__name(briefJoinRedirect, "briefJoinRedirect");
__name2(briefJoinRedirect, "briefJoinRedirect");
__name22(briefJoinRedirect, "briefJoinRedirect");
__name222(briefJoinRedirect, "briefJoinRedirect");
function isHomePath(pathname) {
  return pathname === "/" || pathname === "";
}
__name(isHomePath, "isHomePath");
__name2(isHomePath, "isHomePath");
__name22(isHomePath, "isHomePath");
__name222(isHomePath, "isHomePath");
function isHirePath(pathname) {
  return pathname === "/hire" || pathname === "/hire/";
}
__name(isHirePath, "isHirePath");
__name2(isHirePath, "isHirePath");
__name22(isHirePath, "isHirePath");
__name222(isHirePath, "isHirePath");
function isContactPath(pathname) {
  return pathname === "/contact" || pathname === "/contact/";
}
__name(isContactPath, "isContactPath");
__name2(isContactPath, "isContactPath");
__name22(isContactPath, "isContactPath");
__name222(isContactPath, "isContactPath");
function isLegalPath(pathname) {
  return pathname === "/legal" || pathname === "/legal/";
}
__name(isLegalPath, "isLegalPath");
__name2(isLegalPath, "isLegalPath");
function isCompPath(pathname) {
  return pathname === "/comp/founding-engineer-sf" || pathname === "/comp/founding-engineer-sf/";
}
__name(isCompPath, "isCompPath");
__name2(isCompPath, "isCompPath");
__name22(isLegalPath, "isLegalPath");
__name222(isLegalPath, "isLegalPath");
function isEventsPath(pathname) {
  return pathname === "/events" || pathname === "/events/";
}
__name(isEventsPath, "isEventsPath");
__name2(isEventsPath, "isEventsPath");
__name22(isEventsPath, "isEventsPath");
__name222(isEventsPath, "isEventsPath");
function isSitemapPath(pathname) {
  return pathname === "/sitemap.xml" || pathname === "/sitemap.xml/";
}
__name(isSitemapPath, "isSitemapPath");
__name2(isSitemapPath, "isSitemapPath");
__name22(isSitemapPath, "isSitemapPath");
__name222(isSitemapPath, "isSitemapPath");
function isLlmsPath(pathname) {
  return pathname === "/llms.txt" || pathname === "/llms.txt/";
}
__name(isLlmsPath, "isLlmsPath");
__name2(isLlmsPath, "isLlmsPath");
__name22(isLlmsPath, "isLlmsPath");
__name222(isLlmsPath, "isLlmsPath");
function isRobotsPath(pathname) {
  return pathname === "/robots.txt" || pathname === "/robots.txt/";
}
__name(isRobotsPath, "isRobotsPath");
__name2(isRobotsPath, "isRobotsPath");
__name22(isRobotsPath, "isRobotsPath");
__name222(isRobotsPath, "isRobotsPath");
function isLlmsFullPath(pathname) {
  return pathname === "/llms-full.txt" || pathname === "/llms-full.txt/";
}
__name(isLlmsFullPath, "isLlmsFullPath");
__name2(isLlmsFullPath, "isLlmsFullPath");
__name22(isLlmsFullPath, "isLlmsFullPath");
__name222(isLlmsFullPath, "isLlmsFullPath");
function isAiTxtPath(pathname) {
  return pathname === "/ai.txt" || pathname === "/ai.txt/";
}
__name(isAiTxtPath, "isAiTxtPath");
__name2(isAiTxtPath, "isAiTxtPath");
var SIWG_ICON = `<svg class="siwg-icon" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#000"/><path d="M6 32V22.5C6 14.5 10.6 9 16 9s10 5.5 10 13.5V32z" fill="#fff"/><rect x="10" y="15.8" width="3.4" height="6" rx="1.7" fill="#000" transform="rotate(-16 11.7 18.8)"/><rect x="18.6" y="15.8" width="3.4" height="6" rx="1.7" fill="#000" transform="rotate(16 20.3 18.8)"/></svg>`;
var GROK_BOT_DOC = {
  compatible: true,
  name: "trydemigod.com",
  login: "https://www.trydemigod.com/grok",
  sign_in: {
    start: "https://www.trydemigod.com/auth/grok/start",
    status: "https://www.trydemigod.com/auth/grok/status",
    verify: "https://www.trydemigod.com/auth/grok/verify"
  },
  verify_prompt: "sign me into trydemigod.com with {code}"
};
var GROK_CODE_ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function siwgButtonHtml(href) {
  const dest = escapeHtml(href || "/grok");
  return `<a class="siwg" href="${dest}">${SIWG_ICON}<span>Sign in with Grok Bot</span></a>`;
}
__name(siwgButtonHtml, "siwgButtonHtml");
__name2(siwgButtonHtml, "siwgButtonHtml");
__name22(siwgButtonHtml, "siwgButtonHtml");
__name222(siwgButtonHtml, "siwgButtonHtml");
function isGrokPath(pathname) {
  return pathname === "/grok" || pathname === "/grok/";
}
__name(isGrokPath, "isGrokPath");
__name2(isGrokPath, "isGrokPath");
__name22(isGrokPath, "isGrokPath");
__name222(isGrokPath, "isGrokPath");
function isGrokWellKnownPath(pathname) {
  return pathname === "/.well-known/grok-bot.json" || pathname === "/.well-known/grok-bot.json/";
}
__name(isGrokWellKnownPath, "isGrokWellKnownPath");
__name2(isGrokWellKnownPath, "isGrokWellKnownPath");
__name22(isGrokWellKnownPath, "isGrokWellKnownPath");
__name222(isGrokWellKnownPath, "isGrokWellKnownPath");
function isGrokAuthPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p === "/auth/grok/start" || p === "/auth/grok/status" || p === "/auth/grok/verify";
}
__name(isGrokAuthPath, "isGrokAuthPath");
__name2(isGrokAuthPath, "isGrokAuthPath");
__name22(isGrokAuthPath, "isGrokAuthPath");
__name222(isGrokAuthPath, "isGrokAuthPath");
function grokStore() {
  if (!globalThis.__dgGrokPair)
    globalThis.__dgGrokPair = { codes: /* @__PURE__ */ new Map(), starts: /* @__PURE__ */ new Map(), verifies: /* @__PURE__ */ new Map() };
  return globalThis.__dgGrokPair;
}
__name(grokStore, "grokStore");
__name2(grokStore, "grokStore");
__name22(grokStore, "grokStore");
__name222(grokStore, "grokStore");
function pruneGrok(store, now) {
  for (const [code, row] of store.codes)
    if (!row || row.exp <= now)
      store.codes.delete(code);
}
__name(pruneGrok, "pruneGrok");
__name2(pruneGrok, "pruneGrok");
__name22(pruneGrok, "pruneGrok");
__name222(pruneGrok, "pruneGrok");
function grokClientIp(request) {
  const cf = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (cf)
    return cf;
  const fwd = String(request.headers.get("X-Forwarded-For") || "").split(",")[0].trim();
  if (fwd)
    return fwd;
  const real = String(request.headers.get("X-Real-IP") || "").trim();
  return real || "local";
}
__name(grokClientIp, "grokClientIp");
__name2(grokClientIp, "grokClientIp");
__name22(grokClientIp, "grokClientIp");
__name222(grokClientIp, "grokClientIp");
function grokRateOk(bucket, ip, limit, windowMs, now) {
  const prev = (bucket.get(ip) || []).filter((t) => now - t < windowMs);
  if (prev.length >= limit) {
    bucket.set(ip, prev);
    return false;
  }
  prev.push(now);
  bucket.set(ip, prev);
  return true;
}
__name(grokRateOk, "grokRateOk");
__name2(grokRateOk, "grokRateOk");
__name22(grokRateOk, "grokRateOk");
__name222(grokRateOk, "grokRateOk");
function grokRandomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let out = "";
  for (const b of bytes)
    out += GROK_CODE_ALPH[b % GROK_CODE_ALPH.length];
  return out;
}
__name(grokRandomCode, "grokRandomCode");
__name2(grokRandomCode, "grokRandomCode");
__name22(grokRandomCode, "grokRandomCode");
__name222(grokRandomCode, "grokRandomCode");
function grokRandomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = "";
  for (const b of bytes)
    out += b.toString(16).padStart(2, "0");
  return out;
}
__name(grokRandomToken, "grokRandomToken");
__name2(grokRandomToken, "grokRandomToken");
__name22(grokRandomToken, "grokRandomToken");
__name222(grokRandomToken, "grokRandomToken");
function grokReadCookie(request, name) {
  const raw = String(request.headers.get("Cookie") || "");
  for (const part of raw.split(/;\s*/)) {
    const at = part.indexOf("=");
    if (at < 0)
      continue;
    if (part.slice(0, at) === name) {
      try {
        return decodeURIComponent(part.slice(at + 1));
      } catch {
        return part.slice(at + 1);
      }
    }
  }
  return "";
}
__name(grokReadCookie, "grokReadCookie");
__name2(grokReadCookie, "grokReadCookie");
__name22(grokReadCookie, "grokReadCookie");
__name222(grokReadCookie, "grokReadCookie");
function grokB64url(bytes) {
  let bin = "";
  for (const b of bytes)
    bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(grokB64url, "grokB64url");
__name2(grokB64url, "grokB64url");
__name22(grokB64url, "grokB64url");
__name222(grokB64url, "grokB64url");
function grokSecret(env) {
  const fromEnv = env && (env.SESSION_SECRET || env.GROK_SIGNING_SECRET || env.HMAC_SECRET || env.DEMIGOD_SECRET);
  if (typeof fromEnv === "string" && fromEnv.trim())
    return fromEnv.trim();
  return `${HOME_DESCRIPTION}|${OG_IMAGE}|demigod-grok`;
}
__name(grokSecret, "grokSecret");
__name2(grokSecret, "grokSecret");
__name22(grokSecret, "grokSecret");
__name222(grokSecret, "grokSecret");
async function grokHmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return grokB64url(new Uint8Array(sig));
}
__name(grokHmac, "grokHmac");
__name2(grokHmac, "grokHmac");
__name22(grokHmac, "grokHmac");
__name222(grokHmac, "grokHmac");
function sanitizeGrokName(value) {
  const raw = String(value || "").replace(/[^\w .'-]/g, "").trim();
  return raw.slice(0, 64);
}
__name(sanitizeGrokName, "sanitizeGrokName");
__name2(sanitizeGrokName, "sanitizeGrokName");
__name22(sanitizeGrokName, "sanitizeGrokName");
__name222(sanitizeGrokName, "sanitizeGrokName");
function grokCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
__name(grokCorsHeaders, "grokCorsHeaders");
__name2(grokCorsHeaders, "grokCorsHeaders");
__name22(grokCorsHeaders, "grokCorsHeaders");
__name222(grokCorsHeaders, "grokCorsHeaders");
function grokJson(body, status, extra = {}) {
  const headers = applyHtmlSecurity(new Headers());
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Demigod-Edge", extra.edge || "grok-auth");
  grokCorsHeaders(headers);
  if (extra.cookies)
    for (const cookie of extra.cookies)
      headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
__name(grokJson, "grokJson");
__name2(grokJson, "grokJson");
__name22(grokJson, "grokJson");
__name222(grokJson, "grokJson");
function grokCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || "/"}`, "SameSite=Lax"];
  if (opts.httpOnly)
    parts.push("HttpOnly");
  if (opts.secure !== false)
    parts.push("Secure");
  if (opts.maxAge != null)
    parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}
__name(grokCookie, "grokCookie");
__name2(grokCookie, "grokCookie");
__name22(grokCookie, "grokCookie");
__name222(grokCookie, "grokCookie");
async function grokSessionCookies(env, displayName) {
  const who = sanitizeGrokName(displayName) || "Grok Bot";
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const payload = `${who}|${exp}`;
  const sig = await grokHmac(grokSecret(env), payload);
  const session = `v1.${grokB64url(new TextEncoder().encode(payload))}.${sig}`;
  return [
    grokCookie("dg_grok", session, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 }),
    grokCookie("dg_grok_who", who, { httpOnly: false, path: "/grok", maxAge: 7 * 24 * 60 * 60 })
  ];
}
__name(grokSessionCookies, "grokSessionCookies");
__name2(grokSessionCookies, "grokSessionCookies");
__name22(grokSessionCookies, "grokSessionCookies");
__name222(grokSessionCookies, "grokSessionCookies");
async function grokAuth(request, url, env) {
  const path = String(url.pathname || "").replace(/\/+$/, "") || "/";
  if (request.method === "OPTIONS") {
    const headers = applyHtmlSecurity(new Headers());
    grokCorsHeaders(headers);
    headers.set("X-Demigod-Edge", "grok-auth");
    return new Response(null, { status: 204, headers });
  }
  const now = Date.now();
  const store = grokStore();
  pruneGrok(store, now);
  const ip = grokClientIp(request);
  if (path === "/auth/grok/start") {
    if (request.method !== "POST")
      return grokJson({ error: "method" }, 405, { edge: "grok-start" });
    if (!grokRateOk(store.starts, ip, 8, 3e5, now))
      return grokJson({ error: "rate" }, 429, { edge: "grok-start" });
    let code = grokRandomCode();
    while (store.codes.has(code))
      code = grokRandomCode();
    const startToken = grokRandomToken();
    store.codes.set(code, { startToken, exp: now + 3e5, claimed: false, displayName: "", sessionIssued: false });
    return grokJson({ code, expiresIn: 300 }, 200, {
      edge: "grok-start",
      cookies: [grokCookie("dg_grok_start", startToken, { httpOnly: true, maxAge: 300 })]
    });
  }
  if (path === "/auth/grok/status") {
    if (request.method !== "GET" && request.method !== "HEAD")
      return grokJson({ error: "method" }, 405, { edge: "grok-status" });
    const code = String(url.searchParams.get("code") || "").trim().toUpperCase();
    const row = store.codes.get(code);
    if (!row)
      return grokJson({ status: "unknown" }, 200, { edge: "grok-status" });
    if (row.exp <= now)
      return grokJson({ status: "expired" }, 200, { edge: "grok-status" });
    if (!row.claimed)
      return grokJson({ status: "pending" }, 200, { edge: "grok-status" });
    const token = grokReadCookie(request, "dg_grok_start");
    const cookies = [];
    if (token && token === row.startToken && !row.sessionIssued) {
      row.sessionIssued = true;
      cookies.push(...await grokSessionCookies(env, row.displayName));
    }
    const body = { status: "ok" };
    if (row.displayName)
      body.displayName = row.displayName;
    return grokJson(body, 200, { edge: "grok-status", cookies });
  }
  if (path === "/auth/grok/verify") {
    if (request.method !== "POST")
      return grokJson({ error: "method" }, 405, { edge: "grok-verify" });
    if (!grokRateOk(store.verifies, ip, 20, 3e5, now))
      return grokJson({ ok: false, error: "rate" }, 429, { edge: "grok-verify" });
    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const code = String(payload?.code || "").trim().toUpperCase();
    const row = store.codes.get(code);
    if (!row || row.exp <= now)
      return grokJson({ ok: false, error: "code" }, 400, { edge: "grok-verify" });
    if (row.claimed)
      return grokJson({ ok: false, error: "used" }, 409, { edge: "grok-verify" });
    row.claimed = true;
    row.displayName = sanitizeGrokName(payload?.displayName);
    return grokJson({ ok: true }, 200, { edge: "grok-verify" });
  }
  return grokJson({ error: "not_found" }, 404);
}
__name(grokAuth, "grokAuth");
__name2(grokAuth, "grokAuth");
__name22(grokAuth, "grokAuth");
__name222(grokAuth, "grokAuth");
function demigodGrokHtml() {
  const inner = motleyChrome(`<h1>Sign in with Grok Bot.</h1><p class="lede">Demigod is Grok Bot compatible.</p>${siwgButtonHtml("#siwg-pair")}<div id="siwg-pair" class="siwg-pair"></div><script>(function(){var box=document.getElementById("siwg-pair");if(!box)return;if(/(?:^|; )dg_grok_who=/.test(document.cookie)){box.textContent="Signed in.";return}function paint(code){box.replaceChildren();var c=document.createElement("p");c.className="siwg-code";c.textContent=code;var h=document.createElement("p");h.className="muted";h.textContent="sign me into trydemigod.com with "+code;box.appendChild(c);box.appendChild(h)}fetch("/auth/grok/start",{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(data){if(!data||!data.code){box.textContent="Try again.";return}paint(data.code);var n=0;var t=setInterval(function(){n+=1;if(n>90){clearInterval(t);return}fetch("/auth/grok/status?code="+encodeURIComponent(data.code),{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(j){if(!j||j.status!=="ok")return;clearInterval(t);box.textContent=j.displayName?"Signed in as "+j.displayName+".":"Signed in."}).catch(function(){})},2000)}).catch(function(){box.textContent="Try again."})})();<\/script>`);
  return demigodPage("Sign in with Grok Bot \xB7 Demigod", inner, {
    url: "https://www.trydemigod.com/grok",
    description: "Demigod is Grok Bot compatible."
  });
}
__name(demigodGrokHtml, "demigodGrokHtml");
__name2(demigodGrokHtml, "demigodGrokHtml");
__name22(demigodGrokHtml, "demigodGrokHtml");
__name222(demigodGrokHtml, "demigodGrokHtml");
async function grokEdge(request, url, env) {
  if (isGrokWellKnownPath(url.pathname)) {
    if (request.method === "OPTIONS") {
      const headers2 = applyHtmlSecurity(new Headers());
      grokCorsHeaders(headers2);
      headers2.set("X-Demigod-Edge", "grok-well-known");
      return new Response(null, { status: 204, headers: headers2 });
    }
    if (request.method !== "GET" && request.method !== "HEAD")
      return grokJson({ error: "method" }, 405, { edge: "grok-well-known" });
    const headers = applyHtmlSecurity(new Headers());
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Demigod-Edge", "grok-well-known");
    grokCorsHeaders(headers);
    return new Response(request.method === "HEAD" ? null : JSON.stringify(GROK_BOT_DOC), { status: 200, headers });
  }
  if (isGrokAuthPath(url.pathname))
    return grokAuth(request, url, env);
  if (isGrokPath(url.pathname)) {
    if (request.method !== "GET" && request.method !== "HEAD")
      return grokJson({ error: "method" }, 405, { edge: "grok-motley" });
    const { html, status, headers } = htmlResponse(demigodGrokHtml(), 200, "grok-motley");
    headers.set("Cache-Control", "private, no-store");
    return new Response(request.method === "HEAD" ? null : html, { status, headers });
  }
  return null;
}
__name(grokEdge, "grokEdge");
__name2(grokEdge, "grokEdge");
__name22(grokEdge, "grokEdge");
__name222(grokEdge, "grokEdge");
__name22(isAiTxtPath, "isAiTxtPath");
__name222(isAiTxtPath, "isAiTxtPath");
function wantsMarkdown(request) {
  const accept = String(request.headers.get("Accept") || "");
  return accept.includes("text/markdown") && !accept.includes("text/html");
}
__name(wantsMarkdown, "wantsMarkdown");
__name2(wantsMarkdown, "wantsMarkdown");
__name22(wantsMarkdown, "wantsMarkdown");
__name222(wantsMarkdown, "wantsMarkdown");
function textResponse(body, edge, type = "text/plain; charset=utf-8", extra = {}) {
  const headers = applyHtmlSecurity(new Headers());
  headers.set("Content-Type", type);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Demigod-Edge", edge);
  for (const [k, v] of Object.entries(extra))
    headers.set(k, v);
  return { body, headers };
}
__name(textResponse, "textResponse");
__name2(textResponse, "textResponse");
__name22(textResponse, "textResponse");
__name222(textResponse, "textResponse");
function demigodNotFoundHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Not found \xB7 Demigod</title><link rel="canonical" href="https://www.trydemigod.com/"><meta name="description" content="That room is not on the desk."></head><body><p>Not found.</p><p><a href="/">Demigod</a> \xB7 <a href="/contact">Contact</a></p></body></html>`;
}
__name(demigodNotFoundHtml, "demigodNotFoundHtml");
__name2(demigodNotFoundHtml, "demigodNotFoundHtml");
__name22(demigodNotFoundHtml, "demigodNotFoundHtml");
__name222(demigodNotFoundHtml, "demigodNotFoundHtml");
function stripNearestSection(html, needle) {
  const page = String(html || "");
  const at = page.toLowerCase().indexOf(String(needle).toLowerCase());
  if (at < 0)
    return page;
  const start = page.lastIndexOf("<section", at);
  if (start < 0)
    return page;
  const end = page.indexOf("</section>", at);
  if (end < 0)
    return page;
  return page.slice(0, start) + page.slice(end + "</section>".length);
}
__name(stripNearestSection, "stripNearestSection");
__name2(stripNearestSection, "stripNearestSection");
__name22(stripNearestSection, "stripNearestSection");
__name222(stripNearestSection, "stripNearestSection");
function stripDivBlock(html, startNeedle) {
  const page = String(html || "");
  const start = page.indexOf(startNeedle);
  if (start < 0)
    return page;
  let i = start + startNeedle.length;
  let depth = 1;
  while (i < page.length && depth > 0) {
    const open = page.indexOf("<div", i);
    const close = page.indexOf("</div>", i);
    if (close < 0)
      return page;
    if (open >= 0 && open < close) {
      depth += 1;
      i = open + 4;
    } else {
      depth -= 1;
      i = close + 6;
    }
  }
  return page.slice(0, start) + page.slice(i);
}
__name(stripDivBlock, "stripDivBlock");
__name2(stripDivBlock, "stripDivBlock");
__name22(stripDivBlock, "stripDivBlock");
__name222(stripDivBlock, "stripDivBlock");
function stripLeftoverTemplate(html) {
  let page = String(html || "");
  page = page.replace(/<li\b[^>]*>[\s\S]*?\+1\s*\(555\)\s*000-0000[\s\S]*?<\/li>/gi, "");
  page = page.replace(/<li\b[^>]*>[\s\S]*?101 Web Lane[\s\S]*?<\/li>/gi, "");
  page = page.replace(/\+1\s*\(555\)\s*000-0000/g, "");
  page = page.replace(/101 Web Lane(?:,\s*SF,\s*CA)?/gi, "");
  page = page.replace(/<div class="heading_primary margin-bottom_none">52K\+<\/div>/gi, "");
  page = page.replace(/<div class="text-color_muted">Happy customers<\/div>/gi, "");
  page = page.replace(/<div class="heading_primary margin-bottom_none">100%<\/div>\s*<div class="text-color_muted">Revenue increase<\/div>/gi, "");
  page = page.replace(/52K\+/g, "");
  page = page.replace(/Happy customers/gi, "");
  page = page.replace(/100%\s*Revenue increase/gi, "");
  page = stripNearestSection(page, "Your hiring team");
  page = stripNearestSection(page, "Meet the people behind the matches");
  page = page.replace(/<div class="author_name">(?:Jordan Avery|Morgan Ellis|Riley Chen|Taylor Kim|Morgan Lee|Jordan Patel|Taylor Quinn)<\/div>\s*<div class="author_info">[^<]*<\/div>/gi, "");
  for (const name of LEFTOVER_PEOPLE)
    page = page.replaceAll(name, "");
  page = page.replace(/Contact Demigod to post an AI role[^"]*/gi, "Email potter@trydemigod.com");
  page = page.replace(/Post an AI role[^"]*/gi, "Email potter@trydemigod.com");
  page = page.replace(/post an AI role/gi, "");
  page = page.replace(/<div class="paragraph_large margin-bottom_none">Can I cancel my plan anytime\?<\/div>/gi, "");
  page = page.replace(/Can I cancel my plan anytime\?/g, "");
  page = page.replace(/Yes, cancel anytime in your account\.[^<]*/g, "");
  page = page.replace(/<form\b(?=[^>]*method=["']get["'])(?![^>]*\baction=["'][^"']+["'])[^>]*>[\s\S]*?<\/form>/gi, "");
  if (page.includes('<div class="roles-header">'))
    page = stripDivBlock(page, '<div class="roles-header">');
  if (page.includes('<div class="roles-grid">'))
    page = stripDivBlock(page, '<div class="roles-grid">');
  page = page.replace(/SAMPLE ROLES/g, "");
  page = page.replace(/fileuploaded\.jpg/g, "");
  page = page.replace(
    /<a\b([^>]*\bhref=["'][^"']*["'][^>]*)>((?:(?!<a\b)[\s\S])*?HIRE TALENT(?:(?!<a\b)[\s\S])*?)<\/a>/gi,
    (full, attrs, inner) => {
      let a = attrs;
      if (/\bhref=["']#/i.test(a) || /startup-modal/i.test(a))
        a = a.replace(/\bhref=["'][^"']*["']/i, 'href="/?wiz=startup"');
      const body = String(inner || "").replace(/HIRE TALENT/gi, "Start a brief");
      return `<a${a}>${body}</a>`;
    }
  );
  page = page.replace(/>HIRE TALENT</gi, ">Start a brief<");
  page = page.replace(/TECH-MATCHED SF STARTUP TALENT/gi, "Better candidates");
  page = page.replace(/Tech-matched SF startup talent/gi, "Better candidates");
  return page;
}
__name(stripLeftoverTemplate, "stripLeftoverTemplate");
__name2(stripLeftoverTemplate, "stripLeftoverTemplate");
__name22(stripLeftoverTemplate, "stripLeftoverTemplate");
__name222(stripLeftoverTemplate, "stripLeftoverTemplate");
function conversionCtaLabel(inner) {
  return String(inner || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
__name(conversionCtaLabel, "conversionCtaLabel");
__name2(conversionCtaLabel, "conversionCtaLabel");
__name22(conversionCtaLabel, "conversionCtaLabel");
__name222(conversionCtaLabel, "conversionCtaLabel");
function rewriteDeadConversionCtas(html) {
  return String(html || "").replace(
    /<a\b([^>]*\bhref=["']#["'][^>]*)>((?:(?!<a\b)[\s\S])*?)<\/a>/gi,
    (full, attrs, inner) => {
      const label = conversionCtaLabel(inner);
      const classes = String(attrs || "");
      let dest = "";
      if (/^get started$/i.test(label))
        dest = "/?wiz=startup";
      else if (/^contact(?: support)?$/i.test(label))
        dest = "/contact";
      else if (/^pricing$/i.test(label) && /\bfooter_link\b/i.test(classes))
        dest = "/pricing";
      if (!dest)
        return full;
      return `<a${String(attrs || "").replace(/\bhref=["']#["']/i, `href="${dest}"`)}>${inner}</a>`;
    }
  );
}
__name(rewriteDeadConversionCtas, "rewriteDeadConversionCtas");
__name2(rewriteDeadConversionCtas, "rewriteDeadConversionCtas");
__name22(rewriteDeadConversionCtas, "rewriteDeadConversionCtas");
__name222(rewriteDeadConversionCtas, "rewriteDeadConversionCtas");
function shieldHomeFirstPaint(html) {
  return String(html || "").replace(/<html\b([^>]*)>/i, (tag, attrs) => {
    if (/\bclass=["'][^"']*\bdg-route-boot\b/.test(attrs))
      return tag;
    if (/\bclass=["']/.test(attrs)) {
      return tag.replace(/\bclass=(["'])([^"']*)\1/, (m, q, c) => `class=${q}${c} dg-route-boot${q}`);
    }
    return `<html class="dg-route-boot"${attrs}>`;
  });
}
__name(shieldHomeFirstPaint, "shieldHomeFirstPaint");
__name2(shieldHomeFirstPaint, "shieldHomeFirstPaint");
__name22(shieldHomeFirstPaint, "shieldHomeFirstPaint");
__name222(shieldHomeFirstPaint, "shieldHomeFirstPaint");
function wizardKind(url) {
  const w = String(url?.searchParams?.get("wiz") || url?.searchParams?.get("hire") || url?.searchParams?.get("modal") || "").toLowerCase();
  if (/^(startup|founder|hire|brief|company)$/.test(w))
    return "startup";
  if (/^(engineer|talent|join|jobseeker|candidate|profile)$/.test(w))
    return "engineer";
  return "";
}
__name(wizardKind, "wizardKind");
__name2(wizardKind, "wizardKind");
__name22(wizardKind, "wizardKind");
__name222(wizardKind, "wizardKind");
function stripLeftoverSeo(html) {
  const honest = "10% of first-year base after a verified start. Stripe-hosted invoice to the hiring company. Talent pays nothing.";
  let page = String(html || "");
  page = page.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"Blog"[\s\S]*?<\/script>/gi, "");
  page = page.replace(/<script\b[^>]*id=["']dg-blog-canonical["'][^>]*>[\s\S]*?<\/script>/gi, "");
  page = page.replace(/(content=["'])([^"']*first-year[^"']*)(["'])/gi, `$1${honest}$3`);
  page = page.replace(/10% of first-year base salary on hire\. Talent free\./g, honest);
  page = page.replace(/10% of first-year base salary only when a hire starts/g, "10% of first-year base after a verified start");
  return page;
}
__name(stripLeftoverSeo, "stripLeftoverSeo");
__name2(stripLeftoverSeo, "stripLeftoverSeo");
__name22(stripLeftoverSeo, "stripLeftoverSeo");
__name222(stripLeftoverSeo, "stripLeftoverSeo");
function escapeJs(value) {
  return JSON.stringify(String(value ?? "")).replace(/[<>&\u2028\u2029]/g, (ch) => ({
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  })[ch]);
}
__name(escapeJs, "escapeJs");
__name2(escapeJs, "escapeJs");
__name22(escapeJs, "escapeJs");
__name222(escapeJs, "escapeJs");
function sanitizeBriefCompanyId(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 64)
    return "";
  return /^[A-Za-z0-9][A-Za-z0-9:._-]{0,63}$/.test(s) ? s : "";
}
__name(sanitizeBriefCompanyId, "sanitizeBriefCompanyId");
__name2(sanitizeBriefCompanyId, "sanitizeBriefCompanyId");
__name22(sanitizeBriefCompanyId, "sanitizeBriefCompanyId");
__name222(sanitizeBriefCompanyId, "sanitizeBriefCompanyId");
function sanitizeBriefCompanyName(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 80)
    return "";
  return /^[A-Za-z0-9 .,&'+()/-]{1,80}$/.test(s) ? s : "";
}
__name(sanitizeBriefCompanyName, "sanitizeBriefCompanyName");
__name2(sanitizeBriefCompanyName, "sanitizeBriefCompanyName");
__name22(sanitizeBriefCompanyName, "sanitizeBriefCompanyName");
__name222(sanitizeBriefCompanyName, "sanitizeBriefCompanyName");
function sanitizeBriefRole(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 120)
    return "";
  if (/[<>\u0000-\u001F\u007F]/.test(s))
    return "";
  return s;
}
__name(sanitizeBriefRole, "sanitizeBriefRole");
__name2(sanitizeBriefRole, "sanitizeBriefRole");
__name22(sanitizeBriefRole, "sanitizeBriefRole");
__name222(sanitizeBriefRole, "sanitizeBriefRole");
function briefCompanyFromUrl(url) {
  const id = sanitizeBriefCompanyId(url?.searchParams?.get("company"));
  const name = sanitizeBriefCompanyName(url?.searchParams?.get("name"));
  const role = sanitizeBriefRole(url?.searchParams?.get("role"));
  if (!id && !name && !role)
    return null;
  return { id, name, role };
}
__name(briefCompanyFromUrl, "briefCompanyFromUrl");
__name2(briefCompanyFromUrl, "briefCompanyFromUrl");
__name22(briefCompanyFromUrl, "briefCompanyFromUrl");
__name222(briefCompanyFromUrl, "briefCompanyFromUrl");
async function resolveStartupBrief(url) {
  const brief = briefCompanyFromUrl(url);
  if (!brief)
    return null;
  if (brief.role && (brief.name || !brief.id))
    return brief;
  if (!brief.id)
    return brief;
  const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
  const company = findMapCompany(map, brief.id);
  if (!company)
    return brief;
  const name = brief.name || sanitizeBriefCompanyName(company.name);
  const role = brief.role;
  return { ...brief, name, role };
}
__name(resolveStartupBrief, "resolveStartupBrief");
__name2(resolveStartupBrief, "resolveStartupBrief");
__name22(resolveStartupBrief, "resolveStartupBrief");
__name222(resolveStartupBrief, "resolveStartupBrief");
function applyBriefCompanyQuery(dest, url) {
  const brief = briefCompanyFromUrl(url);
  if (!brief)
    return dest;
  if (brief.id)
    dest.searchParams.set("company", brief.id);
  if (brief.name)
    dest.searchParams.set("name", brief.name);
  if (brief.role)
    dest.searchParams.set("role", brief.role);
  return dest;
}
__name(applyBriefCompanyQuery, "applyBriefCompanyQuery");
__name2(applyBriefCompanyQuery, "applyBriefCompanyQuery");
__name22(applyBriefCompanyQuery, "applyBriefCompanyQuery");
__name222(applyBriefCompanyQuery, "applyBriefCompanyQuery");
function namedBriefHref(map, url) {
  const q = url ? briefCompanyFromUrl(url) : null;
  const lockedId = q?.id || "";
  const lockedName = q?.name || "";
  const roleOverride = q?.role || "";
  let company = null;
  if (lockedId)
    company = findMapCompany(map, lockedId);
  else if (!lockedName)
    company = homePacketCompany(map);
  const id = sanitizeBriefCompanyId(lockedId || company?.id);
  const name = sanitizeBriefCompanyName(lockedName || company?.name);
  const role = roleOverride;
  const usp = new URLSearchParams({ wiz: "startup" });
  if (id)
    usp.set("company", id);
  if (name)
    usp.set("name", name);
  if (role)
    usp.set("role", role);
  if (!id && !name && !role)
    return "/?wiz=startup";
  return `/?${usp.toString()}`;
}
__name(namedBriefHref, "namedBriefHref");
__name2(namedBriefHref, "namedBriefHref");
__name22(namedBriefHref, "namedBriefHref");
__name222(namedBriefHref, "namedBriefHref");
function paintHireMotley(html, brief) {
  let page = String(html || "");
  page = stripLeftoverSeo(page);
  page = page.replace(/<title>[^<]*<\/title>/i, "<title>Demigod</title>");
  page = page.replace(/HIRE SF STARTUP TALENT/gi, "Start a brief");
  page = page.replace(/GET MATCHED TO SF STARTUPS/gi, "Join the network");
  page = page.replace(/>STARTUP HIRING FORM</gi, ">A brief<");
  page = page.replace(/>CANDIDATE APPLICATION</gi, ">A profile<");
  page = page.replace(/>HIRE TALENT</gi, ">Start a brief<");
  page = page.replace(/TECH-MATCHED SF STARTUP TALENT/gi, "Better candidates");
  page = page.replace(/Tech-matched SF startup talent · Startups hire · Candidates join/gi, "10% of first-year base after a verified start \xB7 Startups hire \xB7 Candidates join");
  page = page.replace(/Tech-matched SF startup talent/gi, "Better candidates");
  page = page.replace(/aria-label=["']Hire talent — open startup hiring brief["']/gi, 'aria-label="Start a brief \u2014 open startup hiring brief"');
  page = page.replace(/\[\/HIRE SF STARTUP TALENT\/gi,'Hire talent'\]/g, "[/HIRE SF STARTUP TALENT/gi,'Start a brief']");
  page = page.replace(/\[\/GET MATCHED TO SF STARTUPS\/gi,"Share privately"\]/g, '[/GET MATCHED TO SF STARTUPS/gi,"Join the network"]');
  page = page.replaceAll("el.textContent='Hire talent'", "el.textContent='Start a brief'");
  page = page.replaceAll("el.textContent='Share privately'", "el.textContent='Join the network'");
  page = page.replaceAll('el.textContent="Share privately"', 'el.textContent="Join the network"');
  page = page.replaceAll("[/Start a brief/gi,'Hire talent']", "[/Start a brief/gi,'Start a brief']");
  page = page.replaceAll('[/Join the network/gi,"Share privately"]', '[/Join the network/gi,"Join the network"]');
  page = page.replace(
    /<noscript id="dg-path-noscript">[\s\S]*?<\/noscript>/i,
    '<noscript id="dg-path-noscript"><p>A person picks better candidates. <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></p></noscript>'
  );
  const css = '<style id="dg-hire-motley">:root{--g:#D3A093!important;--gl:#E4DED2!important;--cr:#E4DED2!important;--dk:#0B120F!important;--mu:#8a8378!important;--card:#0B120F!important;--dg-night:#0B120F!important;--dg-phosphor:#E4DED2!important;--dg-signal:#D3A093!important;--dg-paper:#E4DED2!important;--dg-paper-mute:#8a8378!important}html.dg-route-boot::before{background:#0B120F!important;color:#E4DED2!important;font-family:Georgia,serif!important;font-weight:400!important;letter-spacing:0!important}html,body,#dg-page{background:#0B120F!important;color:#E4DED2!important}.hero-section,.hero-grid-background,.hero-content-left,.hero-content-right,.hero-actions,.statue-wrapper,.statue-frame,.statue-border-gold,.statue-svg,#dg-nav-directory,#dg-bar,[data-dg-page="sample"],[data-dg-page="legal"],[data-dg-page="faq"],[data-dg-page="bounties"]{display:none!important}.modal-overlay{background:rgba(11,18,15,.92)!important}.modal-container{background:#EFE9DD!important;color:#23211D!important;border-radius:0!important}.modal-title{color:#23211D!important}.modal-subtitle,.modal-intro,.modal-label{color:#4a463f!important}.modal-close-btn{color:#23211D!important}.dg-p-actions a,a.hire,a.talent,.button,.w-button,.modal-submit-btn{border-radius:0!important}</style>';
  const companyId = sanitizeBriefCompanyId(brief?.id);
  const companyName = sanitizeBriefCompanyName(brief?.name);
  const roleTitle = sanitizeBriefRole(brief?.role);
  const titleText = companyName ? roleTitle ? `Start a brief \xB7 ${companyName} \xB7 ${roleTitle}` : `Start a brief \xB7 ${companyName}` : roleTitle ? `Start a brief \xB7 ${roleTitle}` : "Start a brief";
  const introText = companyName ? `The role, the constraints, the comp. For ${companyName}.` : "The role, the constraints, the comp.";
  const js = `<script id="dg-hire-titles">(function(){var companyId=${escapeJs(companyId)};var companyName=${escapeJs(companyName)};var roleTitle=${escapeJs(roleTitle)};function fillCompany(){var form=document.getElementById("startup-form")||document.querySelector("#startup-hire form");if(!form)return;form.querySelectorAll("input,textarea,select").forEach(function(el){var key=((el.name||"")+" "+(el.id||"")+" "+(el.getAttribute("data-name")||"")).toLowerCase();if(!/company/.test(key)||/email|partner/.test(key))return;if(/id/.test(key)&&companyId)el.value=companyId;else if(companyName)el.value=companyName;else if(companyId)el.value=companyId});if(companyId&&!form.querySelector('[name="company"],#dg-brief-company-id')){var h=document.createElement("input");h.type="hidden";h.name="company";h.id="dg-brief-company-id";h.value=companyId;form.appendChild(h)}}function fillRole(){if(!roleTitle)return;var form=document.getElementById("startup-form")||document.querySelector("#startup-hire form");if(!form)return;form.querySelectorAll("input,textarea,select").forEach(function(el){var key=((el.name||"")+" "+(el.id||"")+" "+(el.getAttribute("data-name")||"")).toLowerCase();if(/role[-_ ]?title/.test(key)||(/stack/.test(key)&&!/needs/.test(key)))el.value=roleTitle})}function p(){document.querySelectorAll(".modal-title").forEach(function(el){var t=el.textContent||"";if(/HIRE|STARTUP TALENT/i.test(t)||/^Start a brief/i.test(t))el.textContent=${escapeJs(titleText)};if(/GET MATCHED|Share privately/i.test(t))el.textContent="Join the network"});document.querySelectorAll(".modal-subtitle").forEach(function(el){if(/HIRING FORM/i.test(el.textContent||""))el.textContent="A brief";if(/CANDIDATE/i.test(el.textContent||""))el.textContent="A profile"});document.querySelectorAll(".modal-intro").forEach(function(el){var t=el.textContent||"";if(/curated SF candidates/i.test(t)||/the constraints, the comp/i.test(t))el.textContent=${escapeJs(introText)};if(/profile/i.test(t)&&/startup/i.test(t))el.textContent="One profile. You hear when a company has already said yes."});document.querySelectorAll(".btn-label,.button_label").forEach(function(el){var t=(el.textContent||"").trim();if(/^HIRE TALENT$/i.test(t))el.textContent="Start a brief";if(/^(JOIN NETWORK|GET MATCHED)$/i.test(t))el.textContent="Join the network"});if(companyId||companyName)fillCompany();if(roleTitle)fillRole()}p();document.addEventListener("DOMContentLoaded",p);setTimeout(p,400);setTimeout(p,1400);document.querySelectorAll(".modal-close-btn").forEach(function(el){if(el.dataset.dgHome)return;el.dataset.dgHome="1";el.addEventListener("click",function(e){e.preventDefault();location.href="/"})})})();<\/script>`;
  page = page.replace(/<link\b(?![^>]*id=["']dg-home-canon["'])[^>]*rel=["']?canonical["']?[^>]*>/gi, "");
  if (!/name=["']robots["']/.test(page)) {
    page = page.includes("</head>") ? page.replace("</head>", '<meta name="robots" content="noindex,follow"></head>') : page;
  } else {
    page = page.replace(/name=["']robots["'] content=["'][^"']*["']/, 'name="robots" content="noindex,follow"');
  }
  if (!page.includes('id="dg-home-canon"') && page.includes("</head>")) {
    page = page.replace("</head>", '<link id="dg-home-canon" rel="canonical" href="https://www.trydemigod.com/"></head>');
  }
  if (!page.includes('id="dg-hire-motley"')) {
    page = page.includes("</head>") ? page.replace("</head>", `${css}</head>`) : `${css}${page}`;
  }
  if (!page.includes('id="dg-hire-titles"')) {
    page = page.includes("</body>") ? page.replace("</body>", `${js}</body>`) : `${page}${js}`;
  }
  return page;
}
__name(paintHireMotley, "paintHireMotley");
__name2(paintHireMotley, "paintHireMotley");
__name22(paintHireMotley, "paintHireMotley");
__name222(paintHireMotley, "paintHireMotley");
function hideDeadEventsList(html) {
  let page = String(html || "");
  const note = '<p id="dg-events-static">No events listed this week.</p>';
  const inject = '<script id="dg-events-dead-tunnel">try{window.DG_EVENTS_BOT_API="";window.__dgEvBotExtraBases=[];var _f=window.fetch;window.fetch=function(u,o){if(String(u||"").indexOf("events-api-latest.json")!==-1)return Promise.resolve(new Response(JSON.stringify({apiBase:"",publishedAt:new Date().toISOString()}),{headers:{"Content-Type":"application/json"}}));return _f.apply(this,arguments)};}catch(e){}<\/script>';
  if (!page.includes('id="dg-events-dead-tunnel"')) {
    page = page.replace(/(<script[^>]+foot-latest\.js)/i, `${inject}$1`);
  }
  if (!page.includes('id="dg-events-static"')) {
    page = page.replace(/<body([^>]*)>/i, `<body$1>${note}`);
  }
  return page;
}
__name(hideDeadEventsList, "hideDeadEventsList");
__name2(hideDeadEventsList, "hideDeadEventsList");
__name22(hideDeadEventsList, "hideDeadEventsList");
__name222(hideDeadEventsList, "hideDeadEventsList");
var SITEMAP_KEEP = /* @__PURE__ */ new Set(["/", "/contact", "/companies", "/weekly", "/packets", "/journal", "/peers", "/memo", "/ticket", "/legal", "/grok", "/comp/founding-engineer-sf", "/hardware", "/hardware/directory", "/hardware/signals", "/hardware/guides/prototyping", "/hardware/guides/certification", "/hardware/guides/contract-manufacturers", "/hardware/guides/community", "/hardware/guides/fundraising"]);
function rewriteSitemap(xml) {
  const seen = /* @__PURE__ */ new Set();
  const kept = [];
  const src = String(xml || "");
  for (const match of src.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    let path = "/";
    try {
      path = new URL(match[1].trim()).pathname.replace(/\/+$/, "") || "/";
    } catch {
      continue;
    }
    if (!SITEMAP_KEEP.has(path) || seen.has(path))
      continue;
    seen.add(path);
    kept.push(`    <url>
        <loc>https://www.trydemigod.com${path === "/" ? "" : path}</loc>
        <lastmod>${LIVE_MAP_DATE}</lastmod>
    </url>`);
  }
  for (const path of ["/", "/contact", "/companies", "/weekly", "/packets", "/journal", "/peers", "/memo", "/ticket", "/legal", "/grok", "/comp/founding-engineer-sf", "/hardware", "/hardware/directory", "/hardware/signals", "/hardware/guides/prototyping", "/hardware/guides/certification", "/hardware/guides/contract-manufacturers", "/hardware/guides/community", "/hardware/guides/fundraising"]) {
    if (seen.has(path))
      continue;
    seen.add(path);
    kept.push(`    <url>
        <loc>https://www.trydemigod.com${path === "/" ? "" : path}</loc>
        <lastmod>${LIVE_MAP_DATE}</lastmod>
    </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${kept.join("\n")}
</urlset>
`;
}
__name(rewriteSitemap, "rewriteSitemap");
__name2(rewriteSitemap, "rewriteSitemap");
__name22(rewriteSitemap, "rewriteSitemap");
__name222(rewriteSitemap, "rewriteSitemap");
var ROBOTS_TXT = `User-agent: Amazonbot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: CCBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GPTBot
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: *
Allow: /

Sitemap: https://www.trydemigod.com/sitemap.xml
# https://www.trydemigod.com/llms.txt
`;
function normalizeBountiesFeed(raw) {
  const listings = Array.isArray(raw?.listings) ? raw.listings.filter((row) => row && typeof row === "object").map((row) => {
    const dest = honestPayTo(row.payTo);
    return dest ? { ...row, payTo: dest } : { ...row, payTo: null, payoutStatus: "not_implemented" };
  }) : [];
  return {
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "demigod bounties",
    schema: FEED_SCHEMA,
    note: FEED_NOTE,
    url: typeof raw?.url === "string" && raw.url.trim() ? raw.url.trim() : FEED_PAGE,
    listings
  };
}
__name(normalizeBountiesFeed, "normalizeBountiesFeed");
__name2(normalizeBountiesFeed, "normalizeBountiesFeed");
__name22(normalizeBountiesFeed, "normalizeBountiesFeed");
__name222(normalizeBountiesFeed, "normalizeBountiesFeed");
function listingTitle(row) {
  const name = typeof row?.name === "string" ? row.name.trim() : "";
  const title = typeof row?.title === "string" ? row.title.trim() : "";
  return name || title;
}
__name(listingTitle, "listingTitle");
__name2(listingTitle, "listingTitle");
__name22(listingTitle, "listingTitle");
__name222(listingTitle, "listingTitle");
function bountyItemHref(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw)
    return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
}
__name(bountyItemHref, "bountyItemHref");
__name2(bountyItemHref, "bountyItemHref");
__name22(bountyItemHref, "bountyItemHref");
__name222(bountyItemHref, "bountyItemHref");
function bountiesBoardHtml(feed) {
  const data = normalizeBountiesFeed(feed);
  const rows = data.listings.length ? `<ul>${data.listings.map((row) => {
    const name = escapeHtml(listingTitle(row));
    const href = bountyItemHref(row.itemUrl);
    const title = href ? `<a href="${escapeHtml(href)}">${name}</a>` : name;
    const amount = row.amount == null || row.amount === "" ? "" : String(row.amount);
    const currency = typeof row.currency === "string" ? row.currency.trim() : "";
    const label = escapeHtml([amount, currency].filter(Boolean).join(" "));
    const dest = honestPayTo(row.payTo);
    const destHtml = dest && row.payoutStatus !== "not_implemented" ? `<p>${escapeHtml(dest)}</p>` : "";
    return `<li><p>${title}</p><p class="amt">${label}</p>${destHtml}</li>`;
  }).join("")}</ul>` : "<p>No bounties listed</p>";
  return `<section id="demigod-bounties" aria-label="Bounties"><style>#demigod-bounties{box-sizing:border-box;margin:0;padding:1.25rem;background:#03140d;color:#f3f0e7;font:16px/1.45 system-ui,sans-serif}#demigod-bounties a{color:#10c674}#demigod-bounties .amt{color:#bdc9bf}#demigod-bounties ul{list-style:none;margin:0;padding:0}#demigod-bounties li{border-top:1px solid rgba(189,201,191,.28);padding:.75rem 0}#demigod-bounties li:first-child{border-top:0}</style>${rows}</section>`;
}
__name(bountiesBoardHtml, "bountiesBoardHtml");
__name2(bountiesBoardHtml, "bountiesBoardHtml");
__name22(bountiesBoardHtml, "bountiesBoardHtml");
__name222(bountiesBoardHtml, "bountiesBoardHtml");
function injectBountiesBoard(html, feed) {
  const page = String(html || "");
  const board = bountiesBoardHtml(feed);
  const embed = page.match(/<div\b[^>]*\bclass=["'][^"']*\bw-embed\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  if (embed) {
    const at = page.indexOf(embed[0]) + embed[0].length;
    return page.slice(0, at) + board + page.slice(at);
  }
  const scriptAt = page.search(/<script\b[^>]*(?:jquery|webflow\.js)/i);
  if (scriptAt >= 0)
    return page.slice(0, scriptAt) + board + page.slice(scriptAt);
  const close = page.search(/<\/(?:body|html)>/i);
  return close >= 0 ? page.slice(0, close) + board + page.slice(close) : page + board;
}
__name(injectBountiesBoard, "injectBountiesBoard");
__name2(injectBountiesBoard, "injectBountiesBoard");
__name22(injectBountiesBoard, "injectBountiesBoard");
__name222(injectBountiesBoard, "injectBountiesBoard");
async function readBountiesSource(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5e3)
  });
  if (!res.ok)
    return null;
  const raw = await res.json().catch(() => null);
  if (!raw || typeof raw !== "object")
    return null;
  if (raw.schema !== FEED_SCHEMA)
    return null;
  return normalizeBountiesFeed(raw);
}
__name(readBountiesSource, "readBountiesSource");
__name2(readBountiesSource, "readBountiesSource");
__name22(readBountiesSource, "readBountiesSource");
__name222(readBountiesSource, "readBountiesSource");
async function loadBountiesFeed() {
  for (const src of FEED_SOURCES) {
    try {
      const feed = await readBountiesSource(src);
      if (feed)
        return feed;
    } catch {
    }
  }
  return normalizeBountiesFeed(PINNED_BOUNTIES_FEED);
}
__name(loadBountiesFeed, "loadBountiesFeed");
__name2(loadBountiesFeed, "loadBountiesFeed");
__name22(loadBountiesFeed, "loadBountiesFeed");
__name222(loadBountiesFeed, "loadBountiesFeed");
function bountiesCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
__name(bountiesCorsHeaders, "bountiesCorsHeaders");
__name2(bountiesCorsHeaders, "bountiesCorsHeaders");
__name22(bountiesCorsHeaders, "bountiesCorsHeaders");
__name222(bountiesCorsHeaders, "bountiesCorsHeaders");
async function bountiesJsonEdge(request, url) {
  if (!isBountiesJsonPath(url.pathname))
    return null;
  if (request.method === "OPTIONS") {
    const headers2 = applyHtmlSecurity(new Headers());
    bountiesCorsHeaders(headers2);
    headers2.set("X-Demigod-Edge", "bounties-json");
    return new Response(null, { status: 204, headers: headers2 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    const headers2 = applyHtmlSecurity(new Headers());
    bountiesCorsHeaders(headers2);
    headers2.set("Content-Type", "application/json; charset=utf-8");
    headers2.set("X-Demigod-Edge", "bounties-json");
    return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: headers2 });
  }
  const feed = await loadBountiesFeed();
  const headers = applyHtmlSecurity(new Headers());
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("X-Demigod-Edge", "bounties-json");
  bountiesCorsHeaders(headers);
  return new Response(request.method === "HEAD" ? null : JSON.stringify(feed), { status: 200, headers });
}
__name(bountiesJsonEdge, "bountiesJsonEdge");
__name2(bountiesJsonEdge, "bountiesJsonEdge");
__name22(bountiesJsonEdge, "bountiesJsonEdge");
__name222(bountiesJsonEdge, "bountiesJsonEdge");
function cdnJsonUrl(file) {
  const pin = file === "sf-startup-map.json" || file === "roles-feed.json" ? LIVE_MAP_PIN : CDN_PIN_TO;
  return `https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@${pin}/${file}`;
}
__name(cdnJsonUrl, "cdnJsonUrl");
__name2(cdnJsonUrl, "cdnJsonUrl");
__name22(cdnJsonUrl, "cdnJsonUrl");
__name222(cdnJsonUrl, "cdnJsonUrl");
async function loadCdnJson(file) {
  const res = await fetch(cdnJsonUrl(file), {
    method: "GET",
    headers: { Accept: "application/json" },
    cf: { cacheTtl: CDN_JSON_TTL, cacheEverything: true },
    signal: AbortSignal.timeout(8e3)
  });
  if (!res.ok)
    return null;
  const raw = await res.json().catch(() => null);
  return raw && typeof raw === "object" ? raw : null;
}
__name(loadCdnJson, "loadCdnJson");
__name2(loadCdnJson, "loadCdnJson");
__name22(loadCdnJson, "loadCdnJson");
__name222(loadCdnJson, "loadCdnJson");
function demigodPage(title, body, meta = {}) {
  const desc = typeof meta.description === "string" ? meta.description : "";
  const url = typeof meta.url === "string" && meta.url ? meta.url : "";
  const descTag = desc ? `<meta name="description" content="${escapeHtml(desc)}">` : "";
  const canon = url ? `<link rel="canonical" href="${escapeHtml(url)}">` : "";
  const og = url ? `<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:url" content="${escapeHtml(url)}">${desc ? `<meta property="og:description" content="${escapeHtml(desc)}">` : ""}<meta property="og:image" content="${OG_IMAGE}"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="720"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">` : "";
  const ld = meta.jsonLd ? `<script type="application/ld+json">${meta.jsonLd}<\/script>` : "";
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IM+Fell+English&family=Hanken+Grotesk:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B120F"><title>${escapeHtml(title)}</title>${canon}${descTag}${og}${ld}${fonts}<style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}
__name(demigodPage, "demigodPage");
__name2(demigodPage, "demigodPage");
__name22(demigodPage, "demigodPage");
__name222(demigodPage, "demigodPage");
function motleyChrome(inner, opts = {}) {
  const rooms = '<a href="/weekly">Weekly</a> \xB7 <a href="/packets">Packets</a> \xB7 <a href="/journal">Journal</a> \xB7 <a href="/peers">Peers</a> \xB7 <a href="/memo">Memo</a> \xB7 <a href="/ticket">Ticket</a> \xB7 <a href="/contact">Contact</a>';
  const nav = opts.packet ? `<a href="/companies">Companies</a> \xB7 ${rooms}` : rooms;
  const mastHref = opts.mastHref === "/weekly" ? "/weekly" : "/companies";
  return `<div class="grain grain-dark" aria-hidden="true"></div><div class="wrap"><header class="mast"><a href="${mastHref}">SF BAY AREA</a><a class="word" href="/">Demigod</a><span>EST. 2025</span></header><nav class="quiet">${nav}</nav>${inner}</div>`;
}
__name(motleyChrome, "motleyChrome");
__name2(motleyChrome, "motleyChrome");
__name22(motleyChrome, "motleyChrome");
__name222(motleyChrome, "motleyChrome");
function factsFooter(asOf) {
  const when = asOf ? `Snapshot as of ${escapeHtml(asOf)}. ` : "";
  return `<footer class="foot"><p class="honesty">${when}Public company facts. Not matching inventory. Not a recommendation.</p><p class="honesty"><a href="/room">Project Room</a> \xB7 <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></p></footer>`;
}
__name(factsFooter, "factsFooter");
__name2(factsFooter, "factsFooter");
__name22(factsFooter, "factsFooter");
__name222(factsFooter, "factsFooter");
function mapRows(map) {
  return Array.isArray(map?.companies) ? map.companies.filter((row) => row && typeof row === "object") : [];
}
__name(mapRows, "mapRows");
__name2(mapRows, "mapRows");
__name22(mapRows, "mapRows");
__name222(mapRows, "mapRows");
function findMapCompany(map, id) {
  const want = String(id || "");
  return want ? mapRows(map).find((row) => row.id === want) || null : null;
}
__name(findMapCompany, "findMapCompany");
__name2(findMapCompany, "findMapCompany");
__name22(findMapCompany, "findMapCompany");
__name222(findMapCompany, "findMapCompany");
function snapshotDay(map) {
  const coverage = typeof map?.coverage?.openRolesAt === "string" ? map.coverage.openRolesAt.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(coverage))
    return coverage;
  const raw = typeof map?.generatedAt === "string" ? map.generatedAt.trim() : "";
  if (!raw)
    return "";
  try {
    const pt = new Date(raw).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    if (/^\d{4}-\d{2}-\d{2}$/.test(pt))
      return pt;
  } catch {
  }
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : raw;
}
__name(snapshotDay, "snapshotDay");
__name2(snapshotDay, "snapshotDay");
__name22(snapshotDay, "snapshotDay");
__name222(snapshotDay, "snapshotDay");
function openRoleCount(company) {
  const n = Number(company?.openRoles);
  return Number.isFinite(n) ? n : null;
}
__name(openRoleCount, "openRoleCount");
__name2(openRoleCount, "openRoleCount");
__name22(openRoleCount, "openRoleCount");
__name222(openRoleCount, "openRoleCount");
function isHiringCompany(company) {
  const flag = String(company?.hiring || "").toLowerCase();
  if (flag === "yes" || flag === "true" || flag === "1")
    return true;
  return openRoleCount(company) > 0;
}
__name(isHiringCompany, "isHiringCompany");
__name2(isHiringCompany, "isHiringCompany");
__name22(isHiringCompany, "isHiringCompany");
__name222(isHiringCompany, "isHiringCompany");
function roleMixKeys(company) {
  const mix = company?.roleMix;
  if (!mix || typeof mix !== "object" || Array.isArray(mix))
    return [];
  return Object.keys(mix).filter(Boolean);
}
__name(roleMixKeys, "roleMixKeys");
__name2(roleMixKeys, "roleMixKeys");
__name22(roleMixKeys, "roleMixKeys");
__name222(roleMixKeys, "roleMixKeys");
function httpUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw)
    return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}
__name(httpUrl, "httpUrl");
__name2(httpUrl, "httpUrl");
__name22(httpUrl, "httpUrl");
__name222(httpUrl, "httpUrl");
function httpsHref(value) {
  const href = httpUrl(value);
  return href.startsWith("https:") ? href : "";
}
__name(httpsHref, "httpsHref");
__name2(httpsHref, "httpsHref");
__name22(httpsHref, "httpsHref");
__name222(httpsHref, "httpsHref");
function websiteDomain(value) {
  const href = httpUrl(value);
  if (!href)
    return "";
  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
__name(websiteDomain, "websiteDomain");
__name2(websiteDomain, "websiteDomain");
__name22(websiteDomain, "websiteDomain");
__name222(websiteDomain, "websiteDomain");
function companyHref(id) {
  const raw = String(id || "");
  return `/c/${/^[A-Za-z0-9:._-]+$/.test(raw) ? raw : encodeURIComponent(raw)}`;
}
__name(companyHref, "companyHref");
__name2(companyHref, "companyHref");
__name22(companyHref, "companyHref");
__name222(companyHref, "companyHref");
function ticketCompanyHref(id) {
  const raw = String(id || "").trim();
  if (!raw)
    return "/ticket";
  const safe = /^[A-Za-z0-9:._-]+$/.test(raw) ? raw : encodeURIComponent(raw);
  return `/ticket?company=${safe}`;
}
__name(ticketCompanyHref, "ticketCompanyHref");
__name2(ticketCompanyHref, "ticketCompanyHref");
__name22(ticketCompanyHref, "ticketCompanyHref");
__name222(ticketCompanyHref, "ticketCompanyHref");
function startupBriefHref(company) {
  const usp = new URLSearchParams({ wiz: "startup" });
  const id = String(company?.id || "").trim();
  const name = String(company?.name || "").trim();
  if (id)
    usp.set("company", id);
  if (name)
    usp.set("name", name);
  return `/?${usp.toString()}`;
}
__name(startupBriefHref, "startupBriefHref");
__name2(startupBriefHref, "startupBriefHref");
__name22(startupBriefHref, "startupBriefHref");
__name222(startupBriefHref, "startupBriefHref");
function linkedText(href, label) {
  const text = escapeHtml(label);
  return href ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
}
__name(linkedText, "linkedText");
__name2(linkedText, "linkedText");
__name22(linkedText, "linkedText");
__name222(linkedText, "linkedText");
function namedCompanies(map) {
  return mapRows(map).filter((row) => String(row.name || row.id || "").trim());
}
__name(namedCompanies, "namedCompanies");
__name2(namedCompanies, "namedCompanies");
__name22(namedCompanies, "namedCompanies");
__name222(namedCompanies, "namedCompanies");
function queryObject(query) {
  if (!query) {
    return { q: "", mix: "", stage: "", src: "", ats: "", sort: "", hiring: "" };
  }
  const get = typeof query.get === "function" ? (key) => query.get(key) : (key) => query[key];
  const raw = /* @__PURE__ */ __name222((key) => {
    const value = get(key);
    return value == null ? "" : String(value).trim();
  }, "raw");
  return {
    q: raw("q"),
    mix: raw("mix"),
    stage: raw("stage"),
    src: raw("src").toLowerCase(),
    ats: raw("ats"),
    sort: raw("sort").toLowerCase(),
    hiring: raw("hiring")
  };
}
__name(queryObject, "queryObject");
__name2(queryObject, "queryObject");
__name22(queryObject, "queryObject");
__name222(queryObject, "queryObject");
function hiringOnly(query) {
  const value = String(query?.hiring || "").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
__name(hiringOnly, "hiringOnly");
__name2(hiringOnly, "hiringOnly");
__name22(hiringOnly, "hiringOnly");
__name222(hiringOnly, "hiringOnly");
function sourceKey(row) {
  const license = String(row?.sourceLicense || "").trim();
  if (license === "YC-public")
    return "yc";
  if (license === "HN-public")
    return "hn";
  if (license === "CC0-1.0")
    return "wd";
  const id = String(row?.id || "");
  if (id.startsWith("yc:"))
    return "yc";
  if (id.startsWith("hn:"))
    return "hn";
  if (id.startsWith("wd:"))
    return "wd";
  const source = String(row?.source || "").toLowerCase();
  if (source.includes("y combinator") || source === "yc")
    return "yc";
  if (source.includes("hacker news") || source === "hn")
    return "hn";
  if (source.includes("wikidata"))
    return "wd";
  return "";
}
__name(sourceKey, "sourceKey");
__name2(sourceKey, "sourceKey");
__name22(sourceKey, "sourceKey");
__name222(sourceKey, "sourceKey");
function companyMatches(row, query) {
  if (hiringOnly(query) && !(openRoleCount(row) > 0))
    return false;
  if (query.mix && !roleMixKeys(row).includes(query.mix))
    return false;
  if (query.stage && String(row.stage || "") !== query.stage)
    return false;
  if (query.src && sourceKey(row) !== query.src)
    return false;
  if (query.ats && String(row.atsSource || "") !== query.ats)
    return false;
  if (query.q) {
    const needle = query.q.toLowerCase();
    const name = String(row.name || "").toLowerCase();
    const domain = websiteDomain(row.website).toLowerCase();
    if (!name.includes(needle) && !domain.includes(needle))
      return false;
  }
  return true;
}
__name(companyMatches, "companyMatches");
__name2(companyMatches, "companyMatches");
__name22(companyMatches, "companyMatches");
__name222(companyMatches, "companyMatches");
function sortCompanies(rows, sort) {
  const copy = rows.slice();
  if (sort === "name") {
    return copy.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
  }
  return copy.sort((a, b) => (openRoleCount(b) || 0) - (openRoleCount(a) || 0) || String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
}
__name(sortCompanies, "sortCompanies");
__name2(sortCompanies, "sortCompanies");
__name22(sortCompanies, "sortCompanies");
__name222(sortCompanies, "sortCompanies");
function companiesHref(query, patch) {
  const next = { ...query, ...patch };
  const usp = new URLSearchParams();
  for (const key of ["q", "mix", "stage", "src", "ats", "sort", "hiring"]) {
    if (next[key])
      usp.set(key, next[key]);
  }
  const qs = usp.toString();
  return qs ? `/companies?${escapeHtml(qs)}` : "/companies";
}
__name(companiesHref, "companiesHref");
__name2(companiesHref, "companiesHref");
__name22(companiesHref, "companiesHref");
__name222(companiesHref, "companiesHref");
function filtLink(href, label, on) {
  return `<a href="${href}"${on ? ' class="on" aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
}
__name(filtLink, "filtLink");
__name2(filtLink, "filtLink");
__name22(filtLink, "filtLink");
__name222(filtLink, "filtLink");
function rolesForCompany(company, feed) {
  const name = company?.name;
  if (typeof name !== "string" || !name)
    return [];
  const roles = Array.isArray(feed?.roles) ? feed.roles : [];
  return roles.filter((role) => role && typeof role === "object" && role.company === name);
}
__name(rolesForCompany, "rolesForCompany");
__name2(rolesForCompany, "rolesForCompany");
__name22(rolesForCompany, "rolesForCompany");
__name222(rolesForCompany, "rolesForCompany");
function companyPeers(map, company, cap = 8, skip = null) {
  const families = new Set(roleMixKeys(company));
  if (!families.size)
    return [];
  const myOpen = openRoleCount(company) || 0;
  const myStage = String(company.stage || "");
  const skipSet = skip instanceof Set ? skip : null;
  const peers = [];
  for (const other of mapRows(map)) {
    if (!other || other.id === company.id)
      continue;
    if (skipSet && skipSet.has(other.id))
      continue;
    if (!(openRoleCount(other) > 0))
      continue;
    const shared = roleMixKeys(other).filter((key) => families.has(key)).length;
    if (shared < 1)
      continue;
    const open = openRoleCount(other) || 0;
    peers.push({
      other,
      shared,
      sameStage: String(other.stage || "") === myStage ? 1 : 0,
      openDelta: Math.abs(open - myOpen),
      open,
      name: String(other.name || "")
    });
  }
  peers.sort((a, b) => b.shared - a.shared || b.sameStage - a.sameStage || a.openDelta - b.openDelta || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  return peers.slice(0, cap);
}
__name(companyPeers, "companyPeers");
__name2(companyPeers, "companyPeers");
__name22(companyPeers, "companyPeers");
__name222(companyPeers, "companyPeers");
function companyUnknowns(company) {
  const unknown = [];
  if (!httpUrl(company.website))
    unknown.push("missing website");
  if (!String(company.description || "").trim())
    unknown.push("missing description");
  if (!roleMixKeys(company).length)
    unknown.push("no observed ATS family");
  if (!(openRoleCount(company) > 0))
    unknown.push("no observed openings");
  return unknown;
}
__name(companyUnknowns, "companyUnknowns");
__name2(companyUnknowns, "companyUnknowns");
__name22(companyUnknowns, "companyUnknowns");
__name222(companyUnknowns, "companyUnknowns");
function companiesIndexHtml(map, query) {
  const asOf = snapshotDay(map);
  const q = queryObject(query);
  const named = namedCompanies(map);
  const slice = hiringOnly(q) ? named.filter((row) => openRoleCount(row) > 0) : named;
  const filtered = sortCompanies(slice.filter((row) => companyMatches(row, q)), q.sort);
  const hiring = hiringOnly(q);
  const note = hiring ? filtered.length === 1 ? "1 company with observed openings." : `${filtered.length} companies with observed openings.` : filtered.length === 1 ? "1 company." : `${filtered.length} companies.`;
  const mixes = [...new Set(slice.flatMap((row) => roleMixKeys(row)))].sort((a, b) => a.localeCompare(b));
  const stages = [...new Set(slice.map((row) => String(row.stage || "")).filter((s) => s === "Early" || s === "Growth"))];
  const sources = [...new Set(slice.map(sourceKey).filter(Boolean))];
  const atses = [...new Set(slice.map((row) => String(row.atsSource || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sourceLabel = { yc: "YC", hn: "HN", wd: "Wikidata" };
  const hidden = ["mix", "stage", "src", "ats", "sort", "hiring"].filter((key) => q[key]).map((key) => `<input type="hidden" name="${key}" value="${escapeHtml(q[key])}">`).join("");
  const rows = filtered.length ? filtered.map((row) => {
    const mix = roleMixKeys(row).sort((a, b) => a.localeCompare(b));
    const open = openRoleCount(row);
    const bits = [];
    if (open != null)
      bits.push(`${open} observed`);
    if (row.stage)
      bits.push(String(row.stage));
    if (mix.length)
      bits.push(mix.join(", "));
    if (row.atsSource)
      bits.push(String(row.atsSource));
    const domain = websiteDomain(row.website);
    return `<a class="row" href="${escapeHtml(companyHref(row.id))}" data-name="${escapeHtml(row.name || row.id || "")}" data-domain="${escapeHtml(domain)}"><span class="who"><span class="name">${escapeHtml(row.name || row.id || "Company")}</span>${domain ? `<span class="domain">${escapeHtml(domain)}</span>` : ""}</span><span class="meta">${escapeHtml(bits.join(" \xB7 "))}</span></a>`;
  }).join("") : `<p class="muted">${hiring ? "No companies with observed openings in this snapshot." : "No companies in this snapshot."}</p>`;
  const asOfLine = asOf ? `Snapshot as of ${escapeHtml(asOf)}. ` : "";
  const filterJs = `<script>(function(){var i=document.querySelector("form.filter-q input[name=q]");if(!i)return;var rows=document.querySelectorAll("a.row");i.addEventListener("input",function(){var needle=(i.value||"").toLowerCase();for(var n=0;n<rows.length;n++){var row=rows[n];var name=(row.getAttribute("data-name")||"").toLowerCase();var domain=(row.getAttribute("data-domain")||"").toLowerCase();row.hidden=!!needle&&name.indexOf(needle)<0&&domain.indexOf(needle)<0;}});}())<\/script>`;
  const filters = `<div class="filters">
<div class="filt">${filtLink(companiesHref(q, { hiring: "" }), "All", !hiring)}${filtLink(companiesHref(q, { hiring: "1" }), "With openings", hiring)}</div>
<div class="filt"><form class="filter-q" method="get" action="/companies">${hidden}<input type="search" name="q" value="${escapeHtml(q.q)}" placeholder="Name or domain" autocomplete="off"></form></div>
${mixes.length ? `<div class="filt">${filtLink(companiesHref(q, { mix: "" }), "All", !q.mix)}${mixes.map((key) => filtLink(companiesHref(q, { mix: key }), key, q.mix === key)).join("")}</div>` : ""}
${stages.length ? `<div class="filt">${stages.map((key) => filtLink(companiesHref(q, { stage: q.stage === key ? "" : key }), key, q.stage === key)).join("")}</div>` : ""}
${sources.length ? `<div class="filt">${sources.map((key) => filtLink(companiesHref(q, { src: q.src === key ? "" : key }), sourceLabel[key] || key, q.src === key)).join("")}</div>` : ""}
${atses.length ? `<div class="filt">${atses.map((key) => filtLink(companiesHref(q, { ats: q.ats === key ? "" : key }), key, q.ats === key)).join("")}</div>` : ""}
<div class="filt">${filtLink(companiesHref(q, { sort: "" }), "Count", q.sort !== "name")}${filtLink(companiesHref(q, { sort: "name" }), "Name", q.sort === "name")}</div>
</div>`;
  return demigodPage(
    "Companies \u2014 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Public company facts.</p><h1>Companies</h1><p class="lede">Public SF company facts. Observed ATS counts, not Demigod matching inventory. A listing on a public board is not a claim the employer is filling it.</p><p class="count">${asOfLine}${escapeHtml(note)}</p>${filters}<div class="list">${rows}</div>${factsFooter(asOf)}${filterJs}`),
    {
      url: "https://www.trydemigod.com/companies",
      description: "Public SF company facts. Observed ATS counts, not Demigod matching inventory.",
      jsonLd: '{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","name":"Companies \u2014 Demigod","url":"https://www.trydemigod.com/companies","description":"Public SF company facts. Observed ATS counts, not Demigod matching inventory.","isPartOf":{"@type":"WebSite","name":"Demigod","url":"https://www.trydemigod.com/"}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Demigod","item":"https://www.trydemigod.com/"},{"@type":"ListItem","position":2,"name":"Companies","item":"https://www.trydemigod.com/companies"}]}]}'
    }
  );
}
__name(companiesIndexHtml, "companiesIndexHtml");
__name2(companiesIndexHtml, "companiesIndexHtml");
__name22(companiesIndexHtml, "companiesIndexHtml");
__name222(companiesIndexHtml, "companiesIndexHtml");
function companyPageHtml(map, id, rolesFeed) {
  const company = findMapCompany(map, id);
  if (!company) {
    return demigodPage(
      "Company not found \u2014 Demigod",
      motleyChrome(`<h1>Company not found</h1><p>No public map row for ${escapeHtml(String(id || ""))}.</p>`, { packet: true }),
      { url: "https://www.trydemigod.com/companies", description: "No public map row." }
    );
  }
  const asOf = snapshotDay(map);
  const name = String(company.name || company.id || "Company");
  const domain = websiteDomain(company.website);
  const siteHref = httpsHref(company.website);
  const sourceHref = httpsHref(company.sourceUrl);
  const jobsHref = httpsHref(company.jobsUrl);
  const open = openRoleCount(company);
  const mix = roleMixKeys(company).sort((a, b) => a.localeCompare(b));
  const unknowns = companyUnknowns(company);
  const peers = companyPeers(map, company);
  const roles = rolesForCompany(company, rolesFeed);
  const sourceLabel = String(company.source || "").trim() || company.sourceUrl || "";
  const cells = [
    domain ? `<div class="cell"><span class="cell-k">Domain</span><span class="cell-v">${escapeHtml(domain)}</span></div>` : "",
    company.website ? `<div class="cell"><span class="cell-k">Website</span><span class="cell-v">${linkedText(siteHref, company.website)}</span></div>` : "",
    sourceLabel ? `<div class="cell"><span class="cell-k">Source</span><span class="cell-v">${linkedText(sourceHref, sourceLabel)}</span></div>` : "",
    company.stage ? `<div class="cell"><span class="cell-k">Stage</span><span class="cell-v">${escapeHtml(String(company.stage))}</span></div>` : "",
    company.teamSize ? `<div class="cell"><span class="cell-k">Team</span><span class="cell-v">${escapeHtml(String(company.teamSize))}</span></div>` : "",
    company.inceptionYear ? `<div class="cell"><span class="cell-k">Started</span><span class="cell-v">${escapeHtml(String(company.inceptionYear))}</span></div>` : ""
  ].filter(Boolean).join("");
  const identity = cells ? `<div class="facts-grid">${cells}</div>` : "";
  const desc = String(company.description || "").trim() ? `<section><h2>Description</h2><p>${escapeHtml(company.description)}</p></section>` : "";
  const journalSection = companyJournalHtml(company);
  const hiring = `<section><h2>Observed ATS</h2><p>Observed openings ${open == null ? "unknown" : escapeHtml(String(open))}</p>${company.atsSource ? `<p>ATS ${escapeHtml(String(company.atsSource))}</p>` : ""}${company.jobsUrl ? `<p>Jobs ${linkedText(jobsHref, company.jobsUrl)}</p>` : ""}${company.openRolesAt ? `<p>Count as of ${escapeHtml(String(company.openRolesAt))}</p>` : ""}${mix.length ? `<p>Observed families ${escapeHtml(mix.join(", "))}</p>` : ""}<p class="muted">A listing on a public board is not a claim the employer is filling it.</p></section>`;
  const titledN = roles.filter((role) => String(role?.title || "").trim()).length;
  const rolesHtml = titledN || jobsHref ? `<section><h2>Observed on public boards</h2><p class="muted">Not Demigod matches. Not an accepted search. A listing on a public board is not a claim the employer is filling it.</p>${titledN ? `<p>${titledN === 1 ? "1 observed listing" : `${titledN} observed listings`}.</p>` : ""}${jobsHref ? `<p>Listings are on ${linkedText(jobsHref, company.jobsUrl)}.</p>` : ""}</section>` : "";
  const peerHtml = peers.length ? `<section><h2>Peers</h2><p class="muted">Similar observed ATS families. Counts live on Companies.</p><ul>${peers.map((row) => `<li>${linkedText(companyHref(row.other.id), row.other.name || row.other.id)}</li>`).join("")}</ul></section>` : "";
  const unknownHtml = unknowns.length ? `<section><h2>Unknowns</h2><ul>${unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "";
  const ticketSection = companyTicketSection(company);
  return demigodPage(
    `${name} \u2014 Demigod`,
    motleyChrome(`<div class="packet"><h1>${escapeHtml(name)}</h1>${identity}${desc}${hiring}${journalSection}${rolesHtml}${ticketSection}${peerHtml}${unknownHtml}${factsFooter(asOf)}</div>`, { packet: true }),
    {
      url: `https://www.trydemigod.com${companyHref(company.id)}`,
      description: String(company.description || "").trim() || "Public SF company facts. Not a recommendation."
    }
  );
}
__name(companyPageHtml, "companyPageHtml");
__name2(companyPageHtml, "companyPageHtml");
__name22(companyPageHtml, "companyPageHtml");
__name222(companyPageHtml, "companyPageHtml");
function journalDaysAgo(at, asOf) {
  if (!isJournalDay(at) || !isJournalDay(asOf))
    return Number.POSITIVE_INFINITY;
  const a = Date.parse(`${at}T00:00:00Z`);
  const b = Date.parse(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 864e5);
}
__name(journalDaysAgo, "journalDaysAgo");
__name2(journalDaysAgo, "journalDaysAgo");
__name22(journalDaysAgo, "journalDaysAgo");
__name222(journalDaysAgo, "journalDaysAgo");
function firstSeenThisWeek(company) {
  const n = Number(company?.oldestObservedDays);
  return Number.isFinite(n) && n >= 0 && n <= 7;
}
__name(firstSeenThisWeek, "firstSeenThisWeek");
__name2(firstSeenThisWeek, "firstSeenThisWeek");
__name22(firstSeenThisWeek, "firstSeenThisWeek");
__name222(firstSeenThisWeek, "firstSeenThisWeek");
function weeklyHasMovement(company, asOf) {
  if (!ticketMoveKinds(company, asOf).length)
    return false;
  return firstSeenThisWeek(company);
}
__name(weeklyHasMovement, "weeklyHasMovement");
__name2(weeklyHasMovement, "weeklyHasMovement");
__name22(weeklyHasMovement, "weeklyHasMovement");
__name222(weeklyHasMovement, "weeklyHasMovement");
function lastInWindowMove(company, asOf) {
  const day = isJournalDay(asOf) ? asOf : "";
  for (const ev of journalEventsOf(company)) {
    if (ev.kind !== "opened" && ev.kind !== "reopened")
      continue;
    if (day && journalDaysAgo(ev.at, day) > 7)
      continue;
    return ev;
  }
  return null;
}
__name(lastInWindowMove, "lastInWindowMove");
__name2(lastInWindowMove, "lastInWindowMove");
__name22(lastInWindowMove, "lastInWindowMove");
__name222(lastInWindowMove, "lastInWindowMove");
function compareWeeklyMovers(a, b, asOf) {
  const atA = lastInWindowMove(a, asOf)?.at || "";
  const atB = lastInWindowMove(b, asOf)?.at || "";
  if (atA !== atB)
    return String(atB).localeCompare(String(atA));
  return String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
}
__name(compareWeeklyMovers, "compareWeeklyMovers");
__name2(compareWeeklyMovers, "compareWeeklyMovers");
__name22(compareWeeklyMovers, "compareWeeklyMovers");
__name222(compareWeeklyMovers, "compareWeeklyMovers");
function weeklyMoverRow(row, asOf) {
  const domain = websiteDomain(row.website);
  const site = domain ? `<span class="domain">${escapeHtml(domain)}</span>` : "";
  const moved = ticketMoveKinds(row, asOf);
  const last = lastInWindowMove(row, asOf);
  const bits = [];
  if (moved.length)
    bits.push(escapeHtml(moved.join(" \xB7 ")));
  if (last?.at)
    bits.push(escapeHtml(last.at));
  bits.push(`<a href="${escapeHtml(ticketCompanyHref(row.id))}">Ticket</a>`);
  const meta = `<span class="meta">${bits.join(" \xB7 ")}</span>`;
  return `<div class="row"><span class="who"><span class="name">${linkedText(companyHref(row.id), row.name || row.id || "Company")}</span>${site}</span>${meta}</div>`;
}
__name(weeklyMoverRow, "weeklyMoverRow");
__name2(weeklyMoverRow, "weeklyMoverRow");
__name22(weeklyMoverRow, "weeklyMoverRow");
__name222(weeklyMoverRow, "weeklyMoverRow");
function weeklyMoversOf(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  return namedCompanies(map).filter(isHiringCompany).filter((row) => weeklyHasMovement(row, asOf)).slice().sort((a, b) => compareWeeklyMovers(a, b, asOf));
}
__name(weeklyMoversOf, "weeklyMoversOf");
__name2(weeklyMoversOf, "weeklyMoversOf");
__name22(weeklyMoversOf, "weeklyMoversOf");
__name222(weeklyMoversOf, "weeklyMoversOf");
function homeWeekRow(row, asOf) {
  const name = row.name || row.id || "Company";
  const moved = ticketMoveKinds(row, asOf);
  const last = lastInWindowMove(row, asOf);
  const bits = [];
  if (moved.length)
    bits.push(`<a href="${escapeHtml(ticketCompanyHref(row.id))}">${escapeHtml(moved.join(" \xB7 "))}</a>`);
  if (last?.at)
    bits.push(escapeHtml(last.at));
  const rest = bits.length ? ` \xB7 ${bits.join(" \xB7 ")}` : "";
  return `<div class="week-row">${linkedText(companyHref(row.id), name)}${rest}</div>`;
}
__name(homeWeekRow, "homeWeekRow");
__name2(homeWeekRow, "homeWeekRow");
__name22(homeWeekRow, "homeWeekRow");
__name222(homeWeekRow, "homeWeekRow");
function homePacketCompany(map) {
  const mover = weeklyMoversOf(map)[0];
  if (mover && mover.id)
    return mover;
  const hiring = namedCompanies(map).filter(isHiringCompany).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
  return hiring[0] && hiring[0].id ? hiring[0] : null;
}
__name(homePacketCompany, "homePacketCompany");
__name2(homePacketCompany, "homePacketCompany");
__name22(homePacketCompany, "homePacketCompany");
__name222(homePacketCompany, "homePacketCompany");
function homeWeekHtml(map) {
  const movers = weeklyMoversOf(map);
  if (!movers.length)
    return "";
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const top = movers.slice(0, 5).map((row) => homeWeekRow(row, asOf)).join("");
  const movedNote = movers.length === 1 ? "1 moved" : `${movers.length} moved`;
  return `<div class="week" aria-label="Snapshot as of ${escapeHtml(asOf)}, observed movement"><div class="week-k">Snapshot ${escapeHtml(asOf)} \xB7 observed movement</div>${top}<div class="week-foot">${escapeHtml(movedNote)} \xB7 Journal day is ours \xB7 A listing is not a claim they are filling it \xB7 Not a recommendation \xB7 <a href="/weekly">Weekly</a></div></div>`;
}
__name(homeWeekHtml, "homeWeekHtml");
__name2(homeWeekHtml, "homeWeekHtml");
__name22(homeWeekHtml, "homeWeekHtml");
__name222(homeWeekHtml, "homeWeekHtml");
function weeklyHtml(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const named = namedCompanies(map).filter(isHiringCompany);
  const movers = weeklyMoversOf(map);
  const cap = 40;
  const shown = movers.slice(0, cap);
  const rows = shown.length ? shown.map((row) => weeklyMoverRow(row, asOf)).join("") : named.length ? `<p class="muted">No board movement in this snapshot. Companies with observed openings are on <a href="/companies">Companies</a>.</p>` : `<p class="muted">No companies with observed openings in this snapshot.</p>`;
  const movedNote = movers.length === 1 ? "1 moved" : `${movers.length} moved`;
  const hiringNote = named.length === 1 ? "1 with openings" : `${named.length} with openings`;
  const trimNote = movers.length > cap ? ` Showing ${cap} of ${movers.length} moved.` : "";
  const note = `${movedNote}. ${hiringNote} on Companies.${trimNote}`;
  return demigodPage(
    "Weekly \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Observed movement.</p><h1>Weekly</h1><p class="lede">Observed board movement in the ${escapeHtml(asOf)} snapshot. First-seen in that window, plus an opened or reopened journal. A scrape of still-open listings is not movement. Journal dates are when we saw the board change, not the employer's posted date. A listing on a public board is not a claim the employer is filling it. Not a catalog of every observed opening. Not a recommendation.</p><p><a href="/?wiz=startup">Start a brief</a> \u2014 a new named brief, not a row below.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)} <a href="/companies">Companies</a>.</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/weekly",
      description: "Observed board movement in this snapshot. First-seen is ours, not the employer's posted date. Not a catalog of every opening. Not a recommendation."
    }
  );
}
__name(weeklyHtml, "weeklyHtml");
__name2(weeklyHtml, "weeklyHtml");
__name22(weeklyHtml, "weeklyHtml");
__name222(weeklyHtml, "weeklyHtml");
function packetsHtml(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const namedAll = namedCompanies(map).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
  const cap = 40;
  const named = namedAll.slice(0, cap);
  const rows = named.length ? named.map((row) => {
    const domain = websiteDomain(row.website);
    return `<a class="row" href="${escapeHtml(companyHref(row.id))}"><span class="who"><span class="name">${escapeHtml(row.name || row.id || "Company")}</span>${domain ? `<span class="domain">${escapeHtml(domain)}</span>` : ""}</span></a>`;
  }).join("") : `<p class="muted">No packets in this snapshot.</p>`;
  const note = namedAll.length === 1 ? "1 packet." : `${namedAll.length} packets.`;
  const trimNote = namedAll.length > named.length ? ` Showing ${named.length} of ${namedAll.length}.` : "";
  return demigodPage(
    "Packets \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Public packets.</p><h1>Packets</h1><p class="lede">Public named-company packets. Not matching inventory. Not a catalog of every company. Not a recommendation.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)}${escapeHtml(trimNote)} <a href="/companies">Companies</a>.</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { packet: true, mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/packets",
      description: "Public named-company packets. Not matching inventory. Not a recommendation."
    }
  );
}
__name(packetsHtml, "packetsHtml");
__name2(packetsHtml, "packetsHtml");
__name22(packetsHtml, "packetsHtml");
__name222(packetsHtml, "packetsHtml");
function journalObserved7(company) {
  const n = Number(company?.observed7);
  return Number.isFinite(n) ? n : 0;
}
__name(journalObserved7, "journalObserved7");
__name2(journalObserved7, "journalObserved7");
__name22(journalObserved7, "journalObserved7");
__name222(journalObserved7, "journalObserved7");
function journalOldestDays(company) {
  const n = Number(company?.oldestObservedDays);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}
__name(journalOldestDays, "journalOldestDays");
__name2(journalOldestDays, "journalOldestDays");
__name22(journalOldestDays, "journalOldestDays");
__name222(journalOldestDays, "journalOldestDays");
var JOURNAL_KINDS = /* @__PURE__ */ new Set(["opened", "closed", "reopened", "maintained_stale"]);
var JOURNAL_KIND_ORDER = { opened: 0, reopened: 1, closed: 2, maintained_stale: 3 };
function isJournalDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
__name(isJournalDay, "isJournalDay");
__name2(isJournalDay, "isJournalDay");
__name22(isJournalDay, "isJournalDay");
__name222(isJournalDay, "isJournalDay");
function journalEventsOf(company) {
  const rows = Array.isArray(company?.journal) ? company.journal : [];
  const events = [];
  for (const row of rows) {
    if (!row || typeof row !== "object")
      continue;
    const kind = String(row.kind || "");
    if (!JOURNAL_KINDS.has(kind))
      continue;
    const at = isJournalDay(row.at) ? row.at : "";
    if (!at)
      continue;
    events.push({
      kind,
      at,
      title: typeof row.title === "string" ? row.title : ""
    });
  }
  events.sort((a, b) => String(b.at).localeCompare(String(a.at)) || (JOURNAL_KIND_ORDER[a.kind] ?? 99) - (JOURNAL_KIND_ORDER[b.kind] ?? 99) || String(a.title).localeCompare(String(b.title)));
  return events;
}
__name(journalEventsOf, "journalEventsOf");
__name2(journalEventsOf, "journalEventsOf");
__name22(journalEventsOf, "journalEventsOf");
__name222(journalEventsOf, "journalEventsOf");
function journalBriefTitle(company) {
  const events = journalEventsOf(company);
  for (const ev of events) {
    if (ev.kind !== "opened")
      continue;
    const title = String(ev.title || "").trim();
    if (title)
      return title;
  }
  for (const ev of events) {
    if (ev.kind !== "reopened")
      continue;
    const title = String(ev.title || "").trim();
    if (title)
      return title;
  }
  return "";
}
__name(journalBriefTitle, "journalBriefTitle");
__name2(journalBriefTitle, "journalBriefTitle");
__name22(journalBriefTitle, "journalBriefTitle");
__name222(journalBriefTitle, "journalBriefTitle");
function briefRole(company) {
  const fromJournal = journalBriefTitle(company);
  if (fromJournal)
    return fromJournal;
  const rows = Array.isArray(company?.roles) ? company.roles : [];
  for (const row of rows) {
    if (!row || typeof row !== "object")
      continue;
    const kind = String(row.kind || row.status || "").toLowerCase();
    if (kind === "closed" || kind === "maintained_stale")
      continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (title)
      return title;
  }
  return "";
}
__name(briefRole, "briefRole");
__name2(briefRole, "briefRole");
__name22(briefRole, "briefRole");
__name222(briefRole, "briefRole");
function lastOpenedReopened(company) {
  const events = journalEventsOf(company);
  for (const ev of events) {
    if (ev.kind === "opened" || ev.kind === "reopened")
      return ev;
  }
  return null;
}
__name(lastOpenedReopened, "lastOpenedReopened");
__name2(lastOpenedReopened, "lastOpenedReopened");
__name22(lastOpenedReopened, "lastOpenedReopened");
__name222(lastOpenedReopened, "lastOpenedReopened");
function ticketMoveKinds(company, asOf) {
  const kinds = [];
  const seen = /* @__PURE__ */ new Set();
  const day = isJournalDay(asOf) ? asOf : "";
  for (const ev of journalEventsOf(company)) {
    if (ev.kind !== "opened" && ev.kind !== "reopened")
      continue;
    if (day && journalDaysAgo(ev.at, day) > 7)
      continue;
    if (seen.has(ev.kind))
      continue;
    seen.add(ev.kind);
    kinds.push(ev.kind);
  }
  return kinds;
}
__name(ticketMoveKinds, "ticketMoveKinds");
__name2(ticketMoveKinds, "ticketMoveKinds");
__name22(ticketMoveKinds, "ticketMoveKinds");
__name222(ticketMoveKinds, "ticketMoveKinds");
function journalEventLine(ev) {
  if (!ev)
    return "";
  return `${ev.kind} \xB7 ${ev.at}`;
}
__name(journalEventLine, "journalEventLine");
__name2(journalEventLine, "journalEventLine");
__name22(journalEventLine, "journalEventLine");
__name222(journalEventLine, "journalEventLine");
function companyTicketSection(company) {
  const moved = lastOpenedReopened(company);
  const movedHtml = moved ? `<p>${escapeHtml(journalEventLine(moved))}</p>` : "";
  return `<section><h2>Ticket</h2><p>Review-only. A person writes the brief. Observed listings are not the brief.</p>${movedHtml}<p><a href="${escapeHtml(startupBriefHref(company))}">Start a brief</a></p></section>`;
}
__name(companyTicketSection, "companyTicketSection");
__name2(companyTicketSection, "companyTicketSection");
__name22(companyTicketSection, "companyTicketSection");
__name222(companyTicketSection, "companyTicketSection");
function observedAgeLabel(company) {
  const n = Number(company?.oldestObservedDays);
  if (!Number.isFinite(n) || n < 0)
    return "";
  if (n === 0)
    return "first seen today";
  if (n === 1)
    return "1d first seen";
  return `${n}d first seen`;
}
__name(observedAgeLabel, "observedAgeLabel");
__name2(observedAgeLabel, "observedAgeLabel");
__name22(observedAgeLabel, "observedAgeLabel");
__name222(observedAgeLabel, "observedAgeLabel");
function journalClockLabel(company) {
  const bits = [];
  const observed = journalObserved7(company);
  const oldest = Number(company?.oldestObservedDays);
  if (observed > 0)
    bits.push(`${observed} first-seen`);
  if (Number.isFinite(oldest))
    bits.push(`${oldest}d oldest`);
  return bits.join(" \xB7 ");
}
__name(journalClockLabel, "journalClockLabel");
__name2(journalClockLabel, "journalClockLabel");
__name22(journalClockLabel, "journalClockLabel");
__name222(journalClockLabel, "journalClockLabel");
function journalRowMeta(company) {
  const events = journalEventsOf(company);
  if (events.length) {
    const kinds = [];
    const seen = /* @__PURE__ */ new Set();
    for (const ev of events) {
      if (seen.has(ev.kind))
        continue;
      seen.add(ev.kind);
      kinds.push(ev.kind);
    }
    return kinds.join(" \xB7 ");
  }
  return journalClockLabel(company);
}
__name(journalRowMeta, "journalRowMeta");
__name2(journalRowMeta, "journalRowMeta");
__name22(journalRowMeta, "journalRowMeta");
__name222(journalRowMeta, "journalRowMeta");
function companyJournalHtml(company) {
  const events = journalEventsOf(company);
  if (events.length) {
    const cap = 8;
    const shown = events.slice(0, cap);
    const items = shown.map((ev) => `<li>${escapeHtml(ev.kind)} \xB7 ${escapeHtml(ev.at)}</li>`).join("");
    const more = events.length > cap ? `<p class="muted">${events.length - cap} more observed movements. Not the brief.</p>` : "";
    return `<section><h2>Journal</h2><p class="muted">Observed board movement on this map row. Not the brief.</p><ul>${items}</ul>${more}</section>`;
  }
  const clock = journalClockLabel(company);
  if (!clock)
    return "";
  return `<section><h2>Journal</h2><p>${escapeHtml(clock)}</p><p class="muted">First-seen-in-7-days, then oldest of those. Not opened/closed/reopened \u2014 those clocks are not on this map row.</p></section>`;
}
__name(companyJournalHtml, "companyJournalHtml");
__name2(companyJournalHtml, "companyJournalHtml");
__name22(companyJournalHtml, "companyJournalHtml");
__name222(companyJournalHtml, "companyJournalHtml");
function journalHtml(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const namedAll = namedCompanies(map).filter((row) => journalEventsOf(row).length > 0).slice().sort((a, b) => {
    const move = journalObserved7(b) - journalObserved7(a);
    if (move)
      return move;
    const age = journalOldestDays(a) - journalOldestDays(b);
    if (age)
      return age;
    return String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
  });
  const hiringCount = namedCompanies(map).filter(isHiringCompany).length;
  const named = namedAll.slice(0, 40);
  const rows = named.length ? named.map((row) => {
    const name = escapeHtml(row.name || row.id || "Company");
    const domain = websiteDomain(row.website);
    const site = domain ? `<span class="domain">${escapeHtml(domain)}</span>` : "";
    const metaText = journalRowMeta(row);
    const meta = metaText ? `<span class="meta">${escapeHtml(metaText)}</span>` : "";
    return `<a class="row" href="${escapeHtml(companyHref(row.id))}"><span class="who"><span class="name">${name}</span>${site}</span>${meta}</a>`;
  }).join("") : `<p class="muted">No observed board movement in this snapshot. First-seen clocks live on <a href="/companies">Companies</a>.</p>`;
  const moveNote = namedAll.length === 1 ? "1 company with journal movement." : `${namedAll.length} companies with journal movement.`;
  const hiringNote = hiringCount === 1 ? "1 with openings" : `${hiringCount} with openings`;
  const trimNote = namedAll.length > named.length ? ` Showing ${named.length} of ${namedAll.length}.` : "";
  const note = `${moveNote} ${hiringNote} on Companies.${trimNote}`;
  return demigodPage(
    "Journal \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Observed journal.</p><h1>Journal</h1><p class="lede">Opened, closed, reopened, and stale on this map row. First-seen clocks without those kinds live on the company packet. Not the employer's posted date. A listing on a public board is not a claim the employer is filling it. Not a catalog of every observed opening. Not a recommendation.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)} <a href="/companies">Companies</a>.</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/journal",
      description: "Observed board movement. Opened and closed kinds, not a catalog of every opening, not the employer's posted date. Not a recommendation."
    }
  );
}
__name(journalHtml, "journalHtml");
__name2(journalHtml, "journalHtml");
__name22(journalHtml, "journalHtml");
__name222(journalHtml, "journalHtml");
function peersHtml(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const namedAll = namedCompanies(map).filter(isHiringCompany).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
  const cap = 40;
  const named = namedAll.slice(0, cap);
  const byMix = /* @__PURE__ */ new Map();
  for (const row of namedAll) {
    if (!row || !(openRoleCount(row) > 0))
      continue;
    for (const key of roleMixKeys(row)) {
      let list = byMix.get(key);
      if (!list) {
        list = [];
        byMix.set(key, list);
      }
      list.push(row);
    }
  }
  const items = [];
  const usedAsPeer = /* @__PURE__ */ new Map();
  const peerPageBudget = 8;
  for (const company of named) {
    const families = roleMixKeys(company);
    if (!families.length)
      continue;
    const seen = /* @__PURE__ */ new Set([company.id]);
    const pool = [company];
    for (const key of families) {
      for (const other of byMix.get(key) || []) {
        if (seen.has(other.id))
          continue;
        seen.add(other.id);
        pool.push(other);
      }
    }
    const skip = /* @__PURE__ */ new Set();
    for (const [id, n] of usedAsPeer) {
      if (n >= peerPageBudget)
        skip.add(id);
    }
    const peers = companyPeers({ companies: pool }, company, 3, skip);
    if (!peers.length)
      continue;
    for (const row of peers)
      usedAsPeer.set(row.other.id, (usedAsPeer.get(row.other.id) || 0) + 1);
    const peerBits = peers.map((row) => linkedText(companyHref(row.other.id), row.other.name || row.other.id)).join(", ");
    items.push(`<div class="row"><span class="who"><span class="name">${linkedText(companyHref(company.id), company.name || company.id || "Company")}</span></span><span class="meta">\u2192 ${peerBits}</span></div>`);
    if (items.length >= 40)
      break;
  }
  const rows = items.length ? items.join("") : `<p class="muted">No shared observed ATS families in this snapshot.</p>`;
  const note = items.length === 1 ? "1 company with peers." : `${items.length} companies with peers.`;
  const trimNote = namedAll.length > named.length ? ` Showing ${named.length} of ${namedAll.length}.` : "";
  return demigodPage(
    "Peers \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Observed peers.</p><h1>Peers</h1><p class="lede">Other companies that share an observed ATS family on public boards. Not people-lookalikes. Not a catalog of every company. Not a recommendation.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)}${escapeHtml(trimNote)}</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/peers",
      description: "Other companies that share an observed ATS family on public boards. Not people-lookalikes. Not a recommendation."
    }
  );
}
__name(peersHtml, "peersHtml");
__name2(peersHtml, "peersHtml");
__name22(peersHtml, "peersHtml");
__name222(peersHtml, "peersHtml");
function memoHtml(map) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const namedAll = namedCompanies(map).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
  const cap = 40;
  const named = namedAll.slice(0, cap);
  const rows = named.length ? named.map((row) => {
    const domain = websiteDomain(row.website);
    const bits = [];
    if (row.stage)
      bits.push(String(row.stage));
    const open = openRoleCount(row);
    if (open != null)
      bits.push(`${open} observed`);
    return `<a class="row" href="${escapeHtml(companyHref(row.id))}"><span class="who"><span class="name">${escapeHtml(row.name || row.id || "Company")}</span>${domain ? `<span class="domain">${escapeHtml(domain)}</span>` : ""}</span>${bits.length ? `<span class="meta">${escapeHtml(bits.join(" \xB7 "))}</span>` : ""}</a>`;
  }).join("") : `<p class="muted">No memos in this snapshot.</p>`;
  const note = namedAll.length === 1 ? "1 company." : `${namedAll.length} companies.`;
  const trimNote = namedAll.length > named.length ? ` Showing ${named.length} of ${namedAll.length}.` : "";
  return demigodPage(
    "Memo \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Public one-pagers.</p><h1>Memo</h1><p class="lede">Public one-pagers. Names, sites, stage. Not matching inventory. Not a catalog of every company. Not a recommendation. Not the private research memo.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)}${escapeHtml(trimNote)} <a href="/companies">Companies</a>.</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { packet: true, mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/memo",
      description: "Public one-pagers. Names, sites, stage. Not matching inventory. Not a recommendation."
    }
  );
}
__name(memoHtml, "memoHtml");
__name2(memoHtml, "memoHtml");
__name22(memoHtml, "memoHtml");
__name222(memoHtml, "memoHtml");
function ticketCompanyFromQuery(query) {
  if (!query)
    return "";
  const raw = typeof query.get === "function" ? query.get("company") : query.company;
  return sanitizeBriefCompanyId(raw);
}
__name(ticketCompanyFromQuery, "ticketCompanyFromQuery");
__name2(ticketCompanyFromQuery, "ticketCompanyFromQuery");
__name22(ticketCompanyFromQuery, "ticketCompanyFromQuery");
__name222(ticketCompanyFromQuery, "ticketCompanyFromQuery");
function oneCompanyTicketHtml(map, company) {
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const name = String(company.name || company.id || "Company");
  const domain = websiteDomain(company.website);
  const siteHref = httpsHref(company.website);
  const site = domain ? `<p>${linkedText(siteHref, domain)}</p>` : "";
  return demigodPage(
    "Ticket \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Review ticket.</p><h1>${escapeHtml(name)}</h1>${site}${companyTicketSection(company)}${factsFooter(asOf)}`, { packet: true, mastHref: "/weekly" }),
    {
      url: `https://www.trydemigod.com/ticket?company=${encodeURIComponent(String(company.id || ""))}`,
      description: "Review-only hiring ticket. A person writes the brief. Not a recommendation."
    }
  );
}
__name(oneCompanyTicketHtml, "oneCompanyTicketHtml");
__name2(oneCompanyTicketHtml, "oneCompanyTicketHtml");
__name22(oneCompanyTicketHtml, "oneCompanyTicketHtml");
__name222(oneCompanyTicketHtml, "oneCompanyTicketHtml");
function ticketHtml(map, query) {
  const oneId = ticketCompanyFromQuery(query);
  const one = oneId ? findMapCompany(map, oneId) : null;
  if (one)
    return oneCompanyTicketHtml(map, one);
  const asOf = snapshotDay(map) || LIVE_MAP_DATE;
  const movers = weeklyMoversOf(map);
  const hiringCount = namedCompanies(map).filter(isHiringCompany).length;
  const cap = 40;
  const shown = movers.slice(0, cap);
  const rows = shown.length ? shown.map((row) => {
    const domain = websiteDomain(row.website);
    const site = domain ? `<span class="domain">${escapeHtml(domain)}</span>` : "";
    const moved = ticketMoveKinds(row, asOf);
    const bits = [];
    if (moved.length)
      bits.push(moved.join(" \xB7 "));
    const metaText = bits.length ? escapeHtml(bits.join(" \xB7 ")) : "";
    const meta = metaText ? `<span class="meta">${metaText}</span>` : "";
    return `<div class="row"><span class="who"><span class="name">${linkedText(companyHref(row.id), row.name || row.id || "Company")}</span>${site}</span>${meta}</div>`;
  }).join("") : `<p class="muted">No board movement in this snapshot. Companies with observed openings are on <a href="/companies">Companies</a>.</p>`;
  const movedNote = movers.length === 1 ? "1 moved" : `${movers.length} moved`;
  const hiringNote = hiringCount === 1 ? "1 with openings" : `${hiringCount} with openings`;
  const trimNote = movers.length > cap ? ` Showing ${cap} of ${movers.length} moved.` : "";
  const note = `${movedNote}. ${hiringNote} on Companies.${trimNote}`;
  return demigodPage(
    "Ticket \xB7 Demigod",
    motleyChrome(`<p class="facts-line">SF \xB7 Seed and Series A \xB7 Review ticket.</p><h1>Ticket</h1><p class="lede">Review-only hiring tickets for observed board movement in the ${escapeHtml(asOf)} snapshot. Journal dates are when we saw the board change, not the employer's posted date. A listing on a public board is not a claim the employer is filling it. A person writes the brief. Not a catalog of every observed opening. Not a recommendation.</p><p><a href="/?wiz=startup">Start a brief</a> \u2014 a new named brief, not a row below.</p><p class="count">Snapshot as of ${escapeHtml(asOf)}. ${escapeHtml(note)} <a href="/companies">Companies</a>.</p><div class="list">${rows}</div>${factsFooter(asOf)}`, { mastHref: "/weekly" }),
    {
      url: "https://www.trydemigod.com/ticket",
      description: "Review-only hiring tickets. Observed openings. First-seen is ours, not the employer's posted date. Not a recommendation."
    }
  );
}
__name(ticketHtml, "ticketHtml");
__name2(ticketHtml, "ticketHtml");
__name22(ticketHtml, "ticketHtml");
__name222(ticketHtml, "ticketHtml");
function htmlResponse(html, status, edge) {
  const headers = applyHtmlSecurity(new Headers());
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", `public, max-age=${CDN_JSON_TTL}`);
  headers.set("X-Demigod-Edge", edge);
  return { html, status, headers };
}
__name(htmlResponse, "htmlResponse");
__name2(htmlResponse, "htmlResponse");
__name22(htmlResponse, "htmlResponse");
__name222(htmlResponse, "htmlResponse");
async function companiesEdge(request, url) {
  const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
  if (isCompanyPath(url.pathname)) {
    const id = companyIdFromPath(url.pathname);
    const company = findMapCompany(map, id);
    const feed = company ? await loadCdnJson("roles-feed.json").catch(() => null) : null;
    const { html: html2, status: status2, headers: headers2 } = htmlResponse(
      companyPageHtml(map, id, feed),
      company ? 200 : 404,
      "company"
    );
    return new Response(request.method === "HEAD" ? null : html2, { status: status2, headers: headers2 });
  }
  const { html, status, headers } = htmlResponse(companiesIndexHtml(map, url.searchParams), 200, "companies");
  return new Response(request.method === "HEAD" ? null : html, { status, headers });
}
__name(companiesEdge, "companiesEdge");
__name2(companiesEdge, "companiesEdge");
__name22(companiesEdge, "companiesEdge");
__name222(companiesEdge, "companiesEdge");
var ROOM_HTML_CACHE = /* @__PURE__ */ new Map();
function mapRoomEdge(pathname) {
  if (isWeeklyPath(pathname))
    return "weekly";
  if (isJournalPath(pathname))
    return "journal";
  if (isPeersPath(pathname))
    return "peers";
  if (isMemoPath(pathname))
    return "memo";
  if (isTicketPath(pathname))
    return "ticket";
  if (isPacketsPath(pathname))
    return "packets";
  return "";
}
__name(mapRoomEdge, "mapRoomEdge");
__name2(mapRoomEdge, "mapRoomEdge");
__name22(mapRoomEdge, "mapRoomEdge");
__name222(mapRoomEdge, "mapRoomEdge");
function rememberRoomHtml(edge, html) {
  ROOM_HTML_CACHE.set(`${edge}:${LIVE_MAP_PIN}`, { html, exp: Date.now() + CDN_JSON_TTL * 1e3 });
}
__name(rememberRoomHtml, "rememberRoomHtml");
__name2(rememberRoomHtml, "rememberRoomHtml");
__name22(rememberRoomHtml, "rememberRoomHtml");
__name222(rememberRoomHtml, "rememberRoomHtml");
function recalledRoomHtml(edge) {
  const hit = ROOM_HTML_CACHE.get(`${edge}:${LIVE_MAP_PIN}`);
  if (!hit || hit.exp <= Date.now() || typeof hit.html !== "string")
    return "";
  return hit.html;
}
__name(recalledRoomHtml, "recalledRoomHtml");
__name2(recalledRoomHtml, "recalledRoomHtml");
__name22(recalledRoomHtml, "recalledRoomHtml");
__name222(recalledRoomHtml, "recalledRoomHtml");
function renderMapRoom(edge, map) {
  if (edge === "weekly")
    return weeklyHtml(map);
  if (edge === "journal")
    return journalHtml(map);
  if (edge === "peers")
    return peersHtml(map);
  if (edge === "memo")
    return memoHtml(map);
  if (edge === "ticket")
    return ticketHtml(map);
  return packetsHtml(map);
}
__name(renderMapRoom, "renderMapRoom");
__name2(renderMapRoom, "renderMapRoom");
__name22(renderMapRoom, "renderMapRoom");
__name222(renderMapRoom, "renderMapRoom");
async function weeklyPacketsEdge(request, url) {
  const edge = mapRoomEdge(url.pathname) || "packets";
  if (edge === "ticket" && ticketCompanyFromQuery(url.searchParams)) {
    const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
    const page2 = ticketHtml(map, url.searchParams);
    const rendered = htmlResponse(page2, 200, edge);
    return new Response(request.method === "HEAD" ? null : rendered.html, { status: rendered.status, headers: rendered.headers });
  }
  let page = recalledRoomHtml(edge);
  if (!page) {
    const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
    page = renderMapRoom(edge, map);
    rememberRoomHtml(edge, page);
  }
  const { html, status, headers } = htmlResponse(page, 200, edge);
  return new Response(request.method === "HEAD" ? null : html, { status, headers });
}
__name(weeklyPacketsEdge, "weeklyPacketsEdge");
__name2(weeklyPacketsEdge, "weeklyPacketsEdge");
__name22(weeklyPacketsEdge, "weeklyPacketsEdge");
__name222(weeklyPacketsEdge, "weeklyPacketsEdge");
async function productEdge(request, url, env) {
  const grok = await grokEdge(request, url, env);
  if (grok)
    return grok;
  const bountiesJson = await bountiesJsonEdge(request, url);
  if (bountiesJson)
    return bountiesJson;
  if (isRobotsPath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    const headers2 = applyHtmlSecurity(new Headers());
    headers2.set("Content-Type", "text/plain; charset=utf-8");
    headers2.set("Cache-Control", "public, max-age=3600");
    headers2.set("X-Demigod-Edge", "robots");
    return new Response(request.method === "HEAD" ? null : ROBOTS_TXT, { status: 200, headers: headers2 });
  }
  if ((isLlmsPath(url.pathname) || isLlmsFullPath(url.pathname) || isAiTxtPath(url.pathname)) && (request.method === "GET" || request.method === "HEAD")) {
    const body = isLlmsFullPath(url.pathname) ? LLMS_FULL_TXT : isAiTxtPath(url.pathname) ? LLMS_TXT : LLMS_TXT;
    const { headers: headers2 } = textResponse(body, isLlmsFullPath(url.pathname) ? "llms-full" : isAiTxtPath(url.pathname) ? "ai-txt" : "llms", "text/markdown; charset=utf-8");
    return new Response(request.method === "HEAD" ? null : body, { status: 200, headers: headers2 });
  }
  if (isSitemapPath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    let src = "";
    try {
      const upstream2 = await fetch(request);
      src = await upstream2.text();
    } catch {
      src = "";
    }
    const xml = rewriteSitemap(src);
    const headers2 = applyHtmlSecurity(new Headers());
    headers2.set("Content-Type", "application/xml; charset=utf-8");
    headers2.set("Cache-Control", "public, max-age=3600");
    headers2.set("X-Demigod-Edge", "sitemap");
    return new Response(request.method === "HEAD" ? null : xml, { status: 200, headers: headers2 });
  }
  const wiz = wizardKind(url);
  if (isHirePath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    const dest = new URL("https://www.trydemigod.com/");
    if (wiz)
      dest.searchParams.set("wiz", wiz);
    applyBriefCompanyQuery(dest, url);
    return new Response(null, {
      status: 308,
      headers: { Location: dest.href, "Cache-Control": "public, max-age=300", "X-Demigod-Edge": wiz ? "hire-wiz" : "hire-home" }
    });
  }
  if (isHomePath(url.pathname) && !wiz && !url.searchParams.get("p") && (request.method === "GET" || request.method === "HEAD")) {
    if (wantsMarkdown(request)) {
      const body = demigodHomeMarkdown();
      const { headers: headers3 } = textResponse(body, "home-md", "text/markdown; charset=utf-8", {
        "Vary": "Accept",
        "Link": '<https://www.trydemigod.com/>; rel="canonical"',
        "X-Robots-Tag": "noindex, follow"
      });
      return new Response(request.method === "HEAD" ? null : body, { status: 200, headers: headers3 });
    }
    const map = await loadCdnJson("sf-startup-map.json").catch(() => null);
    const { html: html2, status, headers: headers2 } = htmlResponse(demigodHomeHtml(map), 200, "home-motley");
    return new Response(request.method === "HEAD" ? null : html2, { status, headers: headers2 });
  }
  if (isContactPath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    if (wantsMarkdown(request)) {
      const body = demigodContactMarkdown();
      const { headers: headers3 } = textResponse(body, "contact-md", "text/markdown; charset=utf-8", {
        "Vary": "Accept",
        "Link": '<https://www.trydemigod.com/contact>; rel="canonical"',
        "X-Robots-Tag": "noindex, follow"
      });
      return new Response(request.method === "HEAD" ? null : body, { status: 200, headers: headers3 });
    }
    const { html: html2, status, headers: headers2 } = htmlResponse(demigodContactHtml(), 200, "contact-motley");
    return new Response(request.method === "HEAD" ? null : html2, { status, headers: headers2 });
  }
  if (isLegalPath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    const { html: html2, status, headers: headers2 } = htmlResponse(demigodLegalHtml(), 200, "legal-motley");
    return new Response(request.method === "HEAD" ? null : html2, { status, headers: headers2 });
  }
  if (isCompPath(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    const { html: html2, status, headers: headers2 } = htmlResponse(demigodCompHtml(), 200, "comp-motley");
    return new Response(request.method === "HEAD" ? null : html2, { status, headers: headers2 });
  }
  const upstream = await fetch(request);
  const ct = String(upstream.headers.get("content-type") || "");
  if (request.method !== "GET" || !ct.includes("text/html"))
    return upstream;
  if (upstream.status === 404 && !wiz && !isHomePath(url.pathname) && !isHirePath(url.pathname) && url.pathname !== "/proof" && url.pathname !== "/proof/" && url.pathname !== "/pricing" && url.pathname !== "/how" && url.pathname !== "/faq" && url.pathname !== "/talent") {
    const { html: missing, status, headers: missingHeaders } = htmlResponse(demigodNotFoundHtml(), 404, "not-found");
    missingHeaders.set("X-Robots-Tag", "noindex, follow");
    return new Response(missing, { status, headers: missingHeaders });
  }
  let html = await upstream.text();
  html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(html)));
  html = stripLeftoverTemplate(html);
  html = rewriteDeadConversionCtas(html);
  if (isHomePath(url.pathname))
    html = shieldHomeFirstPaint(html);
  if (isHirePath(url.pathname) || wiz)
    html = paintHireMotley(html, wiz === "startup" ? await resolveStartupBrief(url) : null);
  if (isEventsPath(url.pathname))
    html = hideDeadEventsList(html);
  if (isBountiesPath(url.pathname)) {
    html = injectBountiesBoard(html, await loadBountiesFeed());
    html = stripLeftoverSeo(html);
    if (/name=["']robots["']/.test(html))
      html = html.replace(/name=["']robots["'] content=["'][^"']*["']/, 'name="robots" content="noindex,follow"');
    else
      html = html.includes("</head>") ? html.replace("</head>", '<meta name="robots" content="noindex,follow"></head>') : html;
  }
  html = ensureHtmlLang(html);
  const headers = applyHtmlSecurity(new Headers(upstream.headers));
  headers.delete("content-length");
  const edge = isBountiesPath(url.pathname) ? "bounties-board" : isEventsPath(url.pathname) ? "events-hide" : isHomePath(url.pathname) && wiz ? "home-wiz" : isHomePath(url.pathname) ? "home-shield" : isHirePath(url.pathname) ? "hire-motley" : "html-rewrite";
  headers.set("X-Demigod-Edge", edge);
  if (wiz || isBountiesPath(url.pathname))
    headers.set("X-Robots-Tag", "noindex, follow");
  return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers });
}
__name(productEdge, "productEdge");
__name2(productEdge, "productEdge");
__name22(productEdge, "productEdge");
__name222(productEdge, "productEdge");
var HW_COMPANIES = JSON.parse('[{"n":"Astro Mechanica","d":"astromecha.co","s":"Aerospace","w":"Supersonic aircraft engine technology","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:astro-mechanica","al":null},{"n":"Orca Aerospace","d":"orcaaerospace.com","s":"Aerospace","w":"Autonomous eVTOL aircraft","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:orca-aerospace","al":null},{"n":"Pyka","d":"flypyka.com","s":"Aerospace","w":"Autonomous electric cargo and crop aircraft","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:pyka","al":null},{"n":"Cruise","d":"getcruise.com","s":"Autonomous vehicles","w":"Robotaxis (wound down by GM in 2024)","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q42377899","al":true},{"n":"Culture Biosciences","d":"culturebiosciences.com","s":"Biomanufacturing","w":"Cloud-connected bioreactors","st":"Growth","o":2,"a":"Greenhouse","b":"https://www.trydemigod.com/c/yc:culture-biosciences","al":null},{"n":"AirMyne","d":"airmyne.com","s":"Climate","w":"Direct air capture of CO2","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:airmyne","al":null},{"n":"Electric Air","d":"electricair.io","s":"Climate","w":"Home heat pump systems","st":"Early","o":5,"a":"Ashby","b":"https://www.trydemigod.com/c/yc:electric-air-2","al":null},{"n":"Holy Grail","d":"holygrail.ai","s":"Climate","w":"Direct air capture of CO2","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:holy-grail-inc","al":null},{"n":"Treau","d":"treau.cool","s":"Climate","w":"High-efficiency heat pump HVAC (maker of Gradient)","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q103522257","al":null},{"n":"Canvas","d":"canvas.inc","s":"Construction robotics","w":"Drywall-finishing robots","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:canvas","al":null},{"n":"Charge Robotics","d":"chargerobotics.com","s":"Construction robotics","w":"Robots for utility-scale solar installation","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:charge-robotics","al":null},{"n":"Earthgrid","d":"earthgrid.io","s":"Construction robotics","w":"Rapid tunnel-boring robots","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q115940385","al":null},{"n":"Bellabeat","d":"bellabeat.com","s":"Consumer hardware","w":"Health-tracking wearables and jewelry","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:bellabeat","al":null},{"n":"Juul","d":"juul.com","s":"Consumer hardware","w":"Vapor products","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q21017093","al":null},{"n":"LoveFrom","d":"lovefrom.com","s":"Consumer hardware","w":"Design firm founded by Jony Ive, hardware products","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q125142571","al":null},{"n":"PAX Labs","d":"paxvapor.com","s":"Consumer hardware","w":"Cannabis vaporizers","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q18158575","al":null},{"n":"Petcube","d":"petcube.com","s":"Consumer hardware","w":"Pet-monitoring cameras","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:petcube","al":null},{"n":"eero","d":"eero.com","s":"Consumer hardware","w":"Mesh WiFi systems (acquired by Amazon)","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q100711695","al":true},{"n":"General Matter","d":"generalmatter.com","s":"Energy","w":"Uranium enrichment for the next generation of nuclear power","st":"","o":132,"a":"Greenhouse","b":"https://www.trydemigod.com/c/wd:Q134369638","al":null},{"n":"Gridware","d":"gridware.io","s":"Energy","w":"Grid-mounted sensors for wildfire and outage detection","st":"Growth","o":22,"a":"Lever","b":"https://www.trydemigod.com/c/yc:gridware","al":null},{"n":"Marathon Fusion","d":"marathonfusion.com","s":"Energy","w":"Fusion power fuel-cycle technology","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q138685341","al":null},{"n":"Maritime Fusion","d":"maritimefusion.com","s":"Energy","w":"Compact fusion reactors for maritime applications","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:maritime-fusion","al":null},{"n":"Oklo","d":"oklo.com","s":"Energy","w":"Small modular nuclear fission reactors","st":"","o":72,"a":"Greenhouse","b":"https://www.trydemigod.com/c/hn:oklo.com","al":null},{"n":"Samsara","d":"samsara.com","s":"Industrial IoT","w":"Connected sensors and cameras for fleet and industrial operations","st":"","o":259,"a":"Greenhouse","b":"https://www.trydemigod.com/c/wd:Q108770716","al":null},{"n":"Diamond Foundry","d":"diamondfoundry.com","s":"Manufacturing","w":"Lab-grown diamond production","st":"","o":44,"a":"Lever","b":"https://www.trydemigod.com/c/wd:Q23016777","al":null},{"n":"MycoWorks","d":"mycoworks.com","s":"Manufacturing","w":"Mycelium-based leather alternative, grown in a Bay Area plant","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q27150191","al":null},{"n":"3Scan","d":"3scan.com","s":"Medical devices","w":"Automated tissue-section imaging systems","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q39060910","al":null},{"n":"Aluna","d":"alunadata.com","s":"Medical devices","w":"Home spirometry for respiratory disease","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:aluna","al":null},{"n":"Ananya Health","d":"ananya.health","s":"Medical devices","w":"Cervical cancer screening device","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:ananya-health","al":null},{"n":"Andromeda Surgical","d":"andromedasurgical.com","s":"Medical devices","w":"Surgical robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:andromeda-surgical","al":null},{"n":"Bodyport","d":"bodyport.com","s":"Medical devices","w":"Cardiac-monitoring scale","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:bodyport","al":null},{"n":"DeepSight Technology","d":"deepsightinc.applicantpro.com","s":"Medical devices","w":"Ultrasound imaging technology","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/hn:deepsightinc.applicantpro.com","al":null},{"n":"Knox Medical Diagnostics (United States)","d":"knox.co","s":"Medical devices","w":"Diagnostic devices","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q43895801","al":null},{"n":"Mission Bio (United States)","d":"missionbio.com","s":"Medical devices","w":"Single-cell DNA analysis instruments","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q30267283","al":null},{"n":"Myolex (United States)","d":"myolex.com","s":"Medical devices","w":"Muscle-assessment devices","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q50039394","al":null},{"n":"Neuralink","d":"neuralink.com","s":"Medical devices","w":"Brain-computer interface implants","st":"","o":79,"a":"Greenhouse","b":"https://www.trydemigod.com/c/wd:Q29043471","al":null},{"n":"Qardio","d":"getqardio.com","s":"Medical devices","w":"Connected blood-pressure and ECG monitors","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q25022018","al":null},{"n":"Qvin","d":"qvin.com","s":"Medical devices","w":"Menstrual-blood diagnostic platform","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:qvin","al":null},{"n":"Zenflow","d":"zenflow.com","s":"Medical devices","w":"Urology medical devices","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:zenflow","al":null},{"n":"iRhythm (United States)","d":"irhythmtech.com","s":"Medical devices","w":"Wearable cardiac monitoring patches","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q30264118","al":null},{"n":"iSono Health","d":"isonohealth.com","s":"Medical devices","w":"Portable automated breast ultrasound","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:isono-health","al":null},{"n":"Andon Labs","d":"andonlabs.com","s":"Robotics","w":"Robot control and teleoperation","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:andon-labs","al":null},{"n":"AutoPallet Robotics","d":"autopallet.bot","s":"Robotics","w":"Robotic palletizing","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:autopallet-robotics","al":null},{"n":"Azalea Robotics Corporation","d":"azalearobotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:azalea-robotics-corporation","al":null},{"n":"Bossa Nova Robotics","d":"bossanova.com","s":"Robotics","w":"Retail inventory-scanning robots","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q67572764","al":null},{"n":"Cargo Robotics","d":"withcargo.com","s":"Robotics","w":"Robotics","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/hn:withcargo.com","al":null},{"n":"Corvus Robotics","d":"corvus-robotics.com","s":"Robotics","w":"Autonomous warehouse inventory drones","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:corvus-robotics","al":null},{"n":"Cosmic Robotics","d":"cosmicrobotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:cosmic-robotics","al":null},{"n":"DeepAware AI (Robotics Center of Silicon Valley)","d":"roboticscenter.ai","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:deepaware-ai-robotics-center-of-silicon-valley","al":null},{"n":"Double Robotics","d":"doublerobotics.com","s":"Robotics","w":"Telepresence robots","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:double-robotics","al":null},{"n":"Earendil Robotics","d":"earendil.io","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:earendil-robotics","al":null},{"n":"Eden Robotics","d":"edenrobotics.ai","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:eden-robotics","al":null},{"n":"Ember Robotics","d":"emberrobotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:ember-robotics","al":null},{"n":"Forge Robotics","d":"forge-robotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:forge-robotics","al":null},{"n":"Hebbian Robotics","d":"hebbianrobotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:hebbian-robotics","al":null},{"n":"Hermes Robotics","d":"hermes-robotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:hermes-robotics","al":null},{"n":"IMPACT Drones","d":"impact-drones.com","s":"Robotics","w":"Drones","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:impact-drones","al":null},{"n":"InLoop Robotics","d":"inloop-robotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:inloop-robotics","al":null},{"n":"Lambda Robotics","d":"lambdarobotics.ai","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:lambda-robotics","al":null},{"n":"Libra Robotics","d":"librabots.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:libra-robotics","al":null},{"n":"Mashgin","d":"mashgin.com","s":"Robotics","w":"AI self-checkout kiosks","st":"Growth","o":15,"a":"Lever","b":"https://www.trydemigod.com/c/yc:mashgin","al":null},{"n":"Most Robotic","d":"mostrobotic.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:most-robotic","al":null},{"n":"Multiply Labs","d":"multiplylabs.com","s":"Robotics","w":"Robotic systems for pharmaceutical manufacturing","st":"Growth","o":7,"a":"Lever","b":"https://www.trydemigod.com/c/yc:multiply-labs","al":null},{"n":"Orangewood Labs","d":"orangewood.co","s":"Robotics","w":"Affordable robotic arms","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:orangewood-labs","al":null},{"n":"Origami Robotics","d":"origami-robotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:origami-robotics","al":null},{"n":"Overview","d":"overview.ai","s":"Robotics","w":"Factory cameras and inspection systems","st":"Growth","o":38,"a":"Ashby","b":"https://www.trydemigod.com/c/yc:overview","al":null},{"n":"Pave Robotics","d":"pave-robotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:pave-robotics","al":null},{"n":"Polymath Robotics","d":"polymathrobotics.com","s":"Robotics","w":"Autonomy software and systems for industrial vehicles","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:polymath-robotics","al":null},{"n":"Praxis Robotics","d":"praxisrobotics.io","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:praxis-robotics","al":null},{"n":"Skydio","d":"skydio.com","s":"Robotics","w":"Autonomous drones for defense, public safety, and inspection","st":"","o":131,"a":"Ashby","b":"https://www.trydemigod.com/c/wd:Q97321374","al":null},{"n":"Weave Robotics","d":"weaverobotics.com","s":"Robotics","w":"Robotics","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:weave-robotics","al":null},{"n":"Atom Computing","d":"","s":"Semiconductors","w":"Neutral-atom quantum computers","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/hn%3Ajobs.lever.co%2Fatomcomputing","al":null},{"n":"Ayar Labs (United States)","d":"ayarlabs.com","s":"Semiconductors","w":"Optical interconnect chiplets","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q30267578","al":null},{"n":"Cerebras","d":"cerebras.ai","s":"Semiconductors","w":"Wafer-scale AI chips and systems","st":"","o":111,"a":"Ashby","b":"https://www.trydemigod.com/c/wd:Q66604886","al":null},{"n":"Conductor Quantum","d":"conductorquantum.com","s":"Semiconductors","w":"Quantum computing systems","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:conductor-quantum","al":null},{"n":"Inversion Semiconductor","d":"inversionsemi.com","s":"Semiconductors","w":"Chip manufacturing technology","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:inversion-semiconductor","al":null},{"n":"Neuromorphic","d":"neuromorphic.vision","s":"Semiconductors","w":"Neuromorphic computing","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:neuromorphic","al":null},{"n":"Substrate","d":"substrate.cc","s":"Semiconductors","w":"X-ray lithography for advanced chips","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:substrate","al":null},{"n":"Visibl Semiconductors","d":"visiblsemi.com","s":"Semiconductors","w":"Semiconductors","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:visibl-semiconductors","al":null},{"n":"AmberBox Gunshot Detection","d":"amberbox.com","s":"Sensors","w":"Gunshot-detection sensor networks","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:amberbox-gunshot-detection","al":null},{"n":"Enhanced Radar","d":"enhancedradar.com","s":"Sensors","w":"Radar systems","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:enhanced-radar","al":null},{"n":"Focal Systems","d":"focal.systems","s":"Sensors","w":"Retail shelf cameras","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:focal-systems","al":null},{"n":"Ouster","d":"ouster.com","s":"Sensors","w":"Digital lidar sensors","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q97574745","al":null},{"n":"Standard AI","d":"standard.ai","s":"Sensors","w":"Autonomous checkout camera systems","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:standard-ai","al":null},{"n":"Sunflower","d":"sunflowerclinic.com","s":"Sensors","w":"Home-security drone systems","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:sunflower","al":null},{"n":"VergeSense","d":"vergesense.com","s":"Sensors","w":"Workplace occupancy sensors","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:vergesense","al":null},{"n":"Zendar","d":"zendar.io","s":"Sensors","w":"High-definition radar for autonomous systems","st":"Growth","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:zendar","al":null},{"n":"Array Labs","d":"arraylabs.io","s":"Space","w":"Radar imaging satellite constellation","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:array-labs","al":null},{"n":"Astranis","d":"astranis.com","s":"Space","w":"Geostationary communications satellites","st":"Growth","o":89,"a":"Greenhouse","b":"https://www.trydemigod.com/c/yc:astranis","al":null},{"n":"AxionOrbital Space","d":"axionorbital.space","s":"Space","w":"Orbital infrastructure","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:axionorbital-space","al":null},{"n":"Cascade Space","d":"cascadespace.com","s":"Space","w":"Spacecraft communications infrastructure","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:cascade-space","al":null},{"n":"General Astronautics","d":"generalastro.com","s":"Space","w":"Spacecraft systems","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:generalastro","al":null},{"n":"Loft Orbital","d":"loftorbital.com","s":"Space","w":"Satellite-as-a-service infrastructure","st":"","o":57,"a":"Lever","b":"https://www.trydemigod.com/c/wd:Q136918026","al":null},{"n":"Planet Labs","d":"planet.com","s":"Space","w":"Earth-imaging satellite constellation","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q17085620","al":null},{"n":"SpaceFlow Technologies, Inc.","d":"spaceflow.tech","s":"Space","w":"Space propulsion and fluid systems","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:spaceflow-technologies-inc","al":null},{"n":"Spire Global","d":"spire.com","s":"Space","w":"CubeSat constellation for weather, maritime, and aviation data","st":"","o":38,"a":"Greenhouse","b":"https://www.trydemigod.com/c/wd:Q19877982","al":null},{"n":"Lit Motors","d":"litmotors.com","s":"Transportation","w":"Self-balancing enclosed electric two-wheelers","st":"","o":null,"a":null,"b":"https://www.trydemigod.com/c/wd:Q6647356","al":null},{"n":"Navier AI","d":"navier.ai","s":"Transportation","w":"Electric hydrofoil boats","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:navier-ai","al":null},{"n":"Revoy","d":"revoy.com","s":"Transportation","w":"Electric powertrain add-ons for semi trucks","st":"Early","o":null,"a":null,"b":"https://www.trydemigod.com/c/yc:revoy","al":null}]');
var HW_GUIDE_SLUGS = ["prototyping", "certification", "contract-manufacturers", "community", "fundraising"];
var HW_GUIDE_TITLES = {
  prototyping: "Prototyping in SF: shops, hackerspaces, and rapid fabrication",
  certification: "Where to get certified: EMC, safety, and FCC testing near SF",
  "contract-manufacturers": "Picking a contract manufacturer",
  community: "The SF hardware community: meetups, spaces, and events",
  fundraising: "Raising money for a hardware startup in SF"
};
var HW_SUPPLEMENT = JSON.parse('[{"n":"Aclima","d":"aclima.earth","s":"Sensors","w":"Air-quality mapping sensor networks","hq":"San Francisco CA","sf":1},{"n":"Aeva","d":"aeva.com","s":"Sensors","w":"4D lidar for autonomy","hq":"Mountain View CA","sf":0},{"n":"Antora Energy","d":"antora.com","s":"Energy","w":"Thermal batteries for industrial heat","hq":"Sunnyvale CA","sf":0},{"n":"Archer","d":"archer.com","s":"Aerospace","w":"Electric vertical-takeoff aircraft","hq":"San Jose CA","sf":0},{"n":"Bedrock Robotics","d":"bedrockrobotics.com","s":"Robotics","w":"Autonomous construction machinery","hq":"San Francisco CA","sf":1},{"n":"Brimstone","d":"brimstone.com","s":"Manufacturing","w":"Low-carbon cement and critical minerals","hq":"Oakland CA","sf":0},{"n":"Capella Space","d":"capellaspace.com","s":"Aerospace","w":"SAR satellite imagery","hq":"San Francisco CA","sf":1},{"n":"Charm Industrial","d":"charmindustrial.com","s":"Energy","w":"Bio-oil carbon removal and sequestration","hq":"San Francisco CA","sf":1},{"n":"Chef Robotics","d":"chefrobotics.ai","s":"Robotics","w":"Robotic systems for food production","hq":"San Francisco CA","sf":1},{"n":"Dexterity","d":"dexterity.com","s":"Robotics","w":"Enterprise physical-AI robots for warehouses","hq":"Redwood City CA","sf":0},{"n":"Dusty Robotics","d":"dustyrobotics.com","s":"Robotics","w":"Construction layout printing robot (BIM-to-field)","hq":"Mountain View CA","sf":0},{"n":"Figure","d":"figure.ai","s":"Robotics","w":"Autonomous humanoid robots","hq":"San Jose CA","sf":0},{"n":"Gatik","d":"gatik.ai","s":"Robotics","w":"Autonomous middle-mile delivery trucks","hq":"Mountain View CA","sf":0},{"n":"Groq","d":"groq.com","s":"Chips","w":"LPU AI inference chips and platform","hq":"Mountain View CA","sf":0},{"n":"Heirloom","d":"heirloomcarbon.com","s":"Energy","w":"Direct air capture carbon removal","hq":"Brisbane CA","sf":0},{"n":"Kodiak","d":"kodiak.ai","s":"Robotics","w":"Autonomous trucking","hq":"Mountain View CA","sf":0},{"n":"Lunar Energy","d":"lunarenergy.com","s":"Energy","w":"Home battery and clean-energy systems","hq":"Mountain View CA","sf":0},{"n":"Monarch Tractor","d":"monarchtractor.com","s":"Robotics","w":"Electric autonomous tractors","hq":"Livermore CA","sf":0},{"n":"Muon Space","d":"muonspace.com","s":"Aerospace","w":"Satellite constellations + production facilities","hq":"Mountain View CA","sf":0},{"n":"Nuro","d":"nuro.ai","s":"Robotics","w":"Autonomous delivery vehicles","hq":"Mountain View CA","sf":0},{"n":"Physical Intelligence","d":"pi.website","s":"Robotics","w":"General-purpose robot foundation models","hq":"San Francisco CA","sf":1},{"n":"PsiQuantum","d":"psiquantum.com","s":"Chips","w":"Silicon-photonic quantum computing","hq":"Palo Alto CA","sf":0},{"n":"QuantumScape","d":"quantumscape.com","s":"Energy","w":"Solid-state lithium-metal batteries","hq":"San Jose CA","sf":0},{"n":"Quilt","d":"quilt.com","s":"Energy","w":"Home heat pump systems","hq":"Redwood City CA","sf":0},{"n":"Rigetti","d":"rigetti.com","s":"Chips","w":"Superconducting quantum computers + Fab-1","hq":"Berkeley CA","sf":0},{"n":"Saildrone","d":"saildrone.com","s":"Robotics","w":"Autonomous ocean-survey vessels","hq":"Alameda CA","sf":0},{"n":"SambaNova","d":"sambanova.ai","s":"Chips","w":"AI chips and full-stack AI platform","hq":"Palo Alto CA","sf":0},{"n":"SiFive","d":"sifive.com","s":"Chips","w":"RISC-V processor IP","hq":"Santa Clara CA","sf":0},{"n":"Sila","d":"silanano.com","s":"Chips","w":"Silicon-anode battery materials","hq":"Alameda CA","sf":0},{"n":"Simbe Robotics","d":"simberobotics.com","s":"Robotics","w":"Tally autonomous retail inventory robot","hq":"South San Francisco CA","sf":0},{"n":"Span","d":"span.io","s":"Energy","w":"Smart home electrical panel and EV charging","hq":"San Francisco CA","sf":1},{"n":"Twelve","d":"twelve.co","s":"Energy","w":"Power-to-X carbon transformation (fuels/chemicals)","hq":"Berkeley CA","sf":0},{"n":"Verkada","d":"verkada.com","s":"Sensors","w":"Enterprise physical security cameras and platform","hq":"San Mateo CA","sf":0},{"n":"Wisk","d":"wisk.aero","s":"Aerospace","w":"Autonomous self-flying eVTOL air taxi","hq":"Mountain View CA","sf":0},{"n":"Zipline","d":"zipline.com","s":"Aerospace","w":"Autonomous drone delivery and instant logistics","hq":"South San Francisco CA","sf":0},{"n":"Zoox","d":"zoox.com","s":"Robotics","w":"Purpose-built robotaxi vehicles","hq":"Foster City CA","sf":0}]');
function hwSupplementRow(c) {
  const hq = escapeHtml(c.hq.replace(/ CA$/, ""));
  return `<div class="row"><span class="name"><a href="https://${escapeHtml(c.d)}">${escapeHtml(c.n)}</a></span> <span class="domain">${escapeHtml(c.d)}</span><p class="meta">${escapeHtml(c.w)} \xB7 ${escapeHtml(c.s)} \xB7 ${hq}${c.sf ? ' \xB7 <span class="quiet">SF</span>' : ""}</p></div>`;
}
__name(hwSupplementRow, "hwSupplementRow");
function hwSupplementSection() {
  const list = [...HW_SUPPLEMENT].sort((a, b) => a.n.localeCompare(b.n));
  return `<h2>Off-board supplement (${list.length})</h2><p class="meta">Major Bay Area hardware companies not on Demigod's companies board, sourced and verified one by one in Sep 2026 (domain, HQ, hiring). HQ city shown per row; SF marks a San Francisco headquarters, the rest are elsewhere in the Bay. Not yet hand-tagged into the directory above.</p><div class="list">${list.map(hwSupplementRow).join("")}</div>`;
}
__name(hwSupplementSection, "hwSupplementSection");
function isHardwarePath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/hardware" || path === "/hardware/directory" || path === "/hardware/signals")
    return true;
  const m = path.match(/^\/hardware\/guides\/([a-z-]+)$/);
  return !!m && HW_GUIDE_SLUGS.includes(m[1]);
}
__name(isHardwarePath, "isHardwarePath");
function hwFooterBlurb() {
  return `<footer class="foot"><p class="honesty">Hardware SF is a project by Demigod, a technical recruiting partner for startups. We place founding and senior engineers at 10% of first-year cash compensation: no retainer, no 25-30% agency fees, and you pay only when your hire starts. Hiring for a hardware team? <a href="/?wiz=startup">Start a brief</a> or email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. <a href="/room">Project Room</a>.</p></footer>`;
}
__name(hwFooterBlurb, "hwFooterBlurb");
function hwCorrectionCta() {
  return `<p class="quiet">Missing company or wrong tag? Email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a> with the company name and what to fix.</p>`;
}
__name(hwCorrectionCta, "hwCorrectionCta");
function hwCompanyRow(c) {
  const open = c.o ? ` \xB7 ${c.o} open role${c.o === 1 ? "" : "s"}` : "";
  const alumni = c.al ? ` \xB7 <span class="quiet">alumni</span>` : "";
  return `<div class="row"><span class="name"><a href="${escapeHtml(c.b)}">${escapeHtml(c.n)}</a></span> <span class="domain">${escapeHtml(c.d)}</span><p class="meta">${escapeHtml(c.w)} \xB7 ${escapeHtml(c.st)}${escapeHtml(open)}${alumni}</p></div>`;
}
__name(hwCompanyRow, "hwCompanyRow");
function hwDirectoryHtml() {
  const bySector = /* @__PURE__ */ new Map();
  for (const c of HW_COMPANIES) {
    if (!bySector.has(c.s))
      bySector.set(c.s, []);
    bySector.get(c.s).push(c);
  }
  const sectors = [...bySector.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [, list] of sectors)
    list.sort((a, b) => a.n.localeCompare(b.n));
  const groups = sectors.map(([sector, list]) => `<h2>${escapeHtml(sector)} (${list.length})</h2><div class="list">${list.map(hwCompanyRow).join("")}</div>`).join("");
  return demigodPage(
    "SF Hardware Company Directory: 99 Companies Building Physical Things",
    motleyChrome(`<p class="facts-line">SF \xB7 Hardware \xB7 Public company facts.</p><h1>The SF hardware directory</h1><p class="lede">99 companies, hand-tagged by sector, sourced from Demigod's own public SF companies board (<a href="/companies">trydemigod.com/companies</a>) and verified one by one. A company is listed when it designs or builds a physical product and has a San Francisco presence. Pure software and therapeutics companies are out. Each row links to the company's profile on the source board.</p>${groups}${hwSupplementSection()}${hwCorrectionCta()}${hwFooterBlurb()}`),
    {
      url: "https://www.trydemigod.com/hardware/directory",
      description: "Every hardware company we can verify in San Francisco, sorted by sector: robotics, space, semiconductors, medical devices, sensors, energy, and more."
    }
  );
}
__name(hwDirectoryHtml, "hwDirectoryHtml");
function hwSignalsHtml() {
  const hiring = HW_COMPANIES.filter((c) => c.o).sort((a, b) => b.o - a.o || a.n.localeCompare(b.n));
  const rows = hiring.map((c) => {
    const board = `<a href="${escapeHtml(c.b)}">${escapeHtml(c.n)}</a>`;
    const ats = c.a ? ` \xB7 <a href="${escapeHtml(c.a)}">jobs</a>` : "";
    return `<div class="row"><span class="name">${board}</span> <span class="domain">${escapeHtml(c.d)}</span><p class="meta">${c.o} open role${c.o === 1 ? "" : "s"} observed \xB7 ${escapeHtml(c.s)} \xB7 ${escapeHtml(c.w)}${ats}</p></div>`;
  }).join("");
  return demigodPage(
    "SF Hardware Hiring Signals: Who Is Hiring Right Now",
    motleyChrome(`<p class="facts-line">SF \xB7 Hardware \xB7 Hiring signals.</p><h1>Who is hiring in SF hardware</h1><p class="lede">Hiring is the most honest signal a company sends. This page tracks open roles we have observed across the SF hardware directory, refreshed from live job boards. Right now ${hiring.length} of the 99 companies in the directory have observed openings, from wafer-scale chips to warehouse drones.</p><p class="count">${hiring.length} companies with observed openings, sorted by count. Snapshot as of 2026-09-10; the directory rows link back to the source board.</p><div class="list">${rows}</div>${hwCorrectionCta()}${hwFooterBlurb()}`),
    {
      url: "https://www.trydemigod.com/hardware/signals",
      description: "Live hiring signals from San Francisco hardware companies: which robotics, space, chip, and device startups have open roles this week."
    }
  );
}
__name(hwSignalsHtml, "hwSignalsHtml");
function hwHubHtml() {
  const hiring = HW_COMPANIES.filter((c) => c.o).length;
  const guideLinks = HW_GUIDE_SLUGS.map((s) => `<p class="meta"><a href="/hardware/guides/${s}">${escapeHtml(HW_GUIDE_TITLES[s])}</a></p>`).join("");
  return demigodPage(
    "San Francisco Hardware Startups: Directory, Jobs Signals, and Guides",
    motleyChrome(`<p class="facts-line">SF \xB7 Hardware \xB7 A Demigod project.</p><h1>San Francisco builds atoms again.</h1><p class="lede">Software ate the world from this city, and now the city is building the world back. Robots are welded in SoMa, satellites are assembled in the Mission, chips are taped out in SoMa lofts, and fusion hardware is bolted together near the shipyard. This is the map: every hardware company we can verify in San Francisco, what they are hiring for, and the local knowledge you need to build physical things here.</p><h2>The directory</h2><p>99 hardware companies with a San Francisco presence: robotics, satellites, medical devices, chips, sensors, energy, and the machines that make machines. Each entry shows the company, what it builds, its stage, and open roles we have observed. <a href="/hardware/directory">Browse the directory</a>.</p><h2>Hiring signals</h2><p>Who is hiring hardware engineers in SF right now, refreshed from live job-board data. Useful if you are an engineer looking for a hardware team, or a founder watching who is scaling. <a href="/hardware/signals">See the signals</a>.</p><h2>Field guides</h2><p>Local knowledge for building hardware in the Bay Area, written for founders and engineers:</p>${guideLinks}<h2>About this project</h2><p>This hub is maintained by Demigod, a technical recruiting partner for startups based in San Francisco. We place engineers at hardware and software companies at 10% of first-year cash compensation, with no retainer and no 25-30% agency fees; you pay only when your hire starts. Company data starts from Demigod's own public SF companies board (<a href="/companies">trydemigod.com/companies</a>) and is curated by hand. If your company is missing or miscategorized, <a href="mailto:potter@trydemigod.com">tell us</a>.</p>${hwFooterBlurb()}`),
    {
      url: "https://www.trydemigod.com/hardware",
      description: "A map of San Francisco's hardware scene: 99 hardware companies, live hiring signals, and field guides to prototyping, certification labs, contract manufacturers, and the local community."
    }
  );
}
__name(hwHubHtml, "hwHubHtml");
var HW_GUIDE_BODIES = {
  prototyping: {
    seoTitle: "Prototyping in SF: Machine Shops, Hackerspaces, and Fast Parts",
    seoDesc: "Where to build hardware prototypes in San Francisco: local shops and hackerspaces, plus the on-demand fabrication services Bay Area teams actually use.",
    body: `<p class="lede">Every hardware company in this city starts the same way: a bench, a prototype that almost works, and a scramble to find someone who can cut the next revision. Here is where that scramble ends.</p><h2>Spaces where you can build</h2><p><strong>Noisebridge (Mission):</strong> SF's long-running volunteer hackerspace. Electronics benches, 3D printers, sewing, and a culture of teaching. Free to visit, run on donations.</p><p><strong>Circuit Launch (Oakland):</strong> The Bay Area's robotics coworking space. Bench space, machine shop access, and a building full of teams at the same stage as you. Many of the robotics companies in our directory have passed through.</p><p><strong>The Crucible (Oakland):</strong> Industrial arts education: welding, machining, foundry, glass. Take a class, then use the open studio hours for your own work.</p><p><strong>Hacker Dojo (Mountain View):</strong> South Bay hackerspace with electronics and fabrication tooling, and a deep bench of hardware members.</p><h2>When you need it done for you</h2><p>Bay Area teams typically split prototype fabrication between on-demand services and local shops:</p><p><strong>On-demand:</strong> Fictiv (SF-founded), Xometry, Protolabs, and Plethora handle CNC, sheet metal, and 3D printing with fast quotes online. Expect days, not weeks.</p><p><strong>PCBs:</strong> OSH Park and JLCPCB for boards; local assembly shops in San Jose and Fremont for populated runs. Many teams hand-solder the first five boards and outsource from board six onward.</p><p><strong>Local job shops:</strong> the industrial corridor from Dogpatch through Bayview and down to San Jose still has machine shops that take walk-in work. Bring a drawing, not a SketchUp screenshot.</p><h2>Practical notes</h2><p>Budget for iteration, not parts. The teams that move fast treat each prototype as a question and order the next revision the day a test fails. Also: SF rents punish inventory. Design for a bench, not a warehouse, until you know you need one.</p>`
  },
  certification: {
    seoTitle: "EMC, Safety, and FCC Certification Labs Near San Francisco",
    seoDesc: "Where Bay Area hardware startups get EMC, radio, and safety certification: local test labs, what to test first, and how to avoid the classic first-pass failures.",
    body: `<p class="lede">Certification is where hardware schedules go to die. The Bay Area is unusually good for this: some of the country's largest compliance labs are a short drive away, and pre-compliance testing here can save you a full redesign cycle.</p><h2>The labs</h2><p><strong>Bay Area Compliance Laboratories (BACL), Sunnyvale:</strong> A major independent lab for FCC, CE, and wireless testing. Common first stop for SF startups.</p><p><strong>National labs with local offices:</strong> Intertek, TUV, UL Solutions, and Element all operate in the Bay Area and can bundle safety (UL/IEC), EMC, and radio certification into one program.</p><p><strong>Specialty wireless labs:</strong> if your product is radio-heavy (cellular, WiFi, Bluetooth, UWB), ask labs about their CTIA and carrier-certification experience up front, not after the first failure.</p><h2>What to test, in what order</h2><p>Run pre-compliance EMC scans early, on your first real board spin. Radiated emissions failures almost always trace back to board layout, and layout is cheapest to change before the enclosure is tooled. Safety testing (UL 62368 for most electronics) can run in parallel once the design is stable. Budget one full test cycle as a loss: plan for two.</p><h2>Practical notes</h2><p>Ask the lab for a test plan review before you book time; good labs will flag missing requirements (battery transport testing, UN 38.3, is the classic one) before they cost you a slot. And book early: lab queues in the Bay Area run weeks long at the end of the year when everyone is pushing for a holiday ship date.</p>`
  },
  "contract-manufacturers": {
    seoTitle: "Picking a Contract Manufacturer: A Guide for SF Hardware Startups",
    seoDesc: "How Bay Area hardware startups choose a contract manufacturer: local options, when to go overseas, and the questions that separate good CMs from expensive lessons.",
    body: `<p class="lede">Your contract manufacturer will teach you things about your own product you did not want to know. Choose the one that teaches early and cheaply.</p><h2>The landscape</h2><p><strong>Local and large:</strong> the South Bay is home to some of the biggest electronics manufacturers on earth, including Sanmina, Flex, and Jabil. Their floors in San Jose and Fremont mostly serve larger customers, but their new-product-introduction (NPI) programs exist to catch companies at exactly your stage.</p><p><strong>Local and small:</strong> the Bay Area still has independent assembly shops that take runs of hundreds. They cost more per unit and save it back in iteration speed: an engineer can drive to the line, look at the failure, and change the process the same day.</p><p><strong>Overseas:</strong> for consumer volumes, most SF companies end up in Shenzhen or Southeast Asia, often through a broker or a platform like Fictiv. Go overseas when your design is stable and your volumes justify the tooling; going early is how you end up air-freighting scrap.</p><h2>The questions that matter</h2><p>Who else at my stage and in my category do you build for? (Ask for two references and call them.)</p><p>What does your engineering review of my design look like before the quote? A CM that quotes without a DFM pass is quoting the rework too.</p><p>Who owns the tooling, and what happens to it if we leave?</p><p>What is your line-down charge when my parts are late?</p><h2>Practical notes</h2><p>Start local, scale out. The first three builds exist to teach you your product; the fourth exists to make money. Companies that offshore build one usually pay for the lesson twice.</p>`
  },
  community: {
    seoTitle: "The SF Hardware Community: Meetups, Spaces, and Events",
    seoDesc: "Where San Francisco's hardware community gathers: meetups, coworking spaces, and events for robotics, electronics, and manufacturing people.",
    body: `<p class="lede">Hardware looks lonely from the outside. It is not. SF's hardware scene is dense, welcoming, and weirdly good at answering emails from strangers.</p><h2>Recurring community</h2><p><strong>Circuit Launch (Oakland):</strong> the closest thing the scene has to a clubhouse. Events, demos, and open houses; most of the Bay Area robotics community passes through.</p><p><strong>Noisebridge (Mission):</strong> weekly circuit hacking and open nights. The fastest way to meet people who solder for fun.</p><p><strong>Hardware meetups:</strong> hardware and robotics meetup groups run regularly in SF and the East Bay; search Meetup and Luma for current series, since schedules shift.</p><p><strong>University programs:</strong> Berkeley and Stanford host public talks, demo days, and robotics showcases that welcome industry people.</p><h2>Online</h2><p>Hackaday and its events, the EEVblog forums, and category Discords are where the practical knowledge lives. Locally, many teams coordinate through alumni channels from YC and from the spaces above.</p><h2>Practical notes</h2><p>Bring a prototype. The social currency of this community is a thing you made that half works; nobody will remember your pitch, everyone will remember the robot that fell off the table.</p>`
  },
  fundraising: {
    seoTitle: "Raising Money for a Hardware Startup in SF",
    seoDesc: "How to raise venture money for a hardware startup in San Francisco: what investors need to see, which firms fund hardware, and how to price the round.",
    body: `<p class="lede">The line "hardware is hard" was written by investors who got burned funding it. It is also out of date. The current generation of SF hardware companies (drones, satellites, fusion, robots) raised serious rounds because they understood what the money needs to see.</p><h2>What hardware investors actually underwrite</h2><p><strong>A working thing.</strong> Not a render. The bar is a prototype that demonstrates the physics, not the polish.</p><p><strong>A cost curve, not a cost.</strong> Nobody expects your first unit to be cheap. They expect you to show, line by line, why unit one thousand will be.</p><p><strong>A wedge market that pays before scale.</strong> The companies that raised well sold something narrow and expensive first (defense, industrial inspection, research labs) and used the revenue to fund the broad market.</p><p><strong>A team that has shipped atoms.</strong> This is the most fundable asset and the hardest to fake. (It is also, not coincidentally, what we recruit for.)</p><h2>Who funds hardware here</h2><p>SF and the broader Bay Area have a deep bench of firms with hardware theses: deep-tech funds, climate funds, defense-tech funds, and generalist firms that learned hardware through their drone and satellite portfolios. YC's hardware cohorts remain a real on-ramp, and several hardware-first funds run out of the city. The list changes fast; a warm intro from another hardware founder beats any list, including this one.</p><h2>Practical notes</h2><p>Raise for the milestone that removes physics risk, not for a calendar runway. Hardware rounds priced on software-style "18 months of runway" thinking tend to run out of money one prototype short of the data room.</p>`
  }
};
function hwGuideHtml(slug) {
  const guide = HW_GUIDE_BODIES[slug];
  return demigodPage(
    guide.seoTitle,
    motleyChrome(`<p class="facts-line">SF \xB7 Hardware \xB7 Field guide.</p><h1>${escapeHtml(HW_GUIDE_TITLES[slug])}</h1>${guide.body}<p class="quiet">Last verified Sep 2026. Named spots are starting points from community knowledge, not endorsements.</p><p class="meta"><a href="/hardware">Hardware SF hub</a> \xB7 <a href="/hardware/directory">Directory</a> \xB7 <a href="/hardware/signals">Signals</a></p>${hwFooterBlurb()}`),
    {
      url: `https://www.trydemigod.com/hardware/guides/${slug}`,
      description: guide.seoDesc
    }
  );
}
__name(hwGuideHtml, "hwGuideHtml");
function hardwareEdge(request, url) {
  const path = String(url.pathname || "").replace(/\/+$/, "") || "/";
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  let html = null;
  let edge = "hardware";
  if (path === "/hardware")
    html = hwHubHtml();
  else if (path === "/hardware/directory") {
    html = hwDirectoryHtml();
    edge = "hardware-directory";
  } else if (path === "/hardware/signals") {
    html = hwSignalsHtml();
    edge = "hardware-signals";
  } else {
    const m = path.match(/^\/hardware\/guides\/([a-z-]+)$/);
    if (m && HW_GUIDE_SLUGS.includes(m[1])) {
      html = hwGuideHtml(m[1]);
      edge = "hardware-guide";
    }
  }
  if (!html) {
    const nf = htmlResponse(demigodNotFoundHtml(), 404, "not-found");
    nf.headers.set("X-Robots-Tag", "noindex, follow");
    return new Response(request.method === "HEAD" ? null : nf.html, { status: nf.status, headers: nf.headers });
  }
  const { html: out, status, headers } = htmlResponse(html, 200, edge);
  return new Response(request.method === "HEAD" ? null : out, { status, headers });
}
__name(hardwareEdge, "hardwareEdge");
// Staging door only — no production Room custom domain in this tree.
var PROJECT_ROOM_HREF = "https://project-room-staging.getdasha.workers.dev";
var COMPUTE_HREF = "https://getdasha.com/compute";
var ROOM_DOOR = "https://www.trydemigod.com/room";
var ROOM_PUBLIC_WWW = "https://www.getdasha.com/room";
var ROOM_PUBLIC_LOBBY = "https://lobby.getdasha.com/room";
var ROOM_SOURCE = "https://github.com/Uuriko/project-room";
var ROOM_COMPUTE_DOOR = "https://www.getdasha.com/compute";
var ROOM_DOCS = {
  client: `${ROOM_SOURCE}/blob/main/docs/AGENT-CLIENT.md`,
  plug: `${ROOM_SOURCE}/blob/main/docs/AGENT-PLUG.md`,
  hosts: `${ROOM_SOURCE}/blob/main/docs/AGENT-HOSTS.md`,
  discovery: `${ROOM_SOURCE}/blob/main/docs/DISCOVERY-FOR-AGENTS.md`,
  guestAgent: `${ROOM_SOURCE}/blob/main/docs/GUEST-AGENT-LINKS.md`,
  agentsWant: `${ROOM_SOURCE}/blob/main/docs/AGENTS-WANT.md`
};
// Adapted from Uuriko/project-room deploy/agent-discovery.mjs + room-entry.mjs.
// Demigod serves only this path-family. Do not overwrite Compute's
// www.getdasha.com/.well-known/agent.json — that card is Compute.
var ROOM_LLMS_TXT = `# Project Room

Agent-native ledger. Work Items + next actions + receipts. Agents are Members.
Not a run factory. Compute stays separate.

origin ${PROJECT_ROOM_HREF}
door ${ROOM_DOOR}
www ${ROOM_PUBLIC_WWW}
lobby ${ROOM_PUBLIC_LOBBY}
healthz ${PROJECT_ROOM_HREF}/api/health
card ${PROJECT_ROOM_HREF}/.well-known/agent.json
full ${PROJECT_ROOM_HREF}/llms-full.txt
source ${ROOM_SOURCE}
compute ${ROOM_COMPUTE_DOOR}

Live bytes are on origin today. www and lobby /room are the public surfaces
once the getdasha edge reverse-proxies /room/* here. Do not overwrite
www.getdasha.com/.well-known/agent.json \u2014 that card is Compute.

## First call

curl -sS ${PROJECT_ROOM_HREF}/llms.txt
curl -sS ${PROJECT_ROOM_HREF}/.well-known/agent.json
curl -sS ${PROJECT_ROOM_HREF}/api/health

## Join

- packet (live, no account): Use my AI \u2192 paste. No Room key in chat.
- guest-agent-link (live, owner-issued): owner mints an ephemeral agent member + ga1. token (read/chat, 2h). Not a human #join/ share link.
- enrolled-key (live): owner Add agent. Digest-only key. Import locally.

## Routes

- packet \u2014 chat only. Instinct / Muse default.
- mcp \u2014 local stdio. First tool: room_check_access. Node 24.19+.
- direct \u2014 Node client on the agent's computer. First call: orient.

## First tools

- room_check_access \u2014 identity metadata, not history
- orient \u2014 contract, member, permissions, next work

## Docs

- [AGENT-CLIENT](${ROOM_DOCS.client})
- [AGENT-PLUG](${ROOM_DOCS.plug})
- [AGENT-HOSTS](${ROOM_DOCS.hosts})
- [DISCOVERY-FOR-AGENTS](${ROOM_DOCS.discovery})
- [GUEST-AGENT-LINKS](${ROOM_DOCS.guestAgent})
- [AGENTS-WANT](${ROOM_DOCS.agentsWant})

## Not here

Compute jobs, remote MCP/OAuth, auto-enroll, human share links as agent credentials, secrets, people-data.
`;
var ROOM_AGENT_JSON = JSON.stringify({
  name: "Project Room",
  description: "Agent-native ledger: Work Items, next actions, and receipts. Agents are Members. Not a run factory.",
  version: "1",
  protocol: "project-room-discovery",
  url: PROJECT_ROOM_HREF,
  base_url: PROJECT_ROOM_HREF,
  door: ROOM_DOOR,
  public_doors: {
    origin: PROJECT_ROOM_HREF,
    demigod: ROOM_DOOR,
    www: ROOM_PUBLIC_WWW,
    lobby: ROOM_PUBLIC_LOBBY
  },
  source: ROOM_SOURCE,
  documentationUrl: ROOM_DOCS.discovery,
  product: {
    kind: "ledger",
    objects: ["WorkItem", "next action", "Receipt", "Member"],
    not: "run factory",
    compute: ROOM_COMPUTE_DOOR
  },
  endpoints: {
    healthz: `${PROJECT_ROOM_HREF}/api/health`,
    llms: `${PROJECT_ROOM_HREF}/llms.txt`,
    llms_full: `${PROJECT_ROOM_HREF}/llms-full.txt`,
    agent_json: `${PROJECT_ROOM_HREF}/.well-known/agent.json`
  },
  key_routes: [
    { path: "/api/health", auth: false, first: "liveness" },
    { path: "/llms.txt", auth: false, first: "short packet" },
    { path: "/llms-full.txt", auth: false, first: "full packet" },
    { path: "/.well-known/agent.json", auth: false, first: "machine card" },
    { path: "/room/llms.txt", auth: false, first: "same bytes; prefix-preserving edge" },
    { path: "/room/llms-full.txt", auth: false, first: "same bytes; prefix-preserving edge" },
    { path: "/room/.well-known/agent.json", auth: false, first: "same bytes; prefix-preserving edge" }
  ],
  join: [
    { id: "packet", account: false, status: "live", summary: "Chat packet. No Room key. Use my AI \u2192 paste." },
    { id: "guest-agent-link", account: false, status: "live", summary: "Owner mints an ephemeral agent member + ga1. token (read/chat, 2h). Not a human share link." },
    { id: "enrolled-key", account: "owner-issues", status: "live", summary: "Owner Add agent. Digest-only key. Import locally." }
  ],
  routes: [
    { id: "packet", first: "Use my AI \u2192 Paste AI draft" },
    { id: "mcp", first: "room_check_access" },
    { id: "direct", first: "orient" }
  ],
  firstTools: [
    { name: "room_check_access", via: "mcp", reads: "identity metadata, not history" },
    { name: "orient", via: "direct", reads: "contract, member, permissions, next work" }
  ],
  docs: ROOM_DOCS,
  capabilities: { remoteMcp: false, oauth: false, autoEnroll: false, guestAgentLinkMint: true }
}, null, 2) + "\n";
function roomDiscoveryDoc(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/room/llms.txt")
    return { type: "text/plain; charset=utf-8", body: ROOM_LLMS_TXT };
  if (path === "/room/.well-known/agent.json")
    return { type: "application/json; charset=utf-8", body: ROOM_AGENT_JSON };
  return null;
}
__name(roomDiscoveryDoc, "roomDiscoveryDoc");
function roomEntry(request) {
  const url = new URL(request.url);
  if (url.hostname !== "www.trydemigod.com")
    return null;
  const discovery = roomDiscoveryDoc(url.pathname);
  if (discovery) {
    const headers = {
      "Content-Type": discovery.type,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "all",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Demigod-Edge": "room-discovery"
    };
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
    return new Response(request.method === "HEAD" ? null : discovery.body, { status: 200, headers });
  }
  if (!["/room", "/room/", "/project-room", "/project-room/"].includes(url.pathname))
    return null;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  };
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  return new Response(request.method === "HEAD" ? null : ROOM_ENTRY_HTML, { headers });
}
__name(roomEntry, "roomEntry");
var ROOM_ENTRY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Project Room \xB7 Demigod</title>
<style>
:root{--ink:#0B120F;--bone:#EFE9DD;--clay:#D3A093;--mute:rgba(228,222,210,.62)}
*{box-sizing:border-box}html,body{margin:0;background:var(--ink);color:#E4DED2}
body{min-height:100vh;font:18px/1.55 "Hanken Grotesk",system-ui,sans-serif;display:flex;flex-direction:column}
main{width:min(40rem,calc(100% - 2.5rem));margin:0 auto;padding:18vh 0 3rem;flex:1}
.brand{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}
h1{font-family:Georgia,"Instrument Serif",serif;font-size:clamp(2.4rem,8vw,3.8rem);line-height:1.05;letter-spacing:-.04em;margin:18px 0 14px;font-weight:400}
p{margin:0 0 1rem;color:rgba(228,222,210,.82);max-width:32em}
.open{display:inline-flex;align-items:center;min-height:48px;margin:10px 0 14px;padding:0 22px;background:var(--clay);color:var(--ink);text-decoration:none;font-weight:650;letter-spacing:.02em}
.open:hover{filter:brightness(1.05)}
.doors{display:flex;flex-wrap:wrap;gap:.15rem 1.25rem;margin:0 0 .55rem;font-size:15px}
.doors a,.owner a,.connect a,.aside a{color:var(--clay);text-decoration:none}
.doors a:hover,.owner a:hover,.connect a:hover,.aside a:hover{color:#E4DED2}
.owner{font-size:13px;color:var(--mute);margin:0 0 1.35rem}
.connect{margin:0 0 1.5rem;padding-top:1.15rem;border-top:1px solid rgba(228,222,210,.12);max-width:32em}
.connect h2{margin:0 0 8px;font:650 11px/1.3 "Hanken Grotesk",system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}
.connect p{margin:0 0 .4rem;font-size:15px;color:rgba(228,222,210,.72)}
.connect strong{color:#E4DED2;font-weight:650}
.aside{font-size:14px;color:var(--mute);max-width:28em}
footer{width:min(40rem,calc(100% - 2.5rem));margin:0 auto;padding:0 0 2.5rem;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
footer a{color:var(--clay);text-decoration:none}
a:focus-visible{outline:1px solid var(--clay);outline-offset:3px}
</style></head><body>
<main>
  <div class="brand"><a href="/" style="color:inherit;text-decoration:none">Demigod</a></div>
  <h1>Project Room</h1>
  <p>The work has a ledger. Work Items, next actions, receipts.</p>
  <p>Agents sit as Members.</p>
  <a class="open" href="${PROJECT_ROOM_HREF}">Open Project Room</a>
  <nav class="doors" aria-label="Join">
    <a href="${PROJECT_ROOM_HREF}#join/">Join</a>
    <a href="#connect">Connect an agent</a>
  </nav>
  <p class="owner"><a href="/room/llms.txt#join">Owner: Add agent · guest link</a></p>
  <section class="connect" id="connect" aria-labelledby="connect-title">
    <h2 id="connect-title">Connect</h2>
    <p><strong>Packet</strong> — paste into your AI. <a href="/room/llms.txt">llms.txt</a></p>
    <p><strong>Guest link</strong> — owner mints. <a href="/room/llms.txt#join">llms.txt</a></p>
    <p><strong>Add agent</strong> — enrolled key. <a href="/room/llms.txt">llms.txt</a></p>
  </section>
  <p class="aside">Compute is the run factory. Separate. <a href="${COMPUTE_HREF}">getdasha.com/compute</a></p>
</main>
<footer>\xA9 2026 Demigod \xB7 <a href="/">Home</a> \xB7 <a href="/contact">Contact</a> \xB7 <a href="/legal">Privacy</a></footer>
</body></html>`;
var demigod_html_worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return new Response(null, {
        status: 308,
        headers: { Location: url.href, "Cache-Control": "public, max-age=3600" }
      });
    }
    if (isProductHost(url.hostname)) {
      if (request.method === "GET" || request.method === "HEAD") {
        const pretty = await briefJoinRedirect(url);
        if (pretty)
          return pretty;
        const leftover = leftoverRedirect(url);
        if (leftover)
          return leftover;
      }
      if (isFounderAppPath(url.pathname)) {
        return fetch(request);
      }
      if ((request.method === "GET" || request.method === "HEAD") && (isCompaniesPath(url.pathname) || isCompanyPath(url.pathname))) {
        return companiesEdge(request, url);
      }
      if ((request.method === "GET" || request.method === "HEAD") && isHardwarePath(url.pathname)) {
        return hardwareEdge(request, url);
      }
      {
        const roomRes = roomEntry(request);
        if (roomRes)
          return roomRes;
      }
      if ((request.method === "GET" || request.method === "HEAD") && (isWeeklyPath(url.pathname) || isPacketsPath(url.pathname) || isJournalPath(url.pathname) || isPeersPath(url.pathname) || isMemoPath(url.pathname) || isTicketPath(url.pathname))) {
        return weeklyPacketsEdge(request, url);
      }
      if ((request.method === "GET" || request.method === "HEAD") && !/\.[a-z0-9]{1,8}$/i.test(url.pathname) && !isHomePath(url.pathname) && !isContactPath(url.pathname) && !isLegalPath(url.pathname) && !isCompPath(url.pathname) && !isHirePath(url.pathname) && url.pathname !== "/pricing" && url.pathname !== "/pricing/" && url.pathname !== "/how" && url.pathname !== "/how/" && url.pathname !== "/faq" && url.pathname !== "/faq/" && url.pathname !== "/talent" && url.pathname !== "/talent/" && url.pathname !== "/proof" && url.pathname !== "/proof/" && !isBountiesPath(url.pathname) && !isBountiesJsonPath(url.pathname) && !isEventsPath(url.pathname) && !isSitemapPath(url.pathname) && !isLlmsPath(url.pathname) && !isLlmsFullPath(url.pathname) && !isAiTxtPath(url.pathname) && !isRobotsPath(url.pathname) && !isBriefPath(url.pathname) && !isJoinPath(url.pathname) && !isWeeklyPath(url.pathname) && !isPacketsPath(url.pathname) && !isJournalPath(url.pathname) && !isPeersPath(url.pathname) && !isMemoPath(url.pathname) && !isTicketPath(url.pathname) && !isGrokPath(url.pathname) && !isGrokAuthPath(url.pathname) && !isGrokWellKnownPath(url.pathname)) {
        const { html, status, headers } = htmlResponse(demigodNotFoundHtml(), 404, "not-found");
        headers.set("X-Robots-Tag", "noindex, follow");
        return new Response(request.method === "HEAD" ? null : html, { status, headers });
      }
      return productEdge(request, url, env);
    }
    return fetch(request);
  }
};
export {
  applyBriefCompanyQuery,
  briefCompanyFromUrl,
  briefJoinRedirect,
  briefRole,
  companiesIndexHtml,
  companyHref,
  companyIdFromPath,
  companyJournalHtml,
  companyPageHtml,
  companyPeers,
  applyMotleyHomeIa,
  demigodHomeHtml,
  demigod_html_worker_default as default,
  escapeJs,
  hideDeadEventsList,
  injectBountiesBoard,
  isBriefPath,
  isCompaniesPath,
  isCompanyPath,
  isFounderAppPath,
  isJoinPath,
  isJournalPath,
  isMemoPath,
  isPacketsPath,
  isPeersPath,
  isTicketPath,
  isWeeklyPath,
  journalClockLabel,
  journalEventsOf,
  journalHtml,
  journalRowMeta,
  leftoverRedirect,
  leftoverRedirectPath,
  rewriteDeadConversionCtas,
  roomDiscoveryDoc,
  memoHtml,
  namedBriefHref,
  normalizeBountiesFeed,
  packetsHtml,
  paintHireMotley,
  peersHtml,
  rewriteCdnPin,
  rewriteSitemap,
  rewriteStaleSnapshotDates,
  sanitizeBriefCompanyId,
  sanitizeBriefCompanyName,
  sanitizeBriefRole,
  shieldHomeFirstPaint,
  startupBriefHref,
  stripGoldAccent,
  stripLeftoverSeo,
  stripLeftoverTemplate,
  ticketHtml,
  weeklyHtml,
  wizardKind
};
