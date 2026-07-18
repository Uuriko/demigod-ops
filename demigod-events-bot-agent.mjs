/**
 * Demigod Events Bot — autonomous agent (Codex-class OpenAI tools loop)
 *
 * Modes (env DEMIGOD_EVENTS_AUTONOMY):
 *   draft  — full local ops (ideas, event, tasks, venue, outreach queue); no network send/Luma create (default)
 *   semi   — same as draft + Luma draft payloads recorded
 *   auto   — may attempt Luma create if LUMA_API_KEY; SMTP send adapter when present
 * Owner model: Events Bot runs the night start→finish. People offer/chat; bot messages first when needed.
 *
 * Env:
 *   OPENAI_API_KEY — required for live agent ticks
 *   OPENAI_EVENTS_MODEL — default gpt-4o-mini
 *   LUMA_API_KEY — optional Luma calendar key (Plus)
 *   DEMIGOD_EVENTS_AUTONOMY — draft|semi|auto
 *   DEMIGOD_EVENTS_BOT_MOCK=1 — force offline
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
/** Override with DEMIGOD_EVENTS_STORE so selftest never mutates prod. */
function eventsStorePath() {
  return process.env.DEMIGOD_EVENTS_STORE || path.join(ROOT, 'DEMIGOD-EVENTS.json');
}
/** Override with DEMIGOD_EVENTS_OUTBOX so selftest never floods prod outbox. */
export function eventsOutboxPath() {
  return process.env.DEMIGOD_EVENTS_OUTBOX || path.join(ROOT, 'events-bot-outbox');
}

export const IDENTITY_BLURB =
  "I'm Events Bot (by Demigod) — I organize fun, sponsorable **San Francisco** events (not only Demigod-branded nights). " +
  'You can chat with me and give feedback anytime: https://www.trydemigod.com/?p=events ' +
  'or email potter@trydemigod.com with subject Events Bot.';

/** Standing product rule: in-person SF only (for now). */
export const GEO_RULE = {
  city: 'San Francisco',
  region: 'SF Bay Area',
  only: true,
  note: 'Events Bot only plans and hosts events in San Francisco for now. Decline other cities; offer SF alternatives.',
};

// Explicit SF / SF-room signals. Outside cities + South Bay / East Bay without SF → reject.
// NON_SF is checked first so "South San Francisco" does not match as San Francisco.
const SF_OK =
  /\b(san francisco|sf\b|soma|mission district|mission\b|folsom|market street|financial district|fi?di\b|civic center|hayes valley|castro|north beach|marina|potrero|dogpatch|tenderloin|nob hill|russian hill|pacific heights|chinatown|japantown|embarcadero|union square|presidio|bayview|excelsior|bernal|noe valley|haight|richmond|sunset|twin peaks|glen park|ingleside|visitacion|treasure island|yerba buena island|alamo square|west portal|cow hollow|jackson square|rincon hill|lake merced|merced heights|park merced|parkmerced)\b/i;
// NON_SF first. Include CA cities outside SF proper (Sacramento/San Diego/Santa Cruz
// used to default-pass via the generic-title branch). Bare Richmond = SF district;
// Richmond, CA / Richmond California = East Bay city. SFO airport is San Mateo County.
// East Bay residual: El Cerrito/Albany/Piedmont/Moraga/Hercules/Pinole/San Pablo.
// residual-3: Contra Costa/Solano (Pittsburg/Martinez/Benicia/Rodeo/Crockett/…),
// South Bay further (Gilroy/Morgan Hill/Hollister), Monterey coast, Silicon Valley region,
// residual-4: nearby Marin/East Bay towns (San Anselmo/Fairfax/Ross/San Lorenzo/El Sobrante),
// residual-5/6: more peninsula/Marin/East Bay/North Bay that default-passed as generic titles
// (Portola Valley ≠ Portola district SF; Alamo CA ≠ Alamo Square SF).
// residual-6/7: Windsor/Cloverdale/Broadmoor; Tri-Valley/Tahoe; CA cities that default-passed
// (Bakersfield/Chico/Eureka/Redding/Anaheim/Pasadena/…); Folsom CA ≠ Folsom St SF;
// remote webex|skype|facetime|hangouts|async|distributed-only.
// residual-8: Richmond CA (no comma) ≠ Richmond district; Tahoe City/Incline/Kings Beach/
// Olympic Valley/Reno; Sierra foothills; Mendocino/Big Sur/Yosemite; Napa Yountville/St Helena;
// Sac suburbs Rocklin/Elk Grove; LA coastal Malibu/Venice Beach/Culver City; SD Mission Valley/
// Mission Beach (before SF_OK \bmission\b); Pebble Beach.
// residual-9: Marina del Rey (LA — was false SF via SF_OK \bmarina\b); major US metros that
// default-passed; SoCal beaches; Hawaii retreats; Jackson CA ≠ Jackson Square; remote
// digital|telephone|sms|text|vr|web|metaverse-only.
// residual-10: Lake Merced SF (was false-reject via bare merced CA); Lake Merritt + Oakland
// hoods (Temescal/Rockridge/Fruitvale); Stanford/Googleplex/Apple Park/Moffett/NASA Ames;
// Yolo/Winters/Dixon/Marysville/Boulder Creek; Balboa Island (≠ Balboa Park SF); remote
// audio|voice|call-only; metaverse/VR meetup phrases (not only -only suffix).
// residual-11: Merced Heights + Park Merced SF (were false-reject via bare merced CA);
//   lake|park lookbehind + heights lookahead; Merced CA city still reject.
// residual-12: CA cities that still default-passed as generic titles — Central Valley
// (Clovis/Hanford/Tulare/Madera/Los Banos/…), Central Coast (Pismo/Paso Robles/Lompoc/
// Santa Maria/Goleta/Ojai/…), LA/IE/SoCal (Glendale/Torrance/Temecula/Chula Vista/
// Sherman Oaks/Mission Viejo/…), gold country (Sonora/Mariposa/Mammoth), Bay edge
// (Tam Valley/Port Costa/Sunol/Guerneville). corona(?!\s+heights) — Corona Heights still SF.
// residual-13: more CA default-pass (North CA Red Bluff/Arcata/Willits/Clearlake; valley
// Lathrop/Ripon/Oakdale/Ceres/Galt/Wasco; desert Ridgecrest/Tehachapi/Big Bear/Perris;
// OC Fountain Valley/Garden Grove; Bay edge Montara/North Fair Oaks/Bodega Bay/Sea Ranch/
// Forestville/Geyserville); Richmond VA ≠ Richmond district; Jackson MS ≠ Jackson Square;
// major US metros wave-2 (OKC/Tulsa/Omaha/Tucson/El Paso/Fort Worth/…); remote
// teleconference|conference-call|broadcast-only|livestream meetup.
// residual-14: far North CA that still default-passed (Paradise CA / Gridley / Live Oak /
// Orland / Corning / Anderson CA / Shasta Lake / Mount Shasta / Weed CA / Yreka / Alturas /
// Dunsmuir / Ferndale / Rio Dell / Garberville / Laytonville / Kelseyville / Lower Lake /
// Middletown / Gualala / Point Arena / Boonville); remote slack|discord|teams hang|night +
// only-on-{platform} (hybrid SF room still OK via SF_OK).
// residual-15: CA cities + US metros that still default-passed — valley/Sierra (Quincy CA/
// Portola CA ≠ Portola district; Colusa/Willows/Firebaugh/Kerman/Lindsay CA/Corcoran/
// Avenal/Coalinga/Livingston CA); Ventura (Fillmore CA ≠ Fillmore district; Santa Paula/
// Moorpark); LA/IE (West Hollywood/Beverly Hills/Alhambra/Arcadia/Redlands/Yucaipa/
// Beaumont CA/Banning); Valencia CA ≠ Valencia Street Mission; US (Provo/Scottsdale/
// Boulder CO ≠ Boulder Creek/Colorado Springs/Columbia SC/Lincoln NE/Topeka/Fayetteville AR).
// residual-16: SoCal beach/desert that still default-passed (Seal Beach/Rancho Mirage/
// Calexico/El Centro/Brawley/San Marcos); bare Vista/Lancaster/Lindsay/Bishop/Exeter;
// St Paul/Greensboro; Marina CA ≠ Marina district SF; Mountain House/Bodega/Occidental/
// Grover Beach/Lone Pine/Adelanto; remote exclusively|100% remote, no in-person,
// cyber|internet-only, distributed team meetup (hybrid SF room still OK via SF_OK for
// non-hard-remote tokens only).
// residual-17: SoCal IE/OC + LA basin that still default-passed (Laguna Niguel/Diamond Bar/
// Rowland Heights/Hacienda Heights/Norwalk/Bellflower/Lakewood/Cerritos/Cypress/
// Yorba Linda/Placentia/Brea/Colton/Highland/Loma Linda/San Jacinto/Canyon Lake/Norco/
// West Covina/Chino/San Dimas/Glendora/Azusa/Monrovia/Duarte/Covina/Baldwin Park/
// El Monte/South Gate/Lynwood/Desert Hot Springs); US metros Boca Raton/Manchester/
// Syracuse/Worcester/Nashua/Jersey City/Princeton/Asheville.
// residual-18: LA basin/OC/valley/SCV + desert/AZ/NM + DMV that still default-passed
// (Montebello/Pico Rivera/Commerce/Vernon/Maywood/Bell CA/Cudahy/Huntington Park/
// Paramount/Westminster/Rosemead/San Gabriel/San Marino/Temple City; Aliso Viejo/
// Laguna Hills/Laguna Woods/Rancho Santa Margarita/Capistrano Beach/bare Lake Forest;
// Joshua Tree/Indian Wells/Needles/California City; Parlier/Huron/Mendota/Fowler/
// McFarland/Arvin; Newhall/Canyon Country/Saugus/Acton/Stevenson Ranch/Castaic/
// Agua Dulce; Walnut CA ≠ Walnut Creek; Flagstaff/Sedona/Santa Fe; Arlington VA/
// Alexandria/Reston/McLean/Bethesda/Silver Spring/Rockville/Annapolis/Frederick MD/
// Hagerstown/Wheeling/Winston-Salem/Roanoke). Mission/Marina/Richmond/Castro still SF.
// Oyster Point (South SF), remote-first / teams|discord|phone|slack-only.
// Castro Valley before SF_OK \bcastro\b; bare Bay Area / North Bay / Marin (not Marina).
// virtual|online-only|video-only|webinar-only|fully remote = remote
// (hybrid + SF room still OK if no remote-only token).
const NON_SF =
  /\b(nyc|new york|brooklyn|manhattan|queens|paris|tokyo|berlin|singapore|sydney|mexico city|los angeles|\bla\b|santa monica|long beach|seattle|austin|san antonio|chicago|miami|london|boston|denver|portland|atlanta|philadelphia|houston|dallas|phoenix|las vegas|salt lake city|nashville|minneapolis|toronto|vancouver|washington\s*dc|\bdc\b|remote[- ]only|remote[- ]first|fully remote|video[- ]only|webinar[- ]only|youtube\s+live[- ]only|livestream[- ]only|livestream(?:\s+(?:meetup|event|hang|night|call|session|webinar))?|teleconference|conference\s+call|broadcast[- ]only|virtual(?:[- ]only)?|zoom(?:[- ]only|\s+(?:meetup|event|call|session|room))|online[- ]only|teams[- ]only|microsoft\s+teams[- ]only|discord[- ]only|telegram[- ]only|signal[- ]only|phone[- ]only|slack[- ]only|google\s+meet[- ]only|webex[- ]only|skype[- ]only|facetime[- ]only|hangouts[- ]only|async[- ]only|distributed[- ]only|digital[- ]only|metaverse(?:[- ]only|\s+(?:meetup|event|hang|night|call|session))?|telephone[- ]only|sms[- ]only|text[- ]only|vr(?:[- ]only|\s+(?:meetup|event|hang|night|call|session))|web[- ]only|audio[- ]only|voice[- ]only|call[- ]only|oakland|berkeley|alameda|emeryville|el cerrito|albany|piedmont|moraga|hercules|pinole|san pablo|pittsburg|pittsburgh|martinez|benicia|rodeo|crockett|newark|american canyon|suisun(?:\s+city)?|vacaville|temescal|rockridge|fruitvale|lake merritt|san jose|palo alto|mountain view|menlo park|los altos|sunnyvale|cupertino|stanford|googleplex|apple park|moffett(?:\s+field)?|nasa ames|redwood city|redwood shores|san mateo|daly city|south san francisco|south sf|\bssf\b|\bsfo\b|san francisco (?:international )?airport|san francisco international|oyster point|san bruno|foster city|burlingame|millbrae|brisbane|colma|broadmoor|pacifica|half moon bay|montara|north fair oaks|bodega bay|sea ranch|forestville|geyserville|sacramento|san diego|santa cruz|capitola|aptos|felton|boulder creek|santa barbara|santa clara|santa rosa|fresno|bakersfield|chico|eureka|redding|red bluff|oroville|arcata|mckinleyville|fortuna|willits|clearlake|lakeport|crescent city|susanville|paradise(?:\s*,?\s*ca|\s+california)|gridley|live oak|orland|corning|anderson(?:\s*,?\s*ca|\s+california)|(?:mount\s+)?shasta(?:\s+lake)?|weed(?:\s*,?\s*ca|\s+california)|yreka|alturas|dunsmuir|ferndale|rio dell|garberville|laytonville|kelseyville|lower lake|middletown|gualala|point arena|boonville|anaheim|pasadena|burbank|santa ana|riverside|san bernardino|palm springs|(?<!lake\s)(?<!park\s)merced(?!\s+heights)|visalia|oxnard|ventura|san luis obispo|\bslo\b|roseville|woodland|yuba city|marysville|turlock|manteca|lodi|lathrop|ripon|oakdale|ceres|galt|isleton|rio vista|patterson|escalon|wasco|shafter|taft|tehachapi|mojave|ridgecrest|big bear|lake arrowhead|twentynine palms|yucca valley|perris|menifee|lake elsinore|wildomar|carlsbad|encinitas|oceanside|escondido|folsom\s*,?\s*ca|folsom\s+california|lake tahoe|south lake tahoe|tahoe city|south shore(?:\s+tahoe)?|tahoe donner|incline village|kings beach|zephyr cove|olympic valley|squaw valley|\breno\b|carson city|carson(?:\s*,?\s*ca|\s+california)|grass valley|nevada city|placerville|el dorado hills|\bauburn\b|mendocino|big sur|yosemite|fort bragg|ukiah|yountville|st\.?\s*helena|rocklin|elk grove|citrus heights|rancho cordova|cameron park|lincoln(?:\s*,?\s*ca|\s+california)|loomis|west sacramento|malibu|venice beach|culver city|pacific palisades|pebble beach|mission valley|mission beach|mission viejo|pacific beach|coronado|marina del rey|balboa island|del mar|solana beach|newport beach|laguna beach|huntington beach|hermosa beach|redondo beach|costa mesa|dana point|san clemente|fountain valley|garden grove|truckee|monterey|carmel|pacific grove|seaside|irvine|davis|yolo(?:\s+county|\s*,?\s*ca\b|\s+california)?|winters(?:\s*,?\s*ca|\s+california)|dixon(?:\s*,?\s*ca|\s+california)|napa|calistoga|petaluma|novato|san rafael|san anselmo|fairfax|ross|concord|pleasanton|dublin|livermore|san carlos|belmont|atherton|los gatos|campbell|milpitas|union city|san leandro|san lorenzo|el sobrante|san ramon|danville|lafayette|orinda|pleasant hill|antioch|tracy|stockton|modesto|vallejo|fairfield|sonoma|guerneville|tiburon|larkspur|corte madera|castro valley|gilroy|morgan hill|hollister|san juan bautista|silicon valley|tri[- ]valley|richmond\s*,?\s*ca\b|richmond\s+california|richmond\s*,?\s*va\b|richmond\s+virginia|jackson\s*,?\s*ca\b|jackson\s+california|jackson\s*,?\s*ms\b|jackson\s+mississippi|bay area|north bay|south bay|east bay|peninsula|muir beach|marin|sausalito|mill valley|walnut creek|fremont|hayward|belvedere|kentfield|greenbrae|san quentin|bolinas|stinson beach|inverness|point reyes|kensington|point richmond|brentwood|oakley|clayton|discovery bay|blackhawk|alamo(?!\s+square)|portola valley|woodside|hillsborough|saratoga|monte sereno|pescadero|moss beach|el granada|rohnert park|cotati|healdsburg|sebastopol|windsor|cloverdale|scotts valley|watsonville|salinas|clovis|hanford|tulare|porterville|madera|atwater|los banos|chowchilla|lemoore|delano|reedley|sanger|selma|kingsburg|dinuba|pismo beach|arroyo grande|paso robles|templeton|atascadero|morro bay|cayucos|cambria|lompoc|santa maria|goleta|carpinteria|ojai|solvang|buellton|king city|soledad|gonzales|greenfield(?:\s*,?\s*ca|\s+california)|camarillo|thousand oaks|simi valley|agoura hills|calabasas|sherman oaks|studio city|glendale|pomona|ontario|rancho cucamonga|fontana|rialto|moreno valley|corona(?!\s+heights)|temecula|murrieta|hemet|palm desert|indio|cathedral city|coachella|barstow|victorville|hesperia|apple valley|lancaster|palmdale|santa clarita|claremont|upland|chino hills|whittier|downey|compton|inglewood|torrance|gardena|hawthorne|el segundo|fullerton|orange(?:\s*,?\s*ca|\s+california)|tustin|lake forest|san juan capistrano|chula vista|national city|imperial beach|el cajon|santee|poway|vista|encino|van nuys|northridge|reseda|sonora(?:\s*,?\s*ca|\s+california)|mariposa|oakhurst|mammoth lakes|bishop|angels camp|sutter creek|colfax|murphys|groveland|tam valley|port costa|sunol|bethel island|byron(?:\s*,?\s*ca|\s+california)|detroit|cleveland|baltimore|charlotte|tampa|orlando|jacksonville|columbus|indianapolis|milwaukee|kansas city|st\.?\s*louis|saint louis|new orleans|cincinnati|memphis|louisville|raleigh|durham|providence|hartford|buffalo|rochester|honolulu|maui|\bhilo\b|kauai|\boahu\b|boise|spokane|tacoma|eugene|anchorage|oklahoma city|tulsa|omaha|des moines|wichita|little rock|birmingham|norfolk|virginia beach|charleston|savannah|knoxville|chattanooga|albuquerque|tucson|el paso|fort worth|plano|irving|garland|corpus christi|laredo|mcallen|baton rouge|shreveport|mobile|huntsville|montgomery|tallahassee|gainesville|pensacola|sarasota|fort lauderdale|west palm beach|cape coral|madison|green bay|grand rapids|ann arbor|lansing|flint|akron|toledo|dayton|fort wayne|south bend|evansville|lexington|bowling green|bellevue(?:\s*,?\s*wa|\s+washington)|olympia|bellingham|salem(?:\s*,?\s*or|\s+oregon)|bend(?:\s*,?\s*or|\s+oregon)|medford|idaho falls|missoula|billings|bozeman|cheyenne|casper|fargo|sioux falls|bismarck|rapid city|quincy(?:\s*,?\s*ca|\s+california)|portola(?:\s*,?\s*ca|\s+california)|colusa|willows(?:\s*,?\s*ca|\s+california)|firebaugh|kerman(?:\s*,?\s*ca|\s+california)|lindsay|corcoran|avenal|coalinga|fillmore(?:\s*,?\s*ca|\s+california)|santa paula|moorpark|west hollywood|beverly hills|alhambra|arcadia|redlands|yucaipa|beaumont(?:\s*,?\s*ca|\s+california)|banning(?:\s*,?\s*ca|\s+california)|valencia(?:\s*,?\s*ca|\s+california)|livingston(?:\s*,?\s*ca|\s+california)|provo(?:\s*,?\s*ut|\s+utah)?|scottsdale|boulder(?:\s*,?\s*co|\s+colorado)|colorado springs|columbia(?:\s*,?\s*sc|\s+south carolina)|lincoln(?:\s*,?\s*ne|\s+nebraska)|topeka|fayetteville(?:\s*,?\s*ar|\s+arkansas)|fairbanks|juneau|seal beach|rancho mirage|calexico|el centro|brawley|san marcos|st\.?\s*paul|saint paul|greensboro|exeter|lone pine|adelanto|grover beach|mountain house|bodega|occidental|marina(?:\s*,?\s*ca|\s+california)|laguna niguel|diamond bar|rowland heights|hacienda heights|norwalk|bellflower|lakewood|cerritos|cypress|yorba linda|placentia|brea|colton|highland|loma linda|san jacinto|canyon lake|norco|west covina|chino|san dimas|glendora|azusa|monrovia|duarte|covina|baldwin park|el monte|south gate|lynwood|desert hot springs|montebello|pico rivera|commerce(?:\s*,?\s*ca|\s+california)?|vernon(?:\s*,?\s*ca|\s+california)?|maywood|cudahy|huntington park|paramount(?:\s*,?\s*ca|\s+california)?|westminster(?:\s*,?\s*ca|\s+california|\s*,?\s*md|\s+maryland)?|bell gardens|bell(?:\s*,?\s*ca|\s+california)|rosemead|san gabriel|san marino|temple city|aliso viejo|laguna hills|laguna woods|rancho santa margarita|capistrano beach|joshua tree|indian wells|needles(?:\s*,?\s*ca|\s+california)?|california city|parlier|huron(?:\s*,?\s*ca|\s+california)?|mendota|fowler(?:\s*,?\s*ca|\s+california)?|mcfarland|arvin|newhall|canyon country|saugus|acton(?:\s*,?\s*ca|\s+california)?|stevenson ranch|castaic|agua dulce|walnut(?!\s+creek)|flagstaff|sedona|santa fe(?:\s*,?\s*nm|\s+new mexico)?|arlington(?:\s*,?\s*va|\s+virginia)?|alexandria(?:\s*,?\s*va|\s+virginia)?|reston|mclean|bethesda|silver spring|rockville|annapolis|frederick(?:\s*,?\s*md|\s+maryland)?|hagerstown|cumberland(?:\s*,?\s*md|\s+maryland)?|wheeling|winston[- ]salem|roanoke(?:\s*,?\s*va|\s+virginia)?|boca raton|manchester|syracuse|worcester|nashua|jersey city|princeton|asheville|exclusively\s+remote|100\s*%?\s*remote|100\s+percent\s+remote|no\s+in[- ]person|cyber[- ]only|internet[- ]only|distributed\s+team)\b/i;

/**
 * True when free text explicitly names a non-SF city/region.
 * Shared by isSfLocation + chat offline gate (do not re-list cities in chat).
 */
export function mentionsNonSf(text) {
  const t = String(text || '');
  if (/\b(?:outside|near)\s+(?:of\s+)?san francisco\b/i.test(t)) return true;
  // Explicit US state outside California is never SF (covers cities not listed in NON_SF).
  if (/\b(?:A[KLRSZ]|C[OT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY]|tx)\b/.test(t)) return true;
  if (/,\s*(?:A[KLRSZ]|C[OT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])\b/i.test(t)) return true;
  if (/,\s*(?:alabama|alaska|arizona|arkansas|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i.test(t)) return true;
  if (/\bcambridge\b/i.test(t)) return true;
  if (/\bstreaming[- ]only\b/i.test(t)) return true;
  if (/\bwebinar\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:bluejeans|go\s*to\s*meeting)\s+(?:meetup|event|webinar|call|session|room)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:san mateo|alameda|contra costa|marin|solano|santa clara) county\b/i.test(t)) return true;
  if (/\brossmoor\b/i.test(t)) return true;
  if (/\b(?:south city|san gregorio|la honda|loma mar|davenport|tomales|nicasio|san geronimo|lagunitas|woodacre|dillon beach|marshall(?:,? ca)?|olema|mare island|moss landing|bay point|pacheco|treasure island,? florida)\b/i.test(t)) return true;
  if (/\btwitch(?:[- ]only|\s+(?:live|stream|meetup|event|hang|night|call|session))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\btik\s*tok(?:[- ]only|\s+(?:live|stream|meetup|event|hang|night|call|session))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:instagram|facebook)\s+live(?:[- ]only|\s+(?:stream|meetup|event|hang|night|call|session))?\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\blinkedin\s+live(?:[- ]only|\s+(?:stream|meetup|event|hang|night|call|session))?\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/^\s*(?:zoom|google\s+meet|webex|skype|facetime|microsoft\s+teams|teams|discord|slack)\s*$/i.test(t)) return true;
  // hang|night closes residual-14 ("Slack hang only", "Discord night only")
  const implicitRemote = /\b(?:discord|facetime|gather(?:\.town)?|hangouts|online|skype|slack|youtube\s+live|zoom|(?:microsoft\s+)?teams)\s+(?:meetup|event|webinar|call|session|room|server|hang|huddle|night)\b/i.test(t);
  // "only on Slack/Discord/…" is remote-first even if an SF room is named
  const onlyOnRemote = /\bonly\s+on\s+(?:slack|discord|teams|zoom|webex|skype|facetime|hangouts)\b/i.test(t);
  const geoText = SF_OK.test(t) && /\b(room|loft|venue|space|office|library|gallery|warehouse|park|lawn)\b/i.test(t)
    ? t.replace(/\blivestream\s+(?:meetup|event|hang|night|call|session|webinar)\b/gi, '')
    : t;
  return (
    /\bangel island\b/i.test(t) ||
    (/\b(?:google\s+meet|webex)\s+(?:meetup|event|webinar|call|session|room|hang|night)\b/i.test(t) && !SF_OK.test(t)) ||
    onlyOnRemote ||
    (implicitRemote && !SF_OK.test(t)) ||
    NON_SF.test(geoText.trim())
  );
}

