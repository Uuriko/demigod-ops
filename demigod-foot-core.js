/*dg-foot-v211-core*/
/**
 * demigod-foot-core.js — ONLY site behavior SoR (Webflow foot CDN).
 * Sections: COPY · WIZ_CFG · WIZ_Q · WIZ runtime · board · forms/CTA · boot · honesty
 * Map: docs/exchange/DEMIGOD-FOOT-CORE-FUNCTION-MAP.md
 * Ship: freeze off → foot-cdn-publish → cm6-paste → live-doctor --require-match
 * NEVER: MutationObserver writing styles on every attr (v187 freeze); raw catbox .html nav
 * v200 dual-CTA · v201 FOUC/WIZ keyboard · v202 WIZ one-question ownership + honesty + mobile de-dupe
 */
window.dgFootVersion = 'v211'; console.log('[demigod] foot v211-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null,DIRTY=false;
/* Use product route (same-origin /?p=) — never raw catbox .html (text/plain MIME) */

var HOW_IT_WORKS='/?p=how';
/* Dual CTAs (competitor-proven): Underdog "I'm Hiring"/"I'm a Candidate"; Wellfound "Find your next hire"/"Find your next job"; Arc "Hire talent"/"Find jobs".
   Never use both "Hire talent" + "Find talent" — same meaning (company side). Pair = hiring vs job-seeking. */
/* ==== SECTION: COPY (runtime marketing strings) ==== */
var COPY={
heroSub:'Curated SF talent. 10% only when you hire.',
badge:'SF · HUMAN-MATCHED',
heroTrustLine:'',
ctaFounder:"I'm hiring",
ctaEngineer:'Find a job',
navCta:"I'm hiring",
navCtaTalent:'Find a job',
startupH2:"I'm hiring",
startupBody:'Brief the role. A human matches you only when fit is real.',
engineerH2:'Find a job',
engineerBody:'One profile. Private until a human sees a fit.',
feeNote:'10% on hire. Candidates free.',
pricingNote:'10% on hire — no upfront fee',
pricingIntro:'Pay only when you hire.',
pricingBilling:'Confirmations by email from hello@trydemigod.com.',
footerTag:'Human-matched SF talent · 10% on hire',
trustKicker:'',
trustSteps:[],
ledgerKicker:'',
ledgerTitle:'',
ledgerRows:[],
privacyNote:'Profiles shared only after mutual yes.',
partnerKicker:'Refer candidates — 20% of fee on hire.',
partnerCta:'REFER',
partnerNav:'Refer',
partnerOk:'Thanks. hello@trydemigod.com will follow up if it fits.',
followUpTitle:'Optional details',
followUpHint:'Optional — we may follow up by email.',
followUpSalary:'Target salary range?',
followUpStart:'Earliest start date?',
followUpWhy:'Dealbreakers?'
};
var STARTUP_OK='Brief received. hello@trydemigod.com will follow up. Payments/SMS pending.';
var ENGINEER_OK='Profile received. hello@trydemigod.com will follow up if fit. Payments/SMS pending.';
var PARTNER_OK=COPY.partnerOk;
var WIZ_THANKS={startup:{head:'Brief received',lead:'A human will review it. Mutual yes only.',steps:['We read your brief + 90-day outcome','We propose only strong fits','Both sides say yes before intro'],done:'How it works'},engineer:{head:'Profile saved',lead:'Private until a human sees a real fit.',steps:['Stored securely — never blasted','Human proposes match if fit','hello@trydemigod.com may follow up'],done:'How it works'},partner:{head:'Got it',lead:'We review partner fit before any code.',steps:['Human review','Email with next steps if fit','Warm intros only'],done:'Back'}};
/* ==== SECTION: WIZ_CFG (stepper paths) ==== */
var WIZ_CFG={startup:{steps:[['welcome'],['contact-email'],['company-name'],['company-stage'],['role-title'],['stack-needs'],['90day-outcome'],['__submit__'],['__thanks__']],welcome:{t:"I'm hiring",b:'~90 sec. Role + 90-day outcome. A human reads every brief.',btn:'Start brief →'},thanks:STARTUP_OK,total:7,optional:['phone','salary-range','why-this-role','role-jd','timeline','team-size']},engineer:{steps:[['welcome'],['full-name'],['seeker-email'],['linkedin-url'],['skills-stack'],['experience'],['sf-bay'],['__submit__'],['__thanks__']],welcome:{t:'Find a job',b:'~90 sec. One profile. Private until mutual yes.',btn:'Create profile →'},thanks:ENGINEER_OK,total:7,optional:['phone','links','resume','salary-expectation','why-startups','availability']},partner:{steps:[['welcome'],['partner-type'],['partner-name'],['partner-email'],['partner-phone'],['partner-org'],['referral-plan'],['partner-linkedin'],['partner-notes'],['__submit__'],['__thanks__']],welcome:{t:'Partner',b:'Refer talent. Earn when a hire succeeds.',btn:'Apply →'},thanks:PARTNER_OK,total:9,optional:['partner-phone','partner-linkedin','partner-notes']}};
/* ==== SECTION: WIZ_Q (questions + hints) ==== */
var WIZ_Q={startup:{'contact-email':{q:'Work email?',h:'For match proposals only — never a list, never spam.'},'company-name':{q:'Company name?',h:'Context for culture and stage fit.'},'company-stage':{q:'What stage is the company?',h:'Pre-seed / Seed / Series A+ — we match only to real startup operating realities.'},'role-title':{q:'What role are you hiring for?',h:'Founding PM, first Engineer, Head of Growth — specific titles get the best 3-5 curated fits.'},'stack-needs':{q:'Key skills or outcomes needed?',h:'Top must-haves and success metrics. This is what we screen candidates against.'},
'90day-outcome':{q:'#1 outcome this hire must deliver in 90 days?',h:'Be specific and measurable — this is the anchor for every match we propose.'},'salary-range':{q:'Target comp range (cash + equity note)?',h:'Realistic range = candidates we propose will actually say yes. Critical for quality.'},'timeline':{q:'When do you need the hire?',h:'ASAP / This quarter / Exploratory — matches candidate availability.'},'team-size':{q:'Team size / reporting line?',h:'Helps us match seniority and collaboration style.'},'why-this-role':{q:'Why hire this role now?',h:'New bet, backfill, scaling team — the "why" drives who we suggest first.'},'role-jd':{q:'Job description, brief or link? (optional)',h:'PDF/Word up to 10MB. Humans read every detail you share.'},'phone':{q:'Phone (optional)',h:'SMS pending — email from hello@trydemigod.com always works.'},'__submit__':{q:'Submit your brief?',h:'A human reviews it personally. Matches only when fit is strong.'}},engineer:{'full-name':{q:'Your full name?',h:'Used only for the intro email to the right startup.'},'seeker-email':{q:'Best email?',h:'Match updates and proposals only — from hello@.'},'linkedin-url':{q:'LinkedIn profile?',h:'Primary signal. Full profile URL lets a human assess real background fast.'},'skills-stack':{q:'Core skills & stack?',h:'React, Figma, GTM, product — what you actually do best.'},'experience':{q:'Key things you have shipped?',h:'2-3 concrete highlights or impact bullets. Wins > titles.'},'sf-bay':{q:'Open to SF Bay Area startups?',h:'Our focus. Remote fine if the startup is Bay Area.'},'availability':{q:'When are you available?',h:'Now / 2–4 weeks / Passive — matches role timeline.'},'salary-expectation':{q:'Comp expectation (optional)?',h:'Helps us only propose roles that will excite you.'},'why-startups':{q:'Why SF startups (optional)?',h:'Context for strong human matches.'},'links':{q:'Portfolio, GitHub, site? (optional)',h:'Links help humans see the work.'},'phone':{q:'Phone (optional)?',h:'Pending SMS. We can text when a fit appears.'},'resume':{q:'Resume (PDF/Word, optional now)',h:'Max 10MB. Private until a human proposes a specific match — add later if easier.'},'__submit__':{q:'Join the network?',h:'A human reviews your profile. Outreach only on real fits — no blasts.'}}};
/* v197 copy polish: explicit review actions, complete contact language, and plain-English outcome guidance. */
WIZ_Q.startup['90day-outcome']={q:'What must this hire accomplish in their first 90 days?',h:'Name one specific, measurable result. We use it as the anchor for every match.'};
WIZ_Q.startup['salary-range']={q:'What is the target compensation range?',h:'Include base salary and an equity note, if known. This helps us propose aligned candidates.'};
WIZ_Q.startup.__submit__={q:'Review and submit your brief',h:'Check your answers below. A human reviews every submission before proposing a match.'};
WIZ_Q.engineer['full-name']={q:'What is your full name?',h:'Used only for relevant match proposals and introductions.'};
WIZ_Q.engineer['seeker-email']={q:'What is the best email to reach you?',h:'Match proposals come from hello@trydemigod.com. No newsletters or lists.'};
WIZ_Q.engineer.phone={q:'Phone number (optional)',h:'SMS is pending. Email from hello@trydemigod.com is the active contact channel.'};
WIZ_Q.engineer.__submit__={q:'Review and submit your profile',h:'Check your answers below. Your profile stays private until you approve a specific match.'};
function q(s){return document.querySelector(s)}
function qa(s,r){return[...(r||document).querySelectorAll(s)]}

var BOARD_CDN='https://files.catbox.moe/orqkmx.json'; /* Fable v150: use latest honest published board */
var BOARD=null,BOARD_AT=0; /*dup q/qa removed - single def earlier*/
function dgIsPageShell(el){if(!el||!el.tagName)return true;var t=el.tagName.toLowerCase();if(t==='body'||t==='html'||t==='main')return true;if(el.id==='startup-modal'||el.id==='jobseeker-modal'||el.id==='dg-bar'||el.id==='dg-path-pills')return true;try{if(el.matches&&el.matches('.hero-section,.hero-container,.hero-actions,.nav_container,header,footer,.footer,nav.w-nav,.w-nav'))return true;}catch(e){}return false;}
function dgHide(el){if(!el||dgIsPageShell(el))return;try{el.style.setProperty('display','none','important');}catch(e){}}
function lbl(el,t){if(!el)return;(el.querySelector('.btn-label,.button_label')||el).textContent=t}
function rmF(f,n){if(!f)return;qa('[name="'+n+'"],#'+n,f).forEach(function(i){var w=i.closest('.w-input,.w-select,.w-radio,.w-checkbox,fieldset')||i.parentElement||i;w.remove()});qa('label',f).forEach(function(l){if(new RegExp(n.replace(/-/g,'[- ]'),'i').test(l.textContent||''))l.remove()})}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function ledgerHtml(rows){var R=rows||COPY.ledgerRows;return R.map(function(r){var t=Array.isArray(r)?r:[r.title,r.stageType||r[1],r.status||r.comp||r[2]];var label=r.sample?'Sample':(t[2]||'');return'<div class="dg-row"><span>'+esc(t[0])+'</span><em>'+esc(t[1])+(label?' · '+esc(label):'')+'</em></div>'}).join('')}
function candidatesHtml(list){if(!list||!list.length)return'';return list.map(function(c){var tags=(c.tags||[]).slice(0,4).map(function(t){return'<span class="dg-tag">'+esc(t)+'</span>'}).join('');var sample=c.sample?'<span class="dg-tag dg-sample">Sample</span> ':'';return'<div class="dg-cand">'+sample+'<p>'+esc(c.summary||c.blurb||'')+'</p><div class="dg-tags">'+tags+'</div></div>'}).join('')}
function renderBoard(){var blk=q('#demigod-trust-block');if(!blk||!BOARD)return;var lg=blk.querySelector('.dg-ledger');if(lg&&BOARD.roles&&BOARD.roles.length)lg.innerHTML=ledgerHtml(BOARD.roles);var cand=blk.querySelector('.dg-candidates');if(!cand){var h2=document.createElement('h2');h2.textContent='Featured candidates';var k=document.createElement('p');k.className='dg-kicker';k.textContent='Anonymized profiles — humans match, no spam.';k.id='dg-cand-kicker';cand=document.createElement('div');cand.className='dg-candidates';blk.appendChild(h2);blk.appendChild(k);blk.appendChild(cand)}if(BOARD.candidates&&BOARD.candidates.length)cand.innerHTML=candidatesHtml(BOARD.candidates);pipelineNote();addMotion()}function pipelineNote(){if(!BOARD)return;var host=q('#dg-proof-strip')||q('#dg-faq')||q('#demigod-trust-block');if(!host)return;var rc=(BOARD.roles||[]).length,cc=(BOARD.candidates||[]).length;if(!rc&&!cc)return;var txt='Right now: '+rc+' example role brief'+(rc===1?'':'s')+' and '+cc+' candidate profile'+(cc===1?'':'s')+' on the public ledger — real placements only after delivered intros.';var n=q('#dg-pipeline-note');if(!n){n=document.createElement('p');n.id='dg-pipeline-note';n.style.cssText='max-width:42rem;margin:.5rem auto 0;padding:0 1rem;color:#A8A29E;font-size:.8rem;text-align:center';host.parentNode?host.parentNode.insertBefore(n,host.nextSibling):host.appendChild(n)}n.textContent=txt}function addMotion(){qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand,#demigod-trust-block .dg-process-grid > div').forEach(function(el){try{el.style.opacity='1';el.style.transform='none';el.classList.add('dg-anim')}catch(e){}});if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;try{var obs=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('dg-anim');obs.unobserve(e.target)}})},{threshold:.15});qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand').forEach(function(el){obs.observe(el)})}catch(e){}}

/* Thorough WIZ Typeform polish: keyboard, clicks, progress, mobile safe */
function enhanceWIZ() { try{ if(OPEN){ var mm=q(OPEN); if(mm) wizResumeToast(mm);} }catch(e){}
  qa('.dg-wiz-next, .dg-wiz-back, .dg-wiz-start').forEach(function(btn) {
    if (btn.dataset.enhanced) return;
    btn.dataset.enhanced = '1';
    btn.style.cursor = 'pointer';
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
    // touch friendly
    btn.addEventListener('touchstart', function(){}, {passive:true});
  });
  // Ensure modals buttons work
  qa('[data-demigod-modal]').forEach(function(a) {
    a.style.cursor = 'pointer';
  });
  // Extra guards for all CTAs and premium buttons (no dead clicks)
  qa('.premium-btn, .button, .w-button, #dg-nav-hire, #dg-bar a').forEach(function(b){
    if(!b.dataset.dgClickGuard){ b.dataset.dgClickGuard='1'; b.style.cursor='pointer'; }
  });
  // Mobile nav fallback for WIZ (column if CSS not yet applied) + touch targets
  const isMobile = window.innerWidth < 768;
  qa('.dg-wiz-nav').forEach(function(n){
    if (isMobile) {
      n.style.setProperty('flex-direction', 'column', 'important');
      n.style.setProperty('gap', '8px', 'important');
    }
  });
  qa('.dg-wiz-next, .dg-wiz-back, .dg-wiz-start').forEach(function(b){
    if (isMobile) {
      b.style.setProperty('width', '100%', 'important');
      b.style.setProperty('min-height', '44px', 'important');
      b.style.setProperty('padding', '12px 16px', 'important');
    }
    b.style.setProperty('touch-action', 'manipulation', 'important');
  });
  // Step visibility is owned by wizBuild/showStep.
}

// Consolidated force helper to simplify duplicate !important code across wizBuild/showStep/show
function forceWizVisible(form, modal) {
  /* v195: shell + chrome only — never force all fields (kills one-question contract) */
  if (form) {
    form.classList.remove('w-form-loading');
    form.style.setProperty('display', 'block', 'important');
    form.style.setProperty('visibility', 'visible', 'important');
    var p = form; while (p && p !== document.body) { try { p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p=p.parentElement; }
  }
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
  }
  var root = modal || form;
  if (!root) return;
  qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-count,.dg-wiz-bar,.dg-wiz-bar i,.dg-wiz-next,.dg-wiz-back', root).forEach(function(c){
    if (!c || !c.style) return;
    var d = c.classList && (c.classList.contains('dg-wiz-nav') || c.classList.contains('dg-wiz-next') || c.classList.contains('dg-wiz-back')) ? 'flex' : 'block';
    if (c.classList && c.classList.contains('dg-wiz-bar')) d = 'block';
    if (c.tagName === 'I' || (c.parentElement && c.parentElement.classList && c.parentElement.classList.contains('dg-wiz-bar'))) d = 'block';
    c.style.setProperty('display', d, 'important');
    c.style.setProperty('visibility', 'visible', 'important');
  });
  /* review only when marked show OR submit step */
  qa('.dg-wiz-review,.dg-review', root).forEach(function(c){
    if (!c || !c.style) return;
    var on = c.classList.contains('dg-wiz-show') || (form && form.dataset && form.dataset.dgWizKey === '__submit__');
    c.style.setProperty('display', on ? 'block' : 'none', 'important');
    if (on) c.style.setProperty('visibility', 'visible', 'important');
  });
  /* only re-show wrappers marked for current step */
  qa('.dg-wiz-show', root).forEach(function(c){
    if (c && c.style && !c.classList.contains('dg-wiz-review')) {
      c.style.setProperty('display','block','important');
      c.style.setProperty('visibility','visible','important');
    }
  });
}

