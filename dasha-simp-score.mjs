/**
 * Dasha Simp Board v1 — pure scoring + public sanitization.
 * X OAuth proves account control only; participation is opt-in.
 * No tokens, wallets, balances, or X numeric IDs in public output.
 */

export const SCHEMA = 'dasha-simp-board/v1';
export const LINKED_X_POINTS = 10;
export const CREATIVE_POINTS = 25;
export const CREATIVE_CAP_28D = 100;
export const COMMUNITY_POINTS = 10;
export const COMMUNITY_CAP_28D = 40;
export const OSS_CAP_SEASON = 300;
export const ROLLING_MS = 28 * 24 * 60 * 60 * 1000;
export const PUBLIC_BOARD_LIMIT = 50;
export const OSS_SCHEMA = 'dasha-simp-oss/v0';
export const QUIZ_VERSION = 'dasha-simp-quiz/v8';
/** Deep scored path: route + 9 lane + 10 shared = 20. */
export const QUIZ_PATH_LENGTH = 20;
/** Quick scored path for invite/viral traffic: route + 4 lane + 5 shared = 10. */
export const QUIZ_QUICK_LENGTH = 10;
/** Full bank practice length (unused in product; kept for branch tests). */
export const QUIZ_PRACTICE_LENGTH = 24;
export const QUIZ_MAX_POINTS = 60;
/** Soft ±vibe on quiz points so the formula is not a pure spreadsheet. */
export const QUIZ_VIBE_RANGE = 8;
export const QUIZ_LANES = ['Cinema obsessive', 'Podcast casualty', 'Dasha archaeologist'];
const q = (id, prompt, choices, answer, next, note, source, extra = {}) => ({
  id,
  prompt,
  choices,
  answer,
  next,
  note,
  source,
  ...extra,
});
const SOURCE = {
  kim: 'https://letterboxd.com/kimsvideo/story/dasha-nekrasova-visits-kims-video-collection/',
  criterion: 'https://www.criterion.com/current/posts/7281-berlinale-2021-lineup',
  lat: 'https://www.latimes.com/entertainment-arts/movies/story/2021-03-02/scary-of-sixty-first-jeffrey-epstein-conspiracy-dasha-nekrasova',
  screen: 'https://www.screendaily.com/features/word-of-mouth-succession-actress-dasha-nekrasova-im-not-allowed-to-shitpost-anymore/5168430.article',
  interview: 'https://www.interviewmagazine.com/film/dasha-nekrasova-softness-of-bodies-amazon',
  pod: 'https://redscarepodcast.libsyn.com/summer-dress-sadness',
  coming: 'https://www.comingsoon.net/movies/features/1205998-dasha-nekrasova-scary-of-sixty-first-interview',
  raskin: 'https://www.maxraskin.com/interviews/dasha-nekrasova',
  x: 'https://x.com/dash_eats',
  materialists: 'https://www.dazeddigital.com/life-culture/article/68407/1/materialists-zeitgeisty-drama-love-capitalism-celine-song-interview-film',
  wobble: 'https://www.nytimes.com/2018/10/04/movies/wobble-palace-review.html',
  podDunkin: 'https://podscripts.co/podcasts/red-scare/pick-me-princess',
  podYale: 'https://podscripts.co/podcasts/red-scare/that-whole-yale-thing',
  podChess: 'https://podscripts.co/podcasts/red-scare/nepo-baby-its-cold-outside',
  podThings: 'https://podscripts.co/podcasts/red-scare/pod-things',
  pod400: 'https://podscripts.co/podcasts/red-scare/mentally-challengeders',
  podRecent: 'https://podscripts.co/podcasts/red-scare/slopsara',
  saturday: 'https://www.thesaturdaypaper.com.au/culture/film/2021/08/07/gonzo-director-and-actor-dasha-nekrasova/162825840012205',
  bio: 'https://en.wikipedia.org/wiki/Dasha_Nekrasova',
  site: 'https://www.getdasha.com/',
};
// Live paths: lane 0–8 + shared 0–9. Index 9+ stays in the bank for pinned ids only.
const routes = {
  cinema: [
    ['debut','What is her feature directorial debut?',['The Scary of Sixty-First','Materialists','The Sweet East'],0,'The public record calls it her first feature.',SOURCE.criterion],
    ['materialistscredit','Materialists is which kind of credit?',['her directorial debut','an acting role','a Red Scare special'],1,'An acting credit, not a feature she directed.',SOURCE.materialists],
    ['festival','Her first feature took which Berlin honor?',['Golden Bear','Best Screenplay','Best First Feature'],2,'Berlin Best First Feature — a prize, not a vibe.',SOURCE.bio],
    ['apartment','The Scary of Sixty-First is the film she…',['only EP','scored','directed'],2,'She directed it. That is the credit.',SOURCE.criterion],
    ['videostore','A cinema simp recognizes her pilgrimage to…',["Kim’s Video",'Blockbuster Bend','The Criterion Closet'],0,"She visited Kim’s legendary collection in Sicily.",SOURCE.kim],
    ['horrorpair','Pick the exact favorite-horror double answer.',['Scream + Saw',"The Exorcist + Rosemary’s Baby",'Alien + Jaws'],1,'Asked for one, she named two. Naturally.',SOURCE.raskin],
    ['cowriter','Who co-wrote the film?',['Celine Song','Madeline Quinn','Anna Khachiyan'],1,'Madeline Quinn co-wrote and co-starred.',SOURCE.screen],
    ['kubrick','She described the film as a kind of love letter to…',['Spielberg','Tarantino','Kubrick'],2,'The film’s visual worldview drew on Stanley Kubrick.',SOURCE.lat],
    ['softness','She also directed…',['The Softness of Bodies','Barbie','Everything Everywhere'],0,'Another film credit in the public record.',SOURCE.interview],
    ['materialistsdays','How many days did Dasha spend on the Materialists set?',['two','twelve','twenty'],0,'Celine Song said the role took two shooting days.',SOURCE.materialists],
    ['wobbleweekend','Wobble Palace splits one unhappy couple across which weekend?',['New Year’s 2017','Halloween 2016','Valentine’s 2018'],1,'Jane and Eugene divide Halloween weekend 2016.',SOURCE.wobble],
  ],
  podcast: [
    ['cohost','Her Red Scare co-host?',['Anna Khachiyan','Chloë Sevigny','Hari Nef'],0,'Anna and Dasha host together.',SOURCE.pod],
    ['redscare','Red Scare with Anna Khachiyan dates to…',['2014','2018','2021'],1,'The show has been on since 2018.',SOURCE.bio],
    ['tone','The show’s default register is…',['earnest TED talk','deadpan cultural roast','sports radio'],1,'Irony is the house style.',SOURCE.pod],
    ['onlineyoung','Before podcasting, teenage Dasha was already…',['on message boards','running a film festival','hosting sports radio'],0,'She described herself as very online even then.',SOURCE.interview],
    ['firstrole','Her first acting role was in…',['a Broadway musical','a music video','a USC student film'],2,'A student film at USC.',SOURCE.interview],
    ['western','Her first acting role was a student film described as a…',['courtroom drama','silent musical','post-apocalyptic Western'],2,'A USC student film with an unusually memorable premise.',SOURCE.interview],
    ['horror','Her earliest movie fixation?',['horror','westerns','sports films'],0,'She told Kim’s Video she loved horror very young.',SOURCE.kim],
    ['artschool','Her Las Vegas high school specialized in…',['computer science','performing arts','competitive swimming'],1,'She attended a performing-arts academy downtown.',SOURCE.saturday],
    ['college','She graduated from…',['Mills College','NYU Tisch','Yale'],0,'Mills College.',SOURCE.bio],
    ['dunkinprice','Dasha’s on-air Dunkin avocado toast cost…',['$2.10','$3.40','$6.75'],1,'The Pick Me Princess receipt was $3.40.',SOURCE.podDunkin],
    ['yaleclaim','After her Yale debate, Dasha’s immediate verdict?',['I won','Never again','It was a draw'],0,'She opened the recap with “I won.”',SOURCE.podYale],
    ['chesstreak','On the Christmas episode, the chess fixation count was…',['70','over 700','about 7,000'],1,'More than 700 games in six-to-eight weeks.',SOURCE.podChess],
    ['eyebrows','What had recently been bleached on Pod Things?',['eyebrows','a denim jacket','hair ends'],0,'The eyebrows were already returning to normal.',SOURCE.podThings],
    ['episode400','Around episode 400, the hosts estimated they had recorded…',['60 hours','600 hours','6,000 hours'],1,'Their back-of-envelope total was about 600 hours.',SOURCE.pod400],
    ['mjvibe','In a recent episode, Dasha said she vibed with Michael Jackson’s…',['persona more than the music','chess openings','film criticism'],0,'Recent lore: persona first, music “whatever.”',SOURCE.podRecent],
    ['feed','Where does the show actually live as audio?',['Libsyn feed','Spotify exclusive only','Clubhouse rooms'],0,'Public Libsyn listing is a clean source.',SOURCE.pod],
    ['headline','A Screen Daily headline says she is no longer allowed to…',['direct','shitpost','watch horror'],1,'The headline is part of the lore.',SOURCE.screen],
  ],
  lore: [
    ['sailoryear','The 2018 viral clip is remembered as…',['Sailor Socialism','Sailor Capitalism','Red Scare TV'],0,'The InfoWars encounter, not a year-quiz.',SOURCE.interview],
    ['sailorlook','The viral interview outfit was a…',['sailor fuku','power suit','cowboy costume'],0,'The sailor look supplied the nickname.',SOURCE.bio],
    ['sailorline','Finish the line: “All I want is…”',['a film deal, honey','another podcast, honey','free healthcare, honey'],2,'Meme lore from the clip, not a CTA.',SOURCE.interview],
    ['birthcity','Dasha was born in…',['Riga','Minsk','Kyiv'],1,'Minsk, in what was then the Byelorussian SSR.',SOURCE.bio],
    ['parents','Her parents’ performance backgrounds?',['opera singer + pianist','actors + dancers','rhythmic gymnast + acrobat'],2,'Her mother trained in rhythmic gymnastics; her father was an acrobat.',SOURCE.saturday],
    ['studies','At Mills, she studied…',['film production','economics and statistics','sociology and philosophy'],2,'Her degree work centered sociology and philosophy.',SOURCE.bio],
    ['messageboards','Teenage Dasha spent serious time on…',['sports radio','message boards','cooking forums'],1,'She described herself as very online early.',SOURCE.interview],
    ['mst3k','She tried to impress a crush by liking…',['Twin Peaks','Mystery Science Theater 3000','The Simpsons'],1,'Extremely specific lore, directly from her Kim’s Video visit.',SOURCE.kim],
    ['dreams','She said filmmaking draws on instinct and…',['spreadsheets','focus groups','dreams and the subconscious'],2,'The opposite of committee-made cinema.',SOURCE.screen],
    ['vegaslore','She grew up outside…',['Las Vegas','Boston','Miami'],0,'Her family settled around Las Vegas.',SOURCE.interview],
  ],
};
const shared = [
  ['account','The canonical source account?',['@dash_eats','@getdasha','@dashaofficial'],0,'Use the actual public account.',SOURCE.x],
  ['klaasje','Her original Disco Elysium voice role?',['Kim Kitsuragi','Klaasje','Cuno'],1,'She voiced Klaasje in the original release.',SOURCE.bio],
  ['vegas','She grew up in suburbs outside…',['Las Vegas','Boston','Miami'],0,'Raised around Las Vegas after emigrating young.',SOURCE.interview],
  ['brat','A Charli XCX Brat track inspired by her?',['360','Von dutch','Mean Girls'],2,'Mean Girls. A nod, not a collab claim.',SOURCE.bio],
  ['comfrey','Her Succession S3 role was…',['Shiv Roy','Tabitha','Comfrey — crisis PR'],2,'Comfrey, crisis PR. That is the credit.',SOURCE.screen],
  ['klaasjefinal','Her Disco Elysium Klaasje credit covers…',['original release only','the Final Cut','both editions'],0,'Original release; the Final Cut recast the role.',SOURCE.bio],
  ['dimessquare','Dimes Square names which public scene?',['downtown NYC culture','a Las Vegas address','a Berlin residency'],0,'A scene tag, not a lease.',SOURCE.bio],
  ['tenant','The clearest storytelling reference for her first feature?',['The Shining','Suspiria','The Tenant'],2,'She called The Tenant the most overt reference.',SOURCE.coming],
  ['sequels','Which sequel did she single out for playful irony?',['Jaws 2','Texas Chainsaw Massacre 2','Halloween II'],1,'She liked its humor and sense of play.',SOURCE.coming],
  ['franchise','Which horror franchise did she call herself a big fan of?',['Final Destination','The Purge','Nightmare on Elm Street'],2,'Nightmare on Elm Street was one of several favorites she named.',SOURCE.coming],
  ['latehost','As a kid, she wanted to appear on…',['Oprah','SNL','Letterman'],2,'She specifically named David Letterman.',SOURCE.interview],
  ['softnessrole','In The Softness of Bodies she plays…',['Charlotte','Jane','Daisy'],0,'Charlotte is the film’s drifting poet.',SOURCE.interview],
  ['wobblecharacter','Dasha’s Wobble Palace character is named…',['Daisy','Jane','Comfry'],1,'Jane gets her half of the Halloween weekend.',SOURCE.wobble],
  ['materialistsrole','In Materialists, Dasha plays…',['Daisy','Lucy','Sophie'],0,'Daisy works with Lucy at the matchmaking agency.',SOURCE.materialists],
  ['yaleargument','At Yale, she argued in favor of…',['mandatory consensus','abolishing debate','polarization'],2,'Her stated case: depolarization was boring.',SOURCE.podYale],
  ['teen','As a teenager she spent a lot of time…',['playing varsity tennis','posting on message boards','making cooking videos'],1,'She described herself as very online even then.',SOURCE.interview],
];
const bank = new Map();
bank.set(
  'route',
  q(
    'route',
    'Pick your strongest lane.',
    ['Cinema', 'Podcast', 'Personal + internet lore'],
    null,
    ['cinema-0', 'podcast-0', 'lore-0'],
    'Route set. Surprises await.',
    SOURCE.site,
    { surprise: 'lane-pick', stinger: 'Pick a personality. The algorithm is watching respectfully.' },
  ),
);
for (const [route, rows] of Object.entries(routes)) {
  rows.forEach(([id, prompt, choices, answer, note, source], i) => {
    bank.set(
      `${route}-${i}`,
      q(id, prompt, choices, answer, i === rows.length - 1 ? 'shared-0' : `${route}-${i + 1}`, note, source),
    );
  });
}
shared.forEach(([id, prompt, choices, answer, note, source], i) => {
  bank.set(
    `shared-${i}`,
    q(id, prompt, choices, answer, i === shared.length - 1 ? null : `shared-${i + 1}`, note, source),
  );
});
export const QUIZ_QUESTIONS = [...bank.values()];
/** Local photos under /simp/photo/* (worker assets). */
const VISUALS = {
  // Early-lane + shared-0 stills so Quick 10Q always shows photos.
  debut: '/simp/photo/bull.jpg',
  videostore: '/simp/photo/archive.jpg',
  festival: '/simp/photo/sweet.jpg',
  materialistscredit: '/simp/photo/sweet.jpg',
  cohost: '/simp/photo/profile.jpg',
  sailoryear: '/simp/photo/chart.jpg',
  sailorlook: '/simp/photo/profile.jpg',
  sailorline: '/simp/photo/weekend.jpg',
  klaasje: '/simp/photo/archive.jpg',
  account: '/simp/photo/archive.jpg',
  brat: '/simp/photo/media.jpg',
  comfrey: '/simp/photo/press.jpg',
  dimessquare: '/simp/photo/public.jpg',
  softness: '/simp/photo/hero.jpg',
};
for (const question of QUIZ_QUESTIONS) {
  if (VISUALS[question.id]) question.image = VISUALS[question.id];
}
/** Fun mid-quiz stickers keyed by question id (client may show as overlay). */
export const QUIZ_SURPRISES = {
  debut: { kind: 'photo-drop', title: 'First feature', body: 'Scary of Sixty-First. Not the later acting credit.' },
  sailorline: { kind: 'sticker', title: 'SAILOR SOCIALISM', body: 'The original viral line.' },
  klaasje: { kind: 'sticker', title: 'MARTINAISE LORE', body: 'Original-release voice credit.' },
  klaasjefinal: { kind: 'sticker', title: 'FINAL CUT ASTERISK', body: 'Recast later. The original still counts.' },
  comfrey: { kind: 'photo-drop', title: 'Succession cameo', body: 'Comfrey era. Crisis PR.' },
  brat: { kind: 'sticker', title: 'MEAN GIRLS', body: 'A Brat nod. Association, not a feature.' },
  account: { kind: 'sticker', title: '@DASH_EATS', body: 'The public account. Use this one.' },
  mst3k: { kind: 'photo-drop', title: 'Deep cut unlocked', body: 'Kim’s Video energy. Respect.' },
};
export const BADGES = new Set(['linked', 'maker', 'remixer', 'helper', 'lobby_regular', 'maintainer', 'holder']);

