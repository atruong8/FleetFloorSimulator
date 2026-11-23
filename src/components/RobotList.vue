<script>
export default {
  props: {
    robots: { type: Array, required: true },
    selectedRobotId: { type: String, default: null },
  },
  methods: {
    commandLabel(command) {
      return typeof command === 'string'
        ? command
        : `GOTO ${command.target.x},${command.target.y}`
    },
  },
}
</script>

<template>
  <section class="panel" aria-labelledby="robots-heading">
    <h2 id="robots-heading">Robots and pending queues</h2>
    <p v-if="robots.length === 0" class="commands-description">
      No robots placed yet.
    </p>
    <ul v-else class="robot-list">
      <li
        v-for="robot in robots"
        :key="robot.id"
        class="robot-row"
        :class="{ 'selected-robot-row': robot.id === selectedRobotId }"
      >
        <div>
          <strong>{{ robot.id }}</strong>
          <span class="robot-details">
            ({{ robot.position.x }}, {{ robot.position.y }}) ·
            {{ robot.facing }} · Battery: {{ robot.battery }}
          </span>
        </div>
        <div class="queue-display">
          <span class="queue-label">Queue:</span>
          <span v-if="robot.queue.length === 0" class="empty-queue">
            Empty
          </span>
          <ol v-else class="queue-items" :aria-label="`${robot.id} queue`">
            <li v-for="(command, index) in robot.queue" :key="index">
              {{ commandLabel(command) }}
            </li>
          </ol>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.robot-list {
  display: grid;
  gap: 0.65rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.robot-row {
  display: grid;
  gap: 0.5rem;
  padding: 0.8rem;
  border: 1px solid #dfe4ec;
  border-radius: 0.5rem;
}

.selected-robot-row {
  border-color: #8391dd;
  background: #f5f6ff;
}

.robot-details {
  margin-left: 0.45rem;
  color: #596579;
  font-size: 0.9rem;
}

.queue-display {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.queue-label {
  font-weight: 650;
}

.empty-queue {
  color: #667085;
}

.queue-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.queue-items li {
  padding: 0.2rem 0.45rem;
  border-radius: 0.25rem;
  background: #e9edff;
  color: #344594;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}
</style>