// Force main page visible to defeat Webflow w-mod-js :not(.w-mod-ix3) hide + CSS hero guards.
// Called early + in run + MO. Also forces ix3 class so the big hide rule stops matching.
function heroImgPerf(){qa('.hero-section img,.hero-container img,[class*=hero] img,header img').forEach(function(im){if(im.dataset.dgPerf)return;im.dataset.dgPerf='1';im.setAttribute('fetchpriority','high');im.setAttribute('decoding','async');im.loading='eager';if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','Demigod — human-matched SF startup talent, San Francisco Bay Area');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function lazyBelowFold(){qa('img').forEach(function(im){if(im.dataset.dgPerf||im.dataset.dgLazy)return;if(im.closest('.hero-section,.hero-container,header,[class*=hero]'))return;im.dataset.dgLazy='1';if(!im.getAttribute('loading'))im.loading='lazy';im.setAttribute('decoding','async');if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function skipLink(){if(q('#dg-skip'))return;var main=q('main');if(main&&!main.id)main.id='main';var a=document.createElement('a');a.id='dg-skip';a.href='#main';a.textContent='Skip to content';a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000';a.addEventListener('focus',function(){a.style.cssText='position:fixed;left:12px;top:12px;z-index:10000;background:#C9A84C;color:#0A0A0A;padding:8px 12px;border-radius:6px;font-weight:600'});a.addEventListener('blur',function(){a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000'});a.addEventListener('click',function(e){e.preventDefault();var t=q('#main,main,.hero-section,h1')||document.body;try{t.setAttribute('tabindex','-1');t.focus()}catch(err){}});document.body&&document.body.prepend(a)}
function faqBlock(){/* v210: homepage FAQ removed for clarity */ var el=q('#dg-faq'); if(el)el.remove(); var ld=q('#dg-faq-jsonld'); if(ld)ld.remove(); }
function offerAbandon(prevId){try{if(!DIRTY)return;var n=0;try{var s=JSON.parse(localStorage.getItem('dgWizSave_startup')||localStorage.getItem('dgWizSave_engineer')||'null');if(s&&s.answers)n=Object.keys(s.answers).length}catch(e){}if(n<2)return;var m=q(prevId);if(!m)return;if(m.querySelector('#dg-abandon'))return;var box=document.createElement('div');box.id='dg-abandon';box.setAttribute('role','dialog');box.style.cssText='position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:1rem';box.innerHTML='<div style="background:#141414;border:1px solid rgba(201,168,76,.35);border-radius:12px;max-width:22rem;padding:1.1rem 1.2rem;color:#F5F0E6"><p style="margin:0 0 .75rem;line-height:1.4">Want a human follow-up? Drop your email — no spam.</p><input id="dg-abandon-email" class="w-input" type="email" placeholder="you@email.com" style="width:100%;margin:0 0 .6rem;font-size:16px;min-height:44px"><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" id="dg-abandon-send" style="flex:1;min-height:44px;background:#C9A84C;color:#0A0A0A;border:0;border-radius:8px;font-weight:600;cursor:pointer">Email hello@</button><button type="button" id="dg-abandon-skip" style="flex:1;min-height:44px;background:transparent;color:#A8A29E;border:1px solid #333;border-radius:8px;cursor:pointer">Close</button></div></div>';document.body.appendChild(box);var close=function(){box.remove();DIRTY=false};box.querySelector('#dg-abandon-skip').onclick=close;box.querySelector('#dg-abandon-send').onclick=function(){var em=(box.querySelector('#dg-abandon-email').value||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){box.querySelector('#dg-abandon-email').style.borderColor='#F4D03F';return}window.location.href='mailto:hello@trydemigod.com?subject=Follow-up request&body='+encodeURIComponent('Please follow up with me.\nEmail: '+em);close()};box.addEventListener('click',function(e){if(e.target===box)close()})}catch(e){}}
function proofStrip(){/* v210: proof essay removed */ var el=q('#dg-proof-strip'); if(el)el.remove(); }
function contactStrip(){/* v210: no hero essay — CTAs only */ var el=q('#dg-contact-strip'); if(el)el.remove(); }
function faqCss(){if(q('#dg-faq-css'))return;var s=document.createElement('style');s.id='dg-faq-css';s.textContent='#dg-faq details{border-bottom:1px solid rgba(201,168,76,.15);padding:.55rem 0}#dg-faq summary{cursor:pointer;font-weight:600;color:#F5F0E6;list-style:none;min-height:44px;display:flex;align-items:center}#dg-faq summary::-webkit-details-marker{display:none}#dg-faq summary:before{content:"\\25B8 ";color:#C9A84C}#dg-faq details[open] summary:before{content:"\\25BE "}#dg-proof-strip a:focus,#dg-contact-strip a:focus,.dg-wiz-next:focus,.dg-wiz-back:focus{outline:2px solid #C9A84C;outline-offset:2px}@media(prefers-reduced-motion:reduce){#startup-modal *,#jobseeker-modal *,#dg-faq *{transition:none!important;animation:none!important}}';document.head.appendChild(s)}
function forceMainVisible() {
  try {
    var de = document.documentElement;
    var bd = document.body;
    // Only unhide page shell — never force display:block on flex/grid or open modals
    function safeShow(el, allowDisplay) {
      if (!el || el.closest('#startup-modal,#jobseeker-modal,.modal-overlay,[data-dg-wiz-step],.w-form-done,.w-form-fail')) return;
      if (el.getAttribute('aria-hidden') === 'true' && el.matches && el.matches('[role=dialog],.modal-overlay')) return;
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      if (allowDisplay) {
        var cs = getComputedStyle(el);
        if (cs.display === 'none') {
          // restore common layout modes instead of nuking flex
          var want = el.matches('html,body') ? 'block' :
            el.matches('.hero-actions,#dg-path-pills,#dg-bar,.w-layout-grid,.pricing-grid,.roles-grid,.steps-grid') ? 'flex' :
            'block';
          el.style.setProperty('display', want, 'important');
        }
      }
    }
    if (de) {
      de.classList.add('w-mod-ix3');
      de.style.setProperty('visibility', 'visible', 'important');
      de.style.setProperty('opacity', '1', 'important');
    }
    if (bd) {
      bd.style.setProperty('visibility', 'visible', 'important');
      bd.style.setProperty('opacity', '1', 'important');
      if (getComputedStyle(bd).display === 'none') bd.style.setProperty('display', 'block', 'important');
    }
    qa('.hero-section,.hero-container,.hero-content-left,.hero-content-right,.header,.nav_container,main,section.trust-section,section:not(.modal-overlay),.pricing-grid,.roles-grid,.steps-grid,.step-card,.role-card,.pricing-card,.premium-btn').forEach(function(el){
      safeShow(el, true);
    });
    // Webflow ix: only unhide page chrome, not aria-hidden dialogs
    qa('.hero-section h1,.header h1,h1.hero-heading,.premium-btn').forEach(function(h){
      if (h && !h.closest('#startup-modal,#jobseeker-modal')) {
        h.style.setProperty('visibility', 'visible', 'important');
        h.style.setProperty('opacity', '1', 'important');
      }
    });
    // Short RAF burst for hero only (not whole page)
    var bc = 0;
    (function braf() {
      if (bc++ >= 4) return;
      try {
        qa('.hero-section,.hero-container,main,h1.hero-heading,.hero-section h1,.premium-btn').forEach(function(el) {
          if (el && !el.closest('#startup-modal,#jobseeker-modal')) {
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.setProperty('opacity', '1', 'important');
          }
        });
      } catch (_) {}
      requestAnimationFrame(braf);
    })();
  } catch (e) {}
}
setTimeout(enhanceWIZ, 500);
document.addEventListener('click', function(e) {
  if (e.target.closest('.dg-wiz-next, .dg-wiz-back')) setTimeout(enhanceWIZ, 100);
});
// Global WIZ keyboard: Enter advances (never from TEXTAREA — allow newlines)
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter' || e.shiftKey) return;
  const modal = document.querySelector('#startup-modal, #jobseeker-modal');
  if (!modal || modal.style.display === 'none' || modal.getAttribute('aria-hidden') === 'true') return;
  const act = document.activeElement;
  if (!act) return;
  if (act.tagName === 'TEXTAREA' || act.isContentEditable) return;
  if (act.tagName !== 'INPUT' && act.tagName !== 'SELECT' && !act.closest('.dg-wiz-nav')) return;
  const next = modal.querySelector('.dg-wiz-next') || Array.from(modal.querySelectorAll('button')).find(b=>/next|continue|submit/i.test((b.textContent||'')));
  if (next) {
    e.preventDefault();
    next.click();
  }
});
/* v190: removed enhanceWIZ full-DOM MO — boot+click+resize cover it */

// Resize + viewport listener for perfect mobile + desktop (re-force nav styles + current step visibility)
/* === ONE-QUESTION OWNERSHIP — hide non-active fields; resize must not unhide every step (v187 thrash lesson) === */
function forceMobileDesktopWIZ() {
  try {
    enhanceWIZ();
    // Re-apply chrome only — do NOT unhide every field (kills one-question WIZ).
    const openModal = document.querySelector && document.querySelector('#startup-modal[style*="flex"], #jobseeker-modal[style*="flex"]');
    if (openModal) {
      const f = openModal.querySelector && openModal.querySelector('form');
      if (f) {
        f.style.setProperty('display','block','important');
        f.style.visibility = 'visible';
        // Head/nav/progress only
        qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-bar,.dg-wiz-review', openModal).forEach(function(c){
          if (c && c.style) {
            c.style.setProperty('display','','important');
            c.style.setProperty('visibility','visible','important');
          }
        });
        // If stepper tracks a current key, only that field (plus 90day on that step)
        var key = f.dataset && f.dataset.dgWizKey;
        if (key && key !== 'welcome' && key !== '__thanks__') {
          qa('.dg-field-wrap,input,select,textarea', openModal).forEach(function(c){
            if (!c || !c.style) return;
            var n = (c.getAttribute && (c.getAttribute('name') || c.id)) || '';
            var wrap = c.classList && c.classList.contains('dg-field-wrap') ? c : (c.closest && c.closest('.dg-field-wrap'));
            var wn = wrap && wrap.querySelector ? (wrap.querySelector('[name]') || {}).name : '';
            var match = n === key || wn === key || (key === '__submit__' && c.classList && c.classList.contains('dg-wiz-review'));
            if (match) {
              c.style.setProperty('display','','important');
              c.style.setProperty('visibility','visible','important');
              if (wrap && wrap.style) {
                wrap.style.setProperty('display','','important');
                wrap.style.setProperty('visibility','visible','important');
              }
            }
          });
        }
      }
    }
  } catch(e){}
}
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', function(){ setTimeout(forceMobileDesktopWIZ, 80); });
    window.addEventListener('orientationchange', function(){ setTimeout(forceMobileDesktopWIZ, 120); });
  }
  // initial
  setTimeout(forceMobileDesktopWIZ, 800);
} catch(e){}

