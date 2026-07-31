# EAT THE SOUNDS — Code Digest for Design Doc

# Code Manifest

| File | Lines | Exports | Key consts |
|------|-------|---------|------------|
| ninjawhee-eat-the-sounds.html | 5196 | — | LANES, KEY_MAP, PENTATONIC, LANE_DEGREE, QUOTES, MICRO_QUOTES |
| overworld.js | 2570 | JazzStoreOverworld | TILE, ROOM_W, COLS, ROWS, ROOM_A, ROOM_B |
| heavy-dialogue-art.js | 525 | HeavyDialogueArt | PAL, FRAMES, GLYPH_AURA, PX, GROK_PORTRAIT_CANDIDATES, NPC_ACCENTS |
| pixel-gfx.js | 712 | PixelGfx | PAL |
| game-progress.js | 311 | GameProgress | KEY, VINYL_IDS, NPC_IDS |
| store-items.js | 379 | StoreItems | EXAMINE_USE, ITEMS |
| pause-journal.js | 484 | StorePause | JOURNAL_KEY, TAB, MUTUAL_WORDS, VINYL_NAMES, NPC_NAMES, TYPE_LABELS |
| vinyl-echo-bridge.js | 334 | VinylEchoBridge | VINYL_META, NPC_BONUS, MOTIFS |
| vinyl-audio.js | 858 | VinylAudio | LOOKAHEAD_SEC, LOOKAHEAD_TICK_MS, STORE_PREVIEW_SEC, VOLUME_BOOST, GAP_SEC, AM7 |
| easter-eggs.js | 189 | EasterEggs | DFJK, VINYL_ORDER, META, SECRET_COOLDOWN_MS |
| audio-bus.js | 204 | AudioBus | MASTER_LEVEL, VINYL_IDLE_LEVEL, VINYL_STORE_LEVEL, SFX_LEVEL, RHYTHM_NOMINAL, DUCK_LEVEL |
| rhythm-loop.js | 294 | RhythmLoop | MAX_LIVE_NODES |
| heavy-runtime.js | 426 | HeavyRuntime | PX |
| STORE-TILE-LAYOUT-PLAN.md | 170 | — | — |
| HEAVY-GAME-DESIGN-PASS.md | 64 | — | — |
| HEAVY-VISUAL-DIRECTION.md | 68 | — | — |
| HEAVY-RHYTHM-DIRECTION.md | 53 | — | — |
| NOTES-FOR-SUPERGROK-HEAVY.md | 87 | — | — |

## Functions per file

### ninjawhee-eat-the-sounds.html
updateSongPill, stopQuoteCycler, pauseQuoteCycler, typeQuoteLine, startQuoteCycler, syncLayout, resize, laneCenter, noteFallProgress, noteY, scheduleNextPizzaSpawn, maybeSpawnBonusPizza, playPizzaBonusSfx, tryHitBonusPizza, checkBonusPizzaMisses, drawBonusPizza, markFeastComplete, cleanupRhythmSession, ensureAudioReady, initAudio, duckRhythmSfx, playImprov, playLaneHit, getMicroQuotePool, eggPhase, handleEggUnlock, onOverworldSecret, getEchoChartSections, applySongTiming, computeDifficultyTier, makeChartNote, injectAdaptiveNotes, injectLivePressure, buildChartForSong, buildChart, advanceToNextSong, showPhaseBrief, checkPhases, cullActiveNotes, spawnNotes, updateHint, showJudgment, flashKey, syncTimingWindows, updateModePill, formatAlbumBreakdown, formatAlbumBreakdownDetail, updateAlbumPctIntro, updateEndAlbumDisplay, tryUnlockGroove, classifyHit, updateUI, addSlice, burst, judgeNote, missNote, tryHit, releaseLane, checkMisses, clearAftermathReturnTimer, clearAftermathDialogueTimer, scheduleAftermathReturn, showRhythmEndScreen, closeMirrorChoice, resetMirrorFlow, flashMirrorSarah, confirmMirrorChoice, openMirrorChoice, finishWin, endSong, drawShelves, drawCathedralArch, drawRhythmAmbience, drawBackground, drawLanes, drawRipples, drawHitFlashes, drawFloatNotes, drawVinylNote, loop, runCountdown, initPalette, startGame, resizeDialogueCanvas, playDialogueBlip, playChoiceBlip, playConfirmBlip, updatePortraitLabel, drawDialogueFrame, spriteLoop, enrichDialogueNode, getDialogueNode, handleDialogueToken, closeDialogueUI, openDialogueUI, resolveNpcDialogue, updateOverworldHintUI, setOverworldPaused, toggleOverworldPause, startOverworld, enterAftermathStore, showSpeaker, hideChoices, renderChoices, resolveDialogueLine, beginLine, advanceDialogueLine, confirmChoice, dialogueAdvance, dialogueTick, openBootIntro, bootGame, startDialogue, moveChoice

### overworld.js
patchRow, validateMap, rebuildWalkGrids, getAftermathStyle, tileAt, isWalkableTile, isNpcWalkableTile, isSolid, gridWalkable, wrapTextLines, drawTextPanel, roomIndex, screenX, entTile, setEntTile, bootstrapMotion, displayPos, snapMove, entityStepAnim, canDiagonalStep, moveAutCost, entitySpeed, entityGridPos, entityOccupiedTiles, playerGridPos, entScreenPos, birdBlocksTile, terrainBlocksPlayer, bumpMessage, showBumpToast, canWalkTile, npcPathStep, gainMonsterEnergy, resolveMonsterActions, spendAut, playerSpendsAut, drawRoomTint, drawStoreAmbience, findPath, allNpcEntities, npcBlocksPlayer, npcAt, npcBlocks, npcInteractRange, playerFacingNpc, npcNearPlayer, dirBetween, pickWanderTile, beginPathTo, wanderNpcAct, randomFloorInRoom, passerUsesDoor, updateStoreDoor, spawnPasserby, removePasserby, passerbyAct, tickNPCs, tileDist, faceToward, facingTile, padDist, nearestOnPad, examineFacingSpot, examineSpot, drawInteractBubble, drawExamineGlints, secretAtTile, getSecretSpot, scheduleBirdEncounter, birdPathStep, birdAct, spawnBirdEncounter, drawBird, birdForInteract, resolveBirdEncounter, showExamineToast, showSecretToast, vinylForInteract, allInteractPads, drawInteractPads, resolveInteractTarget, invalidateInteractCache, highlightedVinyl, vinylAtShelf, vinylAtPad, drawTile, drawSecretSpotHints, drawEchoRipple, drawAftermathEffects, tileVisible, drawRoomArchways, drawStoreDecor, drawVinyls, drawSarahPresence, drawAftermathToast, drawSecretToast, drawFlavorToast, drawDust, drawNowPlayingHUD, drawCharacter, drawPlayer, drawNPC, tickViz, render, clearListening, clearVinylToastTimers, scheduleVinylToast, triggerPreviewHush, stopVinyl, applyVinylListen, playVinyl, tryMove, waitTurn, checkInteract, mutualsComplete, updateReturnNPC, capitalize, buildInteractHintUI, updateHint, setPaused, isPaused, handleKey, handleKeyUp, validateEntityPlacements, start, getNpcById, stop, isBirdPresent, resize, getVinylPositions, isAftermath, getAftermath, triggerEchoRipple

### heavy-dialogue-art.js
drawDialogueSceneBg, drawPixelNinjawhee, emotionForNode, blipPitch, isGrokPortraitReady, whenGrokPortraitReady, flushGrokPortraitWaiters, detectGrokCrop, resolveGrokPortraitSrc, loadGrokPortrait, playUndertaleBlip, toneBlip, drawVinylPickup, drawGrokPortrait, drawNpcPortrait

### pixel-gfx.js
snap, shadeHex, fillPixel, fillPixelDisk, fillPixelRect, drawScanlines, drawPixelStar, drawPixelMoon, drawPixelWindow, drawWarmGlow, drawParquetFloor, drawBrickWall, drawWoodShelfTile, drawRegisterTile, drawDoorThreshold, drawStorefrontFacade, drawDoorTile, drawSpriteShadow, drawLampAmbientWash, drawStoreVignette, drawPixelCharacter, drawPendantLamp, drawPixelLamp, drawPixelRug, drawPixelShelfUnit, drawPixelCounter, drawPixelNeonSign, drawGhostSlice, drawPosterSparkle, drawPixelPoster, drawPixelVinylSpine, drawPixelVinylStand, drawPixelFloorZone, drawNpcZoneRing, drawStoreZoneSign, drawStoreGuidePanel, drawSarahStandMarker, drawSarahCounterArrow, drawControlBar, drawTutorialArrow, drawTalkBubble, drawVinylRecord, drawCarpetFloor, drawPixelTurntable, drawPixelPlant, drawPixelBird, setupPixelCtx

### game-progress.js
load, getInventory, hasInventoryItem, addInventoryItem, removeInventoryItem, save, recordVinyl, getVinylListenCount, recordNpc, recordRun, getLastRun, getAftermathTier, getExplorationPct, getAlbumPct, getAlbumBreakdown, getUnlockTier, isChill, setChill, toggleChill, hasVinyl, unlockSecret, hasSecret, getSecretCount, getEndVariant, getSarahUnlockLine, drawHud, reloadFromStorage, resetSession, getFindCounts, clampFind, setFindCounts, resetFindQuest, isFindQuestComplete, setLastRun, getSnapshot

### store-items.js
roll, addItem, hasItem, nearExamineSpot, getUseContext, tryPickupFromExamine, tryPickupFromTalk, tryPickupFromVinyl, tryPickupFromEvent, canUseItem, useItem, getItemDef, listOwned

### pause-journal.js
load, save, hasEntry, addEntry, maybeAddEntry, noteInteraction, formatTime, getContext, rollAmbient, onSessionStart, onTalk, onExamine, onFindComplete, onVinyl, onSarahReady, onBird, onSecret, onItemPickup, onToast, queueThought, pickThought, maybeThought, buildStatusCards, buildFindRows, renderJournal, renderInventory, render, bindDom, setOpen, toggle, close, isOpen, tick, init

### vinyl-echo-bridge.js
recordPreview, showGhostSlice, playTeaserPing, triggerGhostTeaser, playMotif, recordNpc, recordBirdGuide, clearBeatTimer, cleanup, trySarahHum, resetSession, playEchoTutorial, getSeed, drawOverworldHud, drawGhostSlice, drawOverworldGhost, drawRhythmEchoOrbs, drawRhythmGhosts, getVinylListenCount, getLastVinylId

### vinyl-audio.js
isSourceNode, disposeScheduled, spb, disposeFx, ensureFx, createJazzScheduler, inWindow, extend, scheduleNoteEvent, scheduleBrushEvent, dispatch, pruneLiveNodes, flush, note, chord, brush, ride, walk, comp, brushes, melody, setMaxTime, trimQueue, startLookahead, stopLookahead, disposeAll, playAlbumMovements, estimateAlbumMs, init, outputGain, hardStop, stop, fadeOut, isFading, onStop, play, getVinylPlaybackInfo, isPlaying, getCurrentId, debugState

### easter-eggs.js
unlock, has, count, resetSession, once, rhythmCompleted, onKey, dialogueBlocked, onMirrorTap, onOverworldSpot, onVinylPreview, checkVinylTriple, onRhythmCombo, onRhythmScore, onAftermathEnter, getBonusMicroQuotes, getSpotHint

### audio-bus.js
create, registerHandlers, stopRhythmClean, stopVinylClean, applyModeGains, setMode, duckRhythm, resume, ensureVinylAudible, resumeAndResetGain, snapGains

### rhythm-loop.js
create, setBpm, setStyle, track, releaseAll, brush, pianoComp, hiHat, hornStab, scheduleBeat, schedule, stopClean

### heavy-runtime.js
drawAlignedPlayfield, playJazzImprov, syncLaneLayout, classifyHit, playKeyTap, playMissScratch, pizzaBiteCrunch, playJudgmentSfx, playComboStinger, playSarahEncoreStinger, playSongHandoff, brushNoise, judgmentBurst

### STORE-TILE-LAYOUT-PLAN.md
(none)

### HEAVY-GAME-DESIGN-PASS.md
(none)

### HEAVY-VISUAL-DIRECTION.md
(none)

### HEAVY-RHYTHM-DIRECTION.md
(none)

### NOTES-FOR-SUPERGROK-HEAVY.md
(none)



## ninjawhee-eat-the-sounds.html (5196 lines)

