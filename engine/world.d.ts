import type { Floor, Position } from './floor.js'

export type RobotCommand = 'MOVE' | 'LEFT' | 'RIGHT'
export type Facing = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'

export interface Robot {
  id: string
  position: Position
  facing: Facing
  battery: number
  queue: RobotCommand[]
}

export interface TickResult {
  robotId: string
  action: 'idle' | 'turned' | 'moved' | 'blocked'
  command?: RobotCommand
  from?: Position
  to?: Position
  position?: Position
  fromFacing?: Facing
  facing?: Facing
  reason?: string
  blockedBy?: string
  battery?: number
}

export declare function placeRobot(
  floor: Floor,
  robots: Robot[],
  position: Position,
): { robot: Robot; robots: Robot[] }

export declare function queueRobotCommand(
  robots: Robot[],
  robotId: string,
  command: RobotCommand,
): Robot[]

export declare function advanceTick(
  floor: Floor,
  robots: Robot[],
): { robots: Robot[]; results: TickResult[] }
