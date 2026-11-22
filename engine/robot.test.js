import assert from 'node:assert/strict'
import test from 'node:test'

import { createRobot, placeScenarioRobot } from './robot.js'
import { createFloor } from './floor.js'

test('createRobot initializes a robot facing north with an empty queue', () => {
  assert.deepEqual(createRobot('R1', { x: 0, y: 0 }), {
    id: 'R1',
    position: { x: 0, y: 0 },
    facing: 'NORTH',
    battery: 100,
    queue: [],
  })
})

test('createRobot normalizes ID and facing to uppercase', () => {
  assert.deepEqual(createRobot('r2', { x: 1, y: 3 }, 'west'), {
    id: 'R2',
    position: { x: 1, y: 3 },
    facing: 'WEST',
    battery: 100,
    queue: [],
  })
})

test('createRobot rejects invalid IDs, coordinates, and facings', () => {
  assert.throws(() => createRobot('R0', { x: 0, y: 0 }), RangeError)
  assert.throws(() => createRobot('robot1', { x: 0, y: 0 }), RangeError)
  assert.throws(() => createRobot('R1', { x: -1, y: 0 }), RangeError)
  assert.throws(() => createRobot('R1', { x: 0, y: 1.5 }), RangeError)
  assert.throws(() => createRobot('R1', { x: 0, y: 0 }, 'NORTHEAST'), RangeError)
})

test('placeScenarioRobot adds explicit IDs and repositions while preserving state', () => {
  const floor = createFloor(3, 2)
  const existing = {
    ...createRobot('R1', { x: 0, y: 0 }),
    battery: 62,
    queue: ['MOVE'],
  }
  const placed = placeScenarioRobot(floor, [existing], 'R2', { x: 1, y: 0 }, 'WEST')
  const repositioned = placeScenarioRobot(
    floor,
    [existing],
    'R1',
    { x: 2, y: 1 },
    'EAST',
  )

  assert.equal(placed[1].id, 'R2')
  assert.equal(placed[1].facing, 'WEST')
  assert.deepEqual(repositioned[0], {
    ...existing,
    position: { x: 2, y: 1 },
    facing: 'EAST',
  })
})

test('placeScenarioRobot ignores invalid, occupied, and obstacle positions', () => {
  const floor = {
    ...createFloor(3, 2),
    obstacles: [{ x: 2, y: 0 }],
  }
  const robots = [
    createRobot('R1', { x: 0, y: 0 }),
    createRobot('R2', { x: 1, y: 0 }),
  ]

  assert.equal(
    placeScenarioRobot(floor, robots, 'R3', { x: 3, y: 0 }, 'NORTH'),
    robots,
  )
  assert.equal(
    placeScenarioRobot(floor, robots, 'R3', { x: 1, y: 0 }, 'NORTH'),
    robots,
  )
  assert.equal(
    placeScenarioRobot(floor, robots, 'R3', { x: 2, y: 0 }, 'NORTH'),
    robots,
  )
})
