# Dasha lobby — mod cheatsheet

Secret lives in Cloudflare as `LOBBY_MOD_SECRET` (also local `/tmp/dasha-lobby-mod-secret.txt` if last deploy wrote it).

Send in lobby as a normal message (not shown as chat if accepted):

```text
!mod <secret> mute <nick>
!mod <secret> unmute <nick>
!mod <secret> slow on|off
!mod <secret> shield on|off
!mod <secret> clear
!mod <secret> nuke
!mod <secret> pin <text…>
!mod <secret> pin clear
```

| Command | Effect |
|---------|--------|
| `mute` | 24h mute (persisted) |
| `unmute` | clear mute |
| `slow on` | force slow mode |
| `shield on` | X-linked chat only |
| `clear` / `nuke` | wipe room history for everyone |
| `pin …` | custom room pin |
| `pin clear` | default concise mint pin |

### Live ops (announcement day)

```bash
watch -n 30 'curl -sS https://lobby.getdasha.com/stats | python3 -m json.tool'
```

Watch: `count`, `chatsPerMin`, `rejectsFull`, `rejectsIp`, `shield`, and `autoShields`.
