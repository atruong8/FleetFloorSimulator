import { isInsideFloor } from './floor.js'
import { createRobot } from './robot.js'

const ROBOT_COMMANDS = new Set(['MOVE', 'LEFT', 'RIGHT'])
const TURNED_FACING = {
  NORTH: { LEFT: 'WEST', RIGHT: 'EAST' },
  EAST: { LEFT: 'NORTH', RIGHT: 'SOUTH' },
  SOUTH: { LEFT: 'EAST', RIGHT: 'WEST' },
  WEST: { LEFT: 'SOUTH', RIGHT: 'NORTH' },
}

function nextFacing(facing, command) {
  return TURNED_FACING[facing][command]
}

function positionKey(position) {
  return `${position.x},${position.y}`
}

function nextPosition(robot) {
  const offsets = {
    NORTH: { x: 0, y: 1 },
    EAST: { x: 1, y: 0 },
    SOUTH: { x: 0, y: -1 },
    WEST: { x: -1, y: 0 },
  }
  const offset = offsets[robot.facing]

  return {
    x: robot.position.x + offset.x,
    y: robot.position.y + offset.y,
  }
}

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

// Consume one command per robot, applying turns and preparing move proposals.
function prepareTick(floor, robots) {
  // Build a separate next-state so every move is planned from the same snapshot.
  const nextRobots = []
  const results = []
  const movePlans = new Map()
  const blockedMoves = new Map()

  for (const robot of robots) {
    const command = robot.queue[0]
    const nextRobot = {
      ...robot,
      position: { ...robot.position },
      // Taking the command here consumes it even if its MOVE is later blocked.
      queue: command ? robot.queue.slice(1) : robot.queue,
    }

    nextRobots.push(nextRobot)

    if (!command) {
      results.push({
        robotId: robot.id,
        action: 'idle',
        position: { ...robot.position },
      })
      continue
    }

    if (command === 'LEFT' || command === 'RIGHT') {
      // Turns succeed immediately and do not change the robot's position.
      nextRobot.facing = nextFacing(robot.facing, command)
      results.push({
        robotId: robot.id,
        action: 'turned',
        command,
        fromFacing: robot.facing,
        facing: nextRobot.facing,
        position: { ...robot.position },
      })
      continue
    }

    if (command !== 'MOVE') {
      throw new RangeError(`Unsupported queued command: ${command}`)
    }

    const destination = nextPosition(robot)
    const plan = { robot, destination }
    movePlans.set(robot.id, plan)

    // A move with no battery is blocked before checking its destination.
    if (robot.battery <= 0) {
      blockedMoves.set(robot.id, { reason: 'NO_BATTERY' })
    } else if (!isInsideFloor(floor, destination)) {
      // Walls and obstacles reject moves before robot-to-robot conflicts are checked.
      blockedMoves.set(robot.id, { reason: 'WALL' })
    } else if (
      floor.obstacles.some(
        (obstacle) =>
          obstacle.x === destination.x && obstacle.y === destination.y,
      )
    ) {
      blockedMoves.set(robot.id, { reason: 'OBSTACLE' })
    }

    results.push({
      robotId: robot.id,
      // The final moved/blocked outcome is filled in after all proposals are resolved.
      action: 'pending',
      command: 'MOVE',
      from: { ...robot.position },
      to: destination,
    })
  }

  return { nextRobots, results, movePlans, blockedMoves }
}

// Keep only the lowest-numbered robot for each contested destination.
function markContestedMoves(movePlans, blockedMoves) {
  const contendersByDestination = new Map()
  for (const [robotId, plan] of movePlans) {
    // A move already blocked by a wall or obstacle cannot win a contested cell.
    if (blockedMoves.has(robotId)) {
      continue
    }

    const key = positionKey(plan.destination)
    const contenders = contendersByDestination.get(key) ?? []
    contenders.push(robotId)
    contendersByDestination.set(key, contenders)
  }

  for (const contenders of contendersByDestination.values()) {
    if (contenders.length < 2) {
      continue
    }

    // Compare the numeric suffix so R2 wins over R10.
    contenders.sort(
      (left, right) =>
        Number(left.slice(1)) - Number(right.slice(1)),
    )
    for (const robotId of contenders.slice(1)) {
      blockedMoves.set(robotId, { reason: 'CONTESTED' })
    }
  }
}

// Block both robots when their proposals exchange their starting cells.
function markHeadOnSwaps(candidates, robots, blockedMoves) {
  // Keep the tick-start positions: swaps are defined using occupied start cells.
  const robotsByPosition = new Map(
    robots.map((robot) => [positionKey(robot.position), robot]),
  )

  for (const [robotId, plan] of candidates) {
    const targetRobot = robotsByPosition.get(positionKey(plan.destination))
    if (!targetRobot || targetRobot.id === robotId) {
      continue
    }

    const targetPlan = candidates.get(targetRobot.id)
    if (
      targetPlan &&
      positionKey(targetPlan.destination) === positionKey(plan.robot.position)
    ) {
      // The two proposals point at each other's starting positions.
      blockedMoves.set(robotId, { reason: 'SWAP' })
      blockedMoves.set(targetRobot.id, { reason: 'SWAP' })
    }
  }

  for (const robotId of blockedMoves.keys()) {
    // Only unblocked candidates should participate in following/cycle resolution.
    candidates.delete(robotId)
  }

  return robotsByPosition
}

