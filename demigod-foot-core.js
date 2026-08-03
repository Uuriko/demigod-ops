/*dg-foot-v903-core*/
window.dgFootVersion = 'v903'; console.log('[demigod] foot v903-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null;
/* Use product route (same-origin /?p=) — never raw catbox .html (text/plain MIME) */

/* Dual paths: name the immediate action. Demigod has no public job board, application, or network membership to promise candidates. */
/* ==== SECTION: COPY (runtime marketing strings) ==== */
var MATCH_DISCLOSURE='Software compares role goals, skills, location, and compensation. A human decides what to propose. Nothing is sent automatically.';
var COPY={
heroSub:'Start with one role, real constraints, and one concrete first result. '+MATCH_DISCLOSURE+' Candidate identity stays private until both sides say yes.',
badge:'// SF STARTUP TALENT · SOFTWARE + HUMAN REVIEW',
heroTrustLine:'No public profiles · Mutual yes only · Free for talent · 10% on hire · Bay Area',
antiLinkedIn:'No public profiles. No feed. No blasts. Mutual yes only — candidate identity stays private until both sides approve.',
ctaFounder:'Hire talent',
ctaEngineer:'Share what I’d consider',
navCta:'Hire talent',
ctaHireHint:'For startups',
ctaTalentHint:'For candidates',
startupH2:'Hiring brief',
startupBody:'One role, real constraints, and one concrete first result. '+MATCH_DISCLOSURE,
engineerH2:'Private candidate details',
engineerBody:'Your details stay private — this is not a public profile. '+MATCH_DISCLOSURE,
feeNote:'10% of first-year base salary when a hire starts. Free for talent. Nothing until then.',
pricingNote:'10% of first-year base salary when a hire starts — nothing until then',
trustKicker:'How it works',
trustSteps:['You share a brief or preferences','Software compares · a human proposes','Both approve → intro'],



pathHow:'How it works',
pathSample:'Sample match',
pathStartups:'SF tech companies'
};
/* Frege-night WIZ copy (v597) — natural voice, match-critical only, no draft-save chrome */
var STARTUP_OK="Got it. A human will read this. potter@trydemigod.com follows up if there's a real fit.";
var ENGINEER_OK='Details saved. Not shared with startups until you approve an intro. potter@trydemigod.com only reaches out on real fits.';
var WIZ_THANKS={
  startup:{head:'Brief in',lead:'Someone reads every submission. We only propose when the fit is real — both sides still have to say yes.',steps:['We calibrate the role, first result, and constraints','You review any proposed fit before we contact the candidate','The candidate sees the exact role; intro only after both approve']},
  engineer:{head:'Received',lead:'Not shared with startups until you approve an intro. Free for talent. No blasts.',steps:['Demigod and its form provider process your answers','A human proposes only real fits','You approve before identifying details move']}
};
/* ==== SECTION: WIZ_CFG (stepper paths) ==== */
/* Salary bands = USD base salary only (SF-market buckets). Equity is free text later if needed — keep matching numeric. */
var SALARY_BAND_HTML='<option value="">Select range</option>'
  +'<option value="under-100k">Under $100k base</option>'
  +'<option value="100-130k">$100k – $130k</option>'
  +'<option value="130-160k">$130k – $160k</option>'
  +'<option value="160-190k">$160k – $190k</option>'
  +'<option value="190-220k">$190k – $220k</option>'
  +'<option value="220-250k">$220k – $250k</option>'
  +'<option value="250-300k">$250k – $300k</option>'
  +'<option value="300k-plus">$300k+ base</option>'
  +'<option value="flexible">Flexible / open</option>';
var WIZ_CFG={
  startup:{
    steps:[['welcome'],['role-title'],['company-name'],['company-stage'],['stack-needs'],['work-location'],['salary-range'],['90day-outcome'],['contact-email'],['__submit__'],['__thanks__']],
    welcome:{t:'Hiring brief',b:'For permanent direct hires at SF Bay startups. About 2 minutes · 10% of first-year base salary when a hire starts · nothing upfront. Press Enter to continue.',btn:'Start the brief'},
    thanks:STARTUP_OK,
    optional:[]
  },
  engineer:{
    steps:[['welcome'],['sf-bay'],['full-name'],['seeker-email'],['skills-stack'],['experience'],['availability'],['salary-expectation'],['resume'],['__submit__'],['__thanks__']],
    welcome:{t:'Open to the right startup?',b:'Tell us what would make you consider an SF Bay startup role. About 2 minutes · private · free for candidates · no blasts. Already shared? Submit again with the same email; a human reviews the update. We only contact you when a human sees a credible fit. Your identifying details are shared with a startup only after you approve the exact company and role. Press Enter to continue.',btn:'Start privately'},
    thanks:ENGINEER_OK
  }
};
/* ==== SECTION: WIZ_Q (questions + hints) ==== */
var WIZ_Q={
  startup:{
    'contact-email':{q:'Work email?',h:'Match notes only — not a list, not spam.'},
    'company-name':{q:'Company name?',h:'Legal or product name is fine.'},
    'company-stage':{q:'Company stage?',h:'Pick the closest stage — we match to reality, not the pitch deck.'},
    'role-title':{q:'Role title?',h:'Be specific: founding engineer, first PM, head of growth…'},
    'stack-needs':{q:'What are the 2–3 true must-haves?',h:'Skills, domain, or ownership level. Include any genuine deal-breaker; skip nice-to-haves.'},
    '90day-outcome':{q:'What should this person accomplish first?',h:'One concrete result is enough. A 30–90 day horizon is useful; we can calibrate timing.'},
    'work-location':{q:'Where can they work?',h:'Only arrangements you can actually support.'},
    'salary-range':{q:'Target base salary range?',h:'USD base salary for this role. Equity is separate — ranges keep matching honest.'},
    '__submit__':{q:'Look good?',h:'Edit any answer below. Sending confirms this role is open now. If you request an intro, the candidate privately sees the company and exact role before deciding; their identity stays private until both approve.'}
  },
  engineer:{
    'full-name':{q:'Your name?',h:'For intros only — never a public board profile.'},
    'seeker-email':{q:'Best email?',h:'Only potter@trydemigod.com for match notes.'},
    'skills-stack':{q:'What kind of work do you want next?',h:'Name the role or problems, plus the strengths and domain you want to use.'},
    'experience':{q:'Work you are proud of?',h:'2–3 concrete wins with outcomes beat a long bio.'},
    'sf-bay':{q:'Which work setup are you open to?',h:'Choose one you would genuinely consider. If neither fits, close the form; nothing is saved.'},
    'availability':{q:'When could you start?',h:'Pick the closest window.'},
    'salary-expectation':{q:'Target base salary range?',h:'Your target — never salary history. USD base salary only.'},
    'resume':{q:'Resume or work link?',h:'PDF/Word upload or one HTTPS portfolio / resume link. Shared only after both sides approve. Not a public profile.'},
    '__submit__':{q:'Ready?',h:'Edit anything first. Private until you approve an intro. Free for talent — no blasts. No public profile.'}
  }
};
function resumeUrlError(value){
  var text=String(value||'').trim();
  if(!text)return '';
  if(text.length>2048)return 'Keep the link under 2,048 characters.';
  try{var parsed=new URL(text);if(parsed.protocol!=='https:'||parsed.username||parsed.password)return 'Use an HTTPS link without an embedded username or password.';}
  catch(e){return 'Enter a valid HTTPS link.';}
  return '';
}
function resumeFileError(file){
  if(!file)return '';
  if(file.size>10485760)return 'Max file size 10MB';
  return /\.(pdf|docx?)$/i.test(String(file.name||''))?'':'Upload a PDF or Word document.';
}
function talentIsTechnical(skills){
  return /\b(engineer(?:ing)?|software|developer|frontend|backend|fullstack|mobile|data engineer(?:ing)?|data science|analytics engineer(?:ing)?|machine learning|ml|ai|devops|infrastructure|security|react|typescript|javascript|node(?:\.js)?|python|java|golang|rust|ruby|rails|django|kubernetes|docker|sql|database|api|ios|android)\b/i.test(String(skills||''));
}
function startupOutcomePrompt(role){
  role=String(role||'').trim().slice(0,60);
  if(!role)return WIZ_Q.startup['90day-outcome'];
  return /\b(engineer(?:ing)?|developer|software|product|designer?|data|ai|ml|security|infrastructure|devops|architect)\b/i.test(role)
    ? {q:'What should your '+role+' own, ship, or improve first?',h:'One concrete result is enough — a release, migration, reliability, adoption, or delivery milestone.'}
    : {q:'What measurable result should your '+role+' deliver first?',h:'One concrete result is enough — hiring, pipeline, revenue, retention, launch, or operations.'};
}
function startupRequirementsPrompt(role, fallback){
  role=String(role||'').trim().slice(0,60);
  return role?{q:'What are the 2–3 true must-haves for your '+role+'?',h:fallback.h}:fallback;
}
function talentExperiencePrompt(skills){
  return talentIsTechnical(skills)
    ? {q:'What have you built or shipped?',h:'Two or three concrete outcomes beat a long bio.'}
    : {q:'What result are you proud of?',h:'A launch, campaign, hire, process, deal, or measurable outcome.'};
}
function talentProofPrompt(skills, canUpload){
  return {q:'Resume or work link?',h:(canUpload?'Upload a PDF/Word resume or paste':'Paste')+' a shareable HTTPS resume, portfolio, or work link. Shared only after both sides approve.'};
}
function talentNativeLabel(text){
  if(/^What you shipped\s*\*?$/i.test(text||''))return 'What work are you proud of? *';
  if(/^(?:Skills\s*&\s*stack|Next role & strengths)\s*\*?$/i.test(text||''))return 'Next role & strengths *';
  return text;
}
/* Only probe a localhost API when the page is itself served from localhost. Otherwise the probe
   targets each visitor's machine, creates mixed-content/Private Network Access errors, and cannot
   reach the operator's service. */
function dgLocalOk(u){
  try {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true;
    return !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(u);
  } catch (e) { return true; }
}
/* v642: public Events Bot API for live /?p=events.
   Discovery: window.DG_EVENTS_BOT_API → public config JSON (CDN) → tunnel candidates → localhost.
   Probes race in parallel so a dead loca.lt subdomain never blocks a live one.
   localtunnel browser interstitial needs Bypass-Tunnel-Reminder. */
var __dgEvBotExtraBases = [];
var __dgEvBotCfgAt = 0;
function dgEventsBotNormBase(u) {
  u = String(u || '')
    .trim()
    .replace(/\/+$/, '');
  if (!u) return '';
  return u.replace(
    /\/(offer|offers|chat|lifecycle|health|event|idea|feedback|money|agent)(\/.*)?$/i,
    '',
  );
}
function dgEventsBotBases() {
  var raw = '';
  try {
    raw = dgEventsBotNormBase((typeof window !== 'undefined' && window.DG_EVENTS_BOT_API) || '');
  } catch (e0) {}
  var list = [raw]
    .concat(__dgEvBotExtraBases || [])
    // No hardcoded loca.lt tunnel: that subdomain ROTATES (dev localtunnel), so a fixed guess is always
    // stale and CORS-503s on every prod visitor's console. dgLocalOk can't catch it (not localhost). The
    // CURRENT tunnel arrives dynamically via DG_EVENTS_BOT_API + __dgEvBotExtraBases (CDN config
    // discovery); localhost dev bases below stay (dgLocalOk-gated) to keep production consoles quiet.
    .concat([
      'http://127.0.0.1:3460/api/events-bot',
      'http://localhost:3460/api/events-bot',
    ]);
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var u = dgEventsBotNormBase(list[i]);
    if (!u || seen[u]) continue;
    try {
      if (typeof dgLocalOk === 'function' && !dgLocalOk(u)) continue;
    } catch (e1) {}
    seen[u] = 1;
    out.push(u);
  }
  return out;
}
function dgEventsBotFetch(url, opts) {
  opts = opts || {};
  var h = {};
  var oh = opts.headers || {};
  try {
    if (typeof Headers !== 'undefined' && oh instanceof Headers) {
      oh.forEach(function (v, k) {
        h[k] = v;
      });
    } else {
      for (var k in oh) {
        if (Object.prototype.hasOwnProperty.call(oh, k)) h[k] = oh[k];
      }
    }
  } catch (e2) {}
  h['Bypass-Tunnel-Reminder'] = '1';
  return fetch(
    url,
    Object.assign({}, opts, {
      mode: opts.mode || 'cors',
      headers: h,
    }),
  );
}
/** Load rotating tunnel apiBase from published config (no foot reship when tunnel URL changes).
 *  Raw GitHub only — jsDelivr @main for this file lags and used to leave dead tunnels in the ladder. */
function dgEventsBotLoadConfig() {
  if (Date.now() - __dgEvBotCfgAt < 60000 && __dgEvBotExtraBases.length) {
    return Promise.resolve(__dgEvBotExtraBases);
  }
  var bust = Math.floor(Date.now() / 60000);
  var urls = [
    'https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/main/events-api-latest.json?t=' + bust,
  ];
  function loadOne(cfgUrl) {
    return fetch(cfgUrl, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(3500) }).then(
      function (r) {
        if (!r.ok) throw new Error('cfg ' + r.status);
        return r.json();
      },
    );
  }
  function pushBase(list, j) {
    var b = dgEventsBotNormBase((j && (j.apiBase || j.tunnelUrl)) || '');
    if (b && b.indexOf('/api/events-bot') < 0 && /^https?:\/\//.test(b)) b = b + '/api/events-bot';
    if (b && list.indexOf(b) < 0) list.push(b);
  }
  return Promise.all(
    urls.map(function (u) {
      return loadOne(u).catch(function () {
        return null;
      });
    }),
  )
    .then(function (arr) {
      __dgEvBotCfgAt = Date.now();
      var list = [];
      function configAt(j) {
        var t = Date.parse((j && (j.publishedAt || j.at)) || '');
        return isFinite(t) ? t : 0;
      }
      arr.sort(function (a, b) {
        return configAt(b) - configAt(a);
      });
      for (var i = 0; i < arr.length; i++) pushBase(list, arr[i]);
      if (list.length) __dgEvBotExtraBases = list;
      return __dgEvBotExtraBases;
    })
    .catch(function () {
      return __dgEvBotExtraBases;
    });
}
/** Probe newest-first and fall back only on failure. Cache so all callers share one probe. */
var __dgEvBotLive = null;
var __dgEvBotLiveAt = 0;
// In-flight probe shared by concurrent callers: the residual storm was 24 probes all fired
// within ~1s, before any result existed to cache. One round, shared.
var __dgEvBotPending = null;
function dgEventsBotPickBase(timeoutMs) {
  timeoutMs = timeoutMs || 6000;
  // Serve a cached MISS as well as a cached hit: without this every caller re-probed a dead
  // bot, so one page load fired ~64 requests at a 503 tunnel. TTL unchanged (45s).
  if (__dgEvBotLive && Date.now() - __dgEvBotLiveAt < 45000) {
    return Promise.resolve(__dgEvBotLive);
  }
  if (__dgEvBotPending) return __dgEvBotPending;
  __dgEvBotPending = dgEventsBotLoadConfig().then(function () {
    var bases = dgEventsBotBases();
    function probe(i) {
      if (i >= bases.length) return Promise.resolve({ base: '', j: {} });
      var base = bases[i];
      return dgEventsBotFetch(base + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
      })
        .then(function (r) {
          if (!r.ok) throw new Error('bad');
          /* localtunnel interstitial is HTML 511 — never treat as healthy JSON */
          var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
          if (ct && ct.indexOf('json') < 0) throw new Error('not-json');
          return r.json().then(function (j) {
            if (!j || !j.ok) throw new Error('bad-body');
            return { base: base, j: j || {} };
          });
        })
        .catch(function () {
          return probe(i + 1);
        });
    }
    return probe(0).then(function (hit) {
      __dgEvBotLive = hit;
      __dgEvBotLiveAt = Date.now();
      __dgEvBotPending = null;
      return hit;
    });
  });
  return __dgEvBotPending;
}
function q(s){return document.querySelector(s)}
function qa(s,r){return[...(r||document).querySelectorAll(s)]}

 /* Fable v150: use latest honest published board */
 /*dup q/qa removed - single def earlier*/
function dgIsPageShell(el){if(!el||!el.tagName)return true;var t=el.tagName.toLowerCase();if(t==='body'||t==='html'||t==='main')return true;if(el.id==='startup-modal'||el.id==='jobseeker-modal'||el.id==='dg-bar'||el.id==='dg-path-pills')return true;try{if(el.matches&&el.matches('.hero-section,.hero-container,.hero-actions,.nav_container,header,footer,.footer,nav.w-nav,.w-nav'))return true;}catch(e){}return false;}
function dgHide(el){if(!el||dgIsPageShell(el))return;try{el.style.setProperty('display','none','important');}catch(e){}}

function rmF(f,n){if(!f)return;qa('[name="'+n+'"],#'+n,f).forEach(function(i){var w=i.closest('.w-input,.w-select,.w-radio,.w-checkbox,fieldset')||i.parentElement||i;w.remove()});qa('label',f).forEach(function(l){if(new RegExp(n.replace(/-/g,'[- ]'),'i').test(l.textContent||''))l.remove()})}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}


