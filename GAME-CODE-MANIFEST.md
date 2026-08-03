# Code Manifest

| File | Lines | Exports | Key consts |
|------|-------|---------|------------|
| ninjawhee-eat-the-sounds.html | 5366 | __eatItemPickupBlip, __eatAmbientBlip | LANES, KEY_MAP, PENTATONIC, LANE_DEGREE, QUOTES, MICRO_QUOTES |
| overworld.js | 2635 | JazzStoreOverworld | TILE, ROOM_W, COLS, ROWS, MAP, ARCH_ROWS |
| heavy-dialogue-art.js | 525 | HeavyDialogueArt | PAL, FRAMES, GLYPH_AURA, PX, GROK_PORTRAIT_CANDIDATES, NPC_ACCENTS |
| pixel-gfx.js | 712 | PixelGfx | PAL |
| game-progress.js | 311 | GameProgress | KEY, VINYL_IDS, NPC_IDS |
| store-items.js | 390 | StoreItems | EXAMINE_USE, ITEMS |
| pause-journal.js | 548 | StorePause | JOURNAL_KEY, TAB, MUTUAL_WORDS, VINYL_NAMES, NPC_NAMES, TYPE_LABELS |
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
updateSongPill, stopQuoteCycler, pauseQuoteCycler, typeQuoteLine, startQuoteCycler, syncLayout, resize, laneCenter, noteFallProgress, noteY, scheduleNextPizzaSpawn, maybeSpawnBonusPizza, playPizzaBonusSfx, tryHitBonusPizza, checkBonusPizzaMisses, drawBonusPizza, markFeastComplete, cleanupRhythmSession, ensureAudioReady, initAudio, duckRhythmSfx, playImprov, playLaneHit, getMicroQuotePool, eggPhase, handleEggUnlock, onOverworldSecret, getEchoChartSections, applySongTiming, computeDifficultyTier, makeChartNote, injectAdaptiveNotes, injectLivePressure, buildChartForSong, buildChart, advanceToNextSong, showPhaseBrief, checkPhases, cullActiveNotes, spawnNotes, updateHint, showJudgment, flashKey, syncTimingWindows, updateModePill, formatAlbumBreakdown, formatAlbumBreakdownDetail, mirrorChoiceConsequence, updateMirrorChoiceAlbumUI, updateAlbumPctIntro, updateEndAlbumDisplay, tryUnlockGroove, classifyHit, updateUI, addSlice, burst, judgeNote, missNote, tryHit, releaseLane, checkMisses, clearAftermathReturnTimer, clearAftermathDialogueTimer, scheduleAftermathReturn, showRhythmEndScreen, closeMirrorChoice, resetMirrorFlow, flashMirrorSarah, confirmMirrorChoice, openMirrorChoice, finishWin, endSong, drawShelves, drawCathedralArch, drawRhythmAmbience, drawBackground, drawLanes, drawRipples, drawHitFlashes, drawFloatNotes, drawVinylNote, loop, runCountdown, initPalette, startGame, resizeDialogueCanvas, playDialogueBlip, playChoiceBlip, playConfirmBlip, updatePortraitLabel, drawDialogueFrame, spriteLoop, enrichDialogueNode, getDialogueNode, handleDialogueToken, closeDialogueUI, openDialogueUI, resolveNpcDialogue, updateOverworldHintUI, setOverworldPaused, toggleOverworldPause, startOverworld, enterAftermathStore, showSpeaker, hideChoices, renderChoices, resolveDialogueLine, beginLine, advanceDialogueLine, confirmChoice, dialogueAdvance, dialogueTick, openBootIntro, bootGame, startDialogue, moveChoice

