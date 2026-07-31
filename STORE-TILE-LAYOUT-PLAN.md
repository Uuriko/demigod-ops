# ∴ EAT THE SOUNDS — Store Tile Layout Plan (exhaustive)

**Grid:** 66 columns × 13 rows · 3 rooms × 22 cols each  
**Coords:** `(x, y)` — x=0 left, y=0 top  
**Room A:** x 0–21 entrance · **Room B:** x 22–43 crate stacks · **Room C:** x 44–65 listening booth

---

## 1. Tile legend & walk rules

| Char | Name | Player walk? | NPC walk? | Blocks vision |
|------|------|--------------|-----------|---------------|
| `W` | Wall | **NO** | NO | yes |
| `S` | Shelf (vinyl rack) | **NO** | NO | yes |
| `C` | Register counter | **NO** | NO | yes |
| `D` | Street door (threshold) | **NO** | YES | no |
| `.` | Open floor | **YES** | YES | no |
| `R` | Listening rug | **YES** | YES | no |
| `T` | Turntable / demo deck | **YES** | YES | no |
| `P` | Booth platform | **YES** | YES | no |

**Player rule:** walk on every `.` `R` `T` `P` tile.  
**Perimeter rule:** row 0 and row 12 are `W` on all three rooms; cols 0 and 65 are `W`; **only** door tiles `(10,12)` `(11,12)` are `D` in Room A.

**Room arches (no wall):** rows 5–7 at x=21 (A→B), x=43 (B→C) — patched open for flow.

---

## 2. Interaction system (one rule for everything)

Every interactable has exactly **one approach pad** `(padX, padY)` on walkable floor.

| Step | Rule |
|------|------|
| 1 | Walk onto the **glow pad** (gold floor marker) |
| 2 | Press **Z** — auto-faces target, acts |
| 3 | Adjacent (1 tile) to pad also works; **on-pad wins** if multiple |

**Priority when several in range:** Bird → NPC talk → Vinyl spin → Examine → Secret spot

**Ranges:** Pad exact = 0; adjacent pad = 1. No more dual shelf/stand distance.

---

## 3. Player spawn & door

| Entity | Tile (x,y) | Tile underfoot | Notes |
|--------|------------|----------------|-------|
| **Player start** | (10, 10) | `.` | Faces north; central entrance aisle |
| **Street door** | (10, 12), (11, 12) | `D` | Passerby enter/exit; player cannot stand on door |
| **North highway** | x=10, y=5→3 | `.` | Main path to moon vinyl (counter moved off col 10) |

---

## 4. Vinyl records (spin)

| ID | Shelf (blocked `S`) | Approach pad (stand here) | Face | Room | Path hint |
|----|---------------------|---------------------------|------|------|-----------|
| **moon** | (10, 1) | **(10, 3)** | north | A | Door → north on x=10 → pad |
| **shelter** | (26, 2) | **(26, 4)** | north | B | Arch row 6 → east to x=26 → pad |
| **mirror** | (54, 1) | **(54, 3)** | north | C | Arch row 6 → east to x=54 → pad |

Shelf = visual + blocked. Pad = only spin trigger.

---

## 5. NPCs (talk)

| ID | Home tile (x,y) | Talk pad | Range | Pinned | Notes |
|----|-----------------|----------|-------|--------|-------|
| **orph** | (7, 9) | (7, 10) south | 1 | yes | Left entrance aisle |
| **simon** | (30, 6) | (30, 7) south | 1 | yes | Center crate room |
| **honey** | (50, 7) | (50, 8) south | 1 | yes | Listening lounge |
| **sarah** | wanders | (10, 6) register | 1 | no | Hidden until 3 mutuals; tiles (9,5)(10,5)(11,5)(10,4) |
| **passerby** | dynamic | nearest floor | 2 | no | Spawn (10,12) door |

---

## 6. Examine spots (Z look)

