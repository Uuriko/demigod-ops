/**
 * OAuth-linked Simp Board v1 — landing + client + worker surface gates.
 * Pure scoring lives in dasha-simp-score.test.mjs.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = new URL('./', import.meta.url);
const landing = await readFile(new URL('./dasha-landing.html', root), 'utf8');
const client = await readFile(new URL('./dasha-simp-board-client.js', root), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const score = await readFile(new URL('./dasha-simp-score.mjs', root), 'utf8');
const actions = await readFile(new URL('./dasha-simp-actions.mjs', root), 'utf8');
const quizSmoke = await readFile(new URL('./dasha-quiz-smoke.mjs', root), 'utf8');
const shareCard = await readFile(new URL('./dasha-worker-assets/simp/card/quiz.png', root));
const quizPhoto = await readFile(new URL('./dasha-worker-assets/simp/photo/weekend.jpg', root));

assert(landing.includes('id="simp"'), 'landing missing #simp');
assert(landing.includes('id="dasha-simp-board"'), 'landing missing board mount');
assert(!client.includes('No forms. Points appear'), 'duplicate board explanation returned');
assert(!/Public evidence URL|Claim points|simp-claim-form/.test(client), 'manual evidence form returned');
assert(
  landing.includes('lobby.getdasha.com/client/simp-board.js'),
  'landing must load simp client from permanent host',
);
assert(client.includes('Link X to join'), 'client missing link state');
assert(client.includes('Join board'), 'client missing join state');
assert(client.includes('Leave board'), 'client missing leave state');
assert(client.includes('/oauth/x/start'), 'client must reuse OAuth start');
// Optional first-visit Connect X on homepage (not mandatory).
assert(client.includes('openHomeGate();'), 'first-visit optional X gate missing');
assert(client.includes('dasha_x_gate_v1') && client.includes('Not now'), 'gate dismiss + storage missing');
assert(client.includes('Optional') && client.includes('Connect X?'), 'gate must stay optional, not required');
assert(client.includes('simp-gate-open') && client.includes('buy-sticky'), 'gate must hide mobile buy sticky while open');
assert(client.includes('Take quiz ↓') || client.includes('Take quiz'), 'gate must offer path to quiz');
assert(client.includes('How big of a Dasha simp are you?') && client.includes('Take quiz'), 'simp quiz UI must remain in client');
// Optional gate must not trap scroll (quiz lives below the fold on Home).
assert(!/simp-gate-open body\{overflow:hidden\}/.test(client.replace(/\s+/g, '')), 'optional gate must not lock body scroll');
assert(client.indexOf("root.appendChild(quiz)") < client.indexOf("root.appendChild(list)"), 'quiz must render before leaderboard');
assert(!/oauth\/x\/callback[\s\S]{0,1500}joinBoard/.test(worker), 'OAuth callback must not auto-enroll (client joins)');
assert(client.includes('/simp/board') && client.includes('/simp/join') && client.includes('/simp/leave'), 'client missing API paths');
assert(client.includes('How big of a Dasha simp are you?') && client.includes('/simp/quiz'), 'client missing X-linked simp quiz');
assert(client.includes('Finishing joins the Board') && client.includes('Retake'), 'quiz enrollment/retake terms missing');
assert(client.includes('x.com/intent/post?text='), 'quiz result X fallback missing');
assert(client.includes('sendQuizCard') && client.includes('shareQuiz'), 'share helpers missing');
assert(client.includes('QUIZ_CARDS') && client.includes('quizCardBlob') && client.includes('1200') && client.includes('675'), 'quiz result-card suite missing');
assert(client.includes('Another photo') && client.includes('Dasha simp quiz result card preview'), 'result card preview controls missing');
assert(client.includes('Share on X') && client.includes('shareBoardOnX') && client.includes('boardShareText'), 'board row must share on X');
assert(client.includes('showJoinSuccess') && client.includes('Make a meme') && client.includes('Open lobby'), 'post-join success CTAs missing');
assert(client.includes('dasha-x-chip') && client.includes('paintLinkedChip'), 'nav linked-identity chip missing');
assert(!client.includes('Save score card') && !client.includes("a.download = 'dasha-simp-"), 'score download path must be gone');
assert(client.includes("setAttribute('aria-hidden'") || client.includes('aria-hidden'), 'quiz media should be aria-hidden');
assert(client.includes('paintLinkedChip') && client.includes('dasha-x-chip'), 'linked identity chip helpers missing');
assert(score.includes('QUIZ_LANES') && client.includes('result.lane'), 'lane-specific result identity missing');
assert(!client.includes('Replay for fun') && !client.includes('leaderboard score unchanged'), 'unscored for-fun replay must be gone');
assert(client.includes('Retake quiz') && (client.includes('latest score') || client.includes('Retake updates score') || client.includes('vibe')), 'scored retake UX missing');
assert(client.includes('simp-surprise') && score.includes('vibeDeltaForAttempt'), 'quiz surprises + vibe scoring missing');
assert(score.includes('QUIZ_VIBE_RANGE') && score.includes('vibeNote'), 'vibe range helpers missing');
assert(worker.includes('retake') && worker.includes('quizResultForAttempt'), 'Worker must allow scored retakes');
assert(!worker.includes("error: 'quiz already scored'"), 'one-shot quiz lock must be gone from worker');
assert(client.includes('trackQuiz') && worker.includes('simpQuizMetrics'), 'aggregate quiz funnel metrics missing');
assert(quizSmoke.includes("args.has('--live-write')") && !quizSmoke.includes("const live = !args.has('--disk-only')"), 'quiz smoke must not mutate live counters by default');
assert(!worker.includes('simpQuizMetrics[xId]'), 'quiz metrics must not be keyed by X identity');
assert(worker.includes("input?.event !== 'share'") && worker.includes('countQuizResult'), 'decision-grade quiz metrics must come from server transitions, not client event claims');
assert(!/trackQuiz\('(start|retake|reach|answer|complete|result)'/.test(client), 'client must not submit authoritative quiz funnel events');
assert(
  (client.includes('link X only to reveal') || client.includes('link X to save score')) &&
    worker.includes("input?.action === 'finalize'"),
  'OAuth must happen at result reveal',
);
assert(client.includes('650') && client.includes('1100') && !client.includes("'Pause'"), 'feedback should advance briskly without an extra pause control');
assert(client.includes('quizAnswerBusy'), 'double-tap answer guard missing');
assert(client.includes('retakeQuiz') && client.includes("role','progressbar"), 'retake helper + quiet progress bar missing');
assert(!client.includes('QUICK ·') && !client.includes('10Q') && !client.includes('20Q'), 'player chrome must not advertise quiz length or Quick/Deep');
assert(worker.includes("path.startsWith('/simp/r/')") && worker.includes('twitter:card') && client.includes('Beat this'), 'permanent challenge results missing');
assert(worker.includes('twitter:title') && worker.includes('twitter:description') && worker.includes('twitter:image') && worker.includes('twitter:image:alt'), 'result card X metadata incomplete');
for (const tag of ['og:type', 'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) assert(worker.includes(tag), `result card missing ${tag}`);
assert(worker.includes("request.method === 'GET' || request.method === 'HEAD'"), 'result card must support crawler HEAD requests');
assert.equal(shareCard.subarray(1, 4).toString(), 'PNG');
assert.equal(shareCard.readUInt32BE(16), 1200);
assert.equal(shareCard.readUInt32BE(20), 628);
assert(shareCard.length <= 2_000_000, 'result card exceeds internal X image-card budget');
assert(worker.includes("path.startsWith('/simp/result/')") && client.includes('challengeId'), 'challenge entry flow missing');
assert(client.includes('/simp/photo/') && worker.includes("url.pathname.startsWith('/simp/photo/')"), 'local quiz media missing');
assert(worker.includes("url.pathname.startsWith('/simp/card/')") && worker.includes("max-age=86400"), 'share-card asset route/cache missing');
assert(worker.includes("headers.set('Access-Control-Allow-Origin', '*')") && worker.includes("headers.set('Cross-Origin-Resource-Policy', 'cross-origin')"), 'quiz media must remain canvas-safe across product subdomains');
for (const metric of ['reached', 'answers', 'lanes', 'tiers', 'elapsed']) assert(worker.includes(metric), `missing aggregate metric ${metric}`);
assert(client.includes('navigator.canShare') && client.includes("new File([blob]"), 'native image sharing missing');
assert(client.includes('Open Studio') && !client.includes('Make one') && client.includes('studioSeedForResult') && client.includes("src: 'quiz'"), 'quiz result must clearly bridge into a tailored, attributed Studio seed');
for (const tier of ['Dasha scholar', 'Confirmed simp', 'Deep in the lore', 'Watching respectfully', 'Dasha curious']) assert(client.includes(tier), `missing Studio seed for ${tier}`);
// Mobile result completion: sticky Share/Make + hide buy sticky so CTAs stay tappable
assert(client.includes('simp-result-open') && client.includes('dasha-quiz-result-bar'), 'quiz result sticky bar missing');
assert(client.includes('showResultSticky') && client.includes('hideResultSticky'), 'result sticky helpers missing');
assert(
  /html\.simp-result-open\s+\.buy-sticky|html\.simp-quiz-open\s+\.buy-sticky,html\.simp-result-open\s+\.buy-sticky/.test(
    client.replace(/\s+/g, ' '),
  ),
  'result phase must hide homepage buy sticky',
);
for (const id of ['2085544531739754651', '2085405075686801789', '2085524407225884699', '2008730208350990657', '1011745071983296512']) assert(client.includes(id), `missing sourced result quote ${id}`);
assert(worker.includes("path === '/simp/quiz'") && worker.includes('submitQuiz'), 'worker missing quiz scoring endpoint');
assert(score.includes('QUIZ_MAX_POINTS') && score.includes('retake'), 'quiz score + retake path missing');
assert(!score.includes("error: 'quiz already scored'"), 'score module must allow retakes');
assert(client.includes("role','progressbar") && client.includes("event.key") && client.includes('renderQuestion'), 'quiz missing one-question wizard controls');
assert(client.includes('renderFeedback') && client.includes('Source ↗') && client.includes('closest(\'a\')'), 'quiz feedback must advance on tap without swallowing source links');
assert(client.includes('simp-quiz-active') && client.includes('simp-quiz-open'), 'focused quiz mode missing');
assert(client.includes('is-selected') && client.includes('color:var(--paper'), 'quiz selection or readable contrast missing');
assert(client.includes("event.key === 'Escape'") && client.includes('quizBtn.focus()'), 'focused quiz must close accessibly and restore focus');
assert(client.includes('question.tabIndex = -1') && client.includes('question.focus({ preventScroll: true })'), 'each question must retain focus so desktop number keys work');
assert(client.includes('max-height:min(300px,32svh)'), 'quiz photos must fit short mobile viewports');
assert(client.includes('align-content:start'), 'active quiz must top-align on short mobile screens');
assert(client.includes("scrollIntoView({ behavior: 'smooth', block: 'start' })"), 'quiz start must scroll into view');
assert(client.includes('is-correct') && client.includes('is-wrong'), 'correct and incorrect feedback states missing');
assert(
  landing.includes('Take the quiz') && landing.includes('ranked by lore') && !landing.includes('10Q') && !landing.includes('20Q'),
  'landing board intro must name one quiz without Quick/Deep lengths',
);
assert(landing.includes('simp-breakdown') && client.includes("el('details', 'simp-breakdown')"), 'compact native score breakdown missing');
assert(client.includes("el('details', 'simp-tools')") && client.includes("el('summary', '', 'More')"), 'secondary board tools must stay under More');
assert.equal((client.match(/Post result on X/g) || []).length, 1, 'result screen regained a second X share action');
assert(!client.includes('Copy invite link'), 'result screen regained a duplicate invite action');
assert(client.includes("setStatus('', 'ok')"), 'successful board load should not leave persistent status chrome');
assert(!client.includes('Open — link X and join'), 'empty ranking placeholder duplicates the join action');
assert(client.includes('quiz=1') && client.includes('wantsQuizInvite') && client.includes('runQuizInvite'), 'shareable quiz deep link missing');
assert.match(client, /q\.get\('challenge'\)[\s\S]{0,120}\^\[A-Za-z0-9_\-\]\{6,20\}\$[\s\S]{0,80}return true/, 'permanent score challenges must enter the same quiz flow');
assert(client.includes("QUIZ_INVITE_URL = 'https://www.getdasha.com/simp'"), 'canonical quiz invite URL missing');
assert(client.includes('Connect X + take the quiz') || client.includes('Simp quiz invite'), 'quiz invite connect prompt missing');
assert(!client.includes("var inviteCopyBtn") && !client.includes("var inviteShareBtn"), 'quiz start must not expose redundant invite controls');
assert(client.includes("var inviteToolBtn") && client.includes("'Invite on X'"), 'secondary invite controls must remain contextual');
assert(client.includes('copyQuizInvite') && client.includes('shareQuizInviteOnX'), 'invite copy/share helpers missing');
assert(landing.includes('?quiz=1#simp'), 'landing should surface quiz invite link');
assert(client.includes('latest score counts') || client.includes('Retake updates score'), 'retake-for-score copy missing');
assert(score.includes("QUIZ_VERSION = 'dasha-simp-quiz/v9'"), 'score module must be v9');
assert(!score.includes('QUIZ_QUICK_LENGTH'), 'quick length must be gone from product');
assert(!worker.includes("input?.mode === 'quick'"), 'worker must not accept a quick mode');
assert(client.includes('startQuiz()') && !client.includes("startQuiz('quick')") && !client.includes("startQuiz('deep')"), 'client must start one quiz');
assert(client.includes("action: 'start'") && !client.includes("action: 'start', mode"), 'start payload must not send a mode');
assert(!client.includes('Quick quiz ·') && !client.includes('Deep quiz ·'), 'start status must not name Quick/Deep');
assert(client.includes('Take the quiz') && !client.includes('quickBtn'), 'board must expose one start button');
assert(client.includes('sendQuizCard') && client.includes('Share result'), 'result share must offer image-first Share result');
assert(client.includes("navigator.canShare({ files: [file] })"), 'native image share path must stay wired');
assert(client.includes('var challengeUrl = (result && result.resultUrl) || QUIZ_INVITE_URL'), 'fallback share must prefer the permanent result-card URL');
assert(!client.includes('Invite first so paste/share targets always carry the play link'), 'generic invite must not outrank the result card in shared text');
assert(!client.includes('lastQuizMode'), 'retake must not remember a quick/deep mode');
assert(client.includes('retakeQuiz') && client.includes('startQuiz()'), 'retake must start the same quiz');
assert(worker.includes('simpQuizAttempts') && worker.includes('answerQuizAttempt'), 'quiz branch state must remain server-side');
for (const path of ['/simp/seasons', '/simp/wallet/challenge', '/simp/wallet/verify']) {
  assert(client.includes(path), `client missing ${path}`);
  assert(worker.includes(path), `worker missing ${path}`);
}
assert(worker.includes('/simp/review') && worker.includes('/simp/seasons/snapshot'), 'worker missing operator APIs');
assert.equal((worker.match(/url\.pathname\.startsWith\('\/simp\/'\)/g) || []).length, 2, 'both Worker and Durable Object routers must forward every simp endpoint');
assert(client.includes('Share on X') && client.includes('openXIntent'), 'X share path missing');
assert(client.includes('quizCardBlob') && client.includes('canvas.toBlob'), 'quiz result card (preview/share) missing');
assert(client.includes('entry.badges') && score.includes('badgesForProfile'), 'public badges missing');
assert(client.includes('signMessage') && actions.includes('verifyEd25519'), 'signed wallet proof missing');
assert(client.includes('global.phantom') && client.includes('global.solflare'), 'wallet provider detection is too narrow');
assert(client.includes('https://phantom.app/ul/browse/') && client.includes('Opening in Phantom'), 'mobile holder proof must reopen inside a signing-capable wallet browser');
assert(client.includes("'?ref=' + encodeURIComponent(new URL(url).origin)"), 'Phantom browse fallback must include its required encoded ref origin');
assert(client.includes("encodeURIComponent(new URL(url).origin)"), 'Phantom browse fallback must encode its ref origin');
assert(client.includes('signed.signature || signed'), 'wallet signature response variants unsupported');
assert(actions.includes('No transaction or public balance.'), 'wallet privacy message missing');
assert(actions.includes("import { MINT } from './dasha-lobby-mod.mjs'") && actions.includes('and mint ${MINT}'), 'holder signature must use the canonical Dasha mint');
for (const field of ['wants you to sign in with your Solana account', 'URI: ${uri}', 'Chain ID: mainnet', 'Issued At:', 'Expiration Time:', 'Request ID: simp-holder']) assert(actions.includes(field), `holder proof missing SIWS field: ${field}`);
assert(client.indexOf('wallet.connect()') < client.indexOf("'/simp/wallet/challenge'"), 'holder challenge must follow wallet connection');
assert(worker.includes('challenge.publicKey !== body.publicKey'), 'holder challenge must bind the signed wallet address');
assert(worker.includes('challenge.origin !== allowedOrigin'), 'holder challenge must remain bound to its requesting origin');
assert(actions.includes('{32,44}') && actions.includes('{64,88}'), 'wallet proof must bound base58 work before decoding');
assert(/AbortSignal\.timeout\((?:[1-7]\d{3}|8000)\)/.test(worker), 'Solana RPC check must be time-bounded');
assert(worker.includes("Solana holder check unavailable — try again") && worker.includes('503'), 'RPC failure must fail closed without becoming an internal error');
assert(client.includes('Holder checked ') && score.includes('holderCheckedAt'), 'holder badge must disclose proof time');
assert(client.includes('Holder verified. Access open for 24h.'), 'holder success must disclose the 24h session');
assert(!/access is immediate/i.test(client), 'holder success must not claim immediate/no-expiry access');
assert(!/<nav[^>]*>[\s\S]*?(?:Simp|Leaderboard)[\s\S]*?<\/nav>/i.test(landing), 'board expanded main nav');
assert(!/href="\/simp/.test(landing), 'landing must not invent a public /simp page route');

// Perry editorial, never measured/OAuth-linked points
assert(client.includes('PerryALPHA') || client.includes('@PerryALPHA'), 'Perry founding missing');
assert(client.includes('Founding simp') || client.includes('editorial'), 'Perry not labeled founding/editorial');
assert(client.includes('Founding simp · editorial') || client.includes('Not a measured'), 'client missing Perry editorial label');
assert(score.includes("measured: false") && score.includes("linked: false"), 'score module Perry not non-measured');
assert(score.includes("kind: 'editorial'"), 'Perry kind must be editorial');
assert(!/PERRY_EDITORIAL[\s\S]{0,400}measured:\s*true/.test(score), 'Perry falsely measured');

// Client state machine + a11y
assert(client.includes("aria-label', 'Link X to join the simp board'"), 'link CTA visible label must be contained in its accessible name');
assert(client.includes("aria-label', 'Join the simp board with linked X account'"), 'join CTA missing accessible label');
assert(client.includes("aria-label', 'Leave the simp board and delete linked board data'"), 'leave CTA missing accessible label');
assert(client.includes('paintLinkedIdentity') && client.includes("document.createTextNode('X · ')") && client.includes('meData.x.avatar'), 'linked Board identity must show X attribution and avatar');
assert(client.includes("aria-live', 'polite'"), 'status live region missing');
assert(client.includes('Board API offline') || client.includes('Board unavailable'), 'offline fallback missing');
assert(client.includes('credentials: \'include\'') || client.includes('credentials:"include"'), 'credentialed me/join/leave missing');
assert(client.includes('non-json response') || client.includes('JSON.parse'), 'fetchJson must tolerate non-JSON bodies');
assert(client.includes('onXLinkedMessage') && client.includes('removeEventListener'), 'OAuth message listener must be removable on destroy');

// Worker trust: no tokens in board storage, no auto-enroll, methods guarded
assert(worker.includes('simpProfiles'), 'worker stores board profiles');
assert(worker.includes('joinBoard') && worker.includes('leaveBoard'), 'worker mutators missing');
assert(!/oauth\/x\/callback[\s\S]{0,1500}joinBoard/.test(worker), 'OAuth callback auto-enrolls');
assert(!/exchangeCode|fetchXUser|createSessionToken|COOKIE\s*=/.test(score), 'scoring module must not own OAuth session plumbing');
assert(score.includes('assertPublicSafe') || score.includes('Never expose'), 'public sanitization contract missing');
assert(score.includes('access_token') && score.includes('assertPublicSafe'), 'public safety must ban token field leakage');
assert(score.includes('ZERO_POINT_SOURCES'), 'zero-point sources must be explicit');
assert(score.includes("holder: 0"), 'holder badge must award zero points');
assert(!/publicProfile[\s\S]{0,1200}(?:wallet|publicKey)/.test(score), 'public profile risks wallet disclosure');
for (const z of ['follower count', 'verification tier', 'chat messages', 'referrals', 'purchases', 'token balances', 'bag size']) {
  assert(score.includes(z), `missing zero-point rule: ${z}`);
}

const scoreRun = spawnSync(process.execPath, ['dasha-simp-score.test.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  encoding: 'utf8',
});
assert.equal(scoreRun.status, 0, scoreRun.stderr || scoreRun.stdout || 'score tests failed');

const embed = spawnSync(process.execPath, ['dasha-simp-board-embed-build.mjs', '--check'], {
  cwd: new URL('.', import.meta.url).pathname,
  encoding: 'utf8',
});
assert.equal(embed.status, 0, embed.stderr || embed.stdout || 'embed check failed');

// Reproduce the formerly fragile result-card boundary in a real mobile browser.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  let challengeLookups = 0;
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.route('https://www.getdasha.com/__simp_share_test*', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="dasha-simp-board"></div>' }),
  );
  await page.route('https://lobby.getdasha.com/simp/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/simp/photo/')) {
      return route.fulfill({
        contentType: 'image/jpeg',
        body: quizPhoto,
        headers: { 'Access-Control-Allow-Origin': 'https://www.getdasha.com' },
      });
    }
    if (path === '/simp/result/result123') { challengeLookups++; return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, result: { correct: 8, total: 10, title: 'Confirmed simp', lane: 'Dasha archaeologist' } }),
      headers: { 'Access-Control-Allow-Origin': 'https://www.getdasha.com' },
    }); }
    if (path === '/simp/quiz' && route.request().method() === 'POST') return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, attemptId: 'attempt123', progress: { current: 1 }, question: { prompt: 'A real challenge starts where?', choices: ['At question one', 'On a blank homepage'] } }),
      headers: { 'Access-Control-Allow-Origin': 'https://www.getdasha.com', 'Access-Control-Allow-Credentials': 'true' },
    });
    const data = path === '/simp/board'
      ? { editorial: [], measured: [] }
      : path === '/simp/seasons'
        ? { seasons: [] }
        : {
            linked: true,
            enrolled: true,
            x: { display: '@test', handle: 'test' },
            board: {
              quiz: { correct: 8, total: 10, title: 'Confirmed simp', lane: 'Dasha archaeologist', resultUrl: 'https://lobby.getdasha.com/simp/r/test' },
              components: { quiz: 8 }, total: 8, badges: [],
            },
          };
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(data),
      headers: { 'Access-Control-Allow-Origin': 'https://www.getdasha.com', 'Access-Control-Allow-Credentials': 'true' },
    });
  });
  await page.goto('https://www.getdasha.com/__simp_share_test');
  await page.evaluate(() => {
    window.__shares = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data) => { window.__shares.push(data); return Promise.resolve(); },
    });
  });
  await page.addScriptTag({ content: client });
  await page.getByRole('button', { name: 'Share your quiz result' }).click();
  const preview = page.getByAltText('Dasha simp quiz result card preview');
  await preview.waitFor();
  assert.deepEqual(await preview.evaluate(async (image) => { await image.decode(); return [image.naturalWidth, image.naturalHeight]; }), [1200, 675]);
  await page.getByRole('button', { name: 'Share quiz result card with image' }).first().click();
  await page.waitForFunction(() => window.__shares.length === 1);
  const shared = await page.evaluate(() => ({
    count: window.__shares[0].files.length,
    type: window.__shares[0].files[0].type,
    size: window.__shares[0].files[0].size,
    text: window.__shares[0].text,
    url: window.__shares[0].url,
  }));
  assert.equal(shared.count, 1);
  assert.equal(shared.type, 'image/png');
  assert(shared.size > 100_000 && shared.size <= 5_000_000);
  assert.match(shared.text, /Confirmed simp 8\/10/);
  assert.match(shared.text, /Beat this/);
  assert(!shared.text.includes('https://lobby.getdasha.com/simp/r/test'));
  assert.equal(shared.url, 'https://lobby.getdasha.com/simp/r/test');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  await page.goto('https://www.getdasha.com/__simp_share_test?challenge=result123#simp');
  await page.addScriptTag({ content: client });
  await page.getByRole('heading', { name: 'A real challenge starts where?' }).waitFor();
  assert.doesNotMatch(await page.locator('.simp-quiz').textContent(), /QUICK|10Q|20Q|\d+\s+OF\s+\d+/i);
  assert.equal(challengeLookups, 1, 'result challenge must be resolved once before the quiz');
  await page.waitForFunction(() => document.querySelector('.simp-quiz-note')?.textContent.startsWith('Beat 8/10'));
  assert.match(await page.locator('.simp-quiz-note').textContent(), /Beat 8\/10 · Confirmed simp · Dasha archaeologist/);
  assert.equal(await page.evaluate(() => window.DashaSimpBoard.wantsQuizInvite()), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

console.log('dasha-simp-board: PASS');
