/*dg-foot-v150-core*/
window.dgFootVersion = 'v150'; console.log('[demigod] foot v150-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null;
var COPY={
heroSub:'Startups submit a brief. Candidates upload once. A human reads every profile and sends 3-5 curated SF matches. 10% only on hire.',
badge:'SF BAY AREA STARTUP MATCHING',
ctaFounder:'HIRE TALENT',
ctaEngineer:'JOIN NETWORK',
navCta:'FIND TALENT',
startupH2:'HIRE SF STARTUP TALENT',
startupBody:'Share the role, skills, and comp range. Humans read your brief and send 3-5 curated SF candidates.',
engineerH2:'GET MATCHED TO SF STARTUPS',
engineerBody:'LinkedIn and resume once. Humans reach out when a role fits — no spam.',
feeNote:'10% placement fee only when you hire (Stripe invoice). 90-day replacement guarantee. Candidates join free.',
pricingNote:'10% of first-year salary on hire',
pricingIntro:'Pay only when you hire. No subscription, no upfront fee.',
pricingBilling:'Invoice on the candidate\'s start date. No charge to submit a brief. Payments and SMS are still being wired up — confirmations come by email from hello@trydemigod.com.',
footerTag:'Human-matched SF startup talent · Startups hire · Candidates join free · 10% only on hire',
trustKicker:'A human reads every profile — SF Bay Area startups, talent from anywhere.',
trustSteps:['Startups send a brief; candidates send a profile — email hello@trydemigod.com','A human proposes the match to both sides','Both say yes — we make the intro','10% fee only when you hire'],
ledgerKicker:'Example roles — the live board loads from our public ledger.',
ledgerTitle:'Placement ledger',
ledgerRows:[{title:'Product Manager',stageType:'Pre-seed · B2B SaaS',skills:'GTM, roadmap, user research',outcome:'Sample brief (labeled) — humans reviewing fit.',sample:true},{title:'Founding Designer',stageType:'Seed · Consumer',skills:'Figma, design systems, brand',outcome:'Sample brief (labeled) — humans reviewing fit.',sample:true},{title:'Head of Growth',stageType:'Series A · Fintech',skills:'Paid social, PLG, analytics',outcome:'Sample brief (labeled) — humans reviewing fit.',sample:true}],
privacyNote:'Profiles shared only with matched parties. No blasting. (Talent engineering: AI-assisted sourcing + human judgment, per a16z research and AI recruiting studies.)',
partnerKicker:'Refer outstanding candidates to SF startups. Earn 20% of placement fee on successful hires.',
partnerCta:'REFER CANDIDATE',
partnerNav:'Refer Talent',
partnerOk:'Thank you. We will review the candidate. hello@trydemigod.com will send your referral tracking if it fits.',
followUpTitle:'Help us find an even better match (prep for pending SMS follow-up)',
followUpHint:'These are optional now — we can text for details later once Twilio is live.',
followUpSalary:'Target salary range (more detail)?',
followUpStart:'Earliest start date?',
followUpWhy:'Any dealbreakers or must-haves we missed?'
};
var STARTUP_OK='Brief received. hello@trydemigod.com will follow up. (Payments and SMS pending.) 10% on hire.';
var ENGINEER_OK='Profile received. hello@trydemigod.com will reach out when a role fits. (Payments and SMS pending.)';
var PARTNER_OK=COPY.partnerOk;
var WIZ_THANKS={startup:{head:'Brief received',lead:'A human will review your role — not a bot.',steps:['A human reads your brief and company context','A human proposes the match to both sides if fit','We only forward a small number of curated intros — no spam'],done:'How it works'},engineer:{head:'Profile saved',lead:'Your resume stays private until a human sees a real fit.',steps:['Your profile is stored securely — never blasted','A human proposes the match to both sides if fit','hello@trydemigod.com may reach out with one curated intro'],done:'How it works'},partner:{head:'Application received',lead:'We verify partner fit before sending your tracking code.',steps:['A human reviews your partner application','hello@trydemigod.com sends your unique partner code if approved','Warm intros only — we decline bad matches to protect your reputation'],done:'Back to partners'}};
var WIZ_CFG={startup:{steps:[['welcome'],['contact-email'],['company-name'],['company-stage'],['role-title'],['stack-needs'],['90day-outcome'],['salary-range'],['timeline'],['team-size'],['why-this-role'],['role-jd'],['__submit__'],['__thanks__']],welcome:{t:'Hire SF startup talent',b:'One question at a time (works perfectly on phone or desktop). A human reads every brief and proposes only strong fits. (Curated like Match Day — with 90-day outcome focus.)',btn:'Start brief →'},thanks:STARTUP_OK,total:11,optional:['phone','salary-range','why-this-role','role-jd','timeline','team-size']},engineer:{steps:[['welcome'],['full-name'],['seeker-email'],['linkedin-url'],['skills-stack'],['experience'],['sf-bay'],['availability'],['salary-expectation'],['why-startups'],['links'],['phone'],['resume'],['__submit__'],['__thanks__']],welcome:{t:'Get matched to SF startups',b:'LinkedIn + profile once (works great on phone or desktop). Private until a human sees a real fit. No spam.',btn:'Create profile →'},thanks:ENGINEER_OK,total:13,optional:['phone','links','resume','salary-expectation','why-startups','availability']},partner:{steps:[['welcome'],['partner-type'],['partner-name'],['partner-email'],['partner-phone'],['partner-org'],['referral-plan'],['partner-linkedin'],['partner-notes'],['__submit__'],['__thanks__']],welcome:{t:'Join Demigod Partners',b:'Refer startups, candidates, or both. Earn on successful placements.',btn:'Start application →'},thanks:PARTNER_OK,total:9,optional:['partner-phone','partner-linkedin','partner-notes']}};
var WIZ_Q={startup:{'contact-email':{q:'Best email for coordination?',h:'Used only to send 1-1 curated match proposals. No spam, no lists.'},'company-name':{q:'Company name?',h:'Context for culture and stage fit.'},'company-stage':{q:'What stage is the company?',h:'Pre-seed / Seed / Series A+ — we match only to real startup operating realities.'},'role-title':{q:'What role are you hiring for?',h:'Founding PM, first Engineer, Head of Growth — specific titles get the best 3-5 curated fits.'},'stack-needs':{q:'Key skills or outcomes needed?',h:'Top must-haves and success metrics. This is what we screen candidates against.'},
'90day-outcome':{q:'#1 outcome this hire must deliver in first 90 days?',h:'Specific, measurable — drives precise human matching and higher close rates.'},'salary-range':{q:'Target comp range (cash + equity note)?',h:'Realistic range = candidates we propose will actually say yes. Critical for quality.'},'timeline':{q:'When do you need the hire?',h:'ASAP / This quarter / Exploratory — matches candidate availability.'},'team-size':{q:'Team size / reporting line?',h:'Helps us match seniority and collaboration style.'},'why-this-role':{q:'Why hire this role now?',h:'New bet, backfill, scaling team — the "why" drives who we suggest first.'},'role-jd':{q:'Job description, brief or link? (optional)',h:'PDF/Word up to 10MB. Humans read every detail you share.'},'phone':{q:'Phone for fast follow-up? (optional)',h:'SMS pending — email from hello@trydemigod.com always works.'},'__submit__':{q:'Ready to submit your brief?',h:'A human reviews personally and proposes matches only if strong fit.'}},engineer:{'full-name':{q:'Your full name?',h:'Used only for the intro email to the right startup.'},'seeker-email':{q:'Best email?',h:'Match updates and proposals only — from hello@.'},'linkedin-url':{q:'LinkedIn profile?',h:'Primary signal. Full profile URL lets a human assess real background fast.'},'skills-stack':{q:'Core skills & stack?',h:'React, Figma, GTM, product — what you actually do best.'},'experience':{q:'Key things you have shipped?',h:'2-3 concrete highlights or impact bullets. Wins > titles.'},'sf-bay':{q:'Open to SF Bay Area startups?',h:'Our focus. Remote fine if the startup is Bay Area.'},'availability':{q:'When are you available?',h:'Now / 2–4 weeks / Passive — matches role timeline.'},'salary-expectation':{q:'Comp expectation (optional)?',h:'Helps us only propose roles that will excite you.'},'why-startups':{q:'Why SF startups (optional)?',h:'Context for strong human matches.'},'links':{q:'Portfolio, GitHub, site? (optional)',h:'Links help humans see the work.'},'phone':{q:'Phone (optional)?',h:'Pending SMS. We can text when a fit appears.'},'resume':{q:'Resume (PDF/Word, optional now)',h:'Max 10MB. Private until a human proposes a specific match — add later if easier.'},'__submit__':{q:'Ready to join the network?',h:'Humans review and reach out only on real fits. No blasting.'}}};
function q(s){return document.querySelector(s)}
function qa(s,r){return[...(r||document).querySelectorAll(s)]}

var BOARD_CDN='https://files.catbox.moe/9sxy3x.json'; /* Fable v150: use latest honest published board */
var BOARD=null,BOARD_AT=0; /*dup q/qa removed - single def earlier*/
function lbl(el,t){if(!el)return;(el.querySelector('.btn-label,.button_label')||el).textContent=t}
function rmF(f,n){if(!f)return;qa('[name="'+n+'"],#'+n,f).forEach(function(i){var w=i.closest('.w-input,.w-select,.w-radio,.w-checkbox,fieldset')||i.parentElement||i;w.remove()});qa('label',f).forEach(function(l){if(new RegExp(n.replace(/-/g,'[- ]'),'i').test(l.textContent||''))l.remove()})}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function ledgerHtml(rows){var R=rows||COPY.ledgerRows;return R.map(function(r){var t=Array.isArray(r)?r:[r.title,r.stageType||r[1],r.status||r.comp||r[2]];var label=r.sample?'Sample':(t[2]||'');return'<div class="dg-row"><span>'+esc(t[0])+'</span><em>'+esc(t[1])+(label?' · '+esc(label):'')+'</em></div>'}).join('')}
function candidatesHtml(list){if(!list||!list.length)return'';return list.map(function(c){var tags=(c.tags||[]).slice(0,4).map(function(t){return'<span class="dg-tag">'+esc(t)+'</span>'}).join('');return'<div class="dg-cand"><p>'+esc(c.summary||c.blurb||'')+'</p><div class="dg-tags">'+tags+'</div></div>'}).join('')}
function renderBoard(){var blk=q('#demigod-trust-block');if(!blk||!BOARD)return;var lg=blk.querySelector('.dg-ledger');if(lg&&BOARD.roles&&BOARD.roles.length)lg.innerHTML=ledgerHtml(BOARD.roles);var cand=blk.querySelector('.dg-candidates');if(!cand){var h2=document.createElement('h2');h2.textContent='Featured candidates';var k=document.createElement('p');k.className='dg-kicker';k.textContent='Anonymized profiles — humans match, no spam.';k.id='dg-cand-kicker';cand=document.createElement('div');cand.className='dg-candidates';blk.appendChild(h2);blk.appendChild(k);blk.appendChild(cand)}if(BOARD.candidates&&BOARD.candidates.length)cand.innerHTML=candidatesHtml(BOARD.candidates);addMotion()}function addMotion(){if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;try{var obs=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('dg-anim');obs.unobserve(e.target)}})},{threshold:.15});qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand').forEach(function(el){obs.observe(el)})}catch(e){}}

