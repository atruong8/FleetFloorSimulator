import assert from 'node:assert/strict'
import test from 'node:test'

import { createRobot } from './robot.js'

test('createRobot initializes a robot facing north with an empty queue', () => {
  assert.deepEqual(createRobot('R1', { x: 0, y: 0 }), {
    id: 'R1',
    position: { x: 0, y: 0 },
    facing: 'NORTH',
    queue: [],
  })
})

test('createRobot normalizes ID and facing to uppercase', () => {
  assert.deepEqual(createRobot('r2', { x: 1, y: 3 }, 'west'), {
    id: 'R2',
    position: { x: 1, y: 3 },
    facing: 'WEST',
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
