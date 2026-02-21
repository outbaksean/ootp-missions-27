/**
 * One-time script to convert ootp-missions-2's missions.ts to missions.json.
 *
 * Usage (run from repo root):
 *   node scripts/convert-missions.mjs <path-to-missions.ts>
 *
 * Example:
 *   node scripts/convert-missions.mjs ../ootp-missions-2/ootp-missions/src/data/missions.ts
 *
 * Output: app/public/data/missions.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/convert-missions.mjs <path-to-missions.ts>')
  process.exit(1)
}

const src = readFileSync(resolve(inputPath), 'utf8')

// Find the opening bracket of the missions array
const declStart = src.indexOf('const missions')
const arrayStart = src.indexOf('[', declStart)

// The array ends just before the missions.forEach block that follows it
const forEachMarker = ']\n\nmissions.forEach'
const arrayEnd = src.indexOf(forEachMarker, arrayStart)

if (declStart === -1 || arrayStart === -1 || arrayEnd === -1) {
  console.error('Could not find missions array in file.')
  process.exit(1)
}

const arrayText = src.slice(arrayStart, arrayEnd + 1) // include the closing ]

// Evaluate the array literal (content is JSON-compatible object literal syntax)
const missions = Function('return ' + arrayText)()

// Replicate the totalPoints calculation from missions.ts's forEach block
for (const mission of missions) {
  if (mission.type === 'count') {
    mission.totalPoints = mission.cards.length
  } else if (mission.type === 'points') {
    mission.totalPoints = mission.cards.reduce((sum, card) => sum + (card.points || 0), 0)
  }
}

const outputPath = resolve(__dirname, '../app/public/data/missions.json')
writeFileSync(outputPath, JSON.stringify(missions, null, 2))
console.log(`Wrote ${missions.length} missions to ${outputPath}`)