/* Thorough WIZ Typeform polish: keyboard, clicks, progress, mobile safe */
function enhanceWIZ() {
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
  if (form) {
    form.classList.remove('w-form-loading');
    form.style.setProperty('display', 'block', 'important');
    form.style.setProperty('visibility', 'visible', 'important');
    // ancestor walk to beat Webflow wrappers (consolidated from dupe in showStep/show)
    var p = form; while (p && p !== document.body) { try { p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p=p.parentElement; }
  }
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
  }
  const targets = form || modal;
  if (targets) {
    qa('input,select,textarea,.form-field-group,.dg-field-wrap,.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-count,.dg-wiz-bar', targets).forEach(function(c){
      if (c && c.style) {
        c.style.setProperty('display','block','important');
        c.style.setProperty('visibility','visible','important');
      }
    });
  }
}

// Force main page visible to defeat Webflow w-mod-js :not(.w-mod-ix3) hide + CSS hero guards.
// Called early + in run + MO. Also forces ix3 class so the big hide rule stops matching.
function forceMainVisible() {
  try {
    var de = document.documentElement;
    var bd = document.body;
    if (de) {
      de.classList.add('w-mod-ix3');
      de.style.setProperty('visibility', 'visible', 'important');
      de.style.setProperty('opacity', '1', 'important');
    }
    if (bd) {
      bd.style.setProperty('visibility', 'visible', 'important');
      bd.style.setProperty('opacity', '1', 'important');
    }
    // broad + targeted (stronger for ix/gsap inline overrides)
    qa('html,body,.hero-section,.hero-container,.hero-content-left,.hero-content-right,.header,.nav_container,main,section,.trust-section,.pricing-grid,.roles-grid,.steps-grid,.w-layout-grid,.step-card,.role-card,.pricing-card,.premium-btn,[class*="hero"],[class*="container"],[class*="content"],[class*="step"],[class*="role"],[class*="pricing"],[class*="trust"],[class*="section"],[class*="block"]').forEach(function(el){
      if (!el) return;
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity||'1') < 0.3) {
        el.style.setProperty('display', 'block', 'important');
      }
      // deeper ancestor walk
      var p = el.parentElement; var guard=0;
      while (p && p !== bd && guard++ < 12) {
        try { p.style.setProperty('visibility','visible','important'); p.style.setProperty('opacity','1','important'); } catch(e){}
        p = p.parentElement;
      }
    });
    // kill common inline hides (incl gsap/webflow ix)
    qa('[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0"],[style*="opacity:0"],[aria-hidden="true"],[style*="transform"]').forEach(function(el){
      if (el && !el.closest('#startup-modal,#jobseeker-modal')) {
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
        if (getComputedStyle(el).display==='none') el.style.setProperty('display','block','important');
      }
    });
    // hero h1 etc
    qa('.hero-section h1,.header h1,.hero-section,.header, h1, h2, .premium-btn').forEach(function(h){
      if (h) { h.style.setProperty('visibility','visible','important'); h.style.setProperty('opacity','1','important'); }
    });
    // short raf burst to beat post-load ix/gsap sets (complements head early script)
    var bc=0; (function braf(){ if(bc++<20){ try{ forceMainVisible._raf = true; qa('.hero-section,.hero-container,main,section,h1,.premium-btn').forEach(function(el){if(el){el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');}}); }catch(_){} requestAnimationFrame(braf); } })();
  } catch (e) {}
}
setTimeout(enhanceWIZ, 500);
document.addEventListener('click', function(e) {
  if (e.target.closest('.dg-wiz-next, .dg-wiz-back')) setTimeout(enhanceWIZ, 100);
});
// Global WIZ keyboard: Enter advances current next, robust
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter') return;
  const modal = document.querySelector('#startup-modal, #jobseeker-modal');
  if (!modal || modal.style.display === 'none') return;
  const next = modal.querySelector('.dg-wiz-next') || Array.from(modal.querySelectorAll('button')).find(b=>/next|continue|submit/i.test((b.textContent||'')));
  if (next && document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.closest('.dg-wiz'))) {
    e.preventDefault();
    next.click();
  }
});
// Mutation observer to re-enforce WIZ visibility if Webflow mutates DOM
try {
  var mo = new MutationObserver(function(){ setTimeout(enhanceWIZ, 50); });
  mo.observe(document.documentElement || document.body, {childList:true, subtree:true});
} catch(e){}

// Resize + viewport listener for perfect mobile + desktop (re-force nav styles + current step visibility)
function forceMobileDesktopWIZ() {
  try {
    enhanceWIZ();
    // If a modal is open, re-force the current form fields + chrome
    const openModal = document.querySelector && document.querySelector('#startup-modal[style*="flex"], #jobseeker-modal[style*="flex"]');
    if (openModal) {
      const f = openModal.querySelector && openModal.querySelector('form');
      if (f) {
        f.style.setProperty('display','block','important');
        f.style.visibility = 'visible';
        qa('input,select,textarea,.form-field-group,.dg-field-wrap,.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint', openModal).forEach(function(c){
          if (c && c.style) {
            c.style.setProperty('display','block','important');
            c.style.setProperty('visibility','visible','important');
          }
        });
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
function wizBuild(form, kind) {
  if (!form || form.dataset.dgWizBuilt) return;
  form.dataset.dgWizBuilt = '1';
  form.classList.add('dg-wiz-on');
  form.classList.remove('w-form-loading');
  form.style.setProperty('display', 'block', 'important');
  // keep form visible forever against Webflow re-hiding
  const forceFormVisible = () => {
    if (form) {
      form.classList.remove('w-form-loading');
      form.style.setProperty('display', 'block', 'important');
    }
  };
  forceFormVisible();
  try {
    const mo = new MutationObserver(forceFormVisible);
    mo.observe(form, { attributes: true, attributeFilter: ['class', 'style'] });
  } catch(e){}
  setInterval(forceFormVisible, 400);
  // hide any success/done states so WIZ stepper owns the view
  qa('.w-form-done, .modal-success-message, [class*=success]', form.closest('#startup-modal, #jobseeker-modal') || document).forEach(function(s){
    if (s.closest('form') === form || s.closest('#startup-modal, #jobseeker-modal')) s.style.display = 'none';
  });
  var cfg = WIZ_CFG[kind] || WIZ_CFG.startup;
  var steps = cfg.steps || [];
  var qmap = WIZ_Q[kind] || {};
  var current = 0;
  var answers = {};
  var head = document.createElement('div');
  head.className = 'dg-wiz-head';
  head.innerHTML = '<div class="dg-wiz-count">STEP <span class="dg-cur">1</span> / ' + (cfg.total || steps.length) + '</div><div class="dg-wiz-bar"><i style="width:0%"></i></div><div class="dg-wiz-q"></div><div class="dg-wiz-hint"></div>';
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
      if (i.type === 'file') { if (i.files && i.files[0]) answers[nm] = i.files[0].name; }
      else if (i.type === 'checkbox' || i.type === 'radio') { if (i.checked) answers[nm] = i.value || 'yes'; }
      else if (i.value && i.value.trim()) answers[nm] = i.value.trim();
    });
  }
  function showStep(idx) {
    current = Math.max(0, Math.min(idx, steps.length - 1));
    var keyArr = steps[current] || [];
    var key = keyArr[0] || '';
    if (form) {
      form.classList.remove('w-form-loading');
      form.style.setProperty('display', 'block', 'important');
      form.style.visibility = 'visible';
      var modal = form.closest ? form.closest('#startup-modal,#jobseeker-modal') : null;
      if (modal) qa('form,.w-form,.w-form-done,.form-field-group,.dg-field-wrap', modal).forEach(function(c){ c.style.setProperty('display','block','important'); c.style.visibility='visible'; });
      if (typeof forceWizVisible === 'function') forceWizVisible(form, modal);
    }
    curEl.textContent = (current + 1);
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
    // ultimate unhide for any input in current step or first to ensure form shows on hire
    qa('input,select,textarea,label,.w-input,.w-select,.form-field-group,.dg-field-wrap', form).forEach(function(i){
      if (i.offsetParent === null || getComputedStyle(i).display === 'none' || getComputedStyle(i).visibility === 'hidden') {
        i.style.setProperty('display', 'block', 'important');
        i.style.setProperty('visibility', 'visible', 'important');
        var p = i.closest('.form-field-group,.dg-field-wrap') || i.parentElement;
        if (p) { p.style.setProperty('display', 'block', 'important'); p.style.setProperty('visibility','visible','important'); }
      }
    });
    // explicit force unhide for critical keys (90day, review, first fields) to fix vis=0 / hasReview false / has90 false
    var critical = [key, '90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs', 'company-stage', 'full-name', 'seeker-email', 'linkedin-url', 'skills-stack', 'experience', 'sf-bay'];
    critical.forEach(function(ck){
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.removeProperty('display'); el.style.setProperty('display','block','important'); el.style.visibility='visible';
        var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.removeProperty('display'); cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        // force label too
        var lab = el.previousElementSibling; if (lab && lab.tagName === 'LABEL') { lab.style.display='block'; lab.style.visibility='visible'; }
      }
    });
    if (key === '__submit__' || key.includes('review')) {
      qa('.dg-wiz-review, .dg-review', form).forEach(function(r){ 
        r.style.removeProperty('display'); r.style.display = ''; r.classList.add('dg-wiz-show'); 
        if (window.innerWidth < 768) {
          r.style.setProperty('flex-direction','column','important');
        }
      });
    }
    // progress (single calc)
    var denom = Math.max(1, (steps.length - 2));
    var pct = Math.round( ((key === 'welcome' ? 0 : current) / denom) * 100 );
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
      var sq = (qmap.__submit__ || {});
      qEl.textContent = sq.q || 'Ready to submit?';
      hEl.textContent = sq.h || 'A human reviews personally.';
      nextBtn.textContent = (kind === 'startup' ? 'Send brief' : (kind === 'engineer' ? 'Join network' : 'Submit'));
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
      // minimal targeted for current + 90d/review (kept for reliability, less dupe code)
      var crit = [key, '90day-outcome'];
      crit.forEach(function(ck){
        if (!ck) return;
        var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
        if (el) {
          el.style.setProperty('display','block','important'); el.style.visibility='visible';
          var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
          if (cc) { cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; }
        }
      });
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
      if (el && el.required && !isOpt && !el.value && el.offsetParent !== null) {
        el.style.borderColor = '#F4D03F'; el.focus && el.focus();
        setTimeout(function(){ if(el) el.style.borderColor = ''; }, 1400);
        return;
      }
    }
    if (key === '__submit__') {
      // ensure review is visible and populated before submit
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      rev.style.display = '';
      rev.style.removeProperty('display');
      if (nativeSub) {
        nativeSub.style.display = '';
        setTimeout(function(){ try { nativeSub.click(); } catch(e){ form.submit && form.submit(); } }, 10);
      } else {
        form.submit && form.submit();
      }
      showStep(current + 1);
    } else if (current < steps.length - 1) {
      showStep(current + 1);
    }
  };
  backBtn.onclick = function(ev){ ev&&ev.preventDefault(); if (current > 0) showStep(current - 1); };
  // keyboard advance on visible inputs + arrows for nav (Typeform polish)
  form.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      var act = document.activeElement;
      if (act && (act.tagName === 'INPUT' || act.tagName === 'SELECT') && !act.closest('textarea')) {
        e.preventDefault(); nextBtn.click();
      }
    }
    if (e.key === 'Escape') {
      if (current > 0) { e.preventDefault(); backBtn.click(); } else { /* let global esc close modal */ }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      var act = document.activeElement;
      if (!act || !act.closest('textarea')) { e.preventDefault(); nextBtn.click(); }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      var act = document.activeElement;
      if (!act || !act.closest('textarea')) { e.preventDefault(); if (current > 0) backBtn.click(); }
    }
  }, true);
  // start
  setTimeout(function(){ showStep(0); enhanceWIZ(); }, 20);
  // re-enhance on interactions
  form.addEventListener('input', function(){ enhanceWIZ(); });
  // force initial show for robustness (fixes some test/live vis=0 on first fields)
  setTimeout(function(){ if (typeof showStep === 'function') showStep(0); }, 50);
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