**Dialogue forests:** intro, open, returning_visitor, returning_wisdom, albums_love, browse_first, is_game, meet_shy, meet, tell_me_more, records_list, records_order, screen_store, lonely_ok, beautiful_ok, digital, eat_how, tiers_intro, chew_intro, miss_fear, pizza, vinyls_intro, vibe, cathedral, workshop, mirror, mirror_path, mirror_see, mirror_glyph_see, mirror_wings_see, who_here, about_orph, about_simon, about_honey, who_order, send_explore, secrets_pizza, return, store_open, store_records, store_spin, store_revisit, open, return_setup, return_vinyl_tease, return_remember, return_groove, return_vinyl, return_nervous, return_albums, return_chill_on, return_chill_off, return_album_pct, return_full_album, return_timing, return_holds, return_gossip, return_quote, passerby, v0, v0_hint, v1, v1_hint, v2, v2_hint, v3, v3_hint, v4, v4_hint, v5, v5_hint, v6, v6_hint, v7, v7_hint, aftermath, wings, groove, tasty, static, mirror_show, groove_notes, tasty_tips, static_chill, mutuals_hint, run_stats, aftermath_hub, secrets_vault, secrets_vault_hints, secrets, moon_window, mirror_door, counter_knock, pizza, vault, vault_hints, bird, open, bird_hum, bird_moon, bird_shelter, bird_mirror, bird_listen, bird_orph, bird_simon, bird_honey, orph, open, revisit, revisit_moon, revisit_shelter, revisit_mirror, orph_albums, orph_others, left_stacks, orph_hi_sarah, aftermath_wings, orph_heard_wings, aftermath_groove, aftermath_tasty, aftermath_static, orph_timing, advice, sarah_again, vinyl_pick, simon, open, revisit_moon, revisit_shelter, revisit_mirror, revisit, simon_albums, simon_honey, simon_orph, simon_improv, simon_counter, simon_tiers, simon_breadcrumb, map, rhythm, moon, lanes_again, mirror_hint, aftermath_wings, simon_store_shift, aftermath_groove, aftermath_tasty, aftermath_static, honey, open, honey_special, honey_mutuals, revisit_moon, revisit_shelter, revisit_mirror, revisit, honey_albums, honey_orph, honey_simon, honey_shelter, honey_mirror, honey_chew, honey_nice, rizz, honey_tasty, tell, tips, workshop, eat_vinyl, calm, aftermath_wings, aftermath_groove, aftermath_tasty, aftermath_static

**Rhythm:** chart builders present

**First 120 lines of script section:**
```
<script>
    const LANES = [
      { key: 'KeyD', label: 'D', color: '#c9a84c', pitch: 220, role: 'bass' },
      { key: 'KeyF', label: 'F', color: '#c45c7a', pitch: 261.63, role: 'horn' },
      { key: 'KeyJ', label: 'J', color: '#4a8f7a', pitch: 329.63, role: 'keys' },
      { key: 'KeyK', label: 'K', color: '#7b5ea7', pitch: 392, role: 'ride' },
    ];
    const KEY_MAP = Object.fromEntries(LANES.map((l, i) => [l.key, i]));
    const PENTATONIC = [220, 246.94, 261.63, 293.66, 329.63, 392, 440, 493.88];
    const LANE_DEGREE = [0, 2, 4, 5];

    const QUOTES = [
      "when i was working at a jazz records store, favorite thing to do was to listen to entire albums and eat the sounds as you would a pizza",
      "when its real... no words are needed....",
      "theres a mirror at the edge of the world..",
      "Why do people enter cathedrals? They seek metamorphosis — surrendering the molt of the old and ushering in the new of the wings.",
      "Every 'yes' is a contract, every 'no' is a declaration.",
      "people are so amazing tbh Im super wowed by the amount of beauty and talent everywhere",
      "the joy of non-performative authenticity is the most beautiful treasure one can find",
      "this weekend, was a facilitator for an artworkshop for children with rare diseases.. the emphasis was in agency in choosing the colors that they wanted, with a simple shape as structure to build upon..",
      "whole albums. late-night store. the mirror at the edge of the world..",
      "it takes me at least 3-7 business days to process and realise when someone tries to rizz me up.. sometimes months...",
      "glad to have started posting more on the digital space.. thank you i appreciate you i am wishing you an amazing life ahead",
      "listen to entire albums — let the groove teach your hands where to bite",
      "in the groove we become pizza · in the mirror we become wings",
    ];

    const MICRO_QUOTES = [
      "eat the sounds", "no words needed", "mirror at the edge",
      "molt the old", "usher the wings", "yes is a contract",
      "no is a declaration", "choose your colors", "simple shape",
      "non-performative joy", "whole albums", "pizza slice",
      "jazz records", "soliloquy w/ moon", "shelter from storm",
      "surface + orifice", "love letter", "angels & demons",
      "∴𓅰", "in the pocket", "chew the riff",
    ];

    const HIEROGLYPHS = ['∴', '𓅰', '𓅬', '𓅭', '𓅮', '𓅯'];
    const SHELF_SPINES = ['SOLILOQUY W/ MOON', 'SHELTER', 'SURFACE+ORIFICE', 'KUNTILANAK', 'ANGELS&DEMONS', 'HOW DOES ONE'];

    const BALLAD_BPM = 84, APPROACH_BASE_MS = 9600;
    const PERFECT_MS = 150, GREAT_MS = 280, GOOD_MS = 450, HIT_LEAD_MS = 160, GOAL_SLICES = 15;
    const PIZZA_MIN_BEATS = 26, PIZZA_MAX_BEATS = 40, PIZZA_FIRST_BEAT = 34;
    let beatMs = 60000 / BALLAD_BPM, approachTime = APPROACH_BASE_MS, songBeats = 172, currentSongIdx = 0;
    const CHILL_MULT = 1.45, CHILL_AUTO_MS = 200, GRACE_MULT = 1.28, GRACE_AUTO_MS = 140;
    const GROOVE_EARLY_NEED = 3, GROOVE_SCORE_MULT = 1.18;
    const LANE_TOP = 0.15, LANE_BOTTOM = 0.70;
    const MAX_ACTIVE_NOTES = 16;

    const CHART_SECTIONS = [
      { label: 'jazz records store · needle drop', notes: [
        { beat: 6, lane: 0, type: 'tap', tutorial: 'Press D' },
        { beat: 10, lane: 1, type: 'tap', tutorial: 'Press F' },
        { beat: 14, lane: 2, type: 'tap', tutorial: 'Press J' },
        { beat: 18, lane: 3, type: 'tap', tutorial: 'Press K' },
      ]},
      { label: 'soliloquy with the moon · side A', notes: [
        { beat: 24, lane: 0, type: 'tap' }, { beat: 26, lane: 1, type: 'tap' },
        { beat: 28, lane: 2, type: 'tap' }, { beat: 30, lane: 3, type: 'tap' },
        { beat: 32, lane: 0, type: 'tap' }, { beat: 34, lane: 2, type: 'tap' },
        { beat: 36, lane: 1, type: 'tap' }, { beat: 38, lane: 3, type: 'tap' },
        { beat: 40, lane: 0, type: 'hold', duration: 2 },
        { beat: 44, lane: 1, type: 'tap' }, { beat: 46, lane: 3, type: 't
```
**Dialogue sample (intro forest):**
```
intro: {
        open: {
          speaker: 'ninjawhee',
          lines: [
            '∴',
            '...oh. you found the jazz records store inside the screen.',
          ],
          next: 'send_explore',
        },
        returning_visitor: {
          speaker: 'ninjawhee',
          lines: [
            'welcome back.... the stacks remember your footsteps.',
          ],
          choices: [
            { text: 'let me in', next: 'send_explore' },
            { text: 'tell me more first', next: 'tell_me_more' },
            { text: 'one reminder first', next: 'returning_wisdom' },
          ],
        },
        returning_wisdom: {
          speaker: 'ninjawhee',
          lines: [
            'whole albums. no rush. the store stays open.',
          ],
          next: 'send_explore',
        },
        albums_love: {
          speaker: 'ninjawhee',
          lines: [
            'side A into side B. no skipping.',
            'let the groove teach your hands before you bite.',
            'three records out tonight if you want a preview.',
          ],
          choices: [
            { text: 'how do you eat sounds?', next: 'eat_how' },
            { text: 'tell me about the vinyls', next: 'vinyls_intro' },
            { text: 'who are you?', next: 'meet' },
          ],
        },
        browse_first: {
          speaker: 'ninjawhee',
          lines: [
            'please do. arrow keys to walk.',
            'face a shelf · press Z to spin a preview · X to stop.',
            'the stacks are gentle. take your time.',
          ],
          next: 'send_explore',
        },
        is_game: {
          speaker: 'ninjawhee',
          lines: [
            'game · store · soliloquy — all at once.',
            'walk first. then eat the sounds.',
          ],
          next: 'meet',
        },
        meet_shy: {
          speaker: 'ninjawhee',
          lines: [
            'hi. no pressure.',
            'the store is gentle. take your time.',
          ],
          next: 'meet',
        },
        meet: {
          speaker: 'ninjawhee',
          lines: [
            "i'm sarah. @ninjawhee.",
            'eating the sounds as you would a pizza....',
            'when its real... no words are needed....',
          ],
          choices: [
            { text: 'how do you eat sounds?', next: 'eat_how' },
            { text: 'who else is here?', next: 'who_here' },
            { text: 'tell me more', next: 'tell_me_more' },
            { text: 'let me exp
```
**Return forest sample:**
```
return: {
        store_open: {
          speaker: 'ninjawhee',
          lines: [
            "i'm sarah. @ninjawhee.",
            'late-night register duty.... whole albums only.',
            'purple · green · pink mutuals are on the floor — say hi when you are ready.',
          ],
          choices: [
            { text: 'where are the records?', next: 'store_records' },
            { text: 'how do i spin vinyl?', next: 'store_spin' },
            { text: 'let me explore', next: '__resume__' },
          ],
        },
        store_records: {
          speaker: 'ninjawhee',
          lines: [
            'gold moon — north wall, glow pad right below the spine.',
            'green shelter — middle room stacks.',
            'purple mirror — listening lounge back wall.',
          ],
          next: '__resume__',
        },
        store_spin: {
          speaker: 'ninjawhee',
          lines: [
            'stand on the gold glow tile under a record.',
            'press Z. let the whole side breathe.... no skip button energy.',
          ],
          next: '__resume__',
        },
        store_revisit: {
          speaker: 'ninjawhee',
          lines: [
            'browse slow. the shelves breathe when nobody performs.',
            'talk to everyone out there — then come back. we can eat some sounds.',
          ],
          choices: [
            { text: 'remind me about vinyl', next: 'store_spin' },
            { text: 'thanks sarah', next: '__resume__' },
          ],
        },
        open: {
          speaker: 'ninjawhee',
          lines: [
            'you are back....',
            'you met everyone? good.',
            'now we can eat some sounds together.',
          ],
          next: 'return_setup',
        },
        return_setup: {
          speaker: 'ninjawhee',
          lines: [
            'vinyl slices will fall. D F J K.',
            'bite at the gold line.... fifteen slices → the mirror.',
          ],
          choices: [
            { text
```

## overworld.js (2570 lines)

