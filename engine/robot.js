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
    queue: [],
  }
}
