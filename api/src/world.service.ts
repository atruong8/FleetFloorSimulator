import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common'
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFloor, isInsideFloor } from '../../engine/floor.js'
import {
  advanceTick as runTick,
  placeRobot as addRobot,
  queueRobotCommand,
} from '../../engine/world.js'
import type { Floor, Position } from '../../engine/floor.js'
import type {
  Robot,
  RobotCommand,
} from '../../engine/world.js'

interface WorldSnapshot {
  floor: Floor
  robots: Robot[]
  tickCount: number
}

// Keep the event names explicit so saved history uses a consistent vocabulary.
type WorldEventType =
  | 'floor.created'
  | 'robot.placed'
  | 'robot.command_queued'
  | 'obstacle.toggled'
  | 'charger.toggled'
  | 'tick.completed'

function isRobotCommand(command: unknown): command is RobotCommand {
  return (
    typeof command === 'string' &&
    (command === 'MOVE' || command === 'LEFT' || command === 'RIGHT')
  )
}

interface WorldHistoryEntry {
  id: number
  type: WorldEventType
  tick: number
  payload: Record<string, unknown>
  createdAt: string
}

export interface WorldResponse extends WorldSnapshot {
  history: WorldHistoryEntry[]
}

interface SnapshotRow {
  snapshot_json: string
}

interface HistoryRow {
  id: number
  event_type: WorldEventType
  tick_number: number
  payload_json: string
  created_at: string
}

