/*dg-foot-v1104-core*/
window.dgFootVersion = 'v1104'; console.log('[demigod] foot v1104-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null;
/* Use product route (same-origin /?p=) — never raw catbox .html (text/plain MIME) */

/* Dual paths: name the immediate action. Demigod has no public job board, application, or network membership to promise candidates. */
/* ==== SECTION: COPY (runtime marketing strings) ==== */
var MATCH_DISCLOSURE='Software compares role goals, skills, location, and compensation; a human decides what to propose and can explain why; nothing is sent automatically.';
var COPY={
heroSub:'SF Bay Area roles',
badge:'SF startup talent · software compares · humans review',
/* empty: hero() must not paint a second paragraph under the outcome line */
heroTrustLine:'',
antiLinkedIn:'No public profiles. No feed. No blasts. Mutual yes only — candidate identity stays private until both sides approve.',
ctaFounder:'Hire talent',
ctaEngineer:'Sign up to Demigod',
navCta:'Hire talent',
/* Risk-reversal microcopy under dual CTAs (research: objection text next to action beats audience-only labels). */
ctaHireHint:'Nothing until a hire starts',
ctaTalentHint:'Free · private · resume optional',
startupH2:'Hiring brief',
startupBody:'One role, real constraints, and one concrete first result. '+MATCH_DISCLOSURE,
engineerH2:'Private candidate details',
engineerBody:'Your details stay private — this is not a public profile. '+MATCH_DISCLOSURE,
feeNote:'10% of first-year base salary when a hire starts. Free for talent. Nothing until then.',
pricingNote:'10% of first-year base salary when a hire starts — nothing until then',
trustKicker:'How it works',
trustSteps:['Send a brief','A person picks','You both say yes'],



pathHow:'How it works',
pathSample:'Sample match',
pathStartups:'SF tech companies'
};
/* Frege-night WIZ copy (v597) — natural voice, match-critical only, no draft-save chrome */
/* Post-submit: name channel + next step; no SLA clock, no spam sequence (research 2026-08-06). */
var STARTUP_OK='Brief received. A human reads every submission. potter@trydemigod.com emails only when there is a real fit to discuss — no automated drip.';
var ENGINEER_OK='Saved privately. Startups do not see you until you approve an intro. potter@trydemigod.com reaches out only on real fits — free for talent, no blasts.';
var WIZ_THANKS={
  startup:{head:'Brief received',lead:'A human reads this next. You will hear from potter@trydemigod.com only if there is a real fit — not a spam sequence.',steps:['We calibrate the role, first result, and constraints','You review any proposed fit before we contact the candidate','The candidate sees company, exact role, and base cash band; intro only after both approve']},
  engineer:{head:'Profile saved',lead:'Not shared with startups until you approve an intro. Free for talent. No public profile, no blasts.',steps:['Demigod and its form provider process your answers for matching only','A human proposes only real fits — potter@trydemigod.com is the contact channel','You approve before any identifying details move']}
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
    /* First result before logistics: define “strong” before salary (intake research). */
    steps:[['welcome'],['role-title'],['company-name'],['company-stage'],['stack-needs'],['90day-outcome'],['work-location'],['salary-range'],['contact-email'],['__submit__'],['__thanks__']],
    welcome:{t:'Hiring brief',b:'~2 min · 8 short answers. One SF Bay permanent role, one concrete first result, mutual yes before intro. 10% of first-year base only when a hire starts. Press Enter to continue.',btn:'Start the brief'},
    thanks:STARTUP_OK,
    optional:[]
  },
  engineer:{
    steps:[['welcome'],['sf-bay'],['full-name'],['seeker-email'],['skills-stack'],['experience'],['proof-url'],['availability'],['salary-expectation'],['resume'],['__submit__'],['__thanks__']],
    welcome:{t:'Open to the right startup?',b:'~2 min · 9 short answers · 2 optional · free · private · resume optional. Software compares, a human proposes and can explain why, you approve every intro. Same email resubmits to update — not a public profile. Press Enter to continue.',btn:'Start privately'},
    thanks:ENGINEER_OK,
    optional:['resume','proof-url']
  }
};
/* ==== SECTION: WIZ_Q (questions + hints) ==== */
var WIZ_Q={
  startup:{
    'contact-email':{q:'Work email?',h:'Match notes only — not a list, not spam.'},
    'company-name':{q:'Company name?',h:'Legal or product name is fine.'},
    'company-stage':{q:'Company stage?',h:'Closest stage wins — we match to reality, not the pitch deck.'},
    'role-title':{q:'What role are you hiring?',h:'Be specific: founding engineer, first PM, head of growth…'},
    'stack-needs':{q:'What are the 2–3 true must-haves?',h:'Skills, domain, or ownership level. Include any genuine deal-breaker; skip nice-to-haves.'},
    '90day-outcome':{q:'What should this person accomplish first?',h:'One concrete result is enough. A 30–90 day horizon is useful; we can calibrate timing.'},
    'work-location':{q:'Where and how can they work?',h:'Only arrangements you can actually support day one.'},
    'salary-range':{q:'Target base salary range?',h:'USD base only — candidates see this band before approving any intro. Equity is separate.'},
    '__submit__':{q:'Ready to send this brief?',h:'Edit any answer below. Sending confirms this role is open now. If you request an intro, the candidate privately sees the company, exact role, and base cash band before deciding; their identity stays private until both approve.'}
  },
  engineer:{
    'full-name':{q:'Your name?',h:'For intros only — never a public board profile.'},
    'seeker-email':{q:'Best email?',h:'Only potter@trydemigod.com for match notes.'},
    'skills-stack':{q:'What kind of work do you want next?',h:'Name the role or problems, plus the strengths and domain you want to use.'},
    'experience':{q:'Work you are proud of?',h:'2–3 concrete wins with outcomes beat a long bio.'},
    'proof-url':{q:'A GitHub issue or PR you shipped? (optional)',h:'HTTPS github.com issue or pull URL. Skip if you have none. Evidence for matching, not a public profile.'},
    'sf-bay':{q:'Which work setup are you open to?',h:'Choose one you would genuinely consider. If neither fits, close the form; nothing is saved.'},
    'availability':{q:'When could you start?',h:'Pick the closest window — no commitment, only matching.'},
    'salary-expectation':{q:'Target base salary range?',h:'Your target for matching — never salary history. USD base only; startups do not see it until you approve an intro.'},
    'resume':{q:'Resume or work link? (optional)',h:'Skip if you prefer. PDF/Word upload or one HTTPS portfolio / resume link works. Shared only after both sides approve — not a public profile.'},
    '__submit__':{q:'Ready to send privately?',h:'Edit anything first. You see company, role, and base cash band before any intro. Free for talent — no blasts. No public profile.'}
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
function proofUrlError(value){
  var text=String(value||'').trim();
  if(!text)return '';
  var base=resumeUrlError(text);
  if(base)return base;
  if(!/^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+/i.test(text))return 'Use a GitHub issue or pull request URL.';
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
  return {q:'Resume or work link? (optional)',h:'Skip if you prefer. '+(canUpload?'Upload a PDF/Word resume or paste':'Paste')+' a shareable HTTPS resume, portfolio, or work link. Shared only after both sides approve.'};
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
  var list = (__dgEvBotExtraBases || [])
    .concat([raw])
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
  function configAt(j) {
    var t = Date.parse((j && (j.publishedAt || j.at)) || '');
    return isFinite(t) ? t : 0;
  }
  function pushBase(list, j) {
    var b = dgEventsBotNormBase((j && (j.apiBase || j.tunnelUrl)) || '');
    if (b && b.indexOf('/api/events-bot') < 0 && /^https?:\/\//.test(b)) b = b + '/api/events-bot';
    try {
      var host = new URL(b).hostname;
      if (/\.trycloudflare\.com$|\.loca\.lt$/.test(host) && Date.now() - configAt(j) > 21600000) return;
    } catch (e) {}
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
function skipLink(){try{var early=q('#dg-skip-early');if(early)early.remove()}catch(e){}if(q('#dg-skip'))return;var main=q('#main')||q('main')||q('.hero-section');if(main){if(!main.id)main.id='main';if(main.tagName!=='MAIN')main.setAttribute('role','main')}var a=document.createElement('a');a.id='dg-skip';a.href='#'+(main&&main.id||'main');a.textContent='Skip to main content';a.setAttribute('aria-label','Skip to main content');a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000';a.addEventListener('focus',function(){a.style.cssText='position:fixed;left:12px;top:12px;z-index:10000;background:#10c674;color:#03140d;padding:8px 12px;border-radius:6px;font-weight:600'});a.addEventListener('blur',function(){a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000'});a.addEventListener('click',function(e){e.preventDefault();var t=q('#dg-page')||q('#main,main,.hero-section,h1')||document.body;try{t.setAttribute('tabindex','-1');t.focus({preventScroll:true});var beh=(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth';if(t.scrollIntoView)t.scrollIntoView({block:'start',behavior:beh})}catch(err){try{t.focus()}catch(e2){}}});document.body&&document.body.prepend(a)}


function ensureWizPremiumCss(){
  if(q('#dg-wiz-premium-css'))return;
  var s=document.createElement('style');s.id='dg-wiz-premium-css';
  s.textContent=''
    +'#startup-modal .dg-wiz-choice,#jobseeker-modal .dg-wiz-choice{transition:border-color .15s ease,background .15s ease,transform .12s ease;}'
    +'#startup-modal .dg-wiz-choice:hover,#jobseeker-modal .dg-wiz-choice:hover{border-color:rgba(16,198,116,.55);}'
    +'#startup-modal .dg-wiz-choice.is-on,#jobseeker-modal .dg-wiz-choice.is-on{border-color:var(--dg-signal,#10c674);box-shadow:0 0 0 1px rgba(16,198,116,.35);}'
    +'#startup-modal .dg-wiz-next[data-enter-hint],#jobseeker-modal .dg-wiz-next[data-enter-hint]{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.18rem!important;line-height:1.2!important;text-align:center!important}#startup-modal .dg-wiz-next[data-enter-hint]::after,#jobseeker-modal .dg-wiz-next[data-enter-hint]::after{content:attr(data-enter-hint);display:block!important;font-size:.62rem!important;font-weight:500!important;opacity:.55!important;letter-spacing:.04em!important;margin:0!important;line-height:1!important;font-family:var(--dg-sans),Manrope,system-ui,sans-serif!important;color:inherit!important}'
    +'@media(prefers-reduced-motion:reduce){#startup-modal .dg-wiz-choice,#jobseeker-modal .dg-wiz-choice{transition:none}}'
    +'#startup-modal form.dg-wiz-on .dg-wiz-show,#jobseeker-modal form.dg-wiz-on .dg-wiz-show{animation:dgWizIn .22s ease both}'
    +'@keyframes dgWizIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
    +'@media(prefers-reduced-motion:reduce){#startup-modal form.dg-wiz-on .dg-wiz-show,#jobseeker-modal form.dg-wiz-on .dg-wiz-show{animation:none}}';
  document.head.appendChild(s);
}

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
    if (/^proof-url$/i.test(String(el.name || el.id || ''))) {
      el.maxLength = 2048;
      el.setCustomValidity(proofUrlError(value));
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
    try {
      qa('.dg-wiz-req-err,.dg-wiz-err', form).forEach(function(n){ n.remove(); });
      qa('[aria-invalid="true"]', form).forEach(function(n){ n.removeAttribute('aria-invalid'); n.style.borderColor=''; });
    } catch (eClr) {}
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
        if (k === 'proof-url') lab = 'Shipped GitHub proof';
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
      /* Optional file/link: empty is fine; validate only when the founder provided one. */
      if (isOpt && isFileGroup) {
        var fileReadyOpt = !!(el && el.files && el.files.length && String(el.getAttribute('data-value') || '').trim());
        var urlOpt = String(fileUrl && fileUrl.value || '').trim();
        if (fileReadyOpt && el && !el.checkValidity()) { wizInlineInvalid(el, el.validationMessage || 'That file cannot be used.', key); return; }
        if (urlOpt && fileUrl && !fileUrl.checkValidity()) { wizInlineInvalid(fileUrl, fileUrl.validationMessage || 'Use a full https:// link.', key); return; }
      }
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
      if (kind === 'engineer') {
        try {
          var proofEl = form.querySelector('[name=proof-url]');
          var proofVal = proofEl ? String(proofEl.value || '').trim() : '';
          if (proofVal) {
            var resumeEl = form.querySelector('[name=resume-url]');
            if (resumeEl && !String(resumeEl.value || '').trim()) resumeEl.value = proofVal;
            else {
              var expEl = form.querySelector('[name=experience]');
              if (expEl && String(expEl.value || '').indexOf(proofVal) < 0) {
                expEl.value = String(expEl.value || '').replace(/\s+$/,'') + '\n\nShipped proof: ' + proofVal;
              }
            }
          }
        } catch (eProof) {}
      }
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
    if (form.dataset.dgSwallowKey === '1') { e.preventDefault(); e.stopPropagation(); return; }
    var swallow = function(){
      form.dataset.dgSwallowKey = '1';
      var done = function(){ try { delete form.dataset.dgSwallowKey; } catch (eS) {} };
      document.addEventListener('keyup', done, { once: true, capture: true });
      setTimeout(done, 400);
    };
    var act = document.activeElement;
    var inText = act && (act.tagName === 'TEXTAREA' || act.isContentEditable);
    var onChoice = act && act.classList && act.classList.contains('dg-wiz-choice');
    // Typeform: number keys pick a choice chip (never while typing free text)
    if (/^[1-9]$/.test(e.key) && !inText && !(act && act.tagName === 'INPUT' && /^(text|email|url|search|tel)$/i.test(act.type || ''))) {
      var chipsN = form.querySelectorAll('.dg-wiz-choices .dg-wiz-choice');
      if (chipsN.length) {
        var pick = chipsN[parseInt(e.key, 10) - 1];
        if (pick) { e.preventDefault(); e.stopPropagation(); swallow(); pick.click(); return; }
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
        e.preventDefault(); swallow(); act.click(); return;
      }
      if (inText && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); swallow(); nextBtn.click(); return;
      }
      if (act && (act.tagName === 'INPUT' || act.tagName === 'SELECT') && act.type !== 'file' && !inText) {
        e.preventDefault(); swallow(); nextBtn.click();
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

function submitTrust(f,msg){if(!f||f.querySelector('.dg-submit-trust'))return;var p=document.createElement('p');p.className='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.innerHTML=esc(msg||'Reviewed with humans in the loop. No spam lists.')+' <a href="/legal" data-dg-page="legal">Privacy</a>.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.form-field-group')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max;el.setCustomValidity(n>max?'Keep this under '+max+' characters.':'')};el.maxLength=max;el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='See a fictional match note';/* v598: no follow-up mini-form on thanks (less is more) */a.style.cssText='min-height:48px;margin-top:1rem;padding:.7rem 1.05rem;background:rgba(166,255,203,.08)!important;color:var(--dg-phosphor,#a6ffcb)!important;border:1px solid rgba(166,255,203,.5)!important;border-radius:12px;font:600 .9rem/1.25 var(--dg-sans),Manrope,system-ui,sans-serif;letter-spacing:-.01em;display:inline-flex;align-items:center';a.addEventListener('click',function(){openPage('sample',true)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
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
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');['Source','hiring-model','timeline','team-size','why-this-role','role-jd'].forEach(function(name){rmF(st,name)});qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack|Skills\s*\/\s*requirements/i.test(el.textContent||''))el.textContent='What are the 2–3 true must-haves? *';if(/Role Title|Job Title|Role title/i.test(el.textContent||''))el.textContent='What role are you hiring? *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *';if(/Contact Email|Work email|Best email/i.test(el.textContent||''))el.textContent='Work email? *';if(/Salary range/i.test(el.textContent||''))el.textContent='Target base salary range *'});ph(st.querySelector('[name=contact-email]'),'name@company.com');ph(st.querySelector('[name=role-title]'),'e.g. Founding engineer, first PM');ph(st.querySelector('[name=stack-needs]'),'2–3 must-haves — skip nice-to-haves');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; if(n==='contact-email')i.setAttribute('autocomplete','email'); var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL'){ l.setAttribute('for',n); if(n==='contact-email')l.textContent='Work email? *'; else if(n==='role-title')l.textContent='What role are you hiring? *'; else l.textContent='What are the 2–3 true must-haves? *'; } else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Work email? *':n==='role-title'?'What role are you hiring? *':'What are the 2–3 true must-haves? *'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
/* company-name */ if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" autocomplete="organization" required placeholder="Company name">';var ce=st.querySelector('[name=contact-email]');var ceg=ce&&(ce.closest('.form-field-group')||ce.parentElement);if(ceg&&ceg.parentElement&&ceg!==st){ceg.insertAdjacentElement('afterend',cn);}else{(ce&&ce.parentElement||st).appendChild(cn);}}
formAttribution(st);var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';var ceg3=ce&&(ce.closest('.form-field-group')||cew);if(ceg3&&ceg3.parentElement&&ceg3!==st)ceg3.parentElement.insertBefore(sw,ceg3.nextSibling);else if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}}
// Keep the established field name for stored submissions; present it as a plain success question.
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">What should this person accomplish first? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="One concrete first result (30–90 days)"></textarea>';var skg2=sk&&(sk.closest('.form-field-group')||sk.parentElement);if(skg2&&skg2.parentElement&&skg2!==st){skg2.insertAdjacentElement('afterend',od);}else{(sk&&sk.parentElement||st).appendChild(od);}}
if(!st.querySelector('[name=work-location]')){var wl=document.createElement('div');wl.className='dg-field-wrap';wl.innerHTML='<label class="w-form-label" for="work-location">Where and how can they work? *</label><select class="w-select" id="work-location" name="work-location" required><option value="">Select</option><option value="sf-onsite">SF onsite</option><option value="sf-hybrid">SF hybrid</option><option value="bay-flexible">SF Bay Area, flexible</option><option value="remote-us">Remote, US (company is SF Bay)</option></select>';var outcome=st.querySelector('[name="90day-outcome"]');var outcomeWrap=outcome&&(outcome.closest('.form-field-group,.dg-field-wrap')||outcome.parentElement);if(outcomeWrap&&outcomeWrap.parentElement)outcomeWrap.parentElement.insertBefore(wl,outcomeWrap.nextSibling);else st.appendChild(wl);}(function(){var sel=st.querySelector('[name=work-location]');if(!sel)return;var gone=sel.querySelector('option[value="remote-global"]');if(gone)gone.remove();})();
/* salary-range: always a band select (replace free-text if Webflow left one) */
(function(){var el=st.querySelector('[name=salary-range]');var wrap=document.createElement('div');wrap.id='dg-salary-wrap';wrap.className='dg-field-wrap';wrap.innerHTML='<label class="w-form-label" for="salary-range">Target base salary range *</label><select class="w-select" id="salary-range" name="salary-range" required>'+SALARY_BAND_HTML+'</select>';if(el&&el.tagName==='SELECT'){el.required=true;if(!el.options||el.options.length<3){el.innerHTML=SALARY_BAND_HTML;}var lab=(el.closest('.form-field-group,.dg-field-wrap')||st).querySelector('label');if(lab)lab.textContent='Target base salary range *';return;}if(el){var host=el.closest('.dg-field-wrap,.form-field-group')||el;if(host.parentNode)host.parentNode.replaceChild(wrap,host);else el.replaceWith(wrap);}else if(sa&&sa.parentElement)sa.parentElement.insertBefore(wrap,sa.nextSibling);else{var sub=st.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(wrap,sub);}})();
st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'Nothing until a hire starts. A human reads every brief. potter@trydemigod.com emails only when there is a real next step — no automated drip.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name="90day-outcome"]'),500);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.setAttribute('method','post');if(!en.dataset.dgMailStrip){en.dataset.dgMailStrip='1';en.addEventListener('submit',function(ev){/* keep native Webflow if wired; never open mail client */if(/^mailto:/i.test(en.getAttribute('action')||'')){ev.preventDefault();en.removeAttribute('action');}},true);}['github-url','portfolio-url','linkedin-url','phone','why-startups','work-auth'].forEach(function(name){rmF(en,name)});var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped|What you shipped|proud of/i.test(l.textContent||''))l.textContent='Work you are proud of? *';if(/Skills\s*&\s*(Stack|experience)|Next role/i.test(l.textContent||''))l.textContent='What kind of work do you want next? *';if(/Full Name|^Name\*?$/i.test((l.textContent||'').trim()))l.textContent='Your name? *';if(/^Email\*?$/i.test((l.textContent||'').trim())||/seeker|best email/i.test(l.textContent||''))l.textContent='Best email? *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email','skills-stack','experience'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(!i)return;if(n==='full-name'||n==='seeker-email'){i.required=true;i.setAttribute('autocomplete',n==='full-name'?'name':'email')}var id=i.id||n;if(!i.id)i.id=id;var l=en.querySelector('label[for="'+id+'"]')||i.closest('.form-field-group,.dg-field-wrap')&&(i.closest('.form-field-group,.dg-field-wrap').querySelector('label'));if(!l){l=document.createElement('label');l.className='w-form-label';l.setAttribute('for',id);i.parentNode.insertBefore(l,i)}l.setAttribute('for',id);if(n==='full-name')l.textContent='Your name? *';else if(n==='seeker-email')l.textContent='Best email? *';else if(n==='skills-stack')l.textContent='What kind of work do you want next? *';else if(n==='experience')l.textContent='Work you are proud of? *';});en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('input[type=file][name=resume],input[type=file][name=Resume]');
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
    rw.innerHTML='<label class="w-form-label" for="resume-url">Resume or work link (optional)</label><input class="w-input" type="url" id="resume-url" name="resume-url" autocomplete="url" maxlength="2048" placeholder="https://"><p class="dg-resume-hint">Optional. Paste one shareable HTTPS link, or skip.</p>';
    var insBefore=en.querySelector('[name=skills-stack]');
    var insW=insBefore&&(insBefore.closest('.form-field-group,.dg-field-wrap,.w-file-upload')||insBefore.parentElement);
    if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}
  }
}
if(nativeResume&&!en.querySelector('[name=resume-url]')){
  var nativeLink=document.createElement('div');nativeLink.className='dg-field-wrap dg-resume-link';nativeLink.innerHTML='<label class="w-form-label" for="resume-url">Or paste a resume or work link (optional)</label><input class="w-input" type="url" id="resume-url" name="resume-url" autocomplete="url" maxlength="2048" placeholder="https://"><p class="dg-resume-hint">Optional. Upload a file, paste one shareable HTTPS link, or skip.</p>';
  resW.appendChild(nativeLink);
}
qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent=nativeResume?'Resume file or work link (optional)':'Resume or work link (optional)'});
var rUrl=en.querySelector('[name=resume-url]');if(rUrl)rUrl.setAttribute('autocomplete','url');if(resIn){resIn.accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){resIn.setCustomValidity(resumeFileError(resIn.files&&resIn.files[0]))})}}
ph(en.querySelector('[name=skills-stack]'),'Role, problems, and strongest skills');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='Two or three concrete outcomes';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'Two or three concrete outcomes')}charCount(en.querySelector('[name=experience]'),600);rmF(en,'links');var oldLinks=en.querySelector('#dg-links-wrap');if(oldLinks)oldLinks.remove();var sf=en.querySelector('[name=sf-bay]');var sfOptions='<option value="">Select</option><option value="yes">SF onsite, hybrid, or remote</option><option value="remote-bay">Remote only — company can be Bay-based</option>';
if(sf&&sf.type==='checkbox'){var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="sf-bay">Which work setup are you open to?</label><select class="w-select" id="sf-bay" name="sf-bay" required>'+sfOptions+'</select>';var par=sf.closest('.form-field-group,.dg-field-wrap')||sf.closest('label,.w-checkbox')||sf.parentElement;if(par&&par.parentNode)par.parentNode.replaceChild(sw,par);else sf.replaceWith(sw);sf=sw.querySelector('[name=sf-bay]');}
if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('div');c.className='dg-field-wrap';c.innerHTML='<label class="w-form-label" for="sf-bay">Which work setup are you open to?</label><select class="w-select" id="sf-bay" name="sf-bay" required>'+sfOptions+'</select>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
else{var sfel=en.querySelector('[name=sf-bay]');if(sfel){sfel.required=true;if(sfel.tagName==='SELECT')sfel.innerHTML=sfOptions;}}
// inject only match-critical availability and compensation constraints
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">When could you start? *</label><select class="w-select" id="availability" name="availability" required><option value="">Select</option><option value="now">Ready now</option><option value="2-4w">2–4 weeks</option><option value="1-3m">1–3 months</option><option value="passive">Passively open / flexible</option></select>';var avField=en.querySelector('[name=sf-bay]');var avAfter=avField&&(avField.closest('.form-field-group,.dg-field-wrap')||avField.parentElement);if(avAfter&&avAfter.parentElement)avAfter.parentElement.insertBefore(av,avAfter.nextSibling);else en.appendChild(av);}
var avIn=en.querySelector('[name=availability]');if(avIn){avIn.required=true;var avLab=(avIn.closest('.form-field-group,.dg-field-wrap')||en).querySelector('label');if(avLab)avLab.textContent='When could you start? *';}
/* salary-expectation: band select (replace free-text) */
(function(){var el=en.querySelector('[name=salary-expectation]');var wrap=document.createElement('div');wrap.className='dg-field-wrap';wrap.innerHTML='<label class="w-form-label" for="salary-expectation">Target base salary range *</label><select class="w-select" id="salary-expectation" name="salary-expectation" required>'+SALARY_BAND_HTML+'</select>';if(el&&el.tagName==='SELECT'){el.required=true;if(!el.options||el.options.length<3)el.innerHTML=SALARY_BAND_HTML;var lab=(el.closest('.form-field-group,.dg-field-wrap')||en).querySelector('label');if(lab)lab.textContent='Target base salary range *';return;}if(el){var host=el.closest('.dg-field-wrap,.form-field-group')||el;if(host.parentNode)host.parentNode.replaceChild(wrap,host);else el.replaceWith(wrap);}else{var avAfter2=en.querySelector('[name=availability]');var avH=avAfter2&&(avAfter2.closest('.form-field-group,.dg-field-wrap')||avAfter2.parentElement);if(avH&&avH.parentElement)avH.parentElement.insertBefore(wrap,avH.nextSibling);else en.appendChild(wrap);}})();
var seIn=en.querySelector('[name=salary-expectation]');if(seIn)seIn.required=true;
/* Resume is optional (conversion: skip CV friction). Strip Webflow/native required if present. */
qa('[name=resume],[name=Resume],[name=resume-url],#resume,#resume-url',en).forEach(function(i){try{i.required=false;i.removeAttribute('required');i.setAttribute('aria-required','false')}catch(e){}});
if(!en.querySelector('[name=proof-url]')){var pw=document.createElement('div');pw.id='dg-proof-wrap';pw.className='dg-field-wrap';pw.innerHTML='<label class="w-form-label" for="proof-url">GitHub issue or PR you shipped (optional)</label><input class="w-input" type="url" id="proof-url" name="proof-url" autocomplete="off" maxlength="2048" placeholder="https://github.com/owner/repo/issues/123"><p class="dg-resume-hint">Optional. One issue or pull URL. Evidence for matching, not a public profile.</p>';var rHost=en.querySelector('[name=resume-url],[name=resume],[name=Resume]');var rW=rHost&&(rHost.closest('.form-field-group,.dg-field-wrap,.w-file-upload')||rHost.parentElement);if(rW&&rW.parentElement)rW.parentElement.insertBefore(pw,rW.nextSibling);else{var subP=en.querySelector('[type=submit],.w-button');subP&&subP.parentElement&&subP.parentElement.insertBefore(pw,subP)}}
qa('[name=proof-url],#proof-url',en).forEach(function(i){try{i.required=false;i.removeAttribute('required');i.setAttribute('aria-required','false')}catch(eP){}});

if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.innerHTML='Demigod and its form/email providers process these answers for matching. You see the company, exact role, and base cash band before deciding; your identifying details move only after both sides approve. This is not a public profile or professional network feed. <a href="/legal" data-dg-page="legal">Privacy</a>.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Private until you approve an intro. Resume optional. potter@trydemigod.com only on real fits — free for talent, no blasts.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Send privately';sb2.textContent='Send privately'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
/* === COPY INJECTION — runtime marketing strings from COPY; honesty scrub separate === */
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
/** Cyber wordmark: split letters for motion. Pure DOM paint.
 *  inline-block letter spans make AT/innerText read "D E M I G O D" — host aria-label +
 *  aria-hidden visual keep the spoken/accessible name as one word. */
function paintCyberWord(el, word) {
  if (!el) return;
  var w = String(word || 'Demigod');
  var reduce =
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) ||
    document.documentElement.classList.contains('dg-reduce');
  el.classList.add('dg-cyber-host');
  el.setAttribute('aria-label', w);
  if (reduce) {
    el.innerHTML = '<span class="dg-cyber-word" aria-hidden="true">' + w + '</span>';
    return;
  }
  el.innerHTML =
    '<span class="dg-cyber-word" aria-hidden="true">' +
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
  el.style.minHeight = '0'; el.style.height = 'auto'; el.style.maxHeight = 'none'; /* no empty brand band */
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
    /* design-track: outcome line under brand H1 (blur-test mass without inventing inventory) */
    if (e.parentNode && !q('#dg-hero-outcome', e.parentNode) && !q('#dg-hero-outcome')) {
      var out = document.createElement('p');
      out.id = 'dg-hero-outcome';
      out.className = 'dg-hero-outcome';
      out.textContent = COPY.heroSub;
      e.insertAdjacentElement('afterend', out);
    }
  });
  /* design-track pass32: kill Webflow hero-description — outcome already teaches; dual-path rises */
  qa('.hero-section .hero-description,.header .hero-description').forEach(function(e){
    try{e.style.setProperty('display','none','important');e.setAttribute('aria-hidden','true');}catch(_){}
  });
  qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){
    if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.id==='dg-eyebrow'||e.id==='dg-hero-chips'||e.id==='dg-hero-outcome'||e.id==='dg-cta-trust'||e.closest('.dg-candidates,#startup-modal,#jobseeker-modal,#dg-path-pills,#dg-hero-chips,#dg-simple-process,#dg-cap-strip,#dg-night-stage'))return;
    if(e.classList&&e.classList.contains('hero-description'))return;
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
  // Operator Calm process: software compares · human proposes · mutual yes
  qa('.step-card').forEach(function(card,i){
    var title=card.querySelector('.step-title,h3');
    var desc=card.querySelector('.step-desc,p');
    var num=card.querySelector('.step-num');
    var steps=[
      ['Software compares the facts','One role brief or private profile — must-haves, constraints, cash band, and a concrete first result. Software compares fit; nothing is messaged yet.'],
      ['A human decides what to propose','A person reviews the comparison and interview path — and can explain why. Software never auto-intros.'],
      ['Mutual yes before intro','Candidate sees company, exact role, and base cash band first. We introduce only after both approve.']
    ];
    var st=steps[i]||steps[2];
    if(title) title.textContent=st[0];
    if(desc) desc.textContent=st[1];
    if(num) num.textContent=String(i+1).padStart(2,'0');
  });
  qa('.trust-header h2,.trust-section h2,section h2').forEach(function(h){
    var x=(h.textContent||'').trim();
    /* design-track: Webflow still ships TECH-MATCHED / HUMAN-MATCHED shout titles */
    /* editorial spine matches the three step cards — not generic "clear steps" SaaS */
    if(/HUMAN-MATCHED|TECH-MATCHED|TECH MATCHED|THE PROCESS|How it works|SF STARTUP TALENT|three clear steps|A match has three/i.test(x) && h.closest('.trust-section,section:has(.steps-grid),section')) h.textContent='Software compares. A human proposes. Mutual yes.';
    if(/ONE SIMPLE MODEL|^PRICING$|10%/i.test(x) && h.closest('section') && h.closest('section').querySelector('.pricing-grid,.pricing-card')) h.textContent='Nothing until a hire starts.';
  });
  qa('.trust-header p,.trust-section .paragraph_large').forEach(function(p){
    if(p.closest('#startup-modal,#jobseeker-modal'))return;
    if(/spam|profile|Bay Area|theater|steps|form|tech|human/i.test(p.textContent||'')) p.textContent='Software compares the facts. A human decides what to propose and can explain why. Mutual yes before intro.';
  });
  qa('.badge-text').forEach(function(b){
    var x=(b.textContent||'').trim();
    if(/^THE PROCESS$/i.test(x)||/^SIMPLE$/i.test(x)) b.textContent='PROCESS';
    if(/^PRICING$/i.test(x)||/^FEE$/i.test(x)) b.textContent='FEE';
    if(/^LIVE ROLES$/i.test(x)||/^SAMPLES$/i.test(x)) b.textContent='SAMPLES';
  });
  // Pricing honesty + fee mass (Webflow leaves bare 10% div without .pricing-amount)
  if(!q('#dg-pricing-note')&&COPY.pricingNote){var ph=null;qa('h2').forEach(function(h){if(/Nothing until a hire starts|^PRICING$/i.test(h.textContent||'')&&h.closest('section')&&h.closest('section').querySelector('.pricing-grid,.pricing-card'))ph=h});var pn=document.createElement('p');pn.id='dg-pricing-note';pn.textContent=COPY.pricingNote;if(ph&&ph.parentElement)ph.insertAdjacentElement('afterend',pn);else{var pc=q('.pricing-card');if(pc&&pc.parentElement)pc.parentElement.insertBefore(pn,pc);}}
  qa('.pricing-card').forEach(function(card){
    var h3=card.querySelector('h3');
    if(h3){
      var ht=(h3.textContent||'').trim();
      if(/10%\s*ON\s*HIRE|PLACEMENT\s*FEE|^FEE$/i.test(ht)) h3.textContent='When a hire starts';
    }
    qa('div,li,p,span',card).forEach(function(el){
      if(el.children&&el.children.length)return;
      var tx=(el.textContent||'').trim();
      if(/^10%$/.test(tx)){
        el.classList.add('pricing-amount');
        el.textContent='10%';
      }
      if(/^OF FIRST-YEAR/i.test(tx)||/PLACEMENT FEE/i.test(tx)) el.textContent='of first-year base salary';
      /* pass34: match Webflow leaf strings — prior regexes missed Human-reviewed thrash */
      if(/^Human-reviewed talent profiles$/i.test(tx)||/^Access to pre-vetted/i.test(tx)||/pre-vetted SF/i.test(tx))
        el.textContent='Human-reviewed SF Bay fits — no volume promise';
      else if(/^Human review from brief/i.test(tx)||/Dedicated talent partner/i.test(tx))
        el.textContent='Software compares · a human proposes';
      else if(/^Mutual yes before any intro$/i.test(tx)||/90-day replacement/i.test(tx)||/^Outcome-focused matching$/i.test(tx))
        el.textContent='Nothing due until a hire starts';
      else if(/^Human-reviewed matching$/i.test(tx)||/^Human review$/i.test(tx))
        el.textContent='Software compares · a human proposes';
    });
  });
  // remove old clutter injects (never kill #dg-faq-jsonld — FAQPage schema for /faq)
  ['#demigod-trust-block','#dg-faq','#dg-proof-strip','#dg-pipeline-note','#dg-contact-strip'].forEach(function(sel){
    var el=q(sel); if(el)el.remove();
  });
  // one calm trust line (not chip salad; re-apply text on load re-scrub)
  var host=q('.hero-actions')||q('.hero-section .w-container')||q('.hero-section')||q('.header');
  var chips=q('#dg-hero-chips');
  var actsHost=q('.hero-actions');
  if(chips&&COPY.heroTrustLine){
    chips.className='dg-trust-line';
    chips.textContent=COPY.heroTrustLine;
    /* re-home above dual-path if a prior build parked it after the CTAs */
    if(actsHost){
      var needsMove = !!(chips.compareDocumentPosition(actsHost) & Node.DOCUMENT_POSITION_PRECEDING) || !!(actsHost.contains && actsHost.contains(chips));
      if(needsMove) actsHost.insertAdjacentElement('beforebegin', chips);
    }
  }else if(host&&COPY.heroTrustLine){
    chips=document.createElement('p');
    chips.id='dg-hero-chips';
    chips.className='dg-trust-line';
    chips.setAttribute('aria-label','What Demigod is');
    chips.textContent=COPY.heroTrustLine;
    /* before dual-path CTAs: honest boundary sits above the ask */
    if(actsHost) actsHost.insertAdjacentElement('beforebegin', chips);
    else if(host.classList&&host.classList.contains('hero-actions')) host.insertAdjacentElement('beforebegin', chips);
    else host.appendChild(chips);
  }
  // design-track: no #dg-path-pills — primary nav already covers how/sample/startups
  var stalePills=q('#dg-path-pills'); if(stalePills) stalePills.remove();
}