function addMotion(){qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand,#demigod-trust-block .dg-process-grid > div,.dg-reveal,.dg-p-det').forEach(function(el){try{el.classList.add('dg-reveal')}catch(e){}});if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){qa('.dg-reveal').forEach(function(el){el.classList.add('dg-reveal-in')});return}try{if(!window.__dgRevealObs){window.__dgRevealObs=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('dg-reveal-in');window.__dgRevealObs.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'})}qa('.dg-reveal').forEach(function(el){window.__dgRevealObs.observe(el)})}catch(e){}}

// Consolidated force helper to simplify duplicate !important code across wizBuild/showStep/show
function forceWizVisible(form, modal) {
  /* v195: shell + chrome only — never force all fields (kills one-question contract) */
  /* v617: never force CLOSED hire/talent modals open (was blanking homepage with dual overlays) */
  if (form) {
    form.classList.remove('w-form-loading');
    form.style.setProperty('display', 'block', 'important');
    form.style.setProperty('visibility', 'visible', 'important');
    var p = form;
    while (p && p !== document.body) {
      try {
        if (p.matches && p.matches('#startup-modal,#jobseeker-modal,.modal-overlay')) {
          /* skip forcing closed modal shells */
          var isOpen = OPEN && (p === q(OPEN) || ('#' + (p.id || '') === OPEN));
          if (!isOpen) { p = p.parentElement; continue; }
        }
        p.style.setProperty('display', p.matches && p.matches('#startup-modal,#jobseeker-modal') ? 'flex' : 'block', 'important');
        p.style.visibility = 'visible';
      } catch (e) {}
      p = p.parentElement;
    }
  }
  if (modal) {
    var open = OPEN && (modal === q(OPEN) || ('#' + (modal.id || '') === OPEN));
    if (open) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('visibility', 'visible', 'important');
    }
  }
  var root = modal || form;
  if (!root) return;
  qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-count,.dg-wiz-bar,.dg-wiz-bar i,.dg-wiz-next', root).forEach(function(c){
    if (!c || !c.style) return;
    var d = c.classList && (c.classList.contains('dg-wiz-nav') || c.classList.contains('dg-wiz-next')) ? 'flex' : 'block';
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

function heroImgPerf(){qa('.hero-section img,.hero-container img,[class*=hero] img,header img').forEach(function(im){if(im.dataset.dgPerf)return;im.dataset.dgPerf='1';im.setAttribute('fetchpriority','high');im.setAttribute('decoding','async');im.loading='eager';if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','Demigod — SF startup talent matching, San Francisco Bay Area');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function lazyBelowFold(){qa('img').forEach(function(im){if(im.dataset.dgPerf||im.dataset.dgLazy)return;if(im.closest('.hero-section,.hero-container,header,[class*=hero]'))return;im.dataset.dgLazy='1';if(!im.getAttribute('loading'))im.loading='lazy';im.setAttribute('decoding','async');if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function skipLink(){try{var early=q('#dg-skip-early');if(early)early.remove()}catch(e){}if(q('#dg-skip'))return;var main=q('#main')||q('main')||q('.hero-section');if(main){if(!main.id)main.id='main';if(main.tagName!=='MAIN')main.setAttribute('role','main')}var a=document.createElement('a');a.id='dg-skip';a.href='#'+(main&&main.id||'main');a.textContent='Skip to main content';a.setAttribute('aria-label','Skip to main content');a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000';a.addEventListener('focus',function(){a.style.cssText='position:fixed;left:12px;top:12px;z-index:10000;background:#C9A84C;color:#0A0A0A;padding:8px 12px;border-radius:6px;font-weight:600'});a.addEventListener('blur',function(){a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000'});a.addEventListener('click',function(e){e.preventDefault();var t=q('#dg-page')||q('#main,main,.hero-section,h1')||document.body;try{t.setAttribute('tabindex','-1');t.focus({preventScroll:true});var beh=(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth';if(t.scrollIntoView)t.scrollIntoView({block:'start',behavior:beh})}catch(err){try{t.focus()}catch(e2){}}});document.body&&document.body.prepend(a)}


function ensureWizPremiumCss(){
  if(q('#dg-wiz-premium-css'))return;
  var s=document.createElement('style');s.id='dg-wiz-premium-css';
  s.textContent=''
    +'#startup-modal .dg-wiz-choice,#jobseeker-modal .dg-wiz-choice{transition:border-color .15s ease,background .15s ease,transform .12s ease;}'
    +'#startup-modal .dg-wiz-choice:hover,#jobseeker-modal .dg-wiz-choice:hover{border-color:rgba(201,168,76,.55);}'
    +'#startup-modal .dg-wiz-choice.is-on,#jobseeker-modal .dg-wiz-choice.is-on{border-color:#C9A84C;box-shadow:0 0 0 1px rgba(201,168,76,.35);}'
    +'#startup-modal .dg-wiz-next[data-enter-hint]::after,#jobseeker-modal .dg-wiz-next[data-enter-hint]::after{content:attr(data-enter-hint);display:block;font-size:.62rem;font-weight:500;opacity:.5;letter-spacing:.06em;margin-top:.12rem}'
    +'@media(prefers-reduced-motion:reduce){#startup-modal .dg-wiz-choice,#jobseeker-modal .dg-wiz-choice{transition:none}}'
    +'#startup-modal form.dg-wiz-on .dg-wiz-show,#jobseeker-modal form.dg-wiz-on .dg-wiz-show{animation:dgWizIn .22s ease both}'
    +'@keyframes dgWizIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
    +'@media(prefers-reduced-motion:reduce){#startup-modal form.dg-wiz-on .dg-wiz-show,#jobseeker-modal form.dg-wiz-on .dg-wiz-show{animation:none}}';
  document.head.appendChild(s);
}

function faqCss(){if(q('#dg-faq-css'))return;var s=document.createElement('style');s.id='dg-faq-css';s.textContent='#dg-faq details{border-bottom:1px solid rgba(201,168,76,.15);padding:.55rem 0}#dg-faq summary{cursor:pointer;font-weight:600;color:#F5F0E6;list-style:none;min-height:44px;display:flex;align-items:center}#dg-faq summary::-webkit-details-marker{display:none}#dg-faq summary:before{content:"\\25B8 ";color:#C9A84C}#dg-faq details[open] summary:before{content:"\\25BE "}#dg-proof-strip a:focus,#dg-contact-strip a:focus,.dg-wiz-next:focus,.dg-wiz-back:focus{outline:2px solid #a6ffcb;outline-offset:2px}@media(prefers-reduced-motion:reduce){#startup-modal *,#jobseeker-modal *,#dg-faq *{transition:none!important;animation:none!important}}';document.head.appendChild(s)}
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
  // Native touch fallback; layout stays CSS-owned so responsive rules can adapt cleanly.
  const isMobile = window.innerWidth < 768;
  qa('.dg-wiz-next, .dg-wiz-back, .dg-wiz-start').forEach(function(b){
    if (isMobile) {
      b.style.setProperty('min-height', '44px', 'important');
    }
    b.style.setProperty('touch-action', 'manipulation', 'important');
  });
  // Step visibility is owned by wizBuild/showStep.
}
setTimeout(enhanceWIZ, 500);
document.addEventListener('click', function(e) {
  if (e.target.closest('.dg-wiz-next, .dg-wiz-back')) setTimeout(enhanceWIZ, 100);
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
          qa('.dg-field-wrap,.form-field-group,.w-file-upload,input,select,textarea', openModal).forEach(function(c){
            if (!c || !c.style) return;
            if (c.classList && c.classList.contains('w-file-upload-input')) return;
            var n = (c.getAttribute && (c.getAttribute('name') || c.id)) || '';
            var wrap = c.matches && c.matches('.dg-field-wrap,.form-field-group,.w-file-upload') ? c : (c.closest && c.closest('.dg-field-wrap,.form-field-group,.w-file-upload'));
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
  var reviewReturn = -1;
  var reviewEditStep = -1;
  var SAVE_KEY = 'dgWizSave_' + kind;
  var answers = {};
  // v597: no draft-save UI / no 7-day localStorage (less is more; privacy)
  /* v646: __dgWizStore removed — it was assigned false here and compared !==true in
     wizResumeToast, so the toast could never fire. The draft lives in sessionStorage (see collect). */
  try {
    localStorage.removeItem('dgWizStoreConsent');
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('dgWizSave_startup');
    localStorage.removeItem('dgWizSave_engineer');
  } catch (e) {}
  /* v604: same-session resume from the sessionStorage draft (see collect()). Restores answers +
     step so a misclick/back/accidental close does not throw the form away. Never cross-session. */
  var resumeStep = 0;
  try {
    var draft = JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null');
    if (draft && draft.answers) {
      answers = draft.answers;
      resumeStep = Math.max(0, Math.min(draft.step | 0, (cfg.steps || []).length - 1));
      if (resumeStep > 0) form.dataset.dgWizResumed = '1';
    }
  } catch (e) {}
  /* Browsers cannot restore File objects. Never let a saved filename impersonate an upload at
     review; remove it and return to the required file step. Restorable resume URLs are untouched. */
  qa('input[type="file"]', form).forEach(function(input){
    var name=input.name||input.id||'', fileStep=steps.findIndex(function(step){return step[0]===name;});
    if(name&&Object.prototype.hasOwnProperty.call(answers,name)){delete answers[name];if(fileStep>=0&&resumeStep>fileStep)resumeStep=fileStep;}
  });
  try { if (draft && draft.answers) sessionStorage.setItem(SAVE_KEY, JSON.stringify({ answers: answers, step: resumeStep })); } catch (e) {}
  var head = document.createElement('div');
  head.className = 'dg-wiz-head';
  var __dgWizTotal = steps.filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length || Math.max(1, steps.length-3);
  var progressLabel = kind === 'startup' ? 'Hiring brief progress' : kind === 'engineer' ? 'Talent profile progress' : 'Application progress';
  head.innerHTML =
    '<div class="dg-wiz-progress">' +
    '<div class="dg-wiz-count" aria-live="polite"><span class="dg-cur">0 of ' + String(__dgWizTotal) + '</span></div>' +
    '<div class="dg-wiz-bar" role="progressbar" aria-label="' + progressLabel + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div>' +
    '</div>' +
    '<div class="dg-wiz-q"></div><div class="dg-wiz-hint"></div>' +
    '<div class="dg-wiz-live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></div>';
  var qEl = head.querySelector('.dg-wiz-q');
  var hEl = head.querySelector('.dg-wiz-hint');
  qEl.id = 'dg-wiz-question-' + kind;
  hEl.id = 'dg-wiz-hint-' + kind;
  function describedAdd(el, id) { if (!el || !id) return; var ids=(el.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean); if(ids.indexOf(id)<0)ids.push(id); el.setAttribute('aria-describedby',ids.join(' ')); }
  function describedRemove(el, id) { if (!el || !id) return; var ids=(el.getAttribute('aria-describedby')||'').split(/\s+/).filter(function(x){return x&&x!==id}); if(ids.length)el.setAttribute('aria-describedby',ids.join(' '));else el.removeAttribute('aria-describedby'); }
  /* v848: inline field errors (no browser alert/reportValidity bubble). */
  function wizInlineInvalid(focusEl, msg, key) {
    if (!focusEl) return null;
    focusEl.style.borderColor = '#F87171';
    focusEl.setAttribute('aria-invalid', 'true');
    try { focusEl.focus(); } catch (e) {}
    var errEl = form.querySelector('.dg-wiz-req-err');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'dg-wiz-req-err';
      errEl.setAttribute('role', 'alert');
      errEl.style.cssText = 'color:#F87171;font-size:.85rem;margin:.4rem 0 0;line-height:1.35';
      focusEl.insertAdjacentElement('afterend', errEl);
    }
    errEl.id = errEl.id || ('dg-wiz-req-err-' + (key || focusEl.name || focusEl.id || 'field'));
    errEl.textContent = msg || focusEl.validationMessage || 'Please fix this field.';
    describedAdd(focusEl, errEl.id);
    var clear = function () {
      focusEl.style.borderColor = '';
      focusEl.removeAttribute('aria-invalid');
      describedRemove(focusEl, errEl.id);
      if (errEl) errEl.textContent = '';
    };
    focusEl.addEventListener('input', clear, { once: true });
    focusEl.addEventListener('change', clear, { once: true });
    return errEl;
  }
  function normalizeUrl(el) {
    if (!el || String(el.type).toLowerCase() !== 'url') return;
    var value = String(el.value || '').trim();
    if (value && !/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value.replace(/^\/\//, '');
    el.value = value;
    if (/^resume-url$/i.test(String(el.name || el.id || ''))) {
      el.maxLength = 2048;
      el.setCustomValidity(resumeUrlError(value));
    }
  }
  var progress = head.querySelector('.dg-wiz-bar');
  var bar = head.querySelector('.dg-wiz-bar i');
  var curEl = head.querySelector('.dg-cur');
  // map fields - prefer the visual container (.form-field-group or .dg-field-wrap)
  var fieldMap = {};
  qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
    var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
    var container = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.closest('label') || el.parentElement || el;
    if (n && !fieldMap[n]) fieldMap[n] = container;
    if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
    if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
  });
  // ensure 90day and key fields are mapped even if injection timing
  ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs'].forEach(function(k){
    if (!fieldMap[k]) {
      var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
      if (el) {
        var c = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.parentElement || el;
        fieldMap[k] = c;
      }
    }
  });
  Object.keys(answers).forEach(function(k){
    var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
    if (el && el.type !== 'file' && !el.value) {
      if (el.type === 'checkbox' || el.type === 'radio') { if (answers[k]) el.checked = true; }
      else { el.value = answers[k]; el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
  });
  var nav = document.createElement('div');
  nav.className = 'dg-wiz-nav';
  nav.innerHTML = '<button type="button" class="dg-wiz-back">Back</button><button type="button" class="dg-wiz-next">Continue</button>';
  try{ nav.querySelector('.dg-wiz-next').setAttribute('data-enter-hint','Enter ↵'); }catch(e){}
  var backBtn = nav.querySelector('.dg-wiz-back');
  var nextBtn = nav.querySelector('.dg-wiz-next');
  // place chrome
  form.insertBefore(head, form.firstChild || null);
  form.appendChild(nav);
  // force chrome visible immediately
  head.style.setProperty('display', 'block', 'important');
  nav.style.setProperty('display', 'flex', 'important');
  nav.style.setProperty('visibility', 'visible', 'important');
  qa('.dg-wiz-next', nav).forEach(function(b){ b.style.setProperty('display','inline-block','important'); b.style.cursor='pointer'; });
  // .dg-wiz-back display is owned by showStep (must hide on welcome) — do not blanket-force it here.
  qa('.dg-wiz-back', nav).forEach(function(b){ b.style.cursor='pointer'; });
  var nativeSub = form.querySelector('[type="submit"], .w-button');
  if (nativeSub) nativeSub.style.display = 'none';
  if (typeof forceWizVisible === 'function') forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));

  // broad force children to ensure inputs show (from final user tests)
  qa('input,select,textarea,label,.w-input,.w-select,.w-file-upload,.form-field-group,.dg-field-wrap', form).forEach(function(c){ if(c.classList.contains('w-file-upload-input'))return; c.style.setProperty('display','block','important'); c.style.setProperty('visibility','visible','important'); });
  function collect() {
    qa('input,select,textarea', form).forEach(function(i) {
      var nm = i.name || i.id || '';
      if (!nm) return;
      // Hidden inputs are not draft answers. Skips the Turnstile token (~750 chars) that the
      // "save this draft" consent would otherwise persist for 7 days; also clears it from
      // drafts saved before this fix. Restore never wrote it back (Turnstile re-issues), so
      // this is hygiene, not a behaviour change.
      if (i.type === 'hidden') { delete answers[nm]; return; }
      if (i.type === 'file') {
        /* A selected local File is not proof Webflow persisted it. Its upload widget sets
           data-value only after upload succeeds; never review/submit a filename-only answer. */
        if (i.files && i.files[0] && String(i.getAttribute('data-value') || '').trim()) answers[nm] = i.files[0].name;
        else delete answers[nm];
      } else if (i.type === 'checkbox' || i.type === 'radio') {
        if (i.checked) answers[nm] = i.value || 'yes';
        else if (i.type === 'checkbox') delete answers[nm];
      } else if (i.value && i.value.trim()) answers[nm] = i.value.trim();
      else delete answers[nm];
    });
    /* v604: sessionStorage draft for same-tab resume after a misclick, Back, or Close.
       No TTL, consent UI, or cross-session surface. Cleared on submit. */
    try {
      var draftAnswers = Object.assign({}, answers);
      qa('input[type="file"]', form).forEach(function(input){ delete draftAnswers[input.name || input.id || '']; });
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ answers: draftAnswers, step: current }));
    } catch (e) {}
  }
  /* === WIZ STEP STATE — show/validate exactly one question; preserve values across back/reopen/resize === */
  function showStep(idx) {
    current = Math.max(0, Math.min(idx, steps.length - 1));
    collect();
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
    var keyArr = steps[current] || [];
    var key = keyArr[0] || '';
    qa('.dg-referral-notice',form).forEach(function(note){note.hidden=key!=='welcome'&&key!=='__submit__'});
    if (form) {
      form.classList.remove('w-form-loading');
      form.style.setProperty('display', 'block', 'important');
      form.style.visibility = 'visible';
      var modal = form.closest ? form.closest('#startup-modal,#jobseeker-modal') : null;
      /* never force .w-form-done/.w-form-fail — that fakes success for waitPost */
      qa('.w-file-upload,.form-field-group,.dg-field-wrap', form).forEach(function(c){
        if (c.classList && (c.classList.contains('w-form-done') || c.classList.contains('w-form-fail'))) return;
        c.style.setProperty('display','block','important'); c.style.visibility='visible';
      });
      if (typeof forceWizVisible === 'function') forceWizVisible(form, modal);
    }
    var __tot = steps.filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length || Math.max(1, steps.length-3);
    var __qn = steps.slice(0, current + 1).filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length;
    if (key === 'welcome') __qn = 0;
    if (key === '__submit__' || key === '__thanks__') __qn = __tot;
    /* v849: progress shows step count + percent for clarity */
    var _stepLabel = key === 'welcome' ? ('0 of ' + __tot) : (String(Math.max(__qn, 1)) + ' of ' + String(__tot));
    var _pctLabel = Math.min(100, Math.round((__qn / __tot) * 100));
    curEl.textContent = key === 'welcome' ? _stepLabel : (_stepLabel + ' · ' + _pctLabel + '%');
    try {
      head.classList.toggle('is-welcome', key === 'welcome');
      head.classList.toggle('is-thanks', key === '__thanks__');
      head.classList.toggle('is-review', key === '__submit__');
    } catch (eHead) {}
    try{ var totEl=curEl.parentElement; if(totEl&&!totEl.getAttribute('data-dg-prog')){ totEl.setAttribute('data-dg-prog','1'); totEl.setAttribute('aria-live','polite'); } }catch(e){}
    // re-map fields every showStep in case of late injection or Webflow DOM changes
    var fieldMap = {};
    qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
      var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
      var container = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.closest('label') || el.parentElement || el;
      if (n && !fieldMap[n]) fieldMap[n] = container;
      if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
      if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
    });
    ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs', 'full-name'].forEach(function(k){
      if (!fieldMap[k]) {
        var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
        if (el) fieldMap[k] = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.parentElement || el;
      }
    });
    // ULTRA ROBUST: aggressively hide EVERY possible Webflow/field wrapper except current step's
    try {
      qa('input,select,textarea,label,.w-input,.w-select,.w-file-upload,.form-field-group,.dg-field-wrap,fieldset,.w-checkbox,.w-radio', form).forEach(function(el){
        if (el.closest('.dg-wiz-head') || el.closest('.dg-wiz-nav') || el.closest('.dg-wiz-review')) return;
        var c = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.closest('label') || el.closest('fieldset') || el.parentElement || el;
        if (c && c !== form && !c.classList.contains('dg-wiz-head') && !c.classList.contains('dg-wiz-nav')) c.style.setProperty('display','none','important');
      });
    } catch(e){}
    // show current key's containers + any matching the step key
    var toShow = [];
    if (key && fieldMap[key]) toShow.push(fieldMap[key]);
    qa('input, select, textarea', form).forEach(function(el){
      // exact name/id only — substring-matching label TEXT leaked any field whose label merely
      // mentioned the step key (skills-stack label "Skills & experience *" leaked onto 'experience')
      var n = (el.name || el.id || '').toLowerCase();
      if (key && n === key) toShow.push(el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el);
    });
    var fileStep = key && form.querySelector('input[type="file"][name="' + key + '"],input[type="file"][id="' + key + '"]');
    var fileFallback = key && form.querySelector('[name="' + key + '-url"]');
    if (fileFallback) {
      toShow.push(fileFallback.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || fileFallback);
      fileFallback.style.setProperty('display', 'block', 'important');
      fileFallback.style.setProperty('visibility', 'visible', 'important');
    }
    toShow.forEach(function(c){
      if (c && c.style) { c.style.setProperty('display', 'block', 'important'); c.classList.add('dg-wiz-show'); }
      var i = c && c.querySelector ? c.querySelector('input,select,textarea') : c;
      if (i && i.style && !i.classList.contains('w-file-upload-input')) i.style.setProperty('display', 'block', 'important');
      // hide native Webflow labels (WIZ question owns the text)
      try {
        qa('label.w-form-label, label[for], .w-form-label', c).forEach(function(lab){
          if (lab.classList && lab.classList.contains('w-file-upload-label')) { lab.style.setProperty('display','flex','important'); lab.style.setProperty('visibility','visible','important'); return; }
          if (lab.querySelector && lab.querySelector('input[type=checkbox],input[type=radio]')) return;
          if (lab.tagName==='LABEL' && /checkbox|radio/i.test(lab.className||'')) return;
          lab.style.setProperty('display','none','important');
        });
        if (i && i.id) {
          qa('label[for="'+i.id+'"]:not(.w-file-upload-label)', form).forEach(function(lab){ lab.style.setProperty('display','none','important'); });
        }
      } catch(eLab){}
    });
    // Force ONLY the current step key. Was ['contact-email','full-name', key] — a vis=0 band-aid
    // that force-showed those two on EVERY step, leaking them into later steps (user-confirmed bug).
    [key].forEach(function(ck){
      if (!ck) return;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        if(!el.classList.contains('w-file-upload-input'))el.style.setProperty('display', 'block', 'important');
        var cc = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.parentElement;
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
        if(!el.classList.contains('w-file-upload-input')){el.style.removeProperty('display'); el.style.setProperty('display','block','important'); el.style.visibility='visible';}
        var cc = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.parentElement;
        if (cc) { cc.style.removeProperty('display'); cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        /* native label hidden by CSS when WIZ question owns the copy */
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
    var pct = Math.min(100, Math.round((__qn / __tot) * 100));
    if (bar) bar.style.width = pct + '%';
    if (progress) {
      progress.setAttribute('aria-valuenow', String(pct));
      progress.setAttribute('aria-valuetext', pct + '% complete');
    }
    qEl.textContent = ''; hEl.textContent = '';
    backBtn.style.setProperty('display', (current > 0 && key !== 'welcome') ? 'flex' : 'none', 'important');
    if (key === 'welcome') {
      qEl.textContent = cfg.welcome ? cfg.welcome.t : 'Welcome';
      hEl.textContent = cfg.welcome ? cfg.welcome.b : '';
      nextBtn.textContent = cfg.welcome ? cfg.welcome.btn : 'Start →';
      nextBtn.style.display = '';
      // Force hide ALL fields on welcome to prevent leaks (fixes startup form not loading clean stepper)
      qa('.form-field-group, .dg-field-wrap, .w-file-upload, input, select, textarea', form).forEach(function(fld){
        if (!fld.closest('.dg-wiz-head') && !fld.closest('.dg-wiz-nav')) {
          if(fld.classList.contains('w-file-upload-input'))return;
          fld.style.setProperty('display', 'none', 'important');
        }
      });
      // no pre-show here; advance to contact-email will show the field
    } else if (key === '__submit__') {
      // Review step only — do NOT set dgSubmitting until real submit click
      var sq = (qmap.__submit__ || {});
      qEl.textContent = sq.q || 'Ready to submit?';
      hEl.innerHTML = esc(sq.h || 'A human reviews personally.') + ' <a href="/legal" target="_blank" rel="noopener">Privacy</a>.';
      nextBtn.textContent = kind === 'startup' ? 'Send brief' : 'Send privately';
      // review
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      var html = '';
      var keys = Object.keys(answers);
      var stepOrder={};steps.forEach(function(s,i){stepOrder[s[0]]=i});
      keys.sort(function(a,b){return (stepOrder[a.replace(/-url$/,'')]??999)-(stepOrder[b.replace(/-url$/,'')]??999)});
      keys.forEach(function(k) {
        var qd = qmap[k] || (/-url$/.test(k) && qmap[k.replace(/-url$/, '')]); if (!qd) return; // skip turnstile/internal fields
        var lab = (qd.q || k).replace(/\s*\(optional[^)]*\)/i, '').replace(/[?？]+\s*$/, '');
        if (k === '90day-outcome') lab = 'First result';
        if (k === 'resume-url') lab = 'Resume link';
        var extra = (k === '90day-outcome') ? ' style="font-weight:600;border-left:2px solid #10c674;padding-left:.5rem"' : '';
        // <select> stores the option value ('series-a'); show the label the user actually picked ('Series A').
        // Display-only: answers[k] stays canonical so localStorage restore (i.value = answers[nm]) still matches.
        var shownVal = answers[k];
        try {
          // checkbox stores "on" (no value attr on the Designer element) — show a human Yes/No
          var cbEl = form.querySelector('input[type="checkbox"][name="' + k + '"], input[type="checkbox"][id="' + k + '"]');
          if (cbEl) shownVal = cbEl.checked ? 'Yes' : 'No';
          var selEl = form.querySelector('select[name="' + k + '"], select[id="' + k + '"]');
          if (selEl && selEl.value === answers[k] && selEl.selectedOptions && selEl.selectedOptions[0]) {
            shownVal = (selEl.selectedOptions[0].textContent || answers[k]).trim() || answers[k];
          }
        } catch (e) {}
        var editIndex = steps.findIndex(function(s){ return s[0] === k; });
        if (editIndex < 0 && /-url$/.test(k)) editIndex = steps.findIndex(function(s){ return s[0] === k.replace(/-url$/, ''); });
        var edit = editIndex >= 0 ? '<button type="button" class="dg-wiz-edit" data-dg-edit-step="' + editIndex + '" aria-label="Edit ' + esc(lab) + '">Edit</button>' : '';
        html += '<div' + extra + '><span>' + esc(lab) + '</span><em>' + esc(shownVal) + '</em>' + edit + '</div>';
      });
      rev.innerHTML = html || '<div>No answers captured — use Back to fill in your brief.</div>';
      qa('.dg-wiz-edit', rev).forEach(function(btn){
        btn.onclick = function(){
          var idx = Number(btn.getAttribute('data-dg-edit-step'));
          if (idx >= 0 && idx < steps.length) { reviewReturn = current; reviewEditStep = idx; showStep(idx); }
        };
      });
    } else if (key === '__thanks__') {
      /* v604: clear the sessionStorage draft too — submitted work must not resume. */
      try { localStorage.removeItem(SAVE_KEY); sessionStorage.removeItem(SAVE_KEY); } catch(e){}
      nextBtn.style.display = 'none'; backBtn.style.display = 'none';
      return;
    } else {
      nextBtn.textContent = 'Continue';
      try {
        var hintEl = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
        if (hintEl && hintEl.tagName === 'TEXTAREA') {
          nextBtn.setAttribute('data-enter-hint', /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '') ? '⌘ + Enter' : 'Ctrl + Enter');
        } else if (hintEl && hintEl.tagName === 'SELECT') {
          nextBtn.setAttribute('data-enter-hint', '1–9 or click');
        } else {
          nextBtn.setAttribute('data-enter-hint', 'Enter ↵');
        }
      } catch (eHint) {}
      var qd = qmap[key] || {q: key.replace(/-/g,' '), h: ''};
      if(kind==='engineer'&&key==='seeker-email'&&answers['full-name'])qd={q:'Nice to meet you, '+String(answers['full-name']).trim().split(/\s+/)[0].slice(0,32)+'. Best email?',h:qd.h};
      /* Typeform recall: echo prior answers so later questions feel conversational */
      if(kind==='startup'&&key==='stack-needs')qd=startupRequirementsPrompt(answers['role-title'],qd);
      if(kind==='startup'&&key==='90day-outcome')qd=startupOutcomePrompt(answers['role-title']);
      if(kind==='engineer'&&key==='experience')qd=talentExperiencePrompt(answers['skills-stack']||(form.querySelector('[name="skills-stack"]')||{}).value);
      if(kind==='engineer'&&key==='resume'){
        var proof=talentProofPrompt(answers['skills-stack']||(form.querySelector('[name="skills-stack"]')||{}).value,!!fileStep);
        qd={q:proof.q,h:proof.h};
      }
      qEl.textContent = qd.q;
      /* almost-done beat on the last real question (Typeform completion psychology) */
      var lastReal = -1;
      for (var si = steps.length - 1; si >= 0; si--) {
        var sk = (steps[si] || [])[0] || '';
        if (sk && sk !== 'welcome' && sk !== '__submit__' && sk !== '__thanks__') { lastReal = si; break; }
      }
      var almost = (current === lastReal) ? ' Almost done — then a quick review.' : '';
      hEl.textContent = (qd.h || '') + almost;
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
      var fallbackTarget = form.querySelector('[name="' + key + '-url"]');
      var isOptional = (cfg.optional || []).indexOf(key) >= 0;
      [target, fallbackTarget].forEach(function(el){
        if (!el) return;
        el.setAttribute('aria-labelledby', qEl.id);
        el.setAttribute('aria-required', isOptional ? 'false' : 'true');
        describedAdd(el, hEl.id);
      });
      var fld = fieldMap[key] || fieldMap[key.replace(/-/g,'')] || (target ? (target.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || target) : null) || (fallbackTarget ? (fallbackTarget.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || fallbackTarget) : null);
      if (fld) {
        fld.style.display = '';
        fld.classList.add('dg-wiz-show');
        if (target && target !== fld && !target.classList.contains('w-file-upload-input')) {
          target.style.display = '';
          target.classList.add('dg-wiz-show');
        }
        // ensure ancestors that are field containers are visible
        var p = fld.parentElement;
        while (p && p !== form) {
          if (p.classList.contains('form-field-group') || p.classList.contains('dg-field-wrap') || p.classList.contains('w-file-upload')) {
            p.style.display = '';
          }
          p = p.parentElement;
        }
        setTimeout(function() {
          var inp = (fld.querySelector ? fld.querySelector('.w-file-upload-label,[name="' + key + '-url"],input:not(.w-file-upload-input),select,textarea') : null) || target || fld;
          if (inp && inp.focus) try { inp.focus(); } catch(e){}
        }, 30);
      } else {
        // last resort: show the first hidden container (helps for some injected fields)
        var first = form.querySelector('.form-field-group[style*="none"], .dg-field-wrap[style*="none"]');
        if (first) { first.style.display = ''; first.classList.add('dg-wiz-show'); }
      }
      // deterministic name/id + fieldMap + final-guarantee pass own visibility; fuzzy keyword unhide removed (ghosts)
    }
    // qEl is now the new step; announcing before the branches above spoke the previous question.
    try { var live=form.querySelector('.dg-wiz-live'); if(live)live.textContent=qEl.textContent||''; } catch(e){}
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
        qa('label,.dg-field-wrap,.form-field-group,.w-file-upload', form).forEach(function(lab){
          if (!curTarget && (lab.textContent || '').toLowerCase().includes(qKey)) {
            curTarget = lab.querySelector ? (lab.querySelector('input,select,textarea') || lab) : lab;
          }
        });
      }
      if (curTarget) {
        if(!curTarget.classList.contains('w-file-upload-input'))curTarget.style.display = '';
        const gg = curTarget.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || curTarget.parentElement;
        if (gg) { gg.style.display = ''; gg.classList.add('dg-wiz-show'); }
        var ii = curTarget.tagName && /INPUT|TEXTAREA|SELECT/.test(curTarget.tagName) ? curTarget : (curTarget.querySelector && curTarget.querySelector('input,select,textarea'));
        if (ii && !ii.classList.contains('w-file-upload-input')) ii.style.display = '';
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
          if(!el.classList.contains('w-file-upload-input')){el.style.setProperty('display','block','important'); el.style.visibility='visible';}
          var cc = el.closest('.form-field-group, .dg-field-wrap, .w-file-upload') || el.parentElement;
          if (cc) { cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        }
      }
    } catch(e){}
    /* hide form-level notes that leak onto one-question steps */
    try {
      qa('#dg-privacy,#dg-fee-note,.dg-submit-trust,.dg-resume-hint', form).forEach(function(n){
        if (key === '__submit__' || key === 'resume') n.style.removeProperty('display');
        else n.style.setProperty('display','none','important');
      });
    } catch (eNote) {}
    /* Typeform-style choice chips for <select> steps (single choice, keyboard 1–9, auto-advance) */
    try {
      qa('.dg-wiz-choices', form).forEach(function(n){ n.remove(); });
      var stepSelect = form.querySelector('select[name="' + key + '"], select[id="' + key + '"]');
      if (stepSelect && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
        var host = stepSelect.closest('.dg-field-wrap, .form-field-group') || stepSelect.parentElement;
        if (host) {
          stepSelect.classList.add('dg-wiz-select-native');
          stepSelect.setAttribute('aria-hidden', 'true');
          stepSelect.tabIndex = -1;
          // beat forceWizVisible display:block !important
          stepSelect.style.setProperty('position','absolute','important');
          stepSelect.style.setProperty('width','1px','important');
          stepSelect.style.setProperty('height','1px','important');
          stepSelect.style.setProperty('opacity','0','important');
          stepSelect.style.setProperty('pointer-events','none','important');
          stepSelect.style.setProperty('clip','rect(0,0,0,0)','important');
          var box = document.createElement('div');
          box.className = 'dg-wiz-choices';
          box.setAttribute('role', 'listbox');
          box.setAttribute('aria-labelledby', qEl.id);
          var nOpt = 0;
          Array.from(stepSelect.options).forEach(function(opt){
            if (!opt.value) return;
            nOpt++;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'dg-wiz-choice' + (stepSelect.value === opt.value ? ' is-on' : '');
            b.setAttribute('role', 'option');
            b.setAttribute('aria-selected', stepSelect.value === opt.value ? 'true' : 'false');
            b.dataset.value = opt.value;
            b.innerHTML = '<span class="dg-wiz-choice-k" aria-hidden="true">' + nOpt + '</span><span class="dg-wiz-choice-t">' + esc(opt.textContent || opt.value) + '</span>';
            b.addEventListener('click', function(){
              stepSelect.value = opt.value;
              try { stepSelect.dispatchEvent(new Event('input', { bubbles: true })); } catch (e1) {}
              try { stepSelect.dispatchEvent(new Event('change', { bubbles: true })); } catch (e2) {}
              collect();
              qa('.dg-wiz-choice', box).forEach(function(x){
                var on = x.dataset.value === opt.value;
                x.classList.toggle('is-on', on);
                x.setAttribute('aria-selected', on ? 'true' : 'false');
              });
              if (form._dgChoiceAdvance) clearTimeout(form._dgChoiceAdvance);
              form._dgChoiceAdvance = setTimeout(function(){ try { nextBtn.click(); } catch (e3) {} }, 200);
            });
            box.appendChild(b);
          });
          stepSelect.insertAdjacentElement('afterend', box);
          // focus first choice for keyboard users
          setTimeout(function(){
            var on = box.querySelector('.dg-wiz-choice.is-on') || box.querySelector('.dg-wiz-choice');
            try { on && on.focus(); } catch (e4) {}
          }, 40);
        }
      }
    } catch (eChip) {}
    enhanceWIZ();
    if (head && !head.getAttribute('role')) {
      head.setAttribute('role', 'region');
      head.setAttribute('aria-label', 'Form stepper');
    }
  }
  nextBtn.onclick = function(ev) {
    if (form.dataset.dgSubmitting === '1') return;
    ev && ev.preventDefault();
    var key = (steps[current] || [])[0];
    var stepEl = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
    if (stepEl && stepEl.tagName !== 'SELECT' && !/^(?:file|checkbox|radio)$/i.test(stepEl.type || '')) stepEl.value = String(stepEl.value || '').trim();
    normalizeUrl(stepEl);
    normalizeUrl(form.querySelector('[name="' + key + '-url"]'));
    collect();
    // required validation (skip optionals and welcome)
    if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
      var isOpt = (cfg.optional || []).indexOf(key) >= 0;
      var el = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      var fileUrl = form.querySelector('[name="' + key + '-url"]');
      var isFileGroup = !!fileUrl && (!el || el.type === 'file');
      if (el && isOpt && !el.checkValidity()) { wizInlineInvalid(el, el.validationMessage || 'Please fix this field.', key); return; }
      if ((el || isFileGroup) && !isOpt) {
        var focusEl = isFileGroup ? (fileUrl || el) : el;
        var empty = false;
        if (isFileGroup) {
          var fileReady = !!(el && el.files && el.files.length && String(el.getAttribute('data-value') || '').trim());
          empty = !fileReady && !String(fileUrl && fileUrl.value || '').trim();
        }
        else if (el.type === 'checkbox' || el.type === 'radio') empty = !el.checked;
        else empty = !String(el.value || '').trim();
        // require answer for any non-optional step (covers company-name without required attr)
        if (empty) {
          wizInlineInvalid(focusEl, isFileGroup ? (el ? 'Paste a shareable HTTPS resume or work link, or wait for the file upload to finish.' : 'Paste a shareable HTTPS resume or work link.') : 'Please answer this one — then continue.', key);
          return;
        }
        if (isFileGroup) {
          if (el && el.files && el.files.length && !el.checkValidity()) { wizInlineInvalid(el, el.validationMessage || 'That file cannot be used.', key); return; }
          if (fileUrl && fileUrl.value && !fileUrl.checkValidity()) { wizInlineInvalid(fileUrl, fileUrl.validationMessage || 'Use a full https:// link.', key); return; }
        } else if (key !== 'contact-email' && key !== 'seeker-email' && !el.checkValidity()) { wizInlineInvalid(el, el.validationMessage || 'Please fix this field.', key); return; }
        /* Quality floors for open-ended match fields (Typeform: short junk answers kill matching) */
        if (el && !isFileGroup && el.tagName !== 'SELECT') {
          var minMap = { 'stack-needs': 8, '90day-outcome': 20, 'skills-stack': 5, 'experience': 20 };
          var minN = minMap[key] || 0;
          var raw = String(el.value || '').trim();
          if (minN && raw.length < minN) {
            wizInlineInvalid(el, key === '90day-outcome'
              ? 'Add a concrete result (about ' + minN + '+ characters) so we can match honestly.'
              : key === 'experience'
              ? 'Give one concrete outcome (about ' + minN + '+ characters).'
              : 'A bit more detail helps matching (about ' + minN + '+ characters).', key);
            return;
          }
        }
      }
      if (el && (key === 'contact-email' || key === 'seeker-email') && el.value && el.offsetParent !== null) {
        var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(el.value).trim());
        if (!okMail) {
          wizInlineInvalid(el, 'Enter a valid email so we can reach you.', key);
          return;
        }
      }
    }
    if (reviewReturn >= 0) {
      var returnStep = reviewReturn;
      var editedStep = reviewEditStep;
      reviewReturn = -1;
      reviewEditStep = -1;
      showStep(returnStep);
      setTimeout(function(){var target=form.querySelector('.dg-wiz-edit[data-dg-edit-step="'+editedStep+'"]')||nextBtn;try{target.focus()}catch(e){}},0);
    } else if (key === '__submit__') {
      var oldStatusRoot = form.closest('#startup-modal,#jobseeker-modal') || form.parentElement || form;
      qa('.w-form-done,.w-form-fail', oldStatusRoot).forEach(function(el){ el.style.display='none'; });
      var oldSubmitErr = form.querySelector('.dg-wiz-err'); if (oldSubmitErr) oldSubmitErr.remove();
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
          if (okVis) {
            try{scrubTimeClaims()}catch(e){}
            successCta();
            showStep(current + 1);
            okEl.setAttribute('role','status');
            okEl.setAttribute('aria-live','polite');
            okEl.setAttribute('aria-atomic','true');
            okEl.setAttribute('tabindex','-1');
            var doneLive=form.querySelector('.dg-wiz-live');if(doneLive)doneLive.textContent='';
            try{okEl.focus()}catch(e){}
            return;
          }
          if (badVis) {
            try { delete form.dataset.dgSubmitting; } catch(e){}
            var eEl = form.querySelector('.dg-wiz-err');
            if (!eEl) {
              eEl = document.createElement('p');
              eEl.className = 'dg-wiz-err';
              eEl.setAttribute('role','alert');
              eEl.style.cssText = 'color:#f87171;font-size:.9rem;margin:.5rem 0';
              if (nav && nav.parentNode) nav.parentNode.insertBefore(eEl, nav);
              else form.appendChild(eEl);
            }
            eEl.textContent = 'Submission failed — email potter@trydemigod.com and we will take it from there.';
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
          try { delete form.dataset.dgSubmitting; } catch(e){}
          eEl2.textContent = 'Could not confirm submit — email potter@trydemigod.com and we will take it from there.';
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
  backBtn.onclick = function(ev){ ev&&ev.preventDefault(); reviewReturn = -1; reviewEditStep = -1; if (current > 0) showStep(current - 1); };
  // keyboard advance on visible inputs + arrows for nav (Typeform polish)
  form.addEventListener('keydown', function(e) {
    var act = document.activeElement;
    var inText = act && (act.tagName === 'TEXTAREA' || act.isContentEditable);
    var onChoice = act && act.classList && act.classList.contains('dg-wiz-choice');
    // Typeform: number keys pick a choice chip (never while typing free text)
    if (/^[1-9]$/.test(e.key) && !inText && !(act && act.tagName === 'INPUT' && /^(text|email|url|search|tel)$/i.test(act.type || ''))) {
      var chipsN = form.querySelectorAll('.dg-wiz-choices .dg-wiz-choice');
      if (chipsN.length) {
        var pick = chipsN[parseInt(e.key, 10) - 1];
        if (pick) { e.preventDefault(); pick.click(); return; }
      }
    }
    // Typeform: arrow keys move between choice chips when one is focused
    if (onChoice && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var chipsA = Array.prototype.slice.call(form.querySelectorAll('.dg-wiz-choices .dg-wiz-choice'));
      var ix = chipsA.indexOf(act);
      if (ix >= 0 && chipsA.length) {
        e.preventDefault();
        var dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
        var next = chipsA[(ix + dir + chipsA.length) % chipsA.length];
        try { next && next.focus(); } catch (eF) {}
        return;
      }
    }
    // Enter advances single-line; Ctrl/Cmd+Enter advances textarea (Shift+Enter = newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      if (onChoice) {
        e.preventDefault(); act.click(); return;
      }
      if (inText && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); nextBtn.click(); return;
      }
      if (act && (act.tagName === 'INPUT' || act.tagName === 'SELECT') && act.type !== 'file' && !inText) {
        e.preventDefault(); nextBtn.click();
      }
    }
    if (e.key === 'Escape') {
      if (current > 0) { e.preventDefault(); backBtn.click(); }
    }
    // Arrows only when not typing / not on chips (chip arrows handled above)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.tagName === 'BUTTON' || act.isContentEditable)) return;
      e.preventDefault(); nextBtn.click();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.tagName === 'BUTTON' || act.isContentEditable)) return;
      e.preventDefault(); if (current > 0) backBtn.click();
    }
  }, true);
  // start — honor saved resumeStep (v191: do not clobber with unconditional showStep(0))
  var startIdx = resumeStep || 0;
  setTimeout(function(){ showStep(startIdx); enhanceWIZ(); }, 20);
  form.addEventListener('input', function(){ collect(); enhanceWIZ(); });
  setTimeout(function(){ if (typeof showStep === 'function') showStep(startIdx); }, 50);
  // reopen helper — show() calls this instead of rebuild (v194)

    // v195: ensure configured required fields have required attr
    ['contact-email','company-name','company-stage','role-title','stack-needs','90day-outcome','salary-range','full-name','seeker-email','skills-stack','experience','sf-bay','availability','salary-expectation'].forEach(function(n){ var el=form.querySelector('[name="'+n+'"],[id="'+n+'"]'); if(el && (cfg.optional||[]).indexOf(n)<0){ el.required=true; if(el.type==='checkbox') el.setAttribute('required','required'); }});
  form.__dgWizShow = function(){ try{ showStep(current); enhanceWIZ(); forceWizVisible(form, form.closest('#startup-modal,#jobseeker-modal')); }catch(e){} };
}

/* ==== SECTION: BOARD (CDN ledger — sample-labeled; never invent realRoles) ==== */

function submitTrust(f,msg){if(!f||f.querySelector('.dg-submit-trust'))return;var p=document.createElement('p');p.className='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.textContent=msg||'Reviewed with humans in the loop. No spam lists.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.form-field-group')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max;el.setCustomValidity(n>max?'Keep this under '+max+' characters.':'')};el.maxLength=max;el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='See a fictional match note';/* v598: no follow-up mini-form on thanks (less is more) */a.style.cssText='min-height:48px;margin-top:.75rem;background:transparent!important;color:#c9a84c!important;border:1px solid rgba(201,168,76,.45)!important';a.addEventListener('click',function(){openPage('sample',true)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
function ph(i,t){if(i&&'placeholder'in i)i.placeholder=t}
function formEl(sel){var el=typeof sel==='string'?q(sel):sel;if(!el)return null;return el.tagName==='FORM'?el:(el.querySelector&&el.querySelector('form'))||null}
/* v846: collapse working query aliases into canonical ?referral= before forms/disclosure. */
function normalizeReferralParam(){
  try{
    var u=new URL(location.href);
    var code=(u.searchParams.get('referral')||u.searchParams.get('r')||u.searchParams.get('ref')||'').trim();
    if(!/^rf_[A-Za-z0-9_-]{24}$/.test(code))return;
    var dirty=false;
    if(u.searchParams.get('referral')!==code){u.searchParams.set('referral',code);dirty=true}
    if(u.searchParams.has('r')){u.searchParams.delete('r');dirty=true}
    if(u.searchParams.has('ref')){u.searchParams.delete('ref');dirty=true}
    if(!u.searchParams.get('utm_source')){u.searchParams.set('utm_source','referral');dirty=true}
    if(!u.searchParams.get('utm_campaign')){u.searchParams.set('utm_campaign','partner-network');dirty=true}
    if(dirty)history.replaceState(history.state,'',u.pathname+u.search+u.hash);
  }catch(e){}
}
function formAttribution(form){
  if(!form||form.dataset.dgAttribution)return;
  form.dataset.dgAttribution='1';
  normalizeReferralParam();
  var version=form.ownerDocument.createElement('input');version.type='hidden';version.name='form_version';version.value=window.dgFootVersion||'';form.appendChild(version);
  var params=new URLSearchParams(location.search);
  // referral tokens are base64url (A-Za-z0-9_-); other attrs keep the broader campaign charset
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','referral','role_id','event_id'].forEach(function(name){
    var value=(params.get(name)||'').trim();
    if(!value||value.length>120)return;
    if(name==='referral'){
      if(!/^rf_[A-Za-z0-9_-]{24}$/.test(value))return;
    }else if(!/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(value))return;
    var input=form.ownerDocument.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);
  });
}
function referralNotice(){
  normalizeReferralParam();
  var params=new URLSearchParams(location.search),code=(params.get('referral')||'').trim();
  if(!/^rf_[A-Za-z0-9_-]{24}$/.test(code))return;
  function clearReferral(){
    try{var url=new URL(location.href);url.searchParams.delete('referral');if(url.searchParams.get('utm_source')==='referral')url.searchParams.delete('utm_source');if(url.searchParams.get('utm_campaign')==='partner-network')url.searchParams.delete('utm_campaign');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch(e){}
    qa('input[type=hidden]').forEach(function(input){if(input.name==='referral'||(input.name==='utm_source'&&input.value==='referral')||(input.name==='utm_campaign'&&input.value==='partner-network'))input.remove()});
    qa('.dg-referral-notice').forEach(function(note){note.remove()});
  }
  function notice(id){
    var box=document.createElement('aside');box.id=id;box.className='dg-referral-notice';box.setAttribute('role','note');box.style.cssText='margin:.75rem 0;padding:.8rem .9rem;border:1px solid rgba(166,255,203,.28);border-radius:10px;background:rgba(166,255,203,.07);color:#e8f5ed;display:grid;gap:.4rem;font-size:.82rem;line-height:1.45';
    box.innerHTML='<strong>This is a referral link</strong><span>You stay in control. You submit your own profile, and nothing is shared until you approve an intro. The sender may receive a reward after a successful hire; it comes from Demigod&#39;s fee, never your pay, and does not change how you are evaluated.</span><button type="button" class="dg-referral-clear" style="min-height:44px;padding:.55rem .7rem;border:1px solid rgba(166,255,203,.35);border-radius:8px;background:transparent;color:#a6ffcb;text-align:left;cursor:pointer">This isn&#39;t my referrer</button>';
    box.querySelector('button').addEventListener('click',clearReferral);return box;
  }
  var home=q('#dg-path-pills,.hero-actions');if(home&&!q('#dg-referral-home'))home.insertAdjacentElement('afterend',notice('dg-referral-home'));
  qa('#startup-hire .dg-wiz-head,#engineer-join .dg-wiz-head').forEach(function(head,i){if(head.querySelector('.dg-referral-notice'))return;var box=notice('dg-referral-form-'+i),key=head.closest('form')&&head.closest('form').dataset.dgWizKey;box.hidden=key!=='welcome'&&key!=='__submit__';head.appendChild(box)});
}
/* === FORMS / NATIVE WEBFLOW — id + labels + optional fields; WIZ wraps after === */
/* ==== SECTION: forms (Webflow form repair + required fields + submit trust) ==== */
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');['Source','hiring-model','timeline','team-size','why-this-role','role-jd'].forEach(function(name){rmF(st,name)});qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack/i.test(el.textContent||''))el.textContent='Skills / requirements *';if(/Role Title|Job Title/i.test(el.textContent||''))el.textContent='Role title *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *'});ph(st.querySelector('[name=contact-email]'),'name@company.com');ph(st.querySelector('[name=role-title]'),'Role title');ph(st.querySelector('[name=stack-needs]'),'Required skills or domain knowledge');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; if(n==='contact-email')i.setAttribute('autocomplete','email'); var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL') l.setAttribute('for',n); else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Best email?':n==='role-title'?'Role title?':'Key skills?'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
/* company-name */ if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" autocomplete="organization" required placeholder="Company name">';var ce=st.querySelector('[name=contact-email]');var ceg=ce&&(ce.closest('.form-field-group')||ce.parentElement);if(ceg&&ceg.parentElement&&ceg!==st){ceg.insertAdjacentElement('afterend',cn);}else{(ce&&ce.parentElement||st).appendChild(cn);}}
formAttribution(st);var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';var ceg3=ce&&(ce.closest('.form-field-group')||cew);if(ceg3&&ceg3.parentElement&&ceg3!==st)ceg3.parentElement.insertBefore(sw,ceg3.nextSibling);else if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}}
// Keep the established field name for stored submissions; present it as a plain success question.
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">What should this person accomplish first? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="One concrete result"></textarea>';var skg2=sk&&(sk.closest('.form-field-group')||sk.parentElement);if(skg2&&skg2.parentElement&&skg2!==st){skg2.insertAdjacentElement('afterend',od);}else{(sk&&sk.parentElement||st).appendChild(od);}}
if(!st.querySelector('[name=work-location]')){var wl=document.createElement('div');wl.className='dg-field-wrap';wl.innerHTML='<label class="w-form-label" for="work-location">Where and how can this person work? *</label><select class="w-select" id="work-location" name="work-location" required><option value="">Select</option><option value="sf-onsite">SF onsite</option><option value="sf-hybrid">SF hybrid</option><option value="bay-flexible">SF Bay Area, flexible</option><option value="remote-us">Remote within the US</option><option value="remote-global">Remote internationally</option></select>';var outcome=st.querySelector('[name="90day-outcome"]');var outcomeWrap=outcome&&(outcome.closest('.form-field-group,.dg-field-wrap')||outcome.parentElement);if(outcomeWrap&&outcomeWrap.parentElement)outcomeWrap.parentElement.insertBefore(wl,outcomeWrap.nextSibling);else st.appendChild(wl);}
/* salary-range: always a band select (replace free-text if Webflow left one) */
(function(){var el=st.querySelector('[name=salary-range]');var wrap=document.createElement('div');wrap.id='dg-salary-wrap';wrap.className='dg-field-wrap';wrap.innerHTML='<label class="w-form-label" for="salary-range">Target base salary range *</label><select class="w-select" id="salary-range" name="salary-range" required>'+SALARY_BAND_HTML+'</select>';if(el&&el.tagName==='SELECT'){el.required=true;if(!el.options||el.options.length<3){el.innerHTML=SALARY_BAND_HTML;}var lab=(el.closest('.form-field-group,.dg-field-wrap')||st).querySelector('label');if(lab)lab.textContent='Target base salary range *';return;}if(el){var host=el.closest('.dg-field-wrap,.form-field-group')||el;if(host.parentNode)host.parentNode.replaceChild(wrap,host);else el.replaceWith(wrap);}else if(sa&&sa.parentElement)sa.parentElement.insertBefore(wrap,sa.nextSibling);else{var sub=st.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(wrap,sub);}})();
st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'A human reads every brief. potter@trydemigod.com follows up.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name="90day-outcome"]'),500);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.setAttribute('method','post');if(!en.dataset.dgMailStrip){en.dataset.dgMailStrip='1';en.addEventListener('submit',function(ev){/* keep native Webflow if wired; never open mail client */if(/^mailto:/i.test(en.getAttribute('action')||'')){ev.preventDefault();en.removeAttribute('action');}},true);}['github-url','portfolio-url','linkedin-url','phone','why-startups','work-auth'].forEach(function(name){rmF(en,name)});var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped/i.test(l.textContent||''))l.textContent='What you shipped *';if(/Skills\s*&\s*(Stack|experience)/i.test(l.textContent||''))l.textContent='Next role & strengths *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(i){i.required=true;i.setAttribute('autocomplete',n==='full-name'?'name':'email')}});en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('input[type=file][name=resume],input[type=file][name=Resume]');
formAttribution(en);
var nativeResume=!!(resIn&&resIn.classList.contains('w-file-upload-input'));
if(nativeResume){
  var resW=resIn.closest('.w-file-upload,.dg-field-wrap,.form-field-group')||resIn.parentElement;
  if(resW&&!resW.id)resW.id='dg-resume-wrap';
  if(!resIn.id)resIn.id='resume';
  if(!resIn.name)resIn.name='resume';
  if(!resIn.accept)resIn.setAttribute('accept','.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  resIn.required=false;resIn.removeAttribute('required');
}else{
  if(resIn){
    var bareWrap=resIn.closest('.w-file-upload,.dg-field-wrap,.form-field-group');
    if(bareWrap&&bareWrap.querySelectorAll('input,select,textarea').length===1)bareWrap.remove();else resIn.remove();
  }
  resIn=null;
  var rw=en.querySelector('#dg-resume-wrap');
  if(!rw){
    rw=document.createElement('div');rw.id='dg-resume-wrap';rw.className='dg-field-wrap';
    rw.innerHTML='<label class="w-form-label" for="resume-url">Resume or work link *</label><input class="w-input" type="url" id="resume-url" name="resume-url" autocomplete="url" maxlength="2048" required placeholder="https://"><p class="dg-resume-hint">Paste one shareable HTTPS link.</p>';
    var insBefore=en.querySelector('[name=skills-stack]');
    var insW=insBefore&&(insBefore.closest('.form-field-group,.dg-field-wrap,.w-file-upload')||insBefore.parentElement);
    if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}
  }
}
if(nativeResume&&!en.querySelector('[name=resume-url]')){
  var nativeLink=document.createElement('div');nativeLink.className='dg-field-wrap dg-resume-link';nativeLink.innerHTML='<label class="w-form-label" for="resume-url">Or paste a resume or work link</label><input class="w-input" type="url" id="resume-url" name="resume-url" autocomplete="url" maxlength="2048" placeholder="https://"><p class="dg-resume-hint">Upload a file or paste one shareable HTTPS link.</p>';
  resW.appendChild(nativeLink);
}
qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent=nativeResume?'Resume file or work link *':'Resume or work link *'});
var rUrl=en.querySelector('[name=resume-url]');if(rUrl)rUrl.setAttribute('autocomplete','url');if(resIn){resIn.accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){resIn.setCustomValidity(resumeFileError(resIn.files&&resIn.files[0]))})}}
ph(en.querySelector('[name=skills-stack]'),'Role, problems, and strongest skills');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='Two or three concrete outcomes';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'Two or three concrete outcomes')}charCount(en.querySelector('[name=experience]'),600);rmF(en,'links');var oldLinks=en.querySelector('#dg-links-wrap');if(oldLinks)oldLinks.remove();var sf=en.querySelector('[name=sf-bay]');var sfOptions='<option value="">Select</option><option value="yes">SF onsite, hybrid, or remote</option><option value="remote-bay">Remote only — company can be Bay-based</option>';
if(sf&&sf.type==='checkbox'){var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="sf-bay">Which work setup are you open to?</label><select class="w-select" id="sf-bay" name="sf-bay" required>'+sfOptions+'</select>';var par=sf.closest('.form-field-group,.dg-field-wrap')||sf.closest('label,.w-checkbox')||sf.parentElement;if(par&&par.parentNode)par.parentNode.replaceChild(sw,par);else sf.replaceWith(sw);sf=sw.querySelector('[name=sf-bay]');}
if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('div');c.className='dg-field-wrap';c.innerHTML='<label class="w-form-label" for="sf-bay">Which work setup are you open to?</label><select class="w-select" id="sf-bay" name="sf-bay" required>'+sfOptions+'</select>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
else{var sfel=en.querySelector('[name=sf-bay]');if(sfel){sfel.required=true;if(sfel.tagName==='SELECT')sfel.innerHTML=sfOptions;}}
// inject only match-critical availability and compensation constraints
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">Availability *</label><select class="w-select" id="availability" name="availability" required><option value="">Select</option><option value="now">Ready now</option><option value="2-4w">2–4 weeks</option><option value="1-3m">1–3 months</option><option value="passive">Passively open / flexible</option></select>';var avField=en.querySelector('[name=sf-bay]');var avAfter=avField&&(avField.closest('.form-field-group,.dg-field-wrap')||avField.parentElement);if(avAfter&&avAfter.parentElement)avAfter.parentElement.insertBefore(av,avAfter.nextSibling);else en.appendChild(av);}
var avIn=en.querySelector('[name=availability]');if(avIn){avIn.required=true;var avLab=(avIn.closest('.form-field-group,.dg-field-wrap')||en).querySelector('label');if(avLab)avLab.textContent='Availability *';}
/* salary-expectation: band select (replace free-text) */
(function(){var el=en.querySelector('[name=salary-expectation]');var wrap=document.createElement('div');wrap.className='dg-field-wrap';wrap.innerHTML='<label class="w-form-label" for="salary-expectation">Target base salary range *</label><select class="w-select" id="salary-expectation" name="salary-expectation" required>'+SALARY_BAND_HTML+'</select>';if(el&&el.tagName==='SELECT'){el.required=true;if(!el.options||el.options.length<3)el.innerHTML=SALARY_BAND_HTML;var lab=(el.closest('.form-field-group,.dg-field-wrap')||en).querySelector('label');if(lab)lab.textContent='Target base salary range *';return;}if(el){var host=el.closest('.dg-field-wrap,.form-field-group')||el;if(host.parentNode)host.parentNode.replaceChild(wrap,host);else el.replaceWith(wrap);}else{var avAfter2=en.querySelector('[name=availability]');var avH=avAfter2&&(avAfter2.closest('.form-field-group,.dg-field-wrap')||avAfter2.parentElement);if(avH&&avH.parentElement)avH.parentElement.insertBefore(wrap,avH.nextSibling);else en.appendChild(wrap);}})();
var seIn=en.querySelector('[name=salary-expectation]');if(seIn)seIn.required=true;
if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.textContent='Demigod and its form/email providers process these answers for matching. You see the company and exact role before deciding; your identifying details move only after both sides approve. This is not a public profile or professional network feed.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Not shared with startups before mutual approval. Free for candidates. No public profiles.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Send privately';sb2.textContent='Send privately'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
/* === COPY INJECTION — runtime marketing strings from COPY; honesty scrub separate === */
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
/** Cyber wordmark: split letters for motion. Pure DOM paint. */
function paintCyberWord(el, word) {
  if (!el) return;
  var w = String(word || 'Demigod');
  var reduce =
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) ||
    document.documentElement.classList.contains('dg-reduce');
  el.classList.add('dg-cyber-host');
  if (reduce) {
    el.innerHTML =
      '<span class="dg-cyber-word" aria-label="' +
      w +
      '">' +
      w +
      '</span>';
    return;
  }
  el.innerHTML =
    '<span class="dg-cyber-word" aria-label="' +
    w +
    '">' +
    w
      .split('')
      .map(function (ch, i) {
        var c = ch === ' ' ? '&nbsp;' : ch;
        return (
          '<span class="dg-cyber-ch" style="--i:' +
          i +
          '" data-ch="' +
          ch +
          '">' +
          c +
          '</span>'
        );
      })
      .join('') +
    '</span>';
}

