# Demigod custom blog system

**SoR:** `demigod-blog-posts.json`  
**Not** Webflow CMS.

## CLI

```bash
bin/dg-blog status          # published count + drift
bin/dg-blog check           # exit 1 if foot/head out of sync
bin/dg-blog sync            # fan-out: foot DG_BLOG_POSTS + head Blog JSON-LD + deep-link slugs
bin/dg-blog new --slug=x --title="Y" [--category=Product]  # draft stub (published:false)
```

## Ship

`bin/dg ship cdn` runs **blog-sync** first.  
`bin/dg ship prepare` runs **blog-check**.

```bash
# edit demigod-blog-posts.json
bin/dg-blog sync
# bump foot version if needed, then:
DG_LOCK_OWNER=me bin/dg-lock node demigod-ship.mjs cdn
# paste when live pin lags
```

## Runtime

- `blogPageMount` — category chips with counts, sorted posts, full-note paragraphs
- `injectBlogHome` — 3 newest on homepage
- Deep links: `/?p=blog#note-{slug}`

## Voice

See `docs/agents/GROK-BLOG-HUMAN-VOICE-SELF-PROMPT.md` for human-voice / anti-slurry craft.
