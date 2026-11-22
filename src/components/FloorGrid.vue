<script>
export default {
  props: {
    floor: { type: Object, required: true },
    robots: { type: Array, required: true },
    selectedRobotId: { type: String, default: null },
    obstacleMode: { type: Boolean, required: true },
    chargerMode: { type: Boolean, required: true },
    isReady: { type: Boolean, required: true },
    isSaving: { type: Boolean, required: true },
  },
  emits: ['cell-click', 'toggle-obstacle-mode', 'toggle-charger-mode'],
  computed: {
    cells() {
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
            obstacle: this.floor.obstacles.some(
              (obstacle) => obstacle.x === x && obstacle.y === y,
            ),
            charger: this.floor.chargers.some(
              (charger) => charger.x === x && charger.y === y,
            ),
          })
        }
      }

      return positions
    },
  },
  methods: {
    cellAriaLabel(cell) {
      const location = `${cell.x}, ${cell.y}`

      if (this.chargerMode) {
        return `${cell.charger ? 'Remove' : 'Add'} charger at ${location}`
      }

      if (this.obstacleMode) {
        if (cell.robot) {
          return `${cell.robot.id} at ${location}. Cannot place an obstacle under a robot.`
        }
        return `${cell.obstacle ? 'Remove' : 'Add'} obstacle at ${location}`
      }

      if (cell.robot) {
        return `${cell.robot.id} at ${location}, facing ${cell.robot.facing}. Click to select.`
      }
      if (cell.obstacle) {
        return `Obstacle at ${location}. Enable obstacle edit mode to remove.`
      }
      return cell.charger
        ? `Place robot at ${location}, on a charger`
        : `Place robot at ${location}`
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
              v-for="cell in cells"
              :key="`${cell.x},${cell.y}`"
              class="floor-cell"
              :class="{
                'has-robot': cell.robot,
                'has-obstacle': cell.obstacle,
                'has-charger': cell.charger,
                selected: cell.robot?.id === selectedRobotId,
              }"
              :disabled="!isReady || isSaving"
              role="gridcell"
              :aria-label="cellAriaLabel(cell)"
              :aria-pressed="cell.robot?.id === selectedRobotId"
              @click="$emit('cell-click', cell)"
            >
              <span v-if="cell.charger" class="charger-marker" aria-hidden="true">
                C
              </span>
              <span v-if="cell.obstacle" aria-hidden="true">■</span>
              <template v-else-if="cell.robot">
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
    <div class="floor-edit-modes">
      <button
        type="button"
        class="floor-mode-toggle"
        :aria-pressed="obstacleMode"
        :disabled="!isReady || isSaving"
        @click="$emit('toggle-obstacle-mode')"
      >
        Obstacle edit mode
      </button>
      <button
        type="button"
        class="floor-mode-toggle"
        :aria-pressed="chargerMode"
        :disabled="!isReady || isSaving"
        @click="$emit('toggle-charger-mode')"
      >
        Charger edit mode
      </button>
      <p class="obstacle-mode-help" role="status">
        {{
          obstacleMode
            ? 'On — click floor cells to add or remove obstacles. Turn this off to place robots.'
            : chargerMode
              ? 'On — click any floor cell to add or remove a charger (shown as C). Robots can enter chargers and gain 10 battery at tick end.'
              : 'Off — clicking an empty cell places a robot. Turn on an edit mode to change floor cells.'
        }}
      </p>
    </div>
    <p v-if="selectedRobotId" class="selection-note" role="status">
      Selected robot: {{ selectedRobotId }}
    </p>
  </section>
</template>

<style scoped>
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

.floor-header h2,
.floor-header p {
  margin: 0;
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
  position: relative;
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

.floor-cell.has-obstacle {
  background: #465166;
  color: #fff;
}

.floor-cell.selected {
  box-shadow: inset 0 0 0 2px #4355b5;
}

.robot-facing {
  font-size: 0.8rem;
}

.charger-marker {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #a45b00;
  font-size: 0.55rem;
  line-height: 1;
}

.x-axis {
  align-items: center;
}

.origin-note {
  margin-top: 0.75rem;
}

.floor-edit-modes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.floor-mode-toggle[aria-pressed="true"] {
  background: #344594;
}

.floor-mode-toggle[aria-pressed="true"]:hover {
  background: #293879;
}

.obstacle-mode-help {
  margin: 0;
  color: #465166;
  font-size: 0.9rem;
}

.selection-note {
  margin: 0.5rem 0 0;
  color: #344594;
  font-weight: 650;
}
</style>
