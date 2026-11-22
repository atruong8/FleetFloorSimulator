import {
  addCharger,
  addObstacle,
  createFloor,
  MAX_FLOOR_SIZE,
  MIN_FLOOR_SIZE,
} from './floor.js'
import { placeScenarioRobot } from './robot.js'
import { advanceTick, queueRobotCommand } from './world.js'

const VALID_COMMANDS = new Set(['MOVE', 'LEFT', 'RIGHT'])

// Validate the full command list first so an invalid line cannot queue only part of it.
function queueScenarioCommands(robots, id, commands) {
  const normalizedCommands = commands.map((command) => command.toUpperCase())
  if (!normalizedCommands.every((command) => VALID_COMMANDS.has(command))) {
    return robots
  }

  let nextRobots = robots
  try {
    // Use the shared world helper so queue behavior matches the API.
    for (const command of normalizedCommands) {
      nextRobots = queueRobotCommand(nextRobots, id.toUpperCase(), command)
    }
  } catch (error) {
    // Unknown robot IDs make this scenario command a no-op.
    if (error instanceof RangeError) {
      return robots
    }
    throw error
  }

  return nextRobots
}

// Format the current robots in the output shape required by scenario REPORT.
function reportRobots(robots) {
  if (robots.length === 0) {
    return 'EMPTY'
  }

  // Compare numeric ID suffixes, so R2 sorts before R10.
  return [...robots]
    .sort(
      (left, right) =>
        Number(left.id.slice(1)) - Number(right.id.slice(1)),
    )
    .map(
      (robot) =>
        `${robot.id} ${robot.position.x},${robot.position.y},${robot.facing}`,
    )
    .join('\n')
}

// Report remaining battery in the same numeric robot-ID order as REPORT.
function reportBatteries(robots) {
  if (robots.length === 0) {
    return 'EMPTY'
  }

  return [...robots]
    .sort(
      (left, right) =>
        Number(left.id.slice(1)) - Number(right.id.slice(1)),
    )
    .map((robot) => `${robot.id} ${robot.battery}`)
    .join('\n')
}

export function runScenario(input) {
  let floor = createFloor(5, 5)
  let robots = []
  let tickCount = 0
  const reports = []

  // Process commands in order; each command updates the state used by later lines.
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    // Comments and blank lines are intentionally ignored.
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // A valid FLOOR command starts a fresh simulation on the requested dimensions.
    const floorCommand = line.match(/^FLOOR\s+(\d+)\s*,\s*(\d+)$/i)
    if (floorCommand) {
      const width = Number(floorCommand[1])
      const height = Number(floorCommand[2])
      const validSize = (size) =>
        Number.isInteger(size) &&
        size >= MIN_FLOOR_SIZE &&
        size <= MAX_FLOOR_SIZE

      if (validSize(width) && validSize(height)) {
        floor = createFloor(width, height)
        robots = []
        tickCount = 0
      }
      continue
    }

    // OBSTACLE adds a blocking cell; invalid or occupied positions are ignored.
    const obstacleCommand = line.match(/^OBSTACLE\s+(\d+)\s*,\s*(\d+)$/i)
    if (obstacleCommand) {
      floor = addObstacle(floor, robots, {
        x: Number(obstacleCommand[1]),
        y: Number(obstacleCommand[2]),
      })
      continue
    }

    // CHARGER marks an in-bounds cell without affecting robot movement.
    const chargerCommand = line.match(/^CHARGER\s+(\d+)\s*,\s*(\d+)$/i)
    if (chargerCommand) {
      floor = addCharger(floor, {
        x: Number(chargerCommand[1]),
        y: Number(chargerCommand[2]),
      })
      continue
    }

    // PLACE supports explicit IDs and facings, unlike the UI's auto-ID placement.
    const placeCommand = line.match(
      /^PLACE\s+(R[1-9]\d*)\s+(\d+)\s*,\s*(\d+)\s*,\s*(NORTH|EAST|SOUTH|WEST)$/i,
    )
    if (placeCommand) {
      robots = placeScenarioRobot(
        floor,
        robots,
        placeCommand[1],
        { x: Number(placeCommand[2]), y: Number(placeCommand[3]) },
        placeCommand[4],
      )
      continue
    }

    // QUEUE accepts one or more commands for a robot that has already been placed.
    const queueCommand = line.match(/^QUEUE\s+(R[1-9]\d*)\s+(.+)$/i)
    if (queueCommand) {
      robots = queueScenarioCommands(
        robots,
        queueCommand[1],
        queueCommand[2].trim().split(/\s+/),
      )
      continue
    }

    // TICK defaults to one; each iteration uses the shared simultaneous tick engine.
    const tickCommand = line.match(/^TICK(?:\s+(\d+))?$/i)
    if (tickCommand) {
      const numberOfTicks =
        tickCommand[1] === undefined ? 1 : Number(tickCommand[1])
      if (numberOfTicks > 0) {
        for (let tick = 0; tick < numberOfTicks; tick += 1) {
          const result = advanceTick(floor, robots)
          robots = result.robots
          tickCount += 1
        }
      }
      continue
    }

    // Save a snapshot of robot batteries when requested by the Module B format.
    if (/^REPORT\s+BATTERY$/i.test(line)) {
      reports.push(reportBatteries(robots))
      continue
    }

    // Save a snapshot of the current robot report; the CLI prints these in order.
    if (/^REPORT$/i.test(line)) {
      reports.push(reportRobots(robots))
    }
  }

  // Return the final state as well as report output for tests and the CLI.
  return { floor, robots, tickCount, reports }
}