/* COMPLETE robust Typeform-style WIZ stepper (one question at a time). 
   Uses WIZ_CFG / WIZ_Q. Works with forms() injected .dg-field-wraps.
   Full keyboard (Enter next, Esc back/close), review, validation, mobile safe.
   Buttons always clickable. Gold chrome via classes.
*/
/* ==== SECTION: WIZ runtime (one-question stepper) ==== */
/* === WIZ BUILD & OWNERSHIP — create chrome once; one active wrapper; reopen is idempotent === */
function wizBuild(form, kind) {
  if (!form || form.dataset.dgWizBuilt) return;
  form.dataset.dgWizBuilt = '1';
  form.classList.add('dg-wiz-on');
  form.classList.remove('w-form-loading');
  form.style.setProperty('display', 'block', 'important');
  // keep form visible forever against Webflow re-hiding
  const forceFormVisible = () => {
    if (!form) return;
    form.classList.remove('w-form-loading');
    try {
      if (form.style.display === 'block' && getComputedStyle(form).display !== 'none') return;
    } catch(e){}
    form.style.setProperty('display', 'block', 'important');
  };
  forceFormVisible();
  // v190: never observe our own style writes — attribute MO + setProperty = infinite sync thrash (site freeze)
  try {
    var moFires = 0;
    var mo = new MutationObserver(function(){
      if (moFires++ > 6) { try { mo.disconnect(); } catch(e){} return; }
      // only re-force if Webflow hid the form; avoid writing style when already visible
      try {
        var cs = getComputedStyle(form);
        if (cs.display === 'none' || form.classList.contains('w-form-loading')) forceFormVisible();
      } catch(e){}
    });
    mo.observe(form, { attributes: true, attributeFilter: ['class', 'style'] });
    setTimeout(function(){ try { mo.disconnect(); } catch(e){} }, 5000);
  } catch(e){}
  setTimeout(forceFormVisible, 200);
  setTimeout(forceFormVisible, 800);
  // hide any success/done states so WIZ stepper owns the view
  qa('.w-form-done, .modal-success-message, [class*=success]', form.closest('#startup-modal, #jobseeker-modal') || document).forEach(function(s){
    if (s.closest('form') === form || s.closest('#startup-modal, #jobseeker-modal')) s.style.display = 'none';
  });
  var cfg = WIZ_CFG[kind] || WIZ_CFG.startup;
  var steps = cfg.steps || [];
  var qmap = WIZ_Q[kind] || {};
  var current = 0;
  var SAVE_KEY = 'dgWizSave_' + kind;
  var answers = {};
  var resumeStep=0; try { var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (saved && saved.answers){ if (saved.t && (Date.now()-saved.t)>7*24*3600*1000){ try{localStorage.removeItem(SAVE_KEY)}catch(e){} saved=null; } else { answers = saved.answers; if (typeof saved.step==='number') resumeStep=saved.step; } } } catch(e){}
  var head = document.createElement('div');
  head.className = 'dg-wiz-head';
  var __dgWizTotal = steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || Math.max(1, steps.length-2);
  head.innerHTML = '<div class="dg-wiz-count" aria-live="polite"><span class="dg-cur">1</span> of ' + __dgWizTotal + '</div><div class="dg-wiz-bar"><i style="width:0%"></i></div><div class="dg-wiz-q"></div><div class="dg-wiz-hint"></div><div class="dg-wiz-live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></div>';
  var qEl = head.querySelector('.dg-wiz-q');
  var hEl = head.querySelector('.dg-wiz-hint');
  var bar = head.querySelector('.dg-wiz-bar i');
  var curEl = head.querySelector('.dg-cur');
  // map fields - prefer the visual container (.form-field-group or .dg-field-wrap)
  var fieldMap = {};
  qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
    var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
    var container = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.parentElement || el;
    if (n && !fieldMap[n]) fieldMap[n] = container;
    if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
    if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
  });
  // ensure 90day and key fields are mapped even if injection timing
  ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs'].forEach(function(k){
    if (!fieldMap[k]) {
      var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
      if (el) {
        var c = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement || el;
        fieldMap[k] = c;
      }
    }
  });
  Object.keys(answers).forEach(function(k){
    var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
    if (el && el.type !== 'file' && !el.value) {
      if (el.type === 'checkbox' || el.type === 'radio') { if (answers[k]) el.checked = true; }
      else el.value = answers[k];
    }
  });
  var nav = document.createElement('div');
  nav.className = 'dg-wiz-nav';
  nav.innerHTML = '<button type="button" class="dg-wiz-back">Back</button><button type="button" class="dg-wiz-next">Next</button>';
  var backBtn = nav.querySelector('.dg-wiz-back');
  var nextBtn = nav.querySelector('.dg-wiz-next');
  // place chrome
  var insertAfter = form.querySelector('.dg-field-wrap') || form.firstElementChild;
  if (insertAfter && insertAfter.parentNode === form) form.insertBefore(head, insertAfter); else form.insertBefore(head, form.firstChild || null);
  form.appendChild(nav);
  // force chrome visible immediately
  head.style.setProperty('display', 'block', 'important');
  nav.style.setProperty('display', 'flex', 'important');
  nav.style.setProperty('visibility', 'visible', 'important');
  qa('.dg-wiz-next, .dg-wiz-back', nav).forEach(function(b){ b.style.setProperty('display','inline-block','important'); b.style.cursor='pointer'; });
  var nativeSub = form.querySelector('[type="submit"], .w-button');
  if (nativeSub) nativeSub.style.display = 'none';
  if (typeof forceWizVisible === 'function') forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));

  // broad force children to ensure inputs show (from final user tests)
  qa('input,select,textarea,label,.w-input,.w-select,.form-field-group,.dg-field-wrap', form).forEach(function(c){ c.style.setProperty('display','block','important'); c.style.setProperty('visibility','visible','important'); });
  function collect() {
    qa('input,select,textarea', form).forEach(function(i) {
      var nm = i.name || i.id || '';
      if (!nm) return;
      if (i.type === 'file') {
        if (i.files && i.files[0]) answers[nm] = i.files[0].name;
        else delete answers[nm];
      } else if (i.type === 'checkbox' || i.type === 'radio') {
        if (i.checked) answers[nm] = i.value || 'yes';
        else if (i.type === 'checkbox') delete answers[nm];
      } else if (i.value && i.value.trim()) answers[nm] = i.value.trim();
      else delete answers[nm];
    });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({answers: answers, step: current, t: Date.now()})); } catch(e){}
  }
  /* === WIZ STEP STATE — show/validate exactly one question; preserve values across back/reopen/resize === */
  function showStep(idx) {
    current = Math.max(0, Math.min(idx, steps.length - 1));
    try { form.dataset.dgWizKey = (steps[current]||[])[0] || ''; } catch(e){}
    // One-question: clear prior ownership classes/hides before showing step
    try {
      qa('.dg-wiz-show', form).forEach(function(el){ el.classList.remove('dg-wiz-show'); });
      qa('.dg-wiz-review, .dg-review', form).forEach(function(r){
        if ((steps[current]||[])[0] !== '__submit__') {
          r.style.setProperty('display','none','important');
          r.classList.remove('dg-wiz-show');
        }
      });
    } catch(e){}
    try { var live=form.querySelector('.dg-wiz-live'); if(live){ var qq=form.querySelector('.dg-wiz-q'); live.textContent=(qq&&qq.textContent)?('Step '+(current+1)+': '+qq.textContent):('Step '+(current+1)); } } catch(e){}
    var keyArr = steps[current] || [];
    var key = keyArr[0] || '';
    if (form) {
      form.classList.remove('w-form-loading');
      form.style.setProperty('display', 'block', 'important');
      form.style.visibility = 'visible';
      var modal = form.closest ? form.closest('#startup-modal,#jobseeker-modal') : null;
      /* never force .w-form-done/.w-form-fail — that fakes success for waitPost */
      if (modal) qa('form,.w-form,.form-field-group,.dg-field-wrap', modal).forEach(function(c){
        if (c.classList && (c.classList.contains('w-form-done') || c.classList.contains('w-form-fail'))) return;
        c.style.setProperty('display','block','important'); c.style.visibility='visible';
      });
      if (typeof forceWizVisible === 'function') forceWizVisible(form, modal);
    }
    var __tot = steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || Math.max(1, steps.length-2);
    curEl.textContent = String(Math.min(current + 1, __tot));
    try{ var totEl=curEl.parentElement; if(totEl&&!totEl.getAttribute('data-dg-prog')){ totEl.setAttribute('data-dg-prog','1'); totEl.setAttribute('aria-live','polite'); } }catch(e){}
    // re-map fields every showStep in case of late injection or Webflow DOM changes
    var fieldMap = {};
    qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
      var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
      var container = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.parentElement || el;
      if (n && !fieldMap[n]) fieldMap[n] = container;
      if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
      if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
    });
    ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs', 'full-name'].forEach(function(k){
      if (!fieldMap[k]) {
        var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
        if (el) fieldMap[k] = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement || el;
      }
    });
    // ULTRA ROBUST: aggressively hide EVERY possible Webflow/field wrapper except current step's
    try {
      qa('input,select,textarea,label,.w-input,.w-select,.w-file-upload,.form-field-group,.dg-field-wrap,fieldset,.w-checkbox,.w-radio', form).forEach(function(el){
        if (el.closest('.dg-wiz-head') || el.closest('.dg-wiz-nav') || el.closest('.dg-wiz-review')) return;
        var c = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.closest('fieldset') || el.parentElement || el;
        if (c && c !== form && !c.classList.contains('dg-wiz-head') && !c.classList.contains('dg-wiz-nav')) c.style.setProperty('display','none','important');
      });
    } catch(e){}
    // show current key's containers + any matching the step key
    var toShow = [];
    if (key && fieldMap[key]) toShow.push(fieldMap[key]);
    qa('.dg-field-wrap, .form-field-group, label, input, select, textarea', form).forEach(function(el){
      var n = (el.name || el.id || (el.textContent||'').toLowerCase()).replace(/[^a-z0-9-]/g,'');
      if (key && n.indexOf(key) > -1) toShow.push(el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el);
    });
    toShow.forEach(function(c){
      if (c && c.style) { c.style.setProperty('display', 'block', 'important'); c.classList.add('dg-wiz-show'); }
      var i = c && c.querySelector ? c.querySelector('input,select,textarea') : c;
      if (i && i.style) i.style.setProperty('display', 'block', 'important');
    });
    // explicit force for contact-email and critical to fix reported vis=0
    ['contact-email', 'full-name', key].forEach(function(ck){
      if (!ck) return;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.setProperty('display', 'block', 'important');
        var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.setProperty('display', 'block', 'important'); }
      }
    });
        // v195: removed ultimate unhide (was re-showing every field)
// explicit force unhide for critical keys (90day, review, first fields) to fix vis=0 / hasReview false / has90 false
        // v195: only force current step key (not the whole critical list)
    if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
      var ck = key;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.removeProperty('display'); el.style.setProperty('display','block','important'); el.style.visibility='visible';
        var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.removeProperty('display'); cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        var lab = el.previousElementSibling; if (lab && lab.tagName === 'LABEL') { lab.style.display='block'; lab.style.visibility='visible'; }
      }
    }
        if (key === '__submit__' || key.includes('review')) {
      qa('.dg-wiz-review, .dg-review', form).forEach(function(r){ 
        r.style.removeProperty('display'); r.style.display = ''; r.classList.add('dg-wiz-show'); 
        if (window.innerWidth < 768) {
          r.style.setProperty('flex-direction','column','important');
        }
      });
    }
    // progress (single calc)
    var denom = Math.max(1, steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || (steps.length - 2));
    var pct = Math.min(100, Math.round( ((key === 'welcome' || key === '__thanks__' || key === '__submit__' ? (key==='welcome'?0:denom) : current) / denom) * 100 ));
    if (bar) bar.style.width = pct + '%';
    qEl.textContent = ''; hEl.textContent = '';
    backBtn.style.display = (current > 0 && key !== 'welcome') ? '' : 'none';
    if (key === 'welcome') {
      qEl.textContent = cfg.welcome ? cfg.welcome.t : 'Welcome';
      hEl.textContent = cfg.welcome ? cfg.welcome.b : '';
      nextBtn.textContent = cfg.welcome ? cfg.welcome.btn : 'Start →';
      nextBtn.style.display = '';
      // Force hide ALL fields on welcome to prevent leaks (fixes startup form not loading clean stepper)
      qa('.form-field-group, .dg-field-wrap, input, select, textarea', form).forEach(function(fld){
        if (!fld.closest('.dg-wiz-head') && !fld.closest('.dg-wiz-nav')) {
          fld.style.setProperty('display', 'none', 'important');
        }
      });
      // no pre-show here; advance to contact-email will show the field
    } else if (key === '__submit__') {
      // Review step only — do NOT set dgSubmitting until real submit click
      var sq = (qmap.__submit__ || {});
      qEl.textContent = sq.q || 'Ready to submit?';
      hEl.textContent = sq.h || 'A human reviews personally.';
      nextBtn.textContent = (kind === 'startup' ? 'Submit brief' : (kind === 'engineer' ? 'Submit profile' : 'Submit'));
      // review
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      var html = '';
      // Prioritize 90day-outcome first (biz: high-signal for precise matching + higher close rates; creative UX for human reviewer + founder reminder)
      var keys = Object.keys(answers);
      if (keys.indexOf('90day-outcome') > -1) {
        keys = ['90day-outcome'].concat(keys.filter(function(k){return k !== '90day-outcome';}));
      }
      keys.forEach(function(k) {
        var qd = qmap[k]; if (!qd) return; // skip turnstile/internal fields
        var lab = (qd.q || k).replace(/\s*\(optional[^)]*\)/i, '').replace(/[?？]+\s*$/, '');
        var extra = (k === '90day-outcome') ? ' style="font-weight:600;border-left:3px solid #C9A84C;padding-left:.5rem"' : '';
        html += '<div' + extra + '><span>' + esc(lab) + '</span><em>' + esc(answers[k]) + '</em></div>';
      });
      rev.innerHTML = html || '<div>No answers captured — use Back to fill in your brief.</div>';
    } else if (key === '__thanks__') {
      try { localStorage.removeItem(SAVE_KEY); } catch(e){} DIRTY=false;
      nextBtn.style.display = 'none'; backBtn.style.display = 'none';
      return;
    } else {
      nextBtn.textContent = 'Continue';
      var qd = qmap[key] || {q: key.replace(/-/g,' '), h: ''};
      qEl.textContent = qd.q;
      hEl.textContent = qd.h || '';
      // find target input by name/id or by scanning for closest match
      var target = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (!target) {
        // fallback: try to match by label text near the question
        qa('label', form).forEach(function(lab){
          if (!target && lab.textContent && lab.textContent.toLowerCase().includes(key.replace(/-/g,' '))) {
            target = lab.querySelector('input,select,textarea') || lab.nextElementSibling;
          }
        });
      }
      var fld = fieldMap[key] || fieldMap[key.replace(/-/g,'')] || (target ? (target.closest('.form-field-group, .dg-field-wrap') || target) : null) || form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (fld) {
        fld.style.display = '';
        fld.classList.add('dg-wiz-show');
        if (target && target !== fld) {
          target.style.display = '';
          target.classList.add('dg-wiz-show');
        }
        // ensure ancestors that are field containers are visible
        var p = fld.parentElement;
        while (p && p !== form) {
          if (p.classList.contains('form-field-group') || p.classList.contains('dg-field-wrap')) {
            p.style.display = '';
          }
          p = p.parentElement;
        }
        setTimeout(function() {
          var inp = (fld.querySelector ? fld.querySelector('input,select,textarea') : null) || target || fld;
          if (inp && inp.focus) try { inp.focus(); } catch(e){}
        }, 30);
      } else {
        // last resort: show the first hidden container (helps for some injected fields)
        var first = form.querySelector('.form-field-group[style*="none"], .dg-field-wrap[style*="none"]');
        if (first) { first.style.display = ''; first.classList.add('dg-wiz-show'); }
      }
      // deterministic name/id + fieldMap + final-guarantee pass own visibility; fuzzy keyword unhide removed (ghosts)
    }
    // ensure the WIZ form is always visible when stepper active (fixes blank form)
    if (form) {
      form.style.setProperty('display', 'block', 'important');
      form.classList.remove('w-form-loading');
    }
    // Final guarantee pass: force the input (esp 90day-outcome + injected) visible
    try {
      let curTarget = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (!curTarget && qEl.textContent) {
        const qKey = qEl.textContent.toLowerCase().split('?')[0].trim().slice(0,24);
        qa('label,.dg-field-wrap,.form-field-group', form).forEach(function(lab){
          if (!curTarget && (lab.textContent || '').toLowerCase().includes(qKey)) {
            curTarget = lab.querySelector ? (lab.querySelector('input,select,textarea') || lab) : lab;
          }
        });
      }
      if (curTarget) {
        curTarget.style.display = '';
        const gg = curTarget.closest('.form-field-group') || curTarget.closest('.dg-field-wrap') || curTarget.parentElement;
        if (gg) { gg.style.display = ''; gg.classList.add('dg-wiz-show'); }
        var ii = curTarget.tagName && /INPUT|TEXTAREA|SELECT/.test(curTarget.tagName) ? curTarget : (curTarget.querySelector && curTarget.querySelector('input,select,textarea'));
        if (ii) ii.style.display = '';
      }
      // explicit 90day safety
      if (key === '90day-outcome') {
        var od = form.querySelector('[name="90day-outcome"],[id="90day-outcome"]');
        if (od) {
          od.style.display = '';
          var odg = od.closest('.dg-field-wrap') || od.parentElement;
          if (odg) { odg.style.display = ''; odg.classList.add('dg-wiz-show'); }
          var odl = od.previousElementSibling;
          if (odl && odl.tagName === 'LABEL') odl.setAttribute('for', '90day-outcome');
        }
      }
      // ensure review has a11y
      var revEl = form.querySelector('.dg-wiz-review');
      if (revEl) { revEl.setAttribute('role','region'); revEl.setAttribute('aria-label','Review your answers'); }
      if (key === '__submit__' || key.includes('review')) {
        qa('.dg-wiz-review, .dg-review', form).forEach(function(r){ r.style.display = ''; r.classList.add('dg-wiz-show'); });
      }
      // Consolidated single force pass (bloat reduced; delegates to forceWizVisible + targeted critical)
      if (typeof forceWizVisible === 'function') {
        forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));
      } else if (form) {
        form.style.setProperty('display','block','important');
        form.classList.remove('w-form-loading');
      }
      // only force CURRENT step field (one-question ownership)
      if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
        var el = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
        if (el) {
          el.style.setProperty('display','block','important'); el.style.visibility='visible';
          var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
          if (cc) { cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        }
      }
      scrubStaticLabels();
    } catch(e){}
    enhanceWIZ();
    if (head && !head.getAttribute('role')) {
      head.setAttribute('role', 'region');
      head.setAttribute('aria-label', 'Form stepper');
    }
  }
  nextBtn.onclick = function(ev) {
    ev && ev.preventDefault();
    collect();
    var key = (steps[current] || [])[0];
    // required validation (skip optionals and welcome)
    if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
      var isOpt = (cfg.optional || []).indexOf(key) >= 0;
      var el = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (el && !isOpt) {
        var empty = false;
        if (el.type === 'checkbox' || el.type === 'radio') empty = !el.checked;
        else empty = !String(el.value || '').trim();
        // require answer for any non-optional step (covers company-name without required attr)
        if (empty) {
        el.style.borderColor = '#F87171'; el.setAttribute('aria-invalid', 'true'); el.focus && el.focus();
        var errEl = form.querySelector('.dg-wiz-req-err');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.className = 'dg-wiz-req-err';
          errEl.setAttribute('role', 'alert');
          errEl.style.cssText = 'color:#F87171;font-size:.85rem;margin:.4rem 0 0';
          el.insertAdjacentElement('afterend', errEl);
        }
        errEl.textContent = 'Please answer this one — then continue.';
        el.setAttribute('aria-describedby', errEl.id || (errEl.id = 'dg-wiz-req-err-' + key));
        el.addEventListener('input', function clearErr(){ el.style.borderColor = ''; el.removeAttribute('aria-invalid'); if(errEl) errEl.textContent = ''; el.removeEventListener('input', clearErr); }, { once: true });
        el.addEventListener('change', function clearErr2(){ el.style.borderColor = ''; el.removeAttribute('aria-invalid'); if(errEl) errEl.textContent = ''; }, { once: true });
        setTimeout(function(){ if(el) el.style.borderColor = ''; }, 1400);
        return;
        }
      }
      if (el && (key === 'contact-email' || key === 'seeker-email' || key === 'partner-email') && el.value && el.offsetParent !== null) {
        var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(el.value).trim());
        if (!okMail) {
          el.style.borderColor = '#F87171'; el.setAttribute('aria-invalid', 'true'); el.focus && el.focus();
          var eErr = form.querySelector('.dg-wiz-req-err');
          if (!eErr) { eErr = document.createElement('p'); eErr.className = 'dg-wiz-req-err'; eErr.setAttribute('role','alert'); eErr.style.cssText = 'color:#F4D03F;font-size:.85rem;margin:.4rem 0 0'; el.insertAdjacentElement('afterend', eErr); }
          eErr.textContent = 'Enter a valid email so we can reach you.';
          return;
        }
      }
    }
    if (key === '__submit__') {
      form.dataset.dgSubmitting='1';
      setTimeout(function(){ try{ delete form.dataset.dgSubmitting; }catch(e){} }, 12000);
      // ensure review is visible and populated before submit
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      rev.style.display = '';
      rev.style.removeProperty('display');
      if (nativeSub) {
        nativeSub.style.display = '';
        setTimeout(function(){ try { nativeSub.click(); } catch(e){ form.submit && form.submit(); } }, 10);
        // only advance to thanks after Webflow done/fail (no silent success)
        // forms() adds .w-form to <form> itself, so form.closest('.w-form') === form and
        // sibling .w-form-done/.w-form-fail under the outer wrapper were never found (Codex P1).
        /* === FORM RESULT CONTRACT — pending → confirmed Webflow success|failure; never synthesize success === */
        function dgWfStatusRoot(f){
          var modal = f.closest && f.closest('#startup-modal,#jobseeker-modal');
          if (modal) {
            var d = modal.querySelector('.w-form-done');
            if (d && d.parentElement) return d.parentElement;
          }
          var p = f.parentElement;
          if (p) {
            var sib = p.querySelector(':scope > .w-form-done, :scope > .w-form-fail');
            if (sib) return p;
            if (p.classList && p.classList.contains('w-form') && p !== f) return p;
          }
          var outer = f.parentElement && f.parentElement.closest && f.parentElement.closest('.w-form');
          if (outer && outer !== f) return outer;
          return p || f;
        }
        var wfWrap = dgWfStatusRoot(form), t0 = Date.now();
        try { delete form.dataset.dgSubmitting; } catch(e){}
        (function waitPost(){
          var scope = wfWrap || form.parentElement || form;
          var okEl = scope.querySelector('.w-form-done');
          var badEl = scope.querySelector('.w-form-fail');
          // also check siblings of form (Webflow classic: form + done + fail as siblings)
          if (!okEl && form.parentElement) {
            var kids = form.parentElement.children;
            for (var i=0;i<kids.length;i++){
              if (kids[i].classList && kids[i].classList.contains('w-form-done')) okEl = kids[i];
              if (kids[i].classList && kids[i].classList.contains('w-form-fail')) badEl = kids[i];
            }
          }
          var okVis = okEl && getComputedStyle(okEl).display !== 'none' && getComputedStyle(okEl).visibility !== 'hidden';
          var badVis = badEl && getComputedStyle(badEl).display !== 'none' && getComputedStyle(badEl).visibility !== 'hidden';
          if (okVis) { try{scrubTimeClaims()}catch(e){} showStep(current + 1); return; }
          if (badVis) {
            var eEl = form.querySelector('.dg-wiz-err');
            if (!eEl) {
              eEl = document.createElement('p');
              eEl.className = 'dg-wiz-err';
              eEl.setAttribute('role','alert');
              eEl.style.cssText = 'color:#f87171;font-size:.9rem;margin:.5rem 0';
              if (nav && nav.parentNode) nav.parentNode.insertBefore(eEl, nav);
              else form.appendChild(eEl);
            }
            eEl.textContent = 'Submission failed — email hello@trydemigod.com and we will take it from there.';
            return;
          }
          if (Date.now() - t0 < 6000) { setTimeout(waitPost, 250); return; }
          var eEl2 = form.querySelector('.dg-wiz-err');
          if (!eEl2) {
            eEl2 = document.createElement('p');
            eEl2.className = 'dg-wiz-err';
            eEl2.setAttribute('role','alert');
            eEl2.style.cssText = 'color:#f87171;font-size:.9rem;margin:.5rem 0';
            if (nav && nav.parentNode) nav.parentNode.insertBefore(eEl2, nav);
            else form.appendChild(eEl2);
          }
          eEl2.textContent = 'Could not confirm submit — email hello@trydemigod.com and we will take it from there.';
          return;
        })();
      } else {
        form.submit && form.submit();
        showStep(current + 1);
      }
    } else if (current < steps.length - 1) {
      showStep(current + 1);
    }
  };
  backBtn.onclick = function(ev){ ev&&ev.preventDefault(); if (current > 0) showStep(current - 1); };
  // keyboard advance on visible inputs + arrows for nav (Typeform polish)
  form.addEventListener('keydown', function(e) {
    var act = document.activeElement;
    var inText = act && (act.tagName === 'TEXTAREA' || act.isContentEditable);
    if (e.key === 'Enter' && !e.shiftKey) {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'SELECT') && !inText) {
        e.preventDefault(); nextBtn.click();
      }
    }
    if (e.key === 'Escape') {
      if (current > 0) { e.preventDefault(); backBtn.click(); }
    }
    // Arrows only when not typing in fields (avoid caret theft)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.isContentEditable)) return;
      e.preventDefault(); nextBtn.click();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.isContentEditable)) return;
      e.preventDefault(); if (current > 0) backBtn.click();
    }
  }, true);
  // start — honor saved resumeStep (v191: do not clobber with unconditional showStep(0))
  var startIdx = resumeStep || 0;
  setTimeout(function(){ showStep(startIdx); enhanceWIZ(); }, 20);
  form.addEventListener('input', function(){ enhanceWIZ(); });
  setTimeout(function(){ if (typeof showStep === 'function') showStep(startIdx); }, 50);
  // reopen helper — show() calls this instead of rebuild (v194)

    // v195: ensure configured required fields have required attr
    ['contact-email','company-name','company-stage','role-title','stack-needs','90day-outcome','full-name','seeker-email','linkedin-url','skills-stack','experience','sf-bay'].forEach(function(n){ var el=form.querySelector('[name="'+n+'"],[id="'+n+'"]'); if(el && (cfg.optional||[]).indexOf(n)<0){ el.required=true; if(el.type==='checkbox') el.setAttribute('required','required'); }});
  form.__dgWizShow = function(){ try{ showStep(current); enhanceWIZ(); forceWizVisible(form, form.closest('#startup-modal,#jobseeker-modal')); }catch(e){} };
  // additional force to unhide first step fields and review/90day to fix vis=0 and missing review/90 in live/tests
  setTimeout(function(){
    qa('.form-field-group, .dg-field-wrap', form).forEach(function(f){ if (f.classList.contains('dg-wiz-show') || f.querySelector('[name*="90day"]')) { f.style.display = ''; } });
    var firstInput = form.querySelector('input, select, textarea:not([type=hidden])');
    if (firstInput) { firstInput.style.display = ''; var c = firstInput.closest('.form-field-group,.dg-field-wrap'); if(c) c.style.display=''; }
  }, 100);
  // ultimate force for WIZ fields visibility and review/90day (bugfix for playtest vis0, hasReview false, has90 false)
  setTimeout(function(){
    qa('input,select,textarea,.form-field-group,.dg-field-wrap', form).forEach(function(el){
      var n = (el.name || el.id || '').toLowerCase();
      if (n.includes('90day') || el.closest('.dg-wiz-review')) {
        el.style.display = '';
        var p = el.closest('.form-field-group,.dg-field-wrap') || el.parentElement;
        if (p) p.style.display = '';
      }
    });
    // make sure review is built and visible if submit step
    if (steps.some(s => s[0] === '__submit__')) {
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) {
        rev = document.createElement('div');
        rev.className = 'dg-wiz-review';
        form.insertBefore(rev, nav);
      }
      rev.style.display = '';
    }
  }, 200);
}

