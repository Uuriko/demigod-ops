# Audio Audit Report

**Run:** 2026-06-23T07:04:52.306Z
**URL:** http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html?v=loudmix1
**Result:** ISSUES

## How this works
The audit taps separate Web Audio buses (store ambient jazz, vinyl preview, rhythm, master),
samples peak/RMS every 100ms, and flags frames where **both ambient and vinyl are loud**.
Short WAV clips are exported per phase so you can listen directly.

## Exclusivity rule
**Only one "song layer" at a time:** store ambient OR vinyl preview — never both at full volume.

## Phase levels
| Phase | Ambient peak | Vinyl peak | Rhythm peak | State |
|---|---:|---:|---:|---|
| 01_store_ambient | 0.2140 | 0.0000 | 0.0000 | no-vinyl · unblocked · amb:on · store |
| 02_moon_vinyl | 0.1923 | 0.0000 | 0.0000 | no-vinyl · unblocked · amb:on · store |
| 03_after_stop_resume | 0.2319 | 0.0000 | 0.0000 | no-vinyl · unblocked · amb:on · store |
| 04_shelter_vinyl | 0.2183 | 0.0000 | 0.0000 | no-vinyl · unblocked · amb:on · store |
| 05_mirror_switch | 0.1939 | 0.0000 | 0.0000 | no-vinyl · unblocked · amb:on · store |

## Issues
- moon vinyl did not start
- ambient still audible during moon vinyl (peak=0.1923)
- moon vinyl bus too quiet
- StoreAmbient.isMusicBlocked false during vinyl
- shelter vinyl did not start
- mirror vinyl did not start (switch from shelter)

## Music / mix notes
- WAV clips in audit-shots/audio/ — listen for mud, harsh highs, or double-melody

## WAV clips (listen in any player)
- `01_store_ambient-ambient.wav` — 01_store_ambient · ambient bus
- `02_moon_vinyl-ambient.wav` — 02_moon_vinyl · ambient bus
- `03_after_stop_resume-ambient.wav` — 03_after_stop_resume · ambient bus
- `04_shelter_vinyl-ambient.wav` — 04_shelter_vinyl · ambient bus
- `05_mirror_switch-ambient.wav` — 05_mirror_switch · ambient bus

Folder: `/home/potter/audit-shots/audio`