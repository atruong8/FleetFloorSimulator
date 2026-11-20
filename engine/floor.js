const MIN_SIZE = 1
const MAX_SIZE = 20

function validateSize(size, name) {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new RangeError(`${name} must be an integer between 1 and ${MAX_SIZE}`)
  }
}

export function createFloor(width = 10, height = 8) {
  validateSize(width, 'width')
  validateSize(height, 'height')

  return { width, height, obstacles: [] }
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