const EVIDENCE_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'getdasha.com', 'www.getdasha.com']);

/** Sources that award zero points in v1 (public rules). */
export const ZERO_POINT_SOURCES = [
  'follower count',
  'verification tier',
  'likes',
  'reposts',
  'replies',
  'chat messages',
  'referrals',
  'purchases',
  'token balances',
  'bag size',
  'payments',
];

export const PERRY_EDITORIAL = {
  handle: 'perryalpha',
  display: '@PerryALPHA',
  href: 'https://x.com/PerryALPHA',
  badge: 'founding_simp',
  kind: 'editorial',
  measured: false,
  linked: false,
  total: null,
  holder: false,
  basis: 'Editorial founding spot — not a measured interaction rank.',
  evidence_urls: [
    'https://x.com/PerryALPHA/status/2085370284400328784',
    'https://x.com/PerryALPHA/status/2085406351937703996',
  ],
};

export function isValidEvidenceUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 500) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return EVIDENCE_HOSTS.has(host);
  } catch {
    return false;
  }
}

function emptyComponents() {
  return { linked_x: 0, quiz: 0, creative: 0, community: 0, oss: 0, holder: 0 };
}

export const quizPublic = () => ({
  version: QUIZ_VERSION,
  total: QUIZ_PATH_LENGTH,
  quickTotal: QUIZ_QUICK_LENGTH,
  maxPoints: QUIZ_MAX_POINTS,
  modes: ['quick', 'deep'],
});
const publicQuestion = ({ id, prompt, choices, image }) => ({ id, prompt, choices, ...(image ? { image } : {}) });
export function startQuizAttempt({ now = Date.now(), practice = false, mode = 'deep' } = {}) {
  const m = practice ? 'practice' : mode === 'quick' ? 'quick' : 'deep';
  const total = practice ? QUIZ_PRACTICE_LENGTH : m === 'quick' ? QUIZ_QUICK_LENGTH : QUIZ_PATH_LENGTH;
  return {
    version: QUIZ_VERSION,
    current: 'route',
    position: 0,
    correct: 0,
    scorable: 0,
    practice: Boolean(practice),
    mode: m,
    total,
    startedAt: now,
    updatedAt: now,
  };
}
export function questionForAttempt(attempt) {
  const question = attempt?.version === QUIZ_VERSION ? bank.get(attempt.current) : null;
  const total = attempt?.total || QUIZ_PATH_LENGTH;
  return question ? { question: publicQuestion(question), progress: { current: attempt.position + 1, total } } : null;
}
export function answerQuizAttempt(attempt, answer, { now = Date.now() } = {}) {
  const question = attempt?.version === QUIZ_VERSION ? bank.get(attempt.current) : null;
  if (!question || !Number.isInteger(answer) || answer < 0 || answer >= question.choices.length) return { ok: false, status: 400, error: 'invalid quiz answer' };
  const scored = question.answer != null;
  const correct = scored && answer === question.answer;
  let next = Array.isArray(question.next) ? question.next[answer] : question.next;
  // Deep: route + lane 0–8 + shared… = 20. Quick: route + lane 0–3 + shared… = 10.
  if (!attempt.practice) {
    if (attempt.mode === 'quick' && /^(cinema|podcast|lore)-3$/.test(attempt.current)) next = 'shared-0';
    else if (attempt.mode !== 'quick' && /^(cinema|podcast|lore)-8$/.test(attempt.current)) next = 'shared-0';
  }
  // End at advertised length (bank may be longer).
  if (attempt.position + 1 >= (attempt.total || QUIZ_PATH_LENGTH)) next = null;
  const streak = correct ? (Number(attempt.streak) || 0) + 1 : 0;
  const updated = {
    ...attempt,
    ...(question.id === 'route' ? { lane: QUIZ_LANES[answer] } : {}),
    current: next,
    position: attempt.position + 1,
    correct: attempt.correct + (correct ? 1 : 0),
    scorable: attempt.scorable + (scored ? 1 : 0),
    streak,
    bestStreak: Math.max(Number(attempt.bestStreak) || 0, streak),
    updatedAt: now,
  };
  const lead = !scored
    ? 'Lane chosen.'
    : correct
      ? ['Correct. Unfortunate level of recall.', 'Yes, obviously.', 'Correct. You were online.', 'Unhealthy recall. Respect.'][attempt.position % 4]
      : ['Fake lore.', 'No. Too organized.', 'You were not online enough.', 'Timeline amnesia.'][attempt.position % 4];
  const pack = QUIZ_SURPRISES[question.id] || null;
  const surprise =
    pack ||
    (streak >= 3 && correct
      ? { kind: 'streak', title: `${streak} in a row`, body: 'Vibes compounding. Dangerous.' }
      : null) ||
    (question.stinger ? { kind: 'stinger', title: 'Note', body: question.stinger } : null);
  return {
    ok: true,
    attempt: updated,
    done: !next,
    feedback: {
      correct: scored ? correct : null,
      note: `${lead} ${question.note}`,
      source: question.source,
      ...(surprise ? { surprise } : {}),
    },
    ...(next ? questionForAttempt(updated) : {}),
  };
}
export function quizTitle(correct, total = 19) {
  const ratio = total ? correct / total : 0;
  if (ratio === 1) return 'Dasha scholar';
  if (ratio >= .8) return 'Confirmed simp';
  if (ratio >= .6) return 'Deep in the lore';
  if (ratio >= .4) return 'Watching respectfully';
  return 'Still loading';
}