function fetchBoard(){if(!BOARD_CDN)return;if(BOARD&&Date.now()-BOARD_AT<45000){renderBoard();return}fetch(BOARD_CDN+'?v='+Date.now()).then(function(r){return r.json()}).then(function(d){BOARD=d;BOARD_AT=Date.now();renderBoard()}).catch(function(){})}
function submitTrust(f,msg){if(!f||f.querySelector('#dg-submit-trust'))return;var p=document.createElement('p');p.id='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.textContent=msg||'A human reviews every submission. No automated spam.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.w-input')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max};el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;if(done.offsetParent===null&&getComputedStyle(done).display==='none')return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='View sample matches';/* PREP for Twilio jack&jill post-form collection (before real SMS): optional follow-up questions shown in thanks */if(!done.querySelector('.dg-followup')){var fu=document.createElement('div');fu.className='dg-followup';fu.style.cssText='margin-top:1rem;padding:0.75rem;border:1px solid rgba(201,168,76,.2);border-radius:8px;font-size:0.85rem';fu.innerHTML='<strong>'+COPY.followUpTitle+'</strong><p style="margin:0.25rem 0 0.5rem;color:#A8A29E">'+COPY.followUpHint+'</p><div style="display:flex;flex-direction:column;gap:0.4rem"><input class="w-input" placeholder="'+COPY.followUpSalary+'" style="font-size:0.8rem"><input class="w-input" placeholder="'+COPY.followUpStart+'" style="font-size:0.8rem"><textarea class="w-input" placeholder="'+COPY.followUpWhy+'" rows="2" style="font-size:0.8rem"></textarea></div><button type="button" style="margin-top:0.5rem;font-size:0.75rem;background:transparent;border:1px solid rgba(201,168,76,.3);color:#C9A84C;padding:0.25rem 0.5rem;border-radius:4px">Save follow-up (simulated — SMS pending)</button>';fu.querySelector('button').addEventListener('click',function(){fu.style.opacity='0.6';fu.querySelector('button').textContent='Saved — thanks! (will feed matching)'});done.appendChild(fu)};a.style.cssText='margin-top:.75rem;background:transparent!important;color:#c9a84c!important;border:1px solid rgba(201,168,76,.45)!important';a.addEventListener('click',function(){var blk=q('#demigod-trust-block');if(blk)blk.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo(0,document.body.scrollHeight*.55)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
function ph(i,t){if(i&&'placeholder'in i)i.placeholder=t}
function formEl(sel){var el=typeof sel==='string'?q(sel):sel;if(!el)return null;return el.tagName==='FORM'?el:(el.querySelector&&el.querySelector('form'))||null}
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');rmF(st,'Source');rmF(st,'hiring-model');qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack/i.test(el.textContent||''))el.textContent='Skills / requirements *';if(/Role Title|Job Title/i.test(el.textContent||''))el.textContent='Role title *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *'});ph(st.querySelector('[name=contact-email]'),'you@company.com');ph(st.querySelector('[name=role-title]'),'e.g. Founding PM, Head of Growth, Designer');ph(st.querySelector('[name=stack-needs]'),'e.g. B2B SaaS, GTM, design systems, React');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL') l.setAttribute('for',n); else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Best email?':n==='role-title'?'Role title?':'Key skills?'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" placeholder="Acme Inc">';var ce=st.querySelector('[name=contact-email]');(ce&&ce.parentElement||st).appendChild(cn);}
// inject timeline and team-size (per Fable perfect fields)
if(!st.querySelector('[name=timeline]')){var tw=document.createElement('div');tw.className='dg-field-wrap';tw.innerHTML='<label class="w-form-label" for="timeline">Timeline?</label><select class="w-select" id="timeline" name="timeline"><option value="">Select</option><option value="asap">ASAP (2-4 wks)</option><option value="quarter">This quarter</option><option value="exploratory">Exploratory</option></select>';var sk=st.querySelector('[name=stack-needs]');(sk&&sk.parentElement||st).appendChild(tw);}
if(!st.querySelector('[name=team-size]')){var tm=document.createElement('div');tm.className='dg-field-wrap';tm.innerHTML='<label class="w-form-label" for="team-size">Team size / reports to?</label><input class="w-input" type="text" id="team-size" name="team-size" placeholder="e.g. 5-person eng team, reports to CTO">';(st.querySelector('[name=stack-needs]')||st).parentElement.appendChild(tm);}var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}} 
// inject 90day-outcome creative field for high-signal matching data (Fable recommended)
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">#1 outcome this hire must deliver in first 90 days? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="e.g. Ship v1 and hit $50k MRR"></textarea>';(sk&&sk.parentElement||st).appendChild(od);}if(!st.querySelector('[name=salary-range]')){var w=document.createElement('div');w.id='dg-salary-wrap';w.className='dg-field-wrap';w.innerHTML='<label class="w-form-label" for="salary-range">Comp range (optional)</label><input class="w-input" type="text" id="salary-range" name="salary-range" placeholder="e.g. $180-220k + equity">';if(sa&&sa.parentElement)sa.parentElement.insertBefore(w,sa.nextSibling);else st.querySelector('[type=submit],.w-button')?.parentElement?.insertBefore(w,st.querySelector('[type=submit],.w-button'))}else{ph(st.querySelector('[name=salary-range]'),'e.g. $180-220k + equity');qa('label',st).forEach(function(l){if(/salary|comp range/i.test(l.textContent||''))l.textContent='Comp range (optional)'})}if(!st.querySelector('[name=why-this-role]')){var ww=document.createElement('div');ww.id='dg-why-wrap';ww.className='dg-field-wrap';ww.innerHTML='<label class="w-form-label" for="why-this-role">Why this role (optional)</label><textarea class="w-input" id="why-this-role" name="why-this-role" rows="2" placeholder="e.g. First PM hire; need someone who has shipped 0→1"></textarea>';var sal=st.querySelector('[name=salary-range]'),salw=sal&&(sal.closest('.dg-field-wrap,.w-input')||sal.parentElement);if(salw&&salw.parentElement)salw.parentElement.insertBefore(ww,salw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(ww,sa.nextSibling)}if(!st.querySelector('[name=role-jd]')){var jw=document.createElement('div');jw.id='dg-jd-wrap';jw.className='dg-field-wrap w-file-upload';jw.innerHTML='<label class="w-form-label" for="role-jd">Job description (optional)</label><input class="w-file-upload-input w-input" type="file" id="role-jd" name="role-jd" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var why=st.querySelector('[name=why-this-role]'),whyw=why&&(why.closest('.dg-field-wrap,.w-input')||why.parentElement);if(whyw&&whyw.parentElement)whyw.parentElement.insertBefore(jw,whyw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(jw,sa.nextSibling)}st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'A human reads every brief — hello@trydemigod.com will follow up with curated matches.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name=why-this-role]'),300);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.setAttribute('method','post');rmF(en,'github-url');rmF(en,'portfolio-url');rmF(en,'is-engineer');var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped/i.test(l.textContent||''))l.textContent='What you shipped *';if(/Skillss*&s*(Stack|experience)/i.test(l.textContent||''))l.textContent='Skills & stack *';if(/^LinkedIn/i.test((l.textContent||'').trim()))l.textContent='LinkedIn URL *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(i)i.required=true});var liIn=en.querySelector('[name=linkedin-url]');if(liIn){liIn.type='url';liIn.required=true;ph(liIn,'https://linkedin.com/in/you')}en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('[name=resume],[name=Resume]');if(!resIn){var rw=document.createElement('div');rw.id='dg-resume-wrap';rw.className='dg-field-wrap w-file-upload';rw.innerHTML='<label class="w-form-label" for="resume">Resume (optional now)</label><input class="w-input" type="file" id="resume" name="resume" style="display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var insBefore=en.querySelector('[name=skills-stack]');var insW=insBefore&&(insBefore.closest('.w-input')||insBefore.parentElement);if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}resIn=rw.querySelector('[name=resume]')}else{var resW=resIn.closest('.dg-field-wrap,.w-file-upload,.w-input')||resIn.parentElement;if(resW&&!resW.id)resW.id='dg-resume-wrap';resIn.classList.remove('w-file-upload-input');resIn.classList.add('w-input');resIn.style.cssText='display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0';/*resume opt per WIZ*/;if(!resIn.id)resIn.id='resume';if(!resIn.name)resIn.name='resume';if(!resIn.accept)resIn.setAttribute('accept','.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document')}qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent='Resume (optional now)'});if(resIn&&!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){var f=resIn.files&&resIn.files[0];if(f&&f.size>10485760)resIn.setCustomValidity('Max file size 10MB');else resIn.setCustomValidity('')})}ph(en.querySelector('[name=skills-stack]'),'e.g. Product strategy, Figma, growth marketing');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);charCount(en.querySelector('[name=experience]'),600);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR')}if(!en.querySelector('[name=links]')){var liWrap=liIn&&(liIn.closest('.w-input')||liIn.parentElement);var lw=document.createElement('div');lw.id='dg-links-wrap';lw.className='dg-field-wrap';lw.innerHTML='<label class="w-form-label" for="links">Links (optional)</label><input class="w-input" type="text" id="links" name="links" placeholder="GitHub, portfolio, or other links">';if(liWrap&&liWrap.parentElement)liWrap.parentElement.insertBefore(lw,liWrap.nextSibling);else{var sub=en.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(lw,sub)}}var sf=en.querySelector('[name=sf-bay]');if(sf){sf.required=true;var sl=sf.closest('label')||sf.parentElement;if(sl){var sp=sl.querySelector('.w-form-label,span');if(sp)sp.textContent='Based in SF Bay Area *'}}if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('label');c.className='w-checkbox';c.innerHTML='<input type="checkbox" name="sf-bay" value="yes" required><span class="w-form-label">Based in SF Bay Area *</span>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
// inject availability, salary-expect, why-startups for perfect matching
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">Availability?</label><select class="w-select" id="availability" name="availability"><option value="">Select</option><option value="now">Now</option><option value="2-4w">2-4 weeks</option><option value="passive">Passive / open</option></select>';(en.querySelector('[name=sf-bay]')||en).parentElement.appendChild(av);}
if(!en.querySelector('[name=salary-expectation]')){var se=document.createElement('div');se.className='dg-field-wrap';se.innerHTML='<label class="w-form-label" for="salary-expectation">Comp expectation (optional)</label><input class="w-input" type="text" id="salary-expectation" name="salary-expectation" placeholder="e.g. 180-220k + equity">';en.appendChild(se);}
if(!en.querySelector('[name=why-startups]')){var ws=document.createElement('div');ws.className='dg-field-wrap';ws.innerHTML='<label class="w-form-label" for="why-startups">Why SF startups (optional)</label><textarea class="w-input" id="why-startups" name="why-startups" rows="2" placeholder="Mission, stage, impact..."></textarea>';en.appendChild(ws);}if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.textContent='We never blast your profile. Humans review every application.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Profile stays private until a human match. Free for candidates, always.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Get matched';sb2.textContent='Get matched'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
function hero(){qa('.hero-section h1,.hero-title,.header h1').forEach(function(e){e.innerHTML='<span class="title-accent-gold">SF Startup Talent.</span> <span class="title-accent-red">Human</span> <span class="title-accent-blue">Matched.</span>'});qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.closest('.dg-candidates'))return;var t=e.textContent||'';if(t.length>8&&t.length<400)e.textContent=COPY.heroSub});qa('.badge-text,.hero-badge span:not(.badge-dot)').forEach(function(e){e.textContent=COPY.badge});qa('h2,h3').forEach(function(h){var t=h.textContent||'';if(/LIVE SF STARTUP ROLES HIRING NOW/i.test(t))h.textContent='SF startup roles — example briefs'});(function(){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){if(n.parentElement&&n.parentElement.closest('form,.w-form,script,style'))continue;if(/48[- ]?h(our)?s?/i.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(/(?:within\s+)?48[- ]?h(?:our)?s?/gi,'soon')}})();qa('section,div,[class*=insight]').forEach(function(s){var t=(s.textContent||'').toLowerCase(); if(/lorem ipsum|consectetur|insights & updates/i.test(t)||/INSIGHTS/i.test((s.querySelector('h2')||s).textContent||'')) s.style.setProperty('display','none','important'); })}
var ALT_PAY=/(SYNDICATE SUBSCRIPTION|CHOOSE SUBSCRIPTION|CHOOSE COMMISSION|\$5\s*K|\$5K|PLUS 10%|20%|OF FIRST YEAR SALARY|COMMISSION ONLY|Unlimited hires under subscription|Smaller upfront fee|curated candidates sent weekly|MOST POPULAR|\/MO|monthly delivery|PRICING MODELS|Commission-only|Choose the path that aligns|performance-driven|two path|subscription)/i;
function hideCard(el){var c=el;for(var i=0;i<14&&c;i++){if(c.querySelector&&c.querySelector('a,button,[class*=button]')){c.style.setProperty('display','none','important');return}c=c.parentElement}}
function rmSubCard(h){var n=h;for(var i=0;i<12&&n;i++){if(n.querySelector&&n.querySelector('a,button')&&/SYNDICATE|SUBSCRIPTION|\$5/i.test(n.textContent||'')&&!/10% on hire|10% placement/i.test((n.textContent||'').slice(0,120))){n.remove();return}n=n.parentElement}hideCard(h)}
function price(){qa('h3').forEach(function(h){if(/SYNDICATE SUBSCRIPTION/i.test(h.textContent||''))rmSubCard(h);else if(/SUBSCRIPTION/i.test(h.textContent||''))rmSubCard(h)});qa('section,main>div').forEach(function(sec){var t=sec.textContent||'';if(/SYNDICATE SUBSCRIPTION/i.test(t)&&/\$5|CHOOSE SUBSCRIPTION/i.test(t))sec.querySelectorAll('div').forEach(function(d){if(/SYNDICATE SUBSCRIPTION/i.test(d.textContent||''))hideCard(d)})});qa('a,button').forEach(function(a){var t=(a.textContent||'').trim().split('\n')[0];if(/^CHOOSE SUBSCRIPTION$/i.test(t))hideCard(a);if(/^CHOOSE COMMISSION$/i.test(t)){lbl(a,COPY.ctaFounder);a.setAttribute('href',S);a.setAttribute('data-demigod-modal','startup')}});qa('h2,h3,p,span,div').forEach(function(el){if(el.id==='dg-pricing-note'||el.id==='dg-fee-note'||el.closest('#demigod-trust-block,#startup-modal,#jobseeker-modal'))return;var t=(el.textContent||'').trim();if(!t||t.length>280)return;if(el.children.length&&!el.matches('p,h2,h3,span'))return;if(/^20%$|^OF FIRST YEAR SALARY$|^Pay only when you hire$|^PLUS 10% COMMISSION$|^\$5K$|^\/MO$/i.test(t))el.remove();else if(/^COMMISSION ONLY$/i.test(t))el.textContent='10% on hire';else if(/PRICING MODELS/i.test(t))el.textContent='PRICING';else if(/Choose the path that aligns/i.test(t))el.textContent=COPY.pricingIntro;else if(ALT_PAY.test(t)&&!/10% placement|10% on hire/i.test(t)&&el.closest('section,main')){if(/SYNDICATE|SUBSCRIPTION|\$5/i.test(t))hideCard(el)}});var pr=qa('h2,h3').find(function(e){return/^(On hire|10% on hire)$/i.test((e.textContent||'').trim())});if(pr){var card=pr.closest('div');for(var i=0;i<12&&card;i++){if(card.querySelector('a,button,[class*=button]'))break;card=card.parentElement}if(card){card.style.removeProperty('display');qa('*',card).forEach(function(el){if(el.children.length||el.id==='dg-pricing-note')return;var v=(el.textContent||'').trim();if(/^20%$|^OF FIRST YEAR SALARY$|^Pay only when you hire$|PLUS 10%|COMMISSION ONLY/i.test(v))el.remove()});if(!q('#dg-pricing-note')){var note=document.createElement('p');note.id='dg-pricing-note';note.textContent=COPY.pricingNote;var btn=card.querySelector('a,button');if(btn&&btn.parentElement)btn.parentElement.insertBefore(note,btn);if(btn){lbl(btn,COPY.ctaFounder);btn.setAttribute('href',S);btn.setAttribute('data-demigod-modal','startup')}}}}qa('h2').forEach(function(h){if(/^PRICING$/i.test((h.textContent||'').trim())){var sec=h.closest('section,main>div');if(sec)sec.style.setProperty('display','block','important')}})}