```js
// Hear Records–inspired pixel overworld (Burlington Square, Singapore)
window.JazzStoreOverworld = (function () {
  const TILE = 28;
  const ROOM_W = 22;
  const COLS = ROOM_W * 3;
  const ROWS = 13;

  // Hear Records Burlington Square — entrance · crate stacks · listening lounge
  const ROOM_A = [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'W..S......S.S....S...W',
    'W................SS..W',
    'W................SS..W',
    'W......CC............W',
    'W....................W',
    'W....................W',
    'W....................W',
    'W............SS......W',
    'W............SS......W',
    'W....................W',
    'W..............SS....W',
    'WWWWWWWWWWDDWWWWWWWWWW',
  ];
  const ROOM_B = [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'W....S.......SS......W',
    'W..S...S..........SS.W',
    'W.......S.....S......W',
    'W....................W',
    'W....................W',
    'W....................W',
    'W....................W',
    'W............SS......W',
    'W............SS......W',
    'W....SS....SS........W',
    'W....................W',
    'WWWWWWWWWWWWWWWWWWWWWW',
  ];
  const ROOM_C = [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'W..........SS........W',
    'W..SS................W',
    'W....TT..............W',
    'W...RRR..........SS..W',
    'W....................W',
    'W....................W',
    'W....................W',
    'W..RR..........SS....W',
    'W..RR................W',
    'W.......PP...........W',
    'W....TT..............W',
    'WWWWWWWWWWWWWWWWWWWWWW',
  ];

  function patchRow(row, col, ch = '.') {
    return row.slice(0, col) + ch + row.slice(col + 1);
  }

  const MAP = ROOM_A.map((rowA, i) => {
    let a = rowA;
    let b = ROOM_B[i];
    let c = ROOM_C[i];
    if (i >= 5 && i <= 7) {
      a = patchRow(a, ROOM_W - 1);
      b = patchRow(patchRow(b, 0), ROOM_W - 1);
      c = patchRow(c, 0);
    }
    return a + b + c;
  });

  // Playable vinyl + quest shelf anchors (must be S = blocked, pad south on floor)
  const MAP_TILE_PATCHES = [
    [10, 1, 'S'], [26, 2, 'S'], [54, 1, 'S'],
    [6, 1, 'S'],
    [29, 3, '.'], [30, 3, '.'],
    [52, 2, '.'], [53, 2, '.'],
  ];
  for (const [tx, ty, ch] of MAP_TILE_PATCHES) {
    MAP[ty] = patchRow(MAP[ty], tx, ch);
  }
  for (let y = 0; y < ROWS; y++) {
    MAP[y] = patchRow(MAP[y], 0, 'W');
    MAP[y] = patchRow(MAP[y], COLS - 1, 'W');
  }
  for (let x = 0; x < COLS; x++) MAP[0] = patchRow(MAP[0], x, 'W');
  for (let x = 0; x < COLS; x++) {
    if (x === 10 || x === 11) continue;
    MAP[ROWS - 1] = patchRow(MAP[ROWS - 1], x, 'W');
  }
  MAP[12] = patchRow(MAP[12], 10, 'D');
  MAP[12] = patchRow(MAP[12], 11, 'D');

  function validateMap() {
    for (let y = 0; y < ROWS; y++) {
      if (MAP[y].length !== COLS) {
        throw new Error(`MAP row ${y} length ${MAP[y].length} expected ${COLS}`);
      }
    }
  }

  const PLAYER_WALK_GRID = new Uint8Array(COLS * ROWS);
  const NPC_WALK_GRID = new Uint8Array(COLS * ROWS);

  function rebuildWalkGrids() {
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        const t = MAP[gy][gx];
        const idx = gy * COLS + gx;
        PLAYER_WALK_GRID[idx] = (t === '.' || t === 'R' || t === 'T' || t === 'P') ? 1 : 0;
        NPC_WALK_GRID[idx] = (PLAYER_WALK_GRID[idx] || t === 'D') ? 1 : 0;
      }
    }
  }

  validateMap();
  rebuildWalkGrids();

  const STORE_PROFILE = {
    name: '∴ EAT THE SOUNDS ∴',
    address: 'late night · three rooms',
    tagline: 'new + pre-loved vinyl · hi-fi',
  };

  const ROOM_LABELS = [
    'entrance · new arrivals',
    'crate stacks · pre-loved',
    'listening booth · hi-fi',
  ];

  // padX/Y = stand on glow tile · shelfX/Y = record on shelf (S tile, blocked)
  const VINYL_PICKUPS = [
    {
      id: 'moon', zone: 'new arrivals wall', shelfTag: 'NEW',
      padX: 10, padY: 3, shelfX: 10, shelfY: 1, color: '#c9a84c',
    },
    {
      id: 'shelter', zone: 'pre-loved stacks', shelfTag: 'USED',
      padX: 26, padY: 4, shelfX: 26, shelfY: 2, color: '#4a8f7a',
    },
    {
      id: 'mirror', zone: 'listening booth', shelfTag: 'SPIN',
      padX: 54, padY: 3, shelfX: 54, shelfY: 1, color: '#7b5ea7',
    },
  ];

  const LISTENING_STATIONS = [
    { x: 48, y: 3, label: 'demo deck' },
    { x: 48, y: 11, label: 'hi-fi corner' },
  ];

  const VINYL_FLAVOR = {
    moon: 'gold new jazz · soliloquy w/ moon',
    shelter: 'pre-loved crate find · shelter from the storm',
    mirror: 'listening booth · purple glass at the edge',
  };

  const AFTERMATH_STYLE = {
    wings: {
      banner: '∴ WINGS IN THE GLASS ∴',
      neon: 'WINGS',
      neonColor: '#e8d48c',
      warmth: 1.25,
      accent: '#c9a84c',
      dustAlpha: 0.28,
    },
    groove: {
      banner: '∴ GROOVE REMEMBERS ∴',
      neon: 'GROOVE',
      neonColor: '#4a8f7a',
      warmth: 1.05,
      accent: '#4a8f7a',
      dustAlpha: 0.2,
    },
    tasty: {
      banner: '∴ STILL HUNGRY ∴',
      neon: 'TASTY',
      neonColor: '#c45c7a',
      warmth: 0.92,
      accent: '#c45c7a',
      dustAlpha: 0.16,
```

*(+2390 more lines)*

## heavy-dialogue-art.js (525 lines)

```js
// SuperGrok Heavy dialogue art — pixel intro for eat-the-sounds
// Local Grok integrates here; merge Heavy-fetched blocks from HEAVY-PIXEL-CODE.js when available.

const PAL = {
  '.': null,
  '0': '#0a0812', '1': '#1a1028', '2': '#2a1a38', '3': '#3d2a52',
  '4': '#e8b896', '5': '#d4a078', '6': '#f8f4ff', '7': '#1a1028',
  '8': '#c9a84c', '9': '#c45c7a', 'a': '#4a8f7a', 'b': '#7b5ea7',
  'c': '#6a5040', 'd': '#14101c', 'e': '#f0d0b0', 'f': '#5a3a6a',
};

const FRAMES = {
  idle: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab1ddd1ba2........',
    '.........2ab1ddd1ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  talk: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab19991ba2........',
    '.........2ab19991ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  smile: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab1ddd1ba2........',
    '.........2ab18881ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  wonder: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab17771ba2........',
    '.........2ab17771ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
};

const GLYPH_AURA = ['∴', '𓅰', '𓅬'];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} t
 */
function drawDialogueSceneBg(ctx, W, H, t) {
  const PX = window.PixelGfx;
  if (PX) PX.setupPixelCtx(ctx);

  for (let y = 0; y < H; y += 8) {
    const band = y / H;
    ctx.fillStyle = band < 0.45 ? '#1c1230' : band < 0.75 ? '#120c1c' : '#0a0812';
    ctx.fillRect(0, y, W, 8);
  }

  if (PX) {
    PX.drawPixelWindow(ctx, W * 0.68, H * 0.1, 120, 88);
    PX.drawPixelMoon(ctx, W * 0.74, H * 0.2, 22);
  }

  const shelfY = H * 0.12;
  for (let row = 0; row < 3; row++) {
    const y = Math.floor(shelfY + row * 32);
    ctx.fillStyle = '#3d2a52';
    ctx.fillRect(W * 0.08, y, W * 0.84, 4);
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(W * 0.1 + i * (W * 0.042));
      const hue = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7'][i % 4];
      if (PX?.drawPixelVinylSpine) {
        PX.drawPixelVinylSpine(ctx, x, y - 18, 16, hue);
      } else {
        ctx.fillStyle = hue;
        ctx.fillRect(x, y - 18, 8, 16);
        ctx.fillStyle = '#0a0812';
        ctx.fillRect(x + 2, y - 14, 4, 4);
      }
    }
  }

  if (PX) {
    const spin = t * 0.04;
    [['#c9a84c', 0.18], ['#c45c7a', 0.82]].forEach(([col, fx], i) => {
      const vx = W * fx + Math.sin(spin + i * 2) * 12;
      const vy = H * 0.72 + Math.cos(spin * 0.7 + i) * 8;
      PX.fillPixelDisk(ctx, vx, vy, 10, 4, col, 3);
      PX.fillPixelDisk(ctx, vx, vy, 2, 2, '#0a0812');
    });
    PX.drawWarmGlow(ctx, W * 0.5, H * 0.88, 80, '#c9a84c', 0.06);
  }

  const ax = W * 0.28, ay = H * 0.42, aw = W * 0.44;
  ctx.fillStyle = 'rgba(201,168,76,0.12)';
  for (let i = 0; i <= 12; i++) {
    const p = i / 12;
    const x = ax + aw * p;
    const top = ay - Math.sin(p * Math.PI) * H * 0.22;
    ctx.fillRect(x, top, 4, ay - top);
  }

```

*(+345 more lines)*

## pixel-gfx.js (712 lines)

