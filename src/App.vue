<script>
import {
  createFloor,
  MAX_FLOOR_SIZE,
  MIN_FLOOR_SIZE,
} from '../engine/floor.js'
import {
  advanceTick,
  placeRobot,
  queueRobotCommand,
} from '../engine/world.js'

export default {
  data() {
    const initialFloor = createFloor()

    return {
      width: initialFloor.width,
      height: initialFloor.height,
      floor: initialFloor,
      robots: [],
      selectedRobotId: null,
      errorMessage: '',
      minFloorSize: MIN_FLOOR_SIZE,
      maxFloorSize: MAX_FLOOR_SIZE,
      tickCount: 0,
      tickHistory: [],
      tickIntervalMs: 500,
      isPlaying: false,
      playbackTimer: null,
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown)
    this.pauseSimulation()
  },

  // If the simulation is playing, it pauses and starts again so the next tick uses the new interval.
  // If the simulation is paused, it does nothing; the new interval will apply when you press Play.
  watch: {
    tickIntervalMs() {
      if (this.isPlaying) {
        this.pauseSimulation()
        this.playSimulation()
      }
    },
  },
  computed: {
    selectedRobot() {
      return this.robots.find((robot) => robot.id === this.selectedRobotId)
    },
    createCells() {
      const positions = []

      for (let y = this.floor.height - 1; y >= 0; y -= 1) {
        for (let x = 0; x < this.floor.width; x += 1) {
          positions.push({
            x,
            y,
            robot: this.robots.find(
              (robot) =>
                robot.position.x === x && robot.position.y === y,
            ),
          })
        }
      }

      return positions
    },
  },
  methods: {
    createFloorFromInputs() {
      this.errorMessage = ''

      const validSize = (size) =>
        Number.isInteger(size) &&
        size >= MIN_FLOOR_SIZE &&
        size <= MAX_FLOOR_SIZE

      if (!validSize(this.width) || !validSize(this.height)) {
        this.errorMessage = `Enter whole numbers from ${MIN_FLOOR_SIZE} to ${MAX_FLOOR_SIZE}.`
        return
      }

      this.floor = createFloor(this.width, this.height)
      this.robots = []
      this.selectedRobotId = null
      this.pauseSimulation()
      this.tickCount = 0
      this.tickHistory = []
    },
    handleCellClick(cell) {
      this.errorMessage = ''

      if (cell.robot) {
        this.selectedRobotId = cell.robot.id
        return
      }

      try {
        const result = placeRobot(this.floor, this.robots, cell)
        this.robots = result.robots
        this.selectedRobotId = result.robot.id
      } catch (error) {
        this.errorMessage = error.message
      }
    },
    queueCommand(command) {
      if (!this.selectedRobotId) {
        return
      }

      this.robots = queueRobotCommand(
        this.robots,
        this.selectedRobotId,
        command,
      )
    },
    stepSimulation() {
      const { robots, results } = advanceTick(this.floor, this.robots)
      this.robots = robots
      this.tickCount += 1
      this.tickHistory.unshift({
        number: this.tickCount,
        results,
      })
    },
    playSimulation() {
      if (this.isPlaying) {
        return
      }

      this.isPlaying = true
      this.scheduleNextTick()
    },
    pauseSimulation() {
      this.isPlaying = false
      if (this.playbackTimer !== null) {
        clearTimeout(this.playbackTimer)
        this.playbackTimer = null
      }
    },
    scheduleNextTick() {
      if (!this.isPlaying) {
        return
      }

      this.playbackTimer = setTimeout(() => {
        this.playbackTimer = null
        if (!this.isPlaying) {
          return
        }

        this.stepSimulation()
        this.scheduleNextTick()
      }, this.tickIntervalMs)
    },
    togglePlayback() {
      if (this.isPlaying) {
        this.pauseSimulation()
      } else {
        this.playSimulation()
      }
    },
    describeTickResult(result) {
      if (result.action === 'idle') {
        return `${result.robotId}: idle`
      }
      if (result.action === 'turned') {
        return `${result.robotId}: turned ${result.command}, now facing ${result.facing}`
      }
      if (result.action === 'moved') {
        return `${result.robotId}: moved to (${result.to.x}, ${result.to.y})`
      }

      const blockedBy = result.blockedBy ? ` by ${result.blockedBy}` : ''
      return `${result.robotId}: blocked (${result.reason}${blockedBy})`
    },
    handleKeydown(event) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
      ) {
        return
      }

      const commandsByKey = {
        ArrowUp: 'MOVE',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
      }
      const command = commandsByKey[event.key]

      if (!command || !this.selectedRobotId) {
        return
      }

      event.preventDefault()
      this.queueCommand(command)
    },
    facingArrow(facing) {
      if (facing === 'NORTH') {
        return '↑'
      } else if (facing === 'EAST') {
        return '→'
      } else if (facing === 'SOUTH') {
        return '↓'
      } else if (facing === 'WEST') {
        return '←'
      }

      return ''
    },
  },
}
</script>

