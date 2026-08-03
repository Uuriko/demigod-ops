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
      pickup: { examine: 'demo_deck', chance: 1, firstOnly: true },
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
      pickup: { examine: 'listening_rug', chance: 1, firstOnly: true },
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
      pickup: { examine: 'mirror_scratch', chance: 1, firstOnly: true },
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
      pickup: { examine: 'neon_hum', chance: 1, firstOnly: true },
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
      pickup: { examine: 'lamp_dust', chance: 1, firstOnly: true },
      useAt: ['lamp_dust'],
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
      useAt: ['neon_hum'],
      useText: 'Feather toward the open door — gentle exit.',
      onUse() {
        return {
          toast: 'gentlest groove is an exit.... music was the door.',
          journal: { title: 'Feather at the door', body: 'Sometimes wings need a hum, not a cage.' },
        };
      },
    },
    visitor_card: {
      name: 'crumpled visitor note',
      icon: '✎',
      color: '#8a7a9a',
      desc: 'A stranger left a vinyl tip on the back.',
      kind: 'tool',
      pickup: { talkPasserbyHint: true, chance: 0.55 },
      useAt: null,
      useText: 'Read the stranger\'s vinyl tip again.',
      onUse() {
        return {
          toast: 'moon window · groove glow · room listens back....',
          journal: { title: 'Visitor tip', body: 'Press Z when the groove glows. The room listens back.' },
        };
      },
    },
    echo_ticket: {
      name: 'echo ticket stub',
      icon: '♪',
      color: '#c45c7a',
      desc: 'Receipt from a vinyl preview — richer rhythm bites.',
      kind: 'keepsake',
      pickup: { vinylFirst: true, chance: 1 },
      useAt: null,
      useText: 'Fold the stub — remember the echo.',
      onUse() {
        return {
          toast: 'echo orbs stack toward a deeper needle bite....',
          journal: { title: 'Echo stub', body: 'Each preview becomes an orb. The rhythm remembers the store.' },
        };
      },
    },
    rain_corner: {
      name: 'rain poster corner',
      icon: '▼',
      color: '#6a8f9a',
      desc: 'Paper remembers rain. Not performative. True.',
      kind: 'keepsake',
      pickup: { examine: 'storm_poster', chance: 1, firstOnly: true },
      useAt: ['storm_spine'],
      useText: 'Match corner to green storm spine.',
      onUse() {
        return {
          toast: 'beauty beside cruelty — the spine and poster agree.',
          journal: { title: 'Rain corner matched', body: 'Orph reads liner notes like prayers. This corner is one.' },
        };
      },
    },
  };

  function roll(chance) {
    return Math.random() < (chance ?? 1);
  }

  function addItem(id) {
    if (!ITEMS[id]) return false;
    return window.GameProgress?.addInventoryItem?.(id) ?? false;
  }

  function hasItem(id) {
    return window.GameProgress?.hasInventoryItem?.(id) ?? false;
  }

  function nearExamineSpot() {
    const ow = window.JazzStoreOverworld;
    if (!ow?.EXAMINE_SPOTS) return null;
    const pg = ow.playerGridPos?.() || { x: 10, y: 10 };
    let best = null;
    let bestD = 3;
    for (const s of ow.EXAMINE_SPOTS) {
      const d = Math.max(Math.abs(s.x - pg.x), Math.abs(s.y - pg.y));
      if (d <= 2 && d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  function getUseContext() {
    const spot = nearExamineSpot();
    const secret = window.JazzStoreOverworld?.getSecretSpot?.();
    return { examineId: spot?.id || null, secret, spot };
  }

  function tryPickupFromExamine(examineId, first) {
    const results = [];
    for (const [id, def] of Object.entries(ITEMS)) {
      const p = def.pickup;
      if (!p?.examine || p.examine !== examineId) continue;
      if (p.firstOnly && !first) continue;
      if (hasItem(id)) continue;
      if (!roll(p.chance)) continue;
      if (addItem(id)) {
        results.push(id);
        window.StorePause?.onItemPickup?.(id, def);
        window.StoreEvents?.checkSideQuests?.();
        window.__eatItemPickupBlip?.();
      }
    }
    return results;
  }

  function tryPickupFromTalk(npc) {
    const results = [];
    if (!npc?.isPasserby) return results;
    for (const [id, def] of Object.entries(ITEMS)) {
      if (!def.pickup?.talkPasserbyHint || !npc.hasHint) continue;
      if (hasItem(id)) continue;
      if (!roll(def.pickup.chance)) continue;
      if (addItem(id)) {
        results.push(id);
        window.StorePause?.onItemPickup?.(id, def);
        window.StoreEvents?.checkSideQuests?.();
        window.__eatItemPickupBlip?.();
      }
    }
    return results;
  }

  function tryPickupFromVinyl(vinylId, first) {
    if (!first) return [];
    const results = [];
    for (const [id, def] of Object.entries(ITEMS)) {
      if (!def.pickup?.vinylFirst) continue;
      if (hasItem(id)) continue;
      if (!roll(def.pickup.chance)) continue;
      if (addItem(id)) {
        results.push(id);
        window.StorePause?.onItemPickup?.(id, def);
        window.StoreEvents?.checkSideQuests?.();
        window.__eatItemPickupBlip?.();
      }
    }
    return results;
  }

  function tryPickupFromEvent(eventId) {
    const results = [];
    for (const [id, def] of Object.entries(ITEMS)) {
      if (def.pickup?.event !== eventId) continue;
      if (hasItem(id)) continue;
      if (!roll(def.pickup.chance)) continue;
      if (addItem(id)) {
        results.push(id);
        window.StorePause?.onItemPickup?.(id, def);
        window.StoreEvents?.checkSideQuests?.();
        window.__eatItemPickupBlip?.();
      }
    }
    return results;
  }

  function canUseItem(id) {
    const def = ITEMS[id];
    if (!def?.onUse) return false;
    if (!hasItem(id)) return false;
    if (def.useAt == null) return true;
    const ctx = getUseContext();
    return def.useAt.includes(ctx.examineId);
  }

  function useItem(id) {
    const def = ITEMS[id];
    if (!def?.onUse || !hasItem(id)) return null;
    const ctx = getUseContext();
    if (def.useAt && ctx.examineId && !def.useAt.includes(ctx.examineId)) {
      return { error: `Need to be near: ${def.useAt.join(' or ')}` };
    }
    const result = def.onUse(ctx.examineId, ctx);
    if (result?.toast) {
      window.JazzStoreOverworld?.showSecretToast?.(result.toast, 3600);
      window.__eatItemPickupBlip?.();
    }
    if (result?.journal) window.StorePause?.addEntry?.(`use-${id}-${ctx.examineId || 'any'}`, 'item', result.journal.title, result.journal.body);
    if (def.kind === 'tool') window.GameProgress?.removeInventoryItem?.(id);
    window.StorePause?.render?.();
    return result;
  }

  function getItemDef(id) {
    return ITEMS[id] ? { id, ...ITEMS[id] } : null;
  }

  function listOwned() {
    const ids = window.GameProgress?.getInventory?.() || [];
    return ids.map((id) => getItemDef(id)).filter(Boolean);
  }

  return {
    ITEMS,
    getItemDef,
    listOwned,
    hasItem,
    canUseItem,
    useItem,
    tryPickupFromExamine,
    tryPickupFromTalk,
    tryPickupFromVinyl,
    tryPickupFromEvent,
    getUseContext,
    nearExamineSpot,
  };
})();