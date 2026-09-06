# Leftover /look /hello on live demigod-html

Live Worker (pulled 2026-09-06) already has leftover-redirect. `/look` and `/hello` are missing from `LEFTOVER_SHELLS`.

`/talent` and `/contact` are product 200s (`PRODUCT_CASEFOLD_PATHS`). Do not map those away.

Add to `LEFTOVER_SHELLS` on the **live** Worker tree (issue #121: live source is newer than every pushed branch):

```js
  "/look": "/talent",
  "/looks": "/talent",
  "/hello": "/contact",
  "/hello.json": "/contact",
```

No Designer-publish. Contact stays hello@trydemigod.com. No people-data on the public web.

Wanted:
- GET /look /looks 308 → https://www.trydemigod.com/talent (`x-demigod-edge: leftover-redirect`)
- GET /hello 308 → https://www.trydemigod.com/contact

Tracker: https://github.com/Uuriko/demigod-ops/issues/123