/** Permanent brand H1. Reduced-motion users receive the same wordmark without letter motion. */
function paintHeroBrandH1(el) {
  if (!el) return;
  window.clearTimeout(el._dgHeroHoldTimer);
  window.clearTimeout(el._dgHeroMorphTimer);
  el.setAttribute('data-dg-hero-h1', '1');
  el.setAttribute('data-dg-hero-phase', 'brand');
  el.classList.remove('dg-hero-morph-in', 'dg-hero-morph-out');
  el.classList.add('dg-hero-hold', 'dg-cyber-host');
  el.style.minHeight = 'clamp(6.63rem,20.4vw,12.24rem)';
  el.style.visibility = 'visible';
  el.style.opacity = '1';
  el.style.transform = 'none';
  el.style.filter = 'none';
  el.style.transition = 'none';
  paintCyberWord(el, 'Demigod');
}

function guardHeroBrandH1(el) {
  if (!el || el._dgHeroObserver || typeof MutationObserver === 'undefined') return;
  el._dgHeroObserver = new MutationObserver(function () {
    if (!/^Demigod$/i.test((el.textContent || '').trim())) paintHeroBrandH1(el);
  });
  el._dgHeroObserver.observe(el, { childList: true, subtree: true, characterData: true });
}

/* === HERO / CTA SURFACE — permanent brand H1; dual path remains in the CTAs === */
function hero(){
  if(q('#dg-page'))return;
  qa('.hero-section h1,.hero-title,.header h1').forEach(function(e){
    e.setAttribute('data-dg-hero-h1','1');
    if (e.getAttribute('data-dg-hero-phase') !== 'brand' || !/^Demigod$/i.test((e.textContent || '').trim())) paintHeroBrandH1(e);
    guardHeroBrandH1(e);
  });
  qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){
    if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.id==='dg-eyebrow'||e.id==='dg-hero-chips'||e.id==='dg-cta-trust'||e.closest('.dg-candidates,#startup-modal,#jobseeker-modal,#dg-path-pills,#dg-hero-chips,#dg-simple-process,#dg-cap-strip,#dg-night-stage'))return;
    var t=e.textContent||'';
    if(t.length>4&&t.length<400&&t!==COPY.heroSub)e.textContent=COPY.heroSub;
  });
  // keep frege eyebrow honest on re-run
  var eye=q('#dg-eyebrow'); if(eye) eye.textContent=COPY.badge;
  qa('.badge-text,.hero-badge span:not(.badge-dot)').forEach(function(e){e.textContent=COPY.badge});
  // Hide noisy sample-role wall + empty-state apology; keep process + pricing
  qa('section').forEach(function(s){
    if(!s||s.id==='startup-modal'||s.id==='jobseeker-modal')return;
    if(s.matches&&s.matches('.hero-section,header,footer,.footer'))return;
    if(s.closest&&s.closest('#startup-modal,#jobseeker-modal,header,footer,.footer,.hero-section'))return;
    var head=((s.querySelector('h1,h2,h3')||{}).textContent||'')+' '+(s.getAttribute('aria-label')||'');
    var sniff=head+(s.textContent||'').slice(0,160);
    if(/LIVE ROLES|Example roles|example role/i.test(sniff) && s.querySelector('.roles-grid,.role-card')){
      s.style.setProperty('display','none','important');
      s.setAttribute('data-dg-hidden','roles-simplify');
    } else if (/THE PROCESS|HUMAN-MATCHED STARTUP|PRICING|ONE SIMPLE MODEL/i.test(sniff)) {
      s.style.setProperty('display','block','important');
      s.removeAttribute('data-dg-hidden');
    }
  });
  var emptyNote=q('#dg-roles-empty'); if(emptyNote) emptyNote.remove();
  // Three gates (Operator Calm process)
  qa('.step-card').forEach(function(card,i){
    var title=card.querySelector('.step-title,h3');
    var desc=card.querySelector('.step-desc,p');
    var num=card.querySelector('.step-num');
    var steps=[
      ['Define the role','Hiring teams share the must-haves, constraints, and one concrete first result.'],
      ['Compare, then review','Software compares role goals and constraints. A human confirms the interview path and decides what to propose.'],
      ['Both say yes','Each side reviews privately. We introduce only with mutual interest.']
    ];
    var st=steps[i]||steps[2];
    if(title) title.textContent=st[0];
    if(desc) desc.textContent=st[1];
    if(num) num.textContent=String(i+1).padStart(2,'0');
  });
  qa('.trust-header h2,.trust-section h2,section h2').forEach(function(h){
    var x=(h.textContent||'').trim();
    if(/HUMAN-MATCHED|THE PROCESS|How it works/i.test(x) && h.closest('.trust-section,section')) h.textContent='A match has three gates.';
    if(/ONE SIMPLE MODEL|PRICING|10%/i.test(x) && h.closest('section')) h.textContent='Pricing';
  });
  qa('.trust-header p,.trust-section .paragraph_large').forEach(function(p){
    if(p.closest('#startup-modal,#jobseeker-modal'))return;
    if(/spam|profile|Bay Area|theater|steps|form|tech|human/i.test(p.textContent||'')) p.textContent='Software compares the facts. A human decides what to propose. Mutual yes before intro.';
  });
  qa('.badge-text').forEach(function(b){
    var x=(b.textContent||'').trim();
    if(/^THE PROCESS$/i.test(x)||/^SIMPLE$/i.test(x)) b.textContent='PROCESS';
    if(/^PRICING$/i.test(x)||/^FEE$/i.test(x)) b.textContent='FEE';
    if(/^LIVE ROLES$/i.test(x)||/^SAMPLES$/i.test(x)) b.textContent='SAMPLES';
  });
  // Pricing honesty + simple bullets
  qa('.pricing-card').forEach(function(card){
    qa('div,li,p,span',card).forEach(function(el){
      if(el.children&&el.children.length>2)return;
      var tx=(el.textContent||'').trim();
      if(/^Access to pre-vetted/i.test(tx)||/pre-vetted SF/i.test(tx)) el.textContent='Human-reviewed SF Bay matches';
      if(/Dedicated talent partner/i.test(tx)) el.textContent='Software comparison · human review';
      if(/90-day replacement/i.test(tx)) el.textContent='Human-reviewed matching';
      if(/PLACEMENT FEE/i.test(tx)) el.textContent='OF FIRST-YEAR BASE SALARY';
    });
  });
  // remove old clutter injects (never kill #dg-faq-jsonld — FAQPage schema for /faq)
  ['#demigod-trust-block','#dg-faq','#dg-proof-strip','#dg-pipeline-note','#dg-contact-strip'].forEach(function(sel){
    var el=q(sel); if(el)el.remove();
  });
  // one calm trust line (not three chips)
  var host=q('.hero-actions')||q('.hero-section .w-container')||q('.hero-section')||q('.header');
  if(host&&!q('#dg-hero-chips')&&COPY.heroTrustLine){
    var chips=document.createElement('p');
    chips.id='dg-hero-chips';
    chips.className='dg-trust-line';
    chips.setAttribute('aria-label','What Demigod is');
    chips.textContent=COPY.heroTrustLine;
    if(host.classList&&host.classList.contains('hero-actions')) host.parentNode.insertBefore(chips,host);
    else host.appendChild(chips);
  }
  // only 3 learn-more links (was 8)
  if(host&&!q('#dg-path-pills')){
    var pills=document.createElement('nav');
    pills.id='dg-path-pills';
    pills.setAttribute('aria-label','Learn more');
    pills.innerHTML=
      '<a href="/how" data-dg-page="how">'+COPY.pathHow+'</a>'+
      '<a href="/sample" data-dg-page="sample">'+COPY.pathSample+'</a>'+
      '<a href="/startups" data-dg-page="map">'+COPY.pathStartups+'</a>';
    var anchor=q('#dg-hero-chips')||host;
    if(anchor.parentNode) anchor.parentNode.insertBefore(pills, anchor.nextSibling);
    else host.appendChild(pills);
  }
}

/* ==== SECTION: nav — logo only; dual path lives in hero (no top "I'm hiring") ==== */
function nav(){
  var real=q('nav.w-nav,.w-nav');
  if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop='';}
  // Hide header/nav primary CTAs — hero dual-path is the only top-of-funnel CTA surface
  qa('nav.w-nav a.button,.w-nav a.button,nav a.button,header a.button,nav a.premium-btn,header a.premium-btn,#dg-nav-hire,#dg-nav-talent,.nav_right a.button,.nav_right a.w-button').forEach(function(a){
    if(a.closest('.hero-actions,#dg-path-pills,#dg-bar,footer,.footer,.pricing-card')) return;
    var t=(a.textContent||'').replace(/\s+/g,' ').trim();
    if(/^(demigod)$/i.test(t)||/i.?m hiring|i.?m looking|hire talent|find talent|get started|post a job|find a job|join network|start$/i.test(t) || a.id==='dg-nav-hire' || a.id==='dg-nav-talent' || a.getAttribute('data-dg-cta')==='hire' || a.getAttribute('data-dg-cta')==='talent'){
      a.style.setProperty('display','none','important');
      a.setAttribute('aria-hidden','true');
      a.setAttribute('tabindex','-1');
    }
  });
  var navCtas=q('#dg-top-nav .dg-nav-ctas'); if(navCtas) navCtas.style.setProperty('display','none','important');
}
function trust(){/* v210: no visual wall — sr-only one-liner for a11y */ var old=q('#demigod-trust-block'); if(old)old.remove(); var f=q('footer,.footer'); if(!f||q('#demigod-trust-block'))return; var el=document.createElement('section'); el.id='demigod-trust-block'; el.setAttribute('aria-label','How it works'); el.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'; el.innerHTML='<p>Brief or preferences → human review → both sides approve → intro. 10% of first-year base salary when a hire starts.</p>'; if(f.parentNode)f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
function mob(){var b=q('#dg-bar');if(!b){b=document.createElement('nav');b.id='dg-bar';b.setAttribute('aria-label','Mobile actions');b.innerHTML='<a class="dg-h" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire"></a><a class="dg-j" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent"></a>';document.body.appendChild(b)}var h=b.querySelector('.dg-h,[data-dg-cta="hire"]'),t=b.querySelector('.dg-j,[data-dg-cta="talent"]');if(h){h.textContent=COPY.ctaFounder;h.setAttribute('href','/?wiz=startup');h.setAttribute('aria-label','Hire talent — open startup hiring brief')}if(t){t.textContent=COPY.ctaEngineer;t.setAttribute('href','/?wiz=engineer');t.setAttribute('aria-label',COPY.ctaEngineer+' — open private candidate form')}}
function foot(){
  var f=q('footer,.footer');
  if(!f)return;
  var panel=q('#dg-footer-panel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='dg-footer-panel';
    panel.innerHTML=
      '<div class="dg-footer-actions" role="group" aria-label="Get started">'+
        '<a href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire" aria-label="Hire talent — open startup hiring brief"><strong>Hire talent</strong><span>For startups</span></a>'+
        '<a href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent" aria-label="'+COPY.ctaEngineer+' — open private candidate form"><strong>'+COPY.ctaEngineer+'</strong><span>For candidates</span></a>'+
      '</div>'+
      '<nav id="dg-legal-links" aria-label="Footer navigation">'+
        '<div class="dg-footer-group" role="group" aria-labelledby="dg-footer-product">'+
          '<p class="dg-footer-heading" id="dg-footer-product">Product</p>'+
          '<a href="/how" data-dg-page="how">How it works</a>'+
          '<a href="/pricing" data-dg-page="pricing">Pricing</a>'+
          '<a href="/faq" data-dg-page="faq">FAQ</a>'+
        '</div>'+
        '<div class="dg-footer-group" role="group" aria-labelledby="dg-footer-explore">'+
          '<p class="dg-footer-heading" id="dg-footer-explore">Explore</p>'+
          '<a href="/about" data-dg-page="about">About</a>'+
          '<a href="/press" data-dg-page="press">Press kit</a>'+
          '<a href="/legal" data-dg-page="legal">Privacy &amp; terms</a>'+
          '<a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>'+
        '</div>'+
      '</nav>'+
      '<div class="dg-footer-bottom">'+
        '<p class="dg-footer-fee">Startups pay 10% of first-year base salary when a hire starts. Nothing upfront. Talent is always free.</p>'+
        '<p id="dg-copyright">© 2026 Demigod</p>'+
      '</div>';
    f.appendChild(panel);
    panel.addEventListener('click',function(e){var a=e.target.closest('[data-dg-page]');if(!a)return;e.preventDefault();openPage(a.getAttribute('data-dg-page'),true)});
  }
  [].slice.call(f.children).forEach(function(el){if(el===panel)return;el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true')});
}
function rmOrphanForms(){qa('form.w-form').forEach(function(f){if(f.closest('#startup-modal,#jobseeker-modal'))return;var n=(f.getAttribute('data-name')||f.name||'').toLowerCase();if(n==='email-form'||n==='test-form'||f.id==='email-form'){(f.closest('section,.w-form-wrap,div')||f).remove()}})}
var MODAL_BG=[];
function restoreModalBackground(){MODAL_BG.forEach(function(x){try{x.el.inert=x.inert;if(x.inertAttr===null)x.el.removeAttribute('inert');else x.el.setAttribute('inert',x.inertAttr);if(x.ariaHidden===null)x.el.removeAttribute('aria-hidden');else x.el.setAttribute('aria-hidden',x.ariaHidden)}catch(e){}});MODAL_BG=[]}
function isolateModalBackground(modal){restoreModalBackground();for(var child=modal;child&&child!==document.body;child=child.parentElement){var parent=child.parentElement;if(!parent)break;[].slice.call(parent.children).forEach(function(el){if(el===child||/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName))return;MODAL_BG.push({el:el,inert:!!el.inert,inertAttr:el.getAttribute('inert'),ariaHidden:el.getAttribute('aria-hidden')});try{el.inert=true}catch(e){el.setAttribute('inert','')}el.setAttribute('aria-hidden','true')})}}
function hide(f){restoreModalBackground();[S,J].forEach(function(id){if(!f&&OPEN===id)return;var m=q(id);if(m){m.style.setProperty('display','none','important');m.style.setProperty('visibility','hidden','important');m.setAttribute('aria-hidden','true');try{m.inert=true}catch(e){m.setAttribute('inert','')}}}); if(document.body){ var prev = document.body.dataset.prevOverflow || ''; var sy = parseInt(document.body.dataset.prevScrollY || '0', 10); document.body.style.overflow = prev; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; delete document.body.dataset.prevOverflow; delete document.body.dataset.prevScrollY; try { window.scrollTo(0, sy); } catch(e){} } if(document.documentElement){document.documentElement.style.overflow='';document.documentElement.style.scrollbarGutter=document.documentElement.dataset.prevScrollbarGutter||'';delete document.documentElement.dataset.prevScrollbarGutter;} try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){} try{detachTrap(true)}catch(e){} }
var busy=false,LAST_FOCUS=null,TRAP_H=null;
function focusables(root){if(!root)return[];return qa('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',root).filter(function(el){try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&!el.disabled&&!el.closest('[inert],[aria-hidden="true"]')&&(!el.getClientRects||el.getClientRects().length>0)}catch(e){return false}})}
/* v847: opener must be captured before isolateModalBackground (inert blurs activeElement → body). */
function attachTrap(m, opener){detachTrap(false);LAST_FOCUS=(opener&&opener.nodeType===1&&typeof opener.focus==='function')?opener:document.activeElement;TRAP_H=function(e){if(e.key!=='Tab'||!OPEN)return;var modal=q(OPEN);if(!modal)return;var list=focusables(modal);if(!list.length){e.preventDefault();return}var first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();try{last.focus()}catch(_){}}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();try{first.focus()}catch(_){}}else if(!modal.contains(document.activeElement)){e.preventDefault();try{first.focus()}catch(_){}}};document.addEventListener('keydown',TRAP_H,true)}
function detachTrap(restore){if(TRAP_H){document.removeEventListener('keydown',TRAP_H,true);TRAP_H=null}if(restore!==false&&LAST_FOCUS&&LAST_FOCUS.isConnected&&typeof LAST_FOCUS.focus==='function'){try{LAST_FOCUS.focus()}catch(e){}}LAST_FOCUS=null}
function wizCss(){if(q('#dg-wiz-css'))return;var s=document.createElement('style');s.id='dg-wiz-css';s.textContent=
/* v617 frege-typeform WIZ (closed modals stay closed) — single card, kill Webflow gold shell, quiet progress */
"#startup-modal,#jobseeker-modal{"
+"--wiz-void:#020c08;--wiz-night:#03140d;--wiz-deep:#06271a;--wiz-field:#041a10;"
+"--wiz-line:rgba(166,255,203,.22);--wiz-line-strong:rgba(166,255,203,.48);"
+"--wiz-phosphor:#a6ffcb;--wiz-signal:#10c674;--wiz-paper:#f3f0e7;--wiz-mute:#9aab9f;--wiz-danger:#ffb4a2;"
+"--wiz-serif:Georgia,'Iowan Old Style','Times New Roman',serif;"
+"--wiz-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;"
+"--wiz-sans:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
+"--wiz-radius:8px;--wiz-pad:clamp(1.35rem,4.2vw,2rem)"
+"}"
+"#startup-modal,#jobseeker-modal{"
+"background:radial-gradient(circle at 50% 35%,#073923 0%,#02140d 48%,#020c08 100%)!important;backdrop-filter:none!important;"
+"position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;box-sizing:border-box!important;margin:0!important;overflow-y:auto!important;scrollbar-color:rgba(166,255,203,.28) transparent;"
+"align-items:center;justify-content:center;"
+"padding:max(.75rem,env(safe-area-inset-top)) max(.75rem,env(safe-area-inset-right)) max(.75rem,env(safe-area-inset-bottom)) max(.75rem,env(safe-area-inset-left))!important"
+"}"
+"#startup-modal[aria-hidden=true],#jobseeker-modal[aria-hidden=true]{"
+"display:none!important;visibility:hidden!important;pointer-events:none!important"
+"}"
  +"#startup-modal[aria-hidden=false],#jobseeker-modal[aria-hidden=false]{"
  +"display:flex!important;visibility:visible!important;pointer-events:auto!important"
  +"}"
  +"#startup-modal #dg-referral-form-source{display:none!important;visibility:hidden!important}"
/* Webflow outer shell → transparent; form is THE card */
+"#startup-modal .modal-container,#jobseeker-modal .modal-container{"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0 auto!important;max-width:42rem!important;width:min(42rem,calc(100vw - 1.5rem))!important;"
+"border-radius:0!important"
+"}"
+"#startup-modal .modal-container > div:not(.w-form):not(.modal-close-btn),"
+"#jobseeker-modal .modal-container > div:not(.w-form):not(.modal-close-btn){"
+"background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important"
+"}"
/* hide Webflow title/subtitle/intro — WIZ owns copy */
+"#startup-modal .modal-title,#jobseeker-modal .modal-title,"
+"#startup-modal .modal-subtitle,#jobseeker-modal .modal-subtitle,"
+"#startup-modal .modal-intro,#jobseeker-modal .modal-intro,"
+"#startup-modal h2.modal-title,#jobseeker-modal h2.modal-title{"
+"display:none!important"
+"}"
/* outer w-form shell transparent */
+"#startup-modal div.w-form,#jobseeker-modal div.w-form,"
+"#startup-modal .w-form:not(form),#jobseeker-modal .w-form:not(form){"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0!important;max-width:none!important;width:100%!important"
+"}"
/* THE card = form (or .modal-content if present) */
+"#startup-modal .modal-content,#jobseeker-modal .modal-content,"
+"#startup-modal form.dg-wiz-on,#jobseeker-modal form.dg-wiz-on,"
+"#startup-modal form.w-form,#jobseeker-modal form.w-form,"
+"#startup-modal form,#jobseeker-modal form{"
+"position:relative;width:100%!important;max-width:40rem!important;min-height:min(38rem,calc(100dvh - 1.5rem));margin:0 auto!important;"
+"background:transparent!important;"
+"border:0!important;border-radius:0!important;"
+"color:#f3f0e7!important;"
+"box-shadow:none!important;"
+"padding:clamp(3.75rem,9vh,6rem) clamp(1.25rem,6vw,3.5rem) clamp(1.5rem,5vh,3rem)!important;box-sizing:border-box"
+"}"
+"#startup-modal .modal-content form,#jobseeker-modal .modal-content form,"
+"#startup-modal .modal-content .w-form,#jobseeker-modal .modal-content .w-form{"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0!important;max-width:none!important;width:100%!important;"
+"color:inherit!important"
+"}"
+"#startup-modal .modal-close-btn,#jobseeker-modal .modal-close-btn{"
+"position:absolute;top:.55rem;right:.55rem;z-index:8;"
+"min-width:44px;min-height:44px;border-radius:6px;"
+"border:1px solid rgba(166,255,203,.22)!important;background:transparent!important;"
+"color:#9aab9f!important;font-size:1.1rem;cursor:pointer;"
+"transition:color .15s ease,border-color .15s ease"
+"}"
+"#startup-modal .modal-close-btn:hover,#jobseeker-modal .modal-close-btn:hover{"
+"color:#a6ffcb!important;border-color:rgba(166,255,203,.48)!important"
+"}"
+"#startup-modal .dg-wiz-save,#jobseeker-modal .dg-wiz-save,"
+"#startup-modal .dg-wiz-save-opt,#jobseeker-modal .dg-wiz-save-opt{display:none!important}"
/* head — no gold card nest */
+"#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{"
+"position:static!important;z-index:5;background:transparent!important;"
+"padding:0!important;margin:0!important;border:0!important;border-radius:0!important;"
+"box-shadow:none!important;backdrop-filter:none!important;outline:none!important"
+"}"
+"#startup-modal .dg-wiz-head.is-welcome .dg-wiz-progress,"
+"#jobseeker-modal .dg-wiz-head.is-welcome .dg-wiz-progress,"
+"#startup-modal .dg-wiz-head.is-thanks .dg-wiz-progress,"
+"#jobseeker-modal .dg-wiz-head.is-thanks .dg-wiz-progress{display:none!important}"
+"#startup-modal .dg-wiz-progress,#jobseeker-modal .dg-wiz-progress{margin:0 0 .15rem;padding:0;border:0;background:transparent}"
+"#startup-modal .dg-wiz-count,#jobseeker-modal .dg-wiz-count{"
+"display:inline-flex!important;align-items:center;gap:.35rem;"
+"padding:0!important;border:0!important;background:transparent!important;"
+"min-height:auto!important;border-radius:0!important;box-shadow:none!important;"
+"color:#819689!important;font-family:var(--wiz-mono)!important;font-size:.7rem!important;font-weight:600!important;"
+"letter-spacing:.12em!important;text-transform:uppercase!important"
+"}"
+"#startup-modal .dg-wiz-count .dg-cur,#jobseeker-modal .dg-wiz-count .dg-cur{"
+"display:inline!important;place-items:normal!important;min-width:0!important;min-height:0!important;"
+"padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;"
+"color:#9aab9f!important;letter-spacing:.1em;text-transform:none;font-variant-numeric:tabular-nums;font-size:.72rem!important;font-weight:600!important"
+"}"
+"#startup-modal .dg-wiz-progress-label,#jobseeker-modal .dg-wiz-progress-label{display:none!important}"
+"#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{"
+"position:absolute!important;top:0;left:0;right:0;width:100%;height:3px!important;min-height:3px!important;max-height:3px!important;"
+"background:rgba(166,255,203,.1)!important;border:0!important;border-radius:1px!important;"
+"overflow:hidden!important;margin:0!important;padding:0!important;box-shadow:none!important"
+"}"
+"#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{"
+"display:block!important;height:100%!important;border-radius:inherit;"
+"background:linear-gradient(90deg,#08a05d,#a6ffcb)!important;"
+"box-shadow:0 0 8px rgba(16,198,116,.3)!important;"
+"transition:width .32s cubic-bezier(.2,.7,.2,1)"
+"}"
+"#startup-modal .dg-wiz-bar[aria-valuenow='100']>i,#jobseeker-modal .dg-wiz-bar[aria-valuenow='100']>i{"
+"background:linear-gradient(90deg,#08a05d,#a6ffcb)!important;box-shadow:0 0 8px rgba(16,198,116,.3)!important"
+"}"
+"#startup-modal .dg-wiz-bar>i::after,#jobseeker-modal .dg-wiz-bar>i::after{display:none!important}"
/* question + hint */
+"#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q{"
+"font-family:var(--wiz-serif)!important;"
+"font-size:clamp(1.75rem,6vw,2.35rem)!important;font-weight:400!important;"
+"color:#f3f0e7!important;margin:1rem 0 .6rem!important;max-width:24ch;"
+"line-height:1.1;letter-spacing:-.035em;border:0!important;background:transparent!important;padding:0!important"
+"}"
+"#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{"
+"font-family:var(--wiz-sans)!important;font-size:clamp(.95rem,2.8vw,1rem)!important;"
+"color:#9aab9f!important;margin:0 0 1.75rem!important;line-height:1.5;max-width:40ch;"
+"border:0!important;background:transparent!important;padding:0!important"
+"}"
+"#startup-modal .dg-wiz-hint a,#jobseeker-modal .dg-wiz-hint a{color:#a6ffcb;text-underline-offset:3px}"
+"#startup-modal .dg-wiz-hint a:focus-visible,#jobseeker-modal .dg-wiz-hint a:focus-visible{outline:2px solid #a6ffcb;outline-offset:3px}"
/* hide native labels when WIZ question owns the copy */
+"#startup-modal form.dg-wiz-on .dg-wiz-show > .w-form-label,"
+"#jobseeker-modal form.dg-wiz-on .dg-wiz-show > .w-form-label,"
+"#startup-modal form.dg-wiz-on .dg-field-wrap.dg-wiz-show > label.w-form-label,"
+"#jobseeker-modal form.dg-wiz-on .dg-field-wrap.dg-wiz-show > label.w-form-label,"
+"#startup-modal form.dg-wiz-on .form-field-group.dg-wiz-show > label,"
+"#jobseeker-modal form.dg-wiz-on .form-field-group.dg-wiz-show > label{"
+"position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;"
+"overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important"
+"}"
+"#startup-modal form.dg-wiz-on label.w-checkbox,"
+"#jobseeker-modal form.dg-wiz-on label.w-checkbox{position:relative!important;width:auto!important;height:auto!important;"
+"clip:auto!important;margin:0!important;overflow:visible!important;display:flex!important;align-items:center;gap:.55rem;"
+"color:#f3f0e7;font-size:.95rem;min-height:48px}"
/* inputs — literal colors beat Webflow vars */
+"#startup-modal input:not([type=checkbox]):not([type=radio]):not([type=file]),"
+"#startup-modal select,#startup-modal textarea,"
+"#jobseeker-modal input:not([type=checkbox]):not([type=radio]):not([type=file]),"
+"#jobseeker-modal select,#jobseeker-modal textarea{"
+"width:100%!important;box-sizing:border-box;"
+"font-size:16px!important;min-height:56px!important;line-height:1.4;"
+"font-family:var(--wiz-sans)!important;"
+"background:rgba(166,255,203,.035)!important;border:0!important;border-bottom:2px solid rgba(166,255,203,.3)!important;"
+"color:#f3f0e7!important;border-radius:6px 6px 0 0!important;"
+"padding:.9rem 1rem!important;"
+"transition:border-color .18s ease,box-shadow .22s ease!important"
+"}"
+"#startup-modal textarea,#jobseeker-modal textarea{min-height:104px!important;resize:vertical}"
+"#startup-modal input:not(.w-file-upload-input):focus-visible,#startup-modal select:focus-visible,#startup-modal textarea:focus-visible,"
+"#jobseeker-modal input:not(.w-file-upload-input):focus-visible,#jobseeker-modal select:focus-visible,#jobseeker-modal textarea:focus-visible{"
+"outline:none!important;border-bottom-color:#a6ffcb!important;"
+"box-shadow:0 3px 0 rgba(16,198,116,.14)!important"
+"}"
+"#startup-modal input::placeholder,#startup-modal textarea::placeholder,"
+"#jobseeker-modal input::placeholder,#jobseeker-modal textarea::placeholder{"
+"color:rgba(154,171,159,.5)!important"
+"}"
+"#startup-modal input[type=checkbox],#startup-modal input[type=radio],"
+"#jobseeker-modal input[type=checkbox],#jobseeker-modal input[type=radio]{accent-color:#10c674;width:1.1rem;height:1.1rem}"
+"#startup-modal input[type=file]:not(.w-file-upload-input),#jobseeker-modal input[type=file]:not(.w-file-upload-input){"
+"color:#9aab9f!important;font-size:.9rem;padding:.35rem 0!important;border:0!important;background:transparent!important;min-height:48px"
+"}"
+"#startup-modal input[type=file]:not(.w-file-upload-input)::file-selector-button,#jobseeker-modal input[type=file]:not(.w-file-upload-input)::file-selector-button{"
+"min-height:44px;margin-right:.75rem;padding:.55rem .85rem;border:1px solid rgba(166,255,203,.35);border-radius:6px;"
+"background:rgba(166,255,203,.08);color:#f3f0e7;font:600 .85rem var(--wiz-sans);cursor:pointer"
+"}"
+"#jobseeker-modal .w-file-upload-label{"
+"display:flex!important;align-items:center;justify-content:center;gap:.55rem;width:100%!important;min-height:52px;box-sizing:border-box;"
+"padding:.75rem 1rem!important;border:1px solid rgba(166,255,203,.48)!important;border-radius:6px!important;"
+"background:rgba(166,255,203,.08)!important;color:#f3f0e7!important;font:600 .9rem var(--wiz-sans)!important;cursor:pointer"
+"}"
+"#jobseeker-modal .w-file-upload-label:hover{border-color:#a6ffcb!important;background:rgba(166,255,203,.12)!important}"
+"#jobseeker-modal .w-file-upload-label:focus-visible{outline:2px solid #a6ffcb!important;outline-offset:3px!important}"
+"#jobseeker-modal .w-file-upload-info{color:#9aab9f!important;font:.8rem/1.4 var(--wiz-sans)!important;margin:.45rem 0 0!important}"
+"#startup-modal .dg-file-honest,#jobseeker-modal .dg-file-honest,"
+"#startup-modal .dg-resume-hint,#jobseeker-modal .dg-resume-hint{color:#9aab9f!important;font-size:.8rem!important}"
+"#startup-modal .dg-wiz-err,#jobseeker-modal .dg-wiz-err,"
+"#startup-modal .dg-wiz-req-err,#jobseeker-modal .dg-wiz-req-err{"
+"color:#ffb4a2!important;font-size:.84rem;margin:.4rem 0 .55rem;font-family:var(--wiz-sans);line-height:1.35"
+"}"
/* nav */
+"#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{"
+"display:flex!important;gap:.6rem;margin-top:1.5rem;align-items:stretch;border:0!important;background:transparent!important;padding:0!important"
+"}"
+"#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,"
+"#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{"
+"min-height:52px!important;padding:12px 18px!important;touch-action:manipulation;"
+"border-radius:6px!important;font-family:var(--wiz-mono)!important;font-weight:600!important;"
+"font-size:1rem!important;letter-spacing:.06em;cursor:pointer;"
+"transition:transform .18s ease,box-shadow .22s ease,border-color .18s ease,background .18s ease!important"
+"}"
+"#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{"
+"flex:1;background:#a6ffcb!important;color:#02140d!important;"
+"border:1px solid #a6ffcb!important;box-shadow:0 10px 30px rgba(16,198,116,.16)!important"
+"}"
+"#startup-modal .dg-wiz-next:hover,#jobseeker-modal .dg-wiz-next:hover{"
+"transform:translateY(-1px);box-shadow:0 12px 32px rgba(16,198,116,.22)!important;"
+"border-color:#a6ffcb!important"
+"}"
+"#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-back,"
+"#startup-modal .dg-wiz-nav .dg-wiz-back,#jobseeker-modal .dg-wiz-nav .dg-wiz-back,"
+"#startup-modal button.dg-wiz-back,#jobseeker-modal button.dg-wiz-back{"
+"flex:0 0 auto;min-width:0!important;background:transparent!important;color:#9aab9f!important;"
+"border:1px solid transparent!important;border-color:transparent!important;"
+"outline-color:#a6ffcb!important"
+"}"
+"#startup-modal .dg-wiz-back:hover,#jobseeker-modal .dg-wiz-back:hover{"
+"border-color:rgba(166,255,203,.48)!important"
+"}"
+"#startup-modal .dg-wiz-next:focus,#startup-modal .dg-wiz-back:focus,"
+"#jobseeker-modal .dg-wiz-next:focus,#jobseeker-modal .dg-wiz-back:focus,"
+"#startup-modal .dg-wiz-next:focus-visible,#startup-modal .dg-wiz-back:focus-visible,"
+"#jobseeker-modal .dg-wiz-next:focus-visible,#jobseeker-modal .dg-wiz-back:focus-visible{"
+"outline:2px solid #a6ffcb!important;outline-offset:3px!important"
+"}"
/* trust notes only on review */
+"#startup-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-fee-note,"
+"#jobseeker-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-fee-note,"
+"#startup-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) .dg-submit-trust,"
+"#jobseeker-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) .dg-submit-trust{"
+"display:none!important"
+"}"
/* review */
+"#startup-modal .dg-wiz-review:empty,#jobseeker-modal .dg-wiz-review:empty{display:none}"
+"#startup-modal .dg-wiz-review,#jobseeker-modal .dg-wiz-review{"
+"border:1px solid rgba(166,255,203,.22)!important;border-radius:6px;padding:.9rem 1rem;"
+"margin:.35rem 0 .75rem;background:rgba(2,12,8,.55)!important;max-height:36vh;overflow:auto"
+"}"
+"#startup-modal .dg-wiz-review h3,#jobseeker-modal .dg-wiz-review h3{"
+"color:#a6ffcb!important;font-size:.68rem;margin:0 0 .55rem;letter-spacing:.14em;"
+"text-transform:uppercase;font-family:var(--wiz-mono);font-weight:600"
+"}"
+"#startup-modal .dg-wiz-review dt,#jobseeker-modal .dg-wiz-review dt,"
+"#startup-modal .dg-wiz-review span,#jobseeker-modal .dg-wiz-review span{"
+"display:block;color:#9aab9f!important;font-size:.68rem;margin-top:.55rem;font-family:var(--wiz-mono);letter-spacing:.04em"
+"}"
+"#startup-modal .dg-wiz-review dd,#jobseeker-modal .dg-wiz-review dd,"
+"#startup-modal .dg-wiz-review em,#jobseeker-modal .dg-wiz-review em{"
+"display:block;font-style:normal;color:#f3f0e7!important;font-size:.95rem;margin:0 0 .1rem;line-height:1.4;font-family:var(--wiz-sans)"
+"}"
+"#startup-modal .dg-wiz-edit,#jobseeker-modal .dg-wiz-edit{"
+"min-height:44px;margin:.25rem 0 .2rem;padding:.35rem .7rem;border:1px solid rgba(166,255,203,.35);border-radius:4px;"
+"background:transparent;color:#a6ffcb;font:600 .72rem var(--wiz-mono);cursor:pointer"
+"}"
+"#startup-modal .dg-wiz-edit:hover,#jobseeker-modal .dg-wiz-edit:hover{border-color:#a6ffcb;background:rgba(166,255,203,.08)}"
+"#startup-modal .dg-wiz-edit:focus-visible,#jobseeker-modal .dg-wiz-edit:focus-visible{outline:2px solid #a6ffcb;outline-offset:3px}"
+"#startup-modal .dg-wiz-review-signal,#jobseeker-modal .dg-wiz-review-signal{"
+"border-left:2px solid #10c674!important;padding-left:.55rem;margin-left:0"
+"}"
/* thanks */
+"#startup-modal .dg-thanks h3,#jobseeker-modal .dg-thanks h3{"
+"font-family:var(--wiz-serif);font-size:1.45rem;font-weight:400;color:#f3f0e7;margin:.2rem 0 .5rem"
+"}"
+"#startup-modal .dg-thanks p,#jobseeker-modal .dg-thanks p{color:#9aab9f;line-height:1.45}"
+"#startup-modal .dg-thanks-step,#jobseeker-modal .dg-thanks-step{color:#f3f0e7;font-size:.9rem}"
+"#startup-modal .dg-followup,#jobseeker-modal .dg-followup{display:none!important}"
+"#startup-modal #dg-fee-note,#jobseeker-modal #dg-fee-note,"
+"#startup-modal .dg-submit-trust,#jobseeker-modal .dg-submit-trust{"
+"color:#9aab9f!important;font-size:.8rem!important;line-height:1.4;margin:.75rem 0 0!important"
+"}"
/* motion */
+"#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show,"
+"#startup-modal .dg-wiz-q.dg-wiz-tick,#jobseeker-modal .dg-wiz-q.dg-wiz-tick,"
+"#startup-modal .dg-wiz-hint.dg-wiz-tick,#jobseeker-modal .dg-wiz-hint.dg-wiz-tick{"
+"animation:dgWizIn .26s cubic-bezier(.2,.7,.2,1) both"
+"}"
+"@keyframes dgWizIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}"
+"@media(max-width:767px){"
+"#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{flex-direction:column!important}"
+"#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,"
+"#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{width:100%!important;min-width:0!important}"
+"#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-back{width:auto!important;align-self:flex-start;padding-left:0!important;padding-right:0!important}"
+"}"
+"@media(max-width:360px) and (max-height:700px){"
+"#startup-modal form.dg-wiz-on,#jobseeker-modal form.dg-wiz-on{padding-top:3rem!important;padding-bottom:1rem!important}"
+"#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{margin-bottom:1rem!important}"
+"#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{margin-top:1rem!important}"
+"}"
+"@media(prefers-reduced-motion:reduce){"
+"#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{transition:none}"
+"#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show,"
+"#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q,"
+"#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint,"
+"#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{"
+"animation:none!important;transition:none!important;transform:none!important"
+"}"
+"}"
+"@media(forced-colors:active){"
+"#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{border:1px solid CanvasText!important;forced-color-adjust:auto}"
+"#startup-modal .dg-wiz-count,#jobseeker-modal .dg-wiz-count,"
+"#startup-modal .dg-wiz-count .dg-cur,#jobseeker-modal .dg-wiz-count .dg-cur{color:CanvasText!important;background:Canvas!important}"
+"#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{border:1px solid CanvasText!important;background:Canvas!important}"
+"#startup-modal .dg-wiz-bar>i,#jobseeker-modal .dg-wiz-bar>i{background:Highlight!important;box-shadow:none!important}"
+"#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,"
+"#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{forced-color-adjust:auto;border:1px solid ButtonText!important;color:ButtonText!important;background:ButtonFace!important}"

+"#startup-modal :focus-visible,#jobseeker-modal :focus-visible{outline:3px solid Highlight!important;outline-offset:3px!important}"
+"}"
+"#startup-modal .dg-wiz-choices,#jobseeker-modal .dg-wiz-choices{display:grid!important;gap:.55rem;margin:.45rem 0 .35rem;width:100%}"+"#startup-modal .dg-wiz-choice,#jobseeker-modal .dg-wiz-choice{display:flex!important;align-items:flex-start;gap:.7rem;width:100%;min-height:48px;padding:.75rem .9rem;text-align:left;cursor:pointer;border:1px solid var(--wiz-line)!important;border-radius:var(--wiz-radius);background:rgba(4,26,16,.85)!important;color:var(--wiz-paper)!important;font:600 .95rem/1.35 var(--wiz-sans)!important;transition:border-color .15s,background .15s}"+"#startup-modal .dg-wiz-choice:hover,#startup-modal .dg-wiz-choice:focus-visible,#jobseeker-modal .dg-wiz-choice:hover,#jobseeker-modal .dg-wiz-choice:focus-visible{border-color:var(--wiz-line-strong)!important;background:rgba(16,198,116,.12)!important;outline:2px solid var(--wiz-phosphor);outline-offset:2px}"+"#startup-modal .dg-wiz-choice.is-on,#jobseeker-modal .dg-wiz-choice.is-on{border-color:var(--wiz-signal)!important;background:rgba(16,198,116,.18)!important;box-shadow:0 0 0 1px rgba(16,198,116,.4) inset}"+"#startup-modal .dg-wiz-choice-k,#jobseeker-modal .dg-wiz-choice-k{flex:0 0 auto;min-width:1.45rem;height:1.45rem;border-radius:4px;border:1px solid var(--wiz-line);display:inline-flex!important;align-items:center;justify-content:center;font:600 .72rem/1 var(--wiz-mono);color:var(--wiz-phosphor)}"+"#startup-modal .dg-wiz-choice.is-on .dg-wiz-choice-k,#jobseeker-modal .dg-wiz-choice.is-on .dg-wiz-choice-k{border-color:var(--wiz-signal);color:var(--wiz-signal)}"+"#startup-modal .dg-wiz-choice-t,#jobseeker-modal .dg-wiz-choice-t{flex:1 1 auto}"+"#startup-modal select.dg-wiz-select-native,#jobseeker-modal select.dg-wiz-select-native{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;display:block!important;pointer-events:none!important}"+"#startup-modal .dg-wiz-count,#jobseeker-modal .dg-wiz-count{font:600 .78rem/1.2 var(--wiz-mono);letter-spacing:.04em;color:var(--wiz-mute)}"
;document.head.appendChild(s)}

