#!/usr/bin/env node
/**
 * insert-missions-structure.mjs
 *
 * Reads OCR-extracted mission data from current-data.txt and inserts missions
 * into missions-structure.json, avoiding duplicates.
 *
 * The input file (current-data.txt) contains OCR output with the following sections:
 *   Category, Mission Title, Added, Difficulty, Reward, Status
 *
 * Usage: node insert-missions-structure.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const currentDataPath = join(__dirname, './current-data.txt')
const missionsStructurePath = join(__dirname, './missions-structure.json')

// Read files
let currentDataText
let missionsStructure

try {
  currentDataText = readFileSync(currentDataPath, 'utf8')
  missionsStructure = JSON.parse(readFileSync(missionsStructurePath, 'utf8'))
} catch (err) {
  console.error(`Error reading files: ${err.message}`)
  process.exit(1)
}

// Parse the OCR data
const sections = parseSections(currentDataText)
const missions = assembleMissions(sections)

// Filter out duplicates
const existingMissionNames = new Set(
  missionsStructure.missions.map((m) => m.name.toLowerCase())
)

const newMissions = missions.filter(
  (m) => !existingMissionNames.has(m.name.toLowerCase())
)

// Add new missions to structure
missionsStructure.missions.push(...newMissions)

// Write updated structure
writeFileSync(missionsStructurePath, JSON.stringify(missionsStructure, null, 2))

// Report
console.log(`Added ${newMissions.length} new missions to missions-structure.json`)
console.log(`Total missions: ${missionsStructure.missions.length}`)

if (newMissions.length > 0) {
  console.log('\nNew missions added:')
  newMissions.forEach((m) => {
    console.log(`  - ${m.category}: ${m.name}`)
  })
}

/**
 * Parse the OCR text into sections
 */
function parseSections(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

  const sections = {
    category: [],
    missionTitle: [],
    added: [],
    difficulty: [],
    reward: [],
    status: [],
  }

  let currentSection = null

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (lower === 'category') {
      currentSection = 'category'
    } else if (lower === 'mission title') {
      currentSection = 'missionTitle'
    } else if (lower === 'added') {
      currentSection = 'added'
    } else if (lower === 'difficulty') {
      currentSection = 'difficulty'
    } else if (lower === 'reward') {
      currentSection = 'reward'
    } else if (lower === 'status') {
      currentSection = 'status'
    } else if (currentSection) {
      sections[currentSection].push(line)
    }
  }

  return sections
}

/**
 * Assemble missions from parsed sections
 */
function assembleMissions(sections) {
  const missions = []
  const missionCount = sections.missionTitle.length

  // Build a map of rewards and statuses (they may span multiple lines)
  const rewards = groupMultilineData(sections.reward, missionCount)
  const statuses = groupMultilineData(sections.status, missionCount)

  let missionId = 1

  for (let i = 0; i < missionCount; i++) {
    const name = cleanMissionName(sections.missionTitle[i] || '')
    
    // Only add if name is not empty
    if (!name) {
      continue
    }

    const statusStr = statuses[i] || ''
    const { type, requiredCount, totalPoints } = parseStatus(statusStr)

    const mission = {
      id: missionId++,
      name: name,
      type: type,
      requiredCount: requiredCount,
      reward: rewards[i] || '',
      category: sections.category[i] || '',
      cards: [], // Will be populated in later stages
      rewards: [], // Will be parsed from reward string
    }

    // Only include totalPoints if it was set by parseStatus
    if (totalPoints !== undefined) {
      mission.totalPoints = totalPoints
    }

    missions.push(mission)
  }

  return missions
}

/**
 * Group multiline data back to mission count.
 * Heuristic: rewards and statuses often span multiple lines.
 * We group them by looking at the pattern of non-empty lines.
 */
function groupMultilineData(lines, expectedCount) {
  const result = []

  if (lines.length === 0) {
    return Array(expectedCount).fill('')
  }

  // Simple heuristic: if we have significantly more lines than missions,
  // group them. Otherwise, assume one line per mission.
  if (lines.length > expectedCount * 1.2) {
    // Group lines - estimate groups by dividing evenly
    const groupSize = Math.ceil(lines.length / expectedCount)
    for (let i = 0; i < expectedCount; i++) {
      const start = i * groupSize
      const end = Math.min((i + 1) * groupSize, lines.length)
      const group = lines.slice(start, end).join(' | ')
      result.push(group)
    }
  } else {
    // One line per mission
    for (let i = 0; i < expectedCount; i++) {
      result.push(lines[i] || '')
    }
  }

  return result
}

/**
 * Parse status string to extract type, requiredCount, and totalPoints
 * Examples:
 *   "0 / 10 Missions - 0%"       -> { type: "mission", requiredCount: 10 }
 *   "0 / any 22 out of 22 - 0%"  -> { type: "count", requiredCount: 22, totalPoints: 22 }
 *   "0 / any 6 out of 11 - 0%"   -> { type: "count", requiredCount: 6, totalPoints: 11 }
 *   "135 / 510 points - 26%"     -> { type: "points", requiredCount: 510, totalPoints: 0 }
 */
function parseStatus(status) {
  const defaultResult = { type: 'count', requiredCount: 0, totalPoints: 0 }

  if (!status) {
    return defaultResult
  }

  // Check if it's a "Missions" type (e.g., "0 / 10 Missions")
  if (status.includes('/ ') && status.includes('Missions') && !status.includes('out of')) {
    const match = status.match(/\/\s*(\d+)\s*Missions/)
    if (match) {
      const count = parseInt(match[1], 10)
      return { type: 'mission', requiredCount: count }
    }
  }

  // Check if it's a points-based mission
  if (status.includes('points')) {
    const match = status.match(/\/\s*(\d+)\s*points/)
    if (match) {
      const count = parseInt(match[1], 10)
      return { type: 'points', requiredCount: count, totalPoints: 0 }
    }
  }

  // Check if it's a count-based mission (with "out of" pattern: "any X out of Y")
  if (status.includes('out of')) {
    const match = status.match(/any\s+(\d+)\s+out of\s+(\d+)/)
    if (match) {
      const requiredCount = parseInt(match[1], 10)
      const totalPoints = parseInt(match[2], 10)
      return { type: 'count', requiredCount, totalPoints }
    }
  }

  return defaultResult
}

/**
 * Clean up mission name by removing OCR artifacts like [+] or extra whitespace
 */
function cleanMissionName(name) {
  return name
    .replace(/\[\+\]/g, '')
    .replace(/\s+\+\s*$/g, '')
    .trim()
}
