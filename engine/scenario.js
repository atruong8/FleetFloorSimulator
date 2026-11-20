import { createFloor, MAX_FLOOR_SIZE, MIN_FLOOR_SIZE } from './floor.js'

export function runScenario(input) {
  let floor = null
  const reports = []

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (line === '' || line.startsWith('#')) {
      continue
    }

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
      }

      continue
    }

    if (/^REPORT$/i.test(line)) {
      reports.push('EMPTY')
    }
  }

  return { floor: floor ?? createFloor(5, 5), reports }
}
