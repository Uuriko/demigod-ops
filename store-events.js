// Optional ambient store events · side flourishes — never gate main quest
window.StoreEvents = (function () {
  const COOLDOWN_MS = 24000;
  const TICK_MS = 9000;

  const AMBIENT = [
    {
      id: 'evt-trumpet',
      chance: 0.11,
      toast: 'distant trumpet on wet pavement.... the door stays open',
      journal: { title: 'Street brass', body: 'Someone practiced outside. The store held breath anyway.' },
    },
    {
      id: 'evt-lamp',
      chance: 0.14,
      toast: 'lamp gold flickers — slow note caught in dust',
      journal: { title: 'Lamp pulse', body: 'Motes hang still. Nobody performing.' },
    },
    {
      id: 'evt-crate',
      chance: 0.1,
      toast: 'crate stack settles with a soft wood sigh',
      journal: { title: 'Wood whisper', body: 'Pre-loved spines lean like patient listeners.' },
    },
    {
      id: 'evt-neon',
      chance: 0.12,
      toast: 'neon SOUL bleeds gold into the sidewalk',
      journal: { title: 'Neon bleed', body: 'Visitors warm their hands. That is enough.' },
    },
    {
      id: 'evt-turntable',
      chance: 0.09,
      toast: 'demo deck motor ticks — heartbeat in the dust',
      journal: { title: 'Motor tick', body: 'Hi-fi corner remembers whole sides.' },
    },
    {
      id: 'evt-rug',
      chance: 0.08,
      toast: 'listening rug fibers hum one quiet beat',
      journal: { title: 'Rug hum', body: 'Pink energy without an audience.' },
    },
  ];

  const PASSERBY_ENTER = [
    'door hush — someone drifts in to warm their hands',
    'street air meets lamp gold — a visitor browses slow',
    'footsteps soften on the carpet past the stacks',
  ];

  let lastTick = 0;
  let lastEventAt = 0;
  let fired = new Set();

  function ctx() {
    return window.StorePause?.getContext?.() || {};
  }

  function tryAmbient(row) {
    if (fired.has(row.id)) return false;
    if (Math.random() > row.chance) return false;
    fired.add(row.id);
    lastEventAt = Date.now();
    window.JazzStoreOverworld?.showSecretToast?.(row.toast, 3200);
    window.StorePause?.onStoreEvent?.(row.id, row.journal);
    window.__eatAmbientBlip?.();
    return true;
  }

  function tick(now = Date.now()) {
    if (typeof document !== 'undefined') {
      if (document.body?.classList?.contains('dialogue-active')) return;
      if (document.body?.classList?.contains('rhythm-active')) return;
      if (window.StorePause?.isOpen?.()) return;
      if (!document.body?.classList?.contains('overworld-active')) return;
    }
    if (now - lastTick < TICK_MS) return;
    lastTick = now;
    if (now - lastEventAt < COOLDOWN_MS) return;

    const c = ctx();
    if (!c.vinylPreviewed && (c.talkedIds?.length || 0) < 1) return;

    for (const row of AMBIENT) {
      if (tryAmbient(row)) return;
    }
  }

  function onPasserbyEnter(npc) {
    if (!npc?.isPasserby) return;
    const line = PASSERBY_ENTER[Math.floor(Math.random() * PASSERBY_ENTER.length)];
    window.JazzStoreOverworld?.showSecretToast?.(line, 2800);
    window.StorePause?.onStoreEvent?.(`passer-${npc.variant}`, {
      title: `Visitor · ${npc.label || 'stranger'}`,
      body: npc.hasHint ? 'They might leave a vinyl tip if you talk.' : 'Just warming hands. Optional.',
    }, { quiet: true });
    window.__eatAmbientBlip?.();
  }

  function checkSideQuests() {
    const inv = window.GameProgress?.getInventory?.() || [];
    const secrets = window.GameProgress?.getSecretCount?.() || 0;
    if (inv.length >= 6 && !fired.has('side-collector')) {
      fired.add('side-collector');
      window.StorePause?.addEntry?.('side-collector', 'quest', 'Side · shelf collector',
        'Six keepsakes in your pockets. The store rewards curiosity, not completion.');
      window.JazzStoreOverworld?.showSecretToast?.('pockets full of store stories....', 3000);
    }
    if (secrets >= 4 && !fired.has('side-secrets')) {
      fired.add('side-secrets');
      window.StorePause?.addEntry?.('side-secrets', 'quest', 'Side · hidden shelf',
        'Four secrets found. The watermark is also a door.');
    }
  }

  function resetSession() {
    fired.clear();
    lastTick = 0;
    lastEventAt = 0;
  }

  return { tick, onPasserbyEnter, checkSideQuests, resetSession, AMBIENT };
})();