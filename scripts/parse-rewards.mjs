#!/usr/bin/env node
/**
 * parse-rewards.mjs
 *
 * Reads missions.json, parses each `reward` string into a structured `rewards`
 * array, and writes the file back.
 *
 * Outputs a report of:
 *   - Any reward strings it could not parse (set to [{type:'other'}])
 *   - Card rewards where cardId needs to be filled in manually
 *
 * Usage: node scripts/parse-rewards.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const missionsPath = join(__dirname, '../app/public/data/missions.json')

// Pack type names ordered longest-first so the regex greedily matches the most
// specific name (e.g. "Historical Diamond" before "Diamond").
const PACK_TYPES = [
  'Spotlight #Immortals',
  'Historical Diamond',
  'Historical Perfect',
  'Historical Rainbow',
  'Historical Gold',
  'Historical Silver',
  'Diamond',
  'Perfect',
  'Rainbow',
  'Silver',
  'Gold',
  'Standard',
]

// Escape # for regex safety; other chars in our pack type list are alphanumeric/spaces.
const escapedTypes = PACK_TYPES.map((t) => t.replace(/#/g, '\\#'))
const PACK_PART_RE = new RegExp(
  `^(\\d+)\\s+(${escapedTypes.join('|')})\\s+Packs?$`,
  'i',
)

// Card part: RATING POSITION REST  (e.g. "100 C Mike Piazza")
const CARD_PART_RE = /^(\d+)\s+([A-Z0-9]+)\s+(.+)$/

function parseRewardPart(part) {
  const p = part.trim()

  const packMatch = p.match(PACK_PART_RE)
  if (packMatch) {
    // Normalise to the canonical casing from our list (match is case-insensitive)
    const normalised = PACK_TYPES.find(
      (t) => t.toLowerCase() === packMatch[2].toLowerCase(),
    ) ?? packMatch[2]
    return { type: 'pack', packType: normalised, count: parseInt(packMatch[1], 10) }
  }

  const cardMatch = p.match(CARD_PART_RE)
  if (cardMatch) {
    // cardId must be filled in manually; 0 is the sentinel value
    return { type: 'card', cardId: 0, _displayName: p }
  }

  return null
}

function parseRewards(reward) {
  if (!reward || reward.trim() === '') return [{ type: 'other' }]

  // Variant entries are non-standard — can't be valued automatically
  if (/^Variant\s/i.test(reward)) return [{ type: 'other' }]

  const parts = reward.split(', ')
  const results = []
  const failed = []

  for (const part of parts) {
    const parsed = parseRewardPart(part)
    if (parsed) {
      results.push(parsed)
    } else {
      failed.push(part)
    }
  }

  if (failed.length > 0) {
    return null // Signal failure — caller will set type:'other' and report
  }

  return results
}

// ── Main ────────────────────────────────────────────────────────────────────

const data = JSON.parse(readFileSync(missionsPath, 'utf8'))

const unparseable = []
const needsCardId = []

for (const mission of data.missions) {
  if (mission.rewards) continue // Already annotated — leave it alone

  const parsed = parseRewards(mission.reward)

  if (parsed === null) {
    unparseable.push({ id: mission.id, name: mission.name, reward: mission.reward })
    mission.rewards = [{ type: 'other' }]
  } else {
    // Strip the _displayName from the JSON output; we'll report it separately
    mission.rewards = parsed.map(({ _displayName, ...r }) => r)

    const cards = parsed.filter((r) => r.type === 'card')
    if (cards.length > 0) {
      needsCardId.push({
        id: mission.id,
        name: mission.name,
        cards: cards.map((c) => c._displayName),
      })
    }
  }
}

writeFileSync(missionsPath, JSON.stringify(data, null, 2) + '\n')
console.log(`✅ Updated ${data.missions.length} missions in missions.json`)

if (unparseable.length > 0) {
  console.log(`\n⚠  ${unparseable.length} reward strings could not be parsed (set to {type:'other'}):`)
  for (const m of unparseable) {
    console.log(`  [${m.id}] ${m.name}: "${m.reward}"`)
  }
} else {
  console.log('   All reward strings parsed successfully.')
}

if (needsCardId.length > 0) {
  console.log(
    `\n📋 ${needsCardId.length} missions have card rewards needing a manual cardId lookup:`,
  )
  for (const m of needsCardId) {
    for (const name of m.cards) {
      console.log(`  [${m.id}] ${m.name}: "${name}"`)
    }
  }
}
