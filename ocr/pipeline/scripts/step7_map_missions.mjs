#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--cards') out.cards = args[i + 1]
    if (arg === '--details') out.details = args[i + 1]
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

const { cards, details, output, errors } = parseArgs()
if (!cards || !details) {
  console.error('Usage: node step7_map_missions.mjs --cards <missions_cards.json> --details <mission_details.json> [--output <file>] [--errors <file>]')
  process.exit(1)
}

const cardsPath = resolve(cards)
const detailsPath = resolve(details)
const outputPath = resolve(output ?? generateDefaultOutput(cardsPath, '_final'))
const errorsPath = resolve(errors ?? generateDefaultOutput(outputPath, '_errors'))

const data = JSON.parse(readFileSync(cardsPath, 'utf8'))
const detailsData = JSON.parse(readFileSync(detailsPath, 'utf8'))

const missionIdByName = new Map()
for (const mission of data.missions ?? []) {
  missionIdByName.set(mission.name, mission.id)
}

const unmappedMissions = []

for (const detail of detailsData ?? []) {
  const parentId = missionIdByName.get(detail.missionName)
  if (!parentId) continue

  const parentMission = (data.missions ?? []).find((m) => m.id === parentId)
  if (!parentMission || parentMission.type !== 'missions') continue

  const entries = Array.isArray(detail.entries) ? detail.entries : []
  const missionEntries = entries.filter((e) => e.kind === 'mission')

  parentMission.missionIds = missionEntries
    .map((entry) => {
      const id = missionIdByName.get(entry.title)
      if (!id) {
        unmappedMissions.push({ parentMission: detail.missionName, title: entry.title })
        return null
      }
      return id
    })
    .filter(Boolean)
}

const errorReport = {
  unmappedMissions,
  summary: {
    totalDetailEntries: detailsData.length,
    unmappedCount: unmappedMissions.length,
  },
}

writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n')
writeFileSync(errorsPath, JSON.stringify(errorReport, null, 2) + '\n')

console.log(`✅ Mapped missionIds for ${detailsData.length} mission detail entries.`)
console.log(`📄 Output: ${outputPath}`)
console.log(`📋 Errors: ${errorsPath}`)
console.log(`\n📊 Mapping Results:`)
console.log(`  Unmapped mission names: ${unmappedMissions.length}`)

if (unmappedMissions.length > 0) {
  console.log(`\n⚠️  Unmapped missions:`)
  for (const item of unmappedMissions) {
    console.log(`  ${item.parentMission}: "${item.title}"`)
  }
}
