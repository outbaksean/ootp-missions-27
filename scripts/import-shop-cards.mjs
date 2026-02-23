/**
 * Converts a raw OOTP card shop CSV export to the slim format used by the app.
 * Run this whenever you export a fresh card list from the game.
 *
 * Usage (run from repo root):
 *   node scripts/import-shop-cards.mjs <path-to-game-export.csv>
 *
 * Example:
 *   node scripts/import-shop-cards.mjs ../ootp-missions-2/ootp-missions/src/data/shop_cards_initial.csv
 *
 * Output: app/public/data/shop_cards.csv
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/import-shop-cards.mjs <path-to-game-export.csv>')
  process.exit(1)
}

const src = readFileSync(resolve(inputPath), 'utf8')
const lines = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim().length > 0)

if (lines.length < 2) {
  console.error('Input file appears empty.')
  process.exit(1)
}

// Parse header to find column indices for the fields we read from the source
const header = parseCSVLine(lines[0])
const SOURCE_COLUMNS = ['//Card Title', 'Card ID', 'Card Value', 'Card Type', 'Card Badge']

const indices = {}
for (const col of SOURCE_COLUMNS) {
  const idx = header.indexOf(col)
  if (idx === -1) {
    console.error(`Required column "${col}" not found in header.`)
    console.error('Available columns:', header.join(', '))
    process.exit(1)
  }
  indices[col] = idx
}

// Output columns match the app's expected CSV format.
// Sell Order Low, Last 10 Price, and owned are zeroed out — the user's own
// in-game export will overwrite these when uploaded through the app.
const OUTPUT_HEADER = '//Card Title,Card ID,Card Value,Card Type,Card Badge,Sell Order Low,Last 10 Price,owned'
const outputLines = [OUTPUT_HEADER]

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i])
  if (row.length < header.length) continue // skip malformed rows

  const title = row[indices['//Card Title']] ?? ''
  const cardId = row[indices['Card ID']] ?? ''
  const cardValue = row[indices['Card Value']] ?? ''
  const cardType = row[indices['Card Type']] ?? ''
  const cardBadge = row[indices['Card Badge']] ?? ''

  // Quote title if it contains a comma
  const safeTitle = title.includes(',') ? `"${title.replace(/"/g, '""')}"` : title

  outputLines.push(`${safeTitle},${cardId},${cardValue},${cardType},${cardBadge},0,0,0`)
}

const outputPath = resolve(__dirname, '../app/public/data/shop_cards.csv')
writeFileSync(outputPath, outputLines.join('\n') + '\n')
console.log(`Wrote ${outputLines.length - 1} cards to ${outputPath}`)

// Minimal CSV line parser (handles quoted fields)
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