### overworld.js
patchRow, buildOpenStoreMap, validateMap, rebuildWalkGrids, getAftermathStyle, tileAt, isWalkableTile, isNpcWalkableTile, isSolid, gridWalkable, wrapTextLines, drawTextPanel, roomIndex, screenX, entTile, setEntTile, bootstrapMotion, displayPos, snapMove, entityStepAnim, canDiagonalStep, moveAutCost, entitySpeed, entityGridPos, entityOccupiedTiles, playerGridPos, entScreenPos, birdBlocksTile, terrainBlocksPlayer, bumpMessage, diagonalBlockTile, showBumpToast, canWalkTile, npcPathStep, gainMonsterEnergy, resolveMonsterActions, spendAut, playerSpendsAut, drawRoomTint, drawStoreAmbience, findPath, allNpcEntities, npcBlocksPlayer, npcAt, npcBlocks, npcOnTalkPad, npcInTalkRange, playerFacingNpc, npcNearPlayer, dirBetween, pickWanderTile, beginPathTo, wanderNpcAct, randomFloorInRoom, passerUsesDoor, updateStoreDoor, spawnPasserby, removePasserby, passerbyAct, tickNPCs, tileDist, tileDistCheb, faceToward, facingTile, padDist, examineSpotInRange, nearestExamineSpot, examineForHint, examineFacingSpot, vinylInRange, examineSpot, drawInteractBubble, drawExamineGlints, secretAtTile, getSecretSpot, scheduleBirdEncounter, birdPathStep, birdAct, spawnBirdEncounter, drawBird, birdForInteract, resolveBirdEncounter, showExamineToast, showSecretToast, vinylForHint, vinylForInteract, allInteractPads, drawInteractPads, resolveInteractTarget, invalidateInteractCache, highlightedVinyl, drawStoreProps, vinylAtShelf, vinylAtPad, drawTile, drawSecretSpotHints, drawEchoRipple, drawAftermathEffects, tileVisible, drawRoomArchways, drawStoreDecor, drawVinyls, drawSarahPresence, drawAftermathToast, drawSecretToast, drawFlavorToast, drawDust, drawNowPlayingHUD, drawCharacter, drawPlayer, drawNPC, tickViz, render, clearListening, clearVinylToastTimers, scheduleVinylToast, triggerPreviewHush, stopVinyl, applyVinylListen, playVinyl, tryMove, waitTurn, checkInteract, mutualsComplete, shouldRevealSarah, syncSarahVisibility, updateReturnNPC, capitalize, buildInteractHintUI, updateHint, setPaused, isPaused, handleKey, handleKeyUp, validateEntityPlacements, start, getNpcById, stop, isBirdPresent, resize, getVinylPositions, isAftermath, getAftermath, triggerEchoRipple

### heavy-dialogue-art.js
drawDialogueSceneBg, drawPixelNinjawhee, emotionForNode, blipPitch, isGrokPortraitReady, whenGrokPortraitReady, flushGrokPortraitWaiters, detectGrokCrop, resolveGrokPortraitSrc, loadGrokPortrait, playUndertaleBlip, toneBlip, drawVinylPickup, drawGrokPortrait, drawNpcPortrait

### pixel-gfx.js
snap, shadeHex, fillPixel, fillPixelDisk, fillPixelRect, drawScanlines, drawPixelStar, drawPixelMoon, drawPixelWindow, drawWarmGlow, drawParquetFloor, drawBrickWall, drawWoodShelfTile, drawRegisterTile, drawDoorThreshold, drawStorefrontFacade, drawDoorTile, drawSpriteShadow, drawLampAmbientWash, drawStoreVignette, drawPixelCharacter, drawPendantLamp, drawPixelLamp, drawPixelRug, drawPixelShelfUnit, drawPixelCounter, drawPixelNeonSign, drawGhostSlice, drawPosterSparkle, drawPixelPoster, drawPixelVinylSpine, drawPixelVinylStand, drawPixelFloorZone, drawNpcZoneRing, drawStoreZoneSign, drawStoreGuidePanel, drawSarahStandMarker, drawSarahCounterArrow, drawControlBar, drawTutorialArrow, drawTalkBubble, drawVinylRecord, drawCarpetFloor, drawPixelTurntable, drawPixelPlant, drawPixelBird, setupPixelCtx

### game-progress.js
load, getInventory, hasInventoryItem, addInventoryItem, removeInventoryItem, save, recordVinyl, getVinylListenCount, recordNpc, recordRun, getLastRun, getAftermathTier, getExplorationPct, getAlbumPct, getAlbumBreakdown, getUnlockTier, isChill, setChill, toggleChill, hasVinyl, unlockSecret, hasSecret, getSecretCount, getEndVariant, getSarahUnlockLine, drawHud, reloadFromStorage, resetSession, getFindCounts, clampFind, setFindCounts, resetFindQuest, isFindQuestComplete, setLastRun, getSnapshot

### store-items.js
roll, addItem, hasItem, nearExamineSpot, getUseContext, tryPickupFromExamine, tryPickupFromTalk, tryPickupFromVinyl, tryPickupFromEvent, canUseItem, useItem, getItemDef, listOwned

### pause-journal.js
load, save, hasEntry, addEntry, maybeAddEntry, noteInteraction, formatTime, getContext, rollAmbient, onSessionStart, onTalk, onExamine, onFindComplete, onVinyl, onSarahReady, onBird, onSecret, onItemPickup, onToast, queueThought, pickThought, maybeThought, buildStatusCards, buildFindRows, buildMainQuestSteps, buildSideQuestRows, onStoreEvent, renderJournal, renderInventory, render, bindDom, setOpen, toggle, close, isOpen, tick, init

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