const QUIZ_COPY = {
  'Dasha scholar': lane =>
    `Perfect recall. ${lane} looks like a finished costume. Leave a little mystery; the rest of us are still buffering.`,
  'Confirmed simp': lane =>
    `You have the credits cold. ${lane} reads as a lifestyle, not a hobby. One more deep cut and it gets concerning.`,
  'Deep in the lore': lane =>
    `You were online for the right years. ${lane} is doing real work. A couple of scene facts still sit on the table.`,
  'Watching respectfully': lane =>
    `You know enough to be dangerous. ${lane} is a solid start. The deep path is where it gets specific.`,
  'Still loading': lane =>
    `New tab, honest score. ${lane} is a fine on-ramp. The facts are public; the bit is optional.`,
};

export function quizCopy(title, lane) {
  const key = QUIZ_COPY[title] ? title : 'Still loading';
  return QUIZ_COPY[key](lane || 'This lane');
}

export function quizShareLine(title, lane) {
  return lane ? `${title} · ${lane}` : String(title || 'Still loading');
}

/**
 * Soft random “vibe” delta so leaderboard quiz points are not a pure correct/total spreadsheet.
 * Bounded ±QUIZ_VIBE_RANGE. Inject `rng` in tests for determinism (e.g. () => 0.5 → near-zero noise).
 */