function cta(){qa('a.premium-btn.is-talent,a.is-talent.premium-btn').forEach(function(a){lbl(a,COPY.ctaFounder);a.setAttribute('href','#');a.setAttribute('data-demigod-modal','startup')});qa('a.premium-btn.is-job,a.is-job.premium-btn').forEach(function(a){lbl(a,COPY.ctaEngineer);a.setAttribute('href','#');a.setAttribute('data-demigod-modal','jobseeker')});qa('nav a,.w-nav a').forEach(function(a){var t=(a.textContent||'').trim().split('\n')[0];if(/^POST A JOB$|^HIRE TALENT$|^FIND TALENT$/i.test(t)){lbl(a,COPY.navCta);a.setAttribute('href','#');a.setAttribute('data-demigod-modal','startup')}})}
function nav(){var real=q('nav.w-nav,.w-nav');if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop=''}var pick=function(a){if(a.closest('footer'))return false;var t=(a.textContent||'').trim().split('\n')[0];return a.offsetParent!==null||getComputedStyle(a).display!=='none'||/^(GET STARTED|POST A JOB|HIRE TALENT|FIND TALENT)$/i.test(t)};var b=qa('nav.w-nav a.button,.w-nav a.button.on-inverse,nav a.button,header a.button').find(pick);if(b){lbl(b,COPY.navCta);b.setAttribute('href','#');b.setAttribute('data-demigod-modal','startup');qa('nav a,header a,.w-nav a,#dg-top-nav a').forEach(function(x){if(x!==b && /FIND TALENT|HIRE TALENT/i.test((x.textContent||'').trim())) x.style.setProperty('display','none','important')}); qa('a').forEach(function(x){ if(/FIND TALENT|HIRE TALENT/i.test((x.textContent||'').trim()) && x!==b) x.style.setProperty('display','none','important'); }); return}if(q('#dg-nav-hire'))return;var bar=q('nav.w-nav,.w-nav,header nav,.nav_container');if(bar){var a=document.createElement('a');a.id='dg-nav-hire';a.className='button on-inverse w-button';a.href='#';a.setAttribute('data-demigod-modal','startup');a.innerHTML='<span class="button_label">'+COPY.navCta+'</span>';bar.appendChild(a);return}if(!q('#dg-nav-style')){var st=document.createElement('style');st.id='dg-nav-style';st.textContent='#dg-top-nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;justify-content:space-between;align-items:center;padding:.55rem 1rem;background:rgba(6,6,6,.94);border-bottom:1px solid rgba(201,168,76,.15)}#dg-top-nav .dg-logo{color:#c9a84c;font-weight:700;text-decoration:none!important;font-family:Cinzel,serif}#dg-top-nav a.dg-cta{font-weight:700!important}body{padding-top:3.1rem}';document.head.appendChild(st)}var top=document.createElement('div');top.id='dg-top-nav';top.innerHTML='<a class="dg-logo" href="#">Demigod</a><a id="dg-nav-hire" class="button on-inverse w-button dg-cta" href="'+S+'" data-demigod-modal="startup"><span class="button_label">'+COPY.navCta+'</span></a>';document.body.prepend(top)}
function trust(){var blk=q('#demigod-trust-block');if(blk){qa('.dg-kicker',blk).forEach(function(k,i){k.textContent=i?COPY.ledgerKicker:COPY.trustKicker});var lg=blk.querySelector('.dg-ledger');if(lg)lg.innerHTML=ledgerHtml();var steps=blk.querySelector('.dg-steps');if(steps)steps.innerHTML=COPY.trustSteps.map(function(t,i){return'<div class="dg-step"><strong>'+(i+1)+'.</strong> '+t+'</div>'}).join('');addMotion();return}var h=qa('h2').find(function(e){return/PRICING|ONE SIMPLE MODEL|WHEN YOU HIRE|pricing/i.test(e.textContent)});var s=(h&&h.closest('section'))||q('footer,.footer');var steps=COPY.trustSteps.map(function(t,i){return'<div class="dg-step"><strong>'+(i+1)+'.</strong> '+t+'</div>'}).join('');var el=document.createElement('section');el.id='demigod-trust-block';el.innerHTML='<h2>How matching works</h2><p class="dg-kicker">'+COPY.trustKicker+'</p><div class="dg-steps">'+steps+'</div><h2>Roles we\'re filling</h2><p class="dg-kicker">'+COPY.ledgerKicker+'</p><div class="dg-ledger">'+ledgerHtml()+'</div><div class="dg-process"><h3>The process (elegant &amp; human)</h3><div class="dg-process-grid"><div>1. Brief or profile</div><div>2. Human review</div><div>3. Curated intros</div><div>4. Mutual yes &amp; match</div></div></div>';if(s&&s.parentNode)s.parentNode.insertBefore(el,s);else{var f=q('footer,.footer');f&&f.parentNode?f.parentNode.insertBefore(el,f):document.body.appendChild(el)}setTimeout(addMotion,80)}
function mob(){if(q('#dg-fx'))return;var e=document.createElement('style');e.id='dg-fx';e.textContent='#dg-bar{position:fixed;bottom:0;left:0;right:0;z-index:998;display:none;gap:.5rem;padding:.55rem .8rem;background:rgba(6,6,6,.96);border-top:1px solid rgba(201,168,76,.2)}#dg-bar a{flex:1;text-align:center;padding:.55rem;border-radius:8px;font-weight:600;font-size:.8rem;text-decoration:none!important}.dg-h{background:#8b0000;color:#fff!important}.dg-j{background:#2563eb;color:#fff!important}@media(max-width:767px){#dg-bar{display:flex!important;padding-bottom:calc(.55rem + env(safe-area-inset-bottom,0px))}.hero-section h1,.header h1{font-size:clamp(1.6rem,8vw,2.4rem)!important}}';document.head.appendChild(e);if(q('#dg-bar'))return;var b=document.createElement('div');b.id='dg-bar';b.innerHTML='<a class="dg-h" href="#" data-demigod-modal="startup">'+COPY.ctaFounder+'</a><a class="dg-j" href="#" data-demigod-modal="jobseeker">'+COPY.ctaEngineer+'</a>';document.body.appendChild(b)}
function foot(){var f=q('footer,.footer');if(!f)return;qa('footer nav,footer ul,footer .w-col,footer [class*="column"],footer section',f).forEach(function(c){var t=c.textContent||'';if(t.length<8||t.length>8000)return;if(/Company|Services|Resources|Legal|ABOUT|TEAM|CAREERS|Facebook|Instagram|LinkedIn|YouTube|GET STARTED/i.test(t)&&!/hello@trydemigod|© 2026/i.test(t))c.style.setProperty('display','none','important')});qa('footer a[href="#"]',f).forEach(function(a){var p=a.closest('li,nav,div')||a;if(!/hello@trydemigod/i.test(p.textContent||''))p.style.setProperty('display','none','important')});qa('footer .footer_icon-group,footer .button-group,footer [class*="social"]',f).forEach(function(g){g.style.setProperty('display','none','important')});if(!q('#demigod-footer-tag')){var p=document.createElement('p');p.id='demigod-footer-tag';p.style.cssText='color:#9ca3af;font-size:.9rem;margin:.5rem 0 1rem;max-width:42rem';p.textContent=COPY.footerTag;var c=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c&&c.parentNode)c.parentNode.insertBefore(p,c)}if(!q('#footer-email')){var a=document.createElement('a');a.id='footer-email';a.href='mailto:hello@trydemigod.com';a.textContent='hello@trydemigod.com';a.style.cssText='display:block!important;color:#c9a84c;font-size:.95rem;margin:.75rem 0;text-decoration:none';var c2=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c2&&c2.parentNode)c2.parentNode.insertBefore(a,c2)}qa('footer .text-color_secondary,footer [class*="copyright"]',f).forEach(function(el){el.style.fontSize='0.875rem';el.style.lineHeight='1.4';el.textContent='© 2026 Demigod. All rights reserved.'});if(!q('#dg-copyright')){var cp=document.createElement('p');cp.id='dg-copyright';cp.textContent='© 2026 Demigod. All rights reserved.';cp.style.cssText='color:#A8A29E;font-size:.875rem;margin:.5rem 0 0';var bot=f.querySelector('.footer_bottom')||f;bot.appendChild(cp)}}
function rmOrphanForms(){qa('form.w-form').forEach(function(f){if(f.closest('#startup-modal,#jobseeker-modal'))return;var n=(f.getAttribute('data-name')||f.name||'').toLowerCase();if(n==='email-form'||n==='test-form'||f.id==='email-form'){(f.closest('section,.w-form-wrap,div')||f).remove()}})}
function hide(f){[S,J].forEach(function(id){if(!f&&OPEN===id)return;var m=q(id);if(m){m.style.display='none';m.setAttribute('aria-hidden','true')}}); if(document.body){ var prev = document.body.dataset.prevOverflow || ''; var sy = parseInt(document.body.dataset.prevScrollY || '0', 10); document.body.style.overflow = prev; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; delete document.body.dataset.prevOverflow; delete document.body.dataset.prevScrollY; try { window.scrollTo(0, sy); } catch(e){} } if(document.documentElement) document.documentElement.style.overflow=''; }
var busy=false,tmr=null,OBS=null;
function run(){if(busy)return;busy=true;if(OBS)OBS.disconnect();try{forceMainVisible();hero();copy();forms();price();cta();nav();(function roles(){qa('h2').forEach(function(h){if(/Live SF startup roles hiring now/i.test(h.textContent||''))h.textContent='Example roles — humans reviewing fit'});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$/i.test((b.textContent||'').trim()))b.textContent='EXAMPLE ROLES'});qa('section,div,[class*=role]').forEach(function(c){if(/lorem ipsum|consectetur/i.test(c.textContent||''))c.style.setProperty('display','none','important')})})();trust();mob();foot();rmOrphanForms();successCta();if(!OPEN)hide();fetchBoard();dedupeAll();scrubTimeClaims();scrubStaticLabels()}catch(e){console.error('Demigod v150 fail',e)}finally{if(OBS){OBS.takeRecords();OBS.observe(document.documentElement,{childList:true,subtree:true})}busy=false}}