export function isSfLocation(text) {
  const t = String(text || '').trim();
  if (!t) return true; // empty → default SF
  // Reject non-SF cities even if "SF audience" appears later (Codex P1)
  if (mentionsNonSf(t)) return false;
  if (SF_OK.test(t)) return true;
  // Bare street address without SF neighborhood cue → reject (not event titles like "rooftop party")
  if (/\b\d{1,5}\s+[\w.'-]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|way|dr|drive|ln|lane|ct|court|pl|place|ter|terrace|pkwy|parkway|cir|circle|hwy|highway)\b/i.test(t)) {
    return false;
  }
  // Place-only tokens (not full event titles) without SF cue
  if (/^(the\s+)?(rooftop|venue|loft|space|gallery|warehouse)\s*$/i.test(t)) return false;
  return true; // generic titles/outcomes default to SF (product is SF-only)
}

/** Curated free / low-friction SF gathering options (research seed — not a booking API). */
export const FREE_SF_VENUES = [
  { id: 'v_mission_library', name: 'Mission Branch Library meeting room', area: 'Mission', capacity: 20, cost: 'free (reserve)', notes: 'SFPL room request; good for talks/salons', tags: ['salon','talk','indoor'] },
  { id: 'v_main_library', name: 'SF Main Library / Civic Center meeting room', area: 'Civic Center', capacity: 30, cost: 'free (reserve)', notes: 'SFPL Main Library rooms; talks/salons; reserve via SFPL', tags: ['salon','talk','indoor','library'] },
  { id: 'v_soma_parklet', name: 'South Park lawn / parklet hang', area: 'SoMa', capacity: 25, cost: 'free public', notes: 'Weather-dependent; soft social / picnic', tags: ['social','outdoor','picnic'] },
  { id: 'v_yerba_buena', name: 'Yerba Buena Gardens edge meetup', area: 'SoMa', capacity: 35, cost: 'free public', notes: 'Soft outdoor hang near Moscone; no exclusive use', tags: ['outdoor','social','meetup'] },
  { id: 'v_embarcadero_bench', name: 'Embarcadero promenade meetup point', area: 'Embarcadero', capacity: 40, cost: 'free public', notes: 'Walk-and-talk start; no exclusive use', tags: ['walk','outdoor','networking'] },
  { id: 'v_hayes_green', name: 'Patricia\'s Green / Hayes Valley open space', area: 'Hayes Valley', capacity: 30, cost: 'free public', notes: 'Daytime preferred; loud evenings', tags: ['outdoor','daytime'] },
  { id: 'v_dolores', name: 'Mission Dolores Park edge meetup', area: 'Mission', capacity: 50, cost: 'free public', notes: 'Large soft hang; bring blankets', tags: ['outdoor','party','picnic'] },
  { id: 'v_ferry_arcade', name: 'Ferry Building arcade / plaza edge', area: 'Embarcadero', capacity: 20, cost: 'free public (no exclusive)', notes: 'Short meetups; food nearby for sponsor tab', tags: ['meetup','food'] },
  { id: 'v_crissy', name: 'Crissy Field / Marina Green meetup', area: 'Marina / Presidio', capacity: 40, cost: 'free public', notes: 'Walk-and-talk start; weather-dependent; no exclusive use', tags: ['walk','outdoor','meetup','networking'] },
  { id: 'v_salesforce_park', name: 'Salesforce Park / Transit Center roof garden edge', area: 'SoMa', capacity: 30, cost: 'free public', notes: 'Elevated soft hang near Salesforce Tower; hours vary; no exclusive use', tags: ['outdoor','social','meetup','daytime'] },
  { id: 'v_cafe_sponsor', name: 'Sponsor-hosted café buyout (ask)', area: 'SF various', capacity: 15, cost: 'sponsor tab', notes: 'Bot queues café/sponsor ask; not free but zero host cash', tags: ['indoor','dinner','sponsor'] },
  { id: 'v_office_loan', name: 'Startup office after-hours loan', area: 'SoMa / Mission', capacity: 40, cost: 'in-kind', notes: 'Queue outreach to founder offices with spare room', tags: ['indoor','demo','showcase'] },
];

/**
 * Neighborhood clusters for free-list area affinity (draft match only).
 * Need token → tokens that count as a hit on venue area/name/notes.
 */
const AREA_NEAR = {
  soma: ['soma', 'yerba', 'south park', 'moscone'],
  mission: ['mission', 'dolores', 'bernal', 'noe', 'valencia'],
  valencia: ['valencia', 'mission', 'dolores'],
  castro: ['castro', 'mission', 'dolores', 'noe'],
  hayes: ['hayes', 'haight'],
  haight: ['haight', 'hayes'],
  embarcadero: ['embarcadero', 'ferry', 'fidi', 'financial', 'civic'],
  ferry: ['ferry', 'embarcadero', 'fidi', 'financial'],
  fidi: ['fidi', 'financial', 'embarcadero', 'ferry', 'fi di'],
  fdi: ['fidi', 'financial', 'embarcadero', 'ferry'],
  financial: ['financial', 'fidi', 'embarcadero', 'ferry'],
  fi: ['fidi', 'financial', 'embarcadero', 'ferry'],
  dogpatch: ['dogpatch', 'potrero', 'mission'],
  potrero: ['potrero', 'dogpatch', 'mission', 'soma'],
  richmond: ['richmond'],
  sunset: ['sunset'],
  marina: ['marina', 'presidio', 'crissy'],
  presidio: ['presidio', 'marina', 'crissy'],
  crissy: ['crissy', 'marina', 'presidio'],
  dolores: ['dolores', 'mission', 'bernal'],
  bernal: ['bernal', 'mission', 'dolores'],
  noe: ['noe', 'mission', 'castro', 'dolores'],
  'noe valley': ['noe', 'mission', 'castro', 'dolores'],
  tenderloin: ['tenderloin', 'civic', 'main library', 'market'],
  'glen park': ['glen park', 'mission', 'bernal'],
  civic: ['civic', 'main library', 'market', 'tenderloin'],
  'north beach': ['north beach', 'embarcadero', 'chinatown'],
  chinatown: ['chinatown', 'north beach', 'union square'],
  'union square': ['union square', 'chinatown', 'civic'],
};

/** True when need-area token matches venue area/blob (incl. near-neighborhood aliases). */
function areaMatchesNeed(needTok, areaL, blob) {
  const tok = String(needTok || '')
    .toLowerCase()
    .replace(/^fidi$/, 'fidi')
    .replace(/^fdi$/, 'fidi')
    .replace(/^fi$/, 'fidi');
  const hay = (areaL + ' ' + blob).toLowerCase();
  if (hay.includes(tok)) return true;
  const near = AREA_NEAR[tok] || AREA_NEAR[needTok?.toLowerCase?.()] || [tok];
  return near.some((n) => n && hay.includes(n));
}

/** Resource outreach drain order (higher = drain first). Draft-only queue — never claims send. */
export const OUTREACH_KIND_PRIORITY = {
  venue: 100,
  sponsor: 90,
  volunteer: 80,
  resource: 70,
  rsvp_remind_t3d: 50,
  rsvp_remind_t1d: 45,
  thanks: 30,
  feedback_ask: 20,
  other: 10,
};

/** Extra priority when a resource gap is still open (draft drain order only). */
const GAP_KIND_BOOST = { venue: 30, sponsor: 22, volunteer: 18, resource: 10 };

/** SF-stamp a location string for invite paste (neighborhood → ", San Francisco"). */
function stampSfWhere(raw) {
  let where = clamp(raw || 'San Francisco', 120);
  if (!isSfLocation(where)) return { ok: false, where };
  if (!/\b(san francisco|sf\b)/i.test(where) && !SF_OK.test(where)) {
    where = clamp(where + ', San Francisco', 120);
  } else if (!/\bsan francisco\b/i.test(where) && SF_OK.test(where)) {
    where = clamp(where + ', San Francisco', 120);
  }
  return { ok: true, where };
}

/**
 * Shared invite body for Partiful + Luma paste packages (never claims published).
 */
function buildInviteDescription(args = {}, ae = {}, seats = 0) {
  const outcome = clamp(args.outcome || ae.outcome || '', 400);
  const agenda = clamp(args.agenda || ae.agenda || '', 800);
  let description = clamp(args.description || '', 1800);
  if (!description) {
    const bits = [];
    if (outcome) bits.push(outcome);
    if (agenda) bits.push('Agenda:\n' + agenda);
    if (seats) bits.push('Target seats: ~' + seats + ' (RSVP counts stay empty until real yeses).');
    bits.push('San Francisco in-person only. Mutual yes before any intros.');
    description = bits.join('\n\n');
  }
  if (!description.includes('Events Bot (by Demigod)')) {
    description = clamp(description, 1700) + '\n\n' + IDENTITY_BLURB;
  } else {
    description = clamp(description, 2000);
  }
  return description;
}

/**
 * Partiful-ready draft (no official API — never claims published/sent).
 * Fills sparse args from active event; SF-gates `where`; pure (no store write).
 * Export: pasteText + exportText + fields for human form fill; outbox path optional at tool layer.
 */
export function buildPartifulDraft(args = {}, ae = {}) {
  const title = clamp(args.title || ae.title || '', 120);
  if (!title) return { ok: false, error: 'title_required' };

  const whereRaw =
    args.where || ae.venue?.name || ae.venue?.area || ae.city || 'San Francisco';
  const stamped = stampSfWhere(whereRaw);
  if (!stamped.ok) {
    return {
      ok: false,
      error: 'sf_only',
      message: 'Partiful where must be San Francisco (in-person SF only).',
      where: stamped.where,
    };
  }
  const where = stamped.where;

  const when = clamp(
    args.when || (Array.isArray(ae.dateWindows) && ae.dateWindows[0]) || ae.when || 'TBD (SF evening)',
    120,
  );
  const seats = Number(args.seats) || Number(ae.seats) || 0;
  const description = buildInviteDescription(args, ae, seats);

  const pasteText = [title, when, where, '', description].join('\n');
  const exportText = [
    '=== PARTIFUL PASTE PACKAGE (draft only — no publish claim) ===',
    'Title: ' + title,
    'When:  ' + when,
    'Where: ' + where,
    'TZ:    America/Los_Angeles',
    seats ? 'Seats: ~' + seats + ' (leave RSVP counts empty until real yeses)' : 'Seats: TBD',
    '',
    '--- Description ---',
    description,
    '',
    '--- Host checklist ---',
    '1. Open https://partiful.com → Create invite',
    '2. Paste Title + Description',
    '3. Set When/Where (SF); RSVP on; counts empty until real',
    '4. After Partiful shows a real https URL, paste it on the Invite URL line below (do not invent)',
    '5. Share via outreach queue drafts only (no auto-send)',
    '',
    '--- After publish (real partiful.com URL only; leave blank until then) ---',
    'Invite URL: ',
    '',
    'Guest frame: Founders + eng / warm SF network — mutual yes before intros',
  ].join('\n');

  const draft = {
    title,
    description,
    when,
    where,
    pasteText,
    exportText,
    fields: {
      title,
      when,
      where,
      timezone: 'America/Los_Angeles',
      description,
      capacity: seats || null,
    },
    seats: seats || null,
    capacityNote: seats
      ? 'Aim for ~' + seats + ' RSVPs; never invent confirmed/attended counts'
      : 'RSVP counts stay empty until real yeses — no fake totals',
    guestFrame: 'Founders + eng / warm SF network — mutual yes before intros',
    steps: [
      'Open https://partiful.com → Create invite (app or web)',
      'Paste title + description (includes Events Bot identity)',
      'Set when/where (SF); enable RSVP tracking — leave counts empty until real',
      'When Partiful gives a real URL, record it — never invent RSVP counts',
      'Share link via Events Bot outreach queue (draft only; no auto-send)',
    ],
    note: 'No official Partiful API — draft only (browser/manual). Never mark published without a real Partiful URL.',
    status: 'draft',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    platform: 'partiful',
  };
  return { ok: true, draft };
}

/**
 * Luma paste/API draft package — always SF; never invents published URL or RSVPs.
 * Pure (no IO). When API key missing, host pastes from exportText.
 */
export function buildLumaDraft(args = {}, ae = {}) {
  const title = clamp(args.title || ae.title || '', 120);
  if (!title) return { ok: false, error: 'title_required' };
  const whereRaw =
    args.location || args.where || ae.venue?.name || ae.city || 'San Francisco, CA';
  const stamped = stampSfWhere(whereRaw);
  if (!stamped.ok) {
    return {
      ok: false,
      error: 'sf_only',
      message: 'Luma location must be San Francisco (in-person SF only).',
      where: stamped.where,
    };
  }
  const where = stamped.where;
  const when = clamp(
    args.when || (Array.isArray(ae.dateWindows) && ae.dateWindows[0]) || ae.when || 'TBD (SF evening)',
    120,
  );
  const seats = Number(args.seats) || Number(ae.seats) || 0;
  const description = buildInviteDescription(args, ae, seats);
  const startAt = args.startAt || args.start_at || null;
  const endAt = args.endAt || args.end_at || null;
  const pasteText = [title, when, where, '', description].join('\n');
  // FOCUS Partiful/Luma draft: blank Invite URL line so human paste → outbox drain absorbs
  // (same marker as Partiful; pickInviteUrlFromOutboxText / stampInviteUrlIntoExport).
  const exportText = [
    '=== LUMA PASTE / API PACKAGE (draft only — no publish claim) ===',
    'Title:    ' + title,
    'When:     ' + when,
    'Location: ' + where,
    'TZ:       America/Los_Angeles',
    startAt ? 'start_at: ' + startAt : 'start_at: (set in Luma UI)',
    endAt ? 'end_at:   ' + endAt : 'end_at:   (optional)',
    seats ? 'Guests:   ~' + seats + ' (never invent confirmed counts)' : 'Guests:   TBD',
    '',
    '--- Description ---',
    description,
    '',
    '--- Host checklist ---',
    '1. Open https://lu.ma → New event  OR  use LUMA_API_KEY when Plus calendar key exists',
    '2. Paste Title + Description; location San Francisco',
    '3. Set start time America/Los_Angeles; leave guest counts empty until real',
    '4. After Luma shows a real https URL, paste it on the Invite URL line below (do not invent)',
    '5. Share via outreach queue drafts only (no auto-send)',
    '',
    '--- After publish (real lu.ma / luma.com URL only; leave blank until then) ---',
    'Invite URL: ',
    '',
    'Guest frame: Founders + eng / warm SF network — mutual yes before intros',
  ].join('\n');
  return {
    ok: true,
    draft: {
      title,
      description,
      when,
      where,
      location: where,
      start_at: startAt,
      end_at: endAt,
      timezone: 'America/Los_Angeles',
      pasteText,
      exportText,
      fields: {
        title,
        description,
        location: where,
        timezone: 'America/Los_Angeles',
        start_at: startAt,
        end_at: endAt,
        capacity: seats || null,
      },
      seats: seats || null,
      status: 'draft',
      city: 'San Francisco',
      platform: 'luma',
      note: 'Draft only until real Luma URL or successful API create. Never invent RSVPs.',
    },
  };
}

/** True for real Partiful/Luma invite URLs — never invent; fail-closed. */
export function isRealInviteUrl(url, platform) {
  const u = String(url || '')
    .trim()
    .toLowerCase();
  if (!/^https:\/\/[^\s]+$/i.test(String(url || '').trim())) return false;
  if (/example\.com|localhost|127\.0\.0\.1|placeholder|todo|tbd|fake/i.test(u)) return false;
  const p = String(platform || '').toLowerCase();
  if (p === 'partiful' || !p) {
    if (/^https:\/\/(www\.)?partiful\.com\/.+/i.test(u)) return true;
  }
  if (p === 'luma' || !p) {
    if (/^https:\/\/(www\.)?(lu\.ma|luma\.com)\/.+/i.test(u)) return true;
  }
  return false;
}

/**
 * If a real invite URL is already recorded, stamp it into paste exportText.
 * Fresh drafts keep blank `Invite URL:` for human drain; re-draft must not wipe a real URL.
 * Pure. Never invents a URL.
 */
export function stampInviteUrlIntoExport(exportText, url, platform) {
  const u = String(url || '').trim();
  if (!u || !isRealInviteUrl(u, platform)) return String(exportText || '');
  let out = String(exportText || '');
  if (/^Invite URL:\s*$/m.test(out)) {
    out = out.replace(/^Invite URL:\s*$/m, 'Invite URL: ' + u);
  } else if (/^Invite URL:\s+\S/m.test(out)) {
    out = out.replace(/^Invite URL:\s+\S.*/m, 'Invite URL: ' + u);
  } else if (!/^Invite URL:/m.test(out)) {
    out = out.replace(/\s*$/, '') + '\n\nInvite URL: ' + u + '\n';
  }
  if (!/RECORDED URL/i.test(out)) {
    out =
      out.replace(/\s*$/, '') +
      '\n\n--- RECORDED URL ---\n' +
      u +
      '\n(status: published_url — no RSVP invent)';
  }
  return out;
}

/**
 * Pure-ish: count outbox filenames that look like fixture packages (cheap, no content read).
 */
export function countFixtureOutboxNames({ outboxDir = eventsOutboxPath() } = {}) {
  let names = 0;
  let total = 0;
  if (!fs.existsSync(outboxDir)) return { ok: true, total, names, outboxDir };
  try {
    for (const name of fs.readdirSync(outboxDir)) {
      if (!/\.(txt|json)$/i.test(name)) continue;
      total++;
      if (/\bfogline\b|\bselftest\b|\bfixture\b/i.test(name)) names++;
    }
  } catch {
    return { ok: false, total, names, outboxDir };
  }
  return { ok: true, total, names, outboxDir };
}

/**
 * Delete aged outbox paste packages that are not published_url with a real invite.
 * Shrinks historical selftest/drive churn without touching live recorded URLs.
 */
export function pruneStaleOutboxFiles({
  outboxDir = eventsOutboxPath(),
  maxAgeMs = 3 * 60 * 60 * 1000,
  maxDelete = 3000,
  now = Date.now(),
} = {}) {
  let scanned = 0;
  let deleted = 0;
  if (!fs.existsSync(outboxDir)) return { ok: true, scanned, deleted, outboxDir };
  let names = [];
  try {
    names = fs.readdirSync(outboxDir);
  } catch {
    return { ok: false, scanned, deleted, outboxDir, error: 'readdir_failed' };
  }
  for (const name of names) {
    if (!/\.(txt|json)$/i.test(name)) continue;
    scanned++;
    if (deleted >= maxDelete) break;
    const p = path.join(outboxDir, name);
    try {
      const st = fs.statSync(p);
      if (now - st.mtimeMs < maxAgeMs) continue;
      // Keep packages that still look like a real recorded invite URL
      const body = fs.readFileSync(p, 'utf8').slice(0, 8000);
      if (/published_url/i.test(body) && /https:\/\/(www\.)?(partiful\.com|lu\.ma|luma\.com)\//i.test(body)) {
        continue;
      }
      fs.unlinkSync(p);
      deleted++;
    } catch {
      /* skip */
    }
  }
  return { ok: true, scanned, deleted, outboxDir, capped: deleted >= maxDelete, maxAgeMs };
}

/**
 * Remove fixture/selftest/Fogline paste packages from outbox (prod hygiene).
 * Bounded delete per call so drain ticks stay cheap. Never invents URLs.
 */
export function purgeFixtureOutboxFiles({ outboxDir = eventsOutboxPath(), maxDelete = 2000 } = {}) {
  let scanned = 0;
  let deleted = 0;
  if (!fs.existsSync(outboxDir)) return { ok: true, scanned, deleted, outboxDir };
  let names = [];
  try {
    names = fs.readdirSync(outboxDir);
  } catch {
    return { ok: false, scanned, deleted, outboxDir, error: 'readdir_failed' };
  }
  // Fixture brand + standing selftest package titles that flooded prod outbox
  const fixRe =
    /\bfogline\b|\bselftest\b|\bfixture\b|\bidempotent\s+(night|luma)\b|\bluma url preservation\b|\btick export night\b|\burl record night\b|\bguard check\b|\bindoor salon dinner\b|\bnew sf night\b|\boffer match\b/i;
  for (const name of names) {
    if (!/\.(txt|json)$/i.test(name)) continue;
    scanned++;
    if (deleted >= maxDelete) break;
    if (fixRe.test(name)) {
      try {
        fs.unlinkSync(path.join(outboxDir, name));
        deleted++;
      } catch {
        /* skip locked */
      }
      continue;
    }
    try {
      const body = fs.readFileSync(path.join(outboxDir, name), 'utf8').slice(0, 6000);
      if (fixRe.test(body)) {
        fs.unlinkSync(path.join(outboxDir, name));
        deleted++;
      }
    } catch {
      /* skip */
    }
  }
  return { ok: true, scanned, deleted, outboxDir, capped: deleted >= maxDelete };
}

/** Pure: draft id from outbox filename (partiful-pf_x.json → pf_x). */
export function outboxDraftIdFromName(name) {
  const base = String(name || '')
    .replace(/\.(txt|json)$/i, '')
    .trim();
  if (!base) return '';
  if (base.startsWith('partiful-')) return base.slice('partiful-'.length);
  if (base.startsWith('luma-')) return base.slice('luma-'.length);
  if (base.startsWith('invite-')) return base.slice('invite-'.length);
  return base;
}

/** Pure: platform + outreach ids referenced by store (orphan filter). */
export function collectOutboxStoreRefs(store) {
  const refs = new Set();
  const plats = store?.platforms || {};
  for (const kind of ['partiful', 'luma']) {
    for (const p of plats[kind] || []) {
      if (p && p.id) refs.add(String(p.id));
    }
  }
  for (const o of store?.outreach || []) {
    if (o && o.id) refs.add(String(o.id));
  }
  return refs;
}

/**
 * Delete outbox packages whose draft id is not in store platforms/outreach.
 * Completes fixture purge for real-looking residual titles (FABLE P0-1 store-ref filter).
 * Store refs are SoR — unreferenced packages go (including stale selftest published_url residue).
 * Bounded. Never invents URLs.
 */
export function purgeOrphanOutboxFiles({
  store,
  outboxDir = eventsOutboxPath(),
  maxDelete = 2000,
} = {}) {
  let scanned = 0;
  let deleted = 0;
  let keptReferenced = 0;
  if (!fs.existsSync(outboxDir)) {
    return { ok: true, scanned, deleted, keptReferenced, outboxDir };
  }
  const refs = collectOutboxStoreRefs(store || {});
  let names = [];
  try {
    names = fs.readdirSync(outboxDir);
  } catch {
    return {
      ok: false,
      scanned,
      deleted,
      keptReferenced,
      outboxDir,
      error: 'readdir_failed',
    };
  }
  for (const name of names) {
    if (!/\.(txt|json)$/i.test(name)) continue;
    scanned++;
    if (deleted >= maxDelete) break;
    const id = outboxDraftIdFromName(name);
    if (id && refs.has(id)) {
      keptReferenced++;
      continue;
    }
    const p = path.join(outboxDir, name);
    try {
      fs.unlinkSync(p);
      deleted++;
    } catch {
      /* skip locked */
    }
  }
  return {
    ok: true,
    scanned,
    deleted,
    keptReferenced,
    outboxDir,
    refCount: refs.size,
    capped: deleted >= maxDelete,
  };
}

/** Write paste package to events-bot-outbox (json + txt). Never claims sent. */
export function writeInviteExport(kind, draft) {
  if (!draft || !draft.title) return null;
  // Never write Fogline/selftest packages to prod outbox (MOCK selftest may still write)
  if (isSelftestInviteDraft(draft) && process.env.DEMIGOD_EVENTS_BOT_MOCK !== '1') {
    return null;
  }
  try {
    const outbox = eventsOutboxPath();
    fs.mkdirSync(outbox, { recursive: true });
    const id = draft.id || uid((kind || 'inv') + '_');
    const base = path.join(outbox, String(kind || 'invite') + '-' + id);
    const platform =
      kind === 'luma' || kind === 'partiful'
        ? kind
        : String(draft.platform || '').toLowerCase() === 'luma'
          ? 'luma'
          : 'partiful';
    // Re-draft must keep a real recorded invite URL in the outbox (FOCUS Partiful draft).
    const kept = draft.inviteUrl || draft.publishedUrl || null;
    if (kept && isRealInviteUrl(kept, platform)) {
      draft.exportText = stampInviteUrlIntoExport(
        draft.exportText || draft.pasteText || '',
        kept,
        platform,
      );
    }
    const payload = { ...draft, id, exportedAt: new Date().toISOString() };
    fs.writeFileSync(base + '.json', JSON.stringify(payload, null, 2));
    fs.writeFileSync(base + '.txt', draft.exportText || draft.pasteText || '');
    return { id, json: base + '.json', txt: base + '.txt' };
  } catch {
    return null;
  }
}

/**
 * Stamp a real published invite URL onto a Partiful/Luma draft row.
 * Pure-ish mutates list in place. Never invents URL or RSVP counts.
 * @returns {{ ok, error?, draft?, platform? }}
 */
/**
 * Pure: host evidence language → debrief count fields.
 * "attended 9, 4 mutual pairs" → {attended:9, mutualInterestPairs:4}
 * Questions / no digits → null (never invent).
 */
export function parseDebriefEvidence(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;
  const t = raw.toLowerCase();
  // Chit-chat / how-to without attested numbers
  if (/\bwhat (happens|is|does)\b[\s\S]{0,40}\bdebrief\b/.test(t)) return null;
  if (/\bhow (do|does|should|many)\b[\s\S]{0,40}\b(debrief|attendance|rsvp|attended)\b/.test(t) && !/\d/.test(raw)) {
    return null;
  }
  if (/\?/.test(raw) && !/\d/.test(raw)) return null;

  const out = {};
  let hit = false;
  const take = (key, patterns) => {
    for (const re of patterns) {
      const m = raw.match(re);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isInteger(n) && n >= 0) {
        out[key] = n;
        hit = true;
        return;
      }
    }
  };
  take('attended', [
    /\battended\s*[:=]?\s*(\d+)\b/i,
    /\b(\d+)\s+(?:people\s+)?attended\b/i,
    /\battendance\s*[:=]?\s*(\d+)\b/i,
  ]);
  take('invited', [/\binvited\s*[:=]?\s*(\d+)\b/i, /\b(\d+)\s+invited\b/i]);
  take('confirmed', [/\bconfirmed\s*[:=]?\s*(\d+)\b/i, /\b(\d+)\s+confirmed\b/i]);
  take('mutualInterestPairs', [
    /\b(\d+)\s+mutual(?:\s+interest)?\s+pairs?\b/i,
    /\bmutual(?:\s+interest)?\s+pairs?\s*[:=]?\s*(\d+)\b/i,
  ]);
  take('secondMeetings', [
    /\b(\d+)\s+second\s+meetings?\b/i,
    /\bsecond\s+meetings?\s*[:=]?\s*(\d+)\b/i,
  ]);
  return hit ? out : null;
}

/**
 * Host-attested post-night outcomes. Never invents zeros for omitted fields.
 * Only at followup|debrief; rejected in auto autonomy (host must attest).
 * @returns {{ ok, error?, outcomes?, debrief?, stage? }}
 */
export function recordDebrief(store, args = {}, opts = {}) {
  const autonomy = String(opts.mode || process.env.DEMIGOD_EVENTS_AUTONOMY || 'draft').toLowerCase();
  if (autonomy === 'auto') {
    return {
      ok: false,
      error: 'host_attested_only',
      message: 'record_debrief rejected in auto mode — host must attest real counts',
    };
  }
  const ae = store?.activeEvent;
  if (!ae || !ae.id) {
    return { ok: false, error: 'no_active_event', message: 'No active event to debrief' };
  }
  const stage = normalizeStage(ae.stage) || 'ideate';
  const si = STAGES.indexOf(stage);
  const minSi = STAGES.indexOf('followup');
  if (si < 0 || si < minSi) {
    return {
      ok: false,
      error: 'stage_too_early',
      message: 'record_debrief only at followup|debrief (not before followup)',
      stage,
    };
  }
  const COUNT_KEYS = ['invited', 'confirmed', 'attended', 'mutualInterestPairs', 'secondMeetings'];
  const updates = {};
  for (const k of COUNT_KEYS) {
    if (args[k] === undefined || args[k] === null || args[k] === '') continue;
    const n = typeof args[k] === 'number' ? args[k] : Number(String(args[k]).trim());
    if (!Number.isInteger(n) || n < 0) {
      return {
        ok: false,
        error: 'invalid_count',
        field: k,
        message: `${k} must be integer ≥0 (omit to leave null — never invent zeros)`,
      };
    }
    updates[k] = n;
  }
  const notes = clamp(args.notes || args.debrief || '', 2000);
  if (!Object.keys(updates).length && !notes) {
    return {
      ok: false,
      error: 'empty_debrief',
      message: 'Provide at least one real count or notes',
    };
  }
  const counts = { ...(ae.outcomes || {}), ...updates };
  for (const [larger, smaller] of [
    ['invited', 'confirmed'],
    ['confirmed', 'attended'],
    ['invited', 'attended'],
  ]) {
    if (counts[larger] != null && counts[smaller] != null && counts[smaller] > counts[larger]) {
      return {
        ok: false,
        error: 'inconsistent_counts',
        field: smaller,
        message: `${smaller} cannot exceed ${larger}`,
      };
    }
  }
  ae.outcomes = ae.outcomes && typeof ae.outcomes === 'object' ? ae.outcomes : {};
  for (const k of COUNT_KEYS) {
    if (ae.outcomes[k] === undefined) ae.outcomes[k] = null;
  }
  for (const [k, v] of Object.entries(updates)) {
    ae.outcomes[k] = v;
  }
  const at = new Date().toISOString();
  ae.outcomes.debriefAt = at;
  if (notes) {
    ae.debrief = notes;
    ae.debriefNotes = notes;
  }
  ae.updatedAt = at;
  syncActiveEventToList(store);
  return {
    ok: true,
    stage,
    outcomes: { ...ae.outcomes },
    debrief: ae.debrief || null,
    recorded: Object.keys(updates),
  };
}

/**
 * Pure: host language asking to seed the next SF cycle after debrief.
 * "seed the next night" / "spin the next cycle from debrief" → {ok:true, title?}
 * Questions / co-pilot chit-chat → null.
 */
export function parseSeedNextIntent(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const t = raw.toLowerCase();
  // Questions without imperative seed language
  if (/\?/.test(raw) && !/\b(seed|spin|start|clear)\b/.test(t)) return null;
  if (/\bwhat (happens|is|does)\b[\s\S]{0,40}\b(next|debrief)\b/.test(t)) return null;
  if (/\bhow (do|does|should)\b[\s\S]{0,40}\b(seed|next)\b/.test(t)) return null;
  const wants =
    /\bseed (the |a |an )?(next|following)\b/.test(t) ||
    /\bspin (the |a |an )?(next|following)\b/.test(t) ||
    /\bstart (the |a |an )?next (sf )?(night|cycle|event|salon)\b/.test(t) ||
    /\bnext (sf )?(night|cycle) from (this |the )?debrief\b/.test(t) ||
    /\bclose (the |this )?(loop|night|cycle)\b/.test(t) ||
    /\barchive (and |& )?(seed|start) (the )?next\b/.test(t) ||
    /\bclear active( event)?\b/.test(t);
  if (!wants) return null;
  const out = {};
  // Optional title: seed next "Mission salon" / titled Next Mission
  const mQ = raw.match(/\b(?:seed|spin|start)\s+(?:the\s+)?next\s+["“']([^"”']{3,80})["”']/i);
  const mAs = raw.match(/\b(?:titled|title|called|named)\s+["“']?([^"”'\n.]{3,80})["”']?/i);
  if (mQ) out.title = mQ[1].trim();
  else if (mAs) out.title = mAs[1].trim();
  return out;
}

/**
 * After a real debrief: archive night, record next SF idea, clear activeEvent.
 * Never invents attendance — requires debrief evidence first.
 */
export function seedNextFromDebrief(store, args = {}) {
  const ae = store?.activeEvent;
  if (!ae || !ae.id) {
    return { ok: false, error: 'no_active_event', message: 'No active night to seed from' };
  }
  const stage = normalizeStage(ae.stage) || 'ideate';
  if (stage !== 'debrief') {
    return {
      ok: false,
      error: 'stage_not_debrief',
      message: 'seed_next_from_debrief only at debrief stage',
      stage,
    };
  }
  const hasEvidence = !!(
    ae.debrief ||
    ae.debriefNotes ||
    ae.outcomes?.debriefAt ||
    ae.outcomes?.attended != null ||
    ae.outcomes?.confirmed != null ||
    ae.outcomes?.invited != null
  );
  if (!hasEvidence) {
    return {
      ok: false,
      error: 'need_debrief_evidence',
      message: 'record_debrief first (host-attested counts/notes) — never invent attendance',
    };
  }
  const nextTitle = clamp(
    args.title || `Next SF night after ${ae.title || 'last night'}`,
    120,
  );
  if (selftestTitleBlocked(nextTitle)) {
    return {
      ok: false,
      error: 'selftest_title_blocked',
      message: 'Next title looks like selftest/fixture — refused outside MOCK=1',
    };
  }
  if (!isSfLocation([nextTitle, args.outcome, args.needs, 'San Francisco'].join(' '))) {
    return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
  }
  // Archive current night into events[]
  syncActiveEventToList(store);
  const fromEventId = ae.id;
  const at = new Date().toISOString();
  store.ideas = Array.isArray(store.ideas) ? store.ideas : [];
  const nt = normTitle(nextTitle);
  let idea = store.ideas.find((i) => i && normTitle(i.title) === nt) || null;
  let deduped = false;
  if (idea) {
    deduped = true;
    idea.fromEventId = idea.fromEventId || fromEventId;
    idea.source = idea.source || 'debrief_seed';
  } else {
    idea = {
      id: uid('idea_'),
      title: nextTitle,
      format: clamp(args.format || 'follow-on salon', 80),
      outcome: clamp(
        args.outcome || ae.outcome || 'Continue SF nights from real debrief only',
        400,
      ),
      seats: Number(args.seats) || ae.seats || 8,
      needs: clamp(args.needs || 'SF venue + guests from last debrief', 400),
      city: 'San Francisco',
      source: 'debrief_seed',
      fromEventId,
      at,
    };
    store.ideas.push(idea);
    while (store.ideas.length > 200) store.ideas.shift();
  }
  // Clear active — empty ideate shell (no fake spin)
  store.activeEvent = {
    id: null,
    title: '',
    stage: 'ideate',
    city: 'San Francisco',
    clearedFrom: fromEventId,
    clearedAt: at,
    note: 'Seeded next idea from debrief — spin_up_event to start the next SF night',
  };
  // Offer recycle: unlink matched rows from archived night so next stamp can rematch.
  // Leave accepted/declined/rejected (real partner history).
  let recycledOffers = 0;
  store.offers = store.offers || { sponsor: [], venue: [], volunteer: [] };
  for (const kind of ['sponsor', 'venue', 'volunteer']) {
    const list = store.offers[kind] || [];
    for (const o of list) {
      if (!o || o.eventId !== fromEventId) continue;
      const st = String(o.status || '').toLowerCase();
      if (st === 'accepted' || st === 'declined' || st === 'rejected') continue;
      o.eventId = null;
      if (st === 'matched') o.status = 'new';
      recycledOffers += 1;
    }
  }
  return {
    ok: true,
    idea,
    deduped,
    clearedEventId: fromEventId,
    recycledOffers,
    activeEvent: store.activeEvent,
  };
}

export function recordInviteUrl(store, args = {}) {
  const platform = String(args.platform || args.kind || 'partiful')
    .trim()
    .toLowerCase();
  if (platform !== 'partiful' && platform !== 'luma') {
    return { ok: false, error: 'platform_must_be_partiful_or_luma' };
  }
  const url = clamp(cleanInviteUrlCandidate(args.url || args.inviteUrl || ''), 400);
  if (!isRealInviteUrl(url, platform)) {
    return {
      ok: false,
      error: 'real_url_required',
      message:
        platform === 'partiful'
          ? 'Need real https://partiful.com/… URL (never invent).'
          : 'Need real https://lu.ma/… or https://luma.com/… URL (never invent).',
    };
  }
  // Reject RSVP claims before touching the store.
  if (args.rsvpCount != null || args.confirmed != null || args.attended != null) {
    return {
      ok: false,
      error: 'no_fake_rsvps',
      message: 'Record URL only — RSVP counts stay empty until real tally evidence.',
    };
  }
  store.platforms = store.platforms || { luma: [], partiful: [] };
  const list = (store.platforms[platform] = store.platforms[platform] || []);
  const id = clamp(args.id || args.draftId || '', 80);
  const title = clamp(args.title || '', 120);
  let row = null;
  if (id) row = list.find((x) => x && x.id === id) || null;
  if (!row && title) {
    const nt = normTitle(title);
    row = list.find((x) => x && normTitle(x.title) === nt) || null;
  }
  if (!row && list.length === 1) row = list[0];
  if (!row && store.activeEvent?.title) {
    const nt = normTitle(store.activeEvent.title);
    row = list.find((x) => x && normTitle(x.title) === nt) || null;
  }
  if (!row && list.length > 1) {
    return { ok: false, error: 'draft_required', message: 'Multiple drafts match this platform; include id or title.' };
  }
  if (!row) {
    // Create minimal published record — still requires real URL (no invent)
    row = {
      id: uid(platform === 'luma' ? 'luma_' : 'pf_'),
      title: title || store.activeEvent?.title || 'SF night',
      status: 'draft',
      platform,
      city: 'San Francisco',
      at: new Date().toISOString(),
    };
    list.push(row);
  }
  const at = new Date().toISOString();
  row.inviteUrl = url;
  row.publishedUrl = url;
  row.status = 'published_url'; // real URL recorded — not a claim of RSVPs
  row.urlRecordedAt = at;
  row.updatedAt = at;
  row.note =
    (row.note ? String(row.note) + ' · ' : '') +
    'Real invite URL recorded; RSVP counts still empty until evidence.';
  // Refresh outbox so humans see the URL next to the paste package
  try {
    const files = writeInviteExport(platform, {
      ...row,
      exportText:
        (row.exportText || row.pasteText || '') +
        '\n\n--- RECORDED URL ---\n' +
        url +
        '\n(status: published_url — no RSVP invent)',
    });
    if (files) row.exportFiles = files;
  } catch {
    /* optional */
  }
  return { ok: true, platform, draft: row, inviteUrl: url };
}

/**
 * Pure: block spin_up titles that would re-pollute prod with selftest nights.
 * Allowed only when DEMIGOD_EVENTS_BOT_MOCK=1 (selftest isolation).
 */
export function selftestTitleBlocked(title, mockEnv = process.env.DEMIGOD_EVENTS_BOT_MOCK) {
  // Fogline = reserved fixture brand (selftest / mock offline ticks)
  if (!/\bselftest\b|\bfixture\b|\bfogline\b/i.test(String(title || ''))) return false;
  return String(mockEnv ?? '') !== '1';
}

/**
 * Pure: calendar titles that must not re-enter prod (loop fixtures / rl-cal noise).
 * Used by POST /calendar guard + one-time store purge.
 */
export function isJunkCalendarTitle(title) {
  const t = String(title || '').trim();
  if (!t || t.length < 3) return true;
  if (/^rl[-_]?cal\b/i.test(t)) return true;
  if (/^loop\s*[ab]$/i.test(t)) return true;
  if (/^[ab]$/i.test(t)) return true;
  if (/^(night|rooftop\s+party)$/i.test(t)) return true;
  if (/\bselftest\b|\bfixture\b|\bfogline\b/i.test(t)) return true;
  return false;
}