export function vibeDeltaForAttempt(attempt, { rng = Math.random } = {}) {
  const r = () => {
    const x = Number(rng());
    return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0.5;
  };
  // Core noise: -4 … +4
  let delta = Math.floor(r() * 9) - 4;
  const scorable = Number(attempt?.scorable) || 0;
  const correct = Number(attempt?.correct) || 0;
  const ratio = scorable ? correct / scorable : 0;
  // Accuracy vibes
  if (ratio >= 0.95) delta += Math.floor(r() * 3) - 1; // -1..+1
  else if (ratio >= 0.8) delta += Math.floor(r() * 2); // 0..1
  else if (ratio <= 0.35) delta += Math.floor(r() * 3) - 2; // -2..0
  // Pace vibes
  const sec = Math.max(0, (Number(attempt?.updatedAt) - Number(attempt?.startedAt)) / 1000);
  if (sec > 0 && sec < 50) delta += Math.floor(r() * 2); // snappy: 0..1
  if (sec > 300) delta -= Math.floor(r() * 2); // slow roast: 0..-1
  // Streak vibes
  const best = Number(attempt?.bestStreak) || 0;
  if (best >= 4) delta += Math.floor(r() * 2); // 0..1
  // Lane spice (tiny, non-obvious)
  const li = QUIZ_LANES.indexOf(attempt?.lane);
  if (li >= 0 && r() > 0.55) delta += li % 2 === 0 ? 1 : -1;
  return Math.max(-QUIZ_VIBE_RANGE, Math.min(QUIZ_VIBE_RANGE, delta));
}

