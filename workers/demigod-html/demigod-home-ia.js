/**
 * Motley home IA — value triad, use-cases, brief repetition, map vs desk, FAQ chips, footer columns.
 * Quiet literary voice. No violet clone. No display-serif takeover. Tokens stay Motley.
 * Hero depth is CSS only: one glacial focal, clay rim, punch H1. No WebGL.
 */

export const BRIEF_HREF = "/?wiz=startup";
export const NETWORK_HREF = "/?wiz=engineer";
export const DESK_HREF = "https://app.trydemigod.com";
export const DESK_HEALTHZ = "https://app.trydemigod.com/healthz";

export const MOTLEY_HOME_IA_CSS = `
.triad .wrap,.uses .wrap,.faq-band .wrap{padding:72px 48px}
.triad-head,.uses-head,.faq-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:36px;gap:24px}
.triad-h,.uses-h,.faq-h{font-family:'Instrument Serif',Georgia,serif;font-size:42px;line-height:1.06;letter-spacing:-.015em;margin:0;font-weight:400}
.triad-label,.uses-label,.faq-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}
.triad-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.triad-card{display:flex;flex-direction:column;gap:10px;padding:0 28px}
.triad-card:first-child{padding-left:0}
.triad-card + .triad-card{border-left:1px solid rgba(35,33,29,.14)}
.triad-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#8a8378;text-transform:uppercase}
.triad-t{font-family:'Instrument Serif',Georgia,serif;font-size:26px;line-height:1.15;color:#23211D}
.triad-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;line-height:1.5;color:#6b665e;text-wrap:pretty}
.uses-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(228,222,210,.16);border:1px solid rgba(228,222,210,.16)}
.use{background:#0B120F;padding:22px 24px;display:flex;flex-direction:column;gap:8px;min-height:112px}
.use-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.42);text-transform:uppercase}
.use-t{font-family:'Instrument Serif',Georgia,serif;font-size:24px;line-height:1.2;color:#E4DED2}
.use-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;line-height:1.5;color:rgba(228,222,210,.6);text-wrap:pretty}
.use a{color:#D3A093}
.use a:hover{color:#E4DED2}
.section-cta{display:flex;align-items:center;gap:14px;padding-top:36px;flex-wrap:wrap}
.method .wrap,.walk .wrap{padding:72px 48px}
.method-head,.walk-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:36px;gap:24px}
.method-h{font-family:'Instrument Serif',Georgia,serif;font-size:42px;line-height:1.06;letter-spacing:-.015em;margin:0;font-weight:400;color:#E4DED2}
.walk-h{font-family:'Instrument Serif',Georgia,serif;font-size:42px;line-height:1.06;letter-spacing:-.015em;margin:0;font-weight:400;color:#23211D}
.method-label,.walk-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}
.method-label{color:rgba(228,222,210,.42)}
.walk-label{color:#8a8378}
.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.method-card{display:flex;flex-direction:column;gap:10px;padding:0 34px 0 0}
.method-card + .method-card{padding:0 0 0 34px;border-left:1px solid rgba(228,222,210,.16)}
.method-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#D3A093;text-transform:uppercase}
.method-t{font-family:'Instrument Serif',Georgia,serif;font-size:26px;line-height:1.15;color:#E4DED2}
.method-b{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.5;color:rgba(228,222,210,.68);max-width:320px;text-wrap:pretty}
.walk-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;list-style:none;margin:0;padding:0}
.walk-beat{display:flex;flex-direction:column;gap:8px;padding-right:22px}
.walk-beat + .walk-beat{padding-left:22px;border-left:1px solid rgba(35,33,29,.14)}
.walk-n{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:#8a8378}
.walk-t{font-family:'Instrument Serif',Georgia,serif;font-size:24px;line-height:1.2;color:#23211D}
.faq-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.faq-chip{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:8px 12px;border:1px solid rgba(228,222,210,.24);color:rgba(228,222,210,.7)}
.faq-chip:hover{color:#E4DED2;border-color:#E4DED2}
.faq-stack .faq-panel{display:none}
.faq-stack .faq-panel:first-of-type{display:block}
.faq-stack:has(.faq-panel:target) .faq-panel{display:none}
.faq-stack:has(.faq-panel:target) .faq-panel:target{display:block}
.faq-q{font-family:'Instrument Serif',Georgia,serif;font-size:26px;line-height:1.2;color:#E4DED2;margin:0 0 10px}
.faq-a{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:15px;line-height:1.5;color:rgba(228,222,210,.68);max-width:420px;text-wrap:pretty;margin:0}
.desk-line{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:14px;line-height:1.7;color:#4a463f;max-width:470px;text-wrap:pretty}
.ia-foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 28px;width:100%;text-transform:none;letter-spacing:0;padding-top:8px}
.ia-col{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.ia-col-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(228,222,210,.35);text-transform:uppercase}
.ia-col a{font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:13px;letter-spacing:0;text-transform:none;color:rgba(228,222,210,.55)}
.ia-col a:hover{color:#D3A093}
.ia-note{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.14em;color:rgba(228,222,210,.28);text-transform:uppercase;margin-top:18px}
@media(max-width:760px){
  .triad .wrap,.uses .wrap,.faq-band .wrap,.method .wrap,.walk .wrap{padding-left:22px;padding-right:22px;padding-top:64px;padding-bottom:64px}
  .triad-h,.uses-h,.faq-h,.method-h,.walk-h{font-size:32px}
  .triad-head,.uses-head,.faq-head,.method-head,.walk-head{flex-direction:column;gap:12px}
  .triad-grid,.uses-grid,.ia-foot,.method-grid,.walk-beats{grid-template-columns:1fr 1fr}
  .method-card,.walk-beat{padding:22px 0 0;border-left:0}
  .method-card + .method-card{border-left:0;border-top:1px solid rgba(228,222,210,.16);padding:22px 0 0}
  .walk-beat + .walk-beat{border-left:0;border-top:1px solid rgba(35,33,29,.14);padding:22px 0 0}
  .triad-card{padding:22px 0 0;border-left:0}
  .triad-card + .triad-card{border-left:0;border-top:1px solid rgba(35,33,29,.14);padding-top:22px}
  .triad-card:first-child{padding-top:0}
}
@media(max-width:520px){
  .triad-grid,.uses-grid,.ia-foot{grid-template-columns:1fr}
}
`;

