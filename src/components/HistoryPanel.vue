<script>
import { describeTickResult } from '../utils/describeTickResult.js'

export default {
  props: {
    history: { type: Array, required: true },
    isReady: { type: Boolean, required: true },
    isSaving: { type: Boolean, required: true },
  },
  emits: ['clear-history'],
  methods: {
    describeHistoryEntry(entry) {
      const { payload } = entry

      if (entry.type === 'floor.created') {
        return `Created a ${payload.width} × ${payload.height} floor.`
      }
      if (entry.type === 'robot.placed') {
        return `${payload.robotId} placed at (${payload.position.x}, ${payload.position.y}).`
      }
      if (entry.type === 'robot.command_queued') {
        if (payload.command === 'GOTO') {
          return `GOTO ${payload.target.x},${payload.target.y} queued for ${payload.robotId}.`
        }
        return `${payload.command} queued for ${payload.robotId}.`
      }
      if (entry.type === 'obstacle.toggled') {
        const change = payload.isObstacle ? 'added' : 'removed'
        return `Obstacle ${change} at (${payload.position.x}, ${payload.position.y}).`
      }
      if (entry.type === 'charger.toggled') {
        const change = payload.isCharger ? 'added' : 'removed'
        return `Charger ${change} at (${payload.position.x}, ${payload.position.y}).`
      }

      const results = payload.results
      const details = results.length
        ? results.map(describeTickResult).join('; ')
        : 'No robots to act.'
      return `Tick ${entry.tick}: ${details}`
    },
  },
}
</script>

<template>
  <section class="panel" aria-labelledby="history-heading">
    <div class="history-header">
      <h2 id="history-heading">Simulation history</h2>
      <button
        type="button"
        :disabled="!isReady || isSaving || history.length === 0"
        @click="$emit('clear-history')"
      >
        Clear history
      </button>
    </div>
    <ol v-if="history.length" class="history-list">
      <li v-for="entry in history.slice().reverse()" :key="entry.id">
        <time :datetime="entry.createdAt">{{ entry.createdAt }}</time>
        <span>{{ describeHistoryEntry(entry) }}</span>
      </li>
    </ol>
    <p v-else class="commands-description">
      Changes to the floor and simulation will appear here.
    </p>
  </section>
</template>

<style scoped>
.history-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.history-header button {
  min-height: 2.25rem;
  padding: 0.45rem 0.8rem;
  background: #596579;
}

.history-header button:hover {
  background: #465166;
}

.history-header button:disabled {
  background: #aab2c3;
}

.history-list {
  display: grid;
  gap: 0.6rem;
  max-height: 24rem;
  overflow: auto;
  margin: 1rem 0 0;
  padding-left: 1.5rem;
}

.history-list li {
  display: grid;
  gap: 0.2rem;
  padding: 0.65rem;
  border: 1px solid #dfe4ec;
  border-radius: 0.4rem;
}

.history-list time {
  color: #667085;
  font-size: 0.8rem;
}
</style>