```js
// Shared pixel-art drawing helpers
window.PixelGfx = (function () {
  const PAL = {
    void: '#0a0812', ink: '#1a1028', plank: '#14101c', plankHi: '#1c1424',
    wood: '#2a2038', woodHi: '#3d2f50', woodLo: '#1a1428',
    brick: '#2a1a38', brickHi: '#4a3560', brickLo: '#1a1028', mortar: '#0a0812',
    gold: '#c9a84c', goldHi: '#e8d48c', goldLo: '#8a7040',
    rose: '#c45c7a', teal: '#4a8f7a', violet: '#7b5ea7', cream: '#f8f4e8',
  };

  function snap(v) { return Math.round(v); }

  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  function fillPixel(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(snap(x), snap(y), size, size);
  }

  function fillPixelDisk(ctx, cx, cy, r, size, color, holeR = 0) {
    const r2 = r * r;
    const h2 = holeR * holeR;
    for (let y = -r; y <= r; y += size) {
      for (let x = -r; x <= r; x += size) {
        const d = x * x + y * y;
        if (d <= r2 && d >= h2) fillPixel(ctx, cx + x, cy + y, size, color);
      }
    }
  }

  function fillPixelRect(ctx, x, y, w, h, size, color) {
    for (let py = 0; py < h; py += size) {
      for (let px = 0; px < w; px += size) {
        fillPixel(ctx, x + px, y + py, size, color);
      }
    }
  }

  function drawScanlines(ctx, W, H, alpha = 0.06) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  }

  function drawPixelStar(ctx, x, y, r, color) {
    const s = Math.max(2, Math.floor(r / 3));
    fillPixel(ctx, x, y, s, color);
    fillPixel(ctx, x - s * 2, y, s, color);
    fillPixel(ctx, x + s * 2, y, s, color);
    fillPixel(ctx, x, y - s * 2, s, color);
    fillPixel(ctx, x, y + s * 2, s, color);
  }

  function drawPixelMoon(ctx, x, y, r) {
    fillPixelDisk(ctx, x, y, r, 6, 'rgba(232,224,240,0.55)', r * 0.15);
    fillPixelDisk(ctx, x - r * 0.2, y - r * 0.1, r * 0.55, 4, 'rgba(26,16,40,0.5)');
  }

  function drawPixelWindow(ctx, x, y, w, h) {
    fillPixelRect(ctx, x, y, w, h, 4, '#1a1028');
    fillPixelRect(ctx, x + 4, y + 4, w - 8, h - 8, 4, '#2a2848');
    fillPixel(ctx, x + w / 2 - 2, y + 4, 4, h - 8, '#0a0812');
    fillPixel(ctx, x + 4, y + h / 2 - 2, w - 8, 4, '#0a0812');
  }

  function drawWarmGlow(ctx, cx, cy, r, color, alpha) {
    const steps = 4;
    for (let i = steps; i >= 1; i--) {
      const rr = (r * i) / steps;
      const a = (alpha * i) / steps;
      const hex = color.startsWith('#') && color.length === 7;
      ctx.fillStyle = hex
        ? `${color}${Math.floor(a * 255).toString(16).padStart(2, '0')}`
        : color;
      fillPixelDisk(ctx, cx, cy, rr, 4, ctx.fillStyle);
    }
  }

  function drawParquetFloor(ctx, px, py, tile, tx, ty) {
    const dark = (tx + ty) % 2 === 0;
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, tile - 2, 4, dark ? PAL.plank : PAL.ink);
    const seam = dark ? PAL.plankHi : '#120e18';
    fillPixelRect(ctx, px + 1, py + tile / 2 - 1, tile - 2, 2, 2, seam);
    if (tx % 2 === 0) fillPixelRect(ctx, px + tile / 2 - 1, py + 1, 2, tile - 2, 2, seam);
    if ((tx * 3 + ty) % 5 === 0) {
      fillPixel(ctx, px + 6, py + 5, 2, `rgba(201,168,76,0.12)`);
      fillPixel(ctx, px + tile - 8, py + tile - 7, 2, `rgba(201,168,76,0.08)`);
    }
    if (ty >= 11) {
      fillPixelRect(ctx, px + 2, py + tile - 5, tile - 4, 3, 2, PAL.woodLo);
      fillPixelRect(ctx, px + 2, py + tile - 2, tile - 4, 1, 2, PAL.goldLo);
    }
  }

  function drawBrickWall(ctx, px, py, tile, tx, ty) {
    fillPixelRect(ctx, px, py, tile, tile, 4, PAL.brickLo);
    const row = ty % 2;
    for (let rowY = 0; rowY < 3; rowY++) {
      const by = py + 3 + rowY * 8;
      const off = (row + rowY) % 2 ? 6 : 0;
      for (let bx = off; bx < tile - 4; bx += 12) {
        fillPixelRect(ctx, px + 2 + bx, by, 10, 6, 2, PAL.brick);
        fillPixelRect(ctx, px + 3 + bx, by + 1, 8, 2, 2, PAL.brickHi);
        fillPixel(ctx, px + 2 + bx, by, 2, 6, PAL.mortar);
      }
    }
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, 2, 2, shadeHex(PAL.brickHi, 15));
    fillPixelRect(ctx, px + 1, py + tile - 3, tile - 2, 2, 2, PAL.mortar);
    if (ty === 0) {
      fillPixelRect(ctx, px + 2, py + tile - 5, tile - 4, 4, 2, PAL.wood);
      fillPixelRect(ctx, px + 4, py + tile - 4, tile - 8, 2, 2, PAL.goldLo);
    }
    if ((tx + ty) % 4 === 0) {
      fillPixelRect(ctx, px + 5, py + 10, 4, 10, 2, 'rgba(201,168,76,0.07)');
    }
  }

  function drawWoodShelfTile(ctx, px, py, tile, featured, color, pulse, label) {
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, tile - 2, 4, PAL.woodLo);
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, 4, 4, PAL.woodHi);
    fillPixelRect(ctx, px + 2, py + tile - 8, tile - 4, 6, 4, PAL.ink);
    fillPixelRect(ctx, px + 3, py + tile - 7, tile - 6, 2, 2, color || PAL.goldLo);
    if (featured) {
      drawPixelVinylStand(ctx, px + 2, py + 1, tile - 4, tile - 3, color, pulse);
      if (label) {
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(label, px + tile / 2, py + tile - 2);
      }
    } else {
      ctx.save();
      ctx.globalAlpha = 0.48;
      fillPixelRect(ctx, px + 3, py + 6, tile - 6, tile - 14, 4, PAL.ink);
      for (let i = 0; i < 3; i++) {
        const c = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7', '#e8e0f0'][(px + py + i) % 5];
        drawPixelVinylSpine(ctx, px + 4 + i * 8, py + 5, 16, c);
      }
      fillPixelRect(ctx, px + 4, py + 3, tile - 8, 1, 2, 'rgba(255,255,255,0.03)');
      ctx.restore();
    }
    fillPixel(ctx, px + 1, py + 4, 2, tile - 8, shadeHex(PAL.wood, -20));
  }

  function drawRegisterTile(ctx, px, py, tile) {
    drawParquetFloor(ctx, px, py, tile, 9, 4);
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, tile - 5, 4, PAL.wood);
    fillPixelRect(ctx, px + 4, py + 4, tile - 8, tile - 9, 4, PAL.woodHi);
    fillPixelRect(ctx, px + 6, py + 6, tile - 12, tile - 12, 4, '#1a1428');
    fillPixelRect(ctx, px + 8, py + 8, tile - 16, 4, 2, 'rgba(201,168,76,0.35)');
    fillPixel(ctx, px + tile - 10, py + tile / 2, 3, 3, PAL.gold);
    fillPixelRect(ctx, px + 3, py + tile - 6, tile - 6, 2, 2, PAL.goldLo);
  }

  function drawDoorThreshold(ctx, px, py, tile, center) {
    fillPixelRect(ctx, px + 2, py + tile - 8, tile - 4, 6, 4, center ? PAL.goldLo : PAL.woodLo);
    fillPixelRect(ctx, px + 4, py + tile - 6, tile - 8, 3, 2, center ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.1)');
    if (center) {
      fillPixelRect(ctx, px + tile / 2 - 6, py + tile - 5, 12, 2, 2, 'rgba(74,143,122,0.35)');
    }
  }

  function drawStorefrontFacade(ctx, px, py, tile) {
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, tile - 4, 4, PAL.brick);
    fillPixelRect(ctx, px + 4, py + 4, tile - 8, tile - 8, 4, PAL.brickHi);
    fillPixelRect(ctx, px + 3, py + tile - 5, tile - 6, 3, 2, PAL.wood);
    fillPixelRect(ctx, px + 5, py + tile - 4, tile - 10, 2, 2, PAL.goldLo);
  }

  function drawDoorTile(ctx, px, py, tile, glow, open = false) {
    if (open) {
      drawParquetFloor(ctx, px, py, tile, 10, 12);
      fillPixelRect(ctx, px + 2, py + 2, 4, tile - 6, 3, PAL.wood);
      fillPixelRect(ctx, px + tile - 8, py + 2, 4, tile - 6, 3, PAL.wood);
      fillPixelRect(ctx, px + 3, py + 1, 2, tile - 4, 2, PAL.goldLo);
```

*(+532 more lines)*

## game-progress.js (311 lines)

```js
// Album completion, chill mode, unlock tiers — persists across sessions
window.GameProgress = (function () {
  const KEY = 'eat-the-sounds-v1';
  const VINYL_IDS = ['moon', 'shelter', 'mirror'];
  const NPC_IDS = ['orph', 'simon', 'honey'];

  let state = {
    vinyls: [],
    vinylListens: 0,
    vinylListenCounts: {},
    npcs: [],
    wins: 0,
    runs: 0,
    bestScore: 0,
    bestSlices: 0,
    chillMode: false,
    lastRun: null,
    secrets: [],
    findCounts: { orph: 0, simon: 0, honey: 0 },
    findQuestComplete: false,
    inventory: [],
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = { ...state, ...JSON.parse(raw) };
    } catch (_) { /* ignore */ }
    state.vinyls = [...new Set(state.vinyls)];
    state.npcs = [...new Set(state.npcs)];
    state.secrets = [...new Set(state.secrets || [])];
    state.vinylListenCounts = state.vinylListenCounts || {};
    state.findCounts = state.findCounts || { orph: 0, simon: 0, honey: 0 };
    state.inventory = [...new Set(state.inventory || [])];
    state.findQuestComplete = state.findCounts.orph >= 3
      && state.findCounts.simon >= 3
      && state.findCounts.honey >= 3;
  }

  function getInventory() {
    return [...(state.inventory || [])];
  }

  function hasInventoryItem(id) {
    return !!id && state.inventory.includes(id);
  }

  function addInventoryItem(id) {
    if (!id || state.inventory.includes(id)) return false;
    state.inventory.push(id);
    save();
    return true;
  }

  function removeInventoryItem(id) {
    if (!id) return false;
    const idx = state.inventory.indexOf(id);
    if (idx < 0) return false;
    state.inventory.splice(idx, 1);
    save();
    return true;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  function recordVinyl(id) {
    if (!id) return;
    state.vinylListens = (state.vinylListens || 0) + 1;
    state.vinylListenCounts[id] = (state.vinylListenCounts[id] || 0) + 1;
    if (!state.vinyls.includes(id)) state.vinyls.push(id);
    save();
  }

  function getVinylListenCount(id) {
    if (id) return state.vinylListenCounts?.[id] || 0;
    return state.vinylListens || state.vinyls.length;
  }

  function recordNpc(id) {
    if (!id || state.npcs.includes(id)) return;
    state.npcs.push(id);
    save();
  }

  function recordRun({
    slices = 0, perfects = 0, score = 0, won = false, improv = 0, misses = 0,
    grooveChoice = 'keep',
  } = {}) {
    state.runs++;
    state.bestScore = Math.max(state.bestScore, score);
    state.bestSlices = Math.max(state.bestSlices, slices);
    if (won) state.wins++;
    state.lastRun = {
      slices, perfects, score, won, improv, misses, grooveChoice,
      at: Date.now(),
    };
    save();
    return getAlbumPct();
  }

  function getLastRun() {
    return state.lastRun ? { ...state.lastRun } : null;
  }

  function getAftermathTier(run = state.lastRun) {
    if (!run) return 'tasty';
    if (!run.won) return 'static';
    if (run.perfects >= 8 || run.improv >= 65) return 'wings';
    if (run.perfects >= 4 || run.score >= 1800) return 'groove';
    return 'tasty';
  }

  function getExplorationPct() {
    const v = state.vinyls.filter((id) => VINYL_IDS.includes(id)).length / VINYL_IDS.length;
    const n = state.npcs.filter((id) => NPC_IDS.includes(id)).length / NPC_IDS.length;
    return Math.round(((v + n) / 2) * 100);
  }

  function getAlbumPct() {
    const b = getAlbumBreakdown();
    return b.total;
  }

  function getAlbumBreakdown() {
    const exploreDetail = getExplorationPct();
    const explore = exploreDetail * 0.4;
    const rhythm = Math.min(100, (state.bestSlices / 15) * 100) * 0.35;
    const mastery = (state.wins > 0 ? 100 : 0) * 0.25;
    return {
      total: Math.min(100, Math.round(explore + rhythm + mastery)),
      explore: Math.round(explore),
      rhythm: Math.round(rhythm),
      mastery: Math.round(mastery),
      exploreDetail,
      bestSlices: state.bestSlices,
      wins: state.wins,
    };
  }

  function getUnlockTier() {
    const p = getAlbumPct();
    if (p >= 100) return 4;
    if (p >= 75) return 3;
    if (p >= 50) return 2;
    if (p >= 25) return 1;
    return 0;
  }

  function isChill() { return !!state.chillMode; }

  function setChill(on) {
    state.chillMode = !!on;
    save();
  }

  function toggleChill() {
    setChill(!state.chillMode);
    return state.chillMode;
  }

  function hasVinyl(id) {
    return state.vinyls.includes(id);
  }

  function unlockSecret(id) {
    if (!id || state.secrets.includes(id)) return false;
    state.secrets.push(id);
    save();
    return true;
  }

  function hasSecret(id) {
    return state.secrets.includes(id);
  }

  function getSecretCount() {
```

*(+131 more lines)*

## store-items.js (379 lines)

