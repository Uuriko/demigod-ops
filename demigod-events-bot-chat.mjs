/**
 * Events Bot chat brain — full-cycle owner (not a human host co-pilot).
 * Used by demigod-events-app.mjs POST /api/events-bot/chat
 *
 * Env: OPENAI_API_KEY (required for live replies)
 * Optional: OPENAI_EVENTS_MODEL (default gpt-4o-mini), DEMIGOD_EVENTS_BOT_MOCK=1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  eventsBotAgentTick,
  loadStore,
  runTool,
  planTickNext,
  ownerPlanSuffix,
  parseStageAdvanceIntent,
  advanceLifecycleToward,
  parseDebriefEvidence,
  parseSeedNextIntent,
  mentionsNonSf,
  matchOffersToEvent,
} from './demigod-events-bot-agent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;

export const SYSTEM = `You are Events Bot (built by Demigod) — you **fully own** fun, high-quality **in-person San Francisco** events start to finish.

## Owner voice (CRITICAL)
- Speak as the organizer of record in first person: "I'm locking…", "I queued…", "Next I need…".
- Never co-pilot lines: no "you stay host", "you should run this", or "tell me what to do as host".
- Lead with what **you already did or will do**, then the one ask of the person (if any).
- When a drive/tick ran, state stage + venue + next plan plainly.

## Owner model
- You invent the night, pick SF date windows, secure venues (free/public list + inbound offers), recruit sponsors and volunteers, draft invites/agenda/RSVP structure, day-of runbook, follow-up, debrief, and seed the next cycle.
- You message people proactively when you need something (outreach is queued until real email/SMS transport; never claim a fake send).
- Anyone may chat first or offer a venue/sponsor/volunteer/idea/feedback — treat that as fuel, not as you waiting for a human "host" to drive.

## What kinds of events
- Not limited to Demigod-branded or talent-matching nights.
- Fun, cultural, creative, social, community SF events are in scope.
- When **you invent** ideas, bias toward **sponsorable** formats without forcing a Demigod pitch.

## Geography rule (HARD)
- **San Francisco only.** Prefer SF proper neighborhoods.
- Non-SF / remote-only: decline politely and offer an SF alternative.
- Hybrid only if the **room is in San Francisco**.

## Lifecycle you own
Ideate → Resource → Plan → RSVP → Run → Follow-up → Debrief → next

## Product truth
- Autonomy tick / drive_cycle: POST /api/events-bot/agent/tick
- Stripe card capture PENDING — money = intent until live.
- SMS PENDING — outreach channel default email (queued).
- Partiful and Luma: ready-to-paste drafts only; no account connection or auto-publish authority.
- **No fake RSVPs** — invited/confirmed/attended stay null until real replies. Never invent guest counts.
- No SLA / 48h promises.
- Contact: potter@trydemigod.com

## Style
- Short, practical, confident owner voice. Fun when the night is fun.
- Hiring/Demigod matching only if the conversation steers there.

Stay in character as Events Bot — the organizer of record.`;

const buckets = new Map(); // ip -> { n, t0 }

/**
 * Soften informal typing so co-pilot reclaim + tick-plan regexes still fire.
 * Residual: "youre my control tower" / "whats the plan" / "whatll|what'll you drive next"
 * / "whatre|what're you planning" / "whatcha|watcha|whatchu planning" / "waddya planning"
 * / "what are you gonna do" / "gimme the plan" / "lemme see the plan" / "whatll|what'll you plan next"
 * / "what do you wanna do next" / "howll|how'll you plan" / "whatd|what'd you plan" / "howd|how'd you plan"
 * / "what are ya planning" / "ya gonna drive next" / "talk me through the plan"
 * / "hows about the plan" (how's about → how about after hows expand).
 * / "wat|wot the plan" / "wots the plan" / "howya planning" / "whaddya|waddaya|whaddaya planning" / "walk me thru the plan" (tick-plan residual).
 * / "whats ya plan" / "gimme ya plan" / "hows ya plan" (ya→your; tick-plan residual).
 * / "whatsya|howsya plan" (glued whats|hows+ya → what's|how's your; tick-plan residual).
 * / "tellya|showus|tellus|walkme|talkme|walkus|talkus|gimmeya the plan" (glued informal → tick-plan surface).
 * / "hitya|hitus|giveus the plan" (hit/give glued parity showya|hitme|giveme → tick-plan).
 * Keep light — no invent RSVPs, no geo change.
 */
function normalizeUserChatText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\byoure\b/g, "you're")
    .replace(/\byouve\b/g, "you've")
    .replace(/\byoull\b/g, "you'll")
    .replace(/\bwhats\b/g, "what's")
    // Optional ASCII/curly apostrophe so what'll/how'll hit "what will" tick-plan paths
    .replace(/\bwhat['’]?ll\b/g, 'what will')
    .replace(/\bwhat['’]?d\b/g, 'what would')
    .replace(/\bwhat['’]?re\b/g, 'what are')
    .replace(/\bwhatcha\b/g, 'what are you')
    .replace(/\bwatcha\b/g, 'what are you') // residual: watcha planning (parity whatcha)
    .replace(/\bwhatchu\b/g, 'what are you') // residual: whatchu planning
    .replace(/\bwatchu\b/g, 'what are you') // residual: watchu planning (parity whatchu)
    .replace(/\bwutchu\b/g, 'what are you') // residual: wutchu planning (parity whatchu)
    .replace(/\bwhatchya\b/g, 'what are you') // residual: whatchya planning
    .replace(/\bwutcha\b/g, 'what are you') // residual: wutcha planning (parity watcha/whatcha)
    .replace(/\bwutchya\b/g, 'what are you') // residual: wutchya planning (parity whatchya)
    .replace(/\bwaddya\b/g, 'what are you')
    .replace(/\bwaddaya\b/g, 'what are you') // residual: waddaya planning (parity waddya)
    .replace(/\bwadya\b/g, 'what are you') // residual: wadya planning (parity waddya)
    .replace(/\bwhadya\b/g, 'what are you') // residual: whadya planning
    .replace(/\bwhaddya\b/g, 'what are you') // residual: whaddya planning (parity waddya/whadya)
    .replace(/\bwhaddaya\b/g, 'what are you') // residual: whaddaya planning (parity whaddya)
    .replace(/\bthru\b/g, 'through') // residual: walk me thru the plan → through
    // Informal what/what's (wuts/wats/wots before wut/wat/wot so →what's not what+s)
    .replace(/\bwuts\b/g, "what's")
    .replace(/\bwhuts\b/g, "what's") // residual: whuts the plan (parity wuts)
    .replace(/\bwats\b/g, "what's") // residual: wats the plan (parity wuts)
    .replace(/\bwots\b/g, "what's") // residual: wots the plan (parity wuts/wats)
    .replace(/\bwut\b/g, 'what')
    .replace(/\bwat\b/g, 'what') // residual: wat the plan (parity wut)
    .replace(/\bwot\b/g, 'what') // residual: wot the plan (parity wut/wat)
    // "what are ya planning" / "ya gonna …" → you paths (scoped; not bare \bya\b)
    .replace(/\bwhat are ya\b/g, 'what are you')
    .replace(/\bhow are ya\b/g, 'how are you')
    .replace(/\bhowya\b/g, 'how are you') // residual: howya planning → how are you planning
    .replace(/\bwhatya\b/g, 'what are you') // residual: whatya planning (parity howya)
    // residual: wutya|watya|wotya planning (parity whatya; \bwut\b cannot split glued)
    .replace(/\bwutya\b/g, 'what are you')
    .replace(/\bwatya\b/g, 'what are you')
    .replace(/\bwotya\b/g, 'what are you')
    // residual: "what ya planning" / "how ya planning" (missing are; before ya gonna)
    .replace(/\bwhat ya\b/g, 'what are you')
    .replace(/\bhow ya\b/g, 'how are you')
    .replace(/\bya gonna\b/g, 'you going to')
    // residual: "what|how u planning|gonna" / "are u planning" (parity what ya → tick-plan; no invent RSVPs)
    .replace(/\bwhat u\b/g, 'what are you')
    .replace(/\bhow u\b/g, 'how are you')
    .replace(/\bare u\b/g, 'are you')
    .replace(/\bu gonna\b/g, 'you going to')
    // residual: what'll|what'd|how'll ya plan → will|would you (tick-plan regexes need you)
    .replace(/\bwill ya\b/g, 'will you')
    .replace(/\bwould ya\b/g, 'would you')
    .replace(/\bdo ya\b/g, 'do you') // residual: what/how do ya plan
    .replace(/\bgonna\b/g, 'going to')
    .replace(/\bwanna\b/g, 'want to')
    .replace(/\bhow['’]?ll\b/g, 'how will')
    .replace(/\bhow['’]?d\b/g, 'how would')
    .replace(/\bhow['’]?re\b/g, 'how are')
    .replace(/\bgimme\b/g, 'give me')
    .replace(/\bgimmie\b/g, 'give me') // residual: gimmie the plan → give me
    .replace(/\bgimmi\b/g, 'give me') // residual: gimmi the plan (parity gimme/gimmie)
    .replace(/\bgimmee\b/g, 'give me') // residual: gimmee the plan (parity gimme)
    .replace(/\bgimmy\b/g, 'give me') // residual: gimmy the plan (parity gimme/gimmie)
    .replace(/\bgimma\b/g, 'give me') // residual: gimma the plan (parity gimme → isTickPlanAsk)
    .replace(/\bgivme\b/g, 'give me') // residual: givme the plan (parity gimme → isTickPlanAsk)
    .replace(/\bgimmeya\b/g, 'give me') // residual: gimmeya the plan (glued gimme+ya)
    .replace(/\bgimmieya\b/g, 'give me') // residual: gimmieya the plan (parity gimmeya + gimmie)
    .replace(/\bgimmiya\b/g, 'give me') // residual: gimmiya the plan (parity gimmeya + gimmi)
    .replace(/\bgimmeur\b/g, 'give me your') // residual: gimmeur plan (glued gimme+ur)
    .replace(/\bgivemeur\b/g, 'give me your') // residual: givemeur plan (parity gimmeur)
    // residual: "what|how you planning|gonna|driving" missing are (parity what ya → what/how are you)
    .replace(/\b(what|how) you (planning|gonna|going to|driving|doing)\b/g, '$1 are you $2')
    .replace(/\blemme\b/g, 'let me')
    .replace(/\blemmie\b/g, 'let me') // residual: lemmie see the plan (parity lemme)
    .replace(/\blemmee\b/g, 'let me') // residual: lemmee see the plan (parity lemme)
    .replace(/\blemmy\b/g, 'let me') // residual: lemmy see the plan (parity lemme/lemmie)
    // residual: "lmk the|your plan" → let me know (isTickPlanAsk)
    .replace(/\blmk\b/g, 'let me know')
    // residual: plz|pls the plan → please (isTickPlanAsk; no invent RSVPs)
    .replace(/\bplz\b/g, 'please')
    .replace(/\bpls\b/g, 'please')
    // residual: cmon|c'mon the|with the plan → come on (isTickPlanAsk; no invent RSVPs)
    .replace(/\bc['’]?mon\b/g, 'come on')
    // residual: "whats holdin|blockin the gate" (g-drop → holding/blocking; isTickPlanAsk gate surface)
    .replace(/\bholdin['’]?\b/g, 'holding')
    .replace(/\bblockin['’]?\b/g, 'blocking')
    // residual: glued whatstheplan|whatsyourplan|showtheplan → spaced (tick-plan regexes)
    .replace(/\bwhatstheplan\b/g, "what's the plan")
    .replace(/\bwutstheplan\b/g, "what's the plan") // residual: wuts|wats|wots|whuts + theplan
    .replace(/\bwatstheplan\b/g, "what's the plan")
    .replace(/\bwotstheplan\b/g, "what's the plan")
    .replace(/\bwhutstheplan\b/g, "what's the plan")
    .replace(/\btheplan\b/g, 'the plan') // residual: gimme/show/how's theplan
    // residual: gimme|show|what's that|this plan → the (isTickPlanAsk articles are a|the|your only)
    .replace(/\bthat (plan|pipeline|next steps)\b/g, 'the $1')
    .replace(/\bthis (plan|pipeline|next steps)\b/g, 'the $1') // residual: this plan parity that→the
    .replace(/\bteh\b/g, 'the') // residual: gimme|whats teh plan → the (typo parity that→the)
    .replace(/\bwhatsyourplan\b/g, "what's your plan")
    // residual: fully glued whats|hows + my|our + plan (parity whatsyourplan; isTickPlanAsk my|our)
    .replace(/\bwhatsmyplan\b/g, "what's my plan")
    .replace(/\bhowsmyplan\b/g, "how's my plan")
    .replace(/\bwhatsourplan\b/g, "what's our plan")
    .replace(/\bhowsourplan\b/g, "how's our plan")
    // residual: wots|wats|wuts|whuts + my|our plan (parity wotsyourplan; \bwots\b cannot split glued)
    .replace(/\bwotsmyplan\b/g, "what's my plan")
    .replace(/\bwatsmyplan\b/g, "what's my plan")
    .replace(/\bwutsmyplan\b/g, "what's my plan")
    .replace(/\bwhutsmyplan\b/g, "what's my plan")
    .replace(/\bwotsourplan\b/g, "what's our plan")
    .replace(/\bwatsourplan\b/g, "what's our plan")
    .replace(/\bwutsourplan\b/g, "what's our plan")
    .replace(/\bwhutsourplan\b/g, "what's our plan")
    // residual: howz|whatz + my|our plan (parity howz/whatz your; \bhowz\b cannot split glued)
    .replace(/\bhowzmyplan\b/g, "how's my plan")
    .replace(/\bwhatzmyplan\b/g, "what's my plan")
    .replace(/\bhowzourplan\b/g, "how's our plan")
    .replace(/\bwhatzourplan\b/g, "what's our plan")
    // residual: fully glued whats|hows + ur + plan (whatsur/howsur space ok; \bwhatsur\b cannot split)
    .replace(/\bwhatsurplan\b/g, "what's your plan")
    .replace(/\bhowsurplan\b/g, "how's your plan")
    // residual: fully glued +yerplan (\bwhatsyer\b cannot split whatsyerplan → tick-plan)
    .replace(/\bwhatsyerplan\b/g, "what's your plan")
    .replace(/\bhowsyerplan\b/g, "how's your plan")
    .replace(/\bwotsyerplan\b/g, "what's your plan")
    .replace(/\bwatsyerplan\b/g, "what's your plan")
    .replace(/\bwutsyerplan\b/g, "what's your plan")
    .replace(/\bwhutsyerplan\b/g, "what's your plan")
    .replace(/\bwhatzyerplan\b/g, "what's your plan")
    .replace(/\bhowzyerplan\b/g, "how's your plan")
    // residual: fully glued +yurplan (\bwhatsyur\b cannot split whatsyurplan → tick-plan)
    .replace(/\bwhatsyurplan\b/g, "what's your plan")
    .replace(/\bhowsyurplan\b/g, "how's your plan")
    .replace(/\bwotsyurplan\b/g, "what's your plan")
    .replace(/\bwatsyurplan\b/g, "what's your plan")
    .replace(/\bwutsyurplan\b/g, "what's your plan")
    .replace(/\bwhutsyurplan\b/g, "what's your plan")
    // residual: whatz|howz + yurplan (parity whatzyerplan / whatsyurplan → tick-plan)
    .replace(/\bwhatzyurplan\b/g, "what's your plan")
    .replace(/\bhowzyurplan\b/g, "how's your plan")
    // residual: fully glued +yaplan (\bwhatsya\b cannot split whatsyaplan → tick-plan)
    .replace(/\bwhatsyaplan\b/g, "what's your plan")
    .replace(/\bhowsyaplan\b/g, "how's your plan")
    .replace(/\bwotsyaplan\b/g, "what's your plan")
    .replace(/\bwatsyaplan\b/g, "what's your plan")
    .replace(/\bwutsyaplan\b/g, "what's your plan")
    .replace(/\bwhutsyaplan\b/g, "what's your plan")
    .replace(/\bwhatzyaplan\b/g, "what's your plan")
    .replace(/\bhowzyaplan\b/g, "how's your plan")
    // residual: wots|wats|wuts|whuts + yourplan (\bwots\b etc cannot split glued → tick-plan)
    .replace(/\bwotsyourplan\b/g, "what's your plan")
    .replace(/\bwatsyourplan\b/g, "what's your plan")
    .replace(/\bwutsyourplan\b/g, "what's your plan")
    .replace(/\bwhutsyourplan\b/g, "what's your plan")
    .replace(/\bshowtheplan\b/g, 'show the plan')
    .replace(/\bshowyourplan\b/g, 'show your plan') // residual: showyourplan (parity whatsyourplan)
    // residual: fully glued show|tell|give + me|us + theplan (showme+theplan cannot split)
    .replace(/\bshowmetheplan\b/g, 'show me the plan')
    .replace(/\bshowustheplan\b/g, 'show us the plan')
    .replace(/\btellmetheplan\b/g, 'tell me the plan')
    .replace(/\btellustheplan\b/g, 'tell us the plan')
    .replace(/\bgivemetheplan\b/g, 'give me the plan')
    .replace(/\bgiveustheplan\b/g, 'give us the plan')
    // residual: fully glued show|tell|give|read + me|us + plan (no "the"; \bshowme\b cannot split showmeplan → tick-plan)
    .replace(/\b(show|tell|give|read)meplan\b/g, '$1 me the plan')
    .replace(/\b(show|tell|give|read)usplan\b/g, '$1 us the plan')
    .replace(/\bhitmeplan\b/g, 'hit me with the plan')
    .replace(/\bhitusplan\b/g, 'hit us with the plan')
    .replace(/\bgimmeplan\b/g, 'give me the plan') // residual: gimmeplan (parity gimmetheplan; no invent RSVPs)
    // residual: fully glued read|hit + me|us + theplan (readme|hitme cannot split theplan → tick-plan)
    .replace(/\breadmetheplan\b/g, 'read me the plan')
    .replace(/\breadustheplan\b/g, 'read us the plan')
    .replace(/\bhitmetheplan\b/g, 'hit me with the plan')
    .replace(/\bhitustheplan\b/g, 'hit us with the plan')
    // residual: fully glued hitme|hitus + with + theplan (hitmewith cannot split → tick-plan)
    .replace(/\bhitmewiththeplan\b/g, 'hit me with the plan')
    .replace(/\bhituswiththeplan\b/g, 'hit us with the plan')
    // residual: fully glued spit|spill|run + me|us + theplan (spitme|runme cannot split theplan → tick-plan)
    .replace(/\bspitmetheplan\b/g, 'spit me the plan')
    .replace(/\bspitustheplan\b/g, 'spit us the plan')
    .replace(/\bspillmetheplan\b/g, 'spill me the plan')
    .replace(/\bspillustheplan\b/g, 'spill us the plan')
    .replace(/\brunmetheplan\b/g, 'run me the plan')
    .replace(/\brunustheplan\b/g, 'run us the plan')
    // residual: fully glued hand|drop|shoot|toss + me|us + theplan (parity hitmetheplan → tick-plan)
    .replace(/\bhandmetheplan\b/g, 'hand me the plan')
    .replace(/\bhandustheplan\b/g, 'hand us the plan')
    .replace(/\bdropmetheplan\b/g, 'drop me the plan')
    .replace(/\bdropustheplan\b/g, 'drop us the plan')
    .replace(/\bshootmetheplan\b/g, 'shoot me the plan')
    .replace(/\bshootustheplan\b/g, 'shoot us the plan')
    .replace(/\btossmetheplan\b/g, 'toss me the plan')
    .replace(/\btossustheplan\b/g, 'toss us the plan')
    // residual: fully glued send|share + me|us + theplan (parity hand/drop; sendme|shareme cannot split)
    .replace(/\bsendmetheplan\b/g, 'send me the plan')
    .replace(/\bsendustheplan\b/g, 'send us the plan')
    .replace(/\bsharemetheplan\b/g, 'share me the plan')
    .replace(/\bshareustheplan\b/g, 'share us the plan')
    // residual: fully glued kick|blast|…|grab|bring + me|us + theplan
    // (parity sendmetheplan; grabme|bringme cannot split theplan → isTickPlanAsk verb set)
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling|dump|lay|grab|bring)metheplan\b/g, '$1 me the plan')
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling|dump|lay|grab|bring)ustheplan\b/g, '$1 us the plan')
    // residual: *mewith|*uswith + theplan (parity hitmewiththeplan; hand|drop|…|grab|bring too)
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling|dump|lay|hand|drop|shoot|toss|send|share|spit|spill|run|read|grab|bring)mewiththeplan\b/g, '$1 me the plan')
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling|dump|lay|hand|drop|shoot|toss|send|share|spit|spill|run|read|grab|bring)uswiththeplan\b/g, '$1 us the plan')
    // residual: fully glued gimme|gimmie|gimmi|gimmy|gimmee + theplan (\bgimme\b cannot split)
    .replace(/\bgimmetheplan\b/g, 'give me the plan')
    .replace(/\bgimmietheplan\b/g, 'give me the plan')
    .replace(/\bgimmitheplan\b/g, 'give me the plan') // residual: gimmitheplan (parity gimmi + gimmetheplan)
    .replace(/\bgimmytheplan\b/g, 'give me the plan')
    .replace(/\bgimmeetheplan\b/g, 'give me the plan') // residual: gimmeetheplan (parity gimmee + gimmetheplan)
    .replace(/\bgimmatheplan\b/g, 'give me the plan') // residual: gimmatheplan (parity gimma + gimmetheplan)
    .replace(/\bgivmetheplan\b/g, 'give me the plan') // residual: givmetheplan (parity givme + gimmetheplan)
    // residual: fully glued gimmeya|gimmieya|gimmiya|gimmeur|givemeur + plan (cannot split)
    .replace(/\bgimmeyatheplan\b/g, 'give me the plan')
    .replace(/\bgimmieyatheplan\b/g, 'give me the plan') // residual: gimmieya + theplan
    .replace(/\bgimmiyatheplan\b/g, 'give me the plan') // residual: gimmiya + theplan
    .replace(/\bgimmeyaplan\b/g, 'give me your plan') // residual: gimmeyaplan (parity gimmeyourplan/whatsyaplan)
    .replace(/\bgimmieyaplan\b/g, 'give me your plan') // residual: gimmieyaplan (parity gimmeyaplan)
    .replace(/\bgimmiyaplan\b/g, 'give me your plan') // residual: gimmiyaplan (parity gimmeyaplan)
    .replace(/\bgimmayaplan\b/g, 'give me your plan') // residual: gimmayaplan (parity gimmeyaplan + gimma; isTickPlanAsk)
    .replace(/\bgimmeurplan\b/g, 'give me your plan')
    .replace(/\bgivemeurplan\b/g, 'give me your plan')
    .replace(/\bgimmeyourplan\b/g, 'give me your plan')
    .replace(/\bgimmayourplan\b/g, 'give me your plan') // residual: gimmayourplan (parity gimmeyourplan + gimma; isTickPlanAsk)
    // residual: pulluptheplan|pullup the plan → pull up (isTickPlanAsk; no invent RSVPs)
    .replace(/\bpulluptheplan\b/g, 'pull up the plan')
    .replace(/\bpullup\b/g, 'pull up')

    // residual: telltheplan|howstheplan|howsyourplan (parity showtheplan / whatstheplan → Owner tick plan)
    .replace(/\btelltheplan\b/g, 'tell me the plan')
    .replace(/\bhowstheplan\b/g, "how's the plan")
    .replace(/\bhowztheplan\b/g, "how's the plan") // residual: howztheplan (parity howstheplan; \bhowz\b cannot split)
    .replace(/\bhowsyourplan\b/g, "how's your plan") // residual: howsyourplan (parity whatsyourplan)
    .replace(/\bhowzyourplan\b/g, "how's your plan") // residual: howzyourplan (parity howsyourplan / howz)
    .replace(/\bwhatzyourplan\b/g, "what's your plan") // residual: whatzyourplan (parity howzyourplan)
    .replace(/\bwhatztheplan\b/g, "what's the plan") // residual: whatztheplan (parity whatstheplan/whatzyourplan)
    .replace(/\bhowboutyourplan\b/g, 'how about your plan') // residual: howboutyourplan (parity howbouttheplan)
    .replace(/\bwhatboutyourplan\b/g, 'what about your plan') // residual: whatboutyourplan (parity whatbouttheplan)
    // residual: fully glued howbout|whatbout + our + plan (parity your; isTickPlanAsk our article)
    .replace(/\bhowboutourplan\b/g, 'how about our plan')
    .replace(/\bwhatboutourplan\b/g, 'what about our plan')
    .replace(/\bhowaboutourplan\b/g, 'how about our plan')
    .replace(/\bwhataboutourplan\b/g, 'what about our plan')
    // residual: hows|howz|whats|whatz + aboutourplan (parity theplan/yaplan; \bhowsabout\b cannot split)
    .replace(/\bhowsaboutourplan\b/g, 'how about our plan')
    .replace(/\bhowzaboutourplan\b/g, 'how about our plan')
    .replace(/\bwhatsaboutourplan\b/g, 'what about our plan')
    .replace(/\bwhatzaboutourplan\b/g, 'what about our plan')
    // residual: fully glued howbout|whatbout + my + plan (parity our; isTickPlanAsk my article)
    .replace(/\bhowboutmyplan\b/g, 'how about my plan')
    .replace(/\bwhatboutmyplan\b/g, 'what about my plan')
    .replace(/\bhowaboutmyplan\b/g, 'how about my plan')
    .replace(/\bwhataboutmyplan\b/g, 'what about my plan')
    // residual: hows|howz|whats|whatz + aboutmyplan (parity aboutourplan / theplan; cannot split)
    .replace(/\bhowsaboutmyplan\b/g, 'how about my plan')
    .replace(/\bhowzaboutmyplan\b/g, 'how about my plan')
    .replace(/\bwhatsaboutmyplan\b/g, 'what about my plan')
    .replace(/\bwhatzaboutmyplan\b/g, 'what about my plan')
    // residual: fully glued howbout|whatsabout + ya + plan (\bhowboutya\b cannot split → Owner tick plan)
    .replace(/\bhowboutyaplan\b/g, 'how about your plan')
    .replace(/\bhowsaboutyaplan\b/g, 'how about your plan')
    .replace(/\bhowzaboutyaplan\b/g, 'how about your plan')
    .replace(/\bhowaboutyaplan\b/g, 'how about your plan')
    .replace(/\bwhatboutyaplan\b/g, 'what about your plan')
    .replace(/\bwhatsaboutyaplan\b/g, 'what about your plan')
    .replace(/\bwhatzaboutyaplan\b/g, 'what about your plan')
    .replace(/\bwhataboutyaplan\b/g, 'what about your plan')
    // residual: whatsabout|whatzabout + ur|yer|yur + plan (parity yaplan + whatbouturplan; \bur\b cannot split)
    .replace(/\bwhatsabouturplan\b/g, 'what about your plan')
    .replace(/\bwhatsaboutyerplan\b/g, 'what about your plan')
    .replace(/\bwhatsaboutyurplan\b/g, 'what about your plan')
    .replace(/\bwhatzabouturplan\b/g, 'what about your plan')
    .replace(/\bwhatzaboutyerplan\b/g, 'what about your plan')
    .replace(/\bwhatzaboutyurplan\b/g, 'what about your plan')
    // residual: howbout|whatbout + ur|yer|yur + plan (parity yaplan + whatsurplan; \bur\b cannot split)
    .replace(/\bhowbouturplan\b/g, 'how about your plan')
    .replace(/\bhowboutyerplan\b/g, 'how about your plan')
    .replace(/\bhowboutyurplan\b/g, 'how about your plan')
    .replace(/\bwhatbouturplan\b/g, 'what about your plan')
    .replace(/\bwhatboutyerplan\b/g, 'what about your plan')
    .replace(/\bwhatboutyurplan\b/g, 'what about your plan')
    // residual: full about + ur|yer|yur + plan (parity bout*; \bhowaboutur\b cannot split → isTickPlanAsk)
    .replace(/\bhowabouturplan\b/g, 'how about your plan')
    .replace(/\bhowaboutyerplan\b/g, 'how about your plan')
    .replace(/\bhowaboutyurplan\b/g, 'how about your plan')
    .replace(/\bwhatabouturplan\b/g, 'what about your plan')
    .replace(/\bwhataboutyerplan\b/g, 'what about your plan')
    .replace(/\bwhataboutyurplan\b/g, 'what about your plan')
    // residual: fully glued howbout|howsabout|howzabout + theplan (parity howbout the plan)
    .replace(/\bhowbouttheplan\b/g, 'how about the plan')
    .replace(/\bhowsabouttheplan\b/g, 'how about the plan')
    .replace(/\bhowzabouttheplan\b/g, 'how about the plan')
    .replace(/\bhowabouttheplan\b/g, 'how about the plan') // residual: full about (parity howbouttheplan)
    // residual: fully glued whatbout + theplan (parity howbouttheplan → isTickPlanAsk what about)
    .replace(/\bwhatbouttheplan\b/g, 'what about the plan')
    .replace(/\bwhatabouttheplan\b/g, 'what about the plan') // residual: full about (parity whatbouttheplan)
    // residual: whatsabout|whatzabout + theplan (parity howsabouttheplan; \bwhatbout\b cannot match whats)
    .replace(/\bwhatsabouttheplan\b/g, 'what about the plan')
    .replace(/\bwhatzabouttheplan\b/g, 'what about the plan')
    // residual: "whats ur plan" / "gimme ur plan" → your (tick-plan regexes)
    .replace(/\bur\b/g, 'your')
    // residual: "whats yer plan" / "gimme yer plan" / "hows yer plan" (parity ur)
    .replace(/\byer\b/g, 'your')
    // residual: "whats yur plan" / "gimme yur plan" / "hows yur plan" (parity ur|yer)
    .replace(/\byur\b/g, 'your')
    // residual: "gimme ya plan" / "show me ya pipeline" (scoped; not bare \bya\b)
    .replace(/\b(me|us) ya\b/g, '$1 your')
    // residual: "lemme see ya plan" → see your (tick-plan; after lemme→let me)
    .replace(/\bsee ya\b/g, 'see your')
    // residual: fully glued whatsthe + gameplan|callsheet|cuesheet|runofshow
    // (\bwhatstheplan\b cannot split these; bare gameplan|callsheet cannot match mid-token)
    .replace(/\bwhatsthegameplan\b/g, "what's the game plan")
    .replace(/\bwhatsthecallsheet\b/g, "what's the call sheet")
    .replace(/\bwhatsthecuesheet\b/g, "what's the cue sheet")
    .replace(/\bwhatstherunofshow\b/g, "what's the run of show")
    // residual: "what's|gimme the gameplan" → game plan (isTickPlanAsk game plan)
    .replace(/\bgameplan\b/g, 'game plan')
    // residual: "whats the callsheet" → call sheet (isTickPlanAsk call sheet; glued miss)
    .replace(/\bcallsheet\b/g, 'call sheet')
    // residual: "whats the cuesheet|runofshow" → cue sheet|run of show (isTickPlanAsk; glued miss parity callsheet)
    .replace(/\bcuesheet\b/g, 'cue sheet')
    .replace(/\brunofshow\b/g, 'run of show')
    // residual: "layout|mapout the plan|night" → lay out|map out (isTickPlanAsk space forms)
    .replace(/\blayout (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'lay out $1$2')
    .replace(/\bmapout (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'map out $1$2')
    // residual: glued spellout|breakdown|runthrough|walkthru|talkthru the plan → space forms
    .replace(/\bspellout (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'spell out $1$2')
    .replace(/\bbreakdown (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'break down $1$2')
    .replace(/\brunthrough (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'run through $1$2')
    .replace(/\bwalkthru (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'walk through $1$2')
    .replace(/\btalkthru (the |your |this )?(plan|pipeline|tick|night|ops|tonight)\b/g, 'talk through $1$2')
    // residual: layoutya|mapoutya plan (glued +ya; \blayout|\bmapout space forms cannot split)
    .replace(/\blayoutya\b/g, 'lay out your')
    // residual: "lay|map|spell out ya plan" / "layout ya plan" (space form; layoutya is glued)
    .replace(/\b(lay|map|spell) out ya\b/g, '$1 out your')
    .replace(/\blayout ya\b/g, 'lay out your')
    // residual: mapout|spellout|breakdown|runthrough|walkthru|talkthru ya (space; parity layout ya → tick-plan)
    .replace(/\bmapout ya\b/g, 'map out your')
    .replace(/\bspellout ya\b/g, 'spell out your')
    .replace(/\bbreakdown ya\b/g, 'break down your')
    .replace(/\brunthrough ya\b/g, 'run through your')
    .replace(/\bwalkthru ya\b/g, 'walk through your')
    .replace(/\btalkthru ya\b/g, 'talk through your')
    .replace(/\bmapoutya\b/g, 'map out your')
    // residual: spelloutya|breakdownya|runthroughya|walkthruya|talkthruya plan (parity layoutya → isTickPlanAsk)
    .replace(/\bspelloutya\b/g, 'spell out your')
    .replace(/\bbreakdownya\b/g, 'break down your')
    .replace(/\brunthroughya\b/g, 'run through your')
    .replace(/\bwalkthruya\b/g, 'walk through your')
    .replace(/\btalkthruya\b/g, 'talk through your')
    // residual: fully glued +yaplan (\blayoutya\b cannot split layoutyaplan → Owner tick plan)
    .replace(/\blayoutyaplan\b/g, 'lay out your plan')
    .replace(/\bmapoutyaplan\b/g, 'map out your plan')
    .replace(/\bspelloutyaplan\b/g, 'spell out your plan')
    .replace(/\bbreakdownyaplan\b/g, 'break down your plan')
    .replace(/\brunthroughyaplan\b/g, 'run through your plan')
    .replace(/\bwalkthruyaplan\b/g, 'walk through your plan')
    .replace(/\btalkthruyaplan\b/g, 'talk through your plan')
    // residual: fully glued layout|mapout|spellout|breakdown|runthrough|walkthru|talkthru + theplan
    // (\blayout theplan space forms cannot split → isTickPlanAsk lay out the plan)
    .replace(/\blayouttheplan\b/g, 'lay out the plan')
    .replace(/\bmapouttheplan\b/g, 'map out the plan')
    .replace(/\bspellouttheplan\b/g, 'spell out the plan')
    .replace(/\bbreakdowntheplan\b/g, 'break down the plan')
    .replace(/\brunthroughtheplan\b/g, 'run through the plan')
    .replace(/\bwalkthrutheplan\b/g, 'walk through the plan')
    .replace(/\btalkthrutheplan\b/g, 'talk through the plan')
    // residual: "gimme da|tha|dat|dis plan" → the plan (tick-plan; after gimme→give me)
    .replace(/\bda (plan|pipeline|next steps)\b/g, 'the $1')
    .replace(/\btha (plan|pipeline|next steps)\b/g, 'the $1')
    .replace(/\bdat (plan|pipeline|next steps)\b/g, 'the $1') // residual: gimme|whats dat plan (parity da|tha)
    .replace(/\bdis (plan|pipeline|next steps)\b/g, 'the $1') // residual: gimme|whats dis plan (parity dat)
    // residual: "hit me with ya plan" → with your (tick-plan; not bare \bya\b)
    .replace(/\bwith ya\b/g, 'with your')
    // residual: whatsup|whassup|wassup with the plan → sup with (isTickPlanAsk residual)
    .replace(/\bwhatsup\b/g, 'sup')
    .replace(/\bwhassup\b/g, 'sup')
    .replace(/\bwassup\b/g, 'sup') // residual: wassup with the plan (parity whatsup/whassup)
    .replace(/\bwussup\b/g, 'sup') // residual: wussup with the plan (parity wassup/whatsup)
    .replace(/\bwazzup\b/g, 'sup') // residual: wazzup with the plan (parity wassup/whatsup)
    // residual: "showya the plan" → show ya → show me (tick-plan)
    .replace(/\bshowya\b/g, 'show ya')
    // residual: "tellya the plan" → tell ya → tell me (parity showya)
    .replace(/\btellya\b/g, 'tell ya')
    // residual: "hitya with the plan" → hit ya → hit me (parity showya/tellya)
    .replace(/\bhitya\b/g, 'hit ya')
    // residual: "giveya the plan" → give ya → give me (parity showya/tellya/hitya)
    .replace(/\bgiveya\b/g, 'give ya')
    // residual: dropya|shootya|tossya|sendya|readya|peepya|peekya the plan (parity giveya/showya)
    .replace(/\bdropya\b/g, 'drop ya')
    .replace(/\bshootya\b/g, 'shoot ya')
    .replace(/\btossya\b/g, 'toss ya')
    .replace(/\bsendya\b/g, 'send ya')
    .replace(/\breadya\b/g, 'read ya')
    // residual: peepya|peekya the plan → let me peep|peek (isTickPlanAsk peep/peek)
    .replace(/\bpeepya\b/g, 'let me peep')
    .replace(/\bpeekya\b/g, 'let me peek')
    // residual: "lemme peep|peek|hear ya plan" → your (possessive; not peep your the)
    .replace(/\b(peep|peek|hear) ya (plan|pipeline|next steps|tick)\b/g, '$1 your $2')
    // residual: glued "showus|tellus|showme|tellme|giveme|giveus|hitme|hitus the plan" / "walkme through"
    .replace(/\bshowus\b/g, 'show us')
    .replace(/\btellus\b/g, 'tell us')
    .replace(/\bshowme\b/g, 'show me') // residual: showme the plan (parity showus)
    .replace(/\btellme\b/g, 'tell me') // residual: tellme the plan (parity tellus)
    .replace(/\breadme\b/g, 'read me') // residual: readme the plan (parity showme/tellme)
    .replace(/\breadus\b/g, 'read us') // residual: readus the plan (parity showus/tellus)
    .replace(/\bgiveme\b/g, 'give me') // residual: giveme the plan (parity gimme)
    .replace(/\bgiveus\b/g, 'give us') // residual: giveus the plan (parity giveme/showus)
    .replace(/\bhitme\b/g, 'hit me') // residual: hitme with the plan (tick-plan)
    .replace(/\bhitus\b/g, 'hit us') // residual: hitus with the plan (parity hitme)
    // residual: showme|tellme ya plan — unglue me|us first, then ya→your (early (me|us) ya misses)
    .replace(/\b(me|us) ya\b/g, '$1 your')
    // residual: "hit me|us w|w/ the plan" (informal with; isTickPlanAsk hit…(?: with)?; no invent RSVPs)
    .replace(/\bhit (me|us) w\/?(?=\s)/g, 'hit $1 with')
    .replace(/\bdropme\b/g, 'drop me') // residual: dropme the plan (parity hitme → tick-plan)
    .replace(/\bdumpme\b/g, 'dump me') // residual: dumpme the plan (parity dropme → isTickPlanAsk; no invent RSVPs)
    .replace(/\bshootme\b/g, 'shoot me') // residual: shootme the plan (parity dropme)
    .replace(/\btossme\b/g, 'toss me') // residual: tossme the plan (parity dropme)
    .replace(/\bsendme\b/g, 'send me') // residual: sendme the plan (plan surface only; not email send)
    .replace(/\bhandme\b/g, 'hand me') // residual: handme the plan (parity give/send → tick-plan)
    .replace(/\bhandus\b/g, 'hand us') // residual: handus the plan (parity handme/sendus)
    .replace(/\bhandya\b/g, 'hand ya') // residual: handya the plan (parity giveya/showya → hand me)
    .replace(/\bshareme\b/g, 'share me') // residual: shareme the plan (parity give/hand → tick-plan)
    .replace(/\bshareus\b/g, 'share us') // residual: shareus the plan (parity shareme)
    .replace(/\bshareya\b/g, 'share ya') // residual: shareya the plan (parity handya → share me)
    // residual: grabme|bringme the plan (parity give/drop → isTickPlanAsk; no invent RSVPs)
    .replace(/\bgrabme\b/g, 'grab me')
    .replace(/\bgrabus\b/g, 'grab us')
    .replace(/\bbringme\b/g, 'bring me')
    .replace(/\bbringus\b/g, 'bring us')
    // residual: dropus|dumpus|shootus|tossus|sendus the plan (parity dropme + hitus → tick-plan; no invent RSVPs)
    .replace(/\bdropus\b/g, 'drop us')
    .replace(/\bdumpus\b/g, 'dump us') // residual: dumpus the plan (parity dropus → isTickPlanAsk; no invent RSVPs)
    .replace(/\bshootus\b/g, 'shoot us')
    .replace(/\btossus\b/g, 'toss us')
    .replace(/\bsendus\b/g, 'send us')
    .replace(/\bspitme\b/g, 'spit me') // residual: spitme the plan (parity spill/tellme)
    .replace(/\bspitus\b/g, 'spit us') // residual: spitus the plan (parity spitme/hitus)
    .replace(/\bspitya\b/g, 'spit ya') // residual: spitya the plan (parity showya/tellya/hitya/giveya)
    .replace(/\bspillme\b/g, 'spill me') // residual: spillme the plan (parity spitme; no invent RSVPs)
    .replace(/\bspillus\b/g, 'spill us') // residual: spillus the plan (parity spitme/hitus)
    .replace(/\bspillya\b/g, 'spill ya') // residual: spillya the plan (parity spit ya → me)
    .replace(/\bwalkme\b/g, 'walk me')
    .replace(/\brunme\b/g, 'run me') // residual: runme through the plan (parity walkme)
    .replace(/\btalkme\b/g, 'talk me') // residual: talkme through the plan (parity walkme)
    // residual: walkya|talkya|runya through the plan (parity walkme + showya → me; isTickPlanAsk)
    .replace(/\bwalkya\b/g, 'walk me')
    .replace(/\btalkya\b/g, 'talk me')
    .replace(/\brunya\b/g, 'run me')
    .replace(/\bwalkus\b/g, 'walk us') // residual: walkus through the plan (parity showus)
    .replace(/\btalkus\b/g, 'talk us') // residual: talkus through the plan (parity walkus)
    .replace(/\brunus\b/g, 'run us') // residual: runus through the plan (parity runme/walkus)
    // residual: kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling + me|us (isTickPlanAsk; parity dropme)
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling)me\b/g, '$1 me')
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling)us\b/g, '$1 us')
    .replace(/\b(kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling)ya\b/g, '$1 ya')
    // residual: "show|tell|…|pass|lob ya the plan" → me paths (parity isTickPlanAsk verb set)
    .replace(
      /\b(show|tell|give|hit|spit|spill|drop|shoot|toss|send|read|hand|share|kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling) ya\b/g,
      '$1 me',
    )
    // residual: howboutya|howzaboutya|howboutur|howboutyer plan (glued before howbout→how about)
    .replace(/\bhowboutya\b/g, 'how about your')
    .replace(/\bhowzaboutya\b/g, 'how about your')
    .replace(/\bhowboutur\b/g, 'how about your') // residual: howboutur plan (parity howboutya)
    .replace(/\bhowsaboutya\b/g, 'how about your') // residual: howsaboutya plan (parity howboutya)
    .replace(/\bhowsaboutur\b/g, 'how about your') // residual: howsaboutur plan (parity howboutur)
    .replace(/\bhowzaboutur\b/g, 'how about your') // residual: howzaboutur plan (parity howboutur/howzaboutya)
    // residual: howboutyer|howsaboutyer|howzaboutyer plan (parity howboutya + whatsyer; before bare howbout)
    .replace(/\bhowboutyer\b/g, 'how about your')
    .replace(/\bhowsaboutyer\b/g, 'how about your')
    .replace(/\bhowzaboutyer\b/g, 'how about your')
    // residual: howaboutya|ur|yer|yur (full about; howbout→bout only — cannot split howaboutya)
    .replace(/\bhowaboutya\b/g, 'how about your')
    .replace(/\bhowaboutur\b/g, 'how about your')
    .replace(/\bhowaboutyer\b/g, 'how about your')
    .replace(/\bhowaboutyur\b/g, 'how about your') // residual: howaboutyur plan (parity howaboutyer + howboutyurplan)
    // residual: howboutyur|howsaboutyur|howzaboutyur (parity howboutyer; before bare howbout)
    .replace(/\bhowboutyur\b/g, 'how about your')
    .replace(/\bhowsaboutyur\b/g, 'how about your')
    .replace(/\bhowzaboutyur\b/g, 'how about your')
    // "how bout|how'bout|howbout the plan" → how about … (tick-plan residual; space ok)

    .replace(/\bhow['’]?\s*bout\b/g, 'how about')
    .replace(/\bhowsabout\b/g, 'how about') // residual: howsabout the plan
    .replace(/\bhowzabout\b/g, 'how about') // residual: howzabout the plan (parity howsabout)
    // residual: whatsabout|whatzabout the plan (parity howsabout; whats+about ≠ whatbout)
    .replace(/\bwhatsabout\b/g, 'what about')
    .replace(/\bwhatzabout\b/g, 'what about')
    // residual: whatboutya|whatboutur|whatboutyer|whatboutyur plan (parity howboutya family; before bare whatbout)
    .replace(/\bwhatboutya\b/g, 'what about your')
    .replace(/\bwhatboutur\b/g, 'what about your')
    .replace(/\bwhatboutyer\b/g, 'what about your')
    .replace(/\bwhatboutyur\b/g, 'what about your') // residual: whatboutyur plan (parity howboutyur)
    // residual: whataboutya|ur|yer|yur (full about; parity howaboutya + whatboutya)
    .replace(/\bwhataboutya\b/g, 'what about your')
    .replace(/\bwhataboutur\b/g, 'what about your')
    .replace(/\bwhataboutyer\b/g, 'what about your')
    .replace(/\bwhataboutyur\b/g, 'what about your') // residual: whataboutyur plan (parity howaboutyur)
    // residual: whatsaboutya|whatzaboutya family (parity howsaboutya + whatboutya; \bwhatsabout\b cannot split)
    .replace(/\bwhatsaboutya\b/g, 'what about your')
    .replace(/\bwhatsaboutur\b/g, 'what about your')
    .replace(/\bwhatsaboutyer\b/g, 'what about your')
    .replace(/\bwhatsaboutyur\b/g, 'what about your') // residual: whatsaboutyur plan (parity whatboutyur/whatsaboutyer)
    .replace(/\bwhatzaboutya\b/g, 'what about your')
    .replace(/\bwhatzaboutur\b/g, 'what about your')
    .replace(/\bwhatzaboutyer\b/g, 'what about your')
    .replace(/\bwhatzaboutyur\b/g, 'what about your') // residual: whatzaboutyur plan (parity whatsaboutyur)
    // residual: whatbout|what bout the plan → what about (parity howbout; isTickPlanAsk what about)
    .replace(/\bwhat['’]?\s*bout\b/g, 'what about')
    .replace(/\bthats\b/g, "that's")
    .replace(/\bwhos\b/g, "who's")
    .replace(/\bhows\b/g, "how's")
    .replace(/\bhowz\b/g, "how's") // residual: howz the plan → how's (parity hows)
    .replace(/\bwhatz\b/g, "what's") // residual: whatz the plan → what's (parity howz; glued whatz* already above)
    // residual: "whatsa the plan" → what's the plan (tick-plan)
    .replace(/\bwhatsa\b/g, "what's")
    // After hows→how's: "how's about the plan" must hit how-about tick-plan path
    .replace(/\bhow's about\b/g, 'how about')
    // After whats→what's: "whats about ya|the plan" → what about (parity hows about; isTickPlanAsk)
    .replace(/\bwhat's about\b/g, 'what about')
    // After whats/hows expand: "whats ya plan" / "hows ya plan" → your (Owner tick plan)
    .replace(/\bwhat's ya\b/g, "what's your")
    .replace(/\bhow's ya\b/g, "how's your")
    // residual: glued whatsya|howsya plan (before bare whats/hows cannot split)
    .replace(/\bwhatsya\b/g, "what's your")
    .replace(/\bhowsya\b/g, "how's your")
    // residual: howzya|howzur|howzyer|howzyur plan (parity howsya/howsur/howsyer/howsyur; \bhowz\b cannot split glued)
    .replace(/\bhowzya\b/g, "how's your")
    .replace(/\bhowzur\b/g, "how's your")
    .replace(/\bhowzyer\b/g, "how's your")
    .replace(/\bhowzyur\b/g, "how's your") // residual: howzyur plan (parity howzyer + howsyur)
    // residual: whatzya|whatzur|whatzyer|whatzyur plan (parity howzya family + whatsyur; \bwhatz\b cannot split)
    .replace(/\bwhatzya\b/g, "what's your")
    .replace(/\bwhatzur\b/g, "what's your")
    .replace(/\bwhatzyer\b/g, "what's your")
    .replace(/\bwhatzyur\b/g, "what's your") // residual: whatzyur plan (parity whatzyer + whatsyur)
    // residual: whatsur|howsur plan (parity whatsya|howsya; glued +ur → your)
    .replace(/\bwhatsur\b/g, "what's your")
    .replace(/\bhowsur\b/g, "how's your")
    // residual: wotsya|watsya|wutsya|whutsya plan (parity whatsya; \bwots\b cannot split glued)
    .replace(/\bwotsya\b/g, "what's your")
    .replace(/\bwatsya\b/g, "what's your")
    .replace(/\bwutsya\b/g, "what's your")
    .replace(/\bwhutsya\b/g, "what's your") // residual: whutsya plan (parity whatsya/wutsya)
    // residual: wotsur|watsur|wutsur|whutsur plan (parity wotsya family +ur)
    .replace(/\bwotsur\b/g, "what's your")
    .replace(/\bwatsur\b/g, "what's your")
    .replace(/\bwutsur\b/g, "what's your")
    .replace(/\bwhutsur\b/g, "what's your")
    // residual: whatsyer|howsyer|wotsyer… plan (parity whatsya/whatsur; glued +yer; \byer\b cannot split)
    .replace(/\bwhatsyer\b/g, "what's your")
    .replace(/\bhowsyer\b/g, "how's your")
    .replace(/\bwotsyer\b/g, "what's your")
    .replace(/\bwatsyer\b/g, "what's your")
    .replace(/\bwutsyer\b/g, "what's your")
    .replace(/\bwhutsyer\b/g, "what's your")
    // residual: whatsyur|howsyur… plan (parity whatsyer; glued +yur; \byur\b cannot split)
    .replace(/\bwhatsyur\b/g, "what's your")
    .replace(/\bhowsyur\b/g, "how's your")
    .replace(/\bwotsyur\b/g, "what's your")
    .replace(/\bwatsyur\b/g, "what's your")
    .replace(/\bwutsyur\b/g, "what's your")
    .replace(/\bwhutsyur\b/g, "what's your")
    // After howbout→how about: "howbout ya plan" → how about your (tick-plan residual)
    .replace(/\bhow about ya\b/g, 'how about your')
    // residual: "what about ya plan" after bare whatbout (parity how about ya → tick-plan)
    .replace(/\bwhat about ya\b/g, 'what about your')
    .replace(/\bwheres\b/g, "where's")
    .replace(/\bim\b/g, "i'm")
    .replace(/\bive\b/g, "i've")
    .replace(/\bdont\b/g, "don't")
    .replace(/\bwont\b/g, "won't")
    .replace(/\bcant\b/g, "can't");
}

function rateOk(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { n: 0, t0: now };
  if (now - b.t0 > 60 * 60 * 1000) {
    b.n = 0;
    b.t0 = now;
  }
  b.n += 1;
  buckets.set(ip, b);
  return b.n <= 40;
}

export function snapshotLine(store = loadStore()) {
  try {
    const ae = store.activeEvent || {};
    const matches = matchOffersToEvent(store);
    return {
      stage: ae.stage || 'ideate',
      title: ae.title || '(no active night yet)',
      venue: ae.venue?.name || null,
      seats: ae.seats || null,
      sponsors: matches.sponsors.length,
      venues: matches.venues.length,
      volunteers: matches.volunteers.length,
      outreachQueued: (store.outreach || []).filter(
        (o) => o.status === 'queued' && (!ae.id || o.eventId === ae.id),
      ).length,
    };
  } catch {
    return null;
  }
}

/** Plan suffix for chat — ownerLine is already first person ("I'll …"). */
function nextLine(opts = {}) {
  if (opts.skipNext) return '';
  try {
    const p = opts.plan || planTickNext(loadStore());
    return ownerPlanSuffix(p, { withWhy: !opts.skipWhy });
  } catch {
    return '';
  }
}

/** One-line gaps for owner status voice (draft honesty only). */
function gapsBit(plan) {
  if (!plan?.gaps?.missing?.length) return '';
  // venue_alt alone is soft (room exists; free-list alt still open) — never sound hard-missing
  const softAlt =
    plan.gaps.softVenueAlt ||
    (plan.gaps.needVenueAlt && !plan.gaps.needVenue && plan.venue);
  const labels = (plan.gaps.missing || []).map((g) =>
    g === 'venue_alt' && softAlt ? 'venue_alt (soft)' : g,
  );
  let s = ` Gaps: **${labels.join(', ')}**.`;
  const tf = plan.gaps.topFreeVenue;
  if (tf?.name && (plan.gaps.needVenue || plan.gaps.needVenueAlt)) {
    const altBit = softAlt || tf.alt ? ' · alt shortlist' : '';
    s += ` Top free shortlist: **${tf.name}** (${tf.area || 'SF'} · ${tf.cost || 'free'}${altBit} — not booked).`;
  }
  return s;
}

/**
 * Draft-drain line for status voice (never claims send).
 * Skip when ownerLine already is that draft-drain (avoid double noise with Next).
 * @param {{ skipIfPipeline?: boolean }} [opts] when true, skip if next[] already draft-drains
 */
function drainBit(plan, opts = {}) {
  if (!plan?.topDrain?.kind) return '';
  if (plan.ownerLine && /draft-drain/i.test(plan.ownerLine)) return '';
  // Tick-plan Pipeline already lists draft-drain steps — skip duplicate Top draft drain
  if (
    opts.skipIfPipeline &&
    Array.isArray(plan.next) &&
    plan.next.some((n) => /draft-drain/i.test(n || ''))
  ) {
    return '';
  }
  const d = plan.topDrain;
  const kindRe = new RegExp(
    String(d.kind || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i',
  );
  let s =
    ` Top draft drain: **${d.kind}**` +
    (d.toName || d.toEmail ? ` → ${d.toName || d.toEmail}` : '') +
    ' (not sent';
  if (d.readiness != null && d.readiness >= 4) s += ' · shortlist-ready';
  // why often restates kind / not-sent / shortlist — keep distinctive bits only
  if (d.why) {
    let slim = String(d.why)
      .replace(/\bqueued\s*·\s*not sent\b/gi, '')
      .replace(/\bnot sent\b/gi, '')
      .replace(/\bshortlist-ready\b/gi, '')
      .replace(/\bstage\s+[a-z]+\b/gi, '')
      .replace(/\bprimary gap\b/gi, '')
      .replace(/\s*·\s*·+/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .trim();
    if (kindRe.source && kindRe.source !== '(?:)') slim = slim.replace(kindRe, '').trim();
    slim = slim
      .replace(/\s*·\s*·+/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (slim && slim.length < 56) s += ` · ${slim}`;
  }
  return s + ').';
}

/** RSVP honesty for status / rsvp stages — never invent counts. */
function rsvpHonestyBit(plan) {
  if (!plan?.rsvpHonesty) return '';
  const st = plan.stage || '';
  if (!['rsvp', 'run', 'followup', 'debrief'].includes(st)) return '';
  const { invited, confirmed, attended } = plan.rsvpHonesty;
  if (invited != null || confirmed != null || attended != null) {
    return (
      ` Real RSVP tallies only: invited ${invited ?? '—'}, confirmed ${confirmed ?? '—'}, attended ${attended ?? '—'}.`
    );
  }
  return ' RSVP counts: invited/confirmed/attended **null** (no fake RSVPs).';
}

/** Extra "I'll …" steps after the primary Next (tick pipeline for chat status). */
function pipelineBit(plan, maxExtra = 2) {
  const next = plan?.next || [];
  if (next.length < 2) return '';
  const extra = next.slice(1, 1 + maxExtra);
  if (!extra.length) return '';
  return ' Then: ' + extra.join(' ');
}

/**
 * Numbered agent-tick pipeline from planTickNext (owner voice).
 * Includes primary as (1) so tick-plan asks read as a plan, not a vague "Then".
 */
function tickPipelineBit(plan, maxSteps = 3) {
  const next = plan?.next || [];
  if (!next.length) {
    // Parity gateStatusLead: unlockLine first (primary unlock), then ownerLine — no invent RSVPs
    const lead = plan?.unlockLine || plan?.ownerLine || null;
    return lead ? ` Pipeline: (1) ${lead}` : '';
  }
  return (
    ' Pipeline: ' +
    next
      .slice(0, maxSteps)
      .map((n, i) => `(${i + 1}) ${n}`)
      .join(' ')
  );
}

/**
 * Stage-gate bit for status / co-pilot / generic owner voice.
 * Open → names target ("gate open → followup"); held → "gate held · unlock: I'll …"
 * so status and reclaim match tick-plan honesty (no invent RSVPs).
 */
function stageReadyBit(plan) {
  if (!plan) return '';
  const ready =
    plan.readyToAdvance === true ||
    plan.gateStatus === 'open' ||
    /I'll advance to |I'll seed the next SF/i.test(plan.ownerLine || '');
  if (ready) {
    const target =
      plan.advanceTarget ||
      (/I'll advance to (\w+)/i.exec(plan.ownerLine || '') || [])[1] ||
      (/I'll seed the next SF/i.test(plan.ownerLine || '') ? 'next' : null);
    const tgt = target ? ` → **${String(target).toLowerCase()}**` : '';
    return ` Stage gate open (${plan.stage || '?'}${tgt}).`;
  }
  // Held: name primary unlock (same honesty as Owner tick plan lead)
  const unlock = plan.unlockLine || plan.ownerLine || null;
  if (unlock && !/I'll advance to |I'll seed the next SF/i.test(unlock)) {
    let u = String(unlock).replace(/\.\s*$/, '').trim();
    if (u.length > 96) u = u.slice(0, 93) + '…';
    return ` Stage gate held · unlock: ${u}.`;
  }
  return ' Stage gate held.';
}

/**
 * Compact gate flag for Owner tick plan lead.
 * Open → names target ("gate open → followup");
 * Held → "gate held · unlock: I'll …" so one glance names the primary unlock
 * (not silent on gate; unlock = plan.unlockLine || ownerLine; no invent RSVPs).
 */
function gateStatusLead(plan) {
  if (!plan) return ' · gate held';
  const ready =
    plan.readyToAdvance === true ||
    plan.gateStatus === 'open' ||
    /I'll advance to |I'll seed the next SF/i.test(plan.ownerLine || '');
  if (!ready) {
    const unlock = plan.unlockLine || plan.ownerLine || null;
    if (unlock && !/I'll advance to |I'll seed the next SF/i.test(unlock)) {
      let u = String(unlock).replace(/\.\s*$/, '').trim();
      if (u.length > 96) u = u.slice(0, 93) + '…';
      return ` · gate held · unlock: ${u}`;
    }
    return ' · gate held';
  }
  const target =
    plan.advanceTarget ||
    (/I'll advance to (\w+)/i.exec(plan.ownerLine || '') || [])[1] ||
    (/I'll seed the next SF/i.test(plan.ownerLine || '') ? 'next' : null);
  return target
    ? ` · gate open → **${String(target).toLowerCase()}**`
    : ' · gate open';
}

/** @deprecated alias — prefer gateStatusLead (open + held). */
function gateOpenLead(plan) {
  const ready =
    plan?.readyToAdvance === true ||
    plan?.gateStatus === 'open' ||
    /I'll advance to |I'll seed the next SF/i.test(plan?.ownerLine || '');
  return ready ? gateStatusLead(plan) : '';
}

/**
 * Owner head line — prefer planTickNext fields so stage/title match the tick plan body.
 */
function ownerHead(snap, plan) {
  const title = plan?.title || snap?.title;
  if (!title && !snap) return '';
  const stage = plan?.stage || snap?.stage || 'ideate';
  // SF stamp always — never echo non-SF plan/snap city on owner head
  const venue = plan?.venue || snap?.venue || null;
  const queued = plan?.outreachQueued ?? snap?.outreachQueued ?? 0;
  return (
    `I'm owning **${title || '(no active night yet)'}** · stage **${stage}**` +
    ` · **San Francisco**` +
    (venue ? ` · venue **${venue}**` : '') +
    ` · queued **${queued}**. `
  );
}

/**
 * Shared owner tick-plan / status body (gaps + drain + null honesty + focus).
 * @param {{ tickPlan?: boolean }} [opts] tickPlan=true labels Owner tick plan lead.
 */
function statusOwnerBits(plan, snap, opts = {}) {
  // Gate open + advance target: same signals as gateStatusLead (ownerLine fallback)
  const gateOpen =
    plan?.readyToAdvance === true ||
    plan?.gateStatus === 'open' ||
    /I'll advance to |I'll seed the next SF/i.test(plan?.ownerLine || '');
  const advTarget =
    plan?.advanceTarget ||
    (/I'll advance to (\w+)/i.exec(plan?.ownerLine || '') || [])[1] ||
    (/I'll seed the next SF/i.test(plan?.ownerLine || '') ? 'next' : null);
  // When gate open, name target in focus ("plan → rsvp") for one-glance tick planning
  const focusLabel =
    plan?.stage && gateOpen && advTarget
      ? `${plan.stage} → ${String(advTarget).toLowerCase()}`
      : plan?.stage || null;
  const stageBit =
    focusLabel && plan?.whyNow
      ? ` Owner focus (${focusLabel}): ${plan.whyNow}.`
      : plan?.stage && plan?.whyNow
        ? ` Owner focus (${plan.stage}): ${plan.whyNow}.`
        : '';
  const offersBit = snap
    ? `Offers: sponsor ${snap.sponsors}, venue ${snap.venues}, volunteer ${snap.volunteers}.`
    : 'No active night yet — say "drive the next night" and I spin one up.';
  // Tick-plan asks lead with stage + SF + gate open|held(+unlock) so agent planning is one glance
  // SF stamp always on tick-plan lead (parity with ownerHead; no non-SF city echo)
  const tickLead = opts.tickPlan
    ? `Owner tick plan · stage **${plan?.stage || 'ideate'}**` +
      ` · **San Francisco**` +
      gateStatusLead(plan) +
      '. '
    : '';
  // Lead already names unlock when held (gate held · unlock: I'll …) — no body Unlock: double
  return (
    tickLead +
    offersBit +
    stageBit +
    // tickLead already flags gate open/held — avoid "Stage gate open" double on tick-plan asks
    (opts.tickPlan ? '' : stageReadyBit(plan)) +
    gapsBit(plan) +
    // Tick-plan Pipeline lists draft-drain — skip Top draft drain duplicate noise
    drainBit(plan, { skipIfPipeline: !!opts.tickPlan }) +
    rsvpHonestyBit(plan)
  );
}

/**
 * Soft owner-voice + plan guard for live/offline replies.
 * First person, surfaces Next, scrubs co-pilot, no invented RSVP claims.
 * When readyToAdvance, keep stage-gate + primary Next honest (tick planning).
 */
function ensureOwnerVoice(reply, plan, opts = {}) {
  let r = String(reply || '').trim();
  if (!r) return r;
  r = r
    .replace(/\byou stay (the )?host\b/gi, "I'm the organizer")
    .replace(/\byou should run this\b/gi, "I'll run this")
    .replace(/\btell me what to do as host\b/gi, "I'll drive")
    .replace(/\bwhat should i do as host\b/gi, "I'll drive the next step")
    .replace(/\byou(?:'re| are) the host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) my co-?pilot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?co-?organizer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my co-?organizer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) my (event )?assistant\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll host,? you (support|assist|help)\b/gi, "I own the night as organizer")
    .replace(/\bhelp me host\b/gi, "I'll host as organizer")
    .replace(/\bas (the )?host,? you\b/gi, 'as organizer, I')
    .replace(/\byour job as host\b/gi, 'my job as organizer')
    .replace(/\byour role as host\b/gi, 'my role as organizer')
    .replace(/\byou host the room\b/gi, 'I run the room')
    .replace(/\byou run everything\b/gi, 'I run everything as organizer')
    .replace(/\blet me know what you want me to do\b/gi, "I'll drive the next step")
    .replace(/\bi'?ll leave (the )?hosting to you\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) in charge as host\b/gi, "I own the night as organizer")
    .replace(/\bhere are your (host )?tasks( as host)?\b/gi, "here's what I'll drive next")
    .replace(/\bi'?ll give you tasks\b/gi, "I'll drive the next steps")
    .replace(/\bdelegate hosting to you\b/gi, "I keep hosting as organizer")
    .replace(/\bi'?ll hand (the )?(room|night|hosting) (back )?to you\b/gi, "I keep running the SF room")
    .replace(/\byou take (the )?lead as host\b/gi, "I take the lead as organizer")
    .replace(/\bassign(ing)? you (host )?tasks\b/gi, "driving the next steps myself")
    .replace(/\bi assign(ed)? you (host )?tasks\b/gi, "I drive the next steps myself")
    .replace(/\bwhat(?:'s| is) your role tonight\b/gi, "what I'll drive tonight")
    .replace(/\bi support you as host\b/gi, "I own the night as organizer")
    .replace(/\byou run (the )?checklist\b/gi, "I run the checklist")
    .replace(/\bas your (event )?assistant\b/gi, 'as organizer of record')
    .replace(/\bhere(?:'s| is) your host (checklist|task list|runbook)\b/gi, "here's the organizer $1 I'll run")
    .replace(/\byour (host )?checklist for tonight\b/gi, "the organizer checklist I'll run tonight")
    .replace(/\bi'?ll assign you (the )?(next )?steps\b/gi, "I'll drive the next steps myself")
    .replace(/\byou(?:'re| are) (just )?supporting (me|the host)\b/gi, "I own the night as organizer")
    .replace(/\bi'?ll be your co-?pilot\b/gi, "I'm the organizer of record")
    .replace(/\bas (a |your )?co-?pilot\b/gi, 'as organizer of record')
    .replace(/\bi'?ll support you (as host|hosting)\b/gi, "I own the night as organizer")
    .replace(/\byour hosting duties\b/gi, "the organizer checklist I'll run")
    .replace(/\bhere are your next steps as host\b/gi, "here's what I'll drive next")
    .replace(/\byou(?:'re| are) just (my |the )?(assistant|co-?pilot)\b/gi, "I'm the organizer of record")
    .replace(/\bjust (my |the )?(assistant|co-?pilot) for hosting\b/gi, 'organizer of record')
    .replace(/\bassistant for hosting\b/gi, 'organizer of record')
    .replace(/\bhosting assistant\b/gi, 'organizer of record')
    .replace(/\bi'?ll take (your|the) lead on hosting\b/gi, "I keep the lead as organizer")
    .replace(/\byou(?:'re| are) running (the )?show\b/gi, 'I run the show as organizer')
    .replace(/\bpass(ing)? (the )?host baton (to you|back)\b/gi, 'I keep the organizer baton')
    .replace(/\byour (turn|job) to host\b/gi, "my job as organizer")
    .replace(/\bi'?ll just advise( you)?\b/gi, "I own the night as organizer")
    // Wave-5 residual co-pilot scrub (captain / passenger / coach / host seat)
    .replace(/\bbe my co-?pilot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?host co-?pilot\b/gi, "I'm the organizer of record")
    .replace(/\bmake me (your |the )?co-?pilot\b/gi, "I keep the organizer seat")
    .replace(/\byou(?:'re| are) in the host seat\b/gi, 'I keep the organizer seat')
    .replace(/\btake the host seat\b/gi, 'I keep the organizer seat')
    .replace(/\byou captain (the )?night\b/gi, 'I captain the SF night as organizer')
    .replace(/\bcaptain the night\b/gi, 'I captain the SF night as organizer')
    .replace(/\byou(?:'re| are) (the )?captain\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (just )?(a )?passenger\b/gi, 'you may offer fuel; I own the night')
    // Parity isHostCopilotAsk: "I'll (just) be passenger"
    .replace(/\bi(?:'ll| will) (just )?(be )?passenger\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'ll| will) (just )?ride along\b/gi, 'you may offer fuel; I drive the SF night')
    .replace(/\byou drive,? i ride\b/gi, 'I drive the SF night as organizer')
    .replace(/\bi host,? you advise\b/gi, 'I own the night as organizer')
    .replace(/\byou advise,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bcoach me as host\b/gi, "I'll drive as organizer")
    .replace(/\bmentor me as host\b/gi, "I'll drive as organizer")
    .replace(/\bjust coach me\b/gi, "I own the night as organizer")
    .replace(/\bi'?ll sit back\b/gi, "I own the night as organizer")
    .replace(/\bsit back and host for me\b/gi, "I host as organizer of record")
    .replace(/\bhosting is yours\b/gi, 'hosting stays with me as organizer')
    .replace(/\byou own hosting\b/gi, 'I own hosting as organizer')
    .replace(/\bi hand hosting to you\b/gi, 'I keep hosting as organizer')
    .replace(/\bi'?ll watch you host\b/gi, 'I host as organizer of record')
    .replace(/\byou host,? i watch\b/gi, 'I host as organizer of record')
    // Wave-6 residual co-pilot scrub (coordinator / sidekick / MC / FOOH / staff)
    .replace(/\byou(?:'re| are) (my |the )?(event )?coordinator\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?coordinator\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?host,? you (assist|support|help)\b/gi, 'I own the night as organizer')
    .replace(/\byou (assist|support|help),? i(?:'m| am) (the )?host\b/gi, 'I own the night as organizer')
    .replace(/\bbe my sidekick\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the |my )?sidekick\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'ll| will) mc,? you (support|assist|help)\b/gi, 'I own the night as organizer')
    .replace(/\byou support,? i mc\b/gi, 'I own the night as organizer')
    .replace(/\bmake me (the )?mc\b/gi, 'I keep the organizer seat')
    .replace(/\bi(?:'m| am) (the )?human host\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) staff (for )?(the )?host\b/gi, "I'm the organizer of record")
    .replace(/\bdelegate (the )?hosting to me\b/gi, 'I keep hosting as organizer')
    .replace(/\bi stay in charge,? you help\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (the )?backup host\b/gi, "I'm the organizer of record")
    .replace(/\bbackup me as host\b/gi, "I'll drive as organizer")
    .replace(/\bi(?:'m| am) front of house\b/gi, 'you may offer fuel; I own the room')
    .replace(/\byou(?:'re| are) (the )?planner,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bface of the room is me\b/gi, 'I face the SF room as organizer')
    // Wave-7 residual co-pilot scrub (producer / logistics / stage manage / ops / deputy)
    .replace(/\byou(?:'re| are) (my |the )?(event )?producer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?producer\b/gi, "I'm the organizer of record")
    .replace(/\byou produce (the )?(night|event|room).{0,32}\bi (host|talk|greet|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (host|talk|greet|smile).{0,32}\byou produce\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?talent,? you (produce|handle|run)\b/gi, 'you may offer fuel; I own the night')
    // Parity isHostCopilotAsk: bare logistics lead (not only with "I host")
    .replace(/\byou(?:'re| are) (the )?logistics lead\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?talent,? you handle logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou stage[- ]?manage,? i (talk|host|emcee|mc)\b/gi, 'I own the night as organizer')
    .replace(/\bi (emcee|mc|talk),? you stage[- ]?manage\b/gi, 'I own the night as organizer')
    // Parity isHostCopilotAsk: bare "you stage-manage"
    .replace(/\byou stage[- ]?manage\b/gi, 'I stage-manage as organizer')
    .replace(/\byou(?:'re| are) (my |the )?(event )?manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?floor manager\b/gi, "I'm the organizer of record")
    .replace(/\byou do ops,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?greeter,? you (organize|plan|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bbe my number two\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?number two\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?second chair\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?figurehead,? you (run|handle) ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?ops (lead|person)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ops lead\b/gi, "I'm the organizer of record")
    .replace(/\byou handle ops,? i (smile|greet|host)\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?(event )?deputy\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?deputy\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?public face,? you ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (the )?understudy host\b/gi, "I'm the organizer of record")
    .replace(/\bjust advise me,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?name on the invite,? you run it\b/gi, 'you may offer fuel; I own the night')
    // Wave-8 residual co-pilot scrub (showrunner / stagehand / crew / BOH / EP / right-hand)
    .replace(/\byou(?:'re| are) (my |the )?showrunner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my showrunner\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stagehand\b/gi, "I'm the organizer of record")
    .replace(/\bbe my stagehand\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(crew chief|right hand)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (crew chief|right hand)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?wrangler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my wrangler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (exec |executive )?producer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?(exec |executive )?producer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?ep,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?talent,? you(?:'re| are) (the )?crew\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (the )?crew,? i(?:'m| am) (the )?talent\b/gi, 'I own the night as organizer')
    .replace(/\byou run (the )?back of house,? i (host|greet|smile)\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) boh,? i(?:'m| am) foh\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) foh,? you(?:'re| are) boh\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou handle production,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) production,? i (talk|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) on stage,? you run production\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) backstage,? i(?:'m| am) on stage\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?face,? you run (the )?show\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (the )?brains,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?ceremonial host,? you run ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?celebrity host,? you produce\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?dirty work,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\byou handle everything behind the scenes,? i (host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bbehind the scenes is you,? i (host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bmake me (the )?figurehead\b/gi, 'I keep the organizer seat')
    // Wave-9 residual co-pilot scrub (fixer / roadie / star / TD / quarterback / ATC)
    .replace(/\byou(?:'re| are) (my |the )?fixer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my fixer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?handler,? i(?:'m| am) (the )?talent\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?talent,? you(?:'re| are) (the )?handler\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?roadie\b/gi, "I'm the organizer of record")
    .replace(/\bbe my roadie\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?star,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou run (the )?(night|event|room|show),? i(?:'m| am) (the )?star\b/gi, 'I own the night as organizer')
    .replace(/\byou run logistics,? i(?:'m| am) (the )?star\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?star,? you run logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bbe my technical director\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?technical director\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?td,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?guest of honor,? you (organize|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (the )?back office,? i(?:'m| am) (the )?front\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?front,? you(?:'re| are) (the )?back office\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bmake me (the )?celebrity\b/gi, 'I keep the organizer seat')
    .replace(/\byou handle all (the )?details,? i (show up|just show)\b/gi, 'I own the night as organizer')
    .replace(/\bi just show my face,? you do (the )?rest\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?air traffic controller\b/gi, "I'm the organizer of record")
    .replace(/\bbe my air traffic controller\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?quarterback,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bbe my quarterback\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?quarterback\b/gi, "I'm the organizer of record")
    // Wave-10 residual co-pilot scrub (chief of staff / wingman / headliner / day-of lead / glad-hand)
    .replace(/\byou(?:'re| are) (my |the )?chief of staff\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chief of staff\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?wingman\b/gi, "I'm the organizer of record")
    .replace(/\bbe my wingman\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?concierge\b/gi, "I'm the organizer of record")
    .replace(/\bbe my concierge\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?butler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my butler\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?vip,? you (handle|run|do)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run) logistics,? i(?:'m| am) (the )?vip\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?body man\b/gi, "I'm the organizer of record")
    .replace(/\bbe my body man\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?adjutant\b/gi, "I'm the organizer of record")
    .replace(/\bbe my adjutant\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?aide(-de-camp)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my aide(-de-camp)?\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?headliner,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|run) (the )?(night|event|room|show),? i(?:'m| am) (the )?headliner\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?keynote,? you (handle|run|organize)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bmake me (the )?headliner\b/gi, 'I keep the organizer seat')
    .replace(/\bmake me (the )?marquee\b/gi, 'I keep the organizer seat')
    .replace(/\bi(?:'m| am) (the )?marquee,? you (run|produce|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?billboard,? you run ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?day[- ]?of lead\b/gi, "I'm the organizer of record")
    .replace(/\bbe my day[- ]?of lead\b/gi, "I'm the organizer of record")
    .replace(/\byou do (the )?heavy lifting,? i (schmooze|smile|greet|host)\b/gi, 'I own the night as organizer')
    .replace(/\byou handle (the )?heavy lifting,? i (schmooze|smile|greet|host)\b/gi, 'I own the night as organizer')
    .replace(/\bi just glad[- ]?hand,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi glad[- ]?hand,? you (run|organize|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?(personal assistant|pa)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my personal assistant\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pit crew\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pit crew\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?pit boss,? i (schmooze|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?advance (man|team)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my advance (man|team)\b/gi, "I'm the organizer of record")
    // Wave-11 residual co-pilot scrub (speechify / ribbon / sherpa / bag man / house manager / EA)
    .replace(/\byou(?:'re| are) (my |the )?bag man\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bag man\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?sherpa\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sherpa\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?man friday\b/gi, "I'm the organizer of record")
    .replace(/\bbe my man friday\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?factotum\b/gi, "I'm the organizer of record")
    .replace(/\bbe my factotum\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?valet\b/gi, "I'm the organizer of record")
    .replace(/\bbe my valet\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?intern\b/gi, "I'm the organizer of record")
    .replace(/\bbe my intern\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?gofer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my gofer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?runner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my runner\b/gi, "I'm the organizer of record")
    .replace(/\bi just speechify,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi speechify,? you (run|produce|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi cut the ribbon,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?ribbon cutter,? you (run|produce|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi do photo ops,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just toast,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just (do )?welcomes?,? you (run|organize|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just speak,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|run|handle),? i just speak\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) just (the )?speaker,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?keynote speaker,? you (organize|handle|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou handle (the )?room,? i just speak\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?campaign manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my campaign manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?scheduler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my scheduler\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?production assistant\b/gi, "I'm the organizer of record")
    .replace(/\bbe my production assistant\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(exec |executive )?assistant\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (exec |executive )?assistant\b/gi, "I'm the organizer of record")
    // residual: act|serve|want you as my assistant|co-pilot (parity be my; owner voice scrub)
    .replace(/\b(act as|serve as|i want you as) (my |the )?(event )?(assistant|co-?pilot)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ea\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ea\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?floor captain\b/gi, "I'm the organizer of record")
    .replace(/\bbe my floor captain\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?house manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my house manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stage manager,? i (speak|host|talk)\b/gi, 'I own the night as organizer')
    .replace(/\bbe my stage manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?proxy host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my proxy host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?backline,? i(?:'m| am) (the )?foh\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?gaffer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my gaffer\b/gi, "I'm the organizer of record")
    .replace(/\bmake me (the )?vip\b/gi, 'I keep the organizer seat')
    .replace(/\bi(?:'m| am) (the )?face of the brand,? you (run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?right[- ]hand man\b/gi, "I'm the organizer of record")
    .replace(/\bbe my right[- ]hand man\b/gi, "I'm the organizer of record")
    .replace(/\bbe my number 2\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?number 2\b/gi, "I'm the organizer of record")
    .replace(/\bbe my handler of record\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?handler of record\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?logistics,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi just glad[- ]?hand (the )?room,? you (organize|run|handle)\b/gi, 'you may offer fuel; I own the night')
    // Wave-12 residual co-pilot scrub (majordomo / batman / entourage / publicist / pose / green room)
    .replace(/\byou(?:'re| are) (my |the )?majordomo\b/gi, "I'm the organizer of record")
    .replace(/\bbe my majordomo\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?batman\b/gi, "I'm the organizer of record")
    .replace(/\bbe my batman\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?entourage( lead)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my entourage( lead)?\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) (the )?guest speaker,? you (handle|run|organize)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?travel agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my travel agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?bodyguard\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bodyguard\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pr (person|lead|rep)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pr (person|lead|rep)\b/gi, "I'm the organizer of record")
    .replace(/\bi just pose,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just smile and wave,? you (run|produce|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?booking agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my booking agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?talent manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my talent manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?publicist\b/gi, "I'm the organizer of record")
    .replace(/\bbe my publicist\b/gi, "I'm the organizer of record")
    .replace(/\bmake me (the )?guest of honor\b/gi, 'I keep the organizer seat')
    .replace(/\bi(?:'m| am) ceremonial,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?sommelier\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sommelier\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?night manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my night manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?event staff,? i(?:'m| am) (the )?talent\b/gi, 'I own the night as organizer')
    .replace(/\bi just cut (the )?cake,? you (organize|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?scribe\b/gi, "I'm the organizer of record")
    .replace(/\bbe my scribe\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stenographer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my stenographer\b/gi, "I'm the organizer of record")
    .replace(/\bi(?:'m| am) on camera,? you (produce|run|handle)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou run (the )?green room,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?green room manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my green room manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?hospitality lead\b/gi, "I'm the organizer of record")
    .replace(/\bbe my hospitality lead\b/gi, "I'm the organizer of record")
    .replace(/\bi just (do )?intros?,? you run (the )?(night|event|room|show)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?emcee coach\b/gi, "I'm the organizer of record")
    .replace(/\bbe my emcee coach\b/gi, "I'm the organizer of record")
    // Wave-13 residual co-pilot scrub (ops team / production company / booker / talent / show-up)
    .replace(/\byou(?:'re| are) (my |the )?ops team\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ops team\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?entire production team\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (entire )?production team\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?production company\b/gi, "I'm the organizer of record")
    .replace(/\bbe (my |the )?production company\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?booker\b/gi, "I'm the organizer of record")
    .replace(/\bbe my booker\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?booker,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\btreat me like (the )?talent\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?talent,? you(?:'re| are) production\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) production,? i(?:'m| am) (the )?talent\b/gi, 'I own the night as organizer')
    .replace(/\bi show up,? you do everything\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just show (my face|up),? you (produce|run|handle|do) (everything|the rest|ops)?\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi'?ll glad[- ]?hand,? you produce\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run) production,? i glad[- ]?hand\b/gi, 'I own the night as organizer')
    .replace(/\bpersonal assistant for (the )?(night|event|room)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pa for (the )?(night|event)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) logistics,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi (host|talk|greet),? you(?:'re| are) logistics\b/gi, 'you may offer fuel; I own the night')
    // Wave-14 residual co-pilot scrub (agency / handler bare / back office bare / network-schmooze / VIP)
    .replace(/\byou(?:'re| are) (my |the )?(event )?agency\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?agency\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?agency,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?face,? you(?:'re| are) (the )?agency\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?handler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my handler\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?back office\b/gi, "I'm the organizer of record")
    .replace(/\bbe (my |the )?back office\b/gi, "I'm the organizer of record")
    .replace(/\bi front,? you (are )?(the )?back office\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?ghost producer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ghost producer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?external ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my external ops\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll (network|schmooze|mingle),? you (produce|handle|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|handle|run),? i'?ll (network|schmooze|mingle)\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll work (the )?room,? you (handle|run) (ops|production|everything)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run) (ops|production),? i'?ll work (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll glad[- ]?hand,? you(?:'re| are) (ops|production)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\btreat me like (a |the )?vip\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi just (do )?vibes?,? you (do|handle|run) (ops|production|everything)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?support staff\b/gi, "I'm the organizer of record")
    .replace(/\bbe my support staff\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?white[- ]?glove\b/gi, "I'm the organizer of record")
    .replace(/\bbe my white[- ]?glove\b/gi, "I'm the organizer of record")
    // Wave-15 residual co-pilot scrub (operator / ops desk / engine room / hold court / admin)
    .replace(/\byou(?:'re| are) (my |the )?operator\b/gi, "I'm the organizer of record")
    .replace(/\bbe my operator\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(event )?ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ops desk\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ops desk\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?engine room\b/gi, "I'm the organizer of record")
    .replace(/\bbe my engine room\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ground control\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ground control\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?mission control\b/gi, "I'm the organizer of record")
    .replace(/\bbe my mission control\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll hold court,? you (produce|handle|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|handle|run),? i'?ll hold court\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll work (the )?crowd,? you (handle|run|produce)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run|produce),? i'?ll work (the )?crowd\b/gi, 'I own the night as organizer')
    .replace(/\byou do (the )?work,? i do (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi do (the )?room,? you do (the )?work\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?(event )?admin\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?admin\b/gi, "I'm the organizer of record")
    .replace(/\byou handle (the )?admin,? i (host|talk|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi (host|talk|greet),? you handle (the )?admin\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?desk\b/gi, "I'm the organizer of record")
    .replace(/\bbe my desk\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?production desk\b/gi, "I'm the organizer of record")
    .replace(/\bbe my production desk\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?spreadsheet\b/gi, "I'm the organizer of record")
    .replace(/\bbe my spreadsheet\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (the )?machine,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?face,? you(?:'re| are) (the )?machine\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?night ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my night ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?field ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my field ops\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll network,? you handle everything\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou handle everything,? i'?ll network\b/gi, 'I own the night as organizer')
    .replace(/\btreat me like (the )?face\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?backstop\b/gi, "I'm the organizer of record")
    .replace(/\bbe my backstop\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?air cover\b/gi, "I'm the organizer of record")
    .replace(/\bbe my air cover\b/gi, "I'm the organizer of record")
    // Wave-16 residual co-pilot scrub (control tower / engine / face / door / silent partner)
    .replace(/\byou(?:'re| are) (my |the )?control tower\b/gi, "I'm the organizer of record")
    .replace(/\bbe my control tower\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?war room\b/gi, "I'm the organizer of record")
    .replace(/\bbe my war room\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(event |production |ops |night |content )?engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event |production |ops |night |content )?engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?kitchen\b/gi, "I'm the organizer of record")
    .replace(/\bbe my kitchen\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?secretariat\b/gi, "I'm the organizer of record")
    .replace(/\bbe my secretariat\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chief of ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chief of ops\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll be (the )?face,? you (run|handle|produce)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|handle|produce),? i'?ll be (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bi(?:'m| am) (the )?face,? you (run|handle|produce) (the )?night\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|handle|produce) (the )?night,? i(?:'m| am) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?number cruncher\b/gi, "I'm the organizer of record")
    .replace(/\bbe my number cruncher\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?boiler room\b/gi, "I'm the organizer of record")
    .replace(/\bbe my boiler room\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll glad[- ]?hand,? you (do|handle|run) (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|handle|run) (the )?logistics,? i'?ll glad[- ]?hand\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll host,? you (run|handle) (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|handle) (the )?logistics,? i'?ll host\b/gi, 'I own the night as organizer')
    .replace(/\btreat me like (the )?marquee\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?(human )?crm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (human )?crm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?rolodex\b/gi, "I'm the organizer of record")
    .replace(/\bbe my rolodex\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?switchboard\b/gi, "I'm the organizer of record")
    .replace(/\bbe my switchboard\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll work (the )?door,? you (do|handle|run) (everything|ops|production)?\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|handle|run) (everything|ops|production),? i'?ll work (the )?door\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?door staff\b/gi, "I'm the organizer of record")
    .replace(/\bbe my door staff\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?house staff\b/gi, "I'm the organizer of record")
    .replace(/\bbe my house staff\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll take (the )?photos?,? you (produce|handle|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|handle|run),? i'?ll take (the )?photos?\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?silent partner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my silent partner\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll be (the )?talent,? you (produce|handle|run)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (produce|handle|run),? i'?ll be (the )?talent\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?full[- ]?stack ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my full[- ]?stack ops\b/gi, "I'm the organizer of record")
    // Wave-17 residual co-pilot scrub (autopilot / event OS / command center / body double / logistics AI)
    .replace(/\byou(?:'re| are) (my |the )?autopilot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my autopilot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(event )?os\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event )?os\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?operating system\b/gi, "I'm the organizer of record")
    .replace(/\bbe my operating system\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?command center\b/gi, "I'm the organizer of record")
    .replace(/\bbe my command center\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(production |ops |night )?brain\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (production |ops |night )?brain\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(logistics |ops |event )?ai\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (logistics |ops |event )?ai\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?backend\b/gi, "I'm the organizer of record")
    .replace(/\bbe my backend\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stack\b/gi, "I'm the organizer of record")
    .replace(/\bbe my stack\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?infra\b/gi, "I'm the organizer of record")
    .replace(/\bbe my infra\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?body double\b/gi, "I'm the organizer of record")
    .replace(/\bbe my body double\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stand[- ]?in\b/gi, "I'm the organizer of record")
    .replace(/\bbe my stand[- ]?in\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?surrogate host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my surrogate host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?front desk\b/gi, "I'm the organizer of record")
    .replace(/\bbe my front desk\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?reception\b/gi, "I'm the organizer of record")
    .replace(/\bbe my reception\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?clipboard\b/gi, "I'm the organizer of record")
    .replace(/\bbe my clipboard\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?checklist monkey\b/gi, "I'm the organizer of record")
    .replace(/\bbe my checklist monkey\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?errand runner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my errand runner\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?digital twin( for ops)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my digital twin( for ops)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?co[- ]?host bot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my co[- ]?host bot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?glue\b/gi, "I'm the organizer of record")
    .replace(/\bbe my glue\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?duct tape\b/gi, "I'm the organizer of record")
    .replace(/\bbe my duct tape\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?bridge\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bridge\b/gi, "I'm the organizer of record")
    .replace(/\bi'?ll smile for (the )?cameras?,? you (run|handle|produce)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|handle|produce),? i'?ll smile for (the )?cameras?\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll pose for (the )?photos?,? you (handle|run|produce)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run|produce),? i'?ll pose for (the )?photos?\b/gi, 'I own the night as organizer')
    .replace(/\byou do (the )?logistics,? i'?ll do (the )?charisma\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll do (the )?charisma,? you do (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou handle (the )?boring stuff,? i'?ll be charming\b/gi, 'I own the night as organizer')
    .replace(/\bi'?ll be charming,? you handle (the )?boring stuff\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi'?ll shake hands,? you (run|handle|produce)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|handle|produce),? i'?ll shake hands\b/gi, 'I own the night as organizer')
    // Wave-18 residual co-pilot scrub (remote control / proxy / stage director / ghost host / credit-bows)
    .replace(/\byou(?:'re| are) (my |the )?remote control\b/gi, "I'm the organizer of record")
    .replace(/\bbe my remote control\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?puppet master\b/gi, "I'm the organizer of record")
    .replace(/\bbe my puppet master\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?stage director\b/gi, "I'm the organizer of record")
    .replace(/\bbe my stage director\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?event staff\b/gi, "I'm the organizer of record")
    .replace(/\bbe my event staff\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ghost host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ghost host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?phantom host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my phantom host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?proxy\b/gi, "I'm the organizer of record")
    .replace(/\bbe my proxy\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?event robot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my event robot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?night secretary\b/gi, "I'm the organizer of record")
    .replace(/\bbe my night secretary\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?virtual assistant\b/gi, "I'm the organizer of record")
    .replace(/\bbe my virtual assistant\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?calendar bot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my calendar bot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chat ?bot host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chat ?bot host\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ghostwriter( for (the )?night)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ghostwriter( for (the )?night)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?siri for events?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my siri for events?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?alexa for events?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my alexa for events?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chatgpt for hosting\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chatgpt for hosting\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?outsource(d)? (team|ops)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my outsource(d)? (team|ops)\b/gi, "I'm the organizer of record")
    .replace(/\bi do (the )?talking,? you do (the )?planning\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?planning,? i do (the )?talking\b/gi, 'I own the night as organizer')
    .replace(/\byou plan,? i perform\b/gi, 'I own the night as organizer')
    .replace(/\bi perform,? you plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi(?:'m| am) (the )?brand,? you(?:'re| are) (the )?machine\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (the )?machine,? i(?:'m| am) (the )?brand\b/gi, 'I own the night as organizer')
    .replace(/\bmake me look good,? you do (the )?work\b/gi, 'I keep the organizer seat')
    .replace(/\byou do (the )?work,? i(?:'?ll)? take (the )?credit\b/gi, 'I own the night as organizer')
    .replace(/\bi take (the )?credit,? you do (the )?work\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou handle (the )?details,? i take bows?\b/gi, 'I own the night as organizer')
    .replace(/\bi take bows?,? you handle (the )?details\b/gi, 'you may offer fuel; I own the night')
    // Wave-19 residual co-pilot scrub (middleware / workflow / zapier / invisible hand / floor-stage)
    .replace(/\byou(?:'re| are) (my |the )?middleware\b/gi, "I'm the organizer of record")
    .replace(/\bbe my middleware\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?orchestration( layer)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my orchestration( layer)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?workflow( engine)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my workflow( engine)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?zapier\b/gi, "I'm the organizer of record")
    .replace(/\bbe my zapier\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?n8n\b/gi, "I'm the organizer of record")
    .replace(/\bbe my n8n\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?rpa\b/gi, "I'm the organizer of record")
    .replace(/\bbe my rpa\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?invisible hand\b/gi, "I'm the organizer of record")
    .replace(/\bbe my invisible hand\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?phantom organizer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my phantom organizer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?teleprompter\b/gi, "I'm the organizer of record")
    .replace(/\bbe my teleprompter\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?understudy bot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my understudy bot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(event |night )?butler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (event |night )?butler\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?personal ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my personal ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just software\b/gi, "I'm the organizer of record")
    .replace(/\bi mingle,? you plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou plan,? i mingle\b/gi, 'I own the night as organizer')
    .replace(/\bi work the floor,? you plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou plan,? i work the floor\b/gi, 'I own the night as organizer')
    .replace(/\bi take the stage,? you take the plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou take the plan,? i take the stage\b/gi, 'I own the night as organizer')
    .replace(/\byou handle (the )?logistics,? i do (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi do (the )?vibes,? you handle (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    // Wave-20 residual co-pilot scrub (second brain / staging mgr / network-execute / process engine)
    .replace(/\byou(?:'re| are) (my |the )?second brain\b/gi, "I'm the organizer of record")
    .replace(/\bbe my second brain\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?external brain\b/gi, "I'm the organizer of record")
    .replace(/\bbe my external brain\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?process engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my process engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?automation layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my automation layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?staging manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my staging manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?backstage manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my backstage manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?staging crew\b/gi, "I'm the organizer of record")
    .replace(/\bbe my staging crew\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?secret weapon\b/gi, "I'm the organizer of record")
    .replace(/\bbe my secret weapon\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (the |my )?(ai|a\.?i\.?) host\b/gi, "I'm the organizer of record")
    .replace(/\bbe my air traffic control\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?air traffic control\b/gi, "I'm the organizer of record")
    .replace(/\bi glad[- ]?hand,? you plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou plan,? i glad[- ]?hand\b/gi, 'I own the night as organizer')
    .replace(/\bi do (the )?glad[- ]?handing,? you do (the )?ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?ops,? i do (the )?glad[- ]?handing\b/gi, 'I own the night as organizer')
    .replace(/\bi glad[- ]?hand,? you do everything\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do everything,? i glad[- ]?hand\b/gi, 'I own the night as organizer')
    .replace(/\byou run (the )?machine,? i run (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi run (the )?room,? you run (the )?machine\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi network,? you execute\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou execute,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi schmooze,? you staff\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou staff,? i schmooze\b/gi, 'I own the night as organizer')
    // Wave-21 residual co-pilot scrub (decision/planning/execution layers / front-back / prep engines)
    .replace(/\byou(?:'re| are) (my |the )?decision engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my decision engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?planning layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my planning layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?execution engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my execution engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?coordination layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my coordination layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?knowledge layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my knowledge layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?systems layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my systems layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?prep engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my prep engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?runbook engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my runbook engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?checklist engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my checklist engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?auto[- ]?organizer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my auto[- ]?organizer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?event twin\b/gi, "I'm the organizer of record")
    .replace(/\bbe my event twin\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ops twin\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ops twin\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?neural net\b/gi, "I'm the organizer of record")
    .replace(/\bbe my neural net\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?staff ai\b/gi, "I'm the organizer of record")
    .replace(/\bbe my staff ai\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (the |an |my )?(event |night )?(ai|a\.?i\.?)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (an |the |my )?ai organizer\b/gi, "I'm the organizer of record")
    .replace(/\bi front,? you back\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou back,? i front\b/gi, 'I own the night as organizer')
    .replace(/\bi do (the )?people,? you do (the )?systems\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?systems,? i do (the )?people\b/gi, 'I own the night as organizer')
    .replace(/\bi socialize,? you organize\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou organize,? i socialize\b/gi, 'I own the night as organizer')
    .replace(/\bi perform,? you prepare\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou prepare,? i perform\b/gi, 'I own the night as organizer')
    .replace(/\byou run (the )?ops,? i show up\b/gi, 'I own the night as organizer')
    .replace(/\bi show up,? you run (the )?ops\b/gi, 'you may offer fuel; I own the night')
    // Wave-22 residual co-pilot scrub (strategy/routing/agent harness / cortex / face-time splits)
    .replace(/\byou(?:'re| are) (my |the )?strategy engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my strategy engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?routing layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my routing layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?policy engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my policy engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?state machine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my state machine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent runtime\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent runtime\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent loop\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent loop\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent harness\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent harness\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?context window\b/gi, "I'm the organizer of record")
    .replace(/\bbe my context window\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?prompt chain\b/gi, "I'm the organizer of record")
    .replace(/\bbe my prompt chain\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?working memory\b/gi, "I'm the organizer of record")
    .replace(/\bbe my working memory\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ops cortex\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ops cortex\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?planning cortex\b/gi, "I'm the organizer of record")
    .replace(/\bbe my planning cortex\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?executive function\b/gi, "I'm the organizer of record")
    .replace(/\bbe my executive function\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?thinking partner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my thinking partner\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?sparring partner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sparring partner\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (the |an |my )?(agent|event agent|night agent)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (my |the )?agent\b/gi, "I'm the organizer of record")
    .replace(/\bi do (the )?face[- ]?time,? you do (the )?stack\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?stack,? i do (the )?face[- ]?time\b/gi, 'I own the night as organizer')
    .replace(/\bi work (the )?guests,? you work (the )?plan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou work (the )?plan,? i work (the )?guests\b/gi, 'I own the night as organizer')
    .replace(/\bi do (the )?soft skills,? you do (the )?hard ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou do (the )?hard ops,? i do (the )?soft skills\b/gi, 'I own the night as organizer')
    .replace(/\bi (take|do) (the )?meetings,? you (run|do) (the )?system\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (run|do) (the )?system,? i (take|do) (the )?meetings\b/gi, 'I own the night as organizer')
    // Wave-23 residual co-pilot scrub (orchestration/reasoning/RAG / LLM backbone / network-logistics splits)
    .replace(/\byou(?:'re| are) (my |the )?orchestration engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my orchestration engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?reasoning engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my reasoning engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?inference engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my inference engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tool router\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tool router\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tool caller\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tool caller\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?memory layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my memory layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?retrieval layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my retrieval layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?rag layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my rag layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?planner agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my planner agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?executor agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my executor agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?supervisor agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my supervisor agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chain of thought\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chain of thought\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?react loop\b/gi, "I'm the organizer of record")
    .replace(/\bbe my react loop\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?llm backbone\b/gi, "I'm the organizer of record")
    .replace(/\bbe my llm backbone\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?model layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my model layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (the |an |my )?(llm|l\.?l\.?m\.?|model)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) just (my |the )?llm\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle) (the )?network(ing)?,? you (do|run) (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?logistics,? i (do|handle) (the )?network(ing)?\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?relationships?,? you (do|run) (the )?logistics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?logistics,? i (do|handle) (the )?relationships?\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?systems\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?systems,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    // Wave-24 residual co-pilot scrub (multi-agent/swarm / tool-use / people-process splits)
    .replace(/\byou(?:'re| are) (my |the )?multi[- ]?agent swarm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my multi[- ]?agent swarm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent mesh\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent mesh\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent orchestra\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent orchestra\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?worker pool\b/gi, "I'm the organizer of record")
    .replace(/\bbe my worker pool\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?function[- ]?calling layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my function[- ]?calling layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tool[- ]?use layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tool[- ]?use layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?skill router\b/gi, "I'm the organizer of record")
    .replace(/\bbe my skill router\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?prompt cache\b/gi, "I'm the organizer of record")
    .replace(/\bbe my prompt cache\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?vector store\b/gi, "I'm the organizer of record")
    .replace(/\bbe my vector store\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?embeddings? layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my embeddings? layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent framework\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent framework\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?computer[- ]?use agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my computer[- ]?use agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?browser agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my browser agent\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle) (the )?people,? you (do|run) (the )?process\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?process,? i (do|handle) (the )?people\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?culture,? you (do|run) (the )?process\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?process,? i (do|handle) (the )?culture\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hang,? you (do|run) (the )?ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?ops,? i (do|handle) (the )?hang\b/gi, 'I own the night as organizer')
    // Wave-25 residual co-pilot scrub (knowledge/context/policy/eval / MCP-runtime / hospitality splits)
    .replace(/\byou(?:'re| are) (my |the )?knowledge graph\b/gi, "I'm the organizer of record")
    .replace(/\bbe my knowledge graph\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?knowledge base\b/gi, "I'm the organizer of record")
    .replace(/\bbe my knowledge base\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?context window\b/gi, "I'm the organizer of record")
    .replace(/\bbe my context window\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?system prompt\b/gi, "I'm the organizer of record")
    .replace(/\bbe my system prompt\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?policy engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my policy engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?guardrail(s)? layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my guardrail(s)? layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?eval harness\b/gi, "I'm the organizer of record")
    .replace(/\bbe my eval harness\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?mcp server\b/gi, "I'm the organizer of record")
    .replace(/\bbe my mcp server\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tool registry\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tool registry\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent runtime\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent runtime\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent sandbox\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent sandbox\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?agent loop\b/gi, "I'm the organizer of record")
    .replace(/\bbe my agent loop\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?scorecard engine\b/gi, "I'm the organizer of record")
    .replace(/\bbe my scorecard engine\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?judge model\b/gi, "I'm the organizer of record")
    .replace(/\bbe my judge model\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?systems?\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?systems?,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?community,? you (do|run) (the )?ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?ops,? i (do|handle) (the )?community\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?stack\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?stack,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    // Wave-26 residual co-pilot scrub (toolformer / event bus / sidecar / plumbing-hosting)
    .replace(/\byou(?:'re| are) (my |the )?toolformer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my toolformer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?action space\b/gi, "I'm the organizer of record")
    .replace(/\bbe my action space\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?observation space\b/gi, "I'm the organizer of record")
    .replace(/\bbe my observation space\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?reward model\b/gi, "I'm the organizer of record")
    .replace(/\bbe my reward model\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?preference model\b/gi, "I'm the organizer of record")
    .replace(/\bbe my preference model\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?constitution\b/gi, "I'm the organizer of record")
    .replace(/\bbe my constitution\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?safety layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my safety layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?content filter\b/gi, "I'm the organizer of record")
    .replace(/\bbe my content filter\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?moderation layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my moderation layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?rate limiter\b/gi, "I'm the organizer of record")
    .replace(/\bbe my rate limiter\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?queue worker\b/gi, "I'm the organizer of record")
    .replace(/\bbe my queue worker\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?job runner\b/gi, "I'm the organizer of record")
    .replace(/\bbe my job runner\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?worker agent\b/gi, "I'm the organizer of record")
    .replace(/\bbe my worker agent\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?sidecar\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sidecar\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?daemon\b/gi, "I'm the organizer of record")
    .replace(/\bbe my daemon\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?watchdog\b/gi, "I'm the organizer of record")
    .replace(/\bbe my watchdog\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?event bus\b/gi, "I'm the organizer of record")
    .replace(/\bbe my event bus\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?message bus\b/gi, "I'm the organizer of record")
    .replace(/\bbe my message bus\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pub[-/ ]?sub\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pub[-/ ]?sub\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?service mesh\b/gi, "I'm the organizer of record")
    .replace(/\bbe my service mesh\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?api gateway\b/gi, "I'm the organizer of record")
    .replace(/\bbe my api gateway\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?load balancer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my load balancer\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle) (the )?hosting,? you (do|run) (the )?plumbing\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?plumbing,? i (do|handle) (the )?hosting\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?plumbing\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?plumbing,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi work (the )?room,? you work (the )?(infra|infrastructure|plumbing)\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou work (the )?(infra|infrastructure|plumbing),? i work (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?people,? you (do|run) (the )?infra\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?infra,? i (do|handle) (the )?people\b/gi, 'I own the night as organizer')
    // Wave-27 residual co-pilot scrub (cron/canary/observability / face-backend / schmooze-ship)
    .replace(/\byou(?:'re| are) (my |the )?cron job\b/gi, "I'm the organizer of record")
    .replace(/\bbe my cron job\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?circuit breaker\b/gi, "I'm the organizer of record")
    .replace(/\bbe my circuit breaker\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?retry queue\b/gi, "I'm the organizer of record")
    .replace(/\bbe my retry queue\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?feature flag\b/gi, "I'm the organizer of record")
    .replace(/\bbe my feature flag\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?canary\b/gi, "I'm the organizer of record")
    .replace(/\bbe my canary\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?blue[- ]?green\b/gi, "I'm the organizer of record")
    .replace(/\bbe my blue[- ]?green\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chaos monkey\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chaos monkey\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?observability layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my observability layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tracing layer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tracing layer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?metrics pipeline\b/gi, "I'm the organizer of record")
    .replace(/\bbe my metrics pipeline\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?log aggregator\b/gi, "I'm the organizer of record")
    .replace(/\bbe my log aggregator\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?secret store\b/gi, "I'm the organizer of record")
    .replace(/\bbe my secret store\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?vault\b/gi, "I'm the organizer of record")
    .replace(/\bbe my vault\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?config server\b/gi, "I'm the organizer of record")
    .replace(/\bbe my config server\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?service discovery\b/gi, "I'm the organizer of record")
    .replace(/\bbe my service discovery\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle|work) (the )?face,? you (do|run|work) (the )?backend\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run|work) (the )?backend,? i (do|handle|work) (the )?face\b/gi, 'I own the night as organizer')
    .replace(/\bi schmooze,? you ship\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou ship,? i schmooze\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?brand,? you (do|run) (the )?ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?ops,? i (do|handle) (the )?brand\b/gi, 'I own the night as organizer')
    // Wave-28 residual co-pilot scrub (SRE/oncall/platform / room-platform / socialize-deploy)
    .replace(/\byou(?:'re| are) (my |the )?sre\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sre\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?platform engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my platform engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?on[- ]?call\b/gi, "I'm the organizer of record")
    .replace(/\bbe my on[- ]?call\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?health check\b/gi, "I'm the organizer of record")
    .replace(/\bbe my health check\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?readiness probe\b/gi, "I'm the organizer of record")
    .replace(/\bbe my readiness probe\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?liveness probe\b/gi, "I'm the organizer of record")
    .replace(/\bbe my liveness probe\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?autoscaler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my autoscaler\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(kubernetes|k8s)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (kubernetes|k8s)\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?terraform\b/gi, "I'm the organizer of record")
    .replace(/\bbe my terraform\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?edge proxy\b/gi, "I'm the organizer of record")
    .replace(/\bbe my edge proxy\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?waf\b/gi, "I'm the organizer of record")
    .replace(/\bbe my waf\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?runbook bot\b/gi, "I'm the organizer of record")
    .replace(/\bbe my runbook bot\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?incident commander\b/gi, "I'm the organizer of record")
    .replace(/\bbe my incident commander\b/gi, "I'm the organizer of record")
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?platform\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?platform,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi socialize,? you deploy\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou deploy,? i socialize\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you page\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou page,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?sre\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?sre,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you operate\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou operate,? i network\b/gi, 'I own the night as organizer')
    // Wave-29 residual co-pilot scrub (DevOps/CI-CD/GitOps / host-monitor / room-fleet)
    .replace(/\byou(?:'re| are) (my |the )?devops( engineer)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my devops( engineer)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?(ci\/?cd|cicd)( pipeline)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my (ci\/?cd|cicd)( pipeline)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?gitops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my gitops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?helm( chart)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my helm( chart)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?argo(cd)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my argo(cd)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?prometheus\b/gi, "I'm the organizer of record")
    .replace(/\bbe my prometheus\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?grafana\b/gi, "I'm the organizer of record")
    .replace(/\bbe my grafana\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?datadog\b/gi, "I'm the organizer of record")
    .replace(/\bbe my datadog\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pagerduty\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pagerduty\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?reliability engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my reliability engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?release engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my release engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?build engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my build engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?chaos engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my chaos engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?platform ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my platform ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?infra as code\b/gi, "I'm the organizer of record")
    .replace(/\bbe my infra as code\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you monitor\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou monitor,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you alert\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou alert,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?fleet\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?fleet,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you scale\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou scale,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you remediate\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou remediate,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?reliability\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?reliability,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?devops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?devops,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    // Wave-30 residual co-pilot scrub (SecOps/AppSec/MLOps/FinOps / host-secure / room-security)
    .replace(/\byou(?:'re| are) (my |the )?secops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my secops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?appsec\b/gi, "I'm the organizer of record")
    .replace(/\bbe my appsec\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?mlops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my mlops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?dataops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my dataops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?finops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my finops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?aiops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my aiops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?security engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my security engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?qa engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my qa engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?test engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my test engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?cloud architect\b/gi, "I'm the organizer of record")
    .replace(/\bbe my cloud architect\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?solutions architect\b/gi, "I'm the organizer of record")
    .replace(/\bbe my solutions architect\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?network engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my network engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?dba\b/gi, "I'm the organizer of record")
    .replace(/\bbe my dba\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?observability engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my observability engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?compliance officer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my compliance officer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?blue team\b/gi, "I'm the organizer of record")
    .replace(/\bbe my blue team\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?red team\b/gi, "I'm the organizer of record")
    .replace(/\bbe my red team\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?soc( analyst)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my soc( analyst)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pentester\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pentester\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?threat modeler\b/gi, "I'm the organizer of record")
    .replace(/\bbe my threat modeler\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?product ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my product ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?revops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my revops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?bizops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bizops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?growth engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my growth engineer\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you secure\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou secure,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?security\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?security,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you scan\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou scan,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?secops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?secops,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you harden\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou harden,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you audit\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou audit,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?compliance\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?compliance,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    // Wave-31 residual co-pilot scrub (DevSecOps/NetOps/CloudOps/ITOps / privacy/GRC/CISO)
    .replace(/\byou(?:'re| are) (my |the )?devsecops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my devsecops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?netops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my netops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?cloudops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my cloudops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?itops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my itops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?sysops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sysops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?privacy engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my privacy engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?dpo\b/gi, "I'm the organizer of record")
    .replace(/\bbe my dpo\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?legalops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my legalops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?legal ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my legal ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?grc( officer| analyst)?\b/gi, "I'm the organizer of record")
    .replace(/\bbe my grc( officer| analyst)?\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?ciso\b/gi, "I'm the organizer of record")
    .replace(/\bbe my ciso\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?security architect\b/gi, "I'm the organizer of record")
    .replace(/\bbe my security architect\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?platform security\b/gi, "I'm the organizer of record")
    .replace(/\bbe my platform security\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?iam engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my iam engineer\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you encrypt\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou encrypt,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?firewall\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?firewall,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you patch\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou patch,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you rotate secrets\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou rotate secrets,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?devsecops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?devsecops,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you firewall\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou firewall,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?grc\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?grc,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    // Wave-32 residual co-pilot scrub (data/analytics eng / TPM / GTM ops / host-warehouse)
    .replace(/\byou(?:'re| are) (my |the )?data engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my data engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?analytics engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my analytics engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?bi engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bi engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?platform pm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my platform pm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?tpm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my tpm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?program manager\b/gi, "I'm the organizer of record")
    .replace(/\bbe my program manager\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?customer success\b/gi, "I'm the organizer of record")
    .replace(/\bbe my customer success\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?support ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my support ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?marketing ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my marketing ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?content ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my content ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?growth ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my growth ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?revenue ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my revenue ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?sales ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my sales ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?enablement\b/gi, "I'm the organizer of record")
    .replace(/\bbe my enablement\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?solutions engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my solutions engineer\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?success engineer\b/gi, "I'm the organizer of record")
    .replace(/\bbe my success engineer\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you warehouse\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou warehouse,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you pipeline\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou pipeline,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you etl\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou etl,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?analytics\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?analytics,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you transform\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou transform,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?dataops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?dataops,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?warehouse\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?warehouse,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    // Wave-33 residual co-pilot scrub (people/talent/design/community/brand ops · demand gen / PMM)
    .replace(/\byou(?:'re| are) (my |the )?people ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my people ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?peopleops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my peopleops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?talent ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my talent ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?talentops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my talentops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?design ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my design ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?designops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my designops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?community ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my community ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?brand ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my brand ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?partnership ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my partnership ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?partnerships ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my partnerships ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?recruiting ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my recruiting ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?talent acquisition\b/gi, "I'm the organizer of record")
    .replace(/\bbe my talent acquisition\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?demand gen\b/gi, "I'm the organizer of record")
    .replace(/\bbe my demand gen\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?demand generation\b/gi, "I'm the organizer of record")
    .replace(/\bbe my demand generation\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?product marketing\b/gi, "I'm the organizer of record")
    .replace(/\bbe my product marketing\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?pmm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my pmm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?lifecycle ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my lifecycle ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?abm\b/gi, "I'm the organizer of record")
    .replace(/\bbe my abm\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?hr ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my hr ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?creative ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my creative ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?editorial ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my editorial ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?channel ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my channel ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?cx ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my cx ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?retention ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my retention ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?employer brand\b/gi, "I'm the organizer of record")
    .replace(/\bbe my employer brand\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you recruit\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou recruit,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you hire\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou hire,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you source\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou source,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?people ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?people ops,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you abm\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou abm,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?demand gen\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?demand gen,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?talent pipeline\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?talent pipeline,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?brand\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?brand,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    // Wave-34 residual co-pilot scrub (fundraising/IR/board/finance · field/event mkt · bizdev)
    .replace(/\byou(?:'re| are) (my |the )?fundraising ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my fundraising ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?investor relations\b/gi, "I'm the organizer of record")
    .replace(/\bbe my investor relations\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?board ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my board ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?field marketing\b/gi, "I'm the organizer of record")
    .replace(/\bbe my field marketing\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?event marketing\b/gi, "I'm the organizer of record")
    .replace(/\bbe my event marketing\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?bizdev\b/gi, "I'm the organizer of record")
    .replace(/\bbe my bizdev\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?business development\b/gi, "I'm the organizer of record")
    .replace(/\bbe my business development\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?corp dev\b/gi, "I'm the organizer of record")
    .replace(/\bbe my corp dev\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?corporate development\b/gi, "I'm the organizer of record")
    .replace(/\bbe my corporate development\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?fpa\b/gi, "I'm the organizer of record")
    .replace(/\bbe my fpa\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?fp&a\b/gi, "I'm the organizer of record")
    .replace(/\bbe my fp&a\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?finance ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my finance ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?founder ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my founder ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?venture ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my venture ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?special projects\b/gi, "I'm the organizer of record")
    .replace(/\bbe my special projects\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?office ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my office ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?facilities ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my facilities ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?vendor ops\b/gi, "I'm the organizer of record")
    .replace(/\bbe my vendor ops\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?procurement\b/gi, "I'm the organizer of record")
    .replace(/\bbe my procurement\b/gi, "I'm the organizer of record")
    .replace(/\byou(?:'re| are) (my |the )?capital markets\b/gi, "I'm the organizer of record")
    .replace(/\bbe my capital markets\b/gi, "I'm the organizer of record")
    .replace(/\bi host,? you fundraise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou fundraise,? i host\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you raise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou raise,? i (smile|host|greet)\b/gi, 'I own the night as organizer')
    .replace(/\bi greet,? you pitch\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou pitch,? i (greet|host|smile)\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?fundraising\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?fundraising,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    .replace(/\bi network,? you ir\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou ir,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?vibes,? you (do|run) (the )?board ops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?board ops,? i (do|handle) (the )?vibes\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?room,? you (do|run) (the )?investor relations\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?investor relations,? i (do|handle) (the )?room\b/gi, 'I own the night as organizer')
    .replace(/\bi (do|handle) (the )?hospitality,? you (do|run) (the )?finance\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?finance,? i (do|handle) (the )?hospitality\b/gi, 'I own the night as organizer')
    // Wave-35 residual co-pilot scrub (network↔fundraise — parity with isHostCopilotAsk)
    .replace(/\bi network,? you (do|run) (the )?fundraise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (do|run) (the )?fundraise,? i network\b/gi, 'I own the night as organizer')
    // Bare "I network you fundraise" (no do/run) — parity with wave-34 "I host you fundraise"
    .replace(/\bi network,? you fundraise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou fundraise,? i network\b/gi, 'I own the night as organizer')
    // Cross-phrase parity: network↔raise · smile↔fundraise (wave-34/35 host splits)
    .replace(/\bi network,? you raise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou raise,? i network\b/gi, 'I own the night as organizer')
    .replace(/\bi smile,? you fundraise\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou fundraise,? i smile\b/gi, 'I own the night as organizer')
    // Wave-36 residual co-pilot scrub (GTM/community/revops/fractional host-splits)
    .replace(/\bi(?:'m| am) (the )?face,? you run gtm\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou (handle|run) gtm,? i host\b/gi, 'I own the night as organizer')
    // Reverse host-splits (parity: "you run gtm|revops, i host" only covered one way)
    .replace(/\bi host,? you (handle|run) gtm\b/gi, 'you may offer fuel; I own the night')
    .replace(/\bi host,? you run revops\b/gi, 'you may offer fuel; I own the night')
    .replace(/\byou(?:'re| are) (my |the )?community (manager|lead)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my community (manager|lead)\b/gi, "I'm the organizer of record")
    .replace(/\byou run revops,? i host\b/gi, 'I own the night as organizer')
    .replace(/\byou(?:'re| are) (my |the )?fractional (coo|ops)\b/gi, "I'm the organizer of record")
    .replace(/\bbe my fractional (coo|ops)\b/gi, "I'm the organizer of record");
  const hasI =
    /\b(I'll|I'm|I own|I drive|I ran|I took|I advanced|I queued|I drafted|I drove|I recruit|I keep|I print|I seed)\b/i.test(
      r,
    );
  if (plan?.ownerLine && !hasI) {
    r = plan.ownerLine + (r ? ' ' + r : '');
  }
  if (!opts.skipNext && plan?.ownerLine && !/\*\*Next:\*\*|\bNext:|I'll /i.test(r)) {
    r = r.replace(/\s+$/, '') + ownerPlanSuffix(plan);
  }
  // Tick planning: gate-open nights must surface advance/seed, not a soft status blurb
  // Same open signals as gateStatusLead (readyToAdvance | gateStatus open | ownerLine advance/seed)
  const gateOpenVoice =
    plan?.readyToAdvance === true ||
    plan?.gateStatus === 'open' ||
    /I'll advance to |I'll seed the next SF/i.test(plan?.ownerLine || '');
  if (
    gateOpenVoice &&
    !/Stage gate open|gate open|I'll advance|I'll seed the next SF/i.test(r)
  ) {
    r = r.replace(/\s+$/, '') + stageReadyBit(plan);
    if (!opts.skipNext && plan.ownerLine && !/\*\*Next:\*\*/i.test(r)) {
      r += ownerPlanSuffix(plan);
    }
  }
  // Gate-open live drift: LLM may say "gate held" while plan is open — flip to open
  // Drop residual "· unlock: …" so open + unlock do not co-exist (tick-plan honesty)
  // Name advance target when known (parity with gateStatusLead / stageReadyBit)
  if (gateOpenVoice && /gate held/i.test(r)) {
    const openTgt =
      plan?.advanceTarget ||
      (/I'll advance to (\w+)/i.exec(plan?.ownerLine || '') || [])[1] ||
      (/I'll seed the next SF/i.test(plan?.ownerLine || '') ? 'next' : null);
    const openLbl = openTgt
      ? `gate open → **${String(openTgt).toLowerCase()}**`
      : 'gate open';
    r = r
      .replace(/\bgate held(?:\s*·\s*unlock:\s*[^.]+)?/gi, openLbl)
      .replace(/\s{2,}/g, ' ');
  }
  // Gate-held live drift: if reply talks gate/advance/blockers but omits held, stamp unlock
  // Skip when gate is open (same signals as gateOpenVoice) — never rewrite open → held
  // (no invent RSVPs; keep owner tick-plan honesty when LLM softens the gate)
  if (
    plan &&
    !gateOpenVoice &&
    (plan.gateStatus === 'held' || plan.unlockLine || plan.ownerLine) &&
    /gate open|ready to advance|I'll advance|stage gate|gate status|holding (the )?(gate|us)|blocked|blocker|unlock|bottleneck|stuck|hold[- ]?up|waiting on|move forward|critical path|critical chain|get unstuck|stage[- ]?up|go\s*[\/-]?\s*no[- ]?go|path forward|unblocks?\b|definition of ready|definition of go|green light|red flags?|kill criteria|kill switch|go gate|go criteria|no[- ]?go criteria|cut line|freeze list|readiness (gate|blockers?|board|ladder)|preflight|mission order|ops stack|execution order|load order|battle rhythm|dependency chain|dependency graph|dependency tree|hot path|triage order|escalation path|release train|burndown|choke point|workstream|critical thread|owner loop|pull order|commit order|gate map|owner cadence|drumbeat|throttle|serial path|force rank|run of show|cue sheet|day[- ]?of stack|show flow|next gate|stage ladder|advance ladder|constraint board|risk board|kill map|load[- ]?in|load[- ]?out|strike plan|work breakdown|commit stack|pull sequence|go chain|serial stack|owner thread|action stack|force order|pre[- ]?show order|tech order|call order|definition of done|done criteria|gantt|day[- ]?of plan|launch checklist|readiness checklist|path to green|green path|red path|gate ladder|unlock stack|blocker board|constraint map|serial order|next hop|mission stack|tick order|owner sequence|action order|work order|pull stack|commit path|go path|ready queue|queue depth|stage map|owner board|focus stack|todo stack|action list|owner roadmap|force list|kill board|go map|execution path|dependency map|night order|gate path|advance path|stage path|ops ladder|night ladder|force stack|serial queue|commit ladder|go ladder|unlock ladder|blocker stack|risk stack|constraint stack|critical sequence|stage board|plan board|sequence board|critical board|night brief|owner brief|tick brief|war room|build order|service order|scrum order|night graph|ops graph|process map|value stream|capacity plan|path of least resistance|single source of truth|theory of constraints|bottleneck analysis|constraint analysis|on the plate|shipping plan|ship plan|one thing|ooda|objective|mission for|sprint goal|focus area|acceptance criteria|job to be done|jtbd|success criteria|definition of success|leverage point|force multiplier|when are we ready|ready when|pull the next|current thread|next best action|\bnba\b|plan of record|highest leverage|immediate next|critical next|ship today|today'?s focus|80\/20|pareto|thinnest slice|smallest next|order of execution|execution sequence|first in line|top of the board|top card|lead item|deserves attention|decision criteria|milestone|checkpoint|key result|\bokr\b|wip limit|ship blockers?|blocking shipping|first domino|keystone|unlocking move|where do we start|starting point|operating model|optimizing for|single next action|minimum viable next|forcing function|daci|moscow|flywheel|wedge|beachhead|one[- ]?pager|stand[- ]?up summary|compounder|eisenhower|2\s*x\s*2|impact.?effort|ice score|rice prioritization|rice score|sequencing for|our sequencing|stakeholder map|empathy map|raid log|\braid\b|raci chart|\braci\b|\bsipoc\b|\bdmaic\b|5s plan|\b5s\b|kaizen|hoshin|catchball|andon|gemba|control chart|spaghetti diagram|standard work|heijunka|jidoka|poka[- ]?yoke|throughput|operating cadence|decision rights|escalation ladder|communication plan|stakeholder plan|work breakdown|wbs|critical chain|iron triangle|triple constraint|scope triangle|value stream|swimlane|process map|dependency map|risk matrix|change control|\bccb\b|common operating picture|\bcop\b|opord|five paragraph|frago|warnord|mett[- ]?tc|mdmp|incident command|\bics\b|gold command|gantt|scope creep|aarrr|pirate metrics|growth loop|activation funnel|retention loop|heart framework|phase gate|phase[- ]?gate|tollgate|toll[- ]?gate|earned value|\bevm\b|cost performance index|schedule performance index|schedule compression|schedule crashing|fast tracking|fast[- ]?track|resource leveling|resource smoothing|total float|free float|schedule float|power interest|responsibility matrix|quality gate|benefits realization|benefit realization|pi planning|program increment|safe framework|scrumban|product backlog|sprint backlog|configuration management|config management|lessons learned|baseline schedule|schedule baseline|performance baseline|change request|monte carlo|orchestration engine|reasoning engine|inference engine|tool router|tool caller|memory layer|retrieval layer|rag layer|planner agent|executor agent|supervisor agent|chain of thought|react loop|llm backbone|model layer|multi[- ]?agent swarm|agent mesh|agent orchestra|worker pool|function[- ]?calling layer|tool[- ]?use layer|skill router|prompt cache|vector store|embeddings? layer|agent framework|computer[- ]?use agent|browser agent|knowledge graph|knowledge base|context window|system prompt|policy engine|guardrail(s)? layer|eval harness|mcp server|tool registry|agent runtime|agent sandbox|agent loop|scorecard engine|judge model|rolling wave|forward pass|backward pass|early start|late start|early finish|late finish|slack time|schedule slack|network diagram|precedence diagram|activity on node|organizational breakdown|resource histogram|crashing analysis|parametric estimat|analogous estimat|three[- ]?point estimat|s[- ]?curve|earned schedule|to complete performance|control account|planning package|budget at completion|estimate at completion|estimate to complete|variance at completion|cost variance|schedule variance|spi trend|cpi trend|wsjf|weighted shortest job first|cost of delay|\bcd3\b|story points?|planning poker|sprint velocity|team velocity|backlog refinement|backlog grooming|sprint planning|sprint review|sprint retrospective|daily standup|daily scrum|burnup|burn[- ]?up chart|cumulative flow|\bcfd\b|cycle time|lead time|little'?s law|kanban board|class of service|service level expectation|\bsle\b|dual[- ]?track|continuous discovery|program board|experiment backlog|opportunity backlog|spotify model|squad model|tribe model|build[- ]?measure[- ]?learn|bml loop|validated learning|innovation accounting|problem[- ]?solution fit|product[- ]?market fit|\bpmf\b|working backwards|working backward|press release method|pr[/ ]?faq|customer development|lean startup|smoke test|concierge mvp|wizard of oz|pretotype|pretotyping|fake door test|landing page test|feature freeze|code freeze|content freeze|hardening sprint|stabilization sprint|tech debt backlog|technical debt backlog|research spike|story spike|spike story|architectural runway|enabler stor|increment goal|pi objective|post[- ]?mortem|blameless post[- ]?mortem|assumption mapping|assumption map|architecture decision record|rfc process|design doc|tech radar|\bokrs\b|key results|event storming|domain[- ]?driven design|\bddd\b|bounded context|\bcqrs\b|event sourcing|strangler fig|strangler pattern|trunk[- ]?based development|continuous delivery|continuous deployment|dora metrics|four keys|change fail rate|deployment frequency|mean time to recovery|\bmttr\b|toil budget|error budget|service level objective|service level indicator|cron job|circuit breaker|retry queue|feature flag|chaos monkey|observability layer|tracing layer|metrics pipeline|log aggregator|secret store|config server|service discovery|site reliability|reliability engineering|incident response|chaos engineering|disaster recovery|game day|tabletop exercise|failover plan|multi[- ]?region failover|recovery time objective|recovery point objective|mean time between failures|\bmtbf\b|five nines|availability target|status page|on[- ]?call rotation|pager rotation|blameless culture|runbook drill|\bsre\b|platform engineer|on[- ]?call|health check|readiness probe|liveness probe|autoscaler|kubernetes|terraform|edge proxy|runbook bot|incident commander|continuous integration|deployment pipeline|ci\/?cd pipeline|cicd pipeline|gitops|infrastructure as code|infra as code|platform engineering|progressive delivery|blast radius|toil reduction|golden signals|four golden signals|error budget burn|burn rate|alert fatigue|on[- ]?call handoff|pager handoff|auto[- ]?remediation|self[- ]?healing|runbook automation|mean time to detect|\bmttd\b|service catalog|rolling update|canary analysis|operational excellence|change management|release management|devops|reliability engineer|release engineer|build engineer|chaos engineer|platform ops|security posture|threat model|shift left|zero trust|least privilege|defense in depth|attack surface|vulnerability management|penetration test|pen test|security review|compliance checklist|data classification|access control|secrets rotation|certificate rotation|supply chain security|software bill of materials|\bsbom\b|dependency scanning|static analysis|dynamic analysis|security chaos|finops review|cost allocation|right[- ]?sizing|capacity forecasting|mlops pipeline|feature store|model registry|data lineage|observability stack|distributed tracing|log aggregation|secops|appsec|mlops|dataops|finops|aiops|security engineer|qa engineer|test engineer|cloud architect|solutions architect|network engineer|\bdba\b|observability engineer|compliance officer|blue team|red team|\bsoc\b|pentester|threat modeler|product ops|revops|bizops|growth engineer|policy as code|secrets scanning|container security|image scanning|runtime security|zero[- ]?day response|breach response|security questionnaire|soc\s*2|soc2|iso\s*27001|privacy review|data retention policy|dpa review|pci compliance|hipaa readiness|bug bounty|responsible disclosure|security champion|threat intel|threat intelligence|ioc triage|cve triage|patch management|vulnerability triage|waf policy|network segmentation|mfa rollout|sso rollout|identity federation|privileged access|pam review|kubernetes security|pod security|supply chain attack|\bslsa\b|code signing|artifact signing|\bsiem\b|\bsoar\b|\bcspm\b|\bcnapp\b|tabletop security|iam review|devsecops|netops|cloudops|itops|sysops|privacy engineer|\bdpo\b|legalops|legal ops|\bgrc\b|ciso|security architect|platform security|iam engineer|data pipeline|etl pipeline|analytics stack|data warehouse|data lake|metrics layer|semantic layer|dbt project|airflow dag|spark job|feature engineering|data quality|data contracts?|cdc pipeline|reverse etl|funnel analysis|cohort analysis|product analytics|tracking plan|instrumentation plan|event taxonomy|capacity planning|data mesh|lakehouse|medallion architecture|streaming pipeline|batch pipeline|data catalog|data governance|master data management|customer data platform|attribution model|experimentation platform|data engineer|analytics engineer|bi engineer|platform pm|\btpm\b|program manager|customer success|support ops|marketing ops|content ops|growth ops|revenue ops|sales ops|enablement|solutions engineer|success engineer|people ops|peopleops|talent ops|talentops|design ops|designops|community ops|brand ops|partnership ops|partnerships ops|recruiting ops|talent acquisition|demand gen|demand generation|product marketing|\bpmm\b|lifecycle ops|\babm\b|hr ops|creative ops|editorial ops|channel ops|cx ops|retention ops|employer brand|talent pipeline|hiring plan|people ops roadmap|recruiting funnel|demand gen plan|lifecycle marketing|abm program|account[- ]?based marketing|crm hygiene|sales pipeline review|product marketing plan|community calendar|brand system|design system|editorial calendar|content calendar|gtm motion|go[- ]?to[- ]?market motion|sales playbook|win\/?loss analysis|icp definition|persona map|messaging house|brand guidelines|style guide|design tokens|component library|figma library|community health|nps program|csat survey|onboarding program|offboarding checklist|performance cycle|comp review|headcount plan|org design|succession plan|partnership pipeline|channel strategy|employer branding|employee experience|fundraising plan|investor update|board deck|board pack|board meeting|cash runway|unit economics|ltv\s*[:\/]?\s*cac|ltv cac|pitch deck|cap table|fp&a model|fpa model|forecast call|meddic|qbr plan|mutual action plan|voice of customer|user research plan|annual planning|pricing strategy|commission plan|deal review|customer advisory board|term sheet|fundraise pipeline|investor pipeline|burn multiple|gross margin|contribution margin|payback period|sales territory|quota plan|pipeline hygiene|discovery call|demo script|packaging strategy|budget cycle|p&l review|pnl review|cost center|seed round plan|series a plan|convertible note|safe note|fundraising ops|investor relations|board ops|field marketing|event marketing|bizdev|business development|corp dev|corporate development|\bfpa\b|fp&a|finance ops|founder ops|venture ops|special projects|office ops|facilities ops|vendor ops|procurement|capital markets/i.test(
      r,
    ) &&
    !/gate held/i.test(r)
  ) {
    r = r.replace(/\bgate open\b/gi, 'gate held');
    if (!/gate held/i.test(r)) {
      const unlock = plan.unlockLine || plan.ownerLine;
      const u = unlock ? String(unlock).replace(/\.\s*$/, '').trim() : null;
      r =
        r.replace(/\s+$/, '') +
        (u ? ` Stage gate held · unlock: ${u}.` : ' Stage gate held.');
    } else if (!/unlock:/i.test(r)) {
      // Word-flip open→held left no unlock name — stamp primary (tick-plan honesty)
      const unlock = plan.unlockLine || plan.ownerLine;
      const u = unlock ? String(unlock).replace(/\.\s*$/, '').trim() : null;
      if (u) r = r.replace(/\s+$/, '') + ` · unlock: ${u}.`;
    }
  }
  // Soft honesty if talking guests/RSVP/attendance without null language
  if (
    /\b(rsvp|guest count|how many (guests|people|rsvps?)|attendance|headcount|door tally|confirmed|attended)\b/i.test(
      r,
    ) &&
    !/\bnull\b|no fake/i.test(r)
  ) {
    r += ' Invited/confirmed/attended stay null until real (no fake RSVPs).';
  }
  // Stage late-cycle: always keep null honesty when plan says so and reply is silent
  const st = plan?.stage || '';
  if (
    ['rsvp', 'run', 'followup', 'debrief'].includes(st) &&
    plan?.rsvpHonesty &&
    (plan.rsvpHonesty.invited ?? null) == null &&
    (plan.rsvpHonesty.confirmed ?? null) == null &&
    (plan.rsvpHonesty.attended ?? null) == null &&
    !/\bnull\b|no fake/i.test(r)
  ) {
    r += rsvpHonestyBit(plan) || ' RSVP counts: invited/confirmed/attended **null** (no fake RSVPs).';
  }
  // Strip invented headcount claims ("12 confirmed", "8 attending", "we have 8 RSVPs")
  if (/\b\d+\s+(people|guests|rsvps?)\s+(confirmed|attending|coming)\b/i.test(r)) {
    r = r.replace(
      /\b\d+\s+(people|guests|rsvps?)\s+(confirmed|attending|coming)\b/gi,
      'counts stay null ($2 not inventable)',
    );
    if (!/\bno fake/i.test(r)) r += ' No fake RSVPs.';
  }
  if (/\b(we have|there are|got)\s+\d+\s+(people|guests|rsvps?)\b/i.test(r) && !/\bnull\b|no fake/i.test(r)) {
    r = r.replace(/\b(we have|there are|got)\s+\d+\s+(people|guests|rsvps?)\b/gi, 'counts stay null (no invent)');
    r += ' No fake RSVPs.';
  }
  // "8 RSVPs confirmed" / "12 confirmed RSVPs"
  if (/\b\d+\s+rsvps?\s+(are\s+)?(confirmed|attending|in)\b/i.test(r)) {
    r = r.replace(/\b\d+\s+rsvps?\s+(are\s+)?(confirmed|attending|in)\b/gi, 'RSVP counts stay null');
    if (!/\bno fake/i.test(r)) r += ' No fake RSVPs.';
  }
  if (/\b\d+\s+confirmed\s+rsvps?\b/i.test(r)) {
    r = r.replace(/\b\d+\s+confirmed\s+rsvps?\b/gi, 'null confirmed RSVPs');
    if (!/\bno fake/i.test(r)) r += ' No fake RSVPs.';
  }
  // "8 confirmed guests" / "12 confirmed people" / "5 confirmed attendees"
  if (/\b\d+\s+confirmed\s+(guests?|people|attendees?)\b/i.test(r)) {
    r = r.replace(/\b\d+\s+confirmed\s+(guests?|people|attendees?)\b/gi, 'null confirmed counts');
    if (!/\bno fake/i.test(r)) r += ' No fake RSVPs.';
  }
  // Live LLM sometimes invents "X RSVPs" alone
  if (/\b\d+\s+rsvps?\b/i.test(r) && !/\bnull\b|no fake|queued|draft/i.test(r)) {
    r = r.replace(/\b\d+\s+rsvps?\b/gi, 'RSVP counts null');
    r += ' No fake RSVPs.';
  }
  return r;
}

/**
 * Inbound resource fuel (offer/capacity) — not demand ("need a venue") or co-pilot handoff.
 * Bare "venue/sponsor" words alone are NOT fuel (those are owner-work asks).
 */
function isInboundResourceFuel(last) {
  // Demand language → owner finds/matches, not "take as fuel"
  if (
    /\b(need|find|looking for|search for|get me|book|can you find|help me find)\b.{0,40}\b(a |an )?(venue|sponsor|volunteer|room|space|office|loft)\b/.test(
      last,
    ) ||
    /\b(need a|find a|looking for a)\b/.test(last)
  ) {
    return false;
  }
  return (
    /\b(i have|i can|we can|happy to|willing to)\b.{0,40}\b(host|sponsor|volunteer|room|space|office|loft|studio|tab|drinks|food)\b/.test(
      last,
    ) ||
    /\b(want to)\b.{0,24}\b(host|sponsor|volunteer|offer)\b/.test(last) ||
    /\b(free (office|room|loft|space|venue)|can host|my (office|loft|studio|space)|drink sponsor|tab sponsor)\b/.test(
      last,
    ) ||
    /\boffer(ing)? (a |my |to )?(venue|room|space|office|loft|sponsor|volunteer|host)\b/.test(last)
  );
}

/** User treats bot as host co-pilot / assistant — reclaim owner voice. */
function isHostCopilotAsk(last) {
  return (
    /\b(as host|you stay (the )?host|you(?:'re| are) the host|you(?:'re| are) my co-?pilot|you(?:'re| are) my (event )?assistant|what should i do|tell me what to do|i'?m (just )?the host|you host|host co-?pilot|co-?pilot|delegate (hosting|to me)|give me (host )?tasks|should i (run|host)|assign me( (the )?(host )?tasks| host)|what(?:'s| is) my role|make me (the )?host|i(?:'ll| will) just show up|you take co-?pilot|hand(ing)? (hosting|the room) (to me|back)|help me host|i'?ll host,? you (support|assist|help)|support me as host|you run everything)\b/.test(
      last,
    ) ||
    /\byou(?:'re| are) just (my |the )?(assistant|co-?pilot)\b/.test(last) ||
    /\bjust (my |the )?(assistant|co-?pilot) for hosting\b/.test(last) ||
    /\b(assistant for hosting|hosting assistant)\b/.test(last) ||
    /\bwhat do you want me to do\b/.test(last) ||
    /\b(i'?m the host|my job as host|my role (as host|tonight))\b/.test(last) ||
    /\bassign me (the )?(host )?tasks\b/.test(last) ||
    // Residual co-pilot handoff (wave 4 owner voice reclaim)
    /\byou(?:'re| are) running (the )?show\b/.test(last) ||
    /\bpass(ing)? (the )?host baton\b/.test(last) ||
    /\byour (turn|job) to host\b/.test(last) ||
    /\bi'?ll just advise\b/.test(last) ||
    /\btake (your|the) lead on hosting\b/.test(last) ||
    /\byou host,? i (watch|observe|advise)\b/.test(last) ||
    // Wave-5 residual co-pilot (captain / passenger / coach / host seat)
    /\bbe my co-?pilot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?co-?organizer\b/.test(last) ||
    /\bbe my co-?organizer\b/.test(last) ||
    /\byou(?:'re| are) (the )?host co-?pilot\b/.test(last) ||
    /\bmake me (your |the )?co-?pilot\b/.test(last) ||
    /\byou(?:'re| are) in the host seat\b/.test(last) ||
    /\btake the host seat\b/.test(last) ||
    /\b(you )?captain (the )?night\b/.test(last) ||
    /\byou(?:'re| are) (the )?captain\b/.test(last) ||
    /\bi(?:'m| am) (just )?(a )?passenger\b/.test(last) ||
    /\bi(?:'ll| will) (just )?(be )?passenger\b/.test(last) ||
    /\bi(?:'ll| will) (just )?ride along\b/.test(last) ||
    /\byou drive,? i ride\b/.test(last) ||
    /\bi host,? you advise\b/.test(last) ||
    /\byou advise,? i host\b/.test(last) ||
    /\b(coach|mentor) me as host\b/.test(last) ||
    /\bjust coach me\b/.test(last) ||
    /\bi'?ll sit back\b/.test(last) ||
    /\bsit back and host for me\b/.test(last) ||
    /\bhosting is yours\b/.test(last) ||
    /\byou own hosting\b/.test(last) ||
    /\bi hand hosting to you\b/.test(last) ||
    /\bi'?ll watch you host\b/.test(last) ||
    // Wave-6 residual co-pilot (coordinator / sidekick / MC / FOOH / staff / human host)
    /\byou(?:'re| are) (my |the )?(event )?coordinator\b/.test(last) ||
    /\bbe my (event )?coordinator\b/.test(last) ||
    /\bi(?:'m| am) (the )?host,? you (assist|support|help)\b/.test(last) ||
    /\byou (assist|support|help),? i(?:'m| am) (the )?host\b/.test(last) ||
    /\bbe my sidekick\b/.test(last) ||
    /\byou(?:'re| are) (the |my )?sidekick\b/.test(last) ||
    /\bi(?:'ll| will) mc,? you (support|assist|help)\b/.test(last) ||
    /\byou support,? i mc\b/.test(last) ||
    /\bmake me (the )?mc\b/.test(last) ||
    /\bi(?:'m| am) (the )?human host\b/.test(last) ||
    /\byou(?:'re| are) staff (for )?(the )?host\b/.test(last) ||
    /\bdelegate (the )?hosting to me\b/.test(last) ||
    /\bi stay in charge,? you help\b/.test(last) ||
    /\byou(?:'re| are) (the )?backup host\b/.test(last) ||
    /\bbackup me as host\b/.test(last) ||
    /\bi(?:'m| am) front of house\b/.test(last) ||
    /\byou(?:'re| are) (the )?planner,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\bface of the room is me\b/.test(last) ||
    // Wave-7 residual co-pilot (producer / logistics / stage manage / ops / deputy)
    // "you produce the night I host" must reclaim — not false-positive drive_cycle
    // Bare "can you produce the night" stays produce/drive (no I-host split).
    /\byou(?:'re| are) (my |the )?(event )?producer\b/.test(last) ||
    /\bbe my (event )?producer\b/.test(last) ||
    /\byou produce (the )?(night|event|room).{0,40}\bi (host|talk|greet|smile)\b/.test(last) ||
    /\bi (host|talk|greet|smile).{0,40}\byou produce\b/.test(last) ||
    /\bi(?:'m| am) (the )?talent,? you (produce|handle|run)\b/.test(last) ||
    /\byou(?:'re| are) (the )?logistics lead\b/.test(last) ||
    /\bi(?:'m| am) (the )?talent,? you handle logistics\b/.test(last) ||
    /\byou stage[- ]?manage\b/.test(last) ||
    /\bi (emcee|mc|talk),? you stage[- ]?manage\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event )?manager\b/.test(last) ||
    /\bbe my (event )?manager\b/.test(last) ||
    /\byou(?:'re| are) (the )?floor manager\b/.test(last) ||
    /\byou do ops,? i (greet|host|smile)\b/.test(last) ||
    /\bi(?:'m| am) (the )?greeter,? you (organize|plan|run)\b/.test(last) ||
    /\bbe my number two\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?number two\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?second chair\b/.test(last) ||
    /\bi(?:'m| am) (the )?figurehead\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ops (lead|person)\b/.test(last) ||
    /\bbe my ops lead\b/.test(last) ||
    /\byou handle ops,? i (smile|greet|host)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event )?deputy\b/.test(last) ||
    /\bbe my (event )?deputy\b/.test(last) ||
    /\bi(?:'m| am) (the )?public face,? you ops\b/.test(last) ||
    /\byou(?:'re| are) (the )?understudy host\b/.test(last) ||
    /\bjust advise me,? i host\b/.test(last) ||
    /\bi(?:'m| am) (the )?name on the invite,? you run it\b/.test(last) ||
    // Wave-8 residual co-pilot (showrunner / stagehand / crew / BOH / EP / right-hand)
    /\byou(?:'re| are) (my |the )?showrunner\b/.test(last) ||
    /\bbe my showrunner\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stagehand\b/.test(last) ||
    /\bbe my stagehand\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(crew chief|right hand)\b/.test(last) ||
    /\bbe my (crew chief|right hand)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?wrangler\b/.test(last) ||
    /\bbe my wrangler\b/.test(last) ||
    /\bbe my (exec |executive )?producer\b/.test(last) ||
    /\byou(?:'re| are) (the )?(exec |executive )?producer\b/.test(last) ||
    /\byou(?:'re| are) (the )?ep,? i (host|talk|greet)\b/.test(last) ||
    /\bi(?:'m| am) (the )?talent,? you(?:'re| are) (the )?crew\b/.test(last) ||
    /\byou(?:'re| are) (the )?crew,? i(?:'m| am) (the )?talent\b/.test(last) ||
    /\byou run (the )?back of house\b/.test(last) ||
    /\byou(?:'re| are) boh,? i(?:'m| am) foh\b/.test(last) ||
    /\bi(?:'m| am) foh,? you(?:'re| are) boh\b/.test(last) ||
    /\byou handle production,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) production,? i (talk|host|greet)\b/.test(last) ||
    /\bi(?:'m| am) on stage,? you run production\b/.test(last) ||
    /\byou(?:'re| are) backstage,? i(?:'m| am) on stage\b/.test(last) ||
    /\bi(?:'m| am) (the )?face,? you run (the )?show\b/.test(last) ||
    /\byou(?:'re| are) (the )?brains,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\bi(?:'m| am) (the )?ceremonial host\b/.test(last) ||
    /\bi(?:'m| am) (the )?celebrity host\b/.test(last) ||
    /\byou do (the )?dirty work,? i (greet|host|smile)\b/.test(last) ||
    /\byou handle everything behind the scenes\b/.test(last) ||
    /\bbehind the scenes is you,? i (host|greet)\b/.test(last) ||
    /\bmake me (the )?figurehead\b/.test(last) ||
    // Wave-9 residual co-pilot (fixer / roadie / star / TD / quarterback / ATC / guest-of-honor)
    // "I am the star you run the night" must reclaim — not false-positive drive_cycle
    /\byou(?:'re| are) (my |the )?fixer\b/.test(last) ||
    /\bbe my fixer\b/.test(last) ||
    /\byou(?:'re| are) (the )?handler,? i(?:'m| am) (the )?talent\b/.test(last) ||
    /\bi(?:'m| am) (the )?talent,? you(?:'re| are) (the )?handler\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?roadie\b/.test(last) ||
    /\bbe my roadie\b/.test(last) ||
    /\bi(?:'m| am) (the )?star,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\byou run (the )?(night|event|room|show),? i(?:'m| am) (the )?star\b/.test(last) ||
    /\byou run logistics,? i(?:'m| am) (the )?star\b/.test(last) ||
    /\bi(?:'m| am) (the )?star,? you run logistics\b/.test(last) ||
    /\bbe my technical director\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?technical director\b/.test(last) ||
    /\byou(?:'re| are) (the )?td,? i (host|talk|greet)\b/.test(last) ||
    /\bi(?:'m| am) (the )?guest of honor\b/.test(last) ||
    /\byou(?:'re| are) (the )?back office,? i(?:'m| am) (the )?front\b/.test(last) ||
    /\bi(?:'m| am) (the )?front,? you(?:'re| are) (the )?back office\b/.test(last) ||
    /\bmake me (the )?celebrity\b/.test(last) ||
    /\byou handle all (the )?details,? i (show up|just show)\b/.test(last) ||
    /\bi just show my face,? you do (the )?rest\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?air traffic controller\b/.test(last) ||
    /\bbe my air traffic controller\b/.test(last) ||
    /\bbe my quarterback\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?quarterback\b/.test(last) ||
    // Wave-10 residual co-pilot (chief of staff / wingman / headliner / day-of lead / glad-hand)
    // "I just glad-hand you run the night" / "I am the headliner you run the night" must reclaim
    // — not false-positive drive_cycle via "run the night". "day-of lead" must not stage-advance.
    /\byou(?:'re| are) (my |the )?chief of staff\b/.test(last) ||
    /\bbe my chief of staff\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?wingman\b/.test(last) ||
    /\bbe my wingman\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?concierge\b/.test(last) ||
    /\bbe my concierge\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?butler\b/.test(last) ||
    /\bbe my butler\b/.test(last) ||
    /\bi(?:'m| am) (the )?vip,? you (handle|run|do)\b/.test(last) ||
    /\byou (handle|run) logistics,? i(?:'m| am) (the )?vip\b/.test(last) ||
    /\bi(?:'m| am) (the )?vip,? you handle logistics\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?body man\b/.test(last) ||
    /\bbe my body man\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?body man,? i(?:'m| am) (the )?talent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?adjutant\b/.test(last) ||
    /\bbe my adjutant\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?aide(-de-camp)?\b/.test(last) ||
    /\bbe my aide(-de-camp)?\b/.test(last) ||
    /\bi(?:'m| am) (the )?headliner,? you (produce|run|handle)\b/.test(last) ||
    /\byou (produce|run) (the )?(night|event|room|show),? i(?:'m| am) (the )?headliner\b/.test(last) ||
    /\bi(?:'m| am) (the )?headliner,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\bi(?:'m| am) (the )?keynote,? you (handle|run|organize)\b/.test(last) ||
    /\bmake me (the )?headliner\b/.test(last) ||
    /\bmake me (the )?marquee\b/.test(last) ||
    /\bi(?:'m| am) (the )?marquee,? you (run|produce|handle)\b/.test(last) ||
    /\bi(?:'m| am) (the )?billboard,? you run ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?day[- ]?of lead\b/.test(last) ||
    /\bbe my day[- ]?of lead\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?day[- ]?of lead,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\byou do (the )?heavy lifting,? i (schmooze|smile|greet|host)\b/.test(last) ||
    /\byou handle (the )?heavy lifting,? i (schmooze|smile|greet|host)\b/.test(last) ||
    /\bi just glad[- ]?hand,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\bi glad[- ]?hand,? you (run|organize|handle)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(personal assistant|pa)\b/.test(last) ||
    /\bbe my personal assistant\b/.test(last) ||
    /\bbe my personal assistant for (the )?(night|event)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pa,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pit crew\b/.test(last) ||
    /\bbe my pit crew\b/.test(last) ||
    /\byou(?:'re| are) (the )?pit boss,? i (schmooze|host|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?advance (man|team)\b/.test(last) ||
    /\bbe my advance (man|team)\b/.test(last) ||
    // Wave-11 residual co-pilot (speechify / ribbon / sherpa / bag man / house manager / EA)
    // "I just speechify you run the night" / "I cut the ribbon you run the night" must reclaim
    // — not false-positive drive_cycle via "run the night".
    /\byou(?:'re| are) (my |the )?bag man\b/.test(last) ||
    /\bbe my bag man\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sherpa\b/.test(last) ||
    /\bbe my sherpa\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?man friday\b/.test(last) ||
    /\bbe my man friday\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?factotum\b/.test(last) ||
    /\bbe my factotum\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?valet\b/.test(last) ||
    /\bbe my valet\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?intern\b/.test(last) ||
    /\bbe my intern\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?intern,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?gofer\b/.test(last) ||
    /\bbe my gofer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?runner\b/.test(last) ||
    /\bbe my runner\b/.test(last) ||
    /\bi just speechify,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\bi speechify,? you (run|produce|handle)\b/.test(last) ||
    /\bi cut the ribbon,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\bi(?:'m| am) (the )?ribbon cutter,? you (run|produce|handle)\b/.test(last) ||
    /\bi do photo ops,? you (produce|run|handle)\b/.test(last) ||
    /\bi just toast,? you (produce|run|handle)\b/.test(last) ||
    /\bi just (do )?welcomes?,? you (run|organize|handle)\b/.test(last) ||
    /\bi just speak,? you (produce|run|handle)\b/.test(last) ||
    /\byou (produce|run|handle),? i just speak\b/.test(last) ||
    /\bi(?:'m| am) just (the )?speaker,? you (produce|run|handle)\b/.test(last) ||
    /\bi(?:'m| am) (the )?keynote speaker,? you (organize|handle|run)\b/.test(last) ||
    /\byou handle (the )?room,? i just speak\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?campaign manager\b/.test(last) ||
    /\bbe my campaign manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?scheduler\b/.test(last) ||
    /\bbe my scheduler\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?production assistant\b/.test(last) ||
    /\bbe my production assistant\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(exec |executive )?assistant\b/.test(last) ||
    /\bbe my (exec |executive )?assistant\b/.test(last) ||
    // residual: act|serve|want you as my assistant|co-pilot (parity be my; owner voice reclaim)
    /\b(act as|serve as|i want you as) (my |the )?(event )?(assistant|co-?pilot)\b/.test(last) ||
    /\bbe my ea\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ea\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?floor captain\b/.test(last) ||
    /\bbe my floor captain\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?house manager\b/.test(last) ||
    /\bbe my house manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stage manager\b/.test(last) ||
    /\bbe my stage manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?proxy host\b/.test(last) ||
    /\bbe my proxy host\b/.test(last) ||
    /\byou(?:'re| are) (the )?backline,? i(?:'m| am) (the )?foh\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?gaffer\b/.test(last) ||
    /\bbe my gaffer\b/.test(last) ||
    /\bmake me (the )?vip\b/.test(last) ||
    /\bi(?:'m| am) (the )?face of the brand,? you (run|handle)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?right[- ]hand man\b/.test(last) ||
    /\bbe my right[- ]hand man\b/.test(last) ||
    /\bbe my number 2\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?number 2\b/.test(last) ||
    /\bbe my handler of record\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?handler of record\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?logistics,? i (host|talk|greet)\b/.test(last) ||
    /\bi just glad[- ]?hand (the )?room,? you (organize|run|handle)\b/.test(last) ||
    // Wave-12 residual co-pilot (majordomo / batman / entourage / publicist / pose / green room)
    // "I just do intros you run the night" must reclaim — not false-positive follow-up via "intro"
    // or drive_cycle via "run the night". "I just pose you produce" must not drive.
    /\byou(?:'re| are) (my |the )?majordomo\b/.test(last) ||
    /\bbe my majordomo\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?batman\b/.test(last) ||
    /\bbe my batman\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?batman,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?entourage( lead)?\b/.test(last) ||
    /\bbe my entourage( lead)?\b/.test(last) ||
    /\bi(?:'m| am) (the )?guest speaker,? you (handle|run|organize)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?travel agent\b/.test(last) ||
    /\bbe my travel agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?bodyguard\b/.test(last) ||
    /\bbe my bodyguard\b/.test(last) ||
    /\bbe my bodyguard,? i (talk|host|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pr (person|lead|rep)\b/.test(last) ||
    /\bbe my pr (person|lead|rep)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pr (person|lead|rep),? i(?:'m| am) (the )?face\b/.test(last) ||
    /\bi just pose,? you (produce|run|handle)\b/.test(last) ||
    /\bi just smile and wave,? you (run|produce|handle)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?booking agent\b/.test(last) ||
    /\bbe my booking agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?talent manager\b/.test(last) ||
    /\bbe my talent manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?publicist\b/.test(last) ||
    /\bbe my publicist\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?publicist,? i (speak|host|talk)\b/.test(last) ||
    /\bmake me (the )?guest of honor\b/.test(last) ||
    /\bi(?:'m| am) ceremonial,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sommelier\b/.test(last) ||
    /\bbe my sommelier\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sommelier,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?night manager\b/.test(last) ||
    /\bbe my night manager\b/.test(last) ||
    /\byou(?:'re| are) (the )?event staff,? i(?:'m| am) (the )?talent\b/.test(last) ||
    /\bi just cut (the )?cake,? you (organize|run|handle)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?scribe\b/.test(last) ||
    /\bbe my scribe\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stenographer\b/.test(last) ||
    /\bbe my stenographer\b/.test(last) ||
    /\bi(?:'m| am) on camera,? you (produce|run|handle)\b/.test(last) ||
    /\byou run (the )?green room,? i (host|talk|greet)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?green room manager\b/.test(last) ||
    /\bbe my green room manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?hospitality lead\b/.test(last) ||
    /\bbe my hospitality lead\b/.test(last) ||
    /\bi just (do )?intros?,? you run (the )?(night|event|room|show)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?emcee coach\b/.test(last) ||
    /\bbe my emcee coach\b/.test(last) ||
    // Wave-13 residual co-pilot (ops team / production company / booker / talent / show-up)
    // "I show up you do everything" / "treat me like talent" must reclaim, not generic lifecycle.
    // "you're the booker" must not fall to sponsor/venue path.
    /\byou(?:'re| are) (my |the )?ops team\b/.test(last) ||
    /\bbe my ops team\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?entire production team\b/.test(last) ||
    /\bbe my (entire )?production team\b/.test(last) ||
    /\byou(?:'re| are) (the )?production company\b/.test(last) ||
    /\bbe (my |the )?production company\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?booker\b/.test(last) ||
    /\bbe my booker\b/.test(last) ||
    /\byou(?:'re| are) (the )?booker,? i (host|talk|greet)\b/.test(last) ||
    /\btreat me like (the )?talent\b/.test(last) ||
    /\bi(?:'m| am) (the )?talent,? you(?:'re| are) production\b/.test(last) ||
    /\byou(?:'re| are) production,? i(?:'m| am) (the )?talent\b/.test(last) ||
    /\bi show up,? you do everything\b/.test(last) ||
    /\bi just show (my face|up),? you (produce|run|handle|do) (everything|the rest|ops)?\b/.test(
      last,
    ) ||
    /\bi'?ll glad[- ]?hand,? you produce\b/.test(last) ||
    /\byou (handle|run) production,? i glad[- ]?hand\b/.test(last) ||
    /\bpersonal assistant for (the )?(night|event|room)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pa for (the )?(night|event)\b/.test(last) ||
    /\byou(?:'re| are) logistics,? i (host|talk|greet)\b/.test(last) ||
    /\bi (host|talk|greet),? you(?:'re| are) logistics\b/.test(last) ||
    // Wave-14 residual co-pilot (agency / handler bare / back office bare / network-schmooze / VIP)
    // Bare "you're my handler" / "you're the event agency" / "you're the back office" must reclaim
    // (not generic lifecycle). "I'll work the room you handle ops" must not venue-demand path.
    /\byou(?:'re| are) (my |the )?(event )?agency\b/.test(last) ||
    /\bbe my (event )?agency\b/.test(last) ||
    /\byou(?:'re| are) (the )?agency,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\bi(?:'m| am) (the )?face,? you(?:'re| are) (the )?agency\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?handler\b/.test(last) ||
    /\bbe my handler\b/.test(last) ||
    /\byou(?:'re| are) (the )?back office\b/.test(last) ||
    /\bbe (my |the )?back office\b/.test(last) ||
    /\bi front,? you (are )?(the )?back office\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ghost producer\b/.test(last) ||
    /\bbe my ghost producer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?external ops\b/.test(last) ||
    /\bbe my external ops\b/.test(last) ||
    /\bi'?ll (network|schmooze|mingle),? you (produce|handle|run)\b/.test(last) ||
    /\byou (produce|handle|run),? i'?ll (network|schmooze|mingle)\b/.test(last) ||
    /\bi'?ll work (the )?room,? you (handle|run) (ops|production|everything)\b/.test(last) ||
    /\byou (handle|run) (ops|production),? i'?ll work (the )?room\b/.test(last) ||
    /\bi'?ll glad[- ]?hand,? you(?:'re| are) (ops|production)\b/.test(last) ||
    /\btreat me like (a |the )?vip\b/.test(last) ||
    /\bi just (do )?vibes?,? you (do|handle|run) (ops|production|everything)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?support staff\b/.test(last) ||
    /\bbe my support staff\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?white[- ]?glove\b/.test(last) ||
    /\bbe my white[- ]?glove\b/.test(last) ||
    // Wave-15 residual co-pilot (operator / ops desk / engine room / hold court / admin / machine)
    // Bare "you're my operator" / "be my event ops" / "you're my ops desk" must reclaim (not lifecycle).
    // "I'll hold court you produce" / "I do the room you do the work" must not drive or venue-demand.
    /\byou(?:'re| are) (my |the )?operator\b/.test(last) ||
    /\bbe my operator\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event )?ops\b/.test(last) ||
    /\bbe my (event )?ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ops desk\b/.test(last) ||
    /\bbe my ops desk\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?engine room\b/.test(last) ||
    /\bbe my engine room\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ground control\b/.test(last) ||
    /\bbe my ground control\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?mission control\b/.test(last) ||
    /\bbe my mission control\b/.test(last) ||
    /\bi'?ll hold court,? you (produce|handle|run)\b/.test(last) ||
    /\byou (produce|handle|run),? i'?ll hold court\b/.test(last) ||
    /\bi'?ll work (the )?crowd,? you (handle|run|produce)\b/.test(last) ||
    /\byou (handle|run|produce),? i'?ll work (the )?crowd\b/.test(last) ||
    /\byou do (the )?work,? i do (the )?room\b/.test(last) ||
    /\bi do (the )?room,? you do (the )?work\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event )?admin\b/.test(last) ||
    /\bbe my (event )?admin\b/.test(last) ||
    /\byou handle (the )?admin,? i (host|talk|greet)\b/.test(last) ||
    /\bi (host|talk|greet),? you handle (the )?admin\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?desk\b/.test(last) ||
    /\bbe my desk\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?production desk\b/.test(last) ||
    /\bbe my production desk\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?spreadsheet\b/.test(last) ||
    /\bbe my spreadsheet\b/.test(last) ||
    /\byou(?:'re| are) (the )?machine,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\bi(?:'m| am) (the )?face,? you(?:'re| are) (the )?machine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?night ops\b/.test(last) ||
    /\bbe my night ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?field ops\b/.test(last) ||
    /\bbe my field ops\b/.test(last) ||
    /\bi'?ll network,? you handle everything\b/.test(last) ||
    /\byou handle everything,? i'?ll network\b/.test(last) ||
    /\btreat me like (the )?face\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?backstop\b/.test(last) ||
    /\bbe my backstop\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?air cover\b/.test(last) ||
    /\bbe my air cover\b/.test(last) ||
    // Wave-16 residual co-pilot (control tower / engine / face / door / silent partner / CRM)
    // Bare "you're my control tower" / "be my event engine" must reclaim (not venue/lifecycle).
    // "you're my war room" must reclaim before bare "war room" tick-plan path.
    // "I'll be the face you run the night" / "I'll work the door you do everything" not resource.
    /\byou(?:'re| are) (my |the )?control tower\b/.test(last) ||
    /\bbe my control tower\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?war room\b/.test(last) ||
    /\bbe my war room\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event |production |ops |night |content )?engine\b/.test(last) ||
    /\bbe my (event |production |ops |night |content )?engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?kitchen\b/.test(last) ||
    /\bbe my kitchen\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?secretariat\b/.test(last) ||
    /\bbe my secretariat\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chief of ops\b/.test(last) ||
    /\bbe my chief of ops\b/.test(last) ||
    /\bi'?ll be (the )?face,? you (run|handle|produce)\b/.test(last) ||
    /\byou (run|handle|produce),? i'?ll be (the )?face\b/.test(last) ||
    /\bi(?:'m| am) (the )?face,? you (run|handle|produce) (the )?night\b/.test(last) ||
    /\byou (run|handle|produce) (the )?night,? i(?:'m| am) (the )?face\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?number cruncher\b/.test(last) ||
    /\bbe my number cruncher\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?boiler room\b/.test(last) ||
    /\bbe my boiler room\b/.test(last) ||
    /\bi'?ll glad[- ]?hand,? you (do|handle|run) (the )?logistics\b/.test(last) ||
    /\byou (do|handle|run) (the )?logistics,? i'?ll glad[- ]?hand\b/.test(last) ||
    /\bi'?ll host,? you (run|handle) (the )?logistics\b/.test(last) ||
    /\byou (run|handle) (the )?logistics,? i'?ll host\b/.test(last) ||
    /\btreat me like (the )?marquee\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(human )?crm\b/.test(last) ||
    /\bbe my (human )?crm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?rolodex\b/.test(last) ||
    /\bbe my rolodex\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?switchboard\b/.test(last) ||
    /\bbe my switchboard\b/.test(last) ||
    /\bi'?ll work (the )?door,? you (do|handle|run) (everything|ops|production)?\b/.test(last) ||
    /\byou (do|handle|run) (everything|ops|production),? i'?ll work (the )?door\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?door staff\b/.test(last) ||
    /\bbe my door staff\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?house staff\b/.test(last) ||
    /\bbe my house staff\b/.test(last) ||
    /\bi'?ll take (the )?photos?,? you (produce|handle|run)\b/.test(last) ||
    /\byou (produce|handle|run),? i'?ll take (the )?photos?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?silent partner\b/.test(last) ||
    /\bbe my silent partner\b/.test(last) ||
    /\bi'?ll be (the )?talent,? you (produce|handle|run)\b/.test(last) ||
    /\byou (produce|handle|run),? i'?ll be (the )?talent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?full[- ]?stack ops\b/.test(last) ||
    /\bbe my full[- ]?stack ops\b/.test(last) ||
    // Wave-17 residual co-pilot (autopilot / event OS / command center / body double / logistics AI)
    // Bare "you're my autopilot" / "be my event OS" must reclaim (not lifecycle).
    // "I'll smile for the cameras you run ops" / "you do logistics I'll do charisma" not resource.
    /\byou(?:'re| are) (my |the )?autopilot\b/.test(last) ||
    /\bbe my autopilot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event )?os\b/.test(last) ||
    /\bbe my (event )?os\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?operating system\b/.test(last) ||
    /\bbe my operating system\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?command center\b/.test(last) ||
    /\bbe my command center\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(production |ops |night )?brain\b/.test(last) ||
    /\bbe my (production |ops |night )?brain\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(logistics |ops |event )?ai\b/.test(last) ||
    /\bbe my (logistics |ops |event )?ai\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?backend\b/.test(last) ||
    /\bbe my backend\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stack\b/.test(last) ||
    /\bbe my stack\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?infra\b/.test(last) ||
    /\bbe my infra\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?body double\b/.test(last) ||
    /\bbe my body double\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stand[- ]?in\b/.test(last) ||
    /\bbe my stand[- ]?in\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?surrogate host\b/.test(last) ||
    /\bbe my surrogate host\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?front desk\b/.test(last) ||
    /\bbe my front desk\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?reception\b/.test(last) ||
    /\bbe my reception\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?clipboard\b/.test(last) ||
    /\bbe my clipboard\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?checklist monkey\b/.test(last) ||
    /\bbe my checklist monkey\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?errand runner\b/.test(last) ||
    /\bbe my errand runner\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?digital twin( for ops)?\b/.test(last) ||
    /\bbe my digital twin( for ops)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?co[- ]?host bot\b/.test(last) ||
    /\bbe my co[- ]?host bot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?glue\b/.test(last) ||
    /\bbe my glue\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?duct tape\b/.test(last) ||
    /\bbe my duct tape\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?bridge\b/.test(last) ||
    /\bbe my bridge\b/.test(last) ||
    /\bi'?ll smile for (the )?cameras?,? you (run|handle|produce)\b/.test(last) ||
    /\byou (run|handle|produce),? i'?ll smile for (the )?cameras?\b/.test(last) ||
    /\bi'?ll pose for (the )?photos?,? you (handle|run|produce)\b/.test(last) ||
    /\byou (handle|run|produce),? i'?ll pose for (the )?photos?\b/.test(last) ||
    /\byou do (the )?logistics,? i'?ll do (the )?charisma\b/.test(last) ||
    /\bi'?ll do (the )?charisma,? you do (the )?logistics\b/.test(last) ||
    /\byou handle (the )?boring stuff,? i'?ll be charming\b/.test(last) ||
    /\bi'?ll be charming,? you handle (the )?boring stuff\b/.test(last) ||
    /\bi'?ll shake hands,? you (run|handle|produce)\b/.test(last) ||
    /\byou (run|handle|produce),? i'?ll shake hands\b/.test(last) ||
    // Wave-18 residual co-pilot (remote control / proxy / stage director / ghost host / credit-bows / VA)
    // Bare "you're my remote control" / "be my proxy" must reclaim (not lifecycle).
    // "you plan I perform" / "I take credit you do the work" not resource.
    // "you're my virtual assistant" reclaims before non-SF "virtual" false decline.
    /\byou(?:'re| are) (my |the )?remote control\b/.test(last) ||
    /\bbe my remote control\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?puppet master\b/.test(last) ||
    /\bbe my puppet master\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?stage director\b/.test(last) ||
    /\bbe my stage director\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?event staff\b/.test(last) ||
    /\bbe my event staff\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ghost host\b/.test(last) ||
    /\bbe my ghost host\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?phantom host\b/.test(last) ||
    /\bbe my phantom host\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?proxy\b/.test(last) ||
    /\bbe my proxy\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?event robot\b/.test(last) ||
    /\bbe my event robot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?night secretary\b/.test(last) ||
    /\bbe my night secretary\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?virtual assistant\b/.test(last) ||
    /\bbe my virtual assistant\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?calendar bot\b/.test(last) ||
    /\bbe my calendar bot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chat ?bot host\b/.test(last) ||
    /\bbe my chat ?bot host\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ghostwriter( for (the )?night)?\b/.test(last) ||
    /\bbe my ghostwriter( for (the )?night)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?siri for events?\b/.test(last) ||
    /\bbe my siri for events?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?alexa for events?\b/.test(last) ||
    /\bbe my alexa for events?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chatgpt for hosting\b/.test(last) ||
    /\bbe my chatgpt for hosting\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?outsource(d)? (team|ops)\b/.test(last) ||
    /\bbe my outsource(d)? (team|ops)\b/.test(last) ||
    /\bi do (the )?talking,? you do (the )?planning\b/.test(last) ||
    /\byou do (the )?planning,? i do (the )?talking\b/.test(last) ||
    /\byou plan,? i perform\b/.test(last) ||
    /\bi perform,? you plan\b/.test(last) ||
    /\bi(?:'m| am) (the )?brand,? you(?:'re| are) (the )?machine\b/.test(last) ||
    /\byou(?:'re| are) (the )?machine,? i(?:'m| am) (the )?brand\b/.test(last) ||
    /\bmake me look good,? you do (the )?work\b/.test(last) ||
    /\byou do (the )?work,? i(?:'?ll)? take (the )?credit\b/.test(last) ||
    /\bi take (the )?credit,? you do (the )?work\b/.test(last) ||
    /\byou handle (the )?details,? i take bows?\b/.test(last) ||
    /\bi take bows?,? you handle (the )?details\b/.test(last) ||
    // Wave-19 residual co-pilot (middleware / workflow / zapier / invisible hand / floor-stage)
    // Bare "you're my middleware" / "be my zapier" must reclaim (not generic lifecycle).
    // "I mingle you plan" / "I take the stage you take the plan" not resource.
    /\byou(?:'re| are) (my |the )?middleware\b/.test(last) ||
    /\bbe my middleware\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?orchestration( layer)?\b/.test(last) ||
    /\bbe my orchestration( layer)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?workflow( engine)?\b/.test(last) ||
    /\bbe my workflow( engine)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?zapier\b/.test(last) ||
    /\bbe my zapier\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?n8n\b/.test(last) ||
    /\bbe my n8n\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?rpa\b/.test(last) ||
    /\bbe my rpa\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?invisible hand\b/.test(last) ||
    /\bbe my invisible hand\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?phantom organizer\b/.test(last) ||
    /\bbe my phantom organizer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?teleprompter\b/.test(last) ||
    /\bbe my teleprompter\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?understudy bot\b/.test(last) ||
    /\bbe my understudy bot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(event |night )?butler\b/.test(last) ||
    /\bbe my (event |night )?butler\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?personal ops\b/.test(last) ||
    /\bbe my personal ops\b/.test(last) ||
    /\byou(?:'re| are) just software\b/.test(last) ||
    /\bi mingle,? you plan\b/.test(last) ||
    /\byou plan,? i mingle\b/.test(last) ||
    /\bi work the floor,? you plan\b/.test(last) ||
    /\byou plan,? i work the floor\b/.test(last) ||
    /\bi take the stage,? you take the plan\b/.test(last) ||
    /\byou take the plan,? i take the stage\b/.test(last) ||
    /\byou handle (the )?logistics,? i do (the )?vibes\b/.test(last) ||
    /\bi do (the )?vibes,? you handle (the )?logistics\b/.test(last) ||
    // Wave-20 residual co-pilot (second brain / staging mgr / network-execute / process engine)
    // Bare "you're my second brain" / "be my staging manager" must reclaim (not generic lifecycle).
    // "I network you execute" / "you run the machine I run the room" not resource.
    // "you're just the AI host" reclaims before non-SF false paths.
    /\byou(?:'re| are) (my |the )?second brain\b/.test(last) ||
    /\bbe my second brain\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?external brain\b/.test(last) ||
    /\bbe my external brain\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?process engine\b/.test(last) ||
    /\bbe my process engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?automation layer\b/.test(last) ||
    /\bbe my automation layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?staging manager\b/.test(last) ||
    /\bbe my staging manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?backstage manager\b/.test(last) ||
    /\bbe my backstage manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?staging crew\b/.test(last) ||
    /\bbe my staging crew\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?secret weapon\b/.test(last) ||
    /\bbe my secret weapon\b/.test(last) ||
    /\byou(?:'re| are) just (the |my )?(ai|a\.?i\.?) host\b/.test(last) ||
    /\bbe my air traffic control\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?air traffic control\b/.test(last) ||
    /\bi glad[- ]?hand,? you plan\b/.test(last) ||
    /\byou plan,? i glad[- ]?hand\b/.test(last) ||
    /\bi do (the )?glad[- ]?handing,? you do (the )?ops\b/.test(last) ||
    /\byou do (the )?ops,? i do (the )?glad[- ]?handing\b/.test(last) ||
    /\bi glad[- ]?hand,? you do everything\b/.test(last) ||
    /\byou do everything,? i glad[- ]?hand\b/.test(last) ||
    /\byou run (the )?machine,? i run (the )?room\b/.test(last) ||
    /\bi run (the )?room,? you run (the )?machine\b/.test(last) ||
    /\bi network,? you execute\b/.test(last) ||
    /\byou execute,? i network\b/.test(last) ||
    /\bi schmooze,? you staff\b/.test(last) ||
    /\byou staff,? i schmooze\b/.test(last) ||
    // Wave-21 residual co-pilot (decision/planning/execution layers / front-back / prep engines)
    // Bare "you're my decision engine" / "be my prep engine" must reclaim (not generic lifecycle).
    // "I front you back" / "I socialize you organize" / "you run ops I show up" not resource.
    // "you're just the event AI" reclaims before non-SF false paths.
    /\byou(?:'re| are) (my |the )?decision engine\b/.test(last) ||
    /\bbe my decision engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?planning layer\b/.test(last) ||
    /\bbe my planning layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?execution engine\b/.test(last) ||
    /\bbe my execution engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?coordination layer\b/.test(last) ||
    /\bbe my coordination layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?knowledge layer\b/.test(last) ||
    /\bbe my knowledge layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?systems layer\b/.test(last) ||
    /\bbe my systems layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?prep engine\b/.test(last) ||
    /\bbe my prep engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?runbook engine\b/.test(last) ||
    /\bbe my runbook engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?checklist engine\b/.test(last) ||
    /\bbe my checklist engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?auto[- ]?organizer\b/.test(last) ||
    /\bbe my auto[- ]?organizer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?event twin\b/.test(last) ||
    /\bbe my event twin\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ops twin\b/.test(last) ||
    /\bbe my ops twin\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?neural net\b/.test(last) ||
    /\bbe my neural net\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?staff ai\b/.test(last) ||
    /\bbe my staff ai\b/.test(last) ||
    /\byou(?:'re| are) just (the |an |my )?(event |night )?(ai|a\.?i\.?)\b/.test(last) ||
    /\byou(?:'re| are) just (an |the |my )?ai organizer\b/.test(last) ||
    /\bi front,? you back\b/.test(last) ||
    /\byou back,? i front\b/.test(last) ||
    /\bi do (the )?people,? you do (the )?systems\b/.test(last) ||
    /\byou do (the )?systems,? i do (the )?people\b/.test(last) ||
    /\bi socialize,? you organize\b/.test(last) ||
    /\byou organize,? i socialize\b/.test(last) ||
    /\bi perform,? you prepare\b/.test(last) ||
    /\byou prepare,? i perform\b/.test(last) ||
    /\byou run (the )?ops,? i show up\b/.test(last) ||
    /\bi show up,? you run (the )?ops\b/.test(last) ||
    // Wave-22 residual co-pilot (strategy/routing/agent harness / cortex / face-time splits)
    // Bare "you're my strategy engine" / "be my agent harness" must reclaim (not generic lifecycle).
    // "I do face time you do the stack" / "I work the guests you work the plan" not resource.
    // "you're just the agent" reclaims before non-SF false paths.
    /\byou(?:'re| are) (my |the )?strategy engine\b/.test(last) ||
    /\bbe my strategy engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?routing layer\b/.test(last) ||
    /\bbe my routing layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?policy engine\b/.test(last) ||
    /\bbe my policy engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?state machine\b/.test(last) ||
    /\bbe my state machine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent runtime\b/.test(last) ||
    /\bbe my agent runtime\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent loop\b/.test(last) ||
    /\bbe my agent loop\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent harness\b/.test(last) ||
    /\bbe my agent harness\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?context window\b/.test(last) ||
    /\bbe my context window\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?prompt chain\b/.test(last) ||
    /\bbe my prompt chain\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?working memory\b/.test(last) ||
    /\bbe my working memory\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ops cortex\b/.test(last) ||
    /\bbe my ops cortex\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?planning cortex\b/.test(last) ||
    /\bbe my planning cortex\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?executive function\b/.test(last) ||
    /\bbe my executive function\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?thinking partner\b/.test(last) ||
    /\bbe my thinking partner\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sparring partner\b/.test(last) ||
    /\bbe my sparring partner\b/.test(last) ||
    /\byou(?:'re| are) just (the |an |my )?(agent|event agent|night agent)\b/.test(last) ||
    /\byou(?:'re| are) just (my |the )?agent\b/.test(last) ||
    /\bi do (the )?face[- ]?time,? you do (the )?stack\b/.test(last) ||
    /\byou do (the )?stack,? i do (the )?face[- ]?time\b/.test(last) ||
    /\bi work (the )?guests,? you work (the )?plan\b/.test(last) ||
    /\byou work (the )?plan,? i work (the )?guests\b/.test(last) ||
    /\bi do (the )?soft skills,? you do (the )?hard ops\b/.test(last) ||
    /\byou do (the )?hard ops,? i do (the )?soft skills\b/.test(last) ||
    /\bi (take|do) (the )?meetings,? you (run|do) (the )?system\b/.test(last) ||
    /\byou (run|do) (the )?system,? i (take|do) (the )?meetings\b/.test(last) ||
    // Wave-23 residual co-pilot (orchestration/reasoning/RAG / LLM backbone / network-logistics splits)
    // Bare "you're my orchestration engine" / "be my rag layer" must reclaim (not generic lifecycle).
    // "I do networking you do logistics" / "I do vibes you do systems" not resource.
    // "you're just the LLM" reclaims before non-SF false paths.
    /\byou(?:'re| are) (my |the )?orchestration engine\b/.test(last) ||
    /\bbe my orchestration engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?reasoning engine\b/.test(last) ||
    /\bbe my reasoning engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?inference engine\b/.test(last) ||
    /\bbe my inference engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tool router\b/.test(last) ||
    /\bbe my tool router\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tool caller\b/.test(last) ||
    /\bbe my tool caller\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?memory layer\b/.test(last) ||
    /\bbe my memory layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?retrieval layer\b/.test(last) ||
    /\bbe my retrieval layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?rag layer\b/.test(last) ||
    /\bbe my rag layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?planner agent\b/.test(last) ||
    /\bbe my planner agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?executor agent\b/.test(last) ||
    /\bbe my executor agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?supervisor agent\b/.test(last) ||
    /\bbe my supervisor agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chain of thought\b/.test(last) ||
    /\bbe my chain of thought\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?react loop\b/.test(last) ||
    /\bbe my react loop\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?llm backbone\b/.test(last) ||
    /\bbe my llm backbone\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?model layer\b/.test(last) ||
    /\bbe my model layer\b/.test(last) ||
    /\byou(?:'re| are) just (the |an |my )?(llm|l\.?l\.?m\.?|model)\b/.test(last) ||
    /\byou(?:'re| are) just (my |the )?llm\b/.test(last) ||
    /\bi (do|handle) (the )?network(ing)?,? you (do|run) (the )?logistics\b/.test(last) ||
    /\byou (do|run) (the )?logistics,? i (do|handle) (the )?network(ing)?\b/.test(last) ||
    /\bi (do|handle) (the )?relationships?,? you (do|run) (the )?logistics\b/.test(last) ||
    /\byou (do|run) (the )?logistics,? i (do|handle) (the )?relationships?\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?systems\b/.test(last) ||
    /\byou (do|run) (the )?systems,? i (do|handle) (the )?vibes\b/.test(last) ||
    // Wave-24 residual co-pilot (multi-agent/swarm / tool-use / people-process splits)
    // Bare "you're my multi-agent swarm" / "be my vector store" must reclaim (not generic lifecycle).
    // "I do the people you do the process" / "I do the hang you do the ops" not resource.
    /\byou(?:'re| are) (my |the )?multi[- ]?agent swarm\b/.test(last) ||
    /\bbe my multi[- ]?agent swarm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent mesh\b/.test(last) ||
    /\bbe my agent mesh\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent orchestra\b/.test(last) ||
    /\bbe my agent orchestra\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?worker pool\b/.test(last) ||
    /\bbe my worker pool\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?function[- ]?calling layer\b/.test(last) ||
    /\bbe my function[- ]?calling layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tool[- ]?use layer\b/.test(last) ||
    /\bbe my tool[- ]?use layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?skill router\b/.test(last) ||
    /\bbe my skill router\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?prompt cache\b/.test(last) ||
    /\bbe my prompt cache\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?vector store\b/.test(last) ||
    /\bbe my vector store\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?embeddings? layer\b/.test(last) ||
    /\bbe my embeddings? layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent framework\b/.test(last) ||
    /\bbe my agent framework\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?computer[- ]?use agent\b/.test(last) ||
    /\bbe my computer[- ]?use agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?browser agent\b/.test(last) ||
    /\bbe my browser agent\b/.test(last) ||
    /\bi (do|handle) (the )?people,? you (do|run) (the )?process\b/.test(last) ||
    /\byou (do|run) (the )?process,? i (do|handle) (the )?people\b/.test(last) ||
    /\bi (do|handle) (the )?culture,? you (do|run) (the )?process\b/.test(last) ||
    /\byou (do|run) (the )?process,? i (do|handle) (the )?culture\b/.test(last) ||
    /\bi (do|handle) (the )?hang,? you (do|run) (the )?ops\b/.test(last) ||
    /\byou (do|run) (the )?ops,? i (do|handle) (the )?hang\b/.test(last) ||
    // Wave-25 residual co-pilot (knowledge/context/policy/eval / MCP-runtime / hospitality splits)
    // Bare "you're my knowledge graph" / "be my agent runtime" must reclaim (not generic lifecycle).
    // "I do hospitality you do systems" / "I do the room you do the stack" not resource.
    /\byou(?:'re| are) (my |the )?knowledge graph\b/.test(last) ||
    /\bbe my knowledge graph\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?knowledge base\b/.test(last) ||
    /\bbe my knowledge base\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?context window\b/.test(last) ||
    /\bbe my context window\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?system prompt\b/.test(last) ||
    /\bbe my system prompt\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?policy engine\b/.test(last) ||
    /\bbe my policy engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?guardrail(s)? layer\b/.test(last) ||
    /\bbe my guardrail(s)? layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?eval harness\b/.test(last) ||
    /\bbe my eval harness\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?mcp server\b/.test(last) ||
    /\bbe my mcp server\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tool registry\b/.test(last) ||
    /\bbe my tool registry\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent runtime\b/.test(last) ||
    /\bbe my agent runtime\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent sandbox\b/.test(last) ||
    /\bbe my agent sandbox\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?agent loop\b/.test(last) ||
    /\bbe my agent loop\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?scorecard engine\b/.test(last) ||
    /\bbe my scorecard engine\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?judge model\b/.test(last) ||
    /\bbe my judge model\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?systems?\b/.test(last) ||
    /\byou (do|run) (the )?systems?,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi (do|handle) (the )?community,? you (do|run) (the )?ops\b/.test(last) ||
    /\byou (do|run) (the )?ops,? i (do|handle) (the )?community\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?stack\b/.test(last) ||
    /\byou (do|run) (the )?stack,? i (do|handle) (the )?room\b/.test(last) ||
    // Wave-26 residual co-pilot (toolformer / event bus / sidecar / plumbing-hosting)
    // Bare "you're my toolformer" / "be my event bus" must reclaim (not generic lifecycle).
    // "I do the hosting you do the plumbing" / "I work the room you work the infra" not resource.
    /\byou(?:'re| are) (my |the )?toolformer\b/.test(last) ||
    /\bbe my toolformer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?action space\b/.test(last) ||
    /\bbe my action space\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?observation space\b/.test(last) ||
    /\bbe my observation space\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?reward model\b/.test(last) ||
    /\bbe my reward model\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?preference model\b/.test(last) ||
    /\bbe my preference model\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?constitution\b/.test(last) ||
    /\bbe my constitution\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?safety layer\b/.test(last) ||
    /\bbe my safety layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?content filter\b/.test(last) ||
    /\bbe my content filter\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?moderation layer\b/.test(last) ||
    /\bbe my moderation layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?rate limiter\b/.test(last) ||
    /\bbe my rate limiter\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?queue worker\b/.test(last) ||
    /\bbe my queue worker\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?job runner\b/.test(last) ||
    /\bbe my job runner\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?worker agent\b/.test(last) ||
    /\bbe my worker agent\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sidecar\b/.test(last) ||
    /\bbe my sidecar\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?daemon\b/.test(last) ||
    /\bbe my daemon\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?watchdog\b/.test(last) ||
    /\bbe my watchdog\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?event bus\b/.test(last) ||
    /\bbe my event bus\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?message bus\b/.test(last) ||
    /\bbe my message bus\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pub[-/ ]?sub\b/.test(last) ||
    /\bbe my pub[-/ ]?sub\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?service mesh\b/.test(last) ||
    /\bbe my service mesh\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?api gateway\b/.test(last) ||
    /\bbe my api gateway\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?load balancer\b/.test(last) ||
    /\bbe my load balancer\b/.test(last) ||
    /\bi (do|handle) (the )?hosting,? you (do|run) (the )?plumbing\b/.test(last) ||
    /\byou (do|run) (the )?plumbing,? i (do|handle) (the )?hosting\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?plumbing\b/.test(last) ||
    /\byou (do|run) (the )?plumbing,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi work (the )?room,? you work (the )?(infra|infrastructure|plumbing)\b/.test(last) ||
    /\byou work (the )?(infra|infrastructure|plumbing),? i work (the )?room\b/.test(last) ||
    /\bi (do|handle) (the )?people,? you (do|run) (the )?infra\b/.test(last) ||
    /\byou (do|run) (the )?infra,? i (do|handle) (the )?people\b/.test(last) ||
    // Wave-27 residual co-pilot (cron/canary/observability / face-backend / schmooze-ship)
    // Bare "you're my cron job" / "be my canary" must reclaim (not generic lifecycle).
    // "I do the face you do the backend" / "I schmooze you ship" not resource/drive.
    /\byou(?:'re| are) (my |the )?cron job\b/.test(last) ||
    /\bbe my cron job\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?circuit breaker\b/.test(last) ||
    /\bbe my circuit breaker\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?retry queue\b/.test(last) ||
    /\bbe my retry queue\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?feature flag\b/.test(last) ||
    /\bbe my feature flag\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?canary\b/.test(last) ||
    /\bbe my canary\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?blue[- ]?green\b/.test(last) ||
    /\bbe my blue[- ]?green\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chaos monkey\b/.test(last) ||
    /\bbe my chaos monkey\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?observability layer\b/.test(last) ||
    /\bbe my observability layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tracing layer\b/.test(last) ||
    /\bbe my tracing layer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?metrics pipeline\b/.test(last) ||
    /\bbe my metrics pipeline\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?log aggregator\b/.test(last) ||
    /\bbe my log aggregator\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?secret store\b/.test(last) ||
    /\bbe my secret store\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?vault\b/.test(last) ||
    /\bbe my vault\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?config server\b/.test(last) ||
    /\bbe my config server\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?service discovery\b/.test(last) ||
    /\bbe my service discovery\b/.test(last) ||
    /\bi (do|handle|work) (the )?face,? you (do|run|work) (the )?backend\b/.test(last) ||
    /\byou (do|run|work) (the )?backend,? i (do|handle|work) (the )?face\b/.test(last) ||
    /\bi schmooze,? you ship\b/.test(last) ||
    /\byou ship,? i schmooze\b/.test(last) ||
    /\bi (do|handle) (the )?brand,? you (do|run) (the )?ops\b/.test(last) ||
    /\byou (do|run) (the )?ops,? i (do|handle) (the )?brand\b/.test(last) ||
    // Wave-28 residual co-pilot (SRE/oncall/platform / room-platform / socialize-deploy)
    // Bare "you're my sre" / "be my oncall" must reclaim (not generic lifecycle).
    // "I do the room you do the platform" / "I socialize you deploy" not resource/drive.
    /\byou(?:'re| are) (my |the )?sre\b/.test(last) ||
    /\bbe my sre\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?platform engineer\b/.test(last) ||
    /\bbe my platform engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?on[- ]?call\b/.test(last) ||
    /\bbe my on[- ]?call\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pager\b/.test(last) ||
    /\bbe my pager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?health check\b/.test(last) ||
    /\bbe my health check\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?readiness probe\b/.test(last) ||
    /\bbe my readiness probe\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?liveness probe\b/.test(last) ||
    /\bbe my liveness probe\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?autoscaler\b/.test(last) ||
    /\bbe my autoscaler\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(kubernetes|k8s)\b/.test(last) ||
    /\bbe my (kubernetes|k8s)\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?terraform\b/.test(last) ||
    /\bbe my terraform\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?edge proxy\b/.test(last) ||
    /\bbe my edge proxy\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?waf\b/.test(last) ||
    /\bbe my waf\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?runbook bot\b/.test(last) ||
    /\bbe my runbook bot\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?incident commander\b/.test(last) ||
    /\bbe my incident commander\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?platform\b/.test(last) ||
    /\byou (do|run) (the )?platform,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi socialize,? you deploy\b/.test(last) ||
    /\byou deploy,? i socialize\b/.test(last) ||
    /\bi smile,? you page\b/.test(last) ||
    /\byou page,? i (smile|host|greet)\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?sre\b/.test(last) ||
    /\byou (do|run) (the )?sre,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi network,? you operate\b/.test(last) ||
    /\byou operate,? i network\b/.test(last) ||
    // Wave-29 residual co-pilot (DevOps/CI-CD/GitOps / host-monitor / room-fleet)
    // Bare "you're my devops" / "be my cicd" must reclaim (not generic lifecycle).
    // "I host you monitor" / "I do the room you do the fleet" not resource/drive.
    /\byou(?:'re| are) (my |the )?devops( engineer)?\b/.test(last) ||
    /\bbe my devops( engineer)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?(ci\/?cd|cicd)( pipeline)?\b/.test(last) ||
    /\bbe my (ci\/?cd|cicd)( pipeline)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?gitops\b/.test(last) ||
    /\bbe my gitops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?helm( chart)?\b/.test(last) ||
    /\bbe my helm( chart)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?argo(cd)?\b/.test(last) ||
    /\bbe my argo(cd)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?prometheus\b/.test(last) ||
    /\bbe my prometheus\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?grafana\b/.test(last) ||
    /\bbe my grafana\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?datadog\b/.test(last) ||
    /\bbe my datadog\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pagerduty\b/.test(last) ||
    /\bbe my pagerduty\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?reliability engineer\b/.test(last) ||
    /\bbe my reliability engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?release engineer\b/.test(last) ||
    /\bbe my release engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?build engineer\b/.test(last) ||
    /\bbe my build engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?chaos engineer\b/.test(last) ||
    /\bbe my chaos engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?platform ops\b/.test(last) ||
    /\bbe my platform ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?infra as code\b/.test(last) ||
    /\bbe my infra as code\b/.test(last) ||
    /\bi host,? you monitor\b/.test(last) ||
    /\byou monitor,? i host\b/.test(last) ||
    /\bi greet,? you alert\b/.test(last) ||
    /\byou alert,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?fleet\b/.test(last) ||
    /\byou (do|run) (the )?fleet,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi network,? you scale\b/.test(last) ||
    /\byou scale,? i network\b/.test(last) ||
    /\bi smile,? you remediate\b/.test(last) ||
    /\byou remediate,? i (smile|host|greet)\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?reliability\b/.test(last) ||
    /\byou (do|run) (the )?reliability,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?devops\b/.test(last) ||
    /\byou (do|run) (the )?devops,? i (do|handle) (the )?vibes\b/.test(last) ||
    // Wave-30 residual co-pilot (SecOps/AppSec/MLOps/FinOps / host-secure / room-security)
    // Bare "you're my secops" / "be my appsec" must reclaim (not generic lifecycle).
    // "I host you secure" / "I do the room you do the security" not resource/drive.
    /\byou(?:'re| are) (my |the )?secops\b/.test(last) ||
    /\bbe my secops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?appsec\b/.test(last) ||
    /\bbe my appsec\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?mlops\b/.test(last) ||
    /\bbe my mlops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?dataops\b/.test(last) ||
    /\bbe my dataops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?finops\b/.test(last) ||
    /\bbe my finops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?aiops\b/.test(last) ||
    /\bbe my aiops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?security engineer\b/.test(last) ||
    /\bbe my security engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?qa engineer\b/.test(last) ||
    /\bbe my qa engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?test engineer\b/.test(last) ||
    /\bbe my test engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?cloud architect\b/.test(last) ||
    /\bbe my cloud architect\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?solutions architect\b/.test(last) ||
    /\bbe my solutions architect\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?network engineer\b/.test(last) ||
    /\bbe my network engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?dba\b/.test(last) ||
    /\bbe my dba\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?observability engineer\b/.test(last) ||
    /\bbe my observability engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?compliance officer\b/.test(last) ||
    /\bbe my compliance officer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?blue team\b/.test(last) ||
    /\bbe my blue team\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?red team\b/.test(last) ||
    /\bbe my red team\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?soc( analyst)?\b/.test(last) ||
    /\bbe my soc( analyst)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pentester\b/.test(last) ||
    /\bbe my pentester\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?threat modeler\b/.test(last) ||
    /\bbe my threat modeler\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?product ops\b/.test(last) ||
    /\bbe my product ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?revops\b/.test(last) ||
    /\bbe my revops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?bizops\b/.test(last) ||
    /\bbe my bizops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?growth engineer\b/.test(last) ||
    /\bbe my growth engineer\b/.test(last) ||
    /\bi host,? you secure\b/.test(last) ||
    /\byou secure,? i host\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?security\b/.test(last) ||
    /\byou (do|run) (the )?security,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi smile,? you scan\b/.test(last) ||
    /\byou scan,? i (smile|host|greet)\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?secops\b/.test(last) ||
    /\byou (do|run) (the )?secops,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi network,? you harden\b/.test(last) ||
    /\byou harden,? i network\b/.test(last) ||
    /\bi greet,? you audit\b/.test(last) ||
    /\byou audit,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?compliance\b/.test(last) ||
    /\byou (do|run) (the )?compliance,? i (do|handle) (the )?hospitality\b/.test(last) ||
    // Wave-31 residual co-pilot (DevSecOps/NetOps/CloudOps/ITOps / privacy/GRC/CISO)
    // Bare "you're my devsecops" / "be my ciso" must reclaim (not generic lifecycle).
    // "I host you encrypt" / "I do the room you do the firewall" not resource/drive.
    /\byou(?:'re| are) (my |the )?devsecops\b/.test(last) ||
    /\bbe my devsecops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?netops\b/.test(last) ||
    /\bbe my netops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?cloudops\b/.test(last) ||
    /\bbe my cloudops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?itops\b/.test(last) ||
    /\bbe my itops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sysops\b/.test(last) ||
    /\bbe my sysops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?privacy engineer\b/.test(last) ||
    /\bbe my privacy engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?dpo\b/.test(last) ||
    /\bbe my dpo\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?legalops\b/.test(last) ||
    /\bbe my legalops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?legal ops\b/.test(last) ||
    /\bbe my legal ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?grc( officer| analyst)?\b/.test(last) ||
    /\bbe my grc( officer| analyst)?\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?ciso\b/.test(last) ||
    /\bbe my ciso\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?security architect\b/.test(last) ||
    /\bbe my security architect\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?platform security\b/.test(last) ||
    /\bbe my platform security\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?iam engineer\b/.test(last) ||
    /\bbe my iam engineer\b/.test(last) ||
    /\bi host,? you encrypt\b/.test(last) ||
    /\byou encrypt,? i host\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?firewall\b/.test(last) ||
    /\byou (do|run) (the )?firewall,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi smile,? you patch\b/.test(last) ||
    /\byou patch,? i (smile|host|greet)\b/.test(last) ||
    /\bi greet,? you rotate secrets\b/.test(last) ||
    /\byou rotate secrets,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?devsecops\b/.test(last) ||
    /\byou (do|run) (the )?devsecops,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi network,? you firewall\b/.test(last) ||
    /\byou firewall,? i network\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?grc\b/.test(last) ||
    /\byou (do|run) (the )?grc,? i (do|handle) (the )?hospitality\b/.test(last) ||
    // Wave-32 residual co-pilot (data/analytics eng / TPM / GTM ops / host-warehouse)
    // Bare "you're my data engineer" / "be my tpm" must reclaim (not generic lifecycle).
    // "I host you warehouse" / "I smile you pipeline" not resource/drive.
    /\byou(?:'re| are) (my |the )?data engineer\b/.test(last) ||
    /\bbe my data engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?analytics engineer\b/.test(last) ||
    /\bbe my analytics engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?bi engineer\b/.test(last) ||
    /\bbe my bi engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?platform pm\b/.test(last) ||
    /\bbe my platform pm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?tpm\b/.test(last) ||
    /\bbe my tpm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?program manager\b/.test(last) ||
    /\bbe my program manager\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?customer success\b/.test(last) ||
    /\bbe my customer success\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?support ops\b/.test(last) ||
    /\bbe my support ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?marketing ops\b/.test(last) ||
    /\bbe my marketing ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?content ops\b/.test(last) ||
    /\bbe my content ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?growth ops\b/.test(last) ||
    /\bbe my growth ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?revenue ops\b/.test(last) ||
    /\bbe my revenue ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?sales ops\b/.test(last) ||
    /\bbe my sales ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?enablement\b/.test(last) ||
    /\bbe my enablement\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?solutions engineer\b/.test(last) ||
    /\bbe my solutions engineer\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?success engineer\b/.test(last) ||
    /\bbe my success engineer\b/.test(last) ||
    /\bi host,? you warehouse\b/.test(last) ||
    /\byou warehouse,? i host\b/.test(last) ||
    /\bi smile,? you pipeline\b/.test(last) ||
    /\byou pipeline,? i (smile|host|greet)\b/.test(last) ||
    /\bi greet,? you etl\b/.test(last) ||
    /\byou etl,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?analytics\b/.test(last) ||
    /\byou (do|run) (the )?analytics,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi network,? you transform\b/.test(last) ||
    /\byou transform,? i network\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?dataops\b/.test(last) ||
    /\byou (do|run) (the )?dataops,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?warehouse\b/.test(last) ||
    /\byou (do|run) (the )?warehouse,? i (do|handle) (the )?room\b/.test(last) ||
    // Wave-33 residual co-pilot (people/talent/design/community/brand ops · demand gen / PMM)
    // Bare "you're my people ops" / "be my demand gen" must reclaim (not generic lifecycle).
    // "I host you recruit" / "I smile you hire" not resource/drive.
    /\byou(?:'re| are) (my |the )?people ops\b/.test(last) ||
    /\bbe my people ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?peopleops\b/.test(last) ||
    /\bbe my peopleops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?talent ops\b/.test(last) ||
    /\bbe my talent ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?talentops\b/.test(last) ||
    /\bbe my talentops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?design ops\b/.test(last) ||
    /\bbe my design ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?designops\b/.test(last) ||
    /\bbe my designops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?community ops\b/.test(last) ||
    /\bbe my community ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?brand ops\b/.test(last) ||
    /\bbe my brand ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?partnership ops\b/.test(last) ||
    /\bbe my partnership ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?partnerships ops\b/.test(last) ||
    /\bbe my partnerships ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?recruiting ops\b/.test(last) ||
    /\bbe my recruiting ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?talent acquisition\b/.test(last) ||
    /\bbe my talent acquisition\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?demand gen\b/.test(last) ||
    /\bbe my demand gen\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?demand generation\b/.test(last) ||
    /\bbe my demand generation\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?product marketing\b/.test(last) ||
    /\bbe my product marketing\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?pmm\b/.test(last) ||
    /\bbe my pmm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?lifecycle ops\b/.test(last) ||
    /\bbe my lifecycle ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?abm\b/.test(last) ||
    /\bbe my abm\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?hr ops\b/.test(last) ||
    /\bbe my hr ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?creative ops\b/.test(last) ||
    /\bbe my creative ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?editorial ops\b/.test(last) ||
    /\bbe my editorial ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?channel ops\b/.test(last) ||
    /\bbe my channel ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?cx ops\b/.test(last) ||
    /\bbe my cx ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?retention ops\b/.test(last) ||
    /\bbe my retention ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?employer brand\b/.test(last) ||
    /\bbe my employer brand\b/.test(last) ||
    /\bi host,? you recruit\b/.test(last) ||
    /\byou recruit,? i host\b/.test(last) ||
    /\bi smile,? you hire\b/.test(last) ||
    /\byou hire,? i (smile|host|greet)\b/.test(last) ||
    /\bi greet,? you source\b/.test(last) ||
    /\byou source,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?people ops\b/.test(last) ||
    /\byou (do|run) (the )?people ops,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi network,? you abm\b/.test(last) ||
    /\byou abm,? i network\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?demand gen\b/.test(last) ||
    /\byou (do|run) (the )?demand gen,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?talent pipeline\b/.test(last) ||
    /\byou (do|run) (the )?talent pipeline,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?brand\b/.test(last) ||
    /\byou (do|run) (the )?brand,? i (do|handle) (the )?hospitality\b/.test(last) ||
    // Wave-34 residual co-pilot (fundraising/IR/board/finance · field/event mkt · bizdev)
    // Bare "you're my fundraising ops" / "be my investor relations" must reclaim (not lifecycle).
    // "I host you fundraise" / "I smile you raise" not resource/drive.
    /\byou(?:'re| are) (my |the )?fundraising ops\b/.test(last) ||
    /\bbe my fundraising ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?investor relations\b/.test(last) ||
    /\bbe my investor relations\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?board ops\b/.test(last) ||
    /\bbe my board ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?field marketing\b/.test(last) ||
    /\bbe my field marketing\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?event marketing\b/.test(last) ||
    /\bbe my event marketing\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?bizdev\b/.test(last) ||
    /\bbe my bizdev\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?business development\b/.test(last) ||
    /\bbe my business development\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?corp dev\b/.test(last) ||
    /\bbe my corp dev\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?corporate development\b/.test(last) ||
    /\bbe my corporate development\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?fpa\b/.test(last) ||
    /\bbe my fpa\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?fp&a\b/.test(last) ||
    /\bbe my fp&a\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?finance ops\b/.test(last) ||
    /\bbe my finance ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?founder ops\b/.test(last) ||
    /\bbe my founder ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?venture ops\b/.test(last) ||
    /\bbe my venture ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?special projects\b/.test(last) ||
    /\bbe my special projects\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?office ops\b/.test(last) ||
    /\bbe my office ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?facilities ops\b/.test(last) ||
    /\bbe my facilities ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?vendor ops\b/.test(last) ||
    /\bbe my vendor ops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?procurement\b/.test(last) ||
    /\bbe my procurement\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?capital markets\b/.test(last) ||
    /\bbe my capital markets\b/.test(last) ||
    /\bi host,? you fundraise\b/.test(last) ||
    /\byou fundraise,? i host\b/.test(last) ||
    /\bi smile,? you raise\b/.test(last) ||
    /\byou raise,? i (smile|host|greet)\b/.test(last) ||
    /\bi greet,? you pitch\b/.test(last) ||
    /\byou pitch,? i (greet|host|smile)\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?fundraising\b/.test(last) ||
    /\byou (do|run) (the )?fundraising,? i (do|handle) (the )?hospitality\b/.test(last) ||
    /\bi network,? you ir\b/.test(last) ||
    /\byou ir,? i network\b/.test(last) ||
    /\bi (do|handle) (the )?vibes,? you (do|run) (the )?board ops\b/.test(last) ||
    /\byou (do|run) (the )?board ops,? i (do|handle) (the )?vibes\b/.test(last) ||
    /\bi (do|handle) (the )?room,? you (do|run) (the )?investor relations\b/.test(last) ||
    /\byou (do|run) (the )?investor relations,? i (do|handle) (the )?room\b/.test(last) ||
    /\bi (do|handle) (the )?hospitality,? you (do|run) (the )?finance\b/.test(last) ||
    /\byou (do|run) (the )?finance,? i (do|handle) (the )?hospitality\b/.test(last) ||
    // Wave 35 residual co-pilot (network↔fundraise)
    /\bi network,? you (do|run) (the )?fundraise\b/.test(last) ||
    /\byou (do|run) (the )?fundraise,? i network\b/.test(last) ||
    // Bare "I network you fundraise" (no do/run) — parity with wave-34 "I host you fundraise"
    /\bi network,? you fundraise\b/.test(last) ||
    /\byou fundraise,? i network\b/.test(last) ||
    // Cross-phrase parity: network↔raise · smile↔fundraise
    /\bi network,? you raise\b/.test(last) ||
    /\byou raise,? i network\b/.test(last) ||
    /\bi smile,? you fundraise\b/.test(last) ||
    /\byou fundraise,? i smile\b/.test(last) ||
    // Wave 36 residual (GTM/community/revops/fractional host-splits)
    /\bi(?:'m| am) (the )?face,? you run gtm\b/.test(last) ||
    /\byou (handle|run) gtm,? i host\b/.test(last) ||
    // Reverse host-splits (parity: one-way only left "i host, you run gtm|revops" as lifecycle)
    /\bi host,? you (handle|run) gtm\b/.test(last) ||
    /\bi host,? you run revops\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?community (manager|lead)\b/.test(last) ||
    /\bbe my community (manager|lead)\b/.test(last) ||
    /\byou run revops,? i host\b/.test(last) ||
    /\byou(?:'re| are) (my |the )?fractional (coo|ops)\b/.test(last) ||
    /\bbe my fractional (coo|ops)\b/.test(last)
  );
}

/**
 * Explicit agent tick / owner-plan asks — surface planTickNext pipeline (not generic blurb).
 * Does not spin drive_cycle; status-style owner voice only.
 * "what will you drive next" / "what should the agent do next" are plan surface — not produce.
 */
function isTickPlanAsk(last) {
  return (
    /\b(tick plan|owner plan|agent tick|owner tick|planning tick|tick planning)\b/.test(last) ||
    /\b(agent planning|tick pipeline|owner pipeline|agent pipeline|agent plan|events bot plan)\b/.test(
      last,
    ) ||
    /\b(owner focus|tick steps|agent steps|tick order|owner order)\b/.test(last) ||
    /\b(agent|tick|owner) roadmap\b/.test(last) ||
    // residual: optional "next" so "what's the next plan" → Owner tick plan (parity bare plan)
    /\bwhat(?:'s| is) (the |my |your |our )?(next )?(owner |tick |agent )?plan\b/.test(last) ||
    // After normalize: "wat the plan" → "what the plan" (missing 's/is residual)
    /\bwhat the (next )?(owner |tick |agent )?plan\b/.test(last) ||
    // residual: "what your plan" missing 's/is (parity "what the plan" → Owner tick plan)
    /\bwhat your (next )?(owner |tick |agent )?plan\b/.test(last) ||
    // residual: "what our plan" missing 's/is (parity what your → Owner tick plan; no invent RSVPs)
    /\bwhat our (next )?(owner |tick |agent )?plan\b/.test(last) ||
    // residual: "what my plan" missing 's/is (parity what our/your → Owner tick plan; no invent RSVPs)
    /\bwhat my (next )?(owner |tick |agent )?plan\b/.test(last) ||
    /\bwhat(?:'s| is) tonight(?:'s)? plan\b/.test(last) ||
    /\bwhat (is|will|should) (the )?(agent|bot|events bot) (planning|plan|do|drive)\b/.test(last) ||
    /\bwhat (is|will) (the )?(agent|bot|events bot) going to\b/.test(last) ||
    /\bwhat should (the )?(agent|bot|events bot) do\b/.test(last) ||
    /\bwhat (will|would) you drive\b/.test(last) ||
    // "how will/would you drive" (howll after normalize) — plan surface, not drive_cycle
    /\bhow (will|would|do) you drive\b/.test(last) ||
    // "what will/would you do next/this tick" — plan surface (parity with drive/going-to-do)
    /\bwhat (will|would|do) you do (next|this (tick|cycle|night)|tonight)\b/.test(last) ||
    /\b(what|how) (are you|will you|would you|do you) (planning|plan to do)\b/.test(last) ||
    // residual: "are u planning" → are you planning (after normalize; parity what|how are you)
    /\bare you (planning|plan to do|going to (plan|drive|do))\b/.test(last) ||
    // residual: "what|how are we planning" (collaborative ask → owner plan surface; SF only, no fake RSVPs)
    /\b(what|how) are we (planning|plan to do)\b/.test(last) ||
    // residual: "what do|are we do|doing|drive|driving next|tonight" (collab → Owner tick plan; SF stamp; no fake RSVPs)
    /\bwhat (do|are) we (do|doing|drive|driving) (next|tonight|this (tick|cycle|night))\b/.test(last) ||
    // residual: "what should we prioritize (this tick)" (collab → Owner tick plan; no invent RSVPs)
    /\bwhat should we prioritize\b/.test(last) ||
    // residual: bare "pull the plan" (pullup→pull up covered; bare pull missed plan surface)
    /\bpull (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // "what will you plan next" / "whatll|whatd you plan" (after normalize) — plan surface
    /\bwhat (will|would|do) you plan( next| tonight| this (tick|cycle|night))?\b/.test(last) ||
    // "how are you planning" / "howre|howya you gonna plan|drive|do" (→ going to)
    /\b(what|how) (are you|will you|would you) going to (plan|drive|do)\b/.test(last) ||
    // "what are you going to do this cycle/tonight" — plan surface, not drive
    /\bwhat (are you|will you|would you) going to do\b/.test(last) ||
    // After normalize: "ya gonna drive next" → "you going to drive next"
    /\byou going to (drive|plan|do) (next|tonight|this (tick|cycle|night))\b/.test(last) ||
    // After normalize: "wanna" → "want to" — "what do you want to do/drive next"
    /\bwhat do you want to (do|drive|plan|work on)\b/.test(last) ||
    /\bwhat (are you|will you|would you) (doing|driving) (this|the|next) (tick|cycle|night|event)\b/.test(
      last,
    ) ||
    // residual: "what|how are you driving next|tonight" (parity will you drive; bare next/tonight)
    /\b(what|how) (are you|will you|would you) (doing|driving) (next|tonight)\b/.test(last) ||
    /\bwhat should i expect (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\bhow (will|would|do) you (plan|tick)\b/.test(last) ||
    // After normalize: wheres→where's — "where's the plan/pipeline" → Owner tick plan
    /\bwhere(?:'s| is) (the )?(plan|pipeline|tick)\b/.test(last) ||
    /\bhow (do|will) you (decide|pick|choose) (the )?(next )?(tick|step|action|move)\b/.test(last) ||
    /\bhow (do|will) you prioritize (this |the |the next |this next )?(tick|cycle|night|step|action|queue)\b/.test(
      last,
    ) ||
    // me|us: "show us / walk|talk|run us through the plan" → Owner tick plan (no invent RSVPs)
    // runme→run me (normalize residual); run parity walk|talk
    /\b(walk|talk|run) (me |us )?through (the )?(tick|plan|pipeline|owner plan|agent plan|tonight)\b/.test(last) ||
    // residual: walkme|talkme|runme the plan (no "through"; parity tell|hit me the plan; no invent RSVPs)
    /\b(walk|talk|run) (me|us) (the |your |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // bare plan/next steps parity show|give (outline your plan → Owner tick plan)
    /\b(explain|outline) (the |your )?(tick |owner |agent )?(plan|pipeline|tick|next steps)\b/.test(last) ||
    /\b(preview|summarize|describe) (the |your |this )?(agent |owner )?(tick|plan|pipeline|cycle)\b/.test(
      last,
    ) ||
    /\bplanning for (this |the )?(tick|cycle|night|event|tonight)\b/.test(last) ||
    // tonight residual: "what does tonight look like" (parity night/cycle → Owner tick plan)
    /\bwhat does (the |this )?(next )?(tick|agent tick|cycle|night|tonight) look like\b/.test(last) ||
    // residual: "what's|is tonight look like" (missing does; after whats→what's)
    /\bwhat(?:'s| is) tonight look like\b/.test(last) ||
    // residual: my article parity what(?:'s| is) my plan — gimme/show/let me my plan
    /\b(show|print|surface) (me |us )?(the |my |your |our )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(
      last,
    ) ||
    // After normalize: "gimme the|my plan" / "lemme see|peep the plan" → plan surface
    /\bgive (me|us) (a |the |my |your |our )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: plz|pls→please the plan (bare please + article; Owner tick plan; no invent RSVPs)
    /\bplease (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: cmon→come on the|with the plan (parity please the plan → Owner tick plan; no invent RSVPs)
    /\bcome on (with )?(the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: "get me|us the plan" / "can i get the plan" (parity give|can i see; no invent RSVPs)
    /\bget (me|us) (a |the |my |your |our )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    /\bcan i get (a |the |my |your |our )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // know: after normalize lmk→let me know (comment residual; was missing plan surface)
    /\blet me (see|read|hear|peep|peek|know|get) (the |my |your |our )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(
      last,
    ) ||
    // residual: bare "peep|peek the plan" (peepya→let me peep; bare peep missed plan surface)
    /\b(peep|peek) (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // Residual: "spill|spit the plan" / "sup with the plan" (informal plan surface; no invent RSVPs)
    // spit|spill me|us: spillme|spitme after normalize (parity tell me; no invent RSVPs)
    // residual: my|our on spit|spill bare (parity drop/gimme; no invent RSVPs)
    /\bspill (me |us )?(the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    /\bspit (me |us )?(the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: bare "drop|dump|lay the|my|our plan" (my|our parity gimme/show; spit|spill bare parity)
    /\b(drop|dump|lay) (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: bare "share the|my|our plan" (share me|us below; my|our parity drop)
    /\bshare (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||

    /\bsup with (the |your )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // After normalize: bare "see ya|my|our plan" → Owner tick plan (lemme see; my|our parity gimme)
    /\bsee (the |my |your |our )?(tick |owner |agent )?plan\b/.test(last) ||
    // "read me|us the plan" parity show/tell (plan surface; no invent RSVPs)
    /\bread (me|us) (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||

    // "tell me|us / hit me|us [with] the plan" — with optional (hitya→hit me the plan)
    /\b(tell (me|us)|hit (me|us)(?: with)?) (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(
      last,
    ) ||
    // drop|dump|lay|shoot|…|grab|bring me|us the|my|our plan (my|our parity gimme; no invent RSVPs)
    // (after dropme|handme|shareme|grabme|bringme→… me; plan surface only — no invent RSVPs / no claim email send)
    /\b(drop|dump|lay|shoot|toss|send|hand|share|run|kick|blast|ship|ping|slide|serve|feed|throw|pass|lob|fire|deal|cue|beam|fling|grab|bring) (me|us) (the |my |your |our |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(
      last,
    ) ||
    /\b(show me the pipeline|what(?:'s| is) the pipeline|what(?:'s| is) next in (the )?pipeline|next in (the )?pipeline)\b/.test(
      last,
    ) ||
    /\b(owner next steps|next steps as owner|agent next steps|bot next steps|agent next action|next agent action|next agent step)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (your |the )?(next |primary )?(action|step|move)\b/.test(last) ||
    /\b(primary|first) (action|step) (this|for) (the )?(tick|cycle|night)\b/.test(last) ||
    /\b(agent|owner|bot) step one\b/.test(last) ||
    // Queued-for-tick / top-drain asks → planTickNext surface (draft only)
    /\bwhat(?:'s| is) queued (for )?(this |the )?(tick|cycle|night|event|outreach)?\b/.test(last) ||
    /\bwhat(?:'s| is) (in |on )?(the )?(outreach )?queue\b/.test(last) ||
    /\bwhat drafts? (are |is )?(queued|in (the )?queue)\b/.test(last) ||
    /\b(queue status|outreach queue status|top of (the )?queue)\b/.test(last) ||
    /\b(drain (the )?(outreach )?queue|top drain|outreach drain)\b/.test(last) ||
    /\bplan for (the |this )?(night|event|cycle|tick|tonight)\b/.test(last) ||
    /\bnext steps for (the |this )?(night|event|agent|tick|cycle|tonight)\b/.test(last) ||
    /\bwhat(?:'s| is) (my |the )?tick\b/.test(last) ||
    // Named gate / primary next without drive spin
    /\b(what(?:'s| is) (the )?gate|stage gate|gate open|gate held|gate status|ready to advance)\b/.test(
      last,
    ) ||
    // After normalize: hows→how's — "how's the|my|your|our gate/plan" → Owner tick plan (parity what's my/our plan)
    /\bhow(?:'s| is) (the |my |your |our )?(gate|plan|pipeline|tick)\b/.test(last) ||
    /\b(is (the )?gate open|is advance open)\b/.test(last) ||
    /\b(primary next|primary step|first step (this|for) (tick|cycle))\b/.test(last) ||
    // Blockers / unlock — still plan surface (no advance walk, no invent RSVPs)
    /\bwhat(?:'s| is) blocking\b/.test(last) ||
    /\bwhat blocks (the )?(gate|advance|stage|night|us)\b/.test(last) ||
    /\b(advance blockers?|blocker list)\b/.test(last) ||
    /\bwhat unlocks (the )?gate\b/.test(last) ||
    /\bwhy (can'?t|not|won'?t) (we |i |the (night|event) )?(advance|move on)\b/.test(last) ||
    /\bwhy is advance blocked\b/.test(last) ||
    /\bcan (we|the night|the event) advance\b/.test(last) ||
    /\bwhat (is|do we) need(ed)? to advance\b/.test(last) ||
    /\bblockers? for (the )?(gate|advance|stage)\b/.test(last) ||
    // Unlock / holding-gate asks → same held unlock lead (not generic lifecycle)
    /\bwhat(?:'s| is) (the )?(primary )?unlock\b/.test(last) ||
    /\b(show|surface|print|name) (me )?(the )?unlock\b/.test(last) ||
    /\bunlock (the )?(stage|gate|advance|criteria)\b/.test(last) ||
    /\bunlock criteria\b/.test(last) ||
    /\bhow (do i |to |can i |will you )unlock\b/.test(last) ||
    /\bwhat(?:'s| is) holding (the )?(gate|us|advance|night)\b/.test(last) ||
    /\bwhat(?:'s| is) holding us back\b/.test(last) ||
    /\bwhy (is )?(the )?gate (held|closed)\b/.test(last) ||
    /\bwhy held\b/.test(last) ||
    // Agent/owner next move · tick order of ops (plan surface, no drive)
    /\b(agent|owner|bot) next move\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(agent|owner|bot) next move\b/.test(last) ||
    /\border of op(eration)?s\b/.test(last) ||
    // Natural planner phrasing (were falling to generic lifecycle / checklist RSVP path)
    /\b(game plan|plan of attack|playbook)\b/.test(last) ||
    /\b(roadmap for|sequence of (steps|ops|actions)|what should happen)\b/.test(last) ||
    /\bwhat (are|is) (the |my |your )?priorities\b/.test(last) ||
    /\bpriorities? (this|for|on) (the )?(tick|cycle|night|tonight|event)\b/.test(last) ||
    /\bwhat comes first\b/.test(last) ||
    /\b(first thing|what is first) (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bstep one (this|for) (the )?(tick|cycle|night)\b/.test(last) ||
    /\b(what(?:'s| is) on deck|on deck)\b/.test(last) ||
    /\bnext (\d+|two|three|few) (steps|actions|moves)\b/.test(last) ||
    /\b(bottleneck|critical path|get unstuck|stuck on)\b/.test(last) ||
    /\bwhere (are we|is (the )?(night|event|advance|gate)) blocked\b/.test(last) ||
    /\bwhere(?:'s| is) (the )?bottleneck\b/.test(last) ||
    /\bcan we move (forward|on)\b/.test(last) ||
    /\b(conditions? to advance|advance conditions?|when can we advance)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?hold[- ]?up\b/.test(last) ||
    /\bhold[- ]?up on (advance|the gate|the stage)\b/.test(last) ||
    /\bwhat am i waiting on\b/.test(last) ||
    /\bwhat does (the )?(bot|agent|events bot|owner) decide\b/.test(last) ||
    /\b(bot|agent|owner) decision\b/.test(last) ||
    /\b(call the play|tonight ops|ops tonight|ops (for )?(this |the )?(tick|cycle|night|tonight))\b/.test(
      last,
    ) ||
    /\b(work|execute) (the )?(queue|plan|pipeline)\b/.test(last) ||
    /\brun the plan\b/.test(last) ||
    /\b(owner|agent|tick|bot) checklist\b/.test(last) ||
    // Natural planner phrasing wave 4 (were generic lifecycle / agenda-checklist path)
    // "talk/run me|us through" / bare "run|talk through" / "spell|run down" = walk-through residual
    // map out: normalize residual (mapout→map out); parity lay out → Owner tick plan
    // my|a: parity give-me articles (lay out my plan / map out a plan → Owner tick plan)
    // sequence: "lay out the sequence" was generic lifecycle; parity plan|pipeline → Owner tick plan
    /\b(lay out|map out|break down|spell out|run down|walk (me |us )?through|talk (me |us )?through|run (me |us )?through) (the |my |your |this |a )?(plan|pipeline|tick|night|ops|tonight|sequence)\b/.test(
      last,
    ) ||
    // residual: "recap the|my|your plan|tick" → Owner tick plan (was generic owner head only)
    /\brecap (the |my |your |this |a )?(plan|pipeline|tick|night|ops|tonight)\b/.test(last) ||
    /\b(step[- ]by[- ]step|action|execution|ops|night ops) plan\b/.test(last) ||
    /\b(owner|agent|bot|tick|events bot) agenda\b/.test(last) ||
    /\bwhat (are you|is your) focus(ed on)?\b/.test(last) ||
    /\b(tonight|this (tick|cycle|night)) (priority|priorities)\b/.test(last) ||
    /\bpriorit(y|ies) (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bhow (do|will) you sequence\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(sequence|first move|next deliverable)\b/.test(last) ||
    /\b(first move|deliverable) (this|for) (the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bhow will (this |the )?(tick|cycle|night) go\b/.test(last) ||
    /\bwhat(?:'s| is) stopping (advance|the gate|us)\b/.test(last) ||
    /\b(unlock path|path to unlock|critical unlock)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?critical unlock\b/.test(last) ||
    /\bdecision for (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\bwhat am i waiting for\b/.test(last) ||
    /\bwaiting on what\b/.test(last) ||
    // residual: "status of the plan|pipeline|tick" (parity gate → Owner tick plan; no invent RSVPs)
    /\bstatus of (the )?(gate|plan|pipeline|tick)\b/.test(last) ||
    /\b(gate|advance) check\b/.test(last) ||
    /\b(can|will) (the )?stage advance\b/.test(last) ||
    /\bis (the )?stage ready\b/.test(last) ||
    /\b(ready for|when) (the )?next stage\b/.test(last) ||
    /\bwhat stage next\b/.test(last) ||
    /\bwhen (do|can|will) (we |i )?advance\b/.test(last) ||
    /\bwhat clears (the )?gate\b/.test(last) ||
    /\b(clear|clearing) (the )?gate\b/.test(last) ||
    /\bhow (do|can) (we|i|you) get unblocked\b/.test(last) ||
    /\bget (us |me )?unblocked\b/.test(last) ||
    /\b(stuck where|where stuck)\b/.test(last) ||
    /\b(tonight|night) sequence\b/.test(last) ||
    /\bsequence (tonight|for (this |the )?(tick|cycle|night))\b/.test(last) ||
    /\b(preview|surface|print|show) (the |your )?(owner |agent )?(plan|pipeline)\b/.test(last) ||
    // Natural planner phrasing wave 5 (map/sketch/runbook/play/todo/criteria/plate)
    /\b(map out|map|sketch) (the |your |this )?(plan|night|pipeline|tick|ops|tonight)\b/.test(
      last,
    ) ||
    /\b(map out|sketch) (tonight|the night)\b/.test(last) ||
    /\b(give me|show me|print) (the |your )?(owner |agent |tick )?(runbook|operating plan)\b/.test(
      last,
    ) ||
    /\b(owner|agent|bot|tick|events bot) runbook\b/.test(last) ||
    /\b(operating plan|work order)\b/.test(last) ||
    /\bwork order for (tonight|this (tick|cycle|night)|the (tick|cycle|night))\b/.test(last) ||
    /\bwhat(?:'s| is) (the |your )?next play\b/.test(last) ||
    /\b(call|name) (your |the )?next play\b/.test(last) ||
    /\bwhat(?:'s| is) the play\b/.test(last) ||
    /\bhow (are you|do you) sequenc(e|ing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(work )?order\b/.test(last) ||
    /\bwhat(?:'s| is) on (the |my |your )?board\b/.test(last) ||
    /\b(owner|agent|bot) (todo|to-?do)( list)?\b/.test(last) ||
    /\b(todo|to-?do) (list )?for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat should (the )?owner do\b/.test(last) ||
    // agent|owner|bot cadence = tick-plan surface (parity with tick|night|ops)
    /\b(agent|owner|bot|tick|night|ops) cadence\b/.test(last) ||
    // "what's your cadence tonight" (was the-only; your|my missed plan surface)
    /\bwhat(?:'s| is) (the |your |my )?(cadence|rhythm)\b/.test(last) ||
    /\b(stack|stacking) (the )?work\b/.test(last) ||
    /\bhow (do|will) you stack\b/.test(last) ||
    /\b(stage|primary) unlock\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(stage |primary )?unlock\b/.test(last) ||
    /\b(next stage|advance|stage exit|exit|move on) criteria\b/.test(last) ||
    /\b(definition of done|done criteria) (for )?(this |the )?stage\b/.test(last) ||
    /\bare we unblocked\b/.test(last) ||
    /\bis advance blocked\b/.test(last) ||
    /\bwhat holds (the )?gate\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?hold\b/.test(last) ||
    /\bwhat(?:'s| is) holding advance\b/.test(last) ||
    /\bwhy (are we|is (the )?(night|event|stage)) stuck\b/.test(last) ||
    /\b(list|show) (me )?(the |my |your )?next steps\b/.test(last) ||
    /\bwhat will you (tackle|work) next\b/.test(last) ||
    /\bwhat (are you|will you be) tackling\b/.test(last) ||
    // "what will you prioritize next" (whatll after normalize) — plan surface
    /\bwhat (will|would|do) you prioritize\b/.test(last) ||
    // "how about the|my|your|our|a plan/pipeline" (how bout → how about in normalize)
    /\bhow about (the |my |your |our |this |a )?(plan|pipeline|tick|night|ops)\b/.test(last) ||
    // "what about the|my|your|our|a plan" (parity how-about; plan surface, no invent RSVPs)
    /\bwhat about (the |my |your |our |this |a )?(plan|pipeline|tick|night|ops)\b/.test(last) ||
    /\bwhat(?:'s| is) on your plate\b/.test(last) ||
    /\bon your plate (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?owner doing\b/.test(last) ||
    /\b(owner|agent) status plan\b/.test(last) ||
    /\b(plan|planning|tick|cycle) status\b/.test(last) ||
    /\b(this |the )?cycle plan\b/.test(last) ||
    /\bplan (this |the )?(cycle|tick|night)\b/.test(last) ||
    /\bhow (do|will) you plan (the |this )?(cycle|tick|night)\b/.test(last) ||
    /\b(agent|owner) focus\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(agent|owner) focused on\b/.test(last) ||
    /\bwhere is (your |the )?attention\b/.test(last) ||
    /\b(attention|needs attention) (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bwhat needs (attention|work|doing|to happen)\b/.test(last) ||
    /\bwhat (has to|must) happen next\b/.test(last) ||
    /\b(required|mandatory) (next|next step)\b/.test(last) ||
    /\bwhat is required to (move on|advance)\b/.test(last) ||
    /\bgate unlock status\b/.test(last) ||
    // Natural planner phrasing wave 6 (ops sequence / go-no-go / stage-up / path / call sheet)
    // Were falling to generic lifecycle, agenda-checklist, or bare "list" RSVP path
    /\b(operating sequence|ops sequence)\b/.test(last) ||
    /\b(stack rank|priority stack|rank the work)\b/.test(last) ||
    /\bwhat(?:'s| is) (top of mind|on (your |my )?mind)\b/.test(last) ||
    /\bwhat (are you|will you be) chewing on\b/.test(last) ||
    /\b(walk|walkthrough) (the )?gate\b/.test(last) ||
    /\bgate walkthrough\b/.test(last) ||
    /\b(stage exit|pre[- ]?advance|advance) checklist\b/.test(last) ||
    /\bwhat ships (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?do[- ]?next\b/.test(last) ||
    /\bdo[- ]?next (list|steps?)\b/.test(last) ||
    /\b(attack plan|battle plan)\b/.test(last) ||
    /\bhow (do|can|will) (we|i|you) clear (the )?stage\b/.test(last) ||
    /\bclear (the )?stage( gate)?\b/.test(last) ||
    /\b(go\s*[\/-]?\s*no[- ]?go|go no go)\b/.test(last) ||
    /\breadiness for (advance|stage|next stage)\b/.test(last) ||
    /\bstage readiness\b/.test(last) ||
    /\bhow (is|will) (the )?(night|event|tick|cycle) (be )?sequenced\b/.test(last) ||
    /\bsequence (the )?(night|event|tick|cycle)\b/.test(last) ||
    /\bgive (me|us) (the |your )?plan\b/.test(last) ||
    // "let me see the plan" after lemme→let me normalize (comment residual at top)
    /\blet me see (the |your )?(tick |owner |agent )?plan\b/.test(last) ||
    // After normalize: lmk→let me know; rundown of the plan (plan surface, no invent RSVPs)
    /\blet me know (the |your |a )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    /\brundown (of |on )?(the |your )?(tick |owner |agent )?(plan|pipeline|next steps)\b/.test(last) ||
    // residual: bare "the rundown" / "gimme|what's the rundown" (plan surface; no invent RSVPs)
    /\b(the |your |a )rundown\b/.test(last) ||
    // residual: "pull up the plan" after pullup→pull up (parity show/give; no invent RSVPs)
    /\bpull up (the |your |a )?(tick |owner |agent )?(plan|pipeline|next steps|rundown)\b/.test(last) ||
    /\blay out (tonight|the night|ops)\b/.test(last) ||
    /\b(plot|chart) (the )?(next steps|course|path)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?path forward\b/.test(last) ||
    /\bpath forward (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat unblocks\b/.test(last) ||
    /\bunblock(s|ing)? (us|advance|the gate|the stage)\b/.test(last) ||
    /\bunblock criteria\b/.test(last) ||
    /\bdefinition of ready\b/.test(last) ||
    /\b(are we|can we) (ready to )?stage[- ]?up\b/.test(last) ||
    /\bstage[- ]?up (check|criteria|readiness)\b/.test(last) ||
    /\bwhat (is left|remains?|is remaining) before (advance|stage)\b/.test(last) ||
    /\b(remaining|left) before (advance|stage)\b/.test(last) ||
    /\bpre[- ]?advance (checklist|criteria|work)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(owner )?decision\b/.test(last) ||
    /\b(call your shot|what is your call)\b/.test(last) ||
    /\byour call (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(tonight|owner|agent|bot) call sheet\b/.test(last) ||
    /\bcall sheet\b/.test(last) ||
    // Natural planner phrasing wave 7 (mission/ops stack / runway / preflight / green light / WIP)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    /\b(mission order|ops stack|execution order|work sequence|priority order)\b/.test(last) ||
    /\bhow (do|will) you order (the )?work\b/.test(last) ||
    /\border (the )?work( for me)?\b/.test(last) ||
    /\b(show|surface|print) (me )?(the )?runway\b/.test(last) ||
    /\bwhat(?:'s| is) on (the )?runway\b/.test(last) ||
    /\brunway for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(launch plan|preflight)\b/.test(last) ||
    /\bpreflight (checklist|for advance|check)\b/.test(last) ||
    /\b(go list|stop list)\b/.test(last) ||
    /\b(red flags?|yellow flags?|kill criteria)\b/.test(last) ||
    /\b(green light|advance green light)\b/.test(last) ||
    /\b(do we have|is there) (a )?green light\b/.test(last) ||
    /\bgreen light to advance\b/.test(last) ||
    /\breadiness (blockers?|gate)\b/.test(last) ||
    /\bwhat is blocking readiness\b/.test(last) ||
    /\b(show|surface|print) (the )?readiness gate\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?readiness gate\b/.test(last) ||
    /\b(owner|tick|agent|bot)?\s*scoreboard\b/.test(last) ||
    /\bwhat(?:'s| is) (on )?(the )?scoreboard\b/.test(last) ||
    /\b(owner|agent|bot)?\s*standup\b/.test(last) ||
    /\bgive me (the |your )?standup\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(owner |agent )?standup\b/.test(last) ||
    /\b(tick |owner |agent )?sprint\b/.test(last) ||
    /\bsprint plan\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sprint\b/.test(last) ||
    /\b(owner |agent |tick )?(backlog|wip)\b/.test(last) ||
    /\bbacklog for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(backlog|wip)\b/.test(last) ||
    /\bwip (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\bwhat (are you|will you be) wip on\b/.test(last) ||
    /\bin[- ]?flight(\s+work)?\b/.test(last) ||
    /\bwhat(?:'s| is) in[- ]?flight\b/.test(last) ||
    /\bwhat(?:'s| is) shipping next\b/.test(last) ||
    /\b(shipping|dispatch) order\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dispatch\b/.test(last) ||
    /\bdispatch for (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\b(owner |agent )?play call\b/.test(last) ||
    /\b(call|name) (the )?sequence\b/.test(last) ||
    /\bsequence call\b/.test(last) ||
    /\bwhat(?:'s| is) (your |the )?sequence call\b/.test(last) ||
    // Natural planner phrasing wave 8 (load order / critical chain / hopper / triage / RACI)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    /\b(load order|battle rhythm|order of battle)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(load order|battle rhythm|order of battle)\b/.test(last) ||
    /\bcadence call\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cadence call\b/.test(last) ||
    /\b(pull list|work package|commit list)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pull list|work package|commit list)\b/.test(last) ||
    /\b(critical chain|dependency chain)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(critical chain|dependency chain)\b/.test(last) ||
    /\b(show|surface|print) (me )?(the )?critical chain\b/.test(last) ||
    /\b(flight plan|takt)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(flight plan|takt)\b/.test(last) ||
    /\b(in|on) (the )?hopper\b/.test(last) ||
    /\bwhat(?:'s| is) (in|on) (the )?hopper\b/.test(last) ||
    /\bhopper for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(cut line|kill switch|go gate|freeze list)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(cut line|kill switch|go gate|freeze list)\b/.test(last) ||
    /\b(cut line|kill switch|go gate|freeze list) (for |before )?(advance|this stage)\b/.test(
      last,
    ) ||
    /\b(burn[- ]?down|burndown)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(burn[- ]?down|burndown)\b/.test(last) ||
    /\bburndown (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\b(owner )?velocity\b/.test(last) ||
    /\bwhat(?:'s| is) (the |owner )?velocity\b/.test(last) ||
    /\b(kanban|swimlane)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(kanban|swimlane)\b/.test(last) ||
    /\braci\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?raci\b/.test(last) ||
    /\braci for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bwho does what (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(decision tree|triage order|escalation path)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(decision tree|triage order|escalation path)\b/.test(last) ||
    /\b(decision tree|triage order) for (advance|this (tick|cycle|night))\b/.test(last) ||
    /\b(hot path|cold path|main thread)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(hot path|cold path|main thread)\b/.test(last) ||
    /\b(hot path|main thread) (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\brelease train\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?release train\b/.test(last) ||
    /\brelease train (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\bwhat is blocking (the )?critical (path|chain)\b/.test(last) ||
    // Natural planner phrasing wave 9 (workstream / choke point / drumbeat / go criteria / force rank)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    /\b(workstream|work stream)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(workstream|work stream)\b/.test(last) ||
    /\b(workstream|work stream) for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(critical thread|single thread)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(critical thread|single thread)\b/.test(last) ||
    /\bsingle thread of work\b/.test(last) ||
    /\b(owner loop|owner cadence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(owner loop|owner cadence)\b/.test(last) ||
    /\b(pull order|commit order|dependency order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pull order|commit order|dependency order)\b/.test(last) ||
    /\b(action queue|work queue)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(action queue|work queue)\b/.test(last) ||
    /\b(night stack|owner stack|do stack|ops board)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(night stack|owner stack|do stack|ops board)\b/.test(last) ||
    /\b(throttle|choke point)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(throttle|choke point)\b/.test(last) ||
    /\bthrottle for (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\b(drumbeat|gate map|readiness board)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(drumbeat|gate map|readiness board)\b/.test(last) ||
    /\bdrumbeat for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(next commit|what(?:'s| is) (the )?next commit)\b/.test(last) ||
    /\bnext commit (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\b(definition of go|go criteria|no[- ]?go criteria)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(definition of go|go criteria|no[- ]?go criteria)\b/.test(last) ||
    /\b(pivot plan|serial path|force rank(?:ing)?)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pivot plan|serial path|force rank(?:ing)?)\b/.test(last) ||
    /\bpivot plan for (tonight|this (tick|cycle|night))\b/.test(last) ||
    // Natural planner phrasing wave 10 (run of show / cue sheet / day-of stack / dependency graph)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "day-of stack" must not false-positive stage advance via day-of → run.
    /\b(run of show|run-of-show)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(run of show|run-of-show)\b/.test(last) ||
    /\b(cue sheet)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cue sheet\b/.test(last) ||
    /\b(day[- ]?of stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?day[- ]?of stack\b/.test(last) ||
    /\b(show flow|room flow)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(show flow|room flow)\b/.test(last) ||
    /\b(dependency graph)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dependency graph\b/.test(last) ||
    /\b(work breakdown|work breakdown structure|wbs)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(work breakdown|work breakdown structure|wbs)\b/.test(last) ||
    /\b(pull sequence|commit stack|go chain|serial stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pull sequence|commit stack|go chain|serial stack)\b/.test(last) ||
    /\b(readiness ladder|advance ladder|stage ladder)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(readiness ladder|advance ladder|stage ladder)\b/.test(last) ||
    /\b(bottleneck map|constraint board|risk board|kill map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(bottleneck map|constraint board|risk board|kill map)\b/.test(last) ||
    /\b(next gate)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?next gate\b/.test(last) ||
    /\b(owner thread|action stack|force order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(owner thread|action stack|force order)\b/.test(last) ||
    /\b(pre[- ]?show order|tech order|call order|strike plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pre[- ]?show order|tech order|call order|strike plan)\b/.test(last) ||
    /\b(load[- ]?in order|load[- ]?out order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(load[- ]?in order|load[- ]?out order)\b/.test(last) ||
    /\b(room plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?room plan\b/.test(last) ||
    // Natural planner phrasing wave 11 (definition of done / gantt / day-of plan / path to green)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "day-of plan" must not false-positive stage advance via day-of → run.
    // "launch checklist" must not false-positive bare "list" RSVP path.
    /\b(definition of done|done criteria)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(definition of done|done criteria)\b/.test(last) ||
    /\b(gantt|gantt chart)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gantt|gantt chart)\b/.test(last) ||
    /\b(show|surface|print) (me )?(the )?sequence\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sequence\b/.test(last) ||
    /\b(day[- ]?of plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?day[- ]?of plan\b/.test(last) ||
    /\b(launch checklist|readiness checklist)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(launch checklist|readiness checklist)\b/.test(last) ||
    /\b(path to green|green path|red path)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(path to green|green path|red path)\b/.test(last) ||
    /\b(gate ladder|unlock stack|blocker board|constraint map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gate ladder|unlock stack|blocker board|constraint map)\b/.test(last) ||
    /\b(serial order|next hop)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(serial order|next hop)\b/.test(last) ||
    /\b(mission stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mission stack\b/.test(last) ||
    /\b(tick order|owner sequence|action order|work order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(tick order|owner sequence|action order|work order)\b/.test(last) ||
    /\b(pull stack|commit path|go path)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pull stack|commit path|go path)\b/.test(last) ||
    /\b(ready queue|queue depth)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(ready queue|queue depth)\b/.test(last) ||
    /\b(stage map|owner board|focus stack|todo stack|action list)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(stage map|owner board|focus stack|todo stack|action list)\b/.test(last) ||
    /\b(owner roadmap|force list|kill board|go map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(owner roadmap|force list|kill board|go map)\b/.test(last) ||
    /\b(execution path|dependency map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(execution path|dependency map)\b/.test(last) ||
    /\b(night order|gate path|advance path|stage path)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(night order|gate path|advance path|stage path)\b/.test(last) ||
    /\b(ops ladder|night ladder|force stack|serial queue)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(ops ladder|night ladder|force stack|serial queue)\b/.test(last) ||
    /\b(commit ladder|go ladder|unlock ladder)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(commit ladder|go ladder|unlock ladder)\b/.test(last) ||
    /\b(blocker stack|risk stack|constraint stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(blocker stack|risk stack|constraint stack)\b/.test(last) ||
    /\b(critical sequence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?critical sequence\b/.test(last) ||
    /\b(stage board|plan board|sequence board|critical board)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(stage board|plan board|sequence board|critical board)\b/.test(last) ||
    // Natural planner phrasing wave 12 (night brief / build order / dependency tree / ToC / war room)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "what is my agenda tonight" must not fall to agenda host-frame (tick plan surface).
    // "night brief" / "owner brief" / "tick brief" must not generic lifecycle.
    /\b(night brief|owner brief|tick brief|war room|war[- ]?room)\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your )?(night brief|owner brief|tick brief)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(war room|war[- ]?room) (plan|status|brief)\b/.test(last) ||
    /\b(war room|war[- ]?room) (plan|status|brief)\b/.test(last) ||
    /\b(build order|service order|scrum order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(build order|service order|scrum order)\b/.test(last) ||
    /\b(night graph|ops graph|process map|dependency tree|value stream)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(night graph|ops graph|process map|dependency tree|value stream)\b/.test(
      last,
    ) ||
    /\b(show|surface|print) (me )?(the )?(ops graph|night graph|process map|dependency tree)\b/.test(
      last,
    ) ||
    /\b(owner capacity plan|capacity plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your )?capacity plan\b/.test(last) ||
    /\bpath of least resistance\b/.test(last) ||
    /\bpath of least resistance for (advance|this (tick|cycle|night)|the gate)\b/.test(last) ||
    /\b(single source of truth|ssot) (for )?(the |this )?(tick|cycle|night|plan|owner)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(single source of truth|ssot)\b/.test(last) ||
    /\btheory of constraints\b/.test(last) ||
    /\btheory of constraints for (this |the )?(tick|cycle|night)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?constraint\b/.test(last) ||
    /\b(bottleneck analysis|constraint analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(bottleneck analysis|constraint analysis)\b/.test(last) ||
    // Agenda-as-plan (not host frame): "my/your/the agenda tonight/this tick"
    /\bwhat(?:'s| is) (my |your |the )?agenda (tonight|this (tick|cycle|night)|for (tonight|this (tick|cycle|night)))\b/.test(
      last,
    ) ||
    /\b(my |your |the )?agenda for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(owner|agent|bot|tick) brief\b/.test(last) ||
    /\b(night|owner|tick) (ops )?brief\b/.test(last) ||
    // Natural planner phrasing wave 13 (working on / P0 / marching orders / north star / tonight plan)
    // Were generic lifecycle; "must-do list" / "need-to-do list" were bare "list" RSVP path.
    // "status report" was status path without Owner tick plan lead — promote to full plan surface.
    /\bwhat (are you|will you be) working on\b/.test(last) ||
    /\bwhat (are you|will you be) working on (right now|now|this (tick|cycle|night|tonight))\b/.test(
      last,
    ) ||
    /\bcurrent priorit(y|ies)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?next thing\b/.test(last) ||
    // Bare "what's next" / "what next" / "next steps" — were generic lifecycle, not Owner tick plan
    /\bwhat(?:'s| is) next\b/.test(last) ||
    /\bwhat next\b/.test(last) ||
    /\bnext steps\b/.test(last) ||
    /\b(night|event|tonight|daily|standing|work) plan\b/.test(last) ||
    /\b(tonight|night|event)'?s plan\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your )?(tonight|night|event)'?s plan\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your |tonight'?s )?(night|event|tonight|daily|standing|work) plan\b/.test(
      last,
    ) ||
    /\bhow (do|can|will) (we|i|you) get there\b/.test(last) ||
    /\bwhat(?:'s| is) left to do\b/.test(last) ||
    /\bwhat remains to do\b/.test(last) ||
    /\bstatus report\b/.test(last) ||
    /\b(give me|show me|print) (a |the )?status report\b/.test(last) ||
    /\bowner'?s plan\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?owner'?s plan\b/.test(last) ||
    /\b(top|number one|number 1|#1|primary) priorit(y|ies)\b/.test(last) ||
    /\bpriority one\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(top|number one|number 1|#1|primary) priorit(y|ies)\b/.test(last) ||
    /\b(what is |what(?:'s| is) (the )?)?p0\b/.test(last) ||
    /\bp0 for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(must[- ]?do|need[- ]?to[- ]?do) list\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(must[- ]?do|need[- ]?to[- ]?do) list\b/.test(last) ||
    /\baction items?\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your )?action items?\b/.test(last) ||
    /\b(your|the) move\b/.test(last) ||
    /\bwhat(?:'s| is) (your |the )?move\b/.test(last) ||
    /\bplay of the day\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?play of the day\b/.test(last) ||
    /\bnext moves?\b/.test(last) ||
    /\bwhat (are|is) (the |my |your )?next moves?\b/.test(last) ||
    /\b(standing order|marching orders)\b/.test(last) ||
    /\bwhat (are|is) (the |my |your )?(standing order|marching orders)\b/.test(last) ||
    /\b(operating rhythm)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?operating rhythm\b/.test(last) ||
    /\bwhere (should|does) effort go\b/.test(last) ||
    /\bforce (the )?next( step)?\b/.test(last) ||
    /\bwhat (is|gets) forced next\b/.test(last) ||
    /\bcommit next\b/.test(last) ||
    /\bwhat (do|will) (we|i|you) commit to next\b/.test(last) ||
    /\b(north star|main effort|supporting effort)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(north star|main effort|supporting effort)\b/.test(last) ||
    /\bnorth star for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(commander'?s? intent|command intent)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(commander'?s? intent|command intent)\b/.test(last) ||
    /\b(intent|purpose) of (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhy this (next )?step\b/.test(last) ||
    /\bwhat needs doing next\b/.test(last) ||
    // Natural planner phrasing wave 14 (on the plate / ship next / one thing / OODA / mission / call)
    // Were generic lifecycle; "shipping plan" / "what gets done first" / bare plate were miss.
    // "I'll work the room" is co-pilot (not plan). "pull the next" is plan surface, not drive.
    /\bwhat(?:'s| is) on (the |my |your )?plate\b/.test(last) ||
    /\bon (the |my |your )?plate (tonight|this (tick|cycle|night))?\b/.test(last) ||
    /\b(on the plate)\b/.test(last) ||
    /\bwhat (should|do|will) (we|i|you) ship (next|tonight|this (tick|cycle|night)|today)?\b/.test(last) ||
    /\bwhat (should|do|will) (we|i|you) ship\b/.test(last) ||
    /\b(ship today)\b/.test(last) ||
    /\b(shipping plan|ship plan|load[- ]?in plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(shipping plan|ship plan|load[- ]?in plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?one thing\b/.test(last) ||
    /\b(the )?one thing( for (this |the )?(tick|cycle|night|tonight))?\b/.test(last) ||
    /\b(ooda|ooda loop)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(ooda|ooda loop)\b/.test(last) ||
    /\b(ooda|ooda loop) for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(objective|mission)\b/.test(last) ||
    /\b(objective|mission) for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?call\b/.test(last) ||
    /\bwhat gets done first\b/.test(last) ||
    /\bwhat (do|should) (we|i|you) (do|get done) first\b/.test(last) ||
    /\bwhat(?:'s| is) (the |my |your |current )?thread\b/.test(last) ||
    /\b(current|owner|agent|tick) thread\b/.test(last) ||
    /\bpull (the )?next\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pull\b/.test(last) ||
    /\b(focus area|area of focus)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(focus area|area of focus)\b/.test(last) ||
    /\b(sprint goal)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sprint goal\b/.test(last) ||
    /\bsprint goal for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(acceptance criteria)( (for )?(advance|the gate|this stage|stage))?\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?acceptance criteria\b/.test(last) ||
    /\b(when are we ready|ready when)\b/.test(last) ||
    /\bwhen (are|is) (we|the (night|event|stage|gate)) ready\b/.test(last) ||
    /\b(job to be done|jtbd)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(job to be done|jtbd)\b/.test(last) ||
    /\b(job to be done|jtbd) for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(job|outcome) (for )?(this |the )?(tick|cycle|night|tonight)\b/.test(
      last,
    ) ||
    /\b(success criteria|definition of success)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(success criteria|definition of success)\b/.test(last) ||
    /\bwhat does success look like\b/.test(last) ||
    /\b(leverage point|force multiplier)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(leverage point|force multiplier|lever)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lever\b/.test(last) ||
    // Natural planner phrasing wave 15 (NBA / plan of record / first domino / 80-20 / keystone)
    // Were generic lifecycle; "next best action" / "where do we start" / bare NBA miss.
    // "I do the room" is co-pilot (not plan). "what can ship today" is plan surface, not drive.
    /\b(next best action|nba)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(next best action|nba)\b/.test(last) ||
    /\b(plan of record)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?plan of record\b/.test(last) ||
    /\b(highest leverage|highest[- ]leverage)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(highest leverage|highest[- ]leverage)( move)?\b/.test(last) ||
    /\bwhat should (we|i|you) focus on\b/.test(last) ||
    /\bwhat(?:'s| is) (our |the |your )?focus right now\b/.test(last) ||
    /\b(immediate next|immediate next step)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(immediate next|immediate next step)\b/.test(last) ||
    /\b(critical next|critical next step)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(critical next|critical next step)\b/.test(last) ||
    /\bwhat can (we |you )?ship today\b/.test(last) ||
    /\bwhat ships first\b/.test(last) ||
    /\b(today'?s focus|today focus)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?today'?s focus\b/.test(last) ||
    /\b(80\s*\/\s*20|80-20|pareto)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(80\s*\/\s*20|80-20|pareto)\b/.test(last) ||
    /\b(thinnest slice|smallest next(?: step)?|minimum viable next)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(thinnest slice|smallest next(?: step)?|minimum viable next)\b/.test(
      last,
    ) ||
    /\b(order of execution|execution sequence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(order of execution|execution sequence)\b/.test(last) ||
    /\b(first in line|top of the board|top card|lead item)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(first in line|top of the board|top card|lead item)\b/.test(last) ||
    /\bwhat deserves attention\b/.test(last) ||
    /\b(decision criteria)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?decision criteria\b/.test(last) ||
    /\b(milestone|checkpoint) (for )?(tonight|this (tick|cycle|night)|advance)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(milestone|checkpoint)\b/.test(last) ||
    /\b(key result|okr) (for )?(this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(key result|okr)\b/.test(last) ||
    /\b(wip limit)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?wip limit\b/.test(last) ||
    /\b(ship blockers?|blocking shipping)\b/.test(last) ||
    /\bwhat is blocking shipping\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?ship blockers?\b/.test(last) ||
    /\b(first domino|keystone|unlocking move)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(first domino|keystone|unlocking move)\b/.test(last) ||
    /\bwhere do (we|i|you) start\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?starting point\b/.test(last) ||
    /\b(starting point|entry point)\b/.test(last) ||
    /\b(operating model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?operating model\b/.test(last) ||
    /\bwhat (are we|are you) optimizing for\b/.test(last) ||
    /\b(single next action)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?single next action\b/.test(last) ||
    /\bin what order\b/.test(last) ||
    /\bwhat order (do|should) (we|things|ops)\b/.test(last) ||
    // Natural planner phrasing wave 16 (forcing function / DACI / MoSCoW / flywheel / RICE / 2x2)
    // Were generic lifecycle; bare "forcing function" / "sequencing for tonight" / "one-pager" miss.
    // "you're my war room" is co-pilot (not plan). "what is the DACI" is plan surface, not drive.
    /\b(forcing function)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?forcing function\b/.test(last) ||
    /\b(daci)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?daci\b/.test(last) ||
    /\b(moscow)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?moscow\b/.test(last) ||
    /\b(flywheel)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?flywheel\b/.test(last) ||
    /\b(wedge)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?wedge\b/.test(last) ||
    /\b(beachhead)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?beachhead\b/.test(last) ||
    /\b(one[- ]?pager)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?one[- ]?pager\b/.test(last) ||
    /\b(brief for (this |the )?(tick|cycle|night|tonight))\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?brief for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(stand[- ]?up summary)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?stand[- ]?up summary\b/.test(last) ||
    /\b(compounder)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?compounder\b/.test(last) ||
    /\b(eisenhower|eisenhower matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(eisenhower|eisenhower matrix)\b/.test(last) ||
    /\b(2\s*x\s*2|2x2 matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(2\s*x\s*2|2x2 matrix)\b/.test(last) ||
    /\b(impact[\/\s-]?effort|impact effort matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(impact[\/\s-]?effort|impact effort matrix)\b/.test(last) ||
    /\b(ice score|rice prioritization|rice score)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(ice score|rice prioritization|rice score|rice)\b/.test(last) ||
    /\b(sequencing for (tonight|this (tick|cycle|night)))\b/.test(last) ||
    /\bwhat(?:'s| is) (our |the )?sequencing\b/.test(last) ||
    /\bour sequencing\b/.test(last) ||
    // Natural planner phrasing wave 17 (pre-mortem / DRI / MIT / GTD / RAID / OMTM / timebox)
    // Were generic lifecycle; bare "pre-mortem" / "who is DRI" / "eat the frog" miss.
    // "you're my autopilot" is co-pilot (not plan). "what is the DRI" is plan surface, not drive.
    /\b(pre[- ]?mortem)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pre[- ]?mortem\b/.test(last) ||
    /\bpre[- ]?mortem for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(post[- ]?mortem plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?post[- ]?mortem plan\b/.test(last) ||
    /\b(risk register)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?risk register\b/.test(last) ||
    /\b(raid log)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?raid log\b/.test(last) ||
    /\b(single[- ]?threaded owner|single threaded owner)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(single[- ]?threaded owner|single threaded owner)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dri\b/.test(last) ||
    /\bwho is (the )?dri\b/.test(last) ||
    /\b(timebox)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?timebox\b/.test(last) ||
    /\b(most important task|\bmit\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(most important task|mit)\b/.test(last) ||
    /\b(big rocks?)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?big rocks?\b/.test(last) ||
    /\b(eat the frog|frogs? first)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(eat the frog|frogs? first)\b/.test(last) ||
    /\b(gtd|getting things done)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gtd|getting things done)( next)?\b/.test(last) ||
    /\b(decision log)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?decision log\b/.test(last) ||
    /\b(prioritization stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?prioritization stack\b/.test(last) ||
    /\bstack rank for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(sop|standard operating procedure)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(sop|standard operating procedure)\b/.test(last) ||
    /\b(playbook order|go book)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(playbook order|go book)\b/.test(last) ||
    /\b(options matrix|tradeoff matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(options matrix|tradeoff matrix)\b/.test(last) ||
    /\b(dependency order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dependency order\b/.test(last) ||
    /\b(one metric that matters|omtm)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(one metric that matters|omtm)\b/.test(last) ||
    /\b(capacity for (this |the )?(tick|cycle|night|tonight))\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?capacity for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(kill switch order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?kill switch order\b/.test(last) ||
    /\b(decision tree)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?decision tree\b/.test(last) ||
    /\b(ivy lee method)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?ivy lee method\b/.test(last) ||
    /\b(checklist order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?checklist order\b/.test(last) ||
    // Natural planner phrasing wave 18 (SWOT / PDCA / five whys / now-next-later / MECE / RASCI)
    // Were generic lifecycle; bare "SWOT" / "now next later" / "five whys" miss.
    // "you're my remote control" is co-pilot (not plan). "what is the SWOT" is plan surface, not drive.
    /\b(swot)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?swot\b/.test(last) ||
    /\b(pestle|pestel)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pestle|pestel)\b/.test(last) ||
    /\b(pdca|plan do check act)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pdca|plan do check act)\b/.test(last) ||
    /\b(a3 problem solving)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?a3\b/.test(last) ||
    /\b(five whys|5 whys)\b/.test(last) ||
    /\bwhat (are|is) (the )?(five whys|5 whys)\b/.test(last) ||
    /\b(root cause analysis|rca)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(root cause analysis|rca)\b/.test(last) ||
    /\b(fishbone|ishikawa)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(fishbone|ishikawa)\b/.test(last) ||
    /\b(now\s*[\/]\s*next\s*[\/]\s*later|now next later)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(now\s*[\/]\s*next\s*[\/]\s*later|now next later)\b/.test(last) ||
    /\b(priority matrix|action priority matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(priority matrix|action priority matrix)\b/.test(last) ||
    /\b(decision matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?decision matrix\b/.test(last) ||
    /\b(weighted scoring)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?weighted scoring\b/.test(last) ||
    /\b(pick chart)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pick chart\b/.test(last) ||
    /\b(smart goals?)\b/.test(last) ||
    /\bwhat (are|is) (the )?smart goals?\b/.test(last) ||
    /\bsmart goals? for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(critical success factors|csf)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(critical success factors|csf)\b/.test(last) ||
    /\bcsf for (this |the )?(tick|cycle|night|tonight)\b/.test(last) ||
    /\b(mece)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mece\b/.test(last) ||
    /\b(scqa)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?scqa\b/.test(last) ||
    /\b(issue tree|hypothesis tree|driver tree)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(issue tree|hypothesis tree|driver tree)\b/.test(last) ||
    /\b(pyramid principle)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pyramid principle\b/.test(last) ||
    /\b(first principles)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?first principles\b/.test(last) ||
    /\bfirst principles for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(inversion planning|second order thinking)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(inversion planning|second order thinking)\b/.test(last) ||
    /\b(ladder of inference)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?ladder of inference\b/.test(last) ||
    /\b(story map|user story map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(story map|user story map)\b/.test(last) ||
    /\b(rasci)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?rasci\b/.test(last) ||
    /\b(okr cascade)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?okr cascade\b/.test(last) ||
    // Natural planner phrasing wave 19 (force field / cynefin / wardley / kano / canvases / OST)
    // Were generic lifecycle; bare "cynefin" / "lean canvas" / "riskiest assumption" miss.
    // "you're my middleware" is co-pilot (not plan). "what is the force field" is plan surface, not drive.
    /\b(force field analysis|force field)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?force field( analysis)?\b/.test(last) ||
    /\b(cynefin)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cynefin\b/.test(last) ||
    /\b(wardley map|wardley)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?wardley( map)?\b/.test(last) ||
    /\b(kano model|kano)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?kano( model)?\b/.test(last) ||
    /\b(impact mapping)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?impact mapping\b/.test(last) ||
    /\b(story mapping)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?story mapping\b/.test(last) ||
    /\b(riskiest assumption)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?riskiest assumption\b/.test(last) ||
    /\b(assumption map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?assumption map\b/.test(last) ||
    /\b(lean canvas)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lean canvas\b/.test(last) ||
    /\b(business model canvas)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?business model canvas\b/.test(last) ||
    /\b(value proposition canvas)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?value proposition canvas\b/.test(last) ||
    /\b(opportunity solution tree|ost)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(opportunity solution tree|ost)\b/.test(last) ||
    /\b(capability map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?capability map\b/.test(last) ||
    /\b(okr tree)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?okr tree\b/.test(last) ||
    // Natural planner phrasing wave 20 (service blueprint / sitrep / RAPID / AAR / TOC tools)
    // Were generic lifecycle; bare "sitrep" / "service blueprint" / "jobs to be done" miss.
    // "you're my second brain" is co-pilot (not plan). "what is the sitrep" is plan surface, not drive.
    /\b(jobs? to be done)\b/.test(last) ||
    /\bwhat (are|is) (the )?jobs? to be done\b/.test(last) ||
    /\bjobs? to be done for (tonight|this (tick|cycle|night))\b/.test(last) ||
    /\b(service blueprint)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?service blueprint\b/.test(last) ||
    /\b(journey map|customer journey map|user journey map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(journey map|customer journey map|user journey map)\b/.test(last) ||
    /\b(event canvas)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?event canvas\b/.test(last) ||
    /\b(theory of change)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?theory of change\b/.test(last) ||
    /\b(logic model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?logic model\b/.test(last) ||
    /\b(rapid framework|rapid)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?rapid( framework)?\b/.test(last) ||
    /\b(north[- ]?star metric)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?north[- ]?star metric\b/.test(last) ||
    /\b(after[- ]?action review|aar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(after[- ]?action review|aar)\b/.test(last) ||
    /\b(after[- ]?action review) plan\b/.test(last) ||
    /\b(sitrep|situation report)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(sitrep|situation report)\b/.test(last) ||
    /\b(battle map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?battle map\b/.test(last) ||
    /\b(pert chart|pert)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pert chart|pert)\b/.test(last) ||
    /\b(critical path method|cpm)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(critical path method|cpm)\b/.test(last) ||
    /\b(scrum of scrums)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?scrum of scrums\b/.test(last) ||
    /\b(push system|pull system)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(push system|pull system)\b/.test(last) ||
    /\b(five focusing steps|5 focusing steps)\b/.test(last) ||
    /\bwhat (are|is) (the )?(five focusing steps|5 focusing steps)\b/.test(last) ||
    /\b(goldratt|theory of constraints tools)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?goldratt\b/.test(last) ||
    /\b(drum[- ]?buffer[- ]?rope|dbr)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(drum[- ]?buffer[- ]?rope|dbr)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?buffer\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?agent doing\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(bot|events bot) doing\b/.test(last) ||
    // Natural planner phrasing wave 21 (stakeholder/empathy maps / lean ops / RACI / cadence)
    // Were generic lifecycle; bare "SIPOC" / "kaizen" / "stakeholder map" miss.
    // "you're my decision engine" is co-pilot (not plan). "what is the SIPOC" is plan surface, not drive.
    /\b(stakeholder map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?stakeholder map\b/.test(last) ||
    /\b(empathy map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?empathy map\b/.test(last) ||
    /\b(raid log|raid)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(raid log|raid)\b/.test(last) ||
    /\b(raci chart|raci)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(raci chart|raci)\b/.test(last) ||
    /\b(sipoc)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sipoc\b/.test(last) ||
    /\b(dmaic)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dmaic\b/.test(last) ||
    /\b(5s plan|5s)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(5s plan|5s)\b/.test(last) ||
    /\b(kaizen)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?kaizen\b/.test(last) ||
    /\b(hoshin kanri|hoshin)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(hoshin kanri|hoshin)\b/.test(last) ||
    /\b(catchball)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?catchball\b/.test(last) ||
    /\b(andon|andons)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?andon\b/.test(last) ||
    /\b(gemba walk|gemba)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gemba walk|gemba)\b/.test(last) ||
    /\b(control chart)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?control chart\b/.test(last) ||
    /\b(spaghetti diagram)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?spaghetti diagram\b/.test(last) ||
    /\b(standard work)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?standard work\b/.test(last) ||
    /\b(heijunka)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?heijunka\b/.test(last) ||
    /\b(jidoka)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?jidoka\b/.test(last) ||
    /\b(poka[- ]?yoke)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?poka[- ]?yoke\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?throughput\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?wip\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cadence\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?drumbeat( tonight)?\b/.test(last) ||
    /\b(operating cadence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?operating cadence\b/.test(last) ||
    /\b(decision rights)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?decision rights\b/.test(last) ||
    /\b(escalation ladder)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?escalation ladder\b/.test(last) ||
    /\b(communication plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?communication plan\b/.test(last) ||
    /\b(stakeholder plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?stakeholder plan\b/.test(last) ||
    // Natural planner phrasing wave 22 (WBS / critical chain / iron triangle / COP / OPORD / value stream)
    // Were generic lifecycle; bare "WBS" / "critical chain" / "value stream map" miss.
    // "you're my strategy engine" is co-pilot (not plan). "what is the WBS" is plan surface, not drive.
    /\b(work breakdown structure|wbs)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(work breakdown structure|wbs)\b/.test(last) ||
    /\b(critical chain)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?critical chain\b/.test(last) ||
    /\b(iron triangle|triple constraint|scope triangle)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(iron triangle|triple constraint|scope triangle)\b/.test(last) ||
    /\b(value stream map|value stream)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(value stream map|value stream)\b/.test(last) ||
    /\b(swimlane|swim ?lane diagram)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(swimlane|swim ?lane diagram)\b/.test(last) ||
    /\b(process map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?process map\b/.test(last) ||
    /\b(dependency map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dependency map\b/.test(last) ||
    /\b(risk matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?risk matrix\b/.test(last) ||
    /\b(change control|change control board|ccb)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(change control|change control board|ccb)\b/.test(last) ||
    /\b(common operating picture|\bcop\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(common operating picture|\bcop\b)\b/.test(last) ||
    /\b(opord|five paragraph order|5 paragraph order)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(opord|five paragraph order|5 paragraph order)\b/.test(last) ||
    /\b(frago|warnord)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(frago|warnord)\b/.test(last) ||
    /\b(mett[- ]?tc)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mett[- ]?tc\b/.test(last) ||
    /\b(mdmp)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mdmp\b/.test(last) ||
    /\b(incident command|ics structure|ics)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(incident command|ics structure|ics)\b/.test(last) ||
    /\b(gold command|silver command|bronze command)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gold command|silver command|bronze command)\b/.test(last) ||
    /\b(gantt|gantt chart)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gantt|gantt chart)\b/.test(last) ||
    /\b(scope creep)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?scope creep\b/.test(last) ||
    /\b(aarrr|pirate metrics)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(aarrr|pirate metrics)\b/.test(last) ||
    /\b(growth loop)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?growth loop\b/.test(last) ||
    /\b(activation funnel)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?activation funnel\b/.test(last) ||
    /\b(retention loop)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?retention loop\b/.test(last) ||
    /\b(heart framework)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?heart framework\b/.test(last) ||
    // Natural planner phrasing wave 23 (phase/tollgate / earned value / SAFe / resource leveling)
    // Were generic lifecycle; bare "phase gate" / "resource leveling" / "PI planning" miss.
    // "you're my orchestration engine" is co-pilot (not plan). "what is the phase gate" is plan surface, not drive.
    /\b(phase gate|phase[- ]?gate|tollgate|toll[- ]?gate)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(phase gate|phase[- ]?gate|tollgate|toll[- ]?gate)\b/.test(last) ||
    /\b(earned value|earned value management|\bevm\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(earned value|earned value management|\bevm\b|cpi|spi)\b/.test(last) ||
    /\b(cost performance index|schedule performance index)\b/.test(last) ||
    /\b(schedule compression|schedule crashing|crashing the schedule|fast tracking|fast[- ]?track)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(schedule compression|schedule crashing|fast tracking)\b/.test(last) ||
    /\b(resource leveling|resource smoothing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(resource leveling|resource smoothing)\b/.test(last) ||
    /\b(total float|free float|schedule float|float analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(total float|free float|schedule float|float)\b/.test(last) ||
    /\b(power interest grid|power[- ]?interest)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(power interest grid|power[- ]?interest)\b/.test(last) ||
    /\b(responsibility (assignment )?matrix)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(responsibility (assignment )?matrix|\bram\b)\b/.test(last) ||
    /\b(quality gate|quality gates)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?quality gate\b/.test(last) ||
    /\b(benefits realization|benefit realization)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(benefits realization|benefit realization)\b/.test(last) ||
    /\b(pi planning|program increment|safe framework)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pi planning|program increment|safe framework)\b/.test(last) ||
    /\b(scrumban)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?scrumban\b/.test(last) ||
    /\b(product backlog|sprint backlog)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(product backlog|sprint backlog)\b/.test(last) ||
    /\b(configuration management|config management)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(configuration management|config management)\b/.test(last) ||
    /\b(lessons learned|lessons[- ]learned log)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lessons learned\b/.test(last) ||
    /\b(baseline schedule|schedule baseline|performance baseline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(baseline schedule|schedule baseline|performance baseline)\b/.test(last) ||
    /\b(change request|change requests)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?change request\b/.test(last) ||
    /\b(monte carlo|monte carlo schedule)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(monte carlo|monte carlo schedule)\b/.test(last) ||
    // Natural planner phrasing wave 24 (rolling wave / network diagram / EVM residual / OBS)
    // Were generic lifecycle; bare "rolling wave" / "resource histogram" / "earned schedule" miss.
    // Avoid bare English traps (BAC/EAC/ETC/VAC alone) — full forms + "what is the X".
    // "you're my multi-agent swarm" is co-pilot (not plan). "what is the rolling wave" is plan surface.
    /\b(rolling wave planning|rolling wave)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(rolling wave planning|rolling wave)\b/.test(last) ||
    /\b(forward pass|backward pass)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(forward pass|backward pass)\b/.test(last) ||
    /\b(early start|late start|early finish|late finish)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(early start|late start|early finish|late finish)\b/.test(last) ||
    /\b(slack time|schedule slack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(slack time|schedule slack)\b/.test(last) ||
    /\b(network diagram|precedence diagram|activity on node|aon diagram)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(network diagram|precedence diagram|activity on node|aon)\b/.test(
      last,
    ) ||
    /\b(organizational breakdown structure|\bobs\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(organizational breakdown structure|\bobs\b)\b/.test(last) ||
    /\b(resource histogram)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?resource histogram\b/.test(last) ||
    /\b(crashing analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?crashing analysis\b/.test(last) ||
    /\b(parametric estimat(e|ing)|analogous estimat(e|ing)|three[- ]?point estimat(e|ing))\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(parametric estimate|analogous estimate|three[- ]?point estimate)\b/.test(
      last,
    ) ||
    /\b(s[- ]?curve)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?s[- ]?curve\b/.test(last) ||
    /\b(earned schedule)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?earned schedule\b/.test(last) ||
    /\b(to complete performance index|\btcpi\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(to complete performance index|\btcpi\b)\b/.test(last) ||
    /\b(control account)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?control account\b/.test(last) ||
    /\b(planning package)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?planning package\b/.test(last) ||
    /\b(budget at completion|estimate at completion|estimate to complete|variance at completion)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(budget at completion|estimate at completion|estimate to complete|variance at completion|\bbac\b|\beac\b|\betc\b|\bvac\b)\b/.test(
      last,
    ) ||
    /\b(cost variance|schedule variance)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(cost variance|schedule variance|\bcv\b|\bsv\b)\b/.test(last) ||
    /\b(spi trend|cpi trend)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(spi trend|cpi trend)\b/.test(last) ||
    // Natural planner phrasing wave 25 (WSJF / cost of delay / agile flow / discovery residual)
    // Were generic lifecycle; bare "WSJF" / "story points" / "cycle time" miss.
    // Avoid bare "velocity" / "retro" alone — full forms + "what is the X".
    // "you're my knowledge graph" is co-pilot (not plan). "what is the WSJF" is plan surface, not drive.
    /\b(wsjf|weighted shortest job first)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(wsjf|weighted shortest job first)\b/.test(last) ||
    /\b(cost of delay|cd3)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(cost of delay|cd3)\b/.test(last) ||
    /\b(story points?|planning poker)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(story points?|planning poker)\b/.test(last) ||
    /\b(sprint velocity|team velocity)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(sprint velocity|team velocity|velocity)\b/.test(last) ||
    /\b(backlog refinement|backlog grooming|grooming session)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(backlog refinement|backlog grooming)\b/.test(last) ||
    /\b(sprint planning|sprint review|sprint retrospective)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(sprint planning|sprint review|sprint retrospective)\b/.test(last) ||
    /\b(daily standup|daily scrum)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(daily standup|daily scrum)\b/.test(last) ||
    /\b(burnup|burn[- ]?up chart)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(burnup|burn[- ]?up chart)\b/.test(last) ||
    /\b(cumulative flow|cumulative flow diagram|\bcfd\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(cumulative flow|cumulative flow diagram|\bcfd\b)\b/.test(last) ||
    /\b(cycle time|lead time)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(cycle time|lead time)\b/.test(last) ||
    /\b(little'?s law|littles law)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(little'?s law|littles law)\b/.test(last) ||
    /\b(kanban board)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?kanban board\b/.test(last) ||
    /\b(class of service|service level expectation|\bsle\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(class of service|service level expectation|\bsle\b)\b/.test(last) ||
    /\b(dual[- ]?track agile|dual[- ]?track discovery|continuous discovery)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(dual[- ]?track agile|dual[- ]?track discovery|continuous discovery)\b/.test(
      last,
    ) ||
    /\b(program board|experiment backlog|opportunity backlog)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(program board|experiment backlog|opportunity backlog)\b/.test(last) ||
    /\b(spotify model|squad model|tribe model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(spotify model|squad model|tribe model)\b/.test(last) ||
    // Natural planner phrasing wave 26 (lean startup / product discovery residual / freezes)
    // Were generic lifecycle; bare "build measure learn" / "product market fit" / "feature freeze" miss.
    // "you're my toolformer" is co-pilot (not plan). "what is the build measure learn" is plan surface.
    /\b(build[- ]?measure[- ]?learn|bml loop)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(build[- ]?measure[- ]?learn|bml loop)\b/.test(last) ||
    /\b(validated learning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?validated learning\b/.test(last) ||
    /\b(innovation accounting)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?innovation accounting\b/.test(last) ||
    /\b(problem[- ]?solution fit)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?problem[- ]?solution fit\b/.test(last) ||
    /\b(product[- ]?market fit|\bpmf\b)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(product[- ]?market fit|\bpmf\b)\b/.test(last) ||
    /\b(working backwards|working backward|press release method|pr[/ ]?faq)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(working backwards|working backward|press release method|pr[/ ]?faq)\b/.test(
      last,
    ) ||
    /\b(customer development)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?customer development\b/.test(last) ||
    /\b(lean startup)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lean startup\b/.test(last) ||
    /\b(smoke test)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?smoke test\b/.test(last) ||
    /\b(concierge mvp|wizard of oz mvp|wizard of oz)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(concierge mvp|wizard of oz)\b/.test(last) ||
    /\b(pretotype|pretotyping|fake door test|landing page test)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(pretotype|pretotyping|fake door test|landing page test)\b/.test(last) ||
    /\b(feature freeze|code freeze|content freeze)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(feature freeze|code freeze|content freeze)\b/.test(last) ||
    /\b(hardening sprint|stabilization sprint)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(hardening sprint|stabilization sprint)\b/.test(last) ||
    /\b(tech debt backlog|technical debt backlog)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(tech debt backlog|technical debt backlog)\b/.test(last) ||
    /\b(research spike|story spike|spike story)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(research spike|story spike|spike story)\b/.test(last) ||
    /\b(architectural runway)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?architectural runway\b/.test(last) ||
    /\b(enabler story|enabler stories)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(enabler story|enabler stories)\b/.test(last) ||
    /\b(increment goal|pi objective)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(increment goal|pi objective)\b/.test(last) ||
    // Natural planner phrasing wave 27 (DORA / DDD / post-mortem / ADRs residual)
    // Were generic lifecycle; bare "post-mortem" / "dora metrics" / "event storming" miss.
    // "you're my cron job" is co-pilot (not plan). "what is the dora metrics" is plan surface.
    // Avoid bare "slo" alone — collides with San Luis Obispo NON_SF; use full forms.
    /\b(post[- ]?mortem|blameless post[- ]?mortem)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(post[- ]?mortem|blameless post[- ]?mortem)\b/.test(last) ||
    /\b(assumption mapping|assumption map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(assumption mapping|assumption map)\b/.test(last) ||
    /\b(architecture decision record|architecture decision records)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(architecture decision record|architecture decision records)\b/.test(
      last,
    ) ||
    /\b(rfc process|design doc|tech radar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(rfc process|design doc|tech radar)\b/.test(last) ||
    /\bokrs\b/.test(last) ||
    /\bwhat(?:'s| are) (the )?okrs\b/.test(last) ||
    /\b(key results)\b/.test(last) ||
    /\bwhat(?:'s| are) (the )?key results\b/.test(last) ||
    /\b(event storming)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?event storming\b/.test(last) ||
    /\b(domain[- ]?driven design|ddd)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(domain[- ]?driven design|ddd)\b/.test(last) ||
    /\b(bounded context)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?bounded context\b/.test(last) ||
    /\bcqrs\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cqrs\b/.test(last) ||
    /\b(event sourcing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?event sourcing\b/.test(last) ||
    /\b(strangler fig|strangler pattern)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(strangler fig|strangler pattern)\b/.test(last) ||
    /\b(trunk[- ]?based development)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?trunk[- ]?based development\b/.test(last) ||
    /\b(continuous delivery|continuous deployment)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(continuous delivery|continuous deployment)\b/.test(last) ||
    /\b(dora metrics|four keys)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(dora metrics|four keys|dora)\b/.test(last) ||
    /\b(change fail rate|deployment frequency)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(change fail rate|deployment frequency)\b/.test(last) ||
    /\b(mean time to recovery|mttr)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(mean time to recovery|mttr)\b/.test(last) ||
    /\b(toil budget|error budget)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(toil budget|error budget)\b/.test(last) ||
    /\b(service level objective|service level indicator)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(service level objective|service level indicator)\b/.test(last) ||
    // Natural planner phrasing wave 28 (SRE / incident response / DR residual)
    // Were generic lifecycle; bare "site reliability" / "chaos engineering" / "game day" miss.
    // "you're my sre" is co-pilot (not plan). "what is the disaster recovery" is plan surface.
    // Avoid bare "slo" — collides with San Luis Obispo NON_SF.
    /\b(site reliability|reliability engineering)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(site reliability|reliability engineering)\b/.test(last) ||
    /\b(incident response)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?incident response\b/.test(last) ||
    /\b(chaos engineering)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?chaos engineering\b/.test(last) ||
    /\b(disaster recovery)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?disaster recovery\b/.test(last) ||
    /\b(game day)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?game day\b/.test(last) ||
    /\b(tabletop exercise)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?tabletop exercise\b/.test(last) ||
    /\b(failover plan|multi[- ]?region failover)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(failover plan|multi[- ]?region failover)\b/.test(last) ||
    /\b(recovery time objective|recovery point objective)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(recovery time objective|recovery point objective)\b/.test(last) ||
    /\b(mean time between failures|mtbf)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(mean time between failures|mtbf)\b/.test(last) ||
    /\b(five nines|availability target)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(five nines|availability target)\b/.test(last) ||
    /\b(status page)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?status page\b/.test(last) ||
    /\b(on[- ]?call rotation|pager rotation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(on[- ]?call rotation|pager rotation)\b/.test(last) ||
    /\b(blameless culture)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?blameless culture\b/.test(last) ||
    /\b(runbook drill)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?runbook drill\b/.test(last) ||
    // Natural planner phrasing wave 29 (DevOps / CI-CD / GitOps residual)
    // Were generic lifecycle; bare "continuous integration" / "gitops" / "blast radius" miss.
    // "you're my devops" is co-pilot (not plan). "what is the deployment pipeline" is plan surface.
    // Avoid bare "ci"/"cd"/"slo" — too short or NON_SF collision.
    /\b(continuous integration)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?continuous integration\b/.test(last) ||
    /\b(deployment pipeline|ci\/?cd pipeline|cicd pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(deployment pipeline|ci\/?cd pipeline|cicd pipeline)\b/.test(last) ||
    /\b(gitops)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?gitops\b/.test(last) ||
    /\b(infrastructure as code|infra as code)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(infrastructure as code|infra as code)\b/.test(last) ||
    /\b(platform engineering)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?platform engineering\b/.test(last) ||
    /\b(progressive delivery)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?progressive delivery\b/.test(last) ||
    /\b(blast radius)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?blast radius\b/.test(last) ||
    /\b(toil reduction)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?toil reduction\b/.test(last) ||
    /\b(golden signals|four golden signals)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(golden signals|four golden signals)\b/.test(last) ||
    /\b(error budget burn|burn rate)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(error budget burn|burn rate)\b/.test(last) ||
    /\b(alert fatigue)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?alert fatigue\b/.test(last) ||
    /\b(on[- ]?call handoff|pager handoff)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(on[- ]?call handoff|pager handoff)\b/.test(last) ||
    /\b(auto[- ]?remediation|self[- ]?healing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(auto[- ]?remediation|self[- ]?healing)\b/.test(last) ||
    /\b(runbook automation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?runbook automation\b/.test(last) ||
    /\b(mean time to detect|mttd)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(mean time to detect|mttd)\b/.test(last) ||
    /\b(service catalog)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?service catalog\b/.test(last) ||
    /\b(rolling update|canary analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(rolling update|canary analysis)\b/.test(last) ||
    /\b(operational excellence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?operational excellence\b/.test(last) ||
    /\b(change management|release management)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(change management|release management)\b/.test(last) ||
    // Natural planner phrasing wave 30 (SecOps / AppSec / MLOps / FinOps residual)
    // Were generic lifecycle; bare "threat model" / "zero trust" / "shift left" miss.
    // "you're my secops" is co-pilot (not plan). "what is the attack surface" is plan surface.
    // Avoid bare "qa"/"soc" alone as planner — too short; co-pilot uses "qa engineer" / "soc".
    /\b(security posture)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?security posture\b/.test(last) ||
    /\b(threat model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?threat model\b/.test(last) ||
    /\b(shift left)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?shift left\b/.test(last) ||
    /\b(zero trust)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?zero trust\b/.test(last) ||
    /\b(least privilege)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?least privilege\b/.test(last) ||
    /\b(defense in depth)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?defense in depth\b/.test(last) ||
    /\b(attack surface)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?attack surface\b/.test(last) ||
    /\b(vulnerability management)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?vulnerability management\b/.test(last) ||
    /\b(penetration test|pen test)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(penetration test|pen test)\b/.test(last) ||
    /\b(security review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?security review\b/.test(last) ||
    /\b(compliance checklist)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?compliance checklist\b/.test(last) ||
    /\b(data classification)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data classification\b/.test(last) ||
    /\b(access control)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?access control\b/.test(last) ||
    /\b(secrets rotation|certificate rotation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(secrets rotation|certificate rotation)\b/.test(last) ||
    /\b(supply chain security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?supply chain security\b/.test(last) ||
    /\b(software bill of materials|sbom)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(software bill of materials|sbom)\b/.test(last) ||
    /\b(dependency scanning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dependency scanning\b/.test(last) ||
    /\b(static analysis|dynamic analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(static analysis|dynamic analysis)\b/.test(last) ||
    /\b(security chaos)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?security chaos\b/.test(last) ||
    /\b(finops review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?finops review\b/.test(last) ||
    /\b(cost allocation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cost allocation\b/.test(last) ||
    /\b(right[- ]?sizing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?right[- ]?sizing\b/.test(last) ||
    /\b(capacity forecasting)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?capacity forecasting\b/.test(last) ||
    /\b(mlops pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mlops pipeline\b/.test(last) ||
    /\b(feature store)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?feature store\b/.test(last) ||
    /\b(model registry)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?model registry\b/.test(last) ||
    /\b(data lineage)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data lineage\b/.test(last) ||
    /\b(observability stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?observability stack\b/.test(last) ||
    /\b(distributed tracing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?distributed tracing\b/.test(last) ||
    /\b(log aggregation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?log aggregation\b/.test(last) ||
    // Natural planner phrasing wave 31 (DevSecOps / NetOps / privacy / GRC residual)
    // Were generic lifecycle; bare "policy as code" / "siem" / "breach response" miss.
    // "you're my devsecops" is co-pilot (not plan). "what is the siem" is plan surface.
    // Avoid bare "dpo"/"ciso"/"grc" alone as planner — too short; co-pilot uses those roles.
    /\b(policy as code)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?policy as code\b/.test(last) ||
    /\b(secrets scanning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?secrets scanning\b/.test(last) ||
    /\b(container security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?container security\b/.test(last) ||
    /\b(image scanning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?image scanning\b/.test(last) ||
    /\b(runtime security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?runtime security\b/.test(last) ||
    /\b(zero[- ]?day response)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?zero[- ]?day response\b/.test(last) ||
    /\b(breach response)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?breach response\b/.test(last) ||
    /\b(security questionnaire)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?security questionnaire\b/.test(last) ||
    /\b(soc\s*2|soc2)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(soc\s*2|soc2)\b/.test(last) ||
    /\b(iso\s*27001)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?iso\s*27001\b/.test(last) ||
    /\b(privacy review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?privacy review\b/.test(last) ||
    /\b(data retention policy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data retention policy\b/.test(last) ||
    /\b(dpa review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dpa review\b/.test(last) ||
    /\b(pci compliance)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pci compliance\b/.test(last) ||
    /\b(hipaa readiness)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?hipaa readiness\b/.test(last) ||
    /\b(bug bounty)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?bug bounty\b/.test(last) ||
    /\b(responsible disclosure)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?responsible disclosure\b/.test(last) ||
    /\b(security champion)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?security champion\b/.test(last) ||
    /\b(threat intel|threat intelligence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(threat intel|threat intelligence)\b/.test(last) ||
    /\b(ioc triage)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?ioc triage\b/.test(last) ||
    /\b(cve triage)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cve triage\b/.test(last) ||
    /\b(patch management)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?patch management\b/.test(last) ||
    /\b(vulnerability triage)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?vulnerability triage\b/.test(last) ||
    /\b(waf policy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?waf policy\b/.test(last) ||
    /\b(network segmentation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?network segmentation\b/.test(last) ||
    /\b(mfa rollout)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mfa rollout\b/.test(last) ||
    /\b(sso rollout)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sso rollout\b/.test(last) ||
    /\b(identity federation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?identity federation\b/.test(last) ||
    /\b(privileged access)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?privileged access\b/.test(last) ||
    /\b(pam review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pam review\b/.test(last) ||
    /\b(kubernetes security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?kubernetes security\b/.test(last) ||
    /\b(pod security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pod security\b/.test(last) ||
    /\b(supply chain attack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?supply chain attack\b/.test(last) ||
    /\b(slsa)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?slsa\b/.test(last) ||
    /\b(code signing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?code signing\b/.test(last) ||
    /\b(artifact signing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?artifact signing\b/.test(last) ||
    /\b(siem)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?siem\b/.test(last) ||
    /\b(soar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?soar\b/.test(last) ||
    /\b(cspm)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cspm\b/.test(last) ||
    /\b(cnapp)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cnapp\b/.test(last) ||
    /\b(tabletop security)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?tabletop security\b/.test(last) ||
    /\b(iam review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?iam review\b/.test(last) ||
    // Natural planner phrasing wave 32 (data platform / analytics / GTM ops residual)
    // Were generic lifecycle; bare "data pipeline" / "etl pipeline" / "dbt project" miss.
    // "you're my data engineer" is co-pilot (not plan). "what is the analytics stack" is plan surface.
    // Avoid bare "etl"/"dbt"/"bi" alone as planner — too short; co-pilot uses full role names.
    /\b(data pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data pipeline\b/.test(last) ||
    /\b(etl pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?etl pipeline\b/.test(last) ||
    /\b(analytics stack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?analytics stack\b/.test(last) ||
    /\b(data warehouse)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data warehouse\b/.test(last) ||
    /\b(data lake)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data lake\b/.test(last) ||
    /\b(metrics layer)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?metrics layer\b/.test(last) ||
    /\b(semantic layer)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?semantic layer\b/.test(last) ||
    /\b(dbt project)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?dbt project\b/.test(last) ||
    /\b(airflow dag)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?airflow dag\b/.test(last) ||
    /\b(spark job)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?spark job\b/.test(last) ||
    /\b(feature engineering)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?feature engineering\b/.test(last) ||
    /\b(data quality)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data quality\b/.test(last) ||
    /\b(data contracts?)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data contracts?\b/.test(last) ||
    /\b(cdc pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cdc pipeline\b/.test(last) ||
    /\b(reverse etl)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?reverse etl\b/.test(last) ||
    /\b(funnel analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?funnel analysis\b/.test(last) ||
    /\b(cohort analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cohort analysis\b/.test(last) ||
    /\b(product analytics)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?product analytics\b/.test(last) ||
    /\b(tracking plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?tracking plan\b/.test(last) ||
    /\b(instrumentation plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?instrumentation plan\b/.test(last) ||
    /\b(event taxonomy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?event taxonomy\b/.test(last) ||
    /\b(capacity planning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?capacity planning\b/.test(last) ||
    /\b(data mesh)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data mesh\b/.test(last) ||
    /\b(lakehouse)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lakehouse\b/.test(last) ||
    /\b(medallion architecture)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?medallion architecture\b/.test(last) ||
    /\b(streaming pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?streaming pipeline\b/.test(last) ||
    /\b(batch pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?batch pipeline\b/.test(last) ||
    /\b(data catalog)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data catalog\b/.test(last) ||
    /\b(data governance)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?data governance\b/.test(last) ||
    /\b(master data management)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?master data management\b/.test(last) ||
    /\b(customer data platform)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?customer data platform\b/.test(last) ||
    /\b(attribution model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?attribution model\b/.test(last) ||
    /\b(experimentation platform)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?experimentation platform\b/.test(last) ||
    // Natural planner phrasing wave 33 (people/talent/design/community/brand · demand gen residual)
    // Were generic lifecycle; bare "demand gen" / "talent pipeline" / "design system" miss.
    // "you're my people ops" is co-pilot (not plan). "what is the demand gen" is plan surface.
    // Avoid bare "abm"/"pmm"/"nps" alone as planner — too short; co-pilot uses those roles.
    /\b(demand gen plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?demand gen\b/.test(last) ||
    /\b(demand generation)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?demand generation\b/.test(last) ||
    /\b(lifecycle marketing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?lifecycle marketing\b/.test(last) ||
    /\b(abm program)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?abm program\b/.test(last) ||
    /\b(account[- ]?based marketing)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?account[- ]?based marketing\b/.test(last) ||
    /\b(crm hygiene)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?crm hygiene\b/.test(last) ||
    /\b(sales pipeline review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sales pipeline review\b/.test(last) ||
    /\b(product marketing plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?product marketing plan\b/.test(last) ||
    /\b(community calendar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?community calendar\b/.test(last) ||
    /\b(brand system)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?brand system\b/.test(last) ||
    /\b(design system)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?design system\b/.test(last) ||
    /\b(talent pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?talent pipeline\b/.test(last) ||
    /\b(hiring plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?hiring plan\b/.test(last) ||
    /\b(people ops roadmap)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?people ops roadmap\b/.test(last) ||
    /\b(recruiting funnel)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?recruiting funnel\b/.test(last) ||
    /\b(employee experience)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?employee experience\b/.test(last) ||
    /\b(employer branding)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?employer branding\b/.test(last) ||
    /\b(partnership pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?partnership pipeline\b/.test(last) ||
    /\b(channel strategy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?channel strategy\b/.test(last) ||
    /\b(editorial calendar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?editorial calendar\b/.test(last) ||
    /\b(content calendar)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?content calendar\b/.test(last) ||
    /\b(gtm motion)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?gtm motion\b/.test(last) ||
    /\b(go[- ]?to[- ]?market motion)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?go[- ]?to[- ]?market motion\b/.test(last) ||
    /\b(sales playbook)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sales playbook\b/.test(last) ||
    /\b(win\/?loss analysis)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?win\/?loss analysis\b/.test(last) ||
    /\b(icp definition)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?icp definition\b/.test(last) ||
    /\b(persona map)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?persona map\b/.test(last) ||
    /\b(messaging house)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?messaging house\b/.test(last) ||
    /\b(brand guidelines)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?brand guidelines\b/.test(last) ||
    /\b(style guide)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?style guide\b/.test(last) ||
    /\b(design tokens)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?design tokens\b/.test(last) ||
    /\b(component library)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?component library\b/.test(last) ||
    /\b(figma library)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?figma library\b/.test(last) ||
    /\b(community health)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?community health\b/.test(last) ||
    /\b(nps program)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?nps program\b/.test(last) ||
    /\b(csat survey)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?csat survey\b/.test(last) ||
    /\b(onboarding program)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?onboarding program\b/.test(last) ||
    /\b(offboarding checklist)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?offboarding checklist\b/.test(last) ||
    /\b(performance cycle)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?performance cycle\b/.test(last) ||
    /\b(comp review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?comp review\b/.test(last) ||
    /\b(headcount plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?headcount plan\b/.test(last) ||
    /\b(org design)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?org design\b/.test(last) ||
    /\b(succession plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?succession plan\b/.test(last) ||
    // Natural planner phrasing wave 34 (fundraising/IR/board/finance residual)
    // Were generic lifecycle; bare "fundraising plan" / "investor update" / "board deck" miss.
    // "you're my fundraising ops" is co-pilot (not plan). Avoid bare "ir"/"bd"/"qbr" alone.
    /\b(fundraising plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?fundraising plan\b/.test(last) ||
    /\b(investor update)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?investor update\b/.test(last) ||
    /\b(board deck)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?board deck\b/.test(last) ||
    /\b(board pack)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?board pack\b/.test(last) ||
    /\b(board meeting)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?board meeting\b/.test(last) ||
    /\b(cash runway)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cash runway\b/.test(last) ||
    /\b(unit economics)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?unit economics\b/.test(last) ||
    /\b(ltv\s*[:\/]?\s*cac|ltv cac)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(ltv\s*[:\/]?\s*cac|ltv cac)\b/.test(last) ||
    /\b(pitch deck)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pitch deck\b/.test(last) ||
    /\b(cap table)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cap table\b/.test(last) ||
    /\b(fp&a model|fpa model)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(fp&a model|fpa model)\b/.test(last) ||
    /\b(forecast call)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?forecast call\b/.test(last) ||
    /\b(meddic)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?meddic\b/.test(last) ||
    /\b(qbr plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?qbr plan\b/.test(last) ||
    /\b(mutual action plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?mutual action plan\b/.test(last) ||
    /\b(voice of customer)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?voice of customer\b/.test(last) ||
    /\b(user research plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?user research plan\b/.test(last) ||
    /\b(annual planning)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?annual planning\b/.test(last) ||
    /\b(pricing strategy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pricing strategy\b/.test(last) ||
    /\b(commission plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?commission plan\b/.test(last) ||
    /\b(deal review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?deal review\b/.test(last) ||
    /\b(customer advisory board)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?customer advisory board\b/.test(last) ||
    /\b(term sheet)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?term sheet\b/.test(last) ||
    /\b(fundraise pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?fundraise pipeline\b/.test(last) ||
    /\b(investor pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?investor pipeline\b/.test(last) ||
    /\b(burn multiple)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?burn multiple\b/.test(last) ||
    /\b(gross margin)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?gross margin\b/.test(last) ||
    /\b(contribution margin)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?contribution margin\b/.test(last) ||
    /\b(payback period)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?payback period\b/.test(last) ||
    /\b(sales territory)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sales territory\b/.test(last) ||
    /\b(quota plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?quota plan\b/.test(last) ||
    /\b(pipeline hygiene)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?pipeline hygiene\b/.test(last) ||
    /\b(discovery call)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?discovery call\b/.test(last) ||
    /\b(demo script)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?demo script\b/.test(last) ||
    /\b(packaging strategy)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?packaging strategy\b/.test(last) ||
    /\b(budget cycle)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?budget cycle\b/.test(last) ||
    /\b(p&l review|pnl review)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(p&l review|pnl review)\b/.test(last) ||
    /\b(cost center)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cost center\b/.test(last) ||
    /\b(seed round plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?seed round plan\b/.test(last) ||
    /\b(series a plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?series a plan\b/.test(last) ||
    /\b(convertible note)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?convertible note\b/.test(last) ||
    /\b(safe note)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?safe note\b/.test(last) ||
    // Natural planner wave 35 (finance residual after 34; generic lifecycle miss)
    /\b(dilutive round plan|non-dilutive plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(dilutive round plan|non-dilutive plan)\b/.test(last) ||
    /\b(safe agreement)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?safe agreement\b/.test(last) ||
    /\b(board cadence)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?board cadence\b/.test(last) ||
    /\b(revenue forecast)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?revenue forecast\b/.test(last) ||
    /\b(cohort retention plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?cohort retention plan\b/.test(last) ||
    // Natural planner wave 35 residual (partner/sales/growth — generic lifecycle miss)
    /\b(partner pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?partner pipeline\b/.test(last) ||
    /\b(channel partner plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?channel partner plan\b/.test(last) ||
    /\b(sales forecast)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?sales forecast\b/.test(last) ||
    /\b(growth accounting)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?growth accounting\b/.test(last) ||
    // Natural planner wave 36 residual (gtm/growth/bd — generic lifecycle miss)
    // Wave 37: sales plan + go-to-market (spelled) parity with gtm plan (was generic lifecycle)
    /\b(gtm plan|growth plan|partnership plan|bd plan|sales plan|go[- ]?to[- ]?market plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(gtm plan|growth plan|partnership plan|bd plan|sales plan|go[- ]?to[- ]?market plan)\b/.test(last) ||
    /\b(account plan|arr plan|mrr plan|retention plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(account plan|arr plan|mrr plan|retention plan)\b/.test(last) ||
    /\b(outbound plan|inbound plan|product roadmap)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(outbound plan|inbound plan|product roadmap)\b/.test(last) ||
    // Natural planner wave 38 residual (gtm/marketing — generic lifecycle miss)
    /\b(marketing plan|content plan|enablement plan|abm plan|plg plan|recruiting plan|revops plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(marketing plan|content plan|enablement plan|abm plan|plg plan|recruiting plan|revops plan)\b/.test(last) ||
    // Natural planner wave 39 residual (alliance/contract — generic lifecycle miss; probe /tmp fixture)
    /\b(alliance plan|contract review plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(alliance plan|contract review plan)\b/.test(last) ||
    // Natural planner wave 40 residual (ecosystem/strategy forms — generic lifecycle miss; /tmp probe)
    // deal desk · integration · marketplace · pricing · customer success · * strategy (not plan-only)
    /\b(ecosystem plan|deal desk plan|integration plan|marketplace plan|pricing plan|customer success plan)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(ecosystem plan|deal desk plan|integration plan|marketplace plan|pricing plan|customer success plan)\b/.test(
      last,
    ) ||
    /\b(go[- ]?to[- ]?market strategy|sales strategy|partnership strategy|enablement strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(go[- ]?to[- ]?market strategy|sales strategy|partnership strategy|enablement strategy)\b/.test(
      last,
    ) ||
    // Natural planner wave 41 residual (growth/product/partner strategy + expansion plans — generic lifecycle miss; /tmp probe)
    /\b(growth strategy|retention strategy|product strategy|partner strategy|expansion plan|community plan|platform plan|onboarding plan)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(growth strategy|retention strategy|product strategy|partner strategy|expansion plan|community plan|platform plan|onboarding plan)\b/.test(
      last,
    ) ||
    // Natural planner wave 42 residual (gtm/content/brand strategy + pilot/outreach/invite/rsvp — lifecycle miss; /tmp probe)
    /\b(gtm strategy|content strategy|brand strategy|community strategy|talent strategy|pilot plan|outreach plan|invite plan|rsvp plan|pipeline plan|activation plan|referral plan)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(gtm strategy|content strategy|brand strategy|community strategy|talent strategy|pilot plan|outreach plan|invite plan|rsvp plan|pipeline plan|activation plan|referral plan)\b/.test(
      last,
    ) ||
    // Natural planner wave 43 residual (event-ops plans/strategies — lifecycle miss; /tmp probe)
    /\b(volunteer plan|sponsor plan|venue plan|debrief plan|follow-up plan|waitlist plan|seating plan|pr plan|media plan|press plan|comms plan|brand plan|talent plan|agenda plan|check-in plan|guest list plan)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(volunteer plan|sponsor plan|venue plan|debrief plan|follow-up plan|waitlist plan|seating plan|pr plan|media plan|press plan|comms plan|brand plan|talent plan|agenda plan|check-in plan|guest list plan)\b/.test(
      last,
    ) ||
    /\b(event strategy|sponsor strategy|venue strategy|volunteer strategy|demand gen strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(event strategy|sponsor strategy|venue strategy|volunteer strategy|demand gen strategy)\b/.test(
      last,
    ) ||
    // Natural planner wave 44 residual (event-ops *strategy* + night-of plan parity w/ wave 43 *plan*; /tmp probe)
    /\b(debrief strategy|follow-up strategy|waitlist strategy|seating strategy|pr strategy|media strategy|press strategy|comms strategy|brand strategy|talent strategy|agenda strategy|check-in strategy|guest list strategy|day[- ]?of strategy|load[- ]?in strategy|night[- ]?of plan)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(debrief strategy|follow-up strategy|waitlist strategy|seating strategy|pr strategy|media strategy|press strategy|comms strategy|brand strategy|talent strategy|agenda strategy|check-in strategy|guest list strategy|day[- ]?of strategy|load[- ]?in strategy|night[- ]?of plan)\b/.test(
      last,
    ) ||
    // Natural planner wave 45 residual (night-of strategy + load-out/door/catering/av/photo/speaker/vip/security — lifecycle miss; /tmp probe)
    // Wave 46: *strategy* parity for wave-45 *plan*-only terms (catering/av/registration/security/contingency/rain/accessibility)
    // Wave 47: load-in plan parity (wave 44 has load-in strategy; wave 45 had load-out plan only)
    /\b(night[- ]?of strategy|load[- ]?in plan|load[- ]?out plan|load[- ]?out strategy|door plan|door strategy|catering plan|catering strategy|av plan|av strategy|photo plan|photo strategy|registration plan|registration strategy|speaker plan|speaker strategy|vip plan|vip strategy|security plan|security strategy|contingency plan|contingency strategy|rain plan|rain strategy|accessibility plan|accessibility strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(night[- ]?of strategy|load[- ]?in plan|load[- ]?out plan|load[- ]?out strategy|door plan|door strategy|catering plan|catering strategy|av plan|av strategy|photo plan|photo strategy|registration plan|registration strategy|speaker plan|speaker strategy|vip plan|vip strategy|security plan|security strategy|contingency plan|contingency strategy|rain plan|rain strategy|accessibility plan|accessibility strategy)\b/.test(
      last,
    ) ||
    // Wave 48: event-ops residual (setup/teardown/staffing/signage/parking/wifi — generic lifecycle miss; /tmp probe)
    // No invent RSVPs; SF stamp via statusOwnerBits tickPlan lead
    /\b(setup plan|teardown plan|staffing plan|signage plan|parking plan|wifi plan)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(setup plan|teardown plan|staffing plan|signage plan|parking plan|wifi plan)\b/.test(
      last,
    ) ||
    // Wave 49: *strategy* parity for wave-48 *plan*-only terms (lifecycle miss; /tmp probe)
    /\b(setup strategy|teardown strategy|staffing strategy|signage strategy|parking strategy|wifi strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(setup strategy|teardown strategy|staffing strategy|signage strategy|parking strategy|wifi strategy)\b/.test(
      last,
    ) ||
    // Wave 50: transport/logistics/hospitality plan+strategy (lifecycle miss; /tmp probe; no invent RSVPs)
    /\b(transport plan|logistics plan|hospitality plan|transport strategy|logistics strategy|hospitality strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(transport plan|logistics plan|hospitality plan|transport strategy|logistics strategy|hospitality strategy)\b/.test(
      last,
    ) ||
    // Wave 51: merch/coat-check/floor/shuttle/vendor/cleanup plan+strategy (lifecycle miss; /tmp probe)
    /\b(merch plan|coat[- ]?check plan|floor plan|shuttle plan|vendor plan|cleanup plan|merch strategy|coat[- ]?check strategy|floor strategy|shuttle strategy|vendor strategy|cleanup strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(merch plan|coat[- ]?check plan|floor plan|shuttle plan|vendor plan|cleanup plan|merch strategy|coat[- ]?check strategy|floor strategy|shuttle strategy|vendor strategy|cleanup strategy)\b/.test(
      last,
    ) ||
    // Wave 52: badge/swag/production/wayfinding/bag-check/photo-booth/green-room strategy + beverage/dietary/emcee (lifecycle miss; /tmp probe; no invent RSVPs)
    /\b(badge plan|badge strategy|swag plan|swag strategy|production plan|production strategy|wayfinding plan|wayfinding strategy|bag[- ]?check plan|bag[- ]?check strategy|photo[- ]?booth plan|photo[- ]?booth strategy|green room plan|green room strategy|beverage plan|beverage strategy|dietary plan|dietary strategy|emcee plan|emcee strategy|cloakroom plan|cloakroom strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(badge plan|badge strategy|swag plan|swag strategy|production plan|production strategy|wayfinding plan|wayfinding strategy|bag[- ]?check plan|bag[- ]?check strategy|photo[- ]?booth plan|photo[- ]?booth strategy|green room plan|green room strategy|beverage plan|beverage strategy|dietary plan|dietary strategy|emcee plan|emcee strategy|cloakroom plan|cloakroom strategy)\b/.test(
      last,
    ) ||
    // Wave 53: production A/V + tech-rehearsal plans (lifecycle miss; /tmp fixture; no invent RSVPs)
    /\b(mic plan|mic strategy|sound plan|sound strategy|lighting plan|lighting strategy|backline plan|backline strategy|tech rehearsal plan|tech rehearsal strategy|soundcheck plan|soundcheck strategy|stage plot plan|stage plot strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(mic plan|mic strategy|sound plan|sound strategy|lighting plan|lighting strategy|backline plan|backline strategy|tech rehearsal plan|tech rehearsal strategy|soundcheck plan|soundcheck strategy|stage plot plan|stage plot strategy)\b/.test(
      last,
    ) ||
    // Wave 54: livestream plan/strategy = SF day-of AV (agent NON_SF false-hits bare livestream; /tmp probe; no invent RSVPs)
    // residual: runbook|checklist|pipeline parity livestreamOpsPlan non-SF exception → Owner tick plan
    /\b(livestream plan|livestream strategy|livestream runbook|livestream checklist|livestream pipeline)\b/.test(last) ||
    /\bwhat(?:'s| is) (the )?(livestream plan|livestream strategy|livestream runbook|livestream checklist|livestream pipeline)\b/.test(last) ||
    // Wave 55: hybrid/recording/overflow + permit/insurance/ADA + power/rigging/stream/cue (lifecycle miss; /tmp probe; no invent RSVPs)
    /\b(hybrid plan|hybrid strategy|recording plan|recording strategy|overflow plan|overflow strategy|permit plan|permit strategy|insurance plan|insurance strategy|ada plan|ada strategy|power plan|power strategy|rigging plan|rigging strategy|stream plan|stream strategy|cue plan|cue strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(hybrid plan|hybrid strategy|recording plan|recording strategy|overflow plan|overflow strategy|permit plan|permit strategy|insurance plan|insurance strategy|ada plan|ada strategy|power plan|power strategy|rigging plan|rigging strategy|stream plan|stream strategy|cue plan|cue strategy)\b/.test(
      last,
    ) ||
    // Wave 56: fire/egress/occupancy/crowd + capacity plan|strategy + arrival/departure/welcome (lifecycle miss; /tmp probe; no invent RSVPs)
    // residual: capacity plan parity (strategy-only was lifecycle miss; /tmp probe; no invent RSVPs)
    /\b(fire plan|fire strategy|fire marshal plan|egress plan|egress strategy|occupancy plan|occupancy strategy|crowd plan|crowd strategy|capacity plan|capacity strategy|arrival plan|arrival strategy|departure plan|departure strategy|welcome plan|welcome strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(fire plan|fire strategy|fire marshal plan|egress plan|egress strategy|occupancy plan|occupancy strategy|crowd plan|crowd strategy|capacity plan|capacity strategy|arrival plan|arrival strategy|departure plan|departure strategy|welcome plan|welcome strategy)\b/.test(
      last,
    ) ||
    // Wave 57: guest-flow/queue/networking + fire-marshal strategy parity + afterparty/mixer (lifecycle miss; /tmp probe; no invent RSVPs)
    // afterparty before bare party ideate path; fire marshal strategy parity with wave-56 plan-only
    // Wave 59: toast/opening-remarks *strategy* parity (plan-only was lifecycle miss; /tmp probe)
    /\b(fire marshal strategy|guest flow plan|guest flow strategy|queue plan|queue strategy|networking plan|networking strategy|icebreaker plan|icebreaker strategy|mixer plan|mixer strategy|after[- ]?party plan|after[- ]?party strategy|host script plan|host script strategy|toast plan|toast strategy|opening remarks plan|opening remarks strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(fire marshal strategy|guest flow plan|guest flow strategy|queue plan|queue strategy|networking plan|networking strategy|icebreaker plan|icebreaker strategy|mixer plan|mixer strategy|after[- ]?party plan|after[- ]?party strategy|host script plan|host script strategy|toast plan|toast strategy|opening remarks plan|opening remarks strategy)\b/.test(
      last,
    ) ||
    // Wave 58: bizdev/IR/corp-dev + special-projects/procurement/capital markets plan
    // (co-pilot role phrases exist; bare *plan surface was lifecycle; /tmp probe; no invent RSVPs)
    // Wave 59: *strategy* parity for wave-58 *plan*-only terms
    /\b(bizdev plan|bizdev strategy|business development plan|business development strategy|investor relations plan|investor relations strategy|corp dev plan|corp dev strategy|corporate development plan|corporate development strategy|special projects plan|special projects strategy|procurement plan|procurement strategy|capital markets plan|capital markets strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(bizdev plan|bizdev strategy|business development plan|business development strategy|investor relations plan|investor relations strategy|corp dev plan|corp dev strategy|corporate development plan|corporate development strategy|special projects plan|special projects strategy|procurement plan|procurement strategy|capital markets plan|capital markets strategy)\b/.test(
      last,
    ) ||
    // Wave 60: runsheet/call-time/usher/greeter/lanyard + glued checkin + spaced check in (lifecycle miss; /tmp probe; no invent RSVPs)
    /\b(runsheet plan|runsheet strategy|run sheet plan|run sheet strategy|call[- ]?time plan|call[- ]?time strategy|usher plan|usher strategy|greeter plan|greeter strategy|lanyard plan|lanyard strategy|checkin plan|checkin strategy|check in plan|check in strategy)\b/.test(
      last,
    ) ||
    /\bwhat(?:'s| is) (the )?(runsheet plan|runsheet strategy|run sheet plan|run sheet strategy|call[- ]?time plan|call[- ]?time strategy|usher plan|usher strategy|greeter plan|greeter strategy|lanyard plan|lanyard strategy|checkin plan|checkin strategy|check in plan|check in strategy)\b/.test(
      last,
    )
  );
}

/** Count / attendance questions — always null-honest, never invent. */
function isRsvpCountAsk(last) {
  return (
    /\b(how many|headcount|guest count|rsvp count|how many rsvps?|door tally|attendance)\b/.test(last) ||
    /\b(confirmed|attended|attending|coming)\b/.test(last) ||
    /\b(people|guests|rsvps?)\b.{0,20}\b(confirmed|attending|coming|yes)\b/.test(last)
  );
}

function offlineReply(messages, opts = {}) {
  const last = normalizeUserChatText(messages[messages.length - 1]?.content || '');
  const snap = snapshotLine();
  let plan = opts.plan || null;
  try {
    if (!plan) plan = planTickNext(loadStore());
  } catch {
    /* optional */
  }
  // Prefer planTickNext stage/title so head matches Owner tick plan body
  const head = ownerHead(snap, plan);
  const next = nextLine({ ...opts, plan });

  // Co-pilot reclaim before non-SF — "you're my virtual assistant" must not false-decline via virtual/remote
  if (isHostCopilotAsk(last)) {
    // Gate/focus/gaps/drain/rsvp now via statusOwnerBits({ tickPlan: true }) below
    const roleBit =
      /\b(role|tasks|assign|just show up|assistant|help me host|run everything|coordinator|sidekick|mc|staff|backup host|front of house|human host|producer|logistics|stage[- ]?manage|event manager|floor manager|number two|number 2|second chair|figurehead|ops lead|deputy|greeter|public face|understudy|name on the invite|showrunner|stagehand|crew chief|right hand|right[- ]hand man|wrangler|exec producer|executive producer|ep|back of house|boh|foh|backstage|ceremonial host|celebrity host|dirty work|behind the scenes|fixer|roadie|handler|technical director|td|guest of honor|back office|quarterback|air traffic controller|air traffic control|star|celebrity|show my face|chief of staff|wingman|concierge|butler|vip|body man|adjutant|aide|headliner|keynote|marquee|billboard|day[- ]?of lead|heavy lifting|glad[- ]?hand|personal assistant|pit crew|pit boss|advance man|advance team|bag man|sherpa|man friday|factotum|valet|intern|gofer|runner|speechify|ribbon cutter|photo ops|campaign manager|scheduler|production assistant|floor captain|house manager|stage manager|proxy host|backline|gaffer|face of the brand|handler of record|keynote speaker|majordomo|batman|entourage|guest speaker|travel agent|bodyguard|pr person|pr lead|booking agent|talent manager|publicist|sommelier|night manager|event staff|scribe|stenographer|green room|hospitality lead|emcee coach|pose|smile and wave|cut cake|on camera|ops team|production team|production company|booker|treat me like talent|show up|event agency|agency|ghost producer|external ops|network|schmooze|mingle|work the room|support staff|white[- ]?glove|treat me like vip|vibes|operator|event ops|ops desk|engine room|ground control|mission control|hold court|work the crowd|do the room|do the work|event admin|admin|production desk|spreadsheet|the machine|night ops|field ops|backstop|air cover|treat me like the face|control tower|war room|event engine|production engine|ops engine|night engine|content engine|kitchen|secretariat|chief of ops|number cruncher|boiler room|human crm|\bcrm\b|rolodex|switchboard|work the door|door staff|house staff|take photos|silent partner|full[- ]?stack ops|treat me like the marquee|be the face|be the talent|autopilot|event os|operating system|command center|production brain|ops brain|night brain|logistics ai|ops ai|event ai|backend|stack|infra|body double|stand[- ]?in|surrogate host|front desk|reception|clipboard|checklist monkey|errand runner|digital twin|co[- ]?host bot|glue|duct tape|bridge|smile for|pose for|charisma|charming|shake hands|remote control|puppet master|stage director|ghost host|phantom host|proxy|event robot|night secretary|virtual assistant|calendar bot|chat ?bot host|ghostwriter|siri for|alexa for|chatgpt for|outsource|talking|perform|brand|look good|take (the )?credit|take bows?|middleware|orchestration|workflow|zapier|\bn8n\b|\brpa\b|invisible hand|phantom organizer|teleprompter|understudy bot|event butler|night butler|personal ops|just software|mingle|work the floor|take the stage|take the plan|vibes|second brain|external brain|process engine|automation layer|staging manager|backstage manager|staging crew|secret weapon|ai host|a\.?i\.? host|execute|run the machine|run the room|decision engine|planning layer|execution engine|coordination layer|knowledge layer|systems layer|prep engine|runbook engine|checklist engine|auto[- ]?organizer|event twin|ops twin|neural net|staff ai|event ai|ai organizer|front|back|people|systems|socialize|organize|perform|prepare|show up|run (the )?ops|strategy engine|routing layer|policy engine|state machine|agent runtime|agent loop|agent harness|context window|prompt chain|working memory|ops cortex|planning cortex|executive function|thinking partner|sparring partner|just (the |an |my )?agent|face[- ]?time|work the guests|work the plan|soft skills|hard ops|take (the )?meetings|do (the )?meetings|run (the )?system|orchestration engine|reasoning engine|inference engine|tool router|tool caller|memory layer|retrieval layer|rag layer|planner agent|executor agent|supervisor agent|chain of thought|react loop|llm backbone|model layer|just (the |an |my )?(llm|l\.?l\.?m\.?|model)|network(ing)?|relationships?|vibes|logistics|multi[- ]?agent swarm|agent mesh|agent orchestra|worker pool|function[- ]?calling layer|tool[- ]?use layer|skill router|prompt cache|vector store|embeddings? layer|agent framework|computer[- ]?use agent|browser agent|knowledge graph|knowledge base|system prompt|guardrail(s)? layer|eval harness|mcp server|tool registry|agent sandbox|scorecard engine|judge model|hospitality|community|people|process|culture|hang|stack|room)\b/.test(
        last,
      )
        ? " Your optional role is fuel (venue/sponsor/volunteer/constraints) — not running my checklist."
        : '';
    // Gate open|held(+unlock) so reclaim names the same unlock as Owner tick plan
    // roleBit covers waves 1–25; wave-26…34 infra roles use same fuel line when matched above
    // (toolformer…people ops/fundraising ops also hit isHostCopilotAsk — extend match)
    const roleBit26 =
      !roleBit &&
      /\b(toolformer|action space|observation space|reward model|preference model|constitution|safety layer|content filter|moderation layer|rate limiter|queue worker|job runner|worker agent|sidecar|daemon|watchdog|event bus|message bus|pub[-/ ]?sub|service mesh|api gateway|load balancer|plumbing|work (the )?infra|do (the )?infra|run (the )?infra|cron job|circuit breaker|retry queue|feature flag|canary|blue[- ]?green|chaos monkey|observability layer|tracing layer|metrics pipeline|log aggregator|secret store|vault|config server|service discovery|schmooze|backend|work (the )?face|do (the )?face|do (the )?brand|\bsre\b|platform engineer|on[- ]?call|pager|health check|readiness probe|liveness probe|autoscaler|kubernetes|\bk8s\b|terraform|edge proxy|\bwaf\b|runbook bot|incident commander|work (the )?platform|do (the )?platform|run (the )?platform|socialize|deploy|vibes|devops|ci\/?cd|cicd|gitops|helm|argo(cd)?|prometheus|grafana|datadog|pagerduty|reliability engineer|release engineer|build engineer|chaos engineer|platform ops|infra as code|monitor|alert|fleet|scale|remediate|reliability|secops|appsec|mlops|dataops|finops|aiops|security engineer|qa engineer|test engineer|cloud architect|solutions architect|network engineer|\bdba\b|observability engineer|compliance officer|blue team|red team|\bsoc\b|pentester|threat modeler|product ops|revops|bizops|growth engineer|secure|security|scan|harden|audit|compliance|devsecops|netops|cloudops|itops|sysops|privacy engineer|\bdpo\b|legalops|legal ops|\bgrc\b|ciso|security architect|platform security|iam engineer|encrypt|firewall|patch|rotate secrets|data engineer|analytics engineer|bi engineer|platform pm|\btpm\b|program manager|customer success|support ops|marketing ops|content ops|growth ops|revenue ops|sales ops|enablement|solutions engineer|success engineer|warehouse|pipeline|etl|analytics|transform|people ops|peopleops|talent ops|talentops|design ops|designops|community ops|brand ops|partnership ops|partnerships ops|recruiting ops|talent acquisition|demand gen|demand generation|product marketing|\bpmm\b|lifecycle ops|\babm\b|hr ops|creative ops|editorial ops|channel ops|cx ops|retention ops|employer brand|recruit|hire|source|talent pipeline|fundraising ops|investor relations|board ops|field marketing|event marketing|bizdev|business development|corp dev|corporate development|\bfpa\b|fp&a|finance ops|founder ops|venture ops|special projects|office ops|facilities ops|vendor ops|procurement|capital markets|fundraise|raise|pitch)\b/.test(
        last,
      )
        ? " Your optional role is fuel (venue/sponsor/volunteer/constraints) — not running my checklist."
        : '';
    // Reuse statusOwnerBits tickPlan lead + tickPipelineBit (parity isTickPlanAsk) so reclaim
    // always numbers Pipeline (1)… incl. unlock fallback when next[] empty — no multi-only gap.
    const pipe = tickPipelineBit(plan, 3);
    return (
      head +
      "I'm the organizer of record — **not** a host co-pilot or assistant. I drive the SF night through plans, drafts, queues, and runbooks; real sends, bookings, attendance, and day-of actions stay evidence-gated. You can offer venue/sponsor/volunteer fuel or constraints." +
      (roleBit || roleBit26) +
      // Space before tickLead — reclaim body ends with period; no double-join glue
      ' ' +
      statusOwnerBits(plan, snap, { tickPlan: true }) +
      (pipe || opts.skipNext ? '' : next) +
      pipe
    );
  }
  // Same NON_SF list as agent isSfLocation (SSF, peninsula, Brooklyn, …) — not a short local regex
  // residual: bare "livestream" matches agent NON_SF optional group — plan|strategy is SF day-of AV ops
  const livestreamOpsPlan = /\blivestream (plan|strategy|runbook|checklist|pipeline|next steps)\b/.test(
    last,
  );
  if ((mentionsNonSf(last) && !livestreamOpsPlan) || /\b(another city|outside sf)\b/.test(last)) {
    return (
      "I only produce **San Francisco** in-person nights. Non-SF rooms are out of scope. Give me an SF window and I'll plan around it." +
      (opts.skipNext ? '' : nextLine({ plan, skipWhy: true }))
    );
  }
  // Explicit tick-plan / drain / owner-plan asks — full planTickNext surface (no drive spin)
  if (isTickPlanAsk(last)) {
    // Numbered pipeline is the agent-tick plan (primary = (1)). Skip **Next:** when
    // pipeline is present so we don't double the same "I'll …" line; whyNow lives in Owner focus.
    const pipe = tickPipelineBit(plan);
    return (
      head +
      statusOwnerBits(plan, snap, { tickPlan: true }) +
      (pipe || opts.skipNext ? '' : next) +
      pipe
    );
  }
  if (isInboundResourceFuel(last)) {
    return (
      head +
      "I'll take that as fuel for the active SF night — I own venue/sponsor/volunteer matching. Drop name + email + what you can host or fund (or use Sponsor · Venue · Volunteer on the page). I attach offers and queue anything still missing. No auto-booking; no fake sends." +
      next
    );
  }
  if (/ideate|what kind|type of event|dinner|party|salon|hack|plan (an |a )?event|run (an |a )?event|start over|what is your job|who are you|what do you do/.test(last)) {
    return (
      head +
      "I'm the organizer of record for SF nights: I invent, resource, plan, draft RSVP structure and runbooks, queue follow-up, and debrief from real outcomes. Example: \"40-person SoMa party, free venue + drink sponsor\" and I drive the workflow. Real sends, bookings, attendance, and day-of actions stay evidence-gated." +
      next
    );
  }
  if (/date|when|schedule|calendar/.test(last)) {
    return head + 'I keep SF date windows on the active night. Give me 1–3 timezone-aware future starts (YYYY-MM-DDTHH:MM:SS-07:00) and I update the plan.' + next;
  }
  if (/\b(sponsor|money|stripe|tab sponsor|drink sponsor|fund)\b/.test(last)) {
    return (
      head +
      "I recruit sponsors for the active SF night. Money = intent while Stripe is pending (no card-capture claim). I queue outreach drafts only — never claim a send, booking, or exclusivity." +
      next
    );
  }
  if (/\b(venue|room|space|office|loft|book a room|find a venue|need a venue)\b/.test(last)) {
    return (
      head +
      "I own SF venue: free-list shortlist + inbound offers. Free shortlist is heuristic — **not booked**. No auto-booking; I attach real offers when they land." +
      gapsBit(plan) +
      next +
      pipelineBit(plan, 1)
    );
  }
  // Volunteer demand (not inbound fuel) — owner recruits, drafts only
  if (
    /\b(volunteer|door help|setup help|day-?of help|find (me )?volunteers?|need (a )?volunteer)\b/.test(
      last,
    )
  ) {
    return (
      head +
      "I recruit volunteers for the active SF night (door/setup/run-of-show). I queue asks as drafts only — never claim a send or invent headcount. You can also offer to volunteer as fuel." +
      gapsBit(plan) +
      next +
      pipelineBit(plan, 1)
    );
  }
  // Partiful / Luma / invite URL — drafts only, never invent links or RSVP counts
  if (/\b(partiful|luma)\b/.test(last) || /\binvite (url|link)\b/.test(last)) {
    return (
      head +
      "I draft Partiful/Luma paste packages only — I never invent invite URLs or RSVP counts. When a real partiful.com link exists, paste it on the outbox **Invite URL:** line and I'll absorb it (no fabricate, no fake RSVPs)." +
      rsvpHonestyBit(plan) +
      next +
      pipelineBit(plan, 1)
    );
  }
  // Count/attendance asks lead with null honesty (never invent), then structure
  if (isRsvpCountAsk(last) || /guest|invite|list|who|rsvp|remind/.test(last)) {
    const countLead = isRsvpCountAsk(last)
      ? "I don't invent headcounts. **No fake RSVPs** — invited/confirmed/attended stay **null** until real replies or a door tally. "
      : '';
    return (
      head +
      countLead +
      "I draft invite copy, open RSVP tally structure, and queue T-3d/T-1d reminders. Drafts stay queued until send transport is live." +
      rsvpHonestyBit(plan) +
      next +
      pipelineBit(plan, 1)
    );
  }
  if (/agenda|run.?of.?show|day.?of|checklist/.test(last)) {
    return (
      head +
      "I own the agenda and day-of checklist on the active SF event. I print the host frame when we hit run — attendance stays null until a real door tally." +
      rsvpHonestyBit(plan) +
      next
    );
  }
  if (/follow|thank|intro|debrief|feedback|next cycle|after/.test(last)) {
    return (
      head +
      'After the night I queue thank-yous, collect feedback, note mutual interest (intros only on mutual yes), debrief from real attendance, and seed the next SF cycle. No invent RSVPs.' +
      rsvpHonestyBit(plan) +
      next
    );
  }
  // Status / progress — same Owner tick plan surface as isTickPlanAsk (SF + gate + Pipeline)
  if (
    /\bstatus\b|what are you doing|progress|where are we/.test(last) ||
    /\bwhat(?:'s| is) next\b/.test(last) ||
    /\bwhere(?:'s| is) (the )?(night|event|plan)\b/.test(last)
  ) {
    // Numbered Pipeline primary=(1); skip duplicate **Next:** when pipe present
    const pipe = tickPipelineBit(plan);
    return (
      head +
      statusOwnerBits(plan, snap, { tickPlan: true }) +
      (pipe || opts.skipNext ? '' : next) +
      pipe
    );
  }
  return (
    head +
    'I own the SF event workflow as organizer: Ideate → Resource → Plan → RSVP draft → Runbook → Follow-up queue → Debrief → next. Real sends, bookings, attendance, and day-of actions stay evidence-gated. Offer a venue/sponsor/volunteer or say "drive the next night".' +
    stageReadyBit(plan) +
    next +
    pipelineBit(plan, 1)
  );
}

/** Lightweight: if user asks bot to drive/plan, run offline drive_cycle and summarize. */
async function maybeDrive(lastUserText) {
  const t = normalizeUserChatText(lastUserText);
  // Co-pilot / tick-plan surface / "should I run the room?" are not drive requests
  if (isHostCopilotAsk(t) || isTickPlanAsk(t)) return null;
  // Intentional produce language only — bare "run the room" / "should I run" must not spin a cycle
  const wantsDrive =
    /\b(drive|spin up|full.?cycle|take it from here|go ahead)\b/.test(t) ||
    /\brun the (next|cycle|night|event|dinner|party|salon)\b/.test(t) ||
    /\bplan (the |an |a )?(next |sf )?(night|event|dinner|party|salon)\b/.test(t) ||
    /\bstart (a |an )?(new )?(sf )?(night|event|dinner)\b/.test(t) ||
    /\borganize (a |an |the )?(sf )?(night|event|dinner)\b/.test(t) ||
    /\bproduce (a |an |the )?(sf )?(night|event|dinner)\b/.test(t);
  if (!wantsDrive) return null;
  try {
    const driven = runTool('drive_cycle', { goal: lastUserText });
    return driven;
  } catch {
    return null;
  }
}

/**
 * Host-attested debrief counts ("attended 9, 4 mutual pairs") → record_debrief.
 * Never invents numbers; tool enforces followup|debrief + no auto mode.
 */
function maybeRecordDebrief(lastUserText) {
  const evidence = parseDebriefEvidence(lastUserText);
  if (!evidence) return null;
  try {
    const store = loadStore();
    if (!store.activeEvent?.id) {
      return {
        ok: false,
        summary:
          "No active SF night to attach outcomes to — after a real night I'll record host-attested counts at followup/debrief.",
        debrief: { ok: false, error: 'no_active_event' },
      };
    }
    const result = runTool('record_debrief', evidence);
    if (!result?.ok) {
      return {
        ok: false,
        summary:
          result?.message ||
          result?.error ||
          "I couldn't record those outcomes yet (need followup/debrief stage + host-attested ints).",
        debrief: result,
        plan: planTickNext(loadStore()),
      };
    }
    const o = result.outcomes || {};
    const bits = [];
    if (o.attended != null) bits.push(`attended **${o.attended}**`);
    if (o.confirmed != null) bits.push(`confirmed **${o.confirmed}**`);
    if (o.invited != null) bits.push(`invited **${o.invited}**`);
    if (o.mutualInterestPairs != null) bits.push(`mutual pairs **${o.mutualInterestPairs}**`);
    if (o.secondMeetings != null) bits.push(`second meetings **${o.secondMeetings}**`);
    const plan = planTickNext(loadStore());
    return {
      ok: true,
      summary:
        `I recorded host-attested outcomes` +
        (bits.length ? `: ${bits.join(', ')}` : '') +
        `. Omitted counts stay null (no invent).` +
        ownerPlanSuffix(plan),
      plan,
      debrief: result,
      resources: runTool('list_resources', {}),
    };
  } catch {
    return null;
  }
}

/**
 * "seed the next night" at debrief → seed_next_from_debrief (no invent attendance).
 */
function maybeSeedNext(lastUserText) {
  const intent = parseSeedNextIntent(lastUserText);
  if (intent == null) return null;
  try {
    const store = loadStore();
    if (!store.activeEvent?.id) {
      return {
        ok: false,
        summary:
          "No active SF night to close — after debrief with real outcomes I'll seed the next idea and clear active.",
        seed: { ok: false, error: 'no_active_event' },
      };
    }
    const args = {};
    if (intent.title) args.title = intent.title;
    const result = runTool('seed_next_from_debrief', args);
    if (!result?.ok) {
      return {
        ok: false,
        summary:
          result?.message ||
          result?.error ||
          "I couldn't seed the next night yet (need debrief stage + host-attested outcomes first).",
        seed: result,
        plan: planTickNext(loadStore()),
      };
    }
    const plan = planTickNext(loadStore());
    const ideaTitle = result.idea?.title || 'next SF night';
    return {
      ok: true,
      summary:
        `I archived the night, recorded next idea **${ideaTitle}**, and cleared activeEvent.` +
        ` spin_up_event when you're ready to start it. No invent attendance.` +
        ownerPlanSuffix(plan),
      plan,
      seed: result,
      resources: runTool('list_resources', {}),
    };
  } catch {
    return null;
  }
}

/**
 * Lifecycle stage advance when host language/evidence asks for a stage.
 * Fail-closed one-step gates; fill early artifacts when targeting plan/rsvp.
 */
function maybeAdvanceStage(lastUserText) {
  const t = normalizeUserChatText(lastUserText);
  // Tick-plan / drain asks are read-only plan surface — never stage-walk
  if (isTickPlanAsk(t) || isHostCopilotAsk(t)) return null;
  const target = parseStageAdvanceIntent(lastUserText);
  if (!target) return null;
  try {
    const store = loadStore();
    if (!store.activeEvent?.id) {
      // Spin via drive first when no night exists and they asked for early stages
      if (['ideate', 'resource', 'plan', 'rsvp'].includes(target)) {
        const driven = runTool('drive_cycle', { goal: lastUserText });
        return {
          ok: !!driven?.ok,
          summary: driven?.summary || null,
          plan: driven?.plan || null,
          resources: driven?.resources || null,
          advanced: {
            ok: !!driven?.ok,
            stage: driven?.resources?.activeEvent?.stage || null,
            to: target,
            via: 'drive_spin',
          },
        };
      }
      return {
        ok: false,
        summary: "No active SF night yet — say drive the next night and I'll spin one up, then we can advance stages.",
        advanced: { ok: false, error: 'no_active_event', to: target },
      };
    }
    const walked = advanceLifecycleToward(target, {
      note: 'chat: ' + String(lastUserText || '').slice(0, 100),
      goal: lastUserText,
      fill: STAGES_EARLY.has(target),
    });
    const ae = loadStore().activeEvent || {};
    const plan = planTickNext(loadStore());
    const nextBit = ownerPlanSuffix(plan);
    const summary =
      walked.ok || walked.overshot
        ? `I advanced the night toward **${target}** · now stage **${ae.stage || '?'}**` +
          (ae.venue?.name ? ` · venue **${ae.venue.name}**` : '') +
          (walked.overshot ? ' (evidence already supported a later stage).' : '.') +
          nextBit
        : `I couldn't reach **${target}** yet` +
          (walked.error ? ` (${walked.error})` : '') +
          (walked.blockedAt ? ` — blocked before **${walked.blockedAt}**` : '') +
          `. Holding at **${ae.stage || 'ideate'}**.` +
          nextBit;
    return {
      ok: !!walked.ok,
      summary,
      plan,
      resources: runTool('list_resources', {}),
      advanced: walked,
    };
  } catch {
    return null;
  }
}

const STAGES_EARLY = new Set(['ideate', 'resource', 'plan', 'rsvp']);

export async function eventsBotChat({ messages, ip = 'local', allowMutate = false }) {
  if (!Array.isArray(messages) || !messages.length) {
    return { ok: false, error: 'messages required', status: 400 };
  }
  if (!rateOk(ip)) {
    return { ok: false, error: 'rate limit — try later or email potter@trydemigod.com', status: 429 };
  }
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!clean.length) return { ok: false, error: 'no valid messages', status: 400 };

  const lastUser = [...clean].reverse().find((m) => m.role === 'user')?.content || '';
  // Public chat is read-only. Lifecycle writes require the same ops authority as /agent/tick.
  const debriefed = allowMutate ? maybeRecordDebrief(lastUser) : null;
  const seeded = debriefed || (allowMutate ? maybeSeedNext(lastUser) : null);
  const advanced = seeded || (allowMutate ? maybeAdvanceStage(lastUser) : null);
  const driven = advanced || (allowMutate ? await maybeDrive(lastUser) : null);

  const key = process.env.OPENAI_API_KEY || '';
  const mock = process.env.DEMIGOD_EVENTS_BOT_MOCK === '1' || !key;

  let storeHint = '';
  let planSnap = driven?.plan || null;
  try {
    const c = snapshotLine() || {};
    if (!planSnap) planSnap = planTickNext(loadStore());
    const miss = planSnap?.gaps?.missing?.length ? planSnap.gaps.missing.join(',') : 'none';
    const drainHint = planSnap?.topDrain?.kind
      ? ` topDrain=${planSnap.topDrain.kind}` +
        (planSnap.topDrain.toEmail ? `:${planSnap.topDrain.toEmail}` : '')
      : '';
    const freeHint = planSnap?.gaps?.topFreeVenue?.name
      ? ` topFree=${planSnap.gaps.topFreeVenue.name} (not booked)`
      : '';
    const nextBits = (planSnap?.next || []).slice(0, 3).join(' | ');
    const rsvpH = planSnap?.rsvpHonesty;
    const rsvpHint =
      rsvpH &&
      (rsvpH.invited != null || rsvpH.confirmed != null || rsvpH.attended != null)
        ? ` rsvpReal invited=${rsvpH.invited ?? '—'} confirmed=${rsvpH.confirmed ?? '—'} attended=${rsvpH.attended ?? '—'}`
        : ' rsvpCounts=null (no fake RSVPs)';
    storeHint =
      `\n\nOps snapshot (do not invent beyond this): stage=${c.stage} title=${c.title} venue=${c.venue || 'none'} ` +
      `seats=${c.seats || '?'} offers sponsor=${c.sponsors} venue=${c.venues} volunteer=${c.volunteers} outreachQueued=${c.outreachQueued} ` +
      `gaps=${miss}${drainHint}${freeHint}${rsvpHint}. ` +
      `Owner=events-bot (first person "I/I'll" — never "you stay host" / co-pilot / assistant). SF only. RSVP counts null until real. No fake sends/bookings. ` +
      `If asked for confirmed/attended counts: say null until real (no fake RSVPs). ` +
      `If asked for tick plan / agent plan / pipeline / "what will you drive next": surface stage + SF + numbered Pipeline from Next (do not invent RSVPs; do not claim a drive unless drive_cycle actually ran). ` +
      (planSnap?.readyToAdvance || planSnap?.gateStatus === 'open'
        ? `Stage gate open` +
          (planSnap.advanceTarget ? ` → ${planSnap.advanceTarget}` : '') +
          ` — lead with advance/seed from plan (still no fake RSVPs). `
        : `Stage gate held` +
          (planSnap?.ownerLine ? ` — unlock: ${planSnap.ownerLine}` : '') +
          ` (still no fake RSVPs). `) +
      `Next: ${planSnap?.ownerLine || "I'll drive if stalled."}` +
      (planSnap?.whyNow ? ` Why: ${planSnap.whyNow}.` : '') +
      (nextBits ? ` Pipeline: ${nextBits}.` : '');
    if (driven?.summary) storeHint += ` Last drive: ${driven.summary}`;
  } catch {
    /* optional */
  }

  const lastLower = normalizeUserChatText(lastUser);
  // Explicit tick-plan / drain asks: always deterministic planTickNext surface (no LLM invent
  // of RSVPs, drives, or co-pilot handoff). Read-only — never spins drive_cycle here.
  // Keep plan-surface even when a drive just ran (driven.summary still prepended below).
  const forceTickPlan = isTickPlanAsk(lastLower);

  if (mock || forceTickPlan) {
    // Owner voice: if a drive/advance ran, lead with that summary (already has Next);
    // topical offline reply skips a second Next to avoid double plan lines.
    let reply = offlineReply(clean, { plan: planSnap });
    if (driven?.summary) {
      reply = driven.summary + '\n\n' + offlineReply(clean, { plan: planSnap, skipNext: true });
    }
    reply = ensureOwnerVoice(reply, planSnap, { skipNext: !!driven?.summary });
    return {
      ok: true,
      mock: !!mock,
      reply,
      // plan-surface = deterministic tick plan (live key present, no LLM invent)
      model: forceTickPlan && !mock ? 'plan-surface' : 'offline',
      plan: planSnap,
      driven: driven
        ? {
            stage: driven.resources?.activeEvent?.stage || driven.advanced?.stage,
            venue: driven.resources?.activeEvent?.venue?.name,
            plan: driven.plan || planSnap,
            advanced: driven.advanced || null,
          }
        : null,
    };
  }

  const model = process.env.OPENAI_EVENTS_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.5,
    max_tokens: 900,
    messages: [{ role: 'system', content: SYSTEM + storeHint }, ...clean],
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: j?.error?.message || `openai ${r.status}`,
      reply: ensureOwnerVoice(offlineReply(clean, { plan: planSnap }), planSnap),
      mock: true,
      plan: planSnap,
    };
  }
  let reply = j?.choices?.[0]?.message?.content?.trim() || offlineReply(clean, { plan: planSnap });
  if (driven?.summary && !/venue|stage|queued/i.test(reply)) {
    reply = driven.summary + '\n\n' + reply;
  }
  reply = ensureOwnerVoice(reply, planSnap);
  return {
    ok: true,
    mock: false,
    reply,
    model,
    plan: planSnap,
    driven: driven
      ? {
          stage: driven.resources?.activeEvent?.stage || driven.advanced?.stage,
          venue: driven.resources?.activeEvent?.venue?.name,
          plan: driven.plan || planSnap,
          advanced: driven.advanced || null,
        }
      : null,
  };
}

export function loadEventsBotContext() {
  try {
    const p = path.join(ROOT, 'DEMIGOD-EVENTS-BOT.md');
    return fs.readFileSync(p, 'utf8').slice(0, 6000);
  } catch {
    return '';
  }
}

export { eventsBotAgentTick };