function fileUploadHonest(){
  qa('#startup-modal input[type=file],#jobseeker-modal input[type=file],form input[type=file]').forEach(function(fi){
    if(fi.dataset.dgFileHonest)return;fi.dataset.dgFileHonest='1';
    var wrap=fi.closest('.dg-field-wrap,.w-file-upload,div')||fi.parentElement;
    var form=fi.closest('form');
    var isResume=/resume/i.test(fi.name||fi.id||'');
    var honestMsg=isResume
      ?'PDF/DOCX upload or a shareable https link. Uploaded files are not restored if you refresh mid-form.'
      :'Upload a file or paste a Drive/Dropbox link.';
    if(wrap&&!wrap.querySelector('.dg-file-honest')){
      var hint=document.createElement('p');
      hint.className='dg-file-honest';
      hint.style.cssText='color:#A8A29E;font-size:.8rem;margin:.35rem 0;line-height:1.4';
      hint.textContent=honestMsg;
      wrap.appendChild(hint);
    }
    var link=form&&form.querySelector('[name="'+(fi.name||'file')+'-url"],[name=resume-url]');
    if(!link){
      link=document.createElement('input');
      link.type='url';link.className='w-input';
      link.name=(fi.name||'file')+'-url';
      link.autocomplete='url';
      link.placeholder='https://… link to file';
      if(wrap)wrap.appendChild(link);
    }
    if(form&&!form.dataset.dgFileVal){
      form.dataset.dgFileVal='1';
      form.addEventListener('submit',function(){
        try{
          var files=[].slice.call(form.querySelectorAll('input[type=file]'));
          var urls=[].slice.call(form.querySelectorAll('input[type=url][name$="-url"]'));
          var hasFile=files.some(function(x){return x.files&&x.files.length});
          var hasUrl=urls.some(function(x){return (x.value||'').trim().length>8});
          if(!hasFile&&!hasUrl){/* WIZ steps enforce file-or-URL before review */}
        }catch(e){}
      });
    }
  });
}

/* === BRAND ASSETS — hero bg + path-pill chrome (dedupe by #dg-brand-assets) === */
/* ==== SECTION: CTA (I'm hiring / Find a job — not two company CTAs) ==== */
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
      var span = a.querySelector('.btn-label,.button_label,.dg-cta-label');
      if (!span) {
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
        if (!a.querySelector('.dg-cta-hint')) {
          span = document.createElement('span');
          span.className = 'dg-cta-label';
          a.appendChild(span);
        } else {
          span = document.createElement('span');
          span.className = 'dg-cta-label';
          a.insertBefore(span, a.firstChild);
        }
      } else {
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
      }
      if (hire && /demigod/i.test(label)) {
        span.classList.add('dg-cta-cyber');
        paintCyberWord(span, label);
      } else {
        span.classList.remove('dg-cta-cyber', 'dg-cyber-host');
        span.textContent = label;
      }
    } catch (e) { try { a.textContent = label; } catch (_) {} }
    a.setAttribute('href', hire ? '/?wiz=startup' : '/?wiz=engineer');
    a.setAttribute('data-demigod-modal', hire ? 'startup' : 'jobseeker');
    a.setAttribute('data-dg-cta', hire ? 'hire' : 'talent');
    a.setAttribute('aria-label', hire ? 'Hire talent — open startup hiring brief' : COPY.ctaEngineer+' — open private candidate form');
    a.classList.toggle('is-talent', hire);
    a.classList.toggle('is-job', !hire);
  }
  qa('a.premium-btn.is-talent,a.is-talent.premium-btn,a.is-talent').forEach(function(a){
    if(a.closest('#dg-bar,nav,header,.hero-actions')) return;
    if(a.getAttribute('data-dg-cta')==='talent'||a.classList.contains('is-job')) return;
    wireCta(a, 'startup');
  });
  qa('a.premium-btn.is-job,a.is-job.premium-btn,a.is-job').forEach(function(a){
    if(a.closest('.hero-actions')) return; // dual owns hero pair
    if(a.closest('nav,header')&&!a.closest('#dg-bar')) return;
    wireCta(a, 'engineer');
  });
  qa('a,button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal,#dg-faq,.hero-actions')) return;
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
    if (a.closest('#startup-modal,#jobseeker-modal,.hero-actions')) return;
    wireCta(a, 'startup');
  });
  // dual path LAST — hard rebuild so no later wireCta can collapse looking→hire
  (function ensureHeroDual(){
    var host = q('.hero-actions');
    if (!host) {
      var left = q('.hero-content-left') || q('.hero-container') || q('.hero-section');
      if (!left) return;
      host = document.createElement('div');
      host.className = 'hero-actions dg-path-pair';
      host.id = 'dg-hero-actions';
      left.appendChild(host);
    }
    host.classList.add('dg-path-pair');
    host.id = host.id || 'dg-hero-actions';
    host.style.removeProperty('display'); // let the mobile media rule choose #dg-bar instead
    // always rebuild — cheap, prevents thrash/overwrite races
    host.innerHTML = '';
    function mk(kind){
      var a = document.createElement('a');
      a.className = 'premium-btn w-button ' + (kind==='hire' ? 'is-talent' : 'is-job');
      a.setAttribute('data-dg-cta', kind);
      a.setAttribute('data-demigod-modal', kind==='hire' ? 'startup' : 'jobseeker');
      a.setAttribute('href', kind==='hire' ? '/?wiz=startup' : '/?wiz=engineer');
      a.setAttribute('aria-label', kind==='hire' ? 'Hire talent — open startup hiring brief' : COPY.ctaEngineer+' — open private candidate form');
      a.dataset.dgHinted = '1';
      a.innerHTML =
        '<span class="dg-cta-label"></span>' +
        '<span class="dg-cta-hint">' +
        (kind === 'hire' ? COPY.ctaHireHint : COPY.ctaTalentHint) +
        '</span>';
      var lab = a.querySelector('.dg-cta-label');
      if (lab) lab.textContent = kind === 'hire' ? COPY.ctaFounder : COPY.ctaEngineer;
      a.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important';
      var w = document.createElement('div');
      w.className = 'dg-cta-wrap dg-in';
      w.style.cssText = 'display:block!important;opacity:1!important';
      w.appendChild(a);
      host.appendChild(w);
    }
    mk('hire');
    mk('talent');
    host.dataset.dgDual = '1';
    /* v849: one short trust line under dual CTAs (desktop hero only) */
    if (!host.parentNode.querySelector('#dg-cta-trust')) {
      var trustLine = document.createElement('p');
      trustLine.id = 'dg-cta-trust';
      trustLine.className = 'dg-cta-trust';
      trustLine.textContent = '10% of first-year base salary when a hire starts · both sides approve · no spam lists';
      trustLine.style.cssText = 'margin:.55rem 0 0;color:#9aab9f;font-size:.78rem;line-height:1.35;letter-spacing:.02em';
      host.insertAdjacentElement('afterend', trustLine);
    }
  })();
}
/* dual-path: equal cards with hint inside — no broken flex wraps */

function fixFooterCtas(){
  /* Live Webflow footer still ships mailto CTAs; JS path must open wizards, not mail.app. Noscript keeps email. */
  qa('footer a[href*="mailto"], .footer a[href*="mailto"], a[href*="mailto"][href*="Hiring"], a[href*="mailto"][href*="Joining"]').forEach(function(a){
    try{
      var href=String(a.getAttribute('href')||'');
      var t=String(a.textContent||'').replace(/\s+/g,' ').trim();
      var blob=(href+' '+t).toLowerCase();
      var hire=/hiring with demigod|hire talent|subject=hiring|i.?m hiring/.test(blob);
      var talent=/joining the demigod|talent network|subject=joining|sharing what i|i.?m looking|join network/.test(blob);
      if(!hire&&!talent) return;
      if(hire){
        a.setAttribute('href','/?wiz=startup');
        a.setAttribute('data-demigod-modal','startup');
        a.setAttribute('data-dg-cta','hire');
        a.setAttribute('aria-label','Hire talent — open startup hiring brief');
        if(/by email/i.test(t)||/^hire talent/i.test(t)) a.textContent='Hire talent';
      } else {
        a.setAttribute('href','/?wiz=engineer');
        a.setAttribute('data-demigod-modal','jobseeker');
        a.setAttribute('data-dg-cta','talent');
        a.setAttribute('aria-label',COPY.ctaEngineer+' — open private candidate form');
        if(/by email/i.test(t)||/join the talent/i.test(t)) a.textContent=COPY.ctaEngineer;
      }
      a.removeAttribute('target');
    }catch(e){}
  });
}

function ctaHints(){
  var host=q('.hero-actions');
  if(!host)return;
  host.classList.add('dg-path-pair');
  if(host.dataset.dgDual==='1'){
    var nudge0=q('#dg-path-nudge'); if(nudge0) nudge0.remove();
    return;
  }
}


/* Night institutional hero art + scroll motion (Frege-inspired) */
/* Art: permanent jsDelivr frege hero/aperture (re-encoded ~q80 for mobile LCP). Grain pure CSS. */
function injectNightHero(){
  var hero=q('.hero-section')||q('.header')||q('main')||document.body;
  if(!hero||q('#dg-night-stage'))return;
  var stage=document.createElement('div');
  stage.id='dg-night-stage';
  stage.setAttribute('aria-hidden','true');
  stage.innerHTML=
    '<div class="dg-grain"></div>'+
    '<div class="dg-stars"></div>'+
    '<div class="dg-art-panel">'+
      '<picture class="dg-art-picture"><source media="(min-width:901px)" srcset="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@b22473c0bd8f/art/frege-hero.jpg"/>'+
      '<img class="dg-art-img" alt="Demigod — SF night district signal art" width="1280" height="720" decoding="async" fetchpriority="high"/></picture>'+
      '<div class="dg-art-caption">SF BAY · ONE FIT · MUTUAL YES</div>'+
    '</div>';
  // put stage inside hero as first decorative layer
  if(hero.firstChild) hero.insertBefore(stage, hero.firstChild);
  else hero.appendChild(stage);
  try{qa('#dg-cap-strip').forEach(function(el){el.remove();});}catch(e){}
  // eyebrow inject
  if(!q('#dg-eyebrow')){
    var left=q('.hero-content-left')||q('.hero-container')||q('.hero-section');
    if(left){
      var eye=document.createElement('p');
      eye.id='dg-eyebrow';
      eye.className='dg-eyebrow dg-reveal';
      eye.textContent=COPY.badge;
      var h1=left.querySelector('h1,.hero-title');
      if(h1) left.insertBefore(eye,h1);
      else left.prepend(eye);
    }
  }
  // dg-cap-strip removed (v619) — Interface/Control/Intro section deleted
}
function ensureMotion(){
  if(document.documentElement.dataset.dgMotion==='1')return;
  document.documentElement.dataset.dgMotion='1';
  // pure CSS motion primarily; IO for reveal class (marker is data attr, not empty script)
  try{
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(reduce){document.documentElement.classList.add('dg-reduce');return;}
    document.documentElement.classList.add('dg-motion');
    var io=new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting){en.target.classList.add('dg-in');io.unobserve(en.target);}
      });
    },{threshold:0.08,rootMargin:'0px 0px -4% 0px'});
    qa('.dg-reveal,.step-card,.pricing-card,.hero-actions .dg-cta-wrap,#dg-eyebrow,h1.hero-title,.hero-section h1').forEach(function(el){
      el.classList.add('dg-reveal');
      io.observe(el);
    });
    // Let the hidden start state paint once; CTA chrome remains gated on honest labels.
    requestAnimationFrame(function(){qa('.hero-section h1,.hero-actions .dg-cta-wrap,#dg-eyebrow').forEach(function(el){el.classList.add('dg-in');});});
    // staggered delay
    qa('.hero-actions .dg-cta-wrap').forEach(function(el,i){el.style.setProperty('--d',(260+i*180)+'ms');});
    qa('.step-card').forEach(function(el,i){el.style.setProperty('--d',(i*110)+'ms');});
  }catch(e){
    try{document.documentElement.classList.add('dg-motion');qa('.dg-reveal').forEach(function(el){el.classList.add('dg-in');});}catch(_){}
  }
}

/* v632: Mutual Signal orb + Fable wordmark (DEMIGOD mono next to mark) */
function ensureLogo(){
  try{
    var mark='<svg class="dg-mark" data-v="632" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8" fill="#03140d"/><circle cx="16" cy="16" r="11" fill="none" stroke="#a6ffcb" stroke-width="1.25" opacity="0.55"/><path d="M10.5 16a5.5 5.5 0 0 1 5.5-5.5" fill="none" stroke="#a6ffcb" stroke-width="2.25" stroke-linecap="round"/><path d="M21.5 16a5.5 5.5 0 0 1-5.5 5.5" fill="none" stroke="#10c674" stroke-width="2.25" stroke-linecap="round"/><circle cx="16" cy="16" r="2.35" fill="#a6ffcb"/></svg>';
    qa('a.nav_logo,.nav_logo,a.w-nav-brand,a.logo-link,.logo-link,.w-nav-brand').forEach(function(a){
      if(!a)return;
      a.setAttribute('aria-label','Demigod home');
      /* mark once; wordmark always (early-return was leaving empty DEMIGOD) */
      if(!a.querySelector('svg.dg-mark[data-v="632"]')){
        a.dataset.dgMark='632';
        var icon=a.querySelector('.nav_logo-icon');
        if(icon){
          icon.innerHTML=mark;
          icon.style.cssText='width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0';
        }else{
          var wrap=a.querySelector('svg');
          if(wrap){
            if(wrap.parentElement&&wrap.parentElement!==a)wrap.parentElement.innerHTML=mark;
            else wrap.outerHTML=mark;
          }else{
            a.insertAdjacentHTML('afterbegin','<span class="nav_logo-icon" style="width:28px;height:28px;display:inline-flex">'+mark+'</span>');
          }
        }
      }else{a.dataset.dgMark='632';}
      var name=a.querySelector('[data-brand-name]');
      if(!name){
        name=a.querySelector('.paragraph_large');
        if(!name){
          name=document.createElement('span');
          name.setAttribute('data-brand-name','true');
          a.appendChild(name);
        }
      }
      name.setAttribute('data-brand-name','true');
      name.textContent='Demigod';
      name.classList.add('dg-brand-name');
    });
    if(document.documentElement.dataset.dgFav!=='632'){
      document.documentElement.dataset.dgFav='632';
      try{
        var href='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%2303140d%22/%3E%3Ccircle%20cx%3D%2216%22%20cy%3D%2216%22%20r%3D%2211%22%20fill%3D%22none%22%20stroke%3D%22%23a6ffcb%22%20stroke-width%3D%221.25%22%20opacity%3D%220.55%22/%3E%3Cpath%20d%3D%22M10.5%2016a5.5%205.5%200%200%201%205.5-5.5%22%20fill%3D%22none%22%20stroke%3D%22%23a6ffcb%22%20stroke-width%3D%222.25%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M21.5%2016a5.5%205.5%200%200%201-5.5%205.5%22%20fill%3D%22none%22%20stroke%3D%22%2310c674%22%20stroke-width%3D%222.25%22%20stroke-linecap%3D%22round%22/%3E%3Ccircle%20cx%3D%2216%22%20cy%3D%2216%22%20r%3D%222.35%22%20fill%3D%22%23a6ffcb%22/%3E%3C/svg%3E';
        qa('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.parentNode&&l.parentNode.removeChild(l);});
        var link=document.createElement('link');link.rel='icon';link.type='image/svg+xml';link.href=href;document.head.appendChild(link);
        var apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=href;document.head.appendChild(apple);
      }catch(eFav){}
    }
  }catch(e){}
}
function brandAssets(){if(q('#dg-brand-assets'))return;var s=document.createElement('style');s.id='dg-brand-assets';s.textContent=
/* v618 Frege-night — large translucent art stage + left scrim; dual-path CTAs primary */
":root{--dg-deep:#06271a;--dg-field:#075f3a;--dg-green:#08a05d;--dg-ink:#071d13;--dg-rule-paper:rgba(3,20,13,.2);--dg-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--dg-serif:Georgia,'Iowan Old Style','Times New Roman',serif}"
/* static CSS grain — no remote litter fuse, no infinite composite thrash (Fable #3) */
+"body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9997;opacity:.055;background-image:radial-gradient(rgba(166,255,203,.11) .6px,transparent .6px),radial-gradient(rgba(243,240,231,.05) .5px,transparent .5px);background-size:3px 3px,5px 5px;background-position:0 0,1px 2px;mix-blend-mode:screen}"
+"@keyframes dgGrain{0%,100%{transform:translate(0,0)}25%{transform:translate(-1%,1%)}50%{transform:translate(1%,-1%)}75%{transform:translate(-1%,-1%)}}"
+"@keyframes dgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}"
+"@keyframes dgPulse{0%,100%{opacity:.55;filter:drop-shadow(0 0 0 transparent)}50%{opacity:1;filter:drop-shadow(0 0 10px rgba(166,255,203,.55))}}"
+"@keyframes dgStar{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}"
+"@keyframes dgFadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}"
+"@keyframes dgShimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}"
+"@keyframes dgBorderGlow{0%,100%{box-shadow:0 0 0 0 rgba(166,255,203,0)}50%{box-shadow:0 0 24px 0 rgba(16,198,116,.25)}}"
+"@keyframes dgCtaPhosphor{0%{text-shadow:0 0 0 rgba(166,255,203,0)}45%{text-shadow:0 0 9px rgba(166,255,203,.9),0 0 24px rgba(16,198,116,.5)}100%{text-shadow:0 0 3px rgba(166,255,203,.22)}}"
/* Codex hero: Unbounded + long calm phosphor (no vertical jump / glitch) */
+"@keyframes dgCyberIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}"
+"@keyframes dgCyberBreathe{0%,100%{text-shadow:0 0 8px rgba(166,255,203,.35),0 0 18px rgba(16,198,116,.18)}50%{text-shadow:0 0 11px rgba(166,255,203,.45),0 0 24px rgba(16,198,116,.24)}}"
+"@keyframes dgCyberPulseSoft{0%,100%{opacity:1}50%{opacity:.96}}"
+"@keyframes dgCyberScan{0%,72%{transform:scaleX(0);opacity:0}78%{opacity:.48}88%{transform:scaleX(1);opacity:.22}94%,100%{transform:scaleX(1);opacity:0}}"
+".dg-cyber-host,.dg-cyber-word{font-family:var(--dg-cyber)!important;font-weight:600!important;letter-spacing:.085em!important;text-transform:uppercase!important;color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;text-shadow:0 0 10px rgba(166,255,203,.4),0 0 22px rgba(16,198,116,.2)!important}"
/* dynamic reveal + paper-span rules */
+".hero-section h1.dg-hero-hold.dg-reveal,.header h1.dg-hero-hold.dg-reveal,.hero-section h1.dg-cyber-host.dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+".hero-section h1.dg-cyber-host .dg-cyber-ch,.header h1.dg-cyber-host .dg-cyber-ch,.hero-section h1.dg-cyber-host span{color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;background:none!important}"
+".dg-cyber-word{display:inline-flex!important;flex-wrap:nowrap!important;gap:0.02em!important;position:relative!important;align-items:baseline!important}"
+".dg-hero-hold .dg-cyber-word::after{content:'';position:absolute;left:0;right:.085em;bottom:-.16em;height:1px;background:linear-gradient(90deg,transparent,var(--dg-phosphor) 20%,var(--dg-signal) 80%,transparent);transform-origin:left;animation:dgCyberScan 16s cubic-bezier(.22,1,.36,1) .6s infinite;box-shadow:0 0 7px rgba(166,255,203,.28)}"
+".dg-cyber-ch{display:inline-block!important;opacity:0;animation:dgCyberIn 1.2s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*110ms) both,dgCyberBreathe 12s ease-in-out calc(1.2s + var(--i,0)*110ms) infinite}"
/* one letter soft pulse only — sparse over long hold */
+".dg-cyber-ch:nth-child(4){animation:dgCyberIn 1.2s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*110ms) both,dgCyberBreathe 12s ease-in-out calc(1.2s + var(--i,0)*110ms) infinite,dgCyberPulseSoft 19s ease-in-out 2.5s infinite}"
+".dg-cta-cyber.dg-cyber-host,.dg-cta-cyber .dg-cyber-word{font-size:1.02em!important;letter-spacing:.1em!important;font-weight:600!important}"
+".dg-cta-cyber .dg-cyber-ch{animation-duration:1s,10s}"
+".dg-reduce .dg-cyber-ch,.dg-reduce .dg-cyber-word,.dg-reduce .dg-hero-hold .dg-cyber-word::after{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}"
+".nav_left,.nav_right{background:transparent!important}"
+"#main,main,h1.hero-title,.hero-section,.hero-section h1,#dg-page{scroll-margin-top:5.5rem!important}"
/* v632 Fable: DEMIGOD mono wordmark — balanced to 28px mark, flex gap */
+"a.nav_logo,.nav_logo,a.w-nav-brand,.w-nav-brand,a.logo-link,.logo-link{display:inline-flex!important;align-items:center!important;gap:.625rem!important;text-decoration:none!important}"
+".nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-family:var(--dg-mono)!important;color:var(--dg-paper)!important;font-size:.9rem!important;font-weight:600!important;letter-spacing:.18em!important;text-transform:uppercase!important;line-height:1!important;margin:0 -.18em 0 0!important;white-space:nowrap!important}"
+"a.nav_logo:hover [data-brand-name],a.nav_logo:hover .dg-brand-name,.w-nav-brand:hover [data-brand-name]{color:var(--dg-phosphor)!important}"
+".nav_logo-icon{color:var(--dg-phosphor)!important;animation:none!important;flex-shrink:0!important}"+".nav_logo-icon .dg-mark,.nav_logo-icon svg{display:block!important;width:28px!important;height:28px!important}"
+"@media (max-width:360px){.nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-size:.8rem!important;letter-spacing:.14em!important}}"
+"#dg-nav-hire,#dg-nav-talent,#dg-top-nav .dg-nav-ctas,header a.button,header a.premium-btn,nav.w-nav a.button,nav.w-nav a.premium-btn,.nav_right a.button,.nav_right a.w-button,.nav_container a.button.on-inverse{display:none!important}"
+"#dg-bar a.button,#dg-bar a{display:flex!important}"
/* hero night stage */
+".hero-section,.header{display:flex!important}"
+"#dg-night-stage{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}"
+"#dg-night-stage .dg-grain{position:absolute;inset:0;opacity:.22;background-image:radial-gradient(rgba(166,255,203,.16) .7px,transparent .7px);background-size:4px 4px;mix-blend-mode:soft-light;animation:dgGrain 22s steps(6) infinite}"
+"#dg-night-stage .dg-stars{position:absolute;inset:-20%;background:radial-gradient(1px 1px at 20% 30%,var(--dg-phosphor),transparent),radial-gradient(1px 1px at 70% 20%,rgba(166,255,203,.65),transparent),radial-gradient(1.5px 1.5px at 40% 70%,rgba(16,198,116,.75),transparent),radial-gradient(1px 1px at 85% 60%,var(--dg-phosphor),transparent);opacity:.38;animation:dgStar 90s linear infinite}"
/* LARGE translucent art stage — full hero height, right ~64vw (was ~560px card) */
+"#dg-night-stage .dg-art-panel{position:absolute;right:0;top:0;bottom:0;width:min(64vw,960px);height:100%;border:0;overflow:hidden;"
+"-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"animation:none}"
+"#dg-night-stage .dg-art-picture{display:block;width:100%;height:100%}"
+"#dg-night-stage .dg-art-img{width:100%;height:100%;object-fit:cover;object-position:62% center;display:block;"
+"opacity:.46;filter:saturate(.72) contrast(1.08) brightness(.8);mix-blend-mode:soft-light}"
+"#dg-night-stage .dg-art-caption{position:absolute;right:0;left:auto;bottom:0;max-width:min(28rem,70%);"
+"padding:.5rem .85rem;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;text-align:right;"
+"color:rgba(166,255,203,.72);background:linear-gradient(90deg,transparent,rgba(3,20,13,.75));font-family:var(--dg-mono)}"
/* left scrim so type always reads over large art */
+".hero-section::after,.header::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;"
+"background:linear-gradient(90deg,#03140d 0%,rgba(3,20,13,.96) 28%,rgba(3,20,13,.72) 46%,rgba(3,20,13,.32) 64%,rgba(3,20,13,.08) 82%,transparent 100%)}"
+"@media(max-width:900px){"
+"#dg-night-stage .dg-art-panel{display:none;inset:auto 0 0 0;width:100%;height:48%;top:auto;right:0;"
+"-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 28%,#000 100%);"
+"mask-image:linear-gradient(180deg,transparent 0%,#000 28%,#000 100%)}"
+"#dg-night-stage .dg-art-img{opacity:.32;mix-blend-mode:normal;object-position:center 30%}"
+"#dg-night-stage .dg-art-caption{display:none}"
+".hero-section::after,.header::after{background:linear-gradient(180deg,rgba(3,20,13,.92) 0%,rgba(3,20,13,.78) 42%,rgba(3,20,13,.45) 70%,rgba(3,20,13,.55) 100%)}"
+"}"
+".dg-eyebrow,#dg-eyebrow{font-family:var(--dg-mono)!important;font-size:.72rem!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--dg-signal)!important;margin:0 0 1.1rem!important;opacity:.9}"
+".hero-section h1,.header h1,.hero-title{text-shadow:0 2px 28px rgba(3,20,13,.55)!important}"
+".hero-section h1 em,.hero-title em,.dg-em{font-style:italic!important;color:rgba(243,240,231,.88)!important;font-weight:400!important}"
+".title-accent-gold,.title-accent-cream,.title-accent-red,.title-accent-blue,.hero-section h1 span{color:var(--dg-paper)!important;background:none!important;-webkit-text-fill-color:var(--dg-paper)!important}"
+".hero-section p,.header p,.subheading,.hero-description{position:relative;z-index:2;max-width:42ch!important;font-size:1.05rem!important;line-height:1.6!important;color:var(--dg-paper-mute)!important;margin:0 0 1.15rem!important;font-family:var(--dg-sans)!important}"
+".hero-badge,.badge-text{display:none!important}"
+"#dg-hero-chips,.dg-trust-line{position:relative;z-index:2;display:block!important;margin:0 0 1.25rem!important;color:rgba(166,255,203,.75)!important;font-size:.82rem!important;letter-spacing:.04em;background:transparent!important;font-family:var(--dg-mono)!important}"
+"#dg-path-nudge{display:none!important}"
/* dual path frege-bracket cards */
+".hero-actions,.hero-actions.dg-path-pair{position:relative;z-index:5;display:grid!important;grid-template-columns:1fr 1fr!important;gap:.85rem!important;max-width:34rem!important;width:100%!important;margin:.5rem 0 0!important}"
+".hero-actions .dg-cta-wrap{display:block!important;min-width:0!important}"
+".hero-actions .dg-cta-wrap a,.hero-actions a.premium-btn,.hero-actions a.button,.hero-actions a.w-button,.hero-actions a[data-dg-cta]{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:.25rem!important;width:100%!important;height:100%!important;min-height:76px!important;padding:1.05rem 1.15rem!important;border-radius:4px!important;font-weight:600!important;font-size:.95rem!important;line-height:1.25!important;text-decoration:none!important;font-family:var(--dg-mono)!important;cursor:pointer!important;transition:transform .25s ease,box-shadow .35s ease,border-color .25s ease,background .25s ease!important}"
+".hero-actions a[data-dg-cta=hire],.hero-actions a.is-talent{background:linear-gradient(120deg,rgba(8,160,93,.35),rgba(16,198,116,.12))!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.45)!important;box-shadow:0 0 0 0 rgba(166,255,203,0)!important}"
+".hero-actions a[data-dg-cta=hire]:hover,.hero-actions a.is-talent:hover{transform:translateY(-3px)!important;box-shadow:0 12px 40px rgba(16,198,116,.22)!important;border-color:var(--dg-phosphor)!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label,.hero-actions a[data-dg-cta=hire] .dg-cta-hint,.hero-actions a.is-talent .dg-cta-label,.hero-actions a.is-talent .dg-cta-hint{color:var(--dg-phosphor)!important}"
+".hero-actions a[data-dg-cta] .dg-cta-label,.hero-actions a[data-dg-cta] .dg-cta-hint{display:block!important;line-height:1.25!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:before,.hero-actions a.is-talent .dg-cta-label:before{content:'[ ';opacity:.7}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:after,.hero-actions a.is-talent .dg-cta-label:after{content:' → ]';opacity:.7}"
+".hero-actions a[data-dg-cta=talent],.hero-actions a.is-job{background:transparent!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.28)!important}"
+".hero-actions a[data-dg-cta=talent]:hover,.hero-actions a.is-job:hover{transform:translateY(-3px)!important;border-color:var(--dg-phosphor)!important;box-shadow:0 12px 36px rgba(3,20,13,.45)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label,.hero-actions a[data-dg-cta=talent] .dg-cta-hint,.hero-actions a.is-job .dg-cta-label{color:var(--dg-paper)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:before{content:'[ ';opacity:.55}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:after{content:' ]';opacity:.55}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-hint{color:var(--dg-paper-mute)!important;font-size:.78rem!important;font-weight:500!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-hint{opacity:.85!important;font-size:.78rem!important;font-weight:500!important}"
+".hero-actions a .btn-arrow,.hero-actions a svg{display:none!important}"
+"#dg-bar{background:rgba(3,20,13,.96)!important;border-top:1px solid var(--dg-rule)!important}"
+"#dg-bar a.dg-h{background:rgba(8,160,93,.35)!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.4)!important}"
+"#dg-bar a.dg-j{background:transparent!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.28)!important}"
+"#dg-path-pills{position:relative;z-index:2;display:flex!important;flex-wrap:wrap!important;gap:.35rem 1.15rem!important;margin:1.25rem 0 0!important;padding:1rem 0 0!important;border-top:1px solid var(--dg-rule)!important;background:transparent!important}"
+"#dg-path-pills a{color:var(--dg-paper-mute)!important;font-size:.82rem!important;letter-spacing:.06em!important;text-transform:lowercase!important;text-decoration:none!important;background:transparent!important;border:0!important;min-width:48px!important;min-height:48px!important;padding:0 .25rem!important;display:inline-flex!important;align-items:center!important;transition:color .2s ease!important}"
+"#dg-path-pills a:hover{color:var(--dg-phosphor)!important}"
+"#dg-cap-strip{display:none!important}"
/* below fold night institutional */
+"#demigod-trust-block,#dg-faq,#dg-proof-strip,#dg-pipeline-note,#dg-contact-strip,#dg-hero-trust,#insights-section,.insights-section{display:none!important}"
+"section.trust-section,section:has(.steps-grid),section:has(.pricing-grid),body>section:not(.modal-overlay):not(#startup-modal):not(#jobseeker-modal),.w-section{display:block!important;visibility:visible!important;opacity:1!important;background:var(--dg-night)!important;background-image:none!important;color:var(--dg-paper)!important;padding:clamp(4.5rem,10vh,7rem) 1.25rem!important;border-top:1px solid var(--dg-rule)!important}"
+".roles-header,.roles-grid,[data-dg-hidden=roles-simplify]{display:none!important}"
+".trust-header h2,.heading_tertiary,section h2,.step-title{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;font-size:clamp(1.6rem,3.5vw,2.35rem)!important;font-weight:430!important;letter-spacing:-.03em!important;margin:.5rem 0 .55rem!important}"
+".trust-header p,.paragraph_large,.step-desc{color:var(--dg-paper-mute)!important;font-size:.95rem!important;max-width:44ch;font-family:var(--dg-sans)!important;line-height:1.55!important}"
+".steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important;max-width:56rem;margin:0 auto!important}"
+".step-card{background:rgba(255,255,255,.03)!important;border:1px solid var(--dg-rule)!important;border-radius:4px!important;padding:1.2rem 1.1rem!important;color:var(--dg-paper)!important;transition:transform .3s ease,border-color .3s ease,box-shadow .35s ease!important}"
+".step-card:hover{transform:translateY(-4px)!important;border-color:rgba(166,255,203,.55)!important;box-shadow:0 16px 40px rgba(0,0,0,.35)!important}"
+".step-num{color:var(--dg-phosphor)!important;font-size:.72rem!important;font-weight:700!important;letter-spacing:.14em!important;font-family:var(--dg-mono)!important}"
+".step-title{font-size:1.15rem!important}"
+".pricing-grid,.pricing-grid.is-single{display:block!important;max-width:28rem;margin:0 auto!important}"
+".pricing-card{background:rgba(255,255,255,.03)!important;border:1px solid var(--dg-rule)!important;border-radius:4px!important;padding:1.7rem 1.45rem!important;color:var(--dg-paper)!important;animation:dgBorderGlow 5s ease-in-out infinite}"
+".pricing-card h3{color:var(--dg-signal)!important;letter-spacing:.12em!important;font-size:.7rem!important;text-transform:uppercase!important;font-family:var(--dg-mono)!important}"
+".pricing-card .pricing-amount,.pricing-card .price,.pricing-card > div > div{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important}"
+".pricing-card a.premium-btn,.pricing-card a.button{margin-top:1.1rem!important;min-height:48px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:4px!important;background:rgba(8,160,93,.4)!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.45)!important;padding:.7rem 1.2rem!important;font-family:var(--dg-mono)!important}"
+"footer,.footer{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:clamp(3rem,6vw,4.75rem) 1.25rem!important;text-align:left!important;border-top:1px solid var(--dg-rule)!important;background:var(--dg-night)!important}"
+"#dg-footer-panel{box-sizing:border-box;width:min(72rem,100%);margin:0 auto;display:grid;gap:clamp(2rem,4vw,3rem);font-family:var(--dg-sans);color:var(--dg-paper)}"
+".dg-footer-actions{width:100%;max-width:42rem;display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.dg-footer-actions a{box-sizing:border-box;min-width:0;min-height:76px;padding:1rem 1.05rem;display:flex;flex-direction:column;justify-content:center;gap:.25rem;border:1px solid rgba(166,255,203,.3);border-radius:4px;color:var(--dg-paper)!important;text-decoration:none!important;font-family:var(--dg-mono)!important}.dg-footer-actions a:first-child{background:rgba(8,160,93,.3);border-color:rgba(166,255,203,.5);color:var(--dg-phosphor)!important}.dg-footer-actions strong{font-size:.9rem;line-height:1.3}.dg-footer-actions span{color:var(--dg-paper-mute);font-size:.74rem;line-height:1.35}.dg-footer-actions a:hover{border-color:var(--dg-phosphor)!important;background:rgba(8,160,93,.18)}"
+"#dg-legal-links{display:flex!important;flex-wrap:wrap!important;align-items:flex-start!important;gap:1.5rem clamp(2rem,7vw,6rem)!important;margin:0!important;padding:clamp(1.5rem,3vw,2.25rem) 0!important;border-top:1px solid var(--dg-rule);border-bottom:1px solid var(--dg-rule)}"
+".dg-footer-group{flex:1 1 12rem;display:flex;flex-direction:column;align-items:flex-start;gap:.45rem;opacity:1!important;visibility:visible!important}.dg-footer-heading{margin:0 0 .35rem;color:var(--dg-signal);font-family:var(--dg-mono);font-size:.68rem;font-weight:750;letter-spacing:.16em;text-transform:uppercase}"
+"#dg-legal-links a{box-sizing:border-box;min-width:44px;min-height:44px;padding:.45rem 0;display:inline-flex!important;align-items:center;color:var(--dg-paper-mute)!important;font-size:.88rem!important;line-height:1.35;text-decoration:none!important}"
+"#dg-legal-links a:hover{color:var(--dg-phosphor)!important}"
+".dg-footer-bottom{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:1.25rem 3rem}.dg-footer-fee{max-width:52rem;margin:0;color:var(--dg-paper-mute);font-size:.85rem;line-height:1.6}"
+"#dg-copyright,footer [class*=copyright],footer .text-color_secondary{margin:0;color:rgba(189,201,191,.72)!important;font-size:.78rem!important;line-height:1.5;white-space:nowrap}"
+"footer .w-layout-grid,footer .footer_icon-group,footer .button-group,footer ul{display:none!important}"
+"@media(max-width:700px){footer,.footer{padding:2.75rem 1.25rem 3.25rem!important}.dg-footer-actions{grid-template-columns:1fr}.dg-footer-actions a{min-height:68px}#dg-legal-links{display:grid!important;grid-template-columns:1fr 1fr;gap:1.5rem 1.25rem!important}.dg-footer-bottom{grid-template-columns:1fr;gap:.75rem}#dg-copyright{white-space:normal}}"
+"a:focus-visible,button:focus-visible,.premium-btn:focus-visible,#dg-bar a:focus-visible{outline:2px solid var(--dg-phosphor)!important;outline-offset:3px!important}"
/* motion reveals */
+".dg-reveal{opacity:0;transform:translateY(22px);transition:opacity 1.25s cubic-bezier(.16,1,.3,1),transform 1.25s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0ms)}"
+".hero-section h1.dg-reveal,.header h1.dg-reveal{transform:translateY(38px);transition-duration:1.65s}"
+".dg-reveal.dg-in,.dg-motion .dg-reveal.dg-in{opacity:1;transform:none}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label,body[data-dg-ready=\"1\"] .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label{animation:dgCtaPhosphor 2.4s cubic-bezier(.16,1,.3,1) var(--d,0ms) both}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-cyber .dg-cyber-ch{text-shadow:0 0 8px rgba(166,255,203,.75)}"
+".dg-reduce .dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+".dg-reduce body::before,.dg-reduce #dg-night-stage .dg-grain,.dg-reduce #dg-night-stage .dg-stars,.dg-reduce #dg-night-stage .dg-art-panel,.dg-reduce .nav_logo-icon,.dg-reduce .pricing-card{animation:none!important}"
+"@media(max-width:767px){.dg-footer-actions,.hero-actions,.hero-actions.dg-path-pair{display:none!important}#dg-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:9998;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))!important}#dg-bar a{min-height:48px!important;border-radius:4px!important;font-size:.88rem!important;font-weight:650!important;display:flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important}body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}.steps-grid{grid-template-columns:1fr!important}}"
+"@media(min-width:768px){#dg-bar{display:none!important}body{padding-bottom:0!important}}"
+"@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}"
+"";document.head.appendChild(s)}


