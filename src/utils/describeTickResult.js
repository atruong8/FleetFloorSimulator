export function describeTickResult(result) {
  const battery =
    result.battery === undefined ? '' : ` (battery ${result.battery})`

  if (result.action === 'idle') {
    return `${result.robotId}: idle${battery}`
  }
  if (result.action === 'turned') {
    return `${result.robotId}: turned ${result.command}, now facing ${result.facing}${battery}`
  }
  if (result.action === 'moved') {
    return `${result.robotId}: moved to (${result.to.x}, ${result.to.y})${battery}`
  }

  const blockedBy = result.blockedBy ? ` by ${result.blockedBy}` : ''
  return `${result.robotId}: blocked (${result.reason}${blockedBy})${battery}`
}
