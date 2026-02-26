#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--input') out.input = args[i + 1]
    if (arg === '--output') out.output = args[i + 1]
    if (arg === '--config') out.config = args[i + 1]
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

const { input, output, config, errors } = parseArgs()
if (!input) {
  console.error('Usage: node step3_validate_structure.mjs --input <missions_structure.json> [--config <validation_config.json>] [--output <file>] [--errors <file>]')
  process.exit(1)
}

const inputPath = resolve(input)
const outputPath = resolve(output ?? generateDefaultOutput(inputPath, '_validated'))
const configPath = resolve(config ?? './validation_config.json')
const errorsPath = resolve(errors ?? generateDefaultOutput(outputPath, '_errors'))

const data = JSON.parse(readFileSync(inputPath, 'utf8'))
const cfg = JSON.parse(readFileSync(configPath, 'utf8'))

const validCategories = new Set(cfg.validCategories ?? [])
const seen = new Map()
const duplicates = []
const invalidCategories = []
const invalidRequiredCounts = []

for (const mission of data.missions ?? []) {
  const key = `${mission.category}::${mission.name}`
  if (seen.has(key)) {
    duplicates.push({
      id: mission.id,
      name: mission.name,
      category: mission.category,
      duplicateOf: seen.get(key),
    })
  } else {
    seen.set(key, mission.id)
  }

  if (!validCategories.has(mission.category)) {
    invalidCategories.push({ id: mission.id, name: mission.name, category: mission.category })
  }

  if (typeof mission.requiredCount !== 'number' || mission.requiredCount <= 0) {
    invalidRequiredCounts.push({ id: mission.id, name: mission.name, requiredCount: mission.requiredCount })
  }
}

const missions = data.missions ?? []
const nonMissionType = missions.filter((m) => m.type !== 'missions')
const missionType = missions.filter((m) => m.type === 'missions')
const reordered = [...nonMissionType, ...missionType]

const reportData = {
  duplicates,
  invalidCategories,
  invalidRequiredCounts,
  movedMissionsToEnd: missionType.length,
}

const updated = { ...data, missions: reordered }
writeFileSync(outputPath, JSON.stringify(updated, null, 2) + '\n')
writeFileSync(errorsPath, JSON.stringify(reportData, null, 2) + '\n')

console.log(`✅ Validated ${missions.length} missions.`)
console.log(`📄 Output: ${outputPath}`)
console.log(`📋 Errors: ${errorsPath}`)
console.log(`\n📊 Validation Results:`)
console.log(`  Duplicates: ${duplicates.length}`)
console.log(`  Invalid categories: ${invalidCategories.length}`)
console.log(`  Invalid requiredCount: ${invalidRequiredCounts.length}`)
console.log(`  Moved missions-type to end: ${missionType.length}`)