function ensureA11yCss(){try{qa('.modal-close-btn').forEach(function(b){if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Close');});}catch(e){}try{qa('.w-file-upload-error').forEach(function(b){if(!b.getAttribute('role'))b.setAttribute('role','alert');if(!b.getAttribute('aria-live'))b.setAttribute('aria-live','assertive');});}catch(e){}/* v849: single gold focus ring on all interactive CTAs/controls */if(q('#dg-focus-ring'))return;var fr=document.createElement('style');fr.id='dg-focus-ring';fr.textContent='a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,.premium-btn:focus-visible,.dg-page-x:focus-visible,.dg-page-ctas a:focus-visible,.dg-wiz-next:focus-visible,.dg-wiz-back:focus-visible,.dg-wiz-choice:focus-visible,#dg-bar a:focus-visible,.dg-referral-clear:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}.modal-close-btn{min-width:44px!important;min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}';document.head.appendChild(fr)}
function ensureForcedColorsCss(){if(q('#dg-forced-colors'))return;var fc=document.createElement('style');fc.id='dg-forced-colors';fc.textContent='@media(forced-colors:active){#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head,#startup-modal .dg-wiz-chrome,#jobseeker-modal .dg-wiz-chrome{border:1px solid CanvasText!important;forced-color-adjust:auto}#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{border:1px solid CanvasText!important;background:Canvas!important}#startup-modal .dg-wiz-bar>i,#jobseeker-modal .dg-wiz-bar>i{background:Highlight!important;box-shadow:none!important}}';document.head.appendChild(fc)}

function dgIdle(fn,ms){ms=ms||2000;try{if(window.requestIdleCallback){requestIdleCallback(function(){try{fn()}catch(e){console.error('Demigod idle',e)}},{timeout:ms});return}}catch(e){}setTimeout(function(){try{fn()}catch(e){console.error('Demigod idle',e)}},Math.min(ms,400))}
/* v855: run critical path first; honesty scrubs after paint to cut main-thread TBT on home. */
function run(){if(busy)return;busy=true;try{brandAssets();ensureA11yCss();ensureForcedColorsCss()}catch(e){}try{skipLink();heroImgPerf();lazyBelowFold();wizCss();ensureWizPremiumCss();faqCss();hero();injectNightHero();copy();forms();referralNotice();fileUploadHonest();cta();fixFooterCtas();ctaHints();nav();ensureMotion();try{wireLogoHome();ensureLogo()}catch(e){}(function roles(){qa('h2').forEach(function(h){if(/Live SF startup roles hiring now/i.test(h.textContent||''))h.textContent='Example roles — labeled samples'});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$/i.test((b.textContent||'').trim()))b.textContent='EXAMPLE ROLES'});qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.68rem;font-weight:600;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem;letter-spacing:.06em;text-transform:uppercase';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)});var junk=new RegExp(['l','orem'].join('')+'|consectetur','i');qa('section,div,[class*=role]').forEach(function(c){if(c!==document.body&&c!==document.documentElement&&!c.matches?.('main,.hero-section,header,footer')&&junk.test(c.textContent||'')&&(c.textContent||'').length<2000)c.style.setProperty('display','none','important')});var ins=q('#insights-section');if(ins)ins.style.setProperty('display','none','important');qa('h3.step-title,.step-title,h2,h3').forEach(function(h){if(/Meet Your 3-5|Lightning Fast|100% Vetted/i.test(h.textContent||'')){var card=h.closest('.step-card,div,section')||h;if(/Meet Your 3-5|Meet Your\s*3/i.test(h.textContent||'')){h.textContent='Meet curated matches';var d=card.querySelector&&card.querySelector('.step-desc,p');if(d&&/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(d.textContent||''))d.textContent='Startups get curated matches — no volume promise.';}if(/Lightning Fast/i.test(h.textContent||''))h.textContent='Human-paced matching';if(/^100% Vetted/i.test(h.textContent||''))h.textContent='Human-reviewed'}});qa('p.step-desc,.step-desc').forEach(function(p){if(/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(p.textContent||''))p.textContent='Startups get curated matches — no volume promise.';});qa('p,li,span,div').forEach(function(el){if(el.children&&el.children.length>2)return;var tx=el.textContent||'';if(tx.length>200)return;if(/90-?\s*day replacement guarantee/i.test(tx)&&!el.closest('#startup-modal,#jobseeker-modal')){el.textContent=tx.replace(/90-?\s*day replacement guarantee/ig,'human-reviewed matching')}})})();mob();if(!OPEN)hide();/* v855 critical path ends — mark ready-ish via boot */}catch(e){console.error('Demigod foot fail',e)}finally{busy=false}
  dgIdle(function(){try{
    trust();foot();rmOrphanForms();successCta();
    dedupeAll();scrubTimeClaims();scrubStaticLabels();scrubBadStaticClaims();
    try{hero()}catch(e){}
    try{document.documentElement.classList.add('dg-cta-honest','dg-pricing-honest','dg-volume-honest')}catch(e){}
    qa('a[target=_blank]').forEach(function(a){var r=a.getAttribute('rel')||'';if(r.indexOf('noopener')<0)a.setAttribute('rel',(r+' noopener noreferrer').trim())});
  }catch(e){console.error('Demigod idle scrub',e)}},2200);
}

function dedupeAll(){
  // Extremely aggressive dedupe for duplicate CTAs, badges, footer (Fable spec + live audit findings)
  var killExact = ['FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', "I'M HIRING", 'FIND A JOB', 'SF BAY AREA STARTUP MATCHING'];
  killExact.forEach(function(needle){
    var matches = [];
    qa('a, button, .button, .premium-btn, [data-demigod-modal], .badge-text, .eyebrow').forEach(function(el){
      if (el.closest('#dg-bar,#dg-path-pills,.hero-actions,#dg-page')) return;
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
    var footerRoot = q('#dg-footer-panel') || f;
    qa('p,span,div,a', footerRoot).forEach(function(el){
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
  var rep = 'potter@trydemigod.com will follow up';
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
    if (fullLeaf.test(txt) && txt.length < 120) {
      el.textContent = 'Human review — ' + rep;
      return;
    }
    if (bareGuarantee.test(txt) && txt.length < 200) {
      el.textContent = '10% of first-year base salary when a hire starts · human-reviewed matching';
      return;
    }
    if (/pre-vetted|Dedicated talent partner|90-?\s*day replacement/i.test(txt) && txt.length < 160 && !el.closest('#startup-modal,#jobseeker-modal')) {
      el.textContent = txt
        .replace(/Access to pre-vetted SF talent/ig,'Human-reviewed SF Bay matches')
        .replace(/pre-vetted/ig,'human-reviewed')
        .replace(/Dedicated talent partner/ig,'Software comparison · human review')
        .replace(/90-?\s*day replacement guarantee/ig,'human-reviewed matching');
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
      el.textContent = 'Thank you! potter@trydemigod.com will follow up.';
    }
  });
}



function scrubBadStaticClaims(){
  try{
    var reG=/90-?\s*day\s+replacement\s+guarantee|guaranteed\s+(?:free\s+)?replacement|(?<!pending.{0,30})\breplacement guarantee\b/ig;
    var reV=/Meet Your 3-5[^.<]{0,40}|Lightning Fast Matching|100%\s*Vetted/ig;
    var tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
    var n,nodes=[];
    while(n=tw.nextNode()){
      var v=n.nodeValue||'';
      if(!v||v.length>300)continue;
      if(reG.test(v)||reV.test(v)){ reG.lastIndex=0; reV.lastIndex=0; nodes.push(n); }
    }
    nodes.forEach(function(tn){
      var v=tn.nodeValue||'';
      var nv=v
        .replace(/90-?\s*day\s+replacement\s+guarantee/ig,'human-reviewed matching')
        .replace(/(?<!pending.{0,30})\breplacement guarantee\b/ig,'human-reviewed matching')
        .replace(/guaranteed\s+(?:free\s+)?replacement/ig,'honest matching, humans in the loop')
        .replace(/Meet Your 3-5[^.<]{0,40}/ig,'Meet curated matches')
        .replace(/receive\s+3[\s–-]5\s+highly\s+aligned[^.]{0,100}\.?/ig,'get curated matches — no volume promise.')
        .replace(/3[\s–-]5\s+highly\s+aligned[^.]{0,80}\.?/ig,'curated matches — no volume promise.')
        .replace(/Lightning Fast Matching/ig,'Human-paced matching')
        .replace(/100%\s*Vetted/ig,'Human-reviewed');
      if(nv!==v)tn.nodeValue=nv;
    });
    // hide pricing bullets that are only the bad claim
    qa('div,li,p,span').forEach(function(el){
      if(el.children&&el.children.length)return;
      var tx=(el.textContent||'').trim();
      if(/^human-reviewed matching/i.test(tx)||/^human-reviewed matching$/i.test(tx))return;
      if(/replacement guarantee/i.test(tx)&&tx.length<80){
        el.textContent='human-reviewed matching';
      }
    });
  }catch(e){}
}

function scrubStaticLabels(){
  // SAFE scrub: only leaf Webflow title strings. NEVER hide #startup-modal / #jobseeker-modal / form containers.
  try {
    if (document.title && /HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(document.title)) {
      document.title = 'Demigod · SF startup talent matching';
    }
  } catch(e){}
  qa('#jobseeker-modal label,#engineer-join label').forEach(function(el){if(!el.querySelector('input,select,textarea'))el.textContent=talentNativeLabel(el.textContent)});
  function policyText(t){
    return (t||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/[\u00A0\u202F]/g,' ').replace(/[\u2010-\u2015]/g,'-').trim().replace(/\s+/g,' ');
  }
  // v516: Webflow modal chrome still ships agency-style titles/intros
  qa('.modal-title,h2.modal-title,#startup-modal h2,#jobseeker-modal h2').forEach(function(el){
    var t=policyText(el.textContent);
    if(/^HIRE SF STARTUP TALENT$/i.test(t)||/^FIND TALENT$/i.test(t)||/^HIRE TALENT$/i.test(t)||/^I.?M HIRING$/i.test(t)) el.textContent='Hire talent';
    else if(/^GET MATCHED TO SF STARTUPS$/i.test(t)||/^JOIN NETWORK$/i.test(t)||/^I.?M LOOKING$/i.test(t)) el.textContent=COPY.ctaEngineer;
  });
  qa('.modal-subtitle,#startup-modal .modal-subtitle,#jobseeker-modal .modal-subtitle').forEach(function(el){
    var t=policyText(el.textContent);
    if(/STARTUP HIRING FORM|HIRING FORM/i.test(t)) el.textContent='Startup brief';
    else if(/CANDIDATE APPLICATION|ENGINEER APPLICATION/i.test(t)) el.textContent='Talent profile';
  });
  qa('.modal-intro,#startup-modal .modal-intro,#jobseeker-modal .modal-intro').forEach(function(el){
    var t=el.textContent||'';
    if(/curated SF candidates|match you to SF startups/i.test(t)){
      el.textContent=/startup|role|comp/i.test(t)
        ? 'Share the role, real constraints, and one concrete first result. Software compares the evidence.'
        : 'One private profile. Shared only when both sides approve.';
    }
  });
  // v517: pricing-card bullets (Webflow canvas still ships agency guarantee language)
  qa('.pricing-card div,.pricing-card li,.pricing-grid div,.pricing-grid li').forEach(function(el){
    if(el.children&&el.children.length>1)return;
    var t=policyText(el.textContent);
    if(!t||t.length>120)return;
    if(/^Access to pre-vetted SF talent$/i.test(t)) el.textContent='Human-reviewed SF Bay matches';
    else if(/^Dedicated talent partner$/i.test(t)) el.textContent='Software comparison · human review';
    else if(/90-?\s*day replacement guarantee/i.test(t)) el.textContent='human-reviewed matching';
    else if(/^pre-vetted$/i.test(t)) el.textContent='human-reviewed';
  });
  var leafRe = /^(STARTUP HIRING FORM|HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|Hiring Model|EXAMPLE BRIEFS)$/i;
  qa('h1,h2,h3,.w-form-title,[class*="form-title"],label').forEach(function(el){
    var t = policyText(el.textContent);
    if (!leafRe.test(t)) return;
    if (el.closest && el.closest('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review,.dg-field-wrap')) return;
    el.style.setProperty('display','none','important');
    el.textContent = '';
  });
  // Webflow canvas honesty backstop: rewrite short labels outside owned UI.
  var staleGetVolume = /\bget\s+(?:(?:a|your)\s+)?(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?)\b/ig;
  var staleDeliveryVolume = /\b(?:(?:we(?:['’]ll|\s+will)|demigod\s+will)\s+)?(?:send|deliver|present|provide)\s+(?:you\s+)?(?:with\s+)?(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top|interview[\s-]?ready)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?)\b/ig;
  var staleSourcedVolume = /\b(?:(?:we(?:['’]ll|\s+will)|demigod\s+will)\s+)?(?:(?:source|recommend|submit)\s+(?:you\s+)?|introduce\s+(?:you\s+)?(?:to\s+)?|match\s+(?:you\s+)?(?:with\s+)?)(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top|interview[\s-]?ready)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?|people|engineers?|talent)\b/ig;
  var staleCandidateGuarantee = /\b90\s*[\u2013\u2014-]?\s*day\s+(?:(?:candidate|hire|talent)\s+)?replacement\s+(?:policy|plan|program|guarantee(?:d)?|promise|coverage|protection)\b/ig;
  var staleGuaranteedPeriod = /\b(?:(?:the|your|our|every|each)\s+)?(?:hire|placement|match|candidate|talent)?\s*(?:is\s+|comes\s+)?guaranteed\s+(?:for|throughout|during)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleIncludedReplacement = /\b(?:(?:every|each|any|the|your|our)\s+)?(?:hire|placement|match)\s+(?:includes?|comes\s+with)\s+(?:a\s+|our\s+)?90\s*[\u2013\u2014-]?\s*day\s+(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:policy|plan|program|guarantee|coverage|protection|service))?\b/ig;
  // Check parents too: Webflow often splits one visible label across nested spans.
  var staleHire = /^(?:FIND(?:\s*(?:&|AND|\+|\/)\s*HIRE)?|HIRE)\s+(?:(?:THE|YOUR|RIGHT|TOP|BEST|GREAT|EXCEPTIONAL|ELITE|PROVEN|VETTED|HIGH[\s-]?CALIBER|WORLD[\s-]?CLASS|STARTUP|TECH|TECHNICAL|ENGINEERING|PRODUCT|DESIGN|GROWTH)\s+)?(?:SF\s+)?(?:(?:TECH|TECHNICAL|ENGINEERING|PRODUCT|DESIGN|GROWTH)\s+)?TALENT(?:\s+(?:FOR\s+(?:(?:YOUR|A|ANY|FAST[\s-]?GROWING|GROWING|SCALING|EARLY[\s-]?STAGE|HIGH[\s-]?GROWTH|VENTURE[\s-]?BACKED)\s+)?(?:TEAMS?|STARTUPS?|COMPAN(?:Y|IES)|FOUNDERS?|SF\s+(?:BAY\s+AREA\s+)?STARTUPS?|OPEN\s+ROLES?|URGENT\s+(?:NEEDS?|ROLES?)|CRITICAL\s+(?:HIRES?|ROLES?)|IMMEDIATE\s+(?:NEEDS?|HIRES?|ROLES?))|YOUR\s+(?:TEAM|STARTUP|COMPANY)\s+(?:NEEDS|DESERVES)|YOU\s+NEED|FOR\s+(?:THE|THIS|YOUR)\s+(?:ROLE|NEXT\s+(?:HIRE|ROLE))|TO\s+(?:GROW|SCALE|BUILD)(?:\s+YOUR)?\s+(?:TEAM|STARTUP|COMPANY)|THAT\s+(?:FITS?|DELIVERS?|PERFORMS?|SHIPS?|STAYS?))|\s+(?:NOW|TODAY|FAST|QUICKLY))?[.!]?(?:\s*[\u2192\u203a\u00bb])?$/i;
  var staleHirePhrase = /\b(?:find(?:\s*(?:&|and|\+|\/)\s*hire)?|hire)\s+(?:(?:the|your|right|top|best|great|exceptional|elite|proven|vetted|high[\s-]?caliber|world[\s-]?class|startup|tech|technical|engineering|product|design|growth)\s+)?(?:SF\s+)?(?:(?:tech|technical|engineering|product|design|growth)\s+)?talent(?:\s+(?:for\s+(?:(?:your|a|any|fast[\s-]?growing|growing|scaling|early[\s-]?stage|high[\s-]?growth|venture[\s-]?backed)\s+)?(?:teams?|startups?|compan(?:y|ies)|founders?|SF\s+(?:Bay\s+Area\s+)?startups?|open\s+roles?|urgent\s+(?:needs?|roles?)|critical\s+(?:hires?|roles?)|immediate\s+(?:needs?|hires?|roles?))|your\s+(?:team|startup|company)\s+(?:needs|deserves)|you\s+need|for\s+(?:the|this|your)\s+(?:role|next\s+(?:hire|role))|to\s+(?:grow|scale|build)(?:\s+your)?\s+(?:team|startup|company)|that\s+(?:fits?|delivers?|performs?|ships?|stays?))|\s+(?:now|today|fast|quickly))?\b/ig;
  var staleVolumeTitle = /^(?:(?:meet|receive|review|see)\s+(?:a\s+|your\s+)?)?(?:(?:(?:a|our|your)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:of\s+(?:our|the)\s+)?|(?:your|our)\s+)?(?:(?:guaranteed|promised|highly\s+aligned|hand[\s-]?(?:picked|selected)|best[\s-]?fit|carefully\s+(?:matched|selected)|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?(?:candidates?|applicants?|resumes?|CVs?|matches?|introductions?|people|profiles?|engineers?|developers?|designers?|operators?|builders?|hires?|talent)(?:\s+(?:guaranteed|promised|per\s+role|delivered|presented|introduced|within\s+\d+\s+days?))?[.!]?$/i;
  var staleVolume = /\b(?:(?:meet|receive|review|see)\s+(?:a\s+|your\s+)?)?(?:(?:(?:a|our|your)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:of\s+(?:our|the)\s+)?|(?:your|our)\s+)?(?:(?:guaranteed|promised|highly\s+aligned|hand[\s-]?(?:picked|selected)|best[\s-]?fit|carefully\s+(?:matched|selected)|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?(?:candidates?|applicants?|resumes?|CVs?|matches?|introductions?|people|profiles?|engineers?|developers?|designers?|operators?|builders?|hires?|talent)(?:\s+(?:guaranteed|promised|per\s+role|delivered|presented|introduced|within\s+\d+\s+days?))?\b/ig;
  var staleVolumeAfter = /\b(?:(?:a|our|your)\s+)?(?:(?:curated|hand[\s-]?picked|best[\s-]?fit|carefully\s+matched|vetted|top|qualified|great|strong)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+(?:candidates?|matches?|introductions?|people|profiles?)\s*(?:of\s+)?(?:3\s*(?:[/–—-]|to)\s*5|three\s+to\s+five)(?:\s+(?:per\s+role|within\s+\d+\s+days?))?\b/ig;
  var staleCountBundle = /\b(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:vetted|top|qualified|strong|curated|matched)\s+)?(?:candidate|match|profile)\s+(?:shortlist|slate|set|batch|group)(?:\s+per\s+role)?\b/ig;
  var stalePoolVolume = /\b(?:(?:a|our|your)\s+)?(?:choice|selection|pool|pipeline|roster)\s+of\s+(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|engineers?|talent)(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role))?\b/ig;
  var staleFinalists = /\b(?:(?:meet|review|receive|see)\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|hand[\s-]?(?:picked|selected)|carefully\s+(?:matched|selected)|matched|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?finalists?(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role|within\s+\d+\s+days?))?\b/ig;
  var staleMinimumVolume = /\b(?:at\s+least|a\s+minimum\s+of|as\s+many\s+as)\s+(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|talent)\b/ig;
  var staleChoiceVolume = /\b(?:choose|pick|select|interview|compare)\s+(?:from\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|engineers?|talent)(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role))?\b/ig;
  var staleTalentGuarantee = /\b90\s*[–—-]?\s*day\s+(?:hiring|talent)\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance)\b|\bguaranteed\s+replacement\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?\b/ig;
  var staleOutcomeGuarantee = /\b90\s*[–—-]?\s*day\s+(?:fit|placement|retention|success)\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance)\b/ig;
  var staleRiskFreeHiring = /\b(?:90\s*[–—-]?\s*day\s+)?risk[\s-]?free\s+(?:hire|hiring|placement|recruiting)(?:\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance))?(?:\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|\b(?:hire|hiring|placement|recruiting)\s+(?:is\s+)?risk[\s-]?free\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleReversedGuarantee = /\b(?:replacement\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|coverage|protection)|replacement\s+is\s+guaranteed)\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b|\b90\s+days?\s+of\s+(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement\s+(?:policy|guarantee|coverage|protection)\b/ig;
  var staleBackedReplacement = /\b(?:we\s+stand\s+behind|(?:your|the|every|each)\s+hire\s+is\s+(?:backed|covered))\s+(?:(?:your|the|every|each)\s+hire\s+)?(?:with|by)\s+(?:our\s+|a\s+)?replacement(?:\s+(?:hire|candidate|search|match))?\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleExpenseReplacement = /\b(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|the\s+hire|your\s+hire|the\s+candidate|your\s+candidate)\s+(?:at\s+(?:our|no)\s+(?:expense|cost)|on\s+us)\s+(?:within|for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b|\breplacement(?:\s+(?:hire|candidate|search|match))?\s+(?:is|will\s+be)\s+(?:at\s+(?:our|no)\s+(?:expense|cost)|on\s+us)\s+(?:within|for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleGuaranteePeriod = /\b(?:90\s*[–—-]?\s*days?\s+of\s+)?(?:free|no[-\s]?cost|no[-\s]?charge)\s+replacement\s+(?:coverage|support|period|protection)|replacement(?:\s+(?:hire|candidate|match|search))?\s+(?:is\s+|will\s+be\s+)?at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee)(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|replacement\s+(?:coverage|support|period|protection)\s+at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee)(?:\s+for\s+(?:the\s+first\s+)?90\s+days?)?|(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:is\s+)?included(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|replacement\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?\s+(?:is\s+)?included\b/ig;
  var staleComplimentaryReplacement = /\b(?:a\s+)?complimentary\s+(?:replacement|replacement\s+(?:search|match|hire|candidate)|new\s+(?:search|match)|search)(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|(?:replacement|replacement\s+(?:search|match|hire|candidate)|new\s+(?:search|match)|search)\s+(?:is|will\s+be)\s+complimentary(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?\b/ig;
  var staleConditionalReplacement = /\b(?:if|when)\s+(?:the\s+)?(?:hire|candidate|they)\s+(?:leaves?|quits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:the\s+)?(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b|\b(?:replace\s+(?:the\s+)?(?:hire|candidate)|find|provide\s+(?:you\s+)?(?:another|a\s+replacement)\s+(?:hire|candidate|match))\s+(?:if|when)\s+(?:they|the\s+hire|the\s+candidate)\s+(?:leaves?|quits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleFitReplacement = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:(?:isn['’]?t|is\s+not|doesn['’]?t|does\s+not|fails?\s+to)\s+(?:(?:the\s+)?(?:right|good|strong)\s+fit|a\s+(?:right|good|strong)\s+fit|meet\s+(?:your|the)\s+expectations?|perform|deliver)|underperforms?|falls?\s+short(?:\s+of\s+(?:your|the)\s+expectations?)?)\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b/ig;
  var staleShouldReplacement = /\bshould\s+(?:the|your|our)\s+(?:hire|candidate)\s+(?:leave|quit|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)\s+(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b/ig;
  var staleOfferedReplacement = /\bwe\s+(?:offer|include|provide)\s+(?:you\s+)?(?:a\s+)?(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:search|hire|candidate|match))?\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b|\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+we\s+(?:offer|include|provide)\s+(?:you\s+)?(?:a\s+)?(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:search|hire|candidate|match))?\b/ig;
  var staleSearchRestart = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:restart|reopen|rerun|redo|resume|continue)\s+(?:your|the|our)?\s*(?:candidate\s+)?search\s+(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\b/ig;
  var staleNextSearchFree = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:your|the|our)\s+(?:next|replacement)\s+(?:candidate\s+)?search\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|included|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\b|\b(?:your|the|our)\s+(?:next|replacement)\s+(?:candidate\s+)?search\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|included|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleReplacementCredit = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:issue|provide|offer|apply|give)\s+(?:you\s+)?(?:a\s+)?(?:full\s+|100%\s+)?(?:replacement\s+|fee\s+)?(?:credit|refund)\b|\b(?:a\s+)?(?:full\s+|100%\s+)?(?:replacement\s+|fee\s+)?(?:credit|refund)\s+(?:is|will\s+be)\s+(?:issued|provided|offered|applied|given)\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeWaiver = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:waive|refund|return)\s+(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\b|\b(?:we(?:['’]ll|\s+will)\s+)?(?:waive|refund|return)\s+(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeCarryover = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:your|the)?\s*(?:placement|success|hiring|recruiting)?\s*fee\s+(?:is|will\s+be)\s+(?:credited|applied)\s+(?:toward|to)\s+(?:(?:a|your|the)\s+)?(?:next|replacement|new)\s+(?:search|hire|candidate|match)\b|\b(?:your|the)?\s*(?:placement|success|hiring|recruiting)?\s*fee\s+(?:is|will\s+be)\s+(?:credited|applied)\s+(?:toward|to)\s+(?:(?:a|your|the)\s+)?(?:next|replacement|new)\s+(?:search|hire|candidate|match)\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeBackGuarantee = /\b(?:(?:90\s*[–—-]?\s*day\s+)?replacement|replace\s+(?:the|your|our)?\s*(?:hire|candidate))\s+or\s+(?:(?:we(?:['’]ll|\s+will)\s+)?(?:refund|return)\s+)?(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\s*(?:back)?\b/ig;
  var staleMoneyBackGuarantee = /\b(?:(?:90\s*[–—-]?\s*day\s+)?replacement|replace\s+(?:the|your|our)?\s*(?:hire|candidate))\s+or\s+(?:(?:we(?:['’]ll|\s+will)\s+)?(?:refund|return)\s+)?(?:your|the)\s+(?:full\s+|entire\s+|100%\s+)?money\s+back\b/ig;
  var staleReplacementBenefit = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:benefit|perk)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementSafetyNet = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:safety[\s-]?net|backup|support)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementInsurance = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+insurance(?:\s+(?:policy|plan|coverage))?(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementReassurance = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:peace\s+of\s+mind|safeguard|fallback)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementService = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+service(?:\s+(?:is\s+|comes\s+)?(?:included|covered|free|complimentary|guaranteed))?(?:\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?\b|\breplacement\s+service\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleGuarantee = /\b(?:(?:our\s+)?(?:90\s*[–—-]?\s*day\s+)(?:(?:free\s+)?replacement|hire)(?:\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|protection|coverage))?|(?:our\s+)?(?:free\s+)?replacement\s+(?:policy\s+)?(?:guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|assured|protection|coverage)|guaranteed\s+(?:free\s+)?replacement|90\s*[–—-]?\s*day\s+(?:(?:money[-\s]?back|risk[-\s]?free|satisfaction)\s+)?(?:guarantee|warranty|assurance)|(?:your|the)\s+hire\s+(?:is\s+)?(?:backed|covered)\s+by\s+(?:our\s+)?(?:90\s*[–—-]?\s*day\s+)?(?:guarantee|warranty|assurance)|(?:every|each|any)\s+hire\s+(?:(?:is|comes)\s+with\s+|is\s+backed\s+by\s+)?(?:our\s+)?90\s*[–—-]?\s*day\s+(?:guarantee|warranty|assurance)|we\s+stand\s+behind\s+(?:every|each|your|the)\s+hire\s+for\s+90\s+days?|we\s+guarantee\s+(?:your|the)\s+hire\s+for\s+90\s+days?|replacement\s+coverage\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?|(?:free|no[-\s]?cost)\s+replacement\s+(?:hire|candidate)|(?:free\s+)?replacement\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?|(?:your|the|our)\s+replacement\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|at\s+no\s+(?:extra\s+)?cost)|(?:free\s+)?replacement\s+(?:is|will\s+be)\s+(?:free|at\s+no\s+(?:extra\s+)?cost)\s+(?:if|when)\s+(?:they|it|the\s+hire|your\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick)))|(?:we(?:['’]ll|\s+will)\s+)?(?:find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)\s+(?:hire|candidate|replacement)?\s*(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)|(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|the\s+hire|your\s+hire|the\s+candidate|your\s+candidate)\s+(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)(?:\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?)?|(?:we(?:['’]ll|\s+will)\s+)?cover\s+(?:your|the)\s+(?:next|replacement)\s+(?:hire|candidate)|(?:your|the)\s+(?:next|replacement)\s+(?:hire|candidate)\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|at\s+no\s+(?:extra\s+)?cost)|(?:if|when)\s+(?:they|it|the\s+hire|your\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick))),?\s+(?:(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|it|the\s+hire)?\s*(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)|(?:the\s+)?(?:next|replacement)\s+(?:match|hire|candidate)\s+is\s+on\s+us)|(?:free|no[-\s]?cost)\s+replacement\s+(?:if|when)\s+(?:they|it|the\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick))))\b/ig;
  function honestStaticCopy(t){
    var out=policyText(t);
    staleGetVolume.lastIndex=0;
    if(staleGetVolume.test(out)){staleGetVolume.lastIndex=0;out=out.replace(staleGetVolume,'receive curated matches');}
    staleDeliveryVolume.lastIndex=0;
    if(staleDeliveryVolume.test(out)){staleDeliveryVolume.lastIndex=0;out=out.replace(staleDeliveryVolume,'we share curated matches when the evidence supports them');}
    staleSourcedVolume.lastIndex=0;
    if(staleSourcedVolume.test(out)){staleSourcedVolume.lastIndex=0;out=out.replace(staleSourcedVolume,'share curated matches when the evidence supports them');}
    staleCandidateGuarantee.lastIndex=0;
    if(staleCandidateGuarantee.test(out)){staleCandidateGuarantee.lastIndex=0;out=out.replace(staleCandidateGuarantee,'human-reviewed matching');}
    staleGuaranteedPeriod.lastIndex=0;
    if(staleGuaranteedPeriod.test(out)){staleGuaranteedPeriod.lastIndex=0;out=out.replace(staleGuaranteedPeriod,'human-reviewed matching');}
    staleIncludedReplacement.lastIndex=0;
    if(staleIncludedReplacement.test(out)){staleIncludedReplacement.lastIndex=0;out=out.replace(staleIncludedReplacement,'human-reviewed matching');}
    // Attribute-only: do not map bare "Find talent" strings that are the dual-path hero.
    if(staleHire.test(out) && !/^Find talent(?:\.\s*Find startups\.?)?$/i.test(out) && !/^Hire talent\b/i.test(out))return 'Hire talent';
    staleHirePhrase.lastIndex=0;
    if(staleHirePhrase.test(out)){staleHirePhrase.lastIndex=0;out=out.replace(staleHirePhrase,"start a hiring brief");}
    stalePoolVolume.lastIndex=0;
    if(stalePoolVolume.test(out)){stalePoolVolume.lastIndex=0;out=out.replace(stalePoolVolume,'curated matches');}
    staleVolume.lastIndex=0;
    if(staleVolume.test(out)){staleVolume.lastIndex=0;out=staleVolumeTitle.test(out)?'Meet curated matches':out.replace(staleVolume,'a curated shortlist');}
    staleVolumeAfter.lastIndex=0;
    if(staleVolumeAfter.test(out)){staleVolumeAfter.lastIndex=0;out=out.replace(staleVolumeAfter,'a curated shortlist');}
    staleCountBundle.lastIndex=0;
    if(staleCountBundle.test(out)){staleCountBundle.lastIndex=0;out=out.replace(staleCountBundle,'curated matches');}
    staleFinalists.lastIndex=0;
    if(staleFinalists.test(out)){staleFinalists.lastIndex=0;out=out.replace(staleFinalists,'a curated shortlist');}
    staleMinimumVolume.lastIndex=0;
    if(staleMinimumVolume.test(out)){staleMinimumVolume.lastIndex=0;out=out.replace(staleMinimumVolume,'a curated shortlist');}
    staleChoiceVolume.lastIndex=0;
    if(staleChoiceVolume.test(out)){staleChoiceVolume.lastIndex=0;out=out.replace(staleChoiceVolume,'review curated matches');}
    staleGuarantee.lastIndex=0;
    if(staleGuarantee.test(out)){staleGuarantee.lastIndex=0;out=out.replace(staleGuarantee,'human-reviewed matching');}
    staleGuaranteePeriod.lastIndex=0;
    if(staleGuaranteePeriod.test(out)){staleGuaranteePeriod.lastIndex=0;out=out.replace(staleGuaranteePeriod,'human-reviewed matching');}
    staleComplimentaryReplacement.lastIndex=0;
    if(staleComplimentaryReplacement.test(out)){staleComplimentaryReplacement.lastIndex=0;out=out.replace(staleComplimentaryReplacement,'human-reviewed matching');}
    staleConditionalReplacement.lastIndex=0;
    if(staleConditionalReplacement.test(out)){staleConditionalReplacement.lastIndex=0;out=out.replace(staleConditionalReplacement,'human-reviewed matching');}
    staleFitReplacement.lastIndex=0;
    if(staleFitReplacement.test(out)){staleFitReplacement.lastIndex=0;out=out.replace(staleFitReplacement,'human-reviewed matching');}
    staleShouldReplacement.lastIndex=0;
    if(staleShouldReplacement.test(out)){staleShouldReplacement.lastIndex=0;out=out.replace(staleShouldReplacement,'human-reviewed matching');}
    staleOfferedReplacement.lastIndex=0;
    if(staleOfferedReplacement.test(out)){staleOfferedReplacement.lastIndex=0;out=out.replace(staleOfferedReplacement,'human-reviewed matching');}
    staleSearchRestart.lastIndex=0;
    if(staleSearchRestart.test(out)){staleSearchRestart.lastIndex=0;out=out.replace(staleSearchRestart,'human-reviewed matching');}
    staleNextSearchFree.lastIndex=0;
    if(staleNextSearchFree.test(out)){staleNextSearchFree.lastIndex=0;out=out.replace(staleNextSearchFree,'human-reviewed matching');}
    staleReplacementCredit.lastIndex=0;
    if(staleReplacementCredit.test(out)){staleReplacementCredit.lastIndex=0;out=out.replace(staleReplacementCredit,'human-reviewed matching');}
    staleFeeWaiver.lastIndex=0;
    if(staleFeeWaiver.test(out)){staleFeeWaiver.lastIndex=0;out=out.replace(staleFeeWaiver,'human-reviewed matching');}
    staleFeeCarryover.lastIndex=0;
    if(staleFeeCarryover.test(out)){staleFeeCarryover.lastIndex=0;out=out.replace(staleFeeCarryover,'human-reviewed matching');}
    staleFeeBackGuarantee.lastIndex=0;
    if(staleFeeBackGuarantee.test(out)){staleFeeBackGuarantee.lastIndex=0;out=out.replace(staleFeeBackGuarantee,'human-reviewed matching');}
    staleMoneyBackGuarantee.lastIndex=0;
    if(staleMoneyBackGuarantee.test(out)){staleMoneyBackGuarantee.lastIndex=0;out=out.replace(staleMoneyBackGuarantee,'human-reviewed matching');}
    staleReplacementBenefit.lastIndex=0;
    if(staleReplacementBenefit.test(out)){staleReplacementBenefit.lastIndex=0;out=out.replace(staleReplacementBenefit,'human-reviewed matching');}
    staleReplacementSafetyNet.lastIndex=0;
    if(staleReplacementSafetyNet.test(out)){staleReplacementSafetyNet.lastIndex=0;out=out.replace(staleReplacementSafetyNet,'human-reviewed matching');}
    staleReplacementInsurance.lastIndex=0;
    if(staleReplacementInsurance.test(out)){staleReplacementInsurance.lastIndex=0;out=out.replace(staleReplacementInsurance,'human-reviewed matching');}
    staleReplacementReassurance.lastIndex=0;
    if(staleReplacementReassurance.test(out)){staleReplacementReassurance.lastIndex=0;out=out.replace(staleReplacementReassurance,'human-reviewed matching');}
    staleReplacementService.lastIndex=0;
    if(staleReplacementService.test(out)){staleReplacementService.lastIndex=0;out=out.replace(staleReplacementService,'human-reviewed matching');}
    staleTalentGuarantee.lastIndex=0;
    if(staleTalentGuarantee.test(out)){staleTalentGuarantee.lastIndex=0;out=out.replace(staleTalentGuarantee,'human-reviewed matching');}
    staleOutcomeGuarantee.lastIndex=0;
    if(staleOutcomeGuarantee.test(out)){staleOutcomeGuarantee.lastIndex=0;out=out.replace(staleOutcomeGuarantee,'human-reviewed matching');}
    staleRiskFreeHiring.lastIndex=0;
    if(staleRiskFreeHiring.test(out)){staleRiskFreeHiring.lastIndex=0;out=out.replace(staleRiskFreeHiring,'human-reviewed matching');}
    staleReversedGuarantee.lastIndex=0;
    if(staleReversedGuarantee.test(out)){staleReversedGuarantee.lastIndex=0;out=out.replace(staleReversedGuarantee,'human-reviewed matching');}
    staleBackedReplacement.lastIndex=0;
    if(staleBackedReplacement.test(out)){staleBackedReplacement.lastIndex=0;out=out.replace(staleBackedReplacement,'human-reviewed matching');}
    staleExpenseReplacement.lastIndex=0;
    if(staleExpenseReplacement.test(out)){staleExpenseReplacement.lastIndex=0;out=out.replace(staleExpenseReplacement,'human-reviewed matching');}
    return out;
  }
  // Include compact Webflow process/nav wrappers: their visible copy is often split
  // across sibling spans, so no individual leaf contains the complete banned phrase.
  qa('a,button,summary,h1,h2,h3,h4,p,li,span,[role="button"],[role="link"],[role="navigation"],[class*="nav-link"],[class*="step-title"],[class*="process-step"],[class*="pricing"],[class*="guarantee"]').forEach(function(el){
    if (el.closest && el.closest('#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions,[data-dg-hero-h1],.hero-section h1,.header h1,h1.hero-title')) return;
    // Visible text can be fixed while stale Webflow aria-label/title copy keeps
    // announcing the old promise. Apply the same policy scrub to those labels.
    // Webflow/custom components can duplicate visible copy into hover, image,
    // or accessibility attributes. Scrub those policy surfaces too so hidden
    // legacy promises are not announced or revealed after the text is fixed.
    ['aria-label','aria-description','title','data-tooltip','data-label','data-text','alt'].forEach(function(attr){
      if (!el.hasAttribute || !el.hasAttribute(attr)) return;
      var raw = el.getAttribute(attr) || '';
      if (!raw || raw.length > 180) return;
      var clean = honestStaticCopy(raw);
      if (clean !== policyText(raw)) el.setAttribute(attr, clean);
    });
    var t = policyText(el.textContent);
    if (!t || t.length > 180) return;
    staleGetVolume.lastIndex = 0;
    if (staleGetVolume.test(t)) {
      staleGetVolume.lastIndex = 0;
      el.textContent = t.replace(staleGetVolume, 'receive curated matches');
      return;
    }
    staleDeliveryVolume.lastIndex = 0;
    if (staleDeliveryVolume.test(t)) {
      staleDeliveryVolume.lastIndex = 0;
      el.textContent = t.replace(staleDeliveryVolume, 'we share curated matches when the evidence supports them');
      return;
    }
    staleSourcedVolume.lastIndex = 0;
    if (staleSourcedVolume.test(t)) {
      staleSourcedVolume.lastIndex = 0;
      el.textContent = t.replace(staleSourcedVolume, 'share curated matches when the evidence supports them');
      return;
    }
    staleCandidateGuarantee.lastIndex = 0;
    if (staleCandidateGuarantee.test(t)) {
      staleCandidateGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleCandidateGuarantee, 'human-reviewed matching');
      return;
    }
    staleGuaranteedPeriod.lastIndex = 0;
    if (staleGuaranteedPeriod.test(t)) {
      staleGuaranteedPeriod.lastIndex = 0;
      el.textContent = t.replace(staleGuaranteedPeriod, 'human-reviewed matching');
      return;
    }
    staleIncludedReplacement.lastIndex = 0;
    if (staleIncludedReplacement.test(t)) {
      staleIncludedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleIncludedReplacement, 'human-reviewed matching');
      return;
    }
    // Never rewrite the dual-path hero H1 ("Find talent / Find startups") to the hire CTA.
    // Bare "Find talent." matches staleHire (legacy "Find talent" CTAs); hero must stay.
    if (
      (el.matches && el.matches('h1,.hero-title,.header h1,[data-dg-hero-h1],.dg-em')) ||
      (el.closest && el.closest('h1[data-dg-hero-h1],.hero-section h1,.header h1,h1.hero-title'))
    ) {
      return;
    }
    if (staleHire.test(t) && !/^Hire talent\b/i.test(t)) {
      el.textContent = 'Hire talent';
      if (el.matches('a,button')) {
        el.setAttribute('aria-label', 'Hire talent — open startup hiring brief');
        el.setAttribute('data-demigod-modal', 'startup');
        el.setAttribute('data-dg-cta', 'hire');
      }
      if (el.matches('a')) el.setAttribute('href', '/?wiz=startup');
      if (el.hasAttribute('title')) el.setAttribute('title', 'Hire talent');
      return;
    }
    staleHirePhrase.lastIndex = 0;
    if (staleHirePhrase.test(t) && !(el.matches&&el.matches('h1,.hero-title,.title-accent-gold,.title-accent-cream,[data-dg-hero-h1]'))) {
      staleHirePhrase.lastIndex = 0;
      el.textContent = t.replace(staleHirePhrase, 'start a hiring brief');
      return;
    }
    stalePoolVolume.lastIndex = 0;
    if (stalePoolVolume.test(t)) {
      stalePoolVolume.lastIndex = 0;
      el.textContent = t.replace(stalePoolVolume, 'curated matches');
      return;
    }
    staleVolume.lastIndex = 0;
    if (staleVolume.test(t)) {
      staleVolume.lastIndex = 0;
      el.textContent = staleVolumeTitle.test(t) ? 'Meet curated matches' : t.replace(staleVolume, 'a curated shortlist');
      return;
    }
    staleVolumeAfter.lastIndex = 0;
    if (staleVolumeAfter.test(t)) {
      staleVolumeAfter.lastIndex = 0;
      el.textContent = t.replace(staleVolumeAfter, 'a curated shortlist');
      return;
    }
    staleCountBundle.lastIndex = 0;
    if (staleCountBundle.test(t)) {
      staleCountBundle.lastIndex = 0;
      el.textContent = t.replace(staleCountBundle, 'curated matches');
      return;
    }
    staleFinalists.lastIndex = 0;
    if (staleFinalists.test(t)) {
      staleFinalists.lastIndex = 0;
      el.textContent = t.replace(staleFinalists, 'a curated shortlist');
      return;
    }
    staleMinimumVolume.lastIndex = 0;
    if (staleMinimumVolume.test(t)) {
      staleMinimumVolume.lastIndex = 0;
      el.textContent = t.replace(staleMinimumVolume, 'a curated shortlist');
      return;
    }
    staleChoiceVolume.lastIndex = 0;
    if (staleChoiceVolume.test(t)) {
      staleChoiceVolume.lastIndex = 0;
      el.textContent = t.replace(staleChoiceVolume, 'review curated matches');
      return;
    }
    staleGuarantee.lastIndex = 0;
    if (staleGuarantee.test(t)) {
      staleGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleGuarantee, 'human-reviewed matching');
      return;
    }
    staleGuaranteePeriod.lastIndex = 0;
    if (staleGuaranteePeriod.test(t)) {
      staleGuaranteePeriod.lastIndex = 0;
      el.textContent = t.replace(staleGuaranteePeriod, 'human-reviewed matching');
      return;
    }
    staleComplimentaryReplacement.lastIndex = 0;
    if (staleComplimentaryReplacement.test(t)) {
      staleComplimentaryReplacement.lastIndex = 0;
      el.textContent = t.replace(staleComplimentaryReplacement, 'human-reviewed matching');
      return;
    }
    staleConditionalReplacement.lastIndex = 0;
    if (staleConditionalReplacement.test(t)) {
      staleConditionalReplacement.lastIndex = 0;
      el.textContent = t.replace(staleConditionalReplacement, 'human-reviewed matching');
      return;
    }
    staleFitReplacement.lastIndex = 0;
    if (staleFitReplacement.test(t)) {
      staleFitReplacement.lastIndex = 0;
      el.textContent = t.replace(staleFitReplacement, 'human-reviewed matching');
      return;
    }
    staleShouldReplacement.lastIndex = 0;
    if (staleShouldReplacement.test(t)) {
      staleShouldReplacement.lastIndex = 0;
      el.textContent = t.replace(staleShouldReplacement, 'human-reviewed matching');
      return;
    }
    staleOfferedReplacement.lastIndex = 0;
    if (staleOfferedReplacement.test(t)) {
      staleOfferedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleOfferedReplacement, 'human-reviewed matching');
      return;
    }
    staleSearchRestart.lastIndex = 0;
    if (staleSearchRestart.test(t)) {
      staleSearchRestart.lastIndex = 0;
      el.textContent = t.replace(staleSearchRestart, 'human-reviewed matching');
      return;
    }
    staleNextSearchFree.lastIndex = 0;
    if (staleNextSearchFree.test(t)) {
      staleNextSearchFree.lastIndex = 0;
      el.textContent = t.replace(staleNextSearchFree, 'human-reviewed matching');
      return;
    }
    staleReplacementCredit.lastIndex = 0;
    if (staleReplacementCredit.test(t)) {
      staleReplacementCredit.lastIndex = 0;
      el.textContent = t.replace(staleReplacementCredit, 'human-reviewed matching');
      return;
    }
    staleFeeWaiver.lastIndex = 0;
    if (staleFeeWaiver.test(t)) {
      staleFeeWaiver.lastIndex = 0;
      el.textContent = t.replace(staleFeeWaiver, 'human-reviewed matching');
      return;
    }
    staleFeeCarryover.lastIndex = 0;
    if (staleFeeCarryover.test(t)) {
      staleFeeCarryover.lastIndex = 0;
      el.textContent = t.replace(staleFeeCarryover, 'human-reviewed matching');
      return;
    }
    staleFeeBackGuarantee.lastIndex = 0;
    if (staleFeeBackGuarantee.test(t)) {
      staleFeeBackGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleFeeBackGuarantee, 'human-reviewed matching');
      return;
    }
    staleMoneyBackGuarantee.lastIndex = 0;
    if (staleMoneyBackGuarantee.test(t)) {
      staleMoneyBackGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleMoneyBackGuarantee, 'human-reviewed matching');
      return;
    }
    staleReplacementBenefit.lastIndex = 0;
    if (staleReplacementBenefit.test(t)) {
      staleReplacementBenefit.lastIndex = 0;
      el.textContent = t.replace(staleReplacementBenefit, 'human-reviewed matching');
      return;
    }
    staleReplacementSafetyNet.lastIndex = 0;
    if (staleReplacementSafetyNet.test(t)) {
      staleReplacementSafetyNet.lastIndex = 0;
      el.textContent = t.replace(staleReplacementSafetyNet, 'human-reviewed matching');
      return;
    }
    staleReplacementInsurance.lastIndex = 0;
    if (staleReplacementInsurance.test(t)) {
      staleReplacementInsurance.lastIndex = 0;
      el.textContent = t.replace(staleReplacementInsurance, 'human-reviewed matching');
      return;
    }
    staleReplacementReassurance.lastIndex = 0;
    if (staleReplacementReassurance.test(t)) {
      staleReplacementReassurance.lastIndex = 0;
      el.textContent = t.replace(staleReplacementReassurance, 'human-reviewed matching');
      return;
    }
    staleReplacementService.lastIndex = 0;
    if (staleReplacementService.test(t)) {
      staleReplacementService.lastIndex = 0;
      el.textContent = t.replace(staleReplacementService, 'human-reviewed matching');
      return;
    }
    staleBackedReplacement.lastIndex = 0;
    if (staleBackedReplacement.test(t)) {
      staleBackedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleBackedReplacement, 'human-reviewed matching');
      return;
    }
    staleExpenseReplacement.lastIndex = 0;
    if (staleExpenseReplacement.test(t)) {
      staleExpenseReplacement.lastIndex = 0;
      el.textContent = t.replace(staleExpenseReplacement, 'human-reviewed matching');
      return;
    }
    staleTalentGuarantee.lastIndex = 0;
    if (staleTalentGuarantee.test(t)) {
      staleTalentGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleTalentGuarantee, 'human-reviewed matching');
      return;
    }
    staleOutcomeGuarantee.lastIndex = 0;
    if (staleOutcomeGuarantee.test(t)) {
      staleOutcomeGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleOutcomeGuarantee, 'human-reviewed matching');
      return;
    }
    staleRiskFreeHiring.lastIndex = 0;
    if (staleRiskFreeHiring.test(t)) {
      staleRiskFreeHiring.lastIndex = 0;
      el.textContent = t.replace(staleRiskFreeHiring, 'human-reviewed matching');
      return;
    }
    staleReversedGuarantee.lastIndex = 0;
    if (staleReversedGuarantee.test(t)) {
      staleReversedGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleReversedGuarantee, 'human-reviewed matching');
    }
  });
  // Webflow can render the same canvas copy in unclassed wrappers, SVG <text>,
  // or custom elements missed by the semantic selector above. Scrub individual
  // text nodes so nested icons and links survive instead of flattening the parent.
  try {
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),node;
    while((node=walker.nextNode())){
      var parent=node.parentElement;
      if(!parent||parent.closest('script,style,noscript,template,#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions,[data-dg-hero-h1],.hero-section h1,.header h1,h1.hero-title'))continue;
      var beforeNode=node.nodeValue||'';
      if(!beforeNode.trim()||policyText(beforeNode).length>180)continue;
      var afterNode=honestStaticCopy(beforeNode);
      if(afterNode!==policyText(beforeNode))node.nodeValue=afterNode;
    }
  } catch(e) {}
  // Copy policy also applies to accessible names, tooltips, image text, and form chrome.
  qa('[aria-label],[aria-description],[title],[alt],[placeholder],[value],[data-label],[data-title],[data-tooltip],[data-text]').forEach(function(el){
    if (el.closest && el.closest('#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions')) return;
    ['aria-label','aria-description','title','alt','placeholder','value','data-label','data-title','data-tooltip','data-text'].forEach(function(attr){
      if(!el.hasAttribute(attr))return;
      var before=el.getAttribute(attr)||'',after=honestStaticCopy(before);
      if(after!==before.trim().replace(/\s+/g,' '))el.setAttribute(attr,after);
    });
  });
  // Search/social metadata can preserve stale Webflow promises after visible copy is clean.
  qa('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach(function(el){
    var before=el.getAttribute('content')||'',after=honestStaticCopy(before);
    if(after!==before.trim().replace(/\s+/g,' '))el.setAttribute('content',after);
  });
  // Parse JSON-LD before scrubbing string leaves so structured data always remains valid JSON.
  qa('script[type="application/ld+json"]').forEach(function(el){
    try {
      var data=JSON.parse(el.textContent||'null'),changed=false;
      function scrubJson(value){
        if(typeof value==='string'){
          var next=honestStaticCopy(value);
          if(next!==value.trim().replace(/\s+/g,' '))changed=true;
          return next;
        }
        if(Array.isArray(value))return value.map(scrubJson);
        if(value&&typeof value==='object')Object.keys(value).forEach(function(key){value[key]=scrubJson(value[key]);});
        return value;
      }
      data=scrubJson(data);
      if(changed)el.textContent=JSON.stringify(data);
    } catch(e) {/* leave malformed third-party data untouched */}
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
  qa('[data-dg-hero-h1]').forEach(function(el){
    if (!/^Demigod$/i.test((el.textContent || '').trim())) paintHeroBrandH1(el);
  });
}

function show(id, opener){if(!q(id))run();var m=q(id);if(!m)return;/* v847: capture opener before inert isolation steals focus to body */var focusBack=(opener&&opener.nodeType===1)?opener:document.activeElement;OPEN=id;try{m.inert=false;m.removeAttribute('inert')}catch(e){}isolateModalBackground(m);try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');try{var title=m.querySelector('.dg-wiz-q,h2,h3,[class*=title]');if(title){if(!title.id)title.id='dg-modal-title-'+(id==='#startup-modal'?'startup':'jobseeker');m.setAttribute('aria-labelledby',title.id);}else{m.setAttribute('aria-label',id==='#startup-modal'?'Hire SF startup talent':'Private candidate form');}}catch(e){}if(document.body){ if(!('prevOverflow' in document.body.dataset)){ document.body.dataset.prevOverflow = document.body.style.overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){if(!('prevScrollbarGutter' in document.documentElement.dataset))document.documentElement.dataset.prevScrollbarGutter=document.documentElement.style.scrollbarGutter||'';document.documentElement.style.overflow='hidden';document.documentElement.style.scrollbarGutter='auto';} setTimeout(function(){var dgVis=function(e){return !!e&&e.offsetParent!==null};var nx=m.querySelector('.dg-wiz-next');var fi=[].slice.call(m.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(dgVis)[0]||(dgVis(nx)?nx:null)||focusables(m).filter(dgVis)[0];if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
// Keep fallback accessible names on the same two paths as every visible CTA.
if (!m.hasAttribute('aria-labelledby')) m.setAttribute('aria-label', id === S ? 'Hire talent — startup hiring brief' : COPY.ctaEngineer+' — private candidate form');
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
  try { attachTrap(m, focusBack); } catch(e){}
} catch(e){}
}