/* === BOARD LEDGER — sample-labeled public roles; never invent realRoles; CDN board JSON === */
function fetchBoard(){if(!BOARD_CDN)return;if(BOARD&&Date.now()-BOARD_AT<60000){renderBoard();return}var bucket=Math.floor(Date.now()/60000);fetch(BOARD_CDN+'?v='+bucket).then(function(r){return r.json()}).then(function(d){BOARD=d;BOARD_AT=Date.now();try{if(!BOARD.realRoles){(BOARD.roles||[]).forEach(function(r){if(r&&r.sample!==false)r.sample=true});(BOARD.candidates||[]).forEach(function(c){if(c&&c.sample!==false)c.sample=true})}else{(BOARD.roles||[]).forEach(function(r){if(r&&r.sample==null)r.sample=false});}}catch(e){}renderBoard();try{qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.7rem;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)})}catch(e){}}).catch(function(){})}
function submitTrust(f,msg){if(!f||f.querySelector('#dg-submit-trust'))return;var p=document.createElement('p');p.id='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.textContent=msg||'A human reviews every submission. No automated spam.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.w-input')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max};el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;if(done.offsetParent===null&&getComputedStyle(done).display==='none')return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='View sample matches';/* PREP for Twilio jack&jill post-form collection (before real SMS): optional follow-up questions shown in thanks */if(!done.querySelector('.dg-followup')){var fu=document.createElement('div');fu.className='dg-followup';fu.style.cssText='margin-top:1rem;padding:0.75rem;border:1px solid rgba(201,168,76,.2);border-radius:8px;font-size:0.85rem';fu.innerHTML='<strong>'+COPY.followUpTitle+'</strong><p style="margin:0.25rem 0 0.5rem;color:#A8A29E">'+COPY.followUpHint+'</p><div style="display:flex;flex-direction:column;gap:0.4rem"><input class="w-input dg-fu-salary" placeholder="'+COPY.followUpSalary+'" style="font-size:0.8rem"><input class="w-input dg-fu-start" placeholder="'+COPY.followUpStart+'" style="font-size:0.8rem"><textarea class="w-input dg-fu-why" placeholder="'+COPY.followUpWhy+'" rows="2" style="font-size:0.8rem"></textarea></div><button type="button" style="margin-top:0.5rem;font-size:0.75rem;background:transparent;border:1px solid rgba(201,168,76,.3);color:#C9A84C;padding:0.25rem 0.5rem;border-radius:4px">Email these details</button>';fu.querySelector('button').addEventListener('click',function(){var sv=(fu.querySelector('.dg-fu-salary').value||'').trim(),st=(fu.querySelector('.dg-fu-start').value||'').trim(),wy=(fu.querySelector('.dg-fu-why').value||'').trim();if(!sv&&!st&&!wy){fu.querySelector('button').textContent='Add a detail above first';return}var body='Salary range: '+sv+'\nStart date: '+st+'\nDealbreakers: '+wy;window.location.href='mailto:hello@trydemigod.com?subject=Follow-up details&body='+encodeURIComponent(body);fu.style.opacity='0.6';fu.querySelector('button').textContent='Opened in your email app — send to reach us'});done.appendChild(fu)};a.style.cssText='margin-top:.75rem;background:transparent!important;color:#c9a84c!important;border:1px solid rgba(201,168,76,.45)!important';a.addEventListener('click',function(){var blk=q('#demigod-trust-block');if(blk)blk.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo(0,document.body.scrollHeight*.55)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
function ph(i,t){if(i&&'placeholder'in i)i.placeholder=t}
function formEl(sel){var el=typeof sel==='string'?q(sel):sel;if(!el)return null;return el.tagName==='FORM'?el:(el.querySelector&&el.querySelector('form'))||null}
/* === FORMS / NATIVE WEBFLOW — id + labels + optional fields; WIZ wraps after === */
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');rmF(st,'Source');rmF(st,'hiring-model');qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack/i.test(el.textContent||''))el.textContent='Skills / requirements *';if(/Role Title|Job Title/i.test(el.textContent||''))el.textContent='Role title *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *'});ph(st.querySelector('[name=contact-email]'),'you@company.com');ph(st.querySelector('[name=role-title]'),'e.g. Founding PM, Head of Growth, Designer');ph(st.querySelector('[name=stack-needs]'),'e.g. B2B SaaS, GTM, design systems, React');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL') l.setAttribute('for',n); else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Best email?':n==='role-title'?'Role title?':'Key skills?'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
/* company-name */ if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" required placeholder="Acme Inc">';var ce=st.querySelector('[name=contact-email]');(ce&&ce.parentElement||st).appendChild(cn);}
// inject timeline and team-size (per Fable perfect fields)
if(!st.querySelector('[name=timeline]')){var tw=document.createElement('div');tw.className='dg-field-wrap';tw.innerHTML='<label class="w-form-label" for="timeline">Timeline?</label><select class="w-select" id="timeline" name="timeline"><option value="">Select</option><option value="asap">ASAP (2-4 wks)</option><option value="quarter">This quarter</option><option value="exploratory">Exploratory</option></select>';var sk=st.querySelector('[name=stack-needs]');(sk&&sk.parentElement||st).appendChild(tw);}
if(!st.querySelector('[name=team-size]')){var tm=document.createElement('div');tm.className='dg-field-wrap';tm.innerHTML='<label class="w-form-label" for="team-size">Team size / reports to?</label><input class="w-input" type="text" id="team-size" name="team-size" placeholder="e.g. 5-person eng team, reports to CTO">';(st.querySelector('[name=stack-needs]')||st).parentElement.appendChild(tm);}var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}} 
// inject 90day-outcome creative field for high-signal matching data (Fable recommended)
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">#1 outcome this hire must deliver in first 90 days? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="e.g. Ship v1 checkout; 2 paying pilot customers this quarter"></textarea>';(sk&&sk.parentElement||st).appendChild(od);}if(!st.querySelector('[name=salary-range]')){var w=document.createElement('div');w.id='dg-salary-wrap';w.className='dg-field-wrap';w.innerHTML='<label class="w-form-label" for="salary-range">Comp range (optional)</label><input class="w-input" type="text" id="salary-range" name="salary-range" placeholder="e.g. $180-220k + equity">';if(sa&&sa.parentElement)sa.parentElement.insertBefore(w,sa.nextSibling);else st.querySelector('[type=submit],.w-button')?.parentElement?.insertBefore(w,st.querySelector('[type=submit],.w-button'))}else{ph(st.querySelector('[name=salary-range]'),'e.g. $180-220k + equity');qa('label',st).forEach(function(l){if(/salary|comp range/i.test(l.textContent||''))l.textContent='Comp range (optional)'})}if(!st.querySelector('[name=why-this-role]')){var ww=document.createElement('div');ww.id='dg-why-wrap';ww.className='dg-field-wrap';ww.innerHTML='<label class="w-form-label" for="why-this-role">Why this role (optional)</label><textarea class="w-input" id="why-this-role" name="why-this-role" rows="2" placeholder="e.g. First PM hire; need someone who has shipped 0→1"></textarea>';var sal=st.querySelector('[name=salary-range]'),salw=sal&&(sal.closest('.dg-field-wrap,.w-input')||sal.parentElement);if(salw&&salw.parentElement)salw.parentElement.insertBefore(ww,salw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(ww,sa.nextSibling)}if(!st.querySelector('[name=role-jd]')){var jw=document.createElement('div');jw.id='dg-jd-wrap';jw.className='dg-field-wrap w-file-upload';jw.innerHTML='<label class="w-form-label" for="role-jd">Job description (optional)</label><input class="w-file-upload-input w-input" type="file" id="role-jd" name="role-jd" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var why=st.querySelector('[name=why-this-role]'),whyw=why&&(why.closest('.dg-field-wrap,.w-input')||why.parentElement);if(whyw&&whyw.parentElement)whyw.parentElement.insertBefore(jw,whyw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(jw,sa.nextSibling)}st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'A human reads every brief — hello@trydemigod.com will follow up with curated matches.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name=why-this-role]'),300);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.removeAttribute('action');en.setAttribute('method','post');if(!en.dataset.dgMailStrip){en.dataset.dgMailStrip='1';en.addEventListener('submit',function(ev){/* keep native Webflow if wired; never open mail client */if(/^mailto:/i.test(en.getAttribute('action')||'')){ev.preventDefault();en.removeAttribute('action');}},true);}rmF(en,'github-url');rmF(en,'portfolio-url');rmF(en,'is-engineer');var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped/i.test(l.textContent||''))l.textContent='What you shipped *';if(/Skillss*&s*(Stack|experience)/i.test(l.textContent||''))l.textContent='Skills & stack *';if(/^LinkedIn/i.test((l.textContent||'').trim()))l.textContent='LinkedIn URL *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(i)i.required=true});var liIn=en.querySelector('[name=linkedin-url]');if(liIn){liIn.type='url';liIn.required=true;ph(liIn,'https://linkedin.com/in/you')}en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('[name=resume],[name=Resume]');if(!resIn){var rw=document.createElement('div');rw.id='dg-resume-wrap';rw.className='dg-field-wrap w-file-upload';rw.innerHTML='<label class="w-form-label" for="resume">Resume (optional now)</label><input class="w-input" type="file" id="resume" name="resume" style="display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var insBefore=en.querySelector('[name=skills-stack]');var insW=insBefore&&(insBefore.closest('.w-input')||insBefore.parentElement);if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}resIn=rw.querySelector('[name=resume]')}else{var resW=resIn.closest('.dg-field-wrap,.w-file-upload,.w-input')||resIn.parentElement;if(resW&&!resW.id)resW.id='dg-resume-wrap';resIn.classList.remove('w-file-upload-input');resIn.classList.add('w-input');resIn.style.cssText='display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0';/*resume opt per WIZ*/;if(!resIn.id)resIn.id='resume';if(!resIn.name)resIn.name='resume';if(!resIn.accept)resIn.setAttribute('accept','.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document')}qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent='Resume (optional now)'});if(resIn&&!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){var f=resIn.files&&resIn.files[0];if(f&&f.size>10485760)resIn.setCustomValidity('Max file size 10MB');else resIn.setCustomValidity('')})}ph(en.querySelector('[name=skills-stack]'),'e.g. Product strategy, Figma, growth marketing');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);charCount(en.querySelector('[name=experience]'),600);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR')}if(!en.querySelector('[name=links]')){var liWrap=liIn&&(liIn.closest('.w-input')||liIn.parentElement);var lw=document.createElement('div');lw.id='dg-links-wrap';lw.className='dg-field-wrap';lw.innerHTML='<label class="w-form-label" for="links">Links (optional)</label><input class="w-input" type="text" id="links" name="links" placeholder="GitHub, portfolio, or other links">';if(liWrap&&liWrap.parentElement)liWrap.parentElement.insertBefore(lw,liWrap.nextSibling);else{var sub=en.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(lw,sub)}}var sf=en.querySelector('[name=sf-bay]');if(sf){sf.required=true;var sl=sf.closest('label')||sf.parentElement;if(sl){var sp=sl.querySelector('.w-form-label,span');if(sp)sp.textContent='Based in SF Bay Area *'}}if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('label');c.className='w-checkbox';c.innerHTML='<input type="checkbox" name="sf-bay" value="yes" required><span class="w-form-label">Based in SF Bay Area *</span>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
// inject availability, salary-expect, why-startups for perfect matching
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">Availability?</label><select class="w-select" id="availability" name="availability"><option value="">Select</option><option value="now">Now</option><option value="2-4w">2-4 weeks</option><option value="passive">Passive / open</option></select>';(en.querySelector('[name=sf-bay]')||en).parentElement.appendChild(av);}
if(!en.querySelector('[name=salary-expectation]')){var se=document.createElement('div');se.className='dg-field-wrap';se.innerHTML='<label class="w-form-label" for="salary-expectation">Comp expectation (optional)</label><input class="w-input" type="text" id="salary-expectation" name="salary-expectation" placeholder="e.g. 180-220k + equity">';en.appendChild(se);}
if(!en.querySelector('[name=why-startups]')){var ws=document.createElement('div');ws.className='dg-field-wrap';ws.innerHTML='<label class="w-form-label" for="why-startups">Why SF startups (optional)</label><textarea class="w-input" id="why-startups" name="why-startups" rows="2" placeholder="Mission, stage, impact..."></textarea>';en.appendChild(ws);}if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.textContent='We never blast your profile. Humans review every application.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Profile stays private until a human match. Free for candidates, always.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Get matched';sb2.textContent='Get matched'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
/* === COPY INJECTION — runtime marketing strings from COPY; honesty scrub separate === */
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
/* === HERO / CTA SURFACE — dual path pills live in contactStrip; keep sample labels honest === */
function hero(){
  qa('.hero-section h1,.hero-title,.header h1').forEach(function(e){
    e.innerHTML='<span class="title-accent-gold">SF startup talent,</span> <span class="title-accent-cream">human-matched.</span>';
  });
  qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){
    if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.closest('.dg-candidates,#startup-modal,#jobseeker-modal'))return;
    var t=e.textContent||'';
    if(t.length>4&&t.length<400)e.textContent=COPY.heroSub;
  });
  qa('.badge-text,.hero-badge span:not(.badge-dot)').forEach(function(e){e.textContent=COPY.badge});
  var ht=q('#dg-hero-trust'); if(ht)ht.remove();
  // hide essay sections by heading
  qa('section').forEach(function(s){
    if(!s||s.id==='startup-modal'||s.id==='jobseeker-modal')return;
    if(s.matches&&s.matches('.hero-section,header,footer,.footer'))return;
    if(s.closest&&s.closest('#startup-modal,#jobseeker-modal,header,footer,.footer,.hero-section'))return;
    var h=((s.querySelector('h1,h2,h3')||{}).textContent||'')+' '+(s.getAttribute('aria-label')||'');
    if(/THE PROCESS|LIVE ROLES|PRICING|ONE SIMPLE MODEL|HUMAN-MATCHED STARTUP|Example roles|Common questions|How matching|Placement ledger|Building in public/i.test(h+(s.innerText||'').slice(0,160))){
      s.style.setProperty('display','none','important');
      s.setAttribute('data-dg-hidden','home-minimal');
    }
  });
  // remove clutter injects if present
  ['#demigod-trust-block','#dg-faq','#dg-proof-strip','#dg-pipeline-note','#dg-contact-strip','#dg-path-pills','#dg-faq-jsonld'].forEach(function(sel){
    var el=q(sel); if(el)el.remove();
  });
}

