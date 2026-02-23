# OOTP 27 Release Checklist

Steps to complete once OOTP 27 is available and mission/card data can be exported.

---

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
