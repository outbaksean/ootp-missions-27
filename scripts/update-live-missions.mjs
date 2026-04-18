/**
 * Syncs live card additions from shop_cards.csv into missions.json.
 * For each team, adds any new "MLB 2026 Live" cards to the corresponding
 * "Live Level 1 - [Team]" and "Live Level 2 - [Team]" missions and updates totalPoints.
 *
 * Usage (run from repo root):
 *   node scripts/update-live-missions.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CARDS_PATH = resolve(__dirname, '../app/public/data/shop_cards.csv')
const MISSIONS_PATH = resolve(__dirname, '../app/public/data/missions.json')

// Team abbreviation -> mission name suffix
const TEAM_MAP = {
  ARI: 'Arizona Diamondbacks',
  AZ: 'Arizona Diamondbacks',
  ATH: 'Athletics',
  ATL: 'Atlanta Braves',
  BAL: 'Baltimore Orioles',
  BOS: 'Boston Red Sox',
  CHC: 'Chicago Cubs',
  CIN: 'Cincinnati Reds',
  CLE: 'Cleveland Guardians',
  COL: 'Colorado Rockies',
  CWS: 'Chicago White Sox',
  DET: 'Detroit Tigers',
  HOU: 'Houston Astros',
  KC: 'Kansas City Royals',
  LAA: 'Los Angeles Angels',
  LAD: 'Los Angeles Dodgers',
  MIA: 'Miami Marlins',
  MIL: 'Milwaukee Brewers',
  MIN: 'Minnesota Twins',
  NYM: 'New York Mets',
  NYY: 'New York Yankees',
  PHI: 'Philadelphia Phillies',
  PIT: 'Pittsburgh Pirates',
  SD: 'San Diego Padres',
  SEA: 'Seattle Mariners',
  SF: 'San Francisco Giants',
  STL: 'St. Louis Cardinals',
  TB: 'Tampa Bay Rays',
  TEX: 'Texas Rangers',
  TOR: 'Toronto Blue Jays',
  WSH: 'Washington Nationals',
}

// Cards excluded from their team's live missions
const EXCLUDED_CARD_IDS = new Set([
  82045, // Johan Rojas PHI
])

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// Parse shop_cards.csv — group live card IDs by team abbreviation
const csvText = readFileSync(CARDS_PATH, 'utf8')
const csvLines = csvText
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .split('\n')
  .filter((l) => l.trim().length > 0)

const header = parseCSVLine(csvLines[0])
const titleIdx = header.indexOf('//Card Title')
const idIdx = header.indexOf('Card ID')

if (titleIdx === -1 || idIdx === -1) {
  console.error('Required columns not found in shop_cards.csv header.')
  process.exit(1)
}

/** @type {Map<string, number[]>} team abbr -> [cardId, ...] */
const liveCardsByTeam = new Map()

for (let i = 1; i < csvLines.length; i++) {
  const row = parseCSVLine(csvLines[i])
  const title = row[titleIdx] ?? ''
  if (!title.startsWith('MLB 2026 Live ')) continue

  const cardId = parseInt(row[idIdx], 10)
  if (isNaN(cardId)) continue
  if (EXCLUDED_CARD_IDS.has(cardId)) continue

  // Title format: "MLB 2026 Live POSITION NAME... TEAM"
  const tokens = title.split(' ')
  const teamAbbr = tokens[tokens.length - 1]

  if (!TEAM_MAP[teamAbbr]) {
    console.warn(`Unknown team abbreviation "${teamAbbr}" in card: ${title}`)
    continue
  }

  if (!liveCardsByTeam.has(teamAbbr)) liveCardsByTeam.set(teamAbbr, [])
  liveCardsByTeam.get(teamAbbr).push(cardId)
}

// Load missions.json
const missionsData = JSON.parse(readFileSync(MISSIONS_PATH, 'utf8'))

let totalAdded = 0
let missionsUpdated = 0

for (const [abbr, cardIds] of liveCardsByTeam) {
  const teamName = TEAM_MAP[abbr]
  const level1Name = `Live Level 1 - ${teamName}`
  const level2Name = `Live Level 2 - ${teamName}`

  for (const missionName of [level1Name, level2Name]) {
    const mission = missionsData.missions.find((m) => m.name === missionName)
    if (!mission) {
      console.warn(`Mission not found: "${missionName}"`)
      continue
    }

    const existingIds = new Set(mission.cards.map((c) => c.cardId))
    const toAdd = cardIds.filter((id) => !existingIds.has(id))

    if (toAdd.length === 0) continue

    for (const id of toAdd) {
      mission.cards.push({ cardId: id })
    }
    mission.totalPoints = mission.cards.length
    totalAdded += toAdd.length
    missionsUpdated++

    console.log(`  ${missionName}: added ${toAdd.length} card(s) [${toAdd.join(', ')}], totalPoints -> ${mission.totalPoints}`)
  }
}

if (totalAdded === 0) {
  console.log('No new cards to add — missions.json is already up to date.')
  process.exit(0)
}

const today = new Date().toISOString().slice(0, 10)
missionsData.version = today

writeFileSync(MISSIONS_PATH, JSON.stringify(missionsData, null, 2) + '\n')
console.log(`\nDone. Added ${totalAdded} card(s) across ${missionsUpdated} mission(s). Version set to ${today}. missions.json updated.`)
