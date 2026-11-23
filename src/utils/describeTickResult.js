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
  if (result.action === 'waiting') {
    return `${result.robotId}: waiting; no path to (${result.target.x}, ${result.target.y})`
  }
  if (result.action === 'arrived') {
    return `${result.robotId}: arrived at (${result.target.x}, ${result.target.y})`
  }
  if (result.action === 'unreachable') {
    return `${result.robotId}: GOTO unreachable at (${result.target.x}, ${result.target.y})`
  }

  const blockedBy = result.blockedBy ? ` by ${result.blockedBy}` : ''
  return `${result.robotId}: blocked (${result.reason}${blockedBy})${battery}`
}