/* === DEEP LINK — /?wiz=startup|engineer (+ hash aliases); product /?p= is same-origin shell route === */
/* === SIMPLE PAGES (?p=) — short secondary screens; home stays a decision screen === */
/* ==== SECTION: product pages (DG_PAGES + openPage / routePages /?p=) ==== */
function dgMapEventsHtml(kind){
  var isEvents=kind==='events';
  var eventFormHtml="<details><summary>Submit an event</summary><form id=\"dg-event-submit\" class=\"dg-community-form\"><p class=\"dg-p-note\">* Required. A human reviews every submission before it appears on Demigod.</p><label>Event title *<input class=\"dg-ev-in\" name=\"title\" required maxlength=\"120\"></label><label>Organizer name *<input class=\"dg-ev-in\" name=\"organizerName\" required maxlength=\"120\" autocomplete=\"name\"></label><label>Organizer email *<input class=\"dg-ev-in\" name=\"organizerEmail\" type=\"email\" required maxlength=\"160\" autocomplete=\"email\"></label><label>Date and time (your local timezone) *<input class=\"dg-ev-in\" name=\"startsAt\" type=\"datetime-local\" required></label><label>Format *<select class=\"dg-ev-in\" name=\"format\" required><option value=\"\">Select</option><option value=\"in-person\">In person</option><option value=\"online\">Online</option><option value=\"hybrid\">Hybrid</option></select></label><label>Venue or neighborhood (required for in-person or hybrid)<input class=\"dg-ev-in\" name=\"venue\" maxlength=\"180\"></label><label>Who is it for? *<input class=\"dg-ev-in\" name=\"audience\" required maxlength=\"240\"></label><label>Capacity (optional)<input class=\"dg-ev-in\" name=\"seats\" type=\"number\" min=\"1\" step=\"1\"></label><label>Requested destination *<select class=\"dg-ev-in\" name=\"destination\" required><option value=\"demigod\">trydemigod.com</option><option value=\"luma\">Luma only</option><option value=\"partiful\">Partiful only</option><option value=\"demigod+luma\">trydemigod.com + Luma</option><option value=\"demigod+partiful\">trydemigod.com + Partiful</option></select></label><label>Existing Luma or Partiful link<input class=\"dg-ev-in\" name=\"externalUrl\" type=\"url\" inputmode=\"url\" maxlength=\"500\" placeholder=\"https://\" aria-describedby=\"dg-event-url-help\"></label><p id=\"dg-event-url-help\" class=\"dg-p-note\">Required for a Luma or Partiful destination and must match that platform. Demigod does not create or publish the external listing for you.</p><label>Event details *<textarea class=\"dg-ev-in\" name=\"details\" rows=\"4\" required maxlength=\"2000\"></textarea></label><button class=\"dg-ev-submit\" type=\"submit\">Submit event for review</button><p class=\"dg-submit-msg\" role=\"status\" aria-live=\"polite\"></p></form></details>";
  var startupFormHtml="<details open><summary>Add an unlisted startup</summary><form id=\"dg-startup-submit\" class=\"dg-community-form\"><p class=\"dg-p-note\">* Required. Submit factual public information; a human reviews it before listing.</p><label>Startup name *<input class=\"dg-ev-in\" name=\"name\" required maxlength=\"160\"></label><label>Website *<input class=\"dg-ev-in\" name=\"website\" type=\"url\" required placeholder=\"https://\"></label><label>SF neighborhood *<input class=\"dg-ev-in\" name=\"neighborhood\" required maxlength=\"120\"></label><label>What does it do? *<textarea class=\"dg-ev-in\" name=\"description\" rows=\"3\" required maxlength=\"1200\"></textarea></label><label>Hiring?<select class=\"dg-ev-in\" name=\"hiring\"><option value=\"unknown\">Not sure</option><option value=\"yes\">Yes</option><option value=\"no\">No</option></select></label><label>Your name *<input class=\"dg-ev-in\" name=\"submitterName\" required maxlength=\"120\" autocomplete=\"name\"></label><label>Your email *<input class=\"dg-ev-in\" name=\"submitterEmail\" type=\"email\" required maxlength=\"160\" autocomplete=\"email\"></label><button class=\"dg-ev-submit\" type=\"submit\">Submit startup for review</button><p class=\"dg-submit-msg\" role=\"status\" aria-live=\"polite\"></p></form></details>";
  var manageHtml=isEvents
    ?"<details hidden><summary>Manage my event submissions</summary><p class=\"dg-p-note\">This browser keeps private management keys for event submissions made here. Startup submissions are managed on the SF tech company directory page.</p><div id=\"dg-event-manage\" aria-live=\"polite\"></div></details>"
    :"<details hidden><summary>Manage my startup submissions</summary><p class=\"dg-p-note\">This browser keeps private management keys for startup submissions made here. Event submissions are managed on the SF events page.</p><div id=\"dg-event-manage\" aria-live=\"polite\"></div></details>";
  var lead=isEvents
    ?'<div class="dg-ev-hero" aria-hidden="true"></div>'+
      '<p class="dg-p-lead"><strong>SF tech events, human-reviewed.</strong> Browse approved listings or submit yours. Demigod never publishes, books a venue, or messages guests for you.</p>'+
      '<ul class="dg-p-list">'+
      '<li><strong>Reviewed only</strong> — no unverified spam feed</li>'+
      '<li><strong>Submit once</strong> — a human checks before it shows</li>'+
      '<li><strong>Optional Luma / Partiful</strong> — link an existing host page</li>'+
      '</ul>'+
      '<p class="dg-p-note">Companies → <a href="/startups" data-dg-page="map">SF tech company directory</a>.</p>'
    :'<p class="dg-ev-pill" role="note">San Francisco · open data · city-level · current status not verified</p><div id="dg-startup-map"><p class="dg-p-lead">Loading the SF tech company directory…</p></div><p class="dg-p-note">Hosting or attending an SF event? Open <a href="/events" data-dg-page="events">SF events</a>.</p>';
  var listings='<section id="dg-community-listings" class="dg-community-submit" data-kind="'+(isEvents?'events':'startups')+'" aria-labelledby="dg-community-listings-title"><h2 id="dg-community-listings-title" class="dg-p-h3">'+(isEvents?'Reviewed events':'Reviewed startup submissions')+'</h2><p class="dg-p-note">Loading…</p></section>';
  var submitLead=isEvents
    ?'<p class="dg-p-note">Destinations: Demigod, Luma, Partiful, or Demigod plus one external host. Review first — not auto-publish.</p>'
    :'<p class="dg-p-note">Factual public info only. A human reviews before listing.</p>';
  var forms=isEvents?eventFormHtml:startupFormHtml;
  var footNote=isEvents
    ?'<p class="dg-p-note">Submit does not publish, book, create external accounts, or contact guests. Link an existing Luma/Partiful URL if you already host there.</p>'
    :'<p class="dg-p-note">Submitting does not verify hiring, book space, or contact the company for you. Only factual public information belongs here.</p>';
  return lead+listings+'<section class="dg-community-submit" aria-labelledby="dg-community-title"><h2 id="dg-community-title" class="dg-p-h3">'+(isEvents?'Submit an event':'Submit a startup')+'</h2>'+submitLead+'<div class="dg-submit-grid">'+forms+manageHtml+'</div>'+footNote+'</section>';
}

