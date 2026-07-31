import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('./demigod-events-app.mjs', import.meta.url), 'utf8');
const loaders = [
  fs.readFileSync(new URL('./demigod-footer-lite.html', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('./demigod-footer-loader.html', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('./demigod-foot-cdn-publish.mjs', import.meta.url), 'utf8'),
];

test('the orphan public chatroom is retired end to end', () => {
  assert.doesNotMatch(
    foot,
    /communityChatMount|dg-(?:chatroom|chat-|mud|page-mud)|\/chatroom\/(?:join|send|messages)|\n  mud: \{/,
  );
  assert.doesNotMatch(
    server,
    /\/chatroom\/(?:join|send|messages)|chatroomSessions|chatroomMessages|RESERVED_CHAT_NAMES|cleanChat(?:Name|Message)/,
  );
  for (const loader of loaders) {
    assert.doesNotMatch(loader, /p=mud|mud\|vesper\|night-district\|night/);
  }
  assert.match(server, /p === '\/api\/events-bot\/chat'/, 'private Events Bot chat remains');
});