@Injectable()
export class WorldService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldService.name)
  private readonly database: Database.Database

  constructor() {
    // Use the API's data folder by default; tests and deployments can override it.
    const databasePath =
      process.env.FLEET_DB_PATH ??
      fileURLToPath(new URL('../data/fleet-floor.sqlite', import.meta.url))
    mkdirSync(dirname(databasePath), { recursive: true })

    this.database = new Database(databasePath)
    this.database.pragma('journal_mode = WAL')
    // Row 1 stores the single current world; history rows are kept separately.
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS world_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        snapshot_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS world_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        tick_number INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `)

    const snapshot = this.database
      .prepare('SELECT snapshot_json FROM world_state WHERE id = 1')
      .get() as SnapshotRow | undefined

    // Seed a default world only when this database has no saved state.
    if (!snapshot) {
      const initialState: WorldSnapshot = {
        floor: createFloor(),
        robots: [],
        tickCount: 0,
      }
      this.database
        .prepare('INSERT INTO world_state (id, snapshot_json) VALUES (1, ?)')
        .run(JSON.stringify(initialState))
      this.logger.log('Initialized default world state in SQLite.')
    }
  }

  onModuleDestroy() {
    this.database.close()
  }

  getWorld(): WorldResponse {
    const snapshot = this.readSnapshot()
    // Return history in insertion order so clients can replay events chronologically.
    const historyRows = this.database
      .prepare(
        `SELECT id, event_type, tick_number, payload_json, created_at
         FROM world_history ORDER BY id`,
      )
      .all() as HistoryRow[]

    return {
      ...snapshot,
      history: historyRows.map((entry) => ({
        id: entry.id,
        type: entry.event_type,
        tick: entry.tick_number,
        payload: JSON.parse(entry.payload_json) as Record<string, unknown>,
        createdAt: entry.created_at,
      })),
    }
  }

  clearHistory(): WorldResponse {
    // Do not record this operation in the table it clears; keep the snapshot intact.
    const result = this.database.prepare('DELETE FROM world_history').run()
    this.logger.log(
      `Cleared ${result.changes} world history entries; current world state preserved.`,
    )
    return this.getWorld()
  }

  createFloor(width: unknown, height: unknown): WorldResponse {
    if (
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      width > 20 ||
      height < 1 ||
      height > 20
    ) {
      throw new BadRequestException(
        'Floor width and height must be integers between 1 and 20',
      )
    }

    // A new floor resets the active simulation; recordChange leaves old history intact.
    const floor = createFloor(width, height)
    const nextState: WorldSnapshot = {
      floor,
      robots: [],
      tickCount: 0,
    }

    return this.recordChange(nextState, 'floor.created', {
      width,
      height,
    })
  }

  placeRobot(position?: Partial<Position>): WorldResponse {
    if (
      !position ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y)
    ) {
      throw new BadRequestException('Robot position must use integer coordinates')
    }

    const targetPosition = { x: position.x, y: position.y }
    const current = this.readSnapshot()
    let result: ReturnType<typeof addRobot>

    // Reuse the shared engine's placement rules and expose invalid placement as HTTP 400.
    try {
      result = addRobot(current.floor, current.robots, targetPosition)
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message)
      }
      throw error
    }

    return this.recordChange(
      { ...current, robots: result.robots },
      'robot.placed',
      {
        robotId: result.robot.id,
        position: result.robot.position,
      },
    )
  }

  queueCommand(robotId: string, command: unknown): WorldResponse {
    if (!isRobotCommand(command)) {
      throw new BadRequestException('Command must be MOVE, LEFT, or RIGHT')
    }

    const current = this.readSnapshot()
    let robots: Robot[]

    // The engine also checks that the robot exists before adding its command.
    try {
      robots = queueRobotCommand(
        current.robots,
        robotId,
        command,
      )
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message)
      }
      throw error
    }

    return this.recordChange(
      { ...current, robots },
      'robot.command_queued',
      { robotId, command },
    )
  }

  toggleObstacle(position?: Partial<Position>): WorldResponse {
    if (
      !position ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y)
    ) {
      throw new BadRequestException('Obstacle position must use integer coordinates')
    }

    const targetPosition = { x: position.x, y: position.y }
    const current = this.readSnapshot()

    // Obstacles must stay within the floor and cannot cover a robot.
    if (!isInsideFloor(current.floor, targetPosition)) {
      throw new BadRequestException('Obstacle position must be within floor bounds')
    }

    if (
      current.robots.some(
        (robot) =>
        robot.position.x === targetPosition.x &&
        robot.position.y === targetPosition.y,
      )
    ) {
      throw new BadRequestException('Cannot place an obstacle under a robot')
    }

    const existingIndex = current.floor.obstacles.findIndex(
      (obstacle) =>
        obstacle.x === targetPosition.x && obstacle.y === targetPosition.y,
    )
    const isObstacle = existingIndex === -1
    const obstacles = isObstacle
      ? [...current.floor.obstacles, targetPosition]
      : current.floor.obstacles.filter((_, index) => index !== existingIndex)
    const floor = { ...current.floor, obstacles }

    return this.recordChange(
      { ...current, floor },
      'obstacle.toggled',
      { position: targetPosition, isObstacle },
    )
  }

  toggleCharger(position?: Partial<Position>): WorldResponse {
    if (
      !position ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y)
    ) {
      throw new BadRequestException('Charger position must use integer coordinates')
    }

    const targetPosition = { x: position.x, y: position.y }
    const current = this.readSnapshot()

    if (!isInsideFloor(current.floor, targetPosition)) {
      throw new BadRequestException('Charger position must be within floor bounds')
    }

    const existingIndex = current.floor.chargers.findIndex(
      (charger) =>
        charger.x === targetPosition.x && charger.y === targetPosition.y,
    )
    const isCharger = existingIndex === -1
    const chargers = isCharger
      ? [...current.floor.chargers, targetPosition]
      : current.floor.chargers.filter((_, index) => index !== existingIndex)
    const floor = { ...current.floor, chargers }

    return this.recordChange(
      { ...current, floor },
      'charger.toggled',
      { position: targetPosition, isCharger },
    )
  }

  advanceTick(): WorldResponse {
    const current = this.readSnapshot()
    // Run the same tick engine used by the rest of the simulator.
    const { robots, results } = runTick(current.floor, current.robots)
    const nextState = {
      ...current,
      robots,
      tickCount: current.tickCount + 1,
    }

    return this.recordChange(nextState, 'tick.completed', {
      results,
    })
  }

  private readSnapshot(): WorldSnapshot {
    // The singleton state row is stored as JSON and decoded into domain objects.
    const row = this.database
      .prepare('SELECT snapshot_json FROM world_state WHERE id = 1')
      .get() as SnapshotRow

    const snapshot = JSON.parse(row.snapshot_json) as WorldSnapshot
    return {
      ...snapshot,
      // Older saved floors predate charger state.
      floor: { ...snapshot.floor, chargers: snapshot.floor.chargers ?? [] },
      // Older saved robots predate battery state; treat them as fully charged.
      robots: snapshot.robots.map((robot) => ({
        ...robot,
        battery: robot.battery ?? 100,
      })),
    }
  }

  private recordChange(
    snapshot: WorldSnapshot,
    type: WorldEventType,
    payload: Record<string, unknown>,
  ): WorldResponse {
    // Commit the new snapshot and its history event together to prevent mismatches.
    const transaction = this.database.transaction(() => {
      this.database
        .prepare('UPDATE world_state SET snapshot_json = ? WHERE id = 1')
        .run(JSON.stringify(snapshot))
      this.database
        .prepare(
          `INSERT INTO world_history
            (event_type, tick_number, payload_json, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          type,
          snapshot.tickCount,
          JSON.stringify(payload),
          new Date().toISOString(),
        )
    })

    transaction()
    this.logger.log(
      `Saved world change "${type}" at tick ${snapshot.tickCount}.`,
    )
    return this.getWorld()
  }
}