/** Himanshu-energy first paint — Motley clay, never Immersity purple-wash. */
export const MOTLEY_HERO_DEPTH_CSS = `
.hero-depth{isolation:isolate}
.hero-vignette{
  position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 72% 58% at 36% 40%,transparent 0%,transparent 44%,rgba(11,18,15,.38) 76%,rgba(11,18,15,.72) 100%),
    radial-gradient(ellipse 42% 34% at 82% 16%,rgba(211,160,147,.16),transparent 64%);
}
.hero-depth>.wrap{z-index:1}
.hero-punch{
  font-size:clamp(48px,8.2vw,88px);
  letter-spacing:-.028em;
  text-shadow:0 0 42px rgba(211,160,147,.16);
}
.hero-focal{
  position:absolute;right:7%;top:20%;width:128px;height:128px;z-index:0;pointer-events:none;
  animation:hero-focal-float 16s ease-in-out infinite;
}
.hero-focal-core{
  display:block;width:100%;height:100%;border-radius:50%;
  border:1px solid rgba(211,160,147,.48);
  background:
    radial-gradient(circle at 36% 30%,rgba(228,222,210,.24),transparent 44%),
    radial-gradient(circle at 62% 72%,rgba(211,160,147,.22),transparent 52%),
    rgba(11,18,15,.35);
  box-shadow:
    0 0 0 14px rgba(211,160,147,.06),
    0 32px 64px rgba(211,160,147,.18),
    inset 0 -20px 36px rgba(211,160,147,.24),
    inset 0 14px 22px rgba(228,222,210,.08);
}
@keyframes hero-focal-float{
  0%,100%{transform:translate3d(0,0,0)}
  50%{transform:translate3d(0,-12px,0)}
}
.hero-cta-card{
  position:relative;display:inline-flex;align-self:flex-start;padding:3px;
  background:linear-gradient(180deg,rgba(211,160,147,.4),rgba(211,160,147,.08));
  box-shadow:0 20px 44px rgba(211,160,147,.14),0 0 0 1px rgba(211,160,147,.24);
}
.hero-cta-card .actions{padding:10px 12px;background:#0B120F}
.hero-path{align-self:flex-start}
.hero-path{
  display:flex;flex-wrap:wrap;gap:0;list-style:none;margin:2px 0 0;padding:0;
  font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;
}
.hero-path li{display:flex;align-items:baseline;gap:8px;padding-right:20px}
.hero-path li+li{padding-left:20px;border-left:1px solid rgba(228,222,210,.16)}
.hero-path-n{color:rgba(228,222,210,.35)}
.hero-path a,.hero-path span{color:rgba(228,222,210,.55)}
.hero-path a:hover{color:#D3A093}
@media(max-width:760px){
  .hero-focal{width:72px;height:72px;right:5%;top:12%;opacity:.65}
  .hero-path li+li{border-left:0;padding-left:0}
}
@media(prefers-reduced-motion:reduce){
  .hero-focal{animation:none}
  .hero-punch{text-shadow:none}
  .hero-cta-card{box-shadow:0 0 0 1px rgba(211,160,147,.24)}
}
`;