function wireNavHire(a){
  if(!a) return;
  a.id=a.id||'dg-nav-hire';
  a.setAttribute('data-demigod-modal','startup');
  a.setAttribute('data-dg-cta','hire');
  a.setAttribute('href','/?wiz=startup');
  a.setAttribute('aria-label',"I'm hiring — open startup brief");
  var span=a.querySelector('.button_label,.btn-label');
  if(span) span.textContent=COPY.navCta; else a.textContent=COPY.navCta;
}
function wireNavTalent(a){
  if(!a) return;
  a.id=a.id||'dg-nav-talent';
  a.setAttribute('data-demigod-modal','jobseeker');
  a.setAttribute('data-dg-cta','talent');
  a.setAttribute('href','/?wiz=engineer');
  a.setAttribute('aria-label','Find a job — open talent profile');
  a.classList.add('is-job');
  var span=a.querySelector('.button_label,.btn-label');
  if(span) span.textContent=COPY.navCtaTalent; else a.textContent=COPY.navCtaTalent;
}
function ensureNavTalent(parent){
  if(q('#dg-nav-talent')||!parent) return;
  var t=document.createElement('a');
  t.id='dg-nav-talent';
  t.className='button w-button';
  t.style.cssText='margin-left:.5rem;border:1px solid rgba(201,168,76,.55);background:transparent;color:#C9A84C';
  wireNavTalent(t);
  parent.appendChild(t);
}
function nav(){
  var real=q('nav.w-nav,.w-nav');
  if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop='';}
  var bar=q('nav.w-nav .w-nav-menu, nav.w-nav, .w-nav, header nav, .nav_container');
  var pickHire=function(a){if(a.closest('footer,.hero-actions,#dg-path-pills,#dg-bar'))return false;var t=(a.textContent||'').trim().split('\n')[0];return /^(GET STARTED|POST A JOB|HIRE TALENT|FIND TALENT|I'M HIRING)$/i.test(t)||a.classList.contains('is-talent')||a.id==='dg-nav-hire';};
  var btns=qa('nav.w-nav a.button,.w-nav a.button,nav a.button,header a.button,nav a.premium-btn,header a.premium-btn');
  var hireBtn=btns.find(pickHire)||btns[0];
  if(hireBtn){
    wireNavHire(hireBtn);
    var talentBtn=btns.find(function(a){return a!==hireBtn&&(a.classList.contains('is-job')||/FIND A JOB|JOIN|LOOKING|CANDIDATE/i.test((a.textContent||'')));});
    if(!talentBtn && btns.length>=2) talentBtn=btns.find(function(a){return a!==hireBtn;});
    if(talentBtn) wireNavTalent(talentBtn);
    else ensureNavTalent(hireBtn.parentElement||bar);
    qa('nav a,header a,.w-nav a').forEach(function(x){
      if(x===hireBtn||x===talentBtn||x.id==='dg-nav-talent') return;
      if(x.closest('.hero-actions,#dg-path-pills,#dg-bar,.pricing-card')) return;
      var t=(x.textContent||'').trim().split('\n')[0];
      if(/^(FIND TALENT|HIRE TALENT|GET STARTED|POST A JOB)$/i.test(t) && x.dataset.dgCta!=='talent') {
        x.style.setProperty('display','none','important');
      }
    });
    return;
  }
  if(q('#dg-nav-hire')) return;
  if(bar){
    var a=document.createElement('a');a.id='dg-nav-hire';a.className='button on-inverse w-button';
    wireNavHire(a); bar.appendChild(a); ensureNavTalent(bar); return;
  }
  if(!q('#dg-nav-style')){
    var st2=document.createElement('style');st2.id='dg-nav-style';
    st2.textContent='#dg-top-nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.55rem 1rem;background:rgba(6,6,6,.94);border-bottom:1px solid rgba(201,168,76,.15)}#dg-top-nav .dg-logo{color:#c9a84c;font-weight:700;text-decoration:none!important;font-family:Cinzel,serif}#dg-top-nav .dg-nav-ctas{display:flex;gap:.5rem;align-items:center}#dg-top-nav a.dg-cta{font-weight:700!important;min-height:40px;display:inline-flex;align-items:center;padding:.4rem .85rem;border-radius:8px;text-decoration:none!important}#dg-top-nav a.dg-cta-hire{background:#C9A84C;color:#0A0A0A!important}#dg-top-nav a.dg-cta-talent{border:1px solid rgba(201,168,76,.55);color:#C9A84C!important}body{padding-top:3.1rem}';
    document.head.appendChild(st2);
  }
  var top=document.createElement('div');top.id='dg-top-nav';
  top.innerHTML='<a class="dg-logo" href="/">Demigod</a><div class="dg-nav-ctas"><a id="dg-nav-hire" class="dg-cta dg-cta-hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">'+COPY.navCta+'</a><a id="dg-nav-talent" class="dg-cta dg-cta-talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">'+COPY.navCtaTalent+'</a></div>';
  document.body.prepend(top);
}
function trust(){/* v210: no visual wall — sr-only one-liner for a11y */ var old=q('#demigod-trust-block'); if(old)old.remove(); var f=q('footer,.footer'); if(!f||q('#demigod-trust-block'))return; var el=document.createElement('section'); el.id='demigod-trust-block'; el.setAttribute('aria-label','How it works'); el.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'; el.innerHTML='<p>Brief or profile → human match → mutual yes → intro. 10% on hire.</p>'; if(f.parentNode)f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
function mob(){if(q('#dg-bar'))return;var b=document.createElement('nav');b.id='dg-bar';b.setAttribute('aria-label','Mobile actions');b.innerHTML='<a class="dg-h" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire" aria-label="I\'m hiring — open startup brief">'+COPY.ctaFounder+'</a><a class="dg-j" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent" aria-label="Find a job — open talent profile">'+COPY.ctaEngineer+'</a>';document.body.appendChild(b)}
function foot(){var f=q('footer,.footer');if(!f)return;if(!q('#dg-legal-links')){var lg=document.createElement('p');lg.id='dg-legal-links';lg.style.cssText='margin:.5rem 0;font-size:.8rem';lg.innerHTML='<a href="/?p=how" data-dg-page="how" style="color:#C9A84C;margin-right:.75rem">How</a><a href="/?p=pricing" data-dg-page="pricing" style="color:#C9A84C;margin-right:.75rem">Pricing</a><a href="/?p=faq" data-dg-page="faq" style="color:#C9A84C;margin-right:.75rem">FAQ</a><a href="/?p=compare" data-dg-page="compare" style="color:#C9A84C;margin-right:.75rem">Compare</a><a href="/?p=legal" data-dg-page="legal" style="color:#A8A29E;margin-right:.75rem">Legal</a><a href="/?p=about" data-dg-page="about" style="color:#A8A29E;margin-right:.75rem">About</a><a href="/?p=status" data-dg-page="status" style="color:#A8A29E;margin-right:.75rem">Status</a><a href="mailto:hello@trydemigod.com" style="color:#C9A84C">hello@trydemigod.com</a>';f.appendChild(lg);lg.addEventListener('click',function(e){var a=e.target.closest('[data-dg-page]');if(!a)return;e.preventDefault();openPage(a.getAttribute('data-dg-page'),true);})}qa('footer nav,footer ul,footer .w-col,footer [class*="column"],footer section',f).forEach(function(c){var t=c.textContent||'';if(t.length<8||t.length>8000)return;if(/Company|Services|Resources|Legal|ABOUT|TEAM|CAREERS|Facebook|Instagram|LinkedIn|YouTube|GET STARTED/i.test(t)&&!/hello@trydemigod|© 2026/i.test(t))c.style.setProperty('display','none','important')});qa('footer a[href="#"]',f).forEach(function(a){var p=a.closest('li,nav,div')||a;if(!/hello@trydemigod/i.test(p.textContent||''))p.style.setProperty('display','none','important')});qa('footer .footer_icon-group,footer .button-group,footer [class*="social"]',f).forEach(function(g){g.style.setProperty('display','none','important')});if(!q('#demigod-footer-tag')){var p=document.createElement('p');p.id='demigod-footer-tag';p.style.cssText='color:#9ca3af;font-size:.9rem;margin:.5rem 0 1rem;max-width:42rem';p.textContent=COPY.footerTag;var c=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c&&c.parentNode)c.parentNode.insertBefore(p,c)}if(!q('#footer-email')){var a=document.createElement('a');a.id='footer-email';a.href='mailto:hello@trydemigod.com';a.textContent='hello@trydemigod.com';a.style.cssText='display:block!important;color:#c9a84c;font-size:.95rem;margin:.75rem 0;text-decoration:none';var c2=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c2&&c2.parentNode)c2.parentNode.insertBefore(a,c2)}qa('footer .text-color_secondary,footer [class*="copyright"]',f).forEach(function(el){el.style.fontSize='0.875rem';el.style.lineHeight='1.4';el.textContent='© 2026 Demigod. All rights reserved.'});if(!q('#dg-copyright')&&!qa('footer .text-color_secondary,footer [class*="copyright"]',f).length){var cp=document.createElement('p');cp.id='dg-copyright';cp.textContent='© 2026 Demigod. All rights reserved.';cp.style.cssText='color:#A8A29E;font-size:.875rem;margin:.5rem 0 0';var bot=f.querySelector('.footer_bottom')||f;bot.appendChild(cp)}}
function rmOrphanForms(){qa('form.w-form').forEach(function(f){if(f.closest('#startup-modal,#jobseeker-modal'))return;var n=(f.getAttribute('data-name')||f.name||'').toLowerCase();if(n==='email-form'||n==='test-form'||f.id==='email-form'){(f.closest('section,.w-form-wrap,div')||f).remove()}})}
function hide(f){try{detachTrap(true)}catch(e){}[S,J].forEach(function(id){if(!f&&OPEN===id)return;var m=q(id);if(m){m.style.display='none';m.setAttribute('aria-hidden','true')}}); if(document.body){ var prev = document.body.dataset.prevOverflow || ''; var sy = parseInt(document.body.dataset.prevScrollY || '0', 10); document.body.style.overflow = prev; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; delete document.body.dataset.prevOverflow; delete document.body.dataset.prevScrollY; try { window.scrollTo(0, sy); } catch(e){} } if(document.documentElement) document.documentElement.style.overflow=''; try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){} }
var busy=false,tmr=null,OBS=null,LAST_FOCUS=null,TRAP_H=null;
function focusables(root){if(!root)return[];return qa('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',root).filter(function(el){try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&!el.disabled}catch(e){return true}})}
function attachTrap(m){detachTrap(false);LAST_FOCUS=document.activeElement;TRAP_H=function(e){if(e.key!=='Tab'||!OPEN)return;var modal=q(OPEN);if(!modal)return;var list=focusables(modal);if(!list.length){e.preventDefault();return}var first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();try{last.focus()}catch(_){}}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();try{first.focus()}catch(_){}}else if(!modal.contains(document.activeElement)){e.preventDefault();try{first.focus()}catch(_){}}};document.addEventListener('keydown',TRAP_H,true)}
function detachTrap(restore){if(TRAP_H){document.removeEventListener('keydown',TRAP_H,true);TRAP_H=null}if(restore!==false&&LAST_FOCUS&&LAST_FOCUS.focus){try{LAST_FOCUS.focus()}catch(e){}}LAST_FOCUS=null}
function wizCss(){if(q('#dg-wiz-css'))return;var s=document.createElement('style');s.id='dg-wiz-css';s.textContent='#startup-modal input:not([type=checkbox]):not([type=radio]),#startup-modal select,#startup-modal textarea,#jobseeker-modal input:not([type=checkbox]):not([type=radio]),#jobseeker-modal select,#jobseeker-modal textarea{font-size:16px!important;min-height:44px;line-height:1.35}#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{min-height:44px!important;padding:12px 16px!important;touch-action:manipulation}#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{position:sticky;top:0;z-index:5;background:rgba(10,10,10,.96);padding:.5rem 0 .35rem;backdrop-filter:blur(6px)}#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{height:4px;background:rgba(201,168,76,.15);border-radius:2px;overflow:hidden;margin:.35rem 0 .5rem}#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{display:block;height:100%;background:linear-gradient(90deg,#C9A84C,#e8c96a);transition:width .25s ease}#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q{font-size:1.15rem;font-weight:600;color:#F5F0E6;margin:.35rem 0}#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{font-size:.85rem;color:#A8A29E;margin:0 0 .5rem;line-height:1.4}@media(max-width:767px){#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{flex-direction:column!important;gap:8px!important;display:flex!important}#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{width:100%!important}#startup-modal,#jobseeker-modal{padding-bottom:env(safe-area-inset-bottom,0)}#dg-bar a{min-height:44px;display:flex;align-items:center;justify-content:center}}@media(prefers-reduced-motion:reduce){#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{transition:none}}#startup-modal .dg-wiz-review,#jobseeker-modal .dg-wiz-review{border:1px solid rgba(201,168,76,.28);border-radius:12px;padding:.75rem .9rem;margin:.5rem 0 .75rem;background:rgba(14,14,18,.92);max-height:40vh;overflow:auto}#startup-modal .dg-wiz-review h3,#jobseeker-modal .dg-wiz-review h3{color:#C9A84C;font-size:.85rem;margin:0 0 .5rem;letter-spacing:.04em;text-transform:uppercase}#startup-modal .dg-wiz-review dt,#jobseeker-modal .dg-wiz-review dt{color:#A8A29E;font-size:.72rem;margin-top:.4rem}#startup-modal .dg-wiz-review dd,#jobseeker-modal .dg-wiz-review dd{color:#F5F0E6;font-size:.9rem;margin:0 0 .15rem;line-height:1.4}#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{box-shadow:0 0 0 1px rgba(201,168,76,.3),0 6px 20px rgba(0,0,0,.35)}';document.head.appendChild(s)}

