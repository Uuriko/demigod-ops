// Hear Records–inspired pixel overworld (Burlington Square, Singapore)
window.JazzStoreOverworld = (function () {
  const TILE = 28;
  const ROOM_W = 28;
  const COLS = ROOM_W * 3;
  const ROWS = 17;

  function patchRow(row, col, ch = '.') {
    return row.slice(0, col) + ch + row.slice(col + 1);
  }

  // Interior only — full perimeter W (no door gap · no walk-through bottom)
  function buildOpenStoreMap() {
    const map = [];
    for (let y = 0; y < ROWS; y++) {
      let row = '';
      for (let x = 0; x < COLS; x++) {
        const perimeter = y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1;
        row += perimeter ? 'W' : '.';
      }
      map.push(row);
    }
    return map;
  }

  const MAP = buildOpenStoreMap();

  const ARCH_ROWS = { min: 2, max: 15 };
  const ARCH_COLS = [ROOM_W - 1, ROOM_W, ROOM_W * 2 - 1, ROOM_W * 2];

  function validateMap() {
    const issues = [];
    for (let y = 0; y < ROWS; y++) {
      if (MAP[y].length !== COLS) {
        throw new Error(`MAP row ${y} length ${MAP[y].length} expected ${COLS}`);
      }
    }
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        const t = MAP[gy][gx];
        if (!'WSCD.RTP'.includes(t)) issues.push(`bad char "${t}" at ${gx},${gy}`);
      }
    }
    for (let gy = 1; gy < ROWS - 1; gy++) {
      for (let gx = 1; gx < COLS - 1; gx++) {
        const t = MAP[gy][gx];
        if (t === 'W') issues.push(`interior wall at ${gx},${gy}`);
      }
    }
    for (const v of VINYL_PICKUPS) {
      if (!isWalkableTile(MAP[v.padY][v.padX])) {
        issues.push(`vinyl pad blocked ${v.id}@${v.padX},${v.padY}`);
      }
    }
    for (const spot of EXAMINE_SPOTS) {
      if (spot.padX != null && !isWalkableTile(MAP[spot.padY][spot.padX])) {
        issues.push(`examine pad blocked ${spot.id}@${spot.padX},${spot.padY}`);
      }
    }
    if (issues.length) {
      console.warn('[overworld] validateMap:', issues.join('; '));
    }
  }

  const PLAYER_WALK_GRID = new Uint8Array(COLS * ROWS);
  const NPC_WALK_GRID = new Uint8Array(COLS * ROWS);

  function inMapBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
  }

  function isEdgeWall(tx, ty) {
    return inMapBounds(tx, ty) && tileAt(tx, ty) === 'W';
  }

  function rebuildWalkGrids() {
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        const idx = gy * COLS + gx;
        const walk = inMapBounds(gx, gy) && !isEdgeWall(gx, gy) ? 1 : 0;
        PLAYER_WALK_GRID[idx] = walk;
        NPC_WALK_GRID[idx] = walk;
      }
    }
  }

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

  // padX/Y = floor glow · shelfX/Y = wall shelf anchor (generous spacing)
  const VINYL_PICKUPS = [
    {
      id: 'moon', zone: 'new arrivals', shelfTag: 'NEW',
      padX: 6, padY: 6, shelfX: 6, shelfY: 2, color: '#c9a84c',
    },
    {
      id: 'shelter', zone: 'pre-loved stacks', shelfTag: 'USED',
      padX: 35, padY: 6, shelfX: 35, shelfY: 2, color: '#4a8f7a',
    },
    {
      id: 'mirror', zone: 'listening booth', shelfTag: 'SPIN',
      padX: 63, padY: 6, shelfX: 63, shelfY: 2, color: '#7b5ea7',
    },
  ];

  const LISTENING_STATIONS = [
    { x: 60, y: 4, label: 'demo deck' },
    { x: 72, y: 12, label: 'hi-fi corner' },
  ];

  const RECORD_SHELVES = [
    { x: 11, y: 1, tiles: 2, accent: '#7b5ea7' },
    { x: 18, y: 1, tiles: 2, accent: '#c9a84c' },
    { x: 31, y: 1, tiles: 2, accent: '#4a8f7a' },
    { x: 40, y: 1, tiles: 3, accent: '#c45c7a' },
    { x: 49, y: 1, tiles: 2, accent: '#7b5ea7' },
    { x: 59, y: 1, tiles: 2, accent: '#7b5ea7' },
    { x: 70, y: 1, tiles: 3, accent: '#c9a84c' },
    { x: 78, y: 1, tiles: 2, accent: '#4a8f7a' },
  ];

  const ROOM_AISLES = [
    { cx: 14, color: '#c9a84c', label: 'new arrivals', sub: '♫ moon vinyl ↑' },
    { cx: 42, color: '#4a8f7a', label: 'crate stacks', sub: '♫ shelter ↑ · simon' },
    { cx: 70, color: '#7b5ea7', label: 'listening lounge', sub: '♫ mirror ↑ · honey' },
  ];

  const STORE_PROPS = [
    { kind: 'rack', x: 12, y: 8, tiles: 2, accent: '#c9a84c' },
    { kind: 'rack', x: 16, y: 10, tiles: 1, accent: '#7b5ea7' },
    { kind: 'crate', x: 10, y: 9, accent: '#4a8f7a' },
    { kind: 'box', x: 14, y: 11, accent: '#c9a84c' },
    { kind: 'rack', x: 40, y: 8, tiles: 2, accent: '#4a8f7a' },
    { kind: 'rack', x: 44, y: 10, tiles: 1, accent: '#c45c7a' },
    { kind: 'crate', x: 46, y: 9, accent: '#7b5ea7' },
    { kind: 'box', x: 42, y: 11, accent: '#c9a84c' },
    { kind: 'rack', x: 68, y: 8, tiles: 2, accent: '#7b5ea7' },
    { kind: 'rack', x: 72, y: 10, tiles: 1, accent: '#c45c7a' },
    { kind: 'crate', x: 66, y: 9, accent: '#c45c7a' },
    { kind: 'plant', x: 74, y: 11 },
    { kind: 'turntable', x: 71, y: 5 },
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
    },
    static: {
      banner: '∴ STORE STAYS OPEN ∴',
      neon: 'LATE',
      neonColor: '#7b5ea7',
      warmth: 0.92,
      accent: '#c9a84c',
      dustAlpha: 0.1,
    },
  };

  const NPC_DEFS = [
    {
      id: 'orph', label: 'orph', tileX: 8, tileY: 12, padX: 8, padY: 14,
      accent: '#7b5ea7', tree: 'orph', hint: 'left entrance aisle',
      pinned: true,
    },
    {
      id: 'simon', label: 'simon', tileX: 38, tileY: 11, padX: 40, padY: 11,
      accent: '#4a8f7a', tree: 'simon', hint: 'crate stacks center',
      pinned: true,
    },
    {
      id: 'honey', label: 'honey', tileX: 66, tileY: 12, padX: 68, padY: 12,
      accent: '#c45c7a', tree: 'honey', hint: 'listening lounge',
      pinned: true,
    },
    {
      id: 'ninjawhee_return', label: 'sarah', tileX: 19, tileY: 9, padX: 19, padY: 12,
      accent: '#c9a84c', tree: 'return', hint: '★ at register', hidden: true,
      pinned: true,
    },
  ];

  const PASSERBY_ACCENTS = ['#8a7a9a', '#6a8f9a', '#9a7a6a', '#7a8a9a', '#9a8a7a', '#7a9a8a', '#8a6a7a', '#6a7a9a'];
  const PASSERBY_LABELS = ['visitor', 'browser', 'walker', 'stranger', 'listener', 'drifter', 'nightowl', 'passer'];
  const PASSERBY_VARIANTS = 8;
  const STREET_DOOR = { x: 14, y: 15 };
  const REGISTER_ROW = 7;
  const REGISTER_COLS = [18, 19, 20];
  const NEON_COL = 14;

  // "find ___" ×3 per mutual — face tile · [Z] examine
  const MUTUAL_FIND_WORDS = { orph: 'storm', simon: 'breadcrumb', honey: 'heartbeat' };
  const EXAMINE_SPOTS = [
    {
      id: 'lamp_dust', x: 4, y: 3, padX: 4, padY: 7, mutual: null, short: 'lamp gold',
      lines: ['dust catching lamp gold....', 'the store breathes when nobody performs.'],
      again: 'motes like slow notes.',
    },
    {
      id: 'storm_spine', x: 22, y: 2, padX: 22, padY: 6, mutual: 'orph', short: 'green storm spine',
      lines: ['green spine.... shelter from the storm....', 'orph reads liner notes like prayers here.'],
      again: 'still storm-colored.... patience in the grooves.',
    },
    {
      id: 'storm_poster', x: 5, y: 14, padX: 5, padY: 15, mutual: 'orph', short: 'faded storm poster',
      lines: ['faded poster corner.... beauty beside cruelty, he said.', 'not performative. just true.'],
      again: 'the paper remembers rain.',
    },
    {
      id: 'mirror_scratch', x: 24, y: 10, padX: 24, padY: 11, mutual: 'orph', short: 'scratched mirror edge',
      lines: ['tiny scratch on the shelf lip....', 'the mirror shows what we already knew....'],
      again: 'purple glass energy without the glass.',
    },
    {
      id: 'jazz_poster', x: 32, y: 2, padX: 32, padY: 6, mutual: 'simon', short: 'JAZZ poster',
      lines: ['JAZZ poster.... simon swears there is a shelf behind it.', 'do not tell him you heard that from me.'],
      again: 'breadcrumb bait. delicious.',
    },
    {
      id: 'map_note', x: 46, y: 2, padX: 46, padY: 6, mutual: 'simon', short: 'penciled map',
      lines: ['pencil map on shelf edge.... crate stacks to moon shelf.', 'then the whole album leads you home.'],
      again: 'simon approved this path.',
    },
    {
      id: 'chalk_path', x: 40, y: 14, padX: 40, padY: 15, mutual: 'simon', short: 'chalk arrows',
      lines: ['chalk arrows between stacks....', 'see the path.... here.... then there....'],
      again: 'the floor map fades. the groove does not.',
    },
    {
      id: 'demo_deck', x: 60, y: 3, padX: 60, padY: 6, mutual: 'honey', short: 'demo deck',
      lines: ['demo deck still warm....', 'woah.... this one really !! .... vibrates the dust.'],
      again: 'heartbeat in the motor. honey was right.',
    },
    {
      id: 'listening_rug', x: 66, y: 14, padX: 67, padY: 14, mutual: 'honey', short: 'listening rug',
      lines: ['pink rug fibers.... whole sides only, she said.', 'no skip button energy.'],
      again: 'sit. breathe. eat the whole side.',
    },
    {
      id: 'hi_fi_plant', x: 74, y: 14, padX: 74, padY: 15, mutual: 'honey', short: 'hi-fi corner',
      lines: ['plant by the amp.... earnest green against purple glass.', 'people are so amazing tbh....'],
      again: 'leaves tremble on the downbeat.',
    },
    {
      id: 'neon_hum', x: 20, y: 15, padX: 20, padY: 15, mutual: null, short: 'neon hum',
      lines: ['neon hum in the door glass.... late night · open door.'],
      again: 'SOUL flickers. so do you.',
    },
    {
      id: 'register_wear', x: 17, y: 9, padX: 16, padY: 10, mutual: null, short: 'worn register',
      lines: ['register wood worn smooth where hands rested.', 'sarah worked this counter once. whole albums.'],
      again: 'thumbprints of listening.',
    },
  ];

  validateMap();
  rebuildWalkGrids();

  // DCSS-style aut / energy (crawl.chaosforge.org/Movement · Action)
  const AUT_MOVE = 10;
  const AUT_DIAG = 14;
  const AUT_EXAMINE = 10;
  const AUT_INTERACT = 10;
  const ENERGY_ACT = 10;
  const ENTITY_SPEED = {
    player: 10, passerby: 10, wander: 9, sarah: 7, bird: 12,
  };
  let worldAut = 0;
  let worldTurn = 0;
  let examineToastTimer = null;

  const LAMPS = [
    [5, 2], [15, 2], [23, 2], [11, 9],
    [33, 2], [43, 2], [41, 11],
    [61, 2], [73, 2], [67, 10],
  ];
  const DUST = Array.from({ length: 10 }, (_, i) => ({
    x: 0.15 + (i % 6) * 0.13, y: 0.2 + Math.floor(i / 6) * 0.18,
    sp: 0.003 + (i % 5) * 0.001, ph: i * 1.3,
  }));

  let canvas, ctx, active = false;
  let camTX = 0;
  let viewCols = 22;
  let player = { x: 14, y: 13, dir: 'up', bob: 0, moving: false };
  let npcs = [];
  let storeDoorOpen = false;
  let nextPasserSpawn = 0;
  let talked = new Set();
  let frame = 0;
  let lastCamTX = -1;
  let lastViewCols = 0;
  let lastLayout = null;
  let onTalkNPC = null;
  let onReturnReady = null;
  let onAftermathEnter = null;
  let onListenVinyl = null;
  let onSecretInteract = null;
  let onInteractHint = null;
  let paused = false;
  let secretToastUntil = 0;
  let secretToastText = null;
  let interactHint = null;
  let listeningId = null;
  let listeningTitle = null;
  let flavorToastUntil = 0;
  let flavorToastId = null;
  let vinylToastTimers = [];
  let counterFlashUntil = 0;
  let lastHiVinylId = null;
  let aftermath = null;
  let echoRippleUntil = 0;
  let aftermathToastUntil = 0;
  let aftermathToastText = null;
  let lastPreviewVinylId = null;
  let previewHushUntil = 0;
  let vinylPreviewed = false;

  let vizBars = [0, 0, 0, 0];
  const MOVE_KEY_MAP = {
    ArrowUp: [0, -1, 'up', false], ArrowDown: [0, 1, 'down', false],
    ArrowLeft: [-1, 0, 'left', false], ArrowRight: [1, 0, 'right', false],
    KeyW: [0, -1, 'up', false], KeyS: [0, 1, 'down', false],
    KeyA: [-1, 0, 'left', false], KeyD: [1, 0, 'right', false],
    KeyQ: [-1, -1, 'up', true], KeyE: [1, -1, 'up', true],
    KeyC: [1, 1, 'down', true], KeyV: [-1, 1, 'down', true],
  };
  let shelfPulseUntil = 0;
  let posterSparkleUntil = 0;
  let examinedIds = new Set();
  let findCounts = { orph: 0, simon: 0, honey: 0 };
  let findCompleteToasted = new Set();
  let bird = null;
  let birdEncounterDone = false;
  let birdSpawnTimer = null;
  let onTalkBird = null;
  let onBirdGuide = null;
  let cachedInteractTarget = null;
  let cachedInteractKey = '';
  let lastHintTileKey = '';
  let lastBumpToastUntil = 0;
  const MOVE_REPEAT_MS = 125;
  const heldMoveCodes = new Set();
  let lastMoveStepAt = 0;
  let walkQueue = [];
  let walkTarget = null;
  let welcomeToastShown = false;
  let sarahReadyToasted = false;

  const BIRD_PERCH = { x: 10, y: 3 };
  const BIRD_DOOR = { x: 14, y: 15 };

  function getAftermathStyle() {
    if (!aftermath?.tier) return null;
    return AFTERMATH_STYLE[aftermath.tier] || AFTERMATH_STYLE.tasty;
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 'W';
    return MAP[ty][tx];
  }

  function isWalkableTile(t) {
    return t === '.' || t === 'R' || t === 'T' || t === 'P';
  }

  function isNpcWalkableTile(t) {
    return isWalkableTile(t) || t === 'D';
  }

  function isSolid(tx, ty) {
    return isEdgeWall(tx, ty);
  }

  function gridWalkable(tx, ty, forNpc = false) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    return (forNpc ? NPC_WALK_GRID : PLAYER_WALK_GRID)[ty * COLS + tx] === 1;
  }

  function wrapTextLines(text, maxChars = 34, maxLines = 3) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= maxChars) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
      }
      if (lines.length >= maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines.slice(0, maxLines);
  }

  function drawTextPanel(ctx, cx, topY, lines, opts = {}) {
    const fontSize = opts.fontSize || 5;
    const lineH = opts.lineH || fontSize + 5;
    const padX = opts.padX || 10;
    const padY = opts.padY || 8;
    const maxW = opts.maxW || 280;
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    const measured = lines.map((ln) => Math.min(maxW - padX * 2, ctx.measureText(ln).width));
    const innerW = Math.max(...measured, 40);
    const w = Math.min(maxW, innerW + padX * 2);
    const h = padY * 2 + lines.length * lineH;
    const x = cx - w / 2;
    const fade = opts.fade ?? 1;
    ctx.fillStyle = `rgba(10,8,18,${(opts.bgAlpha ?? 0.92) * fade})`;
    ctx.fillRect(x, topY, w, h);
    ctx.strokeStyle = opts.border || `rgba(201,168,76,${0.55 * fade})`;
    ctx.lineWidth = opts.borderW || 2;
    ctx.strokeRect(x, topY, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color || `rgba(248,244,232,${fade})`;
    lines.forEach((ln, i) => {
      ctx.fillText(ln, cx, topY + padY + lineH * i + lineH * 0.45);
    });
    return { x, y: topY, w, h };
  }

  function roomIndex(tx) {
    if (tx < ROOM_W) return 0;
    if (tx < ROOM_W * 2) return 1;
    return 2;
  }

  function screenX(tx, ox) {
    return ox + (tx - camTX) * TILE;
  }

  function entTile(ent) {
    return { x: ent.tileX ?? ent.x, y: ent.tileY ?? ent.y };
  }

  function setEntTile(ent, x, y) {
    if (ent.tileX !== undefined) { ent.tileX = x; ent.tileY = y; }
    else { ent.x = x; ent.y = y; }
  }

  function bootstrapMotion(ent) {
    const t = entTile(ent);
    ent.posX = t.x;
    ent.posY = t.y;
    ent.energy = 0;
    ent.moving = false;
  }

  function displayPos(ent) {
    const t = entTile(ent);
    return { x: t.x, y: t.y };
  }

  function snapMove(ent, nx, ny) {
    setEntTile(ent, nx, ny);
    ent.posX = nx;
    ent.posY = ny;
    ent.lastMoveFrame = frame;
    ent.moving = true;
    return true;
  }

  function entityStepAnim(ent) {
    return ent.lastMoveFrame != null && frame - ent.lastMoveFrame < 5;
  }

  function canDiagonalStep(fx, fy, tx, ty) {
    return canWalkTile(tx, ty);
  }

  function moveAutCost(diagonal) {
    return diagonal ? AUT_DIAG : AUT_MOVE;
  }

  function entitySpeed(ent) {
    if (!ent) return ENTITY_SPEED.player;
    if (ent === player) return ENTITY_SPEED.player;
    if (ent.pinned) return 0;
    if (ent.isPasserby) return ENTITY_SPEED.passerby;
    if (ent.id === 'ninjawhee_return') return ENTITY_SPEED.sarah;
    return ENTITY_SPEED.wander;
  }

  function entityGridPos(n) {
    const t = entTile(n);
    return { x: t.x, y: t.y };
  }

  function entityOccupiedTiles(n) {
    const cur = entTile(n);
    return [{ x: cur.x, y: cur.y }];
  }

  function playerGridPos() {
    const t = entTile(player);
    return { x: t.x, y: t.y };
  }

  function entScreenPos(ent, ox, oy) {
    const p = displayPos(ent);
    return {
      sx: ox + (p.x - camTX) * TILE + TILE / 2,
      sy: oy + p.y * TILE + TILE / 2,
    };
  }

  function birdBlocksTile(tx, ty) {
    return false;
  }

  function terrainBlocksPlayer(tx, ty) {
    return !inMapBounds(tx, ty) || isEdgeWall(tx, ty);
  }

  function bumpMessage(tx, ty) {
    if (!inMapBounds(tx, ty)) return 'edge of the store';
    return 'the wall ends here';
  }

  function diagonalBlockTile() {
    return null;
  }

  function showBumpToast(tx, ty) {
    if (!isEdgeWall(tx, ty) && inMapBounds(tx, ty)) return;
    const now = Date.now();
    if (now < lastBumpToastUntil) return;
    lastBumpToastUntil = now + 500;
    showSecretToast(bumpMessage(tx, ty), 1200);
  }

  // Open floor: only map perimeter walls block movement (no shelf/NPC/prop collision).
  function canWalkTile(tx, ty) {
    return inMapBounds(tx, ty) && !isEdgeWall(tx, ty);
  }

  function npcPathStep(n) {
    if (!n.path?.length) return false;
    while (n.pathIdx < n.path.length) {
      const [tx, ty] = n.path[n.pathIdx];
      if (n.tileX === tx && n.tileY === ty) {
        n.pathIdx++;
        continue;
      }
      n.dir = dirBetween(n.tileX, n.tileY, tx, ty);
      if (!canWalkTile(tx, ty)) return false;
      snapMove(n, tx, ty);
      return true;
    }
    return false;
  }

  function gainMonsterEnergy(autSpent) {
    if (typeof document !== 'undefined' && document.body?.classList?.contains('dialogue-active')) return;
    for (const n of npcs) {
      if (n.hidden) continue;
      const spd = entitySpeed(n);
      if (spd <= 0) continue;
      n.energy = (n.energy || 0) + autSpent * (spd / ENTITY_SPEED.player);
    }
    if (bird?.phase === 'perched' || bird?.phase === 'leaving') {
      bird.energy = (bird.energy || 0) + autSpent * (ENTITY_SPEED.bird / ENTITY_SPEED.player);
    }
  }

  function resolveMonsterActions() {
    if (typeof document !== 'undefined' && document.body?.classList?.contains('dialogue-active')) return;
    let guard = 0;
    while (guard++ < 48) {
      let acted = false;
      const mobile = npcs.filter((n) => !n.hidden && entitySpeed(n) > 0 && (n.energy || 0) >= ENERGY_ACT);
      mobile.sort((a, b) => (b.energy || 0) - (a.energy || 0));
      for (const n of mobile) {
        if ((n.energy || 0) < ENERGY_ACT) continue;
        const did = n.isPasserby ? passerbyAct(n) : wanderNpcAct(n);
        if (did) {
          n.energy -= ENERGY_ACT;
          acted = true;
        }
      }
      if (bird && (bird.energy || 0) >= ENERGY_ACT) {
        if (birdAct()) {
          if (bird) bird.energy -= ENERGY_ACT;
          acted = true;
        }
      }
      if (!acted) break;
    }
    updateStoreDoor();
  }

  function spendAut(cost) {
    worldAut += cost;
    worldTurn++;
    gainMonsterEnergy(cost);
    resolveMonsterActions();
  }

  function playerSpendsAut(cost) {
    spendAut(cost);
    invalidateInteractCache();
    updateHint();
  }

  function drawRoomTint(ctx, ox, oy, mapW, mapH) {
    const room = roomIndex(player.x);
    const tints = ['rgba(232,180,120,0.07)', 'rgba(180,150,110,0.08)', 'rgba(140,120,180,0.09)'];
    ctx.fillStyle = tints[room] || tints[0];
    ctx.fillRect(ox, oy, mapW, mapH);
  }

  function drawStoreAmbience(ctx, ox, oy, mapW, mapH) {
    const warm = 0.55 + Math.sin(frame * 0.05) * 0.15;
    const ceilingG = ctx.createLinearGradient(ox, oy - 40, ox, oy + mapH * 0.35);
    ceilingG.addColorStop(0, `rgba(255,220,160,${0.07 * warm})`);
    ceilingG.addColorStop(1, 'transparent');
    ctx.fillStyle = ceilingG;
    ctx.fillRect(ox, oy - 40, mapW, mapH * 0.45);

    if (tileVisible(STREET_DOOR.x)) {
      const dx = screenX(STREET_DOOR.x, ox) + TILE / 2;
      const dy = oy + STREET_DOOR.y * TILE + TILE / 2;
      if (window.PixelGfx?.drawWarmGlow) {
        PixelGfx.drawWarmGlow(ctx, dx, dy, 28, '#e8c88c', 0.1 + warm * 0.06);
      }
    }

    LISTENING_STATIONS.forEach((st, i) => {
      if (!tileVisible(st.x)) return;
      const sx = screenX(st.x, ox) + TILE / 2;
      const sy = oy + st.y * TILE + TILE / 2;
      const lp = 0.4 + Math.sin(frame * 0.09 + i) * 0.2;
      if (window.PixelGfx?.drawWarmGlow) {
        PixelGfx.drawWarmGlow(ctx, sx, sy, 20, '#7b5ea7', lp * 0.12);
      }
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = `rgba(232,224,240,${0.35 + lp * 0.25})`;
      ctx.textAlign = 'center';
      ctx.fillText(st.label, sx, sy - 14);
    });

    VINYL_PICKUPS.forEach((v) => {
      if (!tileVisible(v.shelfX)) return;
      const px = screenX(v.shelfX, ox) + TILE / 2;
      const py = oy + v.shelfY * TILE - 2;
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = v.color + '99';
      ctx.textAlign = 'center';
      ctx.fillText(v.shelfTag || '♫', px, py);
    });
  }

  function findPath(fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) return [];
    const key = (x, y) => `${x},${y}`;
    const queue = [[fromX, fromY, []]];
    const seen = new Set([key(fromX, fromY)]);
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let head = 0;
    while (head < queue.length) {
      const [x, y, path] = queue[head++];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        if (!canWalkTile(nx, ny)) continue;
        seen.add(k);
        const nextPath = path.concat([[nx, ny]]);
        if (nx === toX && ny === toY) return nextPath;
        queue.push([nx, ny, nextPath]);
      }
      if (head > 2400) break;
    }
    return null;
  }

  function nearestWalkableTile(tx, ty, maxRadius = 8) {
    if (canWalkTile(tx, ty)) return { x: tx, y: ty };
    let best = null;
    let bestD = 99;
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = tx + dx;
          const ny = ty + dy;
          if (!canWalkTile(nx, ny)) continue;
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function clearAutoWalk() {
    walkQueue = [];
    walkTarget = null;
  }

  function queueWalkTo(tx, ty) {
    const dest = nearestWalkableTile(tx, ty);
    if (!dest) return false;
    const pg = playerGridPos();
    if (pg.x === dest.x && pg.y === dest.y) return false;
    const path = findPath(pg.x, pg.y, dest.x, dest.y);
    if (!path?.length) return stepTowardTile(dest.x, dest.y);
    walkQueue = path;
    walkTarget = { x: dest.x, y: dest.y };
    return true;
  }

  function tickAutoWalk() {
    if (paused || walkQueue.length === 0) return;
    const now = Date.now();
    if (now - lastMoveStepAt < MOVE_REPEAT_MS) return;
    const pg = playerGridPos();
    while (walkQueue.length && walkQueue[0][0] === pg.x && walkQueue[0][1] === pg.y) {
      walkQueue.shift();
    }
    if (!walkQueue.length) {
      clearAutoWalk();
      return;
    }
    const [nx, ny] = walkQueue[0];
    const dx = nx - pg.x;
    const dy = ny - pg.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      const repl = findPath(pg.x, pg.y, walkTarget.x, walkTarget.y);
      if (repl?.length) walkQueue = repl;
      else clearAutoWalk();
      return;
    }
    const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    if (tryMove(dx, dy, dir)) {
      lastMoveStepAt = now;
      walkQueue.shift();
      if (!walkQueue.length) {
        clearAutoWalk();
        checkInteract();
      }
    } else if (walkTarget) {
      const repl = findPath(pg.x, pg.y, walkTarget.x, walkTarget.y);
      if (repl?.length) walkQueue = repl;
      else clearAutoWalk();
    } else {
      clearAutoWalk();
    }
  }

  function allNpcEntities() {
    return npcs.filter((n) => !n.hidden);
  }

  function npcBlocksPlayer() {
    return false;
  }

  function npcAt(tx, ty, skip) {
    return allNpcEntities().find((n) => {
      if (n === skip) return false;
      if (skip === player && !npcBlocksPlayer(n)) return false;
      return entityOccupiedTiles(n).some((t) => t.x === tx && t.y === ty);
    });
  }

  function npcBlocks(tx, ty, skip) {
    return !!npcAt(tx, ty, skip);
  }

  function npcOnTalkPad(npc) {
    const pg = playerGridPos();
    const g = entTile(npc);
    const padX = npc.padX ?? g.x;
    const padY = npc.padY ?? g.y + 1;
    return pg.x === padX && pg.y === padY;
  }

  function sarahRegisterTalk(pg = playerGridPos()) {
    return pg.y === REGISTER_ROW && REGISTER_COLS.includes(pg.x);
  }

  function npcInTalkRange(npc) {
    const pg = playerGridPos();
    if (npc.id === 'ninjawhee_return' && !npc.hidden && sarahRegisterTalk(pg)) return true;
    if (npc.isPasserby) {
      const g = entTile(npc);
      const d = tileDistCheb(player.x, player.y, g.x, g.y);
      return d > 0 && d <= PASSERBY_ACT_RANGE;
    }
    if (npcOnTalkPad(npc)) return true;
    const g = entTile(npc);
    return tileDistCheb(player.x, player.y, g.x, g.y) <= NEAR_CHEB;
  }

  function playerFacingNpc() {
    let best = null;
    let bestScore = 99;
    for (const cand of allNpcEntities()) {
      if (!npcInTalkRange(cand)) continue;
      const onPad = npcOnTalkPad(cand);
      const g = entTile(cand);
      const d = tileDistCheb(player.x, player.y, g.x, g.y);
      const score = onPad ? -1 : d;
      if (score < bestScore) { best = cand; bestScore = score; }
    }
    return best;
  }

  function npcNearPlayer(npc) {
    if (npc.isPasserby) {
      const g = entTile(npc);
      const d = tileDistCheb(player.x, player.y, g.x, g.y);
      return d > 0 && d <= PASSERBY_HINT_RANGE;
    }
    return npcOnTalkPad(npc);
  }

  function dirBetween(fx, fy, tx, ty) {
    if (tx > fx) return 'right';
    if (tx < fx) return 'left';
    if (ty > fy) return 'down';
    if (ty < fy) return 'up';
    return 'down';
  }

  function pickWanderTile(n) {
    const tiles = (n.wander || [[n.tileX, n.tileY]])
      .filter(([x, y]) => canWalkTile(x, y) && !(n.tileX === x && n.tileY === y));
    if (!tiles.length) return null;
    return tiles[Math.floor(Math.random() * tiles.length)];
  }

  function beginPathTo(n, toX, toY) {
    const path = findPath(n.tileX, n.tileY, toX, toY, n);
    if (!path?.length) return false;
    n.path = path;
    n.pathIdx = 0;
    return true;
  }

  function wanderNpcAct(n) {
    if (n.frozen || n.pinned) return true;
    if (n.id === 'ninjawhee_return' && n.hidden) return true;
    if (n.state === 'walk') {
      if (n.path?.length && npcPathStep(n)) return true;
      if (n.tileX === n.targetX && n.tileY === n.targetY) {
        n.state = 'idle';
        n.idleTurns = 12 + Math.floor(Math.random() * 18);
        n.targetX = n.targetY = null;
        n.path = null;
        n.pathIdx = 0;
        return true;
      }
      if (n.targetX != null) beginPathTo(n, n.targetX, n.targetY);
      return true;
    }
    if (n.state !== 'idle') n.state = 'idle';
    if (n.idleTurns == null) n.idleTurns = 8 + Math.floor(Math.random() * 10);
    if (n.idleTurns > 0) { n.idleTurns--; return true; }
    const dest = pickWanderTile(n);
    if (!dest) { n.idleTurns = 8; return true; }
    n.targetX = dest[0];
    n.targetY = dest[1];
    n.state = 'walk';
    n.dir = dirBetween(n.tileX, n.tileY, dest[0], dest[1]);
    if (!beginPathTo(n, dest[0], dest[1])) {
      n.state = 'idle';
      n.targetX = n.targetY = null;
      n.idleTurns = 10;
      return true;
    }
    return npcPathStep(n) || true;
  }

  function randomFloorInRoom(room, avoidDoor = false) {
    const minX = room * ROOM_W + 2;
    const maxX = (room + 1) * ROOM_W - 2;
    const picks = [];
    for (let y = 2; y < ROWS - 2; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!gridWalkable(x, y, false)) continue;
        if (avoidDoor && x >= STREET_DOOR.x - 1 && x <= STREET_DOOR.x + 1 && y >= 10) continue;
        picks.push([x, y]);
      }
    }
    return picks.length ? picks[Math.floor(Math.random() * picks.length)] : [STREET_DOOR.x, STREET_DOOR.y - 1];
  }

  function passerUsesDoor(n) {
    return n.isPasserby && (n.state === 'enter' || n.state === 'leave');
  }

  function updateStoreDoor() {
    let open = false;
    for (const n of npcs) {
      if (!passerUsesDoor(n)) continue;
      const g = entityGridPos(n);
      if (g.y >= STREET_DOOR.y - 1 && g.x >= STREET_DOOR.x - 1 && g.x <= STREET_DOOR.x + 1) {
        open = true;
        continue;
      }
      if (n.path?.some(([x, y]) => y >= STREET_DOOR.y - 1 && x >= STREET_DOOR.x - 1 && x <= STREET_DOOR.x + 1)) {
        open = true;
      }
    }
    storeDoorOpen = open;
  }

  function spawnPasserby(now) {
    const variant = Math.floor(Math.random() * PASSERBY_VARIANTS);
    const hasHint = Math.random() < 0.34;
    const dest = randomFloorInRoom(0, true);
    storeDoorOpen = true;
    const spawnX = STREET_DOOR.x;
    const spawnY = STREET_DOOR.y;
    const path = findPath(spawnX, spawnY, dest[0], dest[1], null) || [[STREET_DOOR.x, STREET_DOOR.y - 1], ...dest];
    const ent = {
      id: `passer_${now}_${variant}`,
      label: PASSERBY_LABELS[variant % PASSERBY_LABELS.length],
      tileX: spawnX,
      tileY: spawnY,
      accent: PASSERBY_ACCENTS[variant % PASSERBY_ACCENTS.length],
      tree: 'passerby',
      variant,
      hasHint,
      isPasserby: true,
      hidden: false,
      state: 'enter',
      targetX: dest[0],
      targetY: dest[1],
      idleUntil: 0,
      browsed: false,
      dir: 'up',
      path,
      pathIdx: 0,
      moving: false,
    };
    bootstrapMotion(ent);
    npcs.push(ent);
    window.StoreEvents?.onPasserbyEnter?.(ent);
    nextPasserSpawn = now + 28000 + Math.random() * 42000;
  }

  function removePasserby(n) {
    const idx = npcs.indexOf(n);
    if (idx >= 0) npcs.splice(idx, 1);
  }

  function passerbyAct(n) {
    if (n.state === 'enter' || n.state === 'leave' || n.state === 'browse') {
      if (n.path?.length && npcPathStep(n)) return true;
      if (n.state === 'enter') {
        n.state = 'idle';
        n.idleTurns = 28 + Math.floor(Math.random() * 40);
        n.path = null;
        n.pathIdx = 0;
        return true;
      }
      if (n.state === 'browse') {
        n.state = 'idle';
        n.idleTurns = 14 + Math.floor(Math.random() * 20);
        n.path = null;
        n.pathIdx = 0;
        return true;
      }
      removePasserby(n);
      return true;
    }
    if (n.state === 'idle') {
      if (n.glanceUntil > Date.now()) {
        const dx = player.x - n.tileX;
        const dy = player.y - n.tileY;
        n.dir = Math.abs(dx) >= Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
      }
      if (n.idleTurns == null) n.idleTurns = 20;
      if (n.idleTurns > 0) { n.idleTurns--; return true; }
      if (!n.browsed && Math.random() < 0.5) {
        n.browsed = true;
        const dest2 = randomFloorInRoom(0, true);
        n.path = findPath(n.tileX, n.tileY, dest2[0], dest2[1], n) || [];
        n.pathIdx = 0;
        if (n.path.length) { n.state = 'browse'; return true; }
      }
      n.state = 'leave';
      n.path = findPath(n.tileX, n.tileY, STREET_DOOR.x, STREET_DOOR.y, n)
        || findPath(n.tileX, n.tileY, STREET_DOOR.x, STREET_DOOR.y - 1, n)
        || [[STREET_DOOR.x, STREET_DOOR.y]];
      n.pathIdx = 0;
      return true;
    }
    return true;
  }

  function tickNPCs(now) {
    if (typeof document !== 'undefined' && document.body?.classList?.contains('dialogue-active')) return;
    const passerCount = npcs.filter((n) => n.isPasserby).length;
    if (passerCount < 2 && now >= nextPasserSpawn) spawnPasserby(now);
  }

  const NEAR_CHEB = 1;
  const PASSERBY_HINT_RANGE = 1;
  const PASSERBY_ACT_RANGE = 1;

  function tileDist(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function tileDistCheb(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  }

  function faceToward(tx, ty) {
    player.dir = dirBetween(player.x, player.y, tx, ty);
  }

  function facingTile() {
    const o = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
    return { x: player.x + o[0], y: player.y + o[1] };
  }

  function padDist(item) {
    const px = item.padX ?? item.x;
    const py = item.padY ?? item.y;
    return tileDist(player.x, player.y, px, py);
  }

  function examineSpotInRange(spot) {
    const pg = playerGridPos();
    if (pg.x === spot.padX && pg.y === spot.padY) return true;
    return tileDistCheb(pg.x, pg.y, spot.x, spot.y) <= NEAR_CHEB;
  }

  function nearestExamineSpot() {
    let best = null;
    let bestScore = 99;
    for (const spot of EXAMINE_SPOTS) {
      if (!examineSpotInRange(spot)) continue;
      const onPad = player.x === spot.padX && player.y === spot.padY;
      const d = tileDistCheb(player.x, player.y, spot.x, spot.y);
      const score = onPad ? -1 : d;
      if (score < bestScore) { best = spot; bestScore = score; }
    }
    return best;
  }

  function examineForHint() {
    return nearestExamineSpot();
  }

  function examineFacingSpot() {
    return nearestExamineSpot();
  }

  function vinylInRange() {
    let best = null;
    let bestD = 99;
    for (const v of VINYL_PICKUPS) {
      const dPad = tileDistCheb(player.x, player.y, v.padX, v.padY);
      const dShelf = tileDistCheb(player.x, player.y, v.shelfX, v.shelfY);
      const d = Math.min(dPad, dShelf);
      if (d > 1) continue;
      const score = d === 0 ? -1 : d;
      if (score < bestD) { best = v; bestD = score; }
    }
    return best;
  }

  let examineToastUntil = 0;

  function examineSpot(spot) {
    if (!spot) return false;
    const now = Date.now();
    if (now < examineToastUntil) return true;
    examineToastUntil = now + 400;
    const first = !examinedIds.has(spot.id);
    if (first) {
      examinedIds.add(spot.id);
      if (spot.mutual && findCounts[spot.mutual] < 3) {
        findCounts[spot.mutual]++;
        window.GameProgress?.setFindCounts?.(findCounts);
        if (findCounts[spot.mutual] === 3 && !findCompleteToasted.has(spot.mutual)) {
          findCompleteToasted.add(spot.mutual);
          const done = {
            orph: 'every storm trace found.... orph would nod once.',
            simon: 'breadcrumb trail complete.... simon would map your name.',
            honey: 'three heartbeats found.... honey would hug the rug.',
          };
          scheduleVinylToast(() => showSecretToast(done[spot.mutual], 3600), 900);
          window.StorePause?.onFindComplete?.(spot.mutual);
        }
      }
    }
    window.StorePause?.onExamine?.(spot, first);
    const text = first ? spot.lines.join(' ') : (spot.again || spot.lines[spot.lines.length - 1]);
    if (first) showExamineToast(text, 4200);
    else scheduleVinylToast(() => showExamineToast(text, 3200), 120);
    if (findCounts.orph === 3 && findCounts.simon === 3 && findCounts.honey === 3
        && !findCompleteToasted.has('all')) {
      findCompleteToasted.add('all');
      scheduleVinylToast(() => showSecretToast('you noticed what they noticed.... the store feels thicker.', 4000), 1400);
      window.StorePause?.onFindComplete?.('all');
    }
    return true;
  }

  function drawInteractBubble(ctx, ox, oy) {
    const target = resolveInteractTarget();
    if (!target || !tileVisible(target.x)) return;
    const sx = screenX(target.x, ox) + TILE / 2;
    const sy = oy + target.y * TILE - 8;
    const bob = Math.sin(frame * 0.11) * 2.5;
    const label = target.type === 'npc'
      ? (target.npc?.id === 'ninjawhee_return' ? 'SARAH' : 'TALK')
      : target.type === 'vinyl' ? 'SPIN'
        : target.type === 'examine' ? 'LOOK'
          : target.type === 'bird' ? 'HELP' : 'Z';
    const text = `Z · ${label}`;
    const color = target.type === 'npc' ? (target.npc?.accent || '#c9a84c')
      : target.type === 'vinyl' ? '#c9a84c'
        : target.type === 'examine' ? '#7b5ea7' : '#c9a84c';
    if (window.PixelGfx?.drawTalkBubble) {
      PixelGfx.drawTalkBubble(ctx, sx, sy + bob, 120, text, color);
      return;
    }
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(10,8,18,0.85)';
    ctx.fillRect(sx - tw / 2 - 8, sy + bob - 14, tw + 16, 18);
    ctx.strokeStyle = 'rgba(201,168,76,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - tw / 2 - 8, sy + bob - 14, tw + 16, 18);
    ctx.fillStyle = '#f8f4e8';
    ctx.fillText(text, sx, sy + bob - 2);
  }

  function drawExamineGlints(ctx, ox, oy) {
    const pg = playerGridPos();
    for (const s of EXAMINE_SPOTS) {
      if (examinedIds.has(s.id)) continue;
      const d = tileDist(pg.x, pg.y, s.padX ?? s.x, s.padY ?? s.y);
      if (d > 2) continue;
      if (!tileVisible(s.x)) continue;
      const gx = screenX(s.x, ox) + TILE / 2;
      const gy = oy + s.y * TILE + TILE / 2;
      if (window.PixelGfx?.drawPosterSparkle) {
        PixelGfx.drawPosterSparkle(ctx, gx, gy, frame);
      }
    }
  }

  function secretAtTile(tx, ty) {
    if (tx === 24 && ty === 2) return 'moon_window';
    if (tx === 14 && (ty === 15 || ty === 16)) return 'mirror_door';
    if (ty === REGISTER_ROW && REGISTER_COLS.includes(tx)) {
      const blocker = npcAt(tx, ty);
      if (!blocker || blocker.id === 'ninjawhee_return') return 'counter_knock';
    }
    return null;
  }

  function getSecretSpot() {
    const tiles = [
      facingTile(),
      { x: player.x, y: player.y },
      { x: player.x, y: player.y - 1 },
      { x: player.x, y: player.y + 1 },
      { x: player.x - 1, y: player.y },
      { x: player.x + 1, y: player.y },
    ];
    for (const t of tiles) {
      const spot = secretAtTile(t.x, t.y);
      if (spot) return spot;
    }
    return null;
  }

  function scheduleBirdEncounter(delayMs = 9000) {
    if (aftermath || birdEncounterDone || bird) return;
    if (birdSpawnTimer) clearTimeout(birdSpawnTimer);
    birdSpawnTimer = setTimeout(() => {
      birdSpawnTimer = null;
      if (!active || aftermath || birdEncounterDone || bird) return;
      spawnBirdEncounter();
    }, delayMs);
  }

  function birdPathStep() {
    if (!bird?.path?.length) return false;
    while (bird.pathIdx < bird.path.length) {
      const [tx, ty] = bird.path[bird.pathIdx];
      if (bird.tileX === tx && bird.tileY === ty) {
        bird.pathIdx++;
        continue;
      }
      snapMove(bird, tx, ty);
      bird.tileX = tx;
      bird.tileY = ty;
      return true;
    }
    return false;
  }

  function tickBirdArrival(now = Date.now()) {
    if (!bird || bird.phase !== 'incoming') return;
    if (bird.incomingUntil && now < bird.incomingUntil) return;
    bird.phase = 'perched';
    bird.tileX = BIRD_PERCH.x;
    bird.tileY = BIRD_PERCH.y;
    bird.posX = BIRD_PERCH.x;
    bird.posY = BIRD_PERCH.y;
    bird.path = null;
    bird.pathIdx = 0;
    bird.incomingUntil = 0;
  }

  function birdAct() {
    if (!bird) return false;
    if (bird.phase === 'incoming') {
      tickBirdArrival();
      if (bird.phase === 'perched') return true;
      if (birdPathStep()) return true;
      bird.phase = 'perched';
      bird.tileX = BIRD_PERCH.x;
      bird.tileY = BIRD_PERCH.y;
      bird.path = null;
      bird.pathIdx = 0;
      return true;
    }
    if (bird.phase === 'leaving') {
      if (birdPathStep()) return true;
      bird = null;
      birdEncounterDone = true;
      return true;
    }
    return false;
  }

  function spawnBirdEncounter() {
    if (bird || birdEncounterDone || aftermath) return;
    bird = {
      phase: 'incoming',
      tileX: BIRD_DOOR.x,
      tileY: BIRD_DOOR.y,
      posX: BIRD_DOOR.x,
      posY: BIRD_DOOR.y,
      path: null,
      pathIdx: 0,
      energy: 0,
      method: null,
      incomingUntil: Date.now() + 2600,
    };
    showSecretToast('something fluttered in through the door....', 3400);
    window.StorePause?.onBird?.('arrive');
    scheduleVinylToast(() => {
      showSecretToast(
        isTouchUi()
          ? 'little bird on the top shelf.... TALK when you are close'
          : 'little bird on the top shelf.... [Z] when you are close',
        4200,
      );
    }, 2200);
  }

  function drawBird(ctx, ox, oy) {
    if (!bird) return;
    const px = ox + (bird.tileX - camTX) * TILE + TILE / 2;
    const py = oy + bird.tileY * TILE + TILE / 2 - 6;
    if (px < ox - TILE || px > ox + viewCols * TILE + TILE) return;
    const mood = bird.phase === 'incoming' || bird.phase === 'leaving' ? 'flying'
      : bird.phase === 'perched' ? 'scared' : 'perched';
    if (window.PixelGfx?.drawPixelBird) {
      PixelGfx.drawPixelBird(ctx, px, py, frame, mood);
    }
    if (bird.phase === 'perched' && window.PixelGfx?.drawWarmGlow) {
      PixelGfx.drawWarmGlow(ctx, px, py + 4, 14, '#c9a84c', 0.06 + Math.sin(frame * 0.12) * 0.03);
    }
  }

  function birdForInteract() {
    if (!bird || bird.phase !== 'perched') return null;
    const d = tileDistCheb(player.x, player.y, bird.tileX, bird.tileY);
    if (d >= 1 && d <= 2) return bird;
    return null;
  }

  function resolveBirdEncounter(method = 'hum') {
    if (!bird || bird.phase !== 'perched') return false;
    bird.method = method;
    bird.phase = 'leaving';
    bird.path = findPath(bird.tileX, bird.tileY, BIRD_DOOR.x, BIRD_DOOR.y, null)
      || [[BIRD_DOOR.x, BIRD_DOOR.y]];
    bird.pathIdx = 0;
    bird.energy = 0;
    window.GameProgress?.unlockSecret?.('bird_guide');
    window.StorePause?.onBird?.('helped');
    onBirdGuide?.();
    triggerEchoRipple();
    showSecretToast('echo orb caught — the bird heard what you heard ♫', 3400);
    scheduleVinylToast(() => {
      showSecretToast('sarah would say: you heard what the bird heard....', 3800);
    }, 1600);
    const toasts = {
      moon: 'gold jazz unfurls.... the bird follows the moon window out ♫',
      shelter: 'green storm softens.... wings trust the open door ♫',
      mirror: 'purple glass shimmers.... a gentle exit in reflection ♫',
      hum: 'your hum matched the store.... it flew home unharmed ♫',
      orph: 'orph nodded once.... the bird left on storm-colored air ♫',
      simon: 'breadcrumb path to the door.... bird walked the music out ♫',
      honey: 'heartbeat calm.... the bird hopped into the night smiling ♫',
      listen: 'you waited.... the bird chose the door when the song ended ♫',
    };
    showSecretToast(toasts[method] || toasts.hum, 4200);
    updateHint();
    return true;
  }

  function showExamineToast(text, ms = 4000) {
    if (!text) return;
    secretToastText = null;
    secretToastUntil = 0;
    const el = document.getElementById('examineToast');
    if (el) {
      el.textContent = text;
      el.classList.add('visible');
      if (examineToastTimer) clearTimeout(examineToastTimer);
      examineToastTimer = setTimeout(() => {
        el.classList.remove('visible');
        examineToastTimer = null;
      }, ms);
      return;
    }
    showSecretToast(text, ms);
  }

  function showSecretToast(text, ms = 3200) {
    if (!text) return;
    secretToastText = text;
    secretToastUntil = Date.now() + ms;
    window.StorePause?.onToast?.(text);
  }

  function dismissSecretToast() {
    if (!secretToastText || secretToastUntil < Date.now()) return false;
    secretToastText = null;
    secretToastUntil = 0;
    return true;
  }

  function clearSecretToast() {
    secretToastText = null;
    secretToastUntil = 0;
  }

  function displayZoom(W) {
    if (!isTouchUi()) return 1;
    if (W < 380) return 1.32;
    if (W < 520) return 1.22;
    if (W < 900) return 1.12;
    return 1;
  }

  function vinylForHint() {
    return vinylInRange();
  }

  function vinylForInteract() {
    return vinylInRange();
  }

  function allInteractPads() {
    const pads = [];
    for (const v of VINYL_PICKUPS) {
      pads.push({ padX: v.padX, padY: v.padY, color: v.color, kind: 'vinyl', label: '♫' });
    }
    for (const s of EXAMINE_SPOTS) {
      if (s.padX == null) continue;
      const c = s.mutual === 'orph' ? '#7b5ea7' : s.mutual === 'simon' ? '#4a8f7a'
        : s.mutual === 'honey' ? '#c45c7a' : '#c9a84c';
      pads.push({ padX: s.padX, padY: s.padY, color: c, kind: 'examine', label: '∴' });
    }
    for (const n of npcs) {
      if (n.hidden || !n.pinned) continue;
      const isSarah = n.id === 'ninjawhee_return';
      pads.push({
        padX: n.padX ?? n.tileX,
        padY: n.padY ?? n.tileY + 1,
        color: n.accent,
        kind: 'npc',
        label: isSarah ? '★' : 'Z',
      });
    }
    for (const cx of REGISTER_COLS) {
      pads.push({
        padX: cx, padY: REGISTER_ROW, color: '#c9a84c', kind: 'register', label: '★',
      });
    }
    return pads;
  }

  const SECRET_MARKERS = [
    { x: 24, y: 2, padX: 24, padY: 6, color: '#c9a84c', label: 'moon' },
    { x: 14, y: 15, padX: 14, padY: 15, color: '#7b5ea7', label: 'door' },
    { x: 19, y: 7, padX: 19, padY: 7, color: '#c9a84c', label: 'knock' },
  ];

  function padEmphasis(dist, on) {
    if (on) return 1;
    if (dist <= 1) return 0.95;
    if (dist <= 4) return 0.8;
    if (dist <= 8) return 0.58;
    if (dist <= 14) return 0.38;
    if (dist <= 22) return 0.2;
    return 0;
  }

  function drawInteractPads(ctx, ox, oy) {
    const pg = playerGridPos();
    const pulse = 0.45 + Math.sin(frame * 0.14) * 0.25;
    for (const pad of allInteractPads()) {
      if (!tileVisible(pad.padX)) continue;
      const px = screenX(pad.padX, ox);
      const py = oy + pad.padY * TILE;
      const dist = tileDist(pg.x, pg.y, pad.padX, pad.padY);
      const on = pg.x === pad.padX && pg.y === pad.padY;
      const emphasis = padEmphasis(dist, on);
      if (emphasis <= 0) continue;
      const zoneColor = pad.kind === 'vinyl' ? '#c9a84c' : pad.color;
      const basePulse = 0.1 + Math.sin(frame * 0.09 + pad.padX * 0.3) * 0.06;

      if (emphasis > 0.5 && window.PixelGfx?.drawPixelFloorZone) {
        PixelGfx.drawPixelFloorZone(
          ctx, px, py, TILE, TILE, zoneColor,
          basePulse + (on ? 0.28 : 0.12),
          emphasis < 0.8,
        );
      }
      if (window.PixelGfx?.drawInteractTileMarker) {
        PixelGfx.drawInteractTileMarker(ctx, px, py, TILE, pad.kind, zoneColor, basePulse, emphasis);
      }

      if (on) {
        const hint = onPadHintLabel(pad.kind);
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(248,244,232,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(hint, px + TILE / 2, py + TILE - 3);
      }
    }

    for (const sec of SECRET_MARKERS) {
      if (!tileVisible(sec.padX)) continue;
      const dist = tileDist(pg.x, pg.y, sec.padX, sec.padY);
      const on = pg.x === sec.padX && pg.y === sec.padY;
      const emphasis = padEmphasis(dist, on);
      if (emphasis <= 0) continue;
      const px = screenX(sec.padX, ox);
      const py = oy + sec.padY * TILE;
      const pulseS = 0.1 + Math.sin(frame * 0.1 + sec.x) * 0.06;
      if (emphasis > 0.55 && window.PixelGfx?.drawPixelFloorZone) {
        PixelGfx.drawPixelFloorZone(ctx, px, py, TILE, TILE, sec.color, pulseS + (on ? 0.2 : 0), true);
      }
      if (window.PixelGfx?.drawInteractTileMarker) {
        PixelGfx.drawInteractTileMarker(ctx, px, py, TILE, 'secret', sec.color, pulseS, emphasis);
      }
      if (on) {
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(248,244,232,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(onPadHintLabel('examine'), px + TILE / 2, py + TILE - 3);
      }
    }

    if (bird?.phase === 'perched' && tileVisible(bird.tileX)) {
      const dist = tileDist(pg.x, pg.y, bird.tileX, bird.tileY);
      const onBird = pg.x === bird.tileX && pg.y === bird.tileY;
      const emphasis = padEmphasis(dist, onBird);
      if (emphasis > 0) {
        const bx = screenX(bird.tileX, ox);
        const by = oy + bird.tileY * TILE;
        const birdPulse = 0.12 + Math.sin(frame * 0.11) * 0.08;
        if (emphasis > 0.55 && window.PixelGfx?.drawPixelFloorZone) {
          PixelGfx.drawPixelFloorZone(ctx, bx, by, TILE, TILE, '#c9a84c', birdPulse + (onBird ? 0.22 : 0), true);
        }
        if (window.PixelGfx?.drawInteractTileMarker) {
          PixelGfx.drawInteractTileMarker(ctx, bx, by, TILE, 'npc', '#c9a84c', birdPulse, emphasis);
        }
        if (onBird) {
          ctx.font = '4px "Press Start 2P", monospace';
          ctx.fillStyle = 'rgba(248,244,232,0.85)';
          ctx.textAlign = 'center';
          ctx.fillText(onPadHintLabel('bird'), bx + TILE / 2, by + TILE - 3);
        }
      }
    }

    if (sarahRegisterTalk(pg)) {
      const sarah = npcs.find((n) => n.id === 'ninjawhee_return' && !n.hidden);
      if (sarah && tileVisible(sarah.tileX) && window.PixelGfx?.drawSarahCounterArrow) {
        const cx = screenX(pg.x, ox) + TILE / 2;
        const cy = oy + pg.y * TILE + TILE / 2;
        const { sx, sy } = entScreenPos(sarah, ox, oy);
        PixelGfx.drawSarahCounterArrow(ctx, cx, cy, sx, sy - 8, pulse);
      }
    }
  }

  function drawStoreClutter(ctx, ox, oy) {
    const pulse = 0.2 + Math.sin(frame * 0.09) * 0.12;
    for (const p of STORE_PROPS) {
      if (!tileVisible(p.x)) continue;
      const px = screenX(p.x, ox);
      const py = oy + p.y * TILE;
      if (p.kind === 'rack' && window.PixelGfx?.drawFloorRecordRack) {
        PixelGfx.drawFloorRecordRack(ctx, px + 3, py + 4, p.tiles || 2, p.accent, pulse);
      } else if (p.kind === 'crate' && window.PixelGfx?.drawPixelCrate) {
        PixelGfx.drawPixelCrate(ctx, px + 4, py + 8, p.accent);
      } else if (p.kind === 'box' && window.PixelGfx?.drawPixelBox) {
        PixelGfx.drawPixelBox(ctx, px + 6, py + 10, p.accent);
      } else if (p.kind === 'plant' && window.PixelGfx?.drawPixelPlant) {
        PixelGfx.drawPixelPlant(ctx, px + TILE / 2, py + TILE - 8);
      } else if (p.kind === 'turntable' && window.PixelGfx?.drawPixelTurntable) {
        PixelGfx.drawPixelTurntable(ctx, px + 4, py + 6, TILE - 8, TILE - 14, frame * 0.07);
      }
    }
  }

  function drawRecordShelves(ctx, ox, oy) {
    const pulse = 0.35 + Math.sin(frame * 0.1) * 0.2;
    for (const shelf of RECORD_SHELVES) {
      if (!tileVisible(shelf.x)) continue;
      const px = screenX(shelf.x, ox);
      const py = oy + shelf.y * TILE + 2;
      const featured = VINYL_PICKUPS.some((v) => v.shelfX === shelf.x);
      const boost = featured && shelfPulseUntil > Date.now() ? 0.2 : 0;
      if (window.PixelGfx?.drawRecordShelfWall) {
        PixelGfx.drawRecordShelfWall(ctx, px, py, shelf.tiles, shelf.accent, pulse + boost);
      } else if (window.PixelGfx?.drawPixelShelfUnit) {
        PixelGfx.drawPixelShelfUnit(ctx, px, py, shelf.tiles * TILE - 4, TILE - 6, shelf.accent);
      }
    }
  }

  function drawWayfindingSigns(ctx, ox, oy) {
    const pg = playerGridPos();
    let nearest = null;
    let nearestDist = Infinity;
    for (const aisle of ROOM_AISLES) {
      if (!tileVisible(aisle.cx)) continue;
      const dist = Math.abs(pg.x - aisle.cx) + Math.abs(pg.y - 10);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = aisle;
      }
    }
    if (!nearest || nearestDist > 18) return;
    const sx = screenX(nearest.cx, ox) - 42;
    const sy = oy + 10 * TILE - 48;
    if (window.PixelGfx?.drawStoreZoneSign) {
      PixelGfx.drawStoreZoneSign(ctx, sx, sy, 84, nearest.label, nearest.sub, nearest.color);
    }
  }

  function drawExamineWallMarkers(ctx, ox, oy) {
    const pulse = 0.4 + Math.sin(frame * 0.12) * 0.25;
    const pg = playerGridPos();
    for (const s of EXAMINE_SPOTS) {
      if (examinedIds.has(s.id)) continue;
      const padDist = tileDist(pg.x, pg.y, s.padX ?? s.x, s.padY ?? s.y);
      if (padDist > 5) continue;
      if (!tileVisible(s.x)) continue;
      const px = screenX(s.x, ox) + 4;
      const py = oy + s.y * TILE + (s.y <= 2 ? 4 : 2);
      const c = s.mutual === 'orph' ? '#7b5ea7' : s.mutual === 'simon' ? '#4a8f7a'
        : s.mutual === 'honey' ? '#c45c7a' : '#c9a84c';
      if (window.PixelGfx?.drawExamineWallMarker) {
        PixelGfx.drawExamineWallMarker(ctx, px, py, TILE - 8, TILE - 10, s.short, c, pulse);
      }
      if (s.padX != null && tileVisible(s.padX) && window.PixelGfx?.drawTutorialArrow) {
        const padDist = tileDist(pg.x, pg.y, s.padX, s.padY);
        if (padDist > 0 && padDist <= 4) {
          const fx = screenX(pg.x, ox) + TILE / 2;
          const fy = oy + pg.y * TILE + TILE / 2;
          const tx = screenX(s.padX, ox) + TILE / 2;
          const ty = oy + s.padY * TILE + TILE / 2;
          PixelGfx.drawTutorialArrow(ctx, fx, fy, tx, ty, pulse);
        }
      }
    }
  }

  function resolveInteractTarget(force = false) {
    const key = `${player.x},${player.y},${listeningId || ''},${bird?.phase || ''}`;
    if (!force && key === cachedInteractKey) return cachedInteractTarget;
    cachedInteractKey = key;
    if (birdForInteract()) {
      cachedInteractTarget = { type: 'bird', x: bird.tileX, y: bird.tileY };
      return cachedInteractTarget;
    }
    const pg = playerGridPos();
    const onExaminePad = EXAMINE_SPOTS.find(
      (s) => s.padX != null && pg.x === s.padX && pg.y === s.padY,
    );
    const onVinylPad = VINYL_PICKUPS.find((v) => pg.x === v.padX && pg.y === v.padY);
    if (onVinylPad) {
      cachedInteractTarget = { type: 'vinyl', x: onVinylPad.shelfX, y: onVinylPad.shelfY, vinyl: onVinylPad };
      return cachedInteractTarget;
    }
    if (onExaminePad) {
      cachedInteractTarget = { type: 'examine', x: onExaminePad.x, y: onExaminePad.y, spot: onExaminePad };
      return cachedInteractTarget;
    }
    if (sarahRegisterTalk(pg)) {
      const sarah = npcs.find((n) => n.id === 'ninjawhee_return' && !n.hidden);
      if (sarah) {
        const g = entTile(sarah);
        cachedInteractTarget = { type: 'npc', x: g.x, y: g.y, npc: sarah };
        return cachedInteractTarget;
      }
    }
    const onNpcPad = npcs.find((n) => {
      if (n.hidden) return false;
      const px = n.padX ?? n.tileX;
      const py = n.padY ?? n.tileY + 1;
      return pg.x === px && pg.y === py;
    });
    if (onNpcPad) {
      const g = entTile(onNpcPad);
      cachedInteractTarget = { type: 'npc', x: g.x, y: g.y, npc: onNpcPad };
      return cachedInteractTarget;
    }
    const vinyl = vinylForHint();
    if (vinyl) {
      cachedInteractTarget = { type: 'vinyl', x: vinyl.shelfX, y: vinyl.shelfY, vinyl };
      return cachedInteractTarget;
    }
    const n = playerFacingNpc();
    if (n) {
      const g = entTile(n);
      cachedInteractTarget = { type: 'npc', x: g.x, y: g.y, npc: n };
      return cachedInteractTarget;
    }
    const examine = examineForHint();
    if (examine) {
      cachedInteractTarget = { type: 'examine', x: examine.x, y: examine.y, spot: examine };
      return cachedInteractTarget;
    }
    const spot = getSecretSpot();
    if (spot) {
      const f = facingTile();
      cachedInteractTarget = { type: 'secret', x: f.x, y: f.y, spot };
      return cachedInteractTarget;
    }
    cachedInteractTarget = null;
    return null;
  }

  function invalidateInteractCache() {
    cachedInteractKey = '';
    cachedInteractTarget = null;
  }

  function highlightedVinyl() {
    return vinylInRange();
  }

  function drawStoreProps(ctx, ox, oy) {
    const pulse = 0.35 + Math.sin(frame * 0.1) * 0.2;
    for (const v of VINYL_PICKUPS) {
      if (!tileVisible(v.shelfX)) continue;
      const px = screenX(v.shelfX, ox);
      const py = oy + v.shelfY * TILE;
      if (window.PixelGfx?.drawWoodShelfTile) {
        const boost = shelfPulseUntil > Date.now() && listeningId === v.id ? 0.35 : 0;
        PixelGfx.drawWoodShelfTile(ctx, px, py, TILE, true, v.color, pulse + boost, v.id);
      }
    }
    for (const cx of REGISTER_COLS) {
      if (!tileVisible(cx)) continue;
      if (window.PixelGfx?.drawRegisterTile) {
        PixelGfx.drawRegisterTile(ctx, screenX(cx, ox), oy + REGISTER_ROW * TILE, TILE);
      }
    }
  }

  function vinylAtShelf(tx, ty) {
    return VINYL_PICKUPS.find((v) => v.shelfX === tx && v.shelfY === ty);
  }

  function vinylAtPad(tx, ty) {
    return VINYL_PICKUPS.find((v) => v.padX === tx && v.padY === ty);
  }

  const SPINE_COLORS = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7', '#e8e0f0'];

  function drawTile(ctx, t, px, py, tx, ty) {
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(px, py, TILE, TILE);

    if (t === 'W') {
      if (window.PixelGfx?.drawBrickWall) {
        PixelGfx.drawBrickWall(ctx, px, py, TILE, tx, ty);
      }
    } else if (t === '.') {
      const room = roomIndex(tx);
      const aisle = ROOM_AISLES[room];
      const onAisle = aisle && Math.abs(tx - aisle.cx) <= 1 && ty >= 4 && ty <= 14;
      const loungeCarpet = room === 2 && ty >= 11;
      if (loungeCarpet && window.PixelGfx?.drawCarpetFloor) {
        PixelGfx.drawCarpetFloor(ctx, px, py, TILE, tx, ty);
      } else if (window.PixelGfx?.drawParquetFloor) {
        PixelGfx.drawParquetFloor(ctx, px, py, TILE, tx, ty, room);
      }
      if (onAisle && window.PixelGfx?.drawAisleRunner) {
        PixelGfx.drawAisleRunner(ctx, px, py, TILE, tx, ty, aisle.color, 0.2);
      }
      if (ty >= ARCH_ROWS.min && ty <= ARCH_ROWS.max && ARCH_COLS.includes(tx)) {
        const archPulse = 0.06 + Math.sin(frame * 0.08 + tx) * 0.03;
        ctx.fillStyle = `rgba(201,168,76,${archPulse})`;
        ctx.fillRect(px + 8, py + 3, TILE - 16, 2);
        if (window.PixelGfx?.drawWarmGlow) {
          PixelGfx.drawWarmGlow(ctx, px + TILE / 2, py + TILE / 2, 8, '#c9a84c', 0.03);
        }
      }
    } else if (t === 'S') {
      const featured = vinylAtShelf(tx, ty);
      const shelfBoost = shelfPulseUntil > Date.now() && featured ? 0.35 : 0;
      const pulse = 0.35 + Math.sin(frame * 0.1 + tx) * 0.25 + shelfBoost;
      if (window.PixelGfx?.drawWoodShelfTile) {
        PixelGfx.drawWoodShelfTile(ctx, px, py, TILE, !!featured, featured?.color, pulse, featured?.id);
      }
    } else if (t === 'C') {
      if (window.PixelGfx?.drawRegisterTile) {
        PixelGfx.drawRegisterTile(ctx, px, py, TILE);
      }
    } else if (t === 'D') {
      const doorGlow = aftermath?.tier === 'wings' ? 0.55
        : counterFlashUntil > Date.now() ? 0.35 : 0.15;
      const doorOpen = storeDoorOpen && ty === STREET_DOOR.y;
      if (window.PixelGfx?.drawDoorTile) {
        PixelGfx.drawDoorTile(ctx, px, py, TILE, doorGlow, doorOpen);
      }
    } else if (t === 'R') {
      if (window.PixelGfx?.drawCarpetFloor) {
        PixelGfx.drawCarpetFloor(ctx, px, py, TILE, tx, ty);
      } else if (window.PixelGfx?.drawParquetFloor) {
        PixelGfx.drawParquetFloor(ctx, px, py, TILE, tx, ty);
      }
    } else if (t === 'T' || t === 'P') {
      if (window.PixelGfx?.drawParquetFloor) {
        PixelGfx.drawParquetFloor(ctx, px, py, TILE, tx, ty);
      }
    }

    if (t === 'T' && window.PixelGfx?.drawPixelTurntable) {
      PixelGfx.drawPixelTurntable(ctx, px + 2, py + 4, TILE - 4, TILE - 8, frame * 0.06 + tx);
    }
    if (t === 'P' && window.PixelGfx?.drawPixelPlant) {
      PixelGfx.drawPixelPlant(ctx, px + TILE / 2, py + TILE - 6);
    }

    if (t === '.' && tx === 19 && ty === 1) {
      window.PixelGfx?.drawPixelWindow(ctx, px + 3, py + 3, TILE - 6, TILE - 6);
      window.PixelGfx?.drawPixelMoon(ctx, px + TILE / 2, py + TILE / 2 + 2, 7);
    }
    if (t === '.' && tx === STREET_DOOR.x && ty === STREET_DOOR.y) {
      ctx.fillStyle = 'rgba(201,168,76,0.12)';
      ctx.fillRect(px + 3, py + TILE - 8, TILE - 6, 5);
    }
  }

  function drawSecretSpotHints(ctx, ox, oy) {
    const sessionEcho = window.VinylEchoBridge?.getVinylListenCount?.() || 0;
    const persistListens = window.GameProgress?.getVinylListenCount?.() ?? 0;
    const echoCount = Math.max(sessionEcho, persistListens);
    if (!vinylPreviewed && echoCount < 1) return;
    const sparkle = echoCount >= 2;
    const spots = [
      { x: 19, y: 1, c: '#c9a84c' },
      { x: 10, y: 11, c: '#7b5ea7' },
      { x: 9, y: 4, c: '#c45c7a' },
    ];
    const pulse = 0.35 + Math.sin(frame * 0.1) * 0.2;
    spots.forEach((s) => {
      if (s.x < camTX || s.x >= camTX + viewCols) return;
      const px = screenX(s.x, ox) + TILE / 2;
      const py = oy + s.y * TILE + TILE / 2;
      ctx.fillStyle = s.c + Math.floor(pulse * 99).toString(16).padStart(2, '0');
      ctx.fillRect(px - 2, py - 2, 4, 4);
      if (sparkle) {
        ctx.fillStyle = `rgba(248,244,232,${0.2 + Math.sin(frame * 0.15 + s.x) * 0.15})`;
        ctx.fillRect(px - 1, py - 5, 2, 2);
        ctx.fillRect(px + 3, py + 1, 2, 2);
      }
    });
  }

  function drawEchoRipple(ctx, ox, oy, mapW, mapH) {
    if (echoRippleUntil < Date.now()) return;
    const t = (echoRippleUntil - Date.now()) / 900;
    const cx = ox + mapW / 2;
    const cy = oy + mapH / 2;
    const r = (1 - t) * Math.min(mapW, mapH) * 0.45;
    ctx.strokeStyle = `rgba(123,94,167,${t * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawAftermathEffects(ctx, ox, oy, mapW, mapH) {
    if (!aftermath) return;
    const style = getAftermathStyle();
    if (!style) return;

    if (aftermath.tier === 'wings') {
      for (let i = 0; i < 6; i++) {
        const wx = ox + mapW * (0.2 + (i % 3) * 0.25) + Math.sin(frame * 0.05 + i) * 8;
        const wy = oy + mapH * 0.35 + Math.cos(frame * 0.04 + i * 1.2) * 10;
        ctx.fillStyle = `rgba(232,212,140,${0.12 + Math.sin(frame * 0.1 + i) * 0.08})`;
        ctx.fillRect(wx, wy, 3, 3);
        ctx.fillRect(wx + 5, wy - 4, 2, 2);
      }
      if (tileVisible(19)) {
        const mx = screenX(19, ox) + TILE / 2;
        const my = oy + 1 * TILE + TILE / 2;
        if (window.PixelGfx?.drawWarmGlow) {
          PixelGfx.drawWarmGlow(ctx, mx, my, 24, '#e8d48c', 0.14);
        }
      }
    }

    if (aftermath.tier === 'static') {
      const cozy = 0.72 + Math.sin(frame * 0.06) * 0.22;
      ctx.fillStyle = `rgba(201,168,76,${cozy * 0.16})`;
      ctx.fillRect(ox + mapW * 0.1, oy + mapH * 0.2, mapW * 0.8, mapH * 0.55);
      LAMPS.forEach(([tx, ty], i) => {
        if (!tileVisible(tx)) return;
        const lx = screenX(tx, ox) + TILE / 2;
        const ly = oy + ty * TILE + 8;
        const lampPulse = 32 + Math.sin(frame * 0.09 + i) * 10;
        if (window.PixelGfx?.drawWarmGlow) {
          PixelGfx.drawWarmGlow(ctx, lx, ly, lampPulse, '#e8d48c', 0.24 + Math.sin(frame * 0.07 + i) * 0.08);
        }
      });
      for (let i = 0; i < 5; i++) {
        const drift = (frame * 0.35 + i * 28) % 72;
        const px = ox + mapW * (0.18 + i * 0.14) + Math.sin(frame * 0.05 + i * 1.4) * 6;
        const py = oy + mapH * 0.62 - drift;
        const alpha = 0.1 + Math.sin(frame * 0.09 + i) * 0.06;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(123,94,167,${alpha})`;
        ctx.fillText('♫', px, py);
        ctx.fillStyle = `rgba(201,168,76,${alpha * 0.55})`;
        ctx.fillRect(px - 1, py + 4, 2, 2);
      }
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = `rgba(232,224,240,${0.12 + Math.sin(frame * 0.04) * 0.05})`;
      ctx.textAlign = 'center';
      ctx.fillText('next time the whole side', ox + mapW / 2, oy + mapH * 0.78);
    }

    if (aftermath.tier === 'groove') {
      ctx.fillStyle = 'rgba(74,143,122,0.1)';
      ctx.fillRect(ox + mapW * 0.15, oy + mapH - 8, mapW * 0.7, 3);
    }
  }

  function tileVisible(tx) {
    return tx >= camTX && tx < camTX + viewCols;
  }

  function drawRoomArchways(ctx, ox, oy) {
    const arches = [ROOM_W - 1, ROOM_W * 2 - 1];
    arches.forEach((ax) => {
      if (!tileVisible(ax) && !tileVisible(ax + 1)) return;
      for (let dy = ARCH_ROWS.min; dy <= ARCH_ROWS.max; dy++) {
        const px = screenX(ax, ox) + TILE / 2;
        const py = oy + dy * TILE;
        ctx.fillStyle = 'rgba(42,32,56,0.55)';
        ctx.fillRect(px - TILE / 2, py - 2, TILE, 4);
        ctx.fillStyle = 'rgba(201,168,76,0.35)';
        ctx.fillRect(px - TILE / 2 + 4, py - TILE / 2, TILE - 8, 6);
      }
    });
  }

  function drawStoreDecor(ctx, ox, oy, mapW) {
    const style = getAftermathStyle();
    const banner = style?.banner || `∴ ${STORE_PROFILE.name} ∴`;
    const bannerColor = style?.accent || '#e8c88c';
    const room = roomIndex(player.x);
    const roomLabel = ROOM_LABELS[room] || '';

    ctx.fillStyle = 'rgba(10,8,18,0.55)';
    ctx.fillRect(ox + mapW * 0.06, oy - 44, mapW * 0.88, 30);
    ctx.strokeStyle = bannerColor + '66';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + mapW * 0.06, oy - 44, mapW * 0.88, 30);
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = bannerColor;
    ctx.textAlign = 'center';
    ctx.fillText(banner, ox + mapW / 2, oy - 34);
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(232,224,240,0.45)';
    ctx.fillText(`${STORE_PROFILE.address} · ${roomLabel}`, ox + mapW / 2, oy - 24);
    ctx.fillStyle = 'rgba(232,224,240,0.3)';
    ctx.fillText(STORE_PROFILE.tagline, ox + mapW / 2, oy - 16);
    ctx.fillStyle = bannerColor + '88';
    ctx.fillRect(ox + mapW * 0.12, oy - 12, mapW * 0.76, 2);

    const neonPulse = 0.5 + Math.sin(frame * 0.09) * 0.5;
    const neonText = style?.neon || 'SOUL';
    const neonColor = style?.neonColor || '#e8a04c';
    if (tileVisible(NEON_COL) && window.PixelGfx?.drawPixelNeonSign) {
      PixelGfx.drawPixelNeonSign(
        ctx, screenX(NEON_COL - 1, ox), oy + 14 * TILE - 14, 3 * TILE, neonText, neonColor, neonPulse,
      );
    }

    const counterFlash = counterFlashUntil > Date.now()
      ? (counterFlashUntil - Date.now()) / 3200
      : 0;
    if (tileVisible(REGISTER_COLS[0]) && window.PixelGfx?.drawPixelCounter) {
      PixelGfx.drawPixelCounter(
        ctx, screenX(REGISTER_COLS[0], ox), oy + REGISTER_ROW * TILE, REGISTER_COLS.length * TILE, TILE, counterFlash,
      );
    }

    LAMPS.forEach(([tx, ty], i) => {
      if (!tileVisible(tx)) return;
      const lx = screenX(tx, ox) + TILE / 2;
      const ly = oy + ty * TILE;
      const warmth = style?.warmth || 1;
      let glow = (0.35 + Math.sin(frame * 0.08 + i) * 0.15) * warmth;
      if (listeningId) {
        glow += Math.sin(frame * 0.14 + i * 0.6) * 0.18;
        glow += Math.sin(Date.now() / 120 + i) * 0.08;
      }
      if (aftermath?.tier === 'wings') glow += 0.12;
      if (aftermath?.tier === 'static') glow = Math.max(glow, 0.82 + Math.sin(frame * 0.07 + i) * 0.14);
      if (window.PixelGfx?.drawPixelLamp) {
        PixelGfx.drawPixelLamp(ctx, lx, ly, Math.min(1, glow));
      } else {
        ctx.fillStyle = '#1a1028';
        ctx.fillRect(lx - 1, ly - 10, 2, 10);
        ctx.fillStyle = `rgba(255, 236, 180, ${glow})`;
        ctx.fillRect(lx - 5, ly - 2, 10, 4);
        ctx.fillStyle = `rgba(201,168,76,${glow * 0.25})`;
        ctx.fillRect(lx - 8, ly + 2, 16, 10);
      }
      if (window.PixelGfx?.drawWarmGlow) {
        const glowR = listeningId ? 22 + glow * 10 : 18 + glow * 8;
        PixelGfx.drawWarmGlow(ctx, lx, ly + 8, glowR, '#c9a84c', listeningId ? 0.11 : 0.08);
      }
    });

    if (tileVisible(14) && window.PixelGfx?.drawPixelRug) {
      PixelGfx.drawPixelRug(ctx, screenX(13, ox), oy + 10 * TILE + 4, 3 * TILE, 2 * TILE, '#c9a84c');
      if (window.GameProgress?.hasSecret?.('dfjk')) {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#c45c7a';
        ctx.textAlign = 'center';
        ctx.fillText('🍕', screenX(14, ox), oy + 11 * TILE + 8);
      }
    }
    if (window.PixelGfx?.drawPixelPoster) {
      if (tileVisible(5)) {
        const jazzX = screenX(5, ox) + TILE;
        const jazzY = oy + 1 * TILE + TILE / 2;
        PixelGfx.drawPixelPoster(ctx, screenX(5, ox) + 4, oy + 1 * TILE + 2, TILE * 2 - 4, TILE - 6, 'NEW', '#4a8f7a');
        const hintDfjk = window.GameProgress?.getState?.()?.runs >= 1
          && !window.GameProgress?.hasSecret?.('dfjk');
        if (PixelGfx.drawPosterSparkle && (posterSparkleUntil > Date.now() || hintDfjk)) {
          PixelGfx.drawPosterSparkle(ctx, jazzX, jazzY, frame);
        }
      }
      if (tileVisible(22)) {
        PixelGfx.drawPixelPoster(ctx, screenX(22, ox) + 4, oy + 1 * TILE + 2, TILE * 2 - 4, TILE - 6, 'STORM', '#7b5ea7');
      }
      if (tileVisible(32)) {
        PixelGfx.drawPixelPoster(ctx, screenX(32, ox) + 4, oy + 1 * TILE + 2, TILE * 2 - 4, TILE - 6, 'USED', '#4a8f7a');
      }
      if (tileVisible(40)) {
        PixelGfx.drawPixelPoster(ctx, screenX(40, ox) + 4, oy + 12 * TILE + 2, TILE * 2 - 4, TILE - 6, 'DIG', '#c45c7a');
      }
      if (tileVisible(60)) {
        PixelGfx.drawPixelPoster(ctx, screenX(60, ox) + 4, oy + 1 * TILE + 2, TILE * 2 - 4, TILE - 6, 'SPIN', '#7b5ea7');
      }
      if (tileVisible(74)) {
        PixelGfx.drawPixelPoster(ctx, screenX(74, ox) + 4, oy + 12 * TILE + 2, TILE * 2 - 4, TILE - 6, 'HI-FI', '#c9a84c');
      }
      if (vinylPreviewed && tileVisible(4)) {
        const sp = 0.35 + Math.sin(frame * 0.12) * 0.25;
        const jx = screenX(4, ox);
        const jy = oy + 1 * TILE + 8;
        ctx.fillStyle = `rgba(248,244,232,${sp})`;
        ctx.fillRect(jx - 4, jy - 6, 3, 3);
        ctx.fillRect(jx + 6, jy + 2, 2, 2);
        ctx.fillRect(jx + 14, jy - 2, 2, 2);
      }
    }

    drawRoomArchways(ctx, ox, oy);

    if (tileVisible(15)) {
      const cx = screenX(15, ox) + TILE / 2;
      const cy = oy + 4 * TILE + TILE * 0.42;
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = counterFlash > 0 ? '#e8d48c' : 'rgba(232,224,240,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('register', cx, cy + 16);
    }
  }

  function drawVinyls(ctx, ox, oy) {
    const canDraw = window.PixelGfx?.drawVinylRecord || window.HeavyDialogueArt?.drawVinylPickup;
    if (!canDraw) return;
    const hi = highlightedVinyl();

    VINYL_PICKUPS.forEach((v, i) => {
      if (!tileVisible(v.shelfX)) return;
      const px = screenX(v.shelfX, ox) + TILE / 2;
      const py = oy + v.shelfY * TILE + TILE / 2 - 2;
      const playing = listeningId === v.id;
      const spin = frame * (playing ? 0.12 : 0.04) + i * 1.7;
      const r = playing ? 15 : 13;
      const near = hi?.id === v.id;
      const pulse = 0.3 + Math.sin(frame * 0.12 + i) * 0.2;

      if (playing && window.PixelGfx?.drawWarmGlow) {
        PixelGfx.drawWarmGlow(ctx, px, py, 24, v.color, 0.16);
      } else if (near) {
        ctx.strokeStyle = v.color + 'aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r + 5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = v.color + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (window.PixelGfx?.drawVinylRecord) {
        PixelGfx.drawVinylRecord(ctx, px, py, r, v.color, spin);
      } else {
        HeavyDialogueArt.drawVinylPickup(ctx, px, py, r, v.color, spin);
      }

      const title = window.VinylAudio?.TRACKS?.[v.id]?.title;
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = playing ? v.color : near ? 'rgba(232,224,240,0.65)' : 'rgba(232,224,240,0.38)';
      if (v.shelfTag) ctx.fillText(v.shelfTag, px, py - r - 4);
      if (v.zone) ctx.fillText(v.zone.slice(0, 16), px, py + r + 7);
      if (title) {
        ctx.fillStyle = playing ? v.color : 'rgba(232,224,240,0.5)';
        ctx.fillText(title.slice(0, 14), px, py + r + 16);
      }
    });
  }

  function drawSarahPresence(ctx, ox, oy) {
    const sarah = npcs.find((n) => n.id === 'ninjawhee_return');
    if (!sarah || sarah.hidden || !tileVisible(entTile(sarah).x)) return;
    const { sx, sy } = entScreenPos(sarah, ox, oy);
    const fresh = !talked.has(sarah.id) || counterFlashUntil > Date.now();
    const pulse = frame * 0.12;
    const pg = playerGridPos();
    const nearSarah = tileDistCheb(pg.x, pg.y, entTile(sarah).x, entTile(sarah).y) <= 6;
    if (fresh && nearSarah && window.PixelGfx?.drawSarahStandMarker) {
      PixelGfx.drawSarahStandMarker(ctx, sx, sy, pulse, fresh, TILE);
    } else if (fresh && window.PixelGfx?.drawWarmGlow) {
      PixelGfx.drawWarmGlow(ctx, sx, sy, 14, '#e8d48c', 0.1);
    }
  }

  function drawAftermathToast(ctx, ox, oy, mapW) {
    if (!aftermathToastText || aftermathToastUntil < Date.now()) return;
    const fade = (aftermathToastUntil - Date.now()) / 4200;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232,224,240,${0.45 + fade * 0.4})`;
    ctx.fillText(aftermathToastText, ox + mapW / 2, oy - 42);
  }

  function drawSecretToast(ctx, ox, oy, mapW) {
    if (!secretToastText || secretToastUntil < Date.now()) return;
    const fade = Math.min(1, (secretToastUntil - Date.now()) / 700);
    const lines = wrapTextLines(secretToastText, 30, 4);
    drawTextPanel(ctx, ox + mapW / 2, oy - 58, lines, {
      maxW: Math.min(mapW - 16, 380),
      fontSize: 8,
      lineH: 16,
      padY: 10,
      fade,
      border: `rgba(123,94,167,${fade})`,
      color: `rgba(248,244,232,${fade})`,
    });
  }

  function drawFlavorToast(ctx, ox, oy, mapW, mapH) {
    const id = flavorToastId || listeningId;
    if (!id || !VINYL_FLAVOR[id]) return;
    const show = listeningId === id || flavorToastUntil > Date.now();
    if (!show) return;

    const fade = flavorToastUntil > Date.now()
      ? Math.min(1, (flavorToastUntil - Date.now()) / 600)
      : (listeningId === id ? 1 : 0.65);
    const text = VINYL_FLAVOR[id];
    const v = VINYL_PICKUPS.find((p) => p.id === id);
    const color = v?.color || '#c9a84c';
    const lines = wrapTextLines(text, 32, 2);
    drawTextPanel(ctx, ox + mapW / 2, oy + mapH + 40, lines, {
      maxW: Math.min(mapW - 16, 280),
      fontSize: 5,
      lineH: 11,
      fade,
      border: color + Math.floor(fade * 180).toString(16).padStart(2, '0'),
    });
  }

  function drawDust(ctx, ox, oy, mapW, mapH) {
    const dustA = getAftermathStyle()?.dustAlpha ?? 0.15;
    ctx.fillStyle = `rgba(232,224,240,${dustA})`;
    DUST.forEach((d) => {
      const x = ox + d.x * mapW + Math.sin(frame * d.sp + d.ph) * 12;
      const y = oy + d.y * mapH + Math.cos(frame * d.sp * 0.7 + d.ph) * 8;
      ctx.fillRect(x, y, 2, 2);
    });
  }

  function drawNowPlayingHUD(ctx, W, H) {
    if (!listeningId) return;
    const info = window.VinylAudio?.getVinylPlaybackInfo?.();
    const track = window.VinylAudio?.TRACKS?.[listeningId];
    const albumTitle = info?.albumTitle || track?.title || listeningId;
    const songTitle = info?.songTitle || albumTitle;
    const duration = info?.durationMs || track?.duration || 90000;
    const elapsed = info?.elapsedMs ?? 0;
    const pct = info?.progress ?? (duration > 0 ? Math.min(1, elapsed / duration) : 0);
    const elapsedSec = Math.floor(elapsed / 1000);
    const totalSec = Math.ceil(duration / 1000);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const pad = 12;
    const w = Math.min(380, W - 24);
    const h = 72;
    const x = W - w - pad;
    const y = pad + 40;

    ctx.fillStyle = 'rgba(10,8,18,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#c45c7a';
    ctx.textAlign = 'left';
    ctx.fillText('♫ NOW SPINNING', x + 8, y + 14);
    ctx.fillStyle = '#f8f4e8';
    ctx.fillText(albumTitle.slice(0, 24), x + 8, y + 28);
    ctx.fillStyle = 'rgba(232,224,240,0.55)';
    ctx.font = '5px "Press Start 2P", monospace';
    const songLabel = info?.songCount
      ? `${songTitle.slice(0, 18)} · ${info.songIndex}/${info.songCount}`
      : songTitle.slice(0, 22);
    ctx.fillText(songLabel, x + 8, y + 42);
    ctx.fillStyle = 'rgba(232,224,240,0.4)';
    ctx.fillText(`${fmt(elapsedSec)} / ${fmt(totalSec)} · [X] stop`, x + 8, y + 54);

    ctx.fillStyle = '#1a1028';
    ctx.fillRect(x + 8, y + 58, w - 16, 5);
    ctx.fillStyle = listeningId === 'mirror' ? '#7b5ea7'
      : listeningId === 'shelter' ? '#4a8f7a' : '#c9a84c';
    ctx.fillRect(x + 8, y + 58, (w - 16) * pct, 5);

    vizBars.forEach((b, i) => {
      const bh = 8 + b * 28;
      ctx.fillStyle = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7'][i];
      ctx.fillRect(x + w - 58 + i * 12, y + 66 - bh, 8, bh);
    });
  }

  const NPC_LOOKS = {
    orph: { body: '#7b5ea7', bodyHi: '#9a7ec8', hair: '#5a3a6a', coat: '#2a1a38' },
    simon: { body: '#4a8f7a', bodyHi: '#6aaf9a', hair: '#1a1028', accent: '#4a8f7a' },
    honey: { body: '#c45c7a', bodyHi: '#e07a98', hair: '#3a2030', accent: '#c45c7a' },
  };

  function drawCharacter(ctx, px, py, s, bodyColor, hairColor, dir, bob) {
    if (window.PixelGfx?.drawPixelCharacter) {
      PixelGfx.drawPixelCharacter(ctx, px, py, s * 0.28, {
        body: bodyColor, hair: hairColor, dir, bob: Math.sin(bob) * 2, frame,
      });
      return;
    }
    const by = py + Math.sin(bob) * 2;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(px - s, by - s * 2, s * 2, s * 3);
  }

  function drawPlayer(ctx, ox, oy) {
    player.moving = entityStepAnim(player);
    const { sx: px, sy: py } = entScreenPos(player, ox, oy);
    const drawY = py + 4;
    if (window.PixelGfx?.drawPixelCharacter) {
      PixelGfx.drawPixelCharacter(ctx, px, drawY, 1.15, {
        body: '#4a8f7a', bodyHi: '#6aaf9a', hair: '#1a1028',
        coat: '#2a2038', accent: '#c9a84c',
        dir: player.dir, bob: player.bob, frame, moving: player.moving,
      });
    } else {
      drawCharacter(ctx, px, drawY, 4, '#4a8f7a', '#1a1028', player.dir, player.bob);
    }
    player.bob += player.moving ? 0.22 : 0.06;
  }

  function drawNPC(ctx, ox, oy, n) {
    n.moving = entityStepAnim(n);
    const gx = entTile(n).x;
    if (!tileVisible(gx)) return;
    const isSarah = n.id === 'ninjawhee_return';
    const { sx: px, sy: py } = entScreenPos(n, ox, oy);
    const bob = n.moving ? Math.sin(frame * 0.22) * 3 : Math.sin(frame * 0.05 + n.tileX) * 1.5;
    const s = isSarah ? 6 : 5;
    const pulse = 0.35 + Math.sin(frame * 0.1 + n.tileY) * 0.25;
    const g = entityGridPos(n);
    const nearPlayer = npcNearPlayer(n);
    const isMutual = ['orph', 'simon', 'honey'].includes(n.id);
    const fresh = !n.isPasserby && !talked.has(n.id);
    const showRing = nearPlayer && (fresh || isMutual || n.isPasserby);
    const findDone = isMutual && findCounts[n.id] >= 3;
    if (showRing && window.PixelGfx?.drawNpcZoneRing) {
      const ringPulse = findDone ? pulse + 0.4 : pulse;
      const ringR = findDone ? TILE * 0.44 : TILE * 0.36;
      PixelGfx.drawNpcZoneRing(ctx, px, py + 4, ringR, n.accent, ringPulse, false);
    }

    let drewPortrait = false;
    if (isSarah && window.PixelGfx?.drawPixelSarah) {
      const mood = n.moving ? 'talk' : (nearPlayer ? 'smile' : 'idle');
      PixelGfx.drawPixelSarah(ctx, px, py + 4, 1.2, {
        dir: n.dir || 'down', bob, frame, mood, moving: !!n.moving,
      });
      drewPortrait = true;
    } else if (isSarah && window.HeavyDialogueArt?.drawPixelNinjawhee) {
      const sarahFrame = n.moving ? 'talk' : (nearPlayer ? 'smile' : 'idle');
      HeavyDialogueArt.drawPixelNinjawhee(ctx, px, py + bob + 6, 1.08, sarahFrame, bob);
      drewPortrait = true;
      if (aftermath?.won) {
        const choice = aftermath.grooveChoice || window.GameProgress?.getLastRun?.()?.grooveChoice || 'keep';
        ctx.save();
        if (choice === 'pass') {
          ctx.globalAlpha = 0.28 + Math.sin(frame * 0.1) * 0.12;
          ctx.fillStyle = '#7b5ea7';
          ctx.fillRect(px - 13, py + bob - 16, 26, 26);
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = 'rgba(248,244,255,0.85)';
          ctx.fillRect(px - 16, py + bob - 1, 32, 3);
        } else if (window.PixelGfx?.drawWarmGlow) {
          PixelGfx.drawWarmGlow(ctx, px, py + bob - 2, 20, '#ffaa66', 0.18 + Math.sin(frame * 0.09) * 0.08);
        }
        ctx.restore();
      }
    }
    const portraitId = (isSarah || n.isPasserby) ? null : n.id;
    if (!drewPortrait && portraitId && window.HeavyDialogueArt?.drawNpcPortrait) {
      drewPortrait = true;
      HeavyDialogueArt.drawNpcPortrait(ctx, px, py + bob, 1.2, portraitId, bob);
    }
    if (!drewPortrait) {
      let look = NPC_LOOKS[n.id] || { body: n.accent, hair: '#1a1028' };
      if (isSarah) {
        if (aftermath?.won) {
          const choice = aftermath.grooveChoice || window.GameProgress?.getLastRun?.()?.grooveChoice;
          look = choice === 'pass'
            ? { body: '#7b5ea7', hair: '#c9a84c', coat: '#2a1a38', accent: '#c9a84c' }
            : { body: '#c9a84c', hair: '#2a1a38', coat: '#1a1028', accent: '#e8d48c' };
        } else {
          look = { body: '#2a1a38', hair: '#e8d48c', coat: '#1a1028', accent: '#c9a84c' };
        }
      }
      const npcDir = n.dir || 'down';
      if (window.PixelGfx?.drawPixelCharacter) {
        PixelGfx.drawPixelCharacter(ctx, px, py + 4, isSarah ? 1.35 : 1.15, {
          ...look, dir: npcDir, bob, frame, moving: !!n.moving,
        });
      } else {
        drawCharacter(ctx, px, py, s, look.body, look.hair, npcDir, bob);
      }
    }

    if (n.id === 'ninjawhee_return' && aftermath?.won) {
      const choice = aftermath.grooveChoice || window.GameProgress?.getLastRun?.()?.grooveChoice;
      if (choice === 'pass') {
        ctx.fillStyle = `rgba(123,94,167,${0.12 + Math.sin(frame * 0.07) * 0.06})`;
        ctx.fillRect(px - s * 2 - 2, py - s * 4 - 2, s * 4 + 4, s * 5 + 4);
      } else if (window.PixelGfx?.drawWarmGlow) {
        PixelGfx.drawWarmGlow(ctx, px, py - s, 16, '#e8d48c', 0.12);
      }
    }

    if (fresh && !n.isPasserby) {
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#f8f4ff';
      ctx.textAlign = 'center';
      ctx.fillText('!', px + 8, py - s * 3 - 4);
    }
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = n.accent;
    ctx.textAlign = 'center';
    ctx.fillText(n.label, px, py + s * 3 + 10);
    if (n.isPasserby && n.glanceUntil > Date.now()) {
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = 'rgba(232,224,240,0.75)';
      ctx.fillText('…', px + 10, py - s * 3 - 8);
    }
  }

  function tickViz() {
    if (!listeningId) {
      vizBars = vizBars.map((b) => b * 0.85);
      return;
    }
    vizBars = vizBars.map(() => 0.25 + Math.random() * 0.75);
  }

  function render() {
    if (!active || !ctx) return;
    frame++;
    tickHeldMovement();
    tickAutoWalk();
    const now = Date.now();
    const ppos = displayPos(player);
    const motionState = entityStepAnim(player) ? 'walking' : 'idle';
    tickNPCs(now);
    tickBirdArrival(now);
    if (frame % 4 === 0) tickViz();

    const W = canvas.width;
    const H = canvas.height;
    viewCols = Math.min(COLS, Math.max(20, Math.floor((W - 32) / TILE)));
    const camFocus = ppos.x;
    const nextCamTX = Math.max(0, Math.min(COLS - viewCols, camFocus - Math.floor(viewCols / 2)));
    const camMoved = nextCamTX !== lastCamTX || viewCols !== lastViewCols;
    camTX = nextCamTX;
    lastCamTX = camTX;
    lastViewCols = viewCols;
    const mapW = viewCols * TILE;
    const mapH = ROWS * TILE;
    const ox = (W - mapW) / 2;
    const oy = (H - mapH) / 2 - 20;
    const zoom = displayZoom(W);
    lastLayout = { ox, oy, camTX, viewCols, mapW, mapH, tile: TILE, zoom };
    if (zoom !== 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }

    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, W, H);

    if (window.PixelGfx) window.PixelGfx.setupPixelCtx(ctx);
    for (let y = 0; y < ROWS; y++) {
      for (let vx = 0; vx < viewCols; vx++) {
        const tx = camTX + vx;
        drawTile(ctx, MAP[y][tx], ox + vx * TILE, oy + y * TILE, tx, y);
      }
    }

    drawRoomTint(ctx, ox, oy, mapW, mapH);
    drawRecordShelves(ctx, ox, oy);
    drawStoreProps(ctx, ox, oy);
    drawStoreClutter(ctx, ox, oy);
    drawWayfindingSigns(ctx, ox, oy);
    drawDust(ctx, ox, oy, mapW, mapH);
    if (window.PixelGfx?.drawLampAmbientWash && frame % 2 === 0 && (camMoved || motionState !== 'idle')) {
      const visibleLamps = LAMPS
        .filter(([tx]) => tileVisible(tx))
        .map(([tx, ty]) => [tx - camTX, ty]);
      PixelGfx.drawLampAmbientWash(ctx, visibleLamps, ox, oy, TILE, frame);
    }
    drawSecretSpotHints(ctx, ox, oy);
    drawExamineWallMarkers(ctx, ox, oy);
    drawInteractPads(ctx, ox, oy);
    drawExamineGlints(ctx, ox, oy);
    drawEchoRipple(ctx, ox, oy, mapW, mapH);
    drawAftermathEffects(ctx, ox, oy, mapW, mapH);
    drawStoreAmbience(ctx, ox, oy, mapW, mapH);
    drawStoreDecor(ctx, ox, oy, mapW);
    drawVinyls(ctx, ox, oy);
    drawBird(ctx, ox, oy);
    drawSarahPresence(ctx, ox, oy);
    for (let ni = 0; ni < npcs.length; ni++) {
      const n = npcs[ni];
      if (!n.hidden) drawNPC(ctx, ox, oy, n);
    }
    drawInteractBubble(ctx, ox, oy);
    drawPlayer(ctx, ox, oy);

    const hiNow = highlightedVinyl()?.id || null;
    if (hiNow && hiNow !== lastHiVinylId) {
      flavorToastId = hiNow;
      flavorToastUntil = Date.now() + 2800;
      lastHiVinylId = hiNow;
    } else if (!hiNow) lastHiVinylId = null;
    drawFlavorToast(ctx, ox, oy, mapW, mapH);
    drawAftermathToast(ctx, ox, oy, mapW);
    drawSecretToast(ctx, ox, oy, mapW);

    if (window.GameProgress?.getSecretCount?.() > 0) {
      const n = GameProgress.getSecretCount();
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(201,168,76,0.45)';
      ctx.textAlign = 'right';
      ctx.fillText(`∴${n}`, ox + mapW - 4, oy - 12);
    }

    if (aftermath) {
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = getAftermathStyle()?.accent || '#c9a84c';
      ctx.textAlign = 'left';
      const tierLabel = aftermath.tier.toUpperCase();
      const run = aftermath.won ? 'mirror touched' : 'needle paused';
      ctx.fillText(`${tierLabel} · ${run}`, ox, oy - 12);
    }

    drawNowPlayingHUD(ctx, W, H);

    if (window.VinylEchoBridge?.drawGhostSlice) {
      VinylEchoBridge.drawGhostSlice(ctx, W, H);
    }
    if (!vinylPreviewed && window.VinylEchoBridge?.drawOverworldGhost) {
      VinylEchoBridge.drawOverworldGhost(ctx, W, H);
    }

    if (!vinylPreviewed && window.PixelGfx?.drawControlBar) {
      const barW = Math.min(mapW, W - 24);
      PixelGfx.drawControlBar(ctx, (W - barW) / 2, H - 36, barW);
    }

    const hintKey = `${player.x},${player.y},${listeningId || ''},${bird?.phase || ''}`;
    if (hintKey !== lastHintTileKey || frame % 6 === 0) {
      lastHintTileKey = hintKey;
      updateHint();
    }
    if (frame % 90 === 0) window.StorePause?.tick?.();
    const vinylActive = listeningId || window.VinylAudio?.isPlaying?.();
    if (frame % 60 === 0 && active && !vinylActive
        && !document.body.classList.contains('rhythm-active')
        && window.StoreAmbient?.ensurePlaying) {
      window.StoreAmbient.ensurePlaying();
    }
    if (frame % 45 === 0) window.StoreEvents?.tick?.(Date.now());

    if (previewHushUntil > Date.now()) {
      const hushA = (previewHushUntil - Date.now()) / 3400;
      ctx.fillStyle = `rgba(10,8,18,${0.06 + (1 - hushA) * 0.14})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (window.PixelGfx?.drawStoreVignette) {
      PixelGfx.drawStoreVignette(ctx, ox, oy, mapW, mapH, W, H);
    }
    if (window.PixelGfx) window.PixelGfx.drawScanlines(ctx, W, H, 0.028);
    if (zoom !== 1) ctx.restore();
    requestAnimationFrame(render);
  }

  function clearListening() {
    listeningId = null;
    listeningTitle = null;
    updateHint();
  }

  function isListening() {
    return !!listeningId || !!window.VinylAudio?.isPlaying?.();
  }

  function clearVinylToastTimers() {
    vinylToastTimers.forEach((id) => clearTimeout(id));
    vinylToastTimers = [];
  }

  function scheduleVinylToast(fn, delay) {
    const id = setTimeout(() => {
      vinylToastTimers = vinylToastTimers.filter((t) => t !== id);
      fn();
    }, delay);
    vinylToastTimers.push(id);
    return id;
  }

  function triggerPreviewHush(vinylId) {
    if (!vinylId) return;
    lastPreviewVinylId = vinylId;
    previewHushUntil = Date.now() + 3400;
    showSecretToast('the store hushes....', 2600);
    const names = { moon: 'gold moon jazz', shelter: 'green storm', mirror: 'purple glass' };
    scheduleVinylToast(() => {
      showSecretToast(`still hearing ${names[vinylId] || 'that side'}....`, 2800);
    }, 1200);
    for (const n of npcs) {
      if (!n.isPasserby || n.hidden) continue;
      n.glanceUntil = Date.now() + 3600;
    }
  }

  function stopVinyl() {
    const was = listeningId;
    clearListening();
    clearVinylToastTimers();
    window.VinylAudio?.stop();
    if (was) triggerPreviewHush(was);
  }

  function applyVinylListen(vinyl, title, firstSpin) {
    if (!title) return false;
    window.StoreAmbient?.stopForMusic?.(0);
    clearVinylToastTimers();
    listeningId = vinyl.id;
    lastPreviewVinylId = vinyl.id;
    listeningTitle = title || window.VinylAudio.TRACKS[vinyl.id].title;
    vinylPreviewed = true;
    shelfPulseUntil = Date.now() + 4200;
    showSecretToast('needle drops.... the room breathes with you ♫', 2600);
    if (firstSpin) {
      posterSparkleUntil = Date.now() + 12000;
      triggerEchoRipple();
      scheduleBirdEncounter();
      scheduleVinylToast(() => showSecretToast('ghost slice flickers — rhythm remembers this side', 3600), 500);
      scheduleVinylToast(() => showSecretToast('echo orbs stack in the HUD — richer slices when you eat', 4200), 1400);
      scheduleVinylToast(() => showSecretToast('that one always made her smile....', 3200), 3000);
      scheduleVinylToast(() => {
        showSecretToast("meet purple · green · pink mutuals — then sarah glows at the register", 4000);
      }, 6200);
      const mutualCount = ['orph', 'simon', 'honey'].filter((id) => talked.has(id)).length;
      if (mutualCount < 3) {
        scheduleVinylToast(() => {
          showSecretToast('find their clues on colored tiles — register waits after echoes', 3800);
        }, 10200);
      } else if (!sarahReadyToasted) {
        scheduleVinylToast(() => updateReturnNPC(), 10800);
      }
    }
    flavorToastId = vinyl.id;
    flavorToastUntil = Date.now() + 4500;
    const moves = window.VinylAudio?.TRACKS?.[vinyl.id]?.movementCount;
    const moveLabel = moves ? ` · ${moves} songs` : '';
    interactHint = `♫ ${listeningTitle}${moveLabel} · [X] stop`;
    syncSarahVisibility();
    if (mutualsComplete()) updateReturnNPC();
    updateHint();
    return true;
  }

  async function playVinyl(vinyl) {
    if (!vinyl || !onListenVinyl) return false;
    window.StoreAmbient?.stopForMusic?.(0);
    const firstSpin = !window.GameProgress?.hasVinyl?.(vinyl.id);
    try {
      const result = await onListenVinyl(vinyl);
      return applyVinylListen(vinyl, result, firstSpin);
    } catch (_) {
      showSecretToast(
        isTouchUi() ? 'audio asleep — tap TALK again' : 'audio asleep — tap [Z] again',
        2400,
      );
      return false;
    }
  }

  function tryMove(dx, dy, dir, diagonal = false) {
    if (paused) return false;
    player.dir = dir;
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!canWalkTile(nx, ny)) {
      showBumpToast(nx, ny);
      return false;
    }
    snapMove(player, nx, ny);
    stopVinyl();
    playerSpendsAut(moveAutCost(diagonal));
    return true;
  }

  const MOVE_PRIORITY = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'KeyV',
  ];

  function tickHeldMovement() {
    if (paused || heldMoveCodes.size === 0) return;
    const now = Date.now();
    if (now - lastMoveStepAt < MOVE_REPEAT_MS) return;
    const code = MOVE_PRIORITY.find((c) => heldMoveCodes.has(c));
    if (!code || !MOVE_KEY_MAP[code]) return;
    const [dx, dy, dir, diag] = MOVE_KEY_MAP[code];
    if (tryMove(dx, dy, dir, !!diag)) lastMoveStepAt = now;
  }

  function nearestInteractPad() {
    const pg = playerGridPos();
    let best = null;
    let bestD = 99;
    for (const pad of allInteractPads()) {
      const d = tileDistCheb(pg.x, pg.y, pad.padX, pad.padY);
      if (d < bestD) { bestD = d; best = pad; }
    }
    return best ? { pad: best, dist: bestD } : null;
  }

  function directionHint(fx, fy, tx, ty) {
    const parts = [];
    if (ty < fy) parts.push('north');
    if (ty > fy) parts.push('south');
    if (tx < fx) parts.push('west');
    if (tx > fx) parts.push('east');
    return parts.join(' · ') || 'here';
  }

  function screenToTile(clientX, clientY) {
    if (!canvas || !active || !lastLayout) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx = (clientX - rect.left) * scaleX;
    let cy = (clientY - rect.top) * scaleY;
    const zoom = lastLayout.zoom || 1;
    if (zoom !== 1) {
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;
      cx = (cx - midX) / zoom + midX;
      cy = (cy - midY) / zoom + midY;
    }
    const tile = lastLayout.tile || TILE;
    let vx = Math.floor((cx - lastLayout.ox) / tile);
    let vy = Math.floor((cy - lastLayout.oy) / tile);
    const viewCols = lastLayout.viewCols || COLS;
    vx = Math.max(0, Math.min(viewCols - 1, vx));
    vy = Math.max(0, Math.min(ROWS - 1, vy));
    const tx = Math.max(0, Math.min(COLS - 1, lastLayout.camTX + vx));
    const ty = Math.max(0, Math.min(ROWS - 1, vy));
    return { tx, ty };
  }

  function stepTowardTile(targetX, targetY) {
    const pg = playerGridPos();
    if (pg.x === targetX && pg.y === targetY) {
      if (checkInteract()) return true;
      nudgeTowardInteract();
      return false;
    }
    const dx = targetX - pg.x;
    const dy = targetY - pg.y;
    let stepX = 0;
    let stepY = 0;
    let dir = 'down';
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      stepX = Math.sign(dx);
      dir = stepX > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      stepY = Math.sign(dy);
      dir = stepY > 0 ? 'down' : 'up';
    } else {
      return false;
    }
    if (tryMove(stepX, stepY, dir)) {
      lastMoveStepAt = Date.now();
      return true;
    }
    if (stepX !== 0 && dy !== 0) {
      stepY = Math.sign(dy);
      if (tryMove(0, stepY, stepY > 0 ? 'down' : 'up')) {
        lastMoveStepAt = Date.now();
        return true;
      }
    }
    if (stepY !== 0 && dx !== 0) {
      stepX = Math.sign(dx);
      if (tryMove(stepX, 0, stepX > 0 ? 'right' : 'left')) {
        lastMoveStepAt = Date.now();
        return true;
      }
    }
    return false;
  }

  function handleTap(clientX, clientY) {
    if (!active || paused) return false;
    const tile = screenToTile(clientX, clientY);
    if (!tile) {
      if (dismissSecretToast()) return true;
      return false;
    }
    const pg = playerGridPos();
    const walkIntent = tile.tx !== pg.x || tile.ty !== pg.y;
    if (walkIntent) clearSecretToast();
    else if (dismissSecretToast()) return true;
    if (tile.tx === pg.x && tile.ty === pg.y) {
      clearAutoWalk();
      if (!checkInteract()) nudgeTowardInteract();
      return true;
    }
    clearAutoWalk();
    if (tileDistCheb(pg.x, pg.y, tile.tx, tile.ty) === 1) {
      const dx = tile.tx - pg.x;
      const dy = tile.ty - pg.y;
      const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      if (tryMove(dx, dy, dir)) lastMoveStepAt = Date.now();
      return true;
    }
    return queueWalkTo(tile.tx, tile.ty);
  }

  function handleTouchDir(code) {
    if (!active || paused || !MOVE_KEY_MAP[code]) return false;
    clearAutoWalk();
    heldMoveCodes.add(code);
    const [dx, dy, dir, diag] = MOVE_KEY_MAP[code];
    if (tryMove(dx, dy, dir, !!diag)) lastMoveStepAt = Date.now();
    return true;
  }

  function handleTouchDirEnd(code) {
    if (code) heldMoveCodes.delete(code);
  }

  function nudgeTowardInteract() {
    const pg = playerGridPos();
    const near = nearestInteractPad();
    if (!near) {
      showSecretToast('walk the floor — colored tiles are interact spots', 2600);
      return;
    }
    if (near.dist === 0) {
      showSecretToast(
        isTouchUi() ? 'you are on the spot — tap TALK again' : 'you are on the spot — press Z again',
        1800,
      );
      return;
    }
    const label = near.pad.kind === 'vinyl' ? 'vinyl pad'
      : near.pad.kind === 'npc' ? 'talk spot'
        : near.pad.kind === 'register' ? 'register'
          : 'look closer spot';
    showSecretToast(
      `${label} ${directionHint(pg.x, pg.y, near.pad.padX, near.pad.padY)}`,
      2400,
    );
  }

  function waitTurn() {
    if (paused) return;
    playerSpendsAut(AUT_MOVE);
  }

  function checkInteract() {
    if (birdForInteract() && onTalkBird) {
      faceToward(bird.tileX, bird.tileY);
      stopVinyl();
      onTalkBird();
      playerSpendsAut(AUT_INTERACT);
      return true;
    }
    const pg = playerGridPos();
    const onVinylPad = VINYL_PICKUPS.find((v) => pg.x === v.padX && pg.y === v.padY);
    if (onVinylPad) {
      faceToward(onVinylPad.shelfX, onVinylPad.shelfY);
      if (listeningId === onVinylPad.id) {
        stopVinyl();
        playerSpendsAut(AUT_INTERACT);
        return true;
      }
      playVinyl(onVinylPad);
      playerSpendsAut(AUT_INTERACT);
      return true;
    }
    const onExaminePad = EXAMINE_SPOTS.find(
      (s) => s.padX != null && pg.x === s.padX && pg.y === s.padY,
    );
    if (onExaminePad) {
      faceToward(onExaminePad.x, onExaminePad.y);
      if (examineSpot(onExaminePad)) {
        playerSpendsAut(AUT_EXAMINE);
        return true;
      }
      playerSpendsAut(AUT_EXAMINE);
      return true;
    }
    if (sarahRegisterTalk(pg) && onTalkNPC) {
      const sarah = npcs.find((n) => n.id === 'ninjawhee_return' && !n.hidden);
      if (sarah) {
        const g = entTile(sarah);
        faceToward(g.x, g.y);
        stopVinyl();
        const firstTalk = !talked.has(sarah.id);
        talked.add(sarah.id);
        onTalkNPC(sarah, firstTalk);
        syncSarahVisibility();
        updateReturnNPC();
        playerSpendsAut(AUT_INTERACT);
        return true;
      }
    }
    const onNpcPad = npcs.find((n) => {
      if (n.hidden) return false;
      const px = n.padX ?? n.tileX;
      const py = n.padY ?? n.tileY + 1;
      return pg.x === px && pg.y === py;
    });
    if (onNpcPad && onTalkNPC) {
      const g = entTile(onNpcPad);
      faceToward(g.x, g.y);
      stopVinyl();
      const firstTalk = onNpcPad.isPasserby ? true : !talked.has(onNpcPad.id);
      if (onNpcPad.pinned || !onNpcPad.isPasserby) talked.add(onNpcPad.id);
      onTalkNPC(onNpcPad, firstTalk);
      if (!onNpcPad.isPasserby) {
        syncSarahVisibility();
        updateReturnNPC();
      }
      playerSpendsAut(AUT_INTERACT);
      return true;
    }
    const n = playerFacingNpc();
    if (n && onTalkNPC) {
      const g = entTile(n);
      faceToward(g.x, g.y);
      stopVinyl();
      const firstTalk = n.isPasserby ? true : !talked.has(n.id);
      if (n.pinned || !n.isPasserby) talked.add(n.id);
      onTalkNPC(n, firstTalk);
      if (!n.isPasserby) {
        syncSarahVisibility();
        updateReturnNPC();
      }
      playerSpendsAut(AUT_INTERACT);
      return true;
    }
    const vinyl = vinylForInteract();
    if (vinyl) {
      faceToward(vinyl.shelfX, vinyl.shelfY);
      if (listeningId === vinyl.id) {
        stopVinyl();
        playerSpendsAut(AUT_INTERACT);
        return true;
      }
      playVinyl(vinyl);
      playerSpendsAut(AUT_INTERACT);
      return true;
    }
    const examine = examineFacingSpot();
    if (examine) {
      faceToward(examine.x, examine.y);
      if (examineSpot(examine)) {
        playerSpendsAut(AUT_EXAMINE);
        return true;
      }
      playerSpendsAut(AUT_EXAMINE);
      return true;
    }
    const spot = getSecretSpot();
    if (spot && onSecretInteract?.(spot)) {
      playerSpendsAut(AUT_EXAMINE);
      return true;
    }
    return false;
  }

  function mutualsComplete() {
    return ['orph', 'simon', 'honey'].every((id) => talked.has(id));
  }

  function shouldRevealSarah() {
    return vinylPreviewed;
  }

  function syncSarahVisibility() {
    if (aftermath) return;
    const sarah = npcs.find((n) => n.id === 'ninjawhee_return');
    if (!sarah) return;
    const reveal = shouldRevealSarah();
    const wasHidden = sarah.hidden;
    sarah.hidden = !reveal;
    if (reveal && wasHidden && counterFlashUntil < Date.now()) {
      counterFlashUntil = Date.now() + 2200;
    }
  }

  function updateReturnNPC() {
    if (!mutualsComplete() || !shouldRevealSarah()) return;
    if (sarahReadyToasted) return;
    const sarah = npcs.find((n) => n.id === 'ninjawhee_return');
    if (!sarah) return;
    sarahReadyToasted = true;
    counterFlashUntil = Date.now() + 5200;
    showSecretToast('register glows.... sarah is ready to eat some sounds with you', 4200);
    interactHint = isTouchUi()
      ? 'sarah at register — stand on glow · TALK'
      : 'sarah at register — stand on glow · [Z]';
    window.StorePause?.onSarahReady?.();
    if (onReturnReady) onReturnReady();
  }

  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function isTouchUi() {
    return typeof document !== 'undefined'
      && (document.body?.classList?.contains('touch-ui')
        || window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches);
  }

  function interactKeys() {
    return isTouchUi()
      ? { act: 'TALK', stop: 'STOP' }
      : { act: 'Z', stop: 'X' };
  }

  function onPadHintLabel(kind) {
    if (isTouchUi()) return 'TALK';
    if (kind === 'vinyl') return '[Z] spin';
    if (kind === 'examine') return '[Z] look';
    if (kind === 'register') return '[Z] sarah';
    if (kind === 'bird') return '[Z] bird';
    return '[Z] talk';
  }

  function buildInteractHintUI() {
    const target = resolveInteractTarget();
    const touchUi = isTouchUi();
    const keys = interactKeys();
    const walkSub = touchUi
      ? 'Tap floor to walk · tap yourself or TALK'
      : 'Stand on colored tile · Z or click';
    if (birdForInteract()) {
      return {
        visible: true,
        key: keys.act,
        action: 'Help',
        target: 'the bird',
        sub: touchUi ? 'Stand beside the bird · TALK to help' : 'Stand beside the bird · Z to help',
      };
    }
    if (target?.type === 'vinyl') {
      const vinyl = target.vinyl;
      const title = window.VinylAudio?.TRACKS?.[vinyl.id]?.title || vinyl.id;
      if (listeningId === vinyl.id) {
        return {
          visible: true,
          key: keys.stop,
          action: 'Stop',
          target: title,
          sub: touchUi ? '♫ now playing · STOP or TALK also stops' : '♫ now playing · Z also stops',
        };
      }
      return { visible: true, key: keys.act, action: 'Spin', target: title, sub: walkSub };
    }
    if (target?.type === 'npc') {
      const npcLabel = target.npc.isPasserby
        ? capitalize(target.npc.label || 'visitor')
        : capitalize(target.npc.label);
      return {
        visible: true,
        key: keys.act,
        action: 'Talk to',
        target: npcLabel,
        sub: target.npc.isPasserby ? `${walkSub} · visitors drift through the door` : walkSub,
      };
    }
    if (listeningId) {
      return {
        visible: true,
        key: keys.stop,
        action: 'Stop',
        target: listeningTitle,
        sub: '♫ now playing',
      };
    }
    if (target?.type === 'examine') {
      return {
        visible: true,
        key: keys.act,
        action: 'Examine',
        target: target.spot.short,
        sub: walkSub,
      };
    }
    const spot = target?.type === 'secret' ? target.spot : getSecretSpot();
    const eggHint = window.EasterEggs?.getSpotHint?.(spot);
    if (eggHint) {
      return {
        visible: true,
        key: keys.act,
        action: 'Look closer',
        target: null,
        sub: eggHint.replace(/^\[Z\]\s*/i, ''),
      };
    }
    if (aftermath && target?.type === 'npc') {
      const tierHints = {
        wings: { target: 'Sarah', sub: 'Mutuals remember your wings' },
        groove: { target: 'the counter', sub: 'Spin again when ready' },
        tasty: { target: 'the shelves', sub: 'Still hungry — that is okay' },
        static: { target: 'the store', sub: 'Try again when ready' },
      };
      const h = tierHints[aftermath.tier] || { target: 'someone nearby', sub: 'Talk or spin vinyl' };
      return { visible: true, key: keys.act, action: 'Talk to', target: h.target, sub: h.sub };
    }
    if (target) {
      return { visible: true, key: keys.act, action: 'Interact', target: null, sub: walkSub };
    }
    if (!vinylPreviewed) {
      return {
        visible: true,
        key: null,
        action: 'Walk',
        target: null,
        sub: touchUi
          ? 'Tap floor to walk · colored tiles = interact'
          : 'tap floor or arrows/WASD to walk · colored tiles = interact',
      };
    }
    return {
      visible: true,
      key: null,
      action: 'Walk',
      target: null,
      sub: touchUi
        ? 'Colored tiles = interact · ☰ opens journal'
        : 'Colored tiles = interact · Esc opens journal',
    };
  }

  function updateHint() {
    const ui = buildInteractHintUI();
    interactHint = ui.key
      ? `${ui.key} ${ui.action}${ui.target ? ` · ${ui.target}` : ''}`
      : `${ui.action}${ui.sub ? ` · ${ui.sub}` : ''}`;
    onInteractHint?.(ui);
  }

  function setPaused(v) {
    paused = !!v;
  }

  function isPaused() {
    return paused;
  }

  function handleKey(code, opts = {}) {
    if (!active) return false;
    if (paused) return code === 'Escape';
    if (code === 'Period' || code === 'NumpadDecimal') {
      if (!opts.repeat) waitTurn();
      return true;
    }
    if (MOVE_KEY_MAP[code]) {
      clearAutoWalk();
      heldMoveCodes.add(code);
      if (!opts.repeat) {
        const [dx, dy, dir, diag] = MOVE_KEY_MAP[code];
        if (tryMove(dx, dy, dir, !!diag)) lastMoveStepAt = Date.now();
      }
      return true;
    }
    if (code === 'KeyX') {
      if (listeningId) { stopVinyl(); updateHint(); return true; }
      return false;
    }
    if (code === 'KeyZ' || code === 'Enter' || code === 'Space') {
      const acted = checkInteract();
      if (!acted) {
        nudgeTowardInteract();
        updateHint();
      }
      return true;
    }
    return false;
  }

  function handleKeyUp(code) {
    if (code) heldMoveCodes.delete(code);
  }

  function validateEntityPlacements() {
    const issues = [];
    if (!gridWalkable(player.x, player.y, false)) {
      issues.push(`player@${player.x},${player.y}`);
    }
    for (const n of npcs) {
      if (n.hidden) continue;
      const t = entTile(n);
      if (!gridWalkable(t.x, t.y, !!n.isPasserby)) issues.push(`${n.id}@${t.x},${t.y}`);
    }
    if (issues.length && typeof console !== 'undefined') {
      console.warn('[overworld] entity on blocked tile:', issues.join(', '));
    }
  }

  function start(el, callbacks = {}) {
    if (active) stop();
    canvas = el;
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    active = true;
    worldAut = 0;
    worldTurn = 0;
    aftermath = callbacks.aftermath || null;
    vinylPreviewed = false;
    sarahReadyToasted = false;
    if (!aftermath && !callbacks.freshFinds) {
      const priorVinyls = window.GameProgress?.getState?.()?.vinyls?.length || 0;
      if (priorVinyls > 0) vinylPreviewed = true;
      if (priorVinyls > 0 && window.GameProgress?.getState?.()?.npcs?.length >= 3) {
        sarahReadyToasted = true;
      }
    }
    posterSparkleUntil = 0;
    echoRippleUntil = 0;
    examinedIds = new Set();
    if (callbacks.freshFinds) {
      window.GameProgress?.resetFindQuest?.();
      findCounts = { orph: 0, simon: 0, honey: 0 };
    } else {
      findCounts = { ...window.GameProgress?.getFindCounts?.() };
    }
    findCompleteToasted = new Set();
    if (window.GameProgress?.isFindQuestComplete?.()) {
      findCompleteToasted.add('all');
      for (const id of ['orph', 'simon', 'honey']) {
        if (findCounts[id] >= 3) findCompleteToasted.add(id);
      }
    }
    talked = new Set();
    listeningId = null;
    listeningTitle = null;
    flavorToastUntil = 0;
    flavorToastId = null;
    counterFlashUntil = 0;
    lastHiVinylId = null;
    player = { x: 14, y: 13, dir: 'up', bob: 0, moving: false };
    storeDoorOpen = false;
    bootstrapMotion(player);
    npcs = NPC_DEFS.map((n) => {
      const ent = {
        ...n,
        state: 'idle',
        idleUntil: Date.now() + 4500 + Math.random() * 8000,
        moving: false,
        dir: 'down',
        path: null,
        pathIdx: 0,
      };
      bootstrapMotion(ent);
      return ent;
    });
    nextPasserSpawn = Date.now() + 18000 + Math.random() * 24000;

    if (aftermath) {
      talked = new Set(['orph', 'simon', 'honey']);
      const sarah = npcs.find((n) => n.id === 'ninjawhee_return');
      if (sarah) sarah.hidden = false;
      player = { x: 9, y: 7, dir: 'up', bob: 0, moving: false };
      bootstrapMotion(player);
      counterFlashUntil = Date.now() + 2800;
      if (aftermath.tier === 'wings') counterFlashUntil = Date.now() + 4500;
      const tierVibes = {
        wings: 'WINGS · you left with wings in the glass',
        groove: 'GROOVE · honest timing remembered',
        tasty: 'TASTY · still hungry — that is okay',
        static: 'STATIC · we still ate some sounds together',
      };
      aftermathToastText = tierVibes[aftermath.tier] || 'the store remembers your run';
      aftermathToastUntil = Date.now() + 4200;
      if (aftermath.tier === 'static') {
        aftermathToastText = 'STATIC · the door stays open';
      }
    } else {
      aftermathToastUntil = 0;
      aftermathToastText = null;
    }

    bird = null;
    birdEncounterDone = false;
    if (birdSpawnTimer) {
      clearTimeout(birdSpawnTimer);
      birdSpawnTimer = null;
    }

    onTalkNPC = callbacks.onTalkNPC;
    onTalkBird = callbacks.onTalkBird;
    onBirdGuide = callbacks.onBirdGuide;
    onReturnReady = callbacks.onReturnReady;
    onAftermathEnter = callbacks.onAftermathEnter;
    onListenVinyl = callbacks.onListenVinyl;
    onSecretInteract = callbacks.onSecretInteract;
    onInteractHint = callbacks.onInteractHint;
    paused = false;
    if (aftermath && onAftermathEnter) onAftermathEnter(aftermath.tier);
    secretToastUntil = 0;
    secretToastText = null;
    validateEntityPlacements();
    syncSarahVisibility();
    updateHint();
    heldMoveCodes.clear();
    lastMoveStepAt = 0;
    clearAutoWalk();
    if (!aftermath && !welcomeToastShown) {
      welcomeToastShown = true;
      setTimeout(() => {
        if (active) {
          const touchMsg = isTouchUi()
            ? 'gold pads = spin vinyl · echoes feed rhythm · mutuals · ☰ journal'
            : 'gold pads = spin vinyl · echoes feed rhythm · Z interact · Esc journal';
          showSecretToast(touchMsg, isTouchUi() ? 2800 : 4500);
        }
      }, 900);
    }
    render();
  }

  function getNpcById(id) {
    return npcs.find((n) => n.id === id) || null;
  }

  function stop() {
    active = false;
    paused = false;
    clearAutoWalk();
    if (birdSpawnTimer) {
      clearTimeout(birdSpawnTimer);
      birdSpawnTimer = null;
    }
    bird = null;
    clearVinylToastTimers();
    stopVinyl();
  }

  function isBirdPresent() {
    return !!bird && bird.phase === 'perched';
  }

  function resize() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  function getVinylPositions() {
    return VINYL_PICKUPS.map((v) => ({ id: v.id, interactX: v.interactX, interactY: v.interactY }));
  }

  function isAftermath() { return !!aftermath; }
  function getAftermath() { return aftermath ? { ...aftermath } : null; }

  function triggerEchoRipple() {
    echoRippleUntil = Date.now() + 900;
  }

  function getExploreSnapshot() {
    return {
      talked: [...talked],
      examined: [...examinedIds],
      vinylPreviewed,
      findCounts: { ...findCounts },
      mutualsComplete: mutualsComplete(),
      sarahTalked: talked.has('ninjawhee_return'),
      listeningId,
    };
  }

  return {
    start, stop, handleKey, handleKeyUp, handleTap, handleTouchDir, handleTouchDirEnd,
    resize, talked, clearListening,
    getVinylPositions, vinylForInteract, VINYL_PICKUPS,
    isAftermath, getAftermath, showSecretToast, triggerEchoRipple,
    resolveBirdEncounter, isBirdPresent, scheduleBirdEncounter, spawnBirdEncounter,
    getLastPreviewVinyl: () => lastPreviewVinylId,
    getFindCounts: () => ({ ...findCounts }),
    getNpcById, setPaused, isPaused, isListening, buildInteractHintUI, playerGridPos, mutualsComplete,
    getExploreSnapshot,
    MUTUAL_FIND_WORDS,
    EXAMINE_SPOTS,
    ROOM_AISLES,
  };
})();