```js
// Pickups · usable items · organic hooks into store quests
window.StoreItems = (function () {
  const EXAMINE_USE = {
    storm_poster: 'storm_poster',
    jazz_poster: 'jazz_poster',
    chalk_path: 'chalk_path',
    map_note: 'map_note',
    demo_deck: 'demo_deck',
    listening_rug: 'listening_rug',
    hi_fi_plant: 'hi_fi_plant',
    neon_hum: 'neon_hum',
    register_wear: 'register_wear',
    lamp_dust: 'lamp_dust',
    storm_spine: 'storm_spine',
    mirror_scratch: 'mirror_scratch',
  };

  const ITEMS = {
    storm_liner: {
      name: 'storm liner scrap',
      icon: '∴',
      color: '#4a8f7a',
      desc: 'Green ink from a shelter spine. Smells like rain on paper.',
      kind: 'key',
      pickup: { examine: 'storm_spine', chance: 1, firstOnly: true },
      useAt: ['storm_poster', 'neon_hum'],
      useText: 'Press the scrap to the poster — storm colors align.',
      onUse(examineId) {
        if (examineId === 'storm_poster') {
          return {
            toast: 'the poster corner blooms green.... orph was right about beauty beside cruelty.',
            journal: { title: 'Used · storm liner', body: 'The faded poster drank the green ink. A storm trace feels closer.' },
          };
        }
        return { toast: 'neon flickers green for a breath.... late night SOUL.', journal: null };
      },
    },
    chalk_stub: {
      name: 'chalk stub',
      icon: '◎',
      color: '#c9a84c',
      desc: 'Simon\'s breadcrumb chalk. Still dusty.',
      kind: 'tool',
      pickup: { examine: 'chalk_path', chance: 1, firstOnly: true },
      useAt: ['jazz_poster', 'map_note'],
      useText: 'Drag chalk along the poster edge — maybe a hidden shelf?',
      onUse(examineId) {
        if (examineId === 'jazz_poster') {
          return {
            toast: 'a faint arrow appears behind JAZZ.... simon would smirk.',
            journal: { title: 'Chalked the poster', body: 'Breadcrumb trail behind the JAZZ sign. Simon swears there is a shelf back there.' },
          };
        }
        return {
          toast: 'chalk extends the penciled map toward the moon shelf....',
          journal: { title: 'Map extended', body: 'Crate stacks → moon shelf → whole album home. Path confirmed.' },
        };
      },
    },
    map_scrap: {
      name: 'pencil map scrap',
      icon: '▤',
      color: '#8a7a6a',
      desc: 'Shelf-edge map snippet. Crate stacks to moon.',
      kind: 'tool',
      pickup: { examine: 'map_note', chance: 1, firstOnly: true },
      useAt: null,
      useText: 'Study the map — where does the album lead?',
      onUse() {
        return {
          toast: 'moon · shelter · mirror — the scrap hums in that order.',
          journal: { title: 'Read the map scrap', body: 'Three rooms, three spines, one register. The album is a path not a prize.' },
        };
      },
    },
    demo_ribbon: {
      name: 'demo deck ribbon',
      icon: '♫',
      color: '#c45c7a',
      desc: 'Pink ribbon from Honey\'s warm demo deck.',
      kind: 'keepsake',
      pickup: { examine: 'demo_deck', chance: 0.55, firstOnly: true },
      useAt: ['listening_rug', 'demo_deck'],
      useText: 'Let the ribbon vibrate on the rug.',
      onUse(examineId) {
        return {
          toast: examineId === 'listening_rug'
            ? 'rug fibers buzz whole-side energy.... honey was right.'
            : 'motor still warm — heartbeat in the dust.',
          journal: { title: 'Ribbon hummed', body: 'No skip-button energy. Sit. Breathe. Eat the whole side.' },
        };
      },
    },
    rug_thread: {
      name: 'rug thread',
      icon: '∿',
      color: '#c45c7a',
      desc: 'Pink fiber from the listening rug.',
      kind: 'keepsake',
      pickup: { examine: 'listening_rug', chance: 0.4, firstOnly: true },
      useAt: ['hi_fi_plant'],
      useText: 'Tie thread near the amp — earnest green meets pink.',
      onUse() {
        return {
          toast: 'plant leaves tremble on the downbeat....',
          journal: { title: 'Thread on the amp', body: 'People are so amazing tbh — the hi-fi corner agrees.' },
        };
      },
    },
    glass_splinter: {
      name: 'glass splinter',
      icon: '◇',
      color: '#7b5ea7',
      desc: 'Purple-tinted shard from a scratched shelf lip.',
      kind: 'tool',
      pickup: { examine: 'mirror_scratch', chance: 0.45, firstOnly: true },
      useAt: ['mirror_scratch'],
      useText: 'Hold splinter to purple glass energy.',
      onUse() {
        return {
          toast: 'mirror-edge shimmers without the mirror vinyl spinning....',
          journal: { title: 'Splinter held up', body: 'The shelf remembers purple glass. Wings maybe, at the edge.' },
        };
      },
    },
    neon_flyer: {
      name: 'neon flyer stub',
      icon: '▮',
      color: '#e8c88c',
      desc: 'SOUL flickers on damp paper from the door glass.',
      kind: 'keepsake',
      pickup: { examine: 'neon_hum', chance: 0.5, firstOnly: true },
      useAt: ['neon_hum'],
      useText: 'Read the stub under the neon hum.',
      onUse() {
        return {
          toast: 'late night · open door · warm hands....',
          journal: { title: 'Neon stub', body: 'Visitors only meant to warm their hands. The sidewalk bleeds gold.' },
        };
      },
    },
    register_splinter: {
      name: 'counter wood chip',
      icon: '□',
      color: '#c9a84c',
      desc: 'Smooth register wood — thumbprints of listening.',
      kind: 'key',
      pickup: { examine: 'register_wear', chance: 1, firstOnly: true },
      useAt: ['register_wear'],
      useText: 'Knock the chip on worn counter wood.',
      onUse() {
        return {
          toast: 'counter ring travels the store.... sarah heard that once.',
          journal: { title: 'Counter knock', body: 'Sarah worked this counter. Whole albums. No rush. The wood remembers.' },
        };
      },
    },
    dust_vial: {
      name: 'dust in a matchbox',
      icon: '✧',
      color: '#e8e0f0',
      desc: 'Lamp gold motes — slow notes suspended.',
      kind: 'keepsake',
      pickup: { examine: 'lamp_dust', chance: 0.35, firstOnly: true },
      useAt: null,
      useText: 'Open the matchbox — watch motes in lamplight.',
      onUse() {
        return {
          toast: 'motes swirl like slow notes.... the store breathes.',
          journal: { title: 'Dust motes', body: 'Nobody performing. Just lamp gold and patience.' },
        };
      },
    },
    bird_feather: {
      name: 'doorway feather',
      icon: '𓅰',
      color: '#f8f4e8',
      desc: 'Soft feather — the bird left trust behind.',
      kind: 'key',
      pickup: { event: 'bird_helped', chance: 1 },
```

*(+199 more lines)*

## pause-journal.js (484 lines)

```js
// Pause menu · journal · inventory — overworld companion
window.StorePause = (function () {
  const JOURNAL_KEY = 'eat-sounds-journal-v2';
  const TAB = { JOURNAL: 'journal', INVENTORY: 'inventory' };

  const MUTUAL_WORDS = { orph: 'storm', simon: 'breadcrumb', honey: 'heartbeat' };
  const VINYL_NAMES = { moon: 'gold moon jazz', shelter: 'green storm', mirror: 'purple glass' };
  const NPC_NAMES = {
    orph: 'Orph', simon: 'Simon', honey: 'Honey', ninjawhee_return: 'Sarah',
  };

  const TYPE_LABELS = {
    thought: 'thinking', talk: 'heard', observe: 'noticed', event: 'happened',
    quest: 'clue', noted: 'noted', item: 'found', ambient: 'musing',
  };

  const JOURNAL_RANDOM = [
    { id: 'amb-neon', chance: 0.28, type: 'ambient', title: 'Neon bleed', body: 'Gold leaks into the wet sidewalk outside. The door stays open anyway.' },
    { id: 'amb-dust', chance: 0.22, type: 'ambient', title: 'Dust motes', body: 'Lamp gold hangs still. The store breathes when nobody performs.' },
    { id: 'amb-carpet', chance: 0.25, type: 'ambient', title: 'Carpet hush', body: 'Middle stacks swallow footsteps. Lamps hum lower in room two.' },
    { id: 'amb-trumpet', chance: 0.2, type: 'ambient', title: 'Valve air', body: 'Smells like dust and trumpet valves. Late night jazz sanctuary.' },
    { id: 'amb-crates', chance: 0.24, type: 'ambient', title: 'Crate towers', body: 'Pre-loved spines lean like patient listeners.' },
    { id: 'amb-booth', chance: 0.23, type: 'ambient', title: 'Booth glass', body: 'Purple glass energy even when mirror vinyl sleeps.' },
    { id: 'amb-passer', chance: 0.3, type: 'ambient', title: 'Warm hands', body: 'Visitors drift in just to warm their hands. That is enough.' },
    { id: 'amb-sarah', chance: 0.18, type: 'ambient', title: 'Register wood', body: 'Thumbprints of listening worn smooth into the counter.' },
    { id: 'amb-echo', chance: 0.26, type: 'ambient', title: 'Echo math', body: 'Each preview is an orb. Orbs teach the needle where to bite.' },
    { id: 'amb-bird', chance: 0.15, type: 'ambient', title: 'Wings maybe', body: 'Even frightened things find music doors if you wait.' },
    { id: 'amb-chill', chance: 0.2, type: 'ambient', title: 'No rush', body: 'Whole sides only. No skip-button energy in here.' },
    { id: 'amb-mirror', chance: 0.17, type: 'ambient', title: 'Glass blink', body: 'The watermark is also a door. ∴𓅰' },
  ];

  const EXAMINE_RANDOM = {
    storm_spine: { chance: 0.35, body: 'Green ink like prayers. Shelter from every storm.' },
    storm_poster: { chance: 0.4, body: 'Beauty beside cruelty — paper still remembers rain.' },
    jazz_poster: { chance: 0.45, body: 'Breadcrumb bait behind JAZZ. Delicious.' },
    chalk_path: { chance: 0.38, body: 'Here.... then there.... Floor map fades; groove does not.' },
    demo_deck: { chance: 0.42, body: 'Motor warmth — heartbeat in the dust.' },
    listening_rug: { chance: 0.36, body: 'Pink fibers hold whole-side energy.' },
    neon_hum: { chance: 0.5, body: 'SOUL flickers. So do I.' },
    register_wear: { chance: 0.3, body: 'Sarah\'s whole-album afternoons left thumbprints.' },
    lamp_dust: { chance: 0.55, body: 'Motes like slow notes caught in lamp gold.' },
    hi_fi_plant: { chance: 0.33, body: 'Earnest green trembles on the downbeat.' },
    mirror_scratch: { chance: 0.4, body: 'Purple glass energy without the glass.' },
    map_note: { chance: 0.35, body: 'Crate stacks → moon shelf → home.' },
  };

  const TALK_RANDOM = {
    orph: { chance: 0.3, body: 'Storm-colored patience. Liner notes like liturgy.' },
    simon: { chance: 0.32, body: 'Shelf behind the poster? Do not tell him I heard.' },
    honey: { chance: 0.34, body: 'Whole sides. Sit. Breathe. Eat the sound.' },
    ninjawhee_return: { chance: 0.25, body: 'Whole albums. No rush. She smiles when you listen.' },
  };

  let entries = [];
  let open = false;
  let activeTab = TAB.JOURNAL;
  let selectedItemId = null;
  let overlayEl = null;
  let journalEl = null;
  let inventoryEl = null;
  let lastThoughtAt = 0;
  let lastThoughtKey = '';
  let sessionStarted = false;

  function load() {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      if (raw) entries = JSON.parse(raw);
    } catch (_) { /* ignore */ }
    if (!Array.isArray(entries)) entries = [];
  }

  function save() {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 120)));
    } catch (_) { /* ignore */ }
  }

  function hasEntry(id) {
    return entries.some((e) => e.id === id);
  }

  function addEntry(id, type, title, body, opts = {}) {
    if (!id || (hasEntry(id) && !opts.allowDup)) return false;
    entries.unshift({
      id, type, title, body, at: Date.now(), pin: !!opts.pin,
    });
    if (entries.length > 120) entries.length = 120;
    save();
    if (open) render();
    return true;
  }

  function maybeAddEntry(id, type, title, body, chance = 1) {
    if (hasEntry(id)) return false;
    if (chance < 1 && Math.random() > chance) return false;
    return addEntry(id, type, title, body);
  }

  function noteInteraction(kind, subject, detail) {
    const slug = `${kind}-${subject}-${Math.floor(Date.now() / 30000)}`;
    addEntry(`noted-${slug}`, 'noted', `${kind} · ${subject}`, detail, { allowDup: true });
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function getContext() {
    const ow = window.JazzStoreOverworld;
    const gp = window.GameProgress;
    const bridge = window.VinylEchoBridge;
    const findCounts = ow?.getFindCounts?.() || gp?.getFindCounts?.() || {};
    const talked = ow?.talked;
    const talkedIds = talked instanceof Set ? [...talked] : [];
    const seeds = bridge?.getSeed?.()?.seeds || [];
    const echoOrbs = seeds.filter((s) => !String(s).startsWith('npc:')).length;
    return {
      findCounts, talkedIds,
      vinylPreviewed: !!seeds.length || (gp?.getState?.()?.vinyls?.length > 0),
      vinyls: gp?.getState?.()?.vinyls || [],
      vinylListens: gp?.getState?.()?.vinylListenCounts || {},
      npcsMet: gp?.getState?.()?.npcs || [],
      secrets: gp?.getState?.()?.secrets || [],
      albumPct: gp?.getAlbumPct?.() ?? 0,
      echoOrbs, resonance: bridge?.getSeed?.()?.resonance ?? 0,
      aftermath: ow?.isAftermath?.(),
      sarahVisible: talkedIds.includes('ninjawhee_return') || !ow?.getNpcById?.('ninjawhee_return')?.hidden,
      inventory: gp?.getInventory?.() || [],
    };
  }

  function rollAmbient(pool = JOURNAL_RANDOM) {
    for (const row of pool) {
      if (hasEntry(row.id)) continue;
      if (Math.random() <= row.chance) {
        addEntry(row.id, row.type, row.title, row.body);
        return true;
      }
    }
    return false;
  }

  function onSessionStart(opts = {}) {
    sessionStarted = true;
    if (opts.aftermath) {
      addEntry(`aftermath-${opts.aftermath.tier}`, 'event', 'Back in the store',
        'The needle stopped. The floor still remembers your run. Sarah is at the register.');
      return;
    }
    maybeAddEntry('welcome-thought', 'thought', 'First step inside',
      'Dust, lamp gold, and quiet grooves. Orph, Simon, and Honey are in the aisles — I should say hello. Spinning vinyl wakes echoes for the rhythm bite.', 1);
    rollAmbient();
  }

  function onTalk(npc, firstTalk) {
    if (!npc) return;
    const name = npc.isPasserby
      ? (npc.label || 'visitor')
      : (NPC_NAMES[npc.id] || npc.label || npc.id);
    const capName = name.charAt(0).toUpperCase() + name.slice(1);

    noteInteraction('Talked', capName, firstTalk ? `First words with ${capName}.` : `Checked in with ${capName} again.`);

    if (npc.isPasserby) {
      maybeAddEntry(`talk-passer-${npc.variant}-${Date.now()}`, 'talk', `Visitor · ${capName}`,
        npc.hasHint ? 'They left a vinyl tip between shy sentences.' : 'Just warming their hands. The neon bleeds gold outside.', 0.85);
      window.StoreItems?.tryPickupFromTalk?.(npc);
      rollAmbient(JOURNAL_RANDOM.filter((r) => r.id === 'amb-passer'));
      queueThought();
      return;
    }

    const bodies = {
      orph: 'Storm-colored patience. He reads liner notes like prayers.',
      simon: 'Breadcrumb energy. He swears there is a shelf behind the JAZZ poster.',
      honey: 'Whole sides only. The listening rug still vibrates when she laughs.',
      ninjawhee_return: 'Sarah at the register. Whole albums. No rush.',
    };
```

