import { isInsideFloor } from './floor.js'
import { createRobot } from './robot.js'

const ROBOT_COMMANDS = new Set(['MOVE', 'LEFT', 'RIGHT'])

export function placeRobot(floor, robots, position) {
  if (!isInsideFloor(floor, position)) {
    throw new RangeError('Robot position must be within floor bounds')
  }

  if (
    floor.obstacles.some(
      (obstacle) => obstacle.x === position.x && obstacle.y === position.y,
    )
  ) {
    throw new RangeError('Robot cannot be placed on an obstacle')
  }

  if (
    robots.some(
      (robot) =>
        robot.position.x === position.x && robot.position.y === position.y,
    )
  ) {
    throw new RangeError('Robot cannot be placed on another robot')
  }

  const usedIds = new Set(robots.map((robot) => Number(robot.id.slice(1))))
  let nextId = 1

  while (usedIds.has(nextId)) {
    nextId += 1
  }

  const robot = createRobot(`R${nextId}`, position)

  return { robot, robots: [...robots, robot] }
}

export function queueRobotCommand(robots, robotId, command) {
  if (!ROBOT_COMMANDS.has(command)) {
    throw new RangeError('Robot command must be MOVE, LEFT, or RIGHT')
  }

  const robotIndex = robots.findIndex((robot) => robot.id === robotId)
  if (robotIndex === -1) {
    throw new RangeError(`Robot ${robotId} does not exist`)
  }

  return robots.map((robot, index) =>
    index === robotIndex
      ? { ...robot, queue: [...robot.queue, command] }
      : robot,
  )
}
