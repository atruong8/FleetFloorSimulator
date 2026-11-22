import assert from 'node:assert/strict'
import test from 'node:test'

import { createFloor } from './floor.js'
import { createRobot } from './robot.js'
import {
  advanceTick,
  placeRobot,
  queueRobotCommand,
} from './world.js'

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

test('advanceTick turns robots in place and leaves idle robots unchanged', () => {
  const floor = createFloor(3, 3)
  const robots = [
    { ...createRobot('R1', { x: 1, y: 1 }), queue: ['LEFT', 'RIGHT'] },
    { ...createRobot('R2', { x: 2, y: 2 }, 'NORTH'), queue: ['RIGHT'] },
    createRobot('R3', { x: 0, y: 0 }, 'WEST'),
  ]

  const result = advanceTick(floor, robots)

  assert.equal(result.robots[0].facing, 'WEST')
  assert.deepEqual(result.robots[0].queue, ['RIGHT'])
  assert.equal(result.robots[1].facing, 'EAST')
  assert.deepEqual(result.robots[1].queue, [])
  assert.deepEqual(result.robots[2], robots[2])
  assert.deepEqual(
    result.results.map(({ robotId, action, command }) => ({
      robotId,
      action,
      command,
    })),
    [
      { robotId: 'R1', action: 'turned', command: 'LEFT' },
      { robotId: 'R2', action: 'turned', command: 'RIGHT' },
      { robotId: 'R3', action: 'idle', command: undefined },
    ],
  )
})

test('advanceTick turns correctly from each of the four facings', () => {
  const floor = createFloor(8, 1)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'NORTH'), queue: ['LEFT'] },
    { ...createRobot('R2', { x: 1, y: 0 }, 'NORTH'), queue: ['RIGHT'] },
    { ...createRobot('R3', { x: 2, y: 0 }, 'EAST'), queue: ['LEFT'] },
    { ...createRobot('R4', { x: 3, y: 0 }, 'EAST'), queue: ['RIGHT'] },
    { ...createRobot('R5', { x: 4, y: 0 }, 'SOUTH'), queue: ['LEFT'] },
    { ...createRobot('R6', { x: 5, y: 0 }, 'SOUTH'), queue: ['RIGHT'] },
    { ...createRobot('R7', { x: 6, y: 0 }, 'WEST'), queue: ['LEFT'] },
    { ...createRobot('R8', { x: 7, y: 0 }, 'WEST'), queue: ['RIGHT'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(
    result.robots.map((robot) => robot.facing),
    ['WEST', 'EAST', 'NORTH', 'SOUTH', 'EAST', 'WEST', 'SOUTH', 'NORTH'],
  )
})

test('advanceTick consumes a move blocked by a wall or obstacle', () => {
  const floor = {
    ...createFloor(3, 2),
    obstacles: [{ x: 1, y: 0 }],
  }
  const robots = [
    { ...createRobot('R1', { x: 2, y: 0 }, 'EAST'), queue: ['MOVE', 'LEFT'] },
    { ...createRobot('R2', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(
    result.results.map(({ action, reason }) => ({ action, reason })),
    [
      { action: 'blocked', reason: 'WALL' },
      { action: 'blocked', reason: 'OBSTACLE' },
    ],
  )
  assert.deepEqual(result.robots.map((robot) => robot.queue), [['LEFT'], []])
})

test('only successful MOVE commands consume battery', () => {
  const floor = createFloor(3, 2)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 2, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R3', { x: 0, y: 1 }), queue: ['LEFT'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(
    result.robots.map((robot) => robot.battery),
    [99, 100, 100],
  )
})

test('robots recharge by 10 at tick end on chargers, capped at 100', () => {
  const floor = {
    ...createFloor(3, 1),
    chargers: [{ x: 1, y: 0 }],
  }
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'EAST'), battery: 95, queue: ['MOVE'] },
    { ...createRobot('R2', { x: 2, y: 0 }), battery: 90, queue: [] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.robots.map((robot) => robot.battery), [100, 90])
  assert.deepEqual(
    result.results.map((entry) => entry.battery),
    [100, 90],
  )
})

