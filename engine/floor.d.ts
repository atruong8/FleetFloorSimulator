export interface Position {
  x: number
  y: number
}

export interface Floor {
  width: number
  height: number
  obstacles: Position[]
  chargers: Position[]
}

export declare const MIN_FLOOR_SIZE: number
export declare const MAX_FLOOR_SIZE: number
export declare function createFloor(width?: number, height?: number): Floor
export declare function isInsideFloor(
  floor: Floor,
  position: Position | undefined,
): boolean
