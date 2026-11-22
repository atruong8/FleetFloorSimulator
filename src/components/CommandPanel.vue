<script>
export default {
  props: {
    selectedRobot: { type: Object, default: null },
    isReady: { type: Boolean, required: true },
    isSaving: { type: Boolean, required: true },
  },
  emits: ['queue-command'],
}
</script>

<template>
  <section class="panel" aria-labelledby="commands-heading">
    <h2 id="commands-heading">Command Panel</h2>
    <p v-if="selectedRobot" class="commands-description">
      Queue commands for {{ selectedRobot.id }}. Use the arrow keys or these
      buttons: ↑ Move, ← Left, → Right.
    </p>
    <p v-else class="commands-description">
      Select a robot on the floor to queue commands.
    </p>
    <div class="command-buttons">
      <button
        type="button"
        :disabled="!selectedRobot || !isReady || isSaving"
        @click="$emit('queue-command', 'MOVE')"
      >
        ↑ Move
      </button>
      <button
        type="button"
        :disabled="!selectedRobot || !isReady || isSaving"
        @click="$emit('queue-command', 'LEFT')"
      >
        ← Left
      </button>
      <button
        type="button"
        :disabled="!selectedRobot || !isReady || isSaving"
        @click="$emit('queue-command', 'RIGHT')"
      >
        → Right
      </button>
    </div>
    <p class="keyboard-note">
      Arrow keys work when focus is outside a text or number field.
    </p>
  </section>
</template>

<style scoped>
.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.keyboard-note {
  margin: 0.75rem 0 0;
  color: #596579;
  font-size: 0.85rem;
}

.command-buttons button:disabled {
  background: #aab2c3;
  cursor: not-allowed;
}
</style>
