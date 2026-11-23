async function requestWorld(path = '', options = {}) {
  const response = await fetch(`/api/world${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const responseText = await response.text()
  let payload

  try {
    payload = responseText ? JSON.parse(responseText) : null
  } catch {
    if (response.ok) {
      throw new Error('The API returned an invalid response.')
    }
  }

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message
    throw new Error(message || `API request failed (${response.status}).`)
  }

  if (!payload) {
    throw new Error('The API returned an empty response.')
  }

  return payload
}

export function getWorld() {
  return requestWorld()
}

export function clearWorldHistory() {
  return requestWorld('/history', { method: 'DELETE' })
}

export function createFloor(width, height) {
  return requestWorld('/floor', {
    method: 'POST',
    body: { width, height },
  })
}

export function placeWorldRobot(position) {
  return requestWorld('/robots', { method: 'POST', body: position })
}

export function queueWorldCommand(robotId, command) {
  return requestWorld(`/robots/${encodeURIComponent(robotId)}/commands`, {
    method: 'POST',
    body: { command },
  })
}

export function queueWorldGoto(robotId, target) {
  return requestWorld(`/robots/${encodeURIComponent(robotId)}/commands`, {
    method: 'POST',
    body: { command: 'GOTO', target },
  })
}

export function toggleWorldObstacle(position) {
  return requestWorld('/obstacles', { method: 'POST', body: position })
}

export function toggleWorldCharger(position) {
  return requestWorld('/chargers', { method: 'POST', body: position })
}

export function advanceWorldTick() {
  return requestWorld('/tick', { method: 'POST' })
}