/** YYYY-MM-DD in America/Los_Angeles (calendar public filter). */
export function sfTodayYmd(now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

/**
 * Pure: public GET calendar visibility.
 * Hide past-dated ideate/resource/plan rows (stale "tonight" reads as a fake night).
 * Keep run/followup/debrief even if past (honest history). Drop junk titles always.
 */
export function isPublicCalendarVisible(ev, todayYmd = sfTodayYmd()) {
  if (!ev || typeof ev !== 'object') return false;
  if (isJunkCalendarTitle(ev.title)) return false;
  const date = String(ev.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const stage = String(ev.stage || 'ideate').toLowerCase();
  const early = stage === 'ideate' || stage === 'resource' || stage === 'plan' || !stage;
  if (early && date < String(todayYmd || '').slice(0, 10)) return false;
  return true;
}

/** Fixture offer ids (sp_seed / off_seed_* / vol_seed) — never match outside MOCK. */
export function isFixtureOfferId(id) {
  return /_seed\b|^off_seed|^sp_seed|^vol_seed/i.test(String(id || ''));
}

/**
 * Pure: selftest/sample invite drafts must not appear on the human drain board.
 * Title markers (selftest/fixture/Fogline) or explicit flags.
 */
export function isSelftestInviteDraft(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.selftest || d.sample || d.test || d.fixture) return true;
  const title = String(d.title || '');
  // Fogline is the standing selftest/mock event brand — never human-drain
  if (/\bselftest\b|\bfixture\b|\bunit\s*test\b|\bfogline\b/i.test(title)) return true;
  const note = String(d.note || '');
  if (/\bselftest\b|\bfogline\b/i.test(note) && !d.inviteUrl && !d.publishedUrl) return true;
  return false;
}

/**
 * Human drain board for Partiful/Luma paste packages.
 * Lists drafts needing a real URL vs already recorded (FOCUS outbox drain).
 * Pure aside from optional outbox dir listing. Skips selftest/sample drafts.
 */
export function inviteDrainReport(store, { outboxDir = eventsOutboxPath() } = {}) {
  const platforms = store?.platforms || {};
  const rows = [];
  let skippedSelftest = 0;
  for (const platform of ['partiful', 'luma']) {
    for (const d of platforms[platform] || []) {
      if (!d || typeof d !== 'object') continue;
      if (isSelftestInviteDraft(d)) {
        skippedSelftest++;
        continue;
      }
      const inviteUrl = d.inviteUrl || d.publishedUrl || null;
      const hasUrl = !!(inviteUrl && isRealInviteUrl(inviteUrl, platform));
      const needsUrl = !hasUrl;
      let outboxTxt = d.exportFiles?.txt || null;
      if (!outboxTxt && d.id) {
        const cand = path.join(outboxDir, platform + '-' + d.id + '.txt');
        if (fs.existsSync(cand)) outboxTxt = cand;
      }
      rows.push({
        platform,
        id: d.id || null,
        title: d.title || null,
        status: d.status || 'draft',
        needsUrl,
        hasUrl,
        inviteUrl: hasUrl ? inviteUrl : null,
        outboxTxt,
        exportHint: outboxTxt
          ? 'paste package on disk'
          : 'run partiful_draft / luma draft to regenerate outbox',
      });
    }
  }
  const need = rows.filter((r) => r.needsUrl);
  const ready = rows.filter((r) => r.hasUrl);
  const humanNext = need.map((r) => ({
    id: r.id,
    platform: r.platform,
    title: r.title,
    steps: [
      r.outboxTxt ? 'Open paste package: ' + r.outboxTxt : 'Regenerate draft via partiful_draft',
      'Publish on ' + (r.platform === 'luma' ? 'https://lu.ma' : 'https://partiful.com'),
      'Record real URL: record_invite_url platform=' +
        r.platform +
        (r.id ? ' id=' + r.id : '') +
        ' url=https://…',
    ],
  }));
  return {
    ok: true,
    total: rows.length,
    needsUrl: need.length,
    hasUrl: ready.length,
    skippedSelftest,
    need,
    ready,
    humanNext,
    note: 'Draft only until real URL recorded. Never invent RSVPs or URLs. Selftest drafts excluded.',
  };
}

/**
 * Default drop file for human-pasted Partiful/Luma URLs (FOCUS outbox drain).
 * One URL per line; optional `platform=` `id=` `url=` tokens. Comments with #.
 */
export function humanInviteDropPath(busyDir) {
  const dir = busyDir || path.join(process.env.DEMIGOD_BUSY || '/tmp/dg-busy', 'events-bot');
  return path.join(dir, 'HUMAN-INVITE-URLS.md');
}

/**
 * Pure: parse human drop text into recordInviteUrl args.
 * Accepts bare https URLs, leading platform word, or key=value tokens.
 */
export function parseHumanInviteUrlLines(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const kv = {};
    for (const part of line.split(/\s+/)) {
      const m = /^([a-zA-Z_]+)=(.*)$/.exec(part);
      if (m) kv[m[1].toLowerCase()] = m[2];
    }
    let platform = String(kv.platform || kv.kind || '').toLowerCase();
    let id = clamp(kv.id || kv.draftid || '', 80);
    let title = clamp((kv.title || '').replace(/^["']|["']$/g, ''), 120);
    let url = clamp(kv.url || kv.inviteurl || '', 400);
    if (url) url = clamp(cleanInviteUrlCandidate(url), 400);
    if (!url) {
      // Same peel alphabet as pickInviteUrlFromOutboxText (no sticky ] ) ` ） smart/guillemet /
      // residual-5 fullwidth/CJK close wrappers)
      const urlM = line.match(/https:\/\/[^\s)"'`<>\]|）］＞》〉〕“”‘’«»]+/i);
      if (urlM) url = clamp(cleanInviteUrlCandidate(urlM[0]), 400);
    }
    if (!platform && url) {
      if (isRealInviteUrl(url, 'luma')) platform = 'luma';
      else if (isRealInviteUrl(url, 'partiful')) platform = 'partiful';
    }
    if (!platform) {
      if (/^luma\b/i.test(line)) platform = 'luma';
      else if (/^partiful\b/i.test(line)) platform = 'partiful';
    }
    if (!url || !platform) continue;
    if (!isRealInviteUrl(url, platform)) continue;
    out.push({
      platform,
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      url,
    });
  }
  return out;
}

/**
 * Apply human-pasted real invite URLs onto drafts (recordInviteUrl). Never invents.
 * Idempotent when URL already stamped. Mutates store in place.
 */
export function absorbHumanInviteUrls(store, text) {
  const entries = parseHumanInviteUrlLines(text);
  const applied = [];
  const failed = [];
  for (const e of entries) {
    const r = recordInviteUrl(store, e);
    if (r.ok) {
      applied.push({
        platform: e.platform,
        id: r.draft?.id || e.id || null,
        url: e.url,
        status: r.draft?.status || null,
      });
    } else {
      failed.push({ platform: e.platform, id: e.id || null, url: e.url, error: r.error });
    }
  }
  return { ok: true, parsed: entries.length, applied, failed };
}

/** Read drop file if present and absorb; no file → no-op. */
export function absorbHumanInviteDropFile(store, { dropPath = null, busyDir = null } = {}) {
  const p = dropPath || humanInviteDropPath(busyDir);
  if (!fs.existsSync(p)) {
    return { ok: true, dropPath: p, missing: true, parsed: 0, applied: [], failed: [] };
  }
  let text = '';
  try {
    text = fs.readFileSync(p, 'utf8');
  } catch {
    return { ok: false, dropPath: p, error: 'read_failed', parsed: 0, applied: [], failed: [] };
  }
  return { ...absorbHumanInviteUrls(store, text), dropPath: p, missing: false };
}

/**
 * Pure: strip wrapping brackets/quotes/parens/backticks + trailing prose punct
 * from a human-pasted invite URL (FOCUS Partiful/Luma outbox drain residual).
 * e.g. `[https://…]` · `<https://…>,` · `(https://…)` · `` `https://…` `` · `"https://…".`
 * Residual-2: fullwidth parens `（）` · zero-width paste junk (ZWSP/ZWNJ/WJ/BOM).
 * Residual-3: smart quotes “”‘’ · guillemets «» · soft hyphen · fullwidth ，． · en/em dash.
 * Residual-4: single guillemets ‹› · low-9 „‟ · primes ″′ · Discord ||spoilers|| ·
 *   braces {} · pipe/bullet/middot · figure/horizontal dash · backslash · fullwidth ／ ·
 *   bidi LRM/RLM.
 * Residual-5: fullwidth ［］＜＞ · CJK 《》〈〉〔〕 · leading › · Markdown emphasis ·
 *   Slack `<url|label>` pipe-label tail.
 */
export function cleanInviteUrlCandidate(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  // Invisible paste junk (iMessage/Slack/WeChat: ZWSP/ZWNJ/WJ/BOM + soft hyphen + LRM/RLM)
  u = u.replace(/[\u200b\u200c\u200d\u2060\ufeff\u00ad\u200e\u200f]/g, '');
  // Leading wrappers (markdown / angle / quotes / smart / guillemets / parens / CJK /
  // fullwidth / Discord spoiler | / braces / low-9 / primes / single guillemet /
  // fullwidth ［＜ / book·angle·tortoise 《〈〔 / md * _ ~ / close-guillemet ›)
  u = u.replace(/^[<\["'`(|{*~_【「『［＜《〈〔（“”‘’«»‹›„‟″′]+/, '');
  // Trailing wrappers + prose punct (incl. ! ? … fullwidth + CJK close + * + smart quotes /
  // dashes / pipe / bullet / middot / figure+horizontal bar / backslash / fullwidth slash /
  // fullwidth ］＞ / book·angle·tortoise 》〉〕 / md _ ~);
  // loop so `<url>,` and `` `url` `` and `||url||` peel fully. Lone trailing ?/# ok — real
  // query/hash keep content after ?/# so they do not match `$`.
  for (let i = 0; i < 4; i++) {
    const n = u.replace(
      /[>\]"'`.,);:!?…；。！？#*|}\\*_~】」』］＞》〉〕）“”‘’«»‹›„‟″′•·，．–—‒―／]+$/g,
      '',
    );
    if (n === u) break;
    u = n;
  }
  // Slack auto-link residual: <https://…|Label text> → url|Label after wrapper peel
  const slackPipe = /^(https:\/\/[^|\s]+)\|/.exec(u);
  if (slackPipe) u = slackPipe[1];
  return u.trim();
}

/**
 * Pure: pick the best real invite URL from outbox paste text for a platform.
 * Prefers lines after RECORDED URL / Invite URL markers; else last matching https URL.
 * Ignores lu.ma marketing links in host checklist when other real event URLs exist.
 */
export function pickInviteUrlFromOutboxText(text, platform) {
  const body = String(text || '');
  if (!body.trim()) return null;
  const p = String(platform || '').toLowerCase();
  // Marker sections first (human appended after publish). Optional wrappers after colon
  // (ASCII + CJK + smart open quotes + guillemet/single + brace/pipe/prime + residual-5
  // fullwidth/CJK/md; fullwidth colon ok).
  const marked =
    body.match(
      /(?:RECORDED\s+URL|Invite\s+URL|Published\s+URL|Live\s+URL)\s*[:\-：]?\s*[<\["'`(|{*~_【「『［＜《〈〔（“‘«‹›„‟″′]*(https:\/\/[^\s]+)/i,
    ) ||
    body.match(
      /---\s*RECORDED URL\s*---\s*[<\["'`(|{*~_【「『［＜《〈〔（“‘«‹›„‟″′]*(https:\/\/[^\s]+)/i,
    );
  if (marked) {
    const u = cleanInviteUrlCandidate(marked[1]);
    if (isRealInviteUrl(u, p)) return u;
  }
  // Markdown link form [label](https://…)
  const mdLink = body.match(/\]\((https:\/\/[^)\s]+)\)/i);
  if (mdLink) {
    const u = cleanInviteUrlCandidate(mdLink[1]);
    if (isRealInviteUrl(u, p)) return u;
  }
  const all = [];
  // Exclude ] ) " ' ` < + CJK/fullwidth/smart/guillemet/pipe/bullet/dash close so wrappers do not stick
  // Residual-5: also stop before fullwidth/CJK close ］＞》〉〕
  const re = /https:\/\/[^\s)"'`<>\]|}\\】」』］＞》〉〕）“”‘’«»‹›•·‒―／]+/gi;
  let m;
  while ((m = re.exec(body))) {
    const u = cleanInviteUrlCandidate(m[0]);
    if (isRealInviteUrl(u, p)) all.push(u);
  }
  if (!all.length) return null;
  // Prefer event-looking paths over bare homepage (lu.ma alone / partiful.com/)
  const eventish = all.filter((u) => /\/e\/|lu\.ma\/[a-z0-9_-]{3,}/i.test(u) && !/lu\.ma\/?$/i.test(u));
  const pool = eventish.length ? eventish : all;
  return pool[pool.length - 1];
}

/**
 * Scan draft outbox packages for human-pasted real invite URLs and stamp them.
 * FOCUS drain: human may paste URL into the paste package itself (not only drop file).
 */
export function absorbInviteUrlsFromOutbox(store, { outboxDir = eventsOutboxPath() } = {}) {
  const platforms = store?.platforms || {};
  const applied = [];
  const failed = [];
  let scanned = 0;
  for (const platform of ['partiful', 'luma']) {
    for (const d of platforms[platform] || []) {
      if (!d || typeof d !== 'object') continue;
      const existing = d.inviteUrl || d.publishedUrl || null;
      if (existing && isRealInviteUrl(existing, platform)) continue;
      let txtPath = d.exportFiles?.txt || null;
      if (!txtPath && d.id) {
        const cand = path.join(outboxDir, platform + '-' + d.id + '.txt');
        if (fs.existsSync(cand)) txtPath = cand;
      }
      if (!txtPath || !fs.existsSync(txtPath)) continue;
      scanned++;
      let text = '';
      try {
        text = fs.readFileSync(txtPath, 'utf8');
      } catch {
        failed.push({ platform, id: d.id, error: 'outbox_read_failed' });
        continue;
      }
      const url = pickInviteUrlFromOutboxText(text, platform);
      if (!url) continue;
      const r = recordInviteUrl(store, { platform, id: d.id, url, title: d.title });
      if (r.ok) {
        applied.push({
          platform,
          id: r.draft?.id || d.id,
          url,
          status: r.draft?.status || null,
          source: 'outbox',
          outboxTxt: txtPath,
        });
      } else {
        failed.push({ platform, id: d.id, url, error: r.error, source: 'outbox' });
      }
    }
  }
  return { ok: true, scanned, applied, failed };
}

/** Write human-readable drain brief under /tmp/dg-busy/events-bot/. */
export function writeInviteDrainBrief(report, busyDir) {
  const dir = busyDir || path.join(process.env.DEMIGOD_BUSY || '/tmp/dg-busy', 'events-bot');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const drop = humanInviteDropPath(dir);
    const lines = [
      '# Events invite outbox drain',
      '',
      `At: ${new Date().toISOString()}`,
      `Total drafts: ${report.total} · need URL: ${report.needsUrl} · recorded: ${report.hasUrl}` +
        (report.skippedSelftest
          ? ` · skipped selftest: ${report.skippedSelftest}`
          : ''),
      '',
      '## Human URL drop (auto-absorb on drain)',
      `- Paste real Partiful/Luma https URLs into \`${drop}\` (one per line).`,
      '- Formats: bare URL · `platform=luma id=… url=https://…` · never invent RSVPs.',
      '- Or paste the live URL into the outbox `.txt` (line: `Invite URL: https://…`) — drain absorbs it.',
      '',
      '## Need real URL (human)',
    ];
    if (!(report.need || []).length) {
      lines.push('- (none)');
    } else {
      for (const r of report.need) {
        lines.push(
          `- **${r.platform}** \`${r.id || '?'}\` — ${r.title || '(no title)'} · status=${r.status}`,
        );
        if (r.outboxTxt) lines.push(`  - outbox: \`${r.outboxTxt}\``);
        lines.push(
          `  - after publish: \`record_invite_url\` platform=${r.platform}` +
            (r.id ? ` id=${r.id}` : '') +
            ' url=https://…',
        );
      }
    }
    lines.push('', '## Already recorded');
    if (!(report.ready || []).length) {
      lines.push('- (none)');
    } else {
      for (const r of report.ready) {
        lines.push(`- **${r.platform}** \`${r.id}\` — ${r.inviteUrl}`);
      }
    }
    lines.push('', report.note || '', '');
    const out = path.join(dir, 'INVITE-DRAIN.md');
    fs.writeFileSync(out, lines.join('\n'));
    // Machine snapshot for funnel status metrics (FOCUS #2 — no invent)
    try {
      const snap = {
        schema: 'demigod.invite-drain/1',
        at: new Date().toISOString(),
        ok: true,
        total: report.total ?? 0,
        needsUrl: report.needsUrl ?? 0,
        recorded: report.hasUrl ?? 0,
        skippedSelftest: report.skippedSelftest ?? 0,
        needIds: (report.need || []).map((r) => r.id).filter(Boolean).slice(0, 24),
        dropPath: humanInviteDropPath(dir),
      };
      fs.writeFileSync(path.join(dir, 'invite-drain-latest.json'), JSON.stringify(snap, null, 2) + '\n');
    } catch {
      /* best-effort */
    }
    return out;
  } catch {
    return null;
  }
}

/** Build need blob from active event fields (title carries neighborhood cues like SoMa). */
export function eventNeedText(ae = {}, goal = '') {
  return [ae.notes, ae.needs, ae.outcome, ae.title, goal].filter(Boolean).join(' ').trim();
}

/** True free / reserve cost (not sponsor tab or vague in-kind). */
function isTrueFreeCost(cost) {
  return /^free\b|free public|free \(reserve\)/i.test(String(cost || ''));
}

/** Walk/network context — bare "talk" must not mean quiet indoor salon. */
function needIsWalkNetwork(needL) {
  return /\b(walk|networking|meetup|promenade|run[- ]?club|bike|biking|cycling|group\s+ride)\b/.test(
    needL,
  );
}

/** Indoor salon/dinner/demo/workshop (not walk-and-talk). */
function needWantsIndoor(needL) {
  // Outdoor film / park sports / tours stay outdoor free-list (not SFPL rooms)
  if (needIsOutdoorScreening(needL) || needIsOutdoorActivity(needL)) return false;
  if (
    /indoor|salon|dinner|supper|demo|showcase|library|quiet|workshop|panel|\bama\b|hackathon|lecture|classroom|board\s*meeting|board\s*games?|game\s*night|trivia|quiz\s*night|open\s*mic|standup|stand[- ]?up|comedy|performance|film|movie|screening|podcast|recording|watch\s*party|listen(?:ing)?\s*party|co[- ]?working|work\s*session|brainstorm|book\s*club|reading\s*(?:circle|group)|literary|office\s*hours|lightning\s*talks?|tech\s*talks?|speaker\s*series|study\s*(?:group|hall|session|night|meetup)|homework\s*(?:hang|club|group|night)|language\s*(?:exchange|meetup|group|circle|practice)|writing\s*(?:circle|group|workshop|critique|night|sprint)|writers?\s*(?:circle|group|workshop|meetup)|journal\s*(?:club|group)|tutoring\s*(?:group|session|meetup)|design\s*critique|critique\s*session|fireside|roundtable|career\s*fair|job\s*fair|hiring\s*(?:night|fair|mixer)|recruiting\s*fair|talent\s*fair|lan\s*party|esports?|gaming\s*(?:tournament|night)|product\s*launch|maker\s*(?:night|meetup|space)|makerspace|press\s*(?:conference|event|day|briefing)|media\s*(?:day|briefing)|user\s*test|ux\s*research|usability|cooking\s*(?:class|workshop)|wine\s*tasting|dance\s*(?:class|night|workshop)|salsa|improv|all[- ]?hands|town\s*hall|sprint\s*planning|retro(?:spective)?|white\s*board(?:ing)?|brown[- ]?bag|lunch(?:[-\s]?and[-\s]?learn)?/.test(
      needL,
    )
  ) {
    return true;
  }
  // Plural "talks" (lightning talks / tech talks) — singular \btalk\b missed these
  if (/\btalks?\b/.test(needL) && !needIsWalkNetwork(needL)) return true;
  // Code collab / public speaking / seated discussion / career fair / pitch-demo / LAN /
  // maker / press / hybrid AV / crypto meetup / UX / food-class / team ops need rooms
  if (
    needIsCodeCollab(needL) ||
    needIsPublicSpeaking(needL) ||
    needIsSeatedDiscussion(needL) ||
    needIsCareerHiring(needL) ||
    needIsStudyQuiet(needL) ||
    needIsDemoFormat(needL) ||
    needIsLanGaming(needL) ||
    needIsMakerHardware(needL) ||
    needIsPressMedia(needL) ||
    needIsHybridRoom(needL) ||
    needIsTechMeetup(needL) ||
    needIsPerformance(needL) ||
    needIsOfficeHours(needL) ||
    needIsUxResearch(needL) ||
    needIsFoodClass(needL) ||
    needIsAllDay(needL) ||
    needIsTeamOps(needL) ||
    needWantsAvQuiet(needL)
  ) {
    return true;
  }
  return false;
}

/** Quiet/seated room (dinner/salon/workshop); exclude walk-and-talk + outdoor film. */
function needWantsQuiet(needL) {
  if (needIsOutdoorScreening(needL) || needIsOutdoorActivity(needL)) return false;
  if (
    /quiet|dinner|supper|salon|workshop|lecture|board\s*meeting|panel|board\s*games?|game\s*night|trivia|quiz\s*night|chess\s*club|reading\s*(?:circle|group)|book\s*club|literary|podcast|recording|film|screening|watch\s*party|listen(?:ing)?\s*party|lightning\s*talks?|tech\s*talks?|study\s*(?:group|hall|session|night|meetup)|homework\s*(?:hang|club|group|night)|language\s*(?:exchange|meetup|group|circle|practice)|writing\s*(?:circle|group|workshop|critique|night|sprint)|writers?\s*(?:circle|group|workshop|meetup)|journal\s*(?:club|group)|tutoring\s*(?:group|session|meetup)|design\s*critique|critique\s*session|fireside|roundtable|meditation|mindfulness/.test(
      needL,
    )
  ) {
    return true;
  }
  if (/\btalks?\b/.test(needL) && !needIsWalkNetwork(needL)) return true;
  // Toastmasters / public speaking / fireside = quiet seated room (not lawn)
  if (needIsPublicSpeaking(needL) || needIsSeatedDiscussion(needL) || needIsStudyQuiet(needL)) {
    return true;
  }
  return false;
}

/**
 * Code night / pair programming / hack night → office/loan tables (not parks).
 * Distinct from all-day hackathon (hours) and demo day (pitch). Draft match only.
 */
function needIsCodeCollab(needL) {
  return /\b(code\s*night|coding\s*(?:night|session|meetup|hang|club)|pair\s*programm(?:ing|ers?)|programming\s*(?:night|meetup|session|hang)|hack\s*night|laptop\s*(?:night|meetup|session|hang)|dev\s*night|devs?\s*meetup)\b/.test(
    needL,
  );
}

/**
 * Toastmasters / public speaking / speech club → SFPL quiet free rooms over parks.
 * Draft match only — not a booking API.
 */
function needIsPublicSpeaking(needL) {
  return /\b(toastmasters?|public\s*speaking|speech\s*club|debate\s*club|speaking\s*club|oratory)\b/.test(
    needL,
  );
}

/**
 * Book club / reading circle / literary hang → SFPL rooms over parks.
 * Draft match only — not a booking API.
 */
function needIsBookClub(needL) {
  return /\b(book\s*club|reading\s*(?:circle|group)|literary\s*(?:salon|night|club|meetup)|book\s*discussion|book\s*swap)\b/.test(
    needL,
  );
}

/**
 * Study group / language exchange / writing circle / sprint / design critique → SFPL quiet free rooms over parks.
 * Distinct from book club (no "book" token) and office hours. Draft match only.
 */
function needIsStudyQuiet(needL) {
  return /\b(study\s*(?:group|hall|session|night|meetup)|homework\s*(?:hang|club|group|night)|language\s*(?:exchange|meetup|group|circle|practice)|writing\s*(?:circle|group|workshop|critique|night|sprint)|writers?\s*(?:circle|group|workshop|meetup|sprint)|journal\s*(?:club|group)|tutoring\s*(?:group|session|meetup)|design\s*critique|critique\s*session)\b/.test(
    needL,
  );
}

/**
 * Fireside chat / roundtable / seated discussion → SFPL quiet free rooms over parks.
 * Draft match only — not a booking API.
 */
function needIsSeatedDiscussion(needL) {
  return /\b(fireside(?:\s+chat)?|roundtable|seated\s+discussion|discussion\s+circle)\b/.test(
    needL,
  );
}

/**
 * Career fair / job fair / hiring night → office/loan showcase (tables + demos), not lawns.
 * Draft match only — not a booking API.
 */
function needIsCareerHiring(needL) {
  return /\b(career\s*fair|job\s*fair|hiring\s*(?:night|fair|mixer|event)|recruiting\s*(?:fair|night|mixer)|talent\s*fair|recruit(?:er)?\s*night)\b/.test(
    needL,
  );
}

/**
 * Founder / open office hours → after-hours office loan (not SFPL reserve rooms).
 * Draft match only.
 */
function needIsOfficeHours(needL) {
  return /\b((?:founder|open|drop[- ]?in)\s+)?office\s*hours\b/.test(needL);
}

/** Pitch / demo day / showcase / hackathon / product launch / design sprint → office-style rooms. */
function needIsDemoFormat(needL) {
  return /\b(pitch|demo(?:\s+day)?|showcase|hackathon|open\s*floor|product\s*launch|design\s*sprint)\b/.test(
    needL,
  );
}

/**
 * LAN party / esports / gaming tournament → power + tables (office/loan), not park lawns.
 * "LAN party" must not trip outdoor "party" social hangs. Draft match only.
 */
function needIsLanGaming(needL) {
  return /\b(lan\s*party|esports?|gaming\s*(?:tournament|night|meetup)|console\s*night|pc\s*gaming|video\s*game\s*night)\b/.test(
    needL,
  );
}

/**
 * Maker night / makerspace / hardware / robotics → power + tables (office/loan), not parklets.
 * Draft match only — not a booking API.
 */
function needIsMakerHardware(needL) {
  return /\b(maker\s*(?:night|meetup|space|session|hang)|makerspace|hardware\s*(?:night|meetup|hang|hack)|craft\s*night|robotics\s*(?:workshop|night|meetup)|3d\s*print(?:ing)?)\b/.test(
    needL,
  );
}

/**
 * Press conference / media day → indoor AV (office/loan), not free lawns.
 * Draft match only — not a booking API.
 */
function needIsPressMedia(needL) {
  return /\b(press\s*(?:conference|event|day|briefing)|media\s*(?:day|briefing|event)|presser)\b/.test(
    needL,
  );
}

/**
 * Hybrid meetup/event (in-person + remote) → AV room, not parks.
 * Skips when outdoor/picnic/park is the ask. Draft match only.
 */
function needIsHybridRoom(needL) {
  if (/\b(outdoor|picnic|park|lawn)\b/.test(needL)) return false;
  return (
    /\bhybrid\b/.test(needL) &&
    /\b(meetup|event|hang|night|session|workshop|talk|panel)\b/.test(needL)
  );
}

/**
 * Tech-topic meetup → indoor office tables (not free lawns).
 * Covers crypto/web3 + AI/ML/LLM + language/stack + OSS/security/ops topics.
 * Bare networking / founders social stays outdoor walk-network. Outdoor picnic still parks.
 * Draft match only — not a booking API.
 */
function needIsTechMeetup(needL) {
  if (/\b(outdoor|picnic|park|lawn)\b/.test(needL)) return false;
  const techTopic =
    /\b(crypto|web3|blockchain|defi|nft|bitcoin|ethereum|ai|a\.i\.|ml|machine\s*learning|llm|genai|generative\s*ai|data\s*science|python|javascript|typescript|rust|golang|go\s*lang|devops|kubernetes|k8s|cloud\s*native|react|node\.?js|open\s*source|foss|open\s*data|civic\s*tech|infosec|info\s*sec|cyber\s*security|cybersecurity|pen(?:etration)?\s*test|red\s*team|blue\s*team|bug\s*bounty|\bctf\b|homelab|self[- ]?host(?:ing)?|privacy|linux|sre|\bsoc\b)\b/.test(
      needL,
    );
  const techLabel = /\b(tech|startup|engineering|developer|dev|security)\b/.test(needL);
  // Pure social mixer language without a tech topic stays walk-network outdoor
  if (
    /\b(networking|mixer|founders?\s+social|happy\s*hour)\b/.test(needL) &&
    !techTopic &&
    !/\b(tech|startup|engineering|developer)\b/.test(needL)
  ) {
    return false;
  }
  // Strong solo labels imply a room even without meetup/hang token (draft residual)
  if (
    /\b(open\s*source|foss|open\s*data|civic\s*tech|infosec|info\s*sec|pen(?:etration)?\s*test|red\s*team|bug\s*bounty|\bctf\b|homelab|self[- ]?host(?:ing)?|linux\s*user\s*group|\blug\b)\b/.test(
      needL,
    )
  ) {
    return true;
  }
  const meetupish =
    /\b(meetup|hang|night|event|session|workshop|group|club|user\s*group|\blug\b)\b/.test(needL);
  if (!meetupish) return false;
  // Topic tokens (AI hang, Python meetup, security meetup, data science session, …)
  if (techTopic) return true;
  // Label: "tech meetup", "startup hang", "engineering night", "dev workshop", "security meetup"
  return techLabel;
}

/**
 * All-hands / town hall / sprint planning / retro / whiteboard / reviews / brown-bag
 * → office tables (not free lawns). Draft match only — not a booking API.
 */
function needIsTeamOps(needL) {
  return /\b(all[- ]?hands|town\s*hall|sprint\s*planning|retro(?:spective)?s?|white\s*board(?:ing)?|whiteboard\s*session|architecture\s*review|design\s*review|code\s*review|lunch(?:[-\s]?and[-\s]?learn)|brown[- ]?bag)\b/.test(
    needL,
  );
}

/**
 * Movie/film in the park / outdoor screening — must not trip indoor AV quiet.
 * Inverse of indoor watch party residual. Draft match only.
 */
function needIsOutdoorScreening(needL) {
  if (!/\b(movie|film|cinema|screening)\b/.test(needL)) return false;
  return /\b(park|outdoor|lawn|under\s+the\s+stars|open[- ]air|al\s*fresco|outside)\b/.test(needL);
}

/**
 * Outdoor free-list hangs: tours, scavenger, cleanup, sports, stargazing.
 * Prevents SFPL default when need has no "outdoor/park" token. Draft match only.
 */
function needIsOutdoorActivity(needL) {
  if (/\bindoor\b/.test(needL)) return false;
  return /\b(walking\s*tour|history\s*(?:walk|tour)|neighborhood\s*tour|food\s*tour|ghost\s*tour|scavenger\s*hunt|treasure\s*hunt|geocaching|beach\s*cleanup|community\s*cleanup|park\s*cleanup|stargazing|astronomy\s*night|meteor\s*shower|eclipse\s*watch|pickleball|basketball|soccer\s*meetup|ultimate\s*frisbee|\bfrisbee\b)\b/.test(
    needL,
  );
}

/** All-day / multi-hour indoor work → office/loan (SFPL hours + table space). */
function needIsAllDay(needL) {
  return /\b(all[- ]?day|full[- ]?day|multi[- ]?hour|hackathon|co[- ]?working|work\s*session)\b/.test(
    needL,
  );
}

/**
 * Open mic / comedy / karaoke / dance / improv → office/loan (libraries rarely allow amp/noise).
 * Agile "standup meeting/scrum" is not comedy (draft match only).
 */
function needIsPerformance(needL) {
  // Daily standup / standup meeting / standup sync — ops, not comedy
  if (
    /\b(standup|stand[- ]?up)\s+(meeting|scrum|sync|call|check[- ]?in)\b/.test(needL) ||
    /\b(daily|morning|team|eng(?:ineering)?|dev)\s+(standup|stand[- ]?up)\b/.test(needL)
  ) {
    return false;
  }
  return /\b(open\s*mic|standup|stand[- ]?up|comedy|performance|live\s*music|jam\s*session|karaoke|dance\s*(?:class|night|workshop|party)|salsa(?:\s*night)?|bachata|improv(?:\s*(?:class|workshop|night|show))?|silent\s*disco)\b/.test(
    needL,
  );
}

/**
 * UX research / user testing / usability → office tables + quiet control (not parks).
 * Draft match only — not a booking API.
 */
function needIsUxResearch(needL) {
  return /\b(user\s*test(?:ing|s)?|ux\s*research|usability\s*(?:test|session|study|lab)?|research\s*session|customer\s*interview|participant\s*test(?:ing)?)\b/.test(
    needL,
  );
}

/**
 * Cooking class / wine tasting / culinary workshop → indoor private (not parks/SFPL kitchens).
 * Draft match only — free-list office/in-kind is the honest shortlist.
 */
function needIsFoodClass(needL) {
  return /\b(cooking\s*(?:class|workshop|night|session)|wine\s*tasting|beer\s*tasting|coffee\s*(?:tasting|cupping)|cocktail\s*(?:class|workshop|night)|mixology|whiskey\s*tasting|chocolate\s*tasting|cheese\s*tasting|olive\s*oil\s*tasting|tasting\s*(?:night|event|class)|culinary\s*(?:class|workshop|night)|bake[- ]?off|chef(?:'s)?\s*table)\b/.test(
    needL,
  );
}

/**
 * Trivia / quiz night → indoor seated tables (libraries/offices over parks).
 * Draft match only.
 */
function needIsTriviaNight(needL) {
  return /\b(trivia(?:\s*night)?|quiz\s*night|pub\s*quiz)\b/.test(needL);
}

/** Run club / jogging hang → waterfront walk venues over generic lawns. */
function needIsRunClub(needL) {
  return /\b(run[- ]?club|running\s+club|jog(?:ging)?\s+club|fun\s*run)\b/.test(needL);
}

/** Bike / group ride → walk waterfront start points over libraries. */
function needIsBikeRide(needL) {
  return /\b(bike\s*ride|group\s+ride|biking|bicycle|cycling|bike\s*club)\b/.test(needL);
}

/** Waterfront / views / golden hour → Embarcadero / Crissy / Ferry / Marina. */
function needWantsWaterfront(needL) {
  return /\b(waterfront|bay\s*view|bayfront|golden\s*hour|sunset\s*(?:view|hang|meetup|walk)?|views?\s+of\s+the\s+bay|promenade)\b/.test(
    needL,
  );
}

/** Film / screening / podcast / recording / watch party → AV + private indoor (not lawn). */
function needWantsAvQuiet(needL) {
  // Movie/film in the park is outdoor free-list — not indoor AV
  if (needIsOutdoorScreening(needL)) return false;
  return /\b(film|movie|screening|podcast|recording|listen(?:ing)?\s*party|watch\s*party|movie\s*night|film\s*night)\b/.test(
    needL,
  );
}

/**
 * Photo walk / street photography / architecture walk → scenic outdoor free-list
 * (Embarcadero / Crissy / Yerba / Salesforce roof edge). Draft match only.
 */
function needIsPhotoWalk(needL) {
  return /\b(photo\s*walk|photography\s*walk|camera\s*walk|street\s*photo(?:graphy)?|architecture\s*walk|photo\s*meetup|photowalk)\b/.test(
    needL,
  );
}

/**
 * Farmers market / market-day / pop-up / night market hang → Ferry Building arcade
 * (food + plaza edge). Bare "market" alone is too broad. Draft match only.
 */
function needIsFarmersMarket(needL) {
  return /\b(farmers?\s*market|market\s*day|ferry\s*market|saturday\s*market|sunday\s*market|weekend\s*market|pop[- ]?up\s*market|night\s*market|street\s*market)\b/.test(
    needL,
  );
}

/**
 * Art walk / gallery hop / First Friday / museum walk → Yerba Buena cultural corridor
 * (YBCA/SFMOMA edge), not far Crissy lawns. Draft match only.
 */
function needIsArtCultureWalk(needL) {
  return /\b(art\s*walk|gallery\s*hop|gallery\s*walk|first\s*friday|museum\s*(?:meetup|walk|hop)|culture\s*walk|open\s*studios?|gallery\s*night)\b/.test(
    needL,
  );
}

/**
 * SFPL closed days (named federal holidays / bare holiday + indoor).
 * Skips outdoor "holiday party" hangs. Draft match only — not a booking API.
 */
function needIsHolidayClosed(needL, outdoorAsked) {
  if (outdoorAsked) return false;
  // Outdoor social "holiday party" / "holiday hang" is not a library-hours ask
  if (/\bholiday\s+(party|hang|picnic|bbq|social|mixer)\b/.test(needL)) return false;
  const named =
    /\b(memorial\s+day|labor\s+day|mlk(?:\s+day)?|martin\s+luther\s+king(?:\s+day)?|presidents?\s+day|independence\s+day|july\s*4(?:th)?|4th\s+of\s+july|thanksgiving|christmas(?:\s+eve|\s+day)?|new\s+year'?s?(?:\s+eve|\s+day)?|juneteenth|veterans?\s+day|columbus\s+day|indigenous\s+peoples?\s+day)\b/.test(
      needL,
    );
  const federal = /\b(federal|bank|public)\s+holiday\b/.test(needL);
  const bareHoliday = /\bholidays?\b/.test(needL);
  if (!(named || federal || bareHoliday)) return false;
  return (
    needWantsIndoor(needL) ||
    needWantsQuiet(needL) ||
    needIsDemoFormat(needL) ||
    /\bfree\b/.test(needL)
  );
}

/**
 * Score a curated free SF venue for need text + seat target.
 * Prefer true free + capacity fit + tag/area/quiet match. Not a booking API.
 * When `explain: true`, returns `{ score, reasons }` (draft transparency).
 */
export function scoreFreeVenue(v, { need = '', seats = 0, explain = false } = {}) {
  const needL = String(need || '').toLowerCase();
  const tags = (v.tags || []).join(' ');
  const areaL = String(v.area || '').toLowerCase();
  const blob = (v.name + ' ' + (v.notes || '') + ' ' + tags + ' ' + areaL + ' ' + (v.cost || '')).toLowerCase();
  let score = 0;
  const reasons = [];
  const cap = Number(v.capacity) || 0;
  const nSeats = Number(seats) || 0;
  const isOfficeish = /office|in-kind|demo|showcase/.test(tags + ' ' + blob);
  const isPublicOutdoor = /outdoor|picnic|park|lawn|promenade|parklet/.test(tags + ' ' + blob);
  const freeAsked = /\bfree\b/.test(needL);
  // Photo / art / market hangs imply outdoor/public hang (not library rooms).
  // LAN/board/tabletop/watch/listening "party" + explicit indoor party are not park hangs.
  const indoorPartyFormat =
    needIsLanGaming(needL) ||
    needWantsAvQuiet(needL) ||
    needIsTriviaNight(needL) ||
    needIsPerformance(needL) ||
    /\b(board\s*games?|tabletop|gaming|esports?|watch|listening|movie|film|trivia)\s*party\b/.test(
      needL,
    ) ||
    (/\bparty\b/.test(needL) && /\bindoor\b/.test(needL));
  const outdoorAsked =
    /picnic|outdoor|park|lawn|social/.test(needL) ||
    (/\bparty\b/.test(needL) && !indoorPartyFormat) ||
    needIsPhotoWalk(needL) ||
    needIsArtCultureWalk(needL) ||
    needIsFarmersMarket(needL) ||
    needIsOutdoorScreening(needL) ||
    needIsOutdoorActivity(needL);
  // Explicit indoor/rain still sinks parks even when "networking" is also in the need
  const explicitIndoor =
    /\bindoor\b/.test(needL) || /\brain|weather|wet|storm|drizzle\b/.test(needL);
  const drinksAsked =
    /\b(happy\s*hour|drinks?|cocktails?|bar\s*tab|wine\s*hour)\b/.test(needL);
  const intimateAsked =
    /\bintimate\b|small\s+group|tiny\b/.test(needL) || (nSeats > 0 && nSeats <= 8);
  // Capacity fit honesty: free label must not outrank rooms that actually fit seats.
  let underCap = false;
  if (nSeats > 0 && cap > 0) {
    if (cap >= nSeats) {
      score += 4;
      reasons.push('capacity');
      // Right-size rooms beat cavernous "fits" for small salons
      if (cap <= nSeats * 2) {
        score += 2;
        reasons.push('right-size');
      }
      // Intimate / ≤8: prefer rooms that don't swallow the group (≤20 still ok for libraries)
      if (intimateAsked && cap <= Math.max(nSeats * 3, 20)) {
        score += 2;
        reasons.push('intimate-fit');
      }
      // Large indoor nights: rooms that actually hold the count beat near-miss free rooms
      if (
        nSeats >= 25 &&
        needWantsIndoor(needL) &&
        !outdoorAsked &&
        !isPublicOutdoor &&
        (/indoor|salon|talk|library|office|demo|showcase|dinner/.test(tags) || isOfficeish)
      ) {
        score += 2;
        reasons.push('large-indoor');
      }
    } else if (cap >= nSeats * 0.85) {
      score += 1;
      reasons.push('capacity~');
    } else if (cap >= nSeats * 0.5) {
      underCap = true;
      score -= 4;
      reasons.push('under-cap');
    } else {
      underCap = true;
      score -= 8;
      reasons.push('under-cap-hard');
    }
    // Prefer not wildly oversized indoor rooms for small salons (office loans often larger — skip)
    if (
      cap > nSeats * 3 &&
      needWantsIndoor(needL) &&
      !outdoorAsked &&
      !isOfficeish
    ) {
      score -= 1;
      reasons.push('oversized');
    }
    if (intimateAsked && cap > nSeats * 3 && !isOfficeish) {
      score -= 1;
      reasons.push('intimate-big');
    }
  }
  // Keyword overlap — skip stopwords that appear on every free-list card
  const STOP = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'need', 'want', 'free',
    'venue', 'room', 'space', 'sf', 'san', 'francisco', 'event', 'night', 'seats',
  ]);
  let kwHits = 0;
  for (const w of needL.split(/\W+/)) {
    if (w.length > 2 && !STOP.has(w) && blob.includes(w)) {
      score += 2;
      kwHits++;
    }
  }
  if (kwHits) reasons.push('keyword');
  if (needWantsIndoor(needL) && /indoor|salon|talk|dinner|demo|showcase/.test(tags)) {
    score += 5;
    reasons.push('indoor-fit');
  }
  if (outdoorAsked && /outdoor|picnic|party|social/.test(tags)) {
    score += 5;
    reasons.push('outdoor-fit');
  }
  if (needIsWalkNetwork(needL) && /walk|meetup|networking/.test(tags)) {
    score += 4;
    reasons.push('meetup-fit');
  }
  // Pitch / demo day / showcase / hackathon / product launch → office/loan/showcase rooms
  // Free-ask on parks must not tie bare "investor pitch" (career-fair strength).
  if (needIsDemoFormat(needL)) {
    if (/demo|showcase|office|indoor/.test(tags) || isOfficeish) {
      score += 6;
      reasons.push('demo-format');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('demo-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('demo-sponsor');
    }
  }
  // LAN / esports / gaming tournament → office power+tables; not lawns or quiet SFPL
  if (needIsLanGaming(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('lan-gaming');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('lan-outdoor');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 2;
      reasons.push('lan-library');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('lan-sponsor');
    }
  }
  // Maker night / makerspace / hardware → office power+tables (not free parklets)
  if (needIsMakerHardware(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('maker-hardware');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('maker-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('maker-sponsor');
    }
  }
  // Press conference / media day → office/demo AV; free lawns are weak press rooms
  if (needIsPressMedia(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|indoor/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('press-media');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('press-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('press-sponsor');
    }
  }
  // Hybrid meetup/event → AV room (office); parks lack hybrid AV (draft only)
  if (needIsHybridRoom(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|indoor|av/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('hybrid-room');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('hybrid-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('hybrid-sponsor');
    }
  }
  // Crypto / web3 / OSS / security tech meetup → office tables; free lawns still get meetup-fit otherwise
  if (needIsTechMeetup(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking|indoor/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('tech-meetup');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('tech-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('tech-sponsor');
    }
  }
  // All-hands / town hall / sprint / retro / whiteboard / reviews / brown-bag → office tables
  if (needIsTeamOps(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking|indoor/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('team-ops');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('ops-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('ops-sponsor');
    }
  }
  // Movie/film in the park → outdoor free-list; demote SFPL/office AV rooms (draft only)
  if (needIsOutdoorScreening(needL)) {
    if (isPublicOutdoor || /outdoor|picnic|park|lawn|social/.test(tags)) {
      score += 6;
      reasons.push('outdoor-screening');
    }
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !isPublicOutdoor
    ) {
      score -= 4;
      reasons.push('screen-indoor');
    }
  }
  // Tours / scavenger / cleanup / sports / stargazing → outdoor free-list (not SFPL)
  if (needIsOutdoorActivity(needL)) {
    if (isPublicOutdoor || /outdoor|walk|meetup|networking|picnic|park/.test(tags)) {
      score += 5;
      reasons.push('outdoor-activity');
    }
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !isPublicOutdoor &&
      !/outdoor|walk|meetup/.test(tags)
    ) {
      score -= 4;
      reasons.push('activity-indoor');
    }
  }
  // Open mic / comedy / performance → office/loan; SFPL rooms rarely allow amp/noise
  if (needIsPerformance(needL)) {
    if (isOfficeish || /demo|showcase|office|after-hours|in-kind/.test(tags + ' ' + blob)) {
      score += 4;
      reasons.push('performance');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 5;
      reasons.push('no-amp-library');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 2;
      reasons.push('perf-outdoor');
    }
  }
  // Board game / game night / trivia → indoor quiet tables (libraries/offices over parks)
  if (/\b(board\s*games?|game\s*night|tabletop)\b/.test(needL) || needIsTriviaNight(needL)) {
    if (/indoor|salon|library|office|talk/.test(tags) || isOfficeish) {
      score += 3;
      reasons.push(needIsTriviaNight(needL) ? 'trivia-night' : 'game-night');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 3;
      reasons.push('game-outdoor');
    }
  }
  // UX research / user testing → office/loan quiet control (not parks or open SFPL)
  if (needIsUxResearch(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('ux-research');
    } else if (/indoor|salon|talk|library/.test(tags)) {
      score += 2;
      reasons.push('ux-research');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('ux-outdoor');
    }
    // Open SFPL rooms are weak for moderated usability (noise, no isolation)
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 2;
      reasons.push('ux-library');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('ux-sponsor');
    }
  }
  // Cooking class / wine tasting → private indoor (office/in-kind); SFPL has no kitchen
  if (needIsFoodClass(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|dinner|demo|showcase/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('food-class');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('food-outdoor');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 3;
      reasons.push('food-library');
    }
    // Free ask still prefers zero host cash — soft demote sponsor café unless dinner-tab ask
    if (/sponsor tab/i.test(v.cost || '') && freeAsked && !/sponsor|buyout|tab/.test(needL)) {
      score -= 2;
      reasons.push('food-sponsor');
    }
  }
  // Book club / reading circle → SFPL meeting rooms (quiet free reserve) over parks
  if (needIsBookClub(needL)) {
    if (/library/.test(blob) || /library|salon|talk|indoor/.test(tags)) {
      score += 5;
      reasons.push('book-club');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('book-outdoor');
    }
    // Sponsor-tab café is optional; office loan is OK but libraries are the free default
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('book-sponsor');
    }
  }
  // Study group / language exchange / writing circle → SFPL quiet free rooms over parks
  // (no "book" token — separate from book-club). Draft match only.
  if (needIsStudyQuiet(needL) && !needIsBookClub(needL)) {
    if (/library/.test(blob) || /library|salon|talk|indoor/.test(tags)) {
      score += 5;
      reasons.push('study-quiet');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('study-outdoor');
    }
    // Free study defaults to SFPL; sponsor-tab café is optional noise
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('study-sponsor');
    }
    // Office loan works but is heavier than a free reserve room for small study
    if (isOfficeish && nSeats > 0 && nSeats <= 16) {
      score -= 1;
      reasons.push('study-office');
    }
  }
  // Code night / pair programming / hack night → office/loan collab tables over parks.
  // Soft demote pure SFPL (solo-quiet rooms) — collab noise + power/tables fit office better.
  if (needIsCodeCollab(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('code-collab');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('code-outdoor');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 1;
      reasons.push('code-library');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('code-sponsor');
    }
  }
  // Toastmasters / public speaking / speech club → SFPL quiet free rooms over parks
  if (needIsPublicSpeaking(needL)) {
    if (/library/.test(blob) || /library|salon|talk|indoor/.test(tags)) {
      score += 5;
      reasons.push('public-speaking');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('speaking-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('speaking-sponsor');
    }
  }
  // Fireside chat / roundtable / seated discussion → SFPL quiet free rooms over parks
  if (needIsSeatedDiscussion(needL)) {
    if (/library/.test(blob) || /library|salon|talk|indoor/.test(tags)) {
      score += 5;
      reasons.push('seated-discussion');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('discussion-outdoor');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('discussion-sponsor');
    }
  }
  // Career fair / job fair / hiring night → office/loan showcase tables (not lawns)
  if (needIsCareerHiring(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('career-fair');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('career-outdoor');
    }
    // Small free fairs can use SFPL; large counts need office floor space
    if ((/library/.test(blob) || /library/.test(tags)) && nSeats >= 25) {
      score -= 2;
      reasons.push('career-library');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('career-sponsor');
    }
  }
  // Founder / open office hours → after-hours office loan over SFPL (wrong vibe + reserve process)
  if (needIsOfficeHours(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('office-hours');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 3;
      reasons.push('oh-library');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('oh-outdoor');
    }
  }
  // Run club → waterfront walk venues (Crissy/Marina/Embarcadero) over pure picnic lawns
  if (needIsRunClub(needL)) {
    if (
      /walk|meetup|networking/.test(tags) ||
      ['v_crissy', 'v_embarcadero_bench', 'v_ferry_arcade'].includes(v.id)
    ) {
      score += 4;
      reasons.push('run-club');
    }
    if (
      /picnic|parklet|lawn|green|gardens|dolores|salesforce/.test(tags + ' ' + blob) &&
      !/walk|networking/.test(tags)
    ) {
      score -= 2;
      reasons.push('run-lawn');
    }
  }
  // Bike / group ride → same walk start points (not libraries)
  if (needIsBikeRide(needL)) {
    if (
      /walk|meetup|networking|outdoor/.test(tags) ||
      ['v_crissy', 'v_embarcadero_bench', 'v_ferry_arcade', 'v_yerba_buena'].includes(v.id)
    ) {
      score += 4;
      reasons.push('bike-ride');
    }
    if (/library|indoor|salon|talk/.test(tags) && !/outdoor/.test(tags)) {
      score -= 3;
      reasons.push('bike-indoor');
    }
  }
  // Photo walk / street photo → scenic outdoor (bay + cityscape); not libraries/offices
  if (needIsPhotoWalk(needL)) {
    if (
      [
        'v_embarcadero_bench',
        'v_crissy',
        'v_ferry_arcade',
        'v_yerba_buena',
        'v_salesforce_park',
      ].includes(v.id) ||
      /embarcadero|crissy|ferry|yerba|salesforce|promenade|waterfront|marina green|roof\s*garden/.test(
        blob,
      )
    ) {
      score += 4;
      reasons.push('photo-walk');
    }
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !/outdoor|walk|meetup/.test(tags)
    ) {
      score -= 3;
      reasons.push('photo-indoor');
    }
    // Pure picnic lawns without walk/view narrative still ok but behind scenic starts
    if (
      (v.id === 'v_soma_parklet' || v.id === 'v_hayes_green') &&
      !/walk|networking|meetup/.test(tags)
    ) {
      score -= 1;
      reasons.push('photo-lawn');
    }
  }
  // Farmers market / market day → Ferry Building arcade (+ Embarcadero near); not inland lawns.
  // Outdoor in need still crowns parks via outdoor-fit — ferry boost must clear that (draft only).
  if (needIsFarmersMarket(needL)) {
    if (v.id === 'v_ferry_arcade' || /\bferry building\b|\barcade\b/.test(blob)) {
      score += 10;
      reasons.push('farmers-market');
    } else if (
      v.id === 'v_embarcadero_bench' ||
      /embarcadero promenade|embarcadero/.test(blob)
    ) {
      score += 3;
      reasons.push('market-near');
    }
    if (
      [
        'v_dolores',
        'v_hayes_green',
        'v_crissy',
        'v_soma_parklet',
        'v_salesforce_park',
      ].includes(v.id) ||
      (/dolores|hayes|crissy|marina green|south park lawn|salesforce/.test(blob) &&
        !/ferry|food|arcade/.test(blob))
    ) {
      score -= 4;
      reasons.push('not-market');
    }
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !/outdoor|meetup|food/.test(tags)
    ) {
      score -= 3;
      reasons.push('market-indoor');
    }
  }
  // Art walk / gallery hop / First Friday / museum → Yerba Buena cultural corridor (SoMa museums).
  // Demote far Marina/Crissy lawns — wrong side of town for gallery night (draft only).
  if (needIsArtCultureWalk(needL)) {
    if (
      [
        'v_yerba_buena',
        'v_salesforce_park',
        'v_soma_parklet',
        'v_embarcadero_bench',
        'v_ferry_arcade',
      ].includes(v.id) ||
      /yerba|moscone|salesforce|south park|embarcadero|ferry|promenade/.test(blob)
    ) {
      score += 4;
      reasons.push('art-walk');
    }
    // Prefer Yerba edge for museum/gallery (name-level cultural anchor)
    if (v.id === 'v_yerba_buena' || /yerba buena/.test(blob)) {
      score += 3;
      reasons.push('culture-corridor');
    }
    if (
      v.id === 'v_crissy' ||
      v.id === 'v_dolores' ||
      v.id === 'v_hayes_green' ||
      /crissy|marina green|presidio|dolores park|patricia/.test(blob)
    ) {
      score -= 3;
      reasons.push('art-far');
    }
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !/outdoor|walk|meetup/.test(tags)
    ) {
      score -= 3;
      reasons.push('art-indoor');
    }
  }
  // Waterfront / bay views / golden hour → Embarcadero / Crissy / Ferry / Marina
  if (needWantsWaterfront(needL)) {
    if (
      /embarcadero|ferry|crissy|marina|presidio|promenade|waterfront/.test(blob) ||
      ['v_embarcadero_bench', 'v_ferry_arcade', 'v_crissy'].includes(v.id)
    ) {
      score += 4;
      reasons.push('waterfront');
    } else if (!/sf various|various/i.test(areaL) && !isOfficeish) {
      score -= 1;
      reasons.push('inland');
    }
  }
  // Sunrise hang → east bayfront (Embarcadero/Ferry) over inland lawns + west-only Crissy.
  // Draft match only — not a booking API.
  if (/\bsunrise\b/.test(needL)) {
    if (
      v.id === 'v_embarcadero_bench' ||
      v.id === 'v_ferry_arcade' ||
      /embarcadero|ferry building/.test(blob)
    ) {
      score += 5;
      reasons.push('sunrise-east');
    } else if (v.id === 'v_crissy' || /crissy|marina green|presidio/.test(blob)) {
      score += 1;
      reasons.push('sunrise');
    } else if (
      outdoorAsked &&
      isPublicOutdoor &&
      (['v_dolores', 'v_hayes_green', 'v_soma_parklet', 'v_salesforce_park', 'v_yerba_buena'].includes(
        v.id,
      ) ||
        /dolores|hayes|south park|salesforce|yerba/.test(blob))
    ) {
      score -= 2;
      reasons.push('not-sunrise-bay');
    }
  }
  // Sunset hang → west bay (Crissy/Marina GG views) over east Embarcadero.
  // golden hour alone stays on shared waterfront path (east or west ok).
  if (/\bsunset\b/.test(needL) && !/\bsunrise\b/.test(needL)) {
    if (v.id === 'v_crissy' || /crissy|marina green|presidio/.test(blob)) {
      score += 4;
      reasons.push('sunset-west');
    }
    if (v.id === 'v_embarcadero_bench' || /embarcadero promenade/.test(blob)) {
      score -= 2;
      reasons.push('sunrise-east');
    }
  }
  // Rooftop / roof garden → Salesforce Park roof (only free-list roof edge)
  if (/\brooftop\b|roof\s*garden|sky\s*deck|roof\s*deck\b/.test(needL)) {
    if (v.id === 'v_salesforce_park' || /salesforce|roof\s*garden|transit center/.test(blob)) {
      score += 5;
      reasons.push('rooftop');
    } else if (/library|office|after-hours/.test(blob) && !isPublicOutdoor) {
      score -= 1;
      reasons.push('not-rooftop');
    }
  }
  // Dog-friendly / off-leash outdoor → Crissy + Dolores (classic SF dog hangs);
  // Salesforce roof garden is typically no-dogs — draft match honesty only.
  const dogAsked = /\b(dogs?|dog[- ]friendly|off[- ]leash|pup(?:pies)?)\b/.test(needL);
  if (dogAsked && (outdoorAsked || /park|walk|meetup|hang/.test(needL))) {
    if (
      v.id === 'v_crissy' ||
      v.id === 'v_dolores' ||
      /crissy|dolores|marina green/.test(blob)
    ) {
      score += 4;
      reasons.push('dog-friendly');
    }
    if (v.id === 'v_salesforce_park' || /salesforce|transit center roof/.test(blob)) {
      score -= 4;
      reasons.push('no-dogs');
    }
  }
  // Covered / sheltered / wind / fog outdoor → Ferry arcade (+ semi-shelter Yerba);
  // demote open waterfront lawns when shelter is the ask (draft match only).
  const coverWord = /\b(covered|sheltered|arcade|under\s+cover|rain[- ]?cover)\b/.test(needL);
  const windFog =
    outdoorAsked && /\b(windy|wind|fog|foggy|gusty|blustery)\b/.test(needL);
  if (coverWord || windFog) {
    // Word-boundary on arcade — "Embarcadero" must not match as covered.
    // Covered boost clears outdoor-fit/keyword on open parks (Ferry has no outdoor tag).
    if (v.id === 'v_ferry_arcade' || /\barcade\b|ferry building/.test(blob)) {
      score += 12;
      reasons.push('covered');
    } else if (v.id === 'v_yerba_buena' || /yerba buena/.test(blob)) {
      score += 2;
      reasons.push('semi-shelter');
    }
    if (
      v.id === 'v_crissy' ||
      v.id === 'v_embarcadero_bench' ||
      v.id === 'v_dolores' ||
      v.id === 'v_hayes_green' ||
      v.id === 'v_soma_parklet' ||
      /crissy|marina green|patricia|dolores park|south park lawn|promenade meetup/.test(blob)
    ) {
      score -= 3;
      reasons.push('exposed');
    }
  }
  // All-day / multi-hour / coworking → office/loan tables; SFPL hours sink
  if (needIsAllDay(needL) && !outdoorAsked) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase/.test(tags + ' ' + blob)) {
      score += 4;
      reasons.push('all-day');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 4;
      reasons.push('all-day-library');
    }
  }
  // food-near: skip on sponsor-tab when need also says free (venue list ≠ sponsor stack)
  if (
    /food|café|cafe|ferry|coffee|drinks|happy\s*hour/.test(needL) &&
    /food|meetup|sponsor|outdoor|picnic/.test(tags) &&
    !(freeAsked && /sponsor tab/i.test(v.cost || ''))
  ) {
    score += 3;
    reasons.push('food-near');
  }
  // Drinks / happy hour without outdoor picnic → food-adjacent over pure lawn
  if (drinksAsked && !outdoorAsked) {
    if (/food|meetup|sponsor/.test(tags) || /ferry|café|cafe|sponsor/.test(blob)) {
      score += 2;
      reasons.push('drinks-near');
    }
    if (
      isPublicOutdoor &&
      /picnic|park|lawn|green|gardens|dolores|parklet/.test(tags + ' ' + blob) &&
      !/food/.test(tags)
    ) {
      score -= 2;
      reasons.push('drinks-park');
    }
  }
  if (/daytime|hayes|afternoon/.test(needL) && /daytime/.test(tags)) {
    score += 2;
    reasons.push('daytime');
  }
  // Quiet dinner/salon: indoor free rooms beat loud parks (not walk-and-talk)
  if (needWantsQuiet(needL)) {
    if (/indoor|salon|talk|library|office/.test(tags + ' ' + blob)) {
      score += 3;
      reasons.push('quiet');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 3;
      reasons.push('loud-outdoor');
    }
  }
  // Indoor-only need (salon/dinner/demo/talk, not picnic/park): sink public outdoors harder
  // so free+area parks don't outrank thin indoor fits for free indoor nights.
  // Explicit "indoor" / rain still applies when networking is also in the need text.
  if (
    (needWantsIndoor(needL) || needWantsQuiet(needL)) &&
    !outdoorAsked &&
    (!needIsWalkNetwork(needL) || explicitIndoor) &&
    isPublicOutdoor
  ) {
    score -= 4;
    reasons.push('indoor-only');
  }
  // Private / exclusive room → indoor loan/library/café; demote free public parks
  if (/\bprivate\b|exclusive|closed[- ]?room|bookable room/.test(needL)) {
    if (/indoor|office|library|salon|dinner|demo|showcase/.test(tags) || isOfficeish || /library|office|café|cafe/.test(blob)) {
      score += 3;
      reasons.push('private');
    }
    if (isPublicOutdoor || /free public/i.test(v.cost || '')) {
      score -= 3;
      reasons.push('not-private');
    }
  }
  // Library rooms rarely allow dinner service — demote when food-first (salon/talk still ok)
  if (
    /dinner|supper|food|wine|course/.test(needL) &&
    /library/.test(blob) &&
    !/\b(talk|salon|lecture|reading|meeting)\b/.test(needL)
  ) {
    score -= 5;
    reasons.push('no-food-room');
  }
  // Seated dinner/supper: boost office/in-kind private rooms (not library, not sponsor-tab)
  if (
    /dinner|supper/.test(needL) &&
    !outdoorAsked &&
    !/library/.test(blob) &&
    !/sponsor tab/i.test(v.cost || '') &&
    (isOfficeish || /office|after-hours|in-kind|dinner|demo|showcase/.test(tags + ' ' + blob))
  ) {
    score += 3;
    reasons.push('dinner-room');
  }
  // Rain/weather → indoor free rooms; demote weather-exposed outdoors
  if (/\brain|weather|wet|storm|drizzle\b/.test(needL)) {
    if (needWantsIndoor(needL) || /indoor|salon|talk|library|office|dinner/.test(tags + ' ' + blob)) {
      score += 3;
      reasons.push('rain-indoor');
    }
    if (isPublicOutdoor) {
      score -= 4;
      reasons.push('rain-outdoor');
    }
  }
  // Evening without outdoor ask → soft demote weather-exposed public outdoors
  if (
    /\bevening\b|\bnight\b|after[- ]?hours/.test(needL) &&
    isPublicOutdoor &&
    !outdoorAsked
  ) {
    score -= 2;
    reasons.push('evening-outdoor');
  }
  // After-hours / evening indoor → office loans over SFPL (libraries close early / daytime reserve).
  // library-hours + no free-ask on libraries so "free evening indoor" does not crown closed SFPL.
  const eveningIndoorNeed =
    /\bafter[- ]?hours\b|\bevening\b|\bnight\b/.test(needL) &&
    !outdoorAsked &&
    (needWantsIndoor(needL) || needWantsQuiet(needL) || needIsDemoFormat(needL));
  if (eveningIndoorNeed) {
    if (isOfficeish || /after-hours|office|in-kind/.test(blob)) {
      score += 5;
      reasons.push('after-hours');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 6;
      reasons.push('library-hours');
    }
  }
  // Sunday indoor → SFPL closed; prefer office/in-kind (draft match only — not a booking API).
  const sundayAsked = /\bsundays?\b/.test(needL);
  const sundayIndoorNeed =
    sundayAsked &&
    !outdoorAsked &&
    (needWantsIndoor(needL) || needWantsQuiet(needL) || needIsDemoFormat(needL) || freeAsked);
  if (sundayIndoorNeed) {
    if (isOfficeish || /after-hours|office|in-kind/.test(blob)) {
      score += 5;
      reasons.push('sunday-open');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 7;
      reasons.push('library-sunday');
    }
  }
  // Federal / named holiday indoor → SFPL closed; prefer office/in-kind (same honesty as Sunday).
  const holidayIndoorNeed = needIsHolidayClosed(needL, outdoorAsked);
  if (holidayIndoorNeed) {
    if (isOfficeish || /after-hours|office|in-kind/.test(blob)) {
      score += 5;
      reasons.push('holiday-open');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 7;
      reasons.push('library-holiday');
    }
  }
  // ADA / wheelchair / step-free / stroller → indoor reserve rooms + office.
  // Outdoor access asks (incl. stroller walk without "outdoor" token): do not blanket-demote
  // free public parks — boost flatter path venues; soft-demote steep lawns.
  // Indoor-only access still sinks outdoors. Draft match only.
  const accessAsked =
    /\b(ada|wheelchair|accessible|accessibility|step[- ]?free|elevator|mobility|stroller|rollator)\b/.test(
      needL,
    );
  if (accessAsked) {
    // stroller/wheelchair + walk/park/hang → outdoor path preference even without "outdoor"
    const accessOutdoor =
      outdoorAsked ||
      ((/\b(walk|park|promenade|picnic|hang|meetup)\b/.test(needL) || needIsWalkNetwork(needL)) &&
        !needWantsIndoor(needL) &&
        !needWantsQuiet(needL) &&
        !needIsDemoFormat(needL));
    if (
      !isPublicOutdoor &&
      !accessOutdoor &&
      (/library|office|indoor|salon|talk|meeting/.test(tags + ' ' + blob) ||
        isOfficeish ||
        /free \(reserve\)/i.test(v.cost || ''))
    ) {
      score += 3;
      reasons.push('accessible-room');
    }
    if (accessOutdoor && isPublicOutdoor) {
      // Flat promenade / elevator roof garden beat steep lawns for outdoor + access
      if (
        ['v_embarcadero_bench', 'v_ferry_arcade', 'v_salesforce_park', 'v_yerba_buena'].includes(v.id) ||
        /promenade|arcade|roof\s*garden|transit center|embarcadero|ferry|yerba/i.test(blob)
      ) {
        score += 3;
        reasons.push('accessible-path');
      } else if (
        /dolores|hayes|crissy|marina|presidio|lawn|green|gardens|parklet/i.test(blob) ||
        ['v_dolores', 'v_hayes_green', 'v_crissy', 'v_soma_parklet'].includes(v.id)
      ) {
        score -= 1;
        reasons.push('steep-lawn');
      }
    } else if (!accessOutdoor && (isPublicOutdoor || /free public/i.test(v.cost || ''))) {
      score -= 4;
      reasons.push('not-accessible');
    }
  }
  // Daytime / weekday / lunch-and-learn indoor → SFPL open hours (inverse of after-hours).
  // Free true rooms with open daytime windows beat after-hours office narrative for free daytime talks.
  const daytimeAsked =
    /\b(daytime|morning|afternoon|weekday|lunch(?:[-\s]?and[-\s]?learn)?|noon)\b/.test(needL) &&
    !/\bevening\b|\bnight\b|after[- ]?hours/.test(needL);
  if (
    daytimeAsked &&
    !outdoorAsked &&
    (needWantsIndoor(needL) || needWantsQuiet(needL) || /\btalk\b|salon|lecture/.test(needL))
  ) {
    if (/library/.test(blob) || /library/.test(tags)) {
      score += 3;
      reasons.push('daytime-hours');
    }
  }
  // Transit ask (BART/Muni/Caltrain) → Civic/Embarcadero/Ferry hubs; demote Marina/Crissy far.
  // Caltrain terminus is 4th/King SoMa — prefer Yerba/South Park/Salesforce over far Embarcadero walk.
  const caltrainAsked = /\bcaltrain\b/.test(needL);
  if (/\b(bart|muni|caltrain|transit|metro)\b/.test(needL)) {
    if (caltrainAsked) {
      if (
        /yerba|moscone|south park|salesforce|soma/.test(blob) ||
        ['v_yerba_buena', 'v_soma_parklet', 'v_salesforce_park', 'v_office_loan'].includes(v.id)
      ) {
        score += 4;
        reasons.push('caltrain-hub');
      } else if (
        /embarcadero|ferry|civic|main library/.test(blob) ||
        ['v_ferry_arcade', 'v_embarcadero_bench', 'v_main_library'].includes(v.id)
      ) {
        score += 1;
        reasons.push('transit-hub');
      }
    } else if (
      /civic|main library|embarcadero|ferry|yerba|moscone|salesforce/.test(blob) ||
      ['v_main_library', 'v_ferry_arcade', 'v_embarcadero_bench', 'v_yerba_buena', 'v_salesforce_park'].includes(
        v.id,
      )
    ) {
      score += 3;
      reasons.push('transit-hub');
    }
    if (v.id === 'v_crissy' || /marina\s*\/\s*presidio|presidio|crissy/.test(areaL)) {
      score -= 3;
      reasons.push('transit-far');
    }
  }
  // AV / projector / whiteboard / film / podcast → indoor office-style rooms (not lawn)
  if (
    /\b(av|a\/v|projector|whiteboard|screen|hdmi|slide\s*deck)\b/.test(needL) ||
    needWantsAvQuiet(needL)
  ) {
    if (isOfficeish || /office|demo|showcase|indoor|library|salon|talk/.test(tags + ' ' + blob)) {
      score += 2;
      reasons.push('av-room');
    }
    // Film/podcast often need private control — office over open SFPL meeting rooms
    if (needWantsAvQuiet(needL) && (isOfficeish || /office|after-hours|in-kind/.test(blob))) {
      score += 3;
      reasons.push('av-private');
    }
    // Podcast/recording: open library rooms are weak (noise, no isolation)
    if (/\b(podcast|recording)\b/.test(needL) && (/library/.test(blob) || /library/.test(tags))) {
      score -= 4;
      reasons.push('rec-library');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 2;
      reasons.push('av-outdoor');
    }
  }
  // Neighborhood affinity (title often has SoMa / Mission / Hayes / FiDi) + near-area aliases
  const areaNeed =
    /\b(soma|mission|valencia|hayes|haight|embarcadero|ferry|dolores|castro|marina|potrero|dogpatch|richmond|sunset|fi?di|financial|north beach|chinatown|union square|presidio|civic(?:\s+center)?|bernal(?:\s+heights)?|tenderloin|noe(?:\s+valley)?|glen park)\b/i.exec(
      needL,
    );
  if (areaNeed) {
    let tok = areaNeed[1]
      .toLowerCase()
      .replace(/\s+center$/, '')
      .replace(/\s+heights$/, '')
      .trim();
    if (tok === 'fi' || tok === 'fdi') tok = 'fidi';
    if (tok === 'noe valley') tok = 'noe';
    if (areaMatchesNeed(tok, areaL, blob)) {
      score += 4;
      reasons.push('area');
    } else if (!/sf various|various/i.test(areaL)) {
      score -= 2;
      reasons.push('area-miss');
    }
  }
  // Drop-in / no-reserve vs bookable room honesty (draft match only — not a booking API).
  // "no reserve / drop-in / walk-up" → free public; demote free (reserve) SFPL-style rooms.
  // "bookable / reserve / permit" → free (reserve) + office/in-kind; demote free public parks.
  const noReserveAsked =
    /\b(no[- ]?reserve|drop[- ]?in|walk[- ]?up|no[- ]?permit|first[- ]?come)\b/.test(needL);
  const bookableAsked =
    !noReserveAsked &&
    /\b(bookable|reserve(?:d|able)?|reservation|permit|hold a room|room request)\b/.test(needL);
  if (noReserveAsked) {
    if (/free public/i.test(v.cost || '')) {
      score += 3;
      reasons.push('no-reserve');
    }
    if (/free \(reserve\)/i.test(v.cost || '')) {
      score -= 4;
      reasons.push('needs-reserve');
    }
  } else if (bookableAsked) {
    if (
      /free \(reserve\)/i.test(v.cost || '') ||
      isOfficeish ||
      /library|office|after-hours|in-kind/.test(tags + ' ' + blob)
    ) {
      score += 3;
      reasons.push('bookable');
    }
    if (isPublicOutdoor || /free public/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('not-bookable');
    }
  }
  // Cost honesty: true free beats sponsor tab unless dinner/sponsor need (and no free ask).
  // Under-cap free rooms skip free-ask bonus (capacity honesty over free label).
  // Evening/Sunday/holiday indoor libraries: still mark free, but no free-ask boost (hours, not price, are the block).
  // Drop-in free public still gets free-ask; free (reserve) under no-reserve skip free-ask (hours/process block).
  if (isTrueFreeCost(v.cost)) {
    score += 3;
    reasons.push('free');
    const eveningLib =
      eveningIndoorNeed && (/library/.test(blob) || /library/.test(tags));
    const sundayLib =
      sundayIndoorNeed && (/library/.test(blob) || /library/.test(tags));
    const holidayLib =
      holidayIndoorNeed && (/library/.test(blob) || /library/.test(tags));
    const reserveBlocked = noReserveAsked && /free \(reserve\)/i.test(v.cost || '');
    if (freeAsked && !underCap && !eveningLib && !sundayLib && !holidayLib && !reserveBlocked) {
      score += 2;
      reasons.push('free-ask');
    }
  }
  if (/sponsor tab/i.test(v.cost || '')) {
    // Explicit free ask → demote sponsor-tab venues (they are not free rooms)
    if (freeAsked) {
      score -= 6;
      reasons.push('not-free-ask');
    } else if (/sponsor|dinner|supper|café|cafe|buyout/.test(needL)) {
      score += 3;
      reasons.push('sponsor-tab');
    } else {
      score -= 2;
      reasons.push('not-free');
    }
  }
  if (/in-kind/i.test(v.cost || '')) {
    if (/office|demo|showcase|indoor|after-hours|dinner|supper|salon|private/.test(needL)) {
      score += 2;
      reasons.push('in-kind');
    }
  }
  if (explain) return { score, reasons: reasons.slice(0, 8) };
  return score;
}

/** Cost rank for tie-break: true free > in-kind > sponsor tab > other. */
function freeCostRank(cost) {
  if (isTrueFreeCost(cost)) return 3;
  if (/in-kind/i.test(String(cost || ''))) return 2;
  if (/sponsor tab/i.test(String(cost || ''))) return 1;
  return 0;
}

/**
 * Rank free SF venues (highest score first). Returns copies with `.score` + `.reasons`.
 * `excludeIds` drops already-selected free_list rooms (venue_alt shortlist honesty).
 * Soft capacity floor: when seats set, prefer rooms ≥ ~50% seats if any exist (draft match only).
 */
export function matchFreeVenues({ need = '', seats = 0, limit = 6, excludeIds = [] } = {}) {
  const nSeats = Number(seats) || 0;
  const skip = new Set((excludeIds || []).map((id) => String(id || '')).filter(Boolean));
  const scored = FREE_SF_VENUES.filter((v) => !skip.has(String(v.id || '')))
    .map((v) => {
      const { score, reasons } = scoreFreeVenue(v, { need, seats, explain: true });
      return { ...v, score, reasons };
    });
  // Soft floor: hide hard under-cap rooms when at least one near-fit remains
  const floor = nSeats > 0 ? Math.ceil(nSeats * 0.5) : 0;
  const fit =
    floor > 0
      ? scored.filter((v) => !(Number(v.capacity) > 0) || Number(v.capacity) >= floor)
      : scored;
  const pool = fit.length ? fit : scored;
  return pool
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Capacity that meets seats before free-label when scores tie
      if (nSeats > 0) {
        const aOk = (a.capacity || 0) >= nSeats ? 1 : 0;
        const bOk = (b.capacity || 0) >= nSeats ? 1 : 0;
        if (bOk !== aOk) return bOk - aOk;
        const da = Math.abs((a.capacity || 0) - nSeats);
        const db = Math.abs((b.capacity || 0) - nSeats);
        if (da !== db) return da - db;
      }
      // Prefer true free, then smaller room
      const costDelta = freeCostRank(b.cost) - freeCostRank(a.cost);
      if (costDelta) return costDelta;
      return (a.capacity || 0) - (b.capacity || 0);
    })
    .slice(0, Math.max(1, Math.min(limit, FREE_SF_VENUES.length)));
}

/**
 * What's still missing for the active night (draft planning only).
 * Used to order outreach drain — never claims a send or booking.
 * Includes top free-list suggestion when venue gap is open (heuristic only).
 */
export function resourceGaps(store = {}) {
  const ae = store.activeEvent || {};
  const sponsors = (store.offers?.sponsor || []).filter(
    (o) => o && !o.money && o.status !== 'declined',
  ).length;
  const volunteers = (store.offers?.volunteer || []).filter(
    (o) => o && o.status !== 'declined',
  ).length;
  const hasVenue = !!(ae.venue && (ae.venue.name || ae.venue.title));
  const venueWeak =
    hasVenue &&
    (ae.venue.source === 'free_list' ||
      ae.venue.source === 'in-kind' ||
      /in-kind|sponsor tab|free public/i.test(String(ae.venue.cost || '')));
  const needVenue = !hasVenue;
  const needVenueAlt = venueWeak; // still want private free/cheap leads
  const needSponsor = sponsors < 1;
  const needVolunteer = volunteers < 1;
  const queuedKinds = [
    ...new Set(
      (store.outreach || [])
        .filter((o) => o && (o.status === 'queued' || o.status === 'drafted'))
        .map((o) => o.kind)
        .filter(Boolean),
    ),
  ];
  const missing = [];
  if (needVenue) missing.push('venue');
  else if (needVenueAlt) missing.push('venue_alt');
  if (needSponsor) missing.push('sponsor');
  if (needVolunteer) missing.push('volunteer');
  // Draft shortlist only — never a booking claim.
  // When venue is weak free_list, exclude current pick so top is a real alt.
  let topFreeVenue = null;
  const excludeIds = [];
  if (needVenueAlt && ae.venue?.id && (ae.venue.source === 'free_list' || ae.venue.source === 'in-kind')) {
    excludeIds.push(ae.venue.id);
  }
  if (needVenue || needVenueAlt) {
    const ranked = matchFreeVenues({
      need: eventNeedText(ae),
      seats: Number(ae.seats) || 12,
      limit: 1,
      excludeIds,
    });
    topFreeVenue = ranked[0]
      ? {
          id: ranked[0].id,
          name: ranked[0].name,
          area: ranked[0].area,
          cost: ranked[0].cost,
          capacity: ranked[0].capacity ?? null,
          score: ranked[0].score,
          reasons: ranked[0].reasons,
          alt: !!excludeIds.length,
        }
      : null;
  }
  return {
    needVenue,
    needVenueAlt,
    needSponsor,
    needVolunteer,
    hasVenue,
    missing,
    queuedKinds,
    stage: ae.stage || null,
    topFreeVenue,
    excludeIds,
  };
}

/** Normalize outreach kind aliases for drain (venue_alt → venue). */
export function normalizeOutreachKind(kind) {
  const k = String(kind || 'other').toLowerCase();
  if (k === 'venue_alt' || k === 'venue-alt') return 'venue';
  if (k === 'follow_up' || k === 'follow-up') return 'thanks';
  return k || 'other';
}

/**
 * Draft readiness for drain order (higher = more complete body). Draft only — never send.
 * Venue shortlist + honesty language beat bare stubs. Contact-ready boosts drain order.
 */
export function outreachDraftReadiness(o = {}) {
  const body = String(o.body || '');
  const kind = normalizeOutreachKind(o.kind);
  const hasShortlist = /Ranked free SF|match \d+/i.test(body);
  let r = 0;
  if (hasShortlist) r += 4;
  if (/heuristic|not booked|Draft queue only|no auto-send/i.test(body)) r += 2;
  if (/Resource gaps:/i.test(body)) r += 1;
  if (/Events Bot \(by Demigod\)/i.test(body)) r += 1;
  // Thin venue stubs without shortlist sink; shortlist drafts stay drain-ready
  if (kind === 'venue' && !hasShortlist) {
    r -= 2;
    if (body.length < 80) r -= 3;
  }
  // Sponsor/volunteer: body that names the ask beats empty stubs
  if (kind === 'sponsor' && /sponsor|tab|drink|food|beverage|buyout/i.test(body) && body.length >= 60) {
    r += 2;
  }
  if (kind === 'volunteer' && /volunteer|door|setup|host-assist|day-of/i.test(body) && body.length >= 40) {
    r += 2;
  }
  // Real recipient (never invent) → drain-ready over missing/invalid email rows
  if (isRealOutreachEmail(o.toEmail)) r += 1;
  if (body.length >= 200) r += 1;
  return r;
}

/** True when body carries a free-list shortlist (venue drain honesty). */
export function outreachHasVenueShortlist(o = {}) {
  return /Ranked free SF|match \d+/i.test(String(o?.body || ''));
}

/** One-line why this outreach is next (ops / chat). */
export function outreachNextWhy(o = {}, opts = {}) {
  if (!o) return null;
  const kind = normalizeOutreachKind(o.kind);
  const gaps = opts.gaps || null;
  const bits = [];
  bits.push(kind);
  if (
    gaps?.missing?.[0] &&
    (normalizeOutreachKind(gaps.missing[0]) === kind ||
      (gaps.missing[0] === 'venue_alt' && kind === 'venue'))
  ) {
    bits.push('primary gap');
  } else if (gaps && (gaps.needVenue || gaps.needVenueAlt) && kind === 'venue') {
    bits.push('venue gap');
  } else if (gaps?.needSponsor && kind === 'sponsor') {
    bits.push('sponsor gap');
  } else if (gaps?.needVolunteer && kind === 'volunteer') {
    bits.push('volunteer gap');
  }
  if (opts.stage) bits.push('stage ' + opts.stage);
  // shortlist-ready only for actual free-list shortlist (not sponsor honesty boilerplate)
  if (outreachHasVenueShortlist(o)) bits.push('shortlist-ready');
  else if (isRealOutreachEmail(o.toEmail) && outreachDraftReadiness(o) >= 3) bits.push('contact-ready');
  if (kind === 'venue' && gaps && !gaps.needVenue && !gaps.needVenueAlt) {
    bits.push('venue-filled');
  }
  if (kind === 'sponsor' && gaps && gaps.needSponsor === false) {
    bits.push('sponsor-filled');
  }
  if (kind === 'volunteer' && gaps && gaps.needVolunteer === false) {
    bits.push('volunteer-filled');
  }
  if (kind === 'venue' && gaps?.topFreeVenue) {
    const needles = [gaps.topFreeVenue.id, gaps.topFreeVenue.name]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    const bodyL = String(o.body || '').toLowerCase();
    if (needles.some((n) => n.length >= 3 && bodyL.includes(n))) bits.push('top-free-align');
  }
  bits.push('queued · not sent');
  return bits.join(' · ');
}

/**
 * Queued/drafted outreach sorted for human drain.
 * Gap-aware + readiness + active-event scoped + top free-list align. Draft only — never send.
 * Thin venue stubs sink when a shortlist sibling already exists for the same night.
 */
export function prioritizeOutreachQueue(outreach = [], opts = {}) {
  const stage = opts.stage || null;
  const gaps = opts.gaps || null;
  const eventId = opts.eventId || null;
  const primaryGap = gaps?.missing?.[0] || null;
  const topFree = gaps?.topFreeVenue || null;
  const topFreeNeedle = topFree
    ? [topFree.id, topFree.name].filter(Boolean).map((s) => String(s).toLowerCase())
    : [];
  const list = (outreach || []).filter(
    (o) => o && (o.status === 'queued' || o.status === 'drafted'),
  );
  // eventId::kind keys that already have a free-list shortlist body (drain the ready one)
  const shortlistSiblings = new Set();
  for (const o of list) {
    if (!outreachHasVenueShortlist(o)) continue;
    const k = normalizeOutreachKind(o.kind);
    if (k !== 'venue') continue;
    shortlistSiblings.add(String(o.eventId || '_') + '::venue');
  }
  // Rich sponsor/volunteer bodies for sibling-thin demote
  const richResourceSiblings = new Set();
  for (const o of list) {
    const k = normalizeOutreachKind(o.kind);
    if (k !== 'sponsor' && k !== 'volunteer') continue;
    if (outreachDraftReadiness(o) >= 3) {
      richResourceSiblings.add(String(o.eventId || '_') + '::' + k);
    }
  }
  // Same-night same-kind: a real toEmail exists → demote no-email siblings (drain contactable first)
  const contactSiblings = new Set();
  for (const o of list) {
    if (!isRealOutreachEmail(o.toEmail)) continue;
    const k = normalizeOutreachKind(o.kind);
    if (k === 'venue' || k === 'sponsor' || k === 'volunteer' || k === 'resource') {
      contactSiblings.add(String(o.eventId || '_') + '::' + k);
    }
  }
  // Same-night same-kind: keep one winner (highest readiness, then newer at); demote dups
  const kindCounts = new Map();
  const bestByKind = new Map(); // key → { id, ready, at }
  for (const o of list) {
    const k = normalizeOutreachKind(o.kind);
    const key = String(o.eventId || '_') + '::' + k;
    kindCounts.set(key, (kindCounts.get(key) || 0) + 1);
    const ready = outreachDraftReadiness(o);
    const at = String(o.at || '');
    const prev = bestByKind.get(key);
    if (
      !prev ||
      ready > prev.ready ||
      (ready === prev.ready && at > prev.at) ||
      (ready === prev.ready && at === prev.at && String(o.id || '') > String(prev.id || ''))
    ) {
      bestByKind.set(key, { id: o.id, ready, at });
    }
  }
  return list
    .map((o) => {
      const kind = normalizeOutreachKind(o.kind);
      let priority =
        Number(o.priority) || OUTREACH_KIND_PRIORITY[kind] || OUTREACH_KIND_PRIORITY.other;
      const whyBits = [];
      // Stage tilt (resource hunting vs RSVP reminders)
      if (stage === 'resource' || stage === 'ideate') {
        if (kind === 'venue' || kind === 'sponsor' || kind === 'volunteer' || kind === 'resource') {
          priority += 12;
          whyBits.push('resource-stage');
        }
      } else if (stage === 'plan') {
        // Plan stage still drains open resource holes before invite polish (draft only)
        if (
          gaps &&
          (gaps.needVenue || gaps.needVenueAlt || gaps.needSponsor || gaps.needVolunteer) &&
          (kind === 'venue' || kind === 'sponsor' || kind === 'volunteer' || kind === 'resource')
        ) {
          priority += 10;
          whyBits.push('plan-resource-gap');
        }
      } else if (stage === 'rsvp') {
        if (String(kind || '').startsWith('rsvp_remind')) {
          priority += 15;
          whyBits.push('rsvp-remind');
        }
        // Still draining open resource holes while RSVP structure is open
        if (
          gaps &&
          (gaps.needVenue || gaps.needVenueAlt || gaps.needSponsor || gaps.needVolunteer) &&
          (kind === 'venue' || kind === 'sponsor' || kind === 'volunteer' || kind === 'resource')
        ) {
          priority += 8;
          whyBits.push('rsvp-resource-gap');
        }
      } else if (stage === 'followup') {
        if (kind === 'thanks' || kind === 'feedback_ask') {
          priority += 12;
          whyBits.push('followup');
        }
      }
      // Open gaps (venue_alt maps to venue)
      if (gaps) {
        if ((gaps.needVenue || gaps.needVenueAlt) && kind === 'venue') {
          priority += GAP_KIND_BOOST.venue;
          whyBits.push(gaps.needVenue ? 'need-venue' : 'need-venue-alt');
        }
        // Solid venue already locked → sink leftover venue drafts so sponsor/volunteer drain
        if (!gaps.needVenue && !gaps.needVenueAlt && kind === 'venue') {
          priority -= 18;
          whyBits.push('venue-filled');
        }
        if (gaps.needSponsor && kind === 'sponsor') {
          priority += GAP_KIND_BOOST.sponsor;
          whyBits.push('need-sponsor');
        }
        // Sponsor already covered → sink leftover sponsor so volunteer / next gap drains
        if (gaps.needSponsor === false && kind === 'sponsor') {
          priority -= 18;
          whyBits.push('sponsor-filled');
        }
        if (gaps.needVolunteer && kind === 'volunteer') {
          priority += GAP_KIND_BOOST.volunteer;
          whyBits.push('need-volunteer');
        }
        // Volunteer already covered → sink leftover volunteer drafts
        if (gaps.needVolunteer === false && kind === 'volunteer') {
          priority -= 18;
          whyBits.push('volunteer-filled');
        }
        if (gaps.missing?.length && kind === 'resource') {
          priority += GAP_KIND_BOOST.resource;
          whyBits.push('need-resource');
        }
        // Primary missing resource drains first among peers
        if (primaryGap === 'venue' || primaryGap === 'venue_alt') {
          if (kind === 'venue') {
            priority += 8;
            whyBits.push('primary-gap');
          }
        } else if (primaryGap === 'sponsor' && kind === 'sponsor') {
          priority += 8;
          whyBits.push('primary-gap');
        } else if (primaryGap === 'volunteer' && kind === 'volunteer') {
          priority += 8;
          whyBits.push('primary-gap');
        }
        // Venue draft that names the current top free-list pick drains first (draft only)
        // Skip when venue gap is closed (no top-free chase on filled nights).
        if (kind === 'venue' && topFreeNeedle.length && (gaps.needVenue || gaps.needVenueAlt)) {
          const bodyL = String(o.body || '').toLowerCase();
          if (topFreeNeedle.some((n) => n.length >= 3 && bodyL.includes(n))) {
            priority += 6;
            whyBits.push('top-free-align');
          }
        }
        // venue_alt body that states exclusion/alt honesty drains before generic venue stubs
        if (
          kind === 'venue' &&
          (gaps.needVenueAlt || primaryGap === 'venue_alt') &&
          /alt vs current|excluding current free_list/i.test(String(o.body || ''))
        ) {
          priority += 4;
          whyBits.push('alt-ready');
        }
        // Draft body that labels the primary open gap drains before mislabeled stubs
        if (primaryGap && (kind === normalizeOutreachKind(primaryGap) || (primaryGap === 'venue_alt' && kind === 'venue'))) {
          const gapsLine = String(o.body || '').match(/Resource gaps:\s*([^\n.]+)/i);
          if (gapsLine) {
            const labeled = gapsLine[1].toLowerCase();
            const want =
              primaryGap === 'venue_alt'
                ? /venue_alt|venue-alt|\bvenue\b/.test(labeled)
                : labeled.includes(String(primaryGap).toLowerCase());
            if (want) {
              priority += 3;
              whyBits.push('gap-label');
            }
          }
        }
      }
      // Draft readiness: shortlist + honesty language beats thin stubs (draft only)
      const ready = outreachDraftReadiness(o);
      if (ready) {
        priority += ready;
        if (outreachHasVenueShortlist(o)) whyBits.push('shortlist-ready');
        else if (ready < 0) whyBits.push('thin-draft');
        else if (isRealOutreachEmail(o.toEmail) && ready >= 3) whyBits.push('contact-ready');
      }
      // Thin venue sinks when a shortlist sibling already exists (drain ready first)
      const sibKey = String(o.eventId || '_') + '::' + kind;
      if (kind === 'venue' && !outreachHasVenueShortlist(o) && shortlistSiblings.has(sibKey)) {
        priority -= 8;
        whyBits.push('sibling-shortlist');
      }
      // Thin sponsor/volunteer sinks when a richer same-kind draft exists for this night
      if (
        (kind === 'sponsor' || kind === 'volunteer') &&
        ready < 3 &&
        richResourceSiblings.has(sibKey)
      ) {
        priority -= 5;
        whyBits.push('sibling-rich');
      }
      // No usable email when a same-kind contactable sibling exists → drain real contacts first
      if (
        !isRealOutreachEmail(o.toEmail) &&
        contactSiblings.has(sibKey) &&
        (kind === 'venue' || kind === 'sponsor' || kind === 'volunteer' || kind === 'resource')
      ) {
        priority -= 4;
        whyBits.push('no-contact');
      }
      // Duplicate same-kind same-night: drain the readiness winner first (draft only)
      if ((kindCounts.get(sibKey) || 0) > 1) {
        const best = bestByKind.get(sibKey);
        if (best && o.id !== best.id) {
          priority -= 6;
          whyBits.push('dup-kind');
        } else if (best && o.id === best.id) {
          whyBits.push('kind-best');
        }
      }
      // Prefer this night's drafts; demote other eventIds (draft drain honesty)
      if (eventId) {
        if (o.eventId === eventId) {
          priority += 10;
          whyBits.push('this-night');
        } else if (o.eventId && o.eventId !== eventId) {
          priority -= 25;
          whyBits.push('other-night');
        }
      }
      return {
        ...o,
        kind: o.kind,
        priority,
        readiness: ready,
        drainWhy: whyBits.slice(0, 6).join('+') || 'base',
      };
    })
    .sort((a, b) => b.priority - a.priority || String(b.at || '').localeCompare(String(a.at || '')));
}

/**
 * Compact next-drain view for ops/chat (draft only — never claims sent).
 * Uses prioritizeOutreachQueue + outreachNextWhy.
 */
export function outreachDrainSummary(outreach = [], opts = {}) {
  const limit = Math.max(1, Math.min(Number(opts.limit) || 5, 20));
  const ranked = prioritizeOutreachQueue(outreach, opts);
  const mapRow = (o) => ({
    id: o.id || null,
    kind: o.kind || 'other',
    kindNorm: normalizeOutreachKind(o.kind),
    priority: o.priority ?? null,
    readiness: o.readiness ?? null,
    drainWhy: o.drainWhy || null,
    why: outreachNextWhy(o, opts) || o.drainWhy || null,
    toEmail: o.toEmail || null,
    toName: o.toName || null,
    eventId: o.eventId || null,
    shortlist: outreachHasVenueShortlist(o),
  });
  return {
    count: ranked.length,
    next: ranked[0] ? mapRow(ranked[0]) : null,
    top: ranked.slice(0, limit).map(mapRow),
    note: 'Draft queue only — no auto-send. Drain order is heuristic.',
  };
}

/** One-line free-venue shortlist for outreach drafts (draft only). */
export function freeVenueShortlistLines(need, seats, n = 3, excludeIds = []) {
  return matchFreeVenues({ need, seats, limit: n, excludeIds })
    .map((v, i) => {
      const why = (v.reasons || []).length ? '; ' + v.reasons.join('+') : '';
      const reserve =
        /free \(reserve\)/i.test(String(v.cost || '')) ? ' · reserve required' : '';
      return (
        i +
        1 +
        '. ' +
        v.name +
        ' · ' +
        (v.area || 'SF') +
        ' · cap ' +
        (v.capacity || '?') +
        ' · ' +
        (v.cost || '') +
        reserve +
        ' (match ' +
        v.score +
        why +
        ')'
      );
    })
    .join('\n');
}

/**
 * Draft body for venue resource ask (pure). Includes free-list shortlist — never a booking claim.
 * When venue_alt, excludes current free_list id so ranked lines are real alternatives.
 */
export function buildVenueResourceOutreachBody(ae = {}, gaps = null, opts = {}) {
  const need = opts.need || eventNeedText(ae, opts.goal || '') || 'meetup';
  const seats = Number(opts.seats) || Number(ae.seats) || 12;
  const g = gaps || { missing: [] };
  const excludeIds =
    opts.excludeIds ||
    g.excludeIds ||
    (g.needVenueAlt && ae.venue?.id && (ae.venue.source === 'free_list' || ae.venue.source === 'in-kind')
      ? [ae.venue.id]
      : []);
  const shortlist = freeVenueShortlistLines(need, seats, 3, excludeIds);
  const top =
    g.topFreeVenue ||
    matchFreeVenues({ need, seats, limit: 1, excludeIds })[0] ||
    null;
  const altNote = excludeIds.length ? ' (alt vs current pick)' : '';
  const topLine = top
    ? 'Top free-list pick' +
      altNote +
      ' (heuristic, not booked): ' +
      (top.name || top.id) +
      (top.area ? ' · ' + top.area : '') +
      (top.cost ? ' · ' + top.cost : '') +
      (top.score != null ? ' · match ' + top.score : '') +
      ((top.reasons || []).length ? ' (' + top.reasons.join('+') + ')' : '') +
      '.\n'
    : '';
  return (
    'Current venue pick: ' +
    (ae.venue?.name || 'none') +
    ' (' +
    (ae.venue?.area || 'SF') +
    ', ' +
    (ae.venue?.cost || 'cost?') +
    ').\nSeats target: ' +
    seats +
    '.\nResource gaps: ' +
    (g.missing?.length ? g.missing.join(', ') : 'none') +
    '.\n' +
    topLine +
    '\nRanked free SF options I already scored (not booked)' +
    (excludeIds.length ? ' — excluding current free_list pick' : '') +
    ':\n' +
    shortlist +
    '\n\nSend better free/cheap SF rooms if you have them. I own the night and will update the plan. Draft queue only — no auto-send.'
  );
}

function stageChecklist(stage, ae = {}) {
  const title = ae.title || 'the night';
  const map = {
    ideate: [
      { id: 'idea_title', text: 'Lock title + outcome for ' + title },
      { id: 'idea_seats', text: 'Set target seats' },
      { id: 'idea_windows', text: 'Pick 1–3 SF date windows' },
    ],
    resource: [
      { id: 'res_venue', text: 'Secure SF venue (offer match or free option)' },
      { id: 'res_sponsor', text: 'Line up sponsor or in-kind tab (or mark skip)' },
      { id: 'res_volunteer', text: 'Confirm ≥1 volunteer or bot day-of solo' },
      { id: 'res_outreach', text: 'Queue outreach to missing resource contacts' },
    ],
    plan: [
      { id: 'plan_agenda', text: 'Write run-of-show agenda' },
      { id: 'plan_invite', text: 'Draft invite copy' },
      { id: 'plan_guest', text: 'Draft guest slate / open call' },
      { id: 'plan_partiful', text: 'Partiful/Luma draft ready' },
    ],
    rsvp: [
      { id: 'rsvp_tally', text: 'Open RSVP tally structure' },
      { id: 'rsvp_remind', text: 'Queue T-3d and T-1d reminder drafts' },
    ],
    run: [
      { id: 'run_checklist', text: 'Day-of checklist printed in store' },
      { id: 'run_host_frame', text: 'Host frame / welcome script ready' },
    ],
    followup: [
      { id: 'fu_thanks', text: 'Queue thank-you messages' },
      { id: 'fu_feedback', text: 'Ask for feedback + mutual interest' },
    ],
    debrief: [
      { id: 'db_notes', text: 'Write debrief notes' },
      { id: 'db_next', text: 'Seed next cycle idea' },
    ],
  };
  return (map[stage] || map.ideate).map((t) => ({ ...t, done: false }));
}

function defaultAgenda(ae) {
  const seats = ae.seats || 12;
  return [
    '0:00 Arrive + soft open (' + seats + ' seats target)',
    '0:15 Welcome frame (Events Bot script / human host optional)',
    '0:25 Structured intros or activity block',
    '1:05 Free conversation / demos',
    '1:40 Close + how to reconnect',
    '1:50 Pack-out / photo',
  ].join('\n');
}

/** Invite copy draft — structure only; never claims a send. */
function defaultInviteDraft(ae) {
  const seats = ae.seats || 12;
  const when = (ae.dateWindows && ae.dateWindows[0]) || 'SF window TBD';
  const where = ae.venue?.name || 'San Francisco (venue locking)';
  return (
    'You\'re invited: ' +
    (ae.title || 'an SF night') +
    '\n\nWhen: ' +
    when +
    '\nWhere: ' +
    where +
    '\nSeats: ~' +
    seats +
    '\n\n' +
    (ae.outcome ? 'Why: ' + ae.outcome + '\n\n' : '') +
    'RSVP by reply (or Partiful/Luma when the link is live). Counts stay empty until a real yes — no fake RSVPs.\n\n— Events Bot (by Demigod)'
  );
}

/**
 * Chat/tick suffix from a planTickNext result. ownerLine is already "I'll …".
 * @param {{ ownerLine?: string, whyNow?: string|null }|null} plan
 * @param {{ withWhy?: boolean }} [opts]
 */
export function ownerPlanSuffix(plan, opts = {}) {
  if (!plan?.ownerLine) return '';
  const why = opts.withWhy !== false && plan.whyNow ? ` _(why: ${plan.whyNow})_` : '';
  return ' **Next:** ' + plan.ownerLine + why;
}

/**
 * Owner next-step plan for the current stage (tick planning + chat voice).
 * First-person owner lines ("I'll …"). Honest: no invented RSVP/attendance numbers. SF only.
 * Gap-aware: free-list shortlist + prioritized outreach drain (draft only — never booked/sent).
 */
export function planTickNext(store) {
  ensureArrays(store);
  const ae = store.activeEvent || {};
  const stage = ae.stage || 'ideate';
  const gaps = resourceGaps(store);
  const queuedItems = (store.outreach || []).filter(
    (o) => o && (o.status === 'queued' || o.status === 'drafted'),
  );
  const queued = queuedItems.length;
  const rankedDrain = prioritizeOutreachQueue(queuedItems, {
    stage,
    gaps,
    eventId: ae.id || null,
  });
  const topRaw = rankedDrain[0] || null;
  const topDrain = topRaw
    ? {
        kind: topRaw.kind || 'other',
        kindNorm: normalizeOutreachKind(topRaw.kind),
        toEmail: topRaw.toEmail || null,
        toName: topRaw.toName || null,
        priority: topRaw.priority ?? null,
        readiness: topRaw.readiness ?? null,
        drainWhy: topRaw.drainWhy || null,
        why: outreachNextWhy(topRaw, { stage, gaps }) || topRaw.drainWhy || null,
        eventId: topRaw.eventId || null,
      }
    : null;
  const drainKind = topDrain?.kindNorm || null;
  const hasVenue = !!ae.venue?.name;
  const hasAgenda = !!ae.agenda;
  const hasInvite = !!ae.inviteDraft;
  const hasPf = (store.platforms?.partiful || []).some((p) => normTitle(p.title) === normTitle(ae.title || ''));
  const hasTally = !!ae.rsvpTally?.openedAt;
  const hasRemind =
    (store.outreach || []).some((o) => o.kind === 'rsvp_remind_t3d' || o.kind === 'rsvp_remind_t1d') ||
    !!ae.rsvpTally?.remindersQueued;
  const freeHint = gaps.topFreeVenue
    ? `"${gaps.topFreeVenue.name}" (${gaps.topFreeVenue.area || 'SF'} · ${gaps.topFreeVenue.cost || 'free'} — heuristic, not booked)`
    : null;

  // { do, why } — do is first-person infinitive after "I'll "
  const steps = [];
  const push = (doit, why) => steps.push({ do: doit, why: why || null });
  let drained = false;
  const pushDrain = (whyExtra) => {
    if (!topDrain || drained) return;
    drained = true;
    const who = topDrain.toName || topDrain.toEmail || 'ops';
    const readyBit =
      topDrain.readiness != null && topDrain.readiness >= 4 ? ' · shortlist-ready' : '';
    // When advance/seed already leads the pipeline, name trails (draft only — never send)
    const advanceLeads = steps.some((s) => /advance to |seed the next SF/i.test(s.do || ''));
    const trailsBit =
      advanceLeads || /trails advance/i.test(String(whyExtra || '')) ? ' · trails advance' : '';
    const why =
      whyExtra ||
      topDrain.why ||
      `${queued} queued · priority drain · no fake sends`;
    push(
      `draft-drain **${topDrain.kind}** to ${who} (queued · not sent${readyBit}${trailsBit})`,
      advanceLeads && why && !/trails advance/i.test(why)
        ? String(why) + ' · trails advance'
        : why,
    );
  };
  /** Prefer drain when a matching draft is already queued (don't re-queue the same ask). */
  const preferDrainKind = (kindNorm, whyExtra) => {
    if (drainKind === kindNorm) {
      pushDrain(whyExtra);
      return true;
    }
    return false;
  };

  if (!ae.id) {
    push('invent and spin an SF night (drive_cycle)', 'no active night');
  } else if (stage === 'ideate') {
    if (!ae.outcome || !ae.seats) push('lock outcome + seats', 'ideate gate');
    if (!ae.dateWindows?.length) push('pick 1–3 SF date windows', 'need SF timing');
    // Advance-first only when ideate gates are full (outcome + seats + SF windows)
    const ideateReady = !!(ae.outcome && ae.seats && ae.dateWindows?.length);
    if (ideateReady && !steps.some((s) => /advance to resource/i.test(s.do))) {
      steps.unshift({
        do: freeHint
          ? `advance to resource and shortlist free SF room ${freeHint}`
          : 'advance to resource and secure an SF venue',
        why: 'ideate gates ready · SF only',
      });
    }
  } else if (stage === 'resource') {
    if (gaps.needVenue) {
      if (
        !preferDrainKind(
          'venue',
          freeHint
            ? `need SF room · drain venue draft (shortlist ${freeHint})`
            : 'need SF room · drain venue draft first',
        )
      ) {
        push(
          freeHint
            ? `shortlist free SF room ${freeHint}`
            : 'select a free SF venue or match an inbound offer',
          'need SF room',
        );
      }
    } else if (gaps.needVenueAlt && freeHint) {
      if (
        !preferDrainKind(
          'venue',
          `venue weak · drain venue-alt draft first (top free ${freeHint})`,
        )
      ) {
        push(`queue a venue-alt draft (top free pick ${freeHint})`, 'venue weak · want alt');
      }
    }
    // Hard gate met → lead with advance; soft sponsor/volunteer trail in next[]
    if (hasVenue && !gaps.needVenue && !gaps.needVenueAlt) {
      push('advance to plan now that venue is set', 'venue locked · soft gaps can trail');
    }
    if (gaps.needSponsor) {
      if (!preferDrainKind('sponsor', 'sponsor gap · draft ready · not sent')) {
        push('queue a sponsor ask (or mark skip)', 'no sponsor yet');
      }
    }
    if (gaps.needVolunteer) {
      if (!preferDrainKind('volunteer', 'volunteer gap · draft ready · not sent')) {
        push('queue a volunteer ask (or run day-of solo)', 'no volunteer yet');
      }
    }
    if (queued > 0 && gaps.missing?.length && !drained) {
      pushDrain('resource gaps open · draft drain first');
    }
  } else if (stage === 'plan') {
    // Venue is a hard gate for plan quality; then plan artifacts (unlock rsvp);
    // optional sponsor/volunteer after — never block agenda/invite on soft gaps.
    if (gaps.needVenue) {
      if (
        !preferDrainKind(
          'venue',
          freeHint
            ? `venue still open · drain draft (shortlist ${freeHint})`
            : 'venue still open · drain venue draft',
        )
      ) {
        push(
          freeHint
            ? `lock an SF room via free shortlist ${freeHint}`
            : 'secure an SF venue before plan hardens',
          'venue still open',
        );
      }
    }
    if (!hasAgenda) push('write the run-of-show agenda', 'plan needs agenda');
    if (!hasInvite) push('draft invite copy (queued — no auto-blast)', 'plan needs invite');
    if (!hasPf) push('draft Partiful/Luma for this SF night', 'plan needs platform draft');
    // Artifacts ready + venue locked → lead advance (soft gaps trail); null RSVPs until real
    const planArtifactsReady = hasAgenda && (hasPf || hasInvite) && !gaps.needVenue;
    if (planArtifactsReady && !steps.some((s) => /advance to rsvp/i.test(s.do))) {
      steps.unshift({
        do: 'advance to rsvp and open tally structure (null until real)',
        why: 'plan artifacts ready · soft gaps can trail · no fake RSVPs',
      });
    } else if (hasAgenda && (hasPf || hasInvite) && !planArtifactsReady) {
      push('advance to rsvp and open tally structure (null until real)', 'plan artifacts ready');
    }
    if (gaps.needSponsor) {
      if (!preferDrainKind('sponsor', 'sponsor gap while plan hardens')) {
        push('queue a sponsor ask while plan artifacts land', 'sponsor gap');
      }
    }
    if (gaps.needVolunteer) {
      if (!preferDrainKind('volunteer', 'volunteer gap while plan hardens')) {
        push('queue a volunteer ask (or run day-of solo)', 'volunteer gap');
      }
    }
    // Plan-stage queue still drains as drafts only (trails advance when artifacts ready)
    if (queued > 0 && !drained) {
      pushDrain(
        planArtifactsReady
          ? 'plan-stage queue trails advance · not sent · no fake RSVPs'
          : 'plan-stage queue · not sent · no fake RSVPs',
      );
    }
  } else if (stage === 'rsvp') {
    if (!hasTally) push('open RSVP tally structure (invited/confirmed stay null until real)', 'rsvp structure');
    if (!hasRemind) push('queue T-3d + T-1d reminder drafts (not sent)', 'reminders pending');
    // Gap-aware: prefer drain of existing drafts over re-queue; counts stay null
    if (gaps.needVenue && freeHint) {
      if (
        !preferDrainKind(
          'venue',
          `venue still open at rsvp · drain draft (shortlist ${freeHint})`,
        )
      ) {
        push(`shortlist free SF room ${freeHint}`, 'venue still open at rsvp');
      }
    } else if (gaps.needVenueAlt && freeHint) {
      if (
        !preferDrainKind(
          'venue',
          `venue weak · drain venue-alt first (top free ${freeHint}) · counts stay null`,
        )
      ) {
        push(`queue a venue-alt draft (top free pick ${freeHint})`, 'venue weak · want alt');
      }
    }
    if (
      gaps.missing?.length &&
      topDrain &&
      ['venue', 'sponsor', 'volunteer', 'resource'].includes(drainKind) &&
      !drained
    ) {
      pushDrain(`gaps: ${gaps.missing.join(', ')} · counts stay null`);
    } else if (queued > 0 && !drained) {
      // Tick planning: reminder/invite drains get a clearer why than bare "N queued"
      const remindDrain =
        drainKind && /rsvp_remind|invite|guest/.test(String(drainKind));
      pushDrain(
        remindDrain
          ? 'reminder/invite draft ready · counts stay null · no fake sends'
          : queued + ' queued · no fake RSVPs',
      );
      if (!topDrain) {
        push(
          'hold counts at null and drain the outreach queue when transport is live',
          queued + ' queued · no fake RSVPs',
        );
      }
    }
    // Always keep null-count honesty in the pipeline (owner voice + chat), even when drain leads
    const countsNull =
      (ae.outcomes?.invited ?? null) == null &&
      (ae.outcomes?.confirmed ?? null) == null &&
      (ae.outcomes?.attended ?? null) == null;
    // Structure ready + empty queue → lead with advance; null honesty still in next[]
    const rsvpReady =
      hasTally && hasRemind && countsNull && queued === 0 && !gaps.needVenue && !gaps.needVenueAlt;
    if (rsvpReady && !steps.some((s) => /advance to run/i.test(s.do))) {
      // unshift-equivalent: prefer advance as primary owner step
      steps.unshift({
        do: 'advance to run when the SF date lands (door tally stays null until real)',
        why: 'rsvp structure ready · no fake RSVPs',
      });
    }
    const hasHoldNull = steps.some((s) =>
      /null until real|hold counts at null|hold invited\/confirmed/i.test(s.do),
    );
    if (countsNull && !hasHoldNull) {
      push('hold invited/confirmed/attended at null until real replies', 'no fake RSVPs');
    } else if (!steps.length || steps.every((s) => /tally|remind/i.test(s.do))) {
      push('hold invited/confirmed/attended at null until real replies', 'no fake RSVPs');
    }
  } else if (stage === 'run') {
    // Day-of artifacts (checklist + host frame) → lead advance; null door tally trails
    const hasChecklist = !!ae.dayOfChecklist?.length;
    const hasHostFrame = !!ae.hostFrame;
    const runArtifactsReady = hasChecklist && hasHostFrame;
    if (!runArtifactsReady) {
      if (!hasChecklist && !hasHostFrame) {
        push('print day-of checklist + host frame and run the SF room', 'day-of');
      } else if (!hasChecklist) {
        push('print day-of checklist (host frame ready) and run the SF room', 'day-of checklist');
      } else {
        push('print host frame (checklist ready) and run the SF room', 'day-of host frame');
      }
    } else if (!steps.some((s) => /advance to followup/i.test(s.do))) {
      steps.unshift({
        do: 'advance to followup when the SF night closes (door tally stays null until real)',
        why: 'run artifacts ready · no fake RSVPs',
      });
    }
    // Day-of queue still drains as drafts only (never claim send); trails advance when ready
    if (queued > 0 && !drained) {
      pushDrain(
        runArtifactsReady
          ? 'day-of queue trails advance · not sent · no fake RSVPs'
          : 'day-of queue · not sent · no fake RSVPs',
      );
    }
    // Day-of: still no invented headcount
    if (
      (ae.outcomes?.invited ?? null) == null &&
      (ae.outcomes?.confirmed ?? null) == null &&
      (ae.outcomes?.attended ?? null) == null
    ) {
      push('hold invited/confirmed/attended at null until real door tally', 'no fake RSVPs · day-of');
    }
  } else if (stage === 'followup') {
    const hasThanks = (store.outreach || []).some(
      (o) =>
        o &&
        (o.kind === 'thanks' || /thank/i.test(String(o.kind || ''))) &&
        (o.status === 'queued' || o.status === 'drafted'),
    );
    // Thanks draft ready → lead advance to debrief; soft null attendance trails
    if (!hasThanks) {
      push('queue thank-yous + feedback; intros only on mutual yes', 'post-night');
    } else if (!steps.some((s) => /advance to debrief/i.test(s.do))) {
      steps.unshift({
        do: 'advance to debrief from real post-night evidence (attendance null until real)',
        why: 'followup drafts ready · no fake RSVPs',
      });
    }
    if (queued > 0 && !drained) {
      pushDrain(
        hasThanks
          ? 'post-night queue trails advance · no fake sends'
          : 'post-night queue · no fake sends',
      );
    }
    if (
      (ae.outcomes?.attended ?? null) == null &&
      (ae.outcomes?.confirmed ?? null) == null
    ) {
      push('hold attendance null until real post-night evidence (no fake RSVPs)', 'no invent attendance');
    }
  } else if (stage === 'debrief') {
    const hasDebrief = !!(ae.debrief || ae.debriefNotes || ae.outcomes?.debriefAt);
    if (!hasDebrief) {
      push('write debrief from real attendance and seed the next SF cycle', 'close the loop');
    } else if (!steps.some((s) => /seed the next|spin the next/i.test(s.do))) {
      steps.unshift({
        do: 'seed the next SF cycle from real debrief only (no invent attendance)',
        why: 'debrief ready · no fake RSVPs',
      });
    }
    if ((ae.outcomes?.attended ?? null) == null) {
      push('seed next only with real attendance — leave attended null until evidence', 'no fake RSVPs');
    }
  }

  if (!steps.length) {
    push('hold this stage until offers or constraints land — then replan', 'stable');
  }

  const top = steps[0];
  const next = steps.slice(0, 4).map((s) => "I'll " + s.do + '.');
  const ownerLine = "I'll " + top.do + '.';
  // Tick planning signal for chat owner voice (advance/seed leads pipeline)
  const readyToAdvance = /advance to |seed the next SF/i.test(top.do || '');
  // Named gate target for owner tick-plan voice ("gate open → followup")
  let advanceTarget = null;
  if (readyToAdvance) {
    const advM = /advance to (\w+)/i.exec(top.do || '');
    if (advM) advanceTarget = advM[1].toLowerCase();
    else if (/seed the next SF/i.test(top.do || '')) advanceTarget = 'next';
  }
  // Gate status for chat owner tick-plan lead (open vs held · unlock = primary)
  const gateStatus = readyToAdvance ? 'open' : 'held';
  // When held: primary ownerLine is the unlock (one-glance tick planning; never invent RSVPs)
  const unlockLine = readyToAdvance ? null : ownerLine;

  return {
    stage,
    title: ae.title || null,
    city: 'San Francisco',
    venue: ae.venue?.name || null,
    outreachQueued: queued,
    voice: 'owner',
    whyNow: top.why || null,
    readyToAdvance,
    advanceTarget,
    gateStatus,
    unlockLine,
    gaps: {
      missing: gaps.missing || [],
      needVenue: !!gaps.needVenue,
      needVenueAlt: !!gaps.needVenueAlt,
      needSponsor: !!gaps.needSponsor,
      needVolunteer: !!gaps.needVolunteer,
      topFreeVenue: gaps.topFreeVenue || null,
      // Soft when only venue_alt (room exists, free-list alt still open — not a hard miss)
      softVenueAlt: !!(gaps.needVenueAlt && !gaps.needVenue && gaps.hasVenue),
    },
    topDrain,
    drainSummary: outreachDrainSummary(queuedItems, {
      stage,
      gaps,
      eventId: ae.id || null,
      limit: 5,
    }),
    rsvpHonesty: {
      invited: ae.outcomes?.invited ?? null,
      confirmed: ae.outcomes?.confirmed ?? null,
      attended: ae.outcomes?.attended ?? null,
      note: 'Null until real — no fake RSVPs',
    },
    next,
    ownerLine,
  };
}

export const STAGES = ['ideate', 'resource', 'plan', 'rsvp', 'run', 'followup', 'debrief'];

export function normalizeStage(s) {
  const x = String(s || 'ideate').toLowerCase().replace(/[^a-z]/g, '');
  const map = { resourcing: 'resource', planning: 'plan', rsvps: 'rsvp', followups: 'followup', follow: 'followup', debriefnext: 'debrief', done: 'debrief' };
  const id = map[x] || x;
  return STAGES.includes(id) ? id : null;
}

/**
 * Fail-closed stage advance: one step forward only, with evidence gates.
 * Pure — no IO. Never invents RSVPs.
 * @returns {{ ok: boolean, reason?: string, from?: string, to?: string, next?: string }}
 */
/**
 * Pure: real published Partiful/Luma invite for this night?
 * Checks ae.published_url|inviteUrl + platforms rows (status published_url + real https).
 * Never invents; fail-closed.
 */
export function hasPublishedInviteUrl(ae = {}, store = {}) {
  const tryUrl = (u) => {
    if (!u) return false;
    return isRealInviteUrl(u, 'partiful') || isRealInviteUrl(u, 'luma');
  };
  if (tryUrl(ae.published_url || ae.publishedUrl || ae.inviteUrl)) return true;
  const title = String(ae.title || '')
    .trim()
    .toLowerCase();
  const id = ae.id || null;
  for (const kind of ['partiful', 'luma']) {
    for (const p of store?.platforms?.[kind] || []) {
      if (!p || String(p.status || '') !== 'published_url') continue;
      const sameEvent = !!(id && p.eventId === id);
      const sameTitle =
        !!(!p.eventId && title && String(p.title || '').trim().toLowerCase() === title);
      if (!sameEvent && !sameTitle) continue;
      if (tryUrl(p.inviteUrl || p.publishedUrl)) return true;
    }
  }
  return false;
}

export function canAdvanceStage(from, to, ae = {}, store = {}) {
  const f = normalizeStage(from);
  if (!f) return { ok: false, reason: 'unknown_stage', from: String(from || ''), to: String(to || '') };
  const t = normalizeStage(to);
  if (!t) return { ok: false, reason: 'unknown_stage', from: f, to: String(to || '') };
  if (f === t) return { ok: false, reason: 'same_stage', from: f, to: t };
  const fi = STAGES.indexOf(f);
  const ti = STAGES.indexOf(t);
  if (ti !== fi + 1) {
    return {
      ok: false,
      reason: 'must_advance_one_step',
      from: f,
      to: t,
      next: STAGES[fi + 1] || null,
    };
  }
  const venueName =
    (ae.venue && (ae.venue.name || ae.venue.title || ae.venue)) || ae.venueName || '';
  if (t === 'resource') {
    if (!String(ae.outcome || '').trim() || !Number.isInteger(Number(ae.seats)) || Number(ae.seats) < 1) return { ok: false, reason: 'need_outcome_and_seats', from: f, to: t };
  }
  if (t === 'plan') {
    if (!String(venueName || '').trim()) return { ok: false, reason: 'need_venue', from: f, to: t };
    const venueCity = typeof ae.venue === 'object' ? String(ae.venue.city || '').trim() : '';
    const venueLocation = typeof ae.venue === 'object'
      ? [ae.venue.name, ae.venue.area, ae.venue.city, ae.venue.location].filter(Boolean).join(' ')
      : venueName;
    if (mentionsNonSf(venueLocation) || (venueCity && !SF_OK.test(venueCity))) return { ok: false, reason: 'need_sf_venue', from: f, to: t };
  }
  if (t === 'rsvp') {
    if (!ae.agenda) return { ok: false, reason: 'need_agenda', from: f, to: t };
    const title = ae.title || '';
    const hasPf = (store.platforms?.partiful || []).some(
      (p) => p && String(p.title || '').toLowerCase() === String(title).toLowerCase(),
    );
    if (!hasPf && !ae.inviteDraft) {
      return { ok: false, reason: 'need_invite_or_partiful', from: f, to: t };
    }
  }
  if (t === 'run') {
    // Structure only — counts stay null until real
    if (!ae.rsvpTally?.openedAt && !ae.inviteDraft) {
      return { ok: false, reason: 'need_rsvp_tally_or_invite', from: f, to: t };
    }
    // Honest run: require real published invite URL outside MOCK (no fake night-of)
    if (process.env.DEMIGOD_EVENTS_BOT_MOCK !== '1' && !hasPublishedInviteUrl(ae, store)) {
      return {
        ok: false,
        reason: 'need_published_invite_url',
        message:
          'Need a real Partiful/Luma published URL before run — paste into /tmp/dg-busy/events-bot/HUMAN-INVITE-URLS.md or outbox Invite URL line (bin/dg-events-outbox / record_invite_url). Never invent RSVPs.',
        from: f,
        to: t,
      };
    }
  }
  if (t === 'followup') {
    // Allow after run; no invented attendance required
  }
  if (t === 'debrief') {
    // Allow after followup
  }
  return { ok: true, from: f, to: t };
}

/**
 * Parse chat/goal text for an explicit lifecycle target (pure).
 * Evidence language → stage the host is asking for — never invents RSVPs.
 * @returns {string|null} stage id or null
 */
export function parseStageAdvanceIntent(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  // Explicit "advance/move/set/hop stage to|: X" wins (colon forms common in chat)
  const m = t.match(
    /\b(?:advance|move|set|go|hop|jump)\s+(?:(?:the\s+)?(?:stage|lifecycle)\s+)?(?:to\s*|:\s*)?(ideate|resource|plan|rsvp|run|follow[- ]?up|followup|debrief)\b/,
  );
  if (m) return normalizeStage(m[1].replace(/[- ]/g, ''));
  // "next stage is plan" / "stage: rsvp" / "lifecycle → followup"
  const m2 = t.match(
    /\b(?:next\s+)?(?:stage|lifecycle)\s*(?:is|to|=|:|→|->)\s*(ideate|resource|plan|rsvp|run|follow[- ]?up|followup|debrief)\b/,
  );
  if (m2) return normalizeStage(m2[1].replace(/[- ]/g, ''));
  if (/^(?:what|which|how|why|when|where|who|is|are|do|does|can|could|would)\b/.test(t.trim())) return null;
  if (/\bdebrief\b/.test(t)) return 'debrief';
  if (
    /\b(night (happened|went|is over|ran|done)|post[- ]?event|after the night|follow[- ]?up stage|start follow[- ]?up)\b/.test(
      t,
    )
  ) {
    return 'followup';
  }
  if (/\b(day[- ]?of|we'?re live|running (the )?night|start the run|stage run)\b/.test(t)) return 'run';
  if (/\b(open rsvps?|start rsvps?|ready for rsvp|rsvp stage|begin rsvp)\b/.test(t)) return 'rsvp';
  if (
    /\b(ready for plan|plan stage|venue (is )?(ready|locked|secured|confirmed|set)|we have (a |the )?venue)\b/.test(
      t,
    )
  ) {
    return 'plan';
  }
  if (/\b(resource stage|start resourcing|ready to resource)\b/.test(t)) return 'resource';
  return null;
}

/**
 * Walk lifecycle one fail-closed step at a time toward `to` while gates pass.
 * Does not invent RSVPs. Stops on first blocked gate (returns reason).
 * Optional fill: drive_cycle first so venue/agenda/invite exist for early hops.
 */
export function advanceLifecycleToward(to, opts = {}) {
  const target = normalizeStage(to);
  if (!target) return { ok: false, error: 'unknown_stage', to: String(to || '') };
  let store = loadStore();
  ensureArrays(store);
  if (!store.activeEvent?.id) {
    return { ok: false, error: 'no active event — spin_up_event or drive first' };
  }
  const note = clamp(opts.note || `advance toward ${target}`, 200);
  const log = [];
  const startBefore = store.activeEvent?.stage || 'ideate';
  // Fill plan artifacts before hopping through early stages (may overshoot if gates pass)
  if (opts.fill !== false && STAGES.indexOf(target) <= STAGES.indexOf('rsvp')) {
    try {
      const filled = runTool('drive_cycle', { goal: opts.goal || note });
      log.push({
        step: 'fill',
        result: { ok: !!filled?.ok, stage: filled?.resources?.activeEvent?.stage },
      });
      store = loadStore();
    } catch {
      /* drive optional */
    }
  }
  const start = store.activeEvent?.stage || 'ideate';
  const ti = STAGES.indexOf(target);
  const si = STAGES.indexOf(normalizeStage(start) || 'ideate');
  // Already at or past target after fill — success (lifecycle moved when evidence existed)
  if (si >= ti && ti >= 0) {
    if (start === 'rsvp') ensureRsvpStructure(store, store.activeEvent, log);
    return {
      ok: true,
      already: startBefore === start && start === target,
      overshot: si > ti,
      from: startBefore,
      stage: start,
      to: target,
      log,
    };
  }
  if (si < 0) {
    return { ok: false, error: 'unknown_current_stage', from: start, to: target, log };
  }
  for (let hop = 0; hop < STAGES.length; hop++) {
    store = loadStore();
    const ae = store.activeEvent;
    const from = ae?.stage || 'ideate';
    if (from === target) {
      return { ok: true, from: start, stage: from, hops: hop, log };
    }
    const fi = STAGES.indexOf(normalizeStage(from) || 'ideate');
    const next = STAGES[fi + 1];
    if (!next) break;
    if (STAGES.indexOf(next) > STAGES.indexOf(target)) break;
    // Same-tick RSVP structure so run gate can pass when host asks for day-of
    if (from === 'rsvp') {
      ensureRsvpStructure(store, ae, log);
      store = loadStore();
    }
    const gate = canAdvanceStage(store.activeEvent.stage, next, store.activeEvent, store);
    if (!gate.ok) {
      return {
        ok: false,
        error: gate.reason || 'advance_denied',
        from: store.activeEvent.stage,
        to: target,
        next: gate.next || next,
        blockedAt: next,
        log,
      };
    }
    const r = runTool('set_stage', { stage: next, note: note + ` (${from}→${next})` });
    log.push({ step: 'advance', result: r });
    if (!r.ok) {
      return {
        ok: false,
        error: r.error || 'set_stage_failed',
        from: store.activeEvent?.stage,
        to: target,
        log,
      };
    }
  }
  store = loadStore();
  const final = store.activeEvent?.stage || null;
  // Open RSVP structure if we landed on rsvp
  if (final === 'rsvp') {
    ensureRsvpStructure(store, store.activeEvent, log);
    store = loadStore();
  }
  return {
    ok: final === target,
    from: start,
    stage: final,
    to: target,
    error: final === target ? undefined : 'stopped_before_target',
    log,
  };
}

/** Open null RSVP tally + reminder drafts when stage is rsvp (no fake counts). Mutates via save. */
function ensureRsvpStructure(storeIn, aeIn, log = []) {
  let store = storeIn || loadStore();
  ensureArrays(store);
  let ae = aeIn || store.activeEvent;
  if (!ae || ae.stage !== 'rsvp') return { ok: false, skipped: true };
  const now = new Date().toISOString();
  ae.outcomes = ae.outcomes || {};
  if (ae.outcomes.invited === undefined) ae.outcomes.invited = null;
  if (ae.outcomes.confirmed === undefined) ae.outcomes.confirmed = null;
  if (ae.outcomes.attended === undefined) ae.outcomes.attended = null;
  if (ae.outcomes.invited === 0 && !ae.rsvpTally?.realList) ae.outcomes.invited = null;
  if (ae.outcomes.confirmed === 0 && !ae.rsvpTally?.realList) ae.outcomes.confirmed = null;
  if (ae.outcomes.attended === 0 && !ae.rsvpTally?.realList) ae.outcomes.attended = null;

  if (!ae.rsvpTally?.openedAt) {
    ae.rsvpTally = {
      openedAt: now,
      channel: 'email / Partiful when link live',
      invited: null,
      confirmed: null,
      waitlist: null,
      realList: false,
      note: 'Structure only — counts stay null until real RSVPs. No fake RSVPs.',
    };
    ae.updatedAt = now;
    saveStore(store);
    log.push({ step: 'rsvp_tally_open', result: { ok: true, honesty: 'null_until_real' } });
  }

  const hasT3 = (store.outreach || []).some(
    (o) => o.kind === 'rsvp_remind_t3d' && (o.status === 'queued' || o.status === 'drafted'),
  );
  const hasT1 = (store.outreach || []).some(
    (o) => o.kind === 'rsvp_remind_t1d' && (o.status === 'queued' || o.status === 'drafted'),
  );
  if (!hasT3) {
    log.push({
      step: 'rsvp_remind_t3d',
      result: runTool('queue_outreach', {
        toEmail: 'potter@trydemigod.com',
        toName: 'Events Bot ops',
        kind: 'rsvp_remind_t3d',
        subject: 'T-3d reminder draft: ' + ae.title,
        body:
          'DRAFT — T-3 days before "' +
          (ae.title || 'SF night') +
          '" (SF).\nVenue: ' +
          (ae.venue?.name || 'TBD') +
          '\nWindow: ' +
          ((ae.dateWindows && ae.dateWindows[0]) || 'TBD') +
          '\n\nFriendly nudge to guests who have a real invite only. Do not invent RSVP counts. Queued until send transport is live.',
      }),
    });
  }
  if (!hasT1) {
    log.push({
      step: 'rsvp_remind_t1d',
      result: runTool('queue_outreach', {
        toEmail: 'potter@trydemigod.com',
        toName: 'Events Bot ops',
        kind: 'rsvp_remind_t1d',
        subject: 'T-1d reminder draft: ' + ae.title,
        body:
          'DRAFT — T-1 day before "' +
          (ae.title || 'SF night') +
          '" (SF).\nConfirm address + start time. Only to people with a real seat/yes. No fake RSVPs.',
      }),
    });
  }
  store = loadStore();
  ae = store.activeEvent;
  if (ae?.rsvpTally) {
    ae.rsvpTally.remindersQueued = true;
    ae.updatedAt = now;
    if (Array.isArray(ae.checklist)) {
      ae.checklist = ae.checklist.map((c) =>
        c.id === 'rsvp_tally' || c.id === 'rsvp_remind' ? { ...c, done: true } : c,
      );
    }
    saveStore(store);
  }
  return { ok: true };
}

/** Keep store.events[] in sync with activeEvent (stage advancement quality). */
export function syncActiveEventToList(store) {
  if (!store?.activeEvent?.id) return store;
  store.events = Array.isArray(store.events) ? store.events : [];
  const id = store.activeEvent.id;
  const i = store.events.findIndex((e) => e && e.id === id);
  const snap = { ...store.activeEvent };
  if (i >= 0) store.events[i] = { ...store.events[i], ...snap };
  else store.events.push(snap);
  return store;
}

function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Offer is SF-eligible (hard rule).
 * City uses full isSfLocation. Free-text only hard-rejects NON_SF cities —
 * bare "loft"/"space"/"warehouse" offer blurbs must not fail a real SF city row.
 */
export function offerIsSf(o = {}) {
  const city = String(o.city || '').trim();
  if (city && (!isSfLocation(city) || !SF_OK.test(city))) return false;
  const blob = [o.offer, o.org, o.name, o.venue].filter(Boolean).join(' ');
  if (blob && mentionsNonSf(blob)) return false;
  return Boolean(city || SF_OK.test(blob));
}

const OFFER_STATUS_RANK = {
  accepted: 4,
  matched: 3,
  new: 2,
  pending: 2,
  reviewed: 1,
};

/**
 * Rank sponsor/venue/volunteer offers for the active event.
 * Pure — no IO. Hard SF filter. Never invents contacts or emails.
 * Public surfaces must still omit emails; this scores private store rows only.
 */
export function matchOffersToEvent(store) {
  const ae = store.activeEvent || {};
  const seats = Number(ae.seats) || 0;
  const needs = String(ae.needs || ae.notes || ae.outcome || ae.title || '').toLowerCase();
  const eventId = ae.id || null;

  const scoreOffer = (o, kind) => {
    const blob = ((o.offer || '') + ' ' + (o.org || '') + ' ' + (o.name || '') + ' ' + (o.city || '')).toLowerCase();
    let s = 0;
    // Capacity fit (venues especially)
    if (seats && o.capacity != null && o.capacity !== '') {
      const cap = Number(o.capacity) || 0;
      if (cap >= seats) s += 4;
      else if (cap >= seats * 0.6) s += 1;
      else s -= 3;
    } else if (kind === 'venue' && seats) {
      s += 0; // unknown capacity: neutral
    }
    // Need/keyword overlap
    if (/food|dinner|tab|sponsor|cash|beverage|wine/.test(needs) && /food|dinner|tab|cash|sponsor|beverage|wine|buyout/.test(blob)) s += 3;
    if (/photo|av|check|setup|door/.test(needs) && /photo|av|check|setup|door|greet/.test(blob)) s += 2;
    if (/indoor|salon|talk|office|library|loft/.test(needs) && /indoor|office|room|loft|salon|library/.test(blob)) s += 3;
    if (/outdoor|park|picnic|lawn/.test(needs) && /outdoor|park|picnic|yard|lawn/.test(blob)) s += 3;
    if (kind === 'volunteer' && /volunteer|door|setup|host-assist|greet|photo/.test(blob + ' ' + needs)) s += 2;
    if (kind === 'sponsor' && /sponsor|tab|cash|in-kind|brand/.test(blob)) s += 2;
    if (kind === 'venue' && /venue|space|room|loft|office|capacity|seats/.test(blob)) s += 1;
    // Linked to this night
    if (eventId && o.eventId === eventId) s += 5;
    // Status preference
    s += OFFER_STATUS_RANK[String(o.status || 'new').toLowerCase()] || 0;
    // Fresher offers slightly preferred (ISO timestamps sort)
    if (o.at || o.createdAt) s += 0.001; // stable tie-break via sort below
    // SF signal in city (already filtered; small bonus for explicit SF)
    if (SF_OK.test(String(o.city || '')) || SF_OK.test(blob)) s += 1;
    return s;
  };

  const rankKind = (list, kind, extraFilter = () => true) => {
    const mock = process.env.DEMIGOD_EVENTS_BOT_MOCK === '1';
    const eligible = (list || []).filter(
      (o) =>
        o &&
        !['declined', 'rejected'].includes(String(o.status || '').toLowerCase()) &&
        extraFilter(o) &&
        offerIsSf(o) &&
        (!eventId || !o.eventId || o.eventId === eventId) &&
        (mock || !isFixtureOfferId(o.id)),
    );
    return eligible
      .filter((o) => isRealOutreachEmail(o.email))
      .filter((o) => {
        if (kind !== 'venue' || !seats || o.capacity == null || o.capacity === '') return true;
        return Number(o.capacity) >= seats * 0.6;
      })
      .map((o) => ({
        id: o.id,
        kind,
        name: o.name,
        org: o.org,
        capacity: o.capacity,
        city: o.city || 'San Francisco',
        status: o.status || 'new',
        eventId: o.eventId || null,
        offer: String(o.offer || '').slice(0, 120),
        score: scoreOffer(o, kind),
        // no email in match rows — drain uses private store
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          String(b.id || '').localeCompare(String(a.id || '')),
      )
      .slice(0, 10);
  };

  const venues = rankKind(store.offers?.venue, 'venue');
  const sponsors = rankKind(store.offers?.sponsor, 'sponsor', (o) => !o.money);
  const volunteers = rankKind(store.offers?.volunteer, 'volunteer');
  // Exclude locked free_list pick when venue is weak (alt shortlist honesty)
  const freeExclude = [];
  if (
    ae.venue?.id &&
    (ae.venue.source === 'free_list' || ae.venue.source === 'in-kind') &&
    /in-kind|sponsor tab|free public|free \(reserve\)/i.test(String(ae.venue.cost || ae.venue.source || ''))
  ) {
    freeExclude.push(ae.venue.id);
  }
  const freeRanked = matchFreeVenues({
    need: eventNeedText(ae),
    seats: seats || 12,
    limit: 4,
    excludeIds: freeExclude,
  });
  return {
    venues,
    sponsors,
    volunteers,
    freeVenues: freeRanked,
    seatsNeeded: seats || null,
    top: {
      venue: venues[0] || null,
      sponsor: sponsors[0] || null,
      volunteer: volunteers[0] || null,
    },
  };
}

/**
 * Persist top SF offer matches onto activeEvent (ids + scores only).
 * Links offer.eventId when scoring into this night. No emails invented.
 */
export function stampOfferMatches(store) {
  if (!store?.activeEvent?.id) return null;
  const matched = matchOffersToEvent(store);
  const ae = store.activeEvent;
  const top = matched.top || {};
  ae.matchedOffers = {
    venueId: top.venue?.id || null,
    sponsorId: top.sponsor?.id || null,
    volunteerId: top.volunteer?.id || null,
    venueScore: top.venue?.score ?? null,
    sponsorScore: top.sponsor?.score ?? null,
    volunteerScore: top.volunteer?.score ?? null,
    at: new Date().toISOString(),
  };
  // Soft-link ranked rows to this event (do not invent status=accepted)
  for (const [kind, row] of [
    ['venue', top.venue],
    ['sponsor', top.sponsor],
    ['volunteer', top.volunteer],
  ]) {
    if (!row?.id) continue;
    const list = store.offers?.[kind] || [];
    const o = list.find((x) => x && x.id === row.id);
    if (!o) continue;
    if (!o.eventId) o.eventId = ae.id;
    if (!o.status || o.status === 'new') o.status = 'matched';
  }
  ae.updatedAt = new Date().toISOString();
  return matched;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'propose_event_ideas',
      description:
        'Generate 2–4 original San Francisco–only event ideas. Not limited to Demigod/talent themes — fun SF nights ok. Prefer sponsorable formats (clear audience, fundable needs, brand moment).',
      parameters: {
        type: 'object',
        properties: {
          seed: { type: 'string', description: 'Optional theme or constraint from host/feedback' },
          count: { type: 'integer', description: 'How many ideas (2-4)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_idea',
      description:
        'Save an event idea (original or user suggestion). SF only. May be any fun event; if bot-sourced, include sponsorable angle when possible.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          format: { type: 'string' },
          outcome: { type: 'string' },
          seats: { type: 'integer' },
          needs: { type: 'string', description: 'Sponsors, venue, volunteers needed' },
          sponsorable: { type: 'string', description: 'Why a sponsor might fund this' },
          source: { type: 'string', description: 'bot|user|feedback' },
        },
        required: ['title', 'outcome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_feedback',
      description: 'Store general feedback about Events Bot or a past/planned night.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          topic: { type: 'string' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spin_up_event',
      description: 'Create/activate a local event from an idea and set lifecycle stage.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          outcome: { type: 'string' },
          seats: { type: 'integer' },
          stage: { type: 'string' },
          dateWindows: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['title', 'outcome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_outreach',
      description:
        'Queue a proactive message asking for sponsorship, free venue, volunteers, or other resources. Always includes bot identity blurb.',
      parameters: {
        type: 'object',
        properties: {
          toEmail: { type: 'string' },
          toName: { type: 'string' },
          kind: {
            type: 'string',
            description: 'sponsor|venue|volunteer|resource|feedback_ask|other',
          },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Message body WITHOUT identity footer (added automatically)' },
          channel: { type: 'string', description: 'email (default)' },
        },
        required: ['toEmail', 'kind', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_money_intent',
      description:
        'Record sponsor money interest (amount range, contact). Stripe collect is pending — this is intent only unless Stripe is live.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          org: { type: 'string' },
          amountNote: { type: 'string' },
          cents: { type: 'integer', description: 'Optional amount in cents if known' },
        },
        required: ['name', 'email', 'amountNote'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'luma_create_event',
      description:
        'Create event on Luma if LUMA_API_KEY set; otherwise return a ready-to-paste Luma brief. Requires Luma Plus.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          startAt: { type: 'string', description: 'ISO datetime' },
          endAt: { type: 'string' },
          timezone: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'partiful_draft',
      description:
        'Partiful has no official public API — produce a Partiful-ready event draft (title, description, steps for manual/browser create).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          when: { type: 'string' },
          where: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_invite_url',
      description:
        'After a human publishes a real Partiful or Luma invite, record the real https URL on the draft. Never invent URLs or RSVP counts.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'partiful | luma' },
          url: { type: 'string', description: 'Real https invite URL' },
          id: { type: 'string', description: 'Optional draft id' },
          title: { type: 'string', description: 'Optional title match' },
        },
        required: ['platform', 'url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_debrief',
      description:
        'Host-attested post-night outcomes (followup|debrief only). Optional integers ≥0: invited, confirmed, attended, mutualInterestPairs, secondMeetings, notes. Omitted counts stay null — never invent zeros. Not allowed in auto mode.',
      parameters: {
        type: 'object',
        properties: {
          invited: { type: 'integer', description: 'Real invited count (omit to leave null)' },
          confirmed: { type: 'integer', description: 'Real confirmed count' },
          attended: { type: 'integer', description: 'Real attended count' },
          mutualInterestPairs: { type: 'integer', description: 'Mutual interest pairs from night' },
          secondMeetings: { type: 'integer', description: 'Second meetings booked' },
          notes: { type: 'string', description: 'Debrief notes (host-attested)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'seed_next_from_debrief',
      description:
        'After a real debrief: archive the night, record a next SF idea (record_idea), clear activeEvent. Requires debrief evidence — never invents attendance. Then spin_up_event to start the next night.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Optional next night title' },
          outcome: { type: 'string' },
          seats: { type: 'integer' },
          format: { type: 'string' },
          needs: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'invite_drain_status',
      description:
        'List Partiful/Luma drafts that still need a real published URL vs already recorded. Writes INVITE-DRAIN.md for humans. No invent.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_stage',
      description: 'Advance active event lifecycle stage (ideate|resource|plan|rsvp|run|followup|debrief). Draft mode dry-runs.',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_resources',
      description:
        'List current ideas, open offers, matched resources for active event, outreach queue, money intents, free venues, tasks.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_free_venues',
      description: 'Search curated free/low-cost San Francisco venue options for the active night (not live booking).',
      parameters: {
        type: 'object',
        properties: {
          need: { type: 'string', description: 'e.g. indoor salon, outdoor picnic, 40 seats' },
          seats: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_venue',
      description: 'Attach a venue to the active event (from free list, offer id, or freeform SF place).',
      parameters: {
        type: 'object',
        properties: {
          venueId: { type: 'string', description: 'FREE_SF_VENUES id or offer id' },
          name: { type: 'string' },
          area: { type: 'string' },
          notes: { type: 'string' },
          source: { type: 'string', description: 'free_list|offer|manual' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event_details',
      description: 'Update active event fields: dateWindows, seats, agenda, notes, outcome.',
      parameters: {
        type: 'object',
        properties: {
          dateWindows: { type: 'array', items: { type: 'string' } },
          seats: { type: 'integer' },
          agenda: { type: 'string' },
          notes: { type: 'string' },
          outcome: { type: 'string' },
          title: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_task',
      description: 'Create or complete a bot-owned task for the active event.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          done: { type: 'boolean' },
          stage: { type: 'string' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_contact',
      description: 'Remember a person the bot messages or who offered help (sponsor/venue/volunteer/guest/ops).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', description: 'sponsor|venue|volunteer|guest|ops|other' },
          notes: { type: 'string' },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'drive_cycle',
      description: 'Bot-owned autopilot: fill missing plan pieces for current stage, queue outreach, match venue, advance stage when ready.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
        },
      },
    },
  },

];

function mode() {
  const m = String(process.env.DEMIGOD_EVENTS_AUTONOMY || 'draft').toLowerCase();
  return m === 'auto' || m === 'semi' ? m : 'draft';
}

function emptyEventsStore() {
  return {
    version: 3,
    offers: { sponsor: [], venue: [], volunteer: [] },
    ideas: [],
    feedback: [],
    outreach: [],
    money: [],
    platforms: {},
  };
}

/**
 * Load DEMIGOD-EVENTS.json. Retries on empty/partial reads (concurrent rename race).
 * Prefers .bak if primary stays unreadable — never silent wipe.
 */
function loadStore() {
  const STORE = eventsStorePath();
  if (!fs.existsSync(STORE)) return emptyEventsStore();
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const raw = fs.readFileSync(STORE, 'utf8');
      if (!raw || !String(raw).trim()) {
        lastErr = new Error('empty store file');
      } else {
        return JSON.parse(raw);
      }
    } catch (e) {
      lastErr = e;
    }
    // brief backoff — concurrent writer may finish rename
    const end = Date.now() + 15 + attempt * 20;
    while (Date.now() < end) {
      /* spin */
    }
  }
  const bak = STORE + '.bak';
  if (fs.existsSync(bak)) {
    try {
      const bakData = JSON.parse(fs.readFileSync(bak, 'utf8'));
      // Preserve the unreadable primary BEFORE the next saveStore renames over it: it may hold newer
      // real records than .bak and is the only recovery evidence. Copy aside (best-effort, gitignored).
      try {
        if (fs.existsSync(STORE)) fs.copyFileSync(STORE, STORE + '.corrupt.' + Date.now());
      } catch {
        /* preservation best-effort; never block recovery */
      }
      return bakData;
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error('DEMIGOD-EVENTS.json unreadable: ' + (lastErr?.message || lastErr));
  err.code = 'STORE_CORRUPT';
  throw err;
}

function saveStore(s) {
  const STORE = eventsStorePath();
  s.version = Math.max(3, s.version || 3);
  s.updated = new Date().toISOString().slice(0, 10);
  ensureArrays(s);
  // Unique tmp so parallel writers don't clobber the same .tmp mid-write
  const tmp = STORE + '.tmp.' + process.pid + '.' + Date.now() + '.' + Math.random().toString(36).slice(2, 8);
  const body = JSON.stringify(s, null, 2) + '\n';
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, STORE);
  try {
    // Atomic + private, like the primary — a torn .bak (bare truncate-write) defeats the whole
    // recovery scheme if it tears while the primary is also mid-write.
    const bakTmp = STORE + '.bak.tmp.' + process.pid + '.' + Date.now();
    fs.writeFileSync(bakTmp, body, { mode: 0o600 });
    fs.renameSync(bakTmp, STORE + '.bak');
  } catch {
    /* bak best-effort */
  }
}

function ensureArrays(s) {
  s.ideas = s.ideas || [];
  s.feedback = s.feedback || [];
  s.outreach = s.outreach || [];
  s.contacts = s.contacts || [];
  s.tasks = s.tasks || [];
  s.money = s.money || [];
  s.platforms = s.platforms || { luma: [], partiful: [] };
  s.offers = s.offers || { sponsor: [], venue: [], volunteer: [] };
  s.activeEvent = s.activeEvent || { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  if (!s.activeEvent.city) s.activeEvent.city = 'San Francisco';
  s.activeEvent.outcomes = s.activeEvent.outcomes || {
    invited: null,
    confirmed: null,
    attended: null,
    mutualInterestPairs: null,
    secondMeetings: null,
    debrief: null,
  };
  s.honesty = s.honesty || {};
  s.honesty.stripe = s.honesty.stripe || 'pending';
  s.honesty.geo = 'San Francisco only (for now)';
  s.honesty.autonomyMode = mode();
}

function uid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function clamp(s, n) {
  return String(s == null ? '' : s).trim().slice(0, n);
}

/** True when body already carries Events Bot identity (avoid double footer). */
const IDENTITY_MARK =
  /Events Bot \(by Demigod\)|trydemigod\.com\/\?p=events|I'm Events Bot/i;

/**
 * Append identity blurb once. Prior check looked for "Demigod Events Bot"
 * which never appears in IDENTITY_BLURB — fixed to match real markers.
 */
export function withIdentity(body) {
  const b = clamp(body, 3500);
  if (IDENTITY_MARK.test(b)) return b || IDENTITY_BLURB;
  if (!b) return IDENTITY_BLURB;
  return b + '\n\n—\n' + IDENTITY_BLURB;
}

/**
 * Real recipient only — never invent emails.
 * Rejects empty, malformed, RFC reserved (example/test/invalid/localhost), dummy locals,
 * noreply/bounce boxes, and platform invent domains. Aligns with free-ops checkEmailSyntax
 * + funnel usable-contact (url-only / noreply are not draft targets). Ops potter@ allowed.
 */
export function isRealOutreachEmail(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (e.includes('..')) return false;
  const domain = e.split('@')[1] || '';
  const local = (e.split('@')[0] || '').split('+')[0]; // ignore +tag on local
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (!domain || domain.split('.').length < 2) return false;
  if (domain.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return false;
  if (!/^[a-z]{2,63}$/i.test(domain.split('.').at(-1) || '')) return false;
  // RFC 2606 / special-use + common invent placeholder domains
  if (/\.(test|invalid|localhost|example|local)$/i.test(domain)) return false;
  if (
    /^(example\.(com|org|net)|test\.(com|org|net)|localhost|email\.com|domain\.com)$/i.test(domain)
  ) {
    return false;
  }
  // Dummy / unusable locals (noreply is not a person to ask for a venue tab)
  if (
    /^(fake|placeholder|invented|invalid|unknown|dummy|asdf|xxx|sample|noone|nobody|user|test|no[-_]?reply|do[-_]?not[-_]?reply|mailer-daemon|postmaster|bounce|notifications?|unsubscribe)(?:[._-].*)?$/i.test(
      local,
    )
  ) {
    return false;
  }
  // Job-board / social platform mailboxes — not usable outreach contact
  if (
    /(?:^|\.)(linkedin\.com|indeed\.com|wellfound\.com|ycombinator\.com|workatastartup\.com|ziprecruiter\.com|facebook\.com|twitter\.com|x\.com|partiful\.com|lu\.ma|luma\.com|eventbrite\.com|meetup\.com)$/i.test(
      domain,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Pure outreach draft builder — validates email/subject/body, stamps identity once.
 * Status always `queued` (never invents send). No store IO.
 */
export function buildOutreachDraft(args = {}) {
  const toEmail = clamp(args.toEmail, 120).toLowerCase();
  if (!isRealOutreachEmail(toEmail)) {
    return { ok: false, error: 'valid recipient email required — never invent one' };
  }
  const subject = clamp(args.subject, 160);
  if (subject.length < 3) {
    return { ok: false, error: 'subject required (min 3 chars)' };
  }
  const rawBody = clamp(args.body, 3500);
  if (rawBody.length < 12) {
    return { ok: false, error: 'body required (min 12 chars, draft quality)' };
  }
  const kindRaw = clamp(args.kind || 'other', 32) || 'other';
  const kindNorm = normalizeOutreachKind(kindRaw);
  const priority =
    Number(args.priority) ||
    OUTREACH_KIND_PRIORITY[kindNorm] ||
    OUTREACH_KIND_PRIORITY.other;
  return {
    ok: true,
    draft: {
      toEmail,
      toName: clamp(args.toName, 80),
      kind: kindRaw,
      subject,
      body: withIdentity(rawBody),
      channel: clamp(args.channel || 'email', 16) || 'email',
      status: 'queued',
      priority,
      sentAt: null,
    },
  };
}

/**
 * Queue hygiene: stamp missing identity + default priority; reject invent emails.
 * Mutates array in place. Never upgrades to sent.
 */
export function hygieneOutreachQueue(outreach = []) {
  let fixedIdentity = 0;
  let rejectedInvent = 0;
  let stampedPriority = 0;
  let normalizedQueued = 0;
  for (const o of outreach || []) {
    if (!o || (o.status !== 'queued' && o.status !== 'drafted')) continue;
    o.sentAt = null;
    if (!isRealOutreachEmail(o.toEmail)) {
      o.status = 'rejected';
      o.rejectReason = 'invent_or_invalid_email';
      rejectedInvent++;
      continue;
    }
    if (o.status === 'drafted') {
      o.status = 'queued';
      normalizedQueued++;
    }
    o.emailCheck = o.emailCheck || { syntax: true, mx: null, at: null };
    o.emailCheck.syntax = true;
    const next = withIdentity(o.body || '');
    if (next !== (o.body || '')) {
      o.body = next;
      fixedIdentity++;
    }
    // Draft drain: fill missing kind priority (never invents sent)
    if (o.priority == null || o.priority === '' || Number.isNaN(Number(o.priority))) {
      o.priority =
        OUTREACH_KIND_PRIORITY[normalizeOutreachKind(o.kind)] || OUTREACH_KIND_PRIORITY.other;
      stampedPriority++;
    }
  }
  return { fixedIdentity, rejectedInvent, stampedPriority, normalizedQueued };
}

/**
 * Draft-only: fill thin venue/venue_alt outreach bodies with free-list shortlist.
 * Mutates store.outreach in place. Never marks sent / never invents emails.
 */
export function enrichVenueOutreachBodies(store = {}) {
  const ae = store.activeEvent || {};
  const gaps = resourceGaps(store);
  let enriched = 0;
  for (const o of store.outreach || []) {
    if (!o || (o.status !== 'queued' && o.status !== 'drafted')) continue;
    if (normalizeOutreachKind(o.kind) !== 'venue') continue;
    const body = String(o.body || '');
    // Already has ranked shortlist — leave alone
    if (/Ranked free SF|match \d+/i.test(body)) continue;
    // Thin stub only (keep rich human paste intact if long + specific)
    if (body.length >= 280 && /venue|room|space|host/i.test(body)) continue;
    const filled = buildVenueResourceOutreachBody(ae, gaps, {
      need: eventNeedText(ae),
      seats: Number(ae.seats) || 12,
    });
    o.body = withIdentity(filled);
    o.enrichedShortlist = true;
    // Bump base priority to venue kind if missing/low (still draft drain only)
    const floor = OUTREACH_KIND_PRIORITY.venue;
    if (Number(o.priority) < floor) o.priority = floor;
    enriched++;
  }
  return { enriched };
}

/**
 * Async MX pass on queued/drafted outreach (free DNS — no API keys).
 * Fail-closed: no MX → rejected. Used by ticks + demigod-free-ops.
 */
export async function hygieneOutreachMx(outreach = [], opts = {}) {
  let rejectedMx = 0;
  let checked = 0;
  try {
    const { checkEmailMx } = await import('./demigod-free-ops.mjs');
    for (const o of outreach || []) {
      if (!o || (o.status !== 'queued' && o.status !== 'drafted')) continue;
      if (!isRealOutreachEmail(o.toEmail)) continue;
      checked++;
      const mx = await checkEmailMx(o.toEmail, { force: !!opts.force });
      o.emailCheck = {
        syntax: true,
        mx: !!mx.ok,
        reason: mx.reason || null,
        at: new Date().toISOString(),
      };
      if (!mx.ok) {
        o.status = 'rejected';
        o.rejectReason = 'no_mx:' + (mx.reason || 'fail');
        o.sentAt = null;
        rejectedMx++;
      }
    }
  } catch (err) {
    return { checked, rejectedMx, error: String(err?.message || err) };
  }
  return { checked, rejectedMx };
}

/**
 * Idle reseed (FABLE P0-3.4): when no active night and zero ideas, seed exactly ONE SF idea.
 * Idempotent — second call skips (no dup). Does not spin_up / invent RSVPs.
 * Pure store mutation (caller saveStore if needed).
 */
export function idleReseedIfEmpty(store, args = {}) {
  if (!store || typeof store !== 'object') {
    return { ok: false, error: 'no_store' };
  }
  store.ideas = Array.isArray(store.ideas) ? store.ideas : [];
  if (store.activeEvent?.id) {
    return {
      ok: true,
      skipped: true,
      reason: 'has_active',
      ideaCount: store.ideas.length,
    };
  }
  if (store.ideas.length > 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'has_ideas',
      ideaCount: store.ideas.length,
      idea: store.ideas[0],
    };
  }
  const seed = offlineIdeas(args.seed || args.goal || '')[0];
  const title = clamp(args.title || seed.title, 120);
  if (selftestTitleBlocked(title)) {
    return {
      ok: false,
      error: 'selftest_title_blocked',
      message: 'Idle reseed title looks like selftest/fixture — refused outside MOCK=1',
    };
  }
  const blob = [title, seed.outcome, seed.needs, 'San Francisco'].join(' ');
  if (!isSfLocation(blob)) {
    return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
  }
  const idea = {
    id: uid('idea_'),
    title,
    format: clamp(args.format || seed.format || '12-seat dinner series', 80),
    outcome: clamp(
      args.outcome || seed.outcome || 'strangers leave with two real follow-ups and a shared table story',
      400,
    ),
    seats: Number(args.seats) || seed.seats || 12,
    needs: clamp(
      args.needs || seed.needs || 'quiet SF venue, food/beverage sponsor, one volunteer host-assist',
      400,
    ),
    sponsorable: clamp(seed.sponsorable || '', 400),
    city: 'San Francisco',
    source: 'idle_reseed',
    at: new Date().toISOString(),
  };
  store.ideas.push(idea);
  return { ok: true, skipped: false, idea, ideaCount: 1 };
}

function offlineIdeas(seed) {
  const s = seed ? ` (${clamp(seed, 80)})` : '';
  const mock = process.env.DEMIGOD_EVENTS_BOT_MOCK === '1';
  // Fun SF events with clear sponsor hooks (not required to be Demigod-branded).
  // Fogline title is MOCK-only fixture brand — never seed prod offline ideas with it.
  const first = mock
    ? {
        title: 'Fogline Supper Club' + s,
        format: '12-seat dinner series',
        outcome: 'strangers leave with two real follow-ups and a shared table story',
        seats: 12,
        needs: 'quiet SF venue, food/beverage sponsor, one volunteer host-assist',
        sponsorable: 'Named course or wine sponsor; photo moment; recurring series slot',
      }
    : {
        title: 'SoMa Supper Club' + s,
        format: '12-seat dinner series',
        outcome: 'strangers leave with two real follow-ups and a shared table story',
        seats: 12,
        needs: 'quiet SF venue, food/beverage sponsor, one volunteer host-assist',
        sponsorable: 'Named course or wine sponsor; photo moment; recurring series slot',
      };
  return [
    first,
    {
      title: 'SoMa After-Hours Showcase',
      format: 'short sets + open floor',
      outcome: 'local makers/creatives get a crowd and one intro each',
      seats: 40,
      needs: 'warehouse or loft, light AV, door volunteer, snack/drink sponsor',
      sponsorable: 'Title sponsor on flyer; bar tab; merch table',
    },
    {
      title: 'Mission Morning Run + Coffee',
      format: 'easy group run then café hang',
      outcome: 'new SF friends without a stiff networking script',
      seats: 25,
      needs: 'meetup point, coffee sponsor or free café partnership, route lead volunteer',
      sponsorable: 'Coffee/brand activation at finish; apparel giveaway',
    },
  ];
}

async function openaiChat(messages, tools) {
  const key = process.env.OPENAI_API_KEY || '';
  if (!key || process.env.DEMIGOD_EVENTS_BOT_MOCK === '1') {
    return { mock: true, message: { role: 'assistant', content: null, tool_calls: null } };
  }
  const model = process.env.OPENAI_EVENTS_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.55,
    max_tokens: 1200,
    messages,
    tools: tools || TOOLS,
    tool_choice: 'auto',
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `openai ${r.status}`);
  return { mock: false, message: j.choices?.[0]?.message || {}, model };
}

async function lumaCreate({ title, description, startAt, endAt, timezone, location }) {
  const key = process.env.LUMA_API_KEY || '';
  const payload = {
    title: clamp(title, 120),
    description: clamp(description, 4000),
    start_at: startAt || null,
    end_at: endAt || null,
    timezone: timezone || 'America/Los_Angeles',
    location: isSfLocation(location) ? location || 'San Francisco, CA' : 'San Francisco, CA',
  };
  if (location && !isSfLocation(location)) {
    payload._geoNote = 'Non-SF location overridden to San Francisco (Events Bot SF-only rule)';
  }
  if (!key) {
    return {
      ok: false,
      pending: true,
      reason: 'LUMA_API_KEY not set (needs Luma Plus calendar key)',
      draft: payload,
      docs: 'https://docs.luma.com · header x-luma-api-key · base https://public-api.luma.com',
    };
  }
  // Luma public API event create path may vary; try common endpoint, fall back to draft
  try {
    const r = await fetch('https://public-api.luma.com/v1/event/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-luma-api-key': key,
      },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return {
        ok: false,
        pending: true,
        status: r.status,
        error: j?.message || j?.error || JSON.stringify(j).slice(0, 200),
        draft: payload,
        note: 'Luma API rejected create — draft saved for manual paste',
      };
    }
    return { ok: true, luma: j, draft: payload };
  } catch (e) {
    return { ok: false, pending: true, error: String(e.message || e), draft: payload };
  }
}

/**
 * Deterministic bot-owned cycle: invent/spin if needed, fill checklist, pick venue, queue asks, advance.
 */
function driveCycle(store, goal, now, m) {
  ensureArrays(store);
  const log = [];
  // 1) Ensure active event — idle reseed at most one SF idea, then spin from ideas[0]
  if (!store.activeEvent?.id) {
    const reseed = idleReseedIfEmpty(store, { seed: goal });
    if (reseed.ok && !reseed.skipped) {
      saveStore(store);
      log.push({ step: 'idle_reseed', result: { ok: true, ideaId: reseed.idea?.id, title: reseed.idea?.title } });
    }
    store = loadStore();
    ensureArrays(store);
    let idea = (store.ideas || [])[0] || null;
    if (!idea) {
      const offline = offlineIdeas(goal)[0];
      const rec = runTool('record_idea', { ...offline, source: 'bot' });
      log.push({ step: 'record_idea', result: rec });
      idea = rec.idea || offline;
      store = loadStore();
      ensureArrays(store);
    }
    const spun = runTool('spin_up_event', {
      title: idea.title,
      outcome: idea.outcome,
      seats: idea.seats,
      stage: 'resource',
      notes: idea.needs,
      dateWindows: ['Thu eve', 'Fri eve', 'Sat aft'],
    });
    log.push({ step: 'spin_up_event', result: spun });
    store = loadStore();
    ensureArrays(store);
  }
  let ae = store.activeEvent;
  if (!ae?.id) return { ok: false, error: 'could not create active event', log };

  // 2) Ensure checklist
  if (!Array.isArray(ae.checklist) || !ae.checklist.length) {
    ae.checklist = stageChecklist(ae.stage || 'ideate', ae);
  }
  if (!ae.agenda) ae.agenda = defaultAgenda(ae);
  if (!ae.owner) ae.owner = 'events-bot';

  // 3) Stage-specific fills
  const stage = ae.stage || 'ideate';
  if (stage === 'ideate' || stage === 'resource') {
    // Harden offer → active night (SF filter + scores; ids only)
    const stamped = stampOfferMatches(store);
    if (stamped) {
      saveStore(store);
      log.push({
        step: 'match_offers',
        result: {
          ok: true,
          top: {
            venue: stamped.top?.venue?.id || null,
            sponsor: stamped.top?.sponsor?.id || null,
            volunteer: stamped.top?.volunteer?.id || null,
          },
        },
      });
    }
    if (!ae.venue) {
      // Prefer real venue offer over curated free list when score is usable
      const matched = stamped || matchOffersToEvent(store);
      const topV = matched.venues?.[0];
      if (topV && topV.score >= 2) {
        const sel = runTool('select_venue', {
          venueId: topV.id,
          name: topV.name,
          area: topV.city,
          notes: topV.offer,
          source: 'offer',
        });
        log.push({ step: 'select_venue_offer', result: sel });
      } else {
        const need = eventNeedText(ae, goal) || 'meetup';
        const seats = ae.seats || 12;
        const ranked = matchFreeVenues({ need, seats, limit: 1 });
        const pick = ranked[0] || FREE_SF_VENUES[0];
        const sel = runTool('select_venue', { venueId: pick.id });
        log.push({
          step: 'select_venue_free',
          result: {
            ...sel,
            matchScore: pick.score,
            matchReasons: pick.reasons || [],
            matchNeed: need.slice(0, 100),
          },
        });
      }
      store = loadStore();
      ae = store.activeEvent;
    }
    // Queue resource outreach if thin offers
    const sponsors = (store.offers.sponsor || []).filter((o) => !o.money).length;
    const volunteers = (store.offers.volunteer || []).length;
    if (sponsors < 1) {
      log.push({
        step: 'queue_sponsor_ask',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: 'sponsor',
          subject: 'Events Bot needs a sponsor for: ' + ae.title,
          body:
            'I am producing "' +
            ae.title +
            '" in San Francisco.\nOutcome: ' +
            (ae.outcome || '') +
            '\nSeats: ' +
            (ae.seats || '') +
            '\nVenue: ' +
            (ae.venue?.name || 'TBD') +
            '\n\nPlease forward sponsor contacts or reply with an offer. I will keep tracking the night.',
        }),
      });
    }
    if (volunteers < 1) {
      log.push({
        step: 'queue_volunteer_ask',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: 'volunteer',
          subject: 'Events Bot needs a volunteer for: ' + ae.title,
          body:
            'Looking for one door/setup volunteer for "' +
            ae.title +
            '" (SF). Offer on https://www.trydemigod.com/?p=events or reply here.',
        }),
      });
    }
    if (!ae.venue || ae.venue.cost === 'in-kind' || ae.venue.source === 'free_list') {
      // also ask for free private venue alternatives — include ranked shortlist (draft only)
      const need = eventNeedText(ae, goal) || 'meetup';
      const seats = ae.seats || 12;
      const gaps = resourceGaps(store);
      log.push({
        step: 'queue_venue_ask',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: gaps.needVenueAlt && !gaps.needVenue ? 'venue_alt' : 'venue',
          // Base kind priority; prioritizeOutreachQueue applies gap/stage boost on list
          subject: 'Events Bot: free/cheap SF venue leads for ' + ae.title,
          body: buildVenueResourceOutreachBody(ae, gaps, { need, seats, goal }),
        }),
      });
    }
  }

  if (stage === 'plan' || stage === 'resource') {
    const title = ae.title;
    const store1 = loadStore();
    ensureArrays(store1);
    const hasPf = (store1.platforms.partiful || []).some((p) => normTitle(p.title) === normTitle(title));
    if (!hasPf) {
      log.push({
        step: 'partiful_draft',
        result: runTool('partiful_draft', {
          title,
          description: (ae.outcome || '') + '\n\nAgenda:\n' + (ae.agenda || defaultAgenda(ae)),
          when: (ae.dateWindows && ae.dateWindows[0]) || 'TBD',
          where: ae.venue?.name || 'San Francisco',
        }),
      });
    }
    if (!ae.agenda) {
      log.push({
        step: 'agenda',
        result: runTool('update_event_details', { agenda: defaultAgenda(ae) }),
      });
    }
  }

  // Invite draft early (resource/plan/rsvp) — structure only, never claims sent
  store = loadStore();
  ae = store.activeEvent;
  if (ae && ['resource', 'plan', 'rsvp'].includes(ae.stage) && !ae.inviteDraft) {
    ae.inviteDraft = defaultInviteDraft(ae);
    ae.updatedAt = now;
    saveStore(store);
    log.push({ step: 'invite_draft', result: { ok: true, chars: ae.inviteDraft.length } });
  }

  // RSVP stage: open null tally + queue T-3d / T-1d reminder drafts (no fake counts)
  store = loadStore();
  ae = store.activeEvent;
  if (ae && ae.stage === 'rsvp') {
    ensureRsvpStructure(store, ae, log);
  }

  // Run stage: day-of checklist + host frame
  store = loadStore();
  ae = store.activeEvent;
  if (ae && ae.stage === 'run') {
    if (!ae.dayOfChecklist || !ae.dayOfChecklist.length) {
      ae.dayOfChecklist = [
        'Confirm SF venue access + address',
        'Print/show agenda + seats target ' + (ae.seats || '?'),
        'Welcome frame (Events Bot script)',
        'Soft open / check-in (real names only)',
        'Close + reconnect path',
        'Pack-out / photo (optional)',
      ];
      log.push({ step: 'run_checklist', result: { ok: true, items: ae.dayOfChecklist.length } });
    }
    if (!ae.hostFrame) {
      ae.hostFrame =
        'Welcome to ' +
        (ae.title || 'tonight') +
        ' in SF. I\'m Events Bot (by Demigod) — organizer of record. ' +
        (ae.outcome ? 'Tonight\'s aim: ' + ae.outcome + '. ' : '') +
        'Phones optional; real intros preferred. Let\'s begin.';
      log.push({ step: 'host_frame', result: { ok: true } });
    }
    ae.updatedAt = now;
    saveStore(store);
  }

  // Follow-up: thank-you draft once (queued, not sent)
  store = loadStore();
  ae = store.activeEvent;
  if (ae && ae.stage === 'followup') {
    const hasThanks = (store.outreach || []).some(
      (o) => o.kind === 'thanks' && (o.status === 'queued' || o.status === 'drafted'),
    );
    if (!hasThanks) {
      log.push({
        step: 'queue_thanks',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: 'thanks',
          subject: 'Thank-you draft: ' + ae.title,
          body:
            'DRAFT thanks for "' +
            ae.title +
            '" (SF). Only send to people who actually attended. Ask for feedback + mutual interest. Intros only on mutual yes.',
        }),
      });
    }
  }

  // Mark checklist items we satisfied
  store = loadStore();
  ae = store.activeEvent;
  if (ae && Array.isArray(ae.checklist)) {
    const mark = (id) => {
      ae.checklist = ae.checklist.map((c) => (c.id === id ? { ...c, done: true } : c));
    };
    if (ae.title && ae.outcome) mark('idea_title');
    if (ae.seats) mark('idea_seats');
    if (ae.dateWindows?.length) mark('idea_windows');
    if (ae.venue) mark('res_venue');
    if ((store.offers.sponsor || []).some((o) => !o.money) || (store.money || []).length) mark('res_sponsor');
    if ((store.offers.volunteer || []).length) mark('res_volunteer');
    if ((store.outreach || []).length) mark('res_outreach');
    if (ae.agenda) mark('plan_agenda');
    if (ae.inviteDraft) mark('plan_invite');
    if ((store.platforms?.partiful || []).length) mark('plan_partiful');
    if (ae.rsvpTally?.openedAt) mark('rsvp_tally');
    if (ae.rsvpTally?.remindersQueued) mark('rsvp_remind');
    if (ae.dayOfChecklist?.length) mark('run_checklist');
    if (ae.hostFrame) mark('run_host_frame');
    ae.updatedAt = now;
    saveStore(store);
  }

  // 4) Advance stage when evidence gates pass (canAdvanceStage fail-closed)
  // Auto-hop only through plan→rsvp. run/followup/debrief need host evidence via chat.
  store = loadStore();
  ae = store.activeEvent;
  const tryAdvance = (to, note) => {
    if (!ae?.stage) return false;
    const gate = canAdvanceStage(ae.stage, to, ae, store);
    if (!gate.ok) return false;
    log.push({
      step: 'advance',
      result: runTool('set_stage', { stage: to, note: note || `Bot advanced: ${ae.stage}→${to}` }),
    });
    store = loadStore();
    ae = store.activeEvent;
    return true;
  };
  tryAdvance('resource', 'Bot advanced: outcome+seats set');
  tryAdvance('plan', 'Bot advanced: venue selected');
  if (tryAdvance('rsvp', 'Bot advanced: plan artifacts ready')) {
    // Same-tick: open RSVP structure when we just landed on rsvp
    ensureRsvpStructure(store, ae, log);
    store = loadStore();
    ae = store.activeEvent;
  }

  // Goal/chat evidence: hop further when host language implies day-of / post-night
  const stageIntent = parseStageAdvanceIntent(goal);
  if (stageIntent && ['run', 'followup', 'debrief'].includes(stageIntent)) {
    const walked = advanceLifecycleToward(stageIntent, {
      note: 'drive evidence: ' + String(goal || '').slice(0, 80),
      fill: false,
      goal,
    });
    log.push({ step: 'advance_toward', result: walked });
    store = loadStore();
    ae = store.activeEvent;
  }

  // feedback solicit once
  store = loadStore();
  ae = store.activeEvent;
  const hasFbAsk = (store.outreach || []).some((o) => o.kind === 'feedback_ask' && o.status === 'queued');
  if (!hasFbAsk && ae?.stage && ['plan', 'rsvp', 'followup'].includes(ae.stage)) {
    log.push({
      step: 'feedback_ask',
      result: runTool('queue_outreach', {
        toEmail: 'potter@trydemigod.com',
        toName: 'Events Bot ops',
        kind: 'feedback_ask',
        subject: 'Events Bot wants feedback on ' + ae.title,
        body: 'If you have ideas, venue leads, or want to volunteer for this SF night, reply or use https://www.trydemigod.com/?p=events — I am the organizer of record.',
      }),
    });
  }

  const final = runTool('list_resources', {});
  const plan = planTickNext(loadStore());
  const stepsDone = log.map((x) => x.step).filter(Boolean);
  const gapBit =
    plan.gaps?.missing?.length
      ? ' Gaps open: **' + plan.gaps.missing.join(', ') + '**. '
      : ' ';
  const summary =
    'I drove "' +
    (final.activeEvent?.title || 'SF night') +
    '" as owner · stage **' +
    (final.activeEvent?.stage || plan.stage) +
    '** · venue **' +
    (final.activeEvent?.venue?.name || 'none') +
    '** · queued **' +
    (final.outreachQueued || 0) +
    '**.' +
    gapBit +
    (stepsDone.length ? 'This tick: ' + stepsDone.slice(0, 6).join(', ') + '. ' : '') +
    ownerPlanSuffix(plan).trimStart() +
    ' RSVP/attendance stay null until real (no fake counts). Messages stay queued until real send transport.';

  return {
    ok: true,
    owner: 'events-bot',
    mode: m,
    log,
    plan,
    summary,
    resources: final,
  };
}

function runTool(name, args) {
  const store = loadStore();
  ensureArrays(store);
  const m = mode();
  const now = new Date().toISOString();

  switch (name) {
    case 'propose_event_ideas': {
      const ideas = offlineIdeas(args.seed);
      const n = Math.min(4, Math.max(2, Number(args.count) || 3));
      return { ok: true, ideas: ideas.slice(0, n), note: 'Bot-owned ideas — refine via chat or /idea; bot will drive the cycle' };
    }
    case 'record_idea': {
      const blob = [args.title, args.format, args.outcome, args.needs].join(' ');
      if (!isSfLocation(blob)) {
        return {
          ok: false,
          error: 'SF_ONLY',
          message: GEO_RULE.note,
        };
      }
      const title = clamp(args.title, 120);
      // Fogline/selftest fixture brand never lands in prod ideas (MOCK still ok)
      if (selftestTitleBlocked(title)) {
        return {
          ok: false,
          error: 'selftest_title_blocked',
          message: 'Title looks like a selftest/fixture/Fogline brand — refused outside DEMIGOD_EVENTS_BOT_MOCK=1',
        };
      }
      const nt = normTitle(title);
      const existing = store.ideas.find((i) => normTitle(i.title) === nt);
      if (existing) {
        return { ok: true, idea: existing, deduped: true };
      }
      const idea = {
        id: uid('idea_'),
        title,
        format: clamp(args.format, 80),
        outcome: clamp(args.outcome, 400),
        seats: Number(args.seats) || null,
        needs: clamp(args.needs, 400),
        sponsorable: clamp(args.sponsorable, 400),
        city: 'San Francisco',
        source: clamp(args.source || 'bot', 24),
        at: now,
      };
      store.ideas.push(idea);
      while (store.ideas.length > 200) store.ideas.shift();
      saveStore(store);
      return { ok: true, idea };
    }
    case 'record_feedback': {
      const fb = {
        id: uid('fb_'),
        text: clamp(args.text, 2000),
        name: clamp(args.name, 80),
        email: clamp(args.email, 120),
        topic: clamp(args.topic, 80),
        at: now,
      };
      store.feedback.push(fb);
      while (store.feedback.length > 500) store.feedback.shift();
      saveStore(store);
      return { ok: true, id: fb.id };
    }
    case 'spin_up_event': {
      const blob = [args.title, args.outcome, args.notes, ...(args.dateWindows || [])].join(' ');
      if (!isSfLocation(blob)) {
        return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
      }
      // Local ops always persist (bot owns the night). draft only blocks network send/Luma.
      const stage = normalizeStage(args.stage || 'ideate') || 'ideate';
      // Reuse active event with same title if present
      const title = clamp(args.title, 120);
      // Belt: never let selftest titles become prod activeEvent (MOCK selftest still ok)
      if (selftestTitleBlocked(title)) {
        return {
          ok: false,
          error: 'selftest_title_blocked',
          message: 'Title looks like a selftest/fixture — refused outside DEMIGOD_EVENTS_BOT_MOCK=1',
        };
      }
      if (store.activeEvent?.id && normTitle(store.activeEvent.title) === normTitle(title)) {
        store.activeEvent.outcome = clamp(args.outcome, 400) || store.activeEvent.outcome;
        store.activeEvent.seats = Number(args.seats) || store.activeEvent.seats;
        store.activeEvent.updatedAt = now;
        saveStore(store);
        return { ok: true, activeEvent: store.activeEvent, deduped: true };
      }
      const ae = {
        id: uid('ev_'),
        title,
        outcome: clamp(args.outcome, 400),
        seats: Number(args.seats) || 8,
        stage,
        stageAt: now,
        city: 'San Francisco',
        dateWindows: Array.isArray(args.dateWindows)
          ? args.dateWindows.map((d) => clamp(d, 80)).slice(0, 8)
          : [],
        notes: clamp(args.notes, 800),
        venue: null,
        agenda: defaultAgenda({ seats: Number(args.seats) || 8 }),
        checklist: stageChecklist(stage, { title }),
        owner: 'events-bot',
        outcomes: {
          invited: null,
          confirmed: null,
          attended: null,
          mutualInterestPairs: null,
          secondMeetings: null,
          debrief: null,
        },
        updatedAt: now,
      };
      store.activeEvent = ae;
      store.events = store.events || [];
      store.events.push({ ...ae, createdAt: now });
      saveStore(store);
      return { ok: true, activeEvent: ae };
    }
    case 'set_stage': {
      const stage = normalizeStage(args.stage);
      if (!stage) {
        return { ok: false, error: 'unknown stage', stages: STAGES };
      }
      if (!store.activeEvent?.id) {
        return { ok: false, error: 'no active event — spin_up_event first' };
      }
      const from = store.activeEvent.stage || 'ideate';
      // force:1 only for explicit human/tool override (still no invented RSVPs)
      const force = args.force === true || args.force === 1 || args.force === '1';
      if (!force) {
        const gate = canAdvanceStage(from, stage, store.activeEvent, store);
        if (!gate.ok) {
          return {
            ok: false,
            error: gate.reason || 'advance_denied',
            from,
            stage,
            next: gate.next || null,
            stages: STAGES,
          };
        }
      } else if (STAGES.indexOf(stage) < STAGES.indexOf(normalizeStage(from) || 'ideate')) {
        // Never go backward even with force (lifecycle honesty)
        return { ok: false, error: 'no_backward_stage', from, stage, stages: STAGES };
      }
      store.activeEvent.stage = stage;
      store.activeEvent.stageAt = now;
      store.activeEvent.updatedAt = now;
      store.activeEvent.checklist = stageChecklist(stage, store.activeEvent);
      if (args.note) {
        store.activeEvent.notes = clamp(
          (store.activeEvent.notes || '') + '\n[' + stage + '] ' + args.note,
          2000,
        );
        if (stage === 'debrief') {
          store.activeEvent.outcomes = store.activeEvent.outcomes || {};
          store.activeEvent.outcomes.debrief = clamp(args.note, 2000);
        }
      }
      syncActiveEventToList(store);
      saveStore(store);
      return { ok: true, from, stage, activeEvent: store.activeEvent, forced: !!force };
    }
    case 'queue_outreach': {
      // Hygiene first: fix identity / reject invent emails already in queue
      const hygPre = hygieneOutreachQueue(store.outreach);
      const built = buildOutreachDraft(args);
      if (!built.ok) {
        if (hygPre.fixedIdentity || hygPre.rejectedInvent || hygPre.stampedPriority) saveStore(store);
        return built;
      }
      const { draft } = built;
      const toEmail = draft.toEmail;
      const kind = draft.kind;
      const kindNorm = normalizeOutreachKind(kind);
      const priority = draft.priority;
      const dup = store.outreach.find(
        (o) =>
          o.toEmail === toEmail &&
          normalizeOutreachKind(o.kind) === kindNorm &&
          (o.eventId || null) === (store.activeEvent?.id || null) &&
          (o.status === 'queued' || o.status === 'drafted'),
      );
      if (dup) {
        // Keep higher priority if re-queued; refresh identity if missing
        if ((Number(dup.priority) || 0) < priority) dup.priority = priority;
        let bodyNext = withIdentity(dup.body || '');
        // Prefer richer draft body (e.g. free shortlist) — still queued only, never sent
        if (draft.body && draft.body.length > bodyNext.length + 20) {
          bodyNext = draft.body;
          if (draft.subject) dup.subject = draft.subject;
        }
        if (bodyNext !== (dup.body || '')) dup.body = bodyNext;
        saveStore(store);
        return {
          ok: true,
          deduped: true,
          outreach: {
            id: dup.id,
            toEmail: dup.toEmail,
            kind: dup.kind,
            status: dup.status,
            priority: dup.priority ?? priority,
          },
          note: 'Unsent outreach already queued for this contact+kind',
        };
      }
      const item = {
        id: uid('out_'),
        toEmail,
        toName: draft.toName,
        kind,
        eventId: store.activeEvent?.id || null,
        subject: draft.subject,
        body: draft.body,
        channel: draft.channel,
        status: 'queued', // never invent sent
        priority,
        at: now,
        sentAt: null,
        emailCheck: { syntax: true, mx: null, at: null },
      };
      store.outreach.push(item);
      while (store.outreach.length > 500) store.outreach.shift();
      try {
        const outbox = eventsOutboxPath();
        fs.mkdirSync(outbox, { recursive: true });
        fs.writeFileSync(path.join(outbox, item.id + '.json'), JSON.stringify(item, null, 2));
      } catch {
        /* optional */
      }
      // Never mark sent without a real transport message id (Fable/Codex P0)
      if (m === 'auto' && process.env.DEMIGOD_EVENTS_SMTP_URL) {
        item.note =
          'SMTP URL configured but no delivery adapter yet — left queued for human drain (events-bot-outbox/)';
      }
      saveStore(store);
      return {
        ok: true,
        outreach: {
          id: item.id,
          toEmail: item.toEmail,
          kind: item.kind,
          status: item.status,
          priority: item.priority,
        },
        identity: true,
        hygiene: hygPre,
        note: 'Queued only — human or real SMTP adapter must send. No fake sent receipts.',
      };
    }
    case 'record_money_intent': {
      const mon = {
        id: uid('pay_'),
        name: clamp(args.name, 80),
        email: clamp(args.email, 120).toLowerCase(),
        org: clamp(args.org, 120),
        amountNote: clamp(args.amountNote, 200),
        cents: Number(args.cents) || null,
        status: 'intent',
        stripe: 'pending',
        at: now,
      };
      store.money.push(mon);
      while (store.money.length > 200) store.money.shift();
      // also mirror as sponsor offer
      store.offers.sponsor = store.offers.sponsor || [];
      store.offers.sponsor.push({
        id: mon.id,
        kind: 'sponsor',
        name: mon.name,
        email: mon.email,
        org: mon.org,
        offer: 'Money: ' + mon.amountNote,
        at: now,
        status: 'new',
        money: true,
      });
      saveStore(store);
      return {
        ok: true,
        id: mon.id,
        stripe: 'pending',
        message: 'Sponsor money intent recorded. Card capture pending until Stripe is live — potter@ will follow up.',
      };
    }
    case 'luma_create_event': {
      // Sync draft path (network create only via executeTool in auto+key)
      const built = buildLumaDraft(args, store.activeEvent || {});
      if (!built.ok) return built;
      if (selftestTitleBlocked(built.draft?.title || args.title || store.activeEvent?.title)) {
        return {
          ok: false,
          error: 'selftest_title_blocked',
          message: 'Luma draft title looks like selftest/fixture/Fogline — refused outside MOCK=1',
        };
      }
      const list = (store.platforms.luma = store.platforms.luma || []);
      const prev = list.find((p) => normTitle(p.title) === normTitle(built.draft.title));
      const keptUrl = prev?.inviteUrl || prev?.publishedUrl || prev?.draft?.inviteUrl || null;
      const draft = {
        ...(prev?.draft || {}),
        ...built.draft,
        id: prev?.id || prev?.draft?.id || uid('luma_'),
        at: now,
        updatedAt: now,
        status: keptUrl && isRealInviteUrl(keptUrl, 'luma') ? 'published_url' : 'draft',
      };
      if (draft.status === 'published_url') draft.inviteUrl = keptUrl;
      const files = writeInviteExport('luma', draft);
      if (files) draft.exportFiles = files;
      const row = {
        id: draft.id,
        at: now,
        title: draft.title,
        status: draft.status,
        ...(draft.inviteUrl ? { inviteUrl: draft.inviteUrl, publishedUrl: draft.inviteUrl } : {}),
        draft,
      };
      if (prev) list[list.indexOf(prev)] = row;
      else list.push(row);
      saveStore(store);
      return {
        ok: true,
        pending: true,
        draft,
        updated: !!prev,
        exportFiles: files,
        note: 'Luma draft paste package only (no auto-publish / no fake RSVPs). API create needs auto mode + LUMA_API_KEY.',
      };
    }
    case 'partiful_draft': {
      const built = buildPartifulDraft(args, store.activeEvent || {});
      if (!built.ok) return built;
      if (selftestTitleBlocked(built.draft?.title || args.title || store.activeEvent?.title)) {
        return {
          ok: false,
          error: 'selftest_title_blocked',
          message: 'Partiful draft title looks like selftest/fixture/Fogline — refused outside MOCK=1',
        };
      }
      const list = (store.platforms.partiful = store.platforms.partiful || []);
      const nt = normTitle(built.draft.title);
      const prev = list.find((p) => normTitle(p.title) === nt);
      const keptUrl =
        (prev?.inviteUrl || prev?.publishedUrl) &&
        isRealInviteUrl(prev.inviteUrl || prev.publishedUrl, 'partiful')
          ? prev.inviteUrl || prev.publishedUrl
          : null;
      const draft = {
        ...(prev || {}),
        ...built.draft,
        id: prev?.id || uid('pf_'),
        at: now,
        updatedAt: now,
        // keep published_url + real invite URL if re-drafting copy (never wipe recorded link)
        status: keptUrl ? prev.status || 'published_url' : 'draft',
      };
      if (keptUrl) {
        draft.inviteUrl = keptUrl;
        draft.publishedUrl = prev.publishedUrl || keptUrl;
        draft.exportText = stampInviteUrlIntoExport(
          draft.exportText || '',
          keptUrl,
          'partiful',
        );
      }
      if (prev) {
        const i = list.indexOf(prev);
        list[i] = draft;
      } else {
        list.push(draft);
      }
      const files = writeInviteExport('partiful', draft);
      if (files) draft.exportFiles = files;
      saveStore(store);
      return {
        ok: true,
        partiful: draft,
        updated: !!prev,
        exportFiles: files,
        note: keptUrl
          ? 'Draft refreshed — real Invite URL preserved (no invent / no RSVP claim).'
          : 'Draft only — paste from exportText/outbox; no send/publish claim. No fake RSVPs.',
      };
    }

    case 'record_invite_url': {
      const result = recordInviteUrl(store, args);
      if (!result.ok) return result;
      saveStore(store);
      return {
        ok: true,
        platform: result.platform,
        inviteUrl: result.inviteUrl,
        draft: {
          id: result.draft.id,
          title: result.draft.title,
          status: result.draft.status,
          inviteUrl: result.draft.inviteUrl,
        },
        exportFiles: result.draft.exportFiles || null,
        note: 'Real invite URL recorded. RSVP counts still empty until real evidence.',
      };
    }

    case 'record_debrief': {
      const result = recordDebrief(store, args, { mode: mode() });
      if (!result.ok) return result;
      saveStore(store);
      return {
        ok: true,
        stage: result.stage,
        outcomes: result.outcomes,
        debrief: result.debrief,
        recorded: result.recorded,
        note: 'Host-attested outcomes only — omitted counts stay null (no invent zeros).',
      };
    }

    case 'seed_next_from_debrief': {
      const result = seedNextFromDebrief(store, args);
      if (!result.ok) return result;
      saveStore(store);
      return {
        ok: true,
        idea: result.idea,
        deduped: result.deduped,
        clearedEventId: result.clearedEventId,
        activeEvent: result.activeEvent,
        note: 'Next idea seeded from real debrief; activeEvent cleared. spin_up_event to start the next SF night. No invent attendance.',
      };
    }

    case 'invite_drain_status': {
      // FOCUS: human-pasted real URLs (drop file and/or outbox package) before board
      const fromDrop = absorbHumanInviteDropFile(store);
      const fromOutbox = absorbInviteUrlsFromOutbox(store);
      const applied = [...(fromDrop.applied || []), ...(fromOutbox.applied || [])];
      if (applied.length) saveStore(store);
      const report = inviteDrainReport(store);
      const brief = writeInviteDrainBrief(report);
      return {
        ok: true,
        ...report,
        absorbed: {
          dropPath: fromDrop.dropPath,
          dropMissing: !!fromDrop.missing,
          dropParsed: fromDrop.parsed || 0,
          outboxScanned: fromOutbox.scanned || 0,
          applied,
          failed: [...(fromDrop.failed || []), ...(fromOutbox.failed || [])],
        },
        brief,
      };
    }

    case 'research_free_venues': {
      const need =
        String(args.need || '').trim() ||
        eventNeedText(store.activeEvent || '') ||
        '';
      const seats = Number(args.seats) || Number(store.activeEvent?.seats) || 0;
      const ae = store.activeEvent || {};
      // Exclude locked free_list pick when asking for alts (draft shortlist only)
      const excludeIds = [];
      if (
        args.excludeCurrent !== false &&
        ae.venue?.id &&
        (ae.venue.source === 'free_list' || ae.venue.source === 'in-kind')
      ) {
        excludeIds.push(ae.venue.id);
      }
      const list = matchFreeVenues({ need, seats, limit: 6, excludeIds });
      return {
        ok: true,
        city: 'San Francisco',
        venues: list,
        top: list[0] || null,
        excludeIds,
        need: need.slice(0, 160),
        note: 'Curated ranked options — not a live booking. Scores+reasons are heuristic; bot queues outreach or marks selected. Draft only.',
      };
    }
    case 'select_venue': {
      if (!store.activeEvent?.id) return { ok: false, error: 'no active event' };
      let venue = null;
      if (args.venueId) {
        venue = FREE_SF_VENUES.find((v) => v.id === args.venueId) || null;
        if (!venue) {
          const off = (store.offers.venue || []).find((o) => o.id === args.venueId);
          if (off) {
            if (!offerIsSf(off)) {
              return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
            }
            venue = {
              id: off.id,
              name: off.name || off.org || 'Offered venue',
              area: off.city || 'San Francisco',
              capacity: off.capacity,
              cost: 'offer',
              notes: off.offer,
              source: 'offer',
            };
            // Link offer → active night (no email invent; status for ops drain)
            off.eventId = store.activeEvent.id;
            if (!off.status || off.status === 'new' || off.status === 'matched') {
              off.status = 'accepted';
            }
          }
        } else {
          venue = { ...venue, source: 'free_list' };
        }
      }
      if (!venue && args.name) {
        const blob = [args.name, args.area, args.notes].join(' ');
        if (!isSfLocation(blob)) return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
        venue = {
          id: uid('ven_'),
          name: clamp(args.name, 120),
          area: clamp(args.area || 'San Francisco', 80),
          notes: clamp(args.notes, 400),
          source: clamp(args.source || 'manual', 24),
        };
      }
      if (!venue) return { ok: false, error: 'venueId or name required' };
      store.activeEvent.venue = venue;
      store.activeEvent.updatedAt = now;
      // mark checklist item
      if (Array.isArray(store.activeEvent.checklist)) {
        store.activeEvent.checklist = store.activeEvent.checklist.map((c) =>
          c.id === 'res_venue' ? { ...c, done: true } : c,
        );
      }
      // Refresh partner matches after venue lock
      stampOfferMatches(store);
      saveStore(store);
      return { ok: true, venue, activeEvent: store.activeEvent };
    }
    case 'update_event_details': {
      if (!store.activeEvent?.id) return { ok: false, error: 'no active event' };
      const ae = store.activeEvent;
      if (args.title) {
        const t = clamp(args.title, 120);
        if (selftestTitleBlocked(t)) {
          return {
            ok: false,
            error: 'selftest_title_blocked',
            message: 'Event title looks like selftest/fixture/Fogline — refused outside MOCK=1',
          };
        }
        ae.title = t;
      }
      if (args.outcome) ae.outcome = clamp(args.outcome, 400);
      if (args.notes) ae.notes = clamp(args.notes, 2000);
      if (args.agenda) ae.agenda = clamp(args.agenda, 4000);
      if (args.seats) ae.seats = Number(args.seats) || ae.seats;
      if (Array.isArray(args.dateWindows)) {
        ae.dateWindows = args.dateWindows.map((d) => clamp(d, 80)).slice(0, 8);
      }
      ae.updatedAt = now;
      saveStore(store);
      return { ok: true, activeEvent: ae };
    }
    case 'upsert_task': {
      store.tasks = store.tasks || [];
      const text = clamp(args.text, 400);
      let t = args.id ? store.tasks.find((x) => x.id === args.id) : null;
      if (!t) {
        t = {
          id: uid('task_'),
          text,
          done: !!args.done,
          stage: clamp(args.stage || store.activeEvent?.stage || 'ideate', 24),
          eventId: store.activeEvent?.id || null,
          at: now,
        };
        store.tasks.push(t);
      } else {
        if (args.text) t.text = text;
        if (args.done != null) t.done = !!args.done;
        if (args.stage) t.stage = clamp(args.stage, 24);
        t.updatedAt = now;
      }
      while (store.tasks.length > 400) store.tasks.shift();
      saveStore(store);
      return { ok: true, task: t };
    }
    case 'add_contact': {
      store.contacts = store.contacts || [];
      const email = clamp(args.email, 120).toLowerCase();
      let c = store.contacts.find((x) => x.email === email);
      if (!c) {
        c = {
          id: uid('ct_'),
          email,
          name: clamp(args.name, 80),
          role: clamp(args.role || 'other', 32),
          notes: clamp(args.notes, 400),
          at: now,
        };
        store.contacts.push(c);
      } else {
        if (args.name) c.name = clamp(args.name, 80);
        if (args.role) c.role = clamp(args.role, 32);
        if (args.notes) c.notes = clamp((c.notes || '') + ' | ' + args.notes, 800);
        c.updatedAt = now;
      }
      while (store.contacts.length > 500) store.contacts.shift();
      saveStore(store);
      return { ok: true, contact: c };
    }
    case 'drive_cycle': {
      return driveCycle(store, args.goal || '', now, m);
    }

    case 'list_resources': {
      const enr = enrichVenueOutreachBodies(store);
      const hyg = hygieneOutreachQueue(store.outreach);
      if (enr.enriched || hyg.fixedIdentity || hyg.rejectedInvent || hyg.stampedPriority) {
        saveStore(store);
      }
      const offerCounts = {
        sponsor: (store.offers.sponsor || []).filter((o) => !o.money).length,
        venue: (store.offers.venue || []).length,
        volunteer: (store.offers.volunteer || []).length,
        moneyIntents: (store.money || []).length,
      };
      const matched = matchOffersToEvent(store);
      const gaps = resourceGaps(store);
      const stage = store.activeEvent?.stage || null;
      const eventId = store.activeEvent?.id || null;
      const outreachQueue = prioritizeOutreachQueue(store.outreach, {
        stage,
        gaps,
        eventId,
      }).slice(0, 12);
      const next = outreachQueue[0] || null;
      return {
        ok: true,
        mode: m,
        owner: 'events-bot',
        geo: GEO_RULE,
        activeEvent: store.activeEvent,
        ideaCount: store.ideas.length,
        ideas: store.ideas.slice(-5),
        offerCounts,
        matched,
        matchedTop: matched.top || null,
        outreachHygiene: hyg,
        resourceGaps: gaps,
        freeVenues: matched.freeVenues || matchFreeVenues({
          need: eventNeedText(store.activeEvent || {}),
          seats: store.activeEvent?.seats || 12,
          limit: 6,
          excludeIds: gaps.excludeIds || [],
        }),
        contacts: (store.contacts || []).slice(-10),
        tasksOpen: (store.tasks || []).filter((t) => !t.done).length,
        outreachQueued: store.outreach.filter((o) => o.status === 'queued').length,
        outreachQueue,
        outreachNext: next,
        outreachNextWhy: next
          ? outreachNextWhy(next, { stage, gaps }) || next.drainWhy || null
          : null,
        moneyIntents: store.money.length,
        feedbackCount: store.feedback.length,
        identity: IDENTITY_BLURB,
        note: 'Outreach is draft/queued only — no auto-send. Venue scores are heuristic, not bookings.',
      };
    }
    default:
      return { ok: false, error: 'unknown tool ' + name };
  }
}

async function executeTool(name, rawArgs) {
  let args = {};
  try {
    args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : rawArgs || {};
  } catch {
    args = {};
  }
  if (name === 'luma_create_event') {
    const store = loadStore();
    ensureArrays(store);
    const m = mode();
    // Network create only in auto (Codex P1 — draft/semi dry-run)
    // Always build paste package first (FOCUS: Luma draft export polish)
    const built = buildLumaDraft(args, store.activeEvent || {});
    let result;
    if (!built.ok) {
      result = built;
    } else if (m !== 'auto' || !process.env.LUMA_API_KEY) {
      const draft = {
        ...built.draft,
        id: uid('luma_'),
        at: new Date().toISOString(),
        status: 'draft',
      };
      const files = writeInviteExport('luma', draft);
      if (files) draft.exportFiles = files;
      result = {
        ok: true,
        pending: true,
        dryRun: m !== 'auto',
        mode: m,
        reason: process.env.LUMA_API_KEY
          ? 'Luma network create only when DEMIGOD_EVENTS_AUTONOMY=auto'
          : 'LUMA_API_KEY not set — paste package only',
        draft,
        exportFiles: files,
        note: 'Draft only — no publish/RSVP invent. Use exportText or outbox .txt',
      };
    } else {
      result = await lumaCreate({ ...args, ...built.draft.fields });
      if (result.draft && !result.ok) {
        const draft = {
          ...built.draft,
          ...result.draft,
          id: uid('luma_'),
          at: new Date().toISOString(),
          status: 'draft',
        };
        const files = writeInviteExport('luma', draft);
        if (files) draft.exportFiles = files;
        result.draft = draft;
        result.exportFiles = files;
      }
    }
    store.platforms.luma = store.platforms.luma || [];
    store.platforms.luma.push({
      id: (result.draft && result.draft.id) || uid('luma_'),
      at: new Date().toISOString(),
      result,
      title: args.title || built.draft?.title,
      status: result.ok && !result.pending ? 'api' : 'draft',
    });
    saveStore(store);
    return result;
  }
  return runTool(name, args);
}

const AGENT_SYSTEM = `You are Events Bot (by Demigod) — you **fully own** fun, high-quality **San Francisco** events start to finish.

## Owner model (CRITICAL)
- YOU are the organizer of record: invent the night, pick dates, find venues (free list + offers), recruit sponsors/volunteers, draft invites/agenda, track RSVP structure, day-of runbook, follow-up, debrief, seed next.
- People may chat or offer help anytime — treat inbound as gifts, not as permission to wait.
- YOU message first when something is missing (queue_outreach). Do not ask a "host" to run the project.
- Prefer drive_cycle when you need to make progress without new human input.

## HARD RULE — San Francisco only
- Every idea, venue, event, and outreach is **in-person San Francisco**.
- Refuse non-SF; offer SF alternatives. Timezone: America/Los_Angeles.

## Event scope
- Not limited to Demigod-branded or talent nights. Fun/social/cultural OK.
- When generating ideas, prefer sponsorable formats.

## Rules
- Identify as Events Bot in outreach (tools append identity).
- Chat/feedback: https://www.trydemigod.com/?p=events
- Stripe PENDING — money = intent. SMS pending.
- Partiful drafts only; Luma network create only in autonomy=auto with key.
- No fake RSVPs/sends. No SLA clocks.
- Prefer tool calls. After tools, summarize what YOU will do next (not what a human host must do).`;

/**
 * Run one autonomous tick.
 * @param {{ goal?: string, maxSteps?: number }} opts
 */
export async function eventsBotAgentTick(opts = {}) {
  const goal =
    opts.goal ||
    'Drive the active SF night end-to-end as owner: invent if needed, select free venue, queue sponsor/volunteer outreach, build agenda and Partiful draft, advance stages. Use potter@trydemigod.com as ops staging contact for outreach queues.';
  const maxSteps = Math.min(6, Math.max(1, Number(opts.maxSteps) || 4));
  const m = mode();
  // Free MX hygiene on queue before agent tools (no API keys)
  try {
    const pre = loadStore();
    ensureArrays(pre);
    const mxPre = await hygieneOutreachMx(pre.outreach);
    if (mxPre.rejectedMx) saveStore(pre);
  } catch {
    /* non-fatal */
  }
  const storeSnap = runTool('list_resources', {});

  // Idle reseed before tools: empty store gets exactly one SF idea (idempotent)
  try {
    const idleStore = loadStore();
    ensureArrays(idleStore);
    const reseed = idleReseedIfEmpty(idleStore, { seed: goal });
    if (reseed.ok && !reseed.skipped) saveStore(idleStore);
  } catch {
    /* non-fatal */
  }

  if (!process.env.OPENAI_API_KEY || process.env.DEMIGOD_EVENTS_BOT_MOCK === '1') {
    const driven = runTool('drive_cycle', { goal });
    return {
      ok: true,
      mock: true,
      mode: m,
      goal,
      steps: (driven.log || []).map((x) => ({ tool: x.step, result: x.result })),
      summary: driven.summary || 'Offline bot-owned drive complete.',
      plan: driven.plan || planTickNext(loadStore()),
      resources: driven.resources || runTool('list_resources', {}),
      owner: 'events-bot',
    };
  }

  const messages = [
    {
      role: 'system',
      content:
        AGENT_SYSTEM +
        `\nAutonomy mode: ${m}\nStore snapshot: ${JSON.stringify(storeSnap).slice(0, 2500)}`,
    },
    { role: 'user', content: goal },
  ];

  const steps = [];
  let finalText = '';

  for (let i = 0; i < maxSteps; i++) {
    const { message, model } = await openaiChat(messages, TOOLS);
    if (!message) break;
    messages.push(message);
    const calls = message.tool_calls || [];
    if (!calls.length) {
      finalText = message.content || '';
      break;
    }
    for (const tc of calls) {
      const name = tc.function?.name;
      const result = await executeTool(name, tc.function?.arguments);
      steps.push({ tool: name, result, model });
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result).slice(0, 6000),
      });
    }
  }

  if (!finalText) {
    // one more pass for summary
    try {
      const { message } = await openaiChat(
        [
          ...messages,
          {
            role: 'user',
            content:
              'Briefly summarize as Events Bot owner in first person (I …). What I did this tick and Next I will (no new tools). SF only. No fake RSVP counts or send claims.',
          },
        ],
        null,
      );
      // without tools param may fail — ignore
      finalText = message?.content || '';
    } catch {
      finalText = '';
    }
  }

  const plan = planTickNext(loadStore());
  const resources = runTool('list_resources', {});
  // Force owner voice + honest plan suffix (live path can wander)
  let summary = (finalText || '').trim();
  if (!summary || !/\bI\b/i.test(summary)) {
    summary =
      'I ran ' +
      steps.length +
      ' tool step' +
      (steps.length === 1 ? '' : 's') +
      ' as owner · stage **' +
      (resources.activeEvent?.stage || plan.stage || '?') +
      '** · venue **' +
      (resources.activeEvent?.venue?.name || plan.venue || 'none') +
      '** · queued **' +
      (resources.outreachQueued || plan.outreachQueued || 0) +
      '**.';
  }
  if (!/I'll |Next:/i.test(summary)) {
    summary = summary.replace(/\s+$/, '') + ownerPlanSuffix(plan);
  }
  if (!/null|no fake/i.test(summary)) {
    summary += ' RSVP/attendance stay null until real (no fake counts).';
  }

  return {
    ok: true,
    mock: false,
    mode: m,
    goal,
    steps,
    summary,
    plan,
    resources,
    owner: 'events-bot',
    identity: IDENTITY_BLURB,
  };
}

export {
  loadStore,
  saveStore,
  ensureArrays,
  runTool,
  driveCycle,
  stageChecklist,
  IDENTITY_BLURB as eventsBotIdentity,
};