<template>
  <main class="app-shell">
    <header class="page-header">
      <p class="eyebrow">Fleet Floor Simulator</p>
      <h1>Create a floor</h1>
      <p>Choose the grid dimensions to get started.</p>
    </header>

    <section class="panel" aria-labelledby="dimensions-heading">
      <h2 id="dimensions-heading">Floor dimensions</h2>
      <form class="dimension-form" @submit.prevent="createFloorFromInputs">
        <label class="dimension-field">
          <span>Width</span>
          <input
            v-model.number="width"
            type="number"
            :min="minFloorSize"
            :max="maxFloorSize"
            step="1"
            required
          />
        </label>

        <label class="dimension-field">
          <span>Height</span>
          <input
            v-model.number="height"
            type="number"
            :min="minFloorSize"
            :max="maxFloorSize"
            step="1"
            required
          />
        </label>

        <button type="submit">Create floor</button>
      </form>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>
    </section>

    <section class="panel floor-panel" aria-labelledby="floor-heading">
      <div class="floor-header">
        <h2 id="floor-heading">Floor</h2>
        <p>{{ floor.width }} × {{ floor.height }}</p>
      </div>

      <div class="floor-scroll">
        <div class="floor-layout">
          <div
            class="axis y-axis"
            :style="{ gridTemplateRows: `repeat(${floor.height}, 2rem)` }"
            aria-hidden="true"
          >
            <span v-for="row in floor.height" :key="row">
              {{ floor.height - row }}
            </span>
          </div>

          <div class="grid-and-x-axis">
            <div
              class="floor-grid"
              :style="{ gridTemplateColumns: `repeat(${floor.width}, 2rem)` }"
              role="grid"
              :aria-label="`${floor.width} by ${floor.height} floor grid`"
            >
              <button
                v-for="cell in createCells"
                :key="`${cell.x},${cell.y}`"
                class="floor-cell"
                :class="{
                  'has-robot': cell.robot,
                  selected: cell.robot?.id === selectedRobotId,
                }"
                role="gridcell"
                :aria-label="
                  cell.robot
                    ? `${cell.robot.id} at ${cell.x}, ${cell.y}, facing ${cell.robot.facing}. Click to select.`
                    : `Place robot at ${cell.x}, ${cell.y}`
                "
                :aria-pressed="cell.robot?.id === selectedRobotId"
                @click="handleCellClick(cell)"
              >
                <template v-if="cell.robot">
                  <span>{{ cell.robot.id }}</span>
                  <span class="robot-facing" aria-hidden="true">
                    {{ facingArrow(cell.robot.facing) }}
                  </span>
                </template>
              </button>
            </div>

            <div
              class="axis x-axis"
              :style="{ gridTemplateColumns: `repeat(${floor.width}, 2rem)` }"
              aria-hidden="true"
            >
              <span v-for="column in floor.width" :key="column">
                {{ column - 1 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p class="origin-note">Coordinates start at (0, 0) in the bottom-left.</p>
      <p v-if="selectedRobotId" class="selection-note" role="status">
        Selected robot: {{ selectedRobotId }}
      </p>
    </section>

    <section class="panel" aria-labelledby="commands-heading">
      <h2 id="commands-heading">Queue commands</h2>
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
          :disabled="!selectedRobot"
          @click="queueCommand('MOVE')"
        >
          ↑ Move
        </button>
        <button
          type="button"
          :disabled="!selectedRobot"
          @click="queueCommand('LEFT')"
        >
          ← Left
        </button>
        <button
          type="button"
          :disabled="!selectedRobot"
          @click="queueCommand('RIGHT')"
        >
          → Right
        </button>
      </div>
      <p class="keyboard-note">
        Arrow keys work when focus is outside a text or number field.
      </p>
    </section>

    <section class="panel" aria-labelledby="ticks-heading">
      <h2 id="ticks-heading">Simulation ticks</h2>
      <div class="tick-controls">
        <button
          type="button"
          :disabled="isPlaying"
          @click="stepSimulation"
        >
          Step
        </button>
        <button type="button" @click="togglePlayback">
          {{ isPlaying ? 'Pause' : 'Play' }}
        </button>
        <label class="interval-field">
          <span>Tick interval (ms)</span>
          <input
            v-model.number="tickIntervalMs"
            type="range"
            min="100"
            max="5000"
            step="100"
          />
          <output>{{ tickIntervalMs }} ms</output>
        </label>
      </div>
      <p class="tick-count" role="status">Current tick: {{ tickCount }}</p>

      <div v-if="tickHistory.length" class="tick-history">
        <h3>Tick results</h3>
        <ol class="tick-list">
          <li v-for="tick in tickHistory" :key="tick.number">
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
              {{ robot.facing }}
            </span>
          </div>
          <div class="queue-display">
            <span class="queue-label">Queue:</span>
            <span v-if="robot.queue.length === 0" class="empty-queue">
              Empty
            </span>
            <ol v-else class="queue-items" :aria-label="`${robot.id} queue`">
              <li v-for="(command, index) in robot.queue" :key="index">
                {{ command }}
              </li>
            </ol>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style>
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: #172033;
  background: #f3f5f8;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input {
  font: inherit;
}

.app-shell {
  width: min(100% - 2rem, 880px);
  margin: 0 auto;
  padding: 3rem 0;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1,
.page-header p,
.panel h2,
.floor-header p,
.origin-note {
  margin: 0;
}

.page-header h1 {
  margin-top: 0.3rem;
  font-size: clamp(1.8rem, 5vw, 2.4rem);
}

.page-header > p:last-child {
  margin-top: 0.5rem;
  color: #596579;
}

.eyebrow {
  color: #5263b8;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel {
  margin-top: 1rem;
  padding: 1.25rem;
  border: 1px solid #dfe4ec;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 0.25rem 1rem rgb(24 39 75 / 5%);
}

.panel h2 {
  font-size: 1.1rem;
}

.dimension-form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
  margin-top: 1rem;
}

.dimension-field {
  display: grid;
  gap: 0.4rem;
  color: #465166;
  font-size: 0.9rem;
  font-weight: 600;
}

.dimension-field input {
  width: 7rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid #cbd3df;
  border-radius: 0.4rem;
  color: #172033;
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

.dimension-field input:focus-visible,
button:focus-visible {
  outline: 3px solid #9ca9f0;
  outline-offset: 2px;
}

button {
  min-height: 2.55rem;
  padding: 0.6rem 1rem;
  border: 0;
  border-radius: 0.4rem;
  background: #4355b5;
  color: white;
  font-weight: 650;
  cursor: pointer;
}

button:hover {
  background: #344594;
}

.error-message {
  margin: 0.9rem 0 0;
  color: #b42318;
}

.floor-panel {
  padding-bottom: 1rem;
}

.floor-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.floor-header p,
.origin-note {
  color: #596579;
  font-size: 0.9rem;
}

.floor-scroll {
  overflow-x: auto;
  padding: 0.25rem 0 0.5rem;
}

.floor-layout {
  display: grid;
  grid-template-columns: auto max-content;
  align-items: start;
  gap: 0.4rem;
  width: max-content;
}

.axis {
  display: grid;
  color: #667085;
  font-size: 0.75rem;
  text-align: center;
}

.y-axis {
  align-items: center;
}

.grid-and-x-axis {
  display: grid;
  gap: 0.35rem;
}

.floor-grid {
  display: grid;
  gap: 2px;
  padding: 2px;
  border: 1px solid #cbd3df;
  border-radius: 0.35rem;
  background: #dce2eb;
}

.floor-cell {
  display: flex;
  min-height: 0;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0;
  border-radius: 0;
  background: #fff;
  color: #172033;
  font-size: 0.55rem;
  line-height: 1;
}

.floor-cell:hover {
  background: #eef1ff;
}

.floor-cell.has-robot {
  background: #dce5ff;
  color: #263b91;
  font-weight: 700;
}

.floor-cell.selected {
  box-shadow: inset 0 0 0 2px #4355b5;
}

.robot-facing {
  font-size: 0.8rem;
}

.x-axis {
  align-items: center;
}

.origin-note {
  margin-top: 0.75rem;
}

.selection-note {
  margin: 0.5rem 0 0;
  color: #344594;
  font-weight: 650;
}

.commands-description,
.keyboard-note {
  margin: 0.75rem 0 0;
  color: #596579;
}

.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.tick-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  margin-top: 1rem;
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

.command-buttons button:disabled {
  background: #aab2c3;
  cursor: not-allowed;
}

.keyboard-note {
  font-size: 0.85rem;
}

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
