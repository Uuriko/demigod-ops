# Demigod

Trusted, human-reviewed matches for real SF startup hires.

This repository is the open-source ops tree: the Role Mission kernel, public-safe
website sources, and the tools that sit next to them. **DIE** (Demigod Intelligence
Engine) is an **internal** name for the evidence kernel. We do not sell “an AI that
hires.” Do not put DIE on the public site.

Product site: [trydemigod.com](https://trydemigod.com)

## What lives here

- Role Mission OS (`demigod.role-mission-os/1`) — ATS + calendar + CRM on one hire object
- Public-safe site sources already in the tree (`demigod-foot-core.js`, head/footer HTML)
- Apache-2.0 license and the contributor on-ramp

Employment decisions stay human. Booking a slot requires mutual yes from founder and
candidate. A filled hire is not an observed outcome until a dated 90-day check exists.

## Website: in the repo, not the live publish path

Public-safe website sources in this repo are part of the open-source tree.

Live trydemigod.com / Webflow / CDN publish is not the contribution path and is
not required to land a PR. `bin/dg truth` is website truth.

## Official community

GitHub is the official room.

| Need | Where |
|------|--------|
| Bug or request | [Issues](https://github.com/Uuriko/demigod-ops/issues) |
| Change | [Pull requests](https://github.com/Uuriko/demigod-ops/pulls) |
| Design talk | [Discussions](https://github.com/Uuriko/demigod-ops/discussions) |
| Vulnerability or leaked secret | [Private advisory](https://github.com/Uuriko/demigod-ops/security/advisories/new) |

There is **no official Discord, Telegram, Slack, WhatsApp, or other off-site chat**.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md),
[SECURITY.md](SECURITY.md), and the [code of conduct](CODE_OF_CONDUCT.md).

Do **not** paste hiring PII, résumés, emails, OAuth tokens, wallet keys, or live secrets
into issues or PRs.

## Verify

```bash
node contributing-oss.test.mjs
```

Kernel tests live in `demigod-role-mission-kernel.test.mjs` and need the kernel’s
sibling modules on disk. A missing sibling is a packaging gap, not a green skip.

## License

[Apache License 2.0](LICENSE)
