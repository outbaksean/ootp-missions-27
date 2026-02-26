#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--structure') out.structure = args[i + 1]
    if (arg === '--details') out.details = args[i + 1]
    if (arg === '--cards') out.cards = args[i + 1]
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

function normalizeTitle(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result
}

const { structure, details, cards, output, errors } = parseArgs()
if (!structure || !details || !cards) {
  console.error('Usage: node step6_map_cards.mjs --structure <missions_structure.json> --details <mission_details.json> --cards <shop_cards.csv> [--output <file>] [--errors <file>]')
  process.exit(1)
}

const structurePath = resolve(structure)
const detailsPath = resolve(details)
const cardsPath = resolve(cards)
const outputPath = resolve(output ?? generateDefaultOutput(structurePath, '_cards'))
const errorsPath = resolve(errors ?? generateDefaultOutput(outputPath, '_errors'))

const structureData = JSON.parse(readFileSync(structurePath, 'utf8'))
const detailsData = JSON.parse(readFileSync(detailsPath, 'utf8'))
const csvLines = readFileSync(cardsPath, 'utf8').split(/\r?\n/)

const cardMap = new Map()
const duplicateCards = []

for (const line of csvLines) {
  if (!line || line.startsWith('//')) continue
  const [title, id] = parseCsvLine(line)
  if (!title || !id) continue
  const key = normalizeTitle(title)
  if (cardMap.has(key)) {
    duplicateCards.push({ title, id: Number(id) })
    continue
  }
  cardMap.set(key, Number(id))
}

const missionsByName = new Map()
for (const mission of structureData.missions ?? []) {
  missionsByName.set(mission.name, mission)
}

const unmappedCards = []

for (const detail of detailsData ?? []) {
  const mission = missionsByName.get(detail.missionName)
  if (!mission) continue

  const entries = Array.isArray(detail.entries) ? detail.entries : []
  const cardEntries = entries.filter((e) => e.kind === 'card')
  if (cardEntries.length === 0) continue

  mission.cards = cardEntries.map((entry) => {
    const key = normalizeTitle(entry.title)
    const cardId = cardMap.get(key)
    if (!cardId) {
      unmappedCards.push({ missionName: detail.missionName, title: entry.title })
      return null
    }
    const card = { cardId }
    if (typeof entry.points === 'number') card.points = entry.points
    return card
  }).filter(Boolean)
}

const errorReport = {
  unmappedCards,
  duplicateCards,
  summary: {
    totalDetailEntries: detailsData.length,
    unmappedCount: unmappedCards.length,
    duplicateCount: duplicateCards.length,
  },
}

writeFileSync(outputPath, JSON.stringify(structureData, null, 2) + '\n')
writeFileSync(errorsPath, JSON.stringify(errorReport, null, 2) + '\n')

console.log(`✅ Mapped cards for ${detailsData.length} mission detail entries.`)
console.log(`📄 Output: ${outputPath}`)
console.log(`📋 Errors: ${errorsPath}`)
console.log(`\n📊 Mapping Results:`)
console.log(`  Duplicate card titles in CSV (ignored): ${duplicateCards.length}`)
console.log(`  Unmapped cards: ${unmappedCards.length}`)

if (unmappedCards.length > 0) {
  console.log(`\n⚠️  Unmapped cards:`)
  for (const item of unmappedCards) {
    console.log(`  ${item.missionName}: "${item.title}"`)
  }
}
