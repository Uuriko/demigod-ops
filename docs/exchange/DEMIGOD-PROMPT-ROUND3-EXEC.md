# Round-3 — Final pass then execute

## Gaps found on re-read
| Gap | Detail |
|-----|--------|
| Version drift | Disk **v199** vs live **v198** |
| Tools P0 unbuilt | live-doctor, route-mime not yet code |
| Smoke | Can report stale foot |
| Redirects | Webflow 412 session |
| Product MIME | catbox HTML still text/plain risk |
| Fable df | Unreliable; use claude -p fable-role |

## Execution split
| Agent | Owns |
|-------|------|
| Grok | live-doctor, route-mime, smoke fix, ship v199, verify |
| Codex | WIZ ownership tests + forceMobileDesktopWIZ harden |
| Claude/Fable | Copy/UX polish pass + product page content honesty |

## Done when
- live-doctor pass (after ship)
- full-check PASS
- usertest quick PASS
- live __dgFootVer matches disk