/* ==== SECTION: nav — logo only; dual path lives in hero (no top "I'm hiring") ==== */
function nav(){
  var real=q('nav.w-nav,.w-nav,.nav_container:not(#dg-top-nav)');
  if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop='';}
  else if(!q('#dg-top-nav')){var inj=document.createElement('header');inj.id='dg-top-nav';inj.className='nav_container';inj.innerHTML='<div class="nav_left"><a class="nav_logo" href="/" aria-label="Demigod home"></a></div><div class="nav_right"></div>';document.body.prepend(inj)}
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
  var right=q('.nav_container .nav_right');
  if(right&&!q('#dg-nav-directory')){
    var menu=document.createElement('details');menu.id='dg-nav-directory';
    menu.innerHTML='<summary>Explore</summary><div class="dg-nav-panel"><p class="dg-nav-group">Start</p><a href="/how-it-works" data-dg-page="how">How it works</a><a href="/pricing" data-dg-page="pricing">Pricing</a><a href="/sample" data-dg-page="sample">Sample match</a><a href="/?p=bounties" data-dg-page="bounties">Bounties</a><a href="/hire" data-dg-page="hire">Hire guide</a><a href="/talent" data-dg-page="talent">Talent guide</a><p class="dg-nav-group">More</p><a href="/startups" data-dg-page="map">SF directory</a><a href="/blog" data-dg-page="blog">Notes</a><a href="/faq" data-dg-page="faq">FAQ</a><a href="/about" data-dg-page="about">About</a><a href="/contact" data-dg-page="contact">Contact</a><a href="/legal" data-dg-page="legal">Privacy & terms</a></div>';
    qa('a',menu).forEach(function(a){a.style.setProperty('visibility','visible','important');a.style.setProperty('opacity','1','important')});
    menu.addEventListener('click',function(e){if(e.target.closest('a'))menu.removeAttribute('open')});right.prepend(menu);
    menu.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.open){e.preventDefault();menu.removeAttribute('open');menu.querySelector('summary').focus()}});
  }
  if(!q('#dg-nav-directory-style')){var ns=document.createElement('style');ns.id='dg-nav-directory-style';ns.textContent='.nav_mobile-menu-button.w-nav-button{display:none!important}#dg-nav-directory{position:relative;margin:0!important;padding:0!important;color:var(--dg-paper,#f3f0e7)}#dg-nav-directory summary{display:flex;align-items:center;min-height:48px;padding:.45rem .75rem;border:1px solid rgba(166,255,203,.35);border-radius:9px;cursor:pointer;font:600 .88rem var(--dg-sans,system-ui,sans-serif);list-style:none}#dg-nav-directory summary::-webkit-details-marker{display:none}#dg-nav-directory summary::after{content:"⌄";margin-left:.45rem;color:var(--dg-phosphor,#a6ffcb)}#dg-nav-directory[open] summary::after{content:"⌃"}#dg-page summary::after{content:"⌄";margin-left:.45rem;color:var(--dg-phosphor,#a6ffcb)}#dg-page details[open] summary::after{content:"⌃"}#dg-nav-directory>div{position:absolute;right:0;top:calc(100% + .45rem);z-index:9999;display:grid;grid-template-columns:repeat(2,minmax(8.5rem,1fr));gap:.15rem;width:min(20rem,calc(100vw - 2rem));padding:.55rem;background:#062219;border:1px solid rgba(166,255,203,.35);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.45)}#dg-nav-directory .dg-nav-group{grid-column:1/-1;margin:.55rem 0 .15rem;padding:.2rem .55rem 0;font:700 .65rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#10c674;opacity:.95}#dg-nav-directory .dg-nav-group:first-child{margin-top:0}#dg-nav-directory a{display:flex!important;visibility:visible!important;opacity:1!important;align-items:center;min-height:48px;padding:.55rem .7rem;border-radius:7px;color:var(--dg-paper,#f3f0e7)!important;text-decoration:none!important}#dg-nav-directory a:hover,#dg-nav-directory a:focus-visible{background:rgba(166,255,203,.1);color:var(--dg-phosphor,#a6ffcb)!important;outline:2px solid var(--dg-signal,#10c674);outline-offset:-2px}@media(max-width:420px){#dg-nav-directory>div{grid-template-columns:1fr;width:min(15rem,calc(100vw - 2rem));max-height:calc(100svh - 6rem);overflow:auto}}';document.head.appendChild(ns)}
}
function trust(){/* v210: no visual wall — sr-only one-liner for a11y */ var old=q('#demigod-trust-block'); if(old)old.remove(); var f=q('footer,.footer'); if(!f||q('#demigod-trust-block'))return; var el=document.createElement('section'); el.id='demigod-trust-block'; el.setAttribute('aria-label','How it works'); el.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'; el.innerHTML='<p>Brief or preferences → human review → both sides approve → intro. 10% of first-year base salary when a hire starts.</p>'; if(f.parentNode)f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
function mob(){var b=q('#dg-bar');if(!b){b=document.createElement('nav');b.id='dg-bar';b.setAttribute('aria-label','Mobile actions');b.innerHTML='<a class="dg-h" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire"></a><a class="dg-j" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent"></a>';document.body.appendChild(b)}var h=b.querySelector('.dg-h,[data-dg-cta="hire"]'),t=b.querySelector('.dg-j,[data-dg-cta="talent"]');if(h){h.innerHTML='<span class="dg-bar-label">'+COPY.ctaFounder+'</span><span class="dg-bar-hint">'+COPY.ctaHireHint+'</span>';h.setAttribute('href','/?wiz=startup');h.removeAttribute('aria-label')}if(t){t.innerHTML='<span class="dg-bar-label">'+COPY.ctaEngineer+'</span><span class="dg-bar-hint">'+COPY.ctaTalentHint+'</span>';t.setAttribute('href','/?wiz=engineer');t.removeAttribute('aria-label')}}
function foot(){
  var f=q('footer,.footer');
  if(!f)return;
  var panel=q('#dg-footer-panel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='dg-footer-panel';
    panel.innerHTML=
      '<div class="dg-footer-actions" role="group" aria-label="Hire talent or share privately">'+
        '<a href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire"><strong>Hire talent</strong><span>'+COPY.ctaHireHint+'</span></a>'+
        '<a href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent"><strong>'+COPY.ctaEngineer+'</strong><span>'+COPY.ctaTalentHint+'</span></a>'+
      '</div>'+
      '<nav id="dg-legal-links" aria-label="Footer navigation">'+
        '<div class="dg-footer-group" role="group" aria-labelledby="dg-footer-product">'+
          '<p class="dg-footer-heading" id="dg-footer-product">Product</p>'+
          '<a href="/how" data-dg-page="how">How it works</a>'+
          '<a href="/pricing" data-dg-page="pricing">Pricing</a>'+
          '<a href="/hire" data-dg-page="hire">Hire talent guide</a>'+
          '<a href="/talent" data-dg-page="talent">Talent guide</a>'+
          '<a href="/sample" data-dg-page="sample">Sample match</a>'+
          '<a href="/?p=bounties" data-dg-page="bounties">Bounties</a>'+
          '<a href="/blog" data-dg-page="blog">Notes</a>'+
          '<a href="/faq" data-dg-page="faq">FAQ</a>'+
        '</div>'+
        '<div class="dg-footer-group" role="group" aria-labelledby="dg-footer-company">'+
          '<p class="dg-footer-heading" id="dg-footer-company">Company</p>'+
          '<a href="/about" data-dg-page="about">About</a>'+
          '<a href="/startups" data-dg-page="map">SF directory</a>'+
          '<a href="/contact" data-dg-page="contact">Contact</a>'+
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
      ?'Optional. PDF/DOCX upload or a shareable https link — or skip. Uploaded files are not restored if you refresh mid-form.'
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
    a.removeAttribute('aria-label');
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
    /* frege peer CTA — solid primary + fee hint (same honesty as hero dual-path) */
    a.classList.add('premium-btn','is-talent');
    a.classList.remove('on-inverse','is-job');
    a.style.removeProperty('color');
    a.style.removeProperty('background');
    a.innerHTML='<span class="dg-cta-label">'+COPY.ctaFounder+'</span><span class="dg-cta-hint">'+COPY.ctaHireHint+'</span>';
    a.style.cssText='display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:.28rem!important;text-align:left!important';
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
      a.removeAttribute('aria-label');
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
    /* design-track: fee honesty lives in #dg-hero-chips — remove stale duplicate */
    if (host.parentNode) {
      var staleTrust = host.parentNode.querySelector('#dg-cta-trust');
      if (staleTrust) staleTrust.remove();
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
        a.removeAttribute('aria-label');
        if(/by email/i.test(t)||/^hire talent/i.test(t)) a.textContent='Hire talent';
      } else {
        a.setAttribute('href','/?wiz=engineer');
        a.setAttribute('data-demigod-modal','jobseeker');
        a.setAttribute('data-dg-cta','talent');
        a.removeAttribute('aria-label');
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
      ''+
    '</div>';
  // put stage inside hero as first decorative layer
  if(hero.firstChild) hero.insertBefore(stage, hero.firstChild);
  else hero.appendChild(stage);
  try{qa('#dg-cap-strip').forEach(function(el){el.remove();});}catch(e){}
  // design-track: no shouty // SF STARTUP eyebrow — outcome line carries category
  try{ var staleEye=q('#dg-eyebrow'); if(staleEye) staleEye.remove(); }catch(e){}
  // dg-cap-strip removed (v619) — Interface/Control/Intro section deleted
}
function ensureMotion(){
  try{
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      document.documentElement.classList.add('dg-reduce');
      qa('.dg-reveal,.hero-actions .dg-cta-wrap,.dg-hero-outcome,#dg-hero-chips').forEach(function(el){el.classList.add('dg-in');});
      return;
    }
  }catch(e){}
  try{
    var io=new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting){en.target.classList.add('dg-in');io.unobserve(en.target);}
      });
    },{threshold:0.12,rootMargin:'0px 0px -6% 0px'});
    /* design-track: brand H1, dual-path, outcome, trust line paint solid — never opacity:0 FOUC */
    /* process steps paint solid under hero peek; pricing can still reveal */
    qa('.step-card').forEach(function(el){
      el.classList.add('dg-reveal','dg-in');
    });
    qa('.pricing-card').forEach(function(el){
      el.classList.add('dg-reveal');
      try{io.observe(el);}catch(e){}
    });
    qa('.hero-actions .dg-cta-wrap,#dg-hero-outcome,.dg-hero-outcome,#dg-hero-chips').forEach(function(el){
      el.classList.add('dg-in');
    });
    qa('.hero-section h1,.header h1,h1.hero-title').forEach(function(el){
      el.classList.add('dg-in');
      el.classList.remove('dg-reveal');
    });
    requestAnimationFrame(function(){
      qa('.hero-actions .dg-cta-wrap,#dg-hero-outcome,#dg-hero-chips').forEach(function(el){el.classList.add('dg-in');});
    });
    qa('.hero-actions .dg-cta-wrap').forEach(function(el,i){el.style.setProperty('--d',(0+i*80)+'ms');});
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
+".hero-section h1,.header h1,.hero-title,.hero-section h1:not(:has(.title-accent-gold)),.header h1:not(:has(.title-accent-gold)){min-height:0!important;height:auto!important;max-height:none!important;line-height:1.06!important;margin:0 0 .4rem!important;padding:0!important;visibility:visible!important;animation:none!important}"
+".dg-cyber-host,.dg-cyber-word{font-family:var(--dg-cyber)!important;font-weight:650!important;letter-spacing:.03em!important;text-transform:uppercase!important;color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;text-shadow:0 0 8px rgba(166,255,203,.28),0 1px 14px rgba(0,0,0,.35)!important}"
/* dynamic reveal + paper-span rules */
+".hero-section h1.dg-hero-hold.dg-reveal,.header h1.dg-hero-hold.dg-reveal,.hero-section h1.dg-cyber-host.dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+".hero-section h1.dg-cyber-host .dg-cyber-ch,.header h1.dg-cyber-host .dg-cyber-ch,.hero-section h1.dg-cyber-host span{color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;background:none!important}"
+".dg-cyber-word{display:inline-flex!important;flex-wrap:nowrap!important;gap:0.02em!important;position:relative!important;align-items:baseline!important}"
+".dg-hero-hold .dg-cyber-word::after{content:'';position:absolute;left:0;right:.07em;bottom:-.14em;height:1px;background:linear-gradient(90deg,transparent,var(--dg-phosphor) 18%,var(--dg-signal) 82%,transparent);transform:none;animation:none;box-shadow:0 0 8px rgba(166,255,203,.35);opacity:.75}"
+"@keyframes dgCyberBreatheSoft{0%,100%{text-shadow:0 0 8px rgba(166,255,203,.35)}50%{text-shadow:0 0 14px rgba(166,255,203,.7),0 0 24px rgba(16,198,116,.28)}}"+"@media(prefers-reduced-motion:no-preference){.dg-cyber-ch{display:inline-block!important;opacity:1!important;animation:dgCyberBreatheSoft 14s ease-in-out calc(var(--i,0)*80ms) infinite!important;transform:none!important}}"+"@media(prefers-reduced-motion:reduce){.dg-cyber-ch{display:inline-block!important;opacity:1!important;animation:none!important;transform:none!important}}"
/* one letter soft pulse only — sparse over long hold */
+".dg-cyber-ch:nth-child(4){/* inherits soft breathe */}"
+".dg-cta-cyber.dg-cyber-host,.dg-cta-cyber .dg-cyber-word{font-size:1.02em!important;letter-spacing:.04em!important;font-weight:650!important;text-transform:none!important}"
+".hero-actions .dg-cta-cyber.dg-cyber-host,.hero-actions .dg-cta-cyber .dg-cyber-word{letter-spacing:-.02em!important;text-transform:none!important;font-family:var(--dg-sans)!important;text-shadow:none!important}"
+".dg-cta-cyber .dg-cyber-ch{animation-duration:1s,10s}"
+".dg-reduce .dg-cyber-ch,.dg-reduce .dg-cyber-word,.dg-reduce .dg-hero-hold .dg-cyber-word::after{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}"
+".nav_left,.nav_right{background:transparent!important}"
+"#main,main,h1.hero-title,.hero-section,.hero-section h1,#dg-page{scroll-margin-top:5.5rem!important}"
/* v632 Fable: DEMIGOD mono wordmark — balanced to 28px mark, flex gap */
+"a.nav_logo,.nav_logo,a.w-nav-brand,.w-nav-brand,a.logo-link,.logo-link{display:inline-flex!important;align-items:center!important;gap:.625rem!important;text-decoration:none!important}"
+".nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-family:var(--dg-sans)!important;color:var(--dg-paper)!important;font-size:1.05rem!important;font-weight:700!important;letter-spacing:-.01em!important;text-transform:none!important;line-height:1.1!important;margin:0!important;white-space:nowrap!important}"
+"a.nav_logo:hover [data-brand-name],a.nav_logo:hover .dg-brand-name,.w-nav-brand:hover [data-brand-name]{color:var(--dg-phosphor)!important}"
+".nav_logo-icon{color:var(--dg-phosphor)!important;animation:none!important;flex-shrink:0!important}"+".nav_logo-icon .dg-mark,.nav_logo-icon svg{display:block!important;width:28px!important;height:28px!important}"
+"@media (max-width:360px){.nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-size:.92rem!important;letter-spacing:-.01em!important}}"
+"#dg-nav-hire,#dg-nav-talent,#dg-top-nav .dg-nav-ctas,header a.button,header a.premium-btn,nav.w-nav a.button,nav.w-nav a.premium-btn,.nav_right a.button,.nav_right a.w-button,.nav_container a.button.on-inverse{display:none!important}"
+"#dg-bar a.button,#dg-bar a{display:flex!important}"
/* hero night stage */
+".hero-section,.header{display:flex!important}"
+"#dg-night-stage{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}"
+"#dg-night-stage .dg-grain{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(rgba(166,255,203,.10) .7px,transparent .7px);background-size:5px 5px;mix-blend-mode:soft-light;animation:none}"
+"#dg-night-stage .dg-stars{position:absolute;inset:-20%;background:radial-gradient(1px 1px at 20% 30%,var(--dg-phosphor),transparent),radial-gradient(1px 1px at 70% 20%,rgba(166,255,203,.45),transparent),radial-gradient(1px 1px at 85% 60%,var(--dg-phosphor),transparent);opacity:.18;animation:none}"
/* LARGE translucent art stage — full hero height, right ~64vw (was ~560px card) */
+"#dg-night-stage .dg-art-panel{position:absolute;right:0;top:0;bottom:0;width:min(64vw,960px);height:100%;border:0;overflow:hidden;"
+"-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"animation:none}"
+"#dg-night-stage .dg-art-picture{display:block;width:100%;height:100%}"
+"#dg-night-stage .dg-art-img{width:100%;height:100%;object-fit:cover;object-position:62% center;display:block;"
+"opacity:.28;filter:saturate(.65) contrast(1.05) brightness(.75);mix-blend-mode:soft-light}"
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
+"#dg-night-stage .dg-art-img{opacity:.22;mix-blend-mode:normal;object-position:center 30%}"
+"#dg-night-stage .dg-art-caption{display:none}"
+".hero-section::after,.header::after{background:linear-gradient(180deg,rgba(3,20,13,.92) 0%,rgba(3,20,13,.78) 42%,rgba(3,20,13,.45) 70%,rgba(3,20,13,.55) 100%)}"
+"}"
+".dg-eyebrow,#dg-eyebrow{font-family:var(--dg-mono)!important;font-size:.72rem!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--dg-signal)!important;margin:0 0 1.1rem!important;opacity:.9}"
+".hero-content-left,.hero-section>.container,.hero-container{max-width:min(48rem,100%)!important}"
+".hero-section h1,.header h1,.hero-title{text-shadow:0 2px 28px rgba(3,20,13,.55)!important}"
+".hero-section h1 em,.hero-title em,.dg-em{font-style:italic!important;color:rgba(243,240,231,.88)!important;font-weight:400!important}"
+".title-accent-gold,.title-accent-cream,.title-accent-red,.title-accent-blue,.hero-section h1 span{color:var(--dg-paper)!important;background:none!important;-webkit-text-fill-color:var(--dg-paper)!important}"
+".hero-section p,.header p,.subheading{position:relative;z-index:2;max-width:42ch!important;font-size:1.05rem!important;line-height:1.6!important;color:var(--dg-paper-mute)!important;margin:0 0 1.15rem!important;font-family:var(--dg-sans)!important}"
/* pass32: drop redundant lead under outcome — dual-path is the next mass */
+".hero-section .hero-description,.header .hero-description{display:none!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;visibility:hidden!important}"
+"#dg-hero-outcome,.dg-hero-outcome{margin:.4rem 0 .75rem!important;max-width:36ch!important;font-size:clamp(1.05rem,2.6vw,1.2rem)!important;line-height:1.45!important;font-weight:450!important;color:var(--dg-paper)!important;font-family:var(--dg-sans)!important}"
+".hero-badge,.badge-text{display:none!important}"
+"#dg-hero-chips,.dg-trust-line{position:relative;z-index:2;display:block!important;margin:.4rem 0 .7rem!important;max-width:34rem!important;color:var(--dg-paper-mute)!important;font-size:.88rem!important;font-weight:450!important;letter-spacing:0;background:transparent!important;font-family:var(--dg-sans)!important;line-height:1.5!important;opacity:.92}"
+"#dg-path-nudge{display:none!important}"
/* dual path frege-bracket cards */
+".hero-actions,.hero-actions.dg-path-pair{position:relative;z-index:5;display:grid!important;grid-template-columns:1fr 1fr!important;gap:1.15rem!important;max-width:min(44rem,100%)!important;width:100%!important;margin:.55rem 0 .2rem!important}"
+".hero-actions .dg-cta-wrap{display:block!important;min-width:0!important}"
+".hero-actions .dg-cta-wrap a,.hero-actions a.premium-btn,.hero-actions a.button,.hero-actions a.w-button,.hero-actions a[data-dg-cta]{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:.32rem!important;width:100%!important;height:100%!important;min-height:5.75rem!important;padding:1.15rem 1.3rem!important;border-radius:14px!important;font-weight:600!important;font-size:1.1rem!important;line-height:1.22!important;letter-spacing:-.015em!important;text-decoration:none!important;font-family:var(--dg-sans)!important;cursor:pointer!important;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease!important}"
+".hero-actions a[data-dg-cta=hire],.hero-actions a.is-talent{background:linear-gradient(180deg,#34d399,#10c674)!important;color:#03140d!important;border:1px solid rgba(16,198,116,.9)!important;box-shadow:0 10px 28px rgba(16,198,116,.22),inset 0 1px 0 rgba(255,255,255,.18)!important}"
+".hero-actions a[data-dg-cta=hire]:hover,.hero-actions a.is-talent:hover{transform:translateY(-2px)!important;box-shadow:0 14px 32px rgba(16,198,116,.28)!important;border-color:rgba(166,255,203,.65)!important;filter:brightness(1.03)}"

