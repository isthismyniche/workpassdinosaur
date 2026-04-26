/**
 * Import approved questions from the review TSV into Supabase.
 * Usage: npx tsx scripts/import-questions.ts
 *
 * Reads data/review/questions-for-review.tsv, filters approved=Y rows,
 * validates, dedupes, and inserts into the questions table with date=NULL.
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'

const REVIEW_FILE = join(process.cwd(), 'data/review/questions-for-review.tsv')

const VALID_CATEGORIES = new Set(['policies', 'processes', 'systems'])
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D'])

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
    process.exit(1)
  }
  return createClient(url, key)
}

// Split TSV content into rows, respecting quoted fields that may contain newlines
function splitTsvRows(content: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (inQuotes) {
      if (char === '"' && content[i + 1] === '"') { current += '"'; i++ }
      else if (char === '"') { inQuotes = false; current += char }
      else { current += char }
    } else {
      if (char === '"') { inQuotes = true; current += char }
      else if (char === '\n') { if (current.trim()) rows.push(current); current = '' }
      else { current += char }
    }
  }
  if (current.trim()) rows.push(current)
  return rows
}

function parseTsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { current += char }
    } else {
      if (char === '"') { inQuotes = true }
      else if (char === '\t') { fields.push(current); current = '' }
      else { current += char }
    }
  }
  fields.push(current)
  return fields
}

async function main() {
  const dotenv = await import('dotenv')
  dotenv.config()

  const supabase = getSupabase()

  let content: string
  try {
    content = await readFile(REVIEW_FILE, 'utf-8')
  } catch {
    console.error(`Review file not found: ${REVIEW_FILE}`)
    console.error('Run a drafting session first to generate the TSV.')
    process.exit(1)
  }

  const lines = splitTsvRows(content)
  if (lines.length < 2) {
    console.log('No data rows found in TSV.')
    process.exit(0)
  }

  const headers = parseTsvLine(lines[0])
  const col = Object.fromEntries(headers.map((h, i) => [h.trim(), i]))

  const required = ['source_url', 'category', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation', 'approved']
  for (const h of required) {
    if (!(h in col)) {
      console.error(`Missing required TSV column: ${h}`)
      process.exit(1)
    }
  }

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const fields = parseTsvLine(lines[i])
    const get = (c: string) => (fields[col[c]] ?? '').trim()

    if (!['Y', 'YES'].includes(get('approved').toUpperCase())) { skipped++; continue }

    const row = {
      source_url:       get('source_url'),
      category:         get('category').toLowerCase(),
      question_text:    get('question_text'),
      option_a:         get('option_a'),
      option_b:         get('option_b'),
      option_c:         get('option_c'),
      option_d:         get('option_d'),
      correct_option:   get('correct_option').toUpperCase(),
      explanation:      get('explanation'),
      source_fetched_at: get('source_fetched_at') || null,
      difficulty:       get('difficulty') || 'hard',
    }

    // Validate
    if (!row.question_text) {
      console.warn(`Row ${i + 1}: empty question_text — skipping`); errors++; continue
    }
    if (!VALID_CATEGORIES.has(row.category)) {
      console.warn(`Row ${i + 1}: invalid category "${row.category}" — skipping`); errors++; continue
    }
    if (!VALID_OPTIONS.has(row.correct_option)) {
      console.warn(`Row ${i + 1}: invalid correct_option "${row.correct_option}" — skipping`); errors++; continue
    }
    if (!row.source_url) {
      console.warn(`Row ${i + 1}: missing source_url — skipping`); errors++; continue
    }

    // Dedupe by question_text only — multiple questions per source_url are allowed
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('question_text', row.question_text)
      .limit(1)

    if (existing && existing.length > 0) {
      console.warn(`Row ${i + 1}: duplicate question_text — skipping`)
      skipped++
      continue
    }

    const { error: insertErr } = await supabase.from('questions').insert({ ...row, date: null })

    if (insertErr) {
      console.warn(`Row ${i + 1}: insert failed — ${insertErr.message}`); errors++
    } else {
      console.log(`  ✓ [${row.category}] ${row.question_text.slice(0, 60)}…`)
      imported++
    }
  }

  console.log(`\n=== Import summary ===`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped (not approved or duplicate): ${skipped}`)
  console.log(`Errors: ${errors}`)
}

main().catch(console.error)
