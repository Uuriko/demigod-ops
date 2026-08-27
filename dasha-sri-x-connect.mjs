/**
 * Live x-connect.js (2026-08-27) is 8749 bytes:
 * sha384-P+GWjU8raxzhHMCZ1bUqltsuNcVs17yd3qy7fpQGPl2hKiE1yHGK3s/jQQJoRjD6
 *
 * Home already pins that digest. Worker-owned /lobby, /chess, and /faucet still
 * pin older hashes, so browsers refuse the script. Rewrite stale pins to the
 * bytes currently served at lobby.getdasha.com/client/x-connect.js.
 */
export const LIVE_X_CONNECT_SRI =
  'sha384-P+GWjU8raxzhHMCZ1bUqltsuNcVs17yd3qy7fpQGPl2hKiE1yHGK3s/jQQJoRjD6';

export const STALE_X_CONNECT_SRI = [
  'sha384-TfilU2+Ahqd0cJ9tlKgZ5XzZfD5E830sS1TVyvNdZNsxFq0OjopktBKS8rH40Nze',
  'sha384-pF9pJa2E4m1ec3sbkjve5zpRsWdDNj6/rTNDT+KrPBM3Z3AaciDDfANfMfmqzbjY',
];

export function pinLiveXConnectSri(html) {
  let page = String(html || '');
  for (const stale of STALE_X_CONNECT_SRI) {
    if (!stale || stale === LIVE_X_CONNECT_SRI) continue;
    page = page.split(stale).join(LIVE_X_CONNECT_SRI);
  }
  return page;
}