export function sectionCtaHtml(briefHref = BRIEF_HREF, tone = "ink") {
  const btn = tone === "bone" ? "btn btn-ink" : "btn btn-primary";
  return `<div class="actions section-cta"><a class="${btn}" href="${briefHref}">Start a brief</a></div>`;
}

export function founderPathHtml(briefHref = BRIEF_HREF) {
  return `<ol class="hero-path" id="hero-path" aria-label="Founder path">
        <li><span class="hero-path-n">01</span><span>Open</span></li>
        <li><span class="hero-path-n">02</span><a href="${briefHref}">Brief</a></li>
        <li><span class="hero-path-n">03</span><a href="/room">Room</a></li>
        <li><span class="hero-path-n">04</span><a href="#how">Meet</a></li>
      </ol>`;
}

export function ctaLadderHtml(briefHref = BRIEF_HREF) {
  return `<div class="hero-cta-card" id="hero-cta-card">
        <div class="actions" id="cta-ladder">
        <a class="btn btn-primary" id="brief" href="${briefHref}">Start a brief</a>
        <a class="btn btn-secondary" href="#how">How it goes</a>
        <a class="dir" href="/companies">Explore the map</a>
      </div>
      </div>
      ${founderPathHtml(briefHref)}`;
}

export function methodHtml() {
  return `<section class="band band-ink method" id="method" data-screen-label="How matching works">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <div class="method-head">
      <h2 class="method-h">How a match is made.</h2>
      <span class="method-label">THE WORKINGS</span>
    </div>
    <div class="method-grid">
      <article class="method-card">
        <span class="method-k">THE BRIEF</span>
        <span class="method-t">You say the work once</span>
        <span class="method-b">Role, constraints, comp.</span>
      </article>
      <article class="method-card">
        <span class="method-k">THE YES</span>
        <span class="method-t">Names move after mutual yes</span>
        <span class="method-b">Both sides. That role.</span>
      </article>
    </div>
  </div>
</section>`;
}

export function walkHtml(briefHref = BRIEF_HREF) {
  return `<section class="band band-bone walk" id="walk" data-screen-label="Brief to match">
  <div class="grain grain-bone" aria-hidden="true"></div>
  <div class="wrap">
    <div class="walk-head">
      <h2 class="walk-h">Brief to match.</h2>
      <span class="walk-label">THE WALK</span>
    </div>
    <ol class="walk-beats">
      <li class="walk-beat">
        <span class="walk-n">01</span>
        <span class="walk-t">Brief</span>
      </li>
      <li class="walk-beat">
        <span class="walk-n">02</span>
        <span class="walk-t">Read</span>
      </li>
      <li class="walk-beat">
        <span class="walk-n">03</span>
        <span class="walk-t">Yes</span>
      </li>
      <li class="walk-beat">
        <span class="walk-n">04</span>
        <span class="walk-t">Meet</span>
      </li>
    </ol>
    ${sectionCtaHtml(briefHref, "bone")}
  </div>
</section>`;
}

