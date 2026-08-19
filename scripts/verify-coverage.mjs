import { existsSync, readFileSync } from 'node:fs'

const coveragePath = process.env.COVERAGE_LCOV_PATH ?? 'coverage/OpenAPIVisualiser/lcov.info'

if (!existsSync(coveragePath)) {
  console.error(`Coverage report not found: ${coveragePath}`)
  process.exit(1)
}

const records = readFileSync(coveragePath, 'utf8')
  .split('end_of_record')
  .filter((record) => /^SF:src\//m.test(record))

const lineTotals = records.reduce((totals, record) => {
  const linesFound = Number(record.match(/^LF:(\d+)/m)?.[1] ?? 0)
  const linesHit = Number(record.match(/^LH:(\d+)/m)?.[1] ?? 0)

  return {
    found: totals.found + linesFound,
    hit: totals.hit + linesHit
  }
}, {found: 0, hit: 0})

if (records.length === 0 || lineTotals.found === 0) {
  console.error(`Coverage report contains no instrumented source files: ${coveragePath}`)
  process.exit(1)
}

const percentage = (lineTotals.hit / lineTotals.found * 100).toFixed(2)
console.log(`Coverage verified: ${lineTotals.hit}/${lineTotals.found} lines (${percentage}%)`)
