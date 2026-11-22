import { isInsideFloor } from './floor.js'

const FACINGS = new Set(['NORTH', 'EAST', 'SOUTH', 'WEST'])

export function createRobot(id, position, facing = 'NORTH') {
  if (typeof id !== 'string' || !/^R[1-9]\d*$/i.test(id)) {
    throw new RangeError('Robot ID must be R followed by a positive number')
  }

  if (
    !position ||
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    position.x < 0 ||
    position.y < 0
  ) {
    throw new RangeError('Robot position must use non-negative integer coordinates')
  }

  if (typeof facing !== 'string' || !FACINGS.has(facing.toUpperCase())) {
    throw new RangeError('Robot facing must be NORTH, EAST, SOUTH, or WEST')
  }

  return {
    id: id.toUpperCase(),
    position: { x: position.x, y: position.y },
    facing: facing.toUpperCase(),
    battery: 100,
    queue: [],
  }
}

// Scenario PLACE ignores invalid positions and preserves state when repositioning.
export function placeScenarioRobot(floor, robots, id, position, facing) {
  let robot
  try {
    robot = createRobot(id, position, facing)
  } catch (error) {
    if (error instanceof RangeError) {
      return robots
    }
    throw error
  }

  if (!isInsideFloor(floor, robot.position)) {
    return robots
  }

  const existingRobotIndex = robots.findIndex(
    (existingRobot) => existingRobot.id === robot.id,
  )
  const otherRobots = robots.filter((_, index) => index !== existingRobotIndex)
  const isOccupied = otherRobots.some(
    (existingRobot) =>
      existingRobot.position.x === robot.position.x &&
      existingRobot.position.y === robot.position.y,
  )
  const hasObstacle = floor.obstacles.some(
    (obstacle) =>
      obstacle.x === robot.position.x && obstacle.y === robot.position.y,
  )

  if (isOccupied || hasObstacle) {
    return robots
  }

  if (existingRobotIndex === -1) {
    return [...robots, robot]
  }

  // Repositioning preserves battery and queued commands.
  robot.battery = robots[existingRobotIndex].battery
  robot.queue = robots[existingRobotIndex].queue
  return robots.map((existingRobot, index) =>
    index === existingRobotIndex ? robot : existingRobot,
  )
}
