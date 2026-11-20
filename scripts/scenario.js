import { readFileSync } from 'node:fs'
import { runScenario } from '../engine/scenario.js'

const scenarioPath = process.argv[2]

if (!scenarioPath) {
  console.error('Usage: npm run scenario -- <scenario-file>')
  process.exitCode = 1
} else {
  const input = readFileSync(scenarioPath, 'utf8')
  const { reports } = runScenario(input)

  if (reports.length > 0) {
    console.log(reports.join('\n'))
  }
}
