/**
 * Demigod Events Bot — autonomous agent (Codex-class OpenAI tools loop)
 *
 * Modes (env DEMIGOD_EVENTS_AUTONOMY):
 *   draft  — full local ops (ideas, event, tasks, venue, outreach queue); no network send/Luma create (default)
 *   semi   — same as draft + Luma draft payloads recorded
 *   auto   — full local automation; external invites and sends remain draft-only
 * Owner model: Events Bot runs the night start→finish. People offer/chat; bot messages first when needed.
 *
 * Env:
 *   OPENAI_API_KEY — required for live agent ticks
 *   OPENAI_EVENTS_MODEL — default gpt-4o-mini
 *   DEMIGOD_EVENTS_AUTONOMY — draft|semi|auto
 *   DEMIGOD_EVENTS_BOT_MOCK=1 — force offline
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { withFileLock } from './demigod-agent-tools-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
/** Override with DEMIGOD_EVENTS_STORE so selftest never mutates prod. */
function eventsStorePath() {
  return process.env.DEMIGOD_EVENTS_STORE || path.join(ROOT, 'DEMIGOD-EVENTS.json');
}
let storeLockDepth = 0;
export function withEventsStoreLock(fn) {
  if (storeLockDepth) return fn();
  return withFileLock(eventsStorePath() + '.lock', () => {
    storeLockDepth++;
    try {
      return fn();
    } finally {
      storeLockDepth--;
    }
  });
}
/** Override with DEMIGOD_EVENTS_OUTBOX so selftest never floods prod outbox. */
export function eventsOutboxPath() {
  return process.env.DEMIGOD_EVENTS_OUTBOX || path.join(ROOT, 'events-bot-outbox');
}
function writeOutreachOutbox(item) {
  const outbox = eventsOutboxPath();
  fs.mkdirSync(outbox, { recursive: true });
  fs.writeFileSync(path.join(outbox, item.id + '.json'), JSON.stringify(item, null, 2));
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
// residual-37: SF landmarks that isSfLocation accepts but bare offer text lacked SF_OK
// (Fort Mason/Crissy/Dolores/Golden Gate Park/Fisherman's Wharf/Yerba Buena gardens/…).
// Not South Beach (Miami residual-24). Hybrid still OK via existing hoods.
// residual-38: bare city gate needs SF_OK for hoods isSfLocation already accepts
// (Sea Cliff/Diamond Heights/Stonestown/Parkside/Oceanview/China Basin/Western Addition/
// Fillmore district/North Waterfront/Ashbury Heights). Fillmore CA still NON_SF.
// residual-36: Valencia Street + Portola (district) for offerIsSf SF_OK gate
// (isSfLocation already defaulted true; Valencia CA / Portola CA|Valley stay NON_SF-first)
// residual-39: bare Telegraph Hill + South Park free-text lacked SF_OK (city empty → false reject)
// residual-40: Upper Market (Castro corridor) lacked SF_OK — bare "Upper Market" false-reject
// residual-41: Ferry Building + India Basin lacked SF_OK (china basin already OK; free-list v_ferry_arcade)
// residual-42: free-list/area hoods already in offer geo but bare isSfLocation false-reject
// (Baker Beach/Lands End/Fort Point/Aquatic Park/Pier 70/Candlestick/Glen Canyon/
// South Van Ness/Buena Vista Park/Rincon Park). Skip bare panhandle (Texas) + bare
// Buena Vista (CA/CO cities). Van Ness alone still via south van ness only.
// residual-43: bare SF-only hoods false-reject (Silver Terrace/St. Francis Wood/Cayuga/
// NoPa/Polk Gulch/Crocker Amazon/Lone Mountain/University Mound). Not bare South Beach
// (Miami) or bare Balboa Park (San Diego) — those still need SF qualifier.
// residual-44: more bare SF parks/districts false-reject (Mount Davidson/McLaren/Holly/
// Showplace Square/Sunnydale/Islais Creek). Not LA Westwood (NON_SF) or bare Design District
// without SF cue if later narrowed; Design District SF is Showplace-adjacent.
// residual-45: free-list Salesforce Park + Transbay + Cathedral Hill bare false-reject
// (v_salesforce_park card already SoMa; not bare Design District / Balboa Park / South Beach).
const SF_OK =
  /\b(san francisco|sf\b|soma|south\s+of\s+market|mission district|mission\b|folsom|market street|upper\s+market|mid[- ]market|financial district|fi?di\b|civic center|hayes valley|castro|eureka valley|north beach|marina|potrero|dogpatch|tenderloin|nob hill|russian hill|telegraph hill|pacific heights|chinatown|japantown|embarcadero|union square|presidio|bayview|excelsior|bernal|noe valley|haight|richmond|sunset|twin peaks|glen park|south park|ingleside|visitacion|treasure island|yerba buena(?:\s+island)?|alamo square|west portal|cow hollow|jackson square|rincon hill|lake merced|merced heights|merced manor|park merced|parkmerced|anza vista|little hollywood|golden gate park|fort mason|crissy field|dolores park|hunter'?s?\s+point|duboce(?:\s+triangle)?|cole valley|fisherman'?s?\s+wharf|moscone|pier\s*39|oracle park|chase center|ghirardelli|coit tower|lombard street|corona heights|washington square|lincoln way|ocean beach|sea\s*cliff|diamond heights|stonestown|parkside|oceanview|china basin|india basin|ferry\s+building|western addition|fillmore|north waterfront|ashbury(?:\s+heights)?|valencia\s+street|portola(?:\s+district)?|forest\s+hill|miraloma(?:\s+park)?|sloat|lakeside(?:\s+(?:village|district))?|sunnyside\s+(?:district|neighborhood)|baker\s+beach|land'?s?\s+end|fort\s+point|aquatic\s+park|pier\s*70|candlestick(?:\s+point)?|glen\s+canyon|south\s+van\s+ness|buena\s+vista\s+park|rincon\s+park|silver\s+terrace|st\.?\s*francis\s+wood|cayuga(?:\s+park)?|nopa|no\s*pa|polk\s+gulch|crocker[- ]?amazon|lone\s+mountain|university\s+mound|mount\s+davidson|mclaren\s+park|holly\s+park|showplace\s+square|sunnydale|islais\s+creek|salesforce\s+(?:park|tower)|transbay(?:\s+(?:terminal|center|transit))?|cathedral\s+hill|midtown\s+terrace|alcatraz|fort\s+funston|sutro\s+baths|golden\s+gate\s+bridge)\b/i;
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
// residual-19: LA hoods + South Bay/coast/IE that still default-passed (Hollywood/Silver
// Lake/Echo Park/Los Feliz/Koreatown/Boyle Heights/Westwood/DTLA/North Hollywood/
// Canoga Park/Tarzana/Sylmar/Pacoima/San Fernando/Granada Hills/Sunland/Tujunga/
// Century City/Playa del Rey/Playa Vista/Mar Vista/Palms/Mid-Wilshire/Arts District/
// San Pedro/Wilmington/Lawndale/Lomita/Palos Verdes/Rolling Hills; bare Venice/Culver/
// Carson; Los Osos/Nipomo/Santa Ynez/Calimesa/Grand Terrace/Bloomington/Sierra Madre/
// Altadena; bare Beaumont/Banning/Greenfield). Mission/Marina still SF.
// residual-20: more LA hoods that still default-passed (Eagle Rock/Glassell Park/Mount
// Washington/Lincoln Heights/El Sereno/Leimert Park/Crenshaw/Baldwin Hills/View Park/
// Ladera Heights/West Adams/Jefferson Park/South Central/Watts/Florence-Firestone/
// Bel Air/Silverlake one-word/Frogtown/Elysian Valley); Signal Hill/Harbor City/Lennox;
// bare Hermosa/Redondo/Newport/Orange; Rancho Bernardo; remote Clubhouse/Spaces/Twitter
// Spaces/X Spaces (+ residual-29 singular Space). Mission/Marina/Richmond district still SF.
// residual-21: LA Valley/central hoods + Ventura edge that still default-passed
// (Chatsworth/Toluca Lake/Valley Village/Universal City/Porter Ranch/North Hills/
// Panorama City/Winnetka/Shadow Hills/Lake View Terrace/Arleta/Mission Hills ≠ Mission;
// K-Town/Fashion District/Sawtelle/Topanga/Miracle Mile/Melrose/Larchmont/Hancock Park/
// Mid-City/Thai Town/Little Armenia/Filipinotown/MacArthur Park/Pico-Union/Exposition Park/
// UCLA/Pacific Design Center/Beverly Center/Carthay/Wilshire Center/Glassell/Elysian Park;
// Westlake Village/Newbury Park/Port Hueneme/Agoura bare/Hidden Hills/Bell Canyon;
// Sunset Beach ≠ Sunset district SF). Mission/Marina/Sunset district still SF.
// residual-22: remote intensifiers + major intl cities + US hoods that still default-passed
// (purely|entirely|completely|totally remote; all-remote; remote by default|preferred;
// no physical location|venue; web|browser|app-based/only; platform-only; digital|online-first;
// location|geo-agnostic; Amsterdam/Madrid/Barcelona/Lisbon/Copenhagen/Stockholm/Oslo/
// Zurich/Geneva/Munich/Hamburg/Melbourne/Auckland/Hong Kong/Taipei/Seoul/Bangkok/Dubai/
// Tel Aviv/Mumbai/Bangalore/Sao Paulo/Buenos Aires/Montreal/Calgary/Ottawa;
// Capitol Hill/Georgetown/Dupont Circle/Adams Morgan/Williamsburg/Bushwick/
// Long Island City/Hoboken/Brookline/New Haven). Mission/Marina still SF.
// residual-23: CO Front Range/mountains + OC edge + more intl that still default-passed
// (Fort Collins/Greeley/Pueblo/Grand Junction/Aspen/Vail/Breckenridge/Durango/Loveland;
// bare Boulder ≠ Boulder Creek; Buena Park/Cardiff(-by-the-Sea)/Los Alamitos;
// Coto de Caza/Ladera Ranch/Trabuco Canyon/Silverado; bare Dixon/Winters;
// Edinburgh/Glasgow/Bristol/Leeds/Liverpool/Vienna/Prague/Warsaw/Budapest/Bucharest;
// Athens/Rome/Milan/Florence/Naples; Brussels/Bruges/Antwerp/Rotterdam/The Hague;
// Helsinki/Reykjavik/Cork; Guadalajara/Monterrey/Cancun; Bogota/Lima/Santiago;
// Cape Town/Johannesburg/Nairobi/Lagos; Cairo/Istanbul/Beirut/Amman;
// Delhi/Hyderabad/Chennai/Kolkata/Pune; Jakarta/Manila/Kuala Lumpur/Ho Chi Minh/Hanoi;
// Shanghai/Beijing/Shenzhen/Guangzhou; Osaka/Kyoto/Busan; Perth/Adelaide;
// Wellington/Christchurch; Winnipeg/Quebec City/Halifax/Edmonton).
// Mission/Marina/Lincoln Way/Folsom Street still SF (no bare lincoln/folsom).
// residual-24: remote platforms + US hoods + intl that still default-passed
// (WhatsApp/iMessage/WeChat/Messenger/Jitsi/Whereby/Remo/Hopin/VRChat -only + meetup;
// WFH/work-from-anywhere/cloud-only|first/async-first/distributed-first/timezone-agnostic/
// global-remote/venue-free/location-free; telegram|signal plain meetup expand;
// NYC Astoria/Park Slope/Dumbo/Greenpoint/Bed-Stuy/Crown Heights/Flatbush/Harlem/SoHo/
// Tribeca/Midtown/UES/UWS/LES/Chelsea; Boston Somerville/Allston/Back Bay/South End/
// Fenway/Beacon Hill/Charlestown; Seattle Ballard/Queen Anne/Wallingford/SLU + bare Bellevue;
// Denver RiNo/LoDo/Cherry Creek; Miami Brickell/South Beach/Little Havana/Coral Gables;
// LA Hollywood Hills/Rancho Park/Cheviot Hills/Beverly Grove; Inland Empire/Orange County;
// Frankfurt/Cologne/Dusseldorf/Stuttgart/Lyon/Marseille/Nice France/Basel/Lausanne/Bern/
// Luxembourg/Monaco; Jerusalem/Haifa/Riyadh/Doha/Abu Dhabi/Kuwait City; Karachi/Lahore/
// Islamabad/Colombo/Kathmandu/Phnom Penh/Yangon/Chiang Mai/Phuket/Bali/Ubud; Fiji/Tahiti;
// CDMX; Kingston/Hamilton/Waterloo). Mission/Marina/Sunset/Richmond/Castro still SF.
// residual-25: NYC metro residual + Philly slang + Eureka Valley SF fix that still default-passed
// (Long Island bare ≠ Long Island City already listed; Staten Island; Bronx/The Bronx;
// Yonkers/White Plains/Westchester; Coney Island/Rockaway(s); Queens residual Flushing/
// Jackson Heights/Bayside/Forest Hills; Brooklyn residual Bay Ridge/Sunset Park/Red Hook/
// Fort Greene/Clinton Hill/Prospect Heights/Boerum Hill/Carroll Gardens/Cobble Hill/Gowanus;
// Hamptons/Montauk/Fire Island; bare philly). Eureka Valley SF (was false-reject via bare
// eureka CA) — eureka(?!\s+valley) + SF_OK eureka valley. Mission/Marina/Castro/Sunset still SF.
// residual-26: SD county + NYC hood residual that still default-passed (Lemon Grove/Spring Valley/
// Bonita/Lakeside/Alpine/Ramona/Fallbrook/Bonsall/Valley Center; LIC abbr; Kips Bay/Murray Hill/
// Gramercy/Nolita/West Village/East Village/Battery Park/Meatpacking/Washington Heights/
// Morningside Heights/Hell's Kitchen/Inwood; Brooklyn Bensonhurst/Sheepshead Bay/Brighton Beach/
// Dyker Heights/Borough Park). FiDi/Financial District/Mission/Marina still SF.
// residual-27: SD city hoods + NYC residual that still default-passed (Point Loma/Hillcrest/
// North Park/Clairemont/Kearny Mesa/Mira Mesa/Encanto/Barrio Logan/Gaslamp/Normal Heights/
// University Heights/Bankers Hill; Flatiron/Hudson Yards/Roosevelt Island/Governors Island/
// Hell Kitchen no-s / UES / UWS). Ocean Beach bare stays SF (SF Ocean Beach); South Park SF
// still SF. Mission/Marina/Castro/FiDi still SF.
// residual-28: more SD city hoods + NYC residual that still default-passed (Scripps Ranch/
// Rancho Peñasquitos/Tierrasanta/Serra Mesa/Grantville/Allied Gardens/Del Cerro/Rolando/
// Talmadge/Logan Heights/Shelltown/Paradise Hills/Otay Mesa/San Ysidro/Sorrento Valley/
// Torrey Pines/Miramar/NAS Miramar/Liberty Station/University City/College Area/Golden Hill/
// Midway District/Morena/Bay Park; Wall Street/Canarsie/Elmhurst/Rego Park/Middle Village/
// Maspeth/Atlantic City/Times Square/Bryant Park/Penn Station/Grand Central/NoMad/
// Bush Terminal/Industry City/Ozone Park/Howard Beach/Jamaica/St. Albans/Bayswater/
// Brownsville/Ditmas Park/Midwood/Marine Park/Gerritsen Beach/Mill Basin/Bergen Beach).
// Ocean Beach bare + South Park SF + Mission/Marina/Castro/FiDi still SF.
// residual-29: NYC residual + US college/mid towns + remote singular Space that still
// default-passed (Prospect Park/Greenwich Village/Alphabet City/South Street Seaport/
// Seaport District/Pier 17/Central Park West|South/Lincoln Center/High Line/
// Bedford-Stuyvesant full form/Prospect Lefferts/Herald Square/Two Bridges;
// Iowa City/Cedar Rapids|Falls/Ames IA/Kalamazoo/Chapel Hill/Champaign/Urbana/Ithaca/
// Burlington VT/Charlottesville/Blacksburg/Columbia bare+MO;
// Twitter|X Space singular + only-on-zoom/clubhouse/spaces). Lincoln Way/Union Square/
// Chinatown/Mission/Marina/Ocean Beach still SF.
// residual-30: NYC residual + US college/mid towns + remote BlueJeans/GoToMeeting that still
// default-passed (Rockefeller Center/Empire State/Tompkins Square/St Marks Place/Bowery/
// Madison Square( Park)/Park Avenue; Corvallis/Pullman/State College/College Station|Park/
// Tempe/Mesa/Tuscaloosa/Amherst/Northampton/Poughkeepsie/Schenectady/Binghamton/Utica/
// New Brunswick/University Park/Lubbock/Waco/Denton/Stillwater/Duluth/Ames bare/
// Great Falls/Pocatello/Ogden/Las Cruces/Amarillo/Midland/St George/Starkville/
// Hattiesburg/Biloxi/Gulfport/Key West/Myrtle Beach/Youngstown/Harrisburg/Allentown/
// Scranton/Erie/Stamford/Bridgeport/Evanston/Naperville/Peoria/Logan bare/Norman/
// Troy/Lawrence/Oxford/Bend bare/Salem bare; BlueJeans|GoToMeeting -only).
// residual-31: NYC residual + US mid/college + remote platform+loft that still default-passed
// (LES/L.E.S./Morningside bare/Hudson Square/Ridgewood/South Slope/Ditmas bare;
// Bangor/Augusta/Montpelier/Portsmouth/Trenton/Dover/Huntington bare/Lynchburg/
// Greenville/Spartanburg/Fayetteville bare/Daytona/Fort Myers/St Pete|Petersburg/
// Clearwater; Whereby|Jitsi|Hopin|Remo|Spatial|VRChat|Discord|Slack|Zoom|Webex|
// Skype|Facetime|Hangouts|Telegram|Signal|BlueJeans|GoToMeeting|Teams + loft|room|
// space|dinner without SF room). Mission/Marina/Castro/Ocean Beach/Lincoln Way/
// hybrid Teams+Mission still SF.
// residual-32: FL/plains/VA residual + Richmond KY|IN|TX + messaging platform+loft that still
// default-passed (Ocala/Boca bare/Lakeland/Fort Pierce/Port St Lucie/Deltona/Palm Bay/
// Homestead/Kissimmee/Bradenton; Pierre/Helena/Laramie/Butte/Kalispell/Twin Falls;
// Hampton/Chesapeake/Suffolk/Fredericksburg; Richmond KY|Kentucky|IN|Indiana|TX|Texas;
// WhatsApp|WeChat|iMessage|Messenger|Google Meet|Gather.town|bare Meet + loft|room|
// space|dinner|hang|night; only-on-whatsapp|wechat|imessage; platform loft).
// Mission/Marina/Castro/Richmond district/Ocean Beach/Lincoln Way/hybrid Meet+Mission still SF.
// residual-33: plains/midwest/FL residual + wine country + collab-tool/online loft that still
// default-passed (Grand Forks/Sioux City/Canton bare/Macon bare/Hot Springs/Overland Park/
// Everett bare/Minot/Grand Island/Kearney/Joplin/Cape Girardeau/Terre Haute/Muncie/Kokomo/
// Parkersburg/Morgantown; Punta Gorda/Sebring/Okeechobee/Vero Beach/Stuart/Jupiter/
// Deerfield Beach/Pompano Beach/Hialeah/Key Largo; Wine Country/Russian River/Anderson Valley;
// Miro|Figma|Notion|Airtable|Calendly|Loom|Linear|Asana|Trello|Monday + loft|hang;
// online|remote|web|digital loft; Meetup online; exclusively|fully|100% online; Discord stage).
// Mission/Marina/Castro/Richmond district/Ocean Beach/Lincoln Way/hybrid Figma+Mission still SF.
// residual-34: US residual + wine + collab/platform loft + phone-in remote that still default-passed
// (Redmond WA/Palm Beach/Appleton/Springfield bare/Dry Creek Valley; Clubhouse|Spaces|Twitter loft;
// ClickUp|Basecamp|Confluence loft; podcast-only; phone-in|call-in|dial-in + venue; broadcast loft).
// Mission/Marina/Castro/Richmond district/Ocean Beach/Lincoln Way/hybrid still SF.
// residual-35: remote collab -only + bare Gather-only + spatial.io + StreamYard + podcast loft/hang +
// platform domains (zoom.us/meet.google.com/discord.gg/slack.com) + youtube/obs-only + twitch loft
// that still default-passed. Hybrid SF room still OK via SF_OK.
// Washington Square stays SF (North Beach). Fifth Ave bare not listed (SF numbered aves).
// Mission/Marina/Castro/Ocean Beach/Lincoln Way/Union Square still SF.
// Oyster Point (South SF), remote-first / teams|discord|phone|slack-only.
// Castro Valley before SF_OK \bcastro\b; bare Bay Area / North Bay / Marin (not Marina).
// virtual|online-only|video-only|webinar-only|fully remote = remote
// (hybrid + SF room still OK if no remote-only token).
// residual-80: Monterey/SD/desert CDPs that still default-passed (Chualar/Prunedale/
// Del Dios/Dulzura/Guatay/Mount Laguna/Cabazon/Whitewater/South Laguna).
// Mission/Marina/Castro/Potrero still SF.
const NON_SF =
  /\b(nyc|new york|brooklyn|manhattan|queens|paris|tokyo|berlin|singapore|sydney|mexico city|los angeles|\bla\b|santa monica|long beach|seattle|austin|san antonio|chicago|miami|london|boston|denver|portland|atlanta|philadelphia|\bphilly\b|houston|dallas|phoenix|las vegas|salt lake city|nashville|minneapolis|toronto|vancouver|washington\s*dc|\bdc\b|remote[- ]only|remote[- ]first|fully remote|video[- ]only|webinar[- ]only|youtube\s+live[- ]only|livestream[- ]only|livestream(?:\s+(?:meetup|event|hang|night|call|session|webinar))?|teleconference|conference\s+call|broadcast[- ]only|virtual(?:[- ]only)?|zoom(?:[- ]only|\s+(?:meetup|event|call|session|room))|online[- ]only|teams[- ]only|microsoft\s+teams[- ]only|discord[- ]only|telegram[- ]only|signal[- ]only|phone[- ]only|slack[- ]only|google\s+meet[- ]only|webex[- ]only|skype[- ]only|facetime[- ]only|hangouts[- ]only|async[- ]only|distributed[- ]only|digital[- ]only|metaverse(?:[- ]only|\s+(?:meetup|event|hang|night|call|session))?|telephone[- ]only|sms[- ]only|text[- ]only|vr(?:[- ]only|\s+(?:meetup|event|hang|night|call|session))|web[- ]only|audio[- ]only|voice[- ]only|call[- ]only|clubhouse(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|loft|dinner|space))|spaces[- ]only|(?:twitter|x)\s+spaces?(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|loft|room|dinner|space))?|oakland|berkeley|alameda|emeryville|el cerrito|albany|piedmont|moraga|hercules|pinole|san pablo|pittsburg|pittsburgh|martinez|benicia|rodeo|crockett|newark|american canyon|suisun(?:\s+city)?|vacaville|temescal|rockridge|fruitvale|lake merritt|san jose|palo alto|mountain view|menlo park|los altos|sunnyvale|cupertino|stanford|googleplex|apple park|moffett(?:\s+field)?|nasa ames|redwood city|redwood shores|san mateo|daly city|south san francisco|south san fran|south sf|\bssf\b|\bsfo\b|san francisco (?:international )?airport|san francisco international|oyster point|san bruno|foster city|burlingame|millbrae|brisbane|colma|broadmoor|pacifica|half moon bay|montara|north fair oaks|bodega bay|sea ranch|forestville|geyserville|sacramento|san diego|santa cruz|capitola|aptos|felton|boulder creek|santa barbara|santa clara|santa rosa|fresno|bakersfield|chico|eureka(?!\s+valley)|redding|red bluff|oroville|arcata|mckinleyville|fortuna|willits|clearlake|lakeport|crescent city|susanville|paradise(?:\s*,?\s*ca|\s+california)|gridley|live oak|orland|corning|anderson(?:\s*,?\s*ca|\s+california)|(?:mount\s+)?shasta(?:\s+lake)?|weed(?:\s*,?\s*ca|\s+california)|yreka|alturas|dunsmuir|ferndale|rio dell|garberville|laytonville|kelseyville|lower lake|middletown|gualala|point arena|boonville|anaheim|pasadena|burbank|santa ana|riverside|san bernardino|palm springs|(?<!lake\s)(?<!park\s)merced(?!\s+(?:heights|manor))|visalia|oxnard|ventura|san luis obispo|\bslo\b|roseville|woodland|yuba city|marysville|turlock|manteca|lodi|lathrop|ripon|oakdale|ceres|galt|isleton|rio vista|patterson|escalon|wasco|shafter|taft|tehachapi|mojave|ridgecrest|big bear|lake arrowhead|twentynine palms|yucca valley|perris|menifee|lake elsinore|wildomar|carlsbad|encinitas|oceanside|escondido|folsom\s*,?\s*ca|folsom\s+california|lake tahoe|south lake tahoe|tahoe city|south shore(?:\s+tahoe)?|tahoe donner|incline village|kings beach|zephyr cove|olympic valley|squaw valley|\breno\b|carson city|carson(?:\s*,?\s*ca|\s+california)?|grass valley|nevada city|placerville|el dorado hills|\bauburn\b|mendocino|big sur|yosemite|fort bragg|ukiah|yountville|st\.?\s*helena|rocklin|elk grove|citrus heights|rancho cordova|cameron park|lincoln(?:\s*,?\s*ca|\s+california)|loomis|west sacramento|malibu|venice beach|venice|culver city|culver|pacific palisades|pebble beach|mission valley|fashion valley|mission beach|mission viejo|pacific beach|coronado|marina del rey|balboa island|del mar|solana beach|newport(?:\s+beach)?|laguna beach|huntington beach|hermosa(?:\s+beach)?|redondo(?:\s+beach)?|costa mesa|dana point|san clemente|fountain valley|garden grove|truckee|monterey|carmel|pacific grove|seaside|sand city|del rey oaks|guadalupe|irvine|davis|yolo(?:\s+county|\s*,?\s*ca\b|\s+california)?|winters(?:\s*,?\s*ca|\s+california)|dixon(?:\s*,?\s*ca|\s+california)|napa|calistoga|petaluma|novato|san rafael|san anselmo|fairfax|ross|concord|pleasanton|dublin|livermore|san carlos|belmont|atherton|los gatos|campbell|milpitas|union city|san leandro|san lorenzo|el sobrante|san ramon|danville|lafayette|orinda|pleasant hill|antioch|tracy|stockton|modesto|vallejo|fairfield|sonoma|guerneville|tiburon|larkspur|corte madera|castro valley|gilroy|morgan hill|hollister|san juan bautista|silicon valley|tri[- ]valley|richmond\s*,?\s*ca\b|richmond\s+california|richmond\s*,?\s*va\b|richmond\s+virginia|richmond\s*,?\s*ky\b|richmond\s+kentucky|richmond\s*,?\s*in\b|richmond\s+indiana|richmond\s*,?\s*tx\b|richmond\s+texas|jackson\s*,?\s*ca\b|jackson\s+california|jackson\s*,?\s*ms\b|jackson\s+mississippi|bay area|north bay|south bay|east bay|peninsula|muir beach|marin|sausalito|mill valley|walnut creek|fremont|hayward|belvedere|kentfield|greenbrae|san quentin|bolinas|stinson beach|inverness|point reyes|kensington|point richmond|brentwood|oakley|clayton|discovery bay|blackhawk|alamo(?!\s+square)|portola valley|sky londa|woodside|hillsborough|saratoga|monte sereno|pescadero|moss beach|el granada|rohnert park|cotati|healdsburg|sebastopol|windsor|cloverdale|scotts valley|watsonville|salinas|clovis|hanford|tulare|porterville|madera|atwater|los banos|chowchilla|lemoore|delano|reedley|sanger|selma|kingsburg|dinuba|pismo beach|arroyo grande|paso robles|templeton|atascadero|morro bay|cayucos|cambria|lompoc|santa maria|goleta|carpinteria|ojai|solvang|buellton|king city|soledad|gonzales|greenfield(?:\s*,?\s*ca|\s+california)?|camarillo|thousand oaks|simi valley|agoura hills|calabasas|sherman oaks|studio city|glendale|pomona|ontario|rancho cucamonga|fontana|rialto|moreno valley|corona(?!\s+heights)|temecula|murrieta|hemet|palm desert|indio|cathedral city|coachella|barstow|victorville|hesperia|apple valley|lancaster|palmdale|santa clarita|claremont|upland|chino hills|whittier|downey|compton|inglewood|torrance|gardena|hawthorne|el segundo|fullerton|orange(?:\s*,?\s*ca|\s+california)?|tustin|lake forest|san juan capistrano|chula vista|national city|imperial beach|el cajon|santee|poway|(?<!(?:anza|buena)\s)vista|encino|van nuys|northridge|reseda|sonora(?:\s*,?\s*ca|\s+california)|mariposa|oakhurst|mammoth lakes|bishop|angels camp|sutter creek|colfax|murphys|groveland|tam valley|port costa|sunol|bethel island|byron(?:\s*,?\s*ca|\s+california)|detroit|cleveland|baltimore|charlotte|tampa|orlando|jacksonville|columbus|indianapolis|milwaukee|kansas city|st\.?\s*louis|saint louis|new orleans|cincinnati|memphis|louisville|raleigh|durham|providence|hartford|buffalo|rochester|honolulu|maui|\bhilo\b|kauai|\boahu\b|boise|spokane|tacoma|eugene|anchorage|oklahoma city|tulsa|omaha|des moines|wichita|little rock|birmingham|norfolk|virginia beach|charleston|savannah|knoxville|chattanooga|albuquerque|tucson|el paso|fort worth|plano|irving|garland|corpus christi|laredo|mcallen|baton rouge|shreveport|mobile|huntsville|montgomery|tallahassee|gainesville|pensacola|sarasota|fort lauderdale|west palm beach|cape coral|madison|green bay|grand rapids|ann arbor|lansing|flint|akron|toledo|dayton|fort wayne|south bend|evansville|lexington|bowling green|bellevue(?:\s*,?\s*wa|\s+washington)|olympia|bellingham|salem(?:\s*,?\s*or|\s+oregon)?|bend|medford|grants pass|idaho falls|missoula|billings|bozeman|cheyenne|casper|fargo|sioux falls|bismarck|rapid city|quincy(?:\s*,?\s*ca|\s+california)|portola(?:\s*,?\s*ca|\s+california)|colusa|willows(?:\s*,?\s*ca|\s+california)|firebaugh|kerman(?:\s*,?\s*ca|\s+california)|lindsay|corcoran|avenal|coalinga|fillmore(?:\s*,?\s*ca|\s+california)|santa paula|moorpark|west hollywood|beverly hills|alhambra|arcadia|redlands|yucaipa|beaumont(?:\s*,?\s*ca|\s+california)?|banning(?:\s*,?\s*ca|\s+california)?|valencia(?:\s*,?\s*ca|\s+california)|livingston(?:\s*,?\s*ca|\s+california)|provo(?:\s*,?\s*ut|\s+utah)?|scottsdale|boulder(?:\s*,?\s*co|\s+colorado)|colorado springs|columbia(?:\s*,?\s*sc|\s+south carolina)|lincoln(?:\s*,?\s*ne|\s+nebraska)|topeka|fayetteville(?:\s*,?\s*ar|\s+arkansas)|fairbanks|juneau|seal beach|rancho mirage|calexico|el centro|brawley|san marcos|st\.?\s*paul|saint paul|greensboro|exeter|lone pine|adelanto|grover beach|mountain house|bodega|occidental|marina(?:\s*,?\s*ca|\s+california)|laguna niguel|diamond bar|rowland heights|hacienda heights|norwalk|bellflower|lakewood|cerritos|cypress|yorba linda|placentia|brea|colton|highland|loma linda|san jacinto|canyon lake|norco|west covina|chino|san dimas|glendora|azusa|monrovia|duarte|covina|baldwin park|el monte|south gate|lynwood|desert hot springs|montebello|pico rivera|commerce(?:\s*,?\s*ca|\s+california)?|vernon(?:\s*,?\s*ca|\s+california)?|maywood|cudahy|huntington park|paramount(?:\s*,?\s*ca|\s+california)?|westminster(?:\s*,?\s*ca|\s+california|\s*,?\s*md|\s+maryland)?|bell gardens|bell(?:\s*,?\s*ca|\s+california)|rosemead|san gabriel|san marino|temple city|aliso viejo|laguna hills|laguna woods|rancho santa margarita|capistrano beach|joshua tree|indian wells|needles(?:\s*,?\s*ca|\s+california)?|california city|parlier|huron(?:\s*,?\s*ca|\s+california)?|mendota|fowler(?:\s*,?\s*ca|\s+california)?|mcfarland|arvin|newhall|canyon country|saugus|acton(?:\s*,?\s*ca|\s+california)?|stevenson ranch|castaic|agua dulce|walnut(?!\s+creek)|flagstaff|sedona|santa fe(?:\s*,?\s*nm|\s+new mexico)?|arlington(?:\s*,?\s*va|\s+virginia)?|alexandria(?:\s*,?\s*va|\s+virginia)?|reston|mclean|bethesda|silver spring|rockville|annapolis|frederick(?:\s*,?\s*md|\s+maryland)?|hagerstown|cumberland(?:\s*,?\s*md|\s+maryland)?|wheeling|winston[- ]salem|roanoke(?:\s*,?\s*va|\s+virginia)?|boca raton|manchester|syracuse|worcester|nashua|jersey city|princeton|asheville|(?<!little\s)hollywood|silver lake|silverlake|echo park|los feliz|koreatown|boyle heights|westwood|dtla|downtown\s+la|downtown\s+los\s+angeles|north hollywood|\bnoho\b|canoga park|tarzana|sylmar|pacoima|san fernando|granada hills|sunland|tujunga|century city|playa del rey|playa vista|mar vista|\bpalms\b|mid[- ]wilshire|arts district|san pedro|wilmington|lawndale|lomita|rancho palos verdes|palos verdes|rolling hills|eagle rock|glassell park|mount washington|lincoln heights|el sereno|leimert(?:\s+park)?|crenshaw|baldwin hills|view park|ladera heights|west adams|jefferson park|south central|\bwatts\b|florence[- ]firestone|bel[- ]?air|frogtown|elysian valley|signal hill|harbor city|\blennox\b|rancho bernardo|los osos|nipomo|santa ynez|calimesa|grand terrace|bloomington|sierra madre|altadena|exclusively\s+remote|100\s*%?\s*remote|100\s+percent\s+remote|no\s+in[- ]person|cyber[- ]only|internet[- ]only|distributed\s+team|chatsworth|toluca lake|valley village|universal city|porter ranch|north hills|panorama city|winnetka|shadow hills|lake view terrace|\barleta\b|mission hills|k[- ]?town|fashion district|sawtelle|topanga(?:\s+canyon)?|miracle mile|\bmelrose\b|larchmont(?:\s+village)?|hancock park|mid[- ]city|thai town|little armenia|(?:historic\s+)?filipinotown|macarthur park|pico[- ]union|exposition park|\bucla\b(?:\s+campus)?|pacific design center|beverly center|carthay(?:\s+circle)?|wilshire center|\bglassell\b|elysian park|westlake village|newbury park|port hueneme|\bagoura\b|hidden hills|bell canyon|sunset beach|amsterdam|madrid|barcelona|lisbon|copenhagen|stockholm|\boslo\b|zurich|geneva|munich|hamburg|melbourne|auckland|hong kong|taipei|seoul|bangkok|dubai|tel aviv|mumbai|bangalore|bengaluru|s[aã]o\s+paulo|buenos aires|montreal|calgary|ottawa|capitol hill|georgetown|dupont circle|adams morgan|williamsburg|bushwick|long island city|hoboken|brookline|new haven|fort collins|greeley|pueblo|grand junction|\baspen\b|\bvail\b|breckenridge|durango|loveland|boulder(?!\s+creek)|buena park|cardiff(?:[- ]by[- ]the[- ]sea)?|los alamitos|coto de caza|ladera ranch|trabuco(?:\s+canyon)?|portola hills|foothill ranch|eastvale|jurupa valley|modjeska(?:\s+canyon)?|silverado|\bdixon\b|\bwinters\b|edinburgh|glasgow|bristol|leeds|liverpool|vienna|prague|warsaw|budapest|bucharest|athens|rome|milan|florence|naples|brussels|bruges|antwerp|rotterdam|the hague|helsinki|reykjavik|\bcork\b|guadalajara|monterrey|\bcancun\b|bogot[aá]|\blima\b|santiago|cape town|johannesburg|nairobi|\blagos\b|cairo|istanbul|beirut|\bamman\b|delhi|hyderabad|chennai|kolkata|\bpune\b|jakarta|manila|kuala lumpur|ho chi minh|\bhanoi\b|shanghai|beijing|shenzhen|guangzhou|osaka|kyoto|\bbusan\b|perth|adelaide|wellington|christchurch|winnipeg|quebec city|halifax|edmonton|whatsapp(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|only))|imessage(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|only))|wechat(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|only))|(?:facebook\s+)?messenger(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|only))|jitsi[- ]only|whereby[- ]only|(?:remo|hopin|spatial|vrchat)[- ]only|(?:mozilla\s+hubs|rec\s+room|gather\s+town)[- ]only|wfh[- ]only|work[- ]from[- ]home(?:[- ]only)?|work[- ]from[- ]anywhere|cloud[- ]only|cloud[- ]first|async[- ]first|asynchronous[- ]only|distributed[- ]first|timezone[- ]agnostic|global[- ]remote|anywhere[- ]in[- ]the[- ]world|venue[- ]free|location[- ]free|astoria|park slope|\bdumbo\b|greenpoint|bed[- ]?stuy|crown heights|flatbush|\bharlem\b|soho|tribeca|\bmidtown\b|upper east side|upper west side|lower east side|chelsea|weehawken|asbury park|jersey shore|somerville|allston|back bay|south end|\bfenway\b|beacon hill|charlestown|ballard|queen anne|wallingford|south lake union|\bbellevue\b|\brino\b|\blodo\b|cherry creek|brickell|south beach|little havana|coral gables|hollywood hills|rancho park|cheviot hills|beverly grove|inland empire|orange county|frankfurt|cologne|d[uü]sseldorf|stuttgart|\blyon\b|marseille|nice(?:\s*,?\s*france|\s+france)|basel|lausanne|\bbern\b|luxembourg|\bmonaco\b|jerusalem|\bhaifa\b|riyadh|\bdoha\b|abu dhabi|kuwait city|karachi|lahore|islamabad|colombo|kathmandu|phnom penh|\byangon\b|chiang mai|\bphuket\b|\bbali\b|\bubud\b|\bfiji\b|tahiti|\bcdmx\b|ciudad de m[eé]xico|kingston|\bhamilton\b|\bwaterloo\b|long island|staten island|(?:the\s+)?bronx|yonkers|white plains|westchester|coney island|rockaways?|jackson heights|flushing|bayside|forest hills|bay ridge|(?<!inner\s)(?<!outer\s)sunset park|red hook|fort greene|clinton hill|prospect heights|boerum hill|carroll gardens|cobble hill|gowanus|(?:the\s+)?hamptons|montauk|fire island|lemon grove|spring valley|bonita|lakeside(?:\s*,?\s*ca|\s+california)|\balpine\b|ramona|fallbrook|bonsall|valley center|\blic\b|kips bay|murray hill|gramercy|nolita|west village|east village|battery park|meatpacking(?:\s+district)?|washington heights|morningside heights|hell'?s kitchen|hell kitchen|\binwood\b|bensonhurst|sheepshead bay|brighton beach|dyker heights|borough park|point loma|hillcrest|north park|clairemont|kearny mesa|mira mesa|\bencanto\b|barrio logan|gaslamp(?:\s+quarter)?|normal heights|university heights|bankers hill|flatiron|hudson yards|roosevelt island|governors island|\bues\b|\buws\b|scripps ranch|rancho pe[nñ]asquitos|tierrasanta|serra mesa|grantville|allied gardens|del cerro|rolando|talmadge|logan heights|shelltown|paradise hills|otay mesa|san ysidro|sorrento valley|torrey pines|(?:nas\s+)?miramar|liberty station|university city|college area|golden hill|midway district|\bmorena\b|bay park|wall street|canarsie|elmhurst|rego park|middle village|maspeth|atlantic city|times square|bryant park|penn station|grand central|\bnomad\b|bush terminal|industry city|ozone park|howard beach|\bjamaica\b|st\.?\s*albans|bayswater|brownsville|ditmas park|midwood|marine park|gerritsen beach|mill basin|bergen beach|prospect park|greenwich village|alphabet city|south street seaport|seaport district|pier\s*17|central park(?:\s+west|\s+south)?|lincoln center|high line|bedford[- ]stuyvesant|prospect[- ]lefferts(?:\s+gardens)?|herald square|two bridges|iowa city|cedar rapids|cedar falls|dubuque|ames(?:\s*,?\s*ia|\s+iowa)?|kalamazoo|chapel hill|champaign|urbana|\bithaca\b|burlington(?:\s*,?\s*vt|\s+vermont)?|charlottesville|blacksburg|columbia(?:\s*,?\s*(?:mo|sc)|\s+(?:missouri|south carolina))?|rockefeller center|empire state(?:\s+building)?|tompkins square|st\.?\s*mark'?s?\s+place|\bbowery\b|madison square(?:\s+park)?|park avenue|corvallis|pullman|state college|college station|college park|tempe|\bmesa\b|tuscaloosa|amherst|northampton|poughkeepsie|schenectady|binghamton|\butica\b|new brunswick|university park|lubbock|\bwaco\b|denton|stillwater|duluth|great falls|pocatello|\bogden\b|las cruces|amarillo|midland|st\.?\s*george|starkville|hattiesburg|biloxi|gulfport|key west|myrtle beach|youngstown|harrisburg|allentown|scranton|\berie\b|stamford|bridgeport|evanston|naperville|peoria|\blogan\b|norman|\btroy\b|lawrence|\boxford\b|bluejeans[- ]only|go\s*to\s*meeting[- ]only|\bles\b|morningside|hudson square|ridgewood|south slope|\bditmas\b|bangor|augusta|montpelier|portsmouth|trenton|\bdover\b|huntington(?!\s+(?:beach|park))|lynchburg|greenville|spartanburg|fayetteville|daytona(?:\s+beach)?|fort myers|st\.?\s*pete(?:rsburg)?|clearwater|ocala|\bboca\b|lakeland|fort pierce|port st\.?\s*lucie|deltona|palm bay|homestead|kissimmee|bradenton|\bpierre\b|\bhelena\b|laramie|\bbutte\b|kalispell|twin falls|\bhampton\b|chesapeake|\bsuffolk\b|fredericksburg|grand forks|sioux city|\bcanton\b|\bmacon\b|hot springs|overland park|\beverett\b|wine country|russian river|anderson valley|\bminot\b|grand island|\bkearney\b|\bjoplin\b|cape girardeau|terre haute|\bmuncie\b|\bkokomo\b|parkersburg|morgantown|punta gorda|\bsebring\b|okeechobee|vero beach|\bstuart\b|\bjupiter\b|deerfield beach|pompano beach|\bhialeah\b|key largo|redmond|palm beach|appleton|springfield|dry creek valley|podcast[- ]only|rockford|eau claire|janesville|wausau|sheboygan|mankato|elmira|plattsburgh|rutland|presque isle|bar harbor|\bacadia\b|traverse city|saginaw|battle creek|muskegon|grand haven|fishers|noblesville|michigan city|elkhart|mishawaka|\bgary\b|hammond|blythe|oceano|trona|farmersville|three rivers|inyokern|kingman|bullhead city|lake havasu(?:\s+city)?|payson|wickenburg|mecca|salton city|calipatria|westmorland|niland|seeley|heber|winterhaven|imperial valley|imperial(?:\s*,?\s*ca|\s+california)?|douglas(?:\s*,?\s*az|\s+arizona)?|bisbee|tombstone|show low|cottonwood|camp verde|paradise valley|cutler|orosi|woodlake|springville|los alamos(?:\s*,?\s*ca|\s+california)?|cuyama|villa park|esparto|knights landing|magalia|salt lake|williams|paradise(?!\s+(?:hills|valley))|anderson(?!\s+valley)|weed|high point|chualar|prunedale|del dios|dulzura|guatay|mount laguna|mt\.?\s+laguna|cabazon|whitewater|south laguna)\b/i;

/**
 * True when free text explicitly names a non-SF city/region.
 * Shared by isSfLocation + chat offline gate (do not re-list cities in chat).
 */
export function mentionsNonSf(text) {
  const t = String(text || '');
  if (/\b(?:outside|near)\s+(?:of\s+)?san francisco\b/i.test(t)) return true;
  // Explicit US state outside California is never SF (covers cities not listed in NON_SF).
  if (/\b(?:A[KLRSZ]|C[OT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY]|tx)\s*$/.test(t)) return true;
  // State abbreviations are uppercase; case-insensitive OR/IN/ME/HI/etc. also match ordinary prose.
  if (/,\s*(?:A[KLRSZ]|C[OT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])\b/.test(t)) return true;
  if (/,\s*(?:alabama|alaska|arizona|arkansas|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i.test(t)) return true;
  if (/\bcambridge\b/i.test(t)) return true;
  // residual-49: bare Tahoe (lake/south/city covered; bare still default-passed) + AZ cities
  if (/\btahoe\b/i.test(t)) return true;
  if (/\b(?:winslow|holbrook|carefree|maricopa|oro valley|san tan valley|apache junction|verde valley|sun city|page(?:\s*,?\s*az|\s+arizona))\b/i.test(t)) return true;
  // residual-54: LA/SB/SLO/NYC that still default-passed (West Hills/Skid Row/USC area;
  // Montecito/Summerland/Los Olivos; Avila|Shell Beach; Stuyvesant Town; Sunnyside Queens).
  // FiDi/Financial District still SF. Bare "harmony" not listed (venue name risk).
  // residual-54b: bare Sunnyside = Queens risk; SF Sunnyside + SF_OK / district escape.
  if (/\b(?:west hills|skid row|usc\s+area|usc\s+campus|montecito|summerland|los olivos|avila beach|shell beach|stuyvesant town)\b/i.test(t)) return true;
  if (/\bsunnyside\b/i.test(t) && !SF_OK.test(t) && !/\bsunnyside\s+(?:district|neighborhood)\b/i.test(t)) return true;
  // residual-54c: Calaveras CDPs that still default-passed (Avery CA / Volcano CA)
  if (/\b(?:avery|volcano)(?:\s*,?\s*ca|\s+california)\b/i.test(t)) return true;
  // residual-55: WA interior/coast that still default-passed (Yakima/Tri-Cities/Wenatchee/
  // Ellensburg/Bremerton/Renton/Centralia; Aberdeen|Kent need WA disambiguator).
  // Mission/Marina/Castro/Ocean Beach still SF.
  if (/\b(?:yakima|kennewick|\bpasco\b|richland|wenatchee|ellensburg|bremerton|renton|centralia|aberdeen(?:\s*,?\s*wa|\s+washington)|kent(?:\s*,?\s*wa|\s+washington))\b/i.test(t)) return true;
  // residual-64: Klamath CA/OR (far north) still default-passed as SF
  if (/\bklamath(?:\s+falls)?\b/i.test(t)) return true;
  // residual-63: Franklin +STATE (not Franklin St SF) + Washington D.C./state mid-string
  // (state abbrev end-anchor missed "Franklin TN loft" / "Washington D.C. loft").
  // Washington Square SF still SF_OK. Bare Franklin / bare Washington stay default-pass.
  if (/\bfranklin(?:\s*,?\s*(?:tn|ma|ca|tx|in|ky|oh|nc|va|wi|pa|nj|ny|ga|il|mi|mo)|\s+(?:tennessee|massachusetts|california|texas|indiana|kentucky|ohio|north\s+carolina|virginia|wisconsin|pennsylvania|new\s+jersey|new\s+york|georgia|illinois|michigan|missouri))\b/i.test(t)) return true;
  if (/\bwashington\s+d\.?\s*c\.?\b/i.test(t)) return true;
  if (/\bwashington\s+state\b/i.test(t)) return true;
  if (/\bstreaming[- ]only\b/i.test(t)) return true;
  // residual-22: hard remote intensifiers (no hybrid SF-room escape)
  if (/\b(?:purely|entirely|completely|totally)\s+remote\b/i.test(t)) return true;
  if (/\ball[- ]remote\b/i.test(t)) return true;
  if (/\bremote\s+(?:by\s+default|preferred)\b/i.test(t)) return true;
  if (/\bno\s+physical\s+(?:location|venue|room|space)\b/i.test(t)) return true;
  if (/\b(?:web|browser|app)[- ](?:based|only)\b/i.test(t)) return true;
  if (/\bplatform[- ]only\b/i.test(t)) return true;
  if (/\b(?:digital|online)[- ]first\b/i.test(t)) return true;
  if (/\b(?:location|geo)[- ]agnostic\b/i.test(t)) return true;
  // residual-24: remote platforms + WFH/anywhere (hard; no hybrid SF-room escape)
  if (/\bwhatsapp(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|loft|dinner|space|only))\b/i.test(t)) return true;
  if (/\bimessage(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|loft|dinner|room|space|only))\b/i.test(t)) return true;
  if (/\bwechat(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|loft|dinner|space|only))\b/i.test(t)) return true;
  if (/\b(?:facebook\s+)?messenger(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|loft|dinner|room|space|only))\b/i.test(t)) return true;
  if (/\b(?:wfh[- ]only|work[- ]from[- ]home(?:[- ]only)?|work[- ]from[- ]anywhere)\b/i.test(t)) return true;
  if (/\b(?:cloud[- ]only|cloud[- ]first|async[- ]first|asynchronous[- ]only|distributed[- ]first)\b/i.test(t)) return true;
  if (/\b(?:timezone[- ]agnostic|global[- ]remote|anywhere[- ]in[- ]the[- ]world)\b/i.test(t)) return true;
  if (/\b(?:venue[- ]free|location[- ]free|no\s+venue)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bjitsi(?:[- ]only|\s+(?:meet(?:up)?|event|hang|night|call|session|only))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bwhereby(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|only))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:remo|hopin|spatial|vrchat)(?:[- ]only|\s+(?:meetup|event|hang|night|call|session|room|only))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:mozilla\s+hubs|rec\s+room|gather\s+town)(?:[- ]only)?\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\btelegram\s+(?:meetup|event|hang|night|call|session|room)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bsignal\s+(?:meetup|event|hang|night|call|session|room)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bsms\s+(?:meetup|event|hang|night|call|session)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bwebinar\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:bluejeans|go\s*to\s*meeting)\s+(?:meetup|event|webinar|call|session|room)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-31/32: remote platform named as venue (loft/room/space/dinner) without SF room cue
  // residual-32 adds WhatsApp|WeChat|iMessage|Messenger|Google Meet|Gather(.town)|bare Meet
  // residual-34 adds Clubhouse|Spaces|Twitter|X as venue loft without SF room
  // residual: optional "only" between platform and venue ("Meet only loft" was default-pass)
  if (
    /\b(?:whereby|jitsi|hopin|remo|spatial|vrchat|(?:microsoft\s+)?teams|discord|slack|zoom|webex|skype|facetime|hangouts|telegram|signal|bluejeans|go\s*to\s*meeting|whatsapp|wechat|imessage|(?:facebook\s+)?messenger|google\s+meet|gather(?:\.town)?|(?<![a-z])meet|clubhouse|spaces|(?:twitter|x))\s+(?:only\s+)?(?:loft|room|space|dinner|hang|night)\b/i.test(
      t,
    ) &&
    !SF_OK.test(t)
  ) {
    return true;
  }
  // residual-32: platform loft/hang as venue without SF room cue
  if (/\bplatform\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-33/34: collab tools / online loft as venue without SF room cue
  // residual-34 adds ClickUp|Basecamp|Confluence
  // residual-45: mural|figjam|typeform|google forms|mixlr|descript|grain|mmhmm|otter|wonder.me|around.co|eventbrite
  if (
    /\b(?:miro|figma|notion|airtable|calendly|loom|linear|asana|trello|monday(?:\.com)?|clickup|basecamp|confluence|mural|figjam|typeform|google\s+forms|mixlr|descript|grain|mmhmm|otter(?:\.ai)?|wonder\.me|around\.co|eventbrite)\s+(?:loft|room|space|dinner|hang|night)\b/i.test(
      t,
    ) &&
    !SF_OK.test(t)
  ) {
    return true;
  }
  // residual-37: online|remote dinner/hang is remote even with "SF audience"; hybrid+SF still ok
  if (
    /\b(?:online|remote|web|digital)\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) &&
    !(/\bhybrid\b/i.test(t) && SF_OK.test(t))
  ) {
    return true;
  }
  if (
    /\b(?:loft|room|space|dinner|hang|night)\s+online\b/i.test(t) &&
    !(/\bhybrid\b/i.test(t) && SF_OK.test(t))
  ) {
    return true;
  }
  if (/\bmeetup\s+online\b/i.test(t) && !(/\bhybrid\b/i.test(t) && SF_OK.test(t))) return true;
  if (/\b(?:exclusively|fully|100\s*%?|100\s+percent)\s+online\b/i.test(t)) return true;
  if (/\bdiscord\s+stage(?:\s+(?:loft|room|space|dinner|hang|night))?\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-34: phone-in / call-in / dial-in (optional -only; words may intervene) / podcast-only / broadcast loft without SF room
  if (/\b(?:phone[- ]in|call[- ]in|dial[- ]in)(?:[- ]only)?\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bpodcast[- ]only\b/i.test(t)) return true;
  if (/\bbroadcast\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-35: collab/platform -only; bare Gather-only; spatial.io; StreamYard; podcast loft;
  // platform domains; youtube/obs-only; twitch loft — without SF room cue
  // residual-45: eventbrite|typeform|mural|figjam|descript|mixlr|grain|mmhmm|google forms|otter|wonder.me|around.co -only
  if (
    /\b(?:miro|figma|notion|airtable|calendly|loom|linear|asana|trello|monday(?:\.com)?|clickup|basecamp|confluence|eventbrite|typeform|mural|figjam|descript|mixlr|grain|mmhmm|google\s+forms|otter(?:\.ai)?|wonder\.me|around\.co)[- ]only\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\bgather(?:\.town)?[- ]only\b/i.test(t)) return true;
  if (/\bgather\s+only\b/i.test(t)) return true;
  if (/\bspatial\.io\b/i.test(t) && !SF_OK.test(t)) return true;
  if (
    /\bstream\s*yard(?:[- ]only|\s+(?:loft|room|space|dinner|hang|night|meetup|event|call|session|stream))?\b/i.test(t) &&
    !SF_OK.test(t)
  ) {
    return true;
  }
  if (/\bpodcast\s+(?:loft|room|space|dinner|hang|night|meetup)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-46: messenger/social as venue (viber/kik/groupme/nextdoor/reddit/snapchat/meetup.com)
  if (/\b(?:viber|kik|groupme|nextdoor|reddit|snapchat)[- ]only\b/i.test(t)) return true;
  if (
    /\b(?:viber|kik|groupme|nextdoor|reddit|snapchat)\s+(?:loft|room|space|dinner|hang|night|ama|only)\b/i.test(t) &&
    !SF_OK.test(t)
  ) {
    return true;
  }
  if (/\bmeetup\.com\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:zoom\.us|meet\.google\.com|forms\.google\.com|discord\.gg|slack\.com|eventbrite\.com)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:obs|youtube)[- ]only\b/i.test(t)) return true;
  // residual-70: webinar/broadcast platforms -only that still default-passed (no SF room)
  if (
    /\b(?:airmeet|goldcast|ring\s*central|webinar\s*jam|demio|livestorm|restream|go\s*to\s*webinar|skype\s+for\s+business|webex\s+events)[- ]only\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\bphone\s+bridge(?:[- ]only)?\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-44: OBS stream only (was false SF; youtube stream only already covered by livestream)
  if (/\bobs\s+stream(?:[- ]only)?\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-71: OBS loft|room|… + LinkedIn Event(s) loft|… that still default-passed (no SF room)
  if (/\bobs\s+(?:loft|room|space|dinner|hang|night|meetup)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\blinkedin\s+events?\s+(?:loft|room|space|dinner|hang|night|meetup)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-72: TX hill country / RGV / coastal that still default-passed (no SF name collisions;
  // Taylor|Manor|Mercedes|Deer Park need TX marker — Taylor St / Merced Manor stay SF)
  if (
    /\b(?:leander|friendswood|weslaco|rio grande city|del rio|eagle pass|uvalde|kerrville|lockhart|bastrop|hutto|dripping springs|wimberley|boerne|marble falls|pearland|baytown|league city|missouri city|galveston|abilene|san angelo|wichita falls|pflugerville|flower mound|new braunfels|harlingen|edinburg|pharr|taylor(?:\s*,?\s*tx|\s+texas)|manor(?:\s*,?\s*tx|\s+texas)|mercedes(?:\s*,?\s*tx|\s+texas)|deer park(?:\s*,?\s*tx|\s+texas)|tyler(?:\s*,?\s*tx|\s+texas)|longview(?:\s*,?\s*tx|\s+texas)|beaumont(?:\s*,?\s*tx|\s+texas)|allen(?:\s*,?\s*tx|\s+texas)|georgetown(?:\s*,?\s*tx|\s+texas))\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-44: Chicago Wicker Park (was default-pass)
  if (/\bwicker\s+park\b/i.test(t)) return true;
  if (/\btwitch\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-36: AZ/NV/ID cities + platform loft that still default-passed
  if (/\b(?:chandler|gilbert|goodyear|avondale|\byuma\b|nogales|henderson|\bnampa\b)\b/i.test(t)) return true;
  // residual-38: LA basin that still default-passed (Artesia/Irwindale/Bradbury/City of Industry)
  if (/\b(?:artesia|irwindale|bradbury|city of industry)\b/i.test(t)) return true;
  // residual-39: North County SD hoods that still default-passed (Leucadia/Bird Rock)
  if (/\b(?:leucadia|bird rock)\b/i.test(t)) return true;
  // residual-40: Sac suburbs + Central Valley that still default-passed
  if (/\b(?:carmichael|fair oaks|antelope(?:\s+ca)?|north highlands|rio linda|riverbank|gustine|newman|orangevale)\b/i.test(t)) return true;
  // residual-41: SD East County + DFW/OR/HI/AZ towns that still default-passed (no SF name collisions)
  if (/\b(?:jamul|casa de oro|city heights|castroville|humboldt(?:\s+county)?|kirkland|beaverton|hillsboro|kailua|odessa|mckinney|mesquite|grand prairie|carrollton|richardson|lewisville|fort smith|prescott|roswell|aurora)\b/i.test(t)) return true;
  // residual-42: Oak Park IL + TX suburbs that still default-passed (bare Frisco slang stays SF)
  if (/\b(?:oak park|round rock|cedar park|sugar land|the woodlands|frisco\s*,?\s*tx|frisco\s+texas)\b/i.test(t)) return true;
  // residual-85: more DFW edge suburbs that still default-passed (bare Frisco slang stays SF)
  if (/\b(?:allen|the colony|little elm|prosper|celina|melissa|southlake|keller|wylie|rockwall|forney|terrell|waxahachie|midlothian|mansfield|bedford|hurst|colleyville|trophy club|coppell|farmers branch|addison)\b/i.test(t)) return true;
  // residual-43: AZ Valley cities that still default-passed (bare "surprise" needs AZ marker)
  if (/\b(?:buckeye|queen creek|casa grande|cave creek|fountain hills|surprise(?:\s*,?\s*az|\s+arizona))\b/i.test(t)) return true;
  // residual-46: Central Coast / SC mountains that still default-passed
  // residual-46b: Harmony CA (SLO Co); bare "harmony" stays open (venue-name risk, residual-54)
  if (/\b(?:san simeon|soquel|ben lomond|harmony(?:\s*,?\s*ca|\s+california))\b/i.test(t)) return true;
  // residual-47: LA basin/OC edge that still default-passed (Montclair IE/Oakland hood;
  // Stanton/Midway City OC; Industry CA ≠ Industry City NYC already listed)
  if (/\b(?:montclair|stanton|midway city|industry(?:\s*,?\s*ca|\s+california))\b/i.test(t)) return true;
  // residual-48: bare CA/US cities that still default-passed (suffix-only NON_SF left bare open;
  // no SF name collisions — Valencia Street / Weed CA slang not matched)
  // residual-84: Arbuckle/Maxwell (Colusa Co) bare loft titles still default-passed
  if (
    /\b(?:dos palos|bass lake|paterson|new rochelle|danbury|waterbury|lowell|livingston|kerman|sonora|coarsegold|wawona|ione|lockeford|hilmar|planada|biola|hughson|waterford|lamont|arbuckle|maxwell)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-64: Stanislaus/Merced edge CDPs that still default-passed as generic titles
  if (/\b(?:keyes|denair|salida|westley|vernalis|ballico|cressey|stevinson|snelling|bystrom|parklawn|shackelford|crows landing|empire(?:\s*,?\s*ca|\s+california))\b/i.test(t)) return true;
  // residual-65: Freedom CA (Santa Cruz Co / Watsonville) still default-passed as generic title
  if (/\bfreedom(?:\s*,?\s*ca|\s+california)\b/i.test(t)) return true;
  // residual-66: Marin/Sonoma/Mendocino + foothill CDPs that still default-passed (no SF collisions)
  if (
    /\b(?:terra linda|marinwood|penngrove|graton|cazadero|duncans mills|little river|potter valley|redwood valley|calpella|talmage|lucas valley|black point|forest knolls|santa venetia|shingle springs|catheys valley|coulterville|hickman|jenner|philo|navarro|caspar|covelo|westport|albion|sleepy hollow|ignacio)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-67: bare WA/CA residual that still default-passed (Canoga Park/Simi Valley/
  // Ladera Heights already NON_SF; bare Canoga|Simi|Ladera still open; Chester bare / Placer)
  // residual-84: bare Chester loft (not only Chester CA) still default-passed
  if (
    /\b(?:walla\s+walla|ladera|canoga|simi|chester|placer\s+county)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-68: SB mountains / high desert that still default-passed (no SF name collisions)
  if (
    /\b(?:wrightwood|running springs|crestline|blue jay|skyforest|phelan|pi[nñ]on hills|mentone|edwards(?:\s*,?\s*ca|\s+california|\s+afb|\s+air force))\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-78: Utah suburbs that still default-passed (Provo already NON_SF)
  if (
    /\b(?:orem|west valley city|lehi|sandy|draper|murray|midvale|american fork|pleasant grove|spanish fork|tooele|layton|bountiful|south jordan|west jordan|taylorsville)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-79: Pacifica coast + CV farm + Tahoe/NV edge that still default-passed
  // (Sharp Park/Mori Point/Linda Mar ≠ SF; bare Incline stays open — too ambiguous)
  if (
    /\b(?:sharp park|mori point|linda mar|armona|pixley|tipton|earlimart|allensworth|stratford|alpaugh|stateline|crystal bay|carnelian bay|norden|soda springs|yerington|tonopah)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-80: Lake Co + Delta + Taos that still default-passed (nice needs CA suffix)
  if (
    /\b(?:locke(?:\s*,?\s*ca|\s+california)?|cobb(?:\s*,?\s*ca|\s+california)|lucerne(?:\s*,?\s*ca|\s+california)?|nice(?:\s*,?\s*ca|\s+california)|upper lake|hidden valley lake|whispering pines|taos)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-81: UT/AZ/NV + AV high-desert that still default-passed (no SF name collisions)
  if (
    /\b(?:mapleton|santaquin|nephi|ephraim|manti|richfield|hurricane|ivins|toquerville|kanab|vernal|moab|cedar city|gardnerville|minden|\bely\b|littlerock|pearblossom|llano|coolidge|eloy|gold canyon|marana|sahuarita|safford|thatcher|morenci|\bglobe\b)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-82: Quad Cities (IA/IL metro) still default-passed as generic US region
  if (/\bquad\s+cities\b/i.test(t)) return true;
  // residual-83: small US cities that still default-passed (Gallup/Tupelo/Dothan/Valdosta/Bethlehem)
  if (/\b(?:gallup|tupelo|dothan|valdosta|bethlehem)\b/i.test(t)) return true;
  // residual-49: LA basin that still default-passed (Montrose CA; Sun Valley CA ≠ SF)
  if (/\b(?:montrose|sun valley)\b/i.test(t)) return true;
  // residual-63: SGV/LA that still default-passed (Bassett/Avocado Heights/Valinda/Industry Hills/LAX)
  if (/\b(?:bassett|avocado heights|valinda|industry hills|lax(?:\s+area)?)\b/i.test(t)) return true;
  // residual-50: LA that still default-passed (Beverly Crest; bare Playa ≠ Mission+Playa;
  // Bell/Industry city loft titles without CA suffix)
  if (/\bbeverly\s+crest\b/i.test(t)) return true;
  if (/\bplaya\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\bbell\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t)) return true;
  if (/\bindustry\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) && !SF_OK.test(t)) return true;
  if (
    /\b(?:github|gitlab|jira|youtube|linkedin|facebook|instagram|tik\s*tok|spotify)\s+(?:loft|room|space|dinner|hang|night)\b/i.test(
      t,
    ) &&
    !SF_OK.test(t)
  ) {
    return true;
  }
  // residual-51: multi-city hoods that still default-passed (Austin/Chicago/Portland/Miami/LA/Dallas/ATL/NOLA)
  if (
    /\b(?:south congress|river north|west loop|fulton market|pearl district|alberta arts|alberta street|wynwood|historic core|jewelry district|usc campus|deep ellum|old fourth ward|ponce city|french quarter|magazine street)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-52: NOLA slang + hoods (new orleans covered; bare nola/bywater/marigny/treme still default-passed)
  if (/\b(?:nola|bywater|marigny|trem[eé]|faubourg marigny)\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-54: Central Valley + NV/HI towns that still default-passed (Folsom Street SF kept)
  if (
    /\b(?:goshen|raisin city|calwa|ivanhoe|terra bella|strathmore|tranquillity|cantua creek|five points|helm|rolinda|herndon|pinedale|old fig garden|malaga|bowles|conejo|del rey|monmouth|laton|riverdale|caruthers|fernley|elko|winnemucca|springdale|kona|folsom(?!\s+street)|easton)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-55: East US + HI/UT that still default-passed (Valencia Street SF kept bare Valencia)
  if (
    /\b(?:reading(?:\s*,?\s*pa|\s+pennsylvania)|camden(?:\s*,?\s*nj|\s+new\s+jersey)?|elizabeth(?:\s*,?\s*nj|\s+new\s+jersey)|council\s+bluffs|lahaina|wailuku|waikiki|park\s+city)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-56: FL/TX/LA/WY/MX that still default-passed (no SF name collisions)
  if (
    /\b(?:gillette|tijuana|galveston|bossier\s+city|lake\s+charles|delray\s+beach|boynton\s+beach|lake\s+worth|west\s+palm|islamorada|big\s+pine\s+key)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-57: CA foothill/valley + LA basin that still default-passed (Mission/Marina/Castro OK)
  if (
    /\b(?:hawaiian\s+gardens|quartz\s+hill|rosamond|big\s+pine|independence(?:\s*,?\s*ca|\s+california)|camp\s+pendleton|winton|williams(?:\s*,?\s*ca|\s+california)|jamestown|amador\s+city|copperopolis|valley\s+springs|woodbridge|acampo|clarksburg|pine\s+grove|mokelumne\s+hill|san\s+andreas|clements|courtland|le\s+grand|north\s+fork|ahwahnee|plymouth(?:\s*,?\s*ca|\s+california)|tehama|willows)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-58: Houston metro / East TX that still default-passed (Ocean Beach/South Park SF kept)
  if (
    /\b(?:killeen|new\s+braunfels|seguin|bryan|port\s+arthur|pearland|baytown|league\s+city|conroe|spring\s*,?\s*tx|katy|humble|kingwood|missouri\s+city|stafford(?:\s*,?\s*tx|\s+texas)|rosenberg|harlingen|victoria(?:\s*,?\s*tx|\s+texas)|san\s+angelo|abilene|tyler|longview|texarkana|nacogdoches|lufkin)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-59: HI/ID/AK + Ocean Beach SD that still default-passed (bare Ocean Beach SF kept)
  if (/\bocean\s+beach\s*(?:,?\s*)?(?:sd|san\s+diego)\b/i.test(t)) return true;
  if (
    /\b(?:coeur\s+d['’]?\s*alene|sitka|kahului|kihei|kapa'?a|lihue|princeville|waimea|hana)\b/i.test(t)
  ) {
    return true;
  }
  // residual-60: CA/AZ/RI/PA towns that still default-passed (no SF name collisions)
  if (
    /\b(?:lemon\s+cove|litchfield\s+park|york(?:\s*,?\s*pa|\s+pennsylvania)|warwick|cranston)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-61: Midwest/NE/ID/NV/HI towns that still default-passed (no SF name collisions)
  if (
    /\b(?:sparks|meridian|joliet|elgin|waukegan|clarksville|edison|new\s+britain|pawtucket|brockton|new\s+bedford|fall\s+river|lynn|quincy(?:\s*,?\s*ma|\s+massachusetts)?|newton|framingham|lewiston|st\.?\s*cloud|pearl\s+city)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-62: IE/desert CA that still default-passed (no SF name collisions)
  // Anza CA still NON_SF; Anza Vista is SF (SF_OK) — do not swallow via bare anza.
  if (
    /\b(?:julian|borrego\s+springs|idyllwild|campo|boulevard(?:\s*,?\s*ca|\s+california)|descanso|pine\s+valley|jacumba|anza(?!\s+vista)|aguanga|morongo\s+valley|landers|wonder\s+valley|pioneertown|rainbow)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-63: multi-city hoods that still default-passed (Ocean Beach/South Park/Little Italy SF kept bare)
  if (/\b(?:belltown|pioneer\s+square|south\s+lake\s+union|slu|buckhead|4s\s+ranch|sabre\s+springs|otay\s+ranch|shoreditch|kreuzberg|shibuya|summerlin|the\s+gulch|pilsen|seaport|hyde\s+park|decatur)\b/i.test(t)) return true;
  if (/\blittle\s+italy\s*(?:,?\s*)?(?:sd|san\s+diego)\b/i.test(t)) return true;
  if (/\bsouth\s+park\s*(?:,?\s*)?(?:sd|san\s+diego)\b/i.test(t)) return true;
  // residual-64: Coachella Valley Thermal/Oasis that still default-passed (bare Oasis left open — venue-name risk)
  if (/\bthermal(?:\s*,?\s*ca|\s+california|\s+(?:loft|room|space|dinner|hang|night))?\b/i.test(t)) return true;
  if (/\boasis(?:\s*,?\s*ca|\s+california|\s+(?:loft|room|space|dinner|hang|night))\b/i.test(t)) return true;
  // residual-65: Kern/valley/gold-country that still default-passed (unique toponyms bare;
  // person-name risk towns only with loft|room|space|dinner|hang|night)
  if (
    /\b(?:oildale|china\s+lake|buttonwillow|weedpatch|ducor|famoso|mckittrick|derby\s+acres|valley\s+acres|tupman|piru|boron|randsburg|rosedale|greenacres|fellows|fiddletown|rail\s*road\s+flat|san\s+joaquin|ford\s+city|val\s+verde)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\b(?:edwards|byron|arnold|west\s+point|volcano|plymouth)\s+(?:loft|room|space|dinner|hang|night)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-66: San Jose hoods + Sierra/Sonoma that still default-passed (no SF name collisions)
  if (
    /\b(?:willow\s+glen|almaden|berryessa|alum\s+rock|santana\s+row|twain\s+harte|june\s+lake|lee\s+vining|markleeville|northstar|dutch\s+flat|downieville|burney|mccloud|dorris|tulelake|glen\s+ellen|kenwood|monte\s+rio|freestone|valley\s+ford|hopland|leggett|arnold(?:\s*,?\s*ca|\s+california))\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-67: US territories + non-SFO CA airports + Jackson Hole that still default-passed
  if (/\b(?:guam|puerto rico|usvi|u\.?s\.?\s*virgin islands|american samoa|pago pago|saipan|cnmi|northern mariana(?:\s+islands)?|wake island|jackson hole)\b/i.test(t)) return true;
  if (/\b(?:san juan|mayag[uü]ez|arecibo|bayam[oó]n|caguas)(?:\s+pr)?\b/i.test(t)) return true;
  if (/\bponce(?:\s+pr|\s+(?:loft|room|space|dinner|hang|night))\b/i.test(t)) return true;
  if (/\bst\.?\s*(?:thomas|croix)\b/i.test(t)) return true;
  if (/\b(?:oak|sjc|san|sna|ont|lax)\s+airport\b/i.test(t)) return true;
  if (/\bjohn wayne airport\b/i.test(t)) return true;
  // residual-68: Humboldt/Sierra foothill CDPs that still default-passed (no SF name collisions)
  if (
    /\b(?:blue\s+lake|trinidad(?:\s*,?\s*ca|\s+california)?|scotia(?:\s*,?\s*ca|\s+california)?|phillipsville|petrolia|whitethorn|redway|myers\s+flat|weott|salyer|willow\s+creek|happy\s+camp|fort\s+jones|montague(?:\s*,?\s*ca|\s+california)|hat\s+creek|loyalton|sierraville|foresthill|pilot\s+hill|diamond\s+springs|pollock\s+pines|grizzly\s+flats|mount\s+aukum|hornitos|fish\s+camp|olancha)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-69: LA basin + Jefferson City MO that still default-passed (Jefferson Street SF still ok)
  if (
    /\b(?:jefferson\s+city|city\s+terrace|beverlywood|pico[- ]?robertson|weho|valley\s+glen|willowbrook|saticoy)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-71: mid/US cities that still default-passed (no SF name collisions;
  // Mission TX / Jackson TN / Independence MO need state; bare Mission/Jackson stay SF)
  if (
    /\b(?:farmington(?:\s+hills)?|bloomfield(?:\s+hills)?|west\s+bloomfield|kenosha|racine|jonesboro|lawton|owensboro|reading|elizabeth|cary|murfreesboro|edinburg|pharr|flower\s+mound|rowlett|pflugerville|euless|desoto|grapevine|independence(?:\s*,?\s*mo|\s+missouri)|jackson(?:\s*,?\s*tn|\s+tennessee)|allen(?:\s*,?\s*tx|\s+texas)|mission(?:\s*,?\s*tx|\s+texas)|temple(?:\s*,?\s*tx|\s+texas))\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-72: Marina|Valencia + venue + CA word order (Marina CA / Valencia CA already
  // adjacent-only); Lincoln loft|room… ≠ Lincoln Way SF (folsom residual-54 pattern)
  if (/\b(?:marina|valencia)\s+(?:loft|warehouse|space|venue|gallery|room|office)\s*,?\s*(?:ca\b|california)\b/i.test(t)) return true;
  if (/\blincoln\s+(?:loft|room|space|dinner|hang|night)\b/i.test(t) && !/\blincoln\s+way\b/i.test(t)) return true;
  // residual-73: Sierra/East Bay/NV that still default-passed (Independence Day kept)
  if (/\b(?:death\s+valley|pahrump|donner(?:\s+pass)?|mount\s+diablo|diablo)\b/i.test(t)) return true;
  if (/\bindependence\s+(?:loft|room|space|venue|hang|night|dinner|office|warehouse|gallery)\b/i.test(t)) return true;
  // residual-74: CA/NV/OC/AZ that still default-passed (Biggs/Homeland/Crystal Cove;
  // Winchester CA; Fallon NV; Parker AZ). Mission/Marina/Castro still SF.
  if (/\b(?:biggs|homeland|crystal\s+cove|winchester(?:\s*,?\s*ca|\s+california)|fallon(?:\s*,?\s*nv|\s+nevada)?|parker(?:\s*,?\s*az|\s+arizona))\b/i.test(t)) return true;
  // residual-75: East Coast beach towns that still default-passed (no SF name collisions)
  if (/\b(?:cape\s+may|rehoboth(?:\s+beach)?|st\.?\s*augustine|panama\s+city(?:\s+beach)?)\b/i.test(t)) return true;
  // residual-76: CA CDPs that still default-passed (French Camp/Freeport/Hood CA/
  // Lake Hughes/Baywood). No SF name collisions.
  if (/\b(?:french\s+camp|freeport|lake\s+hughes|baywood(?:[- ]los\s+osos)?|hood(?:\s*,?\s*ca|\s+california))\b/i.test(t)) return true;
  // residual-77: Menlo Oaks (Menlo Park edge) + Imperial border CDPs still default-passed
  if (/\b(?:menlo\s+oaks|tecate|ocotillo|holtville)\b/i.test(t)) return true;
  // residual-79: Sierra/Napa bare CDPs that still default-passed (no SF name collisions)
  if (
    /\b(?:frazier\s+park|lebec|gorman|angwin|pope\s+valley|bootjack|midpines|el\s+portal|prather|auberry|shaver\s+lake)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // residual-31: L.E.S. (periods) — outer NON_SF \b does not land after trailing dot
  if (/\bl\.e\.s\.?\b/i.test(t)) return true;
  if (/\b(?:san mateo|alameda|contra costa|marin|solano|santa clara) county\b/i.test(t)) return true;
  if (/\brossmoor\b/i.test(t)) return true;
  if (/\b(?:south city|san gregorio|la honda|loma mar|davenport|tomales|nicasio|san geronimo|lagunitas|woodacre|dillon beach|marshall(?:,? ca)?|olema|mare island|moss landing|bay point|pacheco|emerald hills|fairview|cherryland|ashland|bay farm island|knightsen|treasure island,? florida)\b/i.test(t)) return true;
  if (/\btwitch(?:[- ]only|\s+(?:live|stream|meetup|event|hang|night|call|session))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\btik\s*tok(?:[- ]only|\s+(?:live|stream|meetup|event|hang|night|call|session))\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\b(?:instagram|facebook)\s+live(?:[- ]only|\s+(?:stream|meetup|event|hang|night|call|session))?\b/i.test(t) && !SF_OK.test(t)) return true;
  if (/\blinkedin\s+live(?:[- ]only|\s+(?:stream|meetup|event|hang|night|call|session))?\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-53: YouTube/Vimeo/Crowdcast/Restream/OBS Live (founder night intervenes; hybrid+SF ok)
  if (/\b(?:youtube|vimeo|crowdcast|restream|obs)\s+live(?:[- ]only|\s+(?:stream|meetup|event|hang|night|call|session))?\b/i.test(t) && !SF_OK.test(t)) return true;
  // residual-53: outside|near|greater SF / SFBA / SF Bay (SF_OK \bsf\b was false SF)
  if (/\b(?:outside|greater)\s+sf\b|\bnear\s+sf\b(?!\s+county\s+line)/i.test(t)) return true;
  if (/\bsfba\b/i.test(t) || /\bsf\s+bay\b/i.test(t)) return true;
  if (/^\s*(?:zoom|google\s+meet|webex|skype|facetime|microsoft\s+teams|teams|discord|slack)\s*$/i.test(t)) return true;
  // hang|night closes residual-14 ("Slack hang only", "Discord night only")
  const implicitRemote = /\b(?:discord|facetime|gather(?:\.town)?|hangouts|online|skype|slack|youtube\s+live|zoom|(?:microsoft\s+)?teams)\s+(?:meetup|event|webinar|call|session|room|server|hang|huddle|night)\b/i.test(t);
  // "only on Slack/Discord/…" is remote-first even if an SF room is named
  // residual-29: only-on-zoom hyphen form + Clubhouse/Spaces/(Twitter|X) Space(s)
  // residual-45: only-on-{collab} (calendly/miro/figma/eventbrite/…) matched residual-35 -only form only
  // residual-70: only-on spatial/airmeet/goldcast/demio/livestorm/restream/ringcentral/webinarjam
  const onlyOnRemote =
    /\bonly\s+on\s+(?:slack|discord|teams|zoom|webex|skype|facetime|hangouts|clubhouse|spaces|(?:twitter|x)\s+spaces?|whatsapp|wechat|imessage|(?:facebook\s+)?messenger|google\s+meet|miro|figma|notion|airtable|calendly|loom|linear|asana|trello|monday(?:\.com)?|clickup|basecamp|confluence|gather(?:\.town)?|eventbrite|typeform|mural|figjam|google\s+forms|descript|mixlr|grain|mmhmm|otter(?:\.ai)?|wonder\.me|around\.co|spatial|airmeet|goldcast|demio|livestorm|restream|ring\s*central|webinar\s*jam)\b/i.test(
      t,
    ) ||
    /\bonly[- ]on[- ](?:slack|discord|teams|zoom|webex|skype|facetime|hangouts|clubhouse|whatsapp|wechat|imessage|messenger|miro|figma|notion|airtable|calendly|loom|linear|asana|trello|monday|clickup|basecamp|confluence|gather|eventbrite|typeform|mural|figjam|descript|mixlr|grain|mmhmm|otter|spatial|airmeet|goldcast|demio|livestorm|restream|ringcentral|webinarjam)\b/i.test(t);
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
  // residual-62: South Beach SF (SoMa) — bare "south beach" is Miami NON_SF
  if (/\bsouth beach\b/i.test(t) && SF_OK.test(t)) return true;
  // residual-65: Midtown Terrace SF — bare midtown is NYC NON_SF
  if (/\bmidtown\s+terrace\b/i.test(t) && SF_OK.test(t)) return true;
  // residual-63: Inner/Outer Sunset SF — bare "Sunset Park" stays Brooklyn NON_SF
  if (/\b(?:inner|outer)\s+sunset\b/i.test(t)) {
    const rest = t.replace(/\b(?:inner|outer)\s+sunset(?:\s+park)?\b/gi, ' ');
    if (!mentionsNonSf(rest)) return true;
  }
  // Reject non-SF cities even if "SF audience" appears later (Codex P1)
  if (mentionsNonSf(t)) return false;
  if (SF_OK.test(t)) return true;
  // Bare street address without SF neighborhood cue → reject (not event titles like "rooftop party")
  if (/\b\d{1,5}\s+[\w.'-]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|way|dr|drive|ln|lane|ct|court|pl|place|ter|terrace|pkwy|parkway|cir|circle|hwy|highway)\b/i.test(t)) {
    return false;
  }
  // Place-only tokens (not full event titles) without SF cue
  if (/^(the\s+)?(rooftop|venue|loft|space|gallery|warehouse)\s*$/i.test(t)) return false;
  return false;
}

/** Curated free / low-friction SF gathering options (research seed — not a booking API). */
export const FREE_SF_VENUES = [
  { id: 'v_mission_library', name: 'Mission Branch Library meeting room', area: 'Mission', capacity: 20, cost: 'free (reserve)', notes: 'SFPL room request; good for talks/salons', tags: ['salon','talk','indoor'], lat: 37.751969, lng: -122.419826 },
  { id: 'v_main_library', name: 'SF Main Library / Civic Center meeting room', area: 'Civic Center', capacity: 30, cost: 'free (reserve)', notes: 'SFPL Main Library rooms; talks/salons; reserve via SFPL', tags: ['salon','talk','indoor','library'], lat: 37.779082, lng: -122.416152 },
  { id: 'v_soma_parklet', name: 'South Park lawn / parklet hang', area: 'SoMa', capacity: 25, cost: 'free public', notes: 'Weather-dependent; soft social / picnic', tags: ['social','outdoor','picnic'], lat: 37.78159, lng: -122.39397 },
  { id: 'v_yerba_buena', name: 'Yerba Buena Gardens edge meetup', area: 'SoMa', capacity: 35, cost: 'free public', notes: 'Soft outdoor hang near Moscone; no exclusive use', tags: ['outdoor','social','meetup'], lat: 37.78487, lng: -122.40215 },
  { id: 'v_embarcadero_bench', name: 'Embarcadero promenade meetup point', area: 'Embarcadero', capacity: 40, cost: 'free public', notes: 'Walk-and-talk start; no exclusive use', tags: ['walk','outdoor','networking'], lat: 37.79546, lng: -122.39361 },
  // residual: picnic keyword missed Hayes green → Alamo/Hayes free picnic crowned SoMa parklet (draft free-list)
  { id: 'v_hayes_green', name: 'Patricia\'s Green / Hayes Valley open space', area: 'Hayes Valley', capacity: 30, cost: 'free public', notes: 'Daytime preferred; loud evenings', tags: ['outdoor','daytime','picnic','social'], lat: 37.776227, lng: -122.424422 },
  { id: 'v_dolores', name: 'Mission Dolores Park edge meetup', area: 'Mission', capacity: 50, cost: 'free public', notes: 'Large soft hang; bring blankets', tags: ['outdoor','party','picnic'], lat: 37.759576, lng: -122.426868 },
  { id: 'v_ferry_arcade', name: 'Ferry Building arcade / plaza edge', area: 'Embarcadero', capacity: 20, cost: 'free public (no exclusive)', notes: 'Short meetups; food nearby for sponsor tab', tags: ['meetup','food','outdoor'], lat: 37.795464, lng: -122.393614 },
  { id: 'v_crissy', name: 'Crissy Field / Marina Green meetup', area: 'Marina / Presidio', capacity: 40, cost: 'free public', notes: 'Walk-and-talk start; weather-dependent; no exclusive use', tags: ['walk','outdoor','meetup','networking'], lat: 37.806, lng: -122.4457 },
  { id: 'v_salesforce_park', name: 'Salesforce Park / Transit Center roof garden edge', area: 'SoMa', capacity: 30, cost: 'free public', notes: 'Elevated soft hang near Salesforce Tower; hours vary; no exclusive use', tags: ['outdoor','social','meetup','daytime'], lat: 37.7897, lng: -122.396 },
  { id: 'v_cafe_sponsor', name: 'Sponsor-hosted café buyout (ask)', area: 'SF various', capacity: 15, cost: 'sponsor tab', notes: 'Bot queues café/sponsor ask; not free but zero host cash', tags: ['indoor','dinner','sponsor'] },
  { id: 'v_office_loan', name: 'Startup office after-hours loan', area: 'SoMa / Mission', capacity: 40, cost: 'in-kind', notes: 'Queue outreach to founder offices with spare room', tags: ['indoor','demo','showcase'] },
  // Second edible indoor lead: supper venue_alt shortlists were collapsing to office-only after food filters.
  { id: 'v_community_dining', name: 'Community dining / shared kitchen room (ask)', area: 'Mission / SoMa', capacity: 16, cost: 'in-kind', notes: 'Queue community kitchen or shared dining room ask; seated meals; draft lead only — not booked', tags: ['indoor','dinner'] },
  // Third edible indoor lead: after excluding café pick, ranked shortlists only had kitchen+office (n<3).
  { id: 'v_nonprofit_hall', name: 'Nonprofit multipurpose / community hall (ask)', area: 'Mission / SoMa', capacity: 24, cost: 'in-kind', notes: 'Queue nonprofit or community-org hall ask for seated meals; draft lead only — not booked', tags: ['indoor','dinner'] },
];

/**
 * Neighborhood clusters for free-list area affinity (draft match only).
 * Need token → tokens that count as a hit on venue area/name/notes.
 */
const AREA_NEAR = {
  // residual: SoMa free indoor free-list is Mission SFPL (no free SoMa indoor card) — draft only
  soma: ['soma', 'yerba', 'south park', 'moscone', 'south of market', 'salesforce', 'mission'],
  // residual: Mission outdoor free-list area-missed SoMa parklet/Yerba (Dolores alt → Crissy)
  mission: ['mission', 'dolores', 'bernal', 'noe', 'valencia', 'soma', 'south park', 'yerba'],
  valencia: ['valencia', 'mission', 'dolores'],
  castro: ['castro', 'mission', 'dolores', 'noe'],
  // Indoor free-list is Civic SFPL (no Hayes/Haight free indoor card)
  // residual: hayes/haight dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  hayes: ['hayes', 'haight', 'civic', 'main library', 'mission', 'soma'],
  haight: ['haight', 'hayes', 'civic', 'main library', 'mission', 'soma'],
  embarcadero: ['embarcadero', 'ferry', 'fidi', 'financial', 'civic'],
  // residual: ferry/ferry building indoor free-list is Civic SFPL (draft affinity only)
  ferry: ['ferry', 'embarcadero', 'fidi', 'financial', 'civic', 'main library'],
  // residual: FiDi quiet indoor had area-miss — free indoor is Civic SFPL (emb already maps civic)
  // residual: FiDi dinner also maps SoMa free-list (community dining / office loan) — adjacent, draft only
  fidi: ['fidi', 'financial', 'embarcadero', 'ferry', 'fi di', 'civic', 'main library', 'soma', 'yerba'],
  fdi: ['fidi', 'financial', 'embarcadero', 'ferry', 'civic', 'main library', 'soma', 'yerba'],
  financial: ['financial', 'fidi', 'embarcadero', 'ferry', 'civic', 'main library', 'soma', 'yerba'],
  fi: ['fidi', 'financial', 'embarcadero', 'ferry', 'civic', 'main library', 'soma', 'yerba'],
  // residual: dogpatch outdoor free-list areaNeed missed SoMa cards (parklet/Yerba/Salesforce)
  dogpatch: ['dogpatch', 'potrero', 'mission', 'mission bay', 'soma', 'yerba', 'south park', 'salesforce'],
  potrero: ['potrero', 'dogpatch', 'mission', 'soma'],
  // Mission Bay ≠ Mission Dolores (was false area hit via bare "mission")
  'mission bay': ['mission bay', 'dogpatch', 'potrero', 'soma', 'yerba'],
  missionbay: ['mission bay', 'dogpatch', 'potrero', 'soma', 'yerba'],
  // residual: no Richmond free-list card — outdoor Crissy/Marina; indoor Civic SFPL
  // residual: richmond dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft affinity only
  richmond: ['richmond', 'marina', 'presidio', 'crissy', 'sunset', 'civic', 'main library', 'mission', 'soma'],
  // residual: Buena Vista / South Van Ness free-list areaNeed missed (draft affinity only)
  // Outdoor → Hayes green; indoor free-list is Civic SFPL (quiet indoor was area-miss on SFPL)
  buenavista: ['buena vista', 'haight', 'hayes', 'panhandle', 'castro', 'civic', 'main library'],
  'buena vista': ['buena vista', 'haight', 'hayes', 'panhandle', 'castro', 'civic', 'main library'],
  southvanness: ['south van ness', 'civic', 'mission', 'soma', 'mid market', 'main library'],
  'south van ness': ['south van ness', 'civic', 'mission', 'soma', 'mid market', 'main library'],
  // residual: bare van ness free-list areaNeed missed (draft affinity; same corridor as South Van Ness)
  vanness: ['van ness', 'south van ness', 'civic', 'mission', 'soma', 'mid market', 'main library', 'hayes'],
  'van ness': ['van ness', 'south van ness', 'civic', 'mission', 'soma', 'mid market', 'main library', 'hayes'],
  // residual: west-side hoods missing free-list area affinity (draft only)
  // residual: sea cliff indoor free-list is Civic SFPL (outdoor stays Crissy/Marina)
  // residual: sea cliff dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  seacliff: ['seacliff', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: parkside indoor free-list is Civic SFPL; dinner → Mission/SoMa kitchen (draft only)
  parkside: ['parkside', 'sunset', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: ocean beach indoor free-list is Civic SFPL; dinner → Mission/SoMa kitchen (draft only)
  'ocean beach': ['ocean beach', 'sunset', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  oceanbeach: ['ocean beach', 'sunset', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: Sunset District → west free-list (Crissy/Marina), not golden-hour alone
  // residual: Sunset indoor free-list is Civic SFPL; dinner → Mission/SoMa kitchen (draft only)
  sunset: ['sunset', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: marina indoor free-list is Civic SFPL; dinner free-list is Mission/SoMa kitchen
  marina: ['marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: bare presidio indoor free-list is Civic SFPL; dinner → Mission/SoMa kitchen
  presidio: ['presidio', 'marina', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: crissy indoor free-list is Civic SFPL; dinner → Mission/SoMa kitchen (draft only)
  crissy: ['crissy', 'marina', 'presidio', 'civic', 'main library', 'mission', 'soma'],
  dolores: ['dolores', 'mission', 'bernal'],
  bernal: ['bernal', 'mission', 'dolores'],
  noe: ['noe', 'mission', 'castro', 'dolores'],
  'noe valley': ['noe', 'mission', 'castro', 'dolores'],
  // residual: tenderloin outdoor free-list areaNeed missed Hayes/SoMa (draft affinity only)
  tenderloin: ['tenderloin', 'civic', 'main library', 'market', 'hayes', 'soma'],
  'glen park': ['glen park', 'mission', 'bernal'],
  // residual: Glen Canyon Park free-list areaNeed missed Glen Park/Mission outdoor (draft affinity only)
  glencanyon: ['glen canyon', 'glen park', 'mission', 'bernal', 'dolores', 'diamond heights'],
  'glen canyon': ['glen canyon', 'glen park', 'mission', 'bernal', 'dolores', 'diamond heights'],
  // residual: civic center outdoor free-list areaNeed missed Hayes/SoMa (draft affinity only)
  civic: ['civic', 'main library', 'market', 'tenderloin', 'hayes', 'soma', 'yerba'],
  // residual: North Beach indoor free-list is Civic SFPL (no NB free indoor card)
  // residual: north beach dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  'north beach': ['north beach', 'embarcadero', 'chinatown', 'civic', 'main library', 'mission', 'soma'],
  // residual: chinatown outdoor emb/ferry; indoor free-list is Civic SFPL
  // residual: chinatown dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  chinatown: ['chinatown', 'north beach', 'union square', 'embarcadero', 'ferry', 'civic', 'main library', 'mission', 'soma'],
  // residual: union square dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  'union square': ['union square', 'chinatown', 'civic', 'embarcadero', 'ferry', 'mission', 'soma'],
  // residual: Japantown/Fillmore outdoor→Hayes; indoor free-list is Civic SFPL
  // residual: japantown dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  japantown: ['japantown', 'hayes', 'fillmore', 'haight', 'civic', 'main library', 'mission', 'soma'],
  // residual: little tokyo (Japantown colloquial) free-list areaNeed missed (draft only)
  littletokyo: ['japantown', 'hayes', 'fillmore', 'haight', 'civic', 'main library', 'mission', 'soma'],
  'little tokyo': ['japantown', 'hayes', 'fillmore', 'haight', 'civic', 'main library', 'mission', 'soma'],
  // residual: stanyan (Haight/GGP edge) free-list areaNeed missed (draft affinity only)
  stanyan: ['stanyan', 'haight', 'panhandle', 'cole valley', 'golden gate park', 'hayes', 'dolores'],
  // residual: fillmore dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  fillmore: ['fillmore', 'hayes', 'haight', 'japantown', 'civic', 'main library', 'mission', 'soma'],
  // residual: alamo square indoor free-list is Civic SFPL
  // residual: alamo dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  alamo: ['alamo square', 'hayes', 'haight', 'fillmore', 'civic', 'main library', 'mission', 'soma'],
  'alamo square': ['alamo square', 'hayes', 'haight', 'fillmore', 'civic', 'main library', 'mission', 'soma'],
  // residual: Pac Heights / Russian Hill / Cow Hollow → Marina/Crissy free-list (not SoMa default)
  // Indoor quiet free-list is Civic SFPL; dinner free-list is Mission/SoMa kitchen (SFPL no-food)
  pacificheights: ['pacific heights', 'marina', 'presidio', 'crissy', 'fillmore', 'civic', 'main library', 'mission', 'soma'],
  'pacific heights': ['pacific heights', 'marina', 'presidio', 'crissy', 'fillmore', 'civic', 'main library', 'mission', 'soma'],
  russianhill: ['russian hill', 'marina', 'north beach', 'embarcadero', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  'russian hill': ['russian hill', 'marina', 'north beach', 'embarcadero', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // Indoor quiet free-list is Civic SFPL; dinner free-list is Mission/SoMa kitchen (draft only)
  cowhollow: ['cow hollow', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  'cow hollow': ['cow hollow', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: SF_OK hoods that free-list areaNeed missed (draft affinity only)
  // residual: bayview outdoor free-list areaNeed missed SoMa parklets (draft affinity only)
  bayview: ['bayview', 'dogpatch', 'potrero', 'mission', 'soma', 'yerba'],
  // residual: jackson square dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  'jackson square': ['jackson square', 'embarcadero', 'ferry', 'fidi', 'financial', 'civic', 'main library', 'soma', 'mission'],
  'twin peaks': ['twin peaks', 'castro', 'mission', 'dolores'],
  // residual: treasure island dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  'treasure island': ['treasure island', 'embarcadero', 'ferry', 'marina', 'civic', 'main library', 'mission', 'soma'],
  // residual: nob hill / cole valley in SF_OK but free-list areaNeed missed
  // residual: nob hill dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  nobhill: ['nob hill', 'russian hill', 'north beach', 'embarcadero', 'civic', 'mission', 'soma'],
  'nob hill': ['nob hill', 'russian hill', 'north beach', 'embarcadero', 'civic', 'mission', 'soma'],
  // Indoor free-list is Civic SFPL (haight/hayes already map civic; cole/ashbury were area-miss)
  colevalley: ['cole valley', 'haight', 'hayes', 'civic', 'main library'],
  'cole valley': ['cole valley', 'haight', 'hayes', 'civic', 'main library'],
  // residual: west portal / excelsior / ingleside in SF_OK but free-list areaNeed missed
  westportal: ['west portal', 'sunset', 'twin peaks', 'castro', 'mission', 'dolores'],
  'west portal': ['west portal', 'sunset', 'twin peaks', 'castro', 'mission', 'dolores'],
  excelsior: ['excelsior', 'mission', 'bernal', 'glen park'],
  ingleside: ['ingleside', 'mission', 'sunset', 'bernal'],
  // residual: fort mason / hunters point / duboce / fisherman's wharf in SF_OK, free-list missed
  // residual: fort mason dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  fortmason: ['fort mason', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  'fort mason': ['fort mason', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: hunters point indoor free-list area-missed Mission SFPL (dogpatch/bayview have mission)
  hunterspoint: ['hunters point', 'dogpatch', 'potrero', 'bayview', 'mission', 'soma', 'yerba'],
  'hunters point': ['hunters point', 'dogpatch', 'potrero', 'bayview', 'mission', 'soma', 'yerba'],
  duboce: ['duboce', 'castro', 'hayes', 'mission', 'dolores'],
  // residual: fisherman's wharf indoor free-list is Civic SFPL (outdoor emb/ferry)
  // residual: fisherman's wharf dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  fishermanswharf: ['fishermans wharf', 'embarcadero', 'north beach', 'ferry', 'civic', 'main library', 'mission', 'soma'],
  'fishermans wharf': ['fishermans wharf', 'embarcadero', 'north beach', 'ferry', 'civic', 'main library', 'mission', 'soma'],
  // residual: western addition in SF_OK but free-list areaNeed missed (draft affinity only)
  // Indoor free-list is Civic SFPL (no Western Addition free indoor card)
  westernaddition: ['western addition', 'fillmore', 'hayes', 'japantown', 'haight', 'civic', 'main library'],
  'western addition': ['western addition', 'fillmore', 'hayes', 'japantown', 'haight', 'civic', 'main library'],
  // residual: visitacion/rincon/corona/park merced/presidio heights in SF_OK, free-list missed
  visitacion: ['visitacion', 'excelsior', 'mission', 'bernal'],
  // Indoor free-list is Civic SFPL (was area-miss on quiet indoor; outdoor stays SoMa)
  rinconhill: ['rincon hill', 'soma', 'yerba', 'embarcadero', 'civic', 'main library'],
  'rincon hill': ['rincon hill', 'soma', 'yerba', 'embarcadero', 'civic', 'main library'],
  coronaheights: ['corona heights', 'castro', 'mission', 'dolores'],
  'corona heights': ['corona heights', 'castro', 'mission', 'dolores'],
  // Indoor free-list is Civic SFPL (west park-merced cluster had area-miss on quiet indoor)
  // residual: park merced dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  parkmerced: ['park merced', 'sunset', 'ingleside', 'marina', 'civic', 'main library', 'mission', 'soma'],
  'park merced': ['park merced', 'sunset', 'ingleside', 'marina', 'civic', 'main library'],
  // Indoor free-list affinity: Civic SFPL (no west-side free indoor card)
  // residual: Presidio Heights dinner free-list is Mission/SoMa kitchen (SFPL no-food)
  presidioheights: ['presidio heights', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  'presidio heights': ['presidio heights', 'marina', 'presidio', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // residual: yerba buena / south beach / mid-market → SoMa free-list (draft affinity only)
  yerbabuena: ['yerba', 'soma', 'moscone', 'salesforce', 'south park'],
  'yerba buena': ['yerba', 'soma', 'moscone', 'salesforce', 'south park'],
  // residual: South Beach indoor free-list is Civic SFPL (was area-miss on SFPL; outdoor stays SoMa)
  southbeach: ['soma', 'yerba', 'embarcadero', 'south park', 'salesforce', 'civic', 'main library'],
  'south beach': ['soma', 'yerba', 'embarcadero', 'south park', 'salesforce', 'civic', 'main library'],
  midmarket: ['mid market', 'civic', 'tenderloin', 'soma', 'market'],
  'mid market': ['mid market', 'civic', 'tenderloin', 'soma', 'market'],
  // residual: eureka valley / anza vista / lake merced in SF_OK, free-list areaNeed missed
  eurekavalley: ['eureka valley', 'castro', 'mission', 'dolores'],
  anzavista: ['anza vista', 'fillmore', 'hayes', 'japantown', 'haight', 'civic', 'main library'],
  // west free-list is Marina/Presidio/Crissy — parkside/ingleside alone never hit a card
  lakemerced: ['lake merced', 'sunset', 'park merced', 'ingleside', 'parkside', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  // residual: portola / china basin free-list areaNeed missed (draft affinity only)
  // portola valley is NON_SF — capture only portola / portola district
  portola: ['portola', 'excelsior', 'bernal', 'mission', 'glen park'],
  chinabasin: ['china basin', 'mission bay', 'dogpatch', 'soma', 'yerba', 'embarcadero'],
  'china basin': ['china basin', 'mission bay', 'dogpatch', 'soma', 'yerba', 'embarcadero'],
  // residual: SF_OK hoods free-list areaNeed missed (draft affinity only)
  missionrock: ['mission rock', 'china basin', 'mission bay', 'dogpatch', 'soma', 'yerba'],
  // Indoor free-list affinity: Civic SFPL (no North Beach free indoor card)
  // residual: telegraph hill dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  telegraphhill: ['telegraph hill', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library', 'mission', 'soma'],
  // residual: nopa indoor free-list is Civic SFPL (outdoor still Hayes green)
  // residual: nopa dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  nopa: ['nopa', 'fillmore', 'hayes', 'haight', 'civic', 'main library', 'mission', 'soma'],
  // Indoor free-list affinity: Civic SFPL (no Laurel Heights free indoor card)
  laurelheights: ['laurel heights', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  diamondheights: ['diamond heights', 'twin peaks', 'castro', 'mission', 'dolores'],
  // residual: polk gulch dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  polkgulch: ['polk gulch', 'nob hill', 'russian hill', 'civic', 'tenderloin', 'embarcadero', 'north beach', 'mission', 'soma'],
  mercedheights: ['merced heights', 'park merced', 'sunset', 'ingleside', 'marina', 'crissy', 'civic', 'main library'],
  // residual: balboa park / crocker amazon SF free-list areaNeed missed (draft affinity only)
  balboa: ['balboa', 'excelsior', 'ingleside', 'mission', 'glen park', 'bernal'],
  'balboa park': ['balboa', 'excelsior', 'ingleside', 'mission', 'glen park', 'bernal'],
  crockeramazon: ['crocker amazon', 'excelsior', 'mission', 'bernal', 'ingleside'],
  'crocker amazon': ['crocker amazon', 'excelsior', 'mission', 'bernal', 'ingleside'],
  // residual: SF_OK hoods free-list areaNeed missed (draft affinity only)
  littlehollywood: ['little hollywood', 'bayview', 'visitacion', 'excelsior', 'mission'],
  'little hollywood': ['little hollywood', 'bayview', 'visitacion', 'excelsior', 'mission'],
  // Indoor free-list is Civic SFPL (merced manor / stonestown quiet indoor was area-miss)
  mercedmanor: ['merced manor', 'park merced', 'sunset', 'ingleside', 'marina', 'civic', 'main library'],
  'merced manor': ['merced manor', 'park merced', 'sunset', 'ingleside', 'marina', 'civic', 'main library'],
  stonestown: ['stonestown', 'park merced', 'sunset', 'ingleside', 'marina', 'civic', 'main library'],
  oceanview: ['oceanview', 'ingleside', 'sunset', 'excelsior', 'mission'],
  // residual: north waterfront indoor free-list is Civic SFPL (draft affinity only)
  northwaterfront: ['north waterfront', 'embarcadero', 'ferry', 'north beach', 'marina', 'civic', 'main library'],
  'north waterfront': ['north waterfront', 'embarcadero', 'ferry', 'north beach', 'marina', 'civic', 'main library'],
  ashbury: ['ashbury', 'haight', 'hayes', 'cole valley', 'civic', 'main library'],
  // residual: cathedral/forest/upper market SF_OK but free-list areaNeed missed (draft only)
  cathedralhill: ['cathedral hill', 'civic', 'fillmore', 'hayes', 'tenderloin'],
  foresthill: ['forest hill', 'west portal', 'twin peaks', 'castro', 'sunset', 'mission', 'dolores'],
  // residual: midtown terrace free-list areaNeed missed (draft affinity only; twin peaks corridor)
  midtownterrace: ['midtown terrace', 'twin peaks', 'forest hill', 'castro', 'mission', 'dolores'],
  'midtown terrace': ['midtown terrace', 'twin peaks', 'forest hill', 'castro', 'mission', 'dolores'],
  uppermarket: ['upper market', 'castro', 'mission', 'dolores'],
  // residual: golden gate park in SF_OK — free-list areaNeed missed (draft affinity only)
  // residual: GGP indoor free-list is Civic SFPL (outdoor stays west Crissy/Marina)
  goldengatepark: ['golden gate park', 'richmond', 'sunset', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  'golden gate park': ['golden gate park', 'richmond', 'sunset', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  // residual: bare ggp = Golden Gate Park (draft free-list affinity only)
  ggp: ['golden gate park', 'richmond', 'sunset', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  // residual: bare "golden gate" / bridge (not park) — west outdoor free-list (Crissy/Marina)
  goldengate: ['golden gate', 'marina', 'presidio', 'crissy', 'richmond'],
  'golden gate': ['golden gate', 'marina', 'presidio', 'crissy', 'richmond'],
  'golden gate bridge': ['golden gate', 'marina', 'presidio', 'crissy', 'richmond'],
  // residual: lone mountain / panhandle free-list areaNeed missed (draft affinity only)
  // residual: lone mountain / panhandle indoor free-list is Civic SFPL
  lonemountain: ['lone mountain', 'richmond', 'laurel heights', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  'lone mountain': ['lone mountain', 'richmond', 'laurel heights', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  panhandle: ['panhandle', 'haight', 'hayes', 'fillmore', 'cole valley', 'civic', 'main library'],
  // residual: moscone in SF_OK but free-list areaNeed missed (draft affinity only)
  moscone: ['moscone', 'soma', 'yerba', 'salesforce', 'south park', 'south of market'],
  // residual: SF_OK hoods free-list areaNeed missed (draft affinity only)
  miraloma: ['miraloma', 'twin peaks', 'glen park', 'castro', 'mission', 'dolores'],
  // free-list has no bayview/dogpatch cards — affinity must hit mission/soma/etc.
  silverterrace: ['silver terrace', 'bayview', 'visitacion', 'excelsior', 'mission', 'bernal'],
  indiabasin: ['india basin', 'dogpatch', 'bayview', 'china basin', 'mission bay', 'soma', 'yerba', 'embarcadero'],
  clarendon: ['clarendon', 'twin peaks', 'forest hill', 'castro', 'mission', 'dolores'],
  candlestick: ['candlestick', 'bayview', 'visitacion', 'excelsior', 'mission', 'bernal'],
  // residual: McLaren Park free-list areaNeed missed (draft affinity only; SE → Mission outdoor)
  mclaren: ['mclaren', 'excelsior', 'visitacion', 'portola', 'mission', 'bernal'],
  'mclaren park': ['mclaren', 'excelsior', 'visitacion', 'portola', 'mission', 'bernal'],
  mountdavidson: ['mount davidson', 'twin peaks', 'west portal', 'forest hill', 'castro', 'mission', 'dolores'],
  // residual: SF_OK landmarks free-list areaNeed missed (draft affinity only)
  folsom: ['folsom', 'soma', 'yerba', 'moscone', 'salesforce', 'south park'],
  // residual: crissy field indoor free-list is Civic SFPL (same as marina/presidio)
  // residual: crissy field dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  crissyfield: ['crissy', 'marina', 'presidio', 'civic', 'main library', 'mission', 'soma'],
  'crissy field': ['crissy', 'marina', 'presidio', 'civic', 'main library'],
  marketstreet: ['market', 'civic', 'soma', 'mid market', 'tenderloin'],
  'market street': ['market', 'civic', 'soma', 'mid market', 'tenderloin'],
  // residual: coit/washington sq/pier 39/sloat/lombard in SF_OK, free-list areaNeed missed
  // Indoor free-list is Civic SFPL (same pattern as north beach / lombard)
  coittower: ['coit tower', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library'],
  'coit tower': ['coit tower', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library'],
  washingtonsquare: ['washington square', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library'],
  'washington square': ['washington square', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library'],
  pier39: ['pier 39', 'embarcadero', 'ferry', 'north beach', 'civic', 'main library'],
  'pier 39': ['pier 39', 'embarcadero', 'ferry', 'north beach', 'civic', 'main library'],
  // residual: Pier 70 free-list areaNeed missed (draft affinity only; Dogpatch/SoMa outdoor)
  pier70: ['pier 70', 'dogpatch', 'potrero', 'mission bay', 'china basin', 'soma', 'yerba', 'south park'],
  'pier 70': ['pier 70', 'dogpatch', 'potrero', 'mission bay', 'china basin', 'soma', 'yerba', 'south park'],
  // Indoor free-list is Civic SFPL (no Sloat free indoor card)
  sloat: ['sloat', 'sunset', 'west portal', 'ocean beach', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  lombard: ['lombard', 'marina', 'russian hill', 'cow hollow', 'crissy', 'presidio', 'civic', 'main library'],
  'lombard street': ['lombard', 'marina', 'russian hill', 'cow hollow', 'crissy', 'civic', 'main library'],
  // residual: showplace/design district/central waterfront/islais/cayuga/sunnydale free-list areaNeed missed
  showplacesquare: ['showplace', 'dogpatch', 'potrero', 'soma', 'yerba', 'south park'],
  designdistrict: ['design district', 'dogpatch', 'potrero', 'soma', 'yerba'],
  centralwaterfront: ['central waterfront', 'dogpatch', 'china basin', 'mission bay', 'soma', 'yerba', 'embarcadero'],
  islaiscreek: ['islais', 'dogpatch', 'bayview', 'china basin', 'soma', 'yerba'],
  cayuga: ['cayuga', 'excelsior', 'mission', 'bernal', 'visitacion'],
  sunnydale: ['sunnydale', 'visitacion', 'excelsior', 'mission', 'bernal'],
  // residual: ghirardelli/oracle park/chase center/lincoln way in SF_OK, free-list areaNeed missed
  ghirardelli: ['ghirardelli', 'marina', 'north beach', 'embarcadero', 'ferry', 'civic', 'main library'],
  oraclepark: ['oracle park', 'china basin', 'mission bay', 'soma', 'yerba', 'embarcadero'],
  'oracle park': ['oracle park', 'china basin', 'mission bay', 'soma', 'yerba', 'embarcadero'],
  chasecenter: ['chase center', 'mission bay', 'dogpatch', 'china basin', 'soma', 'yerba'],
  'chase center': ['chase center', 'mission bay', 'dogpatch', 'china basin', 'soma', 'yerba'],
  // residual: lincoln way indoor free-list is Civic SFPL (outdoor stays west parks)
  lincolnway: ['lincoln way', 'golden gate park', 'richmond', 'sunset', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  'lincoln way': ['lincoln way', 'golden gate park', 'richmond', 'sunset', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  // residual: lakeside / sunnyside SF_OK but free-list areaNeed missed (draft affinity only)
  // residual: lakeside indoor free-list is Civic SFPL (outdoor stays west)
  lakeside: ['lakeside', 'lake merced', 'park merced', 'sunset', 'ingleside', 'marina', 'crissy', 'civic', 'main library'],
  // residual: lake street (Richmond corridor) free-list areaNeed missed → Crissy/Marina (draft only)
  lakestreet: ['lake street', 'richmond', 'presidio', 'marina', 'crissy', 'seacliff', 'civic', 'main library'],
  'lake street': ['lake street', 'richmond', 'presidio', 'marina', 'crissy', 'seacliff', 'civic', 'main library'],
  sunnyside: ['sunnyside', 'glen park', 'mission', 'twin peaks', 'excelsior', 'bernal'],
  // residual: polk street / jordan park / bare rincon free-list areaNeed missed (draft affinity only)
  // residual: polk street dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
  polkstreet: ['polk street', 'polk gulch', 'nob hill', 'russian hill', 'civic', 'tenderloin', 'embarcadero', 'north beach', 'mission', 'soma'],
  'polk street': ['polk street', 'polk gulch', 'nob hill', 'russian hill', 'civic', 'tenderloin', 'embarcadero', 'north beach', 'mission', 'soma'],
  jordanpark: ['jordan park', 'laurel heights', 'richmond', 'presidio', 'marina', 'crissy', 'civic', 'main library'],
  'jordan park': ['jordan park', 'laurel heights', 'richmond', 'presidio', 'marina', 'crissy', 'civic', 'main library'],
  rincon: ['rincon', 'rincon hill', 'soma', 'yerba', 'embarcadero'],
  // residual: mint plaza / transbay / westwood park free-list areaNeed missed (draft affinity only)
  mintplaza: ['mint plaza', 'civic', 'soma', 'yerba', 'mid market', 'salesforce'],
  transbay: ['transbay', 'soma', 'yerba', 'salesforce', 'south park'],
  // Indoor free-list is Civic SFPL (no westwood free indoor card; was area-miss → Crissy outdoor)
  westwoodpark: ['westwood park', 'west portal', 'ingleside', 'ocean beach', 'sunset', 'marina', 'crissy', 'civic', 'main library'],
  // residual: St. Francis Wood free-list areaNeed missed (draft affinity only; west cluster + Civic indoor)
  stfranciswood: ['st francis wood', 'west portal', 'stonestown', 'lakeside', 'parkside', 'sunset', 'marina', 'crissy', 'civic', 'main library'],
  'st francis wood': ['st francis wood', 'west portal', 'stonestown', 'lakeside', 'parkside', 'sunset', 'marina', 'crissy', 'civic', 'main library'],
  // residual: baker beach / lands end / mount sutro free-list areaNeed missed (draft affinity only)
  bakerbeach: ['baker beach', 'marina', 'presidio', 'crissy', 'richmond', 'seacliff', 'civic', 'main library'],
  'baker beach': ['baker beach', 'marina', 'presidio', 'crissy', 'richmond', 'seacliff', 'civic', 'main library'],
  landsend: ['lands end', 'richmond', 'seacliff', 'marina', 'presidio', 'crissy', 'ocean beach', 'civic', 'main library'],
  'lands end': ['lands end', 'richmond', 'seacliff', 'marina', 'presidio', 'crissy', 'ocean beach', 'civic', 'main library'],
  // residual: mount sutro indoor free-list is Civic SFPL (outdoor stays twin peaks/mission)
  mountsutro: ['mount sutro', 'twin peaks', 'forest hill', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  'mount sutro': ['mount sutro', 'twin peaks', 'forest hill', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  // residual: city hall / un plaza free-list areaNeed missed (draft affinity only; indoor = Civic SFPL)
  // residual: outdoor free-list is Hayes/SoMa (indoor stays Civic SFPL; was area-miss on ferry)
  cityhall: ['city hall', 'civic', 'main library', 'un plaza', 'market', 'tenderloin', 'hayes', 'soma'],
  'city hall': ['city hall', 'civic', 'main library', 'un plaza', 'market', 'tenderloin', 'hayes', 'soma'],
  unplaza: ['un plaza', 'civic', 'main library', 'city hall', 'market', 'tenderloin', 'hayes', 'soma'],
  'un plaza': ['un plaza', 'civic', 'main library', 'city hall', 'market', 'tenderloin', 'hayes', 'soma'],
  // residual: university mound / sherwood forest free-list areaNeed missed (draft affinity only)
  // SE → Mission/Portola outdoor; indoor free-list is Mission SFPL (no SE free indoor card)
  universitymound: ['university mound', 'portola', 'excelsior', 'bernal', 'mission', 'glen park'],
  'university mound': ['university mound', 'portola', 'excelsior', 'bernal', 'mission', 'glen park'],
  // west cluster + Civic SFPL indoor (same pattern as St. Francis Wood)
  sherwoodforest: ['sherwood forest', 'west portal', 'stonestown', 'lakeside', 'parkside', 'sunset', 'marina', 'crissy', 'civic', 'main library'],
  'sherwood forest': ['sherwood forest', 'west portal', 'stonestown', 'lakeside', 'parkside', 'sunset', 'marina', 'crissy', 'civic', 'main library'],
  // residual: divisadero / fort point / china beach free-list areaNeed missed (draft affinity only)
  divisadero: ['divisadero', 'nopa', 'fillmore', 'hayes', 'haight', 'western addition', 'civic', 'main library'],
  fortpoint: ['fort point', 'marina', 'presidio', 'crissy', 'seacliff', 'civic', 'main library'],
  'fort point': ['fort point', 'marina', 'presidio', 'crissy', 'seacliff', 'civic', 'main library'],
  chinabeach: ['china beach', 'seacliff', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  'china beach': ['china beach', 'seacliff', 'richmond', 'marina', 'presidio', 'crissy', 'civic', 'main library'],
  // residual: Parnassus / Lakeshore / Forest Knolls free-list areaNeed missed (draft affinity only)
  // Parnassus → Inner Sunset/Civic indoor; dinner free-list Mission/SoMa kitchen (SFPL no-food)
  parnassus: ['parnassus', 'inner sunset', 'sunset', 'cole valley', 'haight', 'civic', 'main library', 'mission', 'soma'],
  // Lakeshore → Lake Merced west cluster + Civic indoor; dinner → Mission/SoMa kitchen
  lakeshore: ['lakeshore', 'lakeside', 'lake merced', 'park merced', 'stonestown', 'marina', 'crissy', 'civic', 'main library', 'mission', 'soma'],
  // Forest Knolls → Twin Peaks corridor; indoor Civic SFPL; dinner Mission/SoMa kitchen
  forestknolls: ['forest knolls', 'twin peaks', 'forest hill', 'midtown terrace', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  'forest knolls': ['forest knolls', 'twin peaks', 'forest hill', 'midtown terrace', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  // residual: laguna honda / bayshore free-list areaNeed missed (draft affinity only)
  lagunahonda: ['laguna honda', 'forest hill', 'twin peaks', 'inner sunset', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  'laguna honda': ['laguna honda', 'forest hill', 'twin peaks', 'inner sunset', 'castro', 'mission', 'dolores', 'civic', 'main library'],
  bayshore: ['bayshore', 'visitacion', 'bayview', 'excelsior', 'mission', 'bernal', 'soma'],
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
  venue_confirmation: 95, // solid pick still unconfirmed — draft drain only
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
const GAP_KIND_BOOST = {
  venue: 30,
  venue_confirmation: 26,
  sponsor: 22,
  volunteer: 18,
  resource: 10,
};

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
export function eventAudienceBrief(event = {}) {
  const audience = clamp(event.audience || '', 240);
  const outcome = clamp(event.outcome || '', 400);
  const missing = [];
  if (!audience) missing.push('audience');
  if (!outcome) missing.push('outcome');
  return { ok: missing.length === 0, audience, outcome, missing };
}

function buildInviteDescription(args = {}, ae = {}, seats = 0) {
  const brief = eventAudienceBrief({
    audience: args.audience || ae.audience,
    outcome: args.outcome || ae.outcome,
  });
  const outcome = brief.outcome;
  const agenda = clamp(args.agenda || ae.agenda || '', 800);
  let description = clamp(args.description || '', 1800);
  if (!description) {
    const bits = [];
    if (brief.audience) bits.push('For: ' + brief.audience);
    if (outcome) bits.push(outcome);
    if (agenda) bits.push('Agenda:\n' + agenda);
    if (seats) bits.push('Target seats: ~' + seats + ' (RSVP counts stay empty until real yeses).');
    bits.push('San Francisco in-person only. Mutual yes before any intros.');
    description = bits.join('\n\n');
  } else if (brief.audience && !description.includes(brief.audience)) {
    description = 'For: ' + brief.audience + '\n\n' + description;
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
  const seats = seatsOrNull(args.seats == null || args.seats === '' ? ae.seats : args.seats);
  if (Number.isNaN(seats)) return { ok: false, error: 'seats_must_be_positive_integer' };
  const guestFrame = eventAudienceBrief({
    audience: args.audience || ae.audience,
    outcome: args.outcome || ae.outcome,
  }).audience || 'Founders + eng / warm SF network';
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
    'Guest frame: ' + guestFrame + ' — mutual yes before intros',
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
    guestFrame: guestFrame + ' — mutual yes before intros',
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
  const seats = seatsOrNull(args.seats == null || args.seats === '' ? ae.seats : args.seats);
  if (Number.isNaN(seats)) return { ok: false, error: 'seats_must_be_positive_integer' };
  const guestFrame = eventAudienceBrief({
    audience: args.audience || ae.audience,
    outcome: args.outcome || ae.outcome,
  }).audience || 'Founders + eng / warm SF network';
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
    '1. Open https://lu.ma → New event',
    '2. Paste Title + Description; location San Francisco',
    '3. Set start time America/Los_Angeles; leave guest counts empty until real',
    '4. After Luma shows a real https URL, paste it on the Invite URL line below (do not invent)',
    '5. Share via outreach queue drafts only (no auto-send)',
    '',
    '--- After publish (real lu.ma / luma.com URL only; leave blank until then) ---',
    'Invite URL: ',
    '',
    'Guest frame: ' + guestFrame + ' — mutual yes before intros',
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

/** True for real invite URLs (Partiful, Luma, or native Demigod event page) — never invent; fail-closed. */
export function isRealInviteUrl(url, platform) {
  const raw = String(url || '').trim();
  const u = raw.toLowerCase();
  if (!/^https:\/\/[^\s]+$/i.test(raw)) return false;
  if (/example\.com|localhost|127\.0\.0\.1|placeholder|todo|tbd|fake/i.test(u)) return false;
  const p = String(platform || '').toLowerCase();
  // Native Demigod invite: https://www.trydemigod.com/?p=event&id=ev_…
  if (p === 'demigod' || p === 'native' || !p) {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host === 'trydemigod.com') {
        const page = (parsed.searchParams.get('p') || parsed.searchParams.get('page') || '').toLowerCase();
        const id = String(parsed.searchParams.get('id') || '').trim();
        if (page === 'event' && /^[a-z0-9][a-z0-9_-]{2,80}$/i.test(id)) return true;
      }
    } catch {
      /* fall through */
    }
  }
  if (p === 'partiful' || !p) {
    if (/^https:\/\/(www\.)?partiful\.com\/.+/i.test(u)) return true;
  }
  if (p === 'luma' || !p) {
    if (/^https:\/\/(www\.)?(lu\.ma|luma\.com)\/.+/i.test(u)) return true;
  }
  return false;
}

function isNativeInviteForEvent(url, eventId) {
  if (!isRealInviteUrl(url, 'demigod')) return false;
  try {
    return new URL(url).searchParams.get('id') === String(eventId || '').trim();
  } catch {
    return false;
  }
}

/** Canonical public invite URL for a Demigod-native event page. */
export function nativeEventInviteUrl(eventId, publicBase) {
  const id = String(eventId || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/i.test(id)) return null;
  const base = String(publicBase || process.env.DEMIGOD_PUBLIC_BASE || 'https://www.trydemigod.com')
    .trim()
    .replace(/\/$/, '');
  return `${base}/?p=event&id=${encodeURIComponent(id)}`;
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
    if (!idea.audience && (args.audience || ae.audience)) {
      idea.audience = clamp(args.audience || ae.audience, 240);
    }
  } else {
    idea = {
      id: uid('idea_'),
      title: nextTitle,
      format: clamp(args.format || 'follow-on salon', 80),
      audience: clamp(
        args.audience || ae.audience || 'SF people aligned with the last event outcome',
        240,
      ),
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
    capArchive(store.ideas, 200, 'ideas');
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
  if (platform !== 'partiful' && platform !== 'luma' && platform !== 'demigod' && platform !== 'native') {
    return { ok: false, error: 'platform_must_be_partiful_luma_or_demigod' };
  }
  const plat = platform === 'native' ? 'demigod' : platform;
  const url = clamp(cleanInviteUrlCandidate(args.url || args.inviteUrl || ''), 400);
  if (!isRealInviteUrl(url, plat)) {
    return {
      ok: false,
      error: 'real_url_required',
      message:
        plat === 'partiful'
          ? 'Need real https://partiful.com/… URL (never invent).'
          : plat === 'luma'
            ? 'Need real https://lu.ma/… or https://luma.com/… URL (never invent).'
            : 'Need real https://www.trydemigod.com/?p=event&id=… URL (never invent).',
    };
  }
  if (plat === 'demigod' && !isNativeInviteForEvent(url, store.activeEvent?.id)) {
    return { ok: false, error: 'invite_event_mismatch' };
  }
  // Reject RSVP claims before touching the store.
  if (args.rsvpCount != null || args.confirmed != null || args.attended != null) {
    return {
      ok: false,
      error: 'no_fake_rsvps',
      message: 'Record URL only — RSVP counts stay empty until real tally evidence.',
    };
  }
  const requiredStage = plat === 'demigod' ? 'rsvp' : 'plan';
  if (STAGES.indexOf(normalizeStage(store.activeEvent?.stage)) < STAGES.indexOf(requiredStage)) {
    return { ok: false, error: requiredStage + '_stage_required' };
  }
  store.platforms = store.platforms || { luma: [], partiful: [], demigod: [] };
  const list = (store.platforms[plat] = store.platforms[plat] || []);
  const id = clamp(args.id || args.draftId || '', 80);
  const title = clamp(args.title || '', 120);
  let row = null;
  if (id) row = list.find((x) => x && x.id === id) || null;
  // Explicit id must exist, except native open may mint id dg_<activeEvent.id> once.
  // Partiful/Luma always fail-closed when an explicit id is missing from the list.
  if (id && !row) {
    const nativeMint =
      plat === 'demigod' && store.activeEvent?.id && id === 'dg_' + store.activeEvent.id;
    if (!nativeMint) return { ok: false, error: 'draft_not_found' };
  }
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
  const activeEventId = String(store.activeEvent?.id || '').trim();
  if (row?.eventId && activeEventId && String(row.eventId) !== activeEventId) {
    return {
      ok: false,
      error: 'draft_event_mismatch',
      message: 'Invite draft belongs to another event; choose the current event draft.',
    };
  }
  if (!row) {
    // Create minimal published record — still requires real URL (no invent)
    row = {
      id: id || uid(plat === 'luma' ? 'luma_' : plat === 'demigod' ? 'dg_' : 'pf_'),
      title: title || store.activeEvent?.title || 'SF night',
      status: 'draft',
      platform: plat,
      city: 'San Francisco',
      at: new Date().toISOString(),
    };
    list.push(row);
  }
  const at = new Date().toISOString();
  row.inviteUrl = url;
  row.publishedUrl = url;
  row.status = 'published_url'; // real URL recorded — not a claim of RSVPs
  row.platform = plat;
  row.urlRecordedAt = at;
  row.updatedAt = at;
  if (store.activeEvent?.id) row.eventId = store.activeEvent.id;
  const evidenceNote = 'Real invite URL recorded; RSVP counts still empty until evidence.';
  row.note = [...new Set([...String(row.note || '').split(' · ').filter(Boolean), evidenceNote])].join(' · ');
  // Refresh outbox so humans see the URL next to the paste package (external only)
  if (plat === 'partiful' || plat === 'luma') {
    try {
      const files = writeInviteExport(plat, {
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
  }
  return { ok: true, platform: plat, draft: row, inviteUrl: url };
}

/**
 * Open native Demigod RSVPs for the active event: stamps published invite URL on-site.
 * Does not invent guest names/counts — only publishes the invite surface.
 */
export function openNativeRsvps(store, args = {}) {
  const ae = store.activeEvent;
  if (!ae?.id) return { ok: false, error: 'no_active_event' };
  if (normalizeStage(ae.stage) !== 'rsvp') return { ok: false, error: 'rsvp_stage_required' };
  const venueGate = canAdvanceStage('resource', 'plan', ae, store);
  if (!venueGate.ok) return { ok: false, error: venueGate.reason };
  if (args.rsvpCount != null || args.confirmed != null || args.attended != null) {
    return { ok: false, error: 'no_fake_rsvps', message: 'Open RSVPs only — no invented tallies.' };
  }
  const url = nativeEventInviteUrl(ae.id, args.publicBase);
  if (!url || !isRealInviteUrl(url, 'demigod')) {
    return { ok: false, error: 'bad_public_base', message: 'Need valid DEMIGOD_PUBLIC_BASE / trydemigod.com URL.' };
  }
  const rec = recordInviteUrl(store, {
    platform: 'demigod',
    id: 'dg_' + ae.id,
    title: ae.title,
    url,
  });
  if (!rec.ok) return rec;
  if (rec.draft) rec.draft.eventId = ae.id;
  const at = new Date().toISOString();
  ae.published_url = url;
  ae.publishedUrl = url;
  ae.inviteUrl = url;
  ae.inviteDraft = defaultInviteDraft(ae);
  ae.rsvpTally = ae.rsvpTally || {};
  if (!ae.rsvpTally.openedAt) ae.rsvpTally.openedAt = at;
  ae.rsvpTally.source = 'demigod_native';
  ae.rsvpTally.channel = 'Demigod native RSVP';
  // Honest checklist: opening the form completes rsvp_tally only; reminders stay open.
  ae.checklist = stageChecklist('rsvp', ae).map((item) => ({
    ...item,
    done: item.id === 'rsvp_tally' && Boolean(ae.rsvpTally?.openedAt),
  }));
  delete ae.dayOfChecklist;
  delete ae.hostFrame;
  const mirror = (store.events || []).find((event) => event?.id === ae.id);
  if (mirror) {
    delete mirror.dayOfChecklist;
    delete mirror.hostFrame;
  }
  ae.updatedAt = at;
  store.rsvps = Array.isArray(store.rsvps) ? store.rsvps : [];
  syncActiveEventToList(store);
  return {
    ok: true,
    eventId: ae.id,
    inviteUrl: url,
    draft: rec.draft,
    note: 'Native Demigod RSVP page open. Share inviteUrl. No RSVP counts until real submissions.',
  };
}

/**
 * Public RSVP submit — real name+email only; dedupe by eventId+email; never invent bulk counts.
 */
export function submitNativeRsvp(store, args = {}) {
  const eventId = clamp(args.eventId || args.id || '', 80);
  const name = clamp(args.name || '', 80);
  const email = clamp(String(args.email || '').toLowerCase(), 120);
  const note = clamp(args.note || args.message || '', 400);
  if (!eventId || !name || !email) {
    return { ok: false, error: 'eventId_name_email_required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'bad_email' };
  }
  if (args.rsvpCount != null || args.confirmed != null || args.attended != null) {
    return { ok: false, error: 'no_fake_rsvps' };
  }
  const ae =
    store.activeEvent?.id === eventId
      ? store.activeEvent
      : (store.events || []).find((e) => e && e.id === eventId) || null;
  if (!ae) return { ok: false, error: 'event_not_found' };
  if (!nativeRsvpIsOpen(ae, store)) return { ok: false, error: 'rsvp_not_open' };
  store.rsvps = Array.isArray(store.rsvps) ? store.rsvps : [];
  const existing = store.rsvps.find(
    (r) => r && r.eventId === eventId && String(r.email || '').toLowerCase() === email,
  );
  const at = new Date().toISOString();
  if (existing) {
    existing.name = name;
    existing.note = note || existing.note || '';
    existing.updatedAt = at;
    return { ok: true, updated: true, rsvp: { id: existing.id, eventId, name, at: existing.at } };
  }
  const row = {
    id: uid('rsvp_'),
    eventId,
    name,
    email,
    note,
    status: 'yes',
    at,
    source: 'demigod_native',
  };
  store.rsvps.push(row);
  // Cap growth — keep newest 2000
  if (store.rsvps.length > 2000) store.rsvps = store.rsvps.slice(-2000);
  ae.rsvpTally = ae.rsvpTally || {};
  const yes = store.rsvps.filter((r) => r && r.eventId === eventId && r.status === 'yes').length;
  ae.rsvpTally.yes = yes;
  ae.rsvpTally.count = yes;
  ae.rsvpTally.updatedAt = at;
  // mirror on events[] if present
  const ev = (store.events || []).find((e) => e && e.id === eventId);
  if (ev && ev !== ae) {
    ev.rsvpTally = { ...(ev.rsvpTally || {}), yes, count: yes, updatedAt: at };
  }
  return { ok: true, created: true, rsvp: { id: row.id, eventId, name, at } };
}

/** Public-safe event payload (no guest emails). */
export function publicEventView(store, eventId) {
  const id = String(eventId || '').trim();
  const ae =
    store.activeEvent?.id === id
      ? store.activeEvent
      : (store.events || []).find((e) => e && e.id === id) || null;
  if (!ae) return { ok: false, error: 'event_not_found' };
  const rsvps = (store.rsvps || []).filter((r) => r && r.eventId === id && r.status === 'yes');
  const inviteUrl = ae.published_url || ae.publishedUrl || ae.inviteUrl || null;
  const rsvpOpen = nativeRsvpIsOpen(ae, store);
  const publicDetails = STAGES.indexOf(normalizeStage(ae.stage)) >= STAGES.indexOf('rsvp');
  return {
    ok: true,
    event: {
      id: ae.id,
      title: publicDetails ? ae.title || '' : '',
      audience: publicDetails ? ae.audience || '' : null,
      outcome: publicDetails ? ae.outcome || '' : '',
      seats: publicDetails ? ae.seats || null : null,
      city: ae.city || 'San Francisco',
      stage: ae.stage || 'ideate',
      venue:
        publicDetails && ae.venue?.confirmed === true
          ? { name: ae.venue?.name || ae.venue?.title || '', area: ae.venue?.area || '' }
          : null,
      dateWindows: publicDetails ? ae.dateWindows || null : null,
      inviteUrl:
        publicDetails && isNativeInviteForEvent(inviteUrl, ae.id) ? inviteUrl : null,
      rsvpOpen,
      rsvpYes: publicDetails ? rsvps.length : 0,
    },
  };
}

/** Public RSVP intake is open only during the RSVP lifecycle stage with real invite evidence. */
export function nativeRsvpIsOpen(ae = {}, store = {}) {
  if (normalizeStage(ae.stage) !== 'rsvp' || !ae.id) return false;
  const id = String(ae.id);
  const matchesEvent = (value) => isNativeInviteForEvent(value, id);
  if ([ae.published_url, ae.publishedUrl, ae.inviteUrl].some(matchesEvent)) return true;
  return (store?.platforms?.demigod || []).some(
    (row) =>
      row?.status === 'published_url' &&
      (row.eventId === id || row.id === 'dg_' + id) &&
      matchesEvent(row.inviteUrl || row.publishedUrl),
  );
}

/** Ops list of RSVPs (emails) — host only. */
export function listNativeRsvps(store, eventId) {
  const id = String(eventId || store.activeEvent?.id || '').trim();
  if (!id) return { ok: false, error: 'eventId_required' };
  if (store.activeEvent?.id !== id && !(store.events || []).some((event) => event?.id === id)) {
    return { ok: false, error: 'event_not_found' };
  }
  const rows = (store.rsvps || [])
    .filter((r) => r && r.eventId === id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      note: r.note || '',
      status: r.status || 'yes',
      at: r.at,
    }));
  return { ok: true, eventId: id, count: rows.length, rsvps: rows };
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

/** Public calendar shows only RSVP-ready events and honest later history. */
export function isPublicCalendarVisible(ev) {
  if (!ev || typeof ev !== 'object') return false;
  if (isJunkCalendarTitle(ev.title)) return false;
  const date = String(ev.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return STAGES.indexOf(normalizeStage(ev.stage)) >= STAGES.indexOf('rsvp');
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
  const active = store?.activeEvent || {};
  const nativePublished = hasPublishedInviteUrl(active, {
    platforms: { demigod: platforms.demigod || [] },
  });
  const rows = [];
  let skippedSelftest = 0;
  let skippedOtherEvents = 0;
  for (const platform of ['partiful', 'luma']) {
    for (const d of platforms[platform] || []) {
      if (!d || typeof d !== 'object') continue;
      if (isSelftestInviteDraft(d)) {
        skippedSelftest++;
        continue;
      }
      if (store?.activeEvent === null) {
        skippedOtherEvents++;
        continue;
      }
      const activeTitle = String(active.title || '').trim().toLowerCase();
      const draftTitle = String(d.title || '').trim().toLowerCase();
      if (
        active.id &&
        d.eventId !== active.id &&
        (!activeTitle || (draftTitle !== activeTitle && !draftTitle.startsWith(activeTitle + ' (')))
      ) {
        skippedOtherEvents++;
        continue;
      }
      const inviteUrl = d.inviteUrl || d.publishedUrl || null;
      const hasUrl = !!(inviteUrl && isRealInviteUrl(inviteUrl, platform));
      const coveredByNative =
        nativePublished &&
        !!activeTitle &&
        (draftTitle === activeTitle || draftTitle.startsWith(activeTitle + ' ('));
      const needsUrl = !hasUrl && !coveredByNative;
      let outboxTxt = d.exportFiles?.txt || null;
      if (outboxTxt && !fs.existsSync(outboxTxt)) outboxTxt = null;
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
        coveredByNative,
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
  const optional = rows.filter((r) => r.coveredByNative && !r.hasUrl);
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
    eventId: active.id || null,
    total: rows.length,
    needsUrl: need.length,
    hasUrl: ready.length,
    optional: optional.length,
    skippedSelftest,
    skippedOtherEvents,
    need,
    ready,
    optionalRows: optional,
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
      // residual-5/6/7/8 fullwidth/CJK/white-lenticular/arrow/fullwidth-quote/presentation/
      // halfwidth-corner/math/fullwidth-vertical-tilde/wave/katakana wrappers /
      // residual-9 small-form / ※ / fullwidth ＝ /
      // residual-10 white ｠ / math ⟧ / fullwidth ：＊＃ / halfwidth ｡ /
      // residual-11 math ⟫⦄⦘⌉⌋⦌⟭⟯ / inverted ¿¡ / halfwidth ￨ /
      // residual-12 CJK vertical close ︶︸︺︼︾﹀﹂﹄ /
      // residual-13 double-prime 〞〟 / ornament ❞❜ / heavy ❯ / double ⸩ / angle 〉 /
      //   halfwidth ､･ / vertical presentation ︰︱︲︳︴ /
      // residual-14 white square 〛 / light ornate ❳ / quill ⁆ / white paren ⦆ /
      //   white tortoise 〙 / half brackets ⸣⸥⸧ / corner ⌝⌟ /
      // residual-15 medium dingbat ❩❫❭❱❵ / super/sub ⁾₎ / vertical square ﹈)
      const urlM = line.match(
        /https:\/\/[^\s)"'`<>\]|}\\】」』］＞》〉〕〗）“”‘’«»‹›•·‒―／、→←⇒⇐＂＇﹚｣⟩｜～〜・﹜﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹥﹦※＝｠⟧：＊＃｡⟫⦄⦘⌉⌋⦌⟭⟯¿¡￨︶︸︺︼︾﹀﹂﹄〞〟❞❜❯⸩〉､･︰︱︲︳︴〛❳⁆⦆〙⸣⸥⸧⌝⌟❩❫❭❱❵⁾₎﹈－＿＼＋％＠＆＄＾｀†‡°§¶]+/i,
      );
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
 * Residual-6: white lenticular 〖〗 · chat arrows →←⇒⇐ · ideographic comma 、
 *   (」→ stuck when arrow not peeled first; 〗 left sticky on bare pick).
 * Residual-7: fullwidth quotes ＂＇ · presentation-form parens ﹙﹚
 *   (mobile/CJK fullwidth paste; sticky ＂ encodes into pathname /e/x%EF%BC%82).
 * Residual-8: halfwidth CJK corners ｢｣ · math angles ⟨⟩ · fullwidth vertical ｜ ·
 *   fullwidth tilde ～ · wave dash 〜 · katakana middot ・
 *   (JP IME halfwidth paste; docs math brackets; sticky ｜～・ stamp into path).
 * Residual-9: small-form punct ﹛﹜﹝﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹤﹥﹦ · ref mark ※ ·
 *   fullwidth equals ＝
 *   (CJK small-form paste; footnote ※; sticky ＝＝ into path).
 * Residual-10: white parens ｟｠ · math white brackets ⟦⟧ · fullwidth colon ： ·
 *   halfwidth ideographic stop ｡ · fullwidth ＊＃
 *   (JP IME white-paren paste; docs math brackets; sticky ：＊＃｡ into path).
 * Residual-11: math double angle ⟪⟫ · white curly ⦃⦄ · black tortoise ⦗⦘ ·
 *   ceiling/floor ⌈⌉⌊⌋ · medium brackets ⦋⦌ · white/flat ⟬⟭⟮⟯ · inverted ¿¡ ·
 *   leading ｜・￨ (trailing ｜・ already residual-8)
 *   (docs math paste; Spanish inverted; sticky floor/ceil into path).
 * Residual-12: CJK vertical forms ︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄
 *   (vertical-text paste / IME presentation forms; sticky ︶ into path).
 * Residual-13: double-prime quotes 〝〞〟 · ornamental ❝❞❛❜ · heavy angles ❮❯ ·
 *   double parens ⸨⸩ · angle 〈〉 · halfwidth ､･ · vertical presentation ︰︱︲︳︴
 *   (Word/iMessage/Notion ornaments; JP halfwidth; vertical dash paste).
 * Residual-14: white square 〚〛 · light ornate ❲❳ · quill square ⁅⁆ ·
 *   white paren ⦅⦆ · white tortoise 〘〙 · half brackets ⸢⸣⸤⸥ · sideways U ⸦⸧ ·
 *   corner pieces ⌜⌝⌞⌟ (math/Unicode paste; corner-quote IME; white brackets).
 * Residual-15: medium dingbat ornaments ❨❩❪❫❬❭❰❱❴❵ · super/sub parens ⁽⁾₍₎ ·
 *   vertical square presentation ﹇﹈
 *   (Notion/Word dingbat leftover after residual-13 heavy + residual-14 light;
 *    mobile super/sub; vertical form square).
 * Residual-16: fullwidth sticky ASCII －＿＼＋％＠＆＄＾｀ · footnote/prose †‡°§¶
 *   (JP IME fullwidth mode leftover after residual-10 ＊＃／; dagger/section paste;
 *    sticky － encodes into pathname /e/x%EF%BC%8D and still passed isRealInviteUrl).
 * Residual-17: percent-encoded sticky of residual-16 alphabet in path
 *   (－→%EF%BC%8D · ＿→%EF%BC%BF · ＼→%EF%BC%BC · ＋→%EF%BC%8B · ％→%EF%BC%85 ·
 *    ＠→%EF%BC%A0 · ＆→%EF%BC%86 · ＄→%EF%BC%84 · ＾→%EF%BC%BE · ｀→%EF%BD%80 ·
 *    †‡→%E2%80%A0/%A1 · °§¶→%C2%B0/%A7/%B6; copy/IME encodes sticky into path
 *    after residual-16 unicode peel, still passed isRealInviteUrl).
 * Residual-18: percent-encoded sticky of residual-7/8/9/10 alphabet in path
 *   (＂→%EF%BC%82 · ＇→%EF%BC%87 · ＊→%EF%BC%8A · ＃→%EF%BC%83 · ：→%EF%BC%9A ·
 *    ＝→%EF%BC%9D · ｜→%EF%BD%9C · ～→%EF%BD%9E; browser/IME encodes residual-7–10
 *    fullwidth into path after unicode peel, still passed isRealInviteUrl).
 * Residual-19: percent-encoded sticky of residual-11–15 math/dingbat alphabet in path
 *   (⌊→%E2%8C%8A · ⌋→%E2%8C%8B · ⟪⟫→%E2%9F%AA/%AB · ❩→%E2%9D%A9 · ︶→%EF%B8%B6 ·
 *    〞→%E3%80%9E · ❳→%E2%9D%B3 · ⁾→%E2%81%BE · ¿¡→%C2%BF/%A1 · ・→%E3%83%BB;
 *    docs/Word/IME encodes residual-11–15 into path after unicode peel, still
 *    passed isRealInviteUrl).
 * Residual-20: percent-encoded sticky of residual-2/5/6 CJK book + fullwidth + white
 *   lenticular + chat arrows in path
 *   (》→%E3%80%8B · 】→%E3%80%91 · 」→%E3%80%8D · 〗→%E3%80%97 · 〕→%E3%80%95 ·
 *    ］→%EF%BC%BD · ＞→%EF%BC%9E · ）→%EF%BC%89 · →→%E2%86%92 · 、→%E3%80%81;
 *    WeChat/docs/IME encodes residual-2–6 wrappers into path after unicode peel,
 *    still passed isRealInviteUrl).
 * Residual-21: percent-encoded sticky of residual-3/4 smart quotes / guillemets /
 *   en–em dash / primes / low-9 / bullet / figure+horiz bar in path
 *   (“”→%E2%80%9C/%9D · ‘’→%E2%80%98/%99 · «»→%C2%AB/%BB · –—→%E2%80%93/%94 ·
 *    ‹›→%E2%80%B9/%BA · „‟→%E2%80%9E/%9F · ′″→%E2%80%B2/%B3 · •→%E2%80%A2 ·
 *    ‒―→%E2%80%92/%95 · ·→%C2%B7 · soft-hyphen %C2%AD;
 *    Word/iMessage/Slack encode residual-3/4 wrappers into path after unicode peel,
 *    still passed isRealInviteUrl).
 * Residual-22: percent-encoded sticky of residual-4 ASCII braces/pipe/backslash +
 *   residual-9 small-form punct / ref mark ※ left after residual-18/21
 *   ({}→%7B/%7D · |→%7C · \→%5C · ﹜﹞﹥﹦﹐﹗→%EF%B9%9C/%9E/%A5/%A6/%90/%97 ·
 *    ﹛﹝→%EF%B9%9B/%9D · ※→%E2%80%BB; Discord/Slack/Word/IME encode residual-4
 *    ASCII wrappers or residual-9 small-form into path after unicode peel, still
 *    passed isRealInviteUrl).
 * Residual-23: percent-encoded sticky of residual-1 ASCII brackets/parens/quotes/md
 *   + residual-10 halfwidth white/stop + residual-8/13 halfwidth corners/mid +
 *   residual-10 math white brackets / residual-8 math angles left after residual-22
 *   ([]()"'`<>*_~! → %5B/%5D/%28/%29/%22/%27/%60/%3C/%3E/%2A/%5F/%7E/%21 ·
 *    ｟｠｡｢｣､･ → %EF%BD%9F–%A5 · ⟦⟧⟨⟩ → %E2%9F%A6–%A9;
 *    Discord/Slack/Word/IME encode residual-1 ASCII wrappers or residual-10
 *    halfwidth/math into path after unicode peel, still passed isRealInviteUrl).
 * Residual-24: HTML entity wrappers from email/Notion/Slack HTML paste
 *   (&lt; &gt; &quot; &apos; &#39; &#34; &#60; &#62; &#x27; &#x22; &#x3c; &#x3e;)
 *   + percent-encoded residual-1 prose punct left after residual-23
 *   (, . ; : ? # → %2C/%2E/%3B/%3A/%3F/%23 · space/NBSP/ideo %20/%C2%A0/%E3%80%80)
 *   Entity peel runs before residual-1 punct so trailing `;` is not orphaned as `&gt`.
 *   (Gmail/Notion/export paste; encoded list-separator sticky still passed isRealInviteUrl).
 * Residual-25: Word/Gmail named + numeric HTML entities left after residual-24
 *   (&ldquo; &rdquo; &lsquo; &rsquo; &laquo; &raquo; &mdash; &ndash; &hellip; &nbsp; &amp;
 *    &bull; · &#8220;/&#8217;/&#160;/&#8230; · &#x201c;/&#x2014;/&#xa0;/&#x2026;)
 *   Residual-1 punct peels only the trailing `;` and leaves `&mdash` / `&rdquo` sticky in
 *   the path — still passed isRealInviteUrl. Word/Outlook/Gmail HTML paste.
 * Residual-26: Word residual named + double-encoded + percent-encoded entity sticky left
 *   after residual-25
 *   (&bdquo; &sbquo; &lsaquo; &rsaquo; &thinsp; &ensp; &emsp; &shy; &middot; &prime; &Prime;
 *    &#8222;/&#8218;/&#8249;/&#8250;/&#8201;/&#8194;/&#8195;/&#173;/&#8242;/&#8243;
 *    &amp;lt; &amp;quot; &amp;ldquo; &amp;#8220; … — Gmail/export double-escape;
 *    %26mdash%3B %26ldquo%3B %26lt%3B — browser encodes &entity; into path)
 *   Residual-1 peels only `;` / residual-25 peels bare `&amp;` and leaves `lt;` or
 *   sticky `%26mdash` — still passed isRealInviteUrl.
 * Residual-27: incomplete entity (no `;`) + orphan NAME; after double-amp peel
 *   + HTML5 punct entities (&lpar; &rpar; &lsqb; &rsqb; &lcub; &rcub; &ast; &equals;
 *    &percnt; &vert; &circ; &tilde; &frasl; …)
 *   + percent-encoded invisible paste (%E2%80%8B ZWSP / %EF%BB%BF BOM / %E2%80%8E LRM …)
 *   left after residual-26. Residual-1 peels only trailing `;` from incomplete entities
 *   (`&mdash` sticky); `&amp;amp;lt;` peels to orphan `lt;`; browser encodes residual-1
 *   invisibles into path — still passed isRealInviteUrl. Gmail/export/broken paste.
 * Residual-28: more HTML5 punct (&num; &sol; &comma; &period; &excl; &quest; &colon;
 *   &semi; &plus; &minus; &lowbar; &bsol; &NewLine; &Tab;)
 *   + incomplete double-amp (`&amp;lt` / `&amp;mdash` — no final `;`; r27 incomplete only
 *     matches bare `&amp` and requires match to end at path-end, so `&amp;lt` stayed sticky)
 *   + percent-encoded incomplete entity (`%26mdash` no `%3B`) + percent-encoded double-amp
 *     orphan (`%26amp%3Blt%3B` / `%26amp%3Blt`) left after residual-27.
 *   + lead-glued incomplete: Gmail/export often drops the separator so `&amp;lthttps://…`
 *     or `&mdashhttps://…` sticks to the scheme. Prior order peels bare complete `&amp;`
 *     first → sticky `lthttps…`; bare incomplete required non-alnum so glued `https` failed.
 *   Residual-1 peels only `;` from `&num;` → sticky `&num`; r26 peels only complete
 *   `%26NAME%3B` and leaves incomplete `%26mdash` / double `%26amp%3Blt` — still passed
 *   isRealInviteUrl. Gmail/export/broken paste.
 * Residual-29: incomplete triple-amp left after residual-28
 *   (`&amp;amp;lt` / `&amp;amp;mdash` — r28 only matches one `amp;` layer, so
 *     `&amp;amp;lt` stays sticky; complete `&amp;amp;lt;` already peeled via loop)
 *   + lead-glued triple (`&amp;amp;lthttps://…` → sticky `lthttps…` after one complete
 *     `&amp;amp;` peel)
 *   + percent-encoded triple (`%26amp%3Bamp%3Blt` / `%26amp%3Bamp%3Blt%3B` — r28 pct
 *     double only peels one `amp%3B` then residual-1 strips a lone trail `%3B` and
 *     leaves sticky `%26amp%3Bamp%3Blt`)
 *   Still passed isRealInviteUrl. Gmail/export re-escapes already-escaped paste.
 * Residual-30: mixed HTML ↔ percent entity left after residual-29
 *   (`&amp;%26lt;` / `&amp;%26amp%3Blt;` — orphan peels `lt;` and leaves sticky `&amp;%26`
 *     which still passes isRealInviteUrl; half-encode one amp layer in Gmail/export)
 *   + HTML name + pct semicolon (`&amp;amp%3Blt;` / `&amp%3Blt;` — trail incomplete
 *     cannot end at `$` when `%3B…` follows; orphan peels `lt;` → sticky `&amp;amp`)
 *   + pct then HTML (`%26amp%3B&lt;` — pct peels one layer, leaves sticky `&lt;`)
 *   + numeric amp as amp layer (`&#x26;lt;` / `&#38;amp;lt;` — `&#38;`/`&#x26;` not in
 *     prior htmlNum alphabet, so never peeled; sticky still passes isRealInviteUrl)
 *   Still passed isRealInviteUrl. Gmail/export half-encodes one amp layer.
 * Residual-31: literal `;` terminator on mixed HTML↔pct left after residual-30
 *   (`&amp;%26lt;` — r30 only ate `%3B`, so half-encode with HTML `;` after `%26NAME`
 *     peels to sticky `;https…` which still passes isRealInviteUrl)
 *   + pure-pct double layer (`%26amp%3B%26lt;` — pctDbl peels one amp layer then
 *     incomplete peels `%26lt` → sticky `;https…`)
 *   + numeric amp + pct amp (`&#x26;amp%3Blt;` — peels `&#x26;amp` then `%3B` → sticky `lt;`)
 *   + bare lead `;` orphan after cascade (trail `;` already residual-1)
 *   Still passed isRealInviteUrl. Gmail/export half-encode mixes HTML `;` with `%26`.
 * Residual-32: fully percent-encoded `#` in numeric entities left after residual-31
 *   (`%26%23x26%3Blt%3B` / `%26%2338%3Blt%3B` — prior pctEnt expects literal `#` after
 *     `%26` so `#38` form is `%26#38%3B`; browser full-encode turns `#` into `%23` and
 *     leaves sticky `%26%23x26%3Blt` that still passes isRealInviteUrl)
 *   + numeric-amp HTML then pct amp (`&#x26;%26lt;` — r30 num-amp only accepts amp;/amp%3B
 *     layers, not bare `%26NAME`)
 *   + HTML amp then fully-encoded num (`&amp;%26%23x26%3Blt;` — r30 mixed peels `&amp;%26`
 *     only when next is amp%3B/name, not `%23…`)
 *   Still passed isRealInviteUrl. Gmail/export fully percent-encodes &#…; paste.
 */
export function cleanInviteUrlCandidate(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  // Invisible paste junk (iMessage/Slack/WeChat: ZWSP/ZWNJ/ZWJ/WJ/BOM + soft hyphen + LRM/RLM
  // + residual-33: Mongolian vowel sep U+180E + invisible math ops U+2061–2064)
  u = u.replace(/[\u200b\u200c\u200d\u2060-\u2064\ufeff\u00ad\u200e\u200f\u180e]/g, '');
  // residual-33: marker-line capture is [^\s]+ so fullwidth ，．。； glue stays; trail peel
  // cannot eat alnum after punct — cut path at first sticky list/stop (invite URLs never need them)
  u = u.replace(/[，．。；][^?#]*$/, '');
  // Residual-24/25/26/27/28/29/30/31/32: HTML entity wrappers (email/Notion/Slack/Word/Gmail HTML) — before
  // residual-1 punct peel which would otherwise strip only the trailing `;` and leave
  // `&gt` / `&mdash` / `&rdquo` / `lt;` sticky in the path.
  // r24: lt gt quot apos + ASCII quote/angle numerics
  // r25: smart quotes/dashes/nbsp/hellip/amp/bull + matching decimal/hex codepoints
  // r26: low-9/single-guillemet/spacing/prime + double-encoded &amp;NAME; (before bare amp)
  // r27: HTML5 punct entities + incomplete (no ;) + orphan NAME; after double-amp peel
  // r28: more HTML5 punct + incomplete double-amp + pct incomplete/dbl + lead-glued incomplete
  // r29: multi-amp nest `(?:amp;)+` so triple/quad incomplete peels in one unit
  // r30: mixed HTML↔pct entity + numeric amp (&#x26;/&#38;) + HTML name + %3B
  // r31: literal `;` after mixed HTML↔pct name + pure-pct double + num-amp↔pct amp + lead `;`
  // r32: fully pct-encoded # (%23) in numeric entities + num-amp/%26 mixed + &amp;%26%23…
  const htmlNames =
    'lt|gt|quot|apos|nbsp|amp|ldquo|rdquo|lsquo|rsquo|laquo|raquo|mdash|ndash|hellip|bull|' +
    'bdquo|sbquo|lsaquo|rsaquo|thinsp|ensp|emsp|shy|middot|prime|Prime|' +
    'lpar|rpar|lsqb|rsqb|lcub|rcub|ast|equals|percnt|vert|circ|tilde|frasl|' +
    'num|sol|comma|period|excl|quest|colon|semi|plus|minus|lowbar|bsol|NewLine|Tab';
  // residual-34: invisible paste entities (ZWSP/ZWNJ/ZWJ/WJ/BOM/soft-hyphen/MVS) —
  // raw U+200B… already stripped; HTML/decimal/hex forms stuck in path and still
  // passed isRealInviteUrl after residual-1 stripped only trailing `;`.
  const htmlNum =
    '#0*(?:3[49]|6[02]|160|17[134]|18[37]|173|819[45]|820[1-5]|821[1-8]|822[0126]|8230|824[239]|8250|8288|65279)|' +
    '#x0*(?:2[27af]|3[ce]|a[0bBdD]|b[bB7]|00ad|180e|feff|20(?:0[239b-fB-F]|1[3-9a-fA-F]|2[26]|3[9aA]|6[0-4]))';
  // r30: numeric amp (&#38; / &#x26;) — not in prior htmlNum (34/39/60/62 only)
  const htmlNumAmp = '#(?:x0*26|0*38)';
  const htmlNameOrNum = '(?:' + htmlNames + '|' + htmlNum + '|' + htmlNumAmp + ')';
  // r31: entity terminator is either pct %3B or literal ; (Gmail half-encode mixes both)
  const entSemi = '(?:%3B|;)?';
  // (?:amp;)+NAME before bare amp so &amp;lt; / &amp;amp;lt; peel as one unit (not leave lt;)
  const htmlEnt =
    '&(?:(?:amp;)+(?:' +
    htmlNames +
    '|' +
    htmlNum +
    '|' +
    htmlNumAmp +
    ')|' +
    htmlNames +
    '|' +
    htmlNum +
    '|' +
    htmlNumAmp +
    ');';
  // Name end: non-alnum OR glued https?:// (export paste drops separator before scheme)
  const htmlNameEnd = '(?:(?![a-zA-Z0-9])|(?=https?:\\/\\/))';
  // r28/r29: incomplete multi-amp &amp;NAME / &amp;amp;NAME (no final ;) — before complete
  // htmlEnt so lead `&amp;lthttps` / `&amp;amp;lthttps` does not peel bare `&amp;` and leave
  // sticky `lt`. (?!;) keeps complete `&amp;lt;` for htmlEnt. (?:amp;)+ covers triple+.
  const htmlDblIncomplete =
    '&(?:amp;)+' + htmlNameOrNum + '(?!;)' + htmlNameEnd;
  // r27: incomplete &NAME / &#… (no trailing ;) + orphan NAME; left after &amp;NAME peel
  // r28: also peel when glued to https?:// (same htmlNameEnd as double-amp)
  // r30: incomplete numeric amp &#x26 / &#38 (no ;)
  const htmlIncomplete = '&' + htmlNameOrNum + htmlNameEnd;
  const htmlOrphan = htmlNameOrNum + ';';
  // r30: mixed HTML ↔ percent entity as one unit (before orphan peels NAME; and leaves
  // sticky &amp;%26 / &amp;amp). Also HTML name + pct semicolon &amp;amp%3Blt;
  // and numeric-amp layer &#x26;lt; / &#38;amp;lt;.
  // r31: entSemi accepts literal `;` (not only %3B); pure-pct double; num-amp + pct amp.
  // r32: %23-encoded # in numeric entities (%26%23x26%3B = &#x26;); &#x26;%26lt; bare pct amp.
  // Hash-encoded numeric body (no leading # — that is literal %23 in the wire form).
  // residual-34: mirror invisible codepoints in pct-encoded # form
  const pctHashNum =
    '%23(?:x0*(?:26|2[27af]|3[ce]|a[0bBdD]|b[bB7]|00ad|180e|feff|20(?:0[239b-fB-F]|1[3-9a-fA-F]|2[26]|3[9aA]|6[0-4]))|0*(?:38|3[49]|6[02]|160|17[134]|18[37]|173|819[45]|820[1-5]|821[1-8]|822[0126]|8230|824[239]|8250|8288|65279))';
  const htmlPctMixed =
    '(?:' +
    // &amp;%26lt; / &amp;%26amp%3Blt; / &amp;%26lt (HTML amp layers then pct entity)
    // r33: pctHashNum before empty (?:amp%3B)* so &amp;%26%23x26%3Blt; peels fully
    // (empty first left %23… sticky; trail %23 prose peel → x26%3Blt;https…)
    '&(?:amp;)+%26(?:' +
    pctHashNum +
    '(?:%3B)?(?:amp%3B)*|(?:amp%3B)*)' +
    htmlNameOrNum +
    '?' +
    entSemi +
    '|' +
    // %26amp%3B&lt; / %26amp%3B&amp;lt; (pct amp layers then HTML entity)
    '%26(?:amp%3B)+&(?:amp;)*' +
    htmlNameOrNum +
    '?;?' +
    '|' +
    // r31: %26amp%3B%26lt; pure-pct double layer (no HTML & between)
    // r32: %26amp%3B%26%23x26%3Blt; (pct amp layer then fully pct-encoded numeric)
    '%26(?:amp%3B)+%26(?:(?:amp%3B)*|' +
    pctHashNum +
    '(?:%3B)?(?:amp%3B)*)' +
    htmlNameOrNum +
    '?' +
    entSemi +
    '|' +
    // &amp;amp%3Blt; / &amp%3Blt; / &lt%3B (HTML amp/name + pct semicolon [+ name])
    '&(?:amp;)*(?:' +
    htmlNames +
    '|' +
    htmlNum +
    '|' +
    htmlNumAmp +
    '|amp)%3B' +
    htmlNameOrNum +
    '?;?' +
    '|' +
    // &#x26;lt; / &#38;amp;lt; / &#x26;amp%3Blt; (numeric amp as amp layer + optional name)
    // r31: also (?:amp%3B)+ for pct-encoded amp layer after &#x26;
    // r32: &#x26;%26lt; bare %26NAME after numeric amp (not only amp;/amp%3B)
    // r33: &#x26;%26%23x26%3Blt; — pctHashNum before empty (?:amp%3B)* after %26
    '&' +
    htmlNumAmp +
    ';?(?:(?:amp;)+|(?:amp%3B)+|%26(?:' +
    pctHashNum +
    '(?:%3B)?(?:amp%3B)*|(?:amp%3B)*))?' +
    htmlNameOrNum +
    '?' +
    entSemi +
    ')';
  const htmlLead =
    '(?:' +
    htmlPctMixed +
    '|' +
    htmlDblIncomplete +
    '|' +
    htmlEnt +
    '|' +
    htmlOrphan +
    '|' +
    htmlIncomplete +
    ')';
  const htmlTrail =
    '(?:' +
    htmlPctMixed +
    '|' +
    htmlDblIncomplete +
    '|' +
    htmlEnt +
    '|' +
    htmlOrphan +
    '|' +
    htmlIncomplete +
    ')';
  for (let i = 0; i < 4; i++) {
    const n = u.replace(new RegExp('^(?:' + htmlLead + ')+', 'i'), '');
    if (n === u) break;
    u = n;
  }
  for (let i = 0; i < 4; i++) {
    const n = u.replace(new RegExp('(?:' + htmlTrail + ')+(?=[?#]|$)', 'i'), '');
    if (n === u) break;
    u = n;
  }
  // r31: sticky bare `;` left when mixed peel stopped before literal terminator
  u = u.replace(/^;+(?=https?:\/\/)/i, '');
  // Leading wrappers (markdown / angle / quotes / smart / guillemets / parens / CJK /
  // fullwidth / Discord spoiler | / braces / low-9 / primes / single guillemet /
  // fullwidth ［＜ / book·angle·tortoise 《〈〔 / white lenticular 〖 /
  // md * _ ~ / close-guillemet › / chat arrows →←⇒⇐ /
  // residual-7 fullwidth ＂＇ / presentation ﹙ /
  // residual-8 halfwidth ｢ / math ⟨ /
  // residual-9 small-form ﹛﹝﹤ / ※ / fullwidth ＝ / small ﹦ /
  // residual-10 white ｟ / math ⟦ / fullwidth ：＊＃ /
  // residual-11 math ⟪⦃⦗⌈⌊⦋⟬⟮ / inverted ¿¡ / leading ｜・￨ /
  // residual-12 CJK vertical open ︵︷︹︻︽︿﹁﹃ /
  // residual-13 double-prime 〝 / ornament ❝❛ / heavy ❮ / double ⸨ / angle 〈 /
  // residual-14 white square 〚 / light ornate ❲ / quill ⁅ / white paren ⦅ /
  //   white tortoise 〘 / half brackets ⸢⸤ / sideways ⸦ / corner ⌜⌞ /
  // residual-15 medium dingbat ❨❪❬❰❴ / super/sub ⁽₍ / vertical square ﹇ /
  // residual-16 fullwidth sticky －＿＼＋％＠＆＄＾｀ / footnote †‡°§¶)
  // residual-33: fullwidth ｛ (U+FF5B) — ASCII { / small ﹛ / white ⦃ / dingbat ❴ already peeled
  u = u.replace(/^[<\["'`(|{*~_【「『［＜《〈〔〖（“”‘’«»‹›„‟″′→←⇒⇐＂＇﹙｢⟨﹛﹝﹤※＝﹦｟⟦：＊＃⟪⦃⦗⌈⌊⦋⟬⟮¿¡｜・￨︵︷︹︻︽︿﹁﹃〝❝❛❮⸨〈〚❲⁅⦅〘⸢⸤⸦⌜⌞❨❪❬❰❴｛⁽₍﹇－＿＼＋％＠＆＄＾｀†‡°§¶]+/, '');
  // Trailing wrappers + prose punct (incl. ! ? … fullwidth + CJK close + * + smart quotes /
  // dashes / pipe / bullet / middot / figure+horizontal bar / backslash / fullwidth slash /
  // fullwidth ］＞ / book·angle·tortoise 》〉〕 / white lenticular 〗 / md _ ~ /
  // chat arrows →←⇒⇐ / ideographic comma 、 / residual-7 fullwidth ＂＇ / presentation ﹚ /
  // residual-8 halfwidth ｣ / math ⟩ / fullwidth ｜～ / wave 〜 / katakana ・ /
  // residual-9 small-form ﹜﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹥﹦ / ※ / fullwidth ＝ /
  // residual-10 white ｠ / math ⟧ / fullwidth ：＊＃ / halfwidth ｡ /
  // residual-11 math ⟫⦄⦘⌉⌋⦌⟭⟯ / inverted ¿¡ / halfwidth ￨ /
  // residual-12 CJK vertical close ︶︸︺︼︾﹀﹂﹄ /
  // residual-13 double-prime 〞〟 / ornament ❞❜ / heavy ❯ / double ⸩ / angle 〉 /
  //   halfwidth ､･ / vertical presentation ︰︱︲︳︴ /
  // residual-14 white square 〛 / light ornate ❳ / quill ⁆ / white paren ⦆ /
  //   white tortoise 〙 / half brackets ⸣⸥ / sideways ⸧ / corner ⌝⌟ /
  // residual-15 medium dingbat ❩❫❭❱❵ / super/sub ⁾₎ / vertical square ﹈ /
  // residual-16 fullwidth sticky －＿＼＋％＠＆＄＾｀ / footnote †‡°§¶);
  // residual-35: bare trailing < & (entity incomplete left &NAME; peel can leave lone &;
  //   paste angle open stuck at path end; leading class already had <; fullwidth ＆ already r16)
  // loop so `<url>,` and `` `url` `` and `||url||` peel fully. Lone trailing ?/# ok — real
  // query/hash keep content after ?/# so they do not match `$`.
  for (let i = 0; i < 4; i++) {
    const n = u.replace(
      // residual-33: fullwidth ｝ (U+FF5D) — ASCII } / small ﹜ / white ⦄ / dingbat ❵ already peeled
      // residual-35: bare < &
      /[<>&\]"'`.,);:!?…；。！？#*|}\\*_~】」』］＞》〉〕〗）“”‘’«»‹›„‟″′•·，．、–—‒―／→←⇒⇐＂＇﹚｣⟩｜～〜・﹜﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹥﹦※＝｠⟧：＊＃｡⟫⦄⦘⌉⌋⦌⟭⟯¿¡￨︶︸︺︼︾﹀﹂﹄〞〟❞❜❯⸩〉､･︰︱︲︳︴〛❳⁆⦆〙⸣⸥⸧⌝⌟❩❫❭❱❵｝⁾₎﹈－＿＼＋％＠＆＄＾｀†‡°§¶]+$/g,
      '',
    );
    if (n === u) break;
    u = n;
  }
  // Residual-17/18/19/20/21/22/23/24/26/27/28/29: percent-encoded sticky lead/trail on path
  // (UTF-8 of residual-2/5/6 CJK book/fw/lenticular/arrows + residual-3/4 smart
  //  quotes/guillemets/dashes/primes + residual-4 ASCII braces/pipe/backslash +
  //  residual-1 ASCII brackets/parens/quotes/md + residual-7–10 + residual-9
  //  small-form leftover + residual-10 halfwidth/math white + 11–15 math/dingbat + 16
  //  + residual-24 residual-1 prose punct / space left after residual-23
  //  + residual-26 percent-encoded HTML entity sticky %26NAME%3B / %26#…%3B
  //  + residual-27 percent-encoded residual-1 invisibles ZWSP/ZWNJ/ZWJ/WJ/BOM/LRM/RLM
  //  + residual-28 pct incomplete %26NAME (no %3B) + pct double-amp %26amp%3BNAME%3B?
  //  + residual-29 pct multi-amp %26(?:amp%3B)+NAME%3B? for triple+ re-escape
  //  + residual-32 fully pct-encoded # (%26%23x26%3B / %26%2338%3Blt%3B) left after r31).
  // Peel only at start or path-end (before ?/# or $) so real query encodings stay.
  // r16: －＿＼＋％＠＆＄＾｀†‡°§¶ · r7: ＂＇ · r10: ＊＃： · r9: ＝ · r8: ｜～
  // r11: ⌈⌉⌊⌋ ⟪⟫ ⦃⦄ ⦗⦘ ⦋⦌ ⟬⟭⟮⟯ ¿¡ ・￨ · r12: CJK vertical ︵…﹄
  // r13: 〝〞〟 ❝❞❛❜ ❮❯ ⸨⸩ 〈〉 · r14: 〚〛 ❲❳ ⁅⁆ ⦅⦆ · r15: ❨…❵ ⁽⁾₍₎ ﹇﹈
  // r20: 《》【】「」『』〔〕〖〗、。 ［］＜＞（） →←⇒⇐ (r2/5/6 wrappers)
  // r21: “”‘’ «» –— ‹› „‟ ′″ • · ‒― soft-hyphen (r3/4 sticky; fw ，．／ already r17)
  // r22: {} | \ (ASCII %7B/%7D/%7C/%5C) · residual-9 small-form FE50–FE5F/FE61/63–66
  //      (%EF%B9%90–%9F / %A1/%A3–%A6) · ※ %E2%80%BB
  // r23: residual-1 ASCII []()"'`<>*_~! (%5B/%5D/%28/%29/%22/%27/%60/%3C/%3E/%2A/%5F/%7E/%21)
  //      · residual-10/8/13 halfwidth ｟｠｡｢｣､･ (%EF%BD%9F–%A5)
  //      · residual-10/8 math white/angle ⟦⟧⟨⟩ (%E2%9F%A6–%A9; A[A-F] already r19)
  // r24: residual-1 prose punct ,.;:?!# left after r23 (%2C/%2E/%3B/%3A/%3F/%23/%21 already)
  //      · space/NBSP/ideo space (%20/%C2%A0/%E3%80%80; unicode trim covers raw form)
  // r26: %26(?:htmlNames|htmlNum)%3B (encoded &entity; sticky after r25 entity peel)
  // r27: %E2%80%8[B-F] ZWSP/ZWNJ/ZWJ/LRM/RLM · %E2%81%A0 WJ · %EF%BB%BF BOM
  // r28/r29: %26(?:amp%3B)+(?:htmlNames|htmlNum)(?:%3B)? · %26(?:htmlNames|htmlNum)(?!%3B)
  // r32: %26%23x26%3Blt%3B / %26%2338%3B (hash encoded as %23; optional amp layer + name)
  const pctDblEnt =
    '%26(?:amp%3B)+(?:' + htmlNames + '|' + htmlNum + '|' + pctHashNum + ')(?:%3B)?';
  const pctEnt =
    '%26(?:' +
    htmlNames +
    '|' +
    htmlNum +
    '|' +
    pctHashNum +
    ')%3B';
  const pctEntInc =
    '%26(?:' + htmlNames + '|' + htmlNum + '|' + pctHashNum + ')(?!%3B)';
  // r32: fully pct-encoded numeric as amp layer then optional name
  // (%26%23x26%3Blt%3B / %26%23x26%3Bamp%3Blt%3B / %26%2338%3Blt)
  const pctEncHashLayer =
    '%26' +
    pctHashNum +
    '(?:%3B)?(?:(?:amp%3B)+)?' +
    '(?:' +
    htmlNames +
    '|' +
    htmlNum +
    '|' +
    pctHashNum +
    ')?' +
    '(?:%3B)?';
  const pctSticky =
    '(?:' +
    pctEncHashLayer +
    '|' +
    pctDblEnt +
    '|' +
    pctEnt +
    '|' +
    pctEntInc +
    // residual-33: %EF%BD%9B/%9D fullwidth ｛｝ (was 9[CEF] — skipped B/D)
    '|%EF%BC%(?:8[2-9A-F]|9[ACDE]|A0|86|B[B-F])|%EF%BD%(?:80|9[B-F]|A[0-5])|%EF%BF%A8|%EF%BB%BF|%EF%B8%B[5-9A-F]|%EF%B9%(?:8[0-478]|9[0-9A-F]|A[13456])|%E2%9F%A[6-9A-F]|%E2%A6%(?:83|84|85|86|8[BC]|97|98)|%E2%8C%(?:8[89AB]|A[9A])|%E2%9D%(?:9[B-E]|A[8-F]|B[0-5])|%E2%B8%A[89]|%E2%81%(?:85|86|A0|BD|BE)|%E2%82%8[DE]|%E2%80%(?:8[B-F]|9[2-589C-F]|A[012]|B[239AB])|%E2%86%(?:90|92)|%E2%87%(?:90|92)|%E3%83%BB|%E3%80%(?:8[0-9A-F]|9[0-9A-F])|%C2%(?:A0|A1|A7|AB|AD|B[067B]|BF)|%(?:2[01237-9ACE]|3[ABCEF]|5[BCDF]|60|7[BCDE]))';
  u = u.replace(new RegExp('^(?:' + pctSticky + ')+', 'i'), '');
  for (let i = 0; i < 4; i++) {
    const n = u.replace(new RegExp('(?:' + pctSticky + ')+(?=[?#]|$)', 'gi'), '');
    if (n === u) break;
    u = n;
  }
  // r31: pct cascade can leave orphan NAME; or bare `;` before scheme / at path end
  for (let i = 0; i < 2; i++) {
    const n = u
      .replace(new RegExp('^(?:' + htmlOrphan + '|;)+(?=https?:\\/\\/)', 'i'), '')
      .replace(new RegExp('(?:' + htmlOrphan + '|;)+(?=[?#]|$)', 'i'), '');
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
  // (ASCII + CJK + smart open quotes + guillemet/single + brace/pipe/prime + residual-5/6/7/8
  // fullwidth/CJK/md/white-lenticular/arrows/fullwidth-quotes/presentation-parens/
  // halfwidth corners/math open + residual-9 small-form open / ※ / ＝ /
  // residual-10 white ｟ / math ⟦ / fullwidth ：＊＃; fullwidth colon after label ok /
  // residual-11 math ⟪⦃⦗⌈⌊⦋⟬⟮ / inverted ¿¡ / leading ｜・￨ /
  // residual-12 CJK vertical open ︵︷︹︻︽︿﹁﹃ /
  // residual-13 double-prime 〝 / ornament ❝❛ / heavy ❮ / double ⸨ / angle 〈 /
  // residual-14 white square 〚 / light ornate ❲ / quill ⁅ / white paren ⦅ /
  //   white tortoise 〘 / half brackets ⸢⸤ / sideways ⸦ / corner ⌜⌞ /
  // residual-15 medium dingbat ❨❪❬❰❴ / super/sub ⁽₍ / vertical square ﹇ /
  // residual-16 fullwidth sticky －＿＼＋％＠＆＄＾｀ / footnote †‡°§¶ /
  // residual-24 HTML entity openers &lt; &quot; &apos; &#39; &#34; &#60; &#x27; … /
  // residual-25 Word/Gmail named openers &ldquo; &lsquo; &laquo; &nbsp; &#8220; &#x201c; … /
  // residual-26 low-9/single-guillemet/spacing + double-encoded &amp;lt; &amp;ldquo; …).
  const openWrap =
    '(?:&(?:amp;(?:lt|quot|apos|nbsp|ldquo|lsquo|laquo|bdquo|sbquo|lsaquo|#0*(?:3[49]|60|160|171|821[678]|822[02]|8249)|#x0*(?:2[27af]|3c|a0|ab|20(?:1[89acAeE]|22|39)))|(?:lt|quot|apos|nbsp|ldquo|lsquo|laquo|bdquo|sbquo|lsaquo|#0*(?:3[49]|60|160|171|821[678]|822[02]|8249)|#x0*(?:2[27af]|3c|a0|ab|20(?:1[89acAeE]|22|39))));|[<\\["\'`(|{*~_【「『［＜《〈〔〖（“‘«‹›„‟″′→←⇒⇐＂＇﹙｢⟨﹛﹝﹤※＝﹦｟⟦：＊＃⟪⦃⦗⌈⌊⦋⟬⟮¿¡｜・￨︵︷︹︻︽︿﹁﹃〝❝❛❮⸨〈〚❲⁅⦅〘⸢⸤⸦⌜⌞❨❪❬❰❴⁽₍﹇－＿＼＋％＠＆＄＾｀†‡°§¶])*';
  const marked =
    body.match(
      new RegExp(
        '(?:RECORDED\\s+URL|Invite\\s+URL|Published\\s+URL|Live\\s+URL)\\s*[:\\-：]?\\s*' +
          openWrap +
          '(https:\\/\\/[^\\s]+)',
        'i',
      ),
    ) ||
    body.match(
      new RegExp(
        '---\\s*RECORDED URL\\s*---\\s*' + openWrap + '(https:\\/\\/[^\\s]+)',
        'i',
      ),
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
  // Residual-6: white lenticular 〗 · chat arrows →←⇒⇐ · ideographic comma 、
  // Residual-7: fullwidth quotes ＂＇ · presentation close ﹚
  // Residual-8: halfwidth ｣ · math ⟩ · fullwidth ｜～ · wave 〜 · katakana ・
  // Residual-9: small-form close/punct ﹜﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹥﹦ · ※ · fullwidth ＝
  // Residual-10: white ｠ · math ⟧ · fullwidth ：＊＃ · halfwidth ｡
  // Residual-11: math ⟫⦄⦘⌉⌋⦌⟭⟯ · inverted ¿¡ · halfwidth ￨
  // Residual-12: CJK vertical close ︶︸︺︼︾﹀﹂﹄
  // Residual-13: double-prime 〞〟 · ornament ❞❜ · heavy ❯ · double ⸩ · angle 〉 ·
  //   halfwidth ､･ · vertical presentation ︰︱︲︳︴
  // Residual-14: white square 〛 · light ornate ❳ · quill ⁆ · white paren ⦆ ·
  //   white tortoise 〙 · half brackets ⸣⸥ · sideways ⸧ · corner ⌝⌟
  // Residual-15: medium dingbat ❩❫❭❱❵ · super/sub ⁾₎ · vertical square  comb
  // Residual-16: fullwidth sticky －＿＼＋％＠＆＄＾｀ · footnote †‡°§¶
  // residual-33: also stop before fullwidth ，．。 (JP/IME list paste; sticky+alnum failed trail peel)
  const re = /https:\/\/[^\s)"'`<>\]|}\\】」』］＞》〉〕〗）“”‘’«»‹›•·‒―／、，．。→←⇒⇐＂＇﹚｣⟩｜～〜・﹜﹞﹐﹑﹒﹔﹕﹖﹗﹘﹟﹡﹣﹥﹦※＝｠⟧：＊＃｡⟫⦄⦘⌉⌋⦌⟭⟯¿¡￨︶︸︺︼︾﹀﹂﹄〞〟❞❜❯⸩〉､･︰︱︲︳︴〛❳⁆⦆〙⸣⸥⸧⌝⌟❩❫❭❱❵⁾₎﹈－＿＼＋％＠＆＄＾｀†‡°§¶]+/gi;
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
        (report.optional ? ` · optional (native invite live): ${report.optional}` : '') +
        (report.skippedSelftest
          ? ` · skipped selftest: ${report.skippedSelftest}`
          : ''),
      '',
      '## Human URL drop (auto-absorb on drain)',
      ...(report.needsUrl
        ? [
            `- Paste real Partiful/Luma https URLs into \`${drop}\` (one per line).`,
            '- Formats: bare URL · `platform=luma id=… url=https://…` · never invent RSVPs.',
            '- Or paste the live URL into the outbox `.txt` (line: `Invite URL: https://…`) — drain absorbs it.',
          ]
        : ['- (none needed)']),
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
    lines.push('', '## Optional — native invite already live');
    if (!(report.optionalRows || []).length) {
      lines.push('- (none)');
    } else {
      for (const r of report.optionalRows) {
        lines.push(`- **${r.platform}** \`${r.id || '?'}\` — ${r.title || '(no title)'}`);
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
        eventId: report.eventId || null,
        total: report.total ?? 0,
        needsUrl: report.needsUrl ?? 0,
        optional: report.optional ?? 0,
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
  // Fold date windows so "Thu eve"/"Sat aft" hit evening/daytime free-list scoring (draft only).
  const windows = Array.isArray(ae.dateWindows)
    ? ae.dateWindows
        .map((w) =>
          String(w || '')
            .replace(/\beve\b/gi, 'evening')
            .replace(/\baft\b/gi, 'afternoon'),
        )
        .join(' ')
    : '';
  // Tags/area only for free-list alt match — name/notes echo the current pick into
  // keyword score (e.g. "Sponsor-hosted café buyout") and drown free/in-kind alts.
  const venueBits = [
    ae.venue?.area,
    Array.isArray(ae.venue?.tags) ? ae.venue.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ');
  return [ae.notes, ae.needs, ae.audience, ae.outcome, ae.title, ae.format, venueBits, windows, goal]
    .filter(Boolean)
    .join(' ')
    .trim();
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
    needIsOfficeTour(needL) ||
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
  // residual-22: singular "office hour" (was free-ask outdoor; plural already matched)
  return /\b((?:founder|open|drop[- ]?in)\s+)?office\s*hours?\b/.test(needL);
}

/**
 * Office tour / workspace open house → free-list office loan (not parklets).
 * Distinct from founder office hours. Draft match only — residual-3.
 */
function needIsOfficeTour(needL) {
  return /\b(office\s*tour|workspace\s*tour|hq\s*tour|office\s*open\s*house|open\s*house\s*(?:at\s+)?(?:the\s+)?office)\b/.test(
    needL,
  );
}

/** Pitch / demo day / showcase / hackathon / product launch / design sprint → office-style rooms. */
function needIsDemoFormat(needL) {
  // residual-22: hack day / build day (hackathon already; free-ask was outdoor green)
  return /\b(pitch|demo(?:\s+day)?|showcase|hackathon|hack\s*days?|build\s*days?|open\s*floor|product\s*launch|design\s*sprint)\b/.test(
    needL,
  );
}

/**
 * LAN party / esports / gaming tournament → power + tables (office/loan), not park lawns.
 * "LAN party" must not trip outdoor "party" social hangs. Draft match only.
 */
function needIsLanGaming(needL) {
  // residual-22: bare LAN / LAN night (LAN party already; free-ask was outdoor park)
  return /\b(lan(?:\s*(?:party|night|meetup|tournament))?|esports?|gaming\s*(?:tournament|night|meetup)|console\s*night|pc\s*gaming|video\s*game\s*night)\b/.test(
    needL,
  );
}

/**
 * Maker night / build|ship night|day / repair café / hardware / robotics → power + tables (office/loan).
 * Draft match only — not a booking API. "tool library" is lending, not SFPL meeting rooms.
 */
function needIsMakerHardware(needL) {
  return /\b(maker\s*(?:night|meetup|space|session|hang)|makerspace|build\s*night|ship\s*(?:night|day)|make\s*night|repair\s*caf[eé]|tool\s*(?:library|share|lending)|hardware\s*(?:night|meetup|hang|hack)|craft\s*night|robotics\s*(?:workshop|night|meetup)|3d\s*print(?:ing)?)\b/.test(
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
 * Covers crypto/web3 + AI/ML/LLM + language/stack + OSS/security/ops topics +
 * *tech verticals (climate/fin/health/…) + eng verticals (frontend/platform/mlops/…) +
 * product/ops labels (product management, revops, sales eng) + community affinity +
 * residual-6 design/GTM verticals (design systems, figma, product design, growth marketing…) +
 * residual-7 people/ops/sales GTM/community + no-code + a11y + eng roles (was ferry meetup-fit).
 * residual-8: product manager/PM · AE/CSM/EM abbr · sales ops solo · channel sales ·
 * account/support eng roles · interview prep/mock · system design · portfolio review ·
 * technical writing · postmortem/knowledge share (was ferry meetup-fit / park hang).
 * residual-9: staff engineer / SWE · software engineer · DEI/ERG · coding interview
 * (QBR / quarterly business review in needIsTeamOps — was ferry meetup-fit).
 * residual-10: principal/distinguished engineer · people partner / HRBP ·
 * skip-level + onboarding cohort (team-ops) — was ferry meetup-fit / free-ask outdoor.
 * residual-11: director/VP eng · tech/technical lead · eng fellow ·
 * talent/comp/calibration review (team-ops) — was free-ask outdoor / ferry score.
 * residual-12: CTO · head of eng · eng/lead/senior/junior eng · product/design heads ·
 * 1:1 / team sync / daily standup · bar raiser · promo/leveling · perf/PIP (team-ops).
 * residual-13: C-suite (CEO/CPO/CMO/CFO/COO/CRO) · head/VP/director of sales|marketing|…
 * staff/principal/senior PM · product ops · eng manager · hiring manager
 * (was free-ask outdoor; "sales" keyword → Salesforce park).
 * residual-14: CISO/CSO · staff/principal/senior designer · data scientist · ML eng ·
 * platform/infra/devops/security engineer · bare SRE · head/VP/director finance|legal|support ·
 * financial controller · general counsel · research/staff scientist
 * (solo free-ask was outdoor/library free-ask; "financial controller" was false FiDi
 * area via bare \bfinancial\b — only "financial district" is neighborhood).
 * residual-15: CHRO/CGO/CDO/CIO · chief digital/analytics · VP/director/head of ops|operations|
 * analytics|hr|brand · product designer ladder · data engineer · eng/platform/infra ops ·
 * DevEx · people/HR manager · creative director · customer/forward-deployed eng · PMM ·
 * general manager (solo free-ask was outdoor; "ops" VP missing; product designer ≠ product design).
 * residual-16: GTM/CX/enablement · partnerships/BD · workplace/EA · IT/recruiting heads ·
 * sales|marketing|people operations · AI safety · BI/Looker · spark eng · SOC mgr · counsel ·
 * professional services · head of AI/ML · incident/platform mgr · devops/data eng/quant solo
 * (solo free-ask outdoor; spark false outdoor via park substring — word-bound fix).
 * residual-16b: frontend/backend/full-stack engineer · mobile/iOS/Android eng · growth eng ·
 * site reliability engineer · QA/test engineer · analytics engineer · AI/LLM/prompt engineer ·
 * UX writer · content designer · design eng/manager · user/UX researcher · recruiter ·
 * network/build/tools/release eng · SOC analyst · privacy eng · trust & safety · RevOps ·
 * lifecycle marketing · brand manager · IT manager · sysadmin · TLM · FP&A · DevProd ·
 * partner manager · business/product analyst · content ops · data platform
 * (solo free-ask was outdoor/library free-ask only; build/network eng was ferry/embarcadero
 * keyword; SOC analyst was parklet keyword; content design\b missed content designer).
 * residual-17: sales eng (was Salesforce park free-ask via "sales" keyword) · pre-sales/presales ·
 * field eng (was Crissy Field keyword) · partner/implementation/docs/DX eng · systems eng ·
 * database eng/DBA · data/security/enterprise architect · research eng · applied scientist ·
 * cybersecurity · blue team · compliance eng · threat intel · incident response · GRC ·
 * risk analyst/mgr · program/project mgr · scrum master · agile coach · release manager ·
 * enablement eng/mgr · SEO/SEM · paid ads/media · B2B marketing · sourcer · L&D ·
 * finance manager · IT support · service/help desk · systems/network admin ·
 * solutions consulting · angel investor · TAM
 * (solo free-ask was outdoor/library free-ask; field eng → Crissy; sales eng → Salesforce).
 * residual-18: product owner · delivery manager · chaos eng · infrastructure/cloud engineer ·
 * founding eng/designer · bare pre-sales/presales · biz dev (spaced) · data/sec/IT/ml/ai ops ·
 * site/platform reliability (no eng suffix) · customer/support/marketing/growth ops ·
 * visual/interaction/graphic/service/brand/web/motion designer
 * (solo free-ask was outdoor/library free-ask; designer\b missed *designer; infra≠infrastructure).
 * residual-19: appsec/product|cloud|network|endpoint security · SOC eng · SIEM/SOAR · purple team ·
 * threat hunting · identity/auth eng · IAM · zero trust · security ops · vendor/third-party risk ·
 * SOC 2 · fraud/abuse/legal/policy/trust eng · platform/FE/BE architect · reliability/observability ·
 * FinOps · feature flags/experimentation · SLO/error budget · incident commander · on-call ·
 * DR/BCP · data-stack tools solo (dbt/Snowflake/Kafka/…) · FE frameworks · no-code tools ·
 * payments/ads/search/pipeline/ETL eng · embedded/firmware/kernel · CV/NLP · robotics ·
 * quant/trading/core eng · solutions eng · eval/prompt ops/LLMOps · a11y eng · i18n ·
 * internal platform/tools · data warehouse/lake · feature/ML platform · compliance/risk/privacy
 * officer · partner success · success manager · HR ops · recruiting coordinator ·
 * VP/director of platform · security|chaos|reliability game day
 * (solo free-ask was outdoor/library free-ask; network security → Embarcadero keyword;
 * SOC eng → parklet; SOC 2 / third-party risk free-ask outdoor).
 * residual-20: growth/product/ops/sales/support/security/devops/data/analytics/finance/revenue/
 * partner/community/research lead|manager · CS/success lead · bizops · corp dev / M&A ·
 * investor / investor relations / venture partner · technical/staff/principal architect ·
 * ML scientist · principal scientist · applied ML · ML/AI/quant researcher · solutions consultant ·
 * tech evangelist · GitOps / DevSecOps · APM/XDR/EDR/MDR · reverse ETL / data mesh/fabric /
 * lakehouse · total rewards / HRIS · customer education · staff IC / individual contributor ·
 * Y Combinator / YC · alliances / ecosystem · change management / PMO / digital transformation ·
 * ESG / sustainability
 * (solo free-ask was outdoor/library free-ask; sales lead|manager → Salesforce park keyword).
 * residual-21: bare partnerships · head/VP/director partnerships|revenue|community|enablement|
 * CX|GTM|strategy|innovation|comms · portfolio ops · operating partner · venture scout ·
 * fractional/interim C-suite · founder|entrepreneur in residence / EIR · social media lead/mgr ·
 * field marketing (was Crissy Field keyword) · events lead/mgr · brand lead/ops · content lead/mgr ·
 * developer marketing/success · product growth · retention/lifecycle/activation/expansion ·
 * customer insights · market research · research/design ops · ISO 27001/HIPAA/GDPR/PCI ·
 * content moderation · startup/technical advisor · newsletter/editorial/comms lead ·
 * public relations / PR mgr · analyst relations · pricing · competitive/market intel ·
 * corp strategy · R&D · post-sales · value eng · chief architect · enterprise sales
 * (was Salesforce park) · delivery/services lead · APM / AI|technical PM · onboarding/
 * implementation mgr · field CTO/CISO · office of the CTO
 * (solo free-ask was outdoor/library free-ask; field marketing → Crissy; enterprise sales → Salesforce).
 * residual-22: inside sales (was Salesforce park via sales) · field SE (was Crissy Field) ·
 * bare SOC / SOC team · social media (role, not only lead/marketing) · first-time/new manager ·
 * manager training/development · people analytics · org design/development · employee experience ·
 * employer/talent brand · university/campus recruiting · career/executive/leadership coach ·
 * leadership/talent development · internal comms · media relations · deal desk ·
 * account/territory planning · customer marketing · pipeline/forecast review · win/loss ·
 * MBR/WBR · north star metric · hack day / build day
 * (solo free-ask was outdoor; sales→Salesforce; field→Crissy; bare SOC free-ask outdoor).
 * residual-23: chief commercial/customer officer · workforce/succession planning ·
 * unconscious bias · manager circle · culture club · buddy/onboarding buddy ·
 * interview loop · mob programming · code kata · coding dojo · paper reading ·
 * customer advisory board · power/beta users · design partners · company open house ·
 * bare user group (solo free-ask was outdoor/library free-ask; open house → Hayes keyword).
 * residual-24: alumni meetup/network/chapter · meetup organizer/host/lead ·
 * chapter/community/event/conference/summit organizer · limited partner / LP day ·
 * day-of lead · task force · working group · steering committee · sales kickoff / SKO ·
 * center of excellence · community of practice
 * (solo free-ask was outdoor/library free-ask; alumni meetup → ferry meetup-fit;
 * meetup organizer → ferry; LP day free-ask outdoor; sales kickoff → Salesforce park keyword;
 * task force / day-of lead free-ask outdoor).
 * residual-25: unconference / barcamp · advisory board · mastermind / founder|peer circle ·
 * accelerator / incubator / fellowship · founders brunch/breakfast · tech brunch ·
 * fundraising / series A–C / seed stage · cap table · VC · angel syndicate ·
 * office crawl / lab|factory|space|workspace tour · API/SDK topic
 * (solo free-ask was outdoor/library free-ask; API meetup → ferry meetup-fit;
 * fundraising free-ask outdoor; founders brunch free-ask; advisory board ≠ customer-only).
 * residual-25b community: latinx · women/girls/latinx/black/queer in product|design|eng.
 * Bare networking / founders social stays outdoor walk-network. Outdoor picnic still parks.
 * Draft match only — not a booking API.
 */
function needIsTechMeetup(needL) {
  if (/\b(outdoor|picnic|park|lawn)\b/.test(needL)) return false;
  // residual-5: eng verticals (frontend/backend/platform/mlops/…) + product/ops labels
  // residual-6: design systems/figma/product|ux|ui design + growth/content/product marketing
  // + customer success — still getting walk-hang meetup-fit on ferry/plaza
  // residual-7: people/ops · sales GTM roles · brand/seo/email/social-media marketing ·
  // community manager · TPM/solutions · no-code · a11y · data platform/analytics
  // residual-8: product manager(s)/PM · AE/CSM/EM · sales/channel sales · account manager ·
  // support eng · interview prep/mock · system design · portfolio review · tech writing ·
  // knowledge share (postmortem/incident also in needIsTeamOps)
  // residual-9: staff engineer / SWE · software engineer · DEI/ERG · coding interview
  // residual-10: principal/distinguished engineer · people partner / HRBP
  // residual-11: director/VP eng · tech lead · eng fellow
  // residual-12: CTO · head of eng · lead/senior/junior eng · product/design heads
  // residual-13: C-suite · head/VP/director sales|marketing|… · staff/principal PM · product ops
  // residual-14: CISO/CSO · designers · data scientist · ML eng · platform/security eng ·
  // finance/legal/support heads · general counsel · scientists (solo free-ask)
  // residual-15: CHRO/CGO/CDO/CIO · ops/operations/analytics/hr/brand heads · product designer ·
  // data engineer · eng/platform ops · DevEx · people/HR manager · creative director ·
  // customer/forward-deployed eng · PMM · general manager (solo free-ask)
  // residual-16: GTM/CX/enablement · partnerships/BD · workplace · IT/recruiting heads ·
  // sales|marketing|people operations · AI safety · BI tools · spark eng · SOC mgr ·
  // counsel/compliance · professional services · head of AI/ML · incident/platform mgr ·
  // devops/data eng/quant/NOC solo (park word-bound; sales operations Salesforce keyword)
  // residual-16: FE/BE/full-stack eng · mobile/iOS/Android · growth · SRE phrase · QA/test ·
  // analytics/AI/LLM/prompt eng · UX writer · content designer · design eng/mgr · researchers ·
  // recruiter · network/build/tools/release eng · SOC analyst · privacy · trust&safety ·
  // RevOps · lifecycle marketing · brand/IT mgr · sysadmin · TLM · FP&A · DevProd ·
  // partner mgr · biz/product analyst · content ops · data platform (solo free-ask)
  // residual-17: sales eng · pre-sales · field/partner/implementation/docs/DX eng · systems eng ·
  // DBA · architects · research eng · applied scientist · cybersecurity · blue team ·
  // compliance · threat intel · IR · GRC · risk · program/project mgr · scrum/agile ·
  // release/enablement · SEO/SEM · paid ads · B2B · sourcer · L&D · finance mgr · IT support ·
  // service desk · sys/network admin · solutions consulting · angel · TAM (solo free-ask)
  // residual-18: product owner · delivery mgr · chaos eng · infrastructure/cloud eng ·
  // founding eng/designer · bare pre-sales · biz dev · data/sec/IT/ml/ai ops ·
  // site/platform reliability · customer/support/marketing/growth ops ·
  // visual/interaction/graphic/service/brand/web/motion designer (solo free-ask)
  // residual-19: appsec/cloud/network security · SOC eng · SIEM/SOAR · purple team ·
  // threat hunting · identity/auth · IAM · zero trust · vendor/third-party risk · SOC 2 ·
  // fraud/abuse/legal/policy/trust eng · platform/FE/BE architect · reliability/observability ·
  // FinOps · feature flags · SLO · on-call · DR/BCP · data-stack + FE + no-code solo ·
  // payments/ads/search/pipeline eng · embedded/firmware · CV/NLP · robotics · quant ·
  // solutions eng · eval/LLMOps · a11y · i18n · internal platform · warehouse/lake ·
  // compliance/risk/privacy officer · partner success · HR ops · VP/director platform ·
  // security|chaos|reliability game day (solo free-ask)
  // residual-20: domain lead|manager · CS/success lead · bizops · corp dev/M&A · investor ·
  // technical/staff/principal architect · ML scientist · researchers · solutions consultant ·
  // tech evangelist · GitOps/DevSecOps · APM/XDR/EDR/MDR · data mesh/fabric/lakehouse ·
  // total rewards/HRIS · customer education · staff IC · YC · alliances/ecosystem ·
  // change management/PMO · ESG/sustainability (solo free-ask; sales lead → Salesforce park)
  // residual-21: partnerships · head/VP partnerships|revenue|community · portfolio ops ·
  // operating partner · venture scout · fractional/interim C-suite · EIR · social media lead ·
  // field marketing · events lead · brand/content lead · developer marketing · product growth ·
  // retention/lifecycle/activation · insights · market research · researchops · compliance
  // frameworks · content moderation · PR/comms · strategy/innovation · R&D · post-sales ·
  // value eng · chief architect · enterprise sales · delivery lead · APM/AI PM · field CTO
  // residual-22: inside sales · field SE · bare SOC/SOC team · social media role · first-time/
  // new manager · manager training · people analytics · org design · employee experience ·
  // employer brand · campus recruiting · career/exec coach · leadership development ·
  // internal comms · media relations · deal desk · account/territory planning · customer marketing ·
  // pipeline/forecast · win/loss · MBR/WBR · north star · hack/build day (solo free-ask outdoor)
  // residual-23: chief commercial/customer officer · workforce/succession planning ·
  // unconscious bias · manager circle · culture club · buddy/onboarding buddy ·
  // interview loop · mob programming · code kata · coding/code dojo · paper reading ·
  // customer advisory · power/beta users · design partners · company open house · user group
  // residual-24: alumni meetup/network · meetup organizer/host/lead · chapter/community/
  // event/conference/summit organizer · limited partner / LP day · day-of lead ·
  // task force · working group · steering committee · sales kickoff / SKO ·
  // center of excellence · community of practice
  // residual-25: unconference/barcamp · advisory board · mastermind · founder/peer circle ·
  // accelerator/incubator/fellowship · founders brunch · tech brunch · fundraising ·
  // series A–C · seed · cap table · VC · office crawl · lab/space tour · API/SDK
  // (solo free-ask was outdoor/library free-ask; alumni meetup → ferry meetup-fit)
  const techTopic =
    /\b(crypto|web3|blockchain|defi|nft|bitcoin|ethereum|ai|a\.i\.|ml|mlops|ml\s*ops|machine\s*learning|deep\s*learning|llm|genai|generative\s*ai|prompt\s*eng(?:ineering)?|data\s*science|data\s*scientists?|data\s*analytics|data\s*(?:engineers?|eng(?:ineering)?|platform)|business\s*intelligence|product\s*analytics|observability|python|javascript|typescript|rust|golang|go\s*lang|devops|kubernetes|k8s|cloud\s*native|cloud|aws|azure|gcp|google\s*cloud|react|node\.?js|frontend|front[- ]?end|backend|back[- ]?end|fullstack|full[- ]?stack|mobile\s*(?:eng|engineering|dev)|ios|android|platform\s*(?:eng|engineering|engineer)|infra\s*(?:eng|engineering|engineer)|devops\s*(?:eng|engineering|engineer)|security\s*(?:eng|engineering|engineer)|product\s*(?:management|managers?|ops|eng|engineering|design)|\bpm\b|revops|rev\s*ops|revenue\s*ops|sales\s*(?:eng|engineering|enablement|ops)?|channel\s*sales|account\s*(?:executive|manager|mgmt|management)|\bae\b|\bcsm\b|customer\s*success\s*manager|support\s*(?:eng|engineer|engineering)|success\s*(?:eng|engineer)|interview\s*prep|mock\s*interview|coding\s*interview|system\s*design|portfolio\s*review|technical\s*writ(?:ing|er)|tech\s*writ(?:ing|er)|knowledge\s*shar(?:e|ing)|business\s*development|biz\s*dev|bizdev|partnerships?|growth\s*(?:eng|engineering|marketing)|qa|quality\s*assurance|test\s*(?:eng|engineering)|open\s*source|foss|open\s*data|civic\s*tech|infosec|info\s*sec|cyber\s*security|cybersecurity|pen(?:etration)?\s*test|red\s*team|blue\s*team|bug\s*bounty|\bctf\b|homelab|self[- ]?host(?:ing)?|privacy|linux|sre|\bsoc\b|fintech|climate\s*tech|health\s*tech|biotech|edtech|deep\s*tech|green\s*tech|clean\s*tech|proptech|legaltech|govtech|devrel|developer\s*(?:relations|advocate|advocacy)|design\s*systems?|designops|design\s*ops|figma|ux\s*design|ui\s*design|brand\s*design|service\s*design|visual\s*design|interaction\s*design|graphic\s*design|content\s*design(?:ers?)?|content\s*marketing|product\s*marketing|performance\s*marketing|lifecycle\s*marketing|brand\s*marketing|email\s*marketing|social\s*media\s*marketing|\bseo\b|\bsem\b|paid\s*(?:ads|media)|demand\s*gen(?:eration)?|demandgen|customer\s*success|b2b\s*marketing|people\s*ops|talent\s*(?:ops|acquisition)|legal\s*ops|finance\s*ops|fp\s*&\s*a|fpanda|hr\s*ops|\bhr\b|recruit(?:ers?|ing)|community\s*(?:manager|ops|management)|technical\s*program\s*manager|\btpm\b|solutions?\s*(?:architect|eng|engineering|consulting)|engineering\s*manager|\bem\b|staff\s*(?:engineer|eng)|software\s*(?:engineer|eng)|\bswe\b|principal\s*(?:engineer|eng)|distinguished\s*(?:engineer|eng)|people\s*partner|\bhrbp\b|hr\s*business\s*partner|director\s*(?:of\s*)?(?:engineer(?:ing)?|eng)|(?:eng(?:ineering)?)\s*director|(?:vp|v\.p\.)\s*(?:of\s*)?(?:engineer(?:ing)?|eng)|tech(?:nical)?\s*lead|engineering\s*fellow|fellow\s*(?:engineer|eng)|tech\s*fellow|research\s*fellow|\bdei\b|\berg\b|employee\s*resource\s*group|ux\s*writ(?:ing|er)|accessibility|\ba11y\b|inclusive\s*design|web\s*design|webflow|no[- ]?code|low[- ]?code|airtable|supabase|framer|next\.?js|vue(?:\.?js)?|angular|flutter|terraform|docker|kafka|dbt|snowflake|databricks|graphql|helm|experimentation|feature\s*flags?|ab\s*test(?:ing)?|a\/b\s*test(?:ing)?|venture\s*capital|\bvc\b|angel\s*invest(?:or|ing)?|\bsdr\b|\bbdr\b|chief\s*technology\s*officer|\bcto\b|chief\s*information\s*security\s*officer|\bciso\b|chief\s*security\s*officer|\bcso\b|chief\s*strategy\s*officer|chief\s*product\s*security\s*officer|head\s+of\s+(?:engineer(?:ing)?|eng)|(?:eng(?:ineering)?)\s+lead|lead\s+(?:engineer|eng)|senior\s+(?:engineer|eng)|\bsr\.?\s*(?:engineer|eng)|junior\s+(?:engineer|eng)|associate\s+(?:engineer|eng)|manager\s+of\s+(?:engineer(?:ing)?|eng)|(?:software|staff|principal|systems?|cloud)\s+architect|(?:platform|infra|sre)\s+lead|ml\s*(?:engineer|eng)|machine\s*learning\s*(?:engineer|eng)|(?:staff|principal|senior)\s*(?:product\s*)?designers?|product\s*designers?|staff\s*scientist|research\s*scientist|financial\s*controller|finance\s*controller|general\s*counsel|head\s+of\s+product|(?:vp|v\.p\.)\s+(?:of\s+)?product|director\s+(?:of\s+)?product|head\s+of\s+design|design\s+lead|(?:vp|v\.p\.)\s+(?:of\s+)?design|head\s+of\s+(?:people|talent)|(?:vp|v\.p\.)\s+(?:of\s+)?people|chief\s*people\s*officer|talent\s+lead|chief\s*executive\s*officer|\bceo\b|chief\s*product\s*officer|\bcpo\b|chief\s*marketing\s*officer|\bcmo\b|chief\s*financial\s*officer|\bcfo\b|chief\s*operating\s*officer|\bcoo\b|chief\s*revenue\s*officer|\bcro\b|chief\s*human\s*resources\s*officer|\bchro\b|chief\s*growth\s*officer|\bcgo\b|chief\s*data\s*officer|\bcdo\b|chief\s*analytics\s*officer|chief\s*information\s*officer|\bcio\b|chief\s*digital\s*officer|chief\s*design\s*officer|chief\s*of\s*staff|general\s*manager|head\s+of\s+(?:sales|marketing|growth|data|security|platform|success|customer\s*success|revops|ops|operations|analytics|hr|brand|finance|legal|support)|(?:vp|v\.p\.)\s+(?:of\s+)?(?:sales|marketing|growth|data|security|talent|customer\s*success|ops|operations|analytics|hr|brand|success|finance|legal|support)|director\s+(?:of\s+)?(?:design|people|talent|sales|marketing|product\s*design|growth|data|security|ops|operations|analytics|hr|brand|finance|legal|support)|staff\s*(?:pm|product\s*manager)|principal\s*(?:pm|product\s*manager)|group\s*(?:pm|product\s*manager)|senior\s*(?:pm|product\s*manager)|product\s*ops|(?:engineering|eng|platform|infra)\s*ops|developer\s*experience|\bdevex\b|people\s*(?:manager|lead)|hr\s*managers?|creative\s*director|customer\s*engineer|forward[- ]?deployed\s*(?:eng|engineer|engineering)|data\s*engineers?|\bpmm\b|eng(?:ineering)?\s*manager|hiring\s*manager|solutions?\s*engineer|frontend\s*(?:eng|engineer|engineering)|front[- ]?end\s*(?:eng|engineer|engineering)|backend\s*(?:eng|engineer|engineering)|back[- ]?end\s*(?:eng|engineer|engineering)|full[- ]?stack\s*(?:eng|engineer|engineering)|fullstack\s*(?:eng|engineer|engineering)|mobile\s*(?:eng|engineer|engineering)|ios\s*(?:eng|engineer|engineering)|android\s*(?:eng|engineer|engineering)|growth\s*(?:eng|engineer|engineering)|site\s*reliability\s*(?:eng|engineer|engineering)|qa\s*(?:eng|engineer|engineering)|test\s*(?:eng|engineer|engineering)|analytics\s*(?:eng|engineer|engineering)|ai\s*(?:eng|engineer|engineering)|llm\s*(?:eng|engineer|engineering)|prompt\s*(?:eng|engineer|engineering)|ux\s*writ(?:ing|er)s?|content\s*designers?|design\s*(?:eng|engineer|engineering|managers?)|user\s*researchers?|ux\s*researchers?|ux\s*research|recruiters?|network\s*(?:eng|engineer|engineering)|build\s*(?:eng|engineer|engineering)|tools\s*(?:eng|engineer|engineering)|release\s*(?:eng|engineer|engineering)|soc\s*analysts?|privacy\s*(?:eng|engineer|engineering)|trust\s*(?:and\s*)?safety|\brevops\b|revenue\s*operations|lifecycle\s*marketing|brand\s*managers?|\bit\s*managers?|sysadmins?|sys\s*admins?|\btlm\b|tech\s*lead\s*managers?|fp\s*&\s*a|fpanda|developer\s*productivity|\bdevprod\b|partner\s*managers?|partnerships?\s*managers?|business\s*analysts?|product\s*analysts?|content\s*ops|data\s*platform|sales\s*(?:eng|engineer|engineering)|pre[- ]?sales\s*(?:eng|engineer|engineering)|presales\s*(?:eng|engineer|engineering)|field\s*(?:eng|engineer|engineering)|partner\s*(?:eng|engineer|engineering)|implementation\s*(?:eng|engineer|engineering)|enablement\s*(?:eng|engineer|engineering|managers?)|docs\s*(?:eng|engineer|engineering)|documentation\s*(?:eng|engineer|engineering)|dx\s*(?:eng|engineer|engineering)|systems?\s*(?:eng|engineer|engineering)|database\s*(?:eng|engineer|engineering|admins?)|\bdba\b|data\s*architects?|security\s*architects?|enterprise\s*architects?|research\s*(?:eng|engineer|engineering)|applied\s*scientists?|cyber\s*security|cybersecurity|blue\s*teams?|compliance\s*(?:eng|engineer|engineering)|threat\s*intel(?:ligence)?|incident\s*response|\bgrc\b|risk\s*(?:analysts?|managers?)|program\s*managers?|project\s*managers?|scrum\s*masters?|agile\s*coach(?:es)?|release\s*managers?|\bseo\b|\bsem\b|paid\s*(?:ads|media)|b2b\s*marketing|talent\s*sourcers?|sourcers?|learning\s*(?:and\s*)?development|\bl\s*&\s*d\b|finance\s*managers?|it\s*support|service\s*desks?|help\s*desks?|helpdesks?|systems?\s*admins?|network\s*admins?|solutions?\s*consulting|angel\s*invest(?:or|ing)?|product\s*owners?|delivery\s*managers?|chaos\s*(?:eng|engineer|engineering)|infrastructure\s*(?:eng|engineer|engineering)|cloud\s*(?:eng|engineer|engineering)|founding\s*(?:eng|engineer|engineering|designers?|pm|product\s*managers?)|pre[- ]?sales|presales|biz\s*dev|data\s*ops|dataops|secops|sec\s*ops|it\s*ops|mlops|ml\s*ops|aiops|ai\s*ops|site\s*reliability|platform\s*reliability|customer\s*ops|support\s*ops|marketing\s*ops|growth\s*ops|visual\s*designers?|interaction\s*designers?|graphic\s*designers?|service\s*designers?|brand\s*designers?|web\s*designers?|motion\s*designers?|technical\s*account\s*managers?|\btam\b|appsec|application\s*security|product\s*security|cloud\s*security|information\s*security|network\s*security|endpoint\s*security|mobile\s*security|app\s*security|soc\s*(?:eng|engineer|engineering)|siem|soar|purple\s*team|threat\s*hunt(?:ing)?|identity\s*(?:eng|engineer|engineering)|auth\s*(?:eng|engineer|engineering)|\biam\b|zero\s*trust|security\s*operations|vendor\s*security|third[- ]?party\s*risk|\bsoc\s*2\b|\bsoc2\b|fraud\s*(?:eng|engineer|engineering)|abuse\s*(?:eng|engineer|engineering)|legal\s*(?:eng|engineer|engineering)|policy\s*(?:eng|engineer|engineering)|trust\s*(?:eng|engineer|engineering)|platform\s*architects?|backend\s*architects?|frontend\s*architects?|front[- ]?end\s*architects?|back[- ]?end\s*architects?|reliability\s*(?:eng|engineer|engineering)|observability\s*(?:eng|engineer|engineering)?|\bfinops\b|fin\s*ops|feature\s*flags?|experimentation|a\/b\s*test(?:ing)?|ab\s*test(?:ing)?|\bslo\b|error\s*budget|incident\s*commander|on[- ]?call|disaster\s*recovery|business\s*continuity|\bdbt\b|snowflake|databricks|kafka|terraform|docker|graphql|helm|next\.?js|vue(?:\.?js)?|angular|flutter|airtable|supabase|framer|payments\s*(?:eng|engineer|engineering)|billing\s*(?:eng|engineer|engineering)|marketplace\s*(?:eng|engineer|engineering)|ads\s*(?:eng|engineer|engineering)|monetization\s*(?:eng|engineer|engineering)|search\s*(?:eng|engineer|engineering)|ranking\s*(?:eng|engineer|engineering)|recommendation\s*(?:eng|engineer|engineering)|streaming\s*(?:eng|engineer|engineering)|pipeline\s*(?:eng|engineer|engineering)|etl\s*(?:eng|engineer|engineering)|warehouse\s*(?:eng|engineer|engineering)|data\s*quality|\bbi\s*(?:eng|engineer|engineering)\b|embedded\s*(?:eng|engineer|engineering)|firmware\s*(?:eng|engineer|engineering)|kernel\s*(?:eng|engineer|engineering)|computer\s*vision|\bnlp\s*(?:eng|engineer|engineering)\b|speech\s*(?:eng|engineer|engineering)|robotics\s*(?:eng|engineer|engineering)|autonomy\s*(?:eng|engineer|engineering)|quant\s*(?:eng|engineer|engineering)|trading\s*(?:eng|engineer|engineering)|core\s*(?:eng|engineer|engineering)|solutions?\s*(?:eng|engineering)\b|eval\s*(?:eng|engineer|engineering)|prompt\s*ops|llmops|llm\s*ops|accessibility\s*(?:eng|engineer|engineering)|a11y\s*(?:eng|engineer|engineering)|\bi18n\b|\bl10n\b|localization|internationalization|internal\s*platform|developer\s*tools|internal\s*tools|api\s*platform|data\s*warehouse|data\s*lake|feature\s*store|ml\s*platform|paved\s*road|golden\s*path|compliance\s*officers?|risk\s*officers?|privacy\s*officers?|partner\s*success|success\s*managers?|hr\s*ops|recruiting\s*coordinators?|(?:vp|v\.p\.)\s+(?:of\s+)?platform|director\s+(?:of\s+)?platform|(?:security|chaos|reliability|sre|infra|incident)\s*game\s*day|(?:growth|product|ops|operations|sales|support|security|devops|data|analytics|finance|revenue|partner|community|research|implementation|engagement|onboarding|channel|marketplace|relationship|success|customer\s*success)\s*(?:leads?|managers?|mgrs?)|\bcs\s*leads?|business\s*ops|biz\s*ops|bizops|corporate\s*development|corp\s*dev|\bm\s*&\s*a\b|mergers?\s*(?:and|&)\s*acquisitions?|investor\s*relations|venture\s*partners?|\binvestors?\b|technical\s*architects?|(?:staff|principal)\s*architects?|ml\s*scientists?|principal\s*scientists?|applied\s*ml|ml\s*researchers?|ai\s*researchers?|quantitative?\s*researchers?|quant\s*researchers?|solutions?\s*consultants?|tech(?:nical)?\s*evangelists?|\bgitops\b|devsecops|\bapm\b|\bxdr\b|\bedr\b|\bmdr\b|reverse\s*etl|data\s*mesh|data\s*fabric|lakehouse|total\s*rewards|\bhris\b|customer\s*education|staff\s*ics?|individual\s*contributors?|y\s*combinator|\byc\b|\balliances?\b|ecosystem(?:\s*(?:leads?|managers?|mgrs?))?|change\s*management|\bpmo\b|digital\s*transformation|\besg\b|sustainability|go[- ]?to[- ]?market|\bgtm\b|gtm\s*(?:leads?|managers?|mgrs?)|customer\s*experience|\bcx\b|cx\s*(?:leads?|managers?|mgrs?)|enablement(?:\s*(?:leads?|managers?|mgrs?))?|partnerships?\s*(?:leads?|managers?|mgrs?)|bd\s*(?:leads?|managers?|mgrs?)|business\s*development\s*(?:leads?|managers?|mgrs?)|executive\s*assistants?|office\s*managers?|workplace\s*managers?|facilities\s*managers?|it\s*directors?|(?:vp|v\.p\.)\s+(?:of\s+)?it|director\s+(?:of\s+)?it|head\s+of\s+it|recruiting\s*(?:leads?|managers?|mgrs?)|head\s+of\s+recruiting|sales\s+operations|marketing\s+operations|people\s+operations|ai\s*safety|ai\s*ethics|responsible\s*ai|business\s*intelligence|\bbi\s*analysts?\b|\bbi\b|power\s*bi|looker|tableau|airflow|spark\s*(?:eng|engineer|engineering)|apache\s*spark|soc\s*(?:leads?|managers?|mgrs?)|compliance\s*(?:leads?|managers?|mgrs?)|privacy\s*counsel|legal\s*counsel|contracts?\s*managers?|vendor\s*managers?|procurement|professional\s*services|head\s+of\s+(?:ai|ml|enablement|cs|compliance|workplace|recruiting)|incident\s*managers?|platform\s*managers?|knowledge\s*managers?|documentation\s*managers?|customer\s*onboarding|lifecycle\s*managers?|\bdevops\b|data\s*eng\b|\bquants?\b|\bnoc\b|cost\s*optimization|cloud\s*cost|internal\s*audit|audit\s*managers?|partnerships?|head\s+of\s+(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth|r\s*&\s*d)|(?:vp|v\.p\.)\s+(?:of\s+)?(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth)|director\s+(?:of\s+)?(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth)|portfolio\s*(?:ops|operations)|operating\s*partners?|venture\s*scouts?|fractional\s+(?:cto|cmo|cfo|coo|ceo|cpo|ciso)|interim\s+(?:cto|cmo|cfo|coo|ceo|cpo|ciso)|founder\s+in\s+residence|entrepreneur\s+in\s+residence|\beir\b|social\s*media\s*(?:leads?|managers?|mgrs?)|field\s*marketing(?:\s*(?:leads?|managers?|mgrs?))?|events?\s*(?:managers?|leads?|mgrs?)|brand\s*(?:leads?|ops)|content\s*(?:leads?|managers?|mgrs?)|developer\s*(?:marketing|success)|product\s*growth|retention\s*(?:leads?|managers?|mgrs?)|lifecycle\s*(?:leads?|managers?|mgrs?)|activation\s*(?:leads?|managers?|mgrs?)|expansion\s*(?:leads?|managers?|mgrs?)|customer\s*insights|insights\s*(?:leads?|managers?|mgrs?)|market\s*research|research\s*ops|researchops|design\s*ops|designops|iso\s*27001|\bhipaa\b|\bgdpr\b|pci\s*dss|\bpci\b|content\s*moderation|startup\s*advisors?|technical\s*advisors?|newsletter\s*(?:leads?|managers?|mgrs?)|editorial\s*(?:leads?|managers?|mgrs?)|comms\s*(?:leads?|managers?|mgrs?)|communications\s*(?:leads?|managers?|mgrs?)|public\s*relations|pr\s*(?:leads?|managers?|mgrs?)|analyst\s*relations|pricing\s*(?:leads?|managers?|mgrs?)|competitive\s*intelligence|market\s*intelligence|corp(?:orate)?\s*strategy|strategy\s*(?:leads?|managers?|mgrs?)|innovation\s*(?:leads?|managers?|mgrs?)|r\s*&\s*d|research\s*(?:and\s*)?development|post[- ]?sales|postsales|value\s*(?:eng|engineer|engineering)|chief\s*architects?|enterprise\s*sales|delivery\s*(?:leads?|managers?|mgrs?)|services\s*(?:leads?|managers?|mgrs?)|associate\s*product\s*managers?|\bapm\b|ai\s*product\s*managers?|technical\s*product\s*managers?|technical\s*pms?|onboarding\s*managers?|implementation\s*managers?|field\s*(?:cto|ciso)|inside\s*sales|field\s*se\b|field\s*sales\s*engineers?|\bsoc\s*teams?|\bsoc\b|social\s*media(?:\s*(?:teams?|roles?|ops))?|first[- ]?time\s+managers?|new\s+managers?|manager\s+(?:training|development|enablement|coaching)|people\s*analytics|org(?:anizational)?\s*design|org(?:anizational)?\s*development|employee\s*experience|employer\s*brand|talent\s*brand|university\s*recruiting|campus\s*recruiting|early\s*career|career\s*coach(?:es|ing)?|executive\s*coach(?:es|ing)?|leadership\s*coach(?:es|ing)?|leadership\s*development|talent\s*development|internal\s*comms?|internal\s*communications|media\s*relations|deal\s*desks?|account\s*planning|territory\s*planning|customer\s*marketing|pipeline\s*reviews?|forecast(?:ing)?(?:\s*reviews?)?|win\s*[\/-]?\s*loss(?:\s*(?:reviews?|analysis))?|quota\s*planning|monthly\s*business\s*reviews?|weekly\s*business\s*reviews?|\bmbr\b|\bwbr\b|north\s*star(?:\s*metrics?)?|hack\s*days?|build\s*days?|office\s+of\s+the\s+cto|chief\s*commercial\s*officer|chief\s*customer\s*officer|workforce\s*planning|succession\s*planning|unconscious\s*bias|manager\s*circles?|culture\s*clubs?|buddy\s*programs?|onboarding\s*buddies|onboarding\s*buddy|interview\s*loops?|mob\s*programming|code\s*katas?|coding\s*dojos?|code\s*dojos?|paper\s*readings?|customer\s*advisory(?:\s*boards?)?|power\s*users?|beta\s*users?|design\s*partners?|company\s*open\s*house|user\s*groups?|alumni\s*(?:meetup|network|chapter|club|dinner|brunch|breakfast|lunch)|meetup\s*(?:organizers?|hosts?|leads?)|(?:chapter|community|event|conference|summit)\s*organizers?|limited\s*partners?(?:\s*(?:day|meeting|dinner|brunch|breakfast|lunch|relations|update))?|\blp\s*(?:day|meeting|dinner|brunch|breakfast|lunch|relations|update)\b|day[- ]?of\s*leads?|task\s*forces?|working\s*groups?|steering\s*committees?|sales\s*kickoffs?|\bsko\b|center\s*of\s*excellence|community\s*of\s*practice|unconferences?|barcamps?|advisory\s*boards?|masterminds?(?:\s*(?:groups?|circles?|sessions?))?|founders?\s*circles?|peer\s*circles?|accelerators?|incubators?|fellowships?|founders?\s*(?:brunch|breakfast)|tech\s*brunch|fundraising|fundrais(?:e|ing)|capital\s*raise|series\s*[a-c]\b|seed\s*(?:stage|round|funding)|cap\s*tables?|angel\s*syndicates?|\bvc\b|office\s*crawls?|lab\s*tours?|factory\s*tours?|space\s*tours?|workspace\s*tours?|\bapis?\b|\bsdks?\b)\b/.test(
      needL,
    );
  // eng covers "platform eng", "sales eng", "mobile eng" abbreviations
  const techLabel = /\b(tech|startup|engineering|eng|developer|dev|security)\b/.test(needL);
  // Community affinity: "women in tech", "girls who code" — room, not lawn (residual-3)
  // residual-9: DEI / ERG / employee resource group (room, not ferry plaza)
  // residual-10 people-partner/HRBP is strong solo (not community affinity)
  // residual-25b: latinx · women/girls/latinx/black/queer in product|design|eng|engineering
  const techCommunity =
    /\b(?:women|girls|latinas?|latinx|blacks?|queer|lgbtq\+?)\s+(?:in\s+)?(?:tech|stem|code|coding|product|design|engineering|eng)\b/.test(
      needL,
    ) ||
    /\b(?:women|girls)\s+who\s+code\b/.test(needL) ||
    /\b(?:dei|erg|employee\s*resource\s*group)\b/.test(needL);
  // Pure social mixer language without a tech topic stays walk-network outdoor
  if (
    /\b(networking|mixer|founders?\s+social|happy\s*hour)\b/.test(needL) &&
    !techTopic &&
    !techCommunity &&
    !/\b(tech|startup|engineering|eng|developer)\b/.test(needL)
  ) {
    return false;
  }
  // Strong solo labels imply a room even without meetup/hang token (draft residual)
  // residual-6: design systems / figma / product design / GTM labels (parity fintech solo)
  // residual-7: people ops / sales GTM / social-media marketing / TPM / a11y / no-code
  // residual-8: product manager/PM · sales ops · channel sales · AE/CSM/EM · account manager ·
  // support eng · interview prep/mock · system design · portfolio review · tech writing ·
  // knowledge share · engineering manager (was solo library/ferry free-ask only)
  // residual-9: staff engineer / SWE · software engineer · DEI/ERG · coding interview
  // residual-10: principal/distinguished engineer · people partner / HRBP
  // residual-11: director/VP eng · tech lead · eng fellow (solo free-ask was outdoor)
  // residual-12: CTO · head of eng · lead/senior/junior eng · product/design heads (solo free-ask)
  // residual-13: C-suite · head/VP/director sales|marketing|… · staff/principal PM · product ops
  // (solo free-ask was outdoor; "sales"→Salesforce park keyword)
  // residual-14: CISO/CSO · designers · data scientist · ML eng · platform/security eng ·
  // finance/legal/support heads · general counsel · scientists (solo free-ask;
  // financial controller ≠ FiDi — area only on "financial district")
  // residual-15: CHRO/CGO/CDO/CIO · ops/operations/analytics/hr/brand heads · product designer ·
  // data engineer · eng/platform ops · DevEx · people/HR manager · creative director ·
  // customer/forward-deployed eng · PMM · general manager (solo free-ask)
  // residual-16: FE/BE/full-stack eng · mobile/iOS/Android · growth · SRE phrase · QA/test ·
  // analytics/AI/LLM/prompt eng · UX writer · content designer · design eng/mgr · researchers ·
  // recruiter · network/build/tools/release eng · SOC analyst · privacy · trust&safety ·
  // RevOps · lifecycle marketing · brand/IT mgr · sysadmin · TLM · FP&A · DevProd ·
  // partner mgr · biz/product analyst · content ops · data platform (solo free-ask)
  // residual-17: sales eng · pre-sales · field/partner/implementation/docs/DX eng · systems eng ·
  // DBA · architects · research eng · applied scientist · cybersecurity · blue team ·
  // compliance · threat intel · IR · GRC · risk · program/project mgr · scrum/agile ·
  // release/enablement · SEO/SEM · paid ads · B2B · sourcer · L&D · finance mgr · IT support ·
  // service desk · sys/network admin · solutions consulting · angel · TAM (solo free-ask)
  // residual-18: product owner · delivery mgr · chaos eng · infrastructure/cloud eng ·
  // founding eng/designer · bare pre-sales · biz dev · data/sec/IT/ml/ai ops ·
  // site/platform reliability · customer/support/marketing/growth ops ·
  // visual/interaction/graphic/service/brand/web/motion designer (solo free-ask)
  // residual-19: appsec/cloud/network security · SOC eng · SIEM/SOAR · purple team ·
  // threat hunting · identity/auth · IAM · zero trust · vendor/third-party risk · SOC 2 ·
  // fraud/abuse/legal/policy/trust eng · platform/FE/BE architect · reliability/observability ·
  // FinOps · feature flags · SLO · on-call · DR/BCP · data-stack + FE + no-code solo ·
  // payments/ads/search/pipeline eng · embedded/firmware · CV/NLP · robotics · quant ·
  // solutions eng · eval/LLMOps · a11y · i18n · internal platform · warehouse/lake ·
  // compliance/risk/privacy officer · partner success · HR ops · VP/director platform ·
  // security|chaos|reliability game day (solo free-ask)
  // residual-20: domain lead|manager · CS/success lead · bizops · corp dev/M&A · investor ·
  // technical/staff/principal architect · ML scientist · researchers · solutions consultant ·
  // tech evangelist · GitOps/DevSecOps · APM/XDR/EDR/MDR · data mesh/fabric/lakehouse ·
  // total rewards/HRIS · customer education · staff IC · YC · alliances/ecosystem ·
  // change management/PMO · ESG/sustainability (solo free-ask; sales lead → Salesforce park)
  // residual-21: partnerships · head/VP partnerships|revenue|community · portfolio ops ·
  // operating partner · venture scout · fractional/interim C-suite · EIR · social media lead ·
  // field marketing · events lead · brand/content lead · developer marketing · product growth ·
  // retention/lifecycle/activation · insights · market research · researchops · compliance
  // frameworks · content moderation · PR/comms · strategy/innovation · R&D · post-sales ·
  // value eng · chief architect · enterprise sales · delivery lead · APM/AI PM · field CTO
  // residual-22: inside sales · field SE · bare SOC · social media · first-time/new manager ·
  // manager training · people analytics · org design · EX · employer brand · campus recruiting ·
  // career/exec coach · L&D · internal comms · media relations · deal desk · account planning ·
  // customer marketing · pipeline/forecast · win/loss · MBR/WBR · north star · hack/build day
  // residual-23: chief commercial/customer officer · workforce/succession planning ·
  // unconscious bias · manager circle · culture club · buddy/onboarding buddy ·
  // interview loop · mob programming · code kata · coding dojo · paper reading ·
  // customer advisory · power/beta users · design partners · company open house · user group
  // residual-24: alumni meetup · meetup/chapter organizer · LP day · day-of lead ·
  // task force · working group · steering committee · SKO · CoE · community of practice
  // residual-25: unconference/barcamp · advisory board · mastermind · founder/peer circle ·
  // accelerator/incubator/fellowship · founders brunch · tech brunch · fundraising ·
  // series A–C · seed · cap table · VC · office crawl · lab/space tour · API/SDK
  if (
    techCommunity ||
    /\b(open\s*source|foss|open\s*data|civic\s*tech|climate\s*tech|fintech|health\s*tech|biotech|edtech|deep\s*tech|green\s*tech|clean\s*tech|proptech|legaltech|govtech|devrel|developer\s*(?:relations|advocate|advocacy)|infosec|info\s*sec|pen(?:etration)?\s*test|red\s*team|bug\s*bounty|\bctf\b|homelab|self[- ]?host(?:ing)?|linux\s*user\s*group|\blug\b|design\s*systems?|designops|design\s*ops|figma|product\s*design|product\s*managers?|\bpm\b|ux\s*design|ui\s*design|brand\s*design|service\s*design|content\s*design(?:ers?)?|customer\s*success|customer\s*success\s*manager|\bcsm\b|growth\s*marketing|content\s*marketing|product\s*marketing|brand\s*marketing|email\s*marketing|social\s*media\s*marketing|demand\s*gen(?:eration)?|demandgen|people\s*ops|talent\s*(?:ops|acquisition)|legal\s*ops|finance\s*ops|revenue\s*ops|sales\s*ops|sales\s*enablement|channel\s*sales|account\s*(?:executive|manager|mgmt|management)|\bae\b|\bsdr\b|\bbdr\b|business\s*development|bizdev|community\s*(?:manager|ops)|technical\s*program\s*manager|\btpm\b|solutions?\s*architect|engineering\s*manager|\bem\b|staff\s*(?:engineer|eng)|software\s*(?:engineer|eng)|\bswe\b|principal\s*(?:engineer|eng)|distinguished\s*(?:engineer|eng)|people\s*partner|\bhrbp\b|hr\s*business\s*partner|director\s*(?:of\s*)?(?:engineer(?:ing)?|eng)|(?:eng(?:ineering)?)\s*director|(?:vp|v\.p\.)\s*(?:of\s*)?(?:engineer(?:ing)?|eng)|tech(?:nical)?\s*lead|engineering\s*fellow|fellow\s*(?:engineer|eng)|tech\s*fellow|research\s*fellow|support\s*(?:eng|engineer|engineering)|success\s*(?:eng|engineer)|interview\s*prep|mock\s*interview|coding\s*interview|system\s*design|portfolio\s*review|technical\s*writ(?:ing|er)|tech\s*writ(?:ing|er)|knowledge\s*shar(?:e|ing)|\bdei\b|\berg\b|employee\s*resource\s*group|accessibility|\ba11y\b|webflow|no[- ]?code|low[- ]?code|venture\s*capital|chief\s*technology\s*officer|\bcto\b|chief\s*information\s*security\s*officer|\bciso\b|chief\s*security\s*officer|\bcso\b|chief\s*strategy\s*officer|chief\s*product\s*security\s*officer|head\s+of\s+(?:engineer(?:ing)?|eng)|(?:eng(?:ineering)?)\s+lead|lead\s+(?:engineer|eng)|senior\s+(?:engineer|eng)|\bsr\.?\s*(?:engineer|eng)|junior\s+(?:engineer|eng)|associate\s+(?:engineer|eng)|manager\s+of\s+(?:engineer(?:ing)?|eng)|(?:software|staff|principal|systems?|cloud)\s+architect|(?:platform|infra|sre)\s+lead|ml\s*(?:engineer|eng)|machine\s*learning\s*(?:engineer|eng)|platform\s*(?:engineer|eng|engineering)|infra\s*(?:engineer|eng)|devops\s*(?:engineer|eng)|security\s*(?:engineer|eng)|\bsre\b|data\s*science|data\s*scientists?|data\s*analytics|(?:staff|principal|senior)\s*(?:product\s*)?designers?|product\s*designers?|staff\s*scientist|research\s*scientist|financial\s*controller|finance\s*controller|general\s*counsel|head\s+of\s+product|(?:vp|v\.p\.)\s+(?:of\s+)?product|director\s+(?:of\s+)?product|head\s+of\s+design|design\s+lead|(?:vp|v\.p\.)\s+(?:of\s+)?design|head\s+of\s+(?:people|talent)|(?:vp|v\.p\.)\s+(?:of\s+)?people|chief\s*people\s*officer|talent\s+lead|chief\s*executive\s*officer|\bceo\b|chief\s*product\s*officer|\bcpo\b|chief\s*marketing\s*officer|\bcmo\b|chief\s*financial\s*officer|\bcfo\b|chief\s*operating\s*officer|\bcoo\b|chief\s*revenue\s*officer|\bcro\b|chief\s*human\s*resources\s*officer|\bchro\b|chief\s*growth\s*officer|\bcgo\b|chief\s*data\s*officer|\bcdo\b|chief\s*analytics\s*officer|chief\s*information\s*officer|\bcio\b|chief\s*digital\s*officer|chief\s*design\s*officer|chief\s*of\s*staff|general\s*manager|head\s+of\s+(?:sales|marketing|growth|data|security|platform|success|customer\s*success|revops|ops|operations|analytics|hr|brand|finance|legal|support)|(?:vp|v\.p\.)\s+(?:of\s+)?(?:sales|marketing|growth|data|security|talent|customer\s*success|ops|operations|analytics|hr|brand|success|finance|legal|support)|director\s+(?:of\s+)?(?:design|people|talent|sales|marketing|product\s*design|growth|data|security|ops|operations|analytics|hr|brand|finance|legal|support)|staff\s*(?:pm|product\s*manager)|principal\s*(?:pm|product\s*manager)|group\s*(?:pm|product\s*manager)|senior\s*(?:pm|product\s*manager)|product\s*ops|(?:engineering|eng|platform|infra)\s*ops|developer\s*experience|\bdevex\b|people\s*(?:manager|lead)|hr\s*managers?|creative\s*director|customer\s*engineer|forward[- ]?deployed\s*(?:eng|engineer|engineering)|data\s*engineers?|\bpmm\b|eng(?:ineering)?\s*manager|hiring\s*manager|solutions?\s*engineer|frontend\s*(?:eng|engineer|engineering)|front[- ]?end\s*(?:eng|engineer|engineering)|backend\s*(?:eng|engineer|engineering)|back[- ]?end\s*(?:eng|engineer|engineering)|full[- ]?stack\s*(?:eng|engineer|engineering)|fullstack\s*(?:eng|engineer|engineering)|mobile\s*(?:eng|engineer|engineering)|ios\s*(?:eng|engineer|engineering)|android\s*(?:eng|engineer|engineering)|growth\s*(?:eng|engineer|engineering)|site\s*reliability\s*(?:eng|engineer|engineering)|qa\s*(?:eng|engineer|engineering)|test\s*(?:eng|engineer|engineering)|analytics\s*(?:eng|engineer|engineering)|ai\s*(?:eng|engineer|engineering)|llm\s*(?:eng|engineer|engineering)|prompt\s*(?:eng|engineer|engineering)|ux\s*writ(?:ing|er)s?|content\s*designers?|design\s*(?:eng|engineer|engineering|managers?)|user\s*researchers?|ux\s*researchers?|ux\s*research|recruiters?|network\s*(?:eng|engineer|engineering)|build\s*(?:eng|engineer|engineering)|tools\s*(?:eng|engineer|engineering)|release\s*(?:eng|engineer|engineering)|soc\s*analysts?|privacy\s*(?:eng|engineer|engineering)|trust\s*(?:and\s*)?safety|\brevops\b|revenue\s*operations|lifecycle\s*marketing|brand\s*managers?|\bit\s*managers?|sysadmins?|sys\s*admins?|\btlm\b|tech\s*lead\s*managers?|fp\s*&\s*a|fpanda|developer\s*productivity|\bdevprod\b|partner\s*managers?|partnerships?\s*managers?|business\s*analysts?|product\s*analysts?|content\s*ops|data\s*platform|sales\s*(?:eng|engineer|engineering)|pre[- ]?sales\s*(?:eng|engineer|engineering)|presales\s*(?:eng|engineer|engineering)|field\s*(?:eng|engineer|engineering)|partner\s*(?:eng|engineer|engineering)|implementation\s*(?:eng|engineer|engineering)|enablement\s*(?:eng|engineer|engineering|managers?)|docs\s*(?:eng|engineer|engineering)|documentation\s*(?:eng|engineer|engineering)|dx\s*(?:eng|engineer|engineering)|systems?\s*(?:eng|engineer|engineering)|database\s*(?:eng|engineer|engineering|admins?)|\bdba\b|data\s*architects?|security\s*architects?|enterprise\s*architects?|research\s*(?:eng|engineer|engineering)|applied\s*scientists?|cyber\s*security|cybersecurity|blue\s*teams?|compliance\s*(?:eng|engineer|engineering)|threat\s*intel(?:ligence)?|incident\s*response|\bgrc\b|risk\s*(?:analysts?|managers?)|program\s*managers?|project\s*managers?|scrum\s*masters?|agile\s*coach(?:es)?|release\s*managers?|\bseo\b|\bsem\b|paid\s*(?:ads|media)|b2b\s*marketing|talent\s*sourcers?|sourcers?|learning\s*(?:and\s*)?development|\bl\s*&\s*d\b|finance\s*managers?|it\s*support|service\s*desks?|help\s*desks?|helpdesks?|systems?\s*admins?|network\s*admins?|solutions?\s*consulting|angel\s*invest(?:or|ing)?|product\s*owners?|delivery\s*managers?|chaos\s*(?:eng|engineer|engineering)|infrastructure\s*(?:eng|engineer|engineering)|cloud\s*(?:eng|engineer|engineering)|founding\s*(?:eng|engineer|engineering|designers?|pm|product\s*managers?)|pre[- ]?sales|presales|biz\s*dev|data\s*ops|dataops|secops|sec\s*ops|it\s*ops|mlops|ml\s*ops|aiops|ai\s*ops|site\s*reliability|platform\s*reliability|customer\s*ops|support\s*ops|marketing\s*ops|growth\s*ops|visual\s*designers?|interaction\s*designers?|graphic\s*designers?|service\s*designers?|brand\s*designers?|web\s*designers?|motion\s*designers?|technical\s*account\s*managers?|\btam\b|appsec|application\s*security|product\s*security|cloud\s*security|information\s*security|network\s*security|endpoint\s*security|mobile\s*security|app\s*security|soc\s*(?:eng|engineer|engineering)|siem|soar|purple\s*team|threat\s*hunt(?:ing)?|identity\s*(?:eng|engineer|engineering)|auth\s*(?:eng|engineer|engineering)|\biam\b|zero\s*trust|security\s*operations|vendor\s*security|third[- ]?party\s*risk|\bsoc\s*2\b|\bsoc2\b|fraud\s*(?:eng|engineer|engineering)|abuse\s*(?:eng|engineer|engineering)|legal\s*(?:eng|engineer|engineering)|policy\s*(?:eng|engineer|engineering)|trust\s*(?:eng|engineer|engineering)|platform\s*architects?|backend\s*architects?|frontend\s*architects?|front[- ]?end\s*architects?|back[- ]?end\s*architects?|reliability\s*(?:eng|engineer|engineering)|observability\s*(?:eng|engineer|engineering)?|\bfinops\b|fin\s*ops|feature\s*flags?|experimentation|a\/b\s*test(?:ing)?|ab\s*test(?:ing)?|\bslo\b|error\s*budget|incident\s*commander|on[- ]?call|disaster\s*recovery|business\s*continuity|\bdbt\b|snowflake|databricks|kafka|terraform|docker|graphql|helm|next\.?js|vue(?:\.?js)?|angular|flutter|airtable|supabase|framer|payments\s*(?:eng|engineer|engineering)|billing\s*(?:eng|engineer|engineering)|marketplace\s*(?:eng|engineer|engineering)|ads\s*(?:eng|engineer|engineering)|monetization\s*(?:eng|engineer|engineering)|search\s*(?:eng|engineer|engineering)|ranking\s*(?:eng|engineer|engineering)|recommendation\s*(?:eng|engineer|engineering)|streaming\s*(?:eng|engineer|engineering)|pipeline\s*(?:eng|engineer|engineering)|etl\s*(?:eng|engineer|engineering)|warehouse\s*(?:eng|engineer|engineering)|data\s*quality|\bbi\s*(?:eng|engineer|engineering)\b|embedded\s*(?:eng|engineer|engineering)|firmware\s*(?:eng|engineer|engineering)|kernel\s*(?:eng|engineer|engineering)|computer\s*vision|\bnlp\s*(?:eng|engineer|engineering)\b|speech\s*(?:eng|engineer|engineering)|robotics\s*(?:eng|engineer|engineering)|autonomy\s*(?:eng|engineer|engineering)|quant\s*(?:eng|engineer|engineering)|trading\s*(?:eng|engineer|engineering)|core\s*(?:eng|engineer|engineering)|solutions?\s*(?:eng|engineering)\b|eval\s*(?:eng|engineer|engineering)|prompt\s*ops|llmops|llm\s*ops|accessibility\s*(?:eng|engineer|engineering)|a11y\s*(?:eng|engineer|engineering)|\bi18n\b|\bl10n\b|localization|internationalization|internal\s*platform|developer\s*tools|internal\s*tools|api\s*platform|data\s*warehouse|data\s*lake|feature\s*store|ml\s*platform|paved\s*road|golden\s*path|compliance\s*officers?|risk\s*officers?|privacy\s*officers?|partner\s*success|success\s*managers?|hr\s*ops|recruiting\s*coordinators?|(?:vp|v\.p\.)\s+(?:of\s+)?platform|director\s+(?:of\s+)?platform|(?:security|chaos|reliability|sre|infra|incident)\s*game\s*day|(?:growth|product|ops|operations|sales|support|security|devops|data|analytics|finance|revenue|partner|community|research|implementation|engagement|onboarding|channel|marketplace|relationship|success|customer\s*success)\s*(?:leads?|managers?|mgrs?)|\bcs\s*leads?|business\s*ops|biz\s*ops|bizops|corporate\s*development|corp\s*dev|\bm\s*&\s*a\b|mergers?\s*(?:and|&)\s*acquisitions?|investor\s*relations|venture\s*partners?|\binvestors?\b|technical\s*architects?|(?:staff|principal)\s*architects?|ml\s*scientists?|principal\s*scientists?|applied\s*ml|ml\s*researchers?|ai\s*researchers?|quantitative?\s*researchers?|quant\s*researchers?|solutions?\s*consultants?|tech(?:nical)?\s*evangelists?|\bgitops\b|devsecops|\bapm\b|\bxdr\b|\bedr\b|\bmdr\b|reverse\s*etl|data\s*mesh|data\s*fabric|lakehouse|total\s*rewards|\bhris\b|customer\s*education|staff\s*ics?|individual\s*contributors?|y\s*combinator|\byc\b|\balliances?\b|ecosystem(?:\s*(?:leads?|managers?|mgrs?))?|change\s*management|\bpmo\b|digital\s*transformation|\besg\b|sustainability|go[- ]?to[- ]?market|\bgtm\b|gtm\s*(?:leads?|managers?|mgrs?)|customer\s*experience|\bcx\b|cx\s*(?:leads?|managers?|mgrs?)|enablement(?:\s*(?:leads?|managers?|mgrs?))?|partnerships?\s*(?:leads?|managers?|mgrs?)|bd\s*(?:leads?|managers?|mgrs?)|business\s*development\s*(?:leads?|managers?|mgrs?)|executive\s*assistants?|office\s*managers?|workplace\s*managers?|facilities\s*managers?|it\s*directors?|(?:vp|v\.p\.)\s+(?:of\s+)?it|director\s+(?:of\s+)?it|head\s+of\s+it|recruiting\s*(?:leads?|managers?|mgrs?)|head\s+of\s+recruiting|sales\s+operations|marketing\s+operations|people\s+operations|ai\s*safety|ai\s*ethics|responsible\s*ai|business\s*intelligence|\bbi\s*analysts?\b|\bbi\b|power\s*bi|looker|tableau|airflow|spark\s*(?:eng|engineer|engineering)|apache\s*spark|soc\s*(?:leads?|managers?|mgrs?)|compliance\s*(?:leads?|managers?|mgrs?)|privacy\s*counsel|legal\s*counsel|contracts?\s*managers?|vendor\s*managers?|procurement|professional\s*services|head\s+of\s+(?:ai|ml|enablement|cs|compliance|workplace|recruiting)|incident\s*managers?|platform\s*managers?|knowledge\s*managers?|documentation\s*managers?|customer\s*onboarding|lifecycle\s*managers?|\bdevops\b|data\s*eng\b|\bquants?\b|\bnoc\b|cost\s*optimization|cloud\s*cost|internal\s*audit|audit\s*managers?|partnerships?|head\s+of\s+(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth|r\s*&\s*d)|(?:vp|v\.p\.)\s+(?:of\s+)?(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth)|director\s+(?:of\s+)?(?:partnerships?|revenue|community|enablement|cx|gtm|strategy|innovation|comms?|communications|product\s*growth)|portfolio\s*(?:ops|operations)|operating\s*partners?|venture\s*scouts?|fractional\s+(?:cto|cmo|cfo|coo|ceo|cpo|ciso)|interim\s+(?:cto|cmo|cfo|coo|ceo|cpo|ciso)|founder\s+in\s+residence|entrepreneur\s+in\s+residence|\beir\b|social\s*media\s*(?:leads?|managers?|mgrs?)|field\s*marketing(?:\s*(?:leads?|managers?|mgrs?))?|events?\s*(?:managers?|leads?|mgrs?)|brand\s*(?:leads?|ops)|content\s*(?:leads?|managers?|mgrs?)|developer\s*(?:marketing|success)|product\s*growth|retention\s*(?:leads?|managers?|mgrs?)|lifecycle\s*(?:leads?|managers?|mgrs?)|activation\s*(?:leads?|managers?|mgrs?)|expansion\s*(?:leads?|managers?|mgrs?)|customer\s*insights|insights\s*(?:leads?|managers?|mgrs?)|market\s*research|research\s*ops|researchops|design\s*ops|designops|iso\s*27001|\bhipaa\b|\bgdpr\b|pci\s*dss|\bpci\b|content\s*moderation|startup\s*advisors?|technical\s*advisors?|newsletter\s*(?:leads?|managers?|mgrs?)|editorial\s*(?:leads?|managers?|mgrs?)|comms\s*(?:leads?|managers?|mgrs?)|communications\s*(?:leads?|managers?|mgrs?)|public\s*relations|pr\s*(?:leads?|managers?|mgrs?)|analyst\s*relations|pricing\s*(?:leads?|managers?|mgrs?)|competitive\s*intelligence|market\s*intelligence|corp(?:orate)?\s*strategy|strategy\s*(?:leads?|managers?|mgrs?)|innovation\s*(?:leads?|managers?|mgrs?)|r\s*&\s*d|research\s*(?:and\s*)?development|post[- ]?sales|postsales|value\s*(?:eng|engineer|engineering)|chief\s*architects?|enterprise\s*sales|delivery\s*(?:leads?|managers?|mgrs?)|services\s*(?:leads?|managers?|mgrs?)|associate\s*product\s*managers?|\bapm\b|ai\s*product\s*managers?|technical\s*product\s*managers?|technical\s*pms?|onboarding\s*managers?|implementation\s*managers?|field\s*(?:cto|ciso)|inside\s*sales|field\s*se\b|field\s*sales\s*engineers?|\bsoc\s*teams?|\bsoc\b|social\s*media(?:\s*(?:teams?|roles?|ops))?|first[- ]?time\s+managers?|new\s+managers?|manager\s+(?:training|development|enablement|coaching)|people\s*analytics|org(?:anizational)?\s*design|org(?:anizational)?\s*development|employee\s*experience|employer\s*brand|talent\s*brand|university\s*recruiting|campus\s*recruiting|early\s*career|career\s*coach(?:es|ing)?|executive\s*coach(?:es|ing)?|leadership\s*coach(?:es|ing)?|leadership\s*development|talent\s*development|internal\s*comms?|internal\s*communications|media\s*relations|deal\s*desks?|account\s*planning|territory\s*planning|customer\s*marketing|pipeline\s*reviews?|forecast(?:ing)?(?:\s*reviews?)?|win\s*[\/-]?\s*loss(?:\s*(?:reviews?|analysis))?|quota\s*planning|monthly\s*business\s*reviews?|weekly\s*business\s*reviews?|\bmbr\b|\bwbr\b|north\s*star(?:\s*metrics?)?|hack\s*days?|build\s*days?|office\s+of\s+the\s+cto|chief\s*commercial\s*officer|chief\s*customer\s*officer|workforce\s*planning|succession\s*planning|unconscious\s*bias|manager\s*circles?|culture\s*clubs?|buddy\s*programs?|onboarding\s*buddies|onboarding\s*buddy|interview\s*loops?|mob\s*programming|code\s*katas?|coding\s*dojos?|code\s*dojos?|paper\s*readings?|customer\s*advisory(?:\s*boards?)?|power\s*users?|beta\s*users?|design\s*partners?|company\s*open\s*house|user\s*groups?|alumni\s*(?:meetup|network|chapter|club|dinner|brunch|breakfast|lunch)|meetup\s*(?:organizers?|hosts?|leads?)|(?:chapter|community|event|conference|summit)\s*organizers?|limited\s*partners?(?:\s*(?:day|meeting|dinner|brunch|breakfast|lunch|relations|update))?|\blp\s*(?:day|meeting|dinner|brunch|breakfast|lunch|relations|update)\b|day[- ]?of\s*leads?|task\s*forces?|working\s*groups?|steering\s*committees?|sales\s*kickoffs?|\bsko\b|center\s*of\s*excellence|community\s*of\s*practice|unconferences?|barcamps?|advisory\s*boards?|masterminds?(?:\s*(?:groups?|circles?|sessions?))?|founders?\s*circles?|peer\s*circles?|accelerators?|incubators?|fellowships?|founders?\s*(?:brunch|breakfast)|tech\s*brunch|fundraising|fundrais(?:e|ing)|capital\s*raise|series\s*[a-c]\b|seed\s*(?:stage|round|funding)|cap\s*tables?|angel\s*syndicates?|\bvc\b|office\s*crawls?|lab\s*tours?|factory\s*tours?|space\s*tours?|workspace\s*tours?|\bapis?\b|\bsdks?\b)\b/.test(
      needL,
    )
  ) {
    return true;
  }
  // conference/summit/forum count as meetupish with a tech topic (residual-3)
  const meetupish =
    /\b(meetup|hang|night|event|session|workshop|group|club|user\s*group|\blug\b|conference|summit|forum)\b/.test(
      needL,
    );
  if (!meetupish) return false;
  // Topic tokens (AI hang, Python meetup, security meetup, data science session, …)
  if (techTopic) return true;
  // Label: "tech meetup", "startup hang", "engineering night", "dev workshop", "security meetup"
  return techLabel;
}

/**
 * All-hands / town hall / sprint planning / retro / whiteboard / reviews / brown-bag
 * + residual-8 postmortem / incident review (was ferry meetup-fit).
 * + residual-9 QBR / quarterly business review (was ferry meetup-fit).
 * + residual-10 skip-level + onboarding cohort / new-hire onboarding (was free-ask outdoor).
 * + residual-11 talent/comp/calibration review · performance review/calibration
 *   (was free-ask outdoor; bare "performance" comedy stays needIsPerformance).
 * + residual-12 1:1 / one-on-one · team/weekly sync · daily standup · skip-levels ·
 *   OKR/roadmap review · interview debrief · bar raiser · promo/leveling ·
 *   perf review / PIP / performance improvement (was free-ask outdoor / ferry keyword).
 * + residual-13 working/work session · war room · strategy day/offsite · RCA/root cause ·
 *   capacity/headcount planning · budget review · sprint/ship/launch review ·
 *   backlog grooming/refinement · GTM review · board meeting · tabletop exercise ·
 *   security/threat review · hiring panel/scorecard · loop debrief · design/UX critique ·
 *   AMA · mentorship · career/exit/stay interview · EBR · project kickoff
 *   (was free-ask outdoor / ferry keyword; tabletop exercise ≠ game-night).
 * + residual-22: pipeline/forecast review · win/loss · account/territory/quota planning ·
 *   MBR/WBR · deal desk · north star review/workshop
 * + residual-23: interview loop · workforce/succession planning · manager circle ·
 *   buddy/onboarding buddy · unconscious bias · paper reading · customer advisory board
 * → office tables (not free lawns). Draft match only — not a booking API.
 */
function needIsTeamOps(needL) {
  return /\b(all[- ]?hands|town\s*hall|sprint\s*planning|retro(?:spective)?s?|white\s*board(?:ing)?|whiteboard\s*session|architecture\s*review|design\s*review|code\s*review|lunch(?:[-\s]?and[-\s]?learn)|brown[- ]?bag|post[- ]?mortem|incident\s*review|blameless(?:\s+post[- ]?mortem)?|\bqbr\b|quarterly\s*business\s*review|skip[- ]?levels?|onboarding\s*cohort|new\s*hire\s*onboarding|employee\s*onboarding|new\s*hire\s*orientation|talent\s*review|comp(?:ensation)?\s*review|performance\s*(?:review|calibration|improvement(?:\s+plan)?)|(?:talent|perf)\s*calibration|\bcalibration\b(?:\s*(?:meeting|session|sync))?|one[- ]?on[- ]?one|1\s*[:\-]\s*1|team\s+sync|weekly\s+sync|daily\s+(?:standup|stand[- ]?up)|(?:standup|stand[- ]?up)\s+(?:meeting|scrum|sync|call)|\bokr\b|okr\s*planning|roadmap\s+(?:review|planning)|interview\s+debrief|hiring\s+debrief|debrief\s+(?:panel|session)|bar\s*raiser|promo(?:tion)?\s+committee|leveling(?:\s+(?:committee|session|review))?|\bperf\s+review\b|\bpip\b|working\s+session|work\s+session|war\s*rooms?|strategy\s+(?:day|offsite|session|review)|team\s+offsite|offsite\s+(?:planning|day)|(?:\brca\b|root\s*cause(?:\s+analysis)?)|capacity\s+planning|headcount\s+planning|budget\s+review|sprint\s+review|ship\s+review|launch\s+review|backlog\s+(?:grooming|refinement)|grooming\s+session|refinement\s+session|planning\s+poker|gtm\s+review|go[- ]to[- ]market\s+review|board\s+meeting|tabletop\s+exercise|security\s+tabletop|security\s+review|threat\s+model(?:ing)?|hiring\s+(?:panel|scorecard|loop)|loop\s+debrief|panel\s+debrief|design\s+critique|ux\s+critique|product\s+critique|figma\s+crit(?:ique)?|figjam\s+(?:crit(?:ique)?|session|workshop)|\bama\b|ask\s+me\s+anything|mentor(?:ship|ing)?(?:\s+(?:session|matching|circle|program))?|career\s+conversation|exit\s+interview|stay\s+interview|promo\s+packet|comp\s+cycle|bonus\s+calibration|\bebr\b|executive\s+business\s+review|project\s+kickoff|implementation\s+kickoff|privacy\s+review|legal\s+review|pipeline\s+reviews?|forecast(?:ing)?(?:\s*reviews?)?|win\s*[\/-]?\s*loss(?:\s*(?:reviews?|analysis))?|account\s+planning|territory\s+planning|quota\s+planning|monthly\s+business\s+reviews?|weekly\s+business\s+reviews?|\bmbr\b|\bwbr\b|deal\s+desks?|north\s*star(?:\s*metrics?)?(?:\s*(?:reviews?|workshops?|sessions?))?|interview\s*loops?|workforce\s*planning|succession\s*planning|manager\s*circles?|buddy\s*programs?|onboarding\s*buddies|onboarding\s*buddy|unconscious\s*bias|paper\s*readings?|customer\s*advisory(?:\s*boards?)?)\b/.test(
    needL,
  );
}

/**
 * Movie/film in the park / outdoor screening — must not trip indoor AV quiet.
 * Inverse of indoor watch party residual. Draft match only.
 */
function needIsOutdoorScreening(needL) {
  // residual: outdoor watch/movie/film night same as park screening (not indoor AV)
  if (!/\b(movie|film|cinema|screening|watch\s*party|movie\s*night|film\s*night)\b/.test(needL))
    return false;
  return /\b(park|outdoor|lawn|under\s+the\s+stars|open[- ]air|al\s*fresco|outside)\b/.test(needL);
}

/**
 * Outdoor free-list hangs: tours, scavenger, cleanup, sports, stargazing, swaps.
 * Prevents SFPL default when need has no "outdoor/park" token. Draft match only.
 */
function needIsOutdoorActivity(needL) {
  if (/\bindoor\b/.test(needL)) return false;
  return /\b(walking\s*tour|history\s*(?:walk|tour)|neighborhood\s*tour|food\s*tour|ghost\s*tour|nature\s*walk|scavenger\s*hunt|treasure\s*hunt|geocaching|beach\s*cleanup|community\s*cleanup|park\s*cleanup|volunteer\s*cleanup|litter\s*pickup|stargazing|astronomy\s*night|meteor\s*shower|eclipse\s*watch|pickleball|basketball|volleyball|softball|tennis(?:\s*(?:meetup|pickup|hang|night))?|soccer(?:\s*(?:meetup|pickup|game|hang))?|kickball|rugby|lacrosse|badminton|flag\s*football|pickup\s*(?:soccer|basketball|volleyball|kickball)|ultimate\s*frisbee|\bfrisbee\b|plant\s*swap|clothing\s*swap|seed\s*swap|community\s*garden)\b/.test(
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
  // residual-11: performance review/calibration is people-ops (team-ops), not comedy
  // residual-12: performance improvement / perf review / PIP — people-ops, not comedy
  if (
    /\bperformance\s+(?:review|calibration|cycle|rating|eval(?:uation)?|management|improvement(?:\s+plan)?)\b/.test(
      needL,
    ) ||
    /\b(?:talent|perf)\s+calibration\b/.test(needL) ||
    /\bperf\s+review\b/.test(needL) ||
    /\bpip\b/.test(needL)
  ) {
    return false;
  }
  return /\b(open\s*mic|standup|stand[- ]?up|comedy|performance|live\s*music|jam\s*session|karaoke|dance\s*(?:class|night|workshop|party)|salsa(?:\s*night)?|bachata|improv(?:\s*(?:class|workshop|night|show))?|silent\s*disco|poetry\s*slam|slam\s*poetry|spoken\s*word)\b/.test(
    needL,
  );
}

/**
 * UX research / user testing / usability / user research → office tables + quiet control (not parks).
 * residual-7: bare "user research" (was ferry meetup-fit; only "ux research" matched).
 * Draft match only — not a booking API.
 */
function needIsUxResearch(needL) {
  return /\b(user\s*(?:test(?:ing|s)?|research)|ux\s*research|usability\s*(?:test|session|study|lab)?|research\s*session|customer\s*interview|participant\s*test(?:ing)?|design\s*research|research\s*ops)\b/.test(
    needL,
  );
}

/**
 * Cooking class / wine|beer club|tasting / cupping → indoor private (not parks/SFPL kitchens).
 * Draft match only — free-list office/in-kind is the honest shortlist.
 */
function needIsFoodClass(needL) {
  if (/\bcupping\b/.test(needL) && /\bcoffee\b/.test(needL)) return true;
  // Indoor potluck needs tables/kitchen access — not SFPL meeting rooms (residual-3)
  if (/\bpotluck\b/.test(needL) && !/\b(outdoor|picnic|park|lawn)\b/.test(needL)) return true;
  return /\b(cooking\s*(?:class|workshop|night|session)|wine\s*(?:tasting|club)|beer\s*(?:tasting|club)|coffee\s*(?:tasting|cupping)|cocktail\s*(?:class|workshop|night)|mixology|whiskey\s*tasting|chocolate\s*tasting|cheese\s*tasting|olive\s*oil\s*tasting|tasting\s*(?:night|event|class)|culinary\s*(?:class|workshop|night)|bake[- ]?off|chef(?:'s)?\s*table)\b/.test(
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
  // residual: Outer/Inner Sunset neighborhood ≠ sunset golden-hour waterfront hang
  // residual: Bayview neighborhood is one word — bay\s*view was a false waterfront hit
  if (/\b(?:outer|inner)\s+sunset\b|\bsunset\s+(?:district|neighborhood|blvd|boulevard)\b/.test(needL)) {
    return /\b(waterfront|bay\s+view|bayfront|golden\s*hour|views?\s+of\s+the\s+bay|promenade)\b/.test(needL);
  }
  return /\b(waterfront|bay\s+view|bayfront|golden\s*hour|sunset\s*(?:view|hang|meetup|walk)?|views?\s+of\s+the\s+bay|promenade)\b/.test(
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
 * Art walk / gallery hop / First Friday / museum / gallery opening → Yerba Buena cultural corridor
 * (YBCA/SFMOMA edge), not far Crissy lawns or bare SFPL default. Draft match only.
 */
function needIsArtCultureWalk(needL) {
  return /\b(art\s*walk|gallery\s*hop|gallery\s*walk|gallery\s*opening|art\s*opening|first\s*friday|first\s*thursday|museum\s*(?:meetup|walk|hop|day|night|free|visit)|culture\s*walk|open\s*studios?|gallery\s*night|\bmuseum\b)\b/.test(
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
  // Office loan / demo room — not bare cost "in-kind" (kitchen asks also use in-kind).
  const isOfficeish = /\b(office|after-hours|demo|showcase|coworking)\b/i.test(
    String(v.name || '') + ' ' + tags + ' ' + String(v.notes || ''),
  );
  const isKitchenAsk =
    /\b(dinner|kitchen|dining|shared kitchen)\b/i.test(
      tags + ' ' + String(v.name || '') + ' ' + String(v.notes || ''),
    ) && !isOfficeish;
  const isPublicOutdoor = /outdoor|picnic|park|lawn|promenade|parklet/.test(tags + ' ' + blob);
  const fieldSportAsked = /\b(pickleball|basketball|volleyball|softball|tennis|soccer|kickball|rugby|lacrosse|badminton|flag\s*football|ultimate\s+frisbee|frisbee)\b/.test(needL);
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
  // residual-7: bare "social" hang ≠ "social media marketing" (was false outdoor)
  const socialHang =
    /\bsocial\b/.test(needL) && !/\bsocial\s+media\b/.test(needL);
  // residual: SF hoods with "park" must not flip outdoorAsked (\bpark\b) — indoor free-list
  // (South/Glen/McLaren/Balboa/Cayuga/Holly/Buena Vista Park; picnic/outdoor tokens still fire)
  const outdoorAskText = needL
    .replace(/\b(?:south|glen|mclaren|balboa|cayuga|holly)\s+park\b/gi, ' ')
    .replace(/\bbuena\s+vista\s+park\b/gi, ' ');
  const outdoorAsked =
    // residual-16: word-bound park/lawn — "spark" / "sparkline" must not trip outdoor
    /picnic|outdoor|\bparks?\b|\blawns?\b|\bparking\b/.test(outdoorAskText) ||
    socialHang ||
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
  // residual: "quiet outdoor hang/picnic" crowned SFPL via quiet→indoor-fit (draft free-list)
  const quietOutdoorFlip =
    outdoorAsked &&
    !explicitIndoor &&
    /\bquiet\b/.test(needL) &&
    !needWantsIndoor(needL.replace(/\bquiet\b/g, ' '));
  if (
    needWantsIndoor(needL) &&
    /indoor|salon|talk|dinner|demo|showcase/.test(tags) &&
    !quietOutdoorFlip
  ) {
    score += 5;
    reasons.push('indoor-fit');
  }
  if (outdoorAsked && /outdoor|picnic|party|social/.test(tags)) {
    score += 5;
    reasons.push('outdoor-fit');
  }
  // residual: richmond/sunset dinner AREA_NEAR includes mission/soma kitchens — outdoor
  // west needs still area-hit SoMa lawns equal to Crissy (draft free-list honesty only).
  // residual: marina/pac heights/cow hollow/presidio/russian hill outdoor same SoMa-tie
  // (AREA_NEAR adds soma for dinner indoor; outdoor must still crown Crissy — draft only).
  if (
    outdoorAsked &&
    /\b(richmond|sunset|seacliff|sea\s*cliff|parkside|ocean\s+beach|marina|pacific\s+heights|cow\s+hollow|presidio|russian\s+hill)\b/.test(
      needL,
    )
  ) {
    if (v.id === 'v_crissy' || /crissy|marina green|marina\s*\/\s*presidio/.test(blob + ' ' + areaL)) {
      score += 3;
      reasons.push('west-outdoor');
    } else if (['v_soma_parklet', 'v_yerba_buena', 'v_salesforce_park', 'v_dolores'].includes(v.id)) {
      score -= 2;
      reasons.push('west-far');
    }
  }
  // residual: treasure island outdoor crowned SoMa/Mission lawns via AREA_NEAR dinner aliases
  // (TI free outdoor → Embarcadero/Ferry bridge side; draft free-list honesty only)
  if (outdoorAsked && /\btreasure\s+island\b/.test(needL)) {
    if (
      v.id === 'v_ferry_arcade' ||
      v.id === 'v_embarcadero_bench' ||
      /embarcadero|ferry/.test(blob + ' ' + areaL)
    ) {
      score += 4;
      reasons.push('ti-waterfront');
    } else if (
      ['v_soma_parklet', 'v_yerba_buena', 'v_salesforce_park', 'v_dolores', 'v_hayes_green', 'v_crissy'].includes(
        v.id,
      )
    ) {
      score -= 3;
      reasons.push('ti-far');
    }
  }
  // residual: bare picnic crowned ferry food arcade via outdoor-fit+right-size over lawns
  // (parklet/Dolores picnic tags must beat plaza/arcade — draft free-list honesty only)
  if (/\bpicnic\b/.test(needL) && !explicitIndoor) {
    if (/picnic|lawn|parklet|blankets|dolores|patricia|crissy|green|gardens/.test(tags + ' ' + blob)) {
      score += 3;
      reasons.push('picnic-lawn');
    } else if (v.id === 'v_ferry_arcade' || (/ferry|arcade/.test(blob) && /food/.test(tags))) {
      score -= 2;
      reasons.push('picnic-plaza');
    }
  }
  // residual-40: picnic/outdoor hang still ranked SFPL/office #2 via free+area (no outdoor-activity token)
  if (
    outdoorAsked &&
    !explicitIndoor &&
    !needIsOutdoorScreening(needL) &&
    !needIsOutdoorActivity(needL)
  ) {
    if (
      (/library|indoor|salon|talk|office|demo|showcase/.test(tags) || isOfficeish) &&
      !isPublicOutdoor
    ) {
      score -= 4;
      reasons.push('picnic-indoor');
    }
  }
  // Indoor room formats want tables — skip walk-hang meetup-fit (ferry was tying office).
  // residual-4: tech · residual-5: maker/hardware + UX research · residual-6: design/GTM
  // (design/GTM folded into needIsTechMeetup — same ferry-tie pattern as eng verticals)
  // residual-8: team-ops (postmortem/incident/retro) must not keep meetup-fit on ferry
  // residual-indoor-net: explicit indoor + networking still crowned ferry via meetup-fit+area
  if (
    needIsWalkNetwork(needL) &&
    /walk|meetup|networking/.test(tags) &&
    !explicitIndoor &&
    !needIsTechMeetup(needL) &&
    !needIsMakerHardware(needL) &&
    !needIsUxResearch(needL) &&
    !needIsTeamOps(needL)
  ) {
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
      score -= 4;
      reasons.push('lan-library');
    }
    if (/sponsor tab/i.test(v.cost || '')) {
      score -= 2;
      reasons.push('lan-sponsor');
    }
  }
  // Maker night / build|ship / repair café / tool lending → office power+tables (not parklets/SFPL)
  if (needIsMakerHardware(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase|coworking/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('maker-hardware');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('maker-outdoor');
    }
    // SFPL meeting rooms are not makerspaces / tool libraries / repair cafés (keyword trap)
    if (/library/.test(blob) || /library/.test(tags)) {
      // "tool library" need hits keyword on SFPL name — hard demote so office/loan wins
      score -= /\btool\s*(?:library|share|lending)\b/.test(needL) ? 6 : 3;
      reasons.push('maker-library');
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
    if (fieldSportAsked && /\b(field|lawn|green|park|gardens)\b/.test(blob)) {
      score += 3;
      reasons.push('field-sport');
    }
    // residual: field sport ranked ferry arcade #1 via outdoor-activity+intimate-fit
    // (food plaza is not a court/field — draft free-list honesty only)
    if (fieldSportAsked && (v.id === 'v_ferry_arcade' || (/ferry|arcade/.test(blob) && /food/.test(tags)))) {
      score -= 3;
      reasons.push('sport-plaza');
    }
    // residual: bare stargazing/astronomy tied all outdoors (ferry arcade = Crissy). Prefer
    // open-sky west free-list (Crissy/Marina/Presidio) over plaza/arcade — draft match only.
    if (
      /\b(stargazing|astronomy\s*night|meteor\s*shower|eclipse\s*watch)\b/.test(needL) &&
      /\b(crissy|marina|presidio)\b/.test(blob)
    ) {
      score += 3;
      reasons.push('open-sky');
    }
    // residual: beach cleanup tied all outdoors (ferry #1). Prefer Crissy/Embarcadero — draft only.
    if (/\bbeach\s*cleanup\b/.test(needL)) {
      if (v.id === 'v_crissy' || v.id === 'v_embarcadero_bench' || /\b(crissy|marina green|embarcadero promenade)\b/.test(blob)) {
        score += 3; reasons.push('beach-cleanup');
      } else if (v.id === 'v_ferry_arcade') {
        score -= 2; reasons.push('not-beach');
      }
    }
    // residual: plant/seed swap prefer lawn/park over food arcade (draft only)
    if (/\b(plant\s*swap|seed\s*swap|community\s*garden)\b/.test(needL)) {
      if (/lawn|parklet|dolores|crissy|green|gardens|blankets/.test(tags + ' ' + blob)) {
        score += 3; reasons.push('garden-lawn');
      } else if (v.id === 'v_ferry_arcade') {
        score -= 2; reasons.push('swap-plaza');
      }
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
  // Board game / game night / trivia → indoor quiet tables (libraries/offices over parks).
  // residual-13: "tabletop exercise" is security team-ops, not board-game night.
  // residual: mahjong/poker/scrabble/chess/card games missed game-night (office/park over free indoor tables)
  if (
    ((/\b(board\s*games?|game\s*night|tabletop|mahjong|mah\s*jong|poker|scrabble|card\s*games?|chess(?:\s*club)?|bridge\s*(?:club|night|game))\b/.test(
      needL,
    ) &&
      !/\btabletop\s+exercise\b/.test(needL) &&
      !/\bsecurity\s+tabletop\b/.test(needL)) ||
      needIsTriviaNight(needL))
  ) {
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
  // residual: bare indoor office tags got full book-club (+5) and tied free SFPL (draft only)
  if (needIsBookClub(needL)) {
    if (/library/.test(blob) || /library|salon|talk/.test(tags)) {
      score += 5;
      reasons.push('book-club');
    } else if (/indoor/.test(tags) || isOfficeish) {
      score += 2;
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
  // Office tour / workspace open house → free-list office loan (not parklets). Residual-3.
  if (needIsOfficeTour(needL) && !needIsOfficeHours(needL)) {
    if (isOfficeish || /office|after-hours|in-kind|demo|showcase/.test(tags + ' ' + blob)) {
      score += 6;
      reasons.push('office-tour');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 4;
      reasons.push('tour-outdoor');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 2;
      reasons.push('tour-library');
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
    // residual: "run club waterfront" crowned ferry arcade via right-size over emb/crissy walks
    if (needWantsWaterfront(needL)) {
      if (
        v.id === 'v_crissy' ||
        v.id === 'v_embarcadero_bench' ||
        /crissy|marina green|embarcadero promenade/.test(blob)
      ) {
        score += 3;
        reasons.push('run-waterfront');
      } else if (v.id === 'v_ferry_arcade' || /\bferry building\b|\barcade\b/.test(blob)) {
        score -= 2;
        reasons.push('run-plaza');
      }
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
  // residual: Outer/Inner Sunset hood ≠ golden-hour west-bay hang
  if (
    /\bsunset\b/.test(needL) &&
    !/\bsunrise\b/.test(needL) &&
    !/\b(?:outer|inner)\s+sunset\b/.test(needL) &&
    !/\bsunset\s+(?:district|neighborhood|blvd|boulevard)\b/.test(needL)
  ) {
    if (v.id === 'v_crissy' || /crissy|marina green|presidio/.test(blob)) {
      score += 4;
      reasons.push('sunset-west');
    }
    if (v.id === 'v_embarcadero_bench' || /embarcadero promenade/.test(blob)) {
      score -= 2;
      reasons.push('sunrise-east');
    }
  }
  // Rooftop / roof garden → Salesforce Park roof (only free-list roof edge).
  // residual: rooftop+sunset was losing to Crissy (waterfront+sunset-west) — draft only.
  if (/\brooftop\b|roof\s*garden|sky\s*deck|roof\s*deck\b/.test(needL)) {
    if (v.id === 'v_salesforce_park' || /salesforce|roof\s*garden|transit center/.test(blob)) {
      score += 12;
      reasons.push('rooftop');
    } else if (isPublicOutdoor) {
      score -= 6;
      reasons.push('not-rooftop');
    } else if (/library|office|after-hours/.test(blob)) {
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
  // food-near: skip on sponsor-tab when free-ask or multi-resource gap list (not café buyout).
  // Strip "food/beverage sponsor" gap text so outdoor cards don't get +3 from sponsor needs.
  // room/space synonyms — multi-resource gap lists often omit the word "venue"
  const multiResourceNeed =
    /\b(venue|room|space)\b/.test(needL) && /\b(sponsor|volunteer)\b/.test(needL);
  // residual: also strip space/hyphen "food beverage sponsor" (was dinner false-positive)
  const needForFoodNear = needL.replace(
    /\bfood(?:\s*[\/&-]\s*|\s+)beverage(\s+sponsor)?\b/gi,
    ' ',
  );
  // residual: explicit indoor + drinks/happy-hour must not food-near outdoor parks
  // (Salesforce Park was beating SFPL on "indoor free happy hour" via outdoor+meetup tags).
  if (
    /food|café|cafe|ferry|coffee|drinks|happy\s*hour/.test(needForFoodNear) &&
    /food|meetup|sponsor|outdoor|picnic/.test(tags) &&
    !((freeAsked || multiResourceNeed) && /sponsor tab/i.test(v.cost || '')) &&
    !(explicitIndoor && isPublicOutdoor)
  ) {
    score += 3;
    reasons.push('food-near');
  }
  // Drinks / happy hour without outdoor picnic → food-adjacent over pure lawn
  if (drinksAsked && !outdoorAsked) {
    if (
      !(explicitIndoor && isPublicOutdoor) &&
      (/food|meetup|sponsor/.test(tags) || /ferry|café|cafe|sponsor/.test(blob))
    ) {
      score += 2;
      reasons.push('drinks-near');
    }
    // residual: happy-hour ranked SFPL/office over café (alcohol ban / wrong room type)
    if (/library/.test(blob) || /library/.test(tags)) {
      score -= 5;
      reasons.push('no-drinks-room');
    }
    if (
      /sponsor tab/i.test(v.cost || '') ||
      /café|cafe|buyout/.test(blob)
    ) {
      score += 4;
      reasons.push('drinks-cafe');
    } else if (isOfficeish) {
      score -= 3;
      reasons.push('drinks-office');
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
  // Mixed windows (eve + aft) must not boost daytime parks for evening dinner/salon needs.
  if (
    /daytime|hayes|afternoon/.test(needL) &&
    /daytime/.test(tags) &&
    !/\bevening\b|\bnight\b|after[- ]?hours/.test(needL)
  ) {
    score += 2;
    reasons.push('daytime');
  }
  // Quiet dinner/salon: indoor free rooms beat loud parks (not walk-and-talk)
  // residual: quietOutdoorFlip — bare quiet+outdoor stays outdoor free-list (not SFPL)
  if (needWantsQuiet(needL)) {
    if (/indoor|salon|talk|library|office/.test(tags + ' ' + blob) && !quietOutdoorFlip) {
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
  // Library rooms rarely allow dinner service — demote when food-first (salon/talk still ok).
  // residual: multi-resource "food/beverage sponsor" is sponsor-gap text, not dinner format.
  // residual: "dinner salon" still needs food — salon is seating, not a food-policy waiver.
  // residual: brunch is seated meal (was missing → SFPL beat office on "quiet brunch").
  // residual: bare "dining" (family-style dining) was missing → SFPL beat kitchen rooms.
  // residual: breakfast was missing (same class as brunch → SFPL beat kitchen on "family breakfast").
  // residual: space/hyphen "food beverage sponsor" is sponsor-gap text, not dinner format
  // multi-resource seed still prefers edible rooms over SFPL/office (draft free-list only).
  const resourceFoodGap =
    multiResourceNeed && /\bfood(?:\s*[\/&-]\s*|\s+)beverage\b/.test(needL);
  const foodServiceFormat =
    /dinner|supper|brunch|breakfast|meal|course|wine\s*tasting|cooking\s*class|\bdining\b/.test(needL) ||
    (/\bfood\b/.test(needL) && !/\bfood(?:\s*[\/&-]\s*|\s+)beverage(\s+sponsor)?\b/.test(needL));
  const talkOnlyNotDinner =
    /\b(talk|salon|lecture|reading|meeting)\b/.test(needL) &&
    !/dinner|supper|brunch|breakfast|meal|course|wine\s*tasting|cooking\s*class|\bdining\b/.test(needL);
  if (foodServiceFormat && /library/.test(blob) && !talkOnlyNotDinner) {
    // free-ask + area still crowned SFPL over in-kind kitchens (draft free-list honesty)
    score -= freeAsked ? 7 : 5;
    reasons.push('no-food-room');
  } else if (resourceFoodGap && /library/.test(blob) && !talkOnlyNotDinner) {
    score -= 2;
    reasons.push('resource-no-food');
  }
  // Seated dinner/supper: boost kitchen/dining/in-kind food rooms only (not bare office loan).
  // residual: "meal" was in foodServiceFormat (no-food-room) but missed here → parks beat kitchen on "family-style meal"
  // residual: food-class (wine tasting/cooking) missed dinner-room → office loan crowned kitchen
  // office-tables boost is separate and already skipped for seatedMeal (draft shortlist honesty).
  if (
    (/dinner|supper|brunch|breakfast|meal|course|\bdining\b/.test(needL) ||
      needIsFoodClass(needL)) &&
    !outdoorAsked &&
    !/library/.test(blob) &&
    !/sponsor tab/i.test(v.cost || '') &&
    !isOfficeish &&
    /in-kind|dinner|kitchen|dining|cafe|demo|showcase/.test(tags + ' ' + blob + ' ' + (v.cost || ''))
  ) {
    score += 3;
    reasons.push('dinner-room');
  }
  // Seated dinner/supper/brunch/meal/dining: free public parks are not dinner rooms (draft match only).
  // -6 so parks sink below free (reserve) indoor rooms (was -4; Yerba still beat Mission Library).
  if (/dinner|supper|brunch|breakfast|meal|course|\bdining\b/.test(needL) && !outdoorAsked && isPublicOutdoor) {
    score -= 6;
    reasons.push('dinner-outdoor');
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
  // residual: bare "game/poker/scrabble night" is format, not after-hours — do not library-hours sink free tables.
  const eveningProbe = needL.replace(
    /\b(?:board\s*games?|game|tabletop|mahjong|mah\s*jong|poker|scrabble|card\s*games?|chess(?:\s*club)?|bridge|trivia|quiz)\s*nights?\b/g,
    ' ',
  );
  const eveningIndoorNeed =
    /\bafter[- ]?hours\b|\bevening\b|\bnight\b/.test(eveningProbe) &&
    !outdoorAsked &&
    (needWantsIndoor(needL) || needWantsQuiet(needL) || needIsDemoFormat(needL));
  if (eveningIndoorNeed) {
    if (isOfficeish || /after-hours|office|in-kind/.test(blob)) {
      score += 5;
      reasons.push('after-hours');
    }
    if (/library/.test(blob) || /library/.test(tags)) {
      // -8: free(+3)+right-size(+2) must not tie/crown SFPL over after-hours office
      score -= 8;
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
  // Explicit "library" ask → SFPL meeting rooms over office/in-kind (draft match only).
  // Skip tool-library / maker lending (already demoted via maker-library).
  if (
    /\blibrary\b/.test(needL) &&
    !/\btool\s*(?:library|share|lending)\b/.test(needL) &&
    (/library/.test(blob) || /library/.test(tags))
  ) {
    score += 4;
    reasons.push('library-ask');
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
    // Podcast/recording: open library rooms are weak (noise, no isolation).
    // -6 so free(+3)+right-size(+2) cannot crown SFPL over office av-private.
    if (/\b(podcast|recording)\b/.test(needL) && (/library/.test(blob) || /library/.test(tags))) {
      score -= 6;
      reasons.push('rec-library');
    }
    if (isPublicOutdoor && !outdoorAsked) {
      score -= 2;
      reasons.push('av-outdoor');
    }
  }
  // Neighborhood affinity (title often has SoMa / Mission / Hayes / FiDi) + near-area aliases.
  // residual-14: "financial district" only — bare "financial" is role title (financial controller).
  // mission bay before bare mission — Mission Bay ≠ Mission Dolores (area honesty)
  const areaNeed =
    /\b(so\s+ma|soma|south\s+of\s+market|south\s+park|south\s+beach|south\s+van\s+ness|van\s+ness|yerba\s+buena|mid[- ]?market|mission\s+bay|mission\s+rock|mission|valencia|hayes|haight|embarcadero|ferry|dolores|castro|eureka\s+valley|marina|potrero|dogpatch|richmond|sunset|fi\s+di|fi?di|financial\s+district|north beach|chinatown|union square|presidio\s+heights|presidio|civic(?:\s+center)?|bernal(?:\s+heights)?|pac\s+heights|pacific\s+heights|russian\s+hill|cow\s+hollow|nob\s+hill|cole\s+valley|tenderloin|noe(?:\s+valley)?|glen\s+canyon|glen park|japantown|little\s+tokyo|stanyan|fillmore|alamo\s+square|bayview|jackson\s+square|twin\s+peaks|treasure\s+island|west\s+portal|excelsior|ingleside|sea\s*cliff|parkside|ocean\s+beach|fort\s+mason|hunter'?s?\s+point|duboce(?:\s+triangle)?|fisherman'?s?\s+wharf|western\s+addition|visitacion(?:\s+valley)?|rincon(?:\s+hill)?|parkmerced|park\s+merced|corona\s+heights|anza\s+vista|lake\s+merced|portola(?:\s+district)?(?!\s+valley)|china\s+basin|telegraph\s+hill|nopa|no\s*pa|laurel\s+heights|diamond\s+heights|polk\s+gulch|merced\s+heights|balboa(?:\s+park)?|crocker[- ]?amazon|little\s+hollywood|merced\s+manor|stonestown|oceanview|north\s+waterfront|ashbury(?:\s+heights)?|cathedral\s+hill|forest\s+hill|midtown\s+terrace|upper\s+market|golden\s+gate\s+park|ggp|golden\s+gate(?:\s+bridge)?|lone\s+mountain|panhandle|moscone|miraloma(?:\s+park)?|silver\s+terrace|india\s+basin|clarendon(?:\s+heights)?|candlestick(?:\s+point)?|mclaren(?:\s+park)?|mount\s+davidson|folsom|crissy(?:\s+field)?|market\s+street|coit\s+tower|washington\s+square|pier\s*39|pier\s*70|sloat|lombard(?:\s+street)?|showplace(?:\s+square)?|design\s+district|central\s+waterfront|islais(?:\s+creek)?|cayuga(?:\s+terrace)?|sunnydale|buena\s+vista|ghirardelli|oracle\s+park|chase\s+center|lincoln\s+way|lake\s+street|lakeside(?:\s+(?:village|district))?|sunnyside(?:\s+(?:district|neighborhood))?|polk\s+street|jordan\s+park|mint\s+plaza|transbay|westwood\s+park|st\.?\s*francis\s+wood|baker\s+beach|land'?s?\s+end|mount\s+sutro|university\s+mound|sherwood\s+forest|divisadero|fort\s+point|china\s+beach|parnassus(?:\s+heights)?|lakeshore|forest\s+knolls|laguna\s+honda|bayshore|city\s+hall|un\s+plaza)\b/i.exec(
      needL,
    );
  if (areaNeed) {
    let tok = areaNeed[1].toLowerCase().trim();
    // Keep "pacific heights" (≠ bernal heights strip that would leave bare "pacific")
    if (tok === 'pacific heights' || tok === 'pac heights') tok = 'pacificheights';
    else if (/^fi\s+di$/.test(tok)) tok = 'fidi';
    else if (/^so\s+ma$/.test(tok)) tok = 'soma';
    else if (tok === 'russian hill') tok = 'russianhill';
    else if (tok === 'cow hollow') tok = 'cowhollow';
    else if (tok === 'nob hill') tok = 'nobhill';
    else if (tok === 'cole valley') tok = 'colevalley';
    else if (tok === 'west portal') tok = 'westportal';
    else if (tok === 'ocean beach') tok = 'oceanbeach';
    else if (/^sea\s*cliff$/.test(tok)) tok = 'seacliff';
    else if (tok === 'fort mason') tok = 'fortmason';
    else if (/^hunter'?s?\s+point$/.test(tok)) tok = 'hunterspoint';
    else if (/^duboce/.test(tok)) tok = 'duboce';
    else if (/^fisherman'?s?\s+wharf$/.test(tok)) tok = 'fishermanswharf';
    else if (tok === 'western addition') tok = 'westernaddition';
    else if (tok === 'rincon hill' || tok === 'rincon') tok = 'rinconhill';
    else if (tok === 'polk street') tok = 'polkstreet';
    else if (tok === 'jordan park') tok = 'jordanpark';
    else if (tok === 'mint plaza') tok = 'mintplaza';
    else if (tok === 'westwood park') tok = 'westwoodpark';
    else if (/^st\.?\s*francis\s+wood$/.test(tok)) tok = 'stfranciswood';
    else if (tok === 'baker beach') tok = 'bakerbeach';
    else if (/^land'?s?\s+end$/.test(tok)) tok = 'landsend';
    else if (tok === 'mount sutro') tok = 'mountsutro';
    else if (tok === 'university mound') tok = 'universitymound';
    else if (tok === 'sherwood forest') tok = 'sherwoodforest';
    else if (tok === 'divisadero') tok = 'divisadero';
    else if (tok === 'fort point') tok = 'fortpoint';
    else if (tok === 'china beach') tok = 'chinabeach';
    else if (/^parnassus/.test(tok)) tok = 'parnassus';
    else if (tok === 'lakeshore') tok = 'lakeshore';
    else if (tok === 'forest knolls') tok = 'forestknolls';
    else if (tok === 'city hall') tok = 'cityhall';
    else if (tok === 'un plaza') tok = 'unplaza';
    else if (tok === 'corona heights') tok = 'coronaheights';
    else if (tok === 'park merced') tok = 'parkmerced';
    else if (tok === 'presidio heights') tok = 'presidioheights';
    else if (tok === 'yerba buena') tok = 'yerbabuena';
    else if (tok === 'south beach') tok = 'southbeach';
    else if (/^mid[- ]market$/.test(tok)) tok = 'midmarket';
    else if (/^visitacion/.test(tok)) tok = 'visitacion';
    else if (tok === 'eureka valley') tok = 'eurekavalley';
    else if (tok === 'anza vista') tok = 'anzavista';
    else if (tok === 'lake merced') tok = 'lakemerced';
    else if (tok === 'china basin') tok = 'chinabasin';
    else if (tok === 'mission rock') tok = 'missionrock';
    else if (tok === 'telegraph hill') tok = 'telegraphhill';
    else if (tok === 'laurel heights') tok = 'laurelheights';
    else if (tok === 'diamond heights') tok = 'diamondheights';
    else if (tok === 'polk gulch') tok = 'polkgulch';
    else if (tok === 'glen canyon') tok = 'glencanyon';
    else if (tok === 'merced heights') tok = 'mercedheights';
    else if (/^portola(?:\s+district)?$/.test(tok)) tok = 'portola';
    else if (/^balboa(?:\s+park)?$/.test(tok)) tok = 'balboa';
    else if (/^crocker[- ]amazon$/.test(tok)) tok = 'crockeramazon';
    else if (tok === 'little hollywood') tok = 'littlehollywood';
    else if (tok === 'little tokyo') tok = 'littletokyo';
    else if (tok === 'merced manor') tok = 'mercedmanor';
    else if (tok === 'north waterfront') tok = 'northwaterfront';
    else if (/^ashbury/.test(tok)) tok = 'ashbury';
    else if (tok === 'cathedral hill') tok = 'cathedralhill';
    else if (tok === 'forest hill') tok = 'foresthill';
    else if (tok === 'midtown terrace') tok = 'midtownterrace';
    else if (tok === 'upper market') tok = 'uppermarket';
    else if (tok === 'golden gate park' || tok === 'ggp') tok = 'goldengatepark';
    else if (tok === 'golden gate' || tok === 'golden gate bridge') tok = 'goldengate';
    else if (tok === 'lone mountain') tok = 'lonemountain';
    else if (/^miraloma/.test(tok)) tok = 'miraloma';
    else if (tok === 'silver terrace') tok = 'silverterrace';
    else if (tok === 'india basin') tok = 'indiabasin';
    else if (/^candlestick/.test(tok)) tok = 'candlestick';
    else if (tok === 'mount davidson') tok = 'mountdavidson';
    else if (/^mclaren(?:\s+park)?$/.test(tok)) tok = 'mclaren';
    else if (/^crissy(?:\s+field)?$/.test(tok)) tok = 'crissyfield';
    else if (tok === 'market street') tok = 'marketstreet';
    else if (tok === 'coit tower') tok = 'coittower';
    else if (tok === 'washington square') tok = 'washingtonsquare';
    else if (/^pier\s*39$/.test(tok)) tok = 'pier39';
    else if (/^pier\s*70$/.test(tok)) tok = 'pier70';
    else if (/^lombard(?:\s+street)?$/.test(tok)) tok = 'lombard';
    else if (tok === 'buena vista') tok = 'buenavista';
    else if (tok === 'showplace square' || tok === 'showplace') tok = 'showplacesquare';
    else if (tok === 'design district') tok = 'designdistrict';
    else if (tok === 'central waterfront') tok = 'centralwaterfront';
    else if (tok === 'islais creek' || tok === 'islais') tok = 'islaiscreek';
    else if (tok === 'oracle park') tok = 'oraclepark';
    else if (tok === 'chase center') tok = 'chasecenter';
    else if (tok === 'lincoln way') tok = 'lincolnway';
    else if (tok === 'lake street') tok = 'lakestreet';
    else if (/^cayuga/.test(tok)) tok = 'cayuga';
    else if (tok === 'sunnydale') tok = 'sunnydale';
    else if (tok === 'south van ness') tok = 'southvanness';
    else if (tok === 'van ness') tok = 'vanness';
    else if (/^lakeside/.test(tok)) tok = 'lakeside';
    else if (/^sunnyside/.test(tok)) tok = 'sunnyside';
    else if (tok === 'laguna honda') tok = 'lagunahonda';
    else if (tok === 'bayshore') tok = 'bayshore';
    // residual: SF_OK has no\s*pa but free-list areaNeed only matched bare nopa
    else if (/^no\s*pa$/.test(tok)) tok = 'nopa';
    else {
      tok = tok.replace(/\s+center$/, '').replace(/\s+heights$/, '').trim();
      if (tok === 'fi' || tok === 'fdi') tok = 'fidi';
      if (tok === 'noe valley') tok = 'noe';
      if (tok === 'financial district') tok = 'financial';
      if (tok === 'south of market' || tok === 'south park') tok = 'soma';
      if (tok === 'mission bay') tok = 'missionbay';
      if (tok === 'alamo square') tok = 'alamo';
    }
    if (areaMatchesNeed(tok, areaL, blob)) {
      score += 4;
      reasons.push('area');
    } else if (
      // residual: dinner free-list is Mission/SoMa kitchen (SFPL no-food); draft only
      foodServiceFormat &&
      isKitchenAsk &&
      areaMatchesNeed('mission', areaL, blob)
    ) {
      score += 4;
      reasons.push('area');
    } else if (!/sf various|various/i.test(areaL)) {
      // -4 so meetup-fit free cards do not beat true area affinity (draft match only)
      score -= 4;
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
  // Cost honesty: true free beats sponsor tab unless explicit sponsor/buyout/café ask (and no free ask).
  // Seated dinner/supper/brunch alone is format, not a sponsor-tab ask (office/in-kind over café buyout).
  // Under-cap free rooms skip free-ask bonus (capacity honesty over free label).
  // SFPL format-blocked needs (evening/Sunday/holiday hours, amp/performance, maker/tool,
  // food-class, all-day/cowork, podcast isolation): still mark free, but no free-ask boost —
  // hours/process/amp, not price, are the block. Otherwise free-ask + right-size crowns closed SFPL
  // over office/in-kind draft leads.
  // Drop-in free public still gets free-ask; free (reserve) under no-reserve skip free-ask.
  const sfplFormatBlocked =
    eveningIndoorNeed ||
    sundayIndoorNeed ||
    holidayIndoorNeed ||
    needIsPerformance(needL) ||
    needIsMakerHardware(needL) ||
    needIsFoodClass(needL) ||
    // residual: free dinner/supper still crowned SFPL via free-ask over in-kind kitchen
    (foodServiceFormat && !outdoorAsked) ||
    (needIsAllDay(needL) && !outdoorAsked) ||
    (needWantsAvQuiet(needL) && /\b(podcast|recording)\b/.test(needL));
  if (isTrueFreeCost(v.cost)) {
    score += 3;
    reasons.push('free');
    const libBlocked =
      (sfplFormatBlocked || drinksAsked || needIsLanGaming(needL)) &&
      (/library/.test(blob) || /library/.test(tags));
    const reserveBlocked = noReserveAsked && /free \(reserve\)/i.test(v.cost || '');
    if (freeAsked && !underCap && !libBlocked && !reserveBlocked) {
      score += 2;
      reasons.push('free-ask');
    }
  }
  if (/sponsor tab/i.test(v.cost || '')) {
    // Explicit free ask / multi-resource gap list → demote sponsor-tab (not free rooms)
    if (freeAsked || multiResourceNeed) {
      // multi-resource: sink past right-size free rooms (draft free-list honesty)
      score -= freeAsked ? 6 : 9;
      reasons.push(freeAsked ? 'not-free-ask' : 'not-free-list');
    } else if (drinksAsked || /sponsor|buyout|café|cafe|\btab\b/.test(needL)) {
      score += 3;
      reasons.push('sponsor-tab');
    } else {
      score -= 2;
      reasons.push('not-free');
    }
  }
  if (/in-kind/i.test(v.cost || '')) {
    // Explicit free ask → demote in-kind (same honesty as sponsor-tab freeAsked).
    // Soften for office when SFPL is format-blocked: free-ask must not crown closed/amp-banned
    // libraries over the only realistic free-list draft lead (office after-hours loan).
    if (freeAsked) {
      // Soften kitchen rooms for food-class + dinner formats (potluck/wine club/cooking),
      // not only foodServiceFormat tokens — else bare office outranks dining via soft-1 vs hard-4.
      const softKitchen =
        isKitchenAsk &&
        !outdoorAsked &&
        (foodServiceFormat || needIsFoodClass(needL));
      const soft =
        sfplFormatBlocked && (isOfficeish || softKitchen);
      score -= soft ? (isOfficeish ? 1 : 0) : 4;
      reasons.push('not-free-ask');
    } else {
      score += 2;
      reasons.push('in-kind');
    }
  }
  // Right-size kitchens (cap~16) must not crown over office tables for collab/AV/food class.
  // Seated dinner/supper: skip office-tables so community dining can outrank bare office loan.
  // residual: wine tasting/cooking class (needIsFoodClass) still got office-tables → bare office > kitchen.
  // freeAsked: skip so true-free rooms beat in-kind office (draft free-list honesty).
  // Draft free-list honesty only — not a booking API.
  const seatedMeal =
    /dinner|supper|brunch|breakfast|meal|course|\bdining\b/.test(needL) ||
    needIsFoodClass(needL) ||
    resourceFoodGap;
  // residual: City Hall/UN Plaza/Civic indoor — office-tables + SoMa area alias crowned
  // office loan over Civic SFPL (draft free-list honesty only; office-need still wins explicit office ask)
  const civicIndoor =
    /\b(city\s+hall|un\s+plaza|civic(?:\s+center)?)\b/.test(needL) &&
    !outdoorAsked &&
    !/\b(office|after-hours|coworking)\b/.test(needL);
  if (
    isOfficeish &&
    nSeats > 0 &&
    cap >= nSeats &&
    !outdoorAsked &&
    !fieldSportAsked &&
    !seatedMeal &&
    !drinksAsked &&
    !freeAsked &&
    !civicIndoor &&
    !needIsBookClub(needL)
  ) {
    score += 3;
    reasons.push('office-tables');
  }
  // Civic indoor free-list is SFPL Main — not Mission/SoMa kitchen right-size (draft only)
  if (civicIndoor && (/library/.test(blob) || /library/.test(tags))) {
    score += 4;
    reasons.push('civic-library');
  }
  // residual: hood-labeled office/demo needs crowned Civic SFPL via area over citywide office loan
  // (Japantown/Fillmore map free indoor → main library; draft free-list honesty only)
  if (
    isOfficeish &&
    /\b(office|after-hours|coworking)\b/.test(needL) &&
    !outdoorAsked &&
    !seatedMeal &&
    !drinksAsked
  ) {
    score += 5;
    reasons.push('office-need');
  }
  if (
    isKitchenAsk &&
    !foodServiceFormat &&
    !needIsFoodClass(needL) &&
    !drinksAsked &&
    !resourceFoodGap
  ) {
    score -= 3;
    reasons.push('kitchen-only');
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
  // residual: free-ask score-ties used capacity-distance before freeCostRank → sponsor-tab café
  // outranked true-free (reserve) on equal scores (draft free-list honesty only).
  const freeAsked = /\bfree\b/.test(String(need || '').toLowerCase());
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
      // Prefer area hit over area-miss when scores tie (draft free-list honesty)
      const aArea = (a.reasons || []).includes('area') ? 1 : 0;
      const bArea = (b.reasons || []).includes('area') ? 1 : 0;
      if (bArea !== aArea) return bArea - aArea;
      // freeAsked: true free before capacity-distance so sponsor-tab cannot win score-ties
      if (freeAsked) {
        const costEarly = freeCostRank(b.cost) - freeCostRank(a.cost);
        if (costEarly) return costEarly;
      }
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
      if (!freeAsked) {
        const costDelta = freeCostRank(b.cost) - freeCostRank(a.cost);
        if (costDelta) return costDelta;
      }
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
  if (!store.activeEvent || (!ae.id && ae.clearedFrom)) {
    return {
      needVenue: false,
      needVenueAlt: false,
      needSponsor: false,
      needVolunteer: false,
      hasVenue: false,
      hasConfirmedVenue: false,
      missing: [],
      queuedKinds: [],
      stage: null,
      topFreeVenue: null,
      excludeIds: [],
    };
  }
  const usableOffer = (o) =>
    o &&
    String(o.status || '').toLowerCase() === 'accepted' &&
    offerIsSf(o) &&
    (!ae.id || !o.eventId || o.eventId === ae.id);
  const sponsors = (store.offers?.sponsor || []).filter((o) => usableOffer(o) && !o.money).length;
  const volunteers = (store.offers?.volunteer || []).filter(usableOffer).length;
  const hasVenue = !!(ae.venue && (ae.venue.name || ae.venue.title));
  const venueTooSmall =
    Number(ae.seats) > 0 && Number(ae.venue?.capacity) > 0 && Number(ae.venue.capacity) < Number(ae.seats);
  const hasConfirmedVenue =
    hasVenue && !venueTooSmall && ae.venue.confirmed === true && !!String(ae.venue.confirmationEvidence || '').trim();
  const venueWeak =
    hasVenue &&
    (ae.venue.source === 'free_list' ||
      ae.venue.source === 'in-kind' ||
      /in-kind|sponsor tab|free public|free \(reserve\)/i.test(String(ae.venue.cost || '')));
  const needVenue = !hasVenue;
  const needVenueAlt = venueWeak; // still want private free/cheap leads
  const needSponsor = sponsors < 1;
  const needVolunteer = volunteers < 1;
  const queuedKinds = [
    ...new Set(
      (store.outreach || [])
        .filter(
          (o) =>
            o &&
            (!ae.id || o.eventId === ae.id) &&
            (o.status === 'queued' || o.status === 'drafted') &&
            isRealOutreachEmail(o.toEmail) &&
            String(o.subject || '').trim().length >= 3 &&
            String(o.body || '').trim().length >= 12,
        )
        .map((o) => o.kind)
        .filter(Boolean),
    ),
  ];
  const missing = [];
  if (needVenue) missing.push('venue');
  // Capacity honesty before weak-alt: seats that don't fit need a bigger room shortlist
  else if (venueTooSmall) missing.push('venue_capacity');
  else if (needVenueAlt) missing.push('venue_alt');
  else if (!hasConfirmedVenue) missing.push('venue_confirmation');
  if (needSponsor) missing.push('sponsor');
  if (needVolunteer) missing.push('volunteer');
  // Draft shortlist only — never a booking claim.
  // Venue_alt / under-cap: exclude current pick (id or free-list name) so top is a real alt.
  let topFreeVenue = null;
  const excludeIds = [];
  if ((needVenueAlt || venueTooSmall) && ae.venue) {
    let vid = ae.venue.id != null ? String(ae.venue.id) : '';
    if (!vid || !FREE_SF_VENUES.some((v) => v.id === vid)) {
      const name = String(ae.venue.name || ae.venue.title || '')
        .toLowerCase()
        .trim();
      // Exact or short label ("SF Main Library" vs free-list long name) — draft exclude honesty.
      const hit = name
        ? FREE_SF_VENUES.find((v) => {
            const vn = String(v.name || '').toLowerCase().trim();
            if (vn === name) return true;
            if (name.length < 8) return false;
            const head = vn.split(/\s*\/\s*/)[0].trim();
            return vn.includes(name) || (head.length >= 8 && name.includes(head));
          })
        : null;
      vid = hit?.id || (FREE_SF_VENUES.some((v) => v.id === vid) ? vid : '');
    }
    if (vid) excludeIds.push(vid);
  }
  // Include venueTooSmall so capacity gaps get a free-list suggestion (draft only).
  if (needVenue || needVenueAlt || venueTooSmall) {
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
    hasConfirmedVenue,
    missing,
    queuedKinds,
    stage: ae.stage || null,
    topFreeVenue,
    excludeIds,
  };
}

export function resourceOutreachCovered(gaps = {}) {
  const queued = (gaps.queuedKinds || []).map(normalizeOutreachKind);
  return (gaps.missing || []).every((kind) => queued.includes(normalizeOutreachKind(kind)));
}

/** Normalize outreach kind aliases for drain (venue_alt / venue_capacity → venue). */
export function normalizeOutreachKind(kind) {
  const k = String(kind || 'other').toLowerCase();
  if (k === 'venue_alt' || k === 'venue-alt' || k === 'venue_capacity' || k === 'venue-capacity')
    return 'venue';
  // Hyphen/short aliases must hit venue_confirmation floor (95), not other (10)
  if (k === 'venue-confirmation' || k === 'venue_confirm' || k === 'confirm_venue')
    return 'venue_confirmation';
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
  else if (isExternalOutreachEmail(o.toEmail) && outreachDraftReadiness(o) >= 3) bits.push('contact-ready');
  // Venue gap closed (needVenue/alt off) → leftover venue drafts are filled for drain labels.
  // Confirmation is preferred evidence but not required when gaps already say venue is done.
  if (
    kind === 'venue' &&
    gaps &&
    !gaps.needVenue &&
    !gaps.needVenueAlt &&
    !(gaps.missing && gaps.missing.includes('venue_capacity'))
  ) {
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
    (o) =>
      o &&
      (o.status === 'queued' || o.status === 'drafted') &&
      (!eventId || o.eventId === eventId),
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
    // venue_confirmation is resource-stage drain; contactable confirm drafts beat stubs (draft only)
    if (
      k === 'venue' ||
      k === 'venue_confirmation' ||
      k === 'sponsor' ||
      k === 'volunteer' ||
      k === 'resource'
    ) {
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
      // Kind floor: stale low stored priority must not tank shortlist-ready venue drafts
      const kindBase = OUTREACH_KIND_PRIORITY[kind] || OUTREACH_KIND_PRIORITY.other;
      const storedPri = Number(o.priority);
      let priority =
        Number.isFinite(storedPri) && storedPri > kindBase ? storedPri : kindBase;
      const whyBits = [];
      // Stage tilt (resource hunting vs RSVP reminders vs post-night)
      const isResourceKind =
        kind === 'venue' ||
        kind === 'venue_confirmation' ||
        kind === 'sponsor' ||
        kind === 'volunteer' ||
        kind === 'resource';
      const openResourceGap = !!(
        gaps &&
        (gaps.needVenue ||
          gaps.needVenueAlt ||
          gaps.needSponsor ||
          gaps.needVolunteer ||
          gaps.missing?.includes('venue_confirmation') ||
          // under-cap room is a resource hole even when needVenueAlt is false
          gaps.missing?.includes('venue_capacity'))
      );
      if (stage === 'resource' || stage === 'ideate') {
        if (isResourceKind) {
          priority += 12;
          whyBits.push('resource-stage');
        }
        // Premature post/RSVP drafts sink while still hunting resources (draft only)
        if (
          String(kind || '').startsWith('rsvp_remind') ||
          kind === 'thanks' ||
          kind === 'feedback_ask'
        ) {
          priority -= 12;
          whyBits.push('premature');
        }
      } else if (stage === 'plan') {
        // Plan stage still drains open resource holes before invite polish (draft only)
        if (openResourceGap && isResourceKind) {
          priority += 10;
          whyBits.push('plan-resource-gap');
        }
      } else if (stage === 'rsvp') {
        if (String(kind || '').startsWith('rsvp_remind')) {
          priority += 15;
          whyBits.push('rsvp-remind');
          // All resource holes closed → guest reminders beat leftover filled resource drafts
          if (gaps && !openResourceGap) {
            priority += 20;
            whyBits.push('rsvp-focus');
          }
        }
        // Still draining open resource holes while RSVP structure is open
        if (openResourceGap && isResourceKind) {
          priority += 8;
          whyBits.push('rsvp-resource-gap');
        }
      } else if (stage === 'run') {
        // Day-of: open volunteer (door/setup) is time-critical over leftover sponsor chase
        if (gaps?.needVolunteer && kind === 'volunteer') {
          priority += 22;
          whyBits.push('day-of-volunteer');
        } else if (openResourceGap && isResourceKind) {
          priority += 6;
          whyBits.push('run-resource-gap');
        }
        if (String(kind || '').startsWith('rsvp_remind') && gaps && !openResourceGap) {
          priority += 8;
          whyBits.push('run-rsvp-trail');
        }
      } else if (stage === 'followup') {
        if (kind === 'thanks' || kind === 'feedback_ask') {
          priority += 12;
          whyBits.push('followup');
        }
        // Post-night: leftover resource recruiting sinks under thanks/feedback (draft only)
        if (isResourceKind) {
          priority -= 60;
          whyBits.push('post-night-resource');
        }
      } else if (stage === 'debrief') {
        if (kind === 'thanks' || kind === 'feedback_ask') {
          priority += 14;
          whyBits.push('debrief-post');
        }
        if (isResourceKind) {
          priority -= 60;
          whyBits.push('post-night-resource');
        }
      }
      // Open gaps (venue_alt / venue_capacity map to venue). Post-night stages skip chase boosts —
      // leftover resource drafts already sink via post-night-resource (draft only).
      const postNight = stage === 'followup' || stage === 'debrief';
      if (gaps && !postNight) {
        // under-cap room: primary missing is venue_capacity (not needVenueAlt) — still chase
        const needVenueCap = !!(gaps.missing && gaps.missing.includes('venue_capacity'));
        if ((gaps.needVenue || gaps.needVenueAlt || needVenueCap) && kind === 'venue') {
          priority += GAP_KIND_BOOST.venue;
          whyBits.push(
            gaps.needVenue ? 'need-venue' : needVenueCap ? 'need-venue-capacity' : 'need-venue-alt',
          );
        }
        // Offer/private room named but unconfirmed → confirmation drafts drain first
        if (gaps.missing?.includes('venue_confirmation') && kind === 'venue_confirmation') {
          priority += GAP_KIND_BOOST.venue_confirmation;
          whyBits.push('need-venue-confirmation');
        }
        // Venue gap closed → sink leftover venue drafts so sponsor/volunteer/rsvp drain
        // (do not sink when capacity gap still open — room named but too small)
        // (do not sink when venue_confirmation still open — pick named, not locked)
        if (
          !gaps.needVenue &&
          !gaps.needVenueAlt &&
          !needVenueCap &&
          !gaps.missing?.includes('venue_confirmation') &&
          kind === 'venue'
        ) {
          // Stronger sink after plan so shortlist leftovers don't beat rsvp_remind/thanks
          const late = stage === 'rsvp' || stage === 'run';
          priority -= late ? 30 : 18;
          whyBits.push('venue-filled');
        }
        if (gaps.needSponsor && kind === 'sponsor') {
          priority += GAP_KIND_BOOST.sponsor;
          whyBits.push('need-sponsor');
        }
        // Sponsor already covered → sink leftover sponsor so volunteer / next gap drains
        if (gaps.needSponsor === false && kind === 'sponsor') {
          const late = stage === 'rsvp' || stage === 'run';
          priority -= late ? 30 : 18;
          whyBits.push('sponsor-filled');
        }
        if (gaps.needVolunteer && kind === 'volunteer') {
          priority += GAP_KIND_BOOST.volunteer;
          whyBits.push('need-volunteer');
        }
        // Volunteer already covered → sink leftover volunteer drafts
        if (gaps.needVolunteer === false && kind === 'volunteer') {
          const late = stage === 'rsvp' || stage === 'run';
          priority -= late ? 30 : 18;
          whyBits.push('volunteer-filled');
        }
        if (gaps.missing?.length && kind === 'resource') {
          priority += GAP_KIND_BOOST.resource;
          whyBits.push('need-resource');
        }
        // Generic resource draft sinks when a specific open-gap kind draft exists (draft only)
        if (kind === 'resource' && openResourceGap) {
          const hasSpecificOpen = list.some((sib) => {
            if (!sib || sib === o) return false;
            const sk = normalizeOutreachKind(sib.kind);
            if (sk === 'resource') return false;
            if (String(sib.eventId || '_') !== String(o.eventId || '_')) return false;
            if (
              (sk === 'venue' &&
                (gaps.needVenue ||
                  gaps.needVenueAlt ||
                  gaps.missing?.includes('venue_capacity'))) ||
              (sk === 'venue_confirmation' && gaps.missing?.includes('venue_confirmation')) ||
              (sk === 'sponsor' && gaps.needSponsor) ||
              (sk === 'volunteer' && gaps.needVolunteer)
            ) {
              return true;
            }
            return false;
          });
          if (hasSpecificOpen) {
            priority -= 10;
            whyBits.push('sibling-specific');
          }
        }
        // Primary missing resource drains first among peers.
        // Run day-of: volunteer is time-critical even when primary gap is still sponsor.
        if (stage === 'run' && gaps.needVolunteer && kind === 'volunteer') {
          priority += 8;
          whyBits.push('primary-gap');
        } else if (
          !(stage === 'run' && gaps.needVolunteer && primaryGap === 'sponsor' && kind === 'sponsor')
        ) {
          if (primaryGap === 'venue' || primaryGap === 'venue_alt' || primaryGap === 'venue_capacity') {
            if (kind === 'venue') {
              priority += 8;
              whyBits.push('primary-gap');
            }
          } else if (primaryGap === 'venue_confirmation' && kind === 'venue_confirmation') {
            priority += 8;
            whyBits.push('primary-gap');
          } else if (primaryGap === 'sponsor' && kind === 'sponsor') {
            priority += 8;
            whyBits.push('primary-gap');
          } else if (primaryGap === 'volunteer' && kind === 'volunteer') {
            priority += 8;
            whyBits.push('primary-gap');
          }
        }
        // Venue draft that names the current top free-list pick drains first (draft only)
        // Skip when venue gap is closed (no top-free chase on filled nights).
        if (
          kind === 'venue' &&
          topFreeNeedle.length &&
          (gaps.needVenue || gaps.needVenueAlt || needVenueCap)
        ) {
          const bodyL = String(o.body || '').toLowerCase();
          if (topFreeNeedle.some((n) => n.length >= 3 && bodyL.includes(n))) {
            priority += 6;
            whyBits.push('top-free-align');
          } else if (outreachHasVenueShortlist(o)) {
            // Shortlist crowns an older free-list pick — sink under live top.
            // -12 cancels shortlist readiness (~+4) + extra so stale cannot outrank aligned (draft only).
            priority -= 12;
            whyBits.push('stale-top-free');
          }
        }
        // venue_alt body that states exclusion/alt honesty drains before generic venue stubs
        if (
          kind === 'venue' &&
          (gaps.needVenueAlt || primaryGap === 'venue_alt') &&
          /alt vs current|excluding current(?: free_list)? pick/i.test(String(o.body || ''))
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
        // Stale "Resource gaps: none" while a resource hole is still open → sink under honest drafts
        // (draft residual-3 — never claims send; drain order honesty only).
        // residual-4: wrong/stale gap-label tokens vs live open gaps (draft drain honesty only).
        if (openResourceGap && isResourceKind) {
          const gapsLine = String(o.body || '').match(/Resource gaps:\s*([^\n.]+)/i);
          if (gapsLine) {
            const labeledRaw = gapsLine[1].trim();
            if (/^\s*none\b/i.test(labeledRaw)) {
              priority -= 6;
              whyBits.push('stale-gap-none');
            } else {
              const labeled = labeledRaw.toLowerCase();
              const labeledKinds = new Set();
              for (const t of labeled.split(/[,;/|]+/)) {
                const s = t.trim();
                if (!s) continue;
                // venue_capacity / venue_confirmation before bare venue (\bvenue\b fails on underscore)
                if (/venue[_-]?alt/.test(s)) labeledKinds.add('venue_alt');
                else if (/venue[_-]?capacity/.test(s)) labeledKinds.add('venue_capacity');
                else if (/venue[_-]?confirmation/.test(s)) labeledKinds.add('venue_confirmation');
                else if (/\bvenue\b/.test(s)) labeledKinds.add('venue');
                else if (/sponsor/.test(s)) labeledKinds.add('sponsor');
                else if (/volunteer/.test(s)) labeledKinds.add('volunteer');
              }
              const openSet = new Set();
              if (gaps.needVenue) openSet.add('venue');
              if (gaps.needVenueAlt) openSet.add('venue_alt');
              if (gaps.needSponsor) openSet.add('sponsor');
              if (gaps.needVolunteer) openSet.add('volunteer');
              for (const m of gaps.missing || []) openSet.add(String(m));
              const labelsOpen = [...labeledKinds].some(
                (k) =>
                  openSet.has(k) ||
                  (k === 'venue' &&
                    (openSet.has('venue_alt') ||
                      openSet.has('venue_capacity') ||
                      openSet.has('venue_confirmation'))) ||
                  (k === 'venue_alt' &&
                    (openSet.has('venue') || openSet.has('venue_capacity'))) ||
                  (k === 'venue_capacity' &&
                    (openSet.has('venue') || openSet.has('venue_alt'))) ||
                  (k === 'venue_confirmation' && openSet.has('venue')),
              );
              if (labeledKinds.size && !labelsOpen) {
                priority -= 5;
                whyBits.push('stale-gap-label');
              }
              // Primary-kind draft whose body labels a different gap → sink under honest gap-label
              if (
                primaryGap &&
                labeledKinds.size &&
                (kind === normalizeOutreachKind(primaryGap) ||
                  (primaryGap === 'venue_alt' && kind === 'venue') ||
                  (primaryGap === 'venue_capacity' && kind === 'venue') ||
                  (primaryGap === 'venue_confirmation' && kind === 'venue_confirmation')) &&
                !labeledKinds.has(primaryGap) &&
                !(primaryGap === 'venue_alt' && labeledKinds.has('venue')) &&
                !(primaryGap === 'venue' && labeledKinds.has('venue_alt')) &&
                !(primaryGap === 'venue_capacity' &&
                  (labeledKinds.has('venue') || labeledKinds.has('venue_alt'))) &&
                !(primaryGap === 'venue_confirmation' && labeledKinds.has('venue')) &&
                !((primaryGap === 'venue' || primaryGap === 'venue_alt') &&
                  labeledKinds.has('venue_capacity'))
              ) {
                priority -= 4;
                whyBits.push('wrong-gap-label');
              }
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
        else if (isExternalOutreachEmail(o.toEmail) && ready >= 3) whyBits.push('contact-ready');
      }
      // Thin venue sinks when a shortlist sibling already exists (drain ready first)
      const sibKey = String(o.eventId || '_') + '::' + kind;
      if (kind === 'venue' && !outreachHasVenueShortlist(o) && shortlistSiblings.has(sibKey)) {
        // Hard sink only thin stubs (under sponsor). Contact-ready external still trails
        // shortlist but stays above next open gap when primary hole is venue (draft only).
        if (ready < 3) {
          priority -= 20;
          whyBits.push('sibling-shortlist');
        } else {
          priority -= 4;
          whyBits.push('sibling-shortlist-soft');
        }
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
        (kind === 'venue' ||
          kind === 'venue_confirmation' ||
          kind === 'sponsor' ||
          kind === 'volunteer' ||
          kind === 'resource')
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
        } else {
          whyBits.push('legacy-unscoped');
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

/** Align shortlist edible filter with scoreFreeVenue foodServiceFormat (draft only). */
function needWantsFoodService(needL) {
  const n = String(needL || '').toLowerCase();
  // residual: space/hyphen "food beverage" = sponsor-gap text (align scoreFreeVenue)
  return (
    /dinner|supper|brunch|breakfast|meal|course|wine\s*tasting|cooking\s*class|\bdining\b/.test(n) ||
    (/\bfood\b/.test(n) && !/\bfood(?:\s*[\/&-]\s*|\s+)beverage(\s+sponsor)?\b/.test(n))
  );
}

/** One-line free-venue shortlist for outreach drafts (draft only). */
export function freeVenueShortlistLines(need, seats, n = 3, excludeIds = []) {
  const needL = String(need || '').toLowerCase();
  // Food-service drafts: drop SFPL no-food-room hits so ranked alts are edible rooms only.
  const foodService = needWantsFoodService(needL);
  let pool = matchFreeVenues({
    need,
    seats,
    limit: foodService ? Math.min(n + 4, FREE_SF_VENUES.length) : n,
    excludeIds,
  });
  if (foodService) {
    const edible = pool.filter((v) => {
      const r = v.reasons || [];
      // SFPL + outdoor parks scored for honesty — not edible draft shortlist (incl. wine/food-class)
      return (
        !r.includes('no-food-room') &&
        !r.includes('dinner-outdoor') &&
        !r.includes('food-outdoor')
      );
    });
    // If edible leads are all excluded, keep ranked free-list so draft shortlist is non-empty.
    pool = edible.length ? edible : pool;
  }
  return pool
    .slice(0, n)
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
 * When venue_alt / venue_capacity, excludes current pick id so ranked lines are real alts.
 */
export function buildVenueResourceOutreachBody(ae = {}, gaps = null, opts = {}) {
  const need = opts.need || eventNeedText(ae, opts.goal || '') || 'meetup';
  const seats = Number(opts.seats) || Number(ae.seats) || 12;
  const g = gaps || { missing: [] };
  // Align with resourceGaps: weak/under-cap → exclude current free-list pick (id or name).
  let excludeIds = opts.excludeIds || g.excludeIds || [];
  const wantEx =
    g.needVenueAlt ||
    (g.missing || []).includes('venue_capacity') ||
    (g.missing || []).includes('venue_alt');
  if (wantEx && ae.venue && !excludeIds.some((id) => FREE_SF_VENUES.some((v) => v.id === id))) {
    let vid = ae.venue.id != null ? String(ae.venue.id) : '';
    if (!vid || !FREE_SF_VENUES.some((v) => v.id === vid)) {
      const name = String(ae.venue.name || ae.venue.title || '')
        .toLowerCase()
        .trim();
      const hit = name
        ? FREE_SF_VENUES.find((v) => {
            const vn = String(v.name || '').toLowerCase().trim();
            if (vn === name) return true;
            if (name.length < 8) return false;
            const head = vn.split(/\s*\/\s*/)[0].trim();
            return vn.includes(name) || (head.length >= 8 && name.includes(head));
          })
        : null;
      vid = hit?.id || '';
    }
    if (vid) excludeIds = [vid];
  }
  const shortlist = freeVenueShortlistLines(need, seats, 3, excludeIds);
  // Live re-rank; same food filter + empty-edible fallback as freeVenueShortlistLines (draft only).
  const needL = String(need || '').toLowerCase();
  const foodService = needWantsFoodService(needL);
  let topPool = matchFreeVenues({
    need,
    seats,
    limit: foodService ? Math.min(7, FREE_SF_VENUES.length) : 1,
    excludeIds,
  });
  if (foodService) {
    const edible = topPool.filter((v) => {
      const r = v.reasons || [];
      return (
        !r.includes('no-food-room') &&
        !r.includes('dinner-outdoor') &&
        !r.includes('food-outdoor')
      );
    });
    // Keep ranked free-list when edible empty so top matches shortlist #1 (not a booking claim).
    topPool = edible.length ? edible : topPool;
  }
  const top = topPool[0] || null;
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
    (excludeIds.length ? ' — excluding current pick' : '') +
    ':\n' +
    shortlist +
    '\n\nSend better free/cheap SF rooms if you have them. I own the night and will update the plan. Draft queue only — no auto-send.'
  );
}

function stageChecklist(stage, ae = {}) {
  const title = ae.title || 'the night';
  const map = {
    ideate: [
      { id: 'idea_title', text: 'Lock title + audience + outcome for ' + title },
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

/** Planning targets only — never names, invitations, or RSVP claims. */
export function defaultGuestMix(ae = {}) {
  const seats = Math.max(1, Number(ae.seats) || 12);
  const core = Math.ceil(seats / 2);
  const adjacent = Math.floor((seats - core) / 2);
  const audience = eventAudienceBrief(ae).audience;
  return {
    status: 'planning_target',
    seats,
    cohorts: [
      { label: 'core participants', target: core, fit: audience || 'directly aligned with the event outcome' },
      { label: 'adjacent builders', target: adjacent, fit: 'useful neighboring experience or perspective' },
      { label: 'connectors + new voices', target: seats - core - adjacent, fit: 'trusted SF connectors and people outside the usual circle' },
    ],
    note: 'Target mix only — not invited, confirmed, or attended. Intros require mutual yes.',
  };
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
    (ae.audience ? 'For: ' + ae.audience + '\n' : '') +
    (ae.outcome ? 'Why: ' + ae.outcome + '\n\n' : '') +
    (ae.inviteUrl ? 'RSVP: ' + ae.inviteUrl : 'RSVP by reply (or invite link when live)') +
    '. Counts stay empty until a real yes — no fake RSVPs.\n\n— Events Bot (by Demigod)'
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
  const audienceBrief = eventAudienceBrief(ae);
  const lifecycleInvalid =
    !audienceBrief.ok || !Number.isInteger(Number(ae.seats)) || Number(ae.seats) < 1;
  const gaps = resourceGaps(store);
  const queuedItems = (store.outreach || []).filter(
    (o) =>
      o &&
      (o.status === 'queued' || o.status === 'drafted') &&
      (!ae.id || o.eventId === ae.id),
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
  const hasPf = (store.platforms?.partiful || []).some((p) => platformRowMatchesEvent(p, ae));
  const hasTally = !!ae.rsvpTally?.openedAt;
  const hasRemind =
    !!ae.rsvpTally?.remindersQueued ||
    (store.outreach || []).some(
      (o) =>
        o.eventId === ae.id &&
        /^rsvp_remind_t(?:3|1)d$/.test(o.kind || '') &&
        ['queued', 'drafted', 'sent'].includes(o.status),
    );
  const freeHint = gaps.topFreeVenue
    ? `"${gaps.topFreeVenue.name}" (${gaps.topFreeVenue.area || 'SF'} · ${gaps.topFreeVenue.cost || 'free'} — heuristic, not booked)`
    : null;

  // { do, why } — do is first-person infinitive after "I'll "
  const steps = [];
  const push = (doit, why) => steps.push({ do: doit, why: why || null });
  let blocker = null;
  let recovery = null;
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
  } else if (lifecycleInvalid) {
    push('repair audience + outcome + seats from real evidence', 'lifecycle invariant');
    blocker = 'lifecycle invariant';
  } else if (stage === 'ideate') {
    if (!ae.dateWindows?.length) push('pick 1–3 SF date windows', 'need SF timing');
    // Advance-first only when the audience promise + logistics are ready.
    const ideateReady = !!(ae.audience && ae.outcome && ae.seats && ae.dateWindows?.length);
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
    if (gaps.hasConfirmedVenue && !gaps.needVenue) {
      steps.unshift({ do: 'advance to plan now that venue is set', why: 'venue locked · soft gaps can trail' });
    } else if (hasVenue && !gaps.needVenueAlt) {
      push('confirm the SF venue with evidence', 'plan gate requires a confirmed room');
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
    if (!gaps.needVenue && !gaps.hasConfirmedVenue) {
      push('confirm the SF venue with evidence', 'rsvp gate requires a confirmed room');
    }
    // The canonical lifecycle gate owns readiness; planner copy must never drift from it.
    const rsvpGate = canAdvanceStage('plan', 'rsvp', ae, store);
    const planArtifactsReady = rsvpGate.ok;
    if (!rsvpGate.ok) {
      blocker = { reason: rsvpGate.reason, from: rsvpGate.from, to: rsvpGate.to };
      if (rsvpGate.reason === 'need_future_datetime') {
        recovery = {
          tool: 'record_schedule',
          field: 'start',
          requiresEvidence: true,
          note: 'Record a real timezone-aware future SF datetime; never infer or invent one.',
        };
        steps.unshift({
          do: 'record a real timezone-aware future SF datetime with record_schedule',
          why: 'rsvp gate requires schedule evidence',
        });
      }
    }
    if (planArtifactsReady && !steps.some((s) => /advance to rsvp/i.test(s.do))) {
      steps.unshift({
        do: 'advance to rsvp and open tally structure (null until real)',
        why: 'plan artifacts ready · soft gaps can trail · no fake RSVPs',
      });
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
    if (!hasRemind) {
      if (rsvpRemindersReady(ae)) push('queue T-3d + T-1d reminder drafts (not sent)', 'reminders pending');
      else if (!hasFutureDateTime(ae)) push('lock a future SF datetime before reminder drafts', 'dated start required');
      else push('attach a real nonempty recipient list before reminder drafts', 'real recipients required');
    }
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
      hasTally && hasRemind && hasFutureDateTime(ae) && countsNull && queued === 0 && !gaps.needVenue;
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
    const followupGate = canAdvanceStage('run', 'followup', ae, store);
    if (!runArtifactsReady) {
      if (!hasChecklist && !hasHostFrame) {
        push('print day-of checklist + host frame and run the SF room', 'day-of');
      } else if (!hasChecklist) {
        push('print day-of checklist (host frame ready) and run the SF room', 'day-of checklist');
      } else {
        push('print host frame (checklist ready) and run the SF room', 'day-of host frame');
      }
    } else if (!followupGate.ok) {
      blocker = { reason: followupGate.reason, from: followupGate.from, to: followupGate.to };
      push('hold run until explicit host-close evidence says the SF night ended', 'followup gate requires host-attested close evidence');
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
        o.eventId === ae.id &&
        (o.kind === 'thanks' || /thank/i.test(String(o.kind || ''))) &&
        (o.status === 'queued' || o.status === 'drafted'),
    );
    const debriefGate = canAdvanceStage('followup', 'debrief', ae, store);
    // A thank-you draft is workflow progress, not debrief evidence.
    if (!hasThanks) {
      push('queue thank-yous + feedback; intros only on mutual yes', 'post-night');
    } else if (!debriefGate.ok) {
      blocker = { reason: debriefGate.reason, from: debriefGate.from, to: debriefGate.to };
      recovery = {
        tool: 'record_debrief',
        requiresEvidence: true,
        note: 'Record host-attested debrief notes or outcomes; never invent attendance.',
      };
      push('record real debrief evidence with record_debrief before advancing', 'debrief gate requires host-attested evidence');
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

  // Vague "Thu eve" style windows are planning preferences, not schedule candidates.
  const windowList = Array.isArray(ae.dateWindows)
    ? ae.dateWindows.map((w) => String(w || '').trim()).filter(Boolean)
    : [];
  const hasConcreteSchedule = hasFutureDateTime(ae);
  const planningPreferencesOnly = windowList.length > 0 && !hasConcreteSchedule;
  if (planningPreferencesOnly) {
    push(
      'treat date windows as planning preferences only until record_schedule has a real timezone-aware future start',
      'vague windows · not schedule candidates',
    );
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
    blocker,
    recovery,
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
    schedule: {
      dateWindows: windowList,
      planningPreferencesOnly,
      hasFutureDatetime: hasConcreteSchedule,
      note: planningPreferencesOnly
        ? 'dateWindows are planning preferences only — not RSVP-ready schedule candidates'
        : hasConcreteSchedule
          ? 'has timezone-aware future start'
          : 'no date windows yet',
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
  // Host labels often use gerund/plural forms ("planning", "RSVPs", "resourcing")
  const map = {
    ideating: 'ideate',
    resourcing: 'resource',
    planning: 'plan',
    rsvping: 'rsvp',
    rsvps: 'rsvp',
    running: 'run',
    followups: 'followup',
    follow: 'followup',
    debriefing: 'debrief',
    debriefnext: 'debrief',
    done: 'debrief',
  };
  const id = map[x] || x;
  return STAGES.includes(id) ? id : null;
}

/**
 * Fail-closed stage advance: one step forward only, with evidence gates.
 * Pure — no IO. Never invents RSVPs.
 * @returns {{ ok: boolean, reason?: string, from?: string, to?: string, next?: string }}
 */
/**
 * Pure: real published invite for this night (Partiful, Luma, or native Demigod page)?
 * Checks ae.published_url|inviteUrl + platforms rows (status published_url + real https).
 * Never invents; fail-closed.
 */
export function hasPublishedInviteUrl(ae = {}, store = {}) {
  const tryUrl = (u) => {
    if (!u) return false;
    return (
      isRealInviteUrl(u, 'partiful') ||
      isRealInviteUrl(u, 'luma') ||
      isRealInviteUrl(u, 'demigod')
    );
  };
  if (tryUrl(ae.published_url || ae.publishedUrl || ae.inviteUrl)) return true;
  const title = String(ae.title || '')
    .trim()
    .toLowerCase();
  const id = ae.id || null;
  for (const kind of ['partiful', 'luma', 'demigod']) {
    for (const p of store?.platforms?.[kind] || []) {
      if (!p || String(p.status || '') !== 'published_url') continue;
      const sameEvent = !!(id && p.eventId === id);
      const sameTitle =
        !!(!p.eventId && title && String(p.title || '').trim().toLowerCase() === title);
      if (!sameEvent && !sameTitle && kind !== 'demigod') continue;
      // demigod rows: also match by id prefix dg_<eventId>
      if (kind === 'demigod' && !sameEvent && !sameTitle) {
        const pid = String(p.id || '');
        if (!(id && (pid === id || pid === 'dg_' + id))) continue;
      }
      if (tryUrl(p.inviteUrl || p.publishedUrl)) return true;
    }
  }
  return false;
}

function scheduledDateTime(value) {
  const text = String(value || '').trim();
  if (text.endsWith('-00:00')) return null;
  const match = text.match(/^(\d{4})-(\d\d)-(\d\d)T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
    ? Date.parse(text)
    : null;
}

/** A schedulable, timezone-aware future start; vague windows must not unlock RSVPs. */
export function hasFutureDateTime(ae = {}, now = Date.now()) {
  return Array.isArray(ae.dateWindows) && ae.dateWindows.some((value) => scheduledDateTime(value) > now);
}

/** Reminder templates are useful only after a real guest list and dated start exist. */
export function rsvpRemindersReady(ae = {}, now = Date.now()) {
  return hasFutureDateTime(ae, now) && ae.rsvpTally?.realList === true && Number(ae.outcomes?.invited) > 0;
}

/** Run starts only when a real scheduled datetime has arrived and the host says it is underway. */
export function runStartReady(ae = {}, evidence = '', now = Date.now()) {
  const starts = Array.isArray(ae.dateWindows)
    ? ae.dateWindows.map(scheduledDateTime).filter((start) => start != null)
    : [];
  if (!starts.length) return false;
  const past = starts.filter((start) => start <= now);
  const future = starts.filter((start) => start > now);
  // Unresolved alternatives: a past candidate must not start the night while another
  // future window is still open (swarm P1 — fail closed until one start is finalized).
  if (future.length > 0) return false;
  if (!past.length) return false;
  return /\b(?:doors? (?:are )?open|we(?:'re| are) (?:at|in) the venue|event (?:is )?starting|starting now|night is underway)\b/i.test(
    String(evidence),
  );
}

export function canAdvanceStage(from, to, ae = {}, store = {}, evidence = '') {
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
    const brief = eventAudienceBrief(ae);
    if (!brief.ok || !Number.isInteger(Number(ae.seats)) || Number(ae.seats) < 1) return { ok: false, reason: 'need_audience_outcome_and_seats', from: f, to: t };
  }
  if (ti >= STAGES.indexOf('plan')) {
    const brief = eventAudienceBrief(ae);
    if (!brief.ok || !Number.isInteger(Number(ae.seats)) || Number(ae.seats) < 1) return { ok: false, reason: 'need_audience_outcome_and_seats', from: f, to: t };
    if (!String(venueName || '').trim()) return { ok: false, reason: 'need_venue', from: f, to: t };
    const venueCity = typeof ae.venue === 'object' ? String(ae.venue.city || '').trim() : '';
    const venueLocation = typeof ae.venue === 'object'
      ? [ae.venue.name, ae.venue.area, ae.venue.city, ae.venue.location].filter(Boolean).join(' ')
      : venueName;
    if (mentionsNonSf(venueLocation) || (venueCity && !SF_OK.test(venueCity))) return { ok: false, reason: 'need_sf_venue', from: f, to: t };
    if (ae.venue?.confirmed !== true || !String(ae.venue.confirmationEvidence || '').trim()) return { ok: false, reason: 'need_confirmed_venue', from: f, to: t };
    const seats = Number(ae.seats);
    const capacity = Number(ae.venue?.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return { ok: false, reason: 'need_venue_capacity', from: f, to: t };
    }
    if (Number.isFinite(seats) && seats > 0 && capacity < seats) {
      return { ok: false, reason: 'venue_capacity_below_seats', from: f, to: t };
    }
  }
  if (t === 'rsvp') {
    if (!hasFutureDateTime(ae)) return { ok: false, reason: 'need_future_datetime', from: f, to: t };
    if (!ae.agenda) return { ok: false, reason: 'need_agenda', from: f, to: t };
    if (!Array.isArray(ae.guestMix?.cohorts) || !ae.guestMix.cohorts.length) {
      return { ok: false, reason: 'need_guest_mix', from: f, to: t };
    }
    const hasPf = (store.platforms?.partiful || []).some((p) => platformRowMatchesEvent(p, ae));
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
          'Need a published invite URL before run: open native Demigod RSVPs (open_native_rsvps / ops) or record a real Partiful/Luma URL. Never invent RSVPs.',
        from: f,
        to: t,
      };
    }
    if (process.env.DEMIGOD_EVENTS_BOT_MOCK !== '1' && !runStartReady(ae, evidence)) {
      const unresolved = Array.isArray(ae.dateWindows) && ae.dateWindows.length > 1;
      return {
        ok: false,
        reason: 'need_reached_start_and_host_evidence',
        message: unresolved
          ? 'Resolve alternative dates with record_schedule using one real future timezone-aware start.'
          : 'Wait for the scheduled start and provide host evidence that the night is underway.',
        ...(unresolved ? { nextAction: { tool: 'record_schedule', eventId: ae.id } } : {}),
        from: f,
        to: t,
      };
    }
  }
  if (t === 'followup') {
    // Always require host-close language (MOCK must not invent night-ended).
    if (
      !/\b(?:night|event) (?:happened|went|is over|ended|closed|ran|is done)\b/i.test(String(evidence))
    ) {
      return { ok: false, reason: 'need_host_close_evidence', from: f, to: t };
    }
  }
  if (t === 'debrief') {
    if (!ae.debrief && !ae.debriefNotes && !ae.outcomes?.debriefAt) {
      return { ok: false, reason: 'need_debrief_evidence', from: f, to: t };
    }
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
  // Chit-chat / stage questions — not advance intents (before go/move matchers;
  // residual: should/shall — "should we go to plan?" must stay null)
  if (/^(?:what|which|how|why|when|where|who|is|are|do|does|can|could|would|should|shall)\b/.test(t.trim())) return null;
  // Stage token: bare ids + host gerund/plural labels (normalizeStage maps)
  // Longer forms first so "planning" does not fall through as bare "plan"
  const STAGE =
    '(ideating|ideate|resourcing|resource|planning|plan|rsvping|rsvps|rsvp|running|run|follow[- ]?ups?|followups?|debriefing|debrief)';
  // Explicit "advance/move/set/hop stage to|into|: X" wins (colon forms common in chat)
  // residual: progress|transition|switch|promote|push|nudge|flip|take|put (host synonyms)
  // residual: optional over/ahead/forward/now filler ("switch over to resource")
  // residual: put us in|on resource (host "in/on" preposition; to|into already covered)
  const m = t.match(
    new RegExp(
      String.raw`\b(?:advance|move|set|go|hop|jump|progress|transition|switch|promote|push|nudge|flip|enter|take|put|shift|proceed|roll)\s+(?:(?:us|me)\s+)?(?:(?:over|ahead|forward|now)\s+)?(?:(?:the\s+)?(?:stage|lifecycle)\s+)?(?:(?:to|into|in|on)\s*|:\s*)?${STAGE}\b`,
    ),
  );
  if (m) return normalizeStage(m[1].replace(/[- ]/g, ''));
  // "next stage is plan" / "stage: rsvp" / "lifecycle → followup" / "next phase: plan"
  const m2 = t.match(
    new RegExp(
      String.raw`\b(?:next\s+)?(?:stage|lifecycle|phase)\s*(?:is|to|=|:|→|->)\s*${STAGE}\b`,
    ),
  );
  if (m2) return normalizeStage(m2[1].replace(/[- ]/g, ''));
  // "into planning" / "time to rsvp" / "time for planning" (chit-chat questions already null)
  const mInto = t.match(new RegExp(String.raw`\b(?:into|time to|time for)\s+(?:the\s+)?${STAGE}\b`));
  if (mInto) return normalizeStage(mInto[1].replace(/[- ]/g, ''));
  // residual: "let us resource" / "let's plan" / "lets rsvp" ("let me" stays out)
  const mLet = t.match(new RegExp(String.raw`\blet(?:'s|s)?\s+(?:us\s+)?${STAGE}\b`));
  if (mLet) return normalizeStage(mLet[1].replace(/[- ]/g, ''));
  // residual: "mark as planning" / "mark this as rsvp" / "mark the stage plan"
  const mMark = t.match(
    new RegExp(
      String.raw`\bmark\s+(?:(?:this|us|it|(?:the\s+)?(?:night|event)|current\s+stage|(?:the\s+)?(?:stage|lifecycle))\s+)?(?:as\s+)?${STAGE}\b`,
    ),
  );
  if (mMark) return normalizeStage(mMark[1].replace(/[- ]/g, ''));
  // "planning stage" / "resourcing stage please" (label before the word stage)
  const m3 = t.match(new RegExp(String.raw`\b${STAGE}\s+stage\b`));
  if (m3) return normalizeStage(m3[1].replace(/[- ]/g, ''));
  if (/\bdebrief(?:ing)?\b/.test(t)) return 'debrief';
  if (
    // residual: has/have ended; doors are closed; we wrapped the night (wrap up already)
    /\b((?:night|event) (?:(?:has|have) )?(?:happened|went|is over|ended|closed|ran|is done|finished|wrapped(?: up)?)|wrap(?:ping)? up(?: the (?:night|event))?|we wrapped(?: up)?(?: the (?:night|event))?|close out the (?:night|event)|finished the (?:night|event)|doors? (?:are )?closed|post[- ]?event|after the night|follow[- ]?up stage|start follow[- ]?up|begin follow[- ]?up|kick[- ]?off follow[- ]?up|time for follow[- ]?up|ready (?:to|for) follow[- ]?up)\b/.test(
      t,
    )
  ) {
    return 'followup';
  }
  if (
    /\b(day[- ]?of|we'?re live|running (the )?night|start the run|begin (?:the )?run|stage run|ready to run|ready for run|doors? (?:are )?open|we(?:'re| are) (?:at|in) the venue|event (?:is )?starting|starting now|night is underway)\b/.test(
      t,
    )
  ) {
    return 'run';
  }
  if (
    /\b(open (?:the )?rsvps?(?:ing)?(?: window)?|start rsvps?(?:ing)?|kick[- ]?off rsvps?(?:ing)?|ready for rsvps?(?:ing)?|ready to rsvps?(?:ing)?|rsvp stage|begin rsvps?(?:ing)?)\b/.test(t)
  ) {
    return 'rsvp';
  }
  if (
    /\b(ready for plann?ing|ready to plan(?:ning)?|start (?:the )?plann?ing(?:\s+phase)?|begin plann?ing|kick[- ]?off plann?ing|plan stage|planning stage|venue (is )?(ready|locked|secured|confirmed|set)|we have (a |the )?venue)\b/.test(
      t,
    )
  ) {
    return 'plan';
  }
  if (
    /\b(resource stage|resourcing stage|start (?:the )?resourc(?:e|ing)(?:\s+phase)?|begin resourc(?:e|ing)|kick[- ]?off resourc(?:e|ing)|ready to resource|ready for resourc(?:e|ing))\b/.test(
      t,
    )
  ) {
    return 'resource';
  }
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
    const gate = canAdvanceStage(store.activeEvent.stage, next, store.activeEvent, store, opts.goal || note);
    if (!gate.ok) {
      return {
        ok: false,
        error: gate.reason || 'advance_denied',
        from: store.activeEvent.stage,
        to: target,
        next: gate.next || next,
        blockedAt: next,
        message: gate.message,
        nextAction: gate.nextAction,
        log,
      };
    }
    const r = runTool('set_stage', { stage: next, note: note + ` (${from}→${next})`, evidence: opts.goal || note });
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
  ae.checklist = stageChecklist('rsvp', ae);
  ae.outcomes = ae.outcomes || {};
  if (ae.outcomes.invited === undefined) ae.outcomes.invited = null;
  if (ae.outcomes.confirmed === undefined) ae.outcomes.confirmed = null;
  if (ae.outcomes.attended === undefined) ae.outcomes.attended = null;
  if (ae.outcomes.invited === 0 && !ae.rsvpTally?.realList) ae.outcomes.invited = null;
  if (ae.outcomes.confirmed === 0 && !ae.rsvpTally?.realList) ae.outcomes.confirmed = null;
  if (ae.outcomes.attended === 0 && !ae.rsvpTally?.realList) ae.outcomes.attended = null;
  syncActiveEventToList(store);
  saveStore(store);

  if (!ae.rsvpTally?.openedAt) {
    ae.rsvpTally = {
      openedAt: now,
      channel: nativeRsvpIsOpen(ae, store)
        ? 'Demigod native RSVP'
        : hasPublishedInviteUrl(ae, store)
          ? 'Published platform RSVP'
          : 'email / invite link when live',
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

  const hasReminder = (kind, source = store) =>
    (source.outreach || []).some(
      (o) => o.eventId === ae.id && o.kind === kind && ['queued', 'drafted', 'sent'].includes(o.status),
    );
  const remindersReady = rsvpRemindersReady(ae);
  if (!remindersReady) {
    const before = store.outreach.length;
    store.outreach = (store.outreach || []).filter(
      (o) => o.eventId !== ae.id || !/^rsvp_remind_t(?:3|1)d$/.test(o.kind || '') || o.status === 'sent',
    );
    if (store.outreach.length !== before) saveStore(store);
  }
  const hasT3 = hasReminder('rsvp_remind_t3d');
  const hasT1 = hasReminder('rsvp_remind_t1d');
  if (remindersReady && !hasT3) {
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
  if (remindersReady && !hasT1) {
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
    const remindersQueued =
      remindersReady && ['rsvp_remind_t3d', 'rsvp_remind_t1d'].every((kind) => hasReminder(kind, store));
    ae.rsvpTally.channel = nativeRsvpIsOpen(ae, store)
      ? 'Demigod native RSVP'
      : hasPublishedInviteUrl(ae, store)
        ? 'Published platform RSVP'
        : 'email / invite link when live';
    ae.rsvpTally.remindersQueued = remindersQueued;
    ae.updatedAt = now;
    if (Array.isArray(ae.checklist)) {
      ae.checklist = ae.checklist.map((c) =>
        c.id === 'rsvp_tally' ? { ...c, done: true } : c.id === 'rsvp_remind' ? { ...c, done: remindersQueued } : c,
      );
    }
    syncActiveEventToList(store);
    saveStore(store);
  }
  return { ok: true };
}

/** Keep store.events[] in sync with activeEvent (stage advancement quality). */
export function reconcileLifecycleNotes(notes, stage) {
  const stageIndex = STAGES.indexOf(normalizeStage(stage));
  if (stageIndex < 0) return String(notes || '');
  return String(notes || '')
    .split('\n')
    .filter((line) => {
      const tagged = line.match(/^\s*\[([^\]]+)\]/);
      return !tagged || STAGES.indexOf(normalizeStage(tagged[1])) <= stageIndex;
    })
    .join('\n');
}

export function syncActiveEventToList(store) {
  if (!store?.activeEvent?.id) return store;
  store.activeEvent.notes = reconcileLifecycleNotes(store.activeEvent.notes, store.activeEvent.stage);
  store.events = Array.isArray(store.events) ? store.events : [];
  const id = store.activeEvent.id;
  const i = store.events.findIndex((e) => e && e.id === id);
  const snap = { ...store.activeEvent };
  if (i >= 0) store.events[i] = snap;
  else store.events.push(snap);
  return store;
}

/** Drop invite artifacts that cannot honestly exist before RSVP readiness. */
export function reconcilePlatformDrafts(store) {
  const ae = store?.activeEvent;
  const stageIndex = STAGES.indexOf(normalizeStage(ae?.stage));
  const beforePlan = stageIndex < STAGES.indexOf('plan');
  const nativePremature = stageIndex < STAGES.indexOf('rsvp');
  if (!ae?.id || (!beforePlan && !nativePremature)) return 0;
  store.platforms ||= {};
  let removed = 0;
  for (const platform of beforePlan ? ['partiful', 'luma'] : []) {
    const rows = store.platforms?.[platform] || [];
    store.platforms[platform] = rows.filter((row) => {
      const matches = row?.eventId === ae.id || (!row?.eventId && normTitle(row?.title) === normTitle(ae.title));
      const stale = row?.status === 'draft' && matches;
      if (stale) removed++;
      return !stale;
    });
  }
  const hasNativeRsvps = (store.rsvps || []).some(
    (row) =>
      row?.eventId === ae.id &&
      row?.source === 'demigod_native' &&
      row?.status === 'yes' &&
      Boolean(String(row?.name || '').trim()) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row?.email || '')),
  );
  if (!hasNativeRsvps) {
    const nativeRows = store.platforms.demigod || [];
    store.platforms.demigod = nativeRows.filter((row) => {
      const stale = row?.eventId === ae.id || row?.id === 'dg_' + ae.id;
      if (stale) removed++;
      return !stale;
    });
    for (const field of ['inviteUrl', 'published_url', 'publishedUrl']) {
      try {
        const url = new URL(ae[field]);
        if (isRealInviteUrl(url.href, 'demigod') && url.searchParams.get('id') === ae.id) {
          delete ae[field];
          removed++;
        }
      } catch {
        /* not a native invite URL */
      }
    }
    if (ae.rsvpTally?.source === 'demigod_native') {
      delete ae.rsvpTally;
      removed++;
    }
  }
  if (beforePlan && ae.inviteDraft) {
    delete ae.inviteDraft;
    removed++;
  }
  if (removed) syncActiveEventToList(store);
  return removed;
}

function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function platformRowMatchesEvent(row, event) {
  return event?.id
    ? row?.eventId === event.id
    : normTitle(row?.title) === normTitle(event?.title);
}

/**
 * Offer is SF-eligible (hard rule).
 * City uses full isSfLocation. Free-text only hard-rejects NON_SF cities —
 * bare "loft"/"space"/"warehouse" offer blurbs must not fail a real SF city row.
 */
export function offerIsSf(o = {}) {
  const city = String(o.city || '').trim();
  if (city && (!isSfLocation(city) || !SF_OK.test(city))) return false;
  // Include location/notes/address so SF-looking names cannot mask non-SF rooms.
  const blob = [o.offer, o.org, o.name, o.venue, o.location, o.notes, o.address]
    .filter(Boolean)
    .join(' ');
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
    // SF signal in city (already filtered; small bonus for explicit SF)
    if (SF_OK.test(String(o.city || '')) || SF_OK.test(blob)) s += 1;
    return s;
  };

  const offerCounts = {};
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
    const ranked = eligible
      .filter((o) => isRealOutreachEmail(o.email))
      .filter((o) => {
        if (kind !== 'venue' || !seats || o.capacity == null || o.capacity === '') return true;
        return Number(o.capacity) >= seats;
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
        _at: Date.parse(o.at || o.createdAt || '') || 0,
        // no email in match rows — drain uses private store
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b._at - a._at ||
          String(b.id || '').localeCompare(String(a.id || '')),
      );
    offerCounts[kind] = ranked.length;
    return ranked
      .slice(0, 10)
      .map(({ _at, ...offer }) => offer);
  };

  const venues = rankKind(store.offers?.venue, 'venue');
  const sponsors = rankKind(store.offers?.sponsor, 'sponsor', (o) => !o.money);
  const volunteers = rankKind(store.offers?.volunteer, 'volunteer');
  // Exclude current weak pick (align resourceGaps.venueWeak — alt shortlist honesty)
  const freeExclude = [];
  if (
    ae.venue?.id &&
    (ae.venue.source === 'free_list' ||
      ae.venue.source === 'in-kind' ||
      /in-kind|sponsor tab|free public|free \(reserve\)/i.test(String(ae.venue.cost || '')))
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
    offerCounts,
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
 * Ranking does not reserve offers; explicit selection owns event binding.
 */
export function stampOfferMatches(store) {
  if (!store?.activeEvent?.id) return null;
  const matched = matchOffersToEvent(store);
  const ae = store.activeEvent;
  const top = matched.top || {};
  const next = {
    venueId: top.venue?.id || null,
    sponsorId: top.sponsor?.id || null,
    volunteerId: top.volunteer?.id || null,
    venueScore: top.venue?.score ?? null,
    sponsorScore: top.sponsor?.score ?? null,
    volunteerScore: top.volunteer?.score ?? null,
  };
  const current = ae.matchedOffers || {};
  let changed = Object.entries(next).some(([key, value]) => current[key] !== value);
  if (changed) {
    const at = new Date().toISOString();
    ae.matchedOffers = { ...next, at };
    ae.updatedAt = at;
  }
  return { ...matched, changed };
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
          audience: { type: 'string', description: 'Specific SF people this event is for' },
          outcome: { type: 'string' },
          seats: { type: 'integer' },
          needs: { type: 'string', description: 'Sponsors, venue, volunteers needed' },
          sponsorable: { type: 'string', description: 'Why a sponsor might fund this' },
          source: { type: 'string', description: 'bot|user|feedback' },
        },
        required: ['title', 'audience', 'outcome'],
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
      description: 'Create/activate a local event from an idea at the ideate lifecycle stage.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          audience: { type: 'string', description: 'Specific SF people this event is for' },
          outcome: { type: 'string' },
          seats: { type: 'integer' },
          dateWindows: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['title', 'audience', 'outcome'],
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
            description: 'sponsor|venue|venue_confirmation|volunteer|resource|feedback_ask|other',
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
        'Prepare a ready-to-paste Luma event brief. Never creates or publishes externally.',
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
          audience: { type: 'string' },
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
          confirmed: { type: 'boolean', description: 'True only with real host/venue confirmation evidence' },
          confirmationEvidence: { type: 'string', description: 'Real confirmation note or receipt reference; required when confirmed is true' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_schedule',
      description: 'Record one real timezone-aware future start for the active SF event. Never infer vague dates.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          start: { type: 'string', description: 'ISO datetime with Z or numeric timezone offset' },
        },
        required: ['eventId', 'start'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event_details',
      description: 'Update active event fields: dateWindows, seats, agenda, notes, audience, outcome.',
      parameters: {
        type: 'object',
        properties: {
          dateWindows: { type: 'array', items: { type: 'string' } },
          seats: { type: 'integer' },
          agenda: { type: 'string' },
          notes: { type: 'string' },
          audience: { type: 'string' },
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
  // PII (contacts/offers/RSVPs/financial intent) — the live SoR must be 0600. saveStore writes new
  // files 0600, but a legacy or externally-created file can be group/world-readable; repair on read.
  try {
    if ((fs.statSync(STORE).mode & 0o077) !== 0) fs.chmodSync(STORE, 0o600);
  } catch {
    /* best-effort; never block the load */
  }
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const raw = fs.readFileSync(STORE, 'utf8');
      if (!raw || !String(raw).trim()) {
        lastErr = new Error('empty store file');
      } else {
        return syncActiveEventToList(JSON.parse(raw));
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
      return syncActiveEventToList(bakData);
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
  reconcilePlatformDrafts(s);
  syncActiveEventToList(s);
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

// Archive-before-cap: the per-list caps below shift() the OLDEST real records (offers, money intents,
// contacts — PII/financial) once a list exceeds its bound. Append evicted records to a private,
// gitignored .archive.jsonl BEFORE dropping them, so nothing real is silently lost. If the archive
// write fails we keep the records in the store (unbounded this round, retried next cap) rather than
// evict-then-lose — durability of real records beats staying bounded.
function capArchive(arr, max, label) {
  if (!Array.isArray(arr) || arr.length <= max) return;
  const evicted = arr.slice(0, arr.length - max); // copy, don't mutate until archived
  try {
    const lines =
      evicted
        .map((r) => JSON.stringify({ evictedFrom: label, at: new Date().toISOString(), record: r }))
        .join('\n') + '\n';
    fs.appendFileSync(eventsStorePath() + '.archive.jsonl', lines, { mode: 0o600 });
  } catch {
    return; // archive failed — keep records rather than silently drop them
  }
  arr.splice(0, evicted.length); // only evict what we durably archived
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

function seatsOrNull(value) {
  if (value == null || value === '') return null;
  const seats = Number(value);
  return Number.isInteger(seats) && seats > 0 ? seats : NaN;
}

function normalizedDateWindows(value) {
  if (!Array.isArray(value) || value.some((window) => typeof window !== 'string' || !window.trim())) return null;
  return value.map((window) => clamp(window, 80)).slice(0, 8);
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
 * noreply/bounce boxes, disposable inboxes, invent placeholder domains, and platform
 * mailboxes. Aligns with free-ops checkEmailSyntax + funnel usable-contact
 * (url-only / noreply are not draft targets). Ops potter@ allowed.
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
    /^(example\.(com|org|net)|test\.(com|org|net)|localhost|email\.com|domain\.com|nowhere\.com|noemail\.com|null\.com|void\.com|fake\.com|spam\.com|asdf\.com|xxx\.com|sample\.com|invent\.com|placeholder\.com|testmail\.com|mailtest\.com)$/i.test(
      domain,
    )
  ) {
    return false;
  }
  // Disposable / throwaway inboxes — never draft targets (outreach residual)
  if (
    /(?:^|\.)(mailinator\.com|yopmail\.com|guerrillamail\.com|guerrillamailblock\.com|tempmail\.com|temp-mail\.org|throwaway\.email|10minutemail\.com|trashmail\.com|trash-mail\.com|sharklasers\.com|grr\.la|spam4\.me|discard\.email|getnada\.com|maildrop\.cc|mailnesia\.com|pokemail\.net|bccto\.me|dispostable\.com|inboxbear\.com|spamgourmet\.com|mytrashmail\.com|mt2015\.com)$/i.test(
      domain,
    )
  ) {
    return false;
  }
  // Dummy / unusable locals (noreply is not a person to ask for a venue tab)
  // residual-5: invent form fillers (foo/bar/name/redacted/me/…) + system boxes (admin/abuse/bot)
  if (
    /^(fake|placeholder|invented|invalid|unknown|dummy|asdf|xxx|qwerty|sample|noone|nobody|none|anybody|user|username|email|youremail|name|firstname|lastname|test|testing|demo|null|na|n\/a|tbd|todo|fixme|changeme|change\.?me|editme|edit\.?me|fillme|fill\.?me|insert|me|myself|private|redacted|censored|hidden|void|empty|blank|spam|trash|junk|foo|bar|baz|yourname|someone|somebody|anyone|everybody|everyone|no[-_]?reply|do[-_]?not[-_]?reply|mailer-daemon|postmaster|bounce|bounces|return|subscribe|notifications?|alerts?|unsubscribe|abuse|root|devnull|automated|robot|bot|auto|system|daemon|admin)(?:[._-].*)?$/i.test(
      local,
    )
  ) {
    return false;
  }
  // Invent pattern: hello@hello.com / info@info.com / contact@contact.com
  const domainHead = domain.split('.')[0] || '';
  if (domainHead && local === domainHead) return false;
  // Job-board / social / recruiting / ATS / event platform mailboxes — not usable outreach contact
  // residual-5: greenhouse/lever/ashby + instagram/tiktok/splashthat
  if (
    /(?:^|\.)(linkedin\.com|indeed\.com|wellfound\.com|ycombinator\.com|workatastartup\.com|ziprecruiter\.com|facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|partiful\.com|lu\.ma|luma\.com|eventbrite\.com|meetup\.com|splashthat\.com|glassdoor\.com|crunchbase\.com|angellist\.com|angel\.co|greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|jobvite\.com|smartrecruiters\.com)$/i.test(
      domain,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * External recipient for resource drain (not Demigod ops).
 * Ops potter@trydemigod.com is isRealOutreachEmail-true for storage/drafts, but never
 * "contact-ready" for external venue/sponsor/volunteer outreach.
 */
export function isExternalOutreachEmail(email) {
  if (!isRealOutreachEmail(email)) return false;
  return !/@trydemigod\.com$/i.test(String(email || '').trim());
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
export function hygieneOutreachQueue(outreach = [], activeEvent = null) {
  let fixedIdentity = 0;
  let rejectedInvent = 0;
  let stampedPriority = 0;
  let normalizedQueued = 0;
  let dedupedReminders = 0;
  let dedupedSingletons = 0;
  let rejectedPremature = 0;
  const singletonKey = (o) => {
    const kind = normalizeOutreachKind(o?.kind);
    return o?.eventId && (/^rsvp_remind_t(?:3|1)d$/.test(kind) || ['feedback_ask', 'thanks'].includes(kind))
      ? `${o.eventId}:${kind}`
      : null;
  };
  const sentSingletons = new Set(
    outreach
      .filter((o) => o?.status === 'sent' && singletonKey(o))
      .map(singletonKey),
  );
  const seenSingletons = new Set(sentSingletons);
  for (let i = 0; i < outreach.length; ) {
    const o = outreach[i];
    const key = singletonKey(o);
    if (key && ['queued', 'drafted'].includes(o.status) && seenSingletons.has(key)) {
      outreach.splice(i, 1);
      if (/^rsvp_remind_/.test(o.kind)) dedupedReminders++;
      else dedupedSingletons++;
    } else {
      if (key && ['queued', 'drafted'].includes(o.status)) seenSingletons.add(key);
      i++;
    }
  }
  for (const o of outreach || []) {
    if (!o || (o.status !== 'queued' && o.status !== 'drafted')) continue;
    o.sentAt = null;
    if (
      o.eventId === activeEvent?.id &&
      ['thanks', 'feedback_ask'].includes(normalizeOutreachKind(o.kind)) &&
      !['followup', 'debrief'].includes(activeEvent.stage)
    ) {
      o.status = 'rejected';
      o.rejectReason = 'premature_for_stage';
      rejectedPremature++;
      continue;
    }
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
  const rejectedSingletons = new Set();
  for (let i = outreach.length - 1; i >= 0; i--) {
    const o = outreach[i];
    const key = o?.status === 'rejected' && o?.rejectReason === 'premature_for_stage' && singletonKey(o);
    if (!key) continue;
    if (rejectedSingletons.has(key)) {
      outreach.splice(i, 1);
      dedupedSingletons++;
    } else rejectedSingletons.add(key);
  }
  return { fixedIdentity, rejectedInvent, stampedPriority, normalizedQueued, dedupedReminders, dedupedSingletons, rejectedPremature };
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
    const hasShortlist = /Ranked free SF|match \d+/i.test(body);
    // Shortlist already aligned with live top free-list pick — leave alone
    if (hasShortlist) {
      const top = gaps.topFreeVenue;
      const topName = top?.name ? String(top.name) : '';
      const liveScore = top?.score != null ? String(top.score) : '';
      const nameOk = !topName || body.includes(topName);
      const scoreOk = !liveScore || new RegExp('match\\s+' + liveScore + '\\b').test(body);
      // Align #2/#3 with freeVenueShortlistLines food filter (no SFPL/park dinner ghosts).
      const seats = Number(ae.seats) || 12;
      const need = eventNeedText(ae);
      const needL = String(need || '').toLowerCase();
      const foodService = needWantsFoodService(needL);
      const liveTop3 = matchFreeVenues({
        need,
        seats,
        limit: foodService ? 7 : 3,
        excludeIds: gaps.excludeIds || [],
      })
        .filter((v) => {
          if (!foodService) return true;
          const r = v.reasons || [];
          return (
            !r.includes('no-food-room') &&
            !r.includes('dinner-outdoor') &&
            !r.includes('food-outdoor')
          );
        })
        .slice(0, 3);
      const ranksOk = liveTop3.every((v) => v?.name && body.includes(v.name));
      if (nameOk && scoreOk && ranksOk) continue;
    }
    // Thin stub only (keep rich human paste intact if long + specific).
    // Ignore identity footer length — withIdentity stamps make 1-line stubs look "long".
    const idAt = body.search(/\n+—\n+I'm Events Bot/i);
    const bodyCore = (idAt >= 0 ? body.slice(0, idAt) : body).trim();
    if (!hasShortlist && bodyCore.length >= 280 && /venue|room|space|host/i.test(bodyCore)) continue;
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
 * Authoritative no MX → rejected; transient DNS errors stay queued for retry.
 */
export async function hygieneOutreachMx(outreach = [], opts = {}) {
  let rejectedMx = 0;
  let reconciledTransient = 0;
  let checked = 0;
  let changed = 0;
  try {
    const { checkEmailMx, isAuthoritativeNoMx } = await import('./demigod-free-ops.mjs');
    const checkMx = opts.checkMx || checkEmailMx;
    for (const o of outreach || []) {
      // Stores historically used error or rejectReason for MX stamps.
      const rawReject = String(o?.rejectReason || o?.error || '');
      const legacyReason = rawReject.replace(/^no_mx:/i, '');
      if (
        o?.status === 'rejected' &&
        /^no_mx:/i.test(rawReject) &&
        !isAuthoritativeNoMx(legacyReason) &&
        !/^(?:no_mx|fail)$/i.test(legacyReason)
      ) {
        o.status = 'queued';
        o.rejectReason = null;
        if (o.error && /^no_mx:/i.test(String(o.error))) o.error = null;
        o.sentAt = null;
        reconciledTransient++;
        changed++;
      }
      if (!o || (o.status !== 'queued' && o.status !== 'drafted')) continue;
      if (!isRealOutreachEmail(o.toEmail)) continue;
      checked++;
      const prev = o.emailCheck || {};
      const mx = await checkMx(o.toEmail, { force: !!opts.force });
      const next = {
        syntax: true,
        mx: mx.ok ? true : mx.retryable ? null : false,
        reason: mx.reason || null,
        at: new Date().toISOString(),
      };
      o.emailCheck = next;
      if (prev.mx !== next.mx || prev.reason !== next.reason || prev.syntax !== next.syntax) {
        changed++;
      }
      if (!mx.ok && !mx.retryable) {
        o.status = 'rejected';
        o.rejectReason = 'no_mx:' + (mx.reason || 'fail');
        o.sentAt = null;
        rejectedMx++;
        changed++;
      }
    }
  } catch (err) {
    return { checked, rejectedMx, reconciledTransient, changed, error: String(err?.message || err) };
  }
  return { checked, rejectedMx, reconciledTransient, changed };
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
      // Prefer newest idea when reporting selection (ideas are append-only).
      idea: store.ideas.findLast(Boolean),
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
    audience: clamp(
      args.audience || seed.audience || 'SF people who fit the event outcome',
      240,
    ),
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
  const mock = process.env.DEMIGOD_EVENTS_BOT_MOCK === '1';
  // Fun SF events with clear sponsor hooks (not required to be Demigod-branded).
  // Fogline title is MOCK-only fixture brand — never seed prod offline ideas with it.
  const first = mock
    ? {
        title: 'Fogline Supper Club',
        format: '12-seat dinner series',
        audience: 'SF startup builders who want a small cross-functional dinner',
        outcome: 'strangers leave with two real follow-ups and a shared table story',
        seats: 12,
        needs: 'quiet SF venue, food/beverage sponsor, one volunteer host-assist',
        sponsorable: 'Named course or wine sponsor; photo moment; recurring series slot',
      }
    : {
        title: 'SoMa Supper Club',
        format: '12-seat dinner series',
        audience: 'SF startup builders who want a small cross-functional dinner',
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
      audience: 'SF makers and creative technologists with work in progress to share',
      outcome: 'local makers/creatives get a crowd and one intro each',
      seats: 40,
      needs: 'warehouse or loft, light AV, door volunteer, snack/drink sponsor',
      sponsorable: 'Title sponsor on flyer; bar tab; merch table',
    },
    {
      title: 'Mission Morning Run + Coffee',
      format: 'easy group run then café hang',
      audience: 'SF builders who want an easy social run before work',
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

/**
 * Deterministic bot-owned cycle: invent/spin if needed, fill checklist, pick venue, queue asks, advance.
 */
function driveCycle(store, goal, now, m) {
  ensureArrays(store);
  const log = [];
  // 1) Ensure active event — idle reseed at most one SF idea, then spin from the selected idea
  if (!store.activeEvent?.id) {
    const reseed = idleReseedIfEmpty(store, { seed: goal });
    if (reseed.ok && !reseed.skipped) {
      saveStore(store);
      log.push({ step: 'idle_reseed', result: { ok: true, ideaId: reseed.idea?.id, title: reseed.idea?.title } });
    }
    store = loadStore();
    ensureArrays(store);
    const clearedFrom = store.activeEvent?.clearedFrom;
    // Prefer newest matching/linked idea; never revive the oldest historical idea first.
    let idea =
      (clearedFrom && store.ideas.findLast((candidate) => candidate?.fromEventId === clearedFrom)) ||
      store.ideas.findLast(Boolean) ||
      null;
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
      audience: idea.audience,
      outcome: idea.outcome,
      seats: idea.seats,
      notes: idea.needs,
      dateWindows: [],
    });
    log.push({ step: 'spin_up_event', result: spun });
    store = loadStore();
    ensureArrays(store);
  }
  let ae = store.activeEvent;
  if (!ae?.id) return { ok: false, error: 'could not create active event', log };
  const staleInvites = reconcilePlatformDrafts(store);
  if (staleInvites) {
    saveStore(store);
    log.push({ step: 'drop_premature_invites', result: { ok: true, removed: staleInvites } });
  }
  // 2) Ensure checklist / agenda / guestMix / owner (safe even when lifecycle is incomplete)
  const expectedChecklist = stageChecklist(ae.stage || 'ideate', ae);
  if (
    !Array.isArray(ae.checklist) ||
    !ae.checklist.length ||
    ae.checklist.some((item) => !expectedChecklist.some((expected) => expected.id === item?.id))
  ) {
    ae.checklist = expectedChecklist;
  }
  if (!ae.agenda) ae.agenda = defaultAgenda(ae);
  if (!ae.guestMix) {
    ae.guestMix = defaultGuestMix(ae);
    log.push({ step: 'guest_mix', result: { ok: true, cohorts: ae.guestMix.cohorts.length } });
  }
  if (!ae.owner) ae.owner = 'events-bot';

  const brief = eventAudienceBrief(ae);
  if (!brief.ok) {
    // Incomplete lifecycle: normalize planning scaffolding only — no venue match,
    // no outreach queue, no stage advance, never invent audience/outcome.
    syncActiveEventToList(store);
    saveStore(store);
    const plan = planTickNext(store);
    log.push({
      step: 'blocked_lifecycle',
      result: { ok: false, error: 'need_audience_and_outcome', missing: brief.missing },
    });
    return {
      ok: false,
      error: 'need_audience_and_outcome',
      missing: brief.missing,
      plan,
      log,
    };
  }

  // 3) Stage-specific fills
  const stage = ae.stage || 'ideate';
  if (stage === 'ideate' || stage === 'resource') {
    // Harden offer → active night (SF filter + scores; ids only)
    const stamped = stampOfferMatches(store);
    if (stamped?.changed) {
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
    // Queue resource outreach until a usable offer is human-accepted.
    const gaps = resourceGaps(store);
    if (gaps.missing.includes('venue_confirmation')) {
      const venueOffer = (store.offers?.venue || []).find(
        (offer) =>
          offer?.id === ae.venue?.id &&
          (!offer.eventId || offer.eventId === ae.id) &&
          !['declined', 'rejected'].includes(String(offer.status || '').toLowerCase()) &&
          isRealOutreachEmail(offer.email),
      );
      if (venueOffer) {
        const windows = (ae.dateWindows || []).filter(Boolean).join(' / ') || 'one of the proposed SF date windows';
        log.push({
          step: 'queue_venue_confirmation',
          result: runTool('queue_outreach', {
            toEmail: venueOffer.email,
            toName: venueOffer.name || venueOffer.org || 'Venue partner',
            kind: 'venue_confirmation',
            subject: 'Confirm venue details for: ' + ae.title,
            body:
              'Thanks for offering ' +
              (ae.venue?.name || 'your venue') +
              ' for "' +
              ae.title +
              '" in San Francisco. Please reply confirming the date/window (' +
              windows +
              '), full SF address, usable capacity for ' +
              (ae.seats || 'the planned') +
              ' guests, cost/terms, and access/setup details. I will keep the venue unconfirmed until that evidence is recorded.',
          }),
        });
      }
    }
    if (gaps.needSponsor) {
      log.push({
        step: 'queue_sponsor_ask',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: 'sponsor',
          subject:
            'Sponsor contacts (draft): ' +
            ae.title +
            ' — SF ' +
            (ae.seats || '?') +
            '-seat, venue ' +
            (ae.venue?.name || 'TBD'),
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
    if (gaps.needVolunteer) {
      log.push({
        step: 'queue_volunteer_ask',
        result: runTool('queue_outreach', {
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          kind: 'volunteer',
          subject: 'Door/setup volunteer (draft): ' + ae.title + ' (SF)',
          body:
            'Looking for one door/setup volunteer for "' +
            ae.title +
            '" (SF). Offer on https://www.trydemigod.com/?p=events or reply here.',
        }),
      });
    }
    // Align with resourceGaps.venueWeak (sponsor tab / free public / in-kind / free_list)
    if (gaps.needVenue || gaps.needVenueAlt) {
      // free private venue alts + ranked shortlist (draft only — never send)
      const need = eventNeedText(ae, goal) || 'meetup';
      const seats = ae.seats || 12;
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

  if (stage === 'plan') {
    const title = ae.title;
    const store1 = loadStore();
    ensureArrays(store1);
    const hasPf = (store1.platforms.partiful || []).some((p) => platformRowMatchesEvent(p, ae));
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

  // Invite copy waits for plan, after resources are confirmed.
  store = loadStore();
  ae = store.activeEvent;
  if (ae && ['plan', 'rsvp'].includes(ae.stage) && !ae.inviteDraft) {
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
      (o) =>
        o.eventId === ae.id &&
        o.kind === 'thanks' &&
        ['queued', 'drafted', 'sent'].includes(o.status),
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
    const gaps = resourceGaps(store);
    const mark = (id) => {
      ae.checklist = ae.checklist.map((c) => (c.id === id ? { ...c, done: true } : c));
    };
    const set = (id, done) => {
      ae.checklist = ae.checklist.map((c) => (c.id === id ? { ...c, done } : c));
    };
    if (ae.title && ae.audience && ae.outcome) mark('idea_title');
    if (ae.seats) mark('idea_seats');
    if (ae.dateWindows?.length) mark('idea_windows');
    set('res_venue', gaps.hasConfirmedVenue);
    set('res_sponsor', !gaps.needSponsor);
    set('res_volunteer', !gaps.needVolunteer);
    set('res_outreach', resourceOutreachCovered(gaps));
    if (ae.agenda) mark('plan_agenda');
    if (ae.inviteDraft) mark('plan_invite');
    if (ae.guestMix?.cohorts?.length) mark('plan_guest');
    if ((store.platforms?.partiful || []).some((p) => platformRowMatchesEvent(p, ae))) mark('plan_partiful');
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
  const hasFbAsk = (store.outreach || []).some(
    (o) =>
      o.eventId === ae?.id &&
      o.kind === 'feedback_ask' &&
      ['queued', 'drafted', 'sent'].includes(o.status),
  );
  if (!hasFbAsk && ae?.stage === 'followup') {
    log.push({
      step: 'feedback_ask',
      result: runTool('queue_outreach', {
        toEmail: 'potter@trydemigod.com',
        toName: 'Events Bot ops',
        kind: 'feedback_ask',
        subject: 'Events Bot wants feedback on ' + ae.title,
        body: 'How was this SF night? Reply with what worked and what should change next time — I am the organizer of record.',
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

function runToolUnlocked(name, args) {
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
      const title = clamp(args.title, 120);
      if (!title) return { ok: false, error: 'title required' };
      const seats = seatsOrNull(args.seats);
      if (Number.isNaN(seats)) return { ok: false, error: 'seats must be a positive integer' };
      const brief = eventAudienceBrief(args);
      if (!brief.ok) return { ok: false, error: 'audience and outcome required', missing: brief.missing };
      const blob = [args.title, args.format, args.audience, args.outcome, args.needs].join(' ');
      if (!isSfLocation(blob)) {
        return {
          ok: false,
          error: 'SF_ONLY',
          message: GEO_RULE.note,
        };
      }
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
        let changed = false;
        for (const [field, value] of Object.entries({
          audience: clamp(args.audience, 240),
          outcome: clamp(args.outcome, 400),
          seats,
          format: clamp(args.format, 80),
          needs: clamp(args.needs, 400),
          sponsorable: clamp(args.sponsorable, 400),
        })) {
          if (!existing[field] && value) {
            existing[field] = value;
            changed = true;
          }
        }
        if (normTitle(store.activeEvent?.title) === nt) {
          let refreshGuestMix = false;
          for (const field of ['audience', 'outcome', 'seats']) {
            if (!store.activeEvent[field] && existing[field]) {
              store.activeEvent[field] = existing[field];
              if (field === 'audience' || field === 'seats') refreshGuestMix = true;
              changed = true;
            }
          }
          if (refreshGuestMix && store.activeEvent.guestMix?.status === 'planning_target') {
            store.activeEvent.guestMix = defaultGuestMix(store.activeEvent);
          }
        }
        if (changed) saveStore(store);
        return { ok: true, idea: existing, deduped: true };
      }
      const idea = {
        id: uid('idea_'),
        title,
        format: clamp(args.format, 80),
        audience: clamp(args.audience, 240),
        outcome: clamp(args.outcome, 400),
        seats,
        needs: clamp(args.needs, 400),
        sponsorable: clamp(args.sponsorable, 400),
        city: 'San Francisco',
        source: clamp(args.source || 'bot', 24),
        at: now,
      };
      store.ideas.push(idea);
      capArchive(store.ideas, 200, 'ideas');
      saveStore(store);
      return { ok: true, idea };
    }
    case 'record_feedback': {
      const text = clamp(args.text, 2000);
      if (!text) return { ok: false, error: 'text_required' };
      const fb = {
        id: uid('fb_'),
        text,
        name: clamp(args.name, 80),
        email: clamp(args.email, 120),
        topic: clamp(args.topic, 80),
        at: now,
      };
      store.feedback.push(fb);
      capArchive(store.feedback, 500, 'feedback');
      saveStore(store);
      return { ok: true, id: fb.id };
    }
    case 'spin_up_event': {
      const title = clamp(args.title, 120);
      if (!title) return { ok: false, error: 'title required' };
      const seats = seatsOrNull(args.seats);
      if (Number.isNaN(seats)) return { ok: false, error: 'seats must be a positive integer' };
      const brief = eventAudienceBrief(args);
      if (!brief.ok) return { ok: false, error: 'audience and outcome required', missing: brief.missing };
      const dateWindows = args.dateWindows == null ? [] : normalizedDateWindows(args.dateWindows);
      if (!dateWindows) return { ok: false, error: 'dateWindows must be an array of nonblank strings' };
      const blob = [args.title, args.audience, args.outcome, args.notes, ...(args.dateWindows || [])].join(' ');
      if (!isSfLocation(blob)) {
        return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
      }
      // Local ops always persist (bot owns the night). draft only blocks network send/Luma.
      // Reuse active event with same title if present
      // Belt: never let selftest titles become prod activeEvent (MOCK selftest still ok)
      if (selftestTitleBlocked(title)) {
        return {
          ok: false,
          error: 'selftest_title_blocked',
          message: 'Title looks like a selftest/fixture — refused outside DEMIGOD_EVENTS_BOT_MOCK=1',
        };
      }
      if (store.activeEvent?.id && normTitle(store.activeEvent.title) === normTitle(title)) {
        store.activeEvent.audience = clamp(args.audience, 240) || store.activeEvent.audience;
        store.activeEvent.outcome = clamp(args.outcome, 400) || store.activeEvent.outcome;
        if (seats != null) store.activeEvent.seats = seats;
        if (args.dateWindows != null) {
          const st = normalizeStage(store.activeEvent.stage);
          if (
            STAGES.indexOf(st) >= STAGES.indexOf('plan') &&
            (!dateWindows.length ||
              !dateWindows.some((window) => scheduledDateTime(window) > Date.now()))
          ) {
            return {
              ok: false,
              error: dateWindows.length ? 'future_datetime_required' : 'dateWindows_required',
              message: 'Cannot wipe or set vague dateWindows at plan+ via spin_up_event dedupe.',
            };
          }
          store.activeEvent.dateWindows = dateWindows;
        }
        if (args.notes != null) store.activeEvent.notes = clamp(args.notes, 800);
        store.activeEvent.updatedAt = now;
        saveStore(store);
        return { ok: true, activeEvent: store.activeEvent, deduped: true };
      }
      const ae = {
        id: uid('ev_'),
        title,
        audience: clamp(args.audience, 240),
        outcome: clamp(args.outcome, 400),
        seats: seats ?? 8,
        stage: 'ideate',
        stageAt: now,
        city: 'San Francisco',
        dateWindows,
        notes: clamp(args.notes, 800),
        venue: null,
        agenda: defaultAgenda({ seats: seats ?? 8 }),
        checklist: stageChecklist('ideate', { title }),
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
      const gate = canAdvanceStage(from, stage, store.activeEvent, store, args.evidence || args.note || '');
      if (!gate.ok) {
        return {
          ok: false,
          error: gate.reason || 'advance_denied',
          from,
          stage,
          next: gate.next || null,
          message: gate.message,
          nextAction: gate.nextAction,
          stages: STAGES,
        };
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
      return { ok: true, from, stage, activeEvent: store.activeEvent, forced: false };
    }
    case 'queue_outreach': {
      // Hygiene first: fix identity / reject invent emails already in queue
      const hygPre = hygieneOutreachQueue(store.outreach, store.activeEvent);
      const built = buildOutreachDraft(args);
      if (!built.ok) {
        if (Object.values(hygPre).some(Boolean)) saveStore(store);
        return built;
      }
      const { draft } = built;
      const toEmail = draft.toEmail;
      const kind = draft.kind;
      const kindNorm = normalizeOutreachKind(kind);
      if (
        ['feedback_ask', 'thanks'].includes(kindNorm) &&
        !['followup', 'debrief'].includes(store.activeEvent?.stage)
      ) {
        if (Object.values(hygPre).some(Boolean)) saveStore(store);
        return { ok: false, error: `${kindNorm} waits until followup` };
      }
      const priority = draft.priority;
      const dup = store.outreach.find(
        (o) =>
          String(o.toEmail || '').trim().toLowerCase() === toEmail &&
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
        let outboxWritten = true;
        let outboxError = null;
        try {
          writeOutreachOutbox(dup);
        } catch (error) {
          outboxWritten = false;
          outboxError = String(error?.code || 'write_failed').slice(0, 40);
        }
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
          outboxWritten,
          outboxError,
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
      capArchive(store.outreach, 500, 'outreach');
      let outboxWritten = true;
      let outboxError = null;
      try {
        writeOutreachOutbox(item);
      } catch (error) {
        outboxWritten = false;
        outboxError = String(error?.code || 'write_failed').slice(0, 40);
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
        outboxWritten,
        outboxError,
        identity: true,
        hygiene: hygPre,
        note: outboxWritten
          ? 'Queued only — human or real SMTP adapter must send. No fake sent receipts.'
          : 'Queued in the canonical store, but the optional outbox export failed. No fake sent receipts.',
      };
    }
    case 'record_money_intent': {
      const name = clamp(args.name, 80);
      const email = clamp(args.email, 120).toLowerCase();
      const amountNote = clamp(args.amountNote, 200);
      const cents = args.cents == null ? null : Number(args.cents);
      if (name.length < 2) return { ok: false, error: 'name required' };
      if (!isRealOutreachEmail(email)) return { ok: false, error: 'usable email required' };
      if (!amountNote) return { ok: false, error: 'amountNote required' };
      if (cents != null && (!Number.isSafeInteger(cents) || cents < 1)) {
        return { ok: false, error: 'cents must be a positive integer' };
      }
      const mon = {
        id: uid('pay_'),
        name,
        email,
        org: clamp(args.org, 120),
        amountNote,
        cents,
        status: 'intent',
        stripe: 'pending',
        at: now,
      };
      store.money.push(mon);
      capArchive(store.money, 200, 'money');
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
      // Sync draft path; external creation is a separate foreground action.
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
      const eventId = store.activeEvent?.id || null;
      const prev = list.find((p) =>
        normTitle(p.title) === normTitle(built.draft.title) && (!eventId || !p.eventId || p.eventId === eventId),
      );
      const keptUrl = prev?.inviteUrl || prev?.publishedUrl || prev?.draft?.inviteUrl || null;
      const draft = {
        ...(prev?.draft || {}),
        ...built.draft,
        id: prev?.id || prev?.draft?.id || uid('luma_'),
        eventId,
        at: now,
        updatedAt: now,
        status: keptUrl && isRealInviteUrl(keptUrl, 'luma') ? 'published_url' : 'draft',
      };
      if (draft.status === 'published_url') draft.inviteUrl = keptUrl;
      const files = writeInviteExport('luma', draft);
      if (files) draft.exportFiles = files;
      const row = {
        id: draft.id,
        eventId,
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
        note: 'Luma draft paste package only (no auto-publish / no fake RSVPs).',
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
      const eventId = store.activeEvent?.id || null;
      const prev = list.find((p) => normTitle(p.title) === nt && (!eventId || !p.eventId || p.eventId === eventId));
      const keptUrl =
        (prev?.inviteUrl || prev?.publishedUrl) &&
        isRealInviteUrl(prev.inviteUrl || prev.publishedUrl, 'partiful')
          ? prev.inviteUrl || prev.publishedUrl
          : null;
      const draft = {
        ...(prev || {}),
        ...built.draft,
        id: prev?.id || uid('pf_'),
        eventId,
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

    case 'open_native_rsvps': {
      const result = openNativeRsvps(store, args);
      if (!result.ok) return result;
      saveStore(store);
      return result;
    }

    case 'submit_native_rsvp': {
      const result = submitNativeRsvp(store, args);
      if (!result.ok) return result;
      saveStore(store);
      return result;
    }

    case 'list_native_rsvps': {
      return listNativeRsvps(store, args.eventId || args.id || store.activeEvent?.id);
    }

    case 'public_event_view': {
      return publicEventView(store, args.eventId || args.id);
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
      const brief = writeInviteDrainBrief(report, args.busyDir);
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
        (ae.venue.source === 'free_list' ||
          ae.venue.source === 'in-kind' ||
          /in-kind|sponsor tab|free public|free \(reserve\)/i.test(String(ae.venue.cost || '')))
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
            // Link offer → active night; selection is not human acceptance.
            off.eventId = store.activeEvent.id;
            if (!off.status || off.status === 'new') off.status = 'matched';
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
      if (args.confirmed === true && !String(args.confirmationEvidence || '').trim()) {
        return { ok: false, error: 'confirmation_evidence_required' };
      }
      venue.confirmed = args.confirmed === true;
      if (venue.confirmed) venue.confirmationEvidence = clamp(args.confirmationEvidence, 400);
      store.activeEvent.venue = venue;
      store.activeEvent.updatedAt = now;
      // mark checklist item
      if (Array.isArray(store.activeEvent.checklist)) {
        store.activeEvent.checklist = store.activeEvent.checklist.map((c) =>
          c.id === 'res_venue' ? { ...c, done: venue.confirmed && !!venue.confirmationEvidence } : c,
        );
      }
      // Refresh partner matches after venue lock
      stampOfferMatches(store);
      saveStore(store);
      return { ok: true, venue, activeEvent: store.activeEvent };
    }
    case 'update_event_details': {
      if (!store.activeEvent?.id) return { ok: false, error: 'no active event' };
      const dateWindows = args.dateWindows == null ? null : normalizedDateWindows(args.dateWindows);
      if (args.dateWindows != null && !dateWindows) {
        return { ok: false, error: 'dateWindows must be an array of nonblank strings' };
      }
      const ae = store.activeEvent;
      const placeBlob = [
        args.title ?? ae.title,
        args.audience ?? ae.audience,
        args.outcome ?? ae.outcome,
      ].filter(Boolean).join(' ');
      const identityChanged = ['title', 'audience', 'outcome'].some((field) => args[field] != null);
      if ((identityChanged && placeBlob && !isSfLocation(placeBlob)) || (args.notes != null && mentionsNonSf(args.notes))) {
        return { ok: false, error: 'SF_ONLY', message: GEO_RULE.note };
      }
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
      if (args.audience) ae.audience = clamp(args.audience, 240);
      if (args.notes) ae.notes = clamp(args.notes, 2000);
      if (args.agenda) ae.agenda = clamp(args.agenda, 4000);
      if (args.seats != null) {
        const seats = seatsOrNull(args.seats);
        if (Number.isNaN(seats)) return { ok: false, error: 'seats must be a positive integer' };
        ae.seats = seats;
      }
      if ((args.audience || args.seats != null) && ae.guestMix?.status === 'planning_target') {
        ae.guestMix = defaultGuestMix(ae);
      }
      if (dateWindows !== null) {
        const st = normalizeStage(ae.stage);
        if (STAGES.indexOf(st) >= STAGES.indexOf('plan')) {
          if (!dateWindows.length) {
            return {
              ok: false,
              error: 'dateWindows_required',
              message: 'Cannot clear dateWindows at plan+; use record_schedule with a real future start.',
            };
          }
          if (!dateWindows.some((window) => scheduledDateTime(window) > Date.now())) {
            return {
              ok: false,
              error: 'future_datetime_required',
              message: 'plan+ dateWindows need at least one timezone-aware future start.',
            };
          }
        }
        ae.dateWindows = dateWindows;
      }
      ae.updatedAt = now;
      saveStore(store);
      return { ok: true, activeEvent: ae };
    }
    case 'record_schedule': {
      const ae = store.activeEvent;
      if (!ae?.id || args.eventId !== ae.id) return { ok: false, error: 'active event id required' };
      if (!['ideate', 'resource', 'plan', 'rsvp'].includes(ae.stage)) return { ok: false, error: 'schedule stage closed' };
      const start = String(args.start || '').trim();
      if (!(scheduledDateTime(start) > Date.now())) return { ok: false, error: 'future timezone-aware start required' };
      ae.dateWindows = [start];
      ae.updatedAt = now;
      saveStore(store);
      return { ok: true, eventId: ae.id, start };
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
      capArchive(store.tasks, 400, 'tasks');
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
      capArchive(store.contacts, 500, 'contacts');
      saveStore(store);
      return { ok: true, contact: c };
    }
    case 'drive_cycle': {
      return driveCycle(store, args.goal || '', now, m);
    }

    case 'list_resources': {
      const enr = enrichVenueOutreachBodies(store);
      const hyg = hygieneOutreachQueue(store.outreach, store.activeEvent);
      if (enr.enriched || Object.values(hyg).some(Boolean)) {
        saveStore(store);
      }
      const matched = matchOffersToEvent(store);
      const offerCounts = { ...matched.offerCounts, moneyIntents: (store.money || []).length };
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

function runTool(name, args) {
  return withEventsStoreLock(() => runToolUnlocked(name, args));
}

async function executeTool(name, rawArgs) {
  let args = {};
  try {
    args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : rawArgs || {};
  } catch {
    args = {};
  }
  // A model cannot attest that a human published an external invite.
  // Foreground/manual runTool + human invite drains remain the evidence paths.
  if (name === 'record_invite_url') {
    return {
      ok: false,
      error: 'foreground_evidence_required',
      message: 'Published invite URLs must come from an explicit foreground/manual record or human invite drain.',
    };
  }
  if (name === 'luma_create_event') {
    const store = loadStore();
    ensureArrays(store);
    const m = mode();
    // External event creation is never authorized by a background mode or API key.
    const built = buildLumaDraft(args, store.activeEvent || {});
    let result;
    if (!built.ok) {
      result = built;
    } else {
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
        dryRun: true,
        mode: m,
        reason: 'External Luma creation requires a separate, explicitly authorized foreground action',
        draft,
        exportFiles: files,
        note: 'Draft only — no publish/RSVP invent. Use exportText or outbox .txt',
      };
    }
    withEventsStoreLock(() => {
      const latest = loadStore();
      latest.platforms.luma = latest.platforms.luma || [];
      latest.platforms.luma.push({
        id: (result.draft && result.draft.id) || uid('luma_'),
        at: new Date().toISOString(),
        result,
        title: args.title || built.draft?.title,
        status: result.ok && !result.pending ? 'api' : 'draft',
      });
      saveStore(latest);
    });
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
- Every generated idea must name a specific audience and a concrete attendee outcome.
- Prefer sponsorable formats.

## Rules
- Identify as Events Bot in outreach (tools append identity).
- Chat/feedback: https://www.trydemigod.com/?p=events
- Stripe PENDING — money = intent. SMS pending.
- Partiful and Luma are drafts only; background modes never create external invites.
- No fake RSVPs/sends. No SLA clocks.
- Prefer tool calls. After tools, summarize what YOU will do next (not what a human host must do).`;

/**
 * Run one autonomous tick.
 * @param {{ goal?: string, maxSteps?: number, ownerCycle?: boolean }} opts
 */
export async function eventsBotAgentTick(opts = {}) {
  const goal =
    opts.goal ||
    'Drive the active SF night end-to-end as owner: invent if needed, select free venue, queue sponsor/volunteer outreach, build agenda and Partiful draft, advance stages. Use potter@trydemigod.com as ops staging contact for outreach queues.';
  const maxSteps = Math.min(6, Math.max(1, Number(opts.maxSteps) || 4));
  const ownerCycle = opts.ownerCycle !== false;
  const m = mode();
  // Free MX hygiene on queue before agent tools (no API keys)
  try {
    await withEventsStoreLock(async () => {
      const pre = loadStore();
      ensureArrays(pre);
      const mxPre = await hygieneOutreachMx(pre.outreach);
      // Persist successful mx stamps too (null→true) — not only rejects/reconciles.
      if (mxPre.rejectedMx || mxPre.reconciledTransient || mxPre.changed) saveStore(pre);
    });
  } catch {
    /* non-fatal */
  }
  const storeSnap = runTool('list_resources', {});

  // Idle reseed before tools: empty store gets exactly one SF idea (idempotent)
  try {
    withEventsStoreLock(() => {
      const idleStore = loadStore();
      ensureArrays(idleStore);
      const reseed = idleReseedIfEmpty(idleStore, { seed: goal });
      if (reseed.ok && !reseed.skipped) saveStore(idleStore);
    });
  } catch {
    /* non-fatal */
  }

  if (!process.env.OPENAI_API_KEY || process.env.DEMIGOD_EVENTS_BOT_MOCK === '1') {
    if (!ownerCycle) {
      const proposed = runTool('propose_event_ideas', { seed: goal, count: 3 });
      const steps = [{ tool: 'propose_event_ideas', result: proposed }];
      for (const idea of proposed.ideas || []) {
        steps.push({
          tool: 'record_idea',
          result: runTool('record_idea', { ...idea, source: 'bot' }),
        });
      }
      const resources = runTool('list_resources', {});
      return {
        ok: true,
        mock: true,
        mode: m,
        goal,
        steps,
        summary: `I drafted and saved ${(proposed.ideas || []).length} SF event ideas without starting a night.`,
        plan: planTickNext(loadStore()),
        resources,
        owner: 'events-bot',
      };
    }
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

  // A live model may stop after any shallow tool call. The one-button owner path still runs
  // the deterministic safe cycle once unless the model already did, so it cannot claim
  // success with no active event. Idea-only callers opt out with ownerCycle=false.
  if (ownerCycle && !steps.some((step) => step.tool === 'drive_cycle')) {
    const driven = runTool('drive_cycle', { goal });
    steps.push(
      ...(driven.log || []).map((x) => ({
        tool: x.step,
        result: x.result,
        fallback: steps.length ? 'owner_cycle_completion' : 'zero_tool_calls',
      })),
    );
    finalText = driven.summary || finalText;
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