*(+304 more lines)*

## vinyl-echo-bridge.js (334 lines)

```js
// SuperGrok Heavy — vinyl ↔ rhythm bridge (exploration seeds rhythm entry)
window.VinylEchoBridge = (function () {
  const VINYL_META = {
    moon: { color: '#c9a84c', lane: 0, label: 'D' },
    shelter: { color: '#4a8f7a', lane: 1, label: 'F' },
    mirror: { color: '#7b5ea7', lane: 2, label: 'J' },
    eat: { color: '#c45c7a', lane: 3, label: 'K' },
  };
  const NPC_BONUS = { orph: 8, simon: 6, honey: 10 };

  const MOTIFS = {
    moon: [349.23, 392, 440],
    shelter: [293.66, 349.23, 392],
    mirror: [523.25, 587.33, 659.25],
    eat: [220, 261.63, 329.63],
  };

  let resonance = 0;
  const memorySeeds = [];
  let beatTimer = null;
  let tutorialGen = 0;
  let ghostUntil = 0;
  let ghostLane = 0;
  let ghostKey = 'D';
  let ghostColor = '#c9a84c';
  let ghostSliceUntil = 0;

  function recordPreview(vinylId, audioCtx, dest) {
    if (!vinylId) return getSeed();
    const isNew = !memorySeeds.includes(vinylId);
    if (isNew) {
      memorySeeds.push(vinylId);
      resonance = Math.min(100, resonance + 25);
    }
    playEchoTutorial(vinylId, audioCtx, dest);
    triggerGhostTeaser(vinylId, audioCtx, dest);
    return getSeed();
  }

  function showGhostSlice(vinylId, audioCtx, dest) {
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    ghostLane = meta.lane;
    ghostKey = meta.label;
    ghostColor = meta.color;
    ghostSliceUntil = Date.now() + 2600;
    ghostUntil = Date.now() + 2600;
    playTeaserPing(audioCtx, dest, meta.lane);
  }

  function playTeaserPing(audioCtx, dest, lane = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = 280 + lane * 88;
    f.type = 'lowpass';
    f.frequency.value = 2400;
    g.gain.value = 0.14;
    osc.connect(f).connect(g).connect(dest || audioCtx.destination);
    const t = audioCtx.currentTime;
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.28);
    osc.stop(t + 0.3);
  }

  function triggerGhostTeaser(vinylId, audioCtx, dest) {
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    ghostLane = meta.lane;
    ghostKey = meta.label;
    ghostColor = meta.color;
    ghostUntil = Date.now() + 2000;
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220 + ghostLane * 95;
    g.gain.value = 0.08;
    osc.connect(g).connect(dest || audioCtx.destination);
    const t = audioCtx.currentTime;
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.18);
    osc.stop(t + 0.2);
  }

  const hummedThisSession = new Set();

  function playMotif(vinylId, audioCtx, dest, gain = 0.06) {
    const notes = MOTIFS[vinylId] || MOTIFS.eat;
    if (!audioCtx || !notes) return;
    const t0 = audioCtx.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(dest || audioCtx.destination);
      const t = t0 + i * 0.42;
      osc.start(t);
      g.gain.linearRampToValueAtTime(0.001, t + 0.35);
      osc.stop(t + 0.38);
    });
  }

  function recordNpc(npcId) {
    if (!npcId || memorySeeds.includes(`npc:${npcId}`)) return getSeed();
    memorySeeds.push(`npc:${npcId}`);
    resonance = Math.min(100, resonance + (NPC_BONUS[npcId] || 5));
    return getSeed();
  }

  function recordBirdGuide(audioCtx, dest) {
    if (memorySeeds.includes('bird')) return getSeed();
    memorySeeds.push('bird');
    resonance = Math.min(100, resonance + 12);
    playTeaserPing(audioCtx, dest, 1);
    return getSeed();
  }

  function clearBeatTimer() {
    if (beatTimer) {
      clearInterval(beatTimer);
      beatTimer = null;
    }
  }

  function cleanup() {
    tutorialGen++;
    clearBeatTimer();
    ghostUntil = 0;
  }

  function trySarahHum(vinylId, audioCtx, dest) {
    const listens = window.GameProgress?.getVinylListenCount?.(vinylId) ?? 0;
    if (listens < 3 || !vinylId || hummedThisSession.has(vinylId)) return false;
    hummedThisSession.add(vinylId);
    playMotif(vinylId, audioCtx, dest, 0.052);
    return true;
  }

  function resetSession() {
    cleanup();
    memorySeeds.length = 0;
    resonance = 0;
    ghostUntil = 0;
    ghostSliceUntil = 0;
    hummedThisSession.clear();
  }

  function playEchoTutorial(vinylId, audioCtx, dest) {
    if (!audioCtx) return;
    const gen = ++tutorialGen;
    clearBeatTimer();
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    let b = 0;
    beatTimer = setInterval(() => {
      if (gen !== tutorialGen) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      b++;
      const lane = (meta.lane + b - 1) % 4;
      const freq = 220 + lane * 95 + vinylId.length * 8;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lpf = audioCtx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      lpf.type = 'lowpass';
      lpf.frequency.value = 900 + resonance * 6;
      g.gain.value = 0.12;
      osc.connect(lpf).connect(g).connect(dest || audioCtx.destination);
      const t = audioCtx.currentTime;
      osc.start(t);
      g.gain.linearRampToValueAtTime(0.001, t + 0.22);
      osc.stop(t + 0.25);
      if (b >= 4) clearBeatTimer();
    }, 340);
  }

  function getSeed() {
```

*(+154 more lines)*

## vinyl-audio.js (858 lines)

```js
// Multi-movement jazz albums — accurate playback duration for store vinyl HUD
window.VinylAudio = (function () {
  let ctx, dest, tap = null, current = null, stopTimer = null, fadeTimer = null, currentId = null, stopHook = null;
  let fxBus = null;
  let fading = false;
  let fadeSnapshot = null;
  const LOOKAHEAD_SEC = 2.8;
  const LOOKAHEAD_TICK_MS = 100;
  const STORE_PREVIEW_SEC = 15;
  const VOLUME_BOOST = 1.5;
  let sessionId = 0;

  function isSourceNode(n) {
    return n && (typeof OscillatorNode !== 'undefined' && n instanceof OscillatorNode
      || typeof AudioBufferSourceNode !== 'undefined' && n instanceof AudioBufferSourceNode);
  }

  function disposeScheduled(nodes) {
    if (!nodes?.length) return;
    nodes.forEach((n) => {
      try {
        if (isSourceNode(n)) n.stop(0);
        n.disconnect?.();
      } catch (_) { /* already stopped */ }
    });
    nodes.length = 0;
  }

  function spb(bpm) { return 60 / bpm; }

  function disposeFx() {
    if (!fxBus) return;
    try {
      fxBus.dry?.disconnect?.();
      fxBus.wet?.disconnect?.();
      fxBus.delay?.disconnect?.();
      fxBus.fb?.disconnect?.();
      fxBus.lp?.disconnect?.();
    } catch (_) { /* already torn down */ }
    fxBus = null;
  }

  function ensureFx() {
    const busDest = tap || dest;
    if (fxBus || !ctx || !busDest) return fxBus;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const delay = ctx.createDelay(1.4);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    dry.connect(busDest);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(lp);
    lp.connect(wet);
    wet.connect(busDest);
    fxBus = { dry, wet, delay, lp };
    return fxBus;
  }

  function createJazzScheduler(audioCtx, destination, t0) {
    const eventQueue = [];
    const liveNodes = [];
    let endTime = t0;
    let lookaheadId = null;
    let maxScheduleTime = Infinity;

    function inWindow(when) {
      return when < maxScheduleTime;
    }

    function extend(when, durSec = 0) {
      const t = Math.min(when + durSec, maxScheduleTime);
      if (t > endTime) endTime = t;
    }

    function scheduleNoteEvent(ev) {
      let { freq, when, dur, vol, type, opts = {} } = ev;
      if (when >= maxScheduleTime) return;
      dur = Math.min(dur, Math.max(0.02, maxScheduleTime - when));
      const boostedVol = vol * VOLUME_BOOST;
      const now = audioCtx.currentTime;
      const startAt = Math.max(when, now + 0.002);
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const f = audioCtx.createBiquadFilter();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, startAt);
      if (opts.detune) o.detune.value = opts.detune;
      f.type = opts.filter || 'lowpass';
      f.frequency.value = opts.filterHz || 4200;
      const atk = opts.attack ?? 0.035;
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(boostedVol, startAt + atk);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      o.connect(f);
      f.connect(g);
      const bus = ensureFx();
      if (opts.room && bus) {
        g.connect(bus.dry);
        g.connect(bus.delay);
      } else {
        g.connect(destination);
      }
      o.start(startAt);
      o.stop(startAt + dur + 0.05);
      liveNodes.push(o, g, f);
    }

    function scheduleBrushEvent(ev) {
      const { when, vol, swing = 0 } = ev;
      const now = audioCtx.currentTime;
      const len = Math.floor(audioCtx.sampleRate * 0.042);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const e = 1 - i / len;
        d[i] = (Math.random() * 2 - 1) * e * e;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const g = audioCtx.createGain();
      const f = audioCtx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 5200;
      f.Q.value = 0.55;
      g.gain.value = vol * VOLUME_BOOST;
      src.connect(f);
      f.connect(g);
      g.connect(destination);
      const start = Math.max(when + swing, now + 0.002);
      src.start(start);
      src.stop(start + 0.12);
      liveNodes.push(src, g, f);
    }

    function dispatch(ev) {
      if (ev.kind === 'brush') scheduleBrushEvent(ev);
      else scheduleNoteEvent(ev);
    }

    function pruneLiveNodes() {
      if (liveNodes.length > 360) {
        disposeScheduled(liveNodes.splice(0, liveNodes.length - 220));
      }
    }

    function flush() {
      const now = audioCtx.currentTime;
      const horizon = now + LOOKAHEAD_SEC;
      while (eventQueue.length && eventQueue[0].when <= horizon) {
        const ev = eventQueue.shift();
        if (ev.when < now - 0.08) continue;
        dispatch(ev);
      }
      pruneLiveNodes();
    }

    function note(freq, when, dur, vol, type, opts = {}) {
      if (!inWindow(when)) return;
      eventQueue.push({ kind: 'note', freq, when, dur, vol, type, opts });
      extend(when, dur);
    }

    function chord(freqs, when, dur, vol, type = 'triangle') {
      if (!inWindow(when)) return;
      freqs.forEach((fr, i) => {
        note(fr, when, dur, vol * (0.92 - i * 0.07), type, {
          detune: (i - 1.5) * 5,
          filterHz: 2600,
          room: true,
          attack: 0.07,
          release: 0.18,
        });
```

