# Season Update Process

Reference for keeping missions and card data current as the game changes.

---

## Card data updates

Cards change mid-season (new cards added, prices shift). This is the faster of the two updates — under an hour including deployment.

### Current process

1. Open OOTP, go to the card shop with **no filters applied**
2. Click **Export Card List to CSV**
3. From the repo root, run:
   ```bash
   node scripts/import-shop-cards.mjs <path-to-game-export.csv>
   ```
   This strips columns the app doesn't need and zeroes out prices/ownership (users supply those from their own export). Output: `app/public/data/shop_cards.csv`.
4. Bump the `version` date in `app/public/data/missions.json` so browsers know to recheck
5. Commit and push — the `deploy-data` GitHub Actions job syncs the data files directly to S3 and invalidates `data/*` on CloudFront, no app rebuild required

### What the script does

- Keeps: `//Card Title`, `Card ID`, `Card Value`
- Zeroes out: `Sell Order Low`, `Last 10 Price`, `owned` — users provide these from their own in-game export
- Handles quoted titles (commas in card names)
- Validates required columns are present

### Possible improvements

- **Stale card detection** — after running the script, cross-check `missions.json` card IDs against the new `shop_cards.csv`. Any mission referencing a cardId that no longer exists in the shop should be flagged. Could be a script:
  ```bash
  node scripts/validate-missions.mjs
  ```
- **Price change summary** — diff old vs new `shop_cards.csv` and print cards whose `Card Value` changed significantly (e.g., >20%). Useful for knowing if mission value calculations will shift dramatically.
- **Automated export trigger** — if OOTP exposes a CLI or file watcher hook, the export + import could run without opening the game UI. Currently not known to be possible.

---

## Mission data updates

New missions appear at season start and sometimes mid-season. This is the time-consuming part — **several hours per update** depending on mission count — because there's no programmatic data source.

### Current process

Missions are manually transcribed into `app/public/data/missions.json` by observing the game UI. For each mission you need:

| Field | Where to find it |
|---|---|
| `id` | Assign sequentially (check highest existing id) |
| `name` | Mission title in-game |
| `type` | `count`, `points`, or `missions` |
| `requiredCount` | The number shown (cards required, points required, or sub-missions required) |
| `reward` | Reward text exactly as shown |
| `category` | Mission category/group label in-game |
| `cards[].cardId` | Look up by card name in `shop_cards.csv` — see card lookup tip below |
| `cards[].points` | Points value shown per card (points missions only) |

**Card name → ID lookup** (no script yet, do manually):
```bash
grep -i "card name here" app/public/data/shop_cards.csv
```
The second column is the `Card ID`.

After editing `missions.json`:
1. Update the `version` field to today's date (`"2026-MM-DD"`)
2. Commit and push — `deploy-data` job handles the rest

### Why programmatic extraction has failed

- **No local save file** — mission data does not appear to be written to any accessible file on disk
- **WireShark API decryption failed** — the game's network traffic appears encrypted in a way that wasn't reversible during prior attempts
- The data effectively only exists in the game's rendered UI

### Possible improvements

#### OCR pipeline (most promising)

Screen-capture each mission panel in OOTP and run OCR to extract structured data. Rough approach:

1. Use a screen capture tool (or OOTP's screenshot feature) to grab each mission screen
2. Run OCR (e.g., [Tesseract](https://github.com/tesseract-ocr/tesseract) or a cloud vision API) on the captures
3. Parse the OCR output: mission name, required count, reward, card names with points
4. Look up each card name in `shop_cards.csv` to resolve `cardId`
5. Output a candidate `missions.json` for human review before committing

Challenges:
- Card names in mission UI may be truncated or styled differently than in the shop CSV — fuzzy name matching needed
- OCR accuracy varies on game fonts; may need post-processing
- Still requires manually navigating to each mission in-game, though could be partially automated with input macros

A script skeleton at `scripts/ocr-missions.mjs` could handle steps 3–5 given image files as input, making the human work just the screen capture step.

#### Name-based card lookup script

A small utility to resolve card names to IDs would reduce the most tedious part of manual entry:

```bash
node scripts/lookup-card.mjs "Babe Ruth"
# → Card ID: 72503  (Card Value: 15000)
```

Fuzzy matching (case-insensitive, partial match) would handle slight name differences.

#### Mission validation script

Catch errors before deploying:

```bash
node scripts/validate-missions.mjs
```

Should check:
- All `cardId` values exist in `shop_cards.csv`
- No duplicate mission `id` values
- `requiredCount` ≤ `totalPoints` for points missions
- `missionIds` for `missions`-type missions all resolve to real mission IDs
- `version` field is present and formatted as a date

#### Diff / change summary script

When updating missions mid-season, print what changed:

```bash
node scripts/diff-missions.mjs app/public/data/missions.json <new-version.json>
# → Added: 3 missions
# → Modified: Mission "First Victims" — requiredCount changed 18 → 20
# → Removed: 0 missions
```

---

## Deployment reference

Both data files deploy via the `deploy-data` GitHub Actions job, which triggers on any push that touches `app/public/data/`. It:
1. Syncs `app/public/data/` directly to S3 (no build)
2. Invalidates `data/*` on CloudFront

Users with cached mission data will pick up the new version on next load (TTL check) or within 24 hours (cache expiry). Users with cached card data will see the updated default on next visit if they haven't uploaded their own CSV.