function fileUploadHonest(){qa('#startup-modal input[type=file],#jobseeker-modal input[type=file],form input[type=file]').forEach(function(fi){if(fi.dataset.dgFileHonest)return;fi.dataset.dgFileHonest='1';var wrap=fi.closest('.dg-field-wrap,.w-file-upload,div')||fi.parentElement;var hint=document.createElement('p');hint.className='dg-file-honest';hint.style.cssText='color:#A8A29E;font-size:.8rem;margin:.35rem 0';hint.textContent='Tip: paste a Drive/Dropbox link if upload is flaky, or email the file to hello@trydemigod.com.';var link=document.createElement('input');link.type='url';link.className='w-input';link.name=(fi.name||'file')+'-url';link.placeholder='https://… link to file (optional)';if(wrap){wrap.appendChild(hint);wrap.appendChild(link);}var form=fi.closest('form');if(form&&!form.dataset.dgFileVal){form.dataset.dgFileVal='1';form.addEventListener('submit',function(){try{var files=[].slice.call(form.querySelectorAll('input[type=file]'));var urls=[].slice.call(form.querySelectorAll('input[type=url][name$="-url"]'));var hasFile=files.some(function(x){return x.files&&x.files.length});var hasUrl=urls.some(function(x){return (x.value||'').trim().length>8});if(!hasFile&&!hasUrl){/* optional files — allow submit; surface tip only */}else if(!hasFile&&hasUrl){/* ok */} }catch(e){}});}});}

/* === BRAND ASSETS — hero bg + path-pill chrome (dedupe by #dg-brand-assets) === */
function cta(){/*dg-cta-prefetch*/
  try{
    if(!window.__dgCtaPref){
      window.__dgCtaPref=1;
      document.addEventListener('pointerenter',function(e){
        var a=e.target&&e.target.closest&&e.target.closest('[data-dg-cta],.hero-actions a');
        if(!a)return;
        // warm modal shells
        try{ q('#startup-modal'); q('#jobseeker-modal'); }catch(err){}
      },true);
    }
  }catch(e){}

  function wireCta(a, kind){
    if (!a || a.closest('#startup-modal,#jobseeker-modal')) return;
    var hire = kind === 'startup';
    var label = hire ? COPY.ctaFounder : COPY.ctaEngineer;
    try {
      var span = a.querySelector('.btn-label,.button_label');
      if (span) {
        span.textContent = label;
        Array.prototype.forEach.call(a.childNodes, function(n){
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
      } else {
        a.textContent = label;
      }
    } catch (e) { try { a.textContent = label; } catch (_) {} }
    a.setAttribute('href', hire ? '/?wiz=startup' : '/?wiz=engineer');
    a.setAttribute('data-demigod-modal', hire ? 'startup' : 'jobseeker');
    a.setAttribute('data-dg-cta', hire ? 'hire' : 'talent');
    a.setAttribute('aria-label', hire ? "I'm hiring — open startup brief" : 'Find a job — open talent profile');
    a.classList.toggle('is-talent', hire);
    a.classList.toggle('is-job', !hire);
  }
  qa('a.premium-btn.is-talent,a.is-talent.premium-btn,a.is-talent').forEach(function(a){ wireCta(a, 'startup'); });
  qa('a.premium-btn.is-job,a.is-job.premium-btn,a.is-job').forEach(function(a){ wireCta(a, 'engineer'); });
  var heroPair = qa('.hero-actions a.premium-btn,.hero-actions a.button,.hero-section .hero-actions a,.hero-content-left a.premium-btn,.hero-content-left a.button');
  if (heroPair.length >= 2) {
    wireCta(heroPair[0], 'startup');
    wireCta(heroPair[1], 'engineer');
  } else if (heroPair.length === 1) {
    wireCta(heroPair[0], 'startup');
  }
  var heroAll = qa('.hero-section a.premium-btn, header a.premium-btn, .header a.premium-btn');
  if (heroAll.length >= 2) {
    wireCta(heroAll[0], 'startup');
    wireCta(heroAll[1], 'engineer');
  }
  qa('a,button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal,footer,#dg-faq')) return;
    if (a.getAttribute('data-dg-cta')) return;
    if (a.closest('#dg-path-pills,#dg-bar')) return;
    if (a.classList.contains('is-job')) { wireCta(a, 'engineer'); return; }
    if (a.classList.contains('is-talent')) { wireCta(a, 'startup'); return; }
    var t = (a.textContent || '').trim().split('\n')[0].replace(/\s+/g, ' ');
    if (/^(JOIN NETWORK|GET JOB|FIND A JOB|I'M LOOKING|I'M A CANDIDATE|FIND YOUR NEXT JOB|GET MATCHED|FOR TALENT)$/i.test(t)) {
      wireCta(a, 'engineer'); return;
    }
    if (/^(HIRE TALENT|FIND TALENT|POST A JOB|I'M HIRING|FIND YOUR NEXT HIRE|GET STARTED|CHOOSE COMMISSION)$/i.test(t)) {
      var row = a.parentElement;
      var sibs = row ? qa('a.premium-btn,a.button', row) : [];
      if (sibs.length >= 2 && sibs[1] === a) wireCta(a, 'engineer');
      else wireCta(a, 'startup');
    }
  });
  qa('#dg-path-pills a[data-demigod-modal=startup],#dg-path-pills a.dg-path-hire').forEach(function(a){ wireCta(a, 'startup'); });
  qa('#dg-path-pills a[data-demigod-modal=jobseeker],#dg-path-pills a.dg-path-talent').forEach(function(a){ wireCta(a, 'engineer'); });
  qa('.pricing-card a, .pricing-grid a, [class*=pricing] a.premium-btn, [class*=pricing] a.button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal')) return;
    wireCta(a, 'startup');
  });
}

function brandAssets(){if(q('#dg-brand-assets'))return;var s=document.createElement('style');s.id='dg-brand-assets';s.textContent=".hero-section,.header{background-image:linear-gradient(115deg,rgba(5,5,8,.9) 0%,rgba(5,5,8,.62) 50%,rgba(5,5,8,.4) 100%),url(https://files.catbox.moe/126k4p.jpg)!important;background-size:cover!important;background-position:70% center!important;min-height:calc(100svh - 4rem)!important;display:flex!important;align-items:center!important;padding:clamp(4rem,12vh,7rem) 1.25rem!important}.hero-section h1,.header h1,.hero-title{text-shadow:0 2px 24px rgba(0,0,0,.55);letter-spacing:-.02em;max-width:18ch!important;font-size:clamp(2rem,5.5vw,3.25rem)!important;line-height:1.08!important;margin:.5rem 0 .75rem!important;animation:dg-hero-in .55s cubic-bezier(.2,.8,.2,1) both}.hero-section p,.header p,.subheading,.hero-description{max-width:34ch!important;font-size:1.05rem!important;line-height:1.5!important;color:#A8A29E!important;margin:0 0 1.25rem!important;animation:dg-hero-in .55s .08s cubic-bezier(.2,.8,.2,1) both}.hero-actions{display:flex!important;flex-wrap:wrap!important;gap:.75rem!important;align-items:stretch!important;margin-top:.25rem;animation:dg-hero-in .55s .14s cubic-bezier(.2,.8,.2,1) both}.hero-actions a.premium-btn,.hero-actions a.button,.hero-actions a.w-button,#dg-bar a.dg-h,#dg-bar a.dg-j,#dg-nav-hire,#dg-nav-talent,a.premium-btn[data-dg-cta],a.button[data-dg-cta]{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:48px!important;padding:.75rem 1.4rem!important;border-radius:12px!important;font-weight:700!important;font-size:.95rem!important;line-height:1.2!important;text-decoration:none!important;white-space:nowrap!important;cursor:pointer!important;transition:transform .15s ease,filter .15s ease,box-shadow .15s ease}.hero-actions a[data-dg-cta=hire],.hero-actions a.is-talent,#dg-bar a.dg-h,#dg-nav-hire,a[data-dg-cta=hire]{background:#C9A84C!important;color:#0A0A0A!important;border:1px solid #C9A84C!important;box-shadow:0 8px 28px rgba(201,168,76,.18)}.hero-actions a[data-dg-cta=talent],.hero-actions a.is-job,#dg-bar a.dg-j,#dg-nav-talent,a[data-dg-cta=talent]{background:rgba(10,10,10,.45)!important;color:#E8D5A3!important;border:1.5px solid rgba(201,168,76,.9)!important}.hero-actions a:hover,a[data-dg-cta]:hover{filter:brightness(1.06);transform:translateY(-1px)}.hero-actions a .btn-label,.hero-actions a .button_label{display:inline!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;color:inherit!important;font:inherit!important}#demigod-trust-block,#dg-faq,#dg-proof-strip,#dg-pipeline-note,#dg-contact-strip,#dg-path-pills,#dg-hero-trust,#insights-section,.insights-section,.hero-content-right,.statue-frame,.statue-svg,.statue-wrapper{display:none!important}section.trust-section,section.roles-section,section.pricing-section,section.process-section,[data-dg-hidden=home-minimal]{display:none!important}main > section:not(.hero-section):not(.header),body > section:not(.hero-section):not(.header):not([id*=modal]):not(#startup-modal):not(#jobseeker-modal){display:none!important}footer .w-layout-grid,footer .footer_icon-group,footer .button-group,footer nav:not(:has(a[href^=mailto])),footer ul{display:none!important}footer,.footer{padding:1.5rem 1rem 2rem!important;text-align:center!important}#demigod-footer-tag,footer .footer-tagline{font-size:.85rem!important;color:#A8A29E!important;max-width:28rem;margin:.35rem auto!important}@keyframes dg-hero-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.hero-section h1,.hero-section p,.hero-actions{animation:none!important}}@media(max-width:767px){.hero-actions{display:none!important}#dg-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:9998;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))!important;background:rgba(6,6,6,.97)!important;border-top:1px solid rgba(201,168,76,.28)!important}#dg-bar a{min-width:0!important;min-height:48px!important;border-radius:12px!important;font-size:.9rem!important;font-weight:700!important;padding:.65rem .5rem!important;display:flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important}body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}.hero-section,.header{min-height:calc(100svh - 72px)!important;padding:4rem 1.1rem 2rem!important}.hero-section h1,.header h1{font-size:clamp(1.65rem,7.5vw,2.4rem)!important}}@media(min-width:768px){#dg-bar{display:none!important}body{padding-bottom:0!important}}#startup-modal input:focus,#startup-modal select:focus,#startup-modal textarea:focus,#jobseeker-modal input:focus,#jobseeker-modal select:focus,#jobseeker-modal textarea:focus{outline:2px solid #C9A84C;outline-offset:2px;border-color:#C9A84C!important}";document.head.appendChild(s)}

/* ==== SECTION: boot run() — single entry after DOM ready ==== */
/* === IDEMPOTENT BOOT ORCHESTRATOR — safe to rerun; injections must dedupe by stable owner id === */
function ensureA11yCss(){if(q('#dg-focus-ring'))return;var fr=document.createElement('style');fr.id='dg-focus-ring';fr.textContent='a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.premium-btn:focus-visible,.dg-page-x:focus-visible,#dg-bar a:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}';document.head.appendChild(fr);if(!q('#dg-legal-mobile')){var lm=document.createElement('style');lm.id='dg-legal-mobile';lm.textContent='@media(max-width:767px){#dg-legal-links{font-size:.75rem!important;gap:.25rem .55rem!important;padding:0 .5rem;justify-content:center}#dg-legal-links a{margin-right:0!important}}';document.head.appendChild(lm)}}
function run(){if(busy)return;busy=true;try{brandAssets();ensureA11yCss()}catch(e){}if(OBS)OBS.disconnect();try{forceMainVisible();skipLink();heroImgPerf();lazyBelowFold();wizCss();faqCss();hero();copy();forms();fileUploadHonest();cta();nav();try{wireLogoHome()}catch(e){}(function roles(){qa('h2').forEach(function(h){if(/Live SF startup roles hiring now/i.test(h.textContent||''))h.textContent='Example roles — labeled samples'});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$/i.test((b.textContent||'').trim()))b.textContent='EXAMPLE ROLES'});qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.7rem;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)});var junk=new RegExp(['l','orem'].join('')+'|consectetur','i');qa('section,div,[class*=role]').forEach(function(c){if(c!==document.body&&c!==document.documentElement&&!c.matches?.('main,.hero-section,header,footer')&&junk.test(c.textContent||'')&&(c.textContent||'').length<2000)c.style.setProperty('display','none','important')});var ins=q('#insights-section');if(ins)ins.style.setProperty('display','none','important');qa('h3.step-title,.step-title,h2,h3').forEach(function(h){if(/Meet Your 3-5|Lightning Fast|100% Vetted/i.test(h.textContent||'')){var card=h.closest('.step-card,div,section')||h;if(/Meet Your 3-5/i.test(h.textContent||''))h.textContent='Meet curated matches';if(/Lightning Fast/i.test(h.textContent||''))h.textContent='Human-paced matching';if(/^100% Vetted/i.test(h.textContent||''))h.textContent='Human-reviewed'}});qa('p,li,span,div').forEach(function(el){if(el.children&&el.children.length>2)return;var tx=el.textContent||'';if(tx.length>200)return;if(/90-?\s*day replacement guarantee/i.test(tx)&&!el.closest('#startup-modal,#jobseeker-modal')){el.textContent=tx.replace(/90-?\s*day replacement guarantee/ig,'90-day outcome focus (replacement policy pending)')}})})();trust();mob();foot();rmOrphanForms();successCta();if(!OPEN)hide();/* v210: essays off; trust sr-only */dedupeAll();scrubTimeClaims();scrubStaticLabels();qa('a[target=_blank]').forEach(function(a){var r=a.getAttribute('rel')||'';if(r.indexOf('noopener')<0)a.setAttribute('rel',(r+' noopener noreferrer').trim())})}catch(e){console.error('Demigod foot fail',e)}finally{if(OBS){OBS.takeRecords();OBS.observe(document.documentElement,{childList:true,subtree:true})}busy=false}}