var DG_PAGES = {
  how: {
    title: 'How it works',
    doc: 'How it works · Demigod',
    desc: 'Share one role or private profile. A human calibrates the fit, both sides opt in, and Demigod follows a dated next checkpoint through a hire or clear pass.',
    html:
      '<p class="dg-p-lead">The familiar hiring stages, without an application pile or cold intro.</p>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Define the role or join privately</strong> — the startup shares the role, must-haves, work mode, cash band, and one concrete first result; talent sends one private profile.</li>' +
      '<li><strong>Calibrate and review</strong> — software compares role goals, self-reported skills, location, and compensation. A human confirms the interview path and decides what to propose. Nothing is sent automatically.</li>' +
      '<li><strong>Startup requests; candidate opts in</strong> — the candidate sees the company and exact role receipt, then approves or passes privately. Candidate identity stays private until approval.</li>' +
      '<li><strong>Interview directly</strong> — after both say yes, a warm intro puts the startup and candidate together. The startup runs its interview; Demigod records a dated next checkpoint and follows it through interview, offer, hire, or a clear pass.</li>' +
      '<li><strong>Hire and pay once</strong> — the startup pays 10% of first-year base salary when the hire starts. Nothing upfront; talent stays free.</li>' +
      '</ol>' +
      '<p class="dg-p-note"><strong>First result, not a guarantee.</strong> One observable result on roughly a 30–90 day horizon helps calibrate what the role owns. It is not an unpaid trial or a promise that performance can be known by day 90.</p>' +
      '<p class="dg-p-note">Public hiring data lives in the <a href="/startups" data-dg-page="map">SF tech company directory</a>. Matching stays private: no application blast, no auto-DMs, no SLA theater. <a href="/sample" data-dg-page="sample">See a fictional match note →</a> · <a href="/pricing" data-dg-page="pricing">Pricing →</a> · <a href="/faq" data-dg-page="faq">FAQ →</a></p>',
  },
  pricing: {
    title: 'Pricing',
    doc: 'Pricing · Demigod',
    desc: '10% of first-year base salary when a hire starts. Nothing upfront. Talent free.',
    html:
      '<p class="dg-p-lead">Startups pay <strong>10%</strong> of first-year base salary only when a hire starts — not to post a role.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>No subscription.</strong> No charge to submit a role brief.</li>' +
      '<li><strong>Candidates free.</strong> Always.</li>' +
      '<li><strong>Typical agencies</strong> often run 15–25%. Demigod is 10% of first-year base salary when a hire starts.</li>' +
      '<li><strong>Written confirmation.</strong> Commercial details arrive by email from potter@trydemigod.com.</li>' +
      '</ul>',
  },
  faq: {
    title: 'FAQ',
    doc: 'FAQ · Demigod',
    desc: 'Answers about Demigod’s SF matching, submissions, 10% success fee, free talent profiles, privacy, human review, and mutual intros.',
    html:
      '<details class="dg-p-det"><summary>How much does it cost?</summary><p><strong>Startups:</strong> 10% of first-year base salary when someone starts. Nothing upfront. <strong>Talent:</strong> always free. Typical agencies often charge more.</p></details>' +
      '<details class="dg-p-det"><summary>Is my profile private?</summary><p>Yes. You privately see the company and exact role after it requests an intro. Your identity and contact details move only after you approve that role. You can ask us to update or delete data anytime.</p></details>' +
      '<details class="dg-p-det"><summary>What happens after I send a brief?</summary><p>A human reviews it and follows up by email to confirm the role and interview path. We propose only when the fit looks real; both sides approve before an intro.</p></details>' +
      '<details class="dg-p-det"><summary>Does AI decide who gets matched?</summary><p>'+MATCH_DISCLOSURE+' Both sides then approve independently before an intro.</p></details>' +
      '<details class="dg-p-det"><summary>Who do you work with?</summary><p>SF Bay Area startups (and builders open to those companies). Seed through growth, product and eng-heavy roles first. Remote talent is fine when the company is Bay-focused.</p></details>' +
      '<details class="dg-p-det"><summary>What if a match is not right?</summary><p>Pass privately. No pressure, no public rejection trail. If evidence is thin, we say so instead of manufacturing a shortlist. This is not LinkedIn: '+COPY.antiLinkedIn+'</p></details>',
  },
  private: {
    title: 'Why private',
    doc: 'Why private · Demigod',
    desc: 'Demigod is private by design: no public profiles, no feed, no blasts. Mutual yes only for SF startup matching.',
    html:
      '<p class="dg-p-lead"><strong>'+COPY.antiLinkedIn+'</strong></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>No public profiles.</strong> Talent is not browsable. Founders do not post a public job wall of applicants.</li>' +
      '<li><strong>No feed, no graph vanity.</strong> Nothing to like, follow, or farm for InMail.</li>' +
      '<li><strong>Mutual yes only.</strong> Candidate identifying details move only after both sides approve.</li>' +
      '<li><strong>Company evidence, not personal brand.</strong> Public company/role facts can inform a match; we do not sell people dossiers.</li>' +
      '<li><strong>No networking pings.</strong> Talent hears from us only when a human has a real mutual-fit note.</li>' +
      '</ul>' +
      '<p class="dg-p-note"><a href="/?wiz=startup" data-demigod-modal="startup">Send a hiring brief →</a> · <a href="/?wiz=engineer" data-demigod-modal="jobseeker">Share privately →</a> · <a href="/how" data-dg-page="how">How it works →</a></p>',
  },
  hire: {
    title: 'Hire talent',
    doc: 'Hire · Demigod',
    desc: 'Submit a role brief. Software compares goals and constraints; a human decides what to propose. 10% of first-year base salary only when a hire starts.',
    html:
      '<p class="dg-p-lead">Tell us the role, the constraints that matter, and one concrete result this person should deliver first. A person reads every brief — we only propose when the fit is real, and both sides still have to say yes.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Send a ~2-min brief</strong> — role, must-haves, work mode, cash band, and one concrete first result.</li>' +
      '<li><strong>Review a proposed fit</strong> — software compares the role and profile; a human sends context and confirms the interview path.</li>' +
      '<li><strong>Request the intro</strong> — the candidate sees your company and exact role, then approves or passes privately.</li>' +
      '<li><strong>Interview and hire</strong> — you run the interview and decide. Pay 10% of first-year base salary only when the hire starts; nothing to post.</li>' +
      '</ul>' +
      '<p class="dg-p-note">No application blast, no résumé black hole, comp bands kept honest. Follow-ups come by email from potter@trydemigod.com. <a href="/how" data-dg-page="how">How it works →</a> · <a href="/pricing" data-dg-page="pricing">Pricing →</a></p>',
  },
  talent: {
    title: 'Open to the right startup?',
    doc: 'Talent · Demigod',
    desc: 'Tell Demigod what kind of SF Bay startup role you would consider. Free for candidates; your details stay private until you approve an intro.',
    html:
      '<p class="dg-p-lead">Tell us what would make you consider an SF Bay startup role. It\'s free, and your details stay private — no public profile or application blast. We only follow up when a human sees a credible fit, and every intro still requires your approval.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Free for candidates.</strong> Always. No fee, ever.</li>' +
      '<li><strong>One clear next step.</strong> After an intro, Demigod follows the agreed checkpoint through interview, offer, hire, or a clear pass.</li>' +
      '<li><strong>See the company and exact role first.</strong> Then approve or pass privately; no rejection trail.</li>' +
      '</ul>' +
      '<p class="dg-p-note">No board spam or cold-LinkedIn blasts. What we ask: the work you want next, evidence from work you have done, availability, work setup, and a cash band — enough to compare with the role goal and constraints, not keywords. <a href="/how" data-dg-page="how">How it works →</a> · <a href="/faq" data-dg-page="faq">FAQ →</a></p>',
  },
  contact: {
    title: 'Contact',
    doc: 'Contact · Demigod',
    desc: 'Reach Demigod by email — potter@trydemigod.com. A human replies, no bots.',
    html:
      '<p class="dg-p-lead">Email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. A human replies.</p>',
  },
  legal: {
    title: 'Privacy & Terms',
    doc: 'Legal · Demigod',
    desc: 'Demigod’s plain-language privacy policy and terms for SF startup and talent matching: what we collect, how intros work, and how to reach us with questions.',
    html:
      '<h2 class="dg-p-h3">Privacy</h2>' +
      '<p><strong>Effective July 20, 2026.</strong> We collect the contact details, company or work background, location and availability, work evidence, and résumé file or link you choose to submit. We use them for human review, matching, mutual-intro decisions, service messages, and service protection.</p>' +
      '<p>Demigod, Webflow, and our email provider process submissions. After a startup requests an intro, we may privately show its company identity and role facts to the candidate. Candidate identity, contact details, résumé, and work links are not shared with the startup until the candidate approves that exact role. We do not sell contact lists or use submissions for unrelated marketing.</p>' +
      '<p>A referral link carries an opaque attribution code. The person or company that shared it may receive a financial benefit if an eligible referral leads to a retained hire. Referral status does not change candidate evaluation or candidate cost.</p>' +
      '<p>A temporary same-tab draft is kept in your browser session and cleared after confirmed submission.</p>' +
      '<p>We retain submissions while providing matching, handling an introduction, and meeting legitimate operational or recordkeeping needs, then delete or de-identify data when it is no longer needed. Shareable résumé links remain subject to the storage provider you chose.</p>' +
      '<p>Request access, correction, or deletion at <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. We will confirm the action and any data we must retain for legal or transaction records.</p>' +
      '<h2 class="dg-p-h3">Terms</h2><p>Demigod introduces parties; employment decisions are yours. Placement fee is 10% of first-year base salary, excluding equity, discretionary bonus, commission, and benefits, when a hire starts (unless written otherwise). Commercial confirmations arrive by email. SF Bay Area focus. No SLA promises on response time.</p>',
  },
  refer: {
    title: 'Make one strong introduction',
    doc: 'Referrals · Demigod',
    desc: 'Give someone a private, free path to SF startup roles. Approved referrers may earn a share of Demigod’s fee after a durable paid hire.',
    html:
      '<p class="dg-p-lead">Know someone who could thrive at an SF Bay startup? Give them a private, free way to be considered. They submit their own profile, nothing is shared until they approve an intro, and any reward comes from Demigod’s fee—not their pay.</p>' +
      '<h2 class="dg-p-h3">How it works</h2>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Request one approved link.</strong> We agree simple written terms and provide one honest message.</li>' +
      '<li><strong>Share it personally.</strong> Send it only to someone genuinely likely to benefit. They complete their own profile and can remove incorrect attribution; never upload a résumé for them.</li>' +
      '<li><strong>Demigod does the rest.</strong> A human reviews them, both sides approve any intro, and reward eligibility begins only after a hire completes 90 days and our related fee is paid and retained.</li>' +
      '</ol>' +
      '<p><strong>Approved individual talent referrers may receive 20% of Demigod’s net placement fee.</strong> This is 20% of Demigod’s fee—never the candidate’s salary or offer. Candidates never pay and are reviewed the same either way. Self-referrals, contact uploads, and multi-level rewards are not allowed.</p>' +
      '<p class="dg-p-note"><strong>Written terms control.</strong> Payout automation is not live; eligibility and observed payments are recorded in a private ledger. Approved hiring-partner rewards remain company credits and follow the same 90-day, fee-paid-and-retained condition.</p>' +
      '<h2 class="dg-p-h3">The message stays honest</h2>' +
      '<p class="dg-p-note">“I may receive a referral reward if this leads to a successful Demigod hire. It comes from Demigod’s fee, not your pay, and does not change how you are evaluated.”</p>' +
      '<h2 class="dg-p-h3">Request a referral link</h2>' +
      '<p class="dg-p-note">This requests review; it does not create or approve a link.</p>' +
      '<div id="dg-referral-form-slot"><p id="dg-referral-form-fallback"><a href="mailto:potter@trydemigod.com?subject=Talent%20referrer%20link%20request">Email a referral-link request →</a></p></div>',
  },
  about: {
    title: 'About',
    doc: 'About · Demigod',
    desc: 'Software compares role and talent evidence; a human decides what to propose. Both sides approve before every intro.',
    html:
      '<p class="dg-p-lead">Demigod compares role and talent evidence for SF startups. A human decides what to propose, and both sides approve before every intro.</p>' +
      '<ul class="dg-p-list"><li>Define measurable success before requirements</li><li>Both sides approve the same role truth before every intro</li><li>10% of first-year base salary when a hire starts</li></ul>',
  },

  map: {
    title: 'SF tech company directory',
    doc: 'SF tech company directory · Demigod',
    desc: 'A plain, searchable directory of SF Bay tech companies from public open data plus reviewed startup submissions. Add an unlisted startup.',
    html: dgMapEventsHtml('startups'),
  },
  sample: {
    title: 'Sample matches',
    doc: 'Sample matches · Demigod',
    desc: 'Fictional match and pass notes show how Demigod weighs evidence, constraints, and risk — no fake placements.',
    html:
      '<p class="dg-p-lead"><strong>Fictional examples.</strong> Before deciding, the candidate sees the company and exact role receipt: first result, must-haves, work arrangement, base range, and interview path. These are not live people, roles, or placements.</p>' +
      '<h2 class="dg-p-h3">A useful match</h2>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Outcome:</strong> ship self-serve onboarding and move activation from 28% to 40%.</li>' +
      '<li><strong>Evidence:</strong> this builder previously led an onboarding redesign that moved activation from 28% to 40%, including instrumentation and rollout.</li>' +
      '<li><strong>Constraints:</strong> SF hybrid · $180–210k cash · available in four weeks.</li>' +
      '<li><strong>Interview path:</strong> founder chat → paid work sample → final; target decision in two weeks.</li>' +
      '<li><strong>Risk to test:</strong> the prior result came at a later-stage company; confirm ownership in a smaller team.</li>' +
      '<li><strong>Private choice:</strong> approve a conversation or pass. The candidate decides independently.</li>' +
      '</ul>' +
      '<h2 class="dg-p-h3">A useful pass</h2>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Looks close:</strong> strong onboarding work, the right base salary range, and SF availability.</li>' +
      '<li><strong>Why not:</strong> the role needs hands-on event instrumentation now; the evidence shows strategy and rollout ownership, not implementation.</li>' +
      '<li><strong>Decision:</strong> do not force an intro. Keep both profiles private and reconsider only if the role or evidence changes.</li>' +
      '</ul>' +
      '<p class="dg-p-note">Real activity appears only when it happens; Demigod never invents placements or candidate volume.</p>',
  },
  event: {
    title: 'Event invite',
    doc: 'Event · Demigod',
    desc: 'RSVP for a Demigod SF night. Real name and email only — no fake counts.',
    html:
      '<p class="dg-p-lead" id="dg-ev-pub-title">Loading invite…</p>' +
      '<p class="dg-p-note" id="dg-ev-pub-meta"></p>' +
      '<p class="dg-ev-pill" id="dg-ev-pub-pill" role="note">San Francisco · in-person</p>' +
      '<div id="dg-ev-pub-body" class="dg-ev-pub"></div>' +
      '<form class="dg-ev-form" id="dg-ev-rsvp-form" style="margin-top:1rem">' +
      '<input type="hidden" id="dg-ev-rsvp-eid" name="eventId" />' +
      '<label class="dg-ev-lab" for="dg-ev-rsvp-name">Your name</label>' +
      '<input class="dg-ev-in" id="dg-ev-rsvp-name" name="name" required maxlength="80" autocomplete="name" />' +
      '<label class="dg-ev-lab" for="dg-ev-rsvp-email">Email</label>' +
      '<input class="dg-ev-in" id="dg-ev-rsvp-email" name="email" type="email" required maxlength="120" autocomplete="email" />' +
      '<label class="dg-ev-lab" for="dg-ev-rsvp-note">Note (optional)</label>' +
      '<input class="dg-ev-in" id="dg-ev-rsvp-note" name="note" maxlength="400" placeholder="Dietary / access / intro" />' +
      '<button type="submit" class="dg-ev-submit" id="dg-ev-rsvp-submit">RSVP yes</button>' +
      '<p class="dg-ev-msg" id="dg-ev-rsvp-msg" role="status" aria-live="polite"></p>' +
      '</form>' +
      '<p class="dg-p-note">Demigod Events — real RSVPs only. We do not invent guest counts.</p>',
  },
  events: {
    title: 'SF events',
    doc: 'SF events · Demigod',
    desc: 'Browse human-reviewed SF tech events or submit yours. Demigod never publishes, books, or messages guests for you.',
    html: dgMapEventsHtml('events'),
  },
  notfound: {
    title: 'Page not found',
    doc: 'Not found · Demigod',
    desc: 'That Demigod page does not exist. Home, hire, or talent paths are below.',
    html:
      '<p class="dg-p-lead">No page at this address. Useful paths:</p>' +
      '<ul class="dg-p-list">' +
      '<li><a href="/" data-dg-page-home="1">Home</a></li>' +
      '<li><a href="/how" data-dg-page="how">How it works</a></li>' +
      '<li><a href="/hire" data-dg-page="hire">Hire talent</a></li>' +
      '<li><a href="/talent" data-dg-page="talent">Open to the right startup?</a></li>' +
      '<li><a href="/events" data-dg-page="events">SF events</a></li>' +
      '</ul>',
  },
  press: {
    title: 'Press kit',
    doc: 'Press kit · Demigod',
    desc: 'One-liner, mark, and contact for Demigod — SF startup talent matching.',
    html:
      '<p class="dg-p-lead"><strong>Demigod</strong> compares role and talent evidence; a human decides what to propose. 10% of first-year base salary when a hire starts.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>One-liner:</strong> SF startup talent matching — private profiles, mutual yes, 10% of first-year base salary when a hire starts.</li>' +
      '<li><strong>Site:</strong> <a href="https://www.trydemigod.com">trydemigod.com</a></li>' +
      '<li><strong>Contact:</strong> <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></li>' +
      '<li><strong>Mark:</strong> gold geometric D on dark — same favicon/hero brand on the site.</li>' +
      '</ul>' +
      '<p class="dg-p-note">No headcount, SLA, or placement claims for press unless we send a dated receipt.</p>',
  },
};
function pageCss() {
  // Track foot version so chrome/class polish re-injects after every foot bump (no hardcode drift).
  var ver = String(window.__dgFootVer || window.dgFootVersion || '').replace(/^v/i, '') || '0';
  var existing = q('#dg-page-css');
  if (existing && existing.getAttribute('data-v') === ver) return;
  if (existing) existing.remove();
  var s = document.createElement('style');
  s.id = 'dg-page-css';
  s.setAttribute('data-v', ver);
  s.textContent =
    'body.dg-page-on>[data-dg-hidden="dg-page"]{display:none!important}' +
    '#dg-page{position:relative;z-index:10050;background:#060606;min-height:100vh;overflow:visible;padding:1rem;animation:dg-page-in .25s ease both}' +
    '#dg-page .dg-page-card{max-width:34rem;margin:2rem auto;background:#121212;border:1px solid rgba(201,168,76,.28);border-radius:16px;padding:1.35rem 1.35rem 1.5rem;color:#F5F0E6;box-shadow:0 20px 60px rgba(0,0,0,.45)}' +
    '#dg-page p,#dg-page li{hyphens:none;-webkit-hyphens:none}' +
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
    '#dg-page .dg-page-ctas{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.15rem}' +
    '#dg-page .dg-page-ctas a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1.15rem;border-radius:12px;font-weight:700;text-decoration:none!important}' +
    '#dg-page .dg-page-ctas a.hire{background:#C9A84C;color:#0A0A0A}' +
    '#dg-page .dg-page-ctas a.talent{border:1.5px solid rgba(201,168,76,.9);color:#E8D5A3}' +
    '#dg-page .dg-page-ctas a.back{color:#A8A29E;border:1px solid rgba(168,162,158,.35);font-weight:600}' +
    '#dg-page a{color:#C9A84C}' +
    '#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}' +
    '@keyframes dg-page-in{from{opacity:0}to{opacity:1}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page{animation:none}}' +
    '@media(forced-colors:active){#dg-page{background:Canvas!important;forced-color-adjust:auto}#dg-page .dg-page-card,#dg-page .dg-page-x,#dg-page .dg-page-ctas a{border:1px solid CanvasText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid Highlight!important}}' +
    /* Events Bot — gold Demigod system (FOCUS: never phosphor MUD green) */
    '#dg-page.dg-page-events{background:radial-gradient(120% 80% at 80% 0%,rgba(201,168,76,.09),transparent 55%),#060606!important}' +
    '#dg-page.dg-page-events .dg-page-card{max-width:min(44rem,96vw);border-color:rgba(201,168,76,.38);' +
    'background:linear-gradient(180deg,#161412 0%,#121212 40%,#0e0e12 100%);box-shadow:0 24px 70px rgba(0,0,0,.5),inset 0 1px 0 rgba(201,168,76,.1)}' +
    '#dg-page.dg-page-events h1{font-family:Cinzel,Georgia,serif!important;color:#C9A84C!important;letter-spacing:.04em;' +
    'font-size:clamp(1.35rem,3.5vw,1.75rem)!important}' +
    '#dg-page.dg-page-events .dg-p-lead{color:#D6D3D1}' +
    '#dg-page.dg-page-events .dg-p-lead strong{color:#E8D5A3}' +
    '#dg-page.dg-page-events .dg-page-x{border-color:rgba(201,168,76,.5);color:#C9A84C}' +
    /* kill any leaked phosphor on events page only */
    '#dg-page.dg-page-events,#dg-page.dg-page-events *{--dg-phosphor:#C9A84C;--dg-signal:#E8D5A3}' +
    '#dg-page.dg-page-events a:not(.dg-ev-cta-pri):not(.dg-page-ctas a){color:#E8D5A3}' +
    '#dg-page .dg-ev-hero{position:relative;height:8.25rem;margin:-.35rem 0 1.1rem;border-radius:14px;border:1px solid rgba(201,168,76,.3);' +
    'background:linear-gradient(115deg,#0A0A0A 0%,#14110c 42%,rgba(201,168,76,.16) 100%),' +
    'radial-gradient(ellipse 70% 55% at 78% 35%,rgba(201,168,76,.2),transparent 62%);' +
    'box-shadow:inset 0 1px 0 rgba(232,213,163,.12),0 10px 28px rgba(0,0,0,.35);overflow:hidden}' +
    '#dg-page .dg-ev-hero::after{content:"DEMIGOD · EVENTS";position:absolute;left:1rem;bottom:.85rem;' +
    'font-family:Cinzel,Georgia,serif;font-size:.72rem;font-weight:700;letter-spacing:.18em;color:rgba(201,168,76,.85)}' +
    '#dg-page .dg-ev-hero::before{content:"";position:absolute;right:-10%;top:-30%;width:55%;height:140%;' +
    'background:radial-gradient(circle,rgba(201,168,76,.18),transparent 68%);pointer-events:none}' +
    '#dg-page .dg-ev-pill{display:inline-flex;align-items:center;margin:0 0 .85rem;padding:.28rem .75rem;border-radius:999px;' +
    'border:1px solid rgba(201,168,76,.42);color:#C9A84C;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;' +
    'background:rgba(201,168,76,.06)}' +
    '#dg-page .dg-ev-trust{margin:.05rem 0 1rem;color:#CFC8BC}' +
    '#dg-page .dg-ev-cta-band{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.25rem}' +
    '#dg-page .dg-ev-cta-pri{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1.2rem;border-radius:12px;' +
    'background:linear-gradient(180deg,#E8D5A3 0%,#C9A84C 100%);color:#0A0A0A!important;font-weight:700;text-decoration:none!important;' +
    'box-shadow:0 6px 18px rgba(201,168,76,.22)}' +
    '#dg-page .dg-ev-cta-sec{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1rem;border-radius:12px;' +
    'border:1.5px solid rgba(201,168,76,.55);color:#E8D5A3!important;font-weight:650;text-decoration:none!important;background:rgba(201,168,76,.04)}' +
    '#dg-page .dg-ev-cta-pri:hover,#dg-page .dg-ev-cta-sec:hover{transform:translateY(-1px)}' +
    '#dg-page .dg-ev-cta-pri:focus-visible,#dg-page .dg-ev-cta-sec:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-events-chat{margin:0 0 1.35rem;border:1px solid rgba(201,168,76,.32);border-radius:14px;background:#141210;overflow:hidden;' +
    'box-shadow:0 14px 44px rgba(0,0,0,.4),inset 0 1px 0 rgba(201,168,76,.08)}' +
    '#dg-page .dg-ec-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.75rem .95rem;' +
    'border-bottom:1px solid rgba(201,168,76,.2);background:linear-gradient(90deg,rgba(201,168,76,.08),rgba(201,168,76,.02))}' +
    '#dg-page .dg-ec-title{color:#C9A84C;font-family:Cinzel,Georgia,serif;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600}' +
    '#dg-page .dg-ec-status{color:#A8A29E;font-size:.72rem}' +
    '#dg-page .dg-ec-note{margin:0;padding:.55rem .95rem;font-size:.84rem;color:#A8A29E;line-height:1.45;border-bottom:1px solid rgba(201,168,76,.12)}' +
    '#dg-page .dg-ec-log{max-height:min(48vh,360px);overflow:auto;padding:.75rem .95rem;border-top:1px solid rgba(201,168,76,.2);display:flex;flex-direction:column;gap:.55rem}' +
    '#dg-page .dg-ec-log:empty{display:none}' +
    '#dg-page .dg-ec-msg{max-width:92%;padding:.6rem .75rem;border-radius:12px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ec-msg.bot{align-self:flex-start;background:rgba(201,168,76,.09);border:1px solid rgba(201,168,76,.24);color:#F5F0E6}' +
    '#dg-page .dg-ec-msg.user{align-self:flex-end;background:rgba(201,168,76,.16);border:1px solid rgba(201,168,76,.35);color:#E8D5A3}' +
    '#dg-page .dg-ec-form{display:grid;grid-template-columns:1fr auto;gap:.65rem;padding:.85rem .95rem}' +
    '#dg-page .dg-ev-prompt{display:grid;gap:.3rem}' +
    '#dg-page .dg-ec-input{width:100%;min-height:48px;resize:vertical;background:#0A0A0A;border:1px solid rgba(201,168,76,.32);border-radius:12px;' +
    'color:#F5F0E6;padding:.6rem .75rem;font-size:16px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ec-input:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-ec-send{min-height:48px;min-width:10rem;padding:0 1rem;border-radius:12px;border:1px solid #C9A84C;align-self:end;' +
    'background:linear-gradient(180deg,#E8D5A3,#C9A84C);color:#0A0A0A;font-family:Manrope,system-ui,sans-serif;font-weight:700;cursor:pointer}' +
    '#dg-page .dg-ec-send:hover{box-shadow:0 8px 24px rgba(201,168,76,.28)}' +
    '#dg-page .dg-ec-send:disabled{opacity:.55;cursor:wait}' +
    '#dg-page .dg-ev-cycle{grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr))!important}' +
    '#dg-page.dg-page-events .dg-ev-cycle>li{border-color:rgba(201,168,76,.28);background:rgba(201,168,76,.05)}' +
    '#dg-page.dg-page-events .dg-ev-cycle span{color:#C9A84C}' +
    '#dg-page .dg-ev-tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin:.65rem 0 .5rem}' +
    '#dg-page .dg-ev-tab{min-height:48px;padding:.45rem .9rem;border-radius:12px;border:1px solid rgba(201,168,76,.38);background:transparent;' +
    'color:#E8D5A3;font-weight:650;cursor:pointer;font-family:Manrope,system-ui,sans-serif;transition:border-color .18s,background .18s}' +
    '#dg-page .dg-ev-tab.is-on{background:rgba(201,168,76,.2);border-color:rgba(201,168,76,.8);color:#C9A84C}' +
    '#dg-page .dg-ev-offers{margin:.35rem 0 0;padding:1rem;border:1px solid rgba(201,168,76,.28);border-radius:14px;background:rgba(14,14,18,.95)}' +
    '#dg-page .dg-ev-form{display:grid;gap:.35rem}' +
    '#dg-page .dg-ev-lab{font-size:.78rem;color:#A8A29E;margin-top:.3rem}' +
    '#dg-page .dg-ev-in{width:100%;min-height:48px;padding:.6rem .75rem;border-radius:12px;border:1px solid rgba(201,168,76,.3);' +
    'background:#0A0A0A;color:#F5F0E6;font-size:16px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-ta{min-height:5.5rem;resize:vertical}' +
    '#dg-page .dg-ev-in:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-community-submit{margin:1.35rem 0 0;padding:clamp(.85rem,2vw,1.2rem);border:1px solid rgba(201,168,76,.28);border-radius:14px;background:#141210}' +
    '#dg-page .dg-submit-grid{display:grid;gap:.65rem}.dg-submit-grid details{border:1px solid rgba(201,168,76,.22);border-radius:12px;background:#0e0e0e;padding:.75rem}.dg-submit-grid summary{min-height:44px;color:#E8D5A3;font-weight:700;cursor:pointer;display:flex;align-items:center}.dg-community-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin-top:.7rem}.dg-community-form label{display:grid;gap:.28rem;color:#CFC8BC;font-size:.8rem}.dg-community-form label:has(textarea),.dg-community-form .dg-ev-submit,.dg-community-form .dg-submit-msg{grid-column:1/-1}.dg-submit-msg{min-height:1.3rem;margin:0;color:#A8A29E}.dg-submit-msg.ok{color:#A6FFCB}.dg-submit-msg.err{color:#ffb4a2}.dg-manage-card{display:grid;gap:.55rem;margin:.65rem 0;padding:.7rem;border:1px solid rgba(201,168,76,.2);border-radius:10px}.dg-manage-card :is(h3,h4){margin:0!important;color:#F5F0E6!important;font-size:.95rem!important}' +
    '#dg-page .dg-ev-submit{min-height:48px;margin-top:.6rem;border-radius:12px;border:1px solid #C9A84C;' +
    'background:linear-gradient(180deg,#E8D5A3,#C9A84C);color:#0A0A0A;font-weight:700;cursor:pointer;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-submit-ghost{background:transparent;color:#C9A84C}' +
    '#dg-page .dg-ev-submit:disabled{opacity:.55;cursor:wait}' +
    '#dg-page .dg-ev-msg{min-height:1.2rem;font-size:.84rem;color:#A8A29E;margin:.4rem 0 0}' +
    '#dg-page .dg-ev-msg.ok{color:#E8D5A3}' +
    '#dg-page .dg-ev-msg.err{color:#ffb4a2}' +
    '#dg-page #dg-referral-form-slot{margin-top:.7rem}' +
    '#dg-page #dg-referral-form-slot>.w-form{margin:0}' +
    '#dg-page #dg-referral-form-slot>.dg-referral-mounted{display:block!important;visibility:visible!important}' +
    '#dg-page #dg-referral-form-slot .dg-community-form{grid-template-columns:1fr}' +
    '#dg-page #dg-referral-form-slot .w-form-done,#dg-page #dg-referral-form-slot .w-form-fail{margin-top:.7rem;border-radius:12px}' +
    '#dg-page .dg-ev-counts{font-size:.8rem;color:#A8A29E;margin:.5rem 0 1rem}' +
    '#dg-page .dg-ev-extra{display:grid;gap:0;margin:1.1rem 0 1.25rem}' +
    '#dg-page .dg-ev-mini{padding:.35rem 0 .65rem}' +
    '#dg-page .dg-ev-status{margin:.35rem 0 1.15rem;padding:.75rem .95rem;border-radius:12px;border:1px solid rgba(201,168,76,.28);' +
    'background:rgba(201,168,76,.08);color:#A8A29E;font-size:.88rem;line-height:1.45}' +
    '#dg-page .dg-ev-cycle>li.is-current{border-color:rgba(201,168,76,.75)!important;background:rgba(201,168,76,.14)!important}' +
    '#dg-page .dg-ev-cycle>li.is-current strong{color:#C9A84C}' +
    '#dg-page .dg-ev-cal{margin:0 0 1.35rem;padding:1rem;border:1px solid rgba(201,168,76,.28);border-radius:14px;background:rgba(14,14,18,.95)}' +
    '#dg-page .dg-ev-cal-nav{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:0 0 .65rem}' +
    '#dg-page .dg-ev-cal-month{margin:0;font-family:Cinzel,Georgia,serif;font-size:1.05rem;color:#E8D5A3;font-weight:600}' +
    '#dg-page .dg-ev-cal-navbtn{min-width:48px;min-height:48px;border-radius:12px;border:1px solid rgba(201,168,76,.38);background:transparent;color:#C9A84C;font-size:1.35rem;cursor:pointer}' +
    '#dg-page .dg-ev-cal-navbtn:hover{background:rgba(201,168,76,.12)}' +
    '#dg-page .dg-ev-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin:0 0 .35rem;text-align:center;font-size:.72rem;color:#A8A29E;font-weight:650}' +
    '#dg-page .dg-ev-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}' +
    '#dg-page .dg-ev-cal-cell{min-height:3.1rem;padding:.25rem .2rem;border-radius:10px;border:1px solid rgba(201,168,76,.14);background:#0A0A0A;color:#F5F0E6;font-size:.82rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-cal-cell:hover{border-color:rgba(201,168,76,.48)}' +
    '#dg-page .dg-ev-cal-cell.is-out{opacity:.35;cursor:default}' +
    '#dg-page .dg-ev-cal-cell.is-today{border-color:rgba(201,168,76,.6);box-shadow:inset 0 0 0 1px rgba(201,168,76,.28)}' +
    '#dg-page .dg-ev-cal-cell.is-sel{background:rgba(201,168,76,.18);border-color:#C9A84C;color:#E8D5A3}' +
    '#dg-page .dg-ev-cal-cell:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}' +
    '#dg-page .dg-ev-cal-dots{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;min-height:8px}' +
    '#dg-page .dg-ev-cal-dot{width:5px;height:5px;border-radius:50%;background:#C9A84C}' +
    '#dg-page .dg-ev-cal-n{font-size:.65rem;color:#C9A84C;font-weight:700;line-height:1}' +
    '#dg-page .dg-ev-cal-daypanel{margin-top:.85rem;padding-top:.75rem;border-top:1px solid rgba(201,168,76,.2)}' +
    '#dg-page .dg-ev-cal-daylabel{margin:0 0 .45rem;color:#E8D5A3;font-weight:650;font-size:.92rem}' +
    '#dg-page .dg-ev-cal-list{list-style:none;margin:0 0 .75rem;padding:0;display:grid;gap:.4rem}' +
    '#dg-page .dg-ev-cal-list li{padding:.55rem .7rem;border-radius:10px;border:1px solid rgba(201,168,76,.24);background:rgba(201,168,76,.07);color:#F5F0E6;font-size:.88rem;line-height:1.35}' +
    '#dg-page .dg-ev-cal-list li strong{color:#C9A84C;font-weight:650}' +
    '#dg-page .dg-ev-cal-list li em{color:#A8A29E;font-style:normal;font-size:.8rem}' +
    '#dg-page .dg-ev-cal-empty{color:#A8A29E;font-size:.86rem;margin:0 0 .65rem}' +
    '#dg-page .dg-ev-cal-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}' +
    '#dg-page .dg-ev-cal-add{margin-top:.25rem}' +
    '@media(max-width:520px){#dg-page .dg-ev-cal-row,#dg-page .dg-ec-form,#dg-page .dg-community-form{grid-template-columns:1fr}#dg-page .dg-ec-send{width:100%}#dg-page .dg-ev-cal-cell{min-height:2.75rem;font-size:.75rem}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page .dg-ev-cta-pri,#dg-page .dg-ev-cta-sec,#dg-page .dg-ev-tab{transition:none;transform:none!important}}' +
    '#dg-page .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}';
  document.head.appendChild(s);
}
/* Public event invite + RSVP. */
function eventsBotPublicInviteMount(root) {
  if (!root || root.dataset.dgEvPub === '1') return;
  root.dataset.dgEvPub = '1';
  var params = new URLSearchParams(location.search);
  var eid = (params.get('id') || '').trim();
  var titleEl = root.querySelector('#dg-ev-pub-title');
  var metaEl = root.querySelector('#dg-ev-pub-meta');
  var bodyEl = root.querySelector('#dg-ev-pub-body');
  var form = root.querySelector('#dg-ev-rsvp-form');
  var msg = root.querySelector('#dg-ev-rsvp-msg');
  var hid = root.querySelector('#dg-ev-rsvp-eid');
  function setMsg(t, kind) {
    if (!msg) return;
    msg.textContent = t || '';
    msg.className = 'dg-ev-msg' + (kind === 'err' ? ' err' : kind === 'ok' ? ' ok' : '');
  }
  if (!eid) {
    if (titleEl) titleEl.textContent = 'Invite not found';
    if (metaEl) metaEl.textContent = 'Missing event id in the URL (?p=event&id=…).';
    if (form) form.style.display = 'none';
    return;
  }
  if (hid) hid.value = eid;
  dgEventsBotPickBase(4000)
    .then(function (pick) {
      if (!pick || !pick.base) throw new Error('no base');
      return dgEventsBotFetch(pick.base + '/public-event?id=' + encodeURIComponent(eid), {});
    })
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      if (!j || !j.ok || !j.event) {
        if (titleEl) titleEl.textContent = 'Invite not found';
        if (metaEl) metaEl.textContent = 'This event is missing or not public yet.';
        if (form) form.style.display = 'none';
        return;
      }
      var ev = j.event;
      var STAGES = ['ideate', 'resource', 'plan', 'rsvp', 'run', 'followup', 'debrief'];
      var stageIdx = STAGES.indexOf(ev.stage);
      var preRsvp = stageIdx >= 0 && stageIdx < STAGES.indexOf('rsvp');
      if (titleEl) titleEl.textContent = ev.title || 'SF night';
      if (metaEl) {
        metaEl.textContent =
          (ev.city || 'San Francisco') +
          (ev.seats ? ' · ~' + ev.seats + ' seats' : '') +
          (ev.rsvpOpen && ev.rsvpYes != null ? ' · ' + ev.rsvpYes + ' yes' : '') +
          (ev.rsvpOpen ? ' · RSVP open' : preRsvp ? ' · venue pending' : ' · RSVP closed');
      }
      if (bodyEl) {
        bodyEl.textContent = '';
        [
          ['For', ev.audience && ev.audience.summary],
          ['Outcome', ev.outcome],
          ['Venue', ev.venue && ev.venue.name],
        ].forEach(function (item) {
          if (!item[1]) return;
          var p = document.createElement('p');
          var strong = document.createElement('strong');
          p.className = 'dg-p-note';
          strong.textContent = item[0] + ':';
          p.appendChild(strong);
          p.appendChild(document.createTextNode(' ' + String(item[1])));
          bodyEl.appendChild(p);
        });
      }
      if (form && !ev.rsvpOpen) {
        form.style.display = 'none';
        setMsg(
          preRsvp
            ? 'Still lining up a venue for this night — RSVPs open once it is confirmed.'
            : 'RSVPs are closed for this night.',
          'err',
        );
      }
    })
    .catch(function () {
      if (titleEl) titleEl.textContent = 'Events API offline';
      if (metaEl) metaEl.textContent = 'Try again when the Events Bot API is up.';
      if (form) form.style.display = 'none';
    });
  if (form)
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.busy === '1') return;
      form.dataset.busy = '1';
      var rsvpBtn = root.querySelector('#dg-ev-rsvp-submit');
      if (rsvpBtn) rsvpBtn.disabled = true;
      form.setAttribute('aria-busy', 'true');
      setMsg('Sending RSVP…');
      var payload = {
        eventId: (root.querySelector('#dg-ev-rsvp-eid') || {}).value || eid,
        name: (root.querySelector('#dg-ev-rsvp-name') || {}).value || '',
        email: (root.querySelector('#dg-ev-rsvp-email') || {}).value || '',
        note: (root.querySelector('#dg-ev-rsvp-note') || {}).value || '',
      };
      dgEventsBotPickBase(4000)
        .then(function (pick) {
          if (!pick || !pick.base) throw new Error('no base');
          return dgEventsBotFetch(pick.base + '/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': '1' },
            body: JSON.stringify(payload),
          });
        })
        .then(function (r) {
          return r.json().then(function (j) {
            return { status: r.status, j: j };
          });
        })
        .then(function (x) {
          if (!x.j || !x.j.ok) {
            setMsg((x.j && (x.j.error || x.j.message)) || 'RSVP failed', 'err');
            return;
          }
          setMsg(x.j.updated ? 'RSVP updated — see you there.' : 'RSVP recorded — see you there.', 'ok');
          try {
            form.querySelectorAll('input:not([type=hidden]),textarea').forEach(function (el) {
              if (el.id !== 'dg-ev-rsvp-eid') el.value = '';
            });
          } catch (err) {}
        })
        .catch(function () {
          setMsg('Could not reach Events API.', 'err');
        })
        .finally(function () {
          form.dataset.busy = '';
          if (rsvpBtn) rsvpBtn.disabled = false;
          form.setAttribute('aria-busy', 'false');
        });
    });
}
/* Community event and startup submissions + reviewed listings. */
function communitySubmissionsMount(root) {
  var eventForm = root && root.querySelector('#dg-event-submit');
  var startupForm = root && root.querySelector('#dg-startup-submit');
  var manage = root && root.querySelector('#dg-event-manage');
  // v805: either form may be absent (page-scoped submit). Bind once per page root.
  if ((!eventForm && !startupForm) || (root && root.dataset.communityBound === '1')) return;
  if (root) root.dataset.communityBound = '1';
  if (eventForm) eventForm.dataset.bound = '1';
  if (startupForm) startupForm.dataset.bound = '1';
  // ponytail: page-local fallback; merge storage events only if cross-tab management matters.
  var storageKey = 'dg-event-management-v1', memory;
  function credentials() {
    if (memory) return memory;
    try { var rows = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(rows) ? rows.slice(-20) : []; } catch (e) { return []; }
  }
  function remember(row) {
    var rows = credentials().filter(function (item) { return item.id !== row.id; });
    rows.push(row); memory = rows.slice(-20);
    try { localStorage.setItem(storageKey, JSON.stringify(memory)); return true; } catch (e) { return false; }
  }
  function managementLink(row) {
    return location.href.split('#')[0] + '#dg-manage=' + encodeURIComponent(JSON.stringify([row.id, row.manageToken]));
  }
  try {
    var encodedCredential = location.hash.match(/^#dg-manage=(.+)$/);
    if (encodedCredential) {
      var imported = JSON.parse(decodeURIComponent(encodedCredential[1]));
      if (Array.isArray(imported) && imported.length === 2 && /^(?:evt|startup)_/.test(imported[0]) && imported[1]) {
        if (remember({ id: imported[0], manageToken: imported[1] })) history.replaceState(null, '', location.pathname + location.search);
      }
    }
  } catch (e) {}
  async function post(path, body) {
    var picked = await dgEventsBotPickBase(4000);
    if (!picked || !picked.base) throw new Error('Submission service is offline');
    var response = await dgEventsBotFetch(picked.base + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}), signal: AbortSignal.timeout(15000),
    });
    var json = await response.json().catch(function () { return { ok: false, error: 'Invalid response' }; });
    if (!response.ok || json.ok === false) throw new Error(json.error || 'Submission failed');
    return json;
  }
  async function get(path) {
    var picked = await dgEventsBotPickBase(4000);
    if (!picked || !picked.base) throw new Error('Submission service is offline');
    var response = await dgEventsBotFetch(picked.base + path, { signal: AbortSignal.timeout(15000) });
    var json = await response.json().catch(function () { return { ok: false }; });
    if (!response.ok || json.ok === false) throw new Error('Listings unavailable');
    return json;
  }
  function publicLink(value) {
    try { var url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (e) { return ''; }
  }
  function syncEventRequirements(form) {
    var format = form && form.querySelector('[name=format]');
    var venue = form && form.querySelector('[name=venue]');
    var destination = form && form.querySelector('[name=destination]');
    var external = form && form.querySelector('[name=externalUrl]');
    if (venue) venue.required = !!(format && /^(in-person|hybrid)$/.test(format.value));
    if (external) external.required = !!(destination && destination.value !== 'demigod');
  }
  function icsText(value) { return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
  function icsDate(value) { var date = new Date(value); return isNaN(date) ? '' : date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function eventTimeHtml(value) { var date = new Date(value); if (isNaN(date)) return esc(value || 'Date to be announced'); var text = date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); return '<time datetime="' + esc(date.toISOString()) + '">' + esc(text) + '</time>'; }
  function foldIcsLine(line) { var bytes = new TextEncoder().encode(line), decoder = new TextDecoder(), parts = [], offset = 0, limit = 75; while (offset < bytes.length) { var end = Math.min(offset + limit, bytes.length); while (end < bytes.length && (bytes[end] & 192) === 128) end--; parts.push(decoder.decode(bytes.slice(offset, end))); offset = end; limit = 74; } return parts.join('\r\n '); }
  function eventIcs(row, now) {
    var start = icsDate(row && row.startsAt); if (!start) return '';
    var link = publicLink(row.externalUrl), uid = String(row.id || start).replace(/[^A-Za-z0-9_-]/g, '') || start;
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Demigod//Community Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + uid + '@trydemigod.com', 'DTSTAMP:' + icsDate(now || new Date()), 'DTSTART:' + start, 'SUMMARY:' + icsText(row.title || 'Demigod community event')];
    if (row.venue) lines.push('LOCATION:' + icsText(row.venue));
    var description = String(row.details || '') + (link ? (row.details ? '\n' : '') + link : '');
    if (description) lines.push('DESCRIPTION:' + icsText(description));
    if (link) lines.push('URL:' + link);
    return lines.concat(['END:VEVENT', 'END:VCALENDAR']).map(foldIcsLine).join('\r\n') + '\r\n';
  }
  function icsFilename(row) { var slug = String(row.title || 'demigod-event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'demigod-event'; return slug + '-' + String(row.startsAt).slice(0, 10) + '.ics'; }
  var eventCalendarRows = Object.create(null);
  var listingsBox = root.querySelector('#dg-community-listings');
  if (listingsBox && listingsBox.dataset.calendarBound !== '1') {
    listingsBox.dataset.calendarBound = '1';
    listingsBox.addEventListener('click', function (event) {
      var button = event.target.closest('[data-event-ics]'); if (!button) return;
      var row = eventCalendarRows[button.getAttribute('data-event-ics')], ics = row && eventIcs(row); if (!ics) return;
      var href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      var download = document.createElement('a'); download.href = href; download.download = icsFilename(row); document.body.appendChild(download); download.click(); download.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
    });
  }
  async function renderListings() {
    var box = root.querySelector('#dg-community-listings');
    if (!box) return;
    var kind = box.getAttribute('data-kind') || 'both';
    var showEvents = kind === 'both' || kind === 'events';
    var showStartups = kind === 'both' || kind === 'startups';
    try {
      var settled = await Promise.allSettled([
        showEvents ? get('/community-events') : Promise.resolve({ events: [] }),
        showStartups ? get('/community-startups') : Promise.resolve({ startups: [] }),
      ]);
      var eventsOk = showEvents && settled[0].status === 'fulfilled', startupsOk = showStartups && settled[1].status === 'fulfilled';
      var events = eventsOk ? (settled[0].value.events || []) : [], startups = startupsOk ? (settled[1].value.startups || []) : [];
      eventCalendarRows = Object.create(null); events.forEach(function (row) { eventCalendarRows[row.id] = row; });
      if (startupsOk) {
        window.dgCommunityStartups = startups;
        if (window.DemigodStartupMap && window.DemigodStartupMap.addCommunityStartups) window.DemigodStartupMap.addCommunityStartups(startups);
      }
      var title = kind === 'events' ? 'Reviewed events' : kind === 'startups' ? 'Reviewed startup submissions' : 'Community listings';
      box.innerHTML = '<h2 id="dg-community-listings-title" class="dg-p-h3">' + title + '</h2>' +
        (showEvents ? (eventsOk ? (events.length ? (kind === 'both' ? '<h3>Reviewed events</h3>' : '') + events.map(function (row) { var link = publicLink(row.externalUrl), calendar = icsDate(row.startsAt) ? '<button class="dg-ev-submit dg-p-cta" type="button" data-event-ics="' + esc(row.id) + '" aria-label="Add ' + esc(row.title) + ' to calendar">Add to calendar (.ics)</button>' : ''; return '<article class="dg-manage-card"><h4>' + esc(row.title) + '</h4><p class="dg-p-note">' + eventTimeHtml(row.startsAt) + (row.venue ? ' · ' + esc(row.venue) : '') + '</p>' + (row.details ? '<p>' + esc(row.details) + '</p>' : '') + (link ? '<a class="dg-p-cta" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer ugc nofollow">Open event</a>' : '') + calendar + '</article>'; }).join('') : '<p class="dg-p-note">No reviewed community events yet.</p>') : '<p class="dg-p-note" role="status">Reviewed events could not load right now.</p>') : '') +
        (showStartups ? (startupsOk ? (startups.length ? (kind === 'both' ? '<h3>Reviewed startup submissions</h3>' : '') + startups.map(function (row) { var link = publicLink(row.website); return '<article class="dg-manage-card"><h4>' + esc(row.name) + '</h4><p class="dg-p-note">' + esc(row.neighborhood || 'SF neighborhood not provided') + ' · hiring reported by submitter: ' + esc(row.hiring || 'unknown') + '</p>' + (row.description ? '<p>' + esc(row.description) + '</p>' : '') + (link ? '<a class="dg-p-cta" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer ugc nofollow">Visit startup</a>' : '') + '</article>'; }).join('') : '<p class="dg-p-note">No reviewed startup submissions yet.</p>') : '<p class="dg-p-note" role="status">Reviewed startup submissions could not load right now.</p>') : '');
    } catch (error) { box.innerHTML = '<h2 id="dg-community-listings-title" class="dg-p-h3">Community listings</h2><p class="dg-p-note">Reviewed listings could not load right now.</p>'; }
  }
  function values(form) { var out = Object.fromEntries(new FormData(form).entries()); if (out.startsAt) { var date = new Date(out.startsAt); if (!isNaN(date)) out.startsAt = date.toISOString(); } return out; }
  function localDateTime(value) { var date = new Date(value); return isNaN(date) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function message(form, text, ok) {
    var node = form.querySelector('.dg-submit-msg');
    node.textContent = text; node.className = 'dg-submit-msg ' + (ok ? 'ok' : 'err');
  }
  async function renderManage() {
    var pageKind = (listingsBox && listingsBox.getAttribute('data-kind')) || 'both';
    var rows = credentials().filter(function (row) {
      var startup = /^startup_/.test(row.id);
      return !((pageKind === 'events' && startup) || (pageKind === 'startups' && !startup));
    });
    if (!rows.length) return;
    manage.parentElement.hidden = false;
    manage.innerHTML = '<p class="dg-p-note">Loading saved submissions…</p>';
    var loaded = await Promise.all(rows.map(function (row) {
      var startup = /^startup_/.test(row.id);
      return post(startup ? '/startup-submission/read' : '/event-submission/read', { id: row.id, manageToken: row.manageToken })
        .then(function (result) { return { credential: row, event: result.event, startup: result.startup }; })
        .catch(function () { return null; });
    }));
    loaded = loaded.filter(Boolean);
    if (!loaded.length) {
      manage.innerHTML = pageKind === 'events'
        ? '<p class="dg-p-note">No reachable event submissions are saved in this browser.</p>'
        : pageKind === 'startups'
          ? '<p class="dg-p-note">No reachable startup submissions are saved in this browser.</p>'
          : '<p class="dg-p-note">No reachable submissions are saved in this browser.</p>';
      return;
    }
    manage.innerHTML = loaded.map(function (item) {
      if (item.startup) {
        var company = item.startup;
        return '<form class="dg-manage-card" data-id="' + esc(company.id) + '"><h3>' + esc(company.name) + '</h3><p class="dg-p-note">Status: ' + esc(company.status) + '</p>' +
          '<label>Startup name<input class="dg-ev-in" name="name" value="' + esc(company.name) + '" maxlength="160" required></label><label>Website<input class="dg-ev-in" name="website" type="url" value="' + esc(company.website || '') + '" required placeholder="https://"></label><label>SF neighborhood<input class="dg-ev-in" name="neighborhood" value="' + esc(company.neighborhood || '') + '" required maxlength="120"></label>' +
          '<label>Hiring?<select class="dg-ev-in" name="hiring">' + [['yes','Yes'],['no','No'],['unknown','Not sure']].map(function (option) { return '<option value="' + option[0] + '"' + (company.hiring === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('') + '</select></label><label>What should people know?<textarea class="dg-ev-in" name="description" rows="3" required maxlength="1200">' + esc(company.description || '') + '</textarea></label><button class="dg-ev-submit" type="submit">Save changes</button> ' +
          (company.status === 'withdrawn' ? '<span class="dg-p-note">Saving changes will resubmit this startup for review.</span>' : '<button type="button" data-withdraw="1">Withdraw startup submission</button>') + '<p class="dg-submit-msg" role="status" aria-live="polite"></p></form>';
      }
      var ev = item.event;
      return '<form class="dg-manage-card" data-id="' + esc(ev.id) + '"><h3>' + esc(ev.title) + '</h3><p class="dg-p-note">Status: ' + esc(ev.status) + ' · destination: ' + esc(ev.destination) + '</p>' +
        '<label>Title<input class="dg-ev-in" name="title" value="' + esc(ev.title) + '" maxlength="120" required></label><label>Date and time (your local timezone) *<input class="dg-ev-in" name="startsAt" type="datetime-local" value="' + esc(localDateTime(ev.startsAt)) + '" required></label><label>Format *<select class="dg-ev-in" name="format" required>' + [['','Select'],['in-person','In person'],['online','Online'],['hybrid','Hybrid']].map(function (option) { return '<option value="' + option[0] + '"' + (ev.format === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('') + '</select></label><label>Venue or neighborhood<input class="dg-ev-in" name="venue" value="' + esc(ev.venue || '') + '" maxlength="180"></label><label>Who is it for? *<input class="dg-ev-in" name="audience" value="' + esc(ev.audience || '') + '" required maxlength="240"></label><label>Capacity (optional)<input class="dg-ev-in" name="seats" type="number" min="1" step="1" value="' + esc(ev.seats || '') + '"></label>' +
        '<label>Destination<select class="dg-ev-in" name="destination">' + [['demigod','trydemigod.com'],['luma','Luma only'],['partiful','Partiful only'],['demigod+luma','trydemigod.com + Luma'],['demigod+partiful','trydemigod.com + Partiful']].map(function (option) { return '<option value="' + option[0] + '"' + (ev.destination === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('') + '</select></label>' +
        '<label>Existing Luma or Partiful link<input class="dg-ev-in" name="externalUrl" type="url" value="' + esc(ev.externalUrl || '') + '" placeholder="https://"></label><label>Details *<textarea class="dg-ev-in" name="details" rows="3" required maxlength="2000">' + esc(ev.details || '') + '</textarea></label><button class="dg-ev-submit" type="submit">Save changes</button> ' +
        (ev.status === 'withdrawn' ? '<span class="dg-p-note">Saving changes will resubmit this event for review.</span>' : '<button type="button" data-withdraw="1">Withdraw Demigod submission</button>') + '<p class="dg-submit-msg" role="status" aria-live="polite"></p></form>';
    }).join('');
    manage.querySelectorAll('.dg-manage-card').forEach(function (form, index) {
      var isStartup = !!loaded[index].startup;
      if (!isStartup) {
        syncEventRequirements(form);
        form.addEventListener('change', function () { syncEventRequirements(form); });
      }
      function setBusy(on) {
        form.dataset.busy = on ? '1' : '';
        form.setAttribute('aria-busy', String(on));
        form.querySelectorAll('button').forEach(function (button) { button.disabled = on; });
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault(); if (form.dataset.busy === '1') return; setBusy(true);
        try {
          var result = await post(isStartup ? '/startup-submission/manage' : '/event-submission/manage', { id: loaded[index].credential.id, manageToken: loaded[index].credential.manageToken, patch: values(form) });
          await renderManage();
          var refreshed = manage.querySelector('.dg-manage-card[data-id="' + (result.event || result.startup).id + '"]');
          if (refreshed) { message(refreshed, result.message, true); refreshed.querySelector('[type=submit]').focus(); }
          await renderListings();
        }
        catch (error) { setBusy(false); message(form, error.message, false); }
      });
      var withdraw = form.querySelector('[data-withdraw]');
      if (withdraw) withdraw.addEventListener('click', async function () {
        if (form.dataset.busy === '1') return;
        if (!window.confirm(isStartup ? 'Withdraw this startup submission from Demigod?' : 'Withdraw this submission from Demigod? This does not cancel an event on Luma or Partiful.')) return;
        setBusy(true);
        try { await post(isStartup ? '/startup-submission/withdraw' : '/event-submission/withdraw', { id: loaded[index].credential.id, manageToken: loaded[index].credential.manageToken }); await Promise.all([renderManage(), renderListings()]); }
        catch (error) { setBusy(false); message(form, error.message, false); }
      });
    });
  }
  if (eventForm) {
    eventForm.addEventListener('submit', async function (event) {
      event.preventDefault(); if (eventForm.dataset.busy === '1') return; eventForm.dataset.busy = '1'; var button = eventForm.querySelector('button'); button.disabled = true; eventForm.setAttribute('aria-busy', 'true'); message(eventForm, 'Submitting…', true);
      try { var result = await post('/event-submission', values(eventForm)); var credential = { id: result.event.id, manageToken: result.manageToken }; var saved = remember(credential); message(eventForm, result.message + (saved ? '' : ' Your browser blocked saving its management key. Email potter@trydemigod.com with event id ' + result.event.id + ' to edit or withdraw it later.'), true); var receipt=eventForm.querySelector('.dg-submit-msg');if(receipt){var privateLink=document.createElement('a');privateLink.href=managementLink(credential);privateLink.textContent='Private management link — save this';privateLink.style.display='block';privateLink.target='_blank';privateLink.rel='noopener noreferrer';receipt.appendChild(privateLink);privateLink.focus();} eventForm.reset(); syncEventRequirements(eventForm); await renderManage(); }
      catch (error) { message(eventForm, error.message + '. Email potter@trydemigod.com if it persists.', false); }
      finally { button.disabled = false; eventForm.dataset.busy = ''; eventForm.setAttribute('aria-busy', 'false'); }
    });
    syncEventRequirements(eventForm);
    eventForm.addEventListener('change', function () { syncEventRequirements(eventForm); });
  }
  if (startupForm) {
    startupForm.addEventListener('submit', async function (event) {
      event.preventDefault(); if (startupForm.dataset.busy === '1') return; startupForm.dataset.busy = '1'; var button = startupForm.querySelector('button'); button.disabled = true; startupForm.setAttribute('aria-busy', 'true'); message(startupForm, 'Submitting…', true);
      try { var result = await post('/startup-submission', values(startupForm)); var credential = { id: result.startup.id, manageToken: result.manageToken }; var saved = remember(credential); message(startupForm, result.message + (saved ? '' : ' Your browser blocked saving its management key. Email potter@trydemigod.com with startup id ' + result.startup.id + ' to edit or withdraw it later.'), true); var receipt=startupForm.querySelector('.dg-submit-msg');if(receipt){var privateLink=document.createElement('a');privateLink.href=managementLink(credential);privateLink.textContent='Private management link — save this';privateLink.style.display='block';privateLink.target='_blank';privateLink.rel='noopener noreferrer';receipt.appendChild(privateLink);privateLink.focus();} startupForm.reset(); await renderManage(); }
      catch (error) { message(startupForm, error.message + '. Email potter@trydemigod.com if it persists.', false); }
      finally { button.disabled = false; startupForm.dataset.busy = ''; startupForm.setAttribute('aria-busy', 'false'); }
    });
  }
  if (manage) renderManage().catch(function () { manage.innerHTML = '<p class="dg-p-note">Saved submissions could not load right now.</p>'; });
  renderListings();
}

/* v606: [el, prevInlineDisplay, prevPriority] for the body children openPage() hid inline.
   Shared by openPage/closePage; must outlive both calls. */
var dgPageHidden = [];
var dgReferralFormNode = null;
var dgReferralFormMarker = null;
var dgReferralFormState = null;
function parkReferralForm() {
  if (!dgReferralFormNode || !dgReferralFormMarker || !dgReferralFormMarker.parentNode) return;
  dgReferralFormMarker.parentNode.insertBefore(dgReferralFormNode, dgReferralFormMarker.nextSibling);
  dgReferralFormNode.classList.remove('dg-referral-mounted');
  if (dgReferralFormState.hidden) dgReferralFormNode.setAttribute('hidden', '');
  else dgReferralFormNode.removeAttribute('hidden');
  if (dgReferralFormState.display) dgReferralFormNode.style.setProperty('display', dgReferralFormState.display, dgReferralFormState.priority || '');
  else dgReferralFormNode.style.removeProperty('display');
  if (dgReferralFormState.ariaHidden == null) dgReferralFormNode.removeAttribute('aria-hidden');
  else dgReferralFormNode.setAttribute('aria-hidden', dgReferralFormState.ariaHidden);
}
function mountReferralForm(root) {
  var slot = root && root.querySelector('#dg-referral-form-slot');
  if (!slot) return;
  var form = q('form#partner-apply,form[data-name="partner-apply"]');
  var source = q('#dg-referral-form-source');
  if (!form && source) form = source.matches('form') ? source : source.querySelector('form');
  if (!form) return;
  var visibleFields = [].slice.call(form.querySelectorAll('input[name]:not([type="hidden"]):not([type="submit"]):not([type="button"]),textarea[name],select[name]'));
  var expectedFields = ['partner-name', 'partner-email', 'referral-plan'];
  if (!form.getAttribute('data-wf-element-id') || form.getAttribute('data-name') !== 'partner-apply' ||
      visibleFields.length !== expectedFields.length ||
      expectedFields.some(function (name) { return !visibleFields.some(function (field) { return field.name === name; }); })) return;
  var wrap = (source && (source.matches('.w-form') ? source : source.closest('.w-form'))) || form.closest('.w-form');
  if (!wrap || !wrap.parentNode) return;
  if (!dgReferralFormMarker) {
    dgReferralFormNode = wrap;
    dgReferralFormMarker = document.createComment('dg-referral-form-home');
    wrap.parentNode.insertBefore(dgReferralFormMarker, wrap);
    dgReferralFormState = {
      hidden: wrap.hasAttribute('hidden'),
      display: wrap.style.display,
      priority: wrap.style.getPropertyPriority('display'),
      ariaHidden: wrap.getAttribute('aria-hidden'),
    };
  }
  [
    ['partner-name', 'text', 'name', 120],
    ['partner-email', 'email', 'email', 160],
    ['referral-plan', '', '', 1200],
  ].forEach(function (spec) {
    var field = form.querySelector('[name="' + spec[0] + '"]');
    if (!field) return;
    field.required = true;
    field.maxLength = spec[3];
    if (spec[1] && field.tagName === 'INPUT') field.type = spec[1];
    if (spec[2]) field.setAttribute('autocomplete', spec[2]);
    field.classList.add('dg-ev-in');
    if (field.tagName === 'TEXTAREA') field.classList.add('dg-ev-ta');
  });
  if (!form.querySelector('[name="partner-type"]')) {
    var type = document.createElement('input');
    type.type = 'hidden';
    type.name = 'partner-type';
    type.value = 'refer-talent';
    form.appendChild(type);
  }
  form.classList.add('dg-community-form');
  form.setAttribute('aria-label', 'Referral link request');
  formAttribution(form);
  var submit = form.querySelector('[type="submit"]');
  if (submit) {
    submit.classList.add('dg-ev-submit');
    if ('value' in submit) submit.value = 'Request a referral link';
    else submit.textContent = 'Request a referral link';
  }
  var done = wrap.querySelector('.w-form-done');
  var fail = wrap.querySelector('.w-form-fail');
  if (done) {
    (done.querySelector('div') || done).textContent = 'Request received. A human reviews every request. potter@trydemigod.com follows up if approved.';
    done.setAttribute('role', 'status');
    done.setAttribute('aria-live', 'polite');
    done.setAttribute('aria-label', 'Referral link request success');
  }
  if (fail) {
    (fail.querySelector('div') || fail).textContent = 'Something went wrong. Please try again or email potter@trydemigod.com.';
    fail.setAttribute('role', 'alert');
    fail.setAttribute('aria-live', 'assertive');
    fail.setAttribute('aria-label', 'Referral link request failure');
  }
  wrap.removeAttribute('hidden');
  wrap.removeAttribute('aria-hidden');
  wrap.style.removeProperty('display');
  wrap.classList.add('dg-referral-mounted');
  slot.textContent = '';
  slot.appendChild(wrap);
}
/* v851: while a product page is open, retag home H1s as <p> so DOM has exactly one H1 (#dg-page).
   seo-audit counts querySelectorAll('h1') (not visibility). Restore on close. */
function demoteHomeH1s() {
  qa('h1').forEach(function (h) {
    if (!h || !h.parentNode) return;
    if (h.closest && h.closest('#dg-page')) return;
    var p = document.createElement('p');
    p.setAttribute('data-dg-was-h1', '1');
    if (h.id) p.id = h.id;
    if (h.className) p.className = h.className;
    for (var i = 0; i < h.attributes.length; i++) {
      var a = h.attributes[i];
      if (!a || a.name === 'id' || a.name === 'class' || a.name === 'data-dg-was-h1') continue;
      try { p.setAttribute(a.name, a.value); } catch (e) {}
    }
    while (h.firstChild) p.appendChild(h.firstChild);
    h.parentNode.replaceChild(p, h);
  });
}
function restoreHomeH1s() {
  qa('[data-dg-was-h1="1"]').forEach(function (p) {
    if (!p || !p.parentNode) return;
    var h = document.createElement('h1');
    if (p.id) h.id = p.id;
    if (p.className) h.className = p.className;
    for (var i = 0; i < p.attributes.length; i++) {
      var a = p.attributes[i];
      if (!a || a.name === 'id' || a.name === 'class' || a.name === 'data-dg-was-h1') continue;
      try { h.setAttribute(a.name, a.value); } catch (e) {}
    }
    while (p.firstChild) h.appendChild(p.firstChild);
    p.parentNode.replaceChild(h, p);
  });
}
/* v851: FAQPage JSON-LD from DG_PAGES.faq details (rich results). */
function injectFaqJsonLd() {
  try {
    var old = q('#dg-faq-jsonld');
    if (old) old.remove();
    var html = (DG_PAGES.faq && DG_PAGES.faq.html) || '';
    var items = [];
    var re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi;
    var m;
    while ((m = re.exec(html))) {
      var qq = String(m[1] || '').replace(/<[^>]+>/g, '').trim();
      var aa = String(m[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (qq && aa) items.push({ q: qq, a: aa });
    }
    if (!items.length) return;
    var mainEntity = items.map(function (it) {
      return { '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } };
    });
    var ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: mainEntity };
    var el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'dg-faq-jsonld';
    el.textContent = JSON.stringify(ld).replace(/</g, '\\u003c');
    document.head.appendChild(el);
  } catch (e) {}
}
function removeFaqJsonLd() {
  try {
    var old = q('#dg-faq-jsonld');
    if (old) old.remove();
  } catch (e) {}
}
function closePage() {
  parkReferralForm();
  var el = q('#dg-page');
  if (el) el.remove();
  /* v606: restore the sections we hid inline, or the homepage stays blank forever. Preserve the
     exact prior inline value+priority because another runtime owner may have set it. */
  try {
    (dgPageHidden || []).forEach(function (rec) {
      var el = rec[0]; if (!el) return;
      if (rec[1]) el.style.setProperty('display', rec[1], rec[2] || '');
      else el.style.removeProperty('display');
      /* Only clear OUR marker — hero() legitimately sets data-dg-hidden on sections it collapses
         (v565), and stripping those would un-collapse the homepage. */
      if (el.getAttribute('data-dg-hidden') === 'dg-page') el.removeAttribute('data-dg-hidden');
    });
  } catch (e) {}
  dgPageHidden = [];
  try { restoreHomeH1s(); } catch (e) {}
  try { removeFaqJsonLd(); } catch (e) {}
  if (document.body) { document.body.classList.remove('dg-page-on'); document.body.style.overflow = ''; }
  try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){}
  try {
    var u = new URL(location.href);
    var path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    var hardRoute = Boolean(DG_PAGE_PATHS[path]);
    if (hardRoute) u.pathname = '/';
    if (hardRoute || u.searchParams.has('p') || u.searchParams.has('page') || (history.state && history.state.dgPage)) {
      u.searchParams.delete('p');
      u.searchParams.delete('page');
      history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
    }
  } catch (e) {}
  try {
    document.title = window.__dgPagePrevTitle || 'Demigod · SF startup talent matching';
    window.__dgPagePrevTitle=null;
  } catch (e) {}
  try {
    var md2=document.querySelector('meta[name=description]');
    if(md2 && window.__dgPagePrevDesc!=null){ md2.setAttribute('content', window.__dgPagePrevDesc); window.__dgPagePrevDesc=null; }
  } catch (e) {}
  try {
    if (window.__dgPagePrevSocial) {
      Object.keys(window.__dgPagePrevSocial).forEach(function(sel){
        var el = document.querySelector(sel);
        if (el) el.setAttribute('content', window.__dgPagePrevSocial[sel]);
      });
      window.__dgPagePrevSocial = null;
    }
  } catch (e) {}
  try {
    if (window.__dgPagePrevCanonical) {
      var can2 = document.querySelector('link[rel=canonical]');
      if (can2) can2.setAttribute('href', window.__dgPagePrevCanonical);
      window.__dgPagePrevCanonical = null;
    }
  } catch (e) {}
  try {
    var returnFocus=window.__dgPageReturnFocus;
    window.__dgPageReturnFocus=null;
    if(returnFocus&&returnFocus.isConnected&&typeof returnFocus.focus==='function') returnFocus.focus();
  } catch (e) {}
}
function pageCtas(id) {
  var hire =
    '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">'+COPY.ctaFounder+'</a>';
  var talent =
    '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">'+COPY.ctaEngineer+'</a>';
  var back = '<a class="back" href="/" id="dg-page-back">← Home</a>';
  if (id === 'hire') return '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief</a>' + talent + back;
  if (id === 'talent') return talent + hire + back;
  if (id === 'events' || id === 'refer') return back;
  return hire + talent + back;
}
function startupMapAssetUrl(){
  var loader=q('#demigod-foot-cdn-loader'),src=loader&&loader.src;
  return src&&/\/foot-latest\.js(?:[?#]|$)/.test(src)?new URL('startup-map-latest.js',src).href:'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@01767fdf70e6/startup-map-latest.js';
}
var dgStartupMapLoading=null;
function startupMapMount(root) {
  var host=root&&root.querySelector('#dg-startup-map');
  if(!host)return;
  if(window.DemigodStartupMap){window.DemigodStartupMap.mount(host);return;}
  if(!dgStartupMapLoading){
    dgStartupMapLoading=new Promise(function(resolve,reject){
      var script=document.createElement('script');
      script.id='dg-startup-map-loader';
      script.src=startupMapAssetUrl();
      script.async=true;
      script.onload=function(){window.DemigodStartupMap?resolve():reject(new Error('Startup directory API missing'));};
      script.onerror=function(){reject(new Error('Startup directory script failed'));};
      document.head.appendChild(script);
    });
  }
  dgStartupMapLoading.then(function(){if(host.isConnected)window.DemigodStartupMap.mount(host);}).catch(function(){
    dgStartupMapLoading=null;
    var failed=q('#dg-startup-map-loader');if(failed)failed.remove();
    if(!host.isConnected)return;
    host.innerHTML='<p class="dg-p-lead" role="alert">The tech company directory could not load.</p><button type="button" class="dg-page-x" id="dg-startup-map-retry">Retry</button>';
    var retry=host.querySelector('#dg-startup-map-retry');if(retry)retry.onclick=function(){startupMapMount(root);};
  });
}
function openPage(id, push) {
  var meta = DG_PAGES[id];
  if (!meta) return false;
  if(!q('#dg-page')) window.__dgPageReturnFocus=document.activeElement;
  pageCss();
  parkReferralForm();
  var old = q('#dg-page');
  if (old) old.remove();
  var root = document.createElement('div');
  root.id = 'dg-page';
  /* v606: a real in-flow page, not a dialog. aria-modal="true" told screen readers the rest of
     the document was inert — a lie for a page with its own URL (/events, /?p=events). role=main
     + the page <h1> is the honest semantic. Home nav stays reachable. */
  root.setAttribute('role', 'main');
  root.setAttribute('aria-label', meta.title);
  if (id === 'events') root.classList.add('dg-page-events');
  if (id === 'event') root.classList.add('dg-page-events');
  if (id === 'map') root.classList.add('dg-page-map');
  root.innerHTML =
    '<div class="dg-page-card"><div class="dg-page-top"><h1>' +
    meta.title +
    '</h1><button type="button" class="dg-page-x" aria-label="Close">✕</button></div>' +
    (meta.html || '') +
    '<div class="dg-page-ctas">' +
    pageCtas(id) +
    '</div></div>';
  document.body.appendChild(root);
  /* v606: no scroll lock — a page scrolls with the document. Hide the Webflow homepage sections
     inline rather than covering them with a fixed overlay. */
  document.body.classList.add('dg-page-on');
  try {
    /* openPage can run twice (deepLink on boot, then a nav click). Without this guard the second
       pass captures the ALREADY-HIDDEN display:none as the "prior" value, and closePage then
       faithfully restores none — leaving the homepage blank. Capture once per open. */
    if (!dgPageHidden.length)
    [].slice.call(document.body.children).forEach(function (el) {
      var t = el.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' || t === 'NOSCRIPT') return;
      if (el.id === 'dg-page') return;
      dgPageHidden.push([el, el.style.display, el.style.getPropertyPriority('display')]);
      el.style.setProperty('display', 'none', 'important');
      /* Mark only the homepage nodes this product page owns so CSS and closePage share one hook. */
      el.setAttribute('data-dg-hidden', 'dg-page');
    });
  } catch (e) {}
  try { demoteHomeH1s(); } catch (e) {}
  try { if (id === 'faq') injectFaqJsonLd(); else removeFaqJsonLd(); } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}
  /* Mini-pages are injected after boot; run the idempotent reveal observer on their content. */
  try { addMotion(); } catch (e) {}
  try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}
  /* v848: ensure title/description/canonical/OG exist per mini-page (create if Webflow omitted). */
  try {
    if(!window.__dgPagePrevTitle) window.__dgPagePrevTitle=document.title;
    document.title = meta.doc || ((meta.title || id) + ' · Demigod');
  } catch (e) {}
  try {
    var md = document.querySelector('meta[name=description]');
    if (!md) { md = document.createElement('meta'); md.setAttribute('name','description'); document.head.appendChild(md); }
    if (meta.desc) {
      if(window.__dgPagePrevDesc==null) window.__dgPagePrevDesc=md.getAttribute('content')||'';
      md.setAttribute('content', meta.desc);
    }
  } catch (e) {}
  try {
    window.__dgPagePrevSocial = window.__dgPagePrevSocial || {};
    function ensureMeta(sel, attr, key) {
      var el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      if (!(sel in window.__dgPagePrevSocial)) window.__dgPagePrevSocial[sel] = el.getAttribute('content') || '';
      return el;
    }
    ensureMeta('meta[property="og:title"]','property','og:title').setAttribute('content', meta.doc || document.title);
    ensureMeta('meta[property="og:description"]','property','og:description').setAttribute('content', meta.desc || '');
    ensureMeta('meta[name="twitter:title"]','name','twitter:title').setAttribute('content', meta.doc || document.title);
    ensureMeta('meta[name="twitter:description"]','name','twitter:description').setAttribute('content', meta.desc || '');
    ensureMeta('meta[property="og:type"]','property','og:type').setAttribute('content', 'website');
    ensureMeta('meta[name="twitter:card"]','name','twitter:card').setAttribute('content','summary_large_image');
    var ogImg=document.querySelector('meta[property="og:image"]');
    var imgUrl=ogImg&&ogImg.getAttribute('content');
    if(imgUrl){
      ensureMeta('meta[name="twitter:image"]','name','twitter:image').setAttribute('content',imgUrl);
    }
  } catch (e) {}
  try {
    /* Prefer hard path (/events) over /?p= when we own a clean route. */
    var preferred = { how:'/how', pricing:'/pricing', hire:'/hire', talent:'/talent', faq:'/faq', legal:'/legal', refer:'/refer', about:'/about', events:'/events', map:'/startups', contact:'/contact', sample:'/sample', press:'/press', private:'/private', notfound:'/' };
    var pathNow = (location.pathname || '/').replace(/\/+$/, '') || '/';
    /* v860: an ALIAS must not claim canonical for itself. DG_PAGE_PATHS declares 36 paths across ~19
       routes, so /referral, /referrals and /partners are all route 'refer', and /press-kit and
       /media are both 'press'. Keying canonical off "is this path declared for this route" made
       every one of them self-canonical, i.e. 9 live indexable URLs each asserting it was the
       original. It only looked correct because the paths the head shim redirects (/pilot, /network)
       lose their pathname before this runs and fell through to `preferred`. Measured 2026-07-31:
       /how-it-works canonicalised to itself while rendering 708 chars and 0 step cards against
       /how's 861 and 3. The route's preferred path is the canonical; the current path is only a
       fallback for routes that have none. All 18 preferred targets verified live 200 first — a
       canonical pointing at a 404 would be worse than the duplication it fixes. */
    var pagePath = preferred[id] || ((DG_PAGE_PATHS[pathNow] === id && pathNow !== '/') ? pathNow : ('/?p=' + id));
    var pageUrl = 'https://www.trydemigod.com' + (pagePath.charAt(0) === '/' ? pagePath : '/' + pagePath);
    var can = document.querySelector('link[rel=canonical]');
    if (!can) { can = document.createElement('link'); can.setAttribute('rel','canonical'); document.head.appendChild(can); }
    if (!window.__dgPagePrevCanonical) window.__dgPagePrevCanonical = can.getAttribute('href') || '';
    can.setAttribute('href', pageUrl);
    window.__dgPagePrevSocial = window.__dgPagePrevSocial || {};
    function ensureUrlMeta(sel, attr, key) {
      var el = document.querySelector(sel);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      if (!(sel in window.__dgPagePrevSocial)) window.__dgPagePrevSocial[sel] = el.getAttribute('content') || '';
      el.setAttribute('content', pageUrl);
    }
    ensureUrlMeta('meta[property="og:url"]','property','og:url');
    ensureUrlMeta('meta[name="twitter:url"]','name','twitter:url');
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
      if (k === 'startup') show(S, a);
      else if (k === 'jobseeker') show(J, a);
    });
  });
  qa('a[data-dg-page]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var pid = a.getAttribute('data-dg-page');
      if (pid && DG_PAGES[pid]) openPage(pid, true);
    });
  });
  /* v859: prefer hard path in history (/startups not /?p=map) so deep links + nav share clean URLs. */
  try {
    var hard = preferred[id];
    var hash = location.hash || '';
    if (hard && hard.indexOf('?') < 0) {
      var nowP = (location.pathname || '/').replace(/\/+$/, '') || '/';
      var wantP = hard.replace(/\/+$/, '') || '/';
      if (nowP !== wantP || location.search) {
        if (push !== false) history.pushState({ dgPage: id }, '', hard + hash);
        else history.replaceState({ dgPage: id }, '', hard + hash);
      }
    } else if (push !== false) {
      var u = new URL(location.href);
      u.searchParams.set('p', id);
      history.pushState({ dgPage: id }, '', u.pathname + u.search + (u.hash || ''));
    }
  } catch (e) {}
  try {
    // Focus the page title, not the ✕ — focusing Close means Enter dismisses the page.
    var dgH = root.querySelector('h1,h2');
    if (dgH) { dgH.setAttribute('tabindex', '-1'); dgH.focus({ preventScroll: true }); }
    else root.querySelector('.dg-page-x').focus();
  } catch (e) {}
  // Atlas directory only on /?p=map (events has no #dg-startup-map host).
  if (id === 'map') {
    try { startupMapMount(root); } catch (eMap) {}
  }
  if (id === 'map' || id === 'events') {
    try { communitySubmissionsMount(root); } catch (e) {}
  }
  if (id === 'event') {
    try {
      eventsBotPublicInviteMount(root);
    } catch (e) {}
  }
  if (id === 'refer') {
    try { mountReferralForm(root); } catch (e) {}
  }
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
var DG_PAGE_PATHS = {
  '/startups': 'map',
  '/how': 'how',
  '/how-it-works': 'how',
  '/pricing': 'pricing',
  '/faq': 'faq',
  '/blog': 'how',
  '/notes': 'how',
  '/method': 'how',
  '/hire': 'hire',
  '/talent': 'talent',
  '/contact': 'contact',
  '/legal': 'legal',
  '/privacy': 'legal',
  '/refer': 'refer',
  '/referral': 'refer',
  '/referrals': 'refer',
  '/partners': 'refer',
  '/partnerships': 'refer',
  '/partnership': 'refer',
  '/compare': 'pricing',
  '/pilot': 'hire',
  '/network': 'talent',
  '/fees': 'pricing',
  '/security': 'legal',
  '/sample': 'sample',
  '/about': 'about',
  '/founders': 'hire',
  '/candidates': 'talent',
  '/engineers': 'talent',
  '/status': 'about',
  '/events': 'events',
  '/events-bot': 'events',
  '/event-bot': 'events',
  '/press': 'press',
  '/press-kit': 'press',
  '/media': 'press',
  '/private': 'private',
};
function routePages() {
  try {
    normalizeReferralParam();
    var p = new URLSearchParams(location.search);
    var id = (p.get('p') || p.get('page') || '').toLowerCase();
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    if (!id) id = DG_PAGE_PATHS[path] || '';
    if (id) id = DG_PAGE_PATHS['/' + id] || id;
    if (id && DG_PAGES[id]) {
      openPage(id, false);
      return true;
    }
    // soft 404 only for unknown non-root paths that are not site chrome
    if (path && path !== '/' && !/^\/(index\.html)?$/i.test(path) && !DG_PAGE_PATHS[path]) {
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
    if(h==='partnerships'||h==='partners'){ openPage('refer',false); window.__dgDeepLinked=1; return; }
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

function finalButtonLabels(){var a=q('#startup-hire [type=submit],#startup-modal form [type=submit]');if(a){a.value='Submit';a.textContent='Submit'}var b=q('#engineer-join [type=submit],#jobseeker-modal form [type=submit]');if(b){b.value='Submit';b.textContent='Submit'}var o=q('#startup-hire [name="90day-outcome"],#startup-modal [name="90day-outcome"]');if(o){o.placeholder='One concrete result';var l=o.id&&q('label[for="'+o.id+'"]');if(l)l.textContent='What should this person accomplish first?'}}
function orgJsonLd(){if(q('#dg-org-jsonld'))return;var ld=document.createElement('script');ld.type='application/ld+json';ld.id='dg-org-jsonld';ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':'https://www.trydemigod.com/#org',name:'Demigod',url:'https://www.trydemigod.com',email:'potter@trydemigod.com',description:'Software compares role and talent evidence; a human decides what to propose. 10% of first-year base salary when a hire starts.',areaServed:{'@type':'AdministrativeArea',name:'San Francisco Bay Area'}},{'@type':'WebSite','@id':'https://www.trydemigod.com/#website',url:'https://www.trydemigod.com',name:'Demigod',publisher:{'@id':'https://www.trydemigod.com/#org'},description:'SF startup talent matching — private profiles, mutual yes, 10% of first-year base salary when a hire starts.'}]});document.head.appendChild(ld)}


function wizResumeToast(modal){
  try{
    /* v646: fire only when wizBuild actually resumed a sessionStorage draft. The old guard read
       window.__dgWizStore (hardcoded false) and localStorage (wizBuild clears it), so v604's
       same-session resume silently jumped the user mid-form with no explanation. */
    if(!modal||modal.querySelector('#dg-wiz-resume'))return;
    var rf=modal.querySelector('form');
    if(!rf||rf.dataset.dgWizResumed!=='1')return;
    delete rf.dataset.dgWizResumed;
    var t=document.createElement('div');
    t.id='dg-wiz-resume';
    t.setAttribute('role','status');
    t.style.cssText='margin:0 0 .65rem;padding:.5rem .7rem;border-radius:10px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);color:#E8D5A3;font-size:.85rem;line-height:1.35;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem';
    var msg=document.createElement('span');
    msg.textContent='Draft restored — continue where you left off.';
    var restart=document.createElement('button');
    restart.type='button';
    restart.className='dg-wiz-restart';
    restart.textContent='Start over';
    restart.style.cssText='margin-left:auto;min-height:36px;padding:.25rem .65rem;border-radius:8px;border:1px solid rgba(201,168,76,.45);background:transparent;color:#E8D5A3;cursor:pointer;font:600 .78rem/1 var(--wiz-sans,system-ui,sans-serif)';
    restart.addEventListener('click',function(){
      try{
        sessionStorage.removeItem('dgWizSave_startup');
        sessionStorage.removeItem('dgWizSave_engineer');
        localStorage.removeItem('dgWizSave_startup');
        localStorage.removeItem('dgWizSave_engineer');
      }catch(e0){}
      try{
        rf.querySelectorAll('input,select,textarea').forEach(function(el){
          if(el.type==='hidden'||el.name==='form_version'||el.name==='cf-turnstile-response')return;
          if(el.type==='checkbox'||el.type==='radio')el.checked=false;
          else if(el.type==='file'){try{el.value='';}catch(e1){}}
          else el.value='';
        });
      }catch(e2){}
      t.remove();
      try{
        /* rebuild stepper from step 0 with empty answers */
        delete rf.dataset.dgWizBuilt;
        delete rf.dataset.dgWizResumed;
        var kind=rf.id==='engineer-join'||rf.closest('#jobseeker-modal')?'engineer':'startup';
        qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review,.dg-wiz-choices',rf).forEach(function(n){n.remove();});
        wizBuild(rf,kind);
      }catch(e3){}
    });
    t.appendChild(msg);
    t.appendChild(restart);
    var head=modal.querySelector('.dg-wiz-head')||modal.querySelector('h2')||modal.firstElementChild;
    if(head&&head.parentNode)head.parentNode.insertBefore(t, head.nextSibling);
    else modal.prepend(t);
  }catch(e){}
}
function wireLogoHome(){
  qa('a.w-nav-brand,a.nav_logo,a.nav_logo-link,.nav_logo-link,a.dg-logo,.logo-link').forEach(function(a){
    if(!a||a.dataset.dgLogo==='1')return;
    a.dataset.dgLogo='1';
    a.setAttribute('href','/');
    a.setAttribute('aria-label','Demigod home');
    a.addEventListener('click',function(e){
      if(q('#dg-page')){e.preventDefault();closePage();try{history.pushState({},'', '/')}catch(err){}}
    });
  });
}
function ensureReducedMotionHeroCss(){if(q('#dg-reduced-motion-hero'))return;var s=document.createElement('style');s.id='dg-reduced-motion-hero';s.textContent='@media(prefers-reduced-motion:reduce){.hero-section h1,.hero-section p,.header h1,.header p,.hero-actions,#dg-hero-chips,#dg-path-pills{animation:none!important;transition:none!important}}';document.head.appendChild(s)}
function ensureTapTargetCss(){if(q('#dg-tap-targets'))return;var s=document.createElement('style');s.id='dg-tap-targets';s.textContent='.hero-actions a[data-dg-cta],#dg-nav-hire,#dg-nav-talent,#dg-bar a{min-height:48px!important}a.nav_logo,a.footer_link{min-height:48px!important}';document.head.appendChild(s)}
function boot(){if(!document.body)return;run();ensureReducedMotionHeroCss();ensureTapTargetCss();finalButtonLabels();try{hero()}catch(e){}deepLink();try{document.body.classList.add('dg-ready');document.body.setAttribute('data-dg-ready','1')}catch(e){}try{if(window.requestIdleCallback)requestIdleCallback(function(){try{orgJsonLd()}catch(e){}});else setTimeout(function(){try{orgJsonLd()}catch(e){}},1200)}catch(e){}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',function(e){var c=e.target.closest('[class*=close],.modal_close,.w-modal-close');if(c&&c.closest(S+','+J)){e.preventDefault();OPEN=null;hide(true);return}
/* v195: never treat bare href=# as hire — only explicit modal targets */
var el=e.target.closest('[data-demigod-modal],a[href="'+S+'"],a[href="'+J+'"],a[href="#startup-modal"],a[href="#jobseeker-modal"]');
if(!el)return;
if(el.closest('a.dg-logo,.w-nav-brand,#dg-skip'))return;
var h=(el.getAttribute('href')||'').trim(),k=el.getAttribute('data-demigod-modal');
if(k==='startup'||h===S||h==='#startup-modal'){e.preventDefault();show(S, el)}
else if(k==='jobseeker'||h===J||h==='#jobseeker-modal'){e.preventDefault();show(J, el)}
},true);
document.addEventListener('input',function(e){if(OPEN&&e.target&&e.target.closest&&e.target.closest(S+','+J)){/*dg-wiz-err-clear*/try{var f=e.target.closest('form');var er=f&&f.querySelector('.dg-wiz-err,.dg-wiz-req-err'),eid=er&&er.id;if(er)er.remove();e.target.style.borderColor='';e.target.removeAttribute('aria-invalid');if(eid){var ids=(e.target.getAttribute('aria-describedby')||'').split(/\s+/).filter(function(id){return id&&id!==eid});if(ids.length)e.target.setAttribute('aria-describedby',ids.join(' '));else e.target.removeAttribute('aria-describedby')}}catch(err){}}},true);
document.addEventListener('keydown',function(e){if(e.defaultPrevented)return;if(e.key==='Escape'&&q('#dg-page')){closePage();return}if(e.key==='Escape'&&OPEN){OPEN=null;hide(true)}});
typeof window.addEventListener==='function'&&window.addEventListener('popstate',function(){/*dg-page-popstate*/ try{ if(!routePages()) closePage(); }catch(e){} });
window.__dgFootVer='903';console.log('Demigod v903');
window.__dgDedupe = dedupeAll;
window.__dgScrub = scrubStaticLabels;



})();
/*removed stray formSend per hygiene*/

/* cdn-bust-20260710-177a */
/* autopilot-cdn-bust-1783648396 */