export function triadHtml(briefHref = BRIEF_HREF) {
  return `<section class="band band-bone triad" id="for-whom" data-screen-label="For whom">
  <div class="grain grain-bone" aria-hidden="true"></div>
  <div class="wrap">
    <div class="triad-head">
      <h2 class="triad-h">Three doors. One desk.</h2>
      <span class="triad-label">FOR WHOM</span>
    </div>
    <div class="triad-grid">
      <article class="triad-card">
        <span class="triad-k">FOUNDERS</span>
        <span class="triad-t">Start a brief</span>
        <span class="triad-b">One role. A person reads it.</span>
        <a class="btn btn-ink" href="${briefHref}">Start a brief</a>
      </article>
      <article class="triad-card">
        <span class="triad-k">TALENT</span>
        <span class="triad-t">Join the network</span>
        <span class="triad-b">A person chooses, then knocks.</span>
        <a class="btn btn-bone-ghost" href="${NETWORK_HREF}">Join the network</a>
      </article>
      <article class="triad-card">
        <span class="triad-k">OPERATORS</span>
        <span class="triad-t">The desk</span>
        <span class="triad-b">Hosted, read-only. Health is public.</span>
        <a class="dir" href="${DESK_HREF}">app.trydemigod.com</a>
      </article>
    </div>
  </div>
</section>`;
}

export function usesHtml() {
  return `<section class="band band-ink uses" id="work" data-screen-label="The work">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <div class="uses-head">
      <h2 class="uses-h">First seats. Observed movement.</h2>
      <span class="uses-label">THE WORK</span>
    </div>
    <div class="uses-grid">
      <article class="use">
        <span class="use-k">SEED</span>
        <span class="use-t">Seed first seats</span>
        <span class="use-b">The first five. A brief, not a blast.</span>
        <a href="${BRIEF_HREF}">Start a brief</a>
      </article>
      <article class="use">
        <span class="use-k">SERIES A</span>
        <span class="use-t">Series A eng seats</span>
        <span class="use-b">A person picks. Mutual yes before names move.</span>
        <a href="${BRIEF_HREF}">Start a brief</a>
      </article>
      <article class="use">
        <span class="use-k">WEEKLY</span>
        <span class="use-t">Weekly movers snapshot</span>
        <span class="use-b">Observed movement. Not a catalog.</span>
        <a href="/weekly">Weekly</a>
      </article>
      <article class="use">
        <span class="use-k">DESK</span>
        <span class="use-t">Company intelligence desk</span>
        <span class="use-b">Public facts on the map. Desk next door.</span>
        <a href="/companies">Companies</a>
      </article>
    </div>
    ${sectionCtaHtml(BRIEF_HREF, "ink")}
  </div>
</section>`;
}

export function doorsHtml(briefHref = BRIEF_HREF) {
  return `<section class="band band-bone doors" id="desk" data-screen-label="Two rooms">
  <div class="grain grain-bone" aria-hidden="true"></div>
  <div class="wrap">
    <div class="doors-copy">
      <span class="doors-kicker">TWO ROOMS</span>
      <span class="doors-h">The map is here. The desk is next door.</span>
      <span class="doors-b">Motley map here. Desk next door — hosted, read-only.</span>
      ${sectionCtaHtml(briefHref, "bone")}
    </div>
    <aside class="doors-side">
      <span class="doors-side-k">OPERATOR DESK</span>
      <span class="doors-side-b">Quiet door. <a href="${DESK_HREF}">app.trydemigod.com</a> · <a href="${DESK_HEALTHZ}">healthz</a>. Roles wait for Access.</span>
    </aside>
  </div>
</section>`;
}

