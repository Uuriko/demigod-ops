import assert from 'node:assert/strict';
import { LIVE_X_CONNECT_SRI, STALE_X_CONNECT_SRI, pinLiveXConnectSri } from './dasha-sri-x-connect.mjs';

const lobby = `<script src="https://lobby.getdasha.com/client/x-connect.js" integrity="${STALE_X_CONNECT_SRI[0]}" crossorigin="anonymous" defer></script>`;
const home = `<script src="https://lobby.getdasha.com/client/x-connect.js" integrity="${LIVE_X_CONNECT_SRI}" crossorigin="anonymous" defer></script>`;
const olderHome = `<script src="https://lobby.getdasha.com/client/x-connect.js" integrity="${STALE_X_CONNECT_SRI[1]}" crossorigin="anonymous" defer></script>`;

const pinnedLobby = pinLiveXConnectSri(lobby);
assert.match(pinnedLobby, new RegExp(LIVE_X_CONNECT_SRI.replace(/[+]/g, '\\+')));
assert.doesNotMatch(pinnedLobby, /TfilU2/);
assert.equal(pinLiveXConnectSri(home), home);
assert.match(pinLiveXConnectSri(olderHome), new RegExp(LIVE_X_CONNECT_SRI.replace(/[+]/g, '\\+')));
assert.equal(pinLiveXConnectSri(''), '');
assert.equal(pinLiveXConnectSri(pinnedLobby), pinnedLobby);

console.log('dasha-sri-x-connect: PASS');