export function vibeNote(delta) {
  if (!delta) return 'Even vibes. Suspicious.';
  if (delta >= 5) return 'Chaotic good vibes (+' + delta + ').';
  if (delta >= 2) return 'Main-character energy (+' + delta + ').';
  if (delta <= -5) return 'Timeline wet blanket (' + delta + ').';
  if (delta <= -2) return 'Slightly offline tax (' + delta + ').';
  return delta > 0 ? 'Soft aura (+' + delta + ').' : 'Soft debuff (' + delta + ').';
}

export function quizResultForAttempt(attempt, { now = Date.now(), rng = Math.random } = {}) {
  const total = Number(attempt?.total) || (attempt?.practice ? QUIZ_PRACTICE_LENGTH : QUIZ_PATH_LENGTH);
  if (
    attempt?.version !== QUIZ_VERSION ||
    attempt.current ||
    attempt.position !== total ||
    attempt.scorable !== total - 1 ||
    attempt.correct < 0 ||
    attempt.correct > attempt.scorable
  ) {
    return null;
  }
  const basePoints = Math.round((attempt.correct / attempt.scorable) * QUIZ_MAX_POINTS);
  const vibe = vibeDeltaForAttempt(attempt, { rng });
  const points = basePoints;
  const title = quizTitle(attempt.correct, attempt.scorable);
  return {
    version: QUIZ_VERSION,
    correct: attempt.correct,
    total: attempt.scorable,
    points,
    basePoints,
    vibe,
    vibeNote: vibeNote(vibe),
    title,
    lane: attempt.lane,
    copy: quizCopy(title, attempt.lane),
    share: quizShareLine(title, attempt.lane),
    disclaimer: 'Association is not endorsement.',
    mode: attempt.mode === 'quick' ? 'quick' : attempt.practice ? 'practice' : 'deep',
    completedAt: now,
  };
}

