# Dasha Studio quick-share execution prompt

You are improving the live Dasha Studio at `https://www.getdasha.com/studio`. Work from the canonical `dasha-meme-studio.html`; regenerate `dasha-studio-embed.html` and `dasha-studio-embed.js`; serve the generated client through the existing `lobby.getdasha.com/client/studio.js` Worker path; publish only through `node dasha-ship.mjs --ship`; and require exact Webflow readback plus live verification.

## Objective

Make the shortest successful session feel immediate on a phone:

1. open Studio;
2. tap a Dasha photo;
3. choose or type a line;
4. optionally tap one simple Edit control;
5. tap Share on X;
6. receive a PNG in the native share sheet where supported, or a saved PNG plus an open X composer as the reliable fallback.

The Studio should remain powerful without presenting its full power at once. Preserve formats, styles, framing, X identity, stickers, GIF export, three-size kits, copy, save, remix links, undo, local uploads, and Simp Board claims. Progressively disclose secondary controls instead of deleting capabilities users already have.

## Product and voice constraints

- Less is more. Prefer one obvious action over several explanatory controls.
- Use short ordinary labels: Photo, Line, Format, Edit, Share on X, More options.
- Do not use “remix” in visible copy, “make it weird,” “shuffle,” growth-hacking language, financial promises, or invented endorsements.
- Studio use must require no wallet and no account. X linking remains optional and must never block creation or sharing.
- Do not add AI generation, dependencies, accounts, uploads, analytics, servers, databases, or speculative customization systems.
- Preserve the exact Dasha mint and existing trust boundaries.

## Research-backed sharing behavior

- Prefer the browser-native Web Share API for a generated PNG because it can pass the actual file to installed apps on supported mobile systems.
- Before sharing a file, feature-detect with `navigator.canShare({files})`.
- Invoke `navigator.share()` only from the user’s click path so transient activation is preserved.
- Treat `AbortError` as cancellation, not failure.
- When native file sharing is unavailable, download the PNG and open an X compose intent with the caption and Studio URL. Never imply that a browser can silently attach a local file to an X post.
- Prevent double taps from starting overlapping canvas exports/share sheets.

References used for this decision:

- MDN, `Navigator.share()`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- web.dev, file sharing pattern: https://web.dev/patterns/files/share-files

## Implementation instructions

1. Audit the existing visible hierarchy before adding anything.
2. Keep the default surface bounded to photo, line, format, one Edit action, and primary share/save actions.
3. Move Look, individual Style choices, framing sliders, optional X identity, stickers, GIF, multi-size kit, and copy-link utilities into the existing More options disclosure.
4. Rename the vague “Surprise style” action to “Edit.” It should keep using the existing curated style-cycle implementation rather than creating a new generator.
5. Add lightweight local draft recovery with `localStorage`: line, selected library photo, look, format, effect, sticker, zoom, and tilt. Explicit URL/hash state always wins over the local draft. Invalid or unavailable stored values fall back safely. Local uploads are not persisted.
6. Debounce draft writes so canvas gestures and GIF rendering cannot cause excessive synchronous storage work.
7. Guard both Share buttons during export/share and always restore them after success, cancellation, or error.
8. Preserve mobile vertical scrolling when a swipe starts on the canvas (`touch-action: pan-y`) and retain mouse drag plus multi-touch pinch editing.
9. Add focused regression coverage for visible-control hierarchy, Edit behavior, local draft recovery, native PNG share payload, double-share guarding, mobile canvas scrolling, overflow, touch targets, and existing creative controls.
10. Regenerate artifacts, run focused tests, run the release gate, deploy Worker assets before Webflow, publish, wait through rate limits/CDN rollout if necessary, and perform live mobile and desktop interaction smoke tests.

## Definition of done

- A first-time mobile visitor can select a photo, set a line, tap Edit, and share without opening More options.
- Secondary controls remain available under one disclosure.
- Reloading without explicit URL state restores the last local draft.
- Native sharing receives one valid PNG `File`, caption text, and the current Studio state URL on supported browsers.
- Unsupported browsers use the honest X-intent/download fallback.
- Repeated taps cannot launch concurrent shares.
- Mobile and desktop tests have no page errors, no horizontal overflow, and no inaccessible visible targets.
- Worker and Webflow readbacks match disk, live audit is green, and direct live tests confirm the published behavior.
