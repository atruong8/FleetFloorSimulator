import assert from 'node:assert/strict'
import test from 'node:test'

import { createFloor } from './floor.js'
import { createRobot } from './robot.js'
import { placeRobot, queueRobotCommand } from './world.js'

test('placeRobot creates a north-facing robot with the next free ID', () => {
  const floor = createFloor(4, 3)
  const existingRobots = [
    createRobot('R1', { x: 0, y: 0 }),
    createRobot('R3', { x: 2, y: 0 }),
  ]

  const result = placeRobot(floor, existingRobots, { x: 1, y: 0 })

  assert.equal(result.robot.id, 'R2')
  assert.equal(result.robot.facing, 'NORTH')
  assert.deepEqual(result.robot.position, { x: 1, y: 0 })
  assert.deepEqual(result.robots.slice(0, 2), existingRobots)
  assert.equal(existingRobots.length, 2)
})

test('placeRobot rejects positions outside the floor, on obstacles, or on robots', () => {
  const floor = {
    ...createFloor(3, 2),
    obstacles: [{ x: 1, y: 0 }],
  }
  const robots = [createRobot('R1', { x: 0, y: 0 })]

  assert.throws(
    () => placeRobot(floor, robots, { x: 3, y: 0 }),
    /within floor bounds/,
  )
  assert.throws(
    () => placeRobot(floor, robots, { x: 1, y: 0 }),
    /on an obstacle/,
  )
  assert.throws(
    () => placeRobot(floor, robots, { x: 0, y: 0 }),
    /on another robot/,
  )
  assert.equal(robots.length, 1)
})

test('queueRobotCommand appends commands only to the selected robot', () => {
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }), queue: ['LEFT'] },
    createRobot('R2', { x: 1, y: 0 }),
  ]

  const updatedRobots = queueRobotCommand(robots, 'R1', 'MOVE')

  assert.deepEqual(updatedRobots[0].queue, ['LEFT', 'MOVE'])
  assert.deepEqual(updatedRobots[1], robots[1])
  assert.deepEqual(robots[0].queue, ['LEFT'])
})

test('queueRobotCommand rejects unknown robots and unsupported commands', () => {
  const robots = [createRobot('R1', { x: 0, y: 0 })]

  assert.throws(
    () => queueRobotCommand(robots, 'R2', 'MOVE'),
    /Robot R2 does not exist/,
  )
  assert.throws(
    () => queueRobotCommand(robots, 'R1', 'UP'),
    /must be MOVE, LEFT, or RIGHT/,
  )
})
