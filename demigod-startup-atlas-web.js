(function () {
  'use strict';
  // Minimal, text-first SF startup directory ("think Craigslist"): a dense, searchable
  // list of real companies. No SVG map, no radius search, no venue layer — the startup
  // page is startups only; event venues live on the separate events page.
  // Preserves the public API (mount/addCommunityStartups), schema/3 validation, the
  // community-submission merge, and every honesty label from the prior atlas.
  var source = document.currentScript && document.currentScript.src;
  var dataUrl = source ? new URL('sf-startup-map.json', source).href : '';
  // Sibling asset, same commit as this script — no manifest lookup, so it cannot drift from the
  // build that shipped it. OPTIONAL: roles-feed.json is published only when it verifies live, so a
  // 404 here is a normal state and must never degrade the directory.
  var feedUrl = source ? new URL('roles-feed.json', source).href : '';
  // Pure ordering rule, hoisted so it can be exercised directly by a test rather than asserted
  // as a source pattern. A company with NO measured median posting age sorts LAST in both
  // directions: treating unknown as 0 would rank an unmeasured board as the freshest on the page,
  // which is a claim we cannot make — we only know a median where the employer published a date
  // we trust. Ties and unknown-vs-unknown fall back to name so the order stays stable.
  // PURE, hoisted so a test can exercise it directly rather than asserting on a source pattern.
  // The feed carries TWO dates that mean different things and must never be conflated:
  // firstObservedAt is OURS (when we first saw the role on the board) and is on every row;
  // postedAt is the EMPLOYER'S and is null unless the ATS exposed a real post date. We order by our
  // own observation because it is the only field present everywhere — ordering by postedAt would
  // silently rank the Greenhouse-attributed roles above every other board rather than showing the
  // newest, and would look like an editorial judgement we never made.
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

  var state = {
    baseMap: null, root: null, query: '', hiring: '', func: '', provider: '', sort: 'roles',
    communityStartups: Array.isArray(window.dgCommunityStartups) ? window.dgCommunityStartups : [],
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function safeUrl(value) {
    try { var url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) ? url.href : ''; }
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
      '.dg-dir-search,.dg-dir-hiring,.dg-dir-func,.dg-dir-provider,.dg-dir-sort{min-height:44px;border:1px solid rgba(166,255,203,.3);border-radius:9px;background:#07150f;color:#f3f0e7;padding:.55rem .7rem;font:inherit}' +
      '.dg-dir-search{flex:1 1 18rem;width:min(100%,28rem)}' +
      '.dg-dir-search:focus-visible,.dg-dir-hiring:focus-visible,.dg-dir-func:focus-visible,.dg-dir-provider:focus-visible,.dg-dir-sort:focus-visible,.dg-dir-row a:focus-visible,.dg-dir-toggle:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-dir-roles{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0 0}' +
      '.dg-dir-rolechip{color:#9fb8a8;font-size:.68rem;border:1px solid rgba(166,255,203,.18);border-radius:999px;padding:.02rem .45rem;white-space:nowrap}' +
      '.dg-dir-count{color:#a8a29e;font-size:.8rem;margin:.2rem 0 .8rem}' +
      '.dg-dir-list{list-style:none;margin:0;padding:0;border-top:1px solid rgba(166,255,203,.12)}' +
      '.dg-dir-row{border-bottom:1px solid rgba(166,255,203,.1);padding:.5rem .1rem}' +
      '.dg-dir-row[hidden]{display:none}' +
      '.dg-dir-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .6rem}' +
      '.dg-dir-name{color:#a6ffcb;font-weight:700;text-decoration:none;overflow-wrap:anywhere}' +
      '.dg-dir-name:hover{text-decoration:underline}' +
      '.dg-dir-name.is-plain{color:#e7e5e4}' +
      '.dg-dir-meta{color:#a8a29e;font-size:.78rem}' +
      '.dg-dir-flag{color:#c6c3bb;font-size:.72rem;border:1px solid rgba(166,255,203,.22);border-radius:999px;padding:.02rem .4rem}' +
      '.dg-dir-flag.is-hiring{color:#a6ffcb;border-color:rgba(166,255,203,.5)}' +
      '.dg-dir-pulse{margin:.35rem 0 .55rem;color:#9fb8a8;font-size:.78rem;line-height:1.35}' +
      '.dg-dir-desc{color:#c9c6bf;font-size:.82rem;line-height:1.5;margin:.25rem 0 0}' +
      '.dg-dir-links{margin:.25rem 0 0;font-size:.76rem}' +
      '.dg-dir-links a{color:#a6ffcb;text-decoration:none;margin-right:.8rem}.dg-dir-links a:hover{text-decoration:underline}' +
      '.dg-dir-empty{color:#a8a29e;padding:.9rem 0}' +
      '.dg-dir-fresh{margin:1.4rem 0 0;padding-top:1rem;border-top:1px solid rgba(166,255,203,.12)}' +
      '.dg-dir-fresh[hidden]{display:none}' +
      '.dg-fresh-h{font-size:.95rem;margin:0 0 .3rem;color:#f3f0e7}' +
      '.dg-fresh-note{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:0 0 .6rem}' +
      '.dg-fresh-list{list-style:none;margin:0;padding:0}' +
      '.dg-fresh-row{padding:.5rem 0;border-bottom:1px solid rgba(166,255,203,.08)}' +
      '.dg-fresh-title{display:flex;align-items:center;min-height:44px;color:#a6ffcb;text-decoration:none}' +
      '.dg-fresh-title:hover{text-decoration:underline}' +
      '.dg-fresh-row a{color:#a6ffcb}' +
      '.dg-fresh-row a:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-fresh-co{color:#f3f0e7}' +
      '.dg-fresh-meta{display:block;color:#a8a29e;font-size:.76rem;margin-top:.15rem}' +
      '.dg-dir-foot{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:1.1rem 0 0}' +
      '.dg-dir-foot a{color:#a6ffcb}' +
      '.dg-dir-error{padding:1rem;border:1px solid #9f4a4a;border-radius:12px;color:#f6caca}' +
      '.dg-dir-retry{min-height:44px;margin-top:.7rem;border:1px solid #a6ffcb;border-radius:8px;background:transparent;color:#a6ffcb;padding:.45rem .8rem;cursor:pointer}';
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
    var hiring = openRoles ? rolesLabel
      : company.hiring === 'yes'
        ? (community ? 'Hiring reported' : hn ? 'Hiring (per HN post)' : 'Hiring (per YC)')
        : community
          ? (company.hiring === 'no' ? 'Not hiring reported' : 'Hiring unknown')
          : 'Hiring not verified';
    var flagClass = (openRoles || company.hiring === 'yes') ? ' is-hiring' : '';
    // Provenance label follows sourceLicense/source — YC-public/HN-public are not CC0 evidence.
    var kind = company.sourceLicense === 'YC-public' || company.source === 'Y Combinator'
      ? 'YC · public directory'
      : hn
        ? 'Hacker News · Who is Hiring'
        : community
          ? 'Reviewed submission'
          : company.sourceLicense === 'CC0-1.0'
            ? 'Wikidata · CC0'
            : (company.source || 'Public record');
    var bits = [kind];
    if (company.inceptionYear) bits.push('founded ' + esc(company.inceptionYear));
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
    if (sourceUrl) links.push('<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + (community ? 'submission' : hn ? 'HN post' : 'CC0 source') + '</a>');
    if (!website) links.push('<span class="dg-dir-meta">no verified website on record</span>');
    var roleMixHtml = '';
    if (company.roleMix) {
      var mix = Object.keys(company.roleMix).map(function (k) { return { k: k, n: company.roleMix[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
      roleMixHtml = '<p class="dg-dir-roles">' + mix.map(function (m) { return '<span class="dg-dir-rolechip">' + esc(m.k) + ' ' + m.n + '</span>'; }).join('') + '</p>';
    }
    return '<li class="dg-dir-row" data-i="' + index + '">' +
      '<div class="dg-dir-line">' + nameHtml +
      '<span class="dg-dir-flag' + flagClass + '">' + hiring + '</span>' +
      '<span class="dg-dir-meta">' + bits.join(' · ') + '</span></div>' +
      (company.description ? '<p class="dg-dir-desc">' + esc(company.description) + '</p>' : '') +
      roleMixHtml +
      (links.length ? '<div class="dg-dir-links">' + links.join('') + '</div>' : '') +
      '</li>';
  }

  // Fills the (initially hidden) section. Stays hidden when there is nothing to show — an empty
  // "Recently observed roles" box would imply we looked and found no hiring, which is not what an
  // absent or stale feed means.
  function renderRecentRoles(host, feed) {
    var rows = dgRecentRoles(feed, 8);
    if (!rows.length) return;
    var days = (typeof feed.windowDays === 'number' && feed.windowDays > 0) ? feed.windowDays : null;
    host.innerHTML =
      '<h2 class="dg-fresh-h">Recently observed roles</h2>' +
      '<p class="dg-fresh-note">Roles we first saw on a company\'s own public job board' +
      (days ? ' in the last ' + days + ' days' : '') +
      '. <strong>First observed</strong> is our timestamp, not the employer\'s posting date — most ' +
      'boards do not expose one, so this says when we noticed a role, never how long it has existed.</p>' +
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
        if (role.location) meta.push(esc(role.location));
        meta.push('first observed ' + esc(String(role.firstObservedAt).slice(0, 10)));
        // Only shown when the ATS actually gave us one, and labelled as THEIR date, not ours.
        if (role.postedAt) meta.push('board posted ' + esc(String(role.postedAt).slice(0, 10)));
        return '<li class="dg-fresh-row">' + title +
          '<span class="dg-fresh-meta">' + meta.join(' · ') + '</span></li>';
      }).join('') +
      '</ul>';
    host.hidden = false;
  }

  function mountRecentRoles(root) {
    var host = root && root.querySelector('.dg-dir-fresh');
    if (!host || !feedUrl) return;
    fetch(feedUrl, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (feed) { if (feed && host.isConnected) renderRecentRoles(host, feed); })
      .catch(function () { /* optional asset — the directory must never degrade because a feed 404s */ });
  }

  function render(root, map) {
    var companies = map.companies.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    state.searchText = companies.map(function (c) { return [c.name, c.description].concat(c.tags || []).join(' ').toLowerCase(); });
    state.hiringOf = companies.map(function (c) { return ((c.openRoles && c.atsSource) || c.hiring === 'yes') ? 'yes' : c.source === 'Community submission' ? c.hiring : 'unknown'; });
    state.funcOf = companies.map(function (c) { return c.roleMix ? Object.keys(c.roleMix) : []; });
    state.providerOf = companies.map(function (c) { return String(c.atsSource || '').toLowerCase(); });
    var providers = Array.from(new Set(companies.map(function (c) { return String(c.atsSource || '').trim(); }).filter(Boolean))).sort();
    var sources = (map.sources || []).map(function (item) {
      var url = safeUrl(item.url);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.name) + '</a>' : esc(item.name);
    }).join(' · ');
    var hiringNow = companies.filter(function (c) { return c.openRoles && c.atsSource; }).length;
    var hiringYc = companies.filter(function (c) { return c.jobsSource === 'YC'; }).length;
    var trackedOpen = companies.filter(function (c) { return typeof c.oldestObservedDays === 'number' && c.oldestObservedDays > 0; }).length;
    var postedAging = companies.filter(function (c) { return typeof c.agingRoles === 'number' && c.agingRoles > 0; }).length;
    var pulseBits = [];
    if (hiringNow) pulseBits.push(hiringNow + ' boards with verified US open roles');
    if (trackedOpen) pulseBits.push(trackedOpen + ' with observed open-age (our first seen)');
    if (postedAging) pulseBits.push(postedAging + ' with a role posted 90–365d (board date)');
    if (hiringYc) pulseBits.push(hiringYc + ' YC self-reported careers links');
    root.innerHTML =
      '<p class="dg-dir-intro">A plain directory of San Francisco startups from public open data, plus operator-reviewed community submissions. City-level only — these are companies with a listed SF headquarters, not verified offices or current status. Open-role counts come from each company\'s own public job board (Greenhouse/Lever/Ashby), count only US-posted or Remote listings when the board exposes location, and are point-in-time. Where we track a board over time, we also show how long a role has been open <em>by our first observation</em> (not a score, not a ghost-job verdict). Board posting dates appear only when the ATS exposes a real post date.</p>' +
      (pulseBits.length
        ? '<p class="dg-dir-pulse" role="status">' + pulseBits.map(esc).join(' · ') +
          (map.coverage && map.coverage.roleAgingAt ? ' · aging as of ' + esc(map.coverage.roleAgingAt) : '') +
          '</p>'
        : '') +
      '<div class="dg-dir-tools"><input class="dg-dir-search" type="search" aria-label="Search startups" placeholder="Search startups…" autocomplete="off" value="' + esc(state.query) + '">' +
      '<select class="dg-dir-hiring" aria-label="Filter by hiring status"><option value="">All</option>' +
      '<option value="yes"' + (state.hiring === 'yes' ? ' selected' : '') + '>Hiring / open roles</option>' +
      '<option value="unknown"' + (state.hiring === 'unknown' ? ' selected' : '') + '>Hiring unknown</option>' +
      '<option value="no"' + (state.hiring === 'no' ? ' selected' : '') + '>Not hiring reported</option></select>' +
      '<select class="dg-dir-func" aria-label="Filter by role function"><option value="">Any role</option>' +
      ['engineering', 'ai/data', 'design', 'product', 'sales', 'marketing', 'operations'].map(function (f) {
        return '<option value="' + f + '"' + (state.func === f ? ' selected' : '') + '>' + f.charAt(0).toUpperCase() + f.slice(1) + '</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-provider" aria-label="Filter by ATS provider"><option value="">Any job board</option>' +
      providers.map(function (provider) {
        var value = provider.toLowerCase();
        return '<option value="' + esc(value) + '"' + (state.provider === value ? ' selected' : '') + '>' + esc(provider) + '</option>';
      }).join('') + '</select>' +
      '<select class="dg-dir-sort" aria-label="Sort companies">' +
        '<option value="roles"' + (state.sort === 'roles' ? ' selected' : '') + '>Most open roles</option>' +
        '<option value="fresh"' + (state.sort === 'fresh' ? ' selected' : '') + '>Freshest postings</option>' +
        '<option value="stale"' + (state.sort === 'stale' ? ' selected' : '') + '>Longest-posted</option>' +
        '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Name A–Z</option>' +
      '</select></div>' +
      '<p class="dg-dir-count" role="status" aria-live="polite">' + companies.length + ' companies · loading job coverage…</p>' +
      '<ul class="dg-dir-list"></ul>' +
      '<section class="dg-dir-fresh" hidden></section>' +
      '<p class="dg-dir-foot"><strong>Definition:</strong> ' + esc(map.coverage.definition || 'Companies with a public SF headquarters listing.') +
      '<br><strong>Important:</strong> ' + esc(map.coverage.caveat || 'City-level only; current status is not verified.') +
      (sources ? '<br>Sources: ' + sources + '.' : '') +
      ' Related: <a href="https://www.ycombinator.com/companies?regions=San%20Francisco%20Bay%20Area" target="_blank" rel="noopener noreferrer">browse YC companies</a>.</p>';

    var searchEl = root.querySelector('.dg-dir-search');
    var hiringEl = root.querySelector('.dg-dir-hiring');
    var funcEl = root.querySelector('.dg-dir-func');
    var providerEl = root.querySelector('.dg-dir-provider');
    var sortEl = root.querySelector('.dg-dir-sort');
    var list = root.querySelector('.dg-dir-list');
    var count = root.querySelector('.dg-dir-count');
    // Search-driven render: with ~2k companies, only paint matching rows (capped) instead of the
    // whole list — keeps the DOM light and the page fast. Search covers ALL companies.
    var CAP = 20;
    function renderRows() {
      var q = searchEl.value.trim().toLowerCase();
      var h = hiringEl.value;
      var fn = funcEl.value;
      var provider = providerEl.value;
      state.query = searchEl.value.trim();
      state.hiring = h;
      state.func = fn;
      state.provider = provider;
      state.sort = sortEl ? sortEl.value : 'roles';
      var matches = [];
      for (var i = 0; i < companies.length; i++) {
        if ((!q || state.searchText[i].indexOf(q) >= 0) && (!h || state.hiringOf[i] === h) && (!fn || state.funcOf[i].indexOf(fn) >= 0) && (!provider || state.providerOf[i] === provider)) matches.push(i);
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
      } else if (!q) {
        matches.sort(function (a, b) { return (companies[b].openRoles || (state.hiringOf[b] === 'yes' ? 1 : 0)) - (companies[a].openRoles || (state.hiringOf[a] === 'yes' ? 1 : 0)); });
      }
      var slice = matches.slice(0, CAP);
      list.innerHTML = slice.length
        ? slice.map(function (i) { return companyRow(companies[i], i); }).join('')
        : '<li class="dg-dir-empty">' + ((h || fn || provider) ? 'No companies match those filters.' : 'No companies match that search.') + '</li>';
      count.textContent = matches.length
        ? matches.length + ' of ' + companies.length + ' compan' + (matches.length === 1 ? 'y' : 'ies') +
          (fn ? ' hiring in ' + fn : '') +
          (provider ? ' on ' + provider : '') +
          (matches.length > CAP ? ' — showing first ' + CAP + ', narrow your search' : '') +
          (!q && !h && !fn && !provider ? ' · ' + (hiringNow + hiringYc) + ' with job links: ' + hiringNow + ' with live US-posted open roles, ' + hiringYc + ' more hiring per YC' : '')
        : ((h || fn || provider) ? 'No companies match those filters.' : 'No companies match that search.');
    }
    searchEl.addEventListener('input', renderRows);
    hiringEl.addEventListener('change', renderRows);
    funcEl.addEventListener('change', renderRows);
    providerEl.addEventListener('change', renderRows);
    if (sortEl) sortEl.addEventListener('change', renderRows);
    renderRows();
    mountRecentRoles(root);
  }

  function mount(root) {
    if (!root) return;
    css();
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<p class="dg-dir-intro">Loading the SF startup directory…</p>';
    fetch(dataUrl, { cache: 'force-cache', credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('Map data HTTP ' + r.status); return r.json(); })
      .then(function (map) {
        if (!valid(map)) throw new Error('Map data is invalid');
        state.root = root; state.baseMap = map;
        render(root, withCommunityStartups(map));
      })
      .catch(function () {
        root.innerHTML = '<div class="dg-dir-error" role="alert">The startup directory could not load.<br><button type="button" class="dg-dir-retry">Try again</button></div>';
        root.querySelector('.dg-dir-retry').addEventListener('click', function () { mount(root); });
      })
      .finally(function () { root.removeAttribute('aria-busy'); });
  }

  window.DemigodStartupMap = { mount: mount, addCommunityStartups: addCommunityStartups };
})();
