import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const control = fs.readFileSync(new URL('./demigod-control.mjs', import.meta.url), 'utf8');
const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const eventPage = foot.slice(foot.indexOf("  events: {"), foot.indexOf("  notfound:", foot.indexOf("  events: {")));
const mapEventsHtml = foot.slice(foot.indexOf('function dgMapEventsHtml'), foot.indexOf('var DG_PAGES'));
const submissionMount = foot.slice(foot.indexOf('function communitySubmissionsMount'), foot.indexOf('function closePage'));

test('dashboard Events status supports an isolated store fixture', () => {
  assert.match(server, /const EVENTS_STORE = process\.env\.DEMIGOD_EVENTS_STORE \|\| path\.join\(ROOT, 'DEMIGOD-EVENTS\.json'\)/);
  assert.match(server, /const store = safeJson\(EVENTS_STORE\)/);
  assert.match(server, /eventSubmissions\.filter\(\(row\) => row\?\.status === 'submitted'\)\.length/);
  assert.match(server, /startupSubmissions\.filter\(\(row\) => row\?\.status === 'submitted'\)\.length/);
  assert.match(server, /const reviewRows = \(rows\) => rows\.filter\(\(row\) => row\?\.status === 'submitted'\)[\s\S]*\.concat\(rows\.filter\(\(row\) => row\?\.status !== 'submitted'\)\.slice\(-6\)\.reverse\(\)\)/);
  assert.doesNotMatch(server, /events: eventSubmissions\.slice\(-6\)/);
  assert.doesNotMatch(server, /submissions[\s\S]{0,1000}(submitterEmail|manageTokenHash)/);
  assert.match(server, /\/api\/events\/submission-review/);
  assert.match(ui, /data-submission-review="approve"/);
  assert.match(ui, /data-submission-review="reject"/);
  assert.match(server, /audience: row\.audience, details: row\.details/);
  assert.match(server, /website: row\.website, description: row\.description/);
  assert.match(ui, /aria-label="Approve '\+esc\(label\)/);
  assert.match(ui, /aria-label="Reject '\+esc\(label\)/);
  assert.match(ui, /\['submitted','rejected'\]\.includes\(row\.status\)/);
  assert.match(ui, /\['submitted','approved','verified'\]\.includes\(row\.status\)/);
});

test('native event invites suppress optional external URL work', () => {
  assert.match(ui, /d\.eventsBot\?\.inviteUrl\?'<a class="btn"/);
  assert.doesNotMatch(ui, /Add optional external URL|Check optional URL/);
});

test('public Events page is SF events with reviewed submissions (map is separate directory)', () => {
  // v803+: dgMapEventsHtml(kind) splits routes; v804 mounts atlas only on /?p=map.
  assert.match(eventPage, /html:\s*dgMapEventsHtml\('events'\)/);
  assert.match(foot, /map:\s*\{[\s\S]*?html:\s*dgMapEventsHtml\('startups'\)/);
  assert.match(mapEventsHtml, /function dgMapEventsHtml\(kind\)/);
  // v859 reworded this copy; the guard tracks the CLAIMS, not the old sentences.
  // SF framing, human review before listing, and "we don't act on your behalf" all still
  // have to be on the page — each assertion below fails if its claim disappears.
  assert.match(mapEventsHtml, /SF tech events/);
  assert.match(mapEventsHtml, /A human reviews every submission before it appears|human checks before it/);
  assert.match(mapEventsHtml, /never publishes, books a venue, or messages guests for you|Submitting does not publish|nothing is published, booked, or sent/);
  assert.doesNotMatch(mapEventsHtml, /dg-ev-cal-form|dg-ev-offers|dg-ev-extra/);
  assert.match(
    foot,
    /if \(id === 'map'\) \{\s*try \{ startupMapMount\(root\); \} catch \(eMap\) \{\}\s*\}/,
  );
  assert.match(
    foot,
    /if \(id === 'map' \|\| id === 'events'\) \{\s*try \{ communitySubmissionsMount\(root\); \} catch \(e\) \{\}\s*\}/,
  );
  // v808: directory stays off Events gold chrome (map ≠ events class)
  assert.match(foot, /if \(id === 'events'\) root\.classList\.add\('dg-page-events'\)/);
  assert.match(foot, /if \(id === 'map'\) root\.classList\.add\('dg-page-map'\)/);
  assert.doesNotMatch(
    foot,
    /if \(id === 'events' \|\| id === 'map'\) root\.classList\.add\('dg-page-events',\s*'dg-page-map'\)/,
  );
  // v810: map directory CTAs are Home only (not dual hire/talent strip)
  // v859 added `|| id === 'refer'` to the same rule. Pin the behaviour (events AND map
  // both get the plain back link), not the exact page list, so adding a page is not a RED.
  const backRule = foot.match(/if \(id === 'events'[^)]*\) return back/)?.[0] || '';
  assert.match(backRule, /id === 'map'/, 'map must share the plain back link with events');

  assert.doesNotMatch(
    foot,
    /function eventsBot(?:NativeHost|Calendar|Cycle|Offers|Extra|Chat)Mount\(/,
  );
});


test('pageCss data-v tracks foot version (no hardcode drift)', () => {
  assert.match(foot, /function pageCss\(\)/);
  assert.match(foot, /var ver = String\(window\.__dgFootVer \|\| window\.dgFootVersion/);
  assert.match(foot, /s\.setAttribute\('data-v', ver\)/);
  assert.doesNotMatch(foot, /getAttribute\('data-v'\) === '80[0-9]'/);
});

test('public submissions use explicit reviewed endpoints and browser-held management keys', () => {
  assert.match(submissionMount, /'\/event-submission'/);
  assert.match(submissionMount, /'\/startup-submission'/);
  assert.match(submissionMount, /'\/event-submission\/manage'/);
  assert.match(submissionMount, /'\/event-submission\/withdraw'/);
  assert.match(submissionMount, /'\/startup-submission\/manage'/);
  assert.match(submissionMount, /'\/startup-submission\/withdraw'/);
  assert.match(submissionMount, /pageKind === 'events' && startup/);
  assert.match(submissionMount, /pageKind === 'startups' && !startup/);
  assert.match(submissionMount, /history\.replaceState\(null, '', location\.pathname \+ location\.search\)/);
  assert.match(submissionMount, /This does not cancel an event on Luma or Partiful/);
  assert.match(submissionMount, /localStorage\.setItem\(storageKey/);
  assert.match(submissionMount, /post\('\/startup-submission'[\s\S]*?remember\(credential\)/);
  {
    const render = new Function(mapEventsHtml + '; return dgMapEventsHtml;')();
    const eventsHtml = render('events');
    const startupsHtml = render('startups');
    assert.match(eventsHtml, /<details hidden><summary>Manage my event submissions/);
    assert.match(startupsHtml, /<details hidden><summary>Manage my startup submissions/);
    assert.match(eventsHtml, /private management keys for event submissions/);
    assert.match(startupsHtml, /private management keys for startup submissions/);
    assert.doesNotMatch(eventsHtml + startupsHtml, /No (?:event|startup) submissions saved|Submit and manage/);
  }
  assert.doesNotMatch(foot, /Manage my submitted events/);
  assert.match(submissionMount, /No reachable event submissions are saved in this browser/);
  assert.match(submissionMount, /No reachable startup submissions are saved in this browser/);
  assert.match(
    submissionMount,
    /var pageKind = \(listingsBox && listingsBox\.getAttribute\('data-kind'\)\) \|\| 'both';[\s\S]*var rows = credentials\(\)\.filter[\s\S]*pageKind === 'events' && startup[\s\S]*pageKind === 'startups' && !startup[\s\S]*if \(!rows\.length\) return;\s*manage\.parentElement\.hidden = false;/,
  );
  assert.doesNotMatch(submissionMount, /return Promise\.resolve\(null\)/);
  assert.doesNotMatch(mapEventsHtml, /Imagine my event|Events Bot event planner|Surprise me/);
  // Form markup is JSON-string embedded (escaped quotes in source); assert runtime HTML.
  {
    const render = new Function(`${mapEventsHtml}; return dgMapEventsHtml;`)();
    const eventsHtml = render('events');
    const startupsHtml = render('startups');
    assert.match(eventsHtml, /name="externalUrl" type="url" inputmode="url"/);
    assert.match(eventsHtml, /must match that platform/);
    assert.match(eventsHtml, /id="dg-community-listings"/);
    assert.match(eventsHtml, /id="dg-event-submit"/);
    assert.doesNotMatch(eventsHtml, /id="dg-startup-submit"/);
    assert.match(startupsHtml, /id="dg-startup-submit"/);
    assert.doesNotMatch(startupsHtml, /id="dg-event-submit"/);
    assert.match(eventsHtml, /data-kind="events"/);
    assert.match(startupsHtml, /data-kind="startups"/);
  }
  assert.match(submissionMount, /get\('\/community-events'\)/);
  assert.match(submissionMount, /get\('\/community-startups'\)/);
  assert.match(submissionMount, /row\.neighborhood \|\| 'SF neighborhood not provided'/);
  assert.doesNotMatch(submissionMount, /row\.neighborhood \|\| 'San Francisco'/);
  assert.match(submissionMount, /eventForm\.setAttribute\('aria-busy', 'true'\)[\s\S]*eventForm\.setAttribute\('aria-busy', 'false'\)/);
  assert.match(submissionMount, /startupForm\.setAttribute\('aria-busy', 'true'\)[\s\S]*startupForm\.setAttribute\('aria-busy', 'false'\)/);
  assert.match(submissionMount, /if \(eventForm\.dataset\.busy === '1'\) return;[\s\S]*eventForm\.dataset\.busy = ''/);
  assert.match(submissionMount, /if \(startupForm\.dataset\.busy === '1'\) return;[\s\S]*startupForm\.dataset\.busy = ''/);
  assert.match(submissionMount, /function setBusy\(on\)[\s\S]*form\.setAttribute\('aria-busy', String\(on\)\)[\s\S]*form\.querySelectorAll\('button'\)[\s\S]*button\.disabled = on/);
  assert.match(submissionMount, /if \(form\.dataset\.busy === '1'\) return;[\s\S]*setBusy\(true\)/);
  assert.doesNotMatch(submissionMount, /form\.addEventListener\('submit'[\s\S]{0,150}form\.querySelector\('button'\)/);
});

test('community listings render each feed independently when the other fails', () => {
  assert.match(
    submissionMount,
    /var settled = await Promise\.allSettled\(\[\s*showEvents \? get\('\/community-events'\) : Promise\.resolve\(\{ events: \[\] \}\),\s*showStartups \? get\('\/community-startups'\) : Promise\.resolve\(\{ startups: \[\] \}\),\s*\]\)/,
  );
  assert.doesNotMatch(submissionMount, /var results = await Promise\.all\(\[get\('\/community-events'\), get\('\/community-startups'\)\]\)/);
  assert.match(submissionMount, /var eventsOk = showEvents && settled\[0\]\.status === 'fulfilled', startupsOk = showStartups && settled\[1\]\.status === 'fulfilled'/);
  assert.match(submissionMount, /showEvents \? \(eventsOk \? \(events\.length \? \(kind === 'both' \? '<h3>Reviewed events<\/h3>' : ''\)/);
  assert.match(submissionMount, /role="status">Reviewed events could not load right now/);
  assert.match(submissionMount, /showStartups \? \(startupsOk \? \(startups\.length \? \(kind === 'both' \? '<h3>Reviewed startup submissions<\/h3>' : ''\)/);
  assert.match(submissionMount, /role="status">Reviewed startup submissions could not load right now/);
  assert.match(submissionMount, /if \(startupsOk\) \{\s*window\.dgCommunityStartups = startups;\s*if \(window\.DemigodStartupMap && window\.DemigodStartupMap\.addCommunityStartups\)/);
});

test('blocked storage keeps a management key in memory and retains imported private links', () => {
  const source = submissionMount.slice(submissionMount.indexOf("var storageKey = 'dg-event-management-v1'"), submissionMount.indexOf('function managementLink'));
  const { remember, credentials } = Function('localStorage', `${source}; return { remember, credentials };`)({
    getItem() { return '[]'; },
    setItem() { throw new Error('storage blocked'); },
  });
  const credential = { id: 'event_1', manageToken: 'secret' };
  assert.equal(remember(credential), false);
  assert.deepEqual(credentials(), [credential]);
  assert.match(submissionMount, /if \(remember\(\{ id: imported\[0\], manageToken: imported\[1\] \}\)\) history\.replaceState/);
  assert.match(submissionMount, /var saved = remember\([\s\S]*?browser blocked saving its management key[\s\S]*?event id/);
});

test('event dates round-trip between local controls and timezone-aware API values', () => {
  assert.match(submissionMount, /if \(out\.startsAt\)[\s\S]*new Date\(out\.startsAt\)[\s\S]*out\.startsAt = date\.toISOString\(\)/);
  assert.match(submissionMount, /value="' \+ esc\(localDateTime\(ev\.startsAt\)\) \+ '"/);
  const source = submissionMount.match(/function localDateTime\(value\) \{[^\n]+\}/)?.[0];
  const localDateTime = Function(`${source}; return localDateTime;`)();
  const iso = '2026-07-26T01:30:00.000Z';
  assert.match(localDateTime(iso), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(new Date(localDateTime(iso)).getTime(), Date.parse(iso));
  assert.equal(localDateTime('not-a-date'), '');
});

test('reviewed dated events provide an honest RFC 5545 calendar download', () => {
  const helperSource = submissionMount.slice(submissionMount.indexOf('function publicLink'), submissionMount.indexOf('var eventCalendarRows'));
  const htmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const { eventIcs, icsFilename, eventTimeHtml } = Function('esc', `${helperSource}; return { eventIcs, icsFilename, eventTimeHtml };`)(htmlEscape);
  const row = { id: 'event_123', title: 'AI, Art; SF \\ night ✨', startsAt: '2026-07-26T01:30:00.000Z', venue: 'Mission, SF', details: 'Line 1\rLine 2', externalUrl: 'https://lu.ma/demo' };
  const ics = eventIcs(row, '2026-07-23T00:00:00.000Z');
  assert.match(ics, /BEGIN:VCALENDAR\r\n[\s\S]*UID:event_123@trydemigod\.com\r\n[\s\S]*DTSTAMP:20260723T000000Z\r\n[\s\S]*DTSTART:20260726T013000Z\r\n/);
  assert.match(ics, /SUMMARY:AI\\, Art\\; SF \\\\ night ✨/);
  assert.match(ics, /DESCRIPTION:Line 1\\nLine 2\\nhttps:\/\/lu\.ma\/demo/);
  assert.doesNotMatch(ics, /DTEND:/);
  ics.split('\r\n').forEach((line) => assert.ok(new TextEncoder().encode(line).length <= 75, `ICS line exceeds 75 octets: ${line}`));
  assert.equal(eventIcs({ startsAt: 'invalid' }, '2026-07-23T00:00:00Z'), '');
  assert.equal(icsFilename(row), 'ai-art-sf-night-2026-07-26.ics');
  assert.match(eventTimeHtml(row.startsAt), /^<time datetime="2026-07-26T01:30:00\.000Z">.+<\/time>$/);
  assert.equal(eventTimeHtml('invalid'), 'invalid');
  assert.match(submissionMount, /eventTimeHtml\(row\.startsAt\)/);
  assert.match(submissionMount, /new Blob\(\[ics\], \{ type: 'text\/calendar;charset=utf-8' \}\)/);
  assert.match(submissionMount, /URL\.revokeObjectURL\(href\)/);
  assert.match(submissionMount, /data-event-ics=/);
});

test('saving a manage edit re-renders so a resubmitted withdrawn event drops its stale status/warning', () => {
  assert.match(
    submissionMount,
    /var result = await post\(isStartup \? '\/startup-submission\/manage' : '\/event-submission\/manage', \{ id: loaded\[index\]\.credential\.id, manageToken: loaded\[index\]\.credential\.manageToken, patch: values\(form\) \}\);\s*await renderManage\(\);/,
  );
  assert.match(submissionMount, /manage\.querySelector\('\.dg-manage-card\[data-id="' \+ \(result\.event \|\| result\.startup\)\.id \+ '"\]'\)/);
  assert.match(submissionMount, /message\(refreshed, result\.message, true\); refreshed\.querySelector\('\[type=submit\]'\)\.focus\(\)/);
  assert.match(submissionMount, /await renderListings\(\)/);
  assert.doesNotMatch(submissionMount, /patch: values\(form\) \}\); message\(form, result\.message, true\); \}/);
});

test('reviewed community feeds fail independently without clearing the last good startup map', () => {
  // v805: page-scoped listings only fetch the feeds for data-kind (events | startups | both).
  assert.match(
    submissionMount,
    /Promise\.allSettled\(\[\s*showEvents \? get\('\/community-events'\) : Promise\.resolve\(\{ events: \[\] \}\),\s*showStartups \? get\('\/community-startups'\) : Promise\.resolve\(\{ startups: \[\] \}\),\s*\]\)/,
  );
  assert.match(submissionMount, /eventsOk = showEvents && settled\[0\]\.status === 'fulfilled', startupsOk = showStartups && settled\[1\]\.status === 'fulfilled'/);
  assert.match(submissionMount, /if \(startupsOk\) \{\s*window\.dgCommunityStartups = startups;/);
  assert.match(submissionMount, /role="status">Reviewed events could not load right now/);
  assert.match(submissionMount, /role="status">Reviewed startup submissions could not load right now/);
  assert.doesNotMatch(submissionMount, /Promise\.all\(\[get\('\/community-events'\), get\('\/community-startups'\)\]\)/);
});

test('published platform invite wins over older matching drafts', () => {
  assert.match(server, /matchingDrafts\.find\(\(row\) => row\.status === 'published_url' && realInviteUrl\(row\.inviteUrl \|\| row\.publishedUrl\)\)/);
  assert.match(server, /inviteDraft\.inviteUrl \|\| inviteDraft\.publishedUrl/);
});

test('event invite links reuse the canonical HTTPS platform validator', () => {
  assert.match(server, /isRealInviteUrl/);
  assert.match(server, /\['demigod', 'luma', 'partiful'\]\.some\(\(platform\) => isRealInviteUrl\(value, platform\)\)/);
  assert.match(server, /\]\.find\(realInviteUrl\) \|\| null/);
  assert.match(server, /inviteUrlRecorded: inviteShareable && Boolean\(inviteUrl\)/);
});

test('guest invite actions stay hidden before the RSVP stage', () => {
  assert.match(server, /inviteShareable = \['rsvp', 'run', 'followup', 'debrief'\]\.includes\(active\.stage\)/);
  assert.match(server, /inviteUrl: inviteShareable \?/);
  assert.match(server, /inviteUrlRecorded: inviteShareable && Boolean\(/);
  assert.match(server, /invitePlatformUrlRecorded: inviteShareable && Boolean\(/);
  assert.match(ui, /d\.eventsBot\?\.inviteUrl\?'<a class="btn"/);
});

test('an unrelated sole platform draft is not assigned to the active event', () => {
  assert.doesNotMatch(server, /platformRows\.length === 1/);
});

test('an untitled active event does not match every platform draft', () => {
  assert.match(server, /: title && normalizeTitle\(row\.title\) === title/);
});

test('legacy invite title fallback requires the whole normalized title', () => {
  assert.doesNotMatch(server, /startsWith\(title\)/);
  assert.match(server, /trim\(\)\.replace\(\/\\s\+\/g, ' '\)\.toLowerCase\(\)/);
  assert.match(server, /normalizeTitle\(row\.title\) === title/);
});

test('event operator card includes persisted API health truth', () => {
  const online = fs.readFileSync(new URL('./demigod-events-online.mjs', import.meta.url), 'utf8');
  assert.match(online, /certified: !hostUnobservable && publicOk && websiteConfig\.reachable === true && hygiene\.ok && nativeRsvpRoutes === true/);
  assert.match(server, /events-online', 'status\.json'/);
  assert.match(ui, /eventsOnline\.certified\?'certified'/);
  assert.doesNotMatch(server, /'events-online-heal':/);
  assert.doesNotMatch(ui, /data-run-job="events-online-heal"/);
});

test('stale API health receipts cannot remain certified', () => {
  assert.match(server, /onlineAgeMs <= 10 \* 60_000/);
  assert.match(server, /certified: onlineFresh && online\.certified === true/);
  assert.match(server, /needHeal: onlineFresh && online\.needHeal === true/);
  assert.match(server, /observation: onlineFresh \? online\.observation \|\| null : 'stale receipt'/);
  assert.match(server, /'events-online-status': \{ cmd: 'node', args: \['demigod-events-online\.mjs', 'certify'\][^}]+safe: true/);
  assert.match(ui, /!d\.eventsBot\?\.online\?\.certified\?'<button[^']+data-run-job="events-online-status"/);
  assert.doesNotMatch(ui, /data-run-job="events-online-heal"/);
});

test('API health controls remain available between active events', () => {
  assert.match(server, /if \(!active\?\.id\) return \{ active: false, online: onlineSummary, inviteDrain: inviteDrainSummary, submissions \}/);
  assert.match(ui, /Event &amp; startup submissions/);
  assert.match(ui, /Public forms feed reviewed drafts here\. Nothing auto-publishes\./);
  assert.match(ui, /Pending review · /);
  assert.match(ui, /!d\.eventsBot\?\.online\?\.certified\?'<button[^']+data-run-job="events-online-status"/);
  assert.doesNotMatch(ui, /Imagine &amp; plan my event/);
});

test('fresh uncertified API health remains refreshable', () => {
  assert.match(ui, /!d\.eventsBot\?\.online\?\.certified\?'<button[^']+data-run-job="events-online-status"/);
  assert.doesNotMatch(ui, /!d\.eventsBot\.online\|\|d\.eventsBot\.online\.stale\?'<button[^']+data-run-job="events-online-status"/);
});

test('dashboard API certification is read-only and fail-closed', () => {
  const online = fs.readFileSync(new URL('./demigod-events-online.mjs', import.meta.url), 'utf8');
  assert.match(online, /if \(requireCertified\) return out\.certified \? 0 : 2/);
  assert.match(online, /cmd === 'status' \|\| cmd === 'certify'/);
  assert.match(server, /'events-online-status': \{ cmd: 'node', args: \['demigod-events-online\.mjs', 'certify'\][^}]+safe: true/);
  assert.match(ui, /eventsOnline\?\.observation==='host_unobservable'\?'Retry Events API check':'Certify Events API'/);
  assert.match(ui, /data-run-job="events-online-status">'\+eventsApiAction\+'<\/button>/);
  assert.doesNotMatch(ui, /data-run-job="events-online-status">Refresh Events API status/);
});

test('dashboard exposes the heal ladder without running it automatically', () => {
  assert.match(ui, /eventsBot\?\.online\?\.needHeal\?'<button[^']+data-copy-cli="node demigod-events-online\.mjs heal">Copy API heal command/);
  assert.doesNotMatch(ui, /data-run-job="events-online-heal"/);
});

test('dashboard preserves and explains Events API certification blockers', () => {
  assert.match(server, /public: onlineFresh \? online\.public \?\? null : null/);
  assert.match(server, /nativeRsvpRoutes: onlineFresh \? online\.nativeRsvpRoutes \?\? null : null/);
  assert.match(server, /storeHygieneOk: onlineFresh \? online\.storeHygiene\?\.ok \?\? null : null/);
  assert.match(ui, /eventsOnline\.public===false\?'public route down'/);
  assert.match(ui, /eventsOnline\.nativeRsvpRoutes===false\?'RSVP routes missing'/);
  assert.match(ui, /eventsOnline\.storeHygieneOk===false\?'store hygiene failed'/);
  assert.match(ui, /eventsOnline\.public===false\?'public route down':eventsOnline\.nativeRsvpRoutes===false\?'RSVP routes missing':eventsOnline\.storeHygieneOk===false\?'store hygiene failed'.*eventsOnline\.observation==='host_unobservable'/);
});

test('control plane preserves unknown Events reachability', () => {
  assert.match(control, /eventsOnline\?\.public === false \? 'down' : 'unknown'/);
  assert.match(control, /public: eventsOnline\?\.public \?\? null/);
});

test('dashboard exposes healthy API publication drift without publishing', () => {
  assert.match(server, /events-online', 'last-up\.json'/);
  assert.match(server, /publishedApiBase === online\.apiBase/);
  // prepare-only pending matches local is named; bare "stale" remains for non-prepare drift
  assert.match(ui, /eventsOnline\?\.configPublished===false/);
  assert.match(ui, /pendingMatchesLocal===true/);
  assert.match(ui, /healthy, website config prepare-only \(pending matches local\)/);
  assert.match(ui, /healthy, website config stale/);
  assert.match(
    ui,
    /eventsOnline\.public===false\?'public route down'.*eventsConfigStaleLabel\?eventsConfigStaleLabel/,
  );
  assert.doesNotMatch(ui, /data-run-job="events-[^"]*publish/);
});

test('dashboard does not call the Events API certified when website config is unverified', () => {
  assert.match(ui, /eventsOnline\.configPublished===null\?'website config unverified':eventsOnline\.certified\?'certified'/);
});

test('event operator card refreshes invite drain only when stale', () => {
  assert.match(server, /events-bot', 'invite-drain-latest\.json'/);
  assert.match(server, /needsUrl: Number\.isFinite\(inviteDrain\?\.needsUrl\)/);
  assert.match(server, /inviteDrainAgeMs > 10 \* 60_000/);
  assert.match(ui, /inviteUrlRecorded&&d\.eventsBot\?\.inviteDrain\?\.stale\?'<button[^']+data-run-job="events-invite-drain">Refresh invite drain/);
});

test('event operator card exposes the confirmed-venue evidence gate', () => {
  assert.match(server, /const venueConfirmed = active\.venue\?\.confirmed === true/);
  assert.match(server, /matchedVenueOfferId: active\.matchedOffers\?\.venueId \|\| null/);
  assert.match(ui, /d\.eventsBot\?\.venueSelected\?'<div class="meta">Venue '/);
  assert.match(ui, /d\.eventsBot\.venueConfirmed\?'confirmed':'selected, confirmation needed'/);
});

test('event operator card names the canonical store-certificate failure', () => {
  assert.match(server, /storeHygieneHitCount: onlineFresh && Number\.isFinite\(online\.storeHygiene\?\.hitCount\)/);
  assert.match(server, /storeHygieneFirstHit: onlineFresh \? online\.storeHygiene\?\.hits\?\.\[0\]\?\.kind \|\| null/);
  assert.match(ui, /store hygiene failed'.*storeHygieneHitCount.*storeHygieneFirstHit/);
});

test('event operator card flags stages reached without venue evidence', () => {
  assert.match(server, /const lifecycleEvidenceMismatch = \['plan', 'rsvp', 'run', 'followup', 'debrief'\]\.includes\(active\.stage\) && !venueConfirmed/);
  assert.match(ui, /const eventsLifecycleBlocked=d\.eventsBot\?\.lifecycleEvidenceMismatch\|\|d\.eventsBot\?\.venueTooSmall/);
  assert.match(ui, /eventsLifecycleBlocked\?'Planning paused · '\+esc\(eventsLifecycleBlockReason\):'Continue planning'/);
});

test('event operator card warns when the selected venue is below target capacity', () => {
  assert.match(server, /const venueTooSmall = Number\.isFinite\(active\.seats\).*active\.seats > venueCapacity/);
  assert.match(server, /venueTooSmall,/);
  assert.match(server, /venueCapacity: Number\.isFinite\(venueCapacity\) && venueCapacity > 0 \? venueCapacity : null/);
  assert.match(ui, /eventsLifecycleBlocked\?' disabled title=/);
  assert.match(ui, /Venue capacity is below the event seat target/);
});

test('event operator card uses canonical event resource gaps, not planning checklist progress', () => {
  assert.match(server, /resourceGaps/);
  assert.match(server, /const gaps = resourceGaps\(store\)/);
  assert.match(server, /done: 3 - gaps\.missing\.length/);
  assert.match(server, /total: 3/);
  assert.doesNotMatch(server, /resourceChecklist/);
  assert.match(ui, /const eventsMissing=d\.eventsBot\?\.resources\?\.missing\|\|\[\]/);
  assert.match(ui, /eventsMissing\.join\('; '\)/);
  assert.match(server, /kind === 'venue_capacity' \? 'Select a venue that fits the seat target'/);
});

test('event status retains resource-planning size and date windows without crowding the card', () => {
  assert.match(server, /seats: Number\.isFinite\(active\.seats\) \? active\.seats : null/);
  assert.match(server, /dateWindows: Array\.isArray\(active\.dateWindows\) \? active\.dateWindows\.filter\(Boolean\) : \[\]/);
  assert.doesNotMatch(ui, /formatEventWindow/);
});

test('event operator card exposes the future-datetime RSVP gate first', () => {
  assert.match(server, /hasFutureDateTime/);
  assert.match(server, /futureDateTimeReady: hasFutureDateTime\(active\)/);
  assert.match(ui, /const eventsLifecycleBlocked=.*stage==='plan'.*!d\.eventsBot\?\.futureDateTimeReady/);
  assert.match(ui, /Replace date alternatives with one real timezone-aware future SF datetime via record_schedule/);
});

test('event operator card exposes the missing audience invariant first', () => {
  assert.match(server, /audienceReady: eventAudienceBrief\(active\)\.ok/);
  assert.match(ui, /const eventsLifecycleBlocked=.*stage==='resource'.*!d\.eventsBot\?\.audienceReady/);
  assert.match(ui, /Record real audience and outcome wording with record_idea/);
});

test('event operator card blocks the RSVP tick until a real invite URL exists', () => {
  assert.match(ui, /eventsBot\?\.stage==='rsvp'&&!d\.eventsBot\?\.inviteUrlRecorded/);
  assert.match(ui, /eventsBot\?\.stage==='rsvp'\?'A real guest invite URL is required'/);
  assert.match(ui, /eventsLifecycleBlocked\?'Planning paused · '\+esc\(eventsLifecycleBlockReason\):'Continue planning'/);
});

test('event operator card exposes resource offer inventory and open drafts', () => {
  assert.match(server, /const resourceOffers = matchOffersToEvent\(store\)\.offerCounts/);
  assert.match(server, /row\?\.eventId === active\.id && \['queued', 'drafted'\]\.includes\(row\.status\)/);
  assert.match(ui, /queued drafts '\+esc\(d\.eventsBot\.resources\.queuedDrafts\|\|0\)/);
});

test('event operator card distinguishes external partner-ready resource drafts', () => {
  assert.match(server, /isRealOutreachEmail/);
  assert.match(server, /outreachDraftReadiness/);
  assert.match(server, /const partnerReadyDrafts = resourceDrafts\.filter\(\(row\) =>\s*isRealOutreachEmail\(row\.toEmail\) && !\/@trydemigod\\\.com\$\/i\.test\(row\.toEmail\) && outreachDraftReadiness\(row\) >= 3/);
  assert.match(server, /partnerReady: Object\.fromEntries\(\['venue', 'sponsor', 'volunteer'\]/);
  assert.match(server, /const internalOpsDrafts = resourceDrafts\.filter\(\(row\) => \/@trydemigod/);
  assert.match(server, /internalOpsDrafts: internalOpsDrafts\.length/);
  assert.match(server, /topFreeVenue: gaps\.topFreeVenue/);
  assert.match(server, /contactBlockedDrafts: contactBlockedDrafts\.length/);
  assert.match(server, /const contentBlockedDrafts = resourceDrafts\.filter/);
  assert.match(server, /outreachDraftReadiness\(row\) < 3/);
  assert.match(server, /contentBlocked: Object\.fromEntries\(\['venue', 'sponsor', 'volunteer'\]/);
  assert.match(server, /contentBlockedDrafts\.filter\(\(row\) => String\(row\.kind \|\| ''\)\.includes\(kind\)\)\.length/);
  assert.match(server, /'events-outbox-status': \{ cmd: 'bin\/dg-events-outbox', args: \['status'\][^}]+safe: true/);
  assert.match(ui, /data-run-job="events-outbox-status">Check resource drafts/);
  assert.doesNotMatch(ui, /external-ready venue|internal ops .*invalid contact|content-blocked venue/);
});

test('event operator card has one direct private planning action', () => {
  assert.match(ui, /data-event-primary="1"/);
  assert.match(ui, /btn\.onclick=\(\)=>runJob\('events-tick',\{mutate:true,btn\}\)/);
  assert.doesNotMatch(ui, /data-run-job="events-tick"/);
  assert.doesNotMatch(ui, /Seed next SF night|Run lifecycle tick|No active SF night/);
  assert.match(ui, /Private planning only\. Nothing is sent, published, booked, or charged\./);
});

test('the canonical RSVP list wins over legacy outcome counts, including when empty', () => {
  assert.match(server, /const confirmedCount = Array\.isArray\(store\.rsvps\)\s*\? confirmedRsvps\.length/);
});

test('event status retains RSVP over-capacity truth', () => {
  assert.match(server, /overCapacity: Number\.isFinite\(active\.seats\).*Math\.max\(0, confirmedCount - active\.seats\)/s);
});

test('events outbox identifies the active event before reporting counts', () => {
  const outbox = fs.readFileSync(new URL('./bin/dg-events-outbox', import.meta.url), 'utf8');
  assert.match(outbox, /console\.log\("active event", s\.activeEvent\?\.id \|\| "none", "·", s\.activeEvent\?\.title \|\| "none"\)/);
  assert.match(outbox, /if \(!s\.activeEvent\) process\.exit\(0\)/);
  assert.match(outbox, /const confirmed = Array\.isArray\(s\.rsvps\) \? s\.rsvps\.filter\(r=>r\.eventId===s\.activeEvent\?\.id && r\.status==="yes"\)\.length : Number\(s\.activeEvent\?\.outcomes\?\.confirmed\) \|\| 0/);
  assert.match(outbox, /confirmed>s\.activeEvent\.seats \? `\$\{confirmed-s\.activeEvent\.seats\} over capacity` : `\$\{s\.activeEvent\.seats-confirmed\} seats left`/);
  assert.match(outbox, /k==="venue_alt"\?"confirm a venue alternative with evidence":k==="venue_capacity"\?"select a venue that fits the seat target":k==="venue_confirmation"\?"confirm the selected venue with evidence":`confirm \$\{k\} with evidence`/);
  assert.match(outbox, /resources = list\.filter\(o=>\/venue\|sponsor\|volunteer\/\.test\(o\.kind\|\|""\)\)/);
  assert.match(outbox, /"internal ops", internal\.length/);
  assert.match(outbox, /\? "internal ops"/);
});
