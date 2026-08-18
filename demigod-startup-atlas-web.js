(function () {
  'use strict';
  // Minimal, text-first tech company directory ("think Craigslist"): a dense,
  // searchable list spanning SF Bay, LA, and NYC scope on roles. No SVG map, no radius
  // search, no venue layer; events stay separate.
  // Preserves the public API (mount/addCommunityStartups), schema/3 validation, the
  // community-submission merge, and every honesty label from the prior atlas.
  var source = document.currentScript && document.currentScript.src;
  var dataUrl = document.querySelector('meta[name="dg-startup-map-data"]')?.content ||
    (source ? new URL('sf-startup-map.json', source).href : '');
  // Catbox URLs are opaque single files, so resolving roles-feed.json beside one produces a dead
  // URL. The publisher binds the exact attested feed; directory-shaped jsDelivr remains a fallback.
  var feedUrl = document.querySelector('meta[name="dg-startup-roles-feed"]')?.content ||
    (source && /\/startup-map-latest\.js(?:[?#]|$)/.test(source) ? new URL('roles-feed.json', source).href : '');
  // Pure ordering rule, hoisted so it can be exercised directly by a test rather than asserted
  // as a source pattern. A company with NO measured median posting age sorts LAST in both
  // directions: treating unknown as 0 would rank an unmeasured board as the freshest on the page,
  // which is a claim we cannot make — we only know a median where the employer published a date
  // we trust. Ties and unknown-vs-unknown fall back to name so the order stays stable.
  // Shareable filter state lives in the HASH, not the query string, and that is forced by routing:
  // foot-core normalises a mini-page URL to its hard path with `hard + hash` and deliberately fires
  // that rewrite when location.search is non-empty (it is how /?p=map becomes /startups). A ?q=
  // param would be stripped out from under us; the hash survives untouched, so no foot-core change
  // is needed for a link to a filtered view to work.
  //
  // Values are ALLOW-LISTED rather than trusted. This string comes from whatever a stranger put in
  // a URL they sent someone, and it is written straight back into control values, so anything not
  // recognised is dropped rather than echoed.
  var DG_SORTS = ['roles', 'fresh', 'stale', 'name'];
  var DG_HIRING = ['yes', 'unknown'];
  var DG_FUNCS = ['engineering', 'ai/data', 'design', 'product', 'sales', 'marketing', 'operations', 'people', 'finance/legal'];
  // First-class role metros (directory expansion). Empty string = unfiltered.
  var DG_METROS = ['sf-bay', 'la', 'nyc'];
  // 'unknown' is a real filter value (≈⅓ of the map has no attributed headcount). Empty
  // string is only the unfiltered control state — never a bucket label.
  var DG_SIZES = ['1-10', '11-50', '51-200', '201+', 'unknown'];

  /** PURE. Same metro rules as demigod-public-roles.detectPublicMetro (browser copy). */
  function dgDetectMetro(location) {
    var s = String(location || '');
    if (!s.trim()) return null;
    if (/san\s*francisco|\bsf\b|bay\s*area|palo\s*alto|mountain\s*view|menlo\s*park|oakland|berkeley|san\s*mateo|redwood\s*city|sunnyvale|cupertino|san\s*jose|south\s*bay|peninsula|fremont|emeryville|daly\s*city|south\s*san\s*francisco|silicon\s*valley/i.test(s)) return 'sf-bay';
    if (/los\s*angeles|santa\s*monica|culver\s*city|pasadena|burbank|el\s*segundo|playa\s*vista|venice(?:\s*,\s*ca)?|long\s*beach,\s*ca|marina\s*del\s*rey|century\s*city/i.test(s)) return 'la';
    if (/new\s*york|\bnyc\b|brooklyn|manhattan|queens|bronx|long\s*island\s*city|jersey\s*city|hoboken/i.test(s)) return 'nyc';
    return null;
  }

  function dgMetroLabel(metro) {
    if (metro === 'sf-bay') return 'SF Bay';
    if (metro === 'la') return 'Los Angeles';
    if (metro === 'nyc') return 'NYC';
    return '';
  }

  function dgFunctionLabel(value) {
    return value === 'ai/data' ? 'AI / data' : value === 'finance/legal' ? 'Finance / legal' : value.charAt(0).toUpperCase() + value.slice(1);
  }

  function dgTeamSizeBucket(value) {
    if (!Number.isSafeInteger(value) || value < 1) return 'unknown';
    if (value <= 10) return '1-10';
    if (value <= 50) return '11-50';
    if (value <= 200) return '51-200';
    return '201+';
  }

  // Directory default sort: prefer YC-shaped headcount (≤200) so OpenAI-scale boards do not
  // monopolise "Most open roles". Unknown size stays mid — missing data is not a demotion.
  function dgStartupBand(teamSize) {
    if (!Number.isSafeInteger(teamSize) || teamSize < 1) return 1;
    if (teamSize <= 200) return 2;
    return 0;
  }

  function dgParseFilterHash(hash, providers) {
    var out = { query: '', hiring: '', func: '', size: '', provider: '', metro: '', sort: 'roles' };
    var raw = String(hash || '').replace(/^#/, '');
    if (!raw) return out;
    var known = (providers || []).map(function (x) { return String(x).toLowerCase(); });
    raw.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i < 0) return;
      var k = pair.slice(0, i);
      var v;
      try { v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { return; }
      if (k === 'q') out.query = v.slice(0, 120);
      else if (k === 'hiring' && DG_HIRING.indexOf(v) >= 0) out.hiring = v;
      else if (k === 'fn' && DG_FUNCS.indexOf(v) >= 0) out.func = v;
      else if (k === 'size' && DG_SIZES.indexOf(v) >= 0) out.size = v;
      else if (k === 'metro' && DG_METROS.indexOf(v) >= 0) out.metro = v;
      else if (k === 'sort' && DG_SORTS.indexOf(v) >= 0) out.sort = v;
      else if (k === 'ats' && known.indexOf(v.toLowerCase()) >= 0) out.provider = v.toLowerCase();
    });
    return out;
  }

  // Inverse. Defaults are OMITTED so an unfiltered directory keeps a clean shareable URL.
  function dgFilterHash(st) {
    var parts = [];
    if (st.query) parts.push('q=' + encodeURIComponent(st.query));
    if (st.hiring) parts.push('hiring=' + encodeURIComponent(st.hiring));
    if (st.func) parts.push('fn=' + encodeURIComponent(st.func));
    if (st.size) parts.push('size=' + encodeURIComponent(st.size));
    if (st.metro) parts.push('metro=' + encodeURIComponent(st.metro));
    if (st.provider) parts.push('ats=' + encodeURIComponent(st.provider));
    if (st.sort && st.sort !== 'roles') parts.push('sort=' + encodeURIComponent(st.sort));
    return parts.length ? '#' + parts.join('&') : '';
  }

  // PURE, hoisted so a test can exercise it directly rather than asserting on a source pattern.
  // The feed carries TWO dates that mean different things and must never be conflated:
  // firstObservedAt is OURS (when we first saw the role on the board) and is on every row;
  // postedAt is the EMPLOYER'S and is null unless the ATS exposed a real post date. We order by our
  // own observation because it is the only field present everywhere — ordering by postedAt would
  // silently rank the Greenhouse-attributed roles above every other board rather than showing the
  // newest, and would look like an editorial judgement we never made.
  // PURE. Narrow the feed to the view the user is actually looking at. Filtering companies while
  // the roles list ignores those filters shows roles from companies not on the page — the same
  // "two scopes presented as one" problem as the US/non-US labelling above, just less visible.
  //
  // `companies` is null when NO filter is active, which is not the same as an empty set: null means
  // "do not narrow", empty means "nothing matched". Collapsing those would blank the section on an
  // unfiltered page.
  function dgFilterRoles(roles, opts) {
    var fn = (opts && opts.func) || '';
    var metro = (opts && opts.metro) || '';
    var names = opts && opts.companies;
    return (roles || []).filter(function (r) {
      if (!r) return false;
      if (fn && String(r.fn || '') !== fn) return false;
      if (metro) {
        var m = r.metro || dgDetectMetro(r.location) || dgDetectMetro(r.employerOffice);
        if (m !== metro) return false;
      }
      if (names && !names.has(String(r.company || '').toLowerCase())) return false;
      return true;
    });
  }

  function dgRecentRoles(feed, limit) {
    var n = (typeof limit === 'number' && limit > 0) ? limit : 8;
    var roles = (feed && Array.isArray(feed.roles)) ? feed.roles : [];
    return roles
      .filter(function (r) { return r && r.company && r.title && r.firstObservedAt; })
      .slice()
      .sort(function (a, b) {
        if (a.firstObservedAt === b.firstObservedAt) return String(a.company).localeCompare(String(b.company));
        return a.firstObservedAt < b.firstObservedAt ? 1 : -1;
      })
      .slice(0, n);
  }

  function dgActivitySummary(feed, view) {
    var counts = feed && feed.counts;
    var fields = ['inWindow', 'companiesInWindow', 'closedInWindow', 'companiesClosedInWindow', 'observationSpanDays', 'closureObservationSpanDays'];
    if ((view && (view.func || view.companies)) || !feed || feed.schema !== 'demigod.roles-feed/8' ||
        !Number.isSafeInteger(feed.windowDays) || feed.windowDays < 1 || !counts ||
        fields.some(function (key) { return !Number.isSafeInteger(counts[key]) || counts[key] < 0; })) return '';
    var n = function (value, noun, plural) { return value + ' ' + (value === 1 ? noun : plural); };
    return 'Latest ' + feed.windowDays + '-day window: Demigod first observed ' +
      n(counts.inWindow, 'role', 'roles') + ' across ' + n(counts.companiesInWindow, 'company', 'companies') + '; ' +
      n(counts.closedInWindow, 'role', 'roles') + ' left polled boards across ' +
      n(counts.companiesClosedInWindow, 'company', 'companies') + '. A role leaving a board does not mean filled or hired. ' +
      'Observation history spans ' + n(counts.observationSpanDays, 'day', 'days') + '; closure history spans ' +
      n(counts.closureObservationSpanDays, 'day', 'days') + '. These are board observations, not a hiring rate.';
  }

  function dgOrderByMedian(direction) {
    var newestFirst = direction === 'fresh';
    return function (aMed, bMed, aName, bName) {
      var a = (typeof aMed === 'number' && isFinite(aMed)) ? aMed : null;
      var b = (typeof bMed === 'number' && isFinite(bMed)) ? bMed : null;
      if (a === null && b === null) return String(aName).localeCompare(String(bName));
      if (a === null) return 1;
      if (b === null) return -1;
      if (a === b) return String(aName).localeCompare(String(bName));
      return newestFirst ? a - b : b - a;
    };
  }

  function dgRoleMixSummary(mix) {
    if (!mix || typeof mix !== 'object' || Array.isArray(mix)) return '';
    return Object.keys(mix)
      .filter(function (fn) { return fn !== 'other' && Number.isSafeInteger(mix[fn]) && mix[fn] > 0; })
      .map(function (fn) { return { fn: fn, n: mix[fn] }; })
      .sort(function (a, b) { return b.n - a.n || a.fn.localeCompare(b.fn); })
      .slice(0, 5)
      .map(function (row) { return row.fn + ' ' + row.n.toLocaleString('en-US'); })
      .join(' · ');
  }

  var state = {
    baseMap: null, root: null, query: '', hiring: '', func: '', size: '', metro: '', provider: '', sort: 'roles',
    communityStartups: Array.isArray(window.dgCommunityStartups) ? window.dgCommunityStartups : [],
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function safeUrl(value) {
    try { var url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) && url.hostname !== 'careers.onton.com' ? url.href : ''; }
    catch (_) { return ''; }
  }

  function withCommunityStartups(map) {
    var names = new Set(map.companies.map(function (c) { return String(c.name || '').trim().toLowerCase(); }));
    var additions = state.communityStartups.map(function (row) {
      var name = String(row && row.name || '').trim().slice(0, 160);
      if (!name || names.has(name.toLowerCase())) return null;
      names.add(name.toLowerCase());
      return {
        id: String(row.id || ''), name: name, website: safeUrl(row.website),
        description: String(row.description || '').trim().slice(0, 1200),
        neighborhood: String(row.neighborhood || '').trim().slice(0, 120),
        hiring: ['yes', 'no', 'unknown'].includes(row.hiring) ? row.hiring : 'unknown',
        reviewedAt: row.reviewedAt || null, tags: ['community-reviewed'],
        locationPrecision: 'city', source: 'Community submission',
      };
    }).filter(Boolean);
    return Object.assign({}, map, {
      companies: map.companies.concat(additions),
      coverage: Object.assign({}, map.coverage, { communityCompanies: additions.length }),
    });
  }

  function addCommunityStartups(rows) {
    state.communityStartups = Array.isArray(rows) ? rows : [];
    if (state.root && state.baseMap) render(state.root, withCommunityStartups(state.baseMap));
  }

  // Keep the schema/3 contract so the publish bundle + gates stay valid; the minimal
  // directory only needs `companies`, but we still require the map to be well-formed.
  function valid(map) {
    return map && map.schema === 'demigod.sf-startup-map/3' &&
      Array.isArray(map.companies) && map.coverage && typeof map.coverage === 'object';
  }

  function css() {
    if (document.getElementById('dg-startup-map-css')) return;
    var style = document.createElement('style');
    style.id = 'dg-startup-map-css';
    style.textContent =
      '.dg-dir-intro{max-width:72ch;color:#d6d3cc;line-height:1.6;margin:.1rem 0 1rem}' +
      '.dg-dir-tools{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin:.9rem 0}' +
      /* On a phone the five selects wrapped to five stacked rows (~550px) and pushed the first
         company off the fold entirely. Scroll them horizontally instead: same controls, same
         order, same touch targets, one row. Search keeps its own full-width row above because it
         is the control people actually reach for. */
      /* Two selects per row instead of one. A horizontal-scroll row was tried first and was worse:
         it pushed all five selects off-screen right, so the filters were unreachable — a lower
         fold is not worth hiding the controls. This keeps every control visible and tappable,
         just denser. */
      '@media(max-width:560px){' +
        '.dg-dir-tools>.dg-dir-search{flex:1 0 100%}' +
        '.dg-dir-tools>select{flex:1 1 calc(50% - .3rem);min-width:0;max-width:calc(50% - .3rem)}' +
        '.dg-dir-tools>.dg-dir-sort{flex-basis:100%;max-width:100%}' +
      '}' +
      '.dg-dir-search,.dg-dir-hiring,.dg-dir-func,.dg-dir-size,.dg-dir-provider,.dg-dir-sort{min-height:48px;border:1px solid rgba(166,255,203,.3);border-radius:9px;background:#07150f;color:#f3f0e7;padding:.55rem .7rem;font:inherit}' +
      '.dg-dir-search{flex:1 1 18rem;width:min(100%,28rem)}' +
      '.dg-dir-search:focus-visible,.dg-dir-hiring:focus-visible,.dg-dir-func:focus-visible,.dg-dir-size:focus-visible,.dg-dir-provider:focus-visible,.dg-dir-sort:focus-visible,.dg-dir-row a:focus-visible,button.dg-dir-rolechip:focus-visible,.dg-dir-more:focus-visible,.dg-dir-toggle:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-dir-roles{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0 0}' +
      /* display+align on the BASE rule, not button-only. .dg-dir-roles is display:flex, so a
         non-interactive <span> chip — any function outside DG_FUNCS, e.g. "Other 6" — is a flex
         item that stretches to the 48px tap-target height of its button siblings while keeping
         display:block/align-items:normal, which pins its text to the TOP of that box. Measured on
         live: buttons resolve display:flex/align:center, the span resolved block/normal, and the
         text renders outside the visible pill. min-width/min-height/cursor stay button-only — a
         span is not a tap target. */
      '.dg-dir-rolechip{display:inline-flex;align-items:center;color:#9fb8a8;font-size:.68rem;border:1px solid rgba(166,255,203,.18);border-radius:999px;padding:.02rem .45rem;white-space:nowrap}' +
      'button.dg-dir-rolechip{display:inline-flex;align-items:center;min-width:48px;min-height:48px;background:transparent;font:inherit;font-size:.68rem;cursor:pointer}button.dg-dir-rolechip:hover{text-decoration:underline}' +
      '.dg-dir-topics{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem;margin:.2rem 0 0}.dg-dir-topic-label{color:#a8a29e;font-size:.68rem}' +
      '.dg-dir-topic{border:1px solid rgba(166,255,203,.18);border-radius:999px;color:#9fb8a8;padding:.08rem .45rem;font-size:.68rem}' +
      '.dg-dir-count{color:#a8a29e;font-size:.8rem;margin:.2rem 0 .8rem}.dg-dir-count:focus{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-dir-list{list-style:none;margin:0;padding:0;border-top:1px solid rgba(166,255,203,.12)}' +
      '.dg-dir-more{min-height:48px;margin:.8rem 0 0;border:1px solid rgba(166,255,203,.4);border-radius:9px;background:#07150f;color:#a6ffcb;padding:.55rem .8rem;font:inherit;cursor:pointer}.dg-dir-more:hover{text-decoration:underline}' +
      '.dg-dir-row{border-bottom:1px solid rgba(166,255,203,.1);padding:.5rem .1rem}' +
      '.dg-dir-act{margin:.4rem 0 .1rem}' +
      'button.dg-dir-brief{min-height:48px;padding:.4rem .8rem;border:1px solid rgba(166,255,203,.35);border-radius:6px;background:transparent;color:#a6ffcb;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .18s ease,border-color .18s ease}' +
      'button.dg-dir-brief:hover{background:rgba(166,255,203,.1);border-color:rgba(166,255,203,.6)}' +
      'button.dg-dir-brief:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '@media(prefers-reduced-motion:reduce){button.dg-dir-brief{transition:none}}' +
      '.dg-dir-row[hidden]{display:none}' +
      '.dg-dir-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .6rem}' +
      '.dg-dir-row a{display:inline-flex;align-items:center;min-width:48px;min-height:48px}.dg-dir-name{color:#a6ffcb;font-weight:700;text-decoration:none;overflow-wrap:anywhere}' +
      '.dg-dir-name:hover{text-decoration:underline}' +
      '.dg-dir-name.is-plain{color:#e7e5e4}' +
      '.dg-dir-meta{color:#a8a29e;font-size:.78rem}' +
      '.dg-dir-flag{color:#c6c3bb;font-size:.72rem;border:1px solid rgba(166,255,203,.22);border-radius:999px;padding:.02rem .4rem}' +
      '.dg-dir-flag.is-hiring{color:#a6ffcb;border-color:rgba(166,255,203,.5)}' +
      '.dg-dir-pulse{margin:.35rem 0 .55rem;color:#9fb8a8;font-size:.78rem;line-height:1.35}' +
      '.dg-dir-desc{color:#c9c6bf;font-size:.82rem;line-height:1.5;margin:.25rem 0 0}' +
      '.dg-dir-links{margin:.25rem 0 0;font-size:.76rem}' +
      '.dg-dir-links a{display:inline-flex;align-items:center;min-height:48px;color:#a6ffcb;text-decoration:none;margin-right:.8rem}.dg-dir-links a:hover{text-decoration:underline}' +
      '.dg-dir-empty{color:#a8a29e;padding:.9rem 0}' +
      '.dg-dir-fresh{margin:1.4rem 0 0;padding-top:1rem;border-top:1px solid rgba(166,255,203,.12)}' +
      '.dg-dir-fresh[hidden]{display:none}' +
      '.dg-fresh-h{font-size:.95rem;margin:0 0 .3rem;color:#f3f0e7}' +
      '.dg-fresh-note{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:0 0 .6rem}' +
      '.dg-fresh-list{list-style:none;margin:0;padding:0}' +
      '.dg-fresh-row{padding:.5rem 0;border-bottom:1px solid rgba(166,255,203,.08)}' +
      '.dg-fresh-title{display:flex;align-items:center;min-height:48px;color:#a6ffcb;text-decoration:none}' +
      '.dg-fresh-title:hover{text-decoration:underline}' +
      '.dg-fresh-row a{color:#a6ffcb}' +
      '.dg-fresh-row a:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-fresh-co{color:#f3f0e7}' +
      '.dg-fresh-meta{display:block;color:#a8a29e;font-size:.76rem;margin-top:.15rem}' +
      '.dg-dir-foot{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:1.1rem 0 0}' +
      '.dg-dir-foot a{color:#a6ffcb}' +
      '.dg-dir-error{padding:1rem;border:1px solid #9f4a4a;border-radius:12px;color:#f6caca}' +
      '.dg-dir-retry{min-height:48px;margin-top:.7rem;border:1px solid #a6ffcb;border-radius:8px;background:transparent;color:#a6ffcb;padding:.45rem .8rem;cursor:pointer}';
    document.head.appendChild(style);
  }

  function companyRow(company, index) {
    var website = safeUrl(company.website);
    var jobsUrl = safeUrl(company.jobsUrl);
    var sourceUrl = safeUrl(company.sourceUrl);
    var community = company.source === 'Community submission';
    var openRoles = (typeof company.openRoles === 'number' && company.openRoles > 0 && company.atsSource) ? company.openRoles : 0;
    // Counts are US-posted (or Remote) board rows only — see jobs enrich openRolesScope.
    var rolesLabel = openRoles ? openRoles + ' US open role' + (openRoles === 1 ? '' : 's') : '';
    var hn = company.sourceLicense === 'HN-public' || company.source === 'Hacker News (Who is Hiring)';
    var yc = company.sourceLicense === 'YC-public' || company.source === 'Y Combinator';
    var hiring = openRoles ? rolesLabel
      : company.hiring === 'yes'
        ? (community ? 'Hiring reported' : hn ? 'Hiring (per HN post)' : 'Hiring (per YC)')
        : community
          ? (company.hiring === 'no' ? 'Not hiring reported' : 'Hiring unknown')
          : 'Hiring not verified';
    var flagClass = (openRoles || company.hiring === 'yes') ? ' is-hiring' : '';
    // Provenance label follows sourceLicense/source — YC-public/HN-public are not CC0 evidence.
    var kind = yc
      ? 'YC · public directory'
      : hn
        ? 'Hacker News · Who is Hiring'
        : community
          ? 'Reviewed submission'
          : company.sourceLicense === 'CC0-1.0'
            ? 'Wikidata · CC0'
            : (company.source || 'Public record');
    var bits = [kind];
    if (company.inceptionYear) bits.push((yc ? 'launched ' : 'founded ') + esc(company.inceptionYear));
    var selfReported = [];
    if (yc && ['Early', 'Growth'].includes(company.stage)) selfReported.push(esc(company.stage) + ' stage');
    if (yc && Number.isSafeInteger(company.teamSize) && company.teamSize > 0 && company.teamSize <= 100000) {
      selfReported.push('team size listed ' + esc(company.teamSize));
    }
    if (selfReported.length) bits.push('YC directory: ' + selfReported.join(' · '));
    if (community && company.neighborhood) bits.push(esc(company.neighborhood) + ' (descriptive)');
    if (openRoles) bits.push('US-posted roles as of ' + esc(company.openRolesAt || ''));
    // Observed open age — days since Demigod first saw the role on the public ATS board (not a ghost verdict).
    if (openRoles && typeof company.oldestObservedDays === 'number' && company.oldestObservedDays > 0) {
      bits.push('longest open role tracked ' + esc(company.oldestObservedDays) + 'd (our first seen)');
    }
    if (openRoles && typeof company.observed30 === 'number' && company.observed30 > 0) {
      bits.push(esc(company.observed30) + ' open ≥30d (tracked)');
    } else if (openRoles && typeof company.observed7 === 'number' && company.observed7 > 0) {
      bits.push(esc(company.observed7) + ' open ≥7d (tracked)');
    }
    // Attributed board post age (Greenhouse first_published only): 90–365d still open; not evergreen talent-pool posts.
    if (openRoles && typeof company.agingRoles === 'number' && company.agingRoles > 0) {
      bits.push(esc(company.agingRoles) + ' posted 90–365d ago (board date)');
    }
    // Median posting age with corpus context. The median alone is unreadable — 163d means nothing
    // until you know most tracked boards sit far lower — so the rank always travels with it, and
    // both are omitted together when the board has too few dated roles to rank honestly.
    // Rendered as a phrase, not a raw percentile: the top of the range is "staler than every other
    // board", never "staler than 100% of boards", which would include itself.
    if (openRoles && typeof company.medianPostedDays === 'number' && typeof company.postedPercentile === 'number') {
      var band = company.postedPercentile >= 95 ? 'among the stalest tracked boards'
        : company.postedPercentile >= 75 ? 'staler than most tracked boards'
        : company.postedPercentile <= 25 ? 'fresher than most tracked boards'
        : 'typical for tracked boards';
      bits.push('median posting ' + esc(company.medianPostedDays) + 'd — ' + band);
    }
    var nameHtml = website
      ? '<a class="dg-dir-name" href="' + esc(website) + '" target="_blank" rel="' + (community ? 'noopener noreferrer ugc nofollow' : 'noopener noreferrer') + '">' + esc(company.name) + '</a>'
      : '<span class="dg-dir-name is-plain">' + esc(company.name) + '</span>';
    var links = [];
    if (jobsUrl) {
      var jobsText = openRoles ? rolesLabel + ' on ' + esc(company.atsSource)
        : company.jobsSource === 'YC' ? 'Open jobs on Y Combinator'
        : 'careers';
      links.push('<a href="' + esc(jobsUrl) + '" target="_blank" rel="noopener noreferrer">' + jobsText + '</a>');
    }
    if (sourceUrl) links.push('<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + (community ? 'submission' : hn ? 'HN post' : yc ? 'YC profile' : 'CC0 source') + '</a>');
    if (!website) links.push('<span class="dg-dir-meta">no verified website on record</span>');
    var roleMixHtml = '';
    if (company.roleMix) {
      var mix = Object.keys(company.roleMix).map(function (k) { return { k: k, n: company.roleMix[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
      // Only keys accepted by the shared filter become controls; "other" stays evidence, not a dead button.
      roleMixHtml = '<p class="dg-dir-roles">' + mix.map(function (m) {
        var label = esc(dgFunctionLabel(m.k)) + ' ' + esc(m.n);
        return DG_FUNCS.indexOf(m.k) >= 0
          ? '<button type="button" class="dg-dir-rolechip" data-fn="' + esc(m.k) + '">' + label + '</button>'
          : '<span class="dg-dir-rolechip">' + label + '</span>';
      }).join('') + '</p>';
    }
    var topics = yc && Array.isArray(company.tags)
      ? company.tags.filter(function (tag) { return tag !== 'yc' && tag !== 'hn-hiring' && !/^YC\s/i.test(tag); }).slice(0, 3)
      : [];
    var topicHtml = topics.length
      ? '<p class="dg-dir-topics"><span class="dg-dir-topic-label">YC directory topics:</span>' + topics.map(function (topic) {
          return '<span class="dg-dir-topic">' + esc(topic) + '</span>';
        }).join('') + '</p>'
      : '';
    return '<li class="dg-dir-row" data-i="' + index + '">' +
      '<div class="dg-dir-line">' + nameHtml +
      '<span class="dg-dir-flag' + flagClass + '">' + hiring + '</span>' +
      '<span class="dg-dir-meta">' + bits.join(' · ') + '</span></div>' +
      (company.description ? '<p class="dg-dir-desc">' + esc(company.description) + '</p>' : '') +
      topicHtml +
      roleMixHtml +
      (links.length ? '<div class="dg-dir-links">' + links.join('') + '</div>' : '') +
      /* Intent capture at the highest-signal moment: a founder looking at their own company's row,
         or filtering the function they are hiring for, has already told us the company and the
         function. Only offered where the board shows live roles. It opens the EXISTING brief
         wizard (no second form system) prefilled with the company — it never sends anything, and
         it must not imply Demigod represents this company or can place there. */
      (openRoles
        ? '<div class="dg-dir-act"><button type="button" class="dg-dir-brief" data-company="' + esc(company.name) +
          '" aria-label="Hiring at ' + esc(company.name) + '? Start a hiring brief with Demigod">Hiring here? Start a brief</button></div>'
        : '') +
      '</li>';
  }

  // Fills the (initially hidden) section. Stays hidden when there is nothing to show — an empty
  // An "Open roles" box would imply we looked and found no hiring, which is not what an
  // absent or stale feed means.
  function renderRecentRoles(host, feed, view) {
    var rows = dgRecentRoles({ roles: dgFilterRoles(feed && feed.roles, view || {}) }, 8);
    // Must clear, not just return: the section may already be showing rows from a wider view.
    if (!rows.length) { host.hidden = true; host.innerHTML = ''; return; }
    var days = (typeof feed.windowDays === 'number' && feed.windowDays > 0) ? feed.windowDays : null;
    var activity = dgActivitySummary(feed, view);
    host.innerHTML =
      '<h2 class="dg-fresh-h">Open roles</h2>' +
      (activity ? '<p class="dg-dir-pulse"><strong>Board observations:</strong> ' + esc(activity) + '</p>' : '') +
      /* Short honesty, not a lecture: notice-date ≠ post date; geo scope ≠ company counts. */
      '<p class="dg-fresh-note">Public employer boards' +
      (days ? ' · last ' + days + ' day' + (days === 1 ? '' : 's') + ' we tracked' : '') +
      '. <strong>First observed</strong> is our notice date, not the board post date. ' +
      // Counts above filter US-posted/Remote; this list does not (many feed rows are non-US).
      'Locations are wherever the company posted, including outside the US — open-role counts above are US-posted or Remote only. Not matching inventory.</p>' +
      '<ul class="dg-fresh-list">' +
      rows.map(function (role) {
        var url = safeUrl(role.url);
        // The link is the tap target, so it gets its own full-width block at 44px. Inline with the
        // company name it measured 22px tall on a 390px viewport — under WCAG 2.5.8's 24px floor and
        // half this directory's own 44px control convention. Company moves to the meta line.
        var title = url
          ? '<a class="dg-fresh-title" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(role.title) + '</a>'
          : '<span class="dg-fresh-title">' + esc(role.title) + '</span>';
        var meta = ['<span class="dg-fresh-co">' + esc(role.company) + '</span>'];
        if (role.employerDepartment) meta.push(esc(String(role.employerDepartment).slice(0, 80)));
        if (role.employerOffice) meta.push(esc(String(role.employerOffice).slice(0, 80)));
        else if (role.location) meta.push(esc(role.location));
        meta.push('first observed ' + esc(String(role.firstObservedAt).slice(0, 10)));
        // Only shown when the ATS actually gave us one, and labelled as THEIR date, not ours.
        if (role.postedAt) meta.push('board posted ' + esc(String(role.postedAt).slice(0, 10)));
        if (role.workplaceType) meta.push(esc(String(role.workplaceType).slice(0, 40)));
        if (role.employmentType) meta.push(esc(String(role.employmentType).slice(0, 40)));
        if (role.boardUpdatedAt) meta.push('board updated ' + esc(String(role.boardUpdatedAt).slice(0, 10)));
        return '<li class="dg-fresh-row">' + title +
          '<span class="dg-fresh-meta">' + meta.join(' · ') + '</span></li>';
      }).join('') +
      '</ul>';
    host.hidden = false;
  }

  var dgFeedCache = null;
  function mountRecentRoles(root, view) {
    var host = root && root.querySelector('.dg-dir-fresh');
    if (!host || !feedUrl) return;
    // Fetched once per page. renderRows calls this on every keystroke; refetching there would be a
    // request per character even with force-cache.
    if (dgFeedCache) { renderRecentRoles(host, dgFeedCache, view); return; }
    // force-cache, matching the map fetch below and for the same reason: feedUrl is derived from
    // this script's own src, so it is pinned to a CDN commit and immutable. no-store forced a fresh
    // round trip on every directory visit for bytes that cannot change at that URL. A new feed
    // ships under a new commit, which is a new URL, so staleness is not reachable.
    fetch(feedUrl, { cache: 'force-cache', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (feed) { if (feed && host.isConnected) { dgFeedCache = feed; renderRecentRoles(host, feed, view); } })
      .catch(function () { /* optional asset — the directory must never degrade because a feed 404s */ });
  }

  function render(root, map) {
    var companies = map.companies.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    state.searchText = companies.map(function (c) { return [c.name, c.description].concat(c.tags || []).join(' ').toLowerCase(); });
    state.hiringOf = companies.map(function (c) { return ((c.openRoles && c.atsSource) || c.hiring === 'yes') ? 'yes' : c.source === 'Community submission' ? c.hiring : 'unknown'; });
    state.funcOf = companies.map(function (c) { return c.roleMix ? Object.keys(c.roleMix) : []; });
    state.sizeOf = companies.map(function (c) { return dgTeamSizeBucket(c.teamSize); });
    state.providerOf = companies.map(function (c) { return String(c.atsSource || '').toLowerCase(); });
    var providers = Array.from(new Set(companies.map(function (c) { return String(c.atsSource || '').trim(); }).filter(Boolean))).sort();
    // Restore a shared/bookmarked view. Done before the controls are built so their initial values
    // ARE the restored state — seeding afterwards would render defaults and then silently disagree
    // with the rows. Only applied on first render; later renders keep whatever the user has set.
    if (!state.hashApplied) {
      state.hashApplied = true;
      var fromHash = dgParseFilterHash(typeof location !== 'undefined' ? location.hash : '', providers);
      state.query = fromHash.query; state.hiring = fromHash.hiring; state.func = fromHash.func; state.size = fromHash.size;
      state.metro = fromHash.metro; state.provider = fromHash.provider; state.sort = fromHash.sort;
    }
    var sources = (map.sources || []).map(function (item) {
      var url = safeUrl(item.url);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.name) + '</a>' : esc(item.name);
    }).join(' · ');
    var hiringNow = companies.filter(function (c) { return c.openRoles && c.atsSource; }).length;
    var hiringYc = companies.filter(function (c) { return c.jobsSource === 'YC'; }).length;
    var trackedOpen = companies.filter(function (c) { return typeof c.oldestObservedDays === 'number' && c.oldestObservedDays > 0; }).length;
    var postedAging = companies.filter(function (c) { return typeof c.agingRoles === 'number' && c.agingRoles > 0; }).length;
    var roleMixSummary = dgRoleMixSummary(map.coverage && map.coverage.roleMix);
    var pulseBits = [];
    if (hiringNow) pulseBits.push(hiringNow + ' companies with observed US-posted or remote roles');
    if (trackedOpen) pulseBits.push(trackedOpen + ' with observed open-age (our first seen)');
    if (postedAging) pulseBits.push(postedAging + ' with a role posted 90–365d (board date)');
    if (hiringYc) pulseBits.push(hiringYc + ' YC directory careers links');
    root.innerHTML =
      /* Was ~110 words restating the eyebrow chip directly above it ("SAN FRANCISCO · OPEN DATA ·
         CITY-LEVEL · CURRENT STATUS NOT VERIFIED", authored in Webflow). That chip already carries
         source and city-level scope, so the paragraph only has to carry what it doesn't: where the
         counts come from, that they are point-in-time, and that open-age is an observation rather
         than a verdict. Every honesty claim survives; the restatement does not. */
      '<p class="dg-dir-intro">City-level only — a listed location (SF Bay companies on this map; observed open roles also surface Los Angeles and NYC when the ATS says so), not a verified office. Open-role counts come from each company\'s own public job board, point-in-time — an observation, not a hiring verdict. Listed companies are not engaged Demigod clients; use <strong>Hiring here? Start a brief</strong> to work with us.</p>' +
      /* Coverage stats and role buckets moved BELOW the list. On a 390px screen they pushed the
         first company past ~1,700px, so the entire mobile fold was chrome, a disclaimer and
         aggregates — zero product. They are orientation for someone already browsing, not for
         someone deciding whether to browse, and nothing in them is an honesty claim: they are
         counts, equally accurate wherever they sit. Every honesty claim (city-level, not a
         verified office, point-in-time, not a verdict) stays above the fold in dg-dir-intro. */
      '<div class="dg-dir-tools"><input class="dg-dir-search" type="search" aria-label="Search companies" placeholder="Search companies…" autocomplete="off" value="' + esc(state.query) + '">' +
      '<select class="dg-dir-hiring" aria-label="Filter by hiring status"><option value="">All</option>' +
      '<option value="yes"' + (state.hiring === 'yes' ? ' selected' : '') + '>Hiring / open roles</option>' +
      '<option value="unknown"' + (state.hiring === 'unknown' ? ' selected' : '') + '>Hiring unknown</option></select>' +
      '<select class="dg-dir-func" aria-label="Filter by role function"><option value="">Any role</option>' +
      DG_FUNCS.map(function (f) {
        return '<option value="' + f + '"' + (state.func === f ? ' selected' : '') + '>' + dgFunctionLabel(f) + '</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-metro" aria-label="Filter observed roles by metro"><option value="">Roles: any metro</option>' +
      DG_METROS.map(function (m) {
        return '<option value="' + m + '"' + (state.metro === m ? ' selected' : '') + '>' + dgMetroLabel(m) + ' roles</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-size" aria-label="Filter by team size"><option value="">Any team size</option>' +
      DG_SIZES.map(function (size) {
        var label = size === 'unknown' ? 'Unknown team size' : size === '201+' ? '201+' : size + ' people';
        return '<option value="' + size + '"' + (state.size === size ? ' selected' : '') + '>' + label + '</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-provider" aria-label="Filter by ATS provider"><option value="">Any job board</option>' +
      providers.map(function (provider) {
        var value = provider.toLowerCase();
        return '<option value="' + esc(value) + '"' + (state.provider === value ? ' selected' : '') + '>' + esc(provider) + '</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-sort" aria-label="Sort companies">' +
        '<option value="roles"' + (state.sort === 'roles' ? ' selected' : '') + '>Open roles · startups first</option>' +
        '<option value="fresh"' + (state.sort === 'fresh' ? ' selected' : '') + '>Freshest postings</option>' +
        '<option value="stale"' + (state.sort === 'stale' ? ' selected' : '') + '>Longest-posted</option>' +
        '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Name A–Z</option>' +
      '</select></div>' +
      '<p class="dg-dir-count" role="status" aria-live="polite" tabindex="-1">' + companies.length + ' companies · loading job coverage…</p>' +
      '<ul class="dg-dir-list"></ul>' +
      '<button type="button" class="dg-dir-more" hidden>Load more companies</button>' +
      '<section class="dg-dir-fresh" role="status" aria-live="polite" hidden></section>' +
      (pulseBits.length
        ? '<p class="dg-dir-pulse" role="status">' + pulseBits.map(esc).join(' · ') +
          (map.coverage && map.coverage.roleAgingAt ? ' · aging as of ' + esc(map.coverage.roleAgingAt) : '') +
          '</p>'
        : '') +
      (roleMixSummary
        ? '<p class="dg-dir-pulse"><strong>Largest role buckets:</strong> ' + esc(roleMixSummary) + '. Not a ranking.</p>'
        : '') +
      '<p class="dg-dir-foot"><strong>Definition:</strong> ' + esc(map.coverage.definition || 'Companies with a public SF headquarters listing.') +
      '<br><strong>Important:</strong> ' + esc(map.coverage.caveat || 'City-level only; current status is not verified.') +
      (sources ? '<br>Sources: ' + sources + '.' : '') +
      ' Related: <a href="https://www.ycombinator.com/companies?regions=San%20Francisco%20Bay%20Area" target="_blank" rel="noopener noreferrer">browse YC companies</a>.</p>';

    var searchEl = root.querySelector('.dg-dir-search');
    var hiringEl = root.querySelector('.dg-dir-hiring');
    var funcEl = root.querySelector('.dg-dir-func');
    var metroEl = root.querySelector('.dg-dir-metro');
    var sizeEl = root.querySelector('.dg-dir-size');
    var providerEl = root.querySelector('.dg-dir-provider');
    var sortEl = root.querySelector('.dg-dir-sort');
    var list = root.querySelector('.dg-dir-list');
    var more = root.querySelector('.dg-dir-more');
    var count = root.querySelector('.dg-dir-count');
    // Paint in 20-row batches instead of the whole list — keeps the DOM light while still letting
    // visitors browse every match. Search covers ALL companies.
    var CAP = 20;
    var shown = CAP;
    function renderRows(loadMore) {
      if (loadMore !== true) shown = CAP;
      var q = searchEl.value.trim().toLowerCase();
      var h = hiringEl.value;
      var fn = funcEl.value;
      var metro = metroEl ? metroEl.value : '';
      var size = sizeEl.value;
      var provider = providerEl.value;
      state.query = searchEl.value.trim();
      state.hiring = h;
      state.func = fn;
      state.metro = metro;
      state.size = size;
      state.provider = provider;
      state.sort = sortEl ? sortEl.value : 'roles';
      // replaceState, not pushState: this fires on every keystroke in the search box, and one
      // history entry per character would make the back button useless.
      try {
        var want = location.pathname + location.search + dgFilterHash(state);
        if (want !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', want);
      } catch (e) { /* history unavailable (file://, sandbox) must not break filtering */ }
      var matches = [];
      for (var i = 0; i < companies.length; i++) {
        if ((!q || state.searchText[i].indexOf(q) >= 0) && (!h || state.hiringOf[i] === h) && (!fn || state.funcOf[i].indexOf(fn) >= 0) && (!size || state.sizeOf[i] === size) && (!provider || state.providerOf[i] === provider)) matches.push(i);
      }
      // Ordering. Default keeps the old behaviour: hiring / open-role companies first when
      // browsing without a query, so an existing bookmark sees what it saw before.
      // Posting-age orders deliberately push companies with NO measured median to the END of both
      // directions. Treating "unknown" as 0 would rank an unmeasured board as the freshest on the
      // page, which is a fabricated claim — we only know a median where the employer published a
      // date we trust. Unknown is last whether you asked for freshest or longest-posted.
      if (state.sort === 'name') {
        matches.sort(function (a, b) { return String(companies[a].name).localeCompare(String(companies[b].name)); });
      } else if (state.sort === 'fresh' || state.sort === 'stale') {
        var order = dgOrderByMedian(state.sort);
        matches.sort(function (a, b) {
          return order(companies[a].medianPostedDays, companies[b].medianPostedDays, companies[a].name, companies[b].name);
        });
      } else {
        matches.sort(function (a, b) {
          var band = dgStartupBand(companies[b].teamSize) - dgStartupBand(companies[a].teamSize);
          if (band) return band;
          return (companies[b].openRoles || (state.hiringOf[b] === 'yes' ? 1 : 0)) - (companies[a].openRoles || (state.hiringOf[a] === 'yes' ? 1 : 0));
        });
      }
      var slice = matches.slice(0, shown);
      // Keep the roles panel in the same view as the rows. null = no filter active, so do not
      // narrow; building a 2,735-name Set on every keystroke of an unfiltered page is pure waste.
      var narrowed = (q || h || fn || size || provider) ? new Set(matches.map(function (i) { return String(companies[i].name || '').toLowerCase(); })) : null;
      // Metro filters roles only (ATS location), not the company map rows — map is still SF-HQ scope.
      mountRecentRoles(root, { func: fn, metro: metro, companies: narrowed });
      list.innerHTML = slice.length
        ? slice.map(function (i) { return companyRow(companies[i], i); }).join('')
        : '<li class="dg-dir-empty">' + ((h || fn || size || provider) ? 'No companies match those filters.' : 'No companies match that search.') + '</li>';
      more.hidden = matches.length <= shown;
      count.textContent = matches.length
        ? matches.length + ' of ' + companies.length + ' compan' + (matches.length === 1 ? 'y' : 'ies') +
          (fn ? ' hiring in ' + dgFunctionLabel(fn) : '') +
          (metro ? ' · roles in ' + dgMetroLabel(metro) : '') +
          (size ? ' · team size ' + (size === 'unknown' ? 'unknown' : size) : '') +
          (provider ? ' on ' + provider : '') +
          (matches.length > shown ? ' — showing ' + shown : '') +
          (!q && !h && !fn && !size && !provider && !metro ? ' · ' + (hiringNow + hiringYc) + ' with job links: ' + hiringNow + ' with observed US-posted or remote roles, ' + hiringYc + ' more hiring per YC' : '')
        : ((h || fn || size || provider) ? 'No companies match those filters.' : 'No companies match that search.');
    }
    searchEl.addEventListener('input', renderRows);
    hiringEl.addEventListener('change', renderRows);
    funcEl.addEventListener('change', renderRows);
    if (metroEl) metroEl.addEventListener('change', renderRows);
    sizeEl.addEventListener('change', renderRows);
    providerEl.addEventListener('change', renderRows);
    if (sortEl) sortEl.addEventListener('change', renderRows);
    more.addEventListener('click', function () {
      shown += CAP;
      renderRows(true);
      if (more.hidden) count.focus();
    });
    list.addEventListener('click', function (event) {
      /* Brief button: hand off to the existing wizard, prefilled.
         Live /startups has no #startup-modal; generic [data-demigod-modal=startup] triggers
         navigate to /?wiz=startup and would drop data-company. Only claim in-page open when
         the modal exists; otherwise seed foot's session draft and deep-link. */
      var brief = event.target.closest && event.target.closest('button.dg-dir-brief[data-company]');
      if (brief) {
        var co = brief.getAttribute('data-company') || '';
        var modal = document.querySelector('#startup-modal');
        if (modal) {
          try {
            var trigger = document.querySelector('[data-demigod-modal="startup"],a[href="#startup-modal"]');
            if (trigger) trigger.click();
            else {
              try { modal.setAttribute('aria-hidden', 'false'); modal.style.display = 'flex'; } catch (e0) {}
            }
          } catch (e) { /* open is best-effort */ }
          // Keep non-empty campaign/referral attribution; fill blanks only.
          // Webflow often ships empty utm_* hiddens — create-only would no-op and leave source/campaign blank.
          // Prefill after the wizard mounts; company-name may be created by foot-core on open.
          setTimeout(function () {
            try {
              var form = document.querySelector('#startup-hire');
              if (form) {
                [['utm_source', 'directory'], ['utm_campaign', 'company-brief']].forEach(function (pair) {
                  var hid = form.querySelector('input[name="' + pair[0] + '"]');
                  if (hid) {
                    if (!String(hid.value || '').trim()) hid.value = pair[1];
                    return;
                  }
                  hid = document.createElement('input');
                  hid.type = 'hidden'; hid.name = pair[0]; hid.value = pair[1];
                  form.appendChild(hid);
                });
              }
              var input = document.querySelector('#startup-hire [name="company-name"]');
              if (input && !String(input.value || '').trim() && co) {
                input.value = co;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            } catch (e2) { /* prefill/attribution is a convenience, never a requirement */ }
          }, 350);
        } else {
          // Preserve company across navigation via foot-core's same-session draft key.
          try {
            if (co && typeof sessionStorage !== 'undefined') {
              var key = 'dgWizSave_startup';
              var draft = null;
              try { draft = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e3) { draft = null; }
              if (!draft || typeof draft !== 'object') draft = { answers: {}, step: 0 };
              if (!draft.answers || typeof draft.answers !== 'object') draft.answers = {};
              if (!String(draft.answers['company-name'] || '').trim()) {
                draft.answers['company-name'] = co;
                if (typeof draft.step !== 'number') draft.step = 0;
                sessionStorage.setItem(key, JSON.stringify(draft));
              }
            }
          } catch (e4) { /* draft seed is optional */ }
          var next = new URL('/?wiz=startup', location.origin);
          var current = new URLSearchParams(location.search);
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referral'].forEach(function (name) {
            var value = current.get(name);
            if (value) next.searchParams.set(name, value);
          });
          if (!next.searchParams.has('utm_source')) next.searchParams.set('utm_source', 'directory');
          if (!next.searchParams.has('utm_campaign')) next.searchParams.set('utm_campaign', 'company-brief');
          location.href = next.pathname + next.search;
        }
        return;
      }
      var chip = event.target.closest && event.target.closest('button.dg-dir-rolechip[data-fn]');
      var picked = chip && chip.getAttribute('data-fn');
      if (!picked || DG_FUNCS.indexOf(picked) < 0) return;
      funcEl.value = picked;
      renderRows();
      funcEl.focus();
    });
    renderRows();
  }

  function mount(root) {
    if (!root) return;
    css();
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<p class="dg-dir-intro">Loading the tech company directory…</p>';
    fetch(dataUrl, { cache: 'force-cache', credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('Map data HTTP ' + r.status); return r.json(); })
      .then(function (map) {
        if (!valid(map)) throw new Error('Map data is invalid');
        state.root = root; state.baseMap = map;
        render(root, withCommunityStartups(map));
      })
      .catch(function () {
        root.innerHTML = '<div class="dg-dir-error" role="alert">The tech company directory could not load.<br><button type="button" class="dg-dir-retry">Try again</button></div>';
        root.querySelector('.dg-dir-retry').addEventListener('click', function () { mount(root); });
      })
      .finally(function () { root.removeAttribute('aria-busy'); });
  }

  window.DemigodStartupMap = { mount: mount, addCommunityStartups: addCommunityStartups };
})();