// Resolve occupied destinations; chains depend on the robot ahead moving out.
// Revisiting a robot in the current path identifies a successful movement loop.
function resolveFollowingMoves(
  movePlans,
  candidates,
  robotsByPosition,
  blockedMoves,
) {
  // Cache completed outcomes and track the current dependency path separately.
  const moveOutcomes = new Map()
  const visitStates = new Map()

  // Recursively check whether this robot and any robot ahead of it can move.
  const canMove = (robotId, path = []) => {
    // Reuse an outcome already determined through another robot's dependency.
    if (moveOutcomes.has(robotId)) {
      return moveOutcomes.get(robotId)
    }

    if (visitStates.get(robotId) === 'visiting') {
      // Reaching a robot already on this path means the moves form a cycle.
      const cycleStart = path.indexOf(robotId)
      for (const cycleRobotId of path.slice(cycleStart)) {
        moveOutcomes.set(cycleRobotId, true)
      }
      return true
    }

    // Remember this dependency chain while checking the robot ahead.
    visitStates.set(robotId, 'visiting')
    path.push(robotId)

    const plan = candidates.get(robotId)
    // The destination may be occupied at the start of this tick.
    const occupyingRobot = robotsByPosition.get(positionKey(plan.destination))
    let succeeds = true
    let reason
    let blockedBy

    if (occupyingRobot && occupyingRobot.id !== robotId) {
      if (candidates.has(occupyingRobot.id)) {
        // This move succeeds only if the occupying robot can also move out.
        succeeds = canMove(occupyingRobot.id, path)
        if (!succeeds) {
          reason = 'BLOCKED_BY_ROBOT'
          blockedBy = occupyingRobot.id
        }
      } else {
        succeeds = false
        // A failed MOVE blocks followers; an idle or turning robot stays put.
        reason = movePlans.has(occupyingRobot.id)
          ? 'BLOCKED_BY_ROBOT'
          : 'OCCUPIED'
        blockedBy = occupyingRobot.id
      }
    }

    path.pop()
    visitStates.set(robotId, 'visited')

    // A cycle may already have set this outcome while recursion was unwinding.
    if (!moveOutcomes.has(robotId)) {
      moveOutcomes.set(robotId, succeeds)
    }
    if (!moveOutcomes.get(robotId) && reason) {
      blockedMoves.set(robotId, { reason, blockedBy })
    }

    return moveOutcomes.get(robotId)
  }

  for (const robotId of candidates.keys()) {
    canMove(robotId)
  }

  return moveOutcomes
}

// Commit successful moves and finalize each robot's MOVE result.
function applyMoveOutcomes(
  nextRobots,
  results,
  movePlans,
  blockedMoves,
  moveOutcomes,
) {
  // Index the prepared state and per-robot results for the final commit pass.
  const robotById = new Map(nextRobots.map((robot) => [robot.id, robot]))
  const resultsById = new Map(results.map((result) => [result.robotId, result]))

  for (const [robotId, plan] of movePlans) {
    const result = resultsById.get(robotId)
    const blocker = blockedMoves.get(robotId)

    if (blocker || moveOutcomes.get(robotId) === false) {
      // Blocked robots stay at their tick-start positions.
      result.action = 'blocked'
      result.reason = blocker?.reason ?? 'BLOCKED_BY_ROBOT'
      if (blocker?.blockedBy) {
        result.blockedBy = blocker.blockedBy
      }
      result.to = { ...plan.robot.position }
      continue
    }

    const nextRobot = robotById.get(robotId)
    // Apply successful destinations only after every move has been resolved.
    nextRobot.position = { ...plan.destination }
    // Blocked moves never reach this branch, so only successful moves consume battery.
    nextRobot.battery -= 1
    result.action = 'moved'
  }
}

// Charge robots after all moves resolve, based on the cells where they ended the tick.
function rechargeRobotsOnChargers(floor, robots, results) {
  const chargers = new Set(floor.chargers.map(positionKey))
  const robotsById = new Map()

  const rechargedRobots = robots.map((robot) => {
    const battery = chargers.has(positionKey(robot.position))
      ? Math.min(100, robot.battery + 10)
      : robot.battery
    const rechargedRobot = { ...robot, battery }
    robotsById.set(robot.id, rechargedRobot)
    return rechargedRobot
  })

  for (const result of results) {
    result.battery = robotsById.get(result.robotId).battery
  }

  return rechargedRobots
}

export function advanceTick(floor, robots) {
  const { nextRobots, results, movePlans, blockedMoves } = prepareTick(
    floor,
    robots,
  )

  markContestedMoves(movePlans, blockedMoves)

  // Remaining proposals can be tested for swaps, then following dependencies.
  const candidates = new Map(
    [...movePlans].filter(([robotId]) => !blockedMoves.has(robotId)),
  )
  const robotsByPosition = markHeadOnSwaps(
    candidates,
    robots,
    blockedMoves,
  )
  const moveOutcomes = resolveFollowingMoves(
    movePlans,
    candidates,
    robotsByPosition,
    blockedMoves,
  )
  applyMoveOutcomes(
    nextRobots,
    results,
    movePlans,
    blockedMoves,
    moveOutcomes,
  )

  return {
    robots: rechargeRobotsOnChargers(floor, nextRobots, results),
    results,
  }
}
