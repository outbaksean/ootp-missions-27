# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

OOTP 27 mission tracker — a Vue 3 SPA served at `cratervar.com/ootp-missions-27/`. Users upload a card price/ownership CSV from the OOTP client and the app calculates the minimum-cost card purchases to complete each mission. Replaces the v26 app (`outbaksean/ootp-missions-2`).

## Commands

```bash
cd app
npm install
npm run dev          # Dev server at http://localhost:5173/ootp-missions-27/
npm run build        # Type-check + build to app/dist/
npm run type-check   # vue-tsc only
npm run lint         # ESLint with auto-fix
npm run format       # Prettier
```

## Data Files

`app/public/data/` contains two files served by Vite in dev and synced to S3 separately in prod:

- **`missions.json`** — Mission definitions fetched by the app on init. Update this when OOTP 27 mission data changes; the frontend requires no rebuild.
- **`shop_cards.csv`** — Default card catalog loaded when a user has no local data. Update this during the season with fresh price exports.

To populate `missions.json` from the v26 app's `missions.ts`:
```bash
node scripts/convert-missions.mjs ../ootp-missions-2/ootp-missions/src/data/missions.ts
```

## Architecture

**Data flow:**
1. App init: fetch `missions.json` from CDN → cache in `useMissionStore.missions`
2. App init: if no IndexedDB data, fetch `shop_cards.csv` from CDN → parse → IndexedDB
3. User uploads own CSV → `useCardStore.uploadShopFile()` → overwrites IndexedDB
4. User selects/calculates mission → `MissionHelper.calculateTotalPriceOfNonOwnedCards()` → client-side DP solver → render results

**Key files:**
- `src/helpers/MissionHelper.ts` — All calculation logic. Points missions use 0/1 knapsack DP (O(n × target_points)), replacing v26's O(2^n) exhaustive search. Count missions take the cheapest N unowned cards.
- `src/stores/useMissionStore.ts` — Fetches and caches missions; owns `userMissions` state and calculation orchestration.
- `src/stores/useCardStore.ts` — Fetches default shop cards; handles CSV upload and IndexedDB persistence.
- `src/data/indexedDB.ts` — Dexie schema (`OOTPMissions27DB`, version 1). DB name is distinct from v26 (`OOTPMissionsDB`) so both apps can run in the same browser without conflict.

**Mission types:** `count` (own N cards), `points` (accumulate N points across cards), `missions` (complete N sub-missions). The `missions` type sums the cheapest N incomplete sub-mission costs.

**No backend.** No Lambda, no API Gateway, no DynamoDB. All data is static files on S3/CloudFront or local in the user's browser.

## Deployment

Frontend deploy is automated via GitHub Actions (`deploy.yml`). Two independent jobs:
- **`deploy-app`**: triggers on changes to `app/` (excluding `app/public/data/`), runs build, syncs `app/dist/` to S3, invalidates `/ootp-missions-27/*`
- **`deploy-data`**: triggers on changes to `app/public/data/`, syncs data files directly to S3 without a build, invalidates `/ootp-missions-27/data/*`

Required GitHub secrets: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.

The frontend is served from the existing homepage S3 bucket and CloudFront distribution. See the homepage repo for infrastructure details.

## Differences from v26 (`ootp-missions-2`)

- Mission data fetched from CDN instead of bundled in JS
- Default shop cards fetched from CDN instead of bundled
- DP knapsack solver replaces exhaustive search + greedy toggle (greedy toggle removed from UI)
- Mission text search added
- IndexedDB database renamed to avoid browser conflicts with v26
- Debug styles removed from `MissionDetails.vue`
