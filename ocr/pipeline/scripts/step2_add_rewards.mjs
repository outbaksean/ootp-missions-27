#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'

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

const escapedTypes = PACK_TYPES.map((t) => t.replace(/#/g, '\\#'))
const PACK_PART_RE = new RegExp(
  `^(\\d+)\\s+(${escapedTypes.join('|')})\\s+Packs?$`,
  'i',
)

const CARD_PART_RE = /^(\d+)\s+([A-Z0-9]+)\s+(.+)$/

function parseRewardPart(part) {
  const p = part.trim()

  const packMatch = p.match(PACK_PART_RE)
  if (packMatch) {
    const normalised =
      PACK_TYPES.find((t) => t.toLowerCase() === packMatch[2].toLowerCase()) ??
      packMatch[2]
    return { type: 'pack', packType: normalised, count: parseInt(packMatch[1], 10) }
  }

  const cardMatch = p.match(CARD_PART_RE)
  if (cardMatch) {
    return { type: 'card', cardId: 0, _displayName: p }
  }

  return null
}

function parseRewards(reward) {
  if (!reward || reward.trim() === '') return [{ type: 'other' }]
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

  if (failed.length > 0) return null
  return results
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--input') out.input = args[i + 1]
    if (arg === '--output') out.output = args[i + 1]
    if (arg === '--errors') out.errors = args[i + 1]
  }
  return out
}

function generateDefaultOutput(inputPath, suffix) {
  const dir = dirname(inputPath)
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)
  return join(dir, `${base}${suffix}${ext}`)
}

const { input, output, errors } = parseArgs()
if (!input) {
  console.error('Usage: node step2_add_rewards.mjs --input <missions_structure.json> [--output <file>] [--errors <file>]')
  process.exit(1)
}

const inputPath = resolve(input)
const outputPath = resolve(output ?? generateDefaultOutput(inputPath, '_rewards'))
const errorsPath = resolve(errors ?? generateDefaultOutput(outputPath, '_errors'))

const data = JSON.parse(readFileSync(inputPath, 'utf8'))
const unparseable = []
const needsCardId = []

for (const mission of data.missions ?? []) {
  if (mission.rewards) continue

  const parsed = parseRewards(mission.reward)
  if (parsed === null) {
    unparseable.push({ id: mission.id, name: mission.name, reward: mission.reward })
    mission.rewards = [{ type: 'other' }]
    continue
  }

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

const errorReport = {
  unparseable,
  needsCardId,
  summary: {
    totalMissions: data.missions?.length ?? 0,
    unparseableCount: unparseable.length,
    needsCardIdCount: needsCardId.length,
  },
}

writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n')
writeFileSync(errorsPath, JSON.stringify(errorReport, null, 2) + '\n')

console.log(`✅ Updated rewards for ${data.missions?.length ?? 0} missions.`)
console.log(`📄 Output: ${outputPath}`)
console.log(`📋 Errors: ${errorsPath}`)

if (unparseable.length > 0) {
  console.log(`\n⚠️  Unparseable reward strings (${unparseable.length}):`)
  for (const m of unparseable) {
    console.log(`  [${m.id}] ${m.name}: "${m.reward}"`)
  }
}

if (needsCardId.length > 0) {
  console.log(`\n📋 Card rewards needing manual cardId lookup (${needsCardId.length}):`)
  for (const m of needsCardId) {
    for (const name of m.cards) {
      console.log(`  [${m.id}] ${m.name}: "${name}"`)
    }
  }
}
