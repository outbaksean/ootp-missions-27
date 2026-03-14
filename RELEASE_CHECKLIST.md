# OOTP 27 Release Checklist

Steps to complete once OOTP 27 is available and mission/card data can be exported.

1. [Done] Export card shop data to csv
2. [Done] Transform raw card shop data to shop_cards.csv
    - Run `node scripts/import-shop-cards.mjs "C:\Users\seane\Documents\Out of the Park Developments\OOTP Baseball 26\online_data\pt_card_list.csv"` to produce `app/public/data/shop_cards.csv`
3. [Done] Generate new missions.json (see details below)
4. [Done] Add new release features (see details below)
5. Test with new missions.json and shop_cards.csv
6. Update release text (see details below)
7. Deploy with a normal pr merge

# Generate new missions.json
- Load new shop_cards.csv into mission extractor
- Generate live level 1 and live level 2 missions
    - Add new Generate Live Level missions and Add Live Level missions to state buttons
    - Generate Live Level missions puts the json mission list on screen like it does for pt elite as described below
    - Add Live Level to State does the same thing as add PT Elite to state but for the live level missions
    - live level 1 - per abbreviation, similar to what the dropdown does now but all at once like pt elite now
        - name: `Live Level 1 - {team name}` (can use abbreviation is there isn't a team name mapping)
        - type: `count`
        - requiredCount: 20
        - reward: `1x Standard Pack, Park: {abbreviation} park`
        - category: `Live Series`
        - Cards: Each card with type live and the abbreviation as the last part of the title, e.g. "MLB 2026 Live RP Ryan Zeferjahn LAA" is inclded in the LAA live mission
        - totalPoints: length of cards array
    - live level 2 - the same as live level one with these differences
        - name: `Live Level 2 - {team name}` (can use abbreviation is there isn't a team name mapping)
        - requiredCount: 21
    - Insert rewards through the manage missions page, not OCR
- Use OCR to capture live mission type missions
- USE OCR to capture Launch Deck missions
- Run transform and load clean to check for errors
- Review mission title spelling
- Save final format json

# Add new release features
- [Done] Add Artifact pack type and default values
- [Done] Add Artifact reward type and default value
- [Done] When Use Sell Price is not selected and there is no last 10 price but there is a sell price, use the sell price

# Update release text
- [Done] Remove PreRelease modal
- [Done] Update Mission Notes modal
- [Done] Verify Help and Upload Help sections are accurate
- [InProgress] Update default pack prices. Double them?
- [Done] Remove wip banner

---
# Old checklist

## Data

- [ ] Export full card list from OOTP 27 card shop (no filters, Export Card List to CSV)
- [ ] Run `node scripts/import-shop-cards.mjs <path-to-export.csv>` to produce `app/public/data/shop_cards.csv`
- [ ] Manually transcribe all OOTP 27 missions into `app/public/data/missions.json` (see `UPDATE_PROCESS.md`)
- [ ] Set `version` in `missions.json` to today's date
- [ ] Run `node scripts/validate-missions.mjs` to check for bad card IDs, duplicate IDs, etc. *(script to be built — see UPDATE_PROCESS.md)*
- [ ] Spot-check a few missions in the app against the in-game mission screen

## Code cleanup

- [ ] Remove the PreRelease Status button from `CardUploader.vue` (the second `.upload-status-row` div)
- [ ] Remove the `#prereleaseStatusModal` and all its contents from `CardUploader.vue`
- [ ] Remove or archive `ootp-missions-2` references if any remain in scripts or docs

## Verify

- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Spot-test in browser: cards load, missions display, calculate works, freshness indicator shows correct date
- [ ] Confirm freshness indicator shows the correct date

## Deploy

- [ ] Commit data files and code changes on a clean branch
- [ ] Open PR, confirm both `deploy-app` and `deploy-data` GitHub Actions jobs are triggered as needed
- [ ] After merge, verify live site at `cratervar.com/ootp-missions-27/`
- [ ] Update PreRelease Status notes → remove (already done in code cleanup above)