function dedupeAll(){
  // Extremely aggressive dedupe for duplicate CTAs, badges, footer (Fable spec + live audit findings)
  var killExact = ['FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', "I'M HIRING", 'FIND A JOB', 'SF BAY AREA STARTUP MATCHING'];
  killExact.forEach(function(needle){
    var matches = [];
    qa('a, button, .button, .premium-btn, [data-demigod-modal], .badge-text, .eyebrow').forEach(function(el){
      if (el.closest('#dg-bar,#dg-path-pills,.hero-actions')) return;
      if (el.closest && el.closest('a.premium-btn')) return;
      var t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.toUpperCase() === needle) matches.push(el);
    });
    for (var i = 1; i < matches.length; i++) {
      var el = matches[i];
      dgHide(el.closest('li,div,nav,header,.w-nav, .badge, .hero-badge, .w-form') || el);
    }
  });

  // Extra badges / repeated eyebrow
  qa('.badge-text, .eyebrow').forEach(function(b, i){ if (i > 0) dgHide(b); });

  // Footer copyright / repeated lines
  var f = q('footer,.footer');
  if (f) {
    var seenF = {};
    qa('p,span,div,a', f).forEach(function(el){
      var tx = (el.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (tx.length > 4 && (/copyright|all rights reserved|demigod/i.test(tx))) {
        if (seenF[tx]) el.style.setProperty('display','none','important');
        else seenF[tx] = true;
      }
    });
  }

  /* v190: seenTop nav dedupe removed — killExact already covers */
}

/* ==== SECTION: honesty scrub (no SLA/48h) ==== */
/* === HONESTY BACKSTOP — scrub runtime/static SLA/48h claims; canonical copy belongs in COPY/Designer === */
function scrubTimeClaims(){
  var bad = /(?:respond|reply|answer|get back)\s+within|within\s*\d+\s*(hours?|hrs?|h|days?)|24\s*h(?:ours?)?|48\s*h(?:ours?)?|same day|quickly|fast response|match(?:es|ing)?\s+within\s+\d+/i;
  var rep = 'hello@trydemigod.com will follow up';
  var fullLeaf = /humans?\s+match\s+within|within\s*48\s*h|within\s*24\s*h|3-?5\s+matches?\s+in\s+\d+/i;
  // Static Webflow pricing FOUC: bare "guarantee" without pending honesty
  var bareGuarantee = /90-?\s*day\s+replacement\s+guarantee|(?<!pending.{0,40})\breplacement guarantee\b/i;
  // Webflow native success boxes — full rewrite (source still has 24h until Designer edit)
  qa('.w-form-done, .w-form-done div, .w-form-done p').forEach(function(el){
    var txt = el.textContent || '';
    if (!txt) return;
    if (el.children && el.children.length > 1) return;
    if (bad.test(txt) || /thank you! we have received/i.test(txt)) {
      el.textContent = 'Thank you! ' + rep + '.';
    }
  });
  // Leaf elements (incl. form success copy + static step titles with 48h)
  qa('*').forEach(function(el){
    if (el.closest('script,style,noscript')) return;
    if (el.children && el.children.length) return;
    var txt = el.textContent || '';
    if (/hello@trydemigod\.com will follow up/i.test(txt)) return;
    if (fullLeaf.test(txt) && txt.length < 120) {
      el.textContent = 'Human review — ' + rep;
      return;
    }
    if (bareGuarantee.test(txt) && txt.length < 200) {
      el.textContent = '10% on hire · 90-day outcome focus (no SLA promise)';
      return;
    }
    if (/pre-vetted|Dedicated talent partner/i.test(txt) && txt.length < 160 && !el.closest('#startup-modal,#jobseeker-modal')) {
      el.textContent = txt.replace(/pre-vetted/ig,'curated').replace(/Dedicated talent partner/ig,'Human matching');
      return;
    }
    if (bad.test(txt)) {
      el.textContent = txt.replace(bad, rep).replace(/\s{2,}/g,' ').trim();
    }
  });
  // Text nodes (catches mixed content)
  try {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue || !bad.test(n.nodeValue)) continue;
      if (n.parentElement && n.parentElement.closest('script,style')) continue;
      if (fullLeaf.test(n.nodeValue) && n.nodeValue.length < 120) {
        n.nodeValue = 'Human review — ' + rep;
      } else {
        n.nodeValue = n.nodeValue.replace(bad, rep);
      }
    }
  } catch (e) {}
  // Always normalize Webflow success copy (source may still say 24h)
  qa('#startup-modal .w-form-done div, #startup-hire ~ .w-form-done div, .w-form-done div').forEach(function(el){
    if (!el || (el.children && el.children.length)) return;
    var tx = el.textContent || '';
    if (/within|24\s*h|get back to you/i.test(tx) || /we have received your brief/i.test(tx)) {
      el.textContent = 'Thank you! hello@trydemigod.com will follow up.';
    }
  });
}

function scrubStaticLabels(){
  // SAFE scrub: only leaf Webflow title strings. NEVER hide #startup-modal / #jobseeker-modal / form containers.
  try {
    if (document.title && /HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(document.title)) {
      document.title = 'Demigod • Human-Matched SF Startup Talent';
    }
  } catch(e){}
  var leafRe = /^(STARTUP HIRING FORM|HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|Hiring Model|EXAMPLE BRIEFS)$/i;
  qa('h1,h2,h3,.w-form-title,[class*="form-title"],label').forEach(function(el){
    var t = (el.textContent || '').trim();
    if (!leafRe.test(t)) return;
    if (el.closest && el.closest('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review,.dg-field-wrap')) return;
    el.style.setProperty('display','none','important');
    el.textContent = '';
  });
  // Hide lorem / insights junk cards (leaf container only)
  qa('.step-card,[class*="role-card"]').forEach(function(c){
    if (dgIsPageShell(c)) return;
    var t = (c.textContent || '').toLowerCase();
    if (t.length > 800) return;
    if (/lorem ipsum|consectetur adipiscing/.test(t) || (/insights/.test(t) && /lorem|consectetur/.test(t))) {
      dgHide(c);
    }
  });
}

