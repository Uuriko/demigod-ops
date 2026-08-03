# Foot CDN v179 READY — 2026-07-12

## Uploaded
- **URL:** https://files.catbox.moe/el26dg.js  
- **Version:** v179  
- **sha256:** matches disk `demigod-foot-core.js`  
- **Footer source:** `demigod-footer-lite.html` points at el26dg.js  

## Not live yet
www still loads `8tjw79.js` (v176) until Webflow **Custom Code footer paste + Publish**.

## Paste pack
`/tmp/READY/`
- `footer-custom-code.html` — full footer lite  
- `head-custom-code.html` — head minimal  
- `README.md` — steps  

## Includes
- Hero scannable copy + gold mobile bar  
- How matching works link + FAQ + https://files.catbox.moe/i61ega.html  
- 90-day placeholder clarity  
- Deep links `?wiz=startup` / `?wiz=engineer`  
- Soft 90-day fee language in core  

## After publish
```bash
curl -sS https://www.trydemigod.com/ | grep -o 'files.catbox.moe/[a-z0-9]*\.js'
curl -sS https://files.catbox.moe/el26dg.js | grep dgFootVersion
bin/dg-hygiene
```
