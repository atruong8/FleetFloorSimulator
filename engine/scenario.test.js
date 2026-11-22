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

test('a chain of robots moves together and REPORT lists their new positions', () => {
  const result = runScenario(`FLOOR 5,5
PLACE R1 0,0,EAST
PLACE R2 1,0,EAST
PLACE R3 2,0,EAST
QUEUE R1 MOVE
QUEUE R2 MOVE
QUEUE R3 MOVE
TICK
REPORT`)

  assert.deepEqual(result.reports, [
    'R1 1,0,EAST\nR2 2,0,EAST\nR3 3,0,EAST',
  ])
  assert.equal(result.tickCount, 1)
  assert.deepEqual(
    result.robots.map((robot) => robot.position),
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
  )
  assert.deepEqual(
    result.robots.map((robot) => robot.battery),
    [99, 99, 99],
  )
})

test('a head-on swap is blocked and REPORT shows both robots in place', () => {
  const result = runScenario(`PLACE R1 0,0,EAST
PLACE R2 1,0,WEST
QUEUE R1 MOVE
QUEUE R2 MOVE
TICK
REPORT`)

  assert.deepEqual(result.reports, ['R1 0,0,EAST\nR2 1,0,WEST'])
  assert.deepEqual(
    result.robots.map((robot) => robot.position),
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  )
})

test('a contested cell blocks the higher-ID robot and the robot behind it', () => {
  const result = runScenario(`PLACE R1 0,1,EAST
PLACE R2 2,1,WEST
PLACE R3 3,1,WEST
QUEUE R1 MOVE
QUEUE R2 MOVE
QUEUE R3 MOVE
TICK
REPORT`)

  assert.deepEqual(result.reports, [
    'R1 1,1,EAST\nR2 2,1,WEST\nR3 3,1,WEST',
  ])
})

test('four robots can move together in a closed rotation', () => {
  const result = runScenario(`PLACE R1 0,0,NORTH
PLACE R2 0,1,EAST
PLACE R3 1,1,SOUTH
PLACE R4 1,0,WEST
QUEUE R1 MOVE
QUEUE R2 MOVE
QUEUE R3 MOVE
QUEUE R4 MOVE
TICK
REPORT`)

  assert.deepEqual(result.reports, [
    'R1 0,1,NORTH\nR2 1,1,EAST\nR3 1,0,SOUTH\nR4 0,0,WEST',
  ])
})

test('queues of different lengths continue across multiple TICK commands', () => {
  const result = runScenario(`FLOOR 4,3
PLACE R2 0,0,NORTH
PLACE R1 3,2,WEST
QUEUE R2 MOVE RIGHT MOVE MOVE MOVE MOVE
QUEUE R1 MOVE LEFT
TICK 3
REPORT
TICK 10
REPORT`)

  assert.deepEqual(result.reports, [
    'R1 2,2,SOUTH\nR2 1,1,EAST',
    'R1 2,2,SOUTH\nR2 3,1,EAST',
  ])
  assert.equal(result.tickCount, 13)
})

test('OBSTACLE blocks a robot MOVE and appears on the floor', () => {
  const result = runScenario(`FLOOR 5,5
PLACE R1 1,1,EAST
OBSTACLE 2,1
QUEUE R1 MOVE
TICK
REPORT`)

  assert.deepEqual(result.floor.obstacles, [{ x: 2, y: 1 }])
  assert.deepEqual(result.reports, ['R1 1,1,EAST'])
  assert.deepEqual(result.robots[0].queue, [])
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