| ID | Object tile | Approach pad | Mutual | Item hook |
|----|-------------|--------------|--------|-----------|
| storm_spine | (6, 1) shelf | **(6, 3)** | orph | storm_liner pickup |
| storm_poster | (3, 9) | **(3, 10)** | orph | — |
| mirror_scratch | (17, 6) | **(17, 7)** | orph | — |
| jazz_poster | (28, 2) | **(28, 3)** | simon | chalk_stub use |
| chalk_path | (30, 9) | **(30, 10)** | simon | chalk_stub pickup |
| map_note | (35, 2) | **(35, 3)** | simon | map_scrap pickup |
| demo_deck | (49, 3) | **(49, 4)** | honey | demo_ribbon pickup |
| listening_rug | (47, 9) | **(48, 9)** | honey | — |
| hi_fi_plant | (51, 10) | **(51, 11)** | honey | — |
| neon_hum | (8, 11) | **(8, 10)** | — | — |
| register_wear | (10, 6) | **(10, 7)** | — | overlaps sarah pad |
| lamp_dust | (12, 2) | **(12, 3)** | — | — |

---

## 7. Map tile edits (from current)

### Perimeter (required)
- **Room B row 12:** all `.` → `W` (cols 22–41)
- **Room C row 12:** all `.` → `W` (cols 44–63)

### Aisles (required)
- **Room A row 4:** `...CCC...` → `...CC.....` at cols 7–9 only — **col 10 stays `.`** (north–south highway)
- **Room A row 1:** keep moon shelf S at (10,1); ensure (10,2)(10,3) are `.`

### Optional widen
- Room B row 3 cols 24–28: clear shelf gap for shelter approach
- Room C row 2 cols 52–56: clear for mirror approach

---

## 8. Blocked tile inventory (player cannot enter)

All `W` (144), `S` (41), `C` (2 after edit), `D` (2).

**Counter after edit:** (7,4), (8,4), (9,4) only — **not** (10,4).

---

## 9. Full grid reference (after edits)

```
 y  Room A (0-21)          | Room B (22-43)         | Room C (44-65)
 0  WWWWWWWWWWWWWWWWWWWWWW | WWWWWWWWWWWWWWWWWWWWWW | WWWWWWWWWWWWWWWWWWWWWW
 1  W..S......S.S....S...W | W....S.......SS......W | W..........SS........W
 2  W................SS..W | W..S...S..........SS.W | W..SS................W
 3  W................SS..W | W.......S.....S......W | W....TT..............W
 4  W......CC............W | W....................W | W...RRR..........SS..W
 5  W....................  | ...................... | ......................
 6  W....................  | ...................... | ......................
 7  W....................  | ...................... | ......................
 8  W............SS......W | W............SS......W | W..RR..........SS....W
 9  W............SS......W | W............SS......W | W..RR................W
10  W....................W | W....SS....SS........W | W.......PP...........W
11  W..............SS....W | W....................W | W....TT..............W
12  WWWWWWWWWWDDWWWWWWWWWW | WWWWWWWWWWWWWWWWWWWWWW | WWWWWWWWWWWWWWWWWWWWWW
```

`.` at arches row 5–7 cols 21,22,43,44 = open passage.

---

## 10. Shortest paths (player)

| Goal | Steps |
|------|-------|
| Moon vinyl | (10,10)→(10,9)→…→(10,3) straight north |
| Orph | (10,10)→(7,10) west → Z |
| Shelter | (10,10)→arch (22,6)→(26,6)→(26,4) |
| Simon | arch → (30,7) pad |
| Mirror | arch B→C (44,6)→(54,6)→(54,3) |
| Honey | arch → (50,8) pad |

---

## 11. Implementation checklist

- [x] Wall row 12 rooms B & C
- [x] Counter shrink — aisle col 10 open
- [x] `padX/padY` on vinyl, examine, NPC hints
- [x] `drawInteractPads()` gold markers
- [x] `resolveInteractTarget()` pad-first
- [x] Hint: "Stand on glow · Z"
- [x] Heavy review pass (confirmed pads + NPC tiles)

---

*Co-designed with SuperGrok Heavy · DCSS movement unchanged (snap + aut)*