+".hero-actions a[data-dg-cta=hire] .dg-cta-label,.hero-actions a.is-talent .dg-cta-label{color:#03140d!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-hint,.hero-actions a.is-talent .dg-cta-hint{color:rgba(3,20,13,.72)!important}"
+".hero-actions a[data-dg-cta] .dg-cta-label{display:block!important;line-height:1.18!important;font-size:1.12rem!important;font-weight:700!important;letter-spacing:-.02em!important;margin:0!important}"+".hero-actions a[data-dg-cta] .dg-cta-hint{display:block!important;line-height:1.35!important;font-size:.8rem!important;font-weight:500!important;letter-spacing:0!important;margin:.15rem 0 0!important;opacity:.88!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:before,.hero-actions a.is-talent .dg-cta-label:before{content:none!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:after,.hero-actions a.is-talent .dg-cta-label:after{content:none!important}"
+".hero-actions a[data-dg-cta=talent],.hero-actions a.is-job{background:rgba(166,255,203,.1)!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.58)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 6px 18px rgba(0,0,0,.12)!important}"
+".hero-actions a[data-dg-cta=talent]:hover,.hero-actions a.is-job:hover{transform:translateY(-2px)!important;background:rgba(166,255,203,.14)!important;border-color:rgba(166,255,203,.72)!important;box-shadow:0 12px 28px rgba(0,0,0,.28)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label,.hero-actions a[data-dg-cta=talent] .dg-cta-hint,.hero-actions a.is-job .dg-cta-label{color:var(--dg-paper)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:before{content:none!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:after{content:none!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-hint{color:var(--dg-paper-mute)!important;font-size:.8rem!important;font-weight:500!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-hint{opacity:.88!important;font-size:.8rem!important;font-weight:500!important}"
+".hero-actions a .btn-arrow,.hero-actions a svg{display:none!important}"
+"#dg-hero-outcome,.dg-hero-outcome{max-width:36rem!important;margin:.45rem 0 .15rem!important;font:500 clamp(1.02rem,2.1vw,1.18rem)/1.45 var(--dg-sans)!important;letter-spacing:-.01em!important;color:var(--dg-paper-mute,#c8d4cc)!important}"
+"#dg-bar{background:rgba(3,20,13,.96)!important;border-top:1px solid var(--dg-rule)!important}"
+"#dg-bar a.dg-h{background:linear-gradient(180deg,#34d399,#10c674)!important;color:#03140d!important;border:1px solid rgba(16,198,116,.9)!important;font-weight:700!important}"
+"#dg-bar a.dg-j{background:rgba(166,255,203,.1)!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.55)!important}"
+"#dg-path-pills{display:none!important}" /* design-track: nav owns those links */
+"#dg-path-pills a{color:var(--dg-paper-mute)!important;font-size:.82rem!important;letter-spacing:.06em!important;text-transform:lowercase!important;text-decoration:none!important;background:transparent!important;border:0!important;min-width:48px!important;min-height:48px!important;padding:0 .25rem!important;display:inline-flex!important;align-items:center!important;transition:color .2s ease!important}"
+"#dg-path-pills a:hover{color:var(--dg-phosphor)!important}"
+"#dg-cap-strip{display:none!important}"
+"#dg-night-stage .dg-art-caption,.dg-art-caption,#dg-eyebrow,.dg-eyebrow{display:none!important}"
/* below fold night institutional */
+"#demigod-trust-block,#dg-faq,#dg-proof-strip,#dg-pipeline-note,#dg-contact-strip,#dg-hero-trust,#insights-section,.insights-section{display:none!important}"
/* process/pricing hierarchy — editorial sequence, not identical SaaS cards */
+"section.trust-section,section:has(.steps-grid),section:has(.pricing-grid){display:block!important;visibility:visible!important;opacity:1!important;color:var(--dg-paper)!important;background-image:none!important;border-top:1px solid var(--dg-rule)!important}"
+"section.trust-section,section:has(.steps-grid){background:linear-gradient(180deg,rgba(166,255,203,.03) 0%,var(--dg-night) 28%)!important;padding:clamp(1.85rem,4vh,2.75rem) 1.25rem clamp(2.25rem,5.5vh,3.5rem)!important}"
+"section:has(.pricing-grid){background:var(--dg-night)!important;padding:clamp(2rem,4.5vh,3rem) 1.25rem clamp(2.15rem,5vh,3.25rem)!important}"
+".roles-header,.roles-grid,[data-dg-hidden=roles-simplify]{display:none!important}"
+".trust-header,.pricing-grid{max-width:56rem!important;margin-left:auto!important;margin-right:auto!important}"
+".trust-header{box-sizing:border-box!important;display:block!important;width:100%!important;max-width:56rem!important;margin:0 auto 1.35rem!important;text-align:left!important}"
+".trust-header h2,section:has(.steps-grid) h2,section.trust-section h2{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;font-size:clamp(1.85rem,3.8vw,2.6rem)!important;font-weight:480!important;letter-spacing:-.03em!important;line-height:1.12!important;margin:0 0 .75rem!important;text-align:left!important;text-transform:none!important;max-width:min(28ch,100%)!important}"
+"main section h2,section.trust-section h2,section:has(.steps-grid) h2,section:has(.pricing-grid) h2,.trust-header h2,h2.heading_primary,h2.heading_secondary,h2{letter-spacing:-.03em!important;text-transform:none!important;word-spacing:normal!important;font-kerning:normal!important}"