/**
 * Sum awards of one kind inside a rolling window, applying per-award and cap rules.
 * Awards are { kind, points, evidenceUrl, at }.
 */
function rollingKindPoints(awards, kind, unitPoints, cap, now) {
  let sum = 0;
  const windowStart = now - ROLLING_MS;
  for (const a of awards) {
    if (a.kind !== kind) continue;
    const at = Number(a.at) || 0;
    if (at < windowStart || at > now) continue;
    if (!isValidEvidenceUrl(a.evidenceUrl)) continue;
    const pts = unitPoints;
    if (sum + pts > cap) {
      sum = cap;
      break;
    }
    sum += pts;
  }
  return sum;
}

/**
 * OSS points: externally computed (dasha-simp-oss/v0), season cap only.
 * Accept awards with kind 'oss' and positive points + evidence URL (github ok via host list? — OSS uses github).
 * Spec: evidence for creative/community is x/twitter/getdasha. OSS is separate contract.
 * For oss awards, require https evidence URL (github.com allowed only for oss).
 */
export function isValidOssEvidenceUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 500) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return (host === 'github.com' || host === 'www.github.com') &&
      !u.search && !u.hash && /^\/Uuriko\/dasha-desk\/pull\/[1-9]\d*\/?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

function ossPoints(awards) {
  let sum = 0;
  for (const a of awards) {
    if (a.kind !== 'oss') continue;
    if (a.schema !== OSS_SCHEMA) continue;
    if (!isValidOssEvidenceUrl(a.evidenceUrl)) continue;
    const pts = Math.max(0, Number(a.points) || 0);
    if (pts <= 0) continue;
    sum += pts;
    if (sum >= OSS_CAP_SEASON) return OSS_CAP_SEASON;
  }
  return Math.min(sum, OSS_CAP_SEASON);
}

/**
 * Score a stored profile. Profile: { handle, enrolledAt, awards[], holder?: boolean }
 * linked_x is 10 once if enrolled (opt-in), not from OAuth alone.
 */
export function scoreProfile(profile, { now = Date.now() } = {}) {
  const components = emptyComponents();
  if (!profile || !profile.handle) {
    return { total: 0, components, lastEvidenceAt: null };
  }
  const awards = Array.isArray(profile.awards) ? profile.awards : [];
  components.linked_x = LINKED_X_POINTS;
  components.quiz = profile.quiz?.version === QUIZ_VERSION
    ? Math.min(QUIZ_MAX_POINTS, Math.max(0, Number(profile.quiz.basePoints ?? profile.quiz.points) || 0))
    : 0;
  components.creative = rollingKindPoints(awards, 'creative', CREATIVE_POINTS, CREATIVE_CAP_28D, now);
  components.community = rollingKindPoints(awards, 'community', COMMUNITY_POINTS, COMMUNITY_CAP_28D, now);
  components.oss = ossPoints(awards);
  components.holder = 0; // badge only in v1
  let lastEvidenceAt = null;
  for (const a of awards) {
    const at = Number(a.at) || 0;
    if (!at || at > now) continue;
    if (a.kind === 'oss' ? isValidOssEvidenceUrl(a.evidenceUrl) : isValidEvidenceUrl(a.evidenceUrl)) {
      if (lastEvidenceAt == null || at > lastEvidenceAt) lastEvidenceAt = at;
    }
  }
  const total =
    components.linked_x + components.quiz + components.creative + components.community + components.oss + components.holder;
  return { total, components, lastEvidenceAt };
}

export function badgesForProfile(profile, { now = Date.now() } = {}) {
  if (!profile?.handle) return [];
  const badges = new Set(['linked']);
  for (const award of profile.awards || []) if (BADGES.has(award.badge)) badges.add(award.badge);
  if (Number(profile.holderUntil) > now) badges.add('holder');
  return [...badges];
}

/** Ranking: total desc, last evidence desc, enrolledAt asc, handle asc. */
export function compareMeasured(a, b) {
  if (b.total !== a.total) return b.total - a.total;
  const ae = a.lastEvidenceAt ?? 0;
  const be = b.lastEvidenceAt ?? 0;
  if (be !== ae) return be - ae;
  const aEn = Number(a.enrolledAt) || 0;
  const bEn = Number(b.enrolledAt) || 0;
  if (aEn !== bEn) return aEn - bEn;
  return String(a.handle || '').localeCompare(String(b.handle || ''));
}

export function rankProfiles(profiles, { now = Date.now() } = {}) {
  const rows = [];
  for (const p of profiles || []) {
    if (!p?.handle) continue;
    const scored = scoreProfile(p, { now });
    rows.push({
      handle: p.handle,
      avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 300) : null,
      verifiedType: p.verifiedType || null,
      enrolledAt: Number(p.enrolledAt) || 0,
      holder: Number(p.holderUntil) > now,
      holderCheckedAt: Number(p.holderCheckedAt) || null,
      badges: badgesForProfile(p, { now }),
      quiz: p.quiz?.version === QUIZ_VERSION ? { correct: p.quiz.correct, total: p.quiz.total, title: p.quiz.title, lane: p.quiz.lane, resultUrl: p.quiz.resultUrl } : null,
      ...scored,
    });
  }
  rows.sort(compareMeasured);
  return rows;
}

