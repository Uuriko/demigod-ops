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
export const QUIZ_VERSION = 'dasha-simp-quiz/v9';
/** Hidden step count: 1 unscored route + 16 scored. Never shown to the player. */
export const QUIZ_PATH_LENGTH = 17;
export const QUIZ_SCORED_LENGTH = 16;
/** Full-bank walk for tests only. Not a player-facing mode. */
export const QUIZ_PRACTICE_LENGTH = 40;
export const QUIZ_MAX_POINTS = 60;
/** Soft ±vibe on quiz points so the formula is not a pure spreadsheet. */
export const QUIZ_VIBE_RANGE = 8;
export const QUIZ_LANES = ['Cinema obsessive', 'Podcast casualty', 'Dasha archaeologist'];
const LANE_KEYS = ['cinema', 'podcast', 'lore'];
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
const SRC = {
  raskin: 'https://www.maxraskin.com/interviews/dasha-nekrasova',
  cut: 'https://www.thecut.com/2018/10/profile-red-scare-podcast.html',
  gq: 'https://www.gq.com/story/dasha-nekrasova-succession-season-3-kendall-publicist-comfry',
  berlinale: 'https://www.berlinale.de/en/2021/programme/202105883.html',
  vulture: 'https://www.vulture.com/article/dasha-nekrasova-profile.html',
  libsyn: 'https://redscarepodcast.libsyn.com/war-room-red-scare-w-steve-bannon',
  dazed: 'https://www.dazeddigital.com/life-culture/article/68407/1/materialists-zeitgeisty-drama-love-capitalism-celine-song-interview-film',
  indiewire: 'https://www.indiewire.com/features/interviews/the-beast-bertrand-bonello-lea-seydoux-sci-fi-venice-interview-1234902297/',
  interview: 'https://www.interviewmagazine.com/film/dasha-nekrasova-softness-of-bodies-amazon',
  rafman: 'https://www.interviewmagazine.com/art/jon-rafman-and-dasha-nekrasova-on-the-horror-we-call-life',
  nylon: 'https://www.nylon.com/beauty/red-scares-dasha-nekrasova-on-freckle-pens-surviving-quarantine-and-her-feature-film-the-scary-of-61st-street',
  variety: 'https://variety.com/2021/film/news/dasha-nekrasova-scary-of-61st-street-jeffrey-epstein-1234918735/',
  collider: 'https://collider.com/jennifer-connelly-bad-behaviour-sneak-peek/',
};
// [id, tier, lane, prompt, choices, answer, note, source]
const ITEMS = [
  ['sailor-fuku', 1, 'cinema', 'What sailor-adjacent look was she wearing in the 2018 SXSW Infowars ambush?', ['A full Sailor Moon cosplay with wig and wand', 'A navy-and-white sailor-style fuku top (not a full cosplay) plus iced coffee', "A Cirque du Soleil leotard from her dad's act", 'A Red Scare merch sailor hat'], 1, 'A fuku top, not full cosplay. Getty portraits while promoting Wobble Palace.', SRC.raskin],
  ['tatu-theme', 1, 'podcast', "Which t.A.T.u. song is Red Scare's opening theme?", ['All the Things She Said', 'Not Gonna Get Us', 'Nas Ne Dogonyat', 'Show Me Love'], 0, "The Cut 2018: 'All the Things She Said' is the show's theme.", SRC.cut],
  ['comfry-job', 1, 'cinema', "On Succession, what is Comfry's actual job on Kendall's team?", ["Kendall's personal attorney", "Assistant to Berry Schneider, Kendall's actual publicist / crisis PR", 'Waystar in-house comms VP', "Shiv's opposition researcher"], 1, "GQ: Comfry is Berry Schneider's assistant and Kendall's crisis PR.", SRC.gq],
  ['berlinale', 1, 'cinema', 'What prize did The Scary of Sixty-First win at the 2021 Berlinale?', ['Golden Bear', 'Silver Bear for Best Director', 'GWFF Best First Feature Award', 'Encounters Best Film'], 2, 'Berlinale page: GWFF Best First Feature Award, Encounters.', SRC.berlinale],
  ['healthcare-line', 1, 'podcast', 'In the Infowars clip, which of these lines did she actually say?', ['Eat the rich, honey', 'I just want people to have free health care, honey', 'Bernie or bust, sweetheart', 'You people are fascists, honestly'], 1, "The Cut quotes: 'I just want people to have free health care, honey.'", SRC.cut],
  ['wobble-sxsw', 1, 'cinema', 'Which film was she promoting at SXSW when Infowars approached her?', ['The Scary of Sixty-First', 'Softness of Bodies', 'Wobble Palace', 'The Ghost Who Walks'], 2, 'Vulture/The Cut: Wobble Palace; she co-wrote and starred with Eugene Kotlyarenko.', SRC.vulture],
  ['minsk-vegas', 1, 'lore', 'Where was she born, and where did she mostly grow up after emigrating?', ['Moscow; New Jersey', 'Minsk; Las Vegas (via Atlantic City and other circus towns)', 'Kyiv; Los Angeles', 'St. Petersburg; Brooklyn'], 1, 'Vulture: born 1991 in Minsk; Atlantic City then Vegas.', SRC.vulture],
  ['the-girl', 1, 'cinema', "In The Scary of Sixty-First, what is her on-screen credit?", ['Addie', 'Noelle', 'The Girl', 'Ghislaine'], 2, 'Berlinale credits: Betsey Brown Addie, Madeline Quinn Noelle, Nekrasova The Girl.', SRC.berlinale],
  ['ews-universe', 2, 'cinema', 'What did she tell Vulture The Scary of Sixty-First shares with Eyes Wide Shut?', ["She stole Kubrick's unused Epstein research notes", "It's in the 'same cinematic universe'", "She recut Kubrick's orgy scene into the climax", 'Nicole Kidman has a cameo as Maxwell'], 1, "Vulture: homage in the 'same cinematic universe.'", SRC.vulture],
  ['bannon-healthcare', 2, 'podcast', 'What question did Red Scare put to Steve Bannon on War Room Red Scare?', ['Would he debate Zizek live', "How you can call yourself a populist if you don't believe in universal healthcare", 'Whether he had seen Sailor Socialism', 'If he would produce their next live show'], 1, 'Libsyn blurb: populist, then universal healthcare.', SRC.libsyn],
  ['nietzsche-mills', 2, 'lore', 'What philosophy did she mainly focus on at Mills College?', ['Kant', 'Nietzsche', 'Hegel', 'Simone Weil'], 1, 'Max Raskin: Nietzsche.', SRC.raskin],
  ['parents-circus', 2, 'lore', 'Before Cirque du Soleil, what Soviet-era path did both of her parents take?', ['Bolshoi dancers', 'Child gymnasts who then performed with the Moscow Circus', 'KGB translators', 'Film extras at Mosfilm'], 1, 'Raskin: gymnasts, then Moscow Circus, then Cirque.', SRC.raskin],
  ['materialists-legs', 2, 'cinema', "In Celine Song's Materialists, what workplace tidbit does Daisy drop?", ['Clients demand a 20 BMI cap only', 'Some men break their legs in a height-lengthening operation', "Harry's bachelor pad is $12 million", 'Lucy makes $80,000 a year'], 1, 'Dazed: men break their legs to grow a few inches.', SRC.dazed],
  ['bonello-coffee', 2, 'cinema', 'How did Bertrand Bonello cast her as Dakota in The Beast?', ['Through a formal L.A. casting call after hearing Red Scare', 'He met her for coffee in New York in 2019 while presenting Zombi Child, liked the rhythm of her voice, and did not know the podcast', 'Léa Seydoux recommended her', 'She submitted a self-tape as an Elliot Rodger type'], 1, 'IndieWire: coffee in New York, 2019. He did not know the podcast.', SRC.indiewire],
  ['mao-chaos', 2, 'lore', 'Which Mao line did she quote to Vulture while describing cultural decline?', ['Political power grows out of the barrel of a gun', 'Serve the people', 'Everything under heaven is in utter chaos; the situation is excellent', 'Let a hundred flowers bloom'], 2, 'Vulture: chaos; the situation is excellent.', SRC.vulture],
  ['freud-start', 2, 'lore', 'In the 2020 Interview Magazine Q&A, which three Freud texts did she start people with?', ['Totem and Taboo; Beyond the Pleasure Principle; Moses and Monotheism', 'Intro to Psychoanalysis; The Interpretation of Dreams; Civilization and Its Discontents', 'The Ego and the Id; Three Essays; Jokes and Their Relation to the Unconscious', 'Studies on Hysteria; The Psychopathology of Everyday Life; The Future of an Illusion'], 1, 'Interview Mag: those three, in that order.', SRC.interview],
  ['equinox-script', 3, 'cinema', 'Where did she and Madeline Quinn actually write The Scary of Sixty-First?', ["A Williamsburg writers' room", 'The rooftop deck of the Equinox on 61st Street', "Epstein's townhouse stoop", 'The Red Scare Patreon Discord'], 1, 'Nylon: Equinox rooftop on 61st Street.', SRC.nylon],
  ['sixteen-mm', 3, 'cinema', 'What stock did she shoot The Scary of Sixty-First on, and in what month?', ['35mm in March 2020', 'Digital Alexa in December 2019', '16mm in January', 'Super 8 during quarantine'], 2, 'Nylon: 16mm in January.', SRC.nylon],
  ['byzantine', 3, 'lore', 'Which rite of Catholicism has she said she actually practices?', ['Latin Mass sedevacantist chapel only', 'Byzantine Catholic (in communion with Rome, Orthodox liturgy)', "Novus Ordo at St. Patrick's Cathedral", 'She only attends Orthodox liturgies with her husband'], 1, 'Raskin: Byzantine Catholic, Orthodox liturgy, in communion with Rome.', SRC.raskin],
  ['klaasje-never', 3, 'lore', 'Which Disco Elysium character did she voice — and what did she admit about the game?', ['Kim Kitsuragi; she 100-percented it', 'Klaasje, in the first iteration; she has never played it', 'Cuno; she speedran it on stream', 'Joyce Messier; she wrote extra lines'], 1, 'Interview Mag / Rafman: Klaasje, first iteration. She has never played it.', SRC.rafman],
  ['opn-tonight', 3, 'cinema', 'Which late-night performance did she direct in 2020?', ['Lana Del Rey on Colbert', "Oneohtrix Point Never's 'I Don't Love Me Anymore' on The Tonight Show", 'Aphex Twin on Fallon', 'Dave Blunts on Kimmel'], 1, "Nylon: OPN on The Tonight Show.", SRC.nylon],
  ['softness-poet', 3, 'cinema', 'In Softness of Bodies, what does she play?', ['A camgirl in Queens', 'A poet living abroad in Berlin', 'A crisis publicist', 'An Epstein truther'], 1, 'Interview Mag 2020: a poet living abroad in Berlin. Acting credit.', SRC.interview],
  ['cutrone-book', 3, 'cinema', "What book did she read to build Comfry's 'PR girl mentality'?", ['The Power Broker', "Kelly Cutrone's If You Have to Cry, Go Outside", 'The Devil Wears Prada', 'Crisis Communications for Dummies'], 1, "GQ: Kelly Cutrone's If You Have to Cry, Go Outside.", SRC.gq],
  ['hanging-stunt', 4, 'cinema', "What physically happened when she filmed The Girl recreating Epstein's hanging?", ['She used only CGI and a dummy', 'A stunt harness was fashioned from sheets; she still burst blood vessels around her eyes', 'She refused to do the scene and hired a double', 'She filmed it as a dream sequence with no neck pressure'], 1, 'Variety: sheet harness. She still burst blood vessels around her eyes.', SRC.variety],
  ['bota-tarot', 4, 'cinema', "Which occult group's tarot deck appears in The Scary of Sixty-First?", ['Ordo Templi Orientis', 'Builders of the Adytum', 'The Process Church', 'Thee Temple ov Psychick Youth'], 1, 'Variety: Builders of the Adytum.', SRC.variety],
  ['evangelion', 4, 'lore', 'What did she call Neon Genesis Evangelion in the Raskin interview?', ['Overrated weeaboo bait', 'The best, not just anime, but the best work of art ever made', 'A good gateway before Akira', "Anna's favorite, not hers"], 1, "Direct quote: the best work of art ever made.", SRC.raskin],
  ['vegan-kotleti', 4, 'lore', 'During quarantine, which extremely on-brand cooking project did she describe?', ['Sourdough only', 'Vegan kotleti from Smallhold mushrooms via SlavicVegan.com', 'Raw-milk cheese in Queens', 'Nothing; she only ordered from Bar Pitti'], 1, 'Nylon: vegan kotleti, Smallhold mushrooms, SlavicVegan.com.', SRC.nylon],
  ['husband-carpenter', 4, 'lore', 'What has she said her husband actually does, and what is his faith?', ['Talent agent; Latin Catholic', 'Carpenter in historic restoration; Orthodox convert who prays the Psalter daily', 'Cirque rigger; atheist', 'Red Scare producer; Byzantine Catholic like her'], 1, 'Raskin: historic-restoration carpenter; Orthodox convert; Psalter daily.', SRC.raskin],
  ['players-club', 4, 'lore', 'Where did she have her wedding reception?', ['The Wing', "The Players club (the Shakespearean actors' club)", 'Fanelli Cafe', 'Union Hall'], 1, "Raskin: The Players, the Shakespearean actors' club.", SRC.raskin],
  ['isis-tees', 4, 'podcast', 'On the Succession set, what real-time PR crisis was she managing between takes?', ['A leaked Scary of Sixty-First cut', "British tabloids slamming Red Scare's ISIS-themed T-shirts; she drafted a statement to The New Arab", 'A Jezebel piece about Bar Pitti', 'Gersh dropping her mid-shoot'], 1, 'GQ: ISIS-themed tees; she drafted a statement to The New Arab.', SRC.gq],
  ['chess-elo', 4, 'lore', 'What chess opinions did she volunteer to Max Raskin?', ['She is 2200 and loves Magnus', "Elo about 1000, opens e4 because 'Bobby Fischer says it's tested,' dislikes Magnus, likes Hans Niemann and the Botez sisters", 'She only plays bughouse with Anna', 'She refuses chess as a Russian stereotype'], 1, 'Raskin: ~1000, e4, not a Magnus fan, likes Niemann and the Botez sisters.', SRC.raskin],
  ['exorcist-mexico', 5, 'lore', 'Where and when did she first see The Exorcist?', ['A Minsk bootleg at age 6', 'Fourth grade, in Mexico, a forbidden VHS in a house she was staying in with a school friend', 'Midnight screening at Mills', 'Cirque greenroom in Vegas'], 1, 'Raskin: fourth grade, Mexico, a forbidden VHS at a school friend’s house.', SRC.raskin],
  ['cirque-o', 5, 'lore', 'Which Cirque du Soleil show is her favorite?', ['Mystère', 'O (the Vegas water show)', 'KÀ', 'Zumanity'], 1, 'Raskin: probably “O.”', SRC.raskin],
  ['leuchtturm', 5, 'lore', 'What analog productivity kit did she specify?', ['Moleskine and a Montblanc', 'A German Leuchtturm planner and R.S.V.P. pens made for wedding invitations', 'Remarkable tablet only', "Anna's shared Google Doc"], 1, 'Raskin: Leuchtturm planner and R.S.V.P. pens.', SRC.raskin],
  ['catholic-u-notes', 5, 'lore', 'Which two phrases did she jot for a Catholic University horror-movie talk?', ["'God is dead' and 'the medium is the message'", "'Fear of God is the beginning of wisdom' and 'Conspiracy is like a folk religion'", "'This is our 9/11' and 'Epstein didn't kill himself'", "'Hesychasm' and 'the Real'"], 1, "Raskin planner notes: fear of God; conspiracy as folk religion.", SRC.raskin],
  ['usc-western', 5, 'cinema', 'What was the first thing she acted in, per Interview Magazine?', ['A Yumi Zouma music video', 'A USC student film: a lesbian postapocalyptic Western', 'Cotton the web series', 'Wobble Palace'], 1, 'Interview Mag: USC student film, lesbian postapocalyptic Western.', SRC.interview],
  ['letterman', 5, 'lore', 'Why did teenage Dasha want to be a child actor?', ['To join Cirque like her parents', 'Basically only so she could be a guest on David Letterman', 'To escape Vegas for LA', 'To fund message-board hobbies'], 1, 'Interview Mag: basically only for Letterman.', SRC.interview],
  ['rafman-painting', 5, 'lore', 'What is the Jon Rafman artwork she called her favorite piece she owns?', ['A Google Street View still from Nine Eyes', 'A chihuahua having sex with a pig, three pit bulls looking on judgmentally as a storm rolls in', 'An AI portrait of Anna', 'A Second Life screenshot of Dimes Square'], 1, 'Interview Mag 2023: that painting. Her favorite piece she owns.', SRC.rafman],
  ['bad-behaviour', 5, 'cinema', 'In Bad Behaviour, what happens to her character Beverly at the retreat?', ['She leads the silent sit and never speaks', 'Lucy (Jennifer Connelly) throws water in her face, screams at her to shut up, and smashes a chair over her head', "She is revealed as Dylan's stunt double", "Ben Whishaw's guru expels her for podcasting"], 1, 'Collider sneak-peek: water, shut up, chair over the head.', SRC.collider],
];
const bank = new Map();
bank.set(
  'route',
  q(
    'route',
    'Pick your strongest lane.',
    ['Cinema', 'Podcast', 'Personal lore'],
    null,
    'sailor-fuku',
    'Lane set. The rest depends on how online you were.',
    SRC.vulture,
    { stinger: 'Pick a personality. The algorithm is watching respectfully.' },
  ),
);
for (const [id, tier, lane, prompt, choices, answer, note, source] of ITEMS) {
  bank.set(id, q(id, prompt, choices, answer, null, note, source, { tier, lane }));
}
export const QUIZ_QUESTIONS = [...bank.values()];
const scoredItems = QUIZ_QUESTIONS.filter((question) => question.answer != null);
/** First-party stills under /simp/photo/*. No pbs.twimg. No in-repo dance GIFs. */
const QUIZ_PHOTO_MEDIA = ['archive', 'bull', 'chart', 'hero', 'media', 'press', 'profile', 'public', 'sweet', 'weekend'].map((name) => ({
  src: `/simp/photo/${name}.jpg`,
  kind: 'image',
  alt: 'Dasha',
}));
let photoCursor = 0;
for (const question of QUIZ_QUESTIONS) {
  question.media = QUIZ_PHOTO_MEDIA[photoCursor++ % QUIZ_PHOTO_MEDIA.length];
}
function publicMedia(question, avoidSrc) {
  const preferred = question?.media || QUIZ_PHOTO_MEDIA[0];
  if (!avoidSrc || preferred.src !== avoidSrc) return { src: preferred.src, kind: preferred.kind, alt: preferred.alt };
  const i = QUIZ_PHOTO_MEDIA.findIndex((item) => item.src === preferred.src);
  const next = QUIZ_PHOTO_MEDIA[(i + 1) % QUIZ_PHOTO_MEDIA.length];
  return { src: next.src, kind: next.kind, alt: next.alt };
}
/** Fun mid-quiz stickers keyed by question id (client may show as overlay). */
export const QUIZ_SURPRISES = {
  'sailor-fuku': { kind: 'sticker', title: 'SAILOR SOCIALISM', body: 'A fuku top. Not a full cosplay.' },
  'klaasje-never': { kind: 'sticker', title: 'MARTINAISE LORE', body: 'She voiced Klaasje. She has never played it.' },
  'comfry-job': { kind: 'photo-drop', title: 'Succession cameo', body: 'Comfry era. Crisis PR.' },
  berlinale: { kind: 'photo-drop', title: 'First feature', body: 'GWFF Best First Feature. Encounters.' },
  'tatu-theme': { kind: 'sticker', title: 'COLD OPEN', body: 'All the Things She Said.' },
};
export function pickNextQuestion(seen, targetTier, lane, preferUp = true) {
  const used = seen instanceof Set ? seen : new Set(seen || []);
  const pick = (tier) => {
    const pool = scoredItems.filter((item) => item.tier === tier && !used.has(item.id));
    if (!pool.length) return null;
    const biased = lane ? pool.filter((item) => item.lane === lane) : pool;
    return (biased.length ? biased : pool)[0];
  };
  const exact = pick(targetTier);
  if (exact) return exact;
  for (let d = 1; d <= 4; d++) {
    const first = preferUp ? targetTier + d : targetTier - d;
    const second = preferUp ? targetTier - d : targetTier + d;
    if (first >= 1 && first <= 5) {
      const hit = pick(first);
      if (hit) return hit;
    }
    if (second >= 1 && second <= 5) {
      const hit = pick(second);
      if (hit) return hit;
    }
  }
  return scoredItems.find((item) => !used.has(item.id)) || null;
}
function laneKeyOf(lane) {
  const i = QUIZ_LANES.indexOf(lane);
  return i >= 0 ? LANE_KEYS[i] : null;
}
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
  maxPoints: QUIZ_MAX_POINTS,
});
export const publicQuestion = (question, extra = {}) => ({
  id: question.id,
  prompt: question.prompt,
  choices: question.choices,
  media: publicMedia(question, extra.avoidSrc),
});
export function startQuizAttempt({ now = Date.now(), practice = false } = {}) {
  return {
    version: QUIZ_VERSION,
    current: 'route',
    position: 0,
    correct: 0,
    scorable: 0,
    practice: Boolean(practice),
    total: practice ? QUIZ_PRACTICE_LENGTH : QUIZ_PATH_LENGTH,
    seen: [],
    tier: 1,
    streak: 0,
    startedAt: now,
    updatedAt: now,
  };
}
export function questionForAttempt(attempt) {
  const question = attempt?.version === QUIZ_VERSION ? bank.get(attempt.current) : null;
  if (!question) return null;
  const prev = attempt.seen?.length ? bank.get(attempt.seen[attempt.seen.length - 1]) : null;
  return { question: publicQuestion(question, { avoidSrc: prev?.media?.src }), progress: { current: attempt.position + 1 } };
}
export function answerQuizAttempt(attempt, answer, { now = Date.now() } = {}) {
  const question = attempt?.version === QUIZ_VERSION ? bank.get(attempt.current) : null;
  if (!question || !Number.isInteger(answer) || answer < 0 || answer >= question.choices.length) return { ok: false, status: 400, error: 'invalid quiz answer' };
  const scored = question.answer != null;
  const correct = scored && answer === question.answer;
  const seen = [...(attempt.seen || []), question.id];
  const lane = question.id === 'route' ? QUIZ_LANES[answer] : attempt.lane;
  const currentTier = Number(attempt.tier) || 1;
  const scoredNext = attempt.scorable + (scored ? 1 : 0);
  const scoredCap = attempt.practice ? scoredItems.length : QUIZ_SCORED_LENGTH;
  let next = null;
  if (scoredNext < scoredCap) {
    const targetTier = scored ? (correct ? Math.min(currentTier + 1, 5) : Math.max(currentTier - 1, 1)) : 1;
    const picked = pickNextQuestion(seen, targetTier, laneKeyOf(lane), correct || !scored);
    next = picked?.id || question.next || null;
    if (next && seen.includes(next)) next = pickNextQuestion(seen, targetTier, laneKeyOf(lane), correct || !scored)?.id || null;
  }
  const streak = correct ? (Number(attempt.streak) || 0) + 1 : 0;
  const nextQuestion = next ? bank.get(next) : null;
  const updated = {
    ...attempt,
    ...(question.id === 'route' ? { lane } : {}),
    current: next,
    position: attempt.position + 1,
    correct: attempt.correct + (correct ? 1 : 0),
    scorable: attempt.scorable + (scored ? 1 : 0),
    seen,
    tier: nextQuestion?.tier || currentTier,
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
export function quizTitle(correct, total = 16) {
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
    `You know enough to be dangerous. ${lane} is a solid start. A couple more credits and it gets specific.`,
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
      max_points: QUIZ_MAX_POINTS,
      vibe_range: QUIZ_VIBE_RANGE,
      note:
        'One adaptive quiz. Scored retakes allowed — latest finish updates Board quiz points. Points = accuracy; soft vibe is share copy only (±' +
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
