import { isInsideFloor } from './floor.js'
import { createRobot } from './robot.js'

const ROBOT_COMMANDS = new Set(['MOVE', 'LEFT', 'RIGHT'])
const PATH_DIRECTIONS = [
  { facing: 'NORTH', x: 0, y: 1 },
  { facing: 'EAST', x: 1, y: 0 },
  { facing: 'SOUTH', x: 0, y: -1 },
  { facing: 'WEST', x: -1, y: 0 },
]
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

// Find a shortest route with BFS. Neighbor order makes equal-length paths prefer
// NORTH, then EAST, SOUTH, and WEST as required by the GOTO rules.
export function findShortestPath(floor, robots, robot, target) {
  // Reject targets and starting cells that are outside the floor.
  if (!isInsideFloor(floor, robot.position) || !isInsideFloor(floor, target)) {
    return null
  }

  // Arriving at the target requires no movement; this completes GOTO.
  if (positionKey(robot.position) === positionKey(target)) {
    return []
  }

  // BFS cannot enter obstacles or cells occupied by a different robot.
  const isBlocked = (position) =>
    floor.obstacles.some(
      (obstacle) =>
        obstacle.x === position.x && obstacle.y === position.y,
    ) ||
    robots.some(
      (otherRobot) =>
        otherRobot.id !== robot.id &&
        otherRobot.position.x === position.x &&
        otherRobot.position.y === position.y,
    )

  // Track the current cell and target as string keys for Set and Map lookups.
  const startKey = positionKey(robot.position)
  const targetKey = positionKey(target)

  // Queue contains frontier cells; BFS explores one cell at a time in tick order.
  const queue = [{ ...robot.position }]

  // Visited prevents cycles and ensures every cell is reached by a shortest route.
  const visited = new Set([startKey])

  // Previous cells let us reconstruct the route after the target is discovered.
  const previousByPosition = new Map([[startKey, null]])
  const positionByKey = new Map([[startKey, { ...robot.position }]])

  // Use an index instead of shifting the array so each BFS visit is constant time.
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex]
    const currentKey = positionKey(current)

    // The fixed direction order implements NORTH, EAST, SOUTH, WEST tie-breaking.
    for (const direction of PATH_DIRECTIONS) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      }
      const nextKey = positionKey(next)

      // Ignore walls, obstacles, occupied cells, and cells already visited.
      if (
        visited.has(nextKey) ||
        !isInsideFloor(floor, next) ||
        isBlocked(next)
      ) {
        continue
      }

      // Remember this route so it can be reconstructed when the target is found.
      visited.add(nextKey)
      previousByPosition.set(nextKey, currentKey)
      positionByKey.set(nextKey, next)

      if (nextKey === targetKey) {
        const path = []
        let pathKey = targetKey

        // Walk backward from the target until reaching the robot's start cell.
        while (pathKey !== startKey) {
          path.push(positionByKey.get(pathKey))
          pathKey = previousByPosition.get(pathKey)
        }

        // Reverse the backward route so it is ordered from robot to target.
        return path.reverse()
      }

      // Add the discovered cell to the BFS frontier for later exploration.
      queue.push(next)
    }
  }

  // Exhausting the frontier means there is no route to the target.
  return null
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

export function queueRobotGoto(floor, robots, robotId, target) {
  if (
    !target ||
    !Number.isInteger(target.x) ||
    !Number.isInteger(target.y) ||
    !isInsideFloor(floor, target)
  ) {
    throw new RangeError(
      'GOTO target must be within the floor bounds',
    )
  }

  const robotIndex = robots.findIndex((robot) => robot.id === robotId)
  if (robotIndex === -1) {
    throw new RangeError(`Robot ${robotId} does not exist`)
  }

  const gotoCommand = {
    type: 'GOTO',
    target: { x: target.x, y: target.y },
    noPathTicks: 0,
  }

  return robots.map((robot, index) =>
    index === robotIndex
      ? { ...robot, queue: [...robot.queue, gotoCommand] }
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
    const isGoto = typeof command === 'object' && command?.type === 'GOTO'
    const nextRobot = {
      ...robot,
      position: { ...robot.position },
      // GOTO stays at the queue front until arrival or three no-path ticks.
      queue: command && !isGoto ? robot.queue.slice(1) : robot.queue,
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

    if (isGoto) {
      const path = findShortestPath(
        floor,
        robots,
        robot,
        command.target,
      )

      if (path === null) {
        const noPathTicks = command.noPathTicks + 1
        if (noPathTicks >= 3) {
          nextRobot.queue = robot.queue.slice(1)
          results.push({
            robotId: robot.id,
            action: 'unreachable',
            command: 'GOTO',
            target: { ...command.target },
            reason: 'UNREACHABLE',
            position: { ...robot.position },
          })
        } else {
          nextRobot.queue = [
            { ...command, noPathTicks },
            ...robot.queue.slice(1),
          ]
          results.push({
            robotId: robot.id,
            action: 'waiting',
            command: 'GOTO',
            target: { ...command.target },
            reason: 'NO_PATH',
            position: { ...robot.position },
          })
        }
        nextRobots[nextRobots.length - 1] = nextRobot
        continue
      }

      if (path.length === 0) {
        nextRobot.queue = robot.queue.slice(1)
        results.push({
          robotId: robot.id,
          action: 'arrived',
          command: 'GOTO',
          target: { ...command.target },
          position: { ...robot.position },
        })
        nextRobots[nextRobots.length - 1] = nextRobot
        continue
      }

      const destination = path[0]
      const direction = PATH_DIRECTIONS.find(
        (candidate) =>
          robot.position.x + candidate.x === destination.x &&
          robot.position.y + candidate.y === destination.y,
      )
      nextRobot.facing = direction.facing
      nextRobot.queue = [
        { ...command, noPathTicks: 0 },
        ...robot.queue.slice(1),
      ]
      movePlans.set(robot.id, {
        robot,
        destination,
        gotoTarget: command.target,
      })

      if (robot.battery <= 0) {
        blockedMoves.set(robot.id, { reason: 'NO_BATTERY' })
      }

      results.push({
        robotId: robot.id,
        action: 'pending',
        command: 'GOTO',
        target: { ...command.target },
        from: { ...robot.position },
        to: destination,
      })
      nextRobots[nextRobots.length - 1] = nextRobot
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
    if (
      plan.gotoTarget &&
      positionKey(plan.destination) === positionKey(plan.gotoTarget)
    ) {
      nextRobot.queue = nextRobot.queue.slice(1)
    }
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

  const rechargedRobots = rechargeRobotsOnChargers(
    floor,
    nextRobots,
    results,
  )

  return {
    robots: rechargedRobots,
    results,
  }
}