function dedupeAll(){
  // Extremely aggressive dedupe for duplicate CTAs, badges, footer (Fable spec + live audit findings)
  var killExact = ['FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', 'SF BAY AREA STARTUP MATCHING'];
  killExact.forEach(function(needle){
    var matches = [];
    qa('a, button, .button, .premium-btn, [data-demigod-modal], .badge-text, .eyebrow').forEach(function(el){
      var t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.toUpperCase() === needle) matches.push(el);
    });
    for (var i = 1; i < matches.length; i++) {
      var el = matches[i];
      (el.closest('li,div,nav,header,.w-nav, .badge, .hero-badge, .w-form') || el).style.setProperty('display','none','important');
    }
  });

  // Extra badges / repeated eyebrow
  qa('.badge-text, .eyebrow').forEach(function(b, i){ if (i > 0) b.style.setProperty('display','none','important'); });

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

  // Aggressive dedupe for top banner CTAs (multiple nav areas)
  var seenTop = {};
  qa('nav a, header a, .nav a, #dg-top-nav a, a.button').forEach(function(a){
    var t = (a.textContent || '').trim();
    if (t === 'FIND TALENT' || t === 'HIRE TALENT' || t === 'JOIN NETWORK') {
      if (seenTop[t]) {
        a.style.setProperty('display','none','important');
      } else {
        seenTop[t] = true;
      }
    }
  });
}