*(+678 more lines)*

## easter-eggs.js (189 lines)

```js
// Hidden discoveries — persisted via GameProgress.secrets
window.EasterEggs = (function () {
  const DFJK = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  const VINYL_ORDER = ['moon', 'shelter', 'mirror'];

  const META = {
    dfjk: {
      toast: '∴ four keys in order · pizza unlocked',
      quote: 'pizza in the groove · the cathedral remembers',
    },
    mirror_glyph: {
      toast: '∴𓅰 the glass blinked back',
      quote: 'the watermark is also a door',
    },
    moon_window: {
      toast: 'moon window · soliloquy w/ you',
      quote: 'the moon shelf sees late-night walkers',
    },
    mirror_door: {
      toast: 'knock knock · edge of the world',
      quote: 'theres a mirror at the edge of the world..',
    },
    counter_knock: {
      toast: 'counter ring · sarah heard that',
      quote: 'when I worked here my favorite thing was listening to whole albums',
    },
    combo_42: {
      toast: 'combo 42 · answer is a slice',
      quote: 'in the groove we become pizza · in the mirror we become wings',
    },
    score_2222: {
      toast: 'score 2222 · double deuce groove',
      quote: 'listen to entire albums — let the groove teach your hands where to bite',
    },
    vinyl_triple: {
      toast: 'three spines · whole store heard',
      quote: 'three records out tonight if you want a preview',
    },
    wings_return: {
      toast: 'wings tier · hidden neon warms',
      quote: 'when its real... no words are needed....',
    },
    bird_guide: {
      toast: 'little bird guided out · music was the door',
      quote: 'sometimes the gentlest groove is an exit',
    },
  };

  let dfjkIdx = 0;
  let lastDfjkAt = 0;
  let lastSecretAt = 0;
  const SECRET_COOLDOWN_MS = 700;
  let mirrorTaps = 0;
  let mirrorTapTimer = null;
  let sessionVinyls = [];
  let allKeysSince = 0;
  let fired = new Set();

  function unlock(id) {
    if (!META[id] || !window.GameProgress?.unlockSecret) return null;
    const isNew = GameProgress.unlockSecret(id);
    if (isNew) lastSecretAt = Date.now();
    return isNew ? { id, ...META[id] } : null;
  }

  function has(id) {
    return window.GameProgress?.hasSecret?.(id) || false;
  }

  function count() {
    return window.GameProgress?.getSecretCount?.() || 0;
  }

  function resetSession() {
    sessionVinyls = [];
    fired.clear();
    dfjkIdx = 0;
    mirrorTaps = 0;
    clearTimeout(mirrorTapTimer);
    mirrorTapTimer = null;
  }

  function once(id, fn) {
    if (fired.has(id)) return null;
    fired.add(id);
    return fn();
  }

  function rhythmCompleted() {
    return (window.GameProgress?.getState?.()?.runs ?? 0) >= 1;
  }

  function onKey(code, phase) {
    if (dialogueBlocked(phase)) return null;
    if (!rhythmCompleted()) return null;
    if (Date.now() - lastSecretAt < SECRET_COOLDOWN_MS) return null;
    if (!DFJK.includes(code)) {
      dfjkIdx = 0;
      return null;
    }
    if (dfjkIdx === 0 && Date.now() - lastDfjkAt < SECRET_COOLDOWN_MS) return null;
    if (code === DFJK[dfjkIdx]) {
      dfjkIdx++;
      if (dfjkIdx >= DFJK.length) {
        dfjkIdx = 0;
        lastDfjkAt = Date.now();
        return unlock('dfjk');
      }
    } else {
      dfjkIdx = code === DFJK[0] ? 1 : 0;
    }
    return null;
  }

  function dialogueBlocked(phase) {
    if (phase === 'dialogue' || phase === 'rhythm') return true;
    if (document.body?.classList.contains('dialogue-active')) return true;
    const scene = document.getElementById('dialogueScene');
    if (scene && !scene.classList.contains('hidden')) return true;
    return false;
  }

  function onMirrorTap() {
    mirrorTaps++;
    clearTimeout(mirrorTapTimer);
    mirrorTapTimer = setTimeout(() => { mirrorTaps = 0; }, 2200);
    if (mirrorTaps >= 7) {
      mirrorTaps = 0;
      return unlock('mirror_glyph');
    }
    return null;
  }

  function onOverworldSpot(spot) {
    if (!META[spot]) return null;
    return unlock(spot);
  }

  function onVinylPreview(id) {
    if (!id || sessionVinyls.includes(id)) return checkVinylTriple();
    sessionVinyls.push(id);
    return checkVinylTriple();
  }

  function checkVinylTriple() {
    if (sessionVinyls.length < 3) return null;
    const have = VINYL_ORDER.every((v) => sessionVinyls.includes(v));
    if (!have) return null;
    return unlock('vinyl_triple');
  }

  function onRhythmCombo(n) {
    if (n !== 42) return null;
    return once('combo_42', () => unlock('combo_42'));
  }

  function onRhythmScore(n) {
    if (n < 2222 || has('score_2222')) return null;
    return once('score_2222', () => unlock('score_2222'));
  }

  function onAftermathEnter(tier) {
    if (tier !== 'wings') return null;
    return once('wings_return_session', () => unlock('wings_return'));
  }

  function getBonusMicroQuotes() {
    return Object.keys(META)
      .filter((id) => has(id))
      .map((id) => META[id].quote)
      .filter(Boolean);
  }

  function getSpotHint(spot) {
    const hints = {
      moon_window: '[Z] moon window · soliloquy',
      mirror_door: '[Z] knock · edge of the world',
      counter_knock: '[Z] tap counter · sarah hears',
    };
    return hints[spot] || null;
```

*(+9 more lines)*

## audio-bus.js (204 lines)

```js
// Shared Web Audio routing: compressor, rhythm ducking, mode state machine
window.AudioBus = (function () {
  const MASTER_LEVEL = 0.68;
  const VINYL_IDLE_LEVEL = 0.72;
  const VINYL_STORE_LEVEL = 0.88;
  const SFX_LEVEL = 0.78;
  const RHYTHM_NOMINAL = 0.82;
  const DUCK_LEVEL = 0.48;
  const MODE_LOCK_MS = 120;

  function create(ctx) {
    const mix = ctx.createGain();
    mix.gain.value = 1;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 10;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.16;
    mix.connect(compressor);
    compressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_LEVEL;
    masterGain.connect(mix);

    const vinylGain = ctx.createGain();
    vinylGain.gain.value = VINYL_IDLE_LEVEL;
    const vinylLp = ctx.createBiquadFilter();
    vinylLp.type = 'lowpass';
    vinylLp.frequency.value = 5200;
    vinylLp.Q.value = 0.6;
    vinylGain.connect(vinylLp);
    vinylLp.connect(mix);

    const rhythmGain = ctx.createGain();
    rhythmGain.gain.value = RHYTHM_NOMINAL;
    rhythmGain.connect(mix);

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_LEVEL;
    sfxGain.connect(mix);

    let mode = 'idle';
    let modeLock = false;
    let pendingMode = null;
    let handlers = {
      stopVinyl: null,
      stopRhythm: null,
      stopEcho: null,
      stopQuotes: null,
    };

    function registerHandlers(h) {
      handlers = { ...handlers, ...h };
    }

    function stopRhythmClean() {
      const loop = handlers.stopRhythm;
      if (typeof loop === 'function') loop();
    }

    function stopVinylClean(fadeSec = 0.28) {
      const fn = handlers.stopVinyl;
      if (typeof fn === 'function') fn(fadeSec);
    }

    function applyModeGains(next, prev) {
      const t = ctx.currentTime;
      if (next === 'rhythm') {
        vinylGain.gain.cancelScheduledValues(t);
        vinylGain.gain.setTargetAtTime(0.001, t, 0.1);
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setTargetAtTime(RHYTHM_NOMINAL, t, 0.18);
      } else if (prev === 'rhythm') {
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setTargetAtTime(0.001, t, 0.06);
      }
      if (next === 'store') {
        vinylGain.gain.cancelScheduledValues(t);
        if (prev === 'rhythm') {
          vinylGain.gain.setValueAtTime(VINYL_STORE_LEVEL, t);
        } else {
          vinylGain.gain.setTargetAtTime(VINYL_STORE_LEVEL, t, 0.35);
        }
      } else if (next === 'idle' || next === 'dialogue') {
        vinylGain.gain.cancelScheduledValues(t);
        vinylGain.gain.setTargetAtTime(VINYL_IDLE_LEVEL, t, 0.25);
      }
    }

    function setMode(next) {
      if (modeLock) {
        pendingMode = next;
        return mode;
      }
      if (mode === next) return mode;
      modeLock = true;
      pendingMode = null;
      const prev = mode;

      if (prev === 'rhythm') {
        const t = ctx.currentTime;
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setValueAtTime(0, t);
        vinylGain.gain.cancelScheduledValues(t);
        sfxGain.gain.cancelScheduledValues(t);
        stopRhythmClean();
        handlers.stopQuotes?.();
      }

      const stopVinyl = prev === 'store'
        || next === 'rhythm'
        || (prev === 'rhythm' && next !== 'store')
        || next === 'dialogue'
        || next === 'idle';
      const fadeSec = prev === 'rhythm' && next === 'store' ? 0.42
        : prev === 'store' && next !== 'rhythm' ? 0.32
          : 0.2;
      if (stopVinyl) stopVinylClean(fadeSec);
      if (next === 'rhythm' || prev === 'store') handlers.stopEcho?.();

      if (next === 'dialogue' || next === 'idle') {
        handlers.stopQuotes?.();
      }

      applyModeGains(next, prev);
      mode = next;

      setTimeout(() => {
        modeLock = false;
        if (pendingMode && pendingMode !== mode) {
          const queued = pendingMode;
          pendingMode = null;
          setMode(queued);
        }
      }, MODE_LOCK_MS);
      return mode;
    }

    function duckRhythm(holdSec = 0.13, level = DUCK_LEVEL) {
      if (mode !== 'rhythm') return;
      const t = ctx.currentTime;
      rhythmGain.gain.cancelScheduledValues(t);
      rhythmGain.gain.setValueAtTime(rhythmGain.gain.value, t);
      rhythmGain.gain.linearRampToValueAtTime(level, t + 0.012);
      rhythmGain.gain.linearRampToValueAtTime(RHYTHM_NOMINAL, t + holdSec);
    }

    async function resume() {
      if (ctx.state === 'suspended') await ctx.resume();
    }

    function ensureVinylAudible(level = VINYL_STORE_LEVEL) {
      const t = ctx.currentTime;
      vinylGain.gain.cancelScheduledValues(t);
      vinylGain.gain.setValueAtTime(level, t);
    }

    async function resumeAndResetGain(level = VINYL_STORE_LEVEL) {
      await resume();
      ensureVinylAudible(level);
      return mode;
    }

    function snapGains() {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(MASTER_LEVEL, t);
      rhythmGain.gain.cancelScheduledValues(t);
      rhythmGain.gain.setValueAtTime(mode === 'rhythm' ? RHYTHM_NOMINAL : 0.001, t);
      sfxGain.gain.cancelScheduledValues(t);
      sfxGain.gain.setValueAtTime(SFX_LEVEL, t);
      vinylGain.gain.cancelScheduledValues(t);
      const vinylLevel = mode === 'store' ? VINYL_STORE_LEVEL
        : mode === 'rhythm' ? 0.001 : VINYL_IDLE_LEVEL;
      vinylGain.gain.setValueAtTime(vinylLevel, t);
    }

```

*(+24 more lines)*

## rhythm-loop.js (294 lines)

