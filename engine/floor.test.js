import assert from 'node:assert/strict'
import test from 'node:test'

import { createFloor, isInsideFloor } from './floor.js'

test('createFloor defaults to a 10 by 8 empty floor', () => {
  assert.deepEqual(createFloor(), {
    width: 10,
    height: 8,
    obstacles: [],
    chargers: [],
  })
})

test('createFloor accepts sizes from 1 through 20', () => {
  assert.deepEqual(createFloor(1, 20), {
    width: 1,
    height: 20,
    obstacles: [],
    chargers: [],
  })

  for (const size of [0, 21, 1.5, '5']) {
    assert.throws(() => createFloor(size, 8), RangeError)
  }
})

test('isInsideFloor includes the edges and rejects invalid positions', () => {
  const floor = createFloor(3, 2)

  assert.equal(isInsideFloor(floor, { x: 0, y: 0 }), true)
  assert.equal(isInsideFloor(floor, { x: 2, y: 1 }), true)
  assert.equal(isInsideFloor(floor, { x: 3, y: 1 }), false)
  assert.equal(isInsideFloor(floor, { x: 1, y: -1 }), false)
  assert.equal(isInsideFloor(floor, { x: 1.5, y: 1 }), false)
})
