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

    addEntry(firstTalk ? `talk-${npc.id}-first` : `talk-${npc.id}-r-${Math.floor(Date.now() / 60000)}`, 'talk',
      firstTalk ? `Met ${NPC_NAMES[npc.id] || capName}` : `Talked · ${NPC_NAMES[npc.id] || capName}`,
      bodies[npc.id] || `${capName} had more to say about the store.`, { allowDup: !firstTalk });

    const extra = TALK_RANDOM[npc.id];
    if (extra) maybeAddEntry(`talk-flavor-${npc.id}`, 'ambient', `Aftertalk · ${NPC_NAMES[npc.id] || capName}`, extra.body, extra.chance);

    if (firstTalk && ['orph', 'simon', 'honey'].includes(npc.id)) {
      const word = MUTUAL_WORDS[npc.id];
      addEntry(`quest-${npc.id}-hint`, 'quest', `Find the ${word}`,
        `${NPC_NAMES[npc.id]} left three ${word} traces on shelves and corners. Face them and press Z to examine.`);
    }
    queueThought();
  }

  function onExamine(spot, first) {
    if (!spot) return;
    noteInteraction('Examined', spot.short, first ? 'First look.' : 'Looked again.');

    const line = first ? spot.lines?.join(' ') : (spot.again || spot.lines?.slice(-1)[0]);
    addEntry(first ? `examine-${spot.id}` : `examine-${spot.id}-r-${Math.floor(Date.now() / 45000)}`, 'observe',
      first ? `Examined · ${spot.short}` : `Again · ${spot.short}`,
      line || 'The store held still while I looked.', { allowDup: !first });

    const flavor = EXAMINE_RANDOM[spot.id];
    if (flavor) maybeAddEntry(`examine-flavor-${spot.id}`, 'ambient', `Quietly · ${spot.short}`, flavor.body, flavor.chance);

    window.StoreItems?.tryPickupFromExamine?.(spot.id, first);

    if (first && spot.mutual) {
      const c = window.JazzStoreOverworld?.getFindCounts?.()?.[spot.mutual]
        ?? window.GameProgress?.getFindCounts?.()?.[spot.mutual] ?? 0;
      if (c > 0 && c < 3) {
        addEntry(`find-${spot.mutual}-${c}`, 'quest', `${MUTUAL_WORDS[spot.mutual]} · ${c}/3`,
          `Another trace for ${NPC_NAMES[spot.mutual] || spot.mutual}. Keep looking in their aisle.`);
      }
    }
    if (!first && Math.random() < 0.12) rollAmbient();
    queueThought();
  }

  function onFindComplete(mutual) {
    if (mutual === 'all') {
      addEntry('find-all', 'event', 'Every mutual trace found', 'The store feels thicker — like everyone noticed I noticed.');
      return;
    }
    const word = MUTUAL_WORDS[mutual] || 'clue';
    addEntry(`find-done-${mutual}`, 'quest', `${word} trail complete`,
      `All three ${word} traces found. ${NPC_NAMES[mutual] || mutual} would smile.`);
    queueThought();
  }

  function onVinyl(vinylId, first) {
    const title = VINYL_NAMES[vinylId] || vinylId;
    noteInteraction('Spun', title, first ? 'Needle down — room breathes.' : 'Still humming.');
    addEntry(first ? `vinyl-${vinylId}-first` : `vinyl-${vinylId}-r-${Math.floor(Date.now() / 40000)}`, first ? 'event' : 'observe',
      first ? `Spun ${title}` : `Listening · ${title}`,
      first ? 'This preview becomes an echo for richer rhythm slices.' : 'Groove still in the floor.', { allowDup: !first });
    if (first && !hasEntry('quest-echo')) {
      addEntry('quest-echo', 'quest', 'Echo the store',
        'Every vinyl preview seeds echo orbs — richer slices when Sarah drops the needle. Listen before you eat.');
    }
    window.StoreItems?.tryPickupFromVinyl?.(vinylId, first);
    if (first) maybeAddEntry(`vinyl-flavor-${vinylId}`, 'ambient', `After ${title}`, 'That one always made her smile — Sarah hums in memory.', 0.4);
    if (first) queueThought();
  }

  function onSarahReady() {
    addEntry('sarah-ready', 'event', 'Register glow',
      'Sarah is at the counter when I am ready. Talk to the mutuals and spin vinyl first — echoes help.');
    queueThought();
  }

  function onBird(phase) {
    if (phase === 'arrive') {
      addEntry('bird-arrive', 'event', 'A bird in the door', 'Something fluttered in from the street. It perched near the top shelf.');
      noteInteraction('Saw', 'the bird', 'Fluttered through the open door.');
    } else if (phase === 'helped') {
      addEntry('bird-helped', 'event', 'Bird guided', 'I helped the little visitor. Even the store has wings sometimes.');
      window.StoreItems?.tryPickupFromEvent?.('bird_helped');
    }
    queueThought();
  }

  function onSecret(id, quote) {
    addEntry(`secret-${id}`, 'observe', 'Secret · ∴', quote || 'A hidden corner whispered.');
    noteInteraction('Found secret', id, quote || '∴');
  }

  function onItemPickup(id, def) {
    const d = def || window.StoreItems?.getItemDef?.(id);
    if (!d) return;
    addEntry(`item-${id}`, 'item', `Picked up · ${d.name}`, d.desc);
    noteInteraction('Collected', d.name, 'Stashed in inventory (Esc).');
  }

  function onToast(text) {
    if (!text || text.length < 8) return;
    maybeAddEntry(`toast-${Math.floor(Date.now() / 120000)}`, 'noted', 'Overheard', text.slice(0, 140), 0.35);
  }

  function queueThought() { lastThoughtAt = 0; }

  function pickThought(ctx) {
    const talked = ctx.talkedIds || [];
    const fc = ctx.findCounts || {};
    const met = talked.filter((id) => ['orph', 'simon', 'honey'].includes(id)).length;
    const vinylN = ctx.vinyls?.length || 0;
    const inv = ctx.inventory?.length || 0;

    if (ctx.aftermath) return { key: 'aftermath', title: 'Still humming', body: 'Sarah remembers the run. Spin again or listen to the floor.' };
    if (inv >= 3 && !hasEntry('thought-items')) return { key: 'items', title: 'Pockets full', body: 'Inventory has tools — try using them near examine spots (Esc → inventory).' };
    if (vinylN === 0) return { key: 'spin-vinyl', title: 'Next', body: 'Stand on a colored floor pad and spin vinyl — Sarah appears at the register.' };
    if (met === 0) return { key: 'meet-mutuals', title: 'Next', body: 'Purple Orph · green Simon · pink Honey — say hello in each aisle.' };
    const needFind = ['orph', 'simon', 'honey'].find((id) => (fc[id] || 0) < 3 && talked.includes(id));
    if (needFind) {
      const w = MUTUAL_WORDS[needFind];
      return { key: `find-${needFind}-${fc[needFind]}`, title: 'Looking', body: `Find ${w} ${fc[needFind] || 0}/3 near ${NPC_NAMES[needFind]}'s aisle.` };
    }
    if (vinylN > 0 && !talked.includes('ninjawhee_return') && met < 3) {
      return { key: 'sarah-wait', title: 'Register', body: 'Sarah is at the counter — meet all three mutuals, then talk to her.' };
    }
    if (met >= 3 && !talked.includes('ninjawhee_return') && vinylN > 0) {
      return { key: 'sarah-soon', title: 'Ready', body: 'Register glows — stand on Sarah\'s tile and talk.' };
    }
    if (talked.includes('ninjawhee_return')) return { key: 'sarah-chat', title: 'Ready', body: 'Sarah waits. When the album feels whole, the needle does too.' };
    if (ctx.echoOrbs >= 2) return { key: 'echo-rich', title: 'Echoes gathering', body: `${ctx.echoOrbs} orbs — rhythm slices bite deeper.` };
    return { key: 'wander', title: 'Wandering', body: 'Lamp gold, worn wood, neon hum — breathe with the store.' };
  }

  function maybeThought(force = false) {
    const now = Date.now();
    if (!force && now - lastThoughtAt < 75000) return;
    const ctx = getContext();
    const thought = pickThought(ctx);
    if (!thought) return;
    const id = `thought-${thought.key}`;
    if (hasEntry(id)) { lastThoughtAt = now; lastThoughtKey = thought.key; return; }
    addEntry(id, 'thought', thought.title, thought.body);
    lastThoughtAt = now;
    lastThoughtKey = thought.key;
    if (Math.random() < 0.35) rollAmbient();
  }

  function buildStatusCards(ctx) {
    const gp = window.GameProgress;
    return [
      { label: 'Album', value: `${ctx.albumPct}%`, accent: '#c45c7a' },
      { label: 'Echo orbs', value: `${ctx.echoOrbs}`, accent: '#7b5ea7' },
      { label: 'Resonance', value: `${Math.round(ctx.resonance)}%`, accent: '#c9a84c' },
      { label: 'Secrets', value: `${ctx.secrets.length}`, accent: '#4a8f7a' },
      { label: 'Items', value: `${ctx.inventory.length}`, accent: '#e8c88c' },
      { label: 'Chill', value: gp?.isChill?.() ? 'on ♪' : 'off', accent: '#8a7a9a' },
    ];
  }

  function buildFindRows(ctx) {
    return ['orph', 'simon', 'honey'].map((id) => {
      const met = ctx.talkedIds.includes(id) || ctx.npcsMet.includes(id);
      const n = ctx.findCounts[id] || 0;
      return { id, label: NPC_NAMES[id], word: MUTUAL_WORDS[id], n, met };
    });
  }

  function buildMainQuestSteps(ctx) {
    const talked = ctx.talkedIds || [];
    const metMutuals = ['orph', 'simon', 'honey'].filter((id) => talked.includes(id)).length;
    const vinylN = ctx.vinyls?.length || 0;
    const echoOrbs = ctx.echoOrbs || 0;
    const sarahMet = talked.includes('ninjawhee_return');
    const albumPct = ctx.albumPct || 0;
    const done = !!ctx.aftermath || albumPct >= 100;

    return [
      { id: 'enter', label: 'Step inside the store', done: sessionStarted },
      { id: 'vinyl', label: 'Spin vinyl · Sarah appears', done: vinylN >= 1, hint: vinylN ? `${vinylN} pad${vinylN > 1 ? 's' : ''}` : 'colored tiles' },
      { id: 'mutuals', label: 'Say hello · Orph, Simon, Honey', done: metMutuals >= 3, hint: metMutuals ? `${metMutuals}/3` : 'three aisles' },
      { id: 'echo', label: 'Grow echo orbs (optional)', done: echoOrbs >= 2, hint: `${echoOrbs} orb${echoOrbs === 1 ? '' : 's'}` },
      { id: 'sarah', label: 'Talk to Sarah · start the bite', done: sarahMet, hint: sarahMet ? 'done' : (vinylN < 1 ? 'spin vinyl first' : 'register') },
      { id: 'bite', label: 'Eat the rhythm · mirror choice', done, hint: done ? 'complete' : `${albumPct}% album` },
    ];
  }

  function buildSideQuestRows(ctx) {
    const fc = ctx.findCounts || {};
    const findTotal = (fc.orph || 0) + (fc.simon || 0) + (fc.honey || 0);
    const inv = ctx.inventory?.length || 0;
    const secrets = ctx.secrets?.length || 0;
    return [
      { label: 'Mutual traces', value: `${findTotal}/9`, done: findTotal >= 9, optional: true },
      { label: 'Shelf keepsakes', value: `${inv}`, done: inv >= 6, optional: true },
      { label: 'Hidden ∴', value: `${secrets}`, done: secrets >= 4, optional: true },
    ];
  }

  function onStoreEvent(id, journal, opts = {}) {
    if (!journal?.title) return;
    if (opts.quiet && hasEntry(id)) return;
    addEntry(id, 'ambient', journal.title, journal.body);
  }

  function renderQuestStrip() {
    const ctx = getContext();
    const mainSteps = buildMainQuestSteps(ctx);
    const current = mainSteps.find((s) => !s.done);
    const sideRows = buildSideQuestRows(ctx);
    return `
      <div class="inv-quest-track journal-quest-track">
        <h4 class="inv-section-title">Where to go next</h4>
        <ol class="inv-quest-steps main-quest-steps">
          ${mainSteps.map((s) => `
            <li class="inv-quest-step${s.done ? ' done' : ''}${current?.id === s.id ? ' current' : ''}">
              <span class="inv-quest-dot">${s.done ? '✓' : '○'}</span>
              <span class="inv-quest-label">${s.label}</span>
              ${s.hint ? `<span class="inv-quest-hint">${s.hint}</span>` : ''}
            </li>
          `).join('')}
        </ol>
        <p class="journal-side-hint">Side paths (optional): ${sideRows.map((s) => `${s.label} ${s.value}`).join(' · ')}</p>
      </div>
    `;
  }

  function renderJournal() {
    if (!journalEl) return;
    const questStrip = renderQuestStrip();
    if (!entries.length) {
      journalEl.innerHTML = `${questStrip}<p class="pause-empty">Walk the floor — your log fills as you explore.</p>`;
      return;
    }
    journalEl.innerHTML = `${questStrip}${entries.map((e) => `
      <article class="journal-entry journal-${e.type}${e.pin ? ' pinned' : ''}">
        <div class="journal-accent"></div>
        <div class="journal-body">
          <header>
            <span class="journal-type">${TYPE_LABELS[e.type] || e.type}</span>
            <time>${formatTime(e.at)}</time>
          </header>
          <h3>${e.title}</h3>
          <p>${e.body}</p>
        </div>
      </article>
    `).join('')}`;
  }

  function renderInventory() {
    if (!inventoryEl) return;
    const ctx = getContext();
    const owned = window.StoreItems?.listOwned?.() || [];
    const cards = buildStatusCards(ctx);
    const finds = buildFindRows(ctx);
    const mainSteps = buildMainQuestSteps(ctx);
    const sideRows = buildSideQuestRows(ctx);

    const questHtml = `
      <div class="inv-quest-track">
        <h4 class="inv-section-title">Main path · whole album home</h4>
        <ol class="inv-quest-steps">
          ${mainSteps.map((s) => `
            <li class="inv-quest-step${s.done ? ' done' : ''}${!s.done && mainSteps.find((x) => !x.done)?.id === s.id ? ' current' : ''}">
              <span class="inv-quest-dot">${s.done ? '✓' : '○'}</span>
              <span class="inv-quest-label">${s.label}</span>
              ${s.hint ? `<span class="inv-quest-hint">${s.hint}</span>` : ''}
            </li>
          `).join('')}
        </ol>
        <div class="inv-side-row">
          ${sideRows.map((s) => `
            <span class="inv-side-pill${s.done ? ' done' : ''}" title="optional">${s.label} ${s.value}</span>
          `).join('')}
        </div>
      </div>
    `;

    const statusHtml = `
      <div class="inv-status-grid">
        ${cards.map((c) => `
          <div class="inv-stat" style="--accent:${c.accent}">
            <span class="inv-stat-val">${c.value}</span>
            <span class="inv-stat-label">${c.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="inv-find-row">
        ${finds.map((f) => `
          <div class="inv-find${f.met ? '' : ' dim'}">
            <span>${f.label}</span>
            <span class="inv-find-dots">${'●'.repeat(f.n)}${'○'.repeat(3 - f.n)} ${f.word}</span>
          </div>
        `).join('')}
      </div>
      <h4 class="inv-section-title">Items · click to use near matching spots</h4>
    `;

    const itemsHtml = owned.length ? owned.map((it) => {
      const canUse = window.StoreItems?.canUseItem?.(it.id);
      const sel = selectedItemId === it.id ? ' selected' : '';
      const useCtx = window.StoreItems?.getUseContext?.();
      const near = it.useAt && useCtx?.examineId && it.useAt.includes(useCtx.examineId);
      return `
        <button type="button" class="inv-item${sel}${canUse ? ' usable' : ''}${near ? ' near' : ''}" data-item="${it.id}">
          <span class="inv-item-icon" style="color:${it.color}">${it.icon}</span>
          <span class="inv-item-info">
            <span class="inv-item-name">${it.name}</span>
            <span class="inv-item-desc">${it.desc}</span>
            ${it.useText ? `<span class="inv-item-usehint">${near ? '✓ near spot — click to use' : it.useText}</span>` : ''}
          </span>
          <span class="inv-item-kind">${it.kind}</span>
        </button>
      `;
    }).join('') : '<p class="pause-empty">Empty pockets — examine shelves and talk to visitors.</p>';

    const detail = selectedItemId && window.StoreItems?.getItemDef?.(selectedItemId);
    const actionHtml = detail ? `
      <div class="inv-action-bar">
        <button type="button" class="inv-use-btn" id="invUseBtn" ${window.StoreItems?.canUseItem?.(selectedItemId) ? '' : 'disabled'}>
          Use ${detail.name}
        </button>
        <span class="inv-action-hint">${detail.useText || ''}</span>
      </div>
    ` : '';

    inventoryEl.innerHTML = questHtml + statusHtml + `<div class="inv-items-grid">${itemsHtml}</div>` + actionHtml;

    inventoryEl.querySelectorAll('.inv-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedItemId = btn.dataset.item;
        renderInventory();
      });
    });
    document.getElementById('invUseBtn')?.addEventListener('click', () => {
      if (selectedItemId) window.StoreItems?.useItem?.(selectedItemId);
    });
  }

  function render() {
    renderJournal();
    renderInventory();
    overlayEl?.querySelectorAll('.pause-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
      const n = btn.dataset.tab === TAB.JOURNAL ? entries.length : (getContext().inventory?.length || 0);
      const badge = btn.querySelector('.pause-tab-badge');
      if (badge) badge.textContent = n > 0 ? n : '';
    });
    overlayEl?.querySelectorAll('.pause-pane').forEach((pane) => {
      pane.classList.toggle('hidden', pane.dataset.pane !== activeTab);
    });
  }

  function bindDom() {
    overlayEl = document.getElementById('pauseOverlay');
    journalEl = document.getElementById('pauseJournal');
    inventoryEl = document.getElementById('pauseInventory');
    if (!overlayEl || overlayEl.dataset.bound) return;
    overlayEl.dataset.bound = '1';
    overlayEl.querySelectorAll('.pause-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab || TAB.JOURNAL;
        render();
      });
    });
    overlayEl.addEventListener('click', (e) => {
      if (!open) return;
      const panel = overlayEl.querySelector('.pause-panel');
      if (panel?.contains(e.target)) return;
      close();
    });
  }

  function setOpen(next) {
    open = !!next;
    overlayEl?.classList.toggle('hidden', !open);
    document.body.classList.toggle('pause-active', open);
    const escHint = document.getElementById('owEscHint');
    escHint?.classList.toggle('hidden', open);
    if (open) {
      maybeThought(true);
      render();
    }
    return open;
  }

  function toggle() { return setOpen(!open); }
  function close() { return setOpen(false); }
  function isOpen() { return open; }

  function tick() {
    if (!sessionStarted || open) return;
    maybeThought(false);
  }

  function init() { load(); bindDom(); }

  load();

  return {
    init, bindDom, toggle, open: () => setOpen(true), close, isOpen, tick,
    onSessionStart, onTalk, onExamine, onFindComplete, onVinyl, onSarahReady,
    onBird, onSecret, onItemPickup, onToast, onStoreEvent, addEntry, getContext, render,
    buildMainQuestSteps, buildSideQuestRows,
  };
})();