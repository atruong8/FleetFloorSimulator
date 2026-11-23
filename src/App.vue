<script>
import {
  createFloor as makeInitialFloor,
  MAX_FLOOR_SIZE,
  MIN_FLOOR_SIZE,
} from '../engine/floor.js'
import {
  advanceWorldTick,
  clearWorldHistory,
  createFloor,
  getWorld,
  placeWorldRobot,
  queueWorldCommand,
  queueWorldGoto,
  toggleWorldCharger,
  toggleWorldObstacle,
} from './services/worldApi.js'
import CommandPanel from './components/CommandPanel.vue'
import FloorDimensions from './components/FloorDimensions.vue'
import FloorGrid from './components/FloorGrid.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import RobotList from './components/RobotList.vue'
import SimulationPanel from './components/SimulationPanel.vue'

export default {
  components: {
    CommandPanel,
    FloorDimensions,
    FloorGrid,
    HistoryPanel,
    RobotList,
    SimulationPanel,
  },
  data() {
    const initialFloor = makeInitialFloor()

    return {
      width: initialFloor.width,
      height: initialFloor.height,
      floor: initialFloor,
      robots: [],
      history: [],
      selectedRobotId: null,
      obstacleMode: false,
      chargerMode: false,
      errorMessage: '',
      isLoading: true,
      isReady: false,
      isSaving: false,
      minFloorSize: MIN_FLOOR_SIZE,
      maxFloorSize: MAX_FLOOR_SIZE,
      tickCount: 0,
      tickIntervalMs: 500,
      isPlaying: false,
      playbackTimer: null,
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown)
    this.loadWorld()
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown)
    this.pauseSimulation()
  },
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
    tickHistory() {
      return this.history
        .filter((entry) => entry.type === 'tick.completed')
        .map((entry) => ({
          id: entry.id,
          number: entry.tick,
          results: entry.payload.results,
        }))
        .reverse()
    },
  },
  methods: {
    applyWorld(world) {
      this.floor = world.floor
      this.width = world.floor.width
      this.height = world.floor.height
      this.robots = world.robots
      this.tickCount = world.tickCount
      this.history = world.history

      if (!this.robots.some((robot) => robot.id === this.selectedRobotId)) {
        this.selectedRobotId = null
      }
    },
    async loadWorld() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        this.applyWorld(await getWorld())
        this.isReady = true
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isLoading = false
      }
    },
    async saveWorldChange(change) {
      if (!this.isReady || this.isSaving) {
        return false
      }

      this.errorMessage = ''
      this.isSaving = true

      try {
        this.applyWorld(await change())
        return true
      } catch (error) {
        this.errorMessage = error.message
        if (this.isPlaying) {
          this.pauseSimulation()
        }
        return false
      } finally {
        this.isSaving = false
      }
    },
    async clearSimulationHistory() {
      const confirmed = window.confirm(
        'Clear simulation history? The current floor, robots, queues, and tick count will be kept.',
      )
      if (!confirmed) {
        return
      }

      return this.saveWorldChange(clearWorldHistory)
    },
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

      this.pauseSimulation()
      return this.saveWorldChange(() => createFloor(this.width, this.height))
    },
    async handleCellClick({ cell, shiftKey }) {
      this.errorMessage = ''

      if (this.obstacleMode) {
        if (cell.robot) {
          this.errorMessage = 'Cannot place an obstacle under a robot.'
          return
        }

        await this.saveWorldChange(() => toggleWorldObstacle(cell))
        return
      }

      if (this.chargerMode) {
        await this.saveWorldChange(() => toggleWorldCharger(cell))
        return
      }

      if (shiftKey && this.selectedRobotId) {
        await this.saveWorldChange(() =>
          queueWorldGoto(this.selectedRobotId, cell),
        )
        return
      }

      if (cell.obstacle) {
        this.errorMessage = 'Enable obstacle edit mode to remove this obstacle.'
        return
      }

      if (cell.robot) {
        this.selectedRobotId = cell.robot.id
        return
      }

      const saved = await this.saveWorldChange(() => placeWorldRobot(cell))
      if (saved) {
        this.selectedRobotId = this.robots[this.robots.length - 1]?.id ?? null
      }
    },
    queueCommand(command) {
      if (!this.selectedRobotId || !this.isReady || this.isSaving) {
        return
      }

      return this.saveWorldChange(() =>
        queueWorldCommand(this.selectedRobotId, command),
      )
    },
    stepSimulation() {
      return this.saveWorldChange(advanceWorldTick)
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

        this.stepSimulation().then((saved) => {
          if (saved) {
            this.scheduleNextTick()
          } else {
            this.pauseSimulation()
          }
        })
      }, this.tickIntervalMs)
    },
    togglePlayback() {
      if (this.isPlaying) {
        this.pauseSimulation()
      } else {
        this.playSimulation()
      }
    },
    toggleObstacleMode() {
      this.obstacleMode = !this.obstacleMode
      if (this.obstacleMode) {
        this.chargerMode = false
      }
    },
    toggleChargerMode() {
      this.chargerMode = !this.chargerMode
      if (this.chargerMode) {
        this.obstacleMode = false
      }
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

      if (
        !command ||
        !this.selectedRobotId ||
        !this.isReady ||
        this.isSaving
      ) {
        return
      }

      event.preventDefault()
      this.queueCommand(command)
    },
  },
}
</script>