export function faqHtml() {
  return `<section class="band band-ink faq-band" id="faq" data-screen-label="FAQ">
  <div class="grain grain-dark" aria-hidden="true"></div>
  <div class="wrap">
    <div class="faq-head">
      <h2 class="faq-h">Four short answers.</h2>
      <span class="faq-label">ASKED</span>
    </div>
    <nav class="faq-chips" aria-label="Areas">
      <a class="faq-chip" href="#faq-brief">Brief</a>
      <a class="faq-chip" href="#faq-consent">Consent</a>
      <a class="faq-chip" href="#faq-weekly">Weekly</a>
      <a class="faq-chip" href="#faq-desk">Desk</a>
    </nav>
    <div class="faq-stack">
      <div class="faq-panel" id="faq-brief">
        <p class="faq-q">What is a brief?</p>
        <p class="faq-a">One role. A person reads it. Mutual yes before names move.</p>
      </div>
      <div class="faq-panel" id="faq-consent">
        <p class="faq-q">When do names move?</p>
        <p class="faq-a">After mutual yes. Per match, not a list.</p>
      </div>
      <div class="faq-panel" id="faq-weekly">
        <p class="faq-q">What is Weekly?</p>
        <p class="faq-a">Observed movement. Not a catalog.</p>
      </div>
      <div class="faq-panel" id="faq-desk">
        <p class="faq-q">What is the desk?</p>
        <p class="faq-a">Hosted, read-only. Health is public.</p>
      </div>
    </div>
  </div>
</section>`;
}

export function iaFooterHtml() {
  return `<footer class="foot ia-foot-wrap">
  <nav class="ia-foot" aria-label="Site">
    <div class="ia-col">
      <span class="ia-col-k">Platform</span>
      <a href="/">Home</a>
      <a href="/companies">Companies</a>
      <a href="/weekly">Weekly</a>
      <a href="/packets">Packets</a>
      <a href="/app">Your hiring</a>
    </div>
    <div class="ia-col">
      <span class="ia-col-k">Resources</span>
      <a href="/contact">Contact</a>
      <a href="/legal">Privacy</a>
      <a href="/journal">Journal</a>
      <a href="/peers">Peers</a>
      <a href="/memo">Memo</a>
      <a href="/ticket">Ticket</a>
      <a href="/room">Project Room</a>
    </div>
    <div class="ia-col">
      <span class="ia-col-k">Desk</span>
      <a href="${DESK_HREF}">app.trydemigod.com</a>
      <a href="${DESK_HEALTHZ}">healthz</a>
    </div>
    <div class="ia-col">
      <span class="ia-col-k">Network</span>
      <a href="${NETWORK_HREF}">Join the network</a>
      <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>
    </div>
  </nav>
  <p class="ia-note">© 2026 Demigod · 10% on hire, nothing before</p>
</footer>`;
}

export function motleyHomeIaHtml(briefHref = BRIEF_HREF) {
  return `${methodHtml()}
${walkHtml(briefHref)}
${triadHtml(briefHref)}
${usesHtml()}
${doorsHtml(briefHref)}
${faqHtml()}`;
}

export function motleyHomeIaMarkdown() {
  return `## For whom

- Founders — [Start a brief](https://www.trydemigod.com/?wiz=startup)
- Talent — [Join the network](https://www.trydemigod.com/?wiz=engineer)
- Operators — [app.trydemigod.com](https://app.trydemigod.com) (hosted, read-only)

## The work

- Seed first seats
- Series A eng seats
- [Weekly movers snapshot](https://www.trydemigod.com/weekly)
- [Company intelligence desk](https://www.trydemigod.com/companies)

## Two rooms

Motley map here. Desk next door — [app.trydemigod.com](https://app.trydemigod.com), hosted, read-only.

## How matching works

The brief is the work. A person reads it. Names move after mutual yes.
`;
}