function show(id){if(!q(id))run();var m=q(id);if(!m)return;OPEN=id;try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');try{var title=m.querySelector('.dg-wiz-q,h2,h3,[class*=title]');if(title){if(!title.id)title.id='dg-modal-title-'+(id==='#startup-modal'?'startup':'jobseeker');m.setAttribute('aria-labelledby',title.id);}else{m.setAttribute('aria-label',id==='#startup-modal'?'Hire SF startup talent':'Join talent network');}}catch(e){}if(document.body){ if(!document.body.dataset.prevOverflow){ document.body.dataset.prevOverflow = document.body.style.overflow || getComputedStyle(document.body).overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){ document.documentElement.style.overflow='hidden'; } setTimeout(function(){var fi=m.querySelector('input:not([type=hidden]),select,textarea');if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
// extra force for form and title scrub to fix blank and bad title on live
try {
  const f = m.querySelector('form');
  if (f) {
    f.style.setProperty('display','block','important');
    f.style.setProperty('visibility','visible','important');
  }
  qa('h2,h3,[class*="title"],[class*="subtitle"],p', m).forEach(function(el){
    if (/HIRING FORM|APPLICATION|BRIEFS/i.test(el.textContent || '')) {
      el.style.setProperty('display','none','important');
      el.textContent = '';
    }
  });
} catch(e){}
// inject strong override style + direct force to beat Webflow hiding of forms/fields (fixes vis=0 / form none)
try {
  if (!document.getElementById('dg-wiz-force-style')) {
    var st = document.createElement('style'); st.id='dg-wiz-force-style';
    st.textContent = '#startup-modal form,#jobseeker-modal form,#startup-modal .w-form,#jobseeker-modal .w-form{display:block!important;visibility:visible!important}#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{display:block!important;visibility:visible!important}#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{display:flex!important;visibility:visible!important}#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show{display:block!important;visibility:visible!important}';
    document.head.appendChild(st);
  }
  qa('form,.w-form,.dg-wiz-head,.dg-wiz-nav,.dg-wiz-show', m).forEach(function(c){if(!c)return; var d=c.classList&&c.classList.contains('dg-wiz-nav')?'flex':'block'; c.style.setProperty('display',d,'important');c.style.setProperty('visibility','visible','important');});
} catch(e){}
// WIZ init — build once; reopen reuses instance (v194 idempotent)
try {
  var mf = m.querySelector('form') || (id===S ? q('#startup-hire') : q('#engineer-join'));
  if (mf) {
    mf.classList.remove('w-form-loading');
    mf.style.setProperty('display', 'block', 'important');
    mf.style.visibility = 'visible';
    var p=mf; while(p && p!== document.body){ try{ p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p = p.parentElement; }
    if (m) { m.style.setProperty('display', 'flex', 'important'); m.style.setProperty('visibility', 'visible', 'important'); }
    if (typeof scrubStaticLabels === 'function') scrubStaticLabels();
    try { if (document.title && /HIRING|APPLICATION|BRIEFS/i.test(document.title)) document.title = document.title.replace(/HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/gi,'').trim() || document.title; } catch(e){}
    var firstBuild = !mf.dataset.dgWizBuilt;
    if (firstBuild) {
      if (typeof forms === 'function') forms();
      if (typeof wizBuild === 'function' && !mf.dataset.dgWizBuilt) wizBuild(mf, (id===S?'startup':'engineer'));
    } else if (typeof mf.__dgWizShow === 'function') {
      try { mf.__dgWizShow(); } catch(e){}
    }
    // chrome visibility only — do not force showStep(0) on reopen (preserves step)
    try {
      var hd = m.querySelector('.dg-wiz-head');
      if (hd) { hd.style.setProperty('display','block','important'); hd.style.setProperty('visibility','visible','important'); }
      var nv = m.querySelector('.dg-wiz-nav');
      if (nv) { nv.style.setProperty('display','flex','important'); nv.style.setProperty('visibility','visible','important'); }
      var n = m.querySelector('.dg-wiz-next'); if(n){ n.style.display='inline-block'; n.style.visibility='visible'; n.disabled=false; }
    } catch(e){}
    forceWizVisible(mf, m);
    var forceCount=0; var fr = setInterval(function(){
      forceCount++;
      if(forceCount>2){clearInterval(fr);return;}
      if(mf){ mf.style.setProperty('display','block','important'); mf.style.visibility='visible'; }
      forceWizVisible(mf, m);
      scrubStaticLabels();
    }, 180);
  }
  try { attachTrap(m); } catch(e){}
} catch(e){}
}
function sched(){if(tmr)clearTimeout(tmr);tmr=setTimeout(function(){tmr=null;run()},120)}

function ensureHowLink(){if(q('#dg-how-it-works'))return;var host=q('#dg-proof-strip')||q('#dg-faq')||q('#dg-contact-strip')||q('footer,.footer');if(!host)return;var a=document.createElement('p');a.id='dg-how-it-works';a.style.cssText='text-align:center;margin:1rem auto;padding:0 1rem';a.innerHTML='<a href="'+HOW_IT_WORKS+'" style="color:#C9A84C;font-weight:600;min-height:44px;display:inline-flex;align-items:center">How matching works →</a>';if(host.parentNode)host.parentNode.insertBefore(a,host.nextSibling);else host.appendChild(a)}
/* === DEEP LINK — /?wiz=startup|engineer (+ hash aliases); product /?p= is same-origin shell route === */
/* === SIMPLE PAGES (?p=) — short secondary screens; home stays a decision screen === */
var DG_PAGES = {
  how: {
    title: 'How it works',
    doc: 'How it works · Demigod',
    desc: 'Four steps. Human match. Mutual yes. 10% on hire.',
    html:
      '<ol class="dg-p-list">' +
      '<li><strong>Brief or profile</strong> — startups: role + 90-day outcome. Talent: one profile.</li>' +
      '<li><strong>Human review</strong> — a person reads both sides. No blasts.</li>' +
      '<li><strong>Small proposal</strong> — only when fit is real.</li>' +
      '<li><strong>Mutual yes → intro</strong> — both sides opt in. Fee only if you hire.</li>' +
      '</ol>',
  },
  pricing: {
    title: 'Pricing',
    doc: 'Pricing · Demigod',
    desc: '10% of first-year salary on hire. No upfront fee. Candidates free.',
    html:
      '<p class="dg-p-lead">Startups pay <strong>10%</strong> of first-year cash salary only when a hire starts.</p>' +
      '<ul class="dg-p-list">' +
      '<li>No subscription. No charge to submit a brief.</li>' +
      '<li>Candidates join free.</li>' +
      '<li>Payments/SMS still pending — confirmations by email from hello@trydemigod.com.</li>' +
      '</ul>',
  },
  faq: {
    title: 'FAQ',
    doc: 'FAQ · Demigod',
    desc: 'Short answers about Demigod matching.',
    html:
      '<details class="dg-p-det"><summary>What happens after I submit?</summary><p>A human reads it. If fit looks real, we propose only with mutual yes. hello@trydemigod.com follows up — no SLA clock.</p></details>' +
      '<details class="dg-p-det"><summary>Is this a job board?</summary><p>No. Humans curate; no spam lists.</p></details>' +
      '<details class="dg-p-det"><summary>How much does it cost?</summary><p>10% on hire for startups. Free for talent. Typical agencies run higher.</p></details>' +
      '<details class="dg-p-det"><summary>Is my profile private?</summary><p>Yes until a mutual-yes intro.</p></details>' +
      '<details class="dg-p-det"><summary>Are payments live?</summary><p>Not yet. Confirmations by email. SMS pending.</p></details>',
  },
  hire: {
    title: "I'm hiring",
    doc: 'Hire · Demigod',
    desc: 'Human-matched SF talent. 10% on hire.',
    html:
      '<p class="dg-p-lead">Tell us the role and the 90-day outcome. We propose only strong fits.</p>' +
      '<ul class="dg-p-list"><li>~2 min brief</li><li>Human review, not a bot</li><li>Pay only when you hire</li></ul>',
  },
  talent: {
    title: 'Find a job',
    doc: 'Talent · Demigod',
    desc: 'One profile. Private until mutual yes. Free.',
    html:
      '<p class="dg-p-lead">One profile for SF startups. Private until a human sees a real fit — then you still say yes.</p>' +
      '<ul class="dg-p-list"><li>Free for candidates</li><li>No board spam</li><li>Mutual yes before intro</li></ul>',
  },
  contact: {
    title: 'Contact',
    doc: 'Contact · Demigod',
    desc: 'hello@trydemigod.com',
    html:
      '<p class="dg-p-lead">Email <a href="mailto:hello@trydemigod.com">hello@trydemigod.com</a>. A human replies. SMS/payments pending.</p>',
  },
  legal: {
    title: 'Privacy & Terms',
    doc: 'Legal · Demigod',
    desc: 'Plain-language privacy and terms.',
    html:
      '<h3 class="dg-p-h3">Privacy</h3><p>We use your brief or profile to match. No selling lists. Profiles shared only after mutual yes. Contact us to update or delete data: hello@trydemigod.com.</p>' +
      '<h3 class="dg-p-h3">Terms</h3><p>Demigod introduces parties; employment decisions are yours. Placement fee is 10% of first-year cash salary when a hire starts (unless written otherwise). Payments tooling is pending — commercial confirmations by email. SF Bay Area focus. No SLA promises on response time.</p>',
  },
  partners: {
    title: 'Partners',
    doc: 'Partners · Demigod',
    desc: 'Refer talent. Earn on successful hire.',
    html:
      '<p class="dg-p-lead">Refer outstanding candidates to SF startups. Earn <strong>20%</strong> of the placement fee on successful hires.</p>' +
      '<p>Email <a href="mailto:hello@trydemigod.com">hello@trydemigod.com</a> with “Partner” in the subject.</p>',
  },
  compare: {
    title: 'Compare',
    doc: 'Compare · Demigod',
    desc: 'Boards vs agencies vs Demigod — short.',
    html:
      '<div class="dg-p-grid">' +
      '<div><strong>Job boards</strong><p>Volume. You sort noise.</p></div>' +
      '<div><strong>Agencies</strong><p>Often 15–25%. Lists.</p></div>' +
      '<div class="dg-p-hi"><strong>Demigod</strong><p>10% on hire. Human. Mutual yes.</p></div>' +
      '</div>',
  },
  pilot: {
    title: 'Pilot',
    doc: 'Pilot · Demigod',
    desc: 'White-glove pilot for SF founders.',
    html:
      '<p class="dg-p-lead">Early partners get white-glove matching while we wire payments/SMS.</p>' +
      '<ul class="dg-p-list"><li>One role focus</li><li>Human-owned intro</li><li>Honest “pending” on tooling</li></ul>' +
      '<p>Email hello@trydemigod.com with “Pilot”.</p>',
  },
  about: {
    title: 'About',
    doc: 'About · Demigod',
    desc: 'Human-matched SF startup talent.',
    html:
      '<p class="dg-p-lead">Demigod is a human layer between SF startups and talent. Not a job board. Not a blast list.</p>' +
      '<ul class="dg-p-list"><li>90-day outcome first</li><li>Mutual yes before every intro</li><li>10% only when you hire</li></ul>',
  },
  status: {
    title: 'Status',
    doc: 'Status · Demigod',
    desc: 'What is live vs pending.',
    html:
      '<ul class="dg-p-list">' +
      '<li><strong>Live:</strong> briefs, profiles, human matching, email follow-up</li>' +
      '<li><strong>Pending:</strong> SMS (Twilio), card payments (Stripe)</li>' +
      '<li><strong>Fee:</strong> 10% on hire — confirmed by email for now</li>' +
      '</ul><p class="dg-p-lead">Questions: <a href="mailto:hello@trydemigod.com">hello@trydemigod.com</a></p>',
  },
  notfound: {
    title: 'Page not found',
    doc: 'Not found · Demigod',
    desc: 'That page does not exist.',
    html: '<p class="dg-p-lead">No page here. Head home or open a brief.</p>',
  }
};
function pageCss() {
  if (q('#dg-page-css')) return;
  var s = document.createElement('style');
  s.id = 'dg-page-css';
  s.textContent =
    '#dg-page{position:fixed;inset:0;z-index:10050;background:rgba(6,6,6,.92);backdrop-filter:blur(10px);overflow:auto;padding:1rem;animation:dg-page-in .25s ease both}' +
    '#dg-page .dg-page-card{max-width:34rem;margin:2rem auto;background:#121212;border:1px solid rgba(201,168,76,.28);border-radius:16px;padding:1.35rem 1.35rem 1.5rem;color:#F5F0E6;box-shadow:0 20px 60px rgba(0,0,0,.45)}' +
    '#dg-page .dg-page-top{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.75rem}' +
    '#dg-page h1{font-family:Cinzel,Georgia,serif;font-size:1.45rem;color:#C9A84C;margin:0;letter-spacing:.02em}' +
    '#dg-page .dg-page-x{min-width:44px;min-height:44px;border:1px solid rgba(201,168,76,.4);background:transparent;color:#E8D5A3;border-radius:10px;cursor:pointer;font-size:1.1rem}' +
    '#dg-page .dg-p-lead{color:#A8A29E;line-height:1.5;margin:.25rem 0 1rem}' +
    '#dg-page .dg-p-list{margin:.5rem 0 1rem;padding-left:1.15rem;color:#E7E5E4;line-height:1.55}' +
    '#dg-page .dg-p-list li{margin:.4rem 0}' +
    '#dg-page .dg-p-list strong{color:#C9A84C}' +
    '#dg-page .dg-p-det{border-top:1px solid rgba(201,168,76,.15);padding:.55rem 0}' +
    '#dg-page .dg-p-det summary{cursor:pointer;color:#E8D5A3;font-weight:600;min-height:44px;display:flex;align-items:center}' +
    '#dg-page .dg-p-det p{color:#A8A29E;margin:.35rem 0 .25rem;line-height:1.45}' +
    '#dg-page .dg-p-h3{color:#C9A84C;font-size:1rem;margin:1rem 0 .35rem}' +
    '#dg-page .dg-p-grid{display:grid;grid-template-columns:1fr;gap:.65rem}' +
    '#dg-page .dg-p-grid>div{border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:.85rem;background:rgba(10,10,10,.5)}' +
    '#dg-page .dg-p-grid p{color:#A8A29E;margin:.35rem 0 0;font-size:.9rem}' +
    '#dg-page .dg-p-hi{border-color:rgba(201,168,76,.55)!important;background:rgba(201,168,76,.08)!important}' +
    '#dg-page .dg-page-ctas{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.15rem}' +
    '#dg-page .dg-page-ctas a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1.15rem;border-radius:12px;font-weight:700;text-decoration:none!important}' +
    '#dg-page .dg-page-ctas a.hire{background:#C9A84C;color:#0A0A0A}' +
    '#dg-page .dg-page-ctas a.talent{border:1.5px solid rgba(201,168,76,.9);color:#E8D5A3}' +
    '#dg-page .dg-page-ctas a.back{color:#A8A29E;border:1px solid rgba(168,162,158,.35);font-weight:600}' +
    '#dg-page a{color:#C9A84C}' +
    '@keyframes dg-page-in{from{opacity:0}to{opacity:1}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page{animation:none}}' +
    '@media(min-width:640px){#dg-page .dg-p-grid{grid-template-columns:1fr 1fr 1fr}}';
  document.head.appendChild(s);
}
function closePage() {
  var el = q('#dg-page');
  if (el) el.remove();
  if (document.body) document.body.style.overflow = '';
  try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){}
  try {
    var u = new URL(location.href);
    if (u.searchParams.has('p') || u.searchParams.has('page') || (history.state && history.state.dgPage)) {
      u.searchParams.delete('p');
      u.searchParams.delete('page');
      history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
    }
  } catch (e) {}
  try {
    document.title = window.__dgPagePrevTitle || 'Demigod • Human-Matched SF Startup Talent';
    window.__dgPagePrevTitle=null;
  } catch (e) {}
  try {
    var md2=document.querySelector('meta[name=description]');
    if(md2 && window.__dgPagePrevDesc!=null){ md2.setAttribute('content', window.__dgPagePrevDesc); window.__dgPagePrevDesc=null; }
  } catch (e) {}
}
function pageCtas(id) {
  var hire =
    '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">I\'m hiring</a>';
  var talent =
    '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Find a job</a>';
  var back = '<a class="back" href="/" id="dg-page-back">← Home</a>';
  if (id === 'hire') return '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief</a>' + talent + back;
  if (id === 'talent') return '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Create profile</a>' + hire + back;
  if (id === 'contact' || id === 'legal' || id === 'partners') return hire + talent + back;
  return hire + talent + back;
}
function openPage(id, push) {
  var meta = DG_PAGES[id];
  if (!meta) return false;
  pageCss();
  var old = q('#dg-page');
  if (old) old.remove();
  var root = document.createElement('div');
  root.id = 'dg-page';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', meta.title);
  root.innerHTML =
    '<div class="dg-page-card"><div class="dg-page-top"><h1>' +
    meta.title +
    '</h1><button type="button" class="dg-page-x" aria-label="Close">✕</button></div>' +
    meta.html +
    '<div class="dg-page-ctas">' +
    pageCtas(id) +
    '</div></div>';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}
  try {
    if(!window.__dgPagePrevTitle) window.__dgPagePrevTitle=document.title;
    document.title = meta.doc;
  } catch (e) {}
  try {
    var md = document.querySelector('meta[name=description]');
    if (md && meta.desc) {
      if(!window.__dgPagePrevDesc) window.__dgPagePrevDesc=md.getAttribute('content')||'';
      md.setAttribute('content', meta.desc);
    }
  } catch (e) {}
  root.querySelector('.dg-page-x').addEventListener('click', function () {
    closePage();
  });
  var bk = root.querySelector('#dg-page-back');
  if (bk)
    bk.addEventListener('click', function (e) {
      e.preventDefault();
      closePage();
    });
  root.addEventListener('click', function (e) {
    if (e.target === root) closePage();
  });
  qa('[data-demigod-modal]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var k = a.getAttribute('data-demigod-modal');
      closePage();
      if (k === 'startup') show(S);
      else if (k === 'jobseeker') show(J);
    });
  });
  if (push !== false) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('p', id);
      history.pushState({ dgPage: id }, '', u.pathname + u.search);
    } catch (e) {}
  }
  try {
    root.querySelector('.dg-page-x').focus();
  } catch (e) {}

  // soft focus trap
  root.addEventListener('keydown', function(ev){
    if(ev.key!=='Tab') return;
    var f=[].slice.call(root.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
    if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
  });
  return true;
}
function routePages() {
  try {
    var map = {
      '/how': 'how',
      '/pricing': 'pricing',
      '/faq': 'faq',
      '/hire': 'hire',
      '/talent': 'talent',
      '/contact': 'contact',
      '/legal': 'legal',
      '/partners': 'partners',
      '/partnerships': 'partners',
      '/compare': 'compare',
      '/pilot': 'pilot',
      '/network': 'talent',
      '/about': 'about',
      '/status': 'status',
    };
    var p = new URLSearchParams(location.search);
    var id = (p.get('p') || p.get('page') || '').toLowerCase();
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    if (!id) id = map[path] || '';
    if (id === 'network') id = 'talent';
    if (id && DG_PAGES[id]) {
      openPage(id, false);
      return true;
    }
    // soft 404 only for unknown non-root paths that are not site chrome
    if (path && path !== '/' && !/^\/(index\.html)?$/i.test(path) && !map[path]) {
      if (!/^\/(designer|cdn-cgi|api)/i.test(path)) {
        openPage('notfound', false);
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function deepLink(){
  try{ if(routePages()) { window.__dgDeepLinked=1; return; } }catch(e){}
  if(window.__dgDeepLinked)return;
  try{
    var p=new URLSearchParams(location.search);
    var w=(p.get('wiz')||p.get('hire')||p.get('modal')||'').toLowerCase();
    var h=(location.hash||'').replace(/^#/,'').toLowerCase();
    if(!w&&/^(startup|founder|hire|engineer|talent|join|jobseeker)$/.test(h))w=h;
    if(h==='legal'||h==='privacy'||h==='terms'){ openPage('legal',false); window.__dgDeepLinked=1; return; }
    if(h==='partnerships'||h==='partners'){ openPage('partners',false); window.__dgDeepLinked=1; return; }
    if(!w)return;
    var open=function(){
      if(/^(startup|founder|hire|brief|company)$/.test(w)){window.__dgDeepLinked=1;show(S);return true}
      if(/^(engineer|talent|join|jobseeker|candidate|profile)$/.test(w)){window.__dgDeepLinked=1;show(J);return true}
      return false
    };
    if(!open()){/* retry later */}
    if(!window.__dgDeepLinked){
      setTimeout(function(){try{open()}catch(e){}},600);
      setTimeout(function(){try{open()}catch(e){}},1800);
    }
  }catch(e){}
}

function finalButtonLabels(){var a=q('#startup-hire [type=submit],#startup-modal form [type=submit]');if(a){a.value='Submit brief';a.textContent='Submit brief'}var b=q('#engineer-join [type=submit],#jobseeker-modal form [type=submit]');if(b){b.value='Submit profile';b.textContent='Submit profile'}var o=q('#startup-hire [name="90day-outcome"],#startup-modal [name="90day-outcome"]');if(o){o.placeholder='e.g. Launch v1 checkout and sign two paying pilot customers';var l=o.id&&q('label[for="'+o.id+'"]');if(l)l.textContent='What must this hire accomplish in their first 90 days? *'}}
function orgJsonLd(){if(q('#dg-org-jsonld'))return;var ld=document.createElement('script');ld.type='application/ld+json';ld.id='dg-org-jsonld';ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'Demigod',url:'https://www.trydemigod.com',email:'hello@trydemigod.com',description:'Human-matched SF startup talent. 10% on hire.',areaServed:'San Francisco Bay Area'});document.head.appendChild(ld)}


function wizResumeToast(modal){
  try{
    if(!modal||q('#dg-wiz-resume',modal))return;
    var id=modal.id||'';
    var key=id.indexOf('startup')>=0?'dgWizSave_startup':(id.indexOf('jobseeker')>=0||id.indexOf('engineer')>=0?'dgWizSave_engineer':null);
    if(!key)return;
    var s=JSON.parse(localStorage.getItem(key)||'null');
    if(!s||!s.answers||Object.keys(s.answers).length<1)return;
    var t=document.createElement('p');
    t.id='dg-wiz-resume';
    t.setAttribute('role','status');
    t.style.cssText='margin:0 0 .65rem;padding:.5rem .7rem;border-radius:10px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);color:#E8D5A3;font-size:.85rem;line-height:1.35';
    t.textContent='Draft restored — continue where you left off.';
    var head=modal.querySelector('.dg-wiz-head')||modal.querySelector('h2')||modal.firstElementChild;
    if(head&&head.parentNode)head.parentNode.insertBefore(t, head.nextSibling);
    else modal.prepend(t);
  }catch(e){}
}
function wireLogoHome(){
  qa('a.w-nav-brand,a.nav_logo-link,.nav_logo-link,a.dg-logo,.logo-link').forEach(function(a){
    if(!a||a.dataset.dgLogo==='1')return;
    a.dataset.dgLogo='1';
    a.setAttribute('href','/');
    a.setAttribute('aria-label','Demigod home');
    a.addEventListener('click',function(e){
      if(q('#dg-page')){e.preventDefault();closePage();try{history.pushState({},'', '/')}catch(err){}}
    });
  });
}
function boot(){if(!document.body)return;forceMainVisible();run();finalButtonLabels();try{wireLogoHome()}catch(e){}deepLink();try{if(window.requestIdleCallback)requestIdleCallback(function(){try{orgJsonLd()}catch(e){}});else setTimeout(function(){try{orgJsonLd()}catch(e){}},1200)}catch(e){}}boot();document.addEventListener('DOMContentLoaded',boot);[400,1500].forEach(function(ms){setTimeout(boot,ms)});/* v190: drop t=50 forceMainVisible — boot/run cover */
// Extra delayed dedupes to catch late-rendered Webflow elements / repeated sections
/* v190: delayed dedupe/scrub removed — run() already calls both */
document.addEventListener('click',function(e){var c=e.target.closest('[class*=close],.modal_close,.w-modal-close');if(c&&c.closest(S+','+J)){e.preventDefault();var prev=OPEN;OPEN=null;hide(true);setTimeout(function(){offerAbandon(prev)},800);return}
/* v195: never treat bare href=# as hire — only explicit modal targets */
var el=e.target.closest('[data-demigod-modal],a[href="'+S+'"],a[href="'+J+'"],a[href="#startup-modal"],a[href="#jobseeker-modal"]');
if(!el)return;
if(el.closest('a.dg-logo,.w-nav-brand,#dg-skip'))return;
var h=(el.getAttribute('href')||'').trim(),k=el.getAttribute('data-demigod-modal');
if(k==='startup'||h===S||h==='#startup-modal'){e.preventDefault();show(S)}
else if(k==='jobseeker'||h===J||h==='#jobseeker-modal'){e.preventDefault();show(J)}
},true);
document.addEventListener('input',function(e){if(OPEN&&e.target&&e.target.closest&&e.target.closest(S+','+J)){DIRTY=true;/*dg-wiz-err-clear*/try{var f=e.target.closest('form');var er=f&&f.querySelector('.dg-wiz-err');if(er)er.remove();e.target.style.borderColor='';e.target.removeAttribute('aria-invalid')}catch(err){}}},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&q('#dg-page')){closePage();return}if(e.key==='Escape'&&OPEN){var prev=OPEN;OPEN=null;hide(true);setTimeout(function(){offerAbandon(prev)},800)}});
OBS=null;/* v190: no full-document MutationObserver — was freezing main thread (run↔mutate thrash). Timed boots cover late Webflow. */
typeof window.addEventListener==='function'&&window.addEventListener('popstate',function(){/*dg-page-popstate*/ try{ if(!routePages()) closePage(); }catch(e){} });
window.__dgFootVer='211';console.log('Demigod v211');
window.__dgDedupe = dedupeAll;
window.__dgScrub = scrubStaticLabels;



})();
/*removed stray formSend per hygiene*/

// OAuth pending (as led by Fable/Claude bosses): LinkedIn prefill for engineers in WIZ, Google for startups. Minimal 'pending' per pre-services. Supabase stack. See demigod-oauth-setup.md
function initOAuthPending(){/* OAuth pending — no dead button (v167 honesty) */}
if (document.readyState === 'complete' || document.readyState === 'interactive') initOAuthPending();
else document.addEventListener('DOMContentLoaded', initOAuthPending);
window.__dgInitOAuth = initOAuthPending;
/* cdn-bust-20260710-177a */
/* autopilot-cdn-bust-1783648396 */