/** Strip private fields for public board response. Never expose xId, tokens, wallets, balances. */
export function publicMeasuredEntry(row, rank) {
  return {
    rank,
    handle: row.handle,
    display: `@${row.handle}`,
    href: `https://x.com/${row.handle}`,
    avatar: row.avatar || null,
    kind: 'measured',
    measured: true,
    linked: true,
    total: row.total,
    components: { ...row.components },
    holder: row.badges.includes('holder'),
    holderCheckedAt: row.holderCheckedAt,
    badges: [...row.badges],
    quiz: row.quiz,
  };
}

export function publicPerryRow() {
  return {
    rank: 1,
    ...PERRY_EDITORIAL,
    components: null,
  };
}

export function rulesPublic() {
  return {
    schema: SCHEMA,
    mode: 'measured-opt-in',
    linked_x: {
      points: LINKED_X_POINTS,
      once: true,
      note: 'Eligibility credit for opt-in enrollment after X link.',
    },
    quiz: {
      version: QUIZ_VERSION,
      path_length: QUIZ_PATH_LENGTH,
      quick_length: QUIZ_QUICK_LENGTH,
      max_points: QUIZ_MAX_POINTS,
      vibe_range: QUIZ_VIBE_RANGE,
      note:
        'Modes: quick (' +
        QUIZ_QUICK_LENGTH +
        'Q, invite default) and deep (' +
        QUIZ_PATH_LENGTH +
        'Q, board default). Scored retakes allowed — latest finish updates Board quiz points. Points = accuracy; soft vibe is share copy only (±' +
        QUIZ_VIBE_RANGE +
        '). Finishing enrolls that X account. Share via X intent anytime.',
    },
    creative: {
      points_per: CREATIVE_POINTS,
      cap_rolling_28d: CREATIVE_CAP_28D,
      evidence: 'https public URL on x.com, twitter.com, or getdasha.com',
    },
    community: {
      points_per: COMMUNITY_POINTS,
      cap_rolling_28d: COMMUNITY_CAP_28D,
      evidence: 'https public URL on x.com, twitter.com, or getdasha.com',
    },
    oss: {
      schema: OSS_SCHEMA,
      cap_per_season: OSS_CAP_SEASON,
      note: 'Externally computed merged-PR points only; Worker does not re-score GitHub.',
    },
    holder: {
      points: 0,
      note: 'Badge only when a later signed-wallet proof exists. Zero points in v1.',
    },
    zero_points: ZERO_POINT_SOURCES,
    ranking: 'total desc, then most recent evidenced contribution, then enrollment time, then handle',
    editorial: 'PerryALPHA founding #1 is editorial and non-measured',
    privacy:
      'Public board never exposes X numeric IDs, cookies, tokens, IPs, wallets, balances, or private notes.',
    identity:
      'X OAuth proves control of one X account, not one unique human. Board points carry no prize, payment, governance, allocation, or airdrop entitlement.',
    opt_in: 'Enrollment requires an explicit join or quiz submission after X OAuth. OAuth alone does not enroll.',
    leave: 'Leave removes that X account’s board profile and awards. Unlinking Lobby OAuth alone does not.',
  };
}

export function buildPublicBoard(profiles, { now = Date.now(), limit = PUBLIC_BOARD_LIMIT } = {}) {
  const editorialHandle = PERRY_EDITORIAL.handle.toLowerCase();
  const ranked = rankProfiles(profiles, { now })
    .filter(row => String(row.handle).toLowerCase() !== editorialHandle)
    .slice(0, Math.max(0, limit));
  const measured = ranked.map((row, i) => publicMeasuredEntry(row, i + 2)); // ranks after Perry
  return {
    schema: SCHEMA,
    mode: 'measured-opt-in',
    editorial: [publicPerryRow()],
    measured,
    rules: rulesPublic(),
    limit,
  };
}

/**
 * Future award contract (pure). Validates evidence + kind; does not persist.
 * Admin API intentionally omitted in this pass.
 */
export function proposeAward(profile, award, { now = Date.now() } = {}) {
  if (!profile?.handle) return { ok: false, error: 'not enrolled' };
  const kind = award?.kind;
  if (kind !== 'creative' && kind !== 'community' && kind !== 'oss') {
    return { ok: false, error: 'invalid kind' };
  }
  if (kind === 'oss') {
    if (award.schema !== OSS_SCHEMA) return { ok: false, error: 'invalid oss schema' };
    if (!isValidOssEvidenceUrl(award.evidenceUrl)) return { ok: false, error: 'invalid evidence host' };
  } else if (!isValidEvidenceUrl(award.evidenceUrl)) {
    return { ok: false, error: 'invalid evidence host' };
  }
  // Reject scoring from forbidden signals if someone passes them as metadata
  if (award.followers != null || award.verification != null || award.chatVolume != null) {
    return { ok: false, error: 'forbidden signal' };
  }
  if (award.referrals != null || award.purchases != null || award.balance != null || award.bagSize != null) {
    return { ok: false, error: 'forbidden signal' };
  }
  const unit =
    kind === 'creative' ? CREATIVE_POINTS : kind === 'community' ? COMMUNITY_POINTS : Math.max(0, Number(award.points) || 0);
  if (kind !== 'oss' && unit <= 0) return { ok: false, error: 'no points' };
  if (kind === 'oss' && unit <= 0) return { ok: false, error: 'no points' };
  const row = {
    id: typeof award.id === 'string' ? award.id.slice(0, 40) : `a${now}`,
    kind,
    ...(kind === 'oss' ? { schema: OSS_SCHEMA } : {}),
    points: kind === 'oss' ? unit : unit,
    ...(BADGES.has(award.badge) ? { badge: award.badge } : {}),
    evidenceUrl: String(award.evidenceUrl).slice(0, 500),
    at: Number(award.at) || now,
  };
  const next = {
    ...profile,
    awards: [...(profile.awards || []), row],
    updatedAt: now,
  };
  const before = scoreProfile(profile, { now });
  const after = scoreProfile(next, { now });
  return { ok: true, award: row, profile: next, before, after };
}

