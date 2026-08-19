import { existsSync, readFileSync } from 'node:fs'

const coveragePath = process.env.COVERAGE_LCOV_PATH ?? 'coverage/OpenAPIVisualiser/lcov.info'
const minimumLineCoverage = 80
const minimumBranchCoverage = 60

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
  const branchesFound = Number(record.match(/^BRF:(\d+)/m)?.[1] ?? 0)
  const branchesHit = Number(record.match(/^BRH:(\d+)/m)?.[1] ?? 0)

  return {
    found: totals.found + linesFound,
    hit: totals.hit + linesHit,
    branchesFound: totals.branchesFound + branchesFound,
    branchesHit: totals.branchesHit + branchesHit
  }
}, {found: 0, hit: 0, branchesFound: 0, branchesHit: 0})

if (records.length === 0 || lineTotals.found === 0) {
  console.error(`Coverage report contains no instrumented source files: ${coveragePath}`)
  process.exit(1)
}

const linePercentage = lineTotals.hit / lineTotals.found * 100
const branchPercentage = lineTotals.branchesFound === 0
  ? 100
  : lineTotals.branchesHit / lineTotals.branchesFound * 100

if (linePercentage < minimumLineCoverage || branchPercentage < minimumBranchCoverage) {
  console.error(
    `Coverage below thresholds: lines ${linePercentage.toFixed(2)}% (minimum ${minimumLineCoverage}%), ` +
    `branches ${branchPercentage.toFixed(2)}% (minimum ${minimumBranchCoverage}%).`
  )
  process.exit(1)
}

console.log(
  `Coverage verified: ${lineTotals.hit}/${lineTotals.found} lines (${linePercentage.toFixed(2)}%), ` +
  `${lineTotals.branchesHit}/${lineTotals.branchesFound} branches (${branchPercentage.toFixed(2)}%)`
)