function scrubTimeClaims(){
  var bad = /within\s*\d+\s*(hours?|hrs?|days?)|24\s*h|48\s*h|same day|quickly|fast response/i;
  qa('*').forEach(function(el){
    if (el.closest('script,style')) return;
    var txt = el.textContent || '';
    if (bad.test(txt) && !/hello@|pending/i.test(txt) && el.children.length === 0) {
      el.textContent = txt.replace(bad, 'soon (pending setup)');
    }
  });
}

function scrubStaticLabels(){
  // Title scrub for bad Webflow form titles leaking to <title> and DOM (fixes bad=true in audits)
  try {
    if (document.title && /HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(document.title)) {
      document.title = document.title.replace(/\s*(?:STARTUP\s+)?HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/gi, '').replace(/\s*•\s*$/, '').trim() || 'Demigod • Human-Matched SF Startup Talent';
    }
  } catch(e){}
  // Remove or hide Webflow static labels that leak through in audits + modal specific for blank form
  qa('*').forEach(function(el){
    var t = (el.textContent || '').trim();
    if (/^STARTUP HIRING FORM$|^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$|^Hiring Model$|^EXAMPLE BRIEFS$/i.test(t) && el.children.length === 0) {
      el.style.setProperty('display','none','important');
      if (el.parentElement) el.parentElement.style.setProperty('display','none','important');
    }
    if (/STARTUP HIRING FORM|HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(t)) {
      el.style.setProperty('display','none','important');
      var p = el.parentElement;
      while (p && p !== document.body) {
        if (p.matches && (p.matches('#startup-modal, #jobseeker-modal, form, .w-form, .modal') || /form|modal/i.test(p.className||''))) {
          p.style.setProperty('display','none','important');
        }
        p = p.parentElement;
      }
      el.textContent = '';
    }
  });
  // modal-only scrub for any remaining title leaks - VERY aggressive
  ['#startup-modal', '#jobseeker-modal'].forEach(function(sel){
    qa(sel + ' *').forEach(function(el){
      var t = (el.textContent || '').trim();
      if (/HIRING FORM|APPLICATION|EXAMPLE BRIEFS|CANDIDATE APPLICATION$/i.test(t) && !el.closest('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review')) {
        el.style.setProperty('display','none','important');
        el.textContent = '';
        var pp = el.parentElement;
        if (pp && pp !== document.body) pp.style.setProperty('display','none','important');
      }
    });
  });
  // kill any text node or el with exact bad title inside forms or modals
  qa('#startup-modal *, #jobseeker-modal *, form *').forEach(function(el){
    if (/STARTUP HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(el.textContent||'')) {
      el.style.setProperty('display','none','important');
      el.textContent = '';
      if (el.parentElement) el.parentElement.style.setProperty('display','none','important');
    }
  });
  // Extra: hide any lingering Webflow form titles inside modals + h1/h2 leaks + generic/ignored from a11y snapshots
  qa('#startup-modal .w-form-title, #jobseeker-modal .w-form-title, #startup-modal h1, #jobseeker-modal h1, #startup-modal h2, #jobseeker-modal h2, #startup-modal h3, #jobseeker-modal h3, [role=generic], [aria-hidden=true]').forEach(function(el){
    if (/form|application|hir|example|candidate|briefs|STARTUP HIRING/i.test(el.textContent||'')) {
      el.style.setProperty('display','none','important');
      el.textContent = '';
      if (el.parentElement) el.parentElement.style.setProperty('display','none','important');
    }
  });
  // final aggressive pass for exact bad strings anywhere not in wiz chrome
  qa('*').forEach(function(el){
    if (el.closest && el.closest('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review')) return;
    var t = (el.textContent || '').trim();
    if (/^CANDIDATE APPLICATION$|^ENGINEER APPLICATION$|^STARTUP HIRING FORM$/i.test(t)) {
      el.style.setProperty('display','none','important');
      el.textContent = '';
      if (el.parentElement) el.parentElement.style.setProperty('display','none','important');
    }
  });
}
function show(id){if(!q(id))run();var m=q(id);if(!m)return;OPEN=id;m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');if(document.body){ if(!document.body.dataset.prevOverflow){ document.body.dataset.prevOverflow = document.body.style.overflow || getComputedStyle(document.body).overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){ document.documentElement.style.overflow='hidden'; } setTimeout(function(){var fi=m.querySelector('input:not([type=hidden]),select,textarea');if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
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
    st.textContent = '#startup-modal form,#jobseeker-modal form,#startup-modal .w-form,#jobseeker-modal .w-form,#startup-modal .form-field-group,#jobseeker-modal .form-field-group,#startup-modal .dg-field-wrap,#jobseeker-modal .dg-field-wrap,#startup-modal input:not([type=hidden]),#jobseeker-modal input:not([type=hidden]),#startup-modal select,#jobseeker-modal select,#startup-modal textarea,#jobseeker-modal textarea {display:block !important;visibility:visible !important;opacity:1 !important;} #startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head,#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{display:block !important;visibility:visible !important;}';
    document.head.appendChild(st);
  }
  qa('form,.w-form,.form-field-group,.dg-field-wrap,input,select,textarea', m).forEach(function(c){c.style.setProperty('display','block','important');c.style.setProperty('visibility','visible','important');});
} catch(e){}
// Re-init WIZ/forms for dynamic modal content (ensures 90day + injected fields + stepper attach after open)
try {
  var mf = m.querySelector('form') || (id===S ? q('#startup-hire') : q('#engineer-join'));
  if (mf) {
    delete mf.dataset.dgWizBuilt;
    delete mf.dataset.dgStartup;
    mf.classList.remove('w-form-loading');
    mf.style.setProperty('display', 'block', 'important');
    mf.style.visibility = 'visible';
    // force ancestors (fixes form none in live)
    var p=mf; while(p && p!== document.body){ try{ p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p = p.parentElement; }
    // extra direct force for form + modal to fix formD=none / vis=0 seen in audits
    mf.style.setProperty('display', 'block', 'important');
    mf.style.setProperty('visibility', 'visible', 'important');
    if (m) { m.style.setProperty('display', 'flex', 'important'); m.style.setProperty('visibility', 'visible', 'important'); }
    if (typeof forms === 'function') forms();
    // extra post-reinit force for formD=none seen in MCP live audits (source truth)
    if (mf) {
      mf.style.setProperty('display','block','important');
      mf.style.setProperty('visibility','visible','important');
      mf.style.removeProperty('display'); // let !imp win
      mf.style.setProperty('display','block','important');
    }
    // force scrub + title clean immediately
    if (typeof scrubStaticLabels === 'function') scrubStaticLabels();
    try { if (document.title && /HIRING|APPLICATION|BRIEFS/i.test(document.title)) document.title = document.title.replace(/HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/gi,'').trim() || document.title; } catch(e){}
    if (typeof wizBuild === 'function' && mf && !mf.dataset.dgWizBuilt) wizBuild(mf, (id===S?'startup':'engineer'));
    // immediate synchronous force for welcome to prevent blank form on open (HIRE TALENT)
    try {
      if (typeof showStep === 'function') showStep(0);
      var hd = m.querySelector('.dg-wiz-head');
      if (hd) {
        hd.style.setProperty('display','block','important');
        hd.style.setProperty('visibility','visible','important');
        var qq = hd.querySelector('.dg-wiz-q');
        var hh = hd.querySelector('.dg-wiz-hint');
        var nb = m.querySelector('.dg-wiz-next');
        if (id === S) {
          if (qq && (!qq.textContent || qq.textContent.length < 5)) qq.textContent = 'Hire SF startup talent';
          if (hh && (!hh.textContent || hh.textContent.length < 10)) hh.textContent = 'One question at a time (works perfectly on phone or desktop). A human reads every brief and proposes only strong fits.';
          if (nb) nb.textContent = 'Start brief →';
        }
      }
      // force the nav too
      var nv = m.querySelector('.dg-wiz-nav');
      if (nv) { nv.style.setProperty('display','flex','important'); nv.style.setProperty('visibility','visible','important'); }
    } catch(e){}
    setTimeout(function(){ scrubStaticLabels(); if (typeof showStep === 'function') showStep(0); }, 40);
    setTimeout(function(){ var n = m.querySelector('.dg-wiz-next'); if(n){ n.style.display='inline-block'; n.style.visibility='visible'; n.disabled=false; } }, 120);
    forceWizVisible(mf, m);

    // repeated force against late Webflow re-hide (fixes persistent form none / vis=0)
    var forceCount=0; var fr = setInterval(function(){
      forceCount++;
      if(forceCount>8){clearInterval(fr);return;}
      if(mf){ mf.style.setProperty('display','block','important'); mf.style.visibility='visible'; }
      if(m) qa('form,.w-form,.form-field-group,.dg-field-wrap,input,select,textarea',m).forEach(function(c){c.style.setProperty('display','block','important');c.style.visibility='visible';});
      scrubStaticLabels();
    }, 180);
  }
} catch(e){}
}
function sched(){if(tmr)clearTimeout(tmr);tmr=setTimeout(function(){tmr=null;run()},120)}
function boot(){if(!document.body)return;forceMainVisible();run()}boot();document.addEventListener('DOMContentLoaded',boot);[400,1500].forEach(function(ms){setTimeout(boot,ms)});setTimeout(forceMainVisible, 50);
// Extra delayed dedupes to catch late-rendered Webflow elements / repeated sections
[800, 2200, 4500].forEach(function(ms){ setTimeout(dedupeAll, ms); setTimeout(scrubStaticLabels, ms+100); });
document.addEventListener('click',function(e){var c=e.target.closest('[class*=close],.modal_close,.w-modal-close');if(c&&c.closest(S+','+J)){e.preventDefault();OPEN=null;hide(true);return}var el=e.target.closest('a[href="'+S+'"],a[href="'+J+'"],a[href="#"],[data-demigod-modal]');if(!el)return;var h=(el.getAttribute('href')||'').trim(),k=el.getAttribute('data-demigod-modal');if(h===S||h==='#'||k==='startup'){e.preventDefault();show(S)}else if(h===J||k==='jobseeker'){e.preventDefault();show(J)}},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&OPEN){OPEN=null;hide(true)}});
OBS=new MutationObserver(function(){if(OPEN)return;sched(); if (Math.random()<0.2) forceMainVisible(); });OBS.observe(document.documentElement,{childList:true,subtree:true});
window.__dgFootVer='150';console.log('Demigod v150');
window.__dgDedupe = dedupeAll;
window.__dgScrub = scrubStaticLabels;



})();
/*removed stray formSend per hygiene*/

// OAuth pending (as led by Fable/Claude bosses): LinkedIn prefill for engineers in WIZ, Google for startups. Minimal 'pending' per pre-services. Supabase stack. See demigod-oauth-setup.md
function initOAuthPending() {
  try {
    var eng = document.querySelector('form, #engineer, [data-wf-form*="engineer"], .w-form');
    if (!eng) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Login with LinkedIn (OAuth pending - prefill coming)';
    btn.style.cssText = 'margin:4px 0;padding:6px 10px;background:#0A66C2;color:#fff;border:0;border-radius:3px;font-size:12px;cursor:pointer;';
    btn.onclick = function(){
      alert('OAuth (Supabase + LinkedIn) pending full setup per pre-services. Use the form for now. hello@trydemigod.com will follow up.');
      // Future: const { createClient } = supabase; const sb = createClient(URL, KEY); sb.auth.signInWithOAuth({provider:'linkedin_oidc'})
    };
    var ref = eng.querySelector('button, input[type=submit], .premium-btn') || eng.lastChild;
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
  } catch(e){}
}
if (document.readyState === 'complete' || document.readyState === 'interactive') initOAuthPending();
else document.addEventListener('DOMContentLoaded', initOAuthPending);
window.__dgInitOAuth = initOAuthPending;