/** Create enrollment record from a signed session (public fields only + internal xId for storage). */
export function enrollmentFromSession(session, { now = Date.now() } = {}) {
  if (!session?.xId || !session?.handle) return null;
  return {
    xId: String(session.xId),
    handle: String(session.handle).toLowerCase(),
    avatar: typeof session.avatar === 'string' ? session.avatar.slice(0, 300) : null,
    verifiedType: session.verifiedType || null,
    enrolledAt: now,
    updatedAt: now,
    awards: [],
    holder: false,
  };
}

/** Join: idempotent. Returns { profile, created }. */
export function joinBoard(store, session, { now = Date.now() } = {}) {
  if (!session?.xId || !session?.handle) return { ok: false, error: 'not linked', status: 401 };
  const xId = String(session.xId);
  const existing = store[xId];
  if (existing) {
    // Refresh public profile fields; keep awards and enrolledAt
    const refreshed = {
      ...existing,
      handle: String(session.handle).toLowerCase(),
      avatar: typeof session.avatar === 'string' ? session.avatar.slice(0, 300) : existing.avatar,
      verifiedType: session.verifiedType || existing.verifiedType || null,
      updatedAt: now,
    };
    return { ok: true, created: false, profile: refreshed, store: { ...store, [xId]: refreshed } };
  }
  const profile = enrollmentFromSession(session, { now });
  return { ok: true, created: true, profile, store: { ...store, [xId]: profile } };
}

/**
 * Scored quiz finish: enrolls on Board if needed, then stores latest quiz result.
 * Retakes replace the previous score (no one-shot lock). Practice path is unused.
 */
export function submitQuiz(store, session, attempt, { now = Date.now(), rng = Math.random } = {}) {
  const joined = joinBoard(store, session, { now });
  if (!joined.ok) return joined;
  const xId = String(session.xId);
  // Never treat practice attempts as leaderboard score.
  if (attempt?.practice) {
    return { ok: false, status: 400, error: 'practice attempts are disabled; retake for score' };
  }
  const quiz = quizResultForAttempt(attempt, { now, rng });
  if (!quiz) return { ok: false, status: 400, error: 'quiz is incomplete' };
  const profile = { ...joined.profile, quiz, updatedAt: now };
  return {
    ok: true,
    created: joined.created,
    retake: Boolean(joined.profile.quiz),
    quiz,
    profile,
    store: { ...joined.store, [xId]: profile },
  };
}

/** Leave: only the signed session's xId. */
export function leaveBoard(store, session) {
  if (!session?.xId) return { ok: false, error: 'not linked', status: 401 };
  const xId = String(session.xId);
  if (!store[xId]) return { ok: true, removed: false, store };
  const next = { ...store };
  delete next[xId];
  return { ok: true, removed: true, store: next };
}

/** Status for /simp/me — never leak xId publicly. */
export function meStatus(store, session) {
  if (!session?.xId || !session?.handle) {
    return { linked: false, enrolled: false, x: null, board: null };
  }
  const profile = store[String(session.xId)] || null;
  const now = Date.now();
  const scored = profile ? scoreProfile(profile, { now }) : null;
  return {
    linked: true,
    enrolled: Boolean(profile),
    x: {
      handle: session.handle,
      display: `@${session.handle}`,
      href: `https://x.com/${session.handle}`,
      avatar: session.avatar || null,
    },
    board: profile
      ? {
          handle: profile.handle,
          total: scored.total,
          components: scored.components,
          quiz: profile.quiz?.version === QUIZ_VERSION
            ? {
                correct: profile.quiz.correct,
                total: profile.quiz.total,
                title: profile.quiz.title,
                lane: profile.quiz.lane,
                copy: profile.quiz.copy,
                share: profile.quiz.share,
                disclaimer: profile.quiz.disclaimer,
                resultUrl: profile.quiz.resultUrl,
                points: profile.quiz.points,
                vibe: profile.quiz.vibe,
                vibeNote: profile.quiz.vibeNote,
              }
            : null,
          holder: Number(profile.holderUntil) > now,
          holderCheckedAt: Number(profile.holderCheckedAt) || null,
          badges: badgesForProfile(profile, { now }),
        }
      : null,
  };
}

/** Assert a public payload has no sensitive leakage. */
export function assertPublicSafe(obj) {
  const s = JSON.stringify(obj);
  const banned = [
    /"xId"\s*:/,
    /"access_token"\s*:/i,
    /"refresh_token"\s*:/i,
    /"LOBBY_SESSION/i,
    /"cookie"\s*:/i,
    /"ip"\s*:/i,
    /"wallet"\s*:/i,
    /"balance"\s*:/i,
    /"bagSize"\s*:/i,
    /"amount"\s*:/i,
    /"usd_value"\s*:/i,
    /"enrolledAt"\s*:/,
    /"lastEvidenceAt"\s*:/,
    /"completedAt"\s*:/,
  ];
  for (const re of banned) {
    if (re.test(s)) return { ok: false, reason: re.toString() };
  }
  return { ok: true };
}
