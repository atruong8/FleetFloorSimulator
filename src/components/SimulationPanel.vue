<script>
import { describeTickResult } from '../utils/describeTickResult.js'

export default {
  props: {
    tickHistory: { type: Array, required: true },
    tickCount: { type: Number, required: true },
    tickIntervalMs: { type: Number, required: true },
    isPlaying: { type: Boolean, required: true },
    isReady: { type: Boolean, required: true },
    isSaving: { type: Boolean, required: true },
  },
  emits: ['step', 'toggle-playback', 'interval-change'],
  methods: {
    updateInterval(event) {
      this.$emit('interval-change', Number(event.target.value))
    },
    describeTickResult,
  },
}
</script>

<template>
  <section class="panel" aria-labelledby="ticks-heading">
    <h2 id="ticks-heading">Simulation ticks</h2>
    <div class="tick-controls">
      <button
        type="button"
        :disabled="isPlaying || !isReady || isSaving"
        @click="$emit('step')"
      >
        Step
      </button>
      <button
        type="button"
        :disabled="!isReady || isSaving"
        @click="$emit('toggle-playback')"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <label class="interval-field">
        <span>Tick interval (ms)</span>
        <input
          :value="tickIntervalMs"
          type="range"
          min="100"
          max="5000"
          step="100"
          :disabled="!isReady || isSaving"
          @input="updateInterval"
        />
        <output>{{ tickIntervalMs }} ms</output>
      </label>
    </div>
    <p class="tick-count" role="status">Current tick: {{ tickCount }}</p>

    <div v-if="tickHistory.length" class="tick-history">
      <h3>Tick results</h3>
      <ol class="tick-list">
        <li v-for="tick in tickHistory" :key="tick.id">
          <h4>Tick {{ tick.number }}</h4>
          <ul v-if="tick.results.length">
            <li v-for="result in tick.results" :key="result.robotId">
              {{ describeTickResult(result) }}
            </li>
          </ul>
          <p v-else>No robots to act.</p>
        </li>
      </ol>
    </div>
    <p v-else class="commands-description">
      Step the simulation to process the first queued command for each robot.
    </p>
  </section>
</template>

<style scoped>
.tick-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.interval-field {
  display: grid;
  gap: 0.4rem;
  color: #465166;
  font-size: 0.9rem;
  font-weight: 600;
}

.interval-field input {
  width: min(14rem, 55vw);
  accent-color: #4355b5;
}

.tick-count {
  margin: 0.9rem 0 0;
  color: #344594;
  font-weight: 650;
}

.tick-history {
  margin-top: 1.25rem;
}

.tick-history h3,
.tick-history h4 {
  margin: 0;
}

.tick-list {
  display: grid;
  gap: 0.75rem;
  max-height: 20rem;
  overflow: auto;
  margin: 0.75rem 0 0;
  padding-left: 1.5rem;
}

.tick-list > li {
  padding: 0.65rem;
  border: 1px solid #dfe4ec;
  border-radius: 0.4rem;
}

.tick-list ul {
  display: grid;
  gap: 0.25rem;
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  color: #465166;
}

.tick-list p {
  margin: 0.5rem 0 0;
  color: #667085;
}
</style>
