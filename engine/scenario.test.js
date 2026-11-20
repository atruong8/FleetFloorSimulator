import assert from 'node:assert/strict'
import test from 'node:test'

import { runScenario } from './scenario.js'

test('FLOOR creates the requested floor and REPORT prints EMPTY', () => {
  const result = runScenario('FLOOR 4,3\nREPORT')

  assert.deepEqual(result.floor, {
    width: 4,
    height: 3,
    obstacles: [],
  })
  assert.deepEqual(result.reports, ['EMPTY'])
})

test('scenario defaults to a 5 by 5 floor and ignores blank and comment lines', () => {
  const result = runScenario('\n# default floor\n\nreport\n')

  assert.deepEqual(result.floor, {
    width: 5,
    height: 5,
    obstacles: [],
  })
  assert.deepEqual(result.reports, ['EMPTY'])
})

test('scenario defaults when it has no valid FLOOR command', () => {
  const result = runScenario('FLOOR 0,25\nUNKNOWN COMMAND')

  assert.deepEqual(result.floor, {
    width: 5,
    height: 5,
    obstacles: [],
  })
  assert.deepEqual(result.reports, [])
})

test('scenario commands are case-insensitive and invalid floor sizes are ignored', () => {
  const result = runScenario('floor 0,25\nFloor 2,3\nREPORT')

  assert.deepEqual(result.floor, {
    width: 2,
    height: 3,
    obstacles: [],
  })
  assert.deepEqual(result.reports, ['EMPTY'])
})
