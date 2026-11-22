export const MIN_FLOOR_SIZE = 1
export const MAX_FLOOR_SIZE = 20

function validateSize(size, name) {
  if (
    !Number.isInteger(size) ||
    size < MIN_FLOOR_SIZE ||
    size > MAX_FLOOR_SIZE
  ) {
    throw new RangeError(
      `${name} must be an integer between ${MIN_FLOOR_SIZE} and ${MAX_FLOOR_SIZE}`,
    )
  }
}

export function createFloor(width = 10, height = 8) {
  validateSize(width, 'width')
  validateSize(height, 'height')

  return { width, height, obstacles: [], chargers: [] }
}

export function isInsideFloor(floor, position) {
  const { x, y } = position ?? {}

  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < floor.width &&
    y >= 0 &&
    y < floor.height
  )
}