+"section:has(.pricing-grid) h2{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;font-size:clamp(1.65rem,3.2vw,2.25rem)!important;font-weight:480!important;letter-spacing:-.03em!important;margin:0 0 .55rem!important;text-align:left!important;text-transform:none!important;max-width:28ch!important}"
+".trust-header p,.paragraph_large,section:has(.steps-grid) .paragraph_large{color:var(--dg-paper-mute)!important;font-size:1rem!important;max-width:40ch!important;font-family:var(--dg-sans)!important;line-height:1.55!important;margin:0!important;text-align:left!important}"
+".steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:clamp(1.5rem,3.5vw,2.35rem)!important;max-width:56rem;margin:.85rem auto 0!important;align-items:start!important}"
+".step-card{background:transparent!important;border:0!important;border-top:1px solid rgba(166,255,203,.22)!important;border-radius:0!important;padding:1.05rem .65rem .35rem!important;color:var(--dg-paper)!important;box-shadow:none!important;transition:border-color .25s ease!important;min-height:0!important}"
+".step-card:hover{transform:none!important;border-top-color:rgba(166,255,203,.55)!important;box-shadow:none!important}"
+".step-num{display:block!important;color:var(--dg-phosphor)!important;font-size:clamp(1.85rem,3.4vw,2.5rem)!important;font-weight:500!important;letter-spacing:-.04em!important;line-height:1!important;font-family:var(--dg-serif)!important;margin:0 0 .55rem!important;opacity:.92}"
+".step-title{font-size:1.18rem!important;font-weight:600!important;margin:0 0 .5rem!important;color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;letter-spacing:-.025em!important;line-height:1.2!important}"
+".step-desc,.step-card p{font-size:1rem!important;line-height:1.55!important;color:var(--dg-paper-mute)!important;max-width:38ch!important;margin:0!important}"
+".step-desc{color:var(--dg-paper-mute)!important;font-size:.92rem!important;max-width:28ch!important;font-family:var(--dg-sans)!important;line-height:1.55!important;margin:0!important}"
+"#dg-pricing-note{color:var(--dg-paper-mute)!important;font-size:1rem!important;line-height:1.5!important;max-width:40ch!important;margin:.25rem 0 1rem!important;font-family:var(--dg-sans)!important}"
+".pricing-grid,.pricing-grid.is-single{display:block!important;box-sizing:border-box!important;width:100%!important;max-width:56rem!important;margin:1.5rem auto 0!important}.pricing-card{max-width:26rem!important;margin-left:0!important;margin-right:auto!important;width:100%!important}"
+".pricing-card{background:rgba(166,255,203,.045)!important;border:1px solid rgba(166,255,203,.3)!important;border-radius:12px!important;padding:clamp(1.75rem,3.2vw,2.25rem) clamp(1.4rem,2.6vw,1.85rem)!important;color:var(--dg-paper)!important;animation:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}"
+".pricing-card h3{color:var(--dg-paper-mute)!important;letter-spacing:-.015em!important;font-size:.92rem!important;text-transform:none!important;font-family:var(--dg-sans)!important;font-weight:600!important;margin:0 0 .65rem!important;line-height:1.25!important}"
+".pricing-card .pricing-amount,.pricing-card .price,.pricing-card h3 + div{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;font-size:clamp(2.4rem,5vw,3.1rem)!important;font-weight:480!important;letter-spacing:-.03em!important;line-height:1!important;margin:.15rem 0 .5rem!important}"
+".pricing-card > div > div{color:var(--dg-paper-mute)!important;font-family:var(--dg-sans)!important;font-size:.92rem!important;line-height:1.5!important}.pricing-card h3 + div + div{font-size:.95rem!important;color:var(--dg-paper-mute)!important;margin:0 0 1rem!important}"
+".pricing-card a.premium-btn,.pricing-card a.button,.pricing-card a.is-talent,.pricing-card a.on-inverse,.pricing-card a.w-button,.pricing-card a[data-dg-cta]{margin-top:1.35rem!important;min-height:5rem!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:.28rem!important;border-radius:14px!important;background:linear-gradient(180deg,#34d399,#10c674)!important;color:#03140d!important;-webkit-text-fill-color:#03140d!important;border:1px solid rgba(16,198,116,.9)!important;padding:1.05rem 1.25rem!important;font-family:var(--dg-sans),Manrope,system-ui,sans-serif!important;font-weight:700!important;width:100%!important;text-shadow:none!important;letter-spacing:-.015em!important;text-transform:none!important;text-align:left!important;box-shadow:0 10px 28px rgba(16,198,116,.18)!important}"
+".pricing-card a .dg-cta-label{display:block!important;font-size:1.1rem!important;font-weight:700!important;color:#03140d!important;-webkit-text-fill-color:#03140d!important;line-height:1.18!important;letter-spacing:-.02em!important}"
+".pricing-card a .dg-cta-hint{display:block!important;font-size:.8rem!important;font-weight:500!important;color:rgba(3,20,13,.72)!important;-webkit-text-fill-color:rgba(3,20,13,.72)!important;line-height:1.35!important;letter-spacing:0!important;opacity:.9!important}"
+"footer,.footer{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:clamp(1.75rem,3.5vw,2.75rem) 1.25rem!important;text-align:left!important;border-top:1px solid var(--dg-rule)!important;background:var(--dg-night)!important}"
+"#dg-footer-panel{box-sizing:border-box;width:min(72rem,100%);margin:0 auto;display:grid;gap:clamp(1.15rem,2.5vw,1.75rem);font-family:var(--dg-sans);color:var(--dg-paper)}"
+".dg-footer-actions{width:100%;max-width:min(44rem,100%);display:grid;grid-template-columns:1fr 1fr;gap:1rem}.dg-footer-actions a{box-sizing:border-box;min-width:0;min-height:5rem;padding:1.05rem 1.2rem;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:.28rem;border:1px solid rgba(166,255,203,.55);border-radius:14px;color:var(--dg-paper)!important;text-decoration:none!important;font-family:var(--dg-sans)!important;background:rgba(166,255,203,.1);text-align:left}.dg-footer-actions a:first-child,.dg-footer-actions a[data-dg-cta=hire]{background:linear-gradient(180deg,#34d399,#10c674)!important;border-color:rgba(16,198,116,.9)!important;color:#03140d!important;box-shadow:0 10px 28px rgba(16,198,116,.18)}.dg-footer-actions a:first-child strong,.dg-footer-actions a[data-dg-cta=hire] strong{color:#03140d!important}.dg-footer-actions a:first-child span,.dg-footer-actions a[data-dg-cta=hire] span{color:rgba(3,20,13,.72)!important}.dg-footer-actions strong{font-size:.98rem;line-height:1.25;font-weight:700}.dg-footer-actions span{color:var(--dg-paper-mute);font-size:.74rem;line-height:1.3;font-weight:500}.dg-footer-actions a:hover{border-color:rgba(166,255,203,.55)!important;transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.26)}.dg-footer-actions a:first-child:hover,.dg-footer-actions a[data-dg-cta=hire]:hover{box-shadow:0 12px 30px rgba(16,198,116,.26)!important;filter:brightness(1.03)}"
+"#dg-legal-links{display:grid!important;grid-template-columns:1fr 1fr!important;align-items:start!important;gap:clamp(.85rem,2vw,1.25rem) clamp(1.25rem,4vw,2.5rem)!important;margin:0!important;padding:clamp(.65rem,1.5vw,1rem) 0!important;border-top:1px solid var(--dg-rule);border-bottom:1px solid var(--dg-rule)}"
+".dg-footer-group{flex:1 1 14rem;display:grid!important;grid-template-columns:1fr 1fr!important;column-gap:1rem!important;row-gap:0!important;align-content:start!important;align-items:start!important;opacity:1!important;visibility:visible!important}.dg-footer-heading{grid-column:1/-1!important;margin:0 0 .55rem!important;color:var(--dg-signal)!important;font-family:var(--dg-mono)!important;font-size:.68rem!important;font-weight:750!important;letter-spacing:.14em!important;text-transform:uppercase!important}"
+"#dg-legal-links a{box-sizing:border-box;min-width:44px;min-height:48px!important;padding:.4rem 0!important;display:inline-flex!important;align-items:center;color:var(--dg-paper-mute)!important;font-size:.92rem!important;line-height:1.4;letter-spacing:-.01em;text-decoration:none!important}"
+"#dg-legal-links a:hover{color:var(--dg-phosphor)!important}"
+".dg-footer-bottom{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:1.25rem 3rem}.dg-footer-fee{max-width:52rem;margin:0;color:var(--dg-paper-mute);font-size:.85rem;line-height:1.6}"
+"#dg-copyright,footer [class*=copyright],footer .text-color_secondary{margin:0;color:rgba(189,201,191,.72)!important;font-size:.78rem!important;line-height:1.5;white-space:nowrap}"
+"footer .w-layout-grid,footer .footer_icon-group,footer .button-group,footer ul{display:none!important}"
+"@media(max-width:700px){footer,.footer{padding:2.5rem 1.25rem 3rem!important}.dg-footer-actions{grid-template-columns:1fr}.dg-footer-actions a{min-height:68px}#dg-legal-links{display:grid!important;grid-template-columns:1fr 1fr!important;gap:1.25rem 1rem!important}.dg-footer-group{grid-template-columns:1fr!important}.dg-footer-heading{grid-column:1/-1!important}#dg-legal-links a{min-height:48px!important;padding:.35rem 0!important}.dg-footer-bottom{grid-template-columns:1fr;gap:.75rem}#dg-copyright{white-space:normal}}"
+"a:focus-visible,button:focus-visible,.premium-btn:focus-visible,#dg-bar a:focus-visible{outline:2px solid var(--dg-phosphor)!important;outline-offset:3px!important}"
/* motion reveals */
+".step-card,.step-card.dg-reveal{opacity:1!important;transform:none!important}"
+".dg-reveal{opacity:0;transform:translateY(14px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0ms)}"
+".hero-section h1,.header h1,.hero-title,.hero-actions .dg-cta-wrap,#dg-hero-outcome,.dg-hero-outcome,#dg-hero-chips,.dg-trust-line{opacity:1!important;transform:none!important;transition:none!important}"
+".dg-reveal.dg-in,.dg-motion .dg-reveal.dg-in{opacity:1;transform:none}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label,body[data-dg-ready=\"1\"] .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label{animation:none!important}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-cyber .dg-cyber-ch{text-shadow:none!important}"
+".dg-reduce .dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+"#dg-observed-roles{position:relative;z-index:2;padding:clamp(1.1rem,2.5vh,1.75rem) 1.25rem;border-top:1px solid var(--dg-rule);background:var(--dg-night);color:var(--dg-paper)}"+"#dg-observed-roles .dg-obs-inner{max-width:56rem;margin:0 auto}"+"#dg-observed-roles .dg-obs-kicker{margin:0 0 .35rem;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--dg-signal);font-weight:700}"+"#dg-observed-roles h2{margin:0 0 .5rem;font-family:var(--dg-serif);font-size:clamp(1.4rem,2.7vw,1.85rem);font-weight:500;letter-spacing:-.03em;color:var(--dg-paper);text-transform:none;line-height:1.15}"+"#dg-observed-roles .dg-obs-note{margin:0 0 .85rem;max-width:40rem;color:var(--dg-paper-mute);font-size:.88rem;line-height:1.5;font-weight:450}"+"#dg-observed-roles .dg-obs-list{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr;gap:.28rem .75rem}@media(min-width:700px){#dg-observed-roles .dg-obs-list{grid-template-columns:1fr 1fr}}"+"#dg-observed-roles .dg-obs-list a{color:var(--dg-phosphor);text-decoration:none;font-weight:600;line-height:1.3}"+"#dg-observed-roles .dg-obs-list li{display:flex;flex-direction:column;gap:.15rem;padding:.15rem 0;border-bottom:1px solid rgba(166,255,203,.1)}#dg-observed-roles .dg-obs-meta{color:var(--dg-paper-mute);font-size:.72rem;font-weight:500;opacity:.8;letter-spacing:0;line-height:1.35}"+"#dg-observed-roles .dg-obs-more{margin:1.15rem 0 0}"+"#dg-observed-roles .dg-obs-more a{color:var(--dg-phosphor);font-weight:600}"
/* Row layout: company leads, role is secondary, the outbound arrow replaces a sentence. */
+"#dg-observed-roles .dg-obs-list li{padding:0;border-bottom:1px solid rgba(166,255,203,.08)}"
+"#dg-observed-roles .dg-obs-list a{display:grid!important;grid-template-columns:1fr auto;align-items:center;column-gap:.65rem;padding:.65rem .55rem;min-height:48px;border-radius:8px;transition:background .18s ease,padding-left .18s ease;font-size:.95rem;letter-spacing:-.01em}"
+"#dg-observed-roles .dg-obs-list a:hover{background:rgba(166,255,203,.08);padding-left:.65rem;text-decoration:none}"
+"#dg-observed-roles .dg-obs-co{color:var(--dg-paper);font-weight:600;letter-spacing:-.01em}"
+"#dg-observed-roles .dg-obs-role{grid-column:1;color:var(--dg-paper-mute);font-weight:400;font-size:.86rem;line-height:1.35}"
+"#dg-observed-roles .dg-obs-go{grid-row:1;grid-column:2;color:var(--dg-phosphor);opacity:.45;font-size:.85rem;transition:opacity .18s ease,transform .18s ease}"
+"#dg-observed-roles .dg-obs-list a:hover .dg-obs-go{opacity:1;transform:translate(2px,-2px)}"
+"#dg-observed-roles .dg-obs-meta{display:block;padding:0 0 .5rem}"
+"@media(prefers-reduced-motion:reduce){#dg-observed-roles .dg-obs-list a,#dg-observed-roles .dg-obs-go{transition:none}}"
+".dg-reduce body::before,.dg-reduce #dg-night-stage .dg-grain,.dg-reduce #dg-night-stage .dg-stars,.dg-reduce #dg-night-stage .dg-art-panel,.dg-reduce .nav_logo-icon,.dg-reduce .pricing-card{animation:none!important}"
+"@media(max-width:767px){.step-card{min-height:0!important;padding-top:1rem!important}.dg-footer-actions{display:none!important}.hero-actions,.hero-actions.dg-path-pair{display:grid!important;grid-template-columns:1fr!important;gap:.9rem!important;max-width:100%!important;margin:.5rem 0 .15rem!important}.hero-actions a[data-dg-cta],.hero-actions a.premium-btn{min-height:5rem!important;width:100%!important;padding:1rem 1.15rem!important}#dg-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:10060;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))!important;background:rgba(3,20,13,.97)!important;border-top:1px solid var(--dg-rule)!important}#dg-bar a{min-height:56px!important;border-radius:12px!important;font-size:.9rem!important;font-weight:650!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.12rem!important;padding:.45rem .5rem!important;text-decoration:none!important;font-family:var(--dg-sans)!important;line-height:1.15!important;text-align:center!important}#dg-bar a .dg-bar-label{display:block!important;font-size:.9rem!important;font-weight:700!important;letter-spacing:-.015em!important;line-height:1.15!important}#dg-bar a .dg-bar-hint{display:block!important;font-size:.62rem!important;font-weight:500!important;letter-spacing:0!important;line-height:1.25!important;opacity:.82!important;max-width:18ch!important}#dg-bar a.dg-h{background:linear-gradient(180deg,#34d399,#10c674)!important;color:#03140d!important;border:1px solid rgba(16,198,116,.9)!important;font-weight:700!important}#dg-bar a.dg-h .dg-bar-hint{color:rgba(3,20,13,.72)!important;opacity:.9!important}#dg-bar a.dg-j{background:rgba(166,255,203,.1)!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.55)!important}#dg-bar a.dg-j .dg-bar-hint{color:var(--dg-paper-mute)!important}body{padding-bottom:calc(86px + env(safe-area-inset-bottom,0px))!important}.steps-grid{grid-template-columns:1fr!important}#dg-night-stage .dg-art-caption,.dg-art-caption{display:none!important}.dg-eyebrow,#dg-eyebrow{display:none!important}}"
+"@media(min-width:768px){#dg-bar{display:none!important}body{padding-bottom:0!important}}"
+"@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}"
+".pricing-card-border-red,.pricing-card [class*=border-red]{display:none!important;height:0!important;background:transparent!important}"+".pricing-card-divider{height:1px!important;margin:.85rem 0 1rem!important;background:rgba(166,255,203,.18)!important;border:0!important}"+".pricing-card > div:nth-child(3){display:flex!important;flex-direction:column!important;gap:.55rem!important}"+".pricing-card > div > div:not(.pricing-amount){position:relative!important;padding:.15rem 0 .15rem 1rem!important;margin:0!important;color:var(--dg-paper-mute)!important;font-size:.92rem!important;line-height:1.45!important;font-family:var(--dg-sans)!important}"+".pricing-card > div > div:not(.pricing-amount)::before{content:''!important;position:absolute!important;left:0!important;top:.55em!important;width:6px!important;height:6px!important;border-radius:50%!important;background:rgba(16,198,116,.55)!important}"+".pricing-card > div:first-child > div{padding-left:0!important}.pricing-card > div:first-child > div::before{content:none!important}"+".pricing-card .btn-label,.pricing-card .btn-content,.pricing-card .button_label,.pricing-card a .btn-label,.pricing-card a span{font-family:var(--dg-sans),Manrope,system-ui,sans-serif!important;color:#03140d!important;-webkit-text-fill-color:#03140d!important;letter-spacing:-.01em!important;text-transform:none!important;font-weight:700!important}#startup-modal .modal-title,#jobseeker-modal .modal-title,#startup-modal h2.modal-title,#jobseeker-modal h2.modal-title{font-family:var(--dg-sans),Manrope,system-ui,sans-serif!important;color:var(--dg-paper)!important;letter-spacing:-.02em!important;text-transform:none!important}"+"";document.head.appendChild(s)}


function ensureA11yCss(){try{qa('a.modal-close-btn').forEach(function(a){var b=document.createElement('button');b.type='button';b.className=a.className;b.innerHTML=a.innerHTML;b.setAttribute('aria-label',a.getAttribute('aria-label')||'Close');a.replaceWith(b)});qa('.modal-close-btn').forEach(function(b){if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Close')})}catch(e){}try{qa('.w-file-upload-error').forEach(function(b){if(!b.getAttribute('role'))b.setAttribute('role','alert');if(!b.getAttribute('aria-live'))b.setAttribute('aria-live','assertive');});}catch(e){}}

function dgIdle(fn,ms){ms=ms||2000;try{if(window.requestIdleCallback){requestIdleCallback(function(){try{fn()}catch(e){console.error('Demigod idle',e)}},{timeout:ms});return}}catch(e){}setTimeout(function(){try{fn()}catch(e){console.error('Demigod idle',e)}},Math.min(ms,400))}
/* v855: run critical path first; honesty scrubs after paint to cut main-thread TBT on home. */

/* design-track v912: calmer WIZ type */
function ensureWizCalmCss(){if(q('#dg-wiz-calm-css'))return;var s=document.createElement('style');s.id='dg-wiz-calm-css';s.textContent='#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q{font-family:var(--dg-sans)!important;font-size:clamp(1.25rem,2.8vw,1.65rem)!important;font-weight:600!important;letter-spacing:-.02em!important;text-transform:none!important;color:var(--dg-paper)!important;line-height:1.25!important;text-shadow:none!important}#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{font-size:.92rem!important;line-height:1.45!important;color:var(--dg-paper-mute)!important}#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next,#startup-modal .dg-wiz-start,#jobseeker-modal .dg-wiz-start{border-radius:12px!important;min-height:48px!important;font-family:var(--dg-sans)!important;font-weight:700!important;background:#a6ffcb!important;color:#03140d!important;border:0!important}#startup-modal .w-form,#jobseeker-modal .w-form{border-radius:18px!important;padding:1.15rem 1.2rem 1.35rem!important;max-width:min(32rem,100%)!important;margin:0 auto!important}#startup-modal .dg-wiz-bar>i,#jobseeker-modal .dg-wiz-bar>i{background:var(--dg-signal)!important;box-shadow:none!important}#startup-modal .dg-wiz-next[data-enter-hint],#jobseeker-modal .dg-wiz-next[data-enter-hint]{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.18rem!important;line-height:1.2!important;text-align:center!important}#startup-modal .dg-wiz-next[data-enter-hint]::after,#jobseeker-modal .dg-wiz-next[data-enter-hint]::after{content:attr(data-enter-hint);display:block!important;font-size:.62rem!important;font-weight:500!important;opacity:.55!important;letter-spacing:.04em!important;margin:0!important;line-height:1!important}';document.head.appendChild(s);}

/* Observed public ATS roles — not matching inventory (not DEMIGOD-BOARD seeds). */
function injectObservedRoles(){
  try{
    // Product shells (#dg-page) own the primary H1. Idle inject after openPage was
    // re-appending this rail as a large H2 and stealing the conversion-audit hero.
    if(document.body&&document.body.classList.contains('dg-page-on')){
      var parked=q('#dg-observed-roles');
      if(parked)parked.style.setProperty('display','none','important');
      return;
    }
    var data=window.__dgPublicRoles;
    if(!data||data.schema!=='demigod.public-roles/1'||!Array.isArray(data.roles)||!data.roles.length)return;
    var host=q('#dg-observed-roles');
    if(!host){
      host=document.createElement('section');
      host.id='dg-observed-roles';
      host.setAttribute('aria-labelledby','dg-observed-roles-h');
      var anchor=q('#demigod-pricing')||q('.pricing-section')||q('footer')||document.body;
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(host,anchor);
      else document.body.appendChild(host);
    }
    var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
    var items=data.roles.slice(0,8).map(function(r){
      var url=String(r.url||'');
      if(!/^https:\/\//i.test(url))return '';
      // Meta line: observation day + optional public employer fields from Clay enrich payload.
      var metaBits=[];
      // One date + place + non-default work mode. Prefer employer postedAt; else our first-seen.
      // Relative labels for recent days (datetime stays ISO). Skip FullTime/OnSite noise.
      var fmtObsDay=function(iso){
        var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
        if(!m)return String(iso||'');
        var t=Date.UTC(+m[1],+m[2]-1,+m[3]);
        var n=new Date();
        var today=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate());
        var days=Math.round((today-t)/864e5);
        if(days<=0)return 'today';
        if(days===1)return '1d ago';
        if(days<14)return days+'d ago';
        return m[0];
      };
      var posted=r.postedAt&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.postedAt).slice(0,10))?String(r.postedAt).slice(0,10):'';
      var seen=r.firstObservedAt&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.firstObservedAt).slice(0,10))?String(r.firstObservedAt).slice(0,10):'';
      if(posted)metaBits.push('<time class="dg-obs-posted" datetime="'+esc(posted)+'">Posted '+esc(fmtObsDay(posted))+'</time>');
      else if(seen)metaBits.push('<time datetime="'+esc(seen)+'">First seen '+esc(fmtObsDay(seen))+'</time>');
      var place=r.employerOffice?String(r.employerOffice).trim():(r.location?String(r.location).trim():'');
      if(place)metaBits.push('<span class="dg-obs-loc">'+esc(place.slice(0,80))+'</span>');
      var wt=r.workplaceType?String(r.workplaceType).trim():'';
      if(wt&&!/^(on\s*site|onsite|full\s*time)$/i.test(wt))metaBits.push('<span class="dg-obs-work">'+esc(wt.slice(0,40))+'</span>');
      var et=r.employmentType?String(r.employmentType).trim():'';
      if(et&&!/^(full[\s-]?time|fulltime)$/i.test(et))metaBits.push('<span class="dg-obs-emp">'+esc(et.slice(0,40))+'</span>');
      var meta=metaBits.length?'<p class="dg-obs-meta">'+metaBits.join(' · ')+'</p>':'';
      return '<li><a href="'+esc(url)+'" rel="nofollow noopener" target="_blank">'+
        '<span class="dg-obs-co">'+esc(r.company)+'</span>'+
        '<span class="dg-obs-role">'+esc(r.title)+'</span>'+
        '<span class="dg-obs-go" aria-hidden="true">&#8599;</span></a>'+meta+'</li>';
    }).filter(Boolean).join('');
    if(!items)return;
    host.innerHTML=
      '<div class="dg-obs-inner">'+
      /* Title is "Open roles" (user: no "recently observed roles" label). Inventory honesty
         stays in a short note; outbound ↗ marks employer boards. Sample-title scrub skips
         #dg-observed-roles so exact "Open roles" is not rewritten to "Example roles". */
      '<h2 id="dg-observed-roles-h">Open roles</h2>'+
      '<p class="dg-obs-note">Public employer ATS postings we observe — not Demigod matches, not engaged searches. Hire through us via a brief.</p>'+
      '<ul class="dg-obs-list">'+items+'</ul>'+
      '<p class="dg-obs-more"><a href="/startups" data-dg-page="map">Browse startup directory (SF · LA · NYC roles) →</a> · <a href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a></p>'+
      '</div>';
  }catch(e){}
}

