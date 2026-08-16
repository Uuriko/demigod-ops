import assert from 'node:assert/strict';
import {
  githubConfigured,
  githubRedirectUri,
  normalizeGithubLogin,
  githubAuthorizeUrl,
  publicGithubLink,
  githubOauthStateCookie,
  githubCookieHeader,
  GH_COOKIE,
  GH_OAUTH_COOKIE,
  DEFAULT_GH_REDIRECT,
  GH_SCOPE,
} from './dasha-lobby-github.mjs';

assert.equal(githubConfigured({}), false);
assert.equal(githubConfigured({ GITHUB_CLIENT_ID: 'id' }), false);
assert.equal(
  githubConfigured({ GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'sec', LOBBY_SESSION_SECRET: 's' }),
  true,
);

assert.equal(githubRedirectUri({}), DEFAULT_GH_REDIRECT);
assert.equal(githubRedirectUri({ GITHUB_REDIRECT_URI: 'https://lobby.getdasha.com/oauth/github/callback/' }), DEFAULT_GH_REDIRECT);

assert.equal(normalizeGithubLogin('Uuriko'), 'Uuriko');
assert.equal(normalizeGithubLogin('@dasha-desk'), 'dasha-desk');
assert.equal(normalizeGithubLogin('bad login'), null);
assert.equal(normalizeGithubLogin(''), null);

const dest = githubAuthorizeUrl({
  clientId: 'abc',
  redirectUri: DEFAULT_GH_REDIRECT,
  state: 'st',
});
assert.match(dest, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
assert.match(dest, /client_id=abc/);
assert.match(dest, /redirect_uri=https%3A%2F%2Flobby\.getdasha\.com%2Foauth%2Fgithub%2Fcallback/);
assert.match(dest, new RegExp(`scope=${encodeURIComponent(GH_SCOPE)}`));
assert.match(dest, /state=st/);

assert.equal(publicGithubLink(null), null);
assert.deepEqual(publicGithubLink({ login: 'Uuriko' }), {
  login: 'Uuriko',
  handle: 'Uuriko',
  href: 'https://github.com/Uuriko',
  avatar: 'https://github.com/Uuriko.png?size=80',
});

assert.match(githubOauthStateCookie('tok'), new RegExp(`^${GH_OAUTH_COOKIE}=tok;`));
assert.match(githubCookieHeader('sess'), new RegExp(`^${GH_COOKIE}=sess;`));
assert.match(githubCookieHeader('', { clear: true }), /Max-Age=0/);

console.log('dasha-lobby-github.test.mjs ok');