test('a robot on a charger recharges after a blocked move', () => {
  const floor = {
    ...createFloor(1, 1),
    chargers: [{ x: 0, y: 0 }],
  }
  const robot = {
    ...createRobot('R1', { x: 0, y: 0 }),
    battery: 0,
    queue: ['MOVE'],
  }

  const result = advanceTick(floor, [robot])

  assert.equal(result.results[0].reason, 'NO_BATTERY')
  assert.equal(result.robots[0].battery, 10)
})

test('a zero-battery robot cannot move and records NO_BATTERY', () => {
  const floor = createFloor(2, 1)
  const robot = {
    ...createRobot('R1', { x: 0, y: 0 }, 'EAST'),
    battery: 0,
    queue: ['MOVE', 'LEFT'],
  }

  const result = advanceTick(floor, [robot])

  assert.deepEqual(result.results[0], {
    robotId: 'R1',
    action: 'blocked',
    battery: 0,
    command: 'MOVE',
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    reason: 'NO_BATTERY',
  })
  assert.deepEqual(result.robots[0].position, { x: 0, y: 0 })
  assert.equal(result.robots[0].battery, 0)
  assert.deepEqual(result.robots[0].queue, ['LEFT'])
})

test('advanceTick resolves contested destinations by numeric robot ID', () => {
  const floor = createFloor(3, 1)
  const robots = [
    { ...createRobot('R10', { x: 2, y: 0 }, 'WEST'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.robots.map((robot) => robot.position), [
    { x: 2, y: 0 },
    { x: 1, y: 0 },
  ])
  assert.deepEqual(
    result.results.map(({ action, reason }) => ({ action, reason })),
    [
      { action: 'blocked', reason: 'CONTESTED' },
      { action: 'moved', reason: undefined },
    ],
  )
})

test('advanceTick blocks head-on swaps and consumes both moves', () => {
  const floor = createFloor(2, 1)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 1, y: 0 }, 'WEST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.robots.map((robot) => robot.position), [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ])
  assert.deepEqual(
    result.results.map(({ action, reason }) => ({ action, reason })),
    [
      { action: 'blocked', reason: 'SWAP' },
      { action: 'blocked', reason: 'SWAP' },
    ],
  )
  assert.deepEqual(result.robots.map((robot) => robot.queue), [[], []])
})

test('advanceTick lets a chain follow robots that move out', () => {
  const floor = createFloor(4, 1)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 1, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R3', { x: 2, y: 0 }, 'EAST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.robots.map((robot) => robot.position), [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ])
  assert.deepEqual(result.results.map((entry) => entry.action), [
    'moved',
    'moved',
    'moved',
  ])
})

test('advanceTick blocks a following chain behind a robot blocked by a wall', () => {
  const floor = createFloor(3, 1)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 1, y: 0 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R3', { x: 2, y: 0 }, 'EAST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.results.map(({ action, reason }) => [action, reason]), [
    ['blocked', 'BLOCKED_BY_ROBOT'],
    ['blocked', 'BLOCKED_BY_ROBOT'],
    ['blocked', 'WALL'],
  ])
  assert.deepEqual(result.results.map((entry) => entry.blockedBy), [
    'R2',
    'R3',
    undefined,
  ])
  assert.deepEqual(result.robots.map((robot) => robot.position), [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ])
})

test('advanceTick allows a four-robot rotation loop', () => {
  const floor = createFloor(2, 2)
  const robots = [
    { ...createRobot('R1', { x: 0, y: 0 }, 'NORTH'), queue: ['MOVE'] },
    { ...createRobot('R2', { x: 0, y: 1 }, 'EAST'), queue: ['MOVE'] },
    { ...createRobot('R3', { x: 1, y: 1 }, 'SOUTH'), queue: ['MOVE'] },
    { ...createRobot('R4', { x: 1, y: 0 }, 'WEST'), queue: ['MOVE'] },
  ]

  const result = advanceTick(floor, robots)

  assert.deepEqual(result.robots.map((robot) => robot.position), [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: 0 },
  ])
  assert.deepEqual(result.results.map((entry) => entry.action), [
    'moved',
    'moved',
    'moved',
    'moved',
  ])
})