<template>
  <main class="app-shell">
    <header class="page-header">
      <p class="eyebrow">Fleet Floor Simulator</p>
      <h1>Create a floor</h1>
      <p class="header-description">Choose the grid dimensions to get started.</p>
      <p v-if="isLoading" role="status">Loading saved simulation…</p>
    </header>

    <FloorDimensions
      :width="width"
      :height="height"
      :min-floor-size="minFloorSize"
      :max-floor-size="maxFloorSize"
      :error-message="errorMessage"
      :is-ready="isReady"
      :is-saving="isSaving"
      :is-loading="isLoading"
      @update:width="width = $event"
      @update:height="height = $event"
      @create-floor="createFloorFromInputs"
      @retry="loadWorld"
    />

    <FloorGrid
      :floor="floor"
      :robots="robots"
      :selected-robot-id="selectedRobotId"
      :obstacle-mode="obstacleMode"
      :charger-mode="chargerMode"
      :is-ready="isReady"
      :is-saving="isSaving"
      @cell-click="handleCellClick"
      @toggle-obstacle-mode="toggleObstacleMode"
      @toggle-charger-mode="toggleChargerMode"
    />

    <CommandPanel
      :selected-robot="selectedRobot"
      :is-ready="isReady"
      :is-saving="isSaving"
      @queue-command="queueCommand"
    />

    <SimulationPanel
      :tick-history="tickHistory"
      :tick-count="tickCount"
      :tick-interval-ms="tickIntervalMs"
      :is-playing="isPlaying"
      :is-ready="isReady"
      :is-saving="isSaving"
      @step="stepSimulation"
      @toggle-playback="togglePlayback"
      @interval-change="tickIntervalMs = $event"
    />

    <HistoryPanel
      :history="history"
      :is-ready="isReady"
      :is-saving="isSaving"
      @clear-history="clearSimulationHistory"
    />

    <RobotList :robots="robots" :selected-robot-id="selectedRobotId" />
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
.panel h2 {
  margin: 0;
}

.page-header h1 {
  margin-top: 0.3rem;
  font-size: clamp(1.8rem, 5vw, 2.4rem);
}

.page-header > .header-description,
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

button:disabled {
  background: #aab2c3;
  cursor: not-allowed;
}

button:focus-visible {
  outline: 3px solid #9ca9f0;
  outline-offset: 2px;
}

.commands-description {
  margin: 0.75rem 0 0;
  color: #596579;
}
</style>
