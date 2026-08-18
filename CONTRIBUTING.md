# Contributing to Demigod

**Demigod** is the public product: trusted, human-reviewed matches for real SF startup hires.
**DIE** (Demigod Intelligence Engine) is the **internal** name for the evidence and Role Mission
kernel. We do not sell “an AI that hires.” Do not put DIE on the public site.

## Official community

GitHub is the official room.

- **Issues:** https://github.com/Uuriko/demigod-ops/issues
- **Pull requests:** https://github.com/Uuriko/demigod-ops/pulls
- **Discussions** are for design talk.
- **Support map:** [SUPPORT.md](SUPPORT.md)
- **Security / leaked secrets / CoC reports:** [SECURITY.md](SECURITY.md) (private advisory only)
- **Conduct:** [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

There is **no official Discord, Telegram, Slack, WhatsApp, or other off-site chat**.
Do not add invite links or treat a third-party server as the project community.

## How to file an issue

1. Search existing issues first.
2. Use a short title that names the surface (`kernel`, `packet`, `contracts`, `docs`).
3. Include: what you ran, expected vs observed, and a failing test if you have one.
4. Do **not** paste hiring PII, résumés, emails, OAuth tokens, wallet keys, or live secrets.

## How to send a PR

1. Fork or branch from the default branch. One concern per PR.
2. Keep changes in the existing module. Ponytail: YAGNI, reuse, no new hire score.
3. Drive the **shipped** function from the existing test file for that module
   (`demigod-role-mission-kernel.test.mjs` for the Role Mission OS).
4. Do not add Discord/Telegram community files, people-data waterfalls, or auto-DM.
5. Open a PR against `Uuriko/demigod-ops` with a complete-sentence description.

## Website: in the repo, not the live publish path

**Yes — public-safe website sources in this repo are part of the open-source tree.**
That includes in-repo files such as `demigod-foot-core.js`, head/footer HTML/CSS, and
related site sources that already live here.

**No — live trydemigod.com / Webflow / CDN publish is not the contribution path** and is
**not required to land a PR.** Do not send Designer state, publish tokens, or “please
click Publish.” A merged PR can sit ahead of live; `bin/dg truth` is website truth.

## Hard boundaries

No publish of trydemigod.com, no outbound DMs/forms, no invented pilots, no employment
decision by model. `bin/dg truth` is live website truth; this repo can be ahead of live.

## License

Contributions are under the Apache License 2.0 in [`LICENSE`](LICENSE).