function run(){if(busy)return;busy=true;try{brandAssets();ensureA11yCss()}catch(e){}try{skipLink();heroImgPerf();lazyBelowFold();hero();injectNightHero();copy();forms();referralNotice();fileUploadHonest();cta();fixFooterCtas();ctaHints();nav();ensureMotion();try{wireLogoHome();ensureLogo()}catch(e){}(function roles(){qa('h2,h3,.heading_primary,.heading_tertiary').forEach(function(h){if(h.id==='dg-observed-roles-h'||(h.closest&&h.closest('#dg-observed-roles')))return;var tx=(h.textContent||'').trim();/* exact Webflow sample titles only — never rewrite real "Open roles" rails (atlas + ATS) */if(/^(Live SF startup roles hiring now|Examples? of roles(?:\s*[—\-].*)?|Roles hiring now|Examples of roles we can help with)$/i.test(tx))h.textContent='Example roles — labeled samples';});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$|^EXAMPLE ROLES$/i.test((b.textContent||'').trim()))b.textContent='Samples'});qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.68rem;font-weight:600;color:#bdc9bf;border:1px solid rgba(166,255,203,.28);border-radius:4px;padding:1px 6px;margin:0 0 .35rem;letter-spacing:.04em;text-transform:none';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)});qa('h2,h3,.heading_primary,.heading_tertiary').forEach(function(h){if(h.id==='dg-observed-roles-h'||(h.closest&&h.closest('#dg-observed-roles')))return;var tx=(h.textContent||'').trim();if(!/^(Open roles|Examples of roles we can help with)$/i.test(tx))return;var root=h.closest('section,.roles-grid,div')||h.parentElement;if(!root)return;var cards=root.querySelectorAll('.role-card');if(!cards.length)return;var allSample=true;for(var i=0;i<cards.length;i++){if(!cards[i].querySelector('.dg-sample-tag')){allSample=false;break;}}if(allSample)h.textContent='Example roles — labeled samples';});var junk=new RegExp(['l','orem'].join('')+'|consectetur','i');qa('section,div,[class*=role]').forEach(function(c){if(c!==document.body&&c!==document.documentElement&&!c.matches?.('main,.hero-section,header,footer')&&junk.test(c.textContent||'')&&(c.textContent||'').length<2000)c.style.setProperty('display','none','important')});var ins=q('#insights-section');if(ins)ins.style.setProperty('display','none','important');qa('h3.step-title,.step-title,h2,h3').forEach(function(h){if(/Meet Your 3-5|Lightning Fast|100% Vetted/i.test(h.textContent||'')){var card=h.closest('.step-card,div,section')||h;if(/Meet Your 3-5|Meet Your\s*3/i.test(h.textContent||'')){h.textContent='Meet proposed fits';var d=card.querySelector&&card.querySelector('.step-desc,p');if(d&&/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(d.textContent||''))d.textContent='Startups get proposed fits after human review — no volume promise.';}if(/Lightning Fast/i.test(h.textContent||''))h.textContent='Human-paced matching';if(/^100% Vetted/i.test(h.textContent||''))h.textContent='Human-reviewed'}});qa('p.step-desc,.step-desc').forEach(function(p){if(/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(p.textContent||''))p.textContent='Startups get proposed fits after human review — no volume promise.';});qa('p,li,span,div').forEach(function(el){if(el.children&&el.children.length>2)return;var tx=el.textContent||'';if(tx.length>200)return;if(/90-?\s*day replacement guarantee/i.test(tx)&&!el.closest('#startup-modal,#jobseeker-modal')){el.textContent=tx.replace(/90-?\s*day replacement guarantee/ig,'human-reviewed matching')}})})();dgIdle(injectObservedRoles,1200);mob();if(!OPEN)hide();/* v970: below-fold observed roles no longer block first paint */}catch(e){console.error('Demigod foot fail',e)}finally{busy=false}
  dgIdle(function(){trust();foot();rmOrphanForms();successCta()},2200);
  dgIdle(dedupeAll,2600);
  dgIdle(function(){scrubTimeClaims();scrubStaticLabels();scrubBadStaticClaims()},0);
  dgIdle(function(){try{hero()}catch(e){}try{document.documentElement.classList.add('dg-cta-honest','dg-pricing-honest','dg-volume-honest')}catch(e){}qa('a[target=_blank]').forEach(function(a){var r=a.getAttribute('rel')||'';if(r.indexOf('noopener')<0)a.setAttribute('rel',(r+' noopener noreferrer').trim())})},3400);
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
        .replace(/Meet Your 3-5[^.<]{0,40}/ig,'Meet proposed fits')
        .replace(/receive\s+3[\s–-]5\s+highly\s+aligned[^.]{0,100}\.?/ig,'get proposed fits after human review — no volume promise.')
        .replace(/3[\s–-]5\s+highly\s+aligned[^.]{0,80}\.?/ig,'proposed fits after human review — no volume promise.')
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

/* Social meta dedupe — scoring mirrors demigod-social-meta-dedupe.mjs */
function scoreSocialMetaContent(t){
  t=String(t||'');
  var n=0;
  if(/mutual yes/i.test(t)) n+=4;
  if(/first[- ]?year base|first result|concrete first result/i.test(t)) n+=3;
  if(/10%/.test(t)) n+=2;
  if(/human review|humans review|human-reviewed/i.test(t)) n+=1;
  if(t.length>90) n+=1;
  if(/tech ranks fit/i.test(t)) n-=2;
  if(!t.trim()) n-=10;
  return n;
}
function dedupeSocialMeta(){
  var groups={};
  qa('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach(function(el){
    var prop=el.getAttribute('property');
    var name=el.getAttribute('name');
    var k=prop?('property:'+String(prop).toLowerCase()):(name?('name:'+String(name).toLowerCase()):'');
    if(!k) return;
    (groups[k]=groups[k]||[]).push(el);
  });
  Object.keys(groups).forEach(function(k){
    var list=groups[k];
    if(list.length<2) return;
    var best=list[0], bestS=scoreSocialMetaContent(best.getAttribute('content'));
    for(var i=1;i<list.length;i++){
      var s=scoreSocialMetaContent(list[i].getAttribute('content'));
      var longer=s===bestS&&String(list[i].getAttribute('content')||'').length>String(best.getAttribute('content')||'').length;
      if(s>bestS||longer){ best=list[i]; bestS=s; }
    }
    list.forEach(function(el){ if(el!==best&&el.parentNode) el.parentNode.removeChild(el); });
  });
}
function scrubStaticLabels(){
  // SAFE scrub: only leaf Webflow title strings. NEVER hide #startup-modal / #jobseeker-modal / form containers.
  try {
    if (document.title && /HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS|^Untitled$/i.test(document.title)) {
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
    else if(/^GET MATCHED TO SF STARTUPS$/i.test(t)||/^JOIN NETWORK$/i.test(t)||/^I.?M LOOKING$/i.test(t)||/^SHARE PRIVATELY$/i.test(t)) el.textContent=COPY.ctaEngineer;
  });
  qa('.modal-subtitle,#startup-modal .modal-subtitle,#jobseeker-modal .modal-subtitle').forEach(function(el){
    var t=policyText(el.textContent);
    if(/STARTUP HIRING FORM|HIRING FORM/i.test(t)) el.textContent='Startup brief';
    else if(/CANDIDATE APPLICATION|ENGINEER APPLICATION/i.test(t)) el.textContent='Talent profile';
  });
  qa('.modal-intro,#startup-modal .modal-intro,#jobseeker-modal .modal-intro').forEach(function(el){
    var t=el.textContent||'';
    var inTalent=!!(el.closest&&el.closest('#jobseeker-modal'));
    var inHire=!!(el.closest&&el.closest('#startup-modal'));
    /* Shell still ships LinkedIn/GitHub/resume-required copy — always rewrite to product truth. */
    if(inTalent||/LinkedIn|GitHub|portfolio|Upload your resume|CANDIDATE APPLICATION|match you to SF startups|curated SF candidates/i.test(t)){
      if(inTalent||(!inHire&&/LinkedIn|GitHub|resume|match you to SF/i.test(t))){
        el.textContent=COPY.engineerBody;
        return;
      }
    }
    if(inHire||/curated SF candidates|share the role|hiring brief/i.test(t)){
      el.textContent=COPY.startupBody;
    }
  });
  /* design-track: process/pricing titles — honest copy + kill Webflow positive tracking */
  qa('h2').forEach(function(h){
    if(h.closest&&h.closest('#startup-modal,#jobseeker-modal,#dg-page,#dg-observed-roles'))return;
    var tx=policyText(h.textContent);
    if(/three clear steps|A match has three|THE PROCESS|^How it works$/i.test(tx))
      h.textContent='Software compares. A human proposes. Mutual yes.';
    else if(/Examples of roles we can help with|^Example roles$/i.test(tx))
      h.textContent='Example roles — labeled samples';
    if(h.closest&&(h.closest('section.trust-section,section:has(.steps-grid),section:has(.pricing-grid),.trust-header,.pricing-section')||/Nothing until a hire|Software compares|Example roles|Open roles/i.test(policyText(h.textContent)))){
      try{
        h.style.setProperty('letter-spacing','-0.03em','important');
        h.style.setProperty('text-transform','none','important');
        h.style.setProperty('word-spacing','normal','important');
      }catch(e){}
    }
  });
  // v517/v940: pricing-card bullets (Webflow still ships thrash / guarantee language)
  qa('.pricing-card div,.pricing-card li,.pricing-grid div,.pricing-grid li').forEach(function(el){
    if(el.children&&el.children.length>1)return;
    var t=policyText(el.textContent);
    if(!t||t.length>120)return;
    if(/^Human-reviewed talent profiles$/i.test(t)||/^Access to pre-vetted SF talent$/i.test(t))
      el.textContent='Human-reviewed SF Bay fits — no volume promise';
    else if(/^Human review from brief/i.test(t)||/^Dedicated talent partner$/i.test(t))
      el.textContent='Software compares · a human proposes';
    else if(/^Mutual yes before any intro$/i.test(t)||/90-?\s*day replacement guarantee/i.test(t))
      el.textContent='Nothing due until a hire starts';
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
    if(staleGetVolume.test(out)){staleGetVolume.lastIndex=0;out=out.replace(staleGetVolume,'receive proposed fits');}
    staleDeliveryVolume.lastIndex=0;
    if(staleDeliveryVolume.test(out)){staleDeliveryVolume.lastIndex=0;out=out.replace(staleDeliveryVolume,'we propose fits when the evidence supports them');}
    staleSourcedVolume.lastIndex=0;
    if(staleSourcedVolume.test(out)){staleSourcedVolume.lastIndex=0;out=out.replace(staleSourcedVolume,'propose fits when the evidence supports them');}
    staleCandidateGuarantee.lastIndex=0;
    if(staleCandidateGuarantee.test(out)){staleCandidateGuarantee.lastIndex=0;out=out.replace(staleCandidateGuarantee,'human-reviewed matching');}
    staleGuaranteedPeriod.lastIndex=0;
    if(staleGuaranteedPeriod.test(out)){staleGuaranteedPeriod.lastIndex=0;out=out.replace(staleGuaranteedPeriod,'human-reviewed matching');}
    staleIncludedReplacement.lastIndex=0;
    if(staleIncludedReplacement.test(out)){staleIncludedReplacement.lastIndex=0;out=out.replace(staleIncludedReplacement,'human-reviewed matching');}
    // Attribute-only: do not map bare "Find talent" strings that are the dual-path hero.
    if(staleHire.test(out) && !/^Find talent(?:\.\s*Find startups\.?)?$/i.test(out) && !/^Hire talent\b/i.test(out))return 'Hire talent';
    staleHirePhrase.lastIndex=0;
    /* design-track: never demote dual-path "Hire talent" to long "start a hiring brief" */
    if(staleHirePhrase.test(out) && !/^Hire talent\b/i.test(out)){staleHirePhrase.lastIndex=0;out=out.replace(staleHirePhrase,'Hire talent');}
    stalePoolVolume.lastIndex=0;
    if(stalePoolVolume.test(out)){stalePoolVolume.lastIndex=0;out=out.replace(stalePoolVolume,'proposed fits');}
    staleVolume.lastIndex=0;
    if(staleVolume.test(out)){staleVolume.lastIndex=0;out=staleVolumeTitle.test(out)?'Meet proposed fits':out.replace(staleVolume,'proposed fits after human review');}
    staleVolumeAfter.lastIndex=0;
    if(staleVolumeAfter.test(out)){staleVolumeAfter.lastIndex=0;out=out.replace(staleVolumeAfter,'proposed fits after human review');}
    staleCountBundle.lastIndex=0;
    if(staleCountBundle.test(out)){staleCountBundle.lastIndex=0;out=out.replace(staleCountBundle,'proposed fits');}
    staleFinalists.lastIndex=0;
    if(staleFinalists.test(out)){staleFinalists.lastIndex=0;out=out.replace(staleFinalists,'proposed fits after human review');}
    staleMinimumVolume.lastIndex=0;
    if(staleMinimumVolume.test(out)){staleMinimumVolume.lastIndex=0;out=out.replace(staleMinimumVolume,'proposed fits after human review');}
    staleChoiceVolume.lastIndex=0;
    if(staleChoiceVolume.test(out)){staleChoiceVolume.lastIndex=0;out=out.replace(staleChoiceVolume,'review proposed fits');}
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
      el.textContent = t.replace(staleGetVolume, 'receive proposed fits');
      return;
    }
    staleDeliveryVolume.lastIndex = 0;
    if (staleDeliveryVolume.test(t)) {
      staleDeliveryVolume.lastIndex = 0;
      el.textContent = t.replace(staleDeliveryVolume, 'we propose fits when the evidence supports them');
      return;
    }
    staleSourcedVolume.lastIndex = 0;
    if (staleSourcedVolume.test(t)) {
      staleSourcedVolume.lastIndex = 0;
      el.textContent = t.replace(staleSourcedVolume, 'propose fits when the evidence supports them');
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
        el.removeAttribute('aria-label');
        el.setAttribute('data-demigod-modal', 'startup');
        el.setAttribute('data-dg-cta', 'hire');
      }
      if (el.matches('a')) el.setAttribute('href', '/?wiz=startup');
      if (el.hasAttribute('title')) el.setAttribute('title', 'Hire talent');
      return;
    }
    staleHirePhrase.lastIndex = 0;
    /* dual-path / pricing / footer CTAs keep short "Hire talent" */
    if (el.getAttribute && (el.getAttribute('data-dg-cta')==='hire' || el.closest && el.closest('.hero-actions,.dg-footer-actions,.pricing-card,[data-dg-cta=hire]'))) {
      /* leave product CTA wording alone */
    } else if (staleHirePhrase.test(t) && !/^Hire talent\b/i.test(t) && !(el.matches&&el.matches('h1,.hero-title,.title-accent-gold,.title-accent-cream,[data-dg-hero-h1]'))) {
      staleHirePhrase.lastIndex = 0;
      el.textContent = t.replace(staleHirePhrase, 'Hire talent');
      return;
    }
    stalePoolVolume.lastIndex = 0;
    if (stalePoolVolume.test(t)) {
      stalePoolVolume.lastIndex = 0;
      el.textContent = t.replace(stalePoolVolume, 'proposed fits');
      return;
    }
    staleVolume.lastIndex = 0;
    if (staleVolume.test(t)) {
      staleVolume.lastIndex = 0;
      el.textContent = staleVolumeTitle.test(t) ? 'Meet proposed fits' : t.replace(staleVolume, 'proposed fits after human review');
      return;
    }
    staleVolumeAfter.lastIndex = 0;
    if (staleVolumeAfter.test(t)) {
      staleVolumeAfter.lastIndex = 0;
      el.textContent = t.replace(staleVolumeAfter, 'proposed fits after human review');
      return;
    }
    staleCountBundle.lastIndex = 0;
    if (staleCountBundle.test(t)) {
      staleCountBundle.lastIndex = 0;
      el.textContent = t.replace(staleCountBundle, 'proposed fits');
      return;
    }
    staleFinalists.lastIndex = 0;
    if (staleFinalists.test(t)) {
      staleFinalists.lastIndex = 0;
      el.textContent = t.replace(staleFinalists, 'proposed fits after human review');
      return;
    }
    staleMinimumVolume.lastIndex = 0;
    if (staleMinimumVolume.test(t)) {
      staleMinimumVolume.lastIndex = 0;
      el.textContent = t.replace(staleMinimumVolume, 'proposed fits after human review');
      return;
    }
    staleChoiceVolume.lastIndex = 0;
    if (staleChoiceVolume.test(t)) {
      staleChoiceVolume.lastIndex = 0;
      el.textContent = t.replace(staleChoiceVolume, 'review proposed fits');
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
  // Webflow + head paste leave duplicate og/twitter description tags; keep best honest copy.
  try{dedupeSocialMeta();}catch(e){}
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

function show(id, opener){if(!q(id))run();var m=q(id);if(!m)return;try{if(window.__dgTurnstileFlush)window.__dgTurnstileFlush()}catch(e){}wizCss();ensureWizPremiumCss();ensureWizCalmCss();/* v847: capture opener before inert isolation steals focus to body */var focusBack=(opener&&opener.nodeType===1)?opener:document.activeElement;OPEN=id;try{m.inert=false;m.removeAttribute('inert')}catch(e){}isolateModalBackground(m);try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');try{var title=m.querySelector('.dg-wiz-q,h2,h3,[class*=title]');if(title){if(!title.id)title.id='dg-modal-title-'+(id==='#startup-modal'?'startup':'jobseeker');m.setAttribute('aria-labelledby',title.id);}else{m.setAttribute('aria-label',id==='#startup-modal'?'Hire SF startup talent':'Private candidate form');}}catch(e){}if(document.body){ if(!('prevOverflow' in document.body.dataset)){ document.body.dataset.prevOverflow = document.body.style.overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){if(!('prevScrollbarGutter' in document.documentElement.dataset))document.documentElement.dataset.prevScrollbarGutter=document.documentElement.style.scrollbarGutter||'';document.documentElement.style.overflow='hidden';document.documentElement.style.scrollbarGutter='auto';} setTimeout(function(){var dgVis=function(e){return !!e&&e.offsetParent!==null};var nx=m.querySelector('.dg-wiz-next');var fi=[].slice.call(m.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(dgVis)[0]||(dgVis(nx)?nx:null)||focusables(m).filter(dgVis)[0];if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
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
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>'+
      '<ul class="dg-p-list">'+
      '<li><strong>Reviewed only</strong> — no unverified spam feed</li>'+
      '<li><strong>Submit once</strong> — a human checks before it shows</li>'+
      '<li><strong>Optional Luma / Partiful</strong> — link an existing host page</li>'+
      '</ul>'+
      '<p class="dg-p-note">Companies → <a href="/startups" data-dg-page="map">SF tech company directory</a>.</p>'
    :'<p class="dg-ev-pill" role="note">San Francisco · open data · city-level · current status not verified</p>'+
      '<p class="dg-p-lead"><strong>Rows are open-data companies plus reviewed community submissions</strong> — not a claim that they hired through Demigod. Homepage “Open roles” are public ATS postings we observe, not matching inventory.</p>'+
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Hiring here? Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>'+
      '<div id="dg-startup-map"><p class="dg-p-lead">Loading the SF tech company directory…</p></div>'+
      '<p class="dg-p-note">Hosting or attending an SF event? Open <a href="/events" data-dg-page="events">SF events</a>.</p>';
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

var DG_BLOG_POSTS=[{"slug":"epicurus-garden-hacker-houses","category":"Market","title":"Epicurus' Garden and the SF hacker house","summary":"Epicurus wanted friendship and a quiet mind. SF hacker houses want speed. The useful overlap is smaller: choose the room carefully, write the norms down, and leave room to recover.","body":"Around 306 BCE, Epicurus bought a house and garden outside the Dipylon gate, on the road toward Plato's Academy. Diogenes Laërtius puts the price at eighty minae, writing centuries later, so treat that number the way you would any figure from one late source. What is better attested is how the place ran. People lived there. They ate at one table, argued over the food, and came back to the same unfinished questions the next week. The Academy up the road was a school you visited. The Garden was one you moved into, which changed what it could ask of the people in it.\n\nThey were after ataraxia: a quieter mind, less fear, fewer pointless wants. Friendship was part of the practice, not a networking bonus. Women studied there. So did people the rest of the city treated as background. That made the Garden unusually open for an Athenian school, but it was not casual about commitment. If you needed public honor more than the shared table, you did not last.\n\nEpicurus's will tried to keep the group going after him. Successors named. Friends' children cared for. Freedom for slaves who had studied. The legal language is dry and that is the point. The house was supposed to outlive one charismatic man.\n\nYou see cousins of this arrangement long before anyone rented a Victorian in the Mission and called it a house for builders. Pythagoras's circle in southern Italy was harsher and weirder: shared property, heavy secrecy, intellectual heat with a mystic edge. Monasteries later made a more durable version of group life. Their purposes were religious, their rules stricter, their days split between prayer, labor, and study. They also copied books.\n\nIn 1417, Poggio Bracciolini found Lucretius' On the Nature of Things in a monastic library. Lucretius was the great Roman carrier of Epicurean thought. A Christian house preserved a poem whose gods, matter, and death sat badly with Christian teaching. Nobody needed to plan that irony. The rule said copy books, so books got copied, including ones the copyists would have disliked if they stopped to argue with every page. That is a boring reason to write shared rules down, and a strong one. Rules keep operating on days when nobody is in the mood to remember the founding pitch.\n\nSan Francisco keeps reinventing a louder cousin of the same pressure. Rent is absurd. Solo technical work is lonely. Hard problems move faster when the people who can help are down the hall instead of three Slack hops and a calendar invite away.\n\nReporting on HF0 describes a selective residency for technical founders in large SF properties. AGI House has been covered as a place for AI builders, researchers, dinners, and events. Those are specific organizations with their own admissions and economics. They are useful because the trade is visible. Residents give up privacy and some control over the room in exchange for people, conversation, and work being close.\n\nProximity helps when the people already share enough. A stuck problem can come up over eggs. Someone can watch a demo fail and still be there when the fix works at midnight. Proximity has no moral quality of its own. If residents disagree about noise, money, ambition, cleanliness, or whether every meal is a pitch session, the hallway becomes another meeting they cannot leave.\n\nFounder mythology likes to skip the boring part. A house full of impressive résumés can be worse than a smaller one where people agree about visitors, quiet hours, chores, and rest. Size photographs well. Norms decide whether anyone wants to stay. Intensity needs a limit too. Epicurus treated modest pleasure, freedom from fear, and time among friends as the point. A modern technical residency may be trying to ship a company in weeks. Different aims. Both get worse when sleep thins, the kitchen turns strange, and small annoyances become politics.\n\nDemigod is not a house, and we will not pretend the lineage is direct. We run a matching service for SF startups and talent: profiles stay private, both sides see evidence before names move, and an introduction happens only after each side approves. What we take from the houses is a working assumption rather than a philosophy. Selection has to be honest before proximity is worth much, because the wrong people in a good room mostly cost each other a month.\n\nWhether any of this works outside one small city is an open question. SF is where we can check our own claims in person, so SF is where we operate.","image":"https://files.catbox.moe/urbco5.jpg","imageAlt":"Gold-on-dark mark for garden, cloister, and group-house pattern essay","publishedAt":"2026-07-17"}];
var DG_PAGES = {
  how: {
    title: 'How it works',
    doc: 'How it works · Demigod',
    desc: 'Software compares facts, a human decides what to propose, and both sides say yes before an intro. 10% of first-year base when a hire starts; talent is free.',
    html:
      '<p class="dg-p-lead"><strong>Software compares. A human proposes. Mutual yes.</strong> No application pile, no cold intro, no auto-send.</p>' +
      '<div class="dg-how-flow" style="margin:.6rem 0 1rem"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 214" width="100%" role="img" aria-label="Three steps: software compares the facts and nothing is messaged yet; a human decides what to propose and never auto-introduces; both sides approve privately before any introduction."><title>How a Demigod match works — three steps, gated on mutual yes</title><defs><marker id="dg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#7f978c"/></marker></defs><g font-family="ui-sans-serif, system-ui, sans-serif"><rect x="1" y="14" width="338" height="52" rx="9" fill="#0d1f17" stroke="#1e3428"/><circle cx="24" cy="34" r="9" fill="#a6ffcb"/><text x="24" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="#07150f">1</text><text x="41" y="38" font-size="13" font-weight="600" fill="#a6ffcb">Software compares</text><text x="41" y="56" font-size="11.5" fill="#c9d6cf">Ranks role goals, skills, location, pay.</text><line x1="24" y1="70" x2="24" y2="82" stroke="#7f978c" stroke-width="1.5" marker-end="url(#dg-arrow)"/><rect x="1" y="88" width="338" height="52" rx="9" fill="#0d1f17" stroke="#1e3428"/><circle cx="24" cy="108" r="9" fill="#a6ffcb"/><text x="24" y="112" text-anchor="middle" font-size="11" font-weight="700" fill="#07150f">2</text><text x="41" y="112" font-size="13" font-weight="600" fill="#a6ffcb">A human decides</text><text x="41" y="130" font-size="11.5" fill="#c9d6cf">A person picks what to propose.</text><line x1="24" y1="144" x2="24" y2="156" stroke="#7f978c" stroke-width="1.5" marker-end="url(#dg-arrow)"/><rect x="1" y="162" width="338" height="52" rx="9" fill="#0d1f17" stroke="#a6ffcb"/><circle cx="24" cy="182" r="9" fill="#a6ffcb"/><text x="24" y="186" text-anchor="middle" font-size="11" font-weight="700" fill="#07150f">3</text><text x="41" y="186" font-size="13" font-weight="600" fill="#a6ffcb">Mutual yes</text><text x="41" y="204" font-size="11.5" fill="#c9d6cf">Both approve before any intro.</text><text x="1" y="9" font-size="10.5" fill="#7f978c">nothing is sent until step 3</text><text x="339" y="9" text-anchor="end" font-size="10.5" fill="#a6ffcb">identity private until both say yes</text></g></svg></div>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a> <a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Software compares the facts.</strong> Startup: one role with must-haves, work mode, cash band, and a concrete first result. Talent: one private profile (resume optional). Software compares role goals, skills, location, and compensation — nothing is messaged yet.</li>' +
      '<li><strong>A human decides what to propose.</strong> A person reviews the comparison, confirms the interview path, and chooses whether to propose — and can explain why. Software never auto-intros.</li>' +
      '<li><strong>Mutual yes before intro.</strong> The candidate sees the company, exact role receipt, and base cash band, then approves or passes privately. Identity stays private until both sides say yes. After yes, the startup interviews; Demigod tracks a dated next checkpoint through hire or a clear pass.</li>' +
      '</ol>' +
      '<p class="dg-p-note"><strong>Fee.</strong> Startups pay 10% of first-year base salary when a hire starts. Nothing upfront. Talent is always free.</p>' +
      '<p class="dg-p-note"><strong>First result, not a guarantee.</strong> One observable result on roughly a 30–90 day horizon helps calibrate what the role owns — not an unpaid trial or a promise of day-90 certainty.</p>' +
      '<p class="dg-p-note">Public hiring data: <a href="/startups" data-dg-page="map">SF tech company directory</a>. Matching stays private. <a href="/sample" data-dg-page="sample">Fictional match note →</a> · <a href="/pricing" data-dg-page="pricing">Pricing →</a> · <a href="/faq" data-dg-page="faq">FAQ →</a></p>',
  },
  pricing: {
    title: 'Pricing',
    doc: 'Pricing · Demigod',
    desc: 'Nothing until a hire starts. 10% of first-year base salary for startups; talent always free. No retainer or subscription.',
    html:
      '<p class="dg-p-lead"><strong>Nothing until a hire starts.</strong> Startups pay <strong>10%</strong> of first-year base salary when someone starts — not to post a role. Talent is always free.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>No subscription or retainer.</strong> Submitting a role brief is free. Nothing is due while we review or introduce.</li>' +
      '<li><strong>10% vs typical 15–25% contingency agencies.</strong> First-year base only (not equity, bonus, or benefits) unless written otherwise. You pay for a hire that starts — not for a search clock or shortlist volume.</li>' +
      '<li><strong>No invented SLA.</strong> We do not promise fill days or a guarantee if a hire leaves. Pace follows role difficulty and how fast both sides reply.</li>' +
      '<li><strong>Written confirmation.</strong> Commercial details come by email from potter@trydemigod.com before any fee is owed.</li>' +
      '<li><strong>Talent path is free.</strong> Candidates never pay; fee is only charged to the hiring company when a hire starts.</li>' +
      '</ul>' +
      '<p class="dg-p-note"><a href="/how" data-dg-page="how">How matching works →</a> · <a href="/sample" data-dg-page="sample">Sample match note →</a> · <a href="/faq" data-dg-page="faq">FAQ →</a></p>',
  },
  faq: {
    title: 'FAQ',
    doc: 'FAQ · Demigod',
    desc: 'Answers about Demigod\'s SF matching, submissions, 10% of first-year base fee, free talent profiles, privacy, human review, and mutual intros.',
    /* 17 Q&A must match served FAQPage schema exactly (seo-audit faqPairsMatch; ASCII hyphens). */
    html:
      '<p class="dg-p-lead">Short answers on matching, fee, privacy, and mutual intros. Prefer a brief or private profile when ready.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<details class="dg-p-det"><summary>What is Demigod?</summary><p>Demigod matches SF Bay startups and talent. Software compares role and talent evidence; a human decides what to propose and can explain why; both sides approve before every intro. Startups pay 10% of first-year base salary when a hire starts. Talent is free.</p></details>' +
      '<details class="dg-p-det"><summary>What happens after I submit?</summary><p>A human reads every submission. Software compares role goals, skills, location, and compensation; a human decides what to propose and can explain why; both sides approve before any intro. potter@trydemigod.com follows up only on real fits - not a spam sequence.</p></details>' +
      '<details class="dg-p-det"><summary>How is matching different from open listing sites?</summary><p>There is no public application pile, profile feed, or blast. Software compares facts; a human proposes fits and can explain the evidence. Candidate identity stays private until both sides approve the exact company, role, and base cash band.</p></details>' +
      '<details class="dg-p-det"><summary>How much does it cost?</summary><p>Startups pay 10% of first-year base salary when someone starts — typically below the 15-25% contingency range. Nothing upfront, no retainer, no fill-day SLA. Talent is always free.</p></details>' +
      '<details class="dg-p-det"><summary>Is my profile private?</summary><p>Yes. You privately see the company, exact role, and base cash band before deciding. Your identity and contact details move only after both sides approve. You can ask us to update or delete data anytime.</p></details>' +
      '<details class="dg-p-det"><summary>What is a concrete first result?</summary><p>One measurable result the hire should own first - often on a 30-90 day horizon. We match against that calibration, not a keyword soup or generic JD. It is not an unpaid trial or a promise of day-90 certainty.</p></details>' +
      '<details class="dg-p-det"><summary>Who do you work with?</summary><p>SF Bay Area startups (and builders open to those companies). Seed through growth, product and eng-heavy roles first. Remote talent is fine when the company is Bay-focused.</p></details>' +
      '<details class="dg-p-det"><summary>How long does it take?</summary><p>No SLA clock. Timing depends on role difficulty and response pace. Every brief gets careful human review - potter@trydemigod.com follows up.</p></details>' +
      '<details class="dg-p-det"><summary>Are payments and SMS live?</summary><p>Not yet. Commercial confirmations and follow-ups are by email (potter@trydemigod.com). Stripe and Twilio are pending - we say so honestly on the site.</p></details>' +
      '<details class="dg-p-det"><summary>Do you auto-message founders or candidates?</summary><p>No auto-DM blasts. Humans send outreach. The site is for inbound briefs, profiles, and transparent product pages.</p></details>' +
      '<details class="dg-p-det"><summary>What if a match is not right?</summary><p>Pass privately. No pressure, no public rejection trail. If evidence is thin, we say so instead of manufacturing a shortlist.</p></details>' +
      '<details class="dg-p-det"><summary>Can I partner or refer talent?</summary><p>Yes. Demigod charges startups 10% of first-year base when a hire starts. Approved individual referrers can earn 20% of that fee (never the candidate’s salary) after a referred hire completes 90 days and the related client fee is paid and retained. Approved hiring partners receive company credits, not personal cash. Written terms apply; payout tooling is pending.</p></details>' +
      '<details class="dg-p-det"><summary>What roles do you cover first?</summary><p>Product, engineering, design, and GTM for SF Bay startups. Other roles case-by-case when the first result is clear.</p></details>' +
      '<details class="dg-p-det"><summary>What do I need to submit as a founder?</summary><p>Work email, company, stage, role, must-haves, work arrangement, base cash band, and one concrete first result. Comp bands keep matching honest. No urgency clock or retainer to start.</p></details>' +
      '<details class="dg-p-det"><summary>What do I need as talent?</summary><p>Name, email, the work you want next, work highlights, Bay Area openness, availability, and base cash band. A resume or work link is optional. Free forever - outreach only on real fits.</p></details>' +
      '<details class="dg-p-det"><summary>How do intros work?</summary><p>When both sides approve, we send a warm intro email. No cold LinkedIn spam from us. You take it from there.</p></details>' +
      '<details class="dg-p-det"><summary>Where can I read updates?</summary><p>See Notes for short product and market posts. Each note has its own shareable link. Questions: potter@trydemigod.com.</p></details>',
  },
  blog: {
    title: 'Notes',
    doc: 'Notes · Demigod',
    desc: 'Essays and product notes from Demigod about SF talent matching, culture, and how we work.',
    html:
      '<div class="dg-blog-hero"><p class="dg-ev-pill" role="note">Notes · no spam</p>' +
      '<p class="dg-p-lead">Writing from Demigod — matching in SF, and the culture around it.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<p class="dg-p-note">Each note has a shareable link. Questions: <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>.</p></div>' +
      '<div class="dg-blog-grid" id="dg-blog-grid"></div>',
  },
  private: {
    title: 'Why private',
    doc: 'Why private · Demigod',
    desc: 'Demigod is private by design: no public profiles, no feed, no blasts. Mutual yes only for SF startup matching.',
    html:
      '<p class="dg-p-lead"><strong>'+COPY.antiLinkedIn+'</strong> Matching works like this: software compares the facts, a human decides what to propose, mutual yes before intro.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>No public profiles.</strong> Talent is not browsable. Founders do not post a public job wall of applicants.</li>' +
      '<li><strong>No feed, no graph vanity.</strong> Nothing to like, follow, or farm for InMail.</li>' +
      '<li><strong>Mutual yes only.</strong> Candidate identifying details move only after both sides approve.</li>' +
      '<li><strong>Company evidence, not personal brand.</strong> Public company/role facts can inform a match; we do not sell people dossiers.</li>' +
      '<li><strong>No networking pings.</strong> Talent hears from us only when a human has a real mutual-fit note.</li>' +
      '<li><strong>Free for talent.</strong> Sharing is free; resume optional. Startups pay 10% of first-year base only when a hire starts — nothing until then.</li>' +
      '</ul>' +
      '<p class="dg-p-note"><a href="/?wiz=startup" data-demigod-modal="startup">Send a hiring brief →</a> · <a href="/?wiz=engineer" data-demigod-modal="jobseeker">Share privately →</a> · <a href="/sample" data-dg-page="sample">Sample match →</a> · <a href="/how" data-dg-page="how">How it works →</a> · <a href="/legal" data-dg-page="legal">Privacy →</a></p>',
  },
  hire: {
    title: 'Hire talent',
    doc: 'Hire · Demigod',
    desc: 'One role brief. Software compares facts; a human proposes fits and can explain why; both sides approve every intro. Startups pay 10% of first-year base when a hire starts.',
    html:
      '<p class="dg-p-lead"><strong>Nothing until a hire starts.</strong> One role, real constraints, and a concrete first result. <strong>Software compares · a human proposes · mutual yes</strong> — nothing is auto-sent.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Software compares the facts.</strong> ~2-min brief: role, must-haves, work mode, cash band, and one first result. Software compares against private talent profiles.</li>' +
      '<li><strong>A human decides what to propose.</strong> A person reviews the comparison and interview path — and can explain why. Software never auto-intros.</li>' +
      '<li><strong>Mutual yes before intro.</strong> The candidate sees your company, exact role, and base cash band, then approves or passes privately. After yes, you interview; pay 10% of first-year base only when the hire starts.</li>' +
      '</ol>' +
      '<p class="dg-p-note"><strong>Not for:</strong> volume headcount fills, agency-style blast shortlists, or self-serve résumé fishing — one role at a time, human-reviewed.</p>' +
      '<p class="dg-p-note">No application blast, no résumé black hole. Follow-ups from potter@trydemigod.com. <a href="/how" data-dg-page="how">How it works →</a> · <a href="/sample" data-dg-page="sample">Sample match →</a> · <a href="/pricing" data-dg-page="pricing">Pricing →</a> · <a href="/legal" data-dg-page="legal">Privacy →</a></p>',
  },
  talent: {
    title: 'Open to the right startup?',
    doc: 'Talent · Demigod',
    desc: 'One private profile. Free for candidates; resume optional. Software compares the facts; a human decides what to propose; you approve every intro.',
    html:
      '<p class="dg-p-lead">One private profile for SF Bay startup roles. Free, no public listing, no application blast — resume optional. <strong>Software compares · a human proposes · mutual yes.</strong></p>' +
      '<p class="dg-p-actions"><a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a><a class="hire dg-p-actions-sec" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Hiring? Start brief →</a></p>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Software compares the facts.</strong> You share the work you want next, evidence of what you have shipped, availability, setup, and a cash band — enough to compare with a real role, not keywords. A resume or work link is optional.</li>' +
      '<li><strong>A human decides what to propose.</strong> We only follow up when a person sees a credible fit and can explain why. Software never cold-messages companies with your identity.</li>' +
      '<li><strong>Mutual yes before intro.</strong> You see the company, exact role receipt, and base cash band first, then approve or pass privately. After yes, Demigod tracks a dated next checkpoint through interview, offer, hire, or a clear pass.</li>' +
      '</ol>' +
      '<p class="dg-p-note"><strong>Not for:</strong> public job-board applications, networking blasts, or open résumé marketplaces — you stay private until you approve an intro.</p>' +
      '<p class="dg-p-note"><strong>Always free for talent.</strong> No board spam. <a href="/how" data-dg-page="how">How it works →</a> · <a href="/sample" data-dg-page="sample">Sample match →</a> · <a href="/faq" data-dg-page="faq">FAQ →</a> · <a href="/private" data-dg-page="private">Why private →</a> · <a href="/legal" data-dg-page="legal">Privacy →</a></p>',
  },
  contact: {
    title: 'Contact',
    doc: 'Contact · Demigod',
    desc: 'Reach Demigod at potter@trydemigod.com. A human replies about SF startup talent matching — no bots or automated outreach.',
    html:
      '<p class="dg-p-lead">Email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. A human replies — no bots, no auto-DM, no SLA clock.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Hiring one SF Bay role?</strong> Use the brief form — role, must-haves, cash band, and first result land structured for human review.</li>' +
      '<li><strong>Open to the right startup?</strong> Share privately — free, not a public profile; you approve every intro.</li>' +
      '<li><strong>Press, partners, or something else?</strong> Email with a clear subject; potter@trydemigod.com is the only channel.</li>' +
      '</ul>' +
      '<p class="dg-p-note">Matching stays private until both sides approve. <a href="/legal" data-dg-page="legal">Privacy →</a> · <a href="/private" data-dg-page="private">Why private →</a> · <a href="/pricing" data-dg-page="pricing">Pricing →</a></p>',
  },
  legal: {
    title: 'Privacy & Terms',
    doc: 'Legal · Demigod',
    desc: 'Demigod\'s plain-language privacy policy and terms for SF startup and talent matching: what we collect, how intros work, and how to reach us with questions.',
    html:
      '<p class="dg-p-lead">Plain-language privacy and terms. Submissions stay for matching; no public profiles.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<h2 class="dg-p-h3">Privacy</h2>' +
      '<p><strong>Effective July 20, 2026.</strong> We collect the contact details, company or work background, location and availability, work evidence, and résumé file or link you choose to submit. We use them for human review, matching, mutual-intro decisions, service messages, and service protection.</p>' +
      '<p>Demigod, Webflow, and our email provider process submissions. After a startup requests an intro, we may privately show its company identity and role facts to the candidate. Candidate identity, contact details, résumé, and work links are not shared with the startup until the candidate approves that exact role. We do not sell contact lists or use submissions for unrelated marketing.</p>' +
      '<p>A <a href="/refer" data-dg-page="refer">referral link</a> carries an opaque attribution code. The person or company that shared it may receive a financial benefit if an eligible referral leads to a retained hire. Referral status does not change candidate evaluation or candidate cost.</p>' +
      '<p>A temporary same-tab draft is kept in your browser session and cleared after confirmed submission.</p>' +
      '<p>We retain submissions while providing matching, handling an introduction, and meeting legitimate operational or recordkeeping needs, then delete or de-identify data when it is no longer needed. Shareable résumé links remain subject to the storage provider you chose.</p>' +
      '<p>Request access, correction, or deletion at <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. We will confirm the action and any data we must retain for legal or transaction records.</p>' +
      '<h2 class="dg-p-h3">Terms</h2><p>Demigod introduces parties; employment decisions are yours. Placement fee is 10% of first-year base salary, excluding equity, discretionary bonus, commission, and benefits, when a hire starts (unless written otherwise). Commercial confirmations arrive by email. SF Bay Area focus. No SLA promises on response time.</p>',
  },
  refer: {
    title: 'Make one strong introduction',
    doc: 'Referrals · Demigod',
    desc: 'Give someone a private, free path to SF startup roles. Approved referrers may earn a share of Demigod\'s fee after a durable paid hire.',
    html:
      '<p class="dg-p-lead">Know someone who could thrive at an SF Bay startup? Give them a private, free way to be considered. They submit their own profile (resume optional), nothing is shared until they approve an intro, and any reward comes from Demigod\'s fee - not their pay.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="mailto:potter@trydemigod.com?subject=Talent%20referrer%20link%20request">Request referral link →</a></p>' +
      '<h2 class="dg-p-h3">How it works</h2>' +
      '<ol class="dg-p-list">' +
      '<li><strong>Request one approved link.</strong> We agree simple written terms and provide one honest message.</li>' +
      '<li><strong>Share it personally.</strong> Send it only to someone genuinely likely to benefit. They complete their own profile and can remove incorrect attribution; never upload a resume for them.</li>' +
      '<li><strong>Demigod does the rest.</strong> A human reviews them, both sides approve any intro, and reward eligibility begins only after a hire completes 90 days and our related fee is paid and retained.</li>' +
      '</ol>' +
      '<p><strong>Approved individual talent referrers may receive 20% of Demigod\'s net placement fee.</strong> Demigod charges startups 10% of first-year base when a hire starts; a referrer share is 20% of that fee — never the candidate’s salary or offer. Candidates never pay and are reviewed the same either way. Self-referrals, contact uploads, and multi-level rewards are not allowed.</p>' +
      '<p class="dg-p-note"><strong>Written terms control.</strong> Payout automation is not live; eligibility and observed payments are recorded in a private ledger. Approved hiring-partner rewards remain company credits and follow the same 90-day, fee-paid-and-retained condition. <a href="/pricing" data-dg-page="pricing">Pricing →</a></p>' +
      '<h2 class="dg-p-h3">The message stays honest</h2>' +
      '<p class="dg-p-note">"I may receive a referral reward if this leads to a successful Demigod hire. It comes from Demigod\'s fee, not your pay, and does not change how you are evaluated."</p>' +
      '<h2 class="dg-p-h3">Request a referral link</h2>' +
      '<p class="dg-p-note">This requests review; it does not create or approve a link. <a href="/legal" data-dg-page="legal">Privacy</a> · <a href="/private" data-dg-page="private">Why private</a>.</p>' +
      '<div id="dg-referral-form-slot"><p id="dg-referral-form-fallback"><a href="mailto:potter@trydemigod.com?subject=Talent%20referrer%20link%20request">Email a referral-link request →</a></p></div>',
  },
  about: {
    title: 'About',
    doc: 'About · Demigod',
    desc: 'SF Bay permanent hires only — private brief, human proposal, mutual yes, 10% of first-year base when a hire starts. Not a job board.',
    html:
      '<p class="dg-p-lead">Demigod is private, human-reviewed matching for <strong>SF Bay permanent hires</strong>. Software compares role and talent evidence; a human decides what to propose and can explain why; both sides approve before every intro.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>What we are:</strong> selective search — one concrete first result, mutual yes, talent free, 10% of first-year base when a hire starts (nothing upfront)</li>' +
      '<li><strong>What we are not:</strong> a public job board, SLA clock, volume blast shop, or self-serve marketplace of résumés</li>' +
      '<li><strong>What we take:</strong> real employer searches we can run well · <strong>What we park:</strong> work we cannot staff honestly</li>' +
      '<li>Open roles on the homepage are public ATS listings — not our matching inventory</li>' +
      '</ul>' +
      '<p class="dg-p-note"><a href="/?wiz=startup" data-demigod-modal="startup">Start a hiring brief</a> · <a href="/how" data-dg-page="how">How it works →</a> · <a href="/pricing" data-dg-page="pricing">Fee →</a> · <a href="/private" data-dg-page="private">Why private →</a> · <a href="/legal" data-dg-page="legal">Privacy →</a> · <a href="/press" data-dg-page="press">Press kit →</a></p>',
  },

  bounties: {
    title: 'Bounties',
    doc: 'Bounties · Demigod',
    desc: "Declared USDC bounties. We don't hold it.",
    html:
      '<div class="dg-bounty-id" id="dg-bounty-id"></div>' +
      '<div id="dg-bounty-live"></div>' +
      '<form id="dg-bounty-form" class="dg-bounty-form">' +
      '<label class="dg-bounty-lab" for="dg-bounty-repo">GitHub</label>' +
      '<input class="dg-bounty-in" id="dg-bounty-repo" name="repo" type="url" required placeholder="https://github.com/owner/repo" autocomplete="off" />' +
      '<label class="dg-bounty-lab" for="dg-bounty-amount">USDC</label>' +
      '<input class="dg-bounty-in" id="dg-bounty-amount" name="amount" inputmode="decimal" required placeholder="25" />' +
      '<label class="dg-bounty-lab" for="dg-bounty-payto">Wallet</label>' +
      '<input class="dg-bounty-in" id="dg-bounty-payto" name="payTo" placeholder="Solana address" autocomplete="off" spellcheck="false" />' +
      '<button type="submit" class="dg-bounty-submit">List</button>' +
      '<p class="dg-bounty-msg" id="dg-bounty-msg" role="status" aria-live="polite"></p>' +
      '</form>' +
      "<p class=\"dg-p-note\">We don't hold it.</p>",
  },
  map: {
    title: 'SF tech company directory',
    doc: 'SF tech company directory · Demigod',
    desc: 'Public SF Bay tech companies from open data plus reviewed submissions — not engaged employers or Demigod matching inventory. Hire through a brief.',
    html: dgMapEventsHtml('startups'),
  },
  sample: {
    title: 'Sample matches',
    doc: 'Sample matches · Demigod',
    desc: 'Fictional match and pass notes show how Demigod weighs evidence, constraints, and risk — no fake placements.',
    html:
      '<p class="dg-p-lead"><strong>Fictional examples.</strong> Before deciding, the candidate sees the company and exact role receipt: first result, must-haves, work arrangement, base range, and interview path. These are not live people, roles, or placements.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
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
      '<p class="dg-p-note">Real activity appears only when it happens; Demigod never invents placements or candidate volume. Matching uses a concrete first result to calibrate the role — not a day-90 guarantee. Startups pay 10% of first-year base when a hire starts; talent is free.</p>',
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
    desc: 'That Demigod page does not exist. Home, hire, talent, fee, or FAQ paths are below.',
    html:
      '<p class="dg-p-lead">No page at this address. Start a path, or pick a useful page below.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief →</a><a class="talent dg-p-actions-sec" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Share privately →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><a href="/" data-dg-page-home="1">Home</a></li>' +
      '<li><a href="/how" data-dg-page="how">How it works</a></li>' +
      '<li><a href="/hire" data-dg-page="hire">Hire talent</a></li>' +
      '<li><a href="/talent" data-dg-page="talent">Open to the right startup?</a></li>' +
      '<li><a href="/pricing" data-dg-page="pricing">Pricing</a></li>' +
      '<li><a href="/sample" data-dg-page="sample">Sample match</a></li>' +
      '<li><a href="/faq" data-dg-page="faq">FAQ</a></li>' +
      '<li><a href="/startups" data-dg-page="map">SF directory</a></li>' +
      '<li><a href="/events" data-dg-page="events">SF events</a></li>' +
      '<li><a href="/contact" data-dg-page="contact">Contact</a></li>' +
      '<li><a href="/legal" data-dg-page="legal">Privacy &amp; terms</a></li>' +
      '</ul>',
  },
  press: {
    title: 'Press kit',
    doc: 'Press kit · Demigod',
    desc: 'One-liner, brand mark, and media contact for Demigod — private, human-reviewed SF startup talent matching.',
    html:
      '<p class="dg-p-lead"><strong>Demigod</strong> compares role and talent evidence; a human decides what to propose and can explain why. One concrete first result per role. 10% of first-year base salary when a hire starts.</p>' +
      '<p class="dg-p-actions"><a class="hire" href="mailto:potter@trydemigod.com?subject=Press%20inquiry">Email press →</a><a class="talent dg-p-actions-sec" href="/how" data-dg-page="how">How it works →</a></p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>One-liner:</strong> SF startup talent matching — private profiles, mutual yes, human-reviewed (explainable) fits, one concrete first result, 10% of first-year base when a hire starts.</li>' +
      '<li><strong>Site:</strong> <a href="https://www.trydemigod.com">trydemigod.com</a></li>' +
      '<li><strong>Contact:</strong> <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></li>' +
      '<li><strong>Mark:</strong> gold geometric D on dark — same favicon/hero brand on the site.</li>' +
      '</ul>' +
      '<p class="dg-p-note">No headcount, SLA, or placement claims for press unless we send a dated receipt. Open roles on the site are public ATS listings — not matching inventory.</p>',
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
    'body.dg-page-on #dg-observed-roles{display:none!important}' +
    '#dg-page{position:relative;z-index:10050;background:var(--dg-night,#03140d);min-height:100vh;overflow:visible;padding:1.15rem;animation:dg-page-in .25s ease both}' +
    '#dg-page .dg-page-card{max-width:min(36rem,100%);margin:2rem auto;background:rgba(166,255,203,.03);border:1px solid rgba(166,255,203,.22);border-radius:16px;padding:clamp(1.35rem,3vw,1.75rem);color:var(--dg-paper,#f3f0e7);box-shadow:0 20px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)}'+'#dg-page.dg-page-map .dg-page-card,#dg-page.dg-page-events .dg-page-card{max-width:min(56rem,100%)}' +
    '#dg-page p,#dg-page li{hyphens:none;-webkit-hyphens:none}' +
    '#dg-page .dg-page-top{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.85rem}' +
    '#dg-page h1{font-family:var(--dg-serif,Georgia,serif);font-size:clamp(1.45rem,3.2vw,1.85rem);color:var(--dg-paper,#f3f0e7);margin:0;letter-spacing:-.02em;font-weight:500;line-height:1.2}' +
    '#dg-page .dg-page-x{min-width:44px;min-height:44px;border:1px solid rgba(166,255,203,.35);background:transparent;color:var(--dg-phosphor,#a6ffcb);border-radius:12px;cursor:pointer;font-size:1.1rem}' +
    '#dg-page .dg-p-lead{color:var(--dg-paper-mute,#bdc9bf);line-height:1.55;margin:.25rem 0 1rem;font-size:1rem}' +
    '#dg-page .dg-p-actions{margin:.15rem 0 1rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}' +
    '#dg-page .dg-p-actions a{display:inline-flex;align-items:center;min-height:48px;padding:.65rem 1.1rem;border-radius:12px;font-weight:700;text-decoration:none;background:#a6ffcb;color:#03140d}' +
    '#dg-page .dg-p-actions a.dg-p-actions-sec{background:transparent;color:var(--dg-phosphor,#a6ffcb);border:1px solid rgba(166,255,203,.45)}' +
    '#dg-page .dg-p-list{margin:.5rem 0 1rem;padding-left:1.15rem;color:var(--dg-paper,#f3f0e7);line-height:1.55}' +
    '#dg-page .dg-p-list li{margin:.45rem 0}' +
    '#dg-page .dg-p-list strong{color:var(--dg-phosphor,#a6ffcb);font-weight:650}' +
    '#dg-page .dg-p-det{border-top:1px solid rgba(166,255,203,.14);padding:.55rem 0}' +
    '#dg-page .dg-p-det summary{cursor:pointer;color:var(--dg-paper,#f3f0e7);font-weight:600;min-height:44px;display:flex;align-items:center}' +
    '#dg-page .dg-p-det p{color:var(--dg-paper-mute,#bdc9bf);margin:.35rem 0 .25rem;line-height:1.45}' +
    '#dg-page .dg-p-h3{color:var(--dg-phosphor,#a6ffcb);font-size:1rem;margin:1rem 0 .35rem;font-weight:600}' +
    '#dg-page .dg-p-note{color:var(--dg-paper-mute,#bdc9bf);line-height:1.5;font-size:.92rem}' +
    '#dg-page .dg-page-ctas{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.25rem}' +
    '#dg-page .dg-page-ctas a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.75rem 1.2rem;border-radius:14px;font-weight:650;text-decoration:none!important;font-family:var(--dg-sans,system-ui,sans-serif)}' +
    '#dg-page .dg-page-ctas a.hire{background:linear-gradient(180deg,#34d399,#10c674);color:#03140d;border:1px solid rgba(16,198,116,.9);font-weight:700}' +
    '#dg-page .dg-page-ctas a.talent{background:rgba(166,255,203,.04);border:1px solid rgba(166,255,203,.42);color:var(--dg-paper,#f3f0e7)}' +
    '#dg-page .dg-page-ctas a.back{color:var(--dg-paper-mute,#bdc9bf);border:1px solid rgba(166,255,203,.2);font-weight:600}' +
    '#dg-page a{color:var(--dg-phosphor,#a6ffcb)}' +
    '@media(max-width:700px){#dg-page .dg-p-list a{display:inline-flex;align-items:center;min-height:48px}}' +
    '#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid var(--dg-phosphor,#a6ffcb)!important;outline-offset:3px!important}' +
    '@keyframes dg-page-in{from{opacity:0}to{opacity:1}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page{animation:none}}' +
    '@media(forced-colors:active){#dg-page{background:Canvas!important;forced-color-adjust:auto}#dg-page .dg-page-card,#dg-page .dg-page-x,#dg-page .dg-page-ctas a{border:1px solid CanvasText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid Highlight!important}}' +
    '#dg-page.dg-page-bounties{background:#03140D!important;font-family:Manrope,system-ui,sans-serif;color:#F3F0E7}' +'#dg-page.dg-page-bounties .dg-page-card{max-width:min(40rem,100%);margin:1.25rem auto;background:transparent;border:none;box-shadow:none;border-radius:0;padding:1.15rem;color:#F3F0E7}' +'#dg-page.dg-page-bounties .dg-page-x,#dg-page.dg-page-bounties .dg-page-ctas{display:none!important}' +'#dg-page.dg-page-bounties h1{font-family:Manrope,system-ui,sans-serif!important;color:#A6FFCB!important;font-weight:700;letter-spacing:-.02em}' +'#dg-page.dg-page-bounties .dg-p-note{color:#8A8A9E;font-size:.9rem}' +'#dg-page.dg-page-bounties a{color:#10C674}' +'#dg-page.dg-page-bounties .dg-bounty-id{display:flex;align-items:center;gap:.55rem;margin:0 0 .85rem}' +'#dg-page.dg-page-bounties .dg-bounty-av{width:28px;height:28px;border-radius:999px;border:1px solid rgba(166,255,203,.35);background:rgba(166,255,203,.08)}' +'#dg-page.dg-page-bounties .dg-bounty-handle{color:#A6FFCB;font-weight:650;text-decoration:none;font-size:.92rem}' +'#dg-page.dg-page-bounties .dg-bounty-gh{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.4rem 1rem;border-radius:12px;font-weight:700;cursor:pointer;font-family:Manrope,system-ui,sans-serif;border:0;background:#A6FFCB;color:#03140D}' +'#dg-page.dg-page-bounties .dg-bounty-x{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.4rem .9rem;border-radius:12px;font-weight:600;cursor:pointer;font-family:Manrope,system-ui,sans-serif;background:transparent;color:#A6FFCB;border:1px solid rgba(166,255,203,.35)}' +'#dg-page.dg-page-bounties .dg-bounty-rows{list-style:none;margin:0 0 1.15rem;padding:0;display:grid;gap:.5rem}' +'#dg-page.dg-page-bounties .dg-bounty-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.65rem;align-items:center;padding:.7rem .85rem;background:rgba(166,255,203,.08);border:1px solid rgba(166,255,203,.22);border-radius:12px}' +'#dg-page.dg-page-bounties .dg-bounty-amt{font-weight:700;color:#A6FFCB;white-space:nowrap}' +'#dg-page.dg-page-bounties .dg-bounty-title{color:#F3F0E7;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +'#dg-page.dg-page-bounties .dg-bounty-title:hover{color:#10C674}' +'#dg-page.dg-page-bounties .dg-bounty-pay{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.4rem 1rem;border-radius:12px;font-weight:700;text-decoration:none;cursor:pointer;border:0;background:#A6FFCB;color:#03140D;font-family:Manrope,system-ui,sans-serif}' +'#dg-page.dg-page-bounties .dg-bounty-form{display:grid;gap:.35rem;margin:0 0 .75rem}' +'#dg-page.dg-page-bounties .dg-bounty-lab{font-size:.78rem;color:#8A8A9E;margin-top:.3rem}' +'#dg-page.dg-page-bounties .dg-bounty-in{width:100%;min-height:48px;padding:.6rem .75rem;border-radius:12px;border:1px solid rgba(166,255,203,.22);background:rgba(166,255,203,.08);color:#F3F0E7;font-size:16px;font-family:Manrope,system-ui,sans-serif}' +'#dg-page.dg-page-bounties .dg-bounty-in:focus-visible{outline:2px solid #A6FFCB;outline-offset:3px}' +'#dg-page.dg-page-bounties .dg-bounty-submit{min-height:48px;margin-top:.55rem;border-radius:12px;border:0;background:#A6FFCB;color:#03140D;font-weight:700;cursor:pointer;font-family:Manrope,system-ui,sans-serif}' +'#dg-page.dg-page-bounties .dg-bounty-msg{min-height:1.2rem;font-size:.84rem;color:#8A8A9E;margin:.35rem 0 0}' +'#dg-page.dg-page-bounties .dg-bounty-note{margin:0;font-size:.9rem;color:#8A8A9E;font-weight:500}' +
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
    '#dg-page.dg-page-events a:not(.dg-ev-cta-pri):not(.dg-page-ctas a):not(.dg-p-actions a){color:#E8D5A3}' +
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
    ['partner-name', 'text', 'name', 120, 'Your name?', 'How should we address you?'],
    ['partner-email', 'email', 'email', 160, 'Best email?', 'you@company.com'],
    ['referral-plan', '', '', 1200, 'Who might you introduce, and why do they trust you?', 'Former teammate, founder, investor, community — one concrete context.'],
  ].forEach(function (spec) {
    var field = form.querySelector('[name="' + spec[0] + '"]');
    if (!field) return;
    field.required = true;
    field.maxLength = spec[3];
    if (spec[1] && field.tagName === 'INPUT') field.type = spec[1];
    if (spec[2]) field.setAttribute('autocomplete', spec[2]);
    if (spec[5] && 'placeholder' in field) field.placeholder = spec[5];
    var lab = field.id && form.querySelector('label[for="' + field.id + '"]');
    if (!lab) lab = (field.closest('.form-field-group,.dg-field-wrap') || field.parentElement || form).querySelector('label');
    if (lab && spec[4]) lab.textContent = spec[4];
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
    submit.classList.remove('w-form-loading');
    submit.disabled = false;
    submit.removeAttribute('aria-disabled');
    setTimeout(function () {
      submit.classList.remove('w-form-loading');
      submit.disabled = false;
      submit.removeAttribute('aria-disabled');
    }, 1000);
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
/* v1023: FAQPage JSON-LD must match visible #dg-page details (no stale Webflow 17 vs foot 6 drift). */
function injectFaqJsonLd() {
  try {
    // Drop every FAQPage block (Webflow + prior foot) so only one identity-bound schema remains.
    qa('script[type="application/ld+json"]').forEach(function (el) {
      try {
        var data = JSON.parse(el.textContent || '{}');
        var isFaq =
          data['@type'] === 'FAQPage' ||
          (Array.isArray(data['@graph']) && data['@graph'].some(function (x) { return x && x['@type'] === 'FAQPage'; }));
        if (isFaq || el.id === 'dg-faq-jsonld') el.remove();
      } catch (e) {
        if (el.id === 'dg-faq-jsonld') el.remove();
      }
    });
    var items = [];
    qa('#dg-page details').forEach(function (det) {
      var sum = det.querySelector('summary');
      var p = det.querySelector('p');
      var qq = sum ? String(sum.textContent || '').replace(/\s+/g, ' ').trim() : '';
      var aa = p ? String(p.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (qq && aa) items.push({ q: qq, a: aa });
    });
    if (!items.length) {
      var html = (DG_PAGES.faq && DG_PAGES.faq.html) || '';
      var re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi;
      var m;
      while ((m = re.exec(html))) {
        var qq2 = String(m[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        var aa2 = String(m[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (qq2 && aa2) items.push({ q: qq2, a: aa2 });
      }
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
  try { var obs = q('#dg-observed-roles'); if (obs) obs.style.removeProperty('display'); } catch (e) {}
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
  if (id === 'bounties') return '';
  if (id === 'events' || id === 'map' || id === 'refer') return back;
  return hire + talent + back;
}
function startupMapAssetUrl(){
  var pinned=q('meta[name="dg-startup-map-script"]'),pin=pinned&&pinned.content;
  if(pin&&/^https:\/\/(?:files\.catbox\.moe\/[a-z0-9]+|cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/startup-map-latest)\.js$/i.test(pin))return pin;
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
function hardPageHref(hard, hash) {
  var u = new URL(location.href);
  u.pathname = hard;
  u.searchParams.delete('p');
  u.searchParams.delete('page');
  u.hash = hash;
  return u.pathname + u.search + u.hash;
}
function wizardFallbackHref(href) {
  var u = new URL(href, location.href), params = new URLSearchParams(location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','referral','role_id','event_id'].forEach(function (name) {
    if (params.has(name) && !u.searchParams.has(name)) u.searchParams.set(name, params.get(name));
  });
  return u.pathname + u.search + u.hash;
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
  if (id === 'bounties') root.classList.add('dg-page-bounties');
  root.innerHTML =
    '<div class="dg-page-card"><div class="dg-page-top"><h1>' +
    meta.title +
    '</h1><button type="button" class="dg-page-x" aria-label="Close">✕</button></div>' +
    (meta.html || '') +
    '<div class="dg-page-ctas">' +
    pageCtas(id) +
    '</div></div>';
  var pageAnchor = q('#dg-top-nav,nav.w-nav,.w-nav,.nav_container');
  while (pageAnchor && pageAnchor.parentElement !== document.body) pageAnchor = pageAnchor.parentElement;
  if (pageAnchor) pageAnchor.insertAdjacentElement('afterend', root);
  else document.body.prepend(root);
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
      if (el.id === 'dg-bar') return;
      if (el.id === 'dg-top-nav' || el.matches('.nav_container,nav.w-nav,.w-nav') || el.querySelector('.nav_container,nav.w-nav,.w-nav')) return;
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
  /* The mobile action bar STAYS on mini-pages. It used to be hidden here, which left /how with no
     action anywhere in the 390px fold — the page explains the process and offered no way to start
     it. show() still hides the bar for modals, which is right: a modal must not compete with a
     fixed bar. Mini-pages are routes, not modals.
     Measured with puppeteer at 390x844 before changing this: all three routes scroll (/ 0->600,
     /how 0->550, /hire 0->352), and with the bar visible each page's own CTA scrolls into view at
     y~517 and hit-tests to itself — reachable:true on /hire and /talent. An earlier rect-overlap
     reading at scroll offset 0 suggested a clash; that was an artifact of measuring a
     position:fixed bar against unscrolled content. */
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
    /* Webflow page settings and the injected head both emit og:*, so live pages carried up to four
       og:description tags with conflicting text (verified 2026-08-15 on /, /apply, /pricing,
       /about) plus a duplicate og:type. querySelector rewrote the first and left the siblings to
       argue with it — a crawler picks one, and not necessarily ours. Keep the first node so the
       restore path still has its target; drop the duplicates. */
    function dedupeMeta(sel) {
      var all = document.querySelectorAll(sel);
      for (var i = 1; i < all.length; i++) all[i].remove();
      return all[0] || null;
    }
    function ensureMeta(sel, attr, key) {
      var el = dedupeMeta(sel);
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
    var preferred = { how:'/how', pricing:'/pricing', hire:'/hire', talent:'/talent', faq:'/faq', legal:'/legal', refer:'/refer', about:'/about', events:'/events', map:'/startups', contact:'/contact', blog:'/blog', sample:'/sample', bounties:'/?p=bounties', press:'/press', private:'/private', notfound:'/' };
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
    /* Same duplicate-sibling problem as og:description above; dedupe inline rather than reach
       across try blocks for the helper. */
    function ensureUrlMeta(sel, attr, key) {
      var all = document.querySelectorAll(sel);
      for (var i = 1; i < all.length; i++) all[i].remove();
      var el = all[0];
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
      var k = a.getAttribute('data-demigod-modal');
      var modal = k === 'startup' ? S : k === 'jobseeker' ? J : '';
      if (!modal || !q(modal)) {
        a.setAttribute('href', wizardFallbackHref(a.getAttribute('href') || (k === 'startup' ? '/?wiz=startup' : '/?wiz=engineer')));
        return;
      }
      e.preventDefault();
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
        var href = hardPageHref(hard, hash);
        if (push !== false) history.pushState({ dgPage: id }, '', href);
        else history.replaceState({ dgPage: id }, '', href);
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
  if (id === 'blog') {
    try { blogPageMount(root); focusBlogNoteFromHash(root); } catch (e) {}
  }
  if (id === 'bounties') {
    try { bountyFormMount(root); } catch (e) {}
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
function blogBodyHtml(body) {
  return String(body || '').trim().split(/\n\n+/).filter(Boolean).map(function (p) {
    return '<p>' + esc(p.replace(/\n/g, ' ').trim()) + '</p>';
  }).join('');
}
function bountyListingKey(item) {
  return String(item.itemUrl || '').toLowerCase() || (String(item.repo || '') + '|' + String(item.name || '')).toLowerCase();
}
var DG_USDC_SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
var DG_USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
var DG_BOUNTY_GH_KEY = 'dgBountyGh';
var DG_BOUNTY_X_KEY = 'dgBountyX';
function bountyIsSolana(addr) {
  var a = String(addr || '').trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) && !/^0x/i.test(a);
}
function bountyIsEvm(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr || '').trim());
}
function bountyPayHref(it) {
  var to = String(it.payTo || '').trim();
  var amt = it.amount;
  if (!to || amt == null || amt === '') return '';
  if (String(it.chain || '').toLowerCase() === 'base' && bountyIsEvm(to)) {
    var units = String(Math.round(Number(amt) * 1e6));
    if (!/^\d+$/.test(units)) return '';
    return 'ethereum:' + DG_USDC_BASE + '@8453/transfer?address=' + encodeURIComponent(to) + '&uint256=' + units;
  }
  if (bountyIsSolana(to)) {
    return 'solana:' + to + '?amount=' + encodeURIComponent(String(amt)) + '&spl-token=' + DG_USDC_SOL;
  }
  return '';
}
function bountyNormalize(item, source) {
  if (!item || typeof item !== 'object') return null;
  var name = String(item.name || '').trim();
  var repo = String(item.repo || '').trim();
  if (!name && !repo) return null;
  var cur = String(item.currency || 'USDC').trim().toUpperCase();
  if (cur === 'USD') cur = 'USDC';
  return {
    kind: item.kind === 'project' ? 'project' : 'item',
    name: name || repo,
    repo: repo,
    itemUrl: item.itemUrl || null,
    amount: item.amount,
    currency: 'USDC',
    payTo: String(item.payTo || '').trim(),
    chain: String(item.chain || '').trim().toLowerCase(),
    source: source || ''
  };
}
var DG_BOUNTY_SEED = [
  {kind:'item',name:'docs: add CONTRIBUTING screenshot of GitHub web edit flow',repo:'Uuriko/dasha-desk',itemUrl:'https://github.com/Uuriko/dasha-desk/issues/8',amount:25,currency:'USDC',payTo:'',chain:''},
  {kind:'project',name:'dasha desk',repo:'Uuriko/dasha-desk',itemUrl:null,amount:50,currency:'USDC',payTo:'',chain:''}
];
function bountyGhUser() {
  try {
    var j = JSON.parse(sessionStorage.getItem(DG_BOUNTY_GH_KEY) || 'null');
    if (j && j.login && j.token) return j;
  } catch (e) {}
  return null;
}
function bountyXUser() {
  try {
    var j = JSON.parse(sessionStorage.getItem(DG_BOUNTY_X_KEY) || 'null');
    if (j && j.handle && j.token) return j;
  } catch (e) {}
  return null;
}
function bountyAuthBase() {
  var bases = [];
  try { bases = dgEventsBotBases() || []; } catch (e) {}
  return bases[0] || '';
}
function bountyOauth(path, opts) {
  function send(base) {
    if (!base) return Promise.reject(new Error('no_api'));
    return dgEventsBotFetch(base + path, opts || {});
  }
  if (typeof dgEventsBotPickBase === 'function') {
    return dgEventsBotPickBase(4000).then(function (hit) {
      return send((hit && hit.base) || bountyAuthBase());
    });
  }
  return send(bountyAuthBase());
}
function bountyOauthFlags(j) {
  return {
    github: Boolean(j && (j.github === true || j.configured === true)),
    x: Boolean(j && j.x)
  };
}
function bountyShowUnconfigured(root) {
  var host = root && root.querySelector('#dg-bounty-id');
  if (host) host.innerHTML = '<p class="dg-bounty-note">GitHub link not configured</p>';
  var msg = root && root.querySelector('#dg-bounty-msg');
  if (msg) msg.textContent = 'GitHub link not configured';
}
function bountyPaintId(root, cfg) {
  var host = root && root.querySelector('#dg-bounty-id');
  if (!host) return;
  var gh = bountyGhUser();
  var x = bountyXUser();
  var githubOn = Boolean(cfg && cfg.github);
  var xOn = Boolean(cfg && cfg.x);
  var html = '';
  if (gh && gh.login && gh.token) {
    var av = /^https:\/\//i.test(String(gh.avatarUrl || ''))
      ? ('<img class="dg-bounty-av" src="' + esc(gh.avatarUrl) + '" alt="" width="28" height="28" referrerpolicy="no-referrer" />')
      : '';
    html += av + '<a class="dg-bounty-handle" href="' + esc(gh.htmlUrl || ('https://github.com/' + gh.login)) + '" rel="noopener" target="_blank">' + esc(gh.login) + '</a>';
    if (x && x.handle) {
      html += '<a class="dg-bounty-handle" href="' + esc(x.htmlUrl || ('https://x.com/' + x.handle)) + '" rel="noopener" target="_blank">@' + esc(x.handle) + '</a>';
    } else if (xOn) {
      html += '<button type="button" class="dg-bounty-x" id="dg-bounty-x">X</button>';
    }
  } else if (githubOn) {
    html += '<button type="button" class="dg-bounty-gh" id="dg-bounty-gh">GitHub</button>';
    if (xOn) html += '<button type="button" class="dg-bounty-x" id="dg-bounty-x">X</button>';
  } else {
    html = '<p class="dg-bounty-note">GitHub link not configured</p>';
  }
  host.innerHTML = html;
  var ghBtn = host.querySelector('#dg-bounty-gh');
  if (ghBtn) ghBtn.addEventListener('click', function () { bountyGhStart(root); });
  var xBtn = host.querySelector('#dg-bounty-x');
  if (xBtn) xBtn.addEventListener('click', function () { bountyXStart(); });
}
function bountyRenderId(root) {
  var host = root && root.querySelector('#dg-bounty-id');
  if (!host) return;
  if (bountyGhUser()) bountyPaintId(root, { github: true, x: false });
  bountyOauth('/oauth/github/status').then(function (r) { return r.json(); }).then(function (j) {
    bountyPaintId(root, bountyOauthFlags(j));
  }).catch(function () {
    if (!bountyGhUser()) bountyShowUnconfigured(root);
  });
}
function bountyGhStart(root) {
  bountyOauth('/oauth/github/start').then(function (r) { return r.json(); }).then(function (j) {
    if (j && j.authorizeUrl) {
      try { sessionStorage.setItem('dgBountyGhState', j.state || ''); } catch (e) {}
      location.href = j.authorizeUrl;
      return;
    }
    bountyShowUnconfigured(root);
  }).catch(function () { bountyShowUnconfigured(root); });
}
function bountyXStart() {
  bountyOauth('/oauth/x/start').then(function (r) { return r.json(); }).then(function (j) {
    if (j && j.authorizeUrl) {
      try {
        sessionStorage.setItem('dgBountyXState', j.state || '');
        sessionStorage.setItem('dgBountyXVerifier', j.verifier || '');
      } catch (e) {}
      location.href = j.authorizeUrl;
    }
  }).catch(function () {});
}
function bountyConsumeOauth(root) {
  try {
    var u = new URL(location.href);
    var code = u.searchParams.get('code');
    var state = u.searchParams.get('state');
    if (!code || !state) return;
    u.searchParams.delete('code');
    u.searchParams.delete('state');
    try { history.replaceState({}, '', u.pathname + u.search + u.hash); } catch (e0) {}
    var ghState = '';
    var xState = '';
    try { ghState = sessionStorage.getItem('dgBountyGhState') || ''; xState = sessionStorage.getItem('dgBountyXState') || ''; } catch (e1) {}
    if (xState && state === xState) {
      var verifier = '';
      try { verifier = sessionStorage.getItem('dgBountyXVerifier') || ''; } catch (e2) {}
      bountyOauth('/oauth/x/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code, state: state, verifier: verifier }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok && j.token && j.handle) {
            try { sessionStorage.setItem(DG_BOUNTY_X_KEY, JSON.stringify({ token: j.token, handle: j.handle, avatarUrl: j.avatarUrl, htmlUrl: j.htmlUrl })); } catch (e3) {}
          }
          bountyRenderId(root);
        }).catch(function () {});
      return;
    }
    bountyOauth('/oauth/github/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code, state: state }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.token && j.login) {
          try { sessionStorage.setItem(DG_BOUNTY_GH_KEY, JSON.stringify({ token: j.token, login: j.login, avatarUrl: j.avatarUrl, htmlUrl: j.htmlUrl })); } catch (e4) {}
        }
        bountyRenderId(root);
      }).catch(function () {});
  } catch (e) {}
}
function bountyCopyPay(amount) {
  var text = String(amount) + ' USDC';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
  } catch (e) {}
}
function bountyRender(root, listings) {
  var host = root && root.querySelector('#dg-bounty-live');
  if (!host) return;
  if (!listings.length) {
    host.innerHTML = '<p class="dg-p-note">None yet.</p>';
    return;
  }
  host.innerHTML = '<ul class="dg-bounty-rows">' + listings.map(function (it) {
    var href = it.itemUrl || (it.repo ? ('https://github.com/' + it.repo) : '');
    var amt = (it.amount != null && it.amount !== '') ? (esc(String(it.amount)) + ' USDC') : '';
    var title = href ? ('<a class="dg-bounty-title" href="' + esc(href) + '" rel="noopener" target="_blank">' + esc(it.name) + '</a>') : ('<span class="dg-bounty-title">' + esc(it.name) + '</span>');
    var payHref = bountyPayHref(it);
    var pay = payHref
      ? ('<a class="dg-bounty-pay" href="' + esc(payHref) + '" data-dg-bounty-pay="1">Pay</a>')
      : ('<button type="button" class="dg-bounty-pay" data-dg-bounty-copy="' + esc(String(it.amount || '')) + '">Pay</button>');
    return '<li class="dg-bounty-row"><span class="dg-bounty-amt">' + amt + '</span>' + title + pay + '</li>';
  }).join('') + '</ul>';
  host.querySelectorAll('[data-dg-bounty-pay],[data-dg-bounty-copy]').forEach(function (el) {
    el.addEventListener('click', function (ev) {
      if (!bountyGhUser()) { ev.preventDefault(); bountyGhStart(root); return; }
      var copyAmt = el.getAttribute('data-dg-bounty-copy');
      if (copyAmt != null && copyAmt !== '') bountyCopyPay(copyAmt);
    });
  });
}
function bountyLoadFeeds(root) {
  bountyRender(root, DG_BOUNTY_SEED.map(function (it) { return bountyNormalize(it, 'demigod'); }).filter(Boolean));
  var bust = '?t=' + Math.floor(Date.now() / 60000);
  var urls = [
    { src: 'demigod', url: 'https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/main/bounties-feed.json' },
    { src: 'dasha', url: 'https://raw.githubusercontent.com/Uuriko/dasha-desk/main/bounties/feed.json' }
  ];
  Promise.all(urls.map(function (u) {
    return fetch(u.url + bust, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(4000) })
      .then(function (r) { if (!r.ok) throw new Error('n'); return r.json(); })
      .then(function (j) { return { src: u.src, json: j }; })
      .catch(function () { return { src: u.src, json: null }; });
  })).then(function (parts) {
    var seen = {};
    var out = [];
    function add(item, src) {
      var n = bountyNormalize(item, src);
      if (!n) return;
      var k = bountyListingKey(n);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(n);
    }
    DG_BOUNTY_SEED.forEach(function (it) { add(it, 'demigod'); });
    parts.forEach(function (p) {
      var list = p.json && Array.isArray(p.json.listings) ? p.json.listings : [];
      list.forEach(function (it) { add(it, p.src); });
    });
    bountyRender(root, out);
  });
}

function bountyFormMount(root) {
  try { bountyLoadFeeds(root); } catch (e0) {}
  try { bountyRenderId(root); } catch (e1) {}
  try { bountyConsumeOauth(root); } catch (e2) {}
  var form = root && root.querySelector('#dg-bounty-form');
  if (!form || form.dataset.dgBounty === '1') return;
  form.dataset.dgBounty = '1';
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var gh = bountyGhUser();
    if (!gh) { bountyGhStart(root); return; }
    var repo = String((root.querySelector('#dg-bounty-repo') || {}).value || '').trim();
    var amount = String((root.querySelector('#dg-bounty-amount') || {}).value || '').trim();
    var payTo = String((root.querySelector('#dg-bounty-payto') || {}).value || '').trim();
    var msg = root.querySelector('#dg-bounty-msg');
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(repo)) {
      if (msg) msg.textContent = 'GitHub URL';
      return;
    }
    if (!amount) {
      if (msg) msg.textContent = 'USDC';
      return;
    }
    var body = [
      'Repo: ' + repo,
      'Amount: ' + amount + ' USDC',
      'PayTo: ' + (payTo || ''),
      'GitHub: ' + gh.login
    ].join('\n');
    location.href = 'mailto:potter@trydemigod.com?subject=' + encodeURIComponent('Demigod bounty: ' + repo) + '&body=' + encodeURIComponent(body);
  });
}

function blogPageMount(root) {
  var grid = root && root.querySelector('#dg-blog-grid');
  if (!grid || grid.dataset.dgBlog === '1') return;
  grid.dataset.dgBlog = '1';
  var posts = Array.isArray(DG_BLOG_POSTS) ? DG_BLOG_POSTS.slice() : [];
  posts.sort(function (a, b) { return String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')); });
  grid.innerHTML = posts.map(function (p) {
    return '<article class="dg-blog-card dg-reveal-in" id="note-' + esc(p.slug) + '">' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.imageAlt || p.title) + '" loading="lazy" decoding="async" width="1200" height="675">' : '') +
      '<div class="dg-blog-meta"><small>' + esc(p.category || 'Note') + '</small>' +
      (p.publishedAt ? ' · <time datetime="' + esc(p.publishedAt) + '">' + esc(p.publishedAt) + '</time>' : '') + '</div>' +
      '<h2>' + esc(p.title) + '</h2><p>' + esc(p.summary) + '</p>' +
      '<details class="dg-blog-more"><summary>Full note · ' + esc(p.title) + '</summary><div class="dg-blog-body">' + blogBodyHtml(p.body) + '</div></details></article>';
  }).join('');
}
function focusBlogNoteFromHash(root) {
  try {
    var hash=(location.hash||'').replace(/^#/,'');
    if (!hash) return false;
    var id=/^note-/.test(hash)?hash:'note-'+hash, card=root.querySelector('#'+id);
    if (!card) return false;
    var details=card.querySelector('details'); if(details)details.open=true;
    var heading=card.querySelector('h2'); if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}
    card.scrollIntoView({block:'start',behavior:'auto'});
    return true;
  } catch (e) { return false; }
}
var DG_PAGE_PATHS = {
  '/startups': 'map',
  '/how': 'how',
  '/how-it-works': 'how',
  '/pricing': 'pricing',
  '/faq': 'faq',
  '/blog': 'blog',
  '/notes': 'blog',
  '/method': 'how',
  '/hire': 'hire',
  '/talent': 'talent',
  '/contact': 'contact',
  '/legal': 'legal',
  '/privacy': 'legal',
  '/bounties': 'bounties',
  '/tryouts': 'bounties',
  // '/tryout' (singular) was declared here and is not a published Webflow page, so it served a 404
  // to anyone who followed it while route-audit counted it as a route we offer. A declared route
  // that does not resolve is worse than no alias: it is a promise the site cannot keep. The
  // `#tryout` hash below still works, because that one never depended on a page existing.

  '/terms': 'legal',
  '/cookies': 'legal',
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
    if(h==='bounties'||h==='tryouts'||h==='tryout'){ openPage('bounties',false); window.__dgDeepLinked=1; return; }
    if(h==='partnerships'||h==='partners'){ openPage('refer',false); window.__dgDeepLinked=1; return; }
    if(/^note-/.test(h)||/^(epicurus-garden-hacker-houses)$/.test(h)){ openPage('blog',false); focusBlogNoteFromHash(q('#dg-page')); window.__dgDeepLinked=1; return; }
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

/* Intent-named submit labels (forms/WIZ already use these; never demote to generic Submit). */
function finalButtonLabels(){var a=q('#startup-hire [type=submit],#startup-modal form [type=submit]');if(a){a.value='Send brief';a.textContent='Send brief'}var b=q('#engineer-join [type=submit],#jobseeker-modal form [type=submit]');if(b){b.value='Send privately';b.textContent='Send privately'}var o=q('#startup-hire [name="90day-outcome"],#startup-modal [name="90day-outcome"]');if(o){o.placeholder='One concrete first result (30–90 days)';var l=o.id&&q('label[for="'+o.id+'"]');if(l)l.textContent='What should this person accomplish first? *'}var av=q('#engineer-join [name=availability],#jobseeker-modal [name=availability]');if(av){var al=av.id&&q('label[for="'+av.id+'"]')||(av.closest('.form-field-group,.dg-field-wrap')||{}).querySelector?.('label');if(al)al.textContent='When could you start? *'}var rt=q('#startup-hire [name=role-title],#startup-modal [name=role-title]');if(rt){var rl=rt.id&&q('label[for="'+rt.id+'"]')||(rt.closest('.form-field-group,.dg-field-wrap')||{}).querySelector?.('label');if(rl)rl.textContent='What role are you hiring? *'}}
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
    t.style.cssText='margin:0 0 .65rem;padding:.5rem .7rem;border-radius:10px;background:rgba(16,198,116,.10);border:1px solid rgba(166,255,203,.32);color:var(--dg-paper,#f3f0e7);font-size:.85rem;line-height:1.35;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem';
    var msg=document.createElement('span');
    msg.textContent='Draft restored — continue where you left off.';
    var restart=document.createElement('button');
    restart.type='button';
    restart.className='dg-wiz-restart';
    restart.textContent='Start over';
    restart.style.cssText='margin-left:auto;min-height:36px;padding:.25rem .65rem;border-radius:8px;border:1px solid rgba(166,255,203,.4);background:transparent;color:var(--dg-phosphor,#a6ffcb);cursor:pointer;font:600 .78rem/1 var(--wiz-sans,system-ui,sans-serif)';
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
function ensureTapTargetCss(){if(q('#dg-tap-targets'))return;var s=document.createElement('style');s.id='dg-tap-targets';s.textContent='.hero-actions a[data-dg-cta],#dg-nav-hire,#dg-nav-talent,#dg-bar a{min-height:48px!important}a.nav_logo,a.footer_link{min-height:48px!important}';document.head.appendChild(s)}
function boot(){if(!document.body)return;run();ensureTapTargetCss();finalButtonLabels();deepLink();/* Webflow writes some section headings AFTER DOMContentLoaded, so the scrubs in run() test text that is not final and shout titles reach users — observed live 2026-08-05: "TECH-MATCHED SF STARTUP TALENT" survived while the paragraph scrub in the same function applied. Re-running the scrub in the live DOM fixed it, so the logic is right and only the timing is wrong. copy() is idempotent (every scrub tests before it replaces); re-apply once on load. One bounded pass, no observer, no re-entrancy. */try{window.addEventListener('load',function(){try{copy()}catch(e){}},{once:true})}catch(e){}try{document.body.classList.add('dg-ready');document.body.setAttribute('data-dg-ready','1')}catch(e){}try{if(window.requestIdleCallback)requestIdleCallback(function(){try{orgJsonLd()}catch(e){}});else setTimeout(function(){try{orgJsonLd()}catch(e){}},1200)}catch(e){}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',function(e){var c=e.target.closest('[class*=close],.modal_close,.w-modal-close');if(c&&c.closest(S+','+J)){e.preventDefault();OPEN=null;hide(true);return}
/* v195: never treat bare href=# as hire — only explicit modal targets */
var el=e.target.closest('[data-demigod-modal],a[href="'+S+'"],a[href="'+J+'"],a[href="#startup-modal"],a[href="#jobseeker-modal"]');
if(!el)return;
if(el.closest('a.dg-logo,.w-nav-brand,#dg-skip'))return;
var h=(el.getAttribute('href')||'').trim(),k=el.getAttribute('data-demigod-modal');
if(k==='startup'||h===S||h==='#startup-modal'){if(!q(S))return;e.preventDefault();show(S, el)}
else if(k==='jobseeker'||h===J||h==='#jobseeker-modal'){if(!q(J))return;e.preventDefault();show(J, el)}
},true);
document.addEventListener('input',function(e){if(OPEN&&e.target&&e.target.closest&&e.target.closest(S+','+J)){/*dg-wiz-err-clear*/try{var f=e.target.closest('form');var er=f&&f.querySelector('.dg-wiz-err,.dg-wiz-req-err'),eid=er&&er.id;if(er)er.remove();e.target.style.borderColor='';e.target.removeAttribute('aria-invalid');if(eid){var ids=(e.target.getAttribute('aria-describedby')||'').split(/\s+/).filter(function(id){return id&&id!==eid});if(ids.length)e.target.setAttribute('aria-describedby',ids.join(' '));else e.target.removeAttribute('aria-describedby')}}catch(err){}}},true);
document.addEventListener('keydown',function(e){if(e.defaultPrevented)return;if(e.key==='Escape'&&q('#dg-page')){closePage();return}if(e.key==='Escape'&&OPEN){OPEN=null;hide(true)}});
typeof window.addEventListener==='function'&&window.addEventListener('popstate',function(){/*dg-page-popstate*/ try{ if(!routePages()) closePage(); }catch(e){} });
window.__dgFootVer='1104';console.log('Demigod v1104');
window.__dgDedupe = dedupeAll;
window.__dgScrub = scrubStaticLabels;



})();
/*removed stray formSend per hygiene*/

/* cdn-bust-20260710-177a */
/* autopilot-cdn-bust-1783648396 */
