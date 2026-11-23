import type { Floor, Position } from './floor.js'

export type RobotMoveCommand = 'MOVE' | 'LEFT' | 'RIGHT'
export interface GotoCommand {
  type: 'GOTO'
  target: Position
  noPathTicks: number
}
export type RobotCommand = RobotMoveCommand | GotoCommand
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
  action:
    | 'idle'
    | 'turned'
    | 'moved'
    | 'blocked'
    | 'waiting'
    | 'arrived'
    | 'unreachable'
  command?: RobotMoveCommand | 'GOTO'
  from?: Position
  to?: Position
  position?: Position
  fromFacing?: Facing
  facing?: Facing
  reason?: string
  blockedBy?: string
  battery?: number
  target?: Position
}

export declare function placeRobot(
  floor: Floor,
  robots: Robot[],
  position: Position,
): { robot: Robot; robots: Robot[] }

export declare function queueRobotCommand(
  robots: Robot[],
  robotId: string,
  command: RobotMoveCommand,
): Robot[]

export declare function queueRobotGoto(
  floor: Floor,
  robots: Robot[],
  robotId: string,
  target: Position,
): Robot[]
export declare function findShortestPath(
  floor: Floor,
  robots: Robot[],
  robot: Robot,
  target: Position,
): Position[] | null

export declare function advanceTick(
  floor: Floor,
  robots: Robot[],
): { robots: Robot[]; results: TickResult[] }