/** CSS depth on the Motley hero. Idempotent. Tokens stay clay / ink. */
export function applyMotleyHeroDepth(html, briefHref = BRIEF_HREF) {
  let page = String(html || "");
  if (!page.includes(".hero-vignette{") && page.includes("</style>")) {
    page = page.replace("</style>", `${MOTLEY_HERO_DEPTH_CSS}\n</style>`);
  }
  if (!page.includes('id="hero-depth"')) {
    page = page.replace(
      '<section class="band band-ink" data-screen-label="Hero">',
      '<section class="band band-ink hero-depth" data-screen-label="Hero" id="hero-depth">',
    );
  }
  if (!page.includes('class="hero-vignette"')) {
    page = page.replace(
      '<div class="grain grain-dark" aria-hidden="true"></div>\n  <div class="wrap">\n    <header class="mast">',
      `<div class="grain grain-dark" aria-hidden="true"></div>
  <div class="hero-vignette" aria-hidden="true"></div>
  <div class="hero-focal" aria-hidden="true"><span class="hero-focal-core"></span></div>
  <div class="wrap">
    <header class="mast">`,
    );
  }
  if (!page.includes('class="hero-punch"')) {
    page = page.replace(
      "<h1>A motley crew is assembled quietly.</h1>",
      '<h1 class="hero-punch">A motley crew is assembled quietly.</h1>',
    );
  }
  if (page.includes('id="cta-ladder"') && !page.includes('id="hero-cta-card"')) {
    page = page.replace(
      '<div class="actions" id="cta-ladder">',
      '<div class="hero-cta-card" id="hero-cta-card"><div class="actions" id="cta-ladder">',
    );
    page = page.replace(
      /(<div class="hero-cta-card" id="hero-cta-card"><div class="actions" id="cta-ladder">[\s\S]*?<\/div>)/,
      "$1</div>",
    );
  }
  if (page.includes('id="hero-cta-card"') && !page.includes('id="hero-path"')) {
    page = page.replace(
      /(<div class="hero-cta-card" id="hero-cta-card">[\s\S]*?<\/div>\s*<\/div>)/,
      `$1\n      ${founderPathHtml(briefHref)}`,
    );
  }
  return page;
}

/** Splice IA into a Motley home HTML document (live demigodHomeHtml shape). */
export function applyMotleyHomeIa(html, briefHref = BRIEF_HREF) {
  let page = String(html || "");
  const iaReady = page.includes('id="for-whom"') && page.includes('id="work"') && page.includes("ia-foot-wrap") && page.includes('id="cta-ladder"');
  if (iaReady) {
    return applyMotleyHeroDepth(page, briefHref);
  }
  if (!page.includes(MOTLEY_HOME_IA_CSS.trim().slice(0, 40))) {
    page = page.replace("@media(max-width:760px){", `${MOTLEY_HOME_IA_CSS}\n@media(max-width:760px){`);
  }
  if (page.includes('id="brief"') && !page.includes('id="cta-ladder"')) {
    page = page.replace(
      /<div class="actions">\s*<a class="btn btn-primary" id="brief" href="[^"]+">Start a brief<\/a>\s*(?:<a class="dir"[^>]*>one packet<\/a>)?\s*<\/div>/,
      ctaLadderHtml(briefHref),
    );
  }
  page = page.replace(
    '<section class="band band-bone process" data-screen-label="Process">',
    '<section class="band band-bone process" id="how" data-screen-label="Process">',
  );
  if (page.includes("Nothing moves until you do.") && !page.includes("id=\"how-cta\"")) {
    page = page.replace(
      "Nothing moves until you do.</span>\n      </div>\n    </div>\n  </div>\n</section>",
      `Nothing moves until you do.</span>\n      </div>\n    </div>\n    <div class="actions section-cta" id="how-cta"><a class="btn btn-ink" href="${briefHref}">Start a brief</a></div>\n  </div>\n</section>`,
    );
  }
  const ia = motleyHomeIaHtml(briefHref);
  if (!page.includes('id="for-whom"')) {
    page = page.replace(
      /\n<section class="band band-ink close" data-screen-label="Close">/,
      `\n${ia}\n<section class="band band-ink close" data-screen-label="Close">`,
    );
  }
  if (page.includes('<footer class="foot">') && !page.includes("ia-foot-wrap")) {
    page = page.replace(/<footer class="foot">[\s\S]*?<\/footer>/, iaFooterHtml());
  }
  return applyMotleyHeroDepth(page, briefHref);
}
