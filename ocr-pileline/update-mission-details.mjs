#!/usr/bin/env node
/**
 * update-mission-details.mjs
 *
 * Reads OCR-extracted mission details from current-data.txt and:
 * 1. Creates/updates mission-details.json with card titles or mission names for the expanded mission
 * 2. Updates missions-structure.json with requiredPoints if applicable
 *
 * The input file (current-data.txt) contains OCR output from an expanded mission with:
 *   - Mission Title ending with "-" or "[-]" (the selected mission)
 *   - Card titles ending with (XX) for count missions
 *   - Card titles ending with (XX / YY PTS) for points missions
 *   - Mission names ending with (status) for mission missions
 *
 * Usage: node update-mission-details.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const currentDataPath = join(__dirname, './current-data.txt')
const missionsStructurePath = join(__dirname, './missions-structure.json')
const missionDetailsPath = join(__dirname, './mission-details.json')

// Read files
let currentDataText
let missionsStructure
let missionDetails = {}

try {
  currentDataText = readFileSync(currentDataPath, 'utf8')
  missionsStructure = JSON.parse(readFileSync(missionsStructurePath, 'utf8'))
  
  // Load existing mission details if file exists
  if (existsSync(missionDetailsPath)) {
    missionDetails = JSON.parse(readFileSync(missionDetailsPath, 'utf8'))
  }
} catch (err) {
  console.error(`Error reading files: ${err.message}`)
  process.exit(1)
}

// Parse the mission details
const { missionName, items, totalPoints } = parseMissionDetails(currentDataText)

if (!missionName) {
  console.error('Could not find mission name in current-data.txt')
  console.error('Make sure the mission title ends with "-" or "[-]"')
  process.exit(1)
}

// Update mission-details.json
missionDetails[missionName] = items

// Write mission-details.json
writeFileSync(missionDetailsPath, JSON.stringify(missionDetails, null, 2))

// Update missions-structure.json if we found a points mission with calculated total
if (totalPoints !== null) {
  const mission = missionsStructure.missions.find(
    (m) => m.name.toLowerCase() === missionName.toLowerCase()
  )
  
  if (mission && mission.type === 'points') {
    mission.totalPoints = totalPoints
    writeFileSync(missionsStructurePath, JSON.stringify(missionsStructure, null, 2))
    console.log(`Updated mission "${missionName}" totalPoints to ${totalPoints}`)
  }
}

// Report
console.log(`\nUpdated mission-details.json for mission: "${missionName}"`)
console.log(`Found ${items.length} items`)
if (totalPoints !== null) {
  console.log(`Total points: ${totalPoints}`)
}

console.log('\nItems:')
items.slice(0, 5).forEach((item) => {
  console.log(`  - ${item}`)
})
if (items.length > 5) {
  console.log(`  ... and ${items.length - 5} more`)
}

/**
 * Parse mission details from OCR text
 */
function parseMissionDetails(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  
  let missionName = null
  const items = []
  let totalPointsSum = 0
  let hasPoints = false
  const seenCards = new Set()
  
  // Find the mission name (ends with "-" or "[-]" or "[-" or "[")
  for (const line of lines) {
    if (line.endsWith('-') || line.endsWith('[-]') || line.endsWith('[-') || line.endsWith('[')) {
      missionName = line
        .replace(/\s*-\s*$/, '')
        .replace(/\s*\[-\]\s*$/, '')
        .replace(/\s*\[-\s*$/, '')
        .replace(/\s*\[\s*$/, '')
        .trim()
      break
    }
  }
  
  // Look for card patterns: POSITION Name, TEAM, YEAR
  // Common positions: SP, RP, CL, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, OF
  const cardPattern = /\b(SP|RP|CL|C|1B|2B|3B|SS|LF|CF|RF|DH|OF)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2,3}),?\s*(\d{4}|\d{2,3})/g
  
  // First pass: extract all cards from lines that match the pattern
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip obvious non-card lines
    if (shouldSkipLine(line)) continue
    
    // Find all cards in this line
    let match
    while ((match = cardPattern.exec(line)) !== null) {
      const position = match[1]
      const name = match[2]
      const team = match[3]
      const year = match[4]
      
      const cardTitle = `${position} ${name}, ${team}, ${year}`
      
      // Avoid duplicates
      if (!seenCards.has(cardTitle)) {
        seenCards.add(cardTitle)
        
        // Try to find the points for this card by looking ahead
        const points = findPointsForCard(lines, i)
        if (points !== null) {
          items.push(cardTitle)
          totalPointsSum += points
          hasPoints = true
        } else {
          items.push(cardTitle)
        }
      }
    }
    
    // Also check for mission names: "Mission Name (Status)" or "Mission Name (Status, XX%)"
    const missionMatch = line.match(/^(.+?)\s*\((Incomplete|Complete)(,\s*\d+%)?\)\s*$/)
    if (missionMatch) {
      const missionTitle = missionMatch[1].trim()
      if (!shouldSkipLine(missionTitle) && missionTitle !== missionName) {
        items.push(missionTitle)
      }
    }
  }
  
  return {
    missionName,
    items,
    totalPoints: hasPoints ? totalPointsSum : null,
  }
}

/**
 * Find points value for a card by looking ahead a few lines
 */
function findPointsForCard(lines, startIndex) {
  // Look ahead up to 3 lines for a points value
  for (let i = startIndex; i < Math.min(startIndex + 3, lines.length); i++) {
    const match = lines[i].match(/\((\d+)\s*\/\s*(\d+)\s*PTS\)/i)
    if (match) {
      return parseInt(match[2], 10)
    }
  }
  return null
}

/**
 * Check if a line should be skipped
 */
function shouldSkipLine(line) {
  if (line.length < 5) return true
  
  const skipPatterns = [
    /^(Category|Mission Title|Added|Difficulty|Reward|Status|REWARDS?)/i,
    /^(No Sell|Orders?|BASEBALL|DIAMOND PACK|LAYERS|RUTURE)/i,
    /^(Search all|Required for|Duplicate card|LOHSHYNS|CRASEBAL|'BASERALL)/i,
    /^(AS|RLIMS ATOR|Il Reference|Holiday Times)/i,
    /^\d{1,3}$/,  // Just a number
    /^[A-Z]{1,2}$/,  // Just initials
  ]
  
  for (const pattern of skipPatterns) {
    if (pattern.test(line)) return true
  }
  
  return false
}

/**
 * Extract clean card title from OCR text
 * Cards typically have format: [Series] POSITION Name, TEAM, YEAR
 * Or: POSITION Name, TEAM, YEAR
 */
function extractCardTitle(text) {
  // Remove common OCR artifacts
  text = text.trim()
  
  // Skip lines that are too short or are obviously not card titles
  if (text.length < 5) return null
  if (text.match(/^(Category|Mission Title|Added|Difficulty|Reward|Status|REWARDS?|No Sell|Orders?|BASEBALL|DIAMOND PACK|Search all|Required for|Duplicate card)/i)) {
    return null
  }
  
  // Clean up prefixes like "Locked - "
  text = text.replace(/^Locked\s*-\s*/i, '')
  
  return text
}