```js
// Looping jazz backing track for rhythm gameplay — RAF lookahead, tracked node cleanup
window.RhythmLoop = (function () {
  function create(ctx, dest) {
    let running = false;
    let beat = 0;
    let transportTime = 0;
    let rafId = null;
    let generation = 0;
    const liveNodes = new Set();
    let bpm = 84;
    let beatSec = 60 / bpm;
    let swing = beatSec * 0.06;
    let style = 'ballad';

    function setBpm(newBpm) {
      bpm = newBpm;
      beatSec = 60 / bpm;
      swing = beatSec * (style === 'ballad' ? 0.08 : 0.06);
      if (bpm >= 120) style = 'burner';
      else if (bpm >= 100) style = 'swing';
      else style = 'ballad';
    }

    function setStyle(next) {
      style = next;
      swing = beatSec * (style === 'ballad' ? 0.08 : 0.06);
    }

    const balladProg = [
      { bass: [82.41, 98, 110, 98], chord: [164.81, 196, 246.94], horn: 293.66 },
      { bass: [87.31, 103.83, 123.47, 103.83], chord: [174.61, 220, 261.63], horn: 311.13 },
      { bass: [73.42, 87.31, 98, 87.31], chord: [146.83, 174.61, 220], horn: 261.63 },
      { bass: [98, 110, 130.81, 110], chord: [196, 246.94, 293.66], horn: 329.63 },
    ];
    const swingProg = [
      { bass: [110, 110, 130.81, 110], chord: [220, 261.63, 329.63] },
      { bass: [87.31, 87.31, 110, 87.31], chord: [174.61, 220, 261.63] },
      { bass: [98, 98, 123.47, 98], chord: [196, 246.94, 293.66] },
      { bass: [82.41, 82.41, 98, 82.41], chord: [164.81, 196, 246.94] },
    ];
    const burnerProg = [
      { bass: [123.47, 123.47, 146.83, 123.47], chord: [246.94, 311.13, 369.99], horn: 440 },
      { bass: [110, 110, 130.81, 110], chord: [220, 261.63, 329.63], horn: 392 },
      { bass: [130.81, 130.81, 164.81, 130.81], chord: [261.63, 329.63, 392], horn: 493.88 },
      { bass: [98, 98, 123.47, 98], chord: [196, 246.94, 293.66], horn: 349.23 },
    ];
    const melody = [349.23, 392, 440, 493.88, 523.25, 493.88, 440, 392];
    const outGain = dest?.gain ? dest : null;

    const MAX_LIVE_NODES = 96;

    function track(node) {
      if (!node) return node;
      if (liveNodes.size >= MAX_LIVE_NODES) {
        const oldest = liveNodes.values().next().value;
        if (oldest) {
          try { oldest.stop?.(0); oldest.disconnect?.(); } catch (_) { /* stopped */ }
          liveNodes.delete(oldest);
        }
      }
      liveNodes.add(node);
      return node;
    }

    function releaseAll() {
      liveNodes.forEach((n) => {
        try {
          if (typeof n.stop === 'function') n.stop(0);
          n.disconnect?.();
        } catch (_) { /* already stopped */ }
      });
      liveNodes.clear();
    }

    function brush(when, vol, high = false) {
      const len = Math.floor(ctx.sampleRate * (high ? 0.03 : 0.04));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = track(ctx.createBufferSource());
      src.buffer = buf;
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = high ? 'highpass' : 'bandpass';
      f.frequency.value = high ? 6200 : 4800;
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(when);
      src.stop(when + 0.12);
    }

    function pianoComp(when, freqs, vol = 0.07) {
      freqs.forEach((freq, i) => {
        const co = track(ctx.createOscillator());
        const cg = ctx.createGain();
        const cf = ctx.createBiquadFilter();
        co.type = 'triangle';
        co.frequency.value = freq;
        co.detune.value = (i - 1) * 5;
        cf.type = 'lowpass';
        cf.frequency.value = 1800;
        cg.gain.setValueAtTime(0, when + swing);
        cg.gain.linearRampToValueAtTime(vol, when + swing + 0.02);
        cg.gain.exponentialRampToValueAtTime(0.001, when + swing + beatSec * 1.1);
        co.connect(cf);
        cf.connect(cg);
        cg.connect(dest);
        co.start(when + swing);
        co.stop(when + swing + beatSec * 1.2);
      });
    }

    function hiHat(when, open = false, vol = 0.05) {
      const len = Math.floor(ctx.sampleRate * (open ? 0.06 : 0.025));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = track(ctx.createBufferSource());
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = open ? 6800 : 8200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + (open ? 0.08 : 0.04));
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(when);
      src.stop(when + 0.1);
    }

    function hornStab(when, freq, vol = 0.06) {
      const ho = track(ctx.createOscillator());
      const hg = ctx.createGain();
      const hf = ctx.createBiquadFilter();
      ho.type = 'sawtooth';
      ho.frequency.value = freq;
      hf.type = 'lowpass';
      hf.frequency.setValueAtTime(1400, when);
      hf.frequency.exponentialRampToValueAtTime(900, when + 0.35);
      hg.gain.setValueAtTime(0, when);
      hg.gain.linearRampToValueAtTime(vol, when + 0.04);
      hg.gain.exponentialRampToValueAtTime(0.001, when + 0.42);
      ho.connect(hf);
      hf.connect(hg);
      hg.connect(dest);
      ho.start(when);
      ho.stop(when + 0.45);
    }

    function scheduleBeat(when) {
      const bar = Math.floor(beat / 4) % 4;
      const step = beat % 4;
      const prog = style === 'ballad' ? balladProg[bar]
        : style === 'burner' ? burnerProg[bar] : swingProg[bar];
      const human = (Math.random() - 0.5) * 0.012;
      const bassVol = style === 'ballad' ? 0.32 : style === 'burner' ? 0.3 : 0.28;

      const bo = track(ctx.createOscillator());
      const bg = ctx.createGain();
      const bf = ctx.createBiquadFilter();
      bo.type = style === 'ballad' ? 'triangle' : 'sine';
      const bassFreq = prog.bass[step];
      if (style === 'ballad') {
        bo.frequency.setValueAtTime(bassFreq * 0.96, when + human);
        bo.frequency.exponentialRampToValueAtTime(bassFreq, when + human + 0.045);
      } else {
        bo.frequency.value = bassFreq;
      }
      bf.frequency.value = style === 'ballad' ? 520 : 420;
      bg.gain.setValueAtTime(0, when + human);
      bg.gain.linearRampToValueAtTime(bassVol, when + human + 0.015);
      bg.gain.exponentialRampToValueAtTime(0.001, when + human + beatSec * 0.92);
      bo.connect(bf);
      bf.connect(bg);
      bg.connect(dest);
      bo.start(when + human);
```

*(+114 more lines)*

## heavy-runtime.js (426 lines)

```js
// SuperGrok Heavy runtime — contract functions for eat-the-sounds

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ laneX0:number, laneW:number, laneTopY:number, hitY:number, cx:number, goodMs:number, approachTime:number }} layout
 * @param {{ label:string, color:string, role:string }[]} lanes
 * @param {number} time
 */
function drawAlignedPlayfield(ctx, layout, lanes, time) {
  const {
    laneX0, laneW, laneTopY, hitY, cx,
    goodMs, greatMs = goodMs * 0.65, perfectMs = goodMs * 0.35, approachTime,
  } = layout;
  const beatPulse = 0.5 + Math.sin(time * 0.09) * 0.2;
  const laneCenter = (i) => laneX0 + i * laneW + laneW / 2;
  const PX = window.PixelGfx;
  if (PX) PX.setupPixelCtx(ctx);

  for (let i = 0; i < lanes.length; i++) {
    const x = laneX0 + i * laneW;
    for (let y = laneTopY; y < hitY + 32; y += 8) {
      const fade = (y - laneTopY) / (hitY - laneTopY + 32);
      ctx.fillStyle = fade < 0.5 ? 'rgba(201,168,76,0.02)' : lanes[i].color + '18';
      ctx.fillRect(x + 4, y, laneW - 8, 8);
    }

    ctx.strokeStyle = lanes[i].color + '66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, laneTopY, laneW - 8, hitY - laneTopY + 28);

    ctx.fillStyle = lanes[i].color + '88';
    ctx.fillRect(laneCenter(i) - 1, hitY + 4, 2, 24);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = lanes[i].color;
    ctx.textAlign = 'center';
    ctx.fillText(lanes[i].label, laneCenter(i), laneTopY - 10);
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = lanes[i].color + '99';
    ctx.fillText((lanes[i].role || '').slice(0, 6), laneCenter(i), laneTopY + 6);
  }

  const laneH = hitY - laneTopY;
  const winGood = (goodMs / approachTime) * laneH;
  const winGreat = (greatMs / approachTime) * laneH;
  const winPerfect = (perfectMs / approachTime) * laneH;
  ctx.fillStyle = 'rgba(201,168,76,0.07)';
  ctx.fillRect(laneX0 + 2, hitY - winGood, laneW * lanes.length - 4, winGood);
  ctx.fillStyle = 'rgba(74,143,122,0.1)';
  ctx.fillRect(laneX0 + 2, hitY - winGreat, laneW * lanes.length - 4, winGreat);
  ctx.fillStyle = 'rgba(248,244,255,0.12)';
  ctx.fillRect(laneX0 + 2, hitY - winPerfect, laneW * lanes.length - 4, winPerfect);

  const pulse = beatPulse > 0.6 ? 4 : 0;
  ctx.fillStyle = `rgba(201,168,76,${0.65 + beatPulse * 0.3})`;
  ctx.fillRect(laneX0, hitY - 2 - pulse, laneW * lanes.length, 4 + pulse);

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(201,168,76,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('▼ BITE ▼', cx, hitY - 12);

  const pulseR = 6 + Math.floor(Math.sin(time * 0.14) * 2) * 2;
  if (PX) PX.fillPixelDisk(ctx, cx, hitY, pulseR, 4, 'rgba(240,240,255,0.2)');
}

/**
 * @param {AudioContext} audioCtx
 * @param {AudioNode} dest
 * @param {number} lane 0-3
 * @param {number[]} pentatonic
 * @param {number[]} stepRef mutable per-lane step array
 * @param {number[]} laneDegree root indices per lane
 * @returns {{ freq:number, idx:number }}
 */
function playJazzImprov(audioCtx, dest, lane, pentatonic, stepRef, laneDegree) {
  const step = stepRef[lane] || 0;
  const idx = (laneDegree[lane] + step) % pentatonic.length;
  const freq = pentatonic[idx];
  stepRef[lane] = (step + (Math.random() < 0.3 ? 2 : 1)) % pentatonic.length;

  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  const vib = audioCtx.createOscillator();
  const vibG = audioCtx.createGain();

  o.type = lane < 2 ? 'triangle' : 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.linearRampToValueAtTime(freq * (1.02 + lane * 0.008), t + 0.06);
  o.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.22);
  o.detune.value = (Math.random() - 0.5) * 22;

  vib.frequency.value = 5.5 + lane;
  vibG.gain.value = 3 + lane;
  vib.connect(vibG);
  vibG.connect(o.detune);

  f.type = 'lowpass';
  f.frequency.value = lane < 2 ? 850 : 2400;

  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

  o.connect(f);
  f.connect(g);
  g.connect(dest);
  vib.start(t);
  o.start(t);
  vib.stop(t + 0.35);
  o.stop(t + 0.38);

  return { freq, idx };
}

/**
 * @param {HTMLElement} root documentElement
 * @param {{ W:number, margin:number, laneW:number, laneX0:number, hitY:number, laneCenters:number[] }} layout
 */
function syncLaneLayout(root, layout) {
  const playW = layout.laneW * 4;
  root.style.setProperty('--play-left', layout.laneX0 + 'px');
  root.style.setProperty('--play-width', playW + 'px');
  root.style.setProperty('--hit-y', layout.hitY + 'px');
  layout.laneCenters.forEach((c, i) => {
    root.style.setProperty(`--lane-${i}`, c + 'px');
  });
}

/**
 * @param {number} diff ms from note time
 */
function classifyHit(diff, perfectMs, greatMs, goodMs) {
  if (diff <= perfectMs) return 'perfect';
  if (diff <= greatMs) return 'great';
  if (diff <= goodMs) return 'good';
  return null;
}

/** Short lane pluck on every key press (D/F/J/K) */
function playKeyTap(audioCtx, dest, lane, basePitch = 220) {
  const laneVoices = [
    { freq: 68, type: 'sine', filterHz: 420, vol: 0.2 },
    { freq: 440, type: 'sawtooth', filterHz: 2400, vol: 0.14 },
    { freq: 720, type: 'square', filterHz: 3100, vol: 0.12 },
    { freq: 1380, type: 'triangle', filterHz: 4200, vol: 0.1 },
  ];
  const voice = laneVoices[lane] || laneVoices[0];
  const freq = basePitch || voice.freq;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  o.type = voice.type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.035);
  f.type = 'lowpass';
  f.frequency.value = voice.filterHz;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(voice.vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.3);

  const len = Math.floor(audioCtx.sampleRate * 0.06);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const ng = audioCtx.createGain();
  const nf = audioCtx.createBiquadFilter();
  nf.type = 'highpass';
  nf.frequency.value = 2200 + lane * 400;
  ng.gain.setValueAtTime(0.07, t);
```

*(+246 more lines)*
