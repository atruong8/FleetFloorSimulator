# Fleet Floor Simulator

## Setup

```sh
npm.cmd install
npm.cmd --prefix api install
```

The API uses a local SQLite database at `api/data/fleet-floor.sqlite`. This
database is created automatically and is excluded from version control.

Run the API and Vue app in separate terminals:

```sh
npm.cmd run api:dev
```

```sh
npm.cmd run dev
```

Open the Vite URL printed in the second terminal. Vite forwards `/api` requests
to the NestJS API on port 3000.

## Tests and build

```sh
npm run test:engine
npm.cmd --prefix api run test:e2e
npm.cmd --prefix api run build
npm.cmd run build
```

## Scenario runner

The runner currently supports `FLOOR W,H`, `OBSTACLE X,Y`, `CHARGER X,Y`,
`PLACE`, `QUEUE` (including `GOTO X,Y`), `TICK`, `REPORT`, and
`REPORT BATTERY`. The floor defaults to 5×5 when no `FLOOR` command is
provided.
Commands are run through the shared simulation engine. For example, the
“A chain of robots moves together” scenario is:

```sh
npm run scenario -- scenarios/chain-of-robots-move-together.txt
```

Expected output:

```text
R1 1,0,EAST
R2 2,0,EAST
R3 3,0,EAST
```

The “A head-on swap is blocked” scenario is also included:

```sh
npm run scenario -- scenarios/head-on-swap-blocked.txt
```

It reports both robots at their original positions. The “A contested cell, and
a robot stuck behind the loser” scenario is also included:

```sh
npm run scenario -- scenarios/contested-cell-and-robot-stuck-behind-loser.txt
```

It reports `R1 1,1,EAST`, `R2 2,1,WEST`, and `R3 3,1,WEST`. All five core
scenario examples from the assessment are included; module-specific scenario
commands such as timeline forks and real-time multi-user updates are not
implemented.

Module A's `GOTO` uses breadth-first search over four-directional floor cells.
It recomputes the shortest path every tick, treating obstacles and other
robots' tick-start cells as walls. Equal-length paths prefer NORTH, EAST,
SOUTH, then WEST. If no path exists for three consecutive ticks, the command is
dropped and the `UNREACHABLE` result is recorded in tick history. In the UI,
select a robot and Shift-click a cell to queue `GOTO`.
Run the sample path around an obstacle with:

```sh
npm run scenario -- scenarios/goto-shortest-path.txt
```

It reports `R1 4,0,SOUTH`.

The four-robot rotation example is included as well:

```sh
npm run scenario -- scenarios/rotation-of-four-robots.txt
```

It reports `R1 0,1,NORTH`, `R2 1,1,EAST`, `R3 1,0,SOUTH`, and `R4 0,0,WEST`.

The “Queues of different lengths” example includes two reports across multiple
tick commands:

```sh
npm run scenario -- scenarios/queues-of-different-lengths.txt
```

It reports `R1 2,2,SOUTH` / `R2 1,1,EAST` after three ticks, then
`R1 2,2,SOUTH` / `R2 3,1,EAST` after ten more ticks.

The obstacle example blocks R1's MOVE:

```sh
npm run scenario -- scenarios/obstacle-blocks-move.txt
```

It reports `R1 1,1,EAST`; the queued MOVE is consumed even though it is blocked.

The Module B battery example is in [battery-consumption.txt](scenarios/battery-consumption.txt):

```sh
npm run scenario -- scenarios/battery-consumption.txt
```

It reports `R1 98`: on the 3×1 floor, only two of the three moves succeed, and
blocked moves do not consume battery. This follows the movement rule even though
the PDF example lists `R1 97`.

The charger example shows that a robot can move onto and through a charger cell:

```sh
npm run scenario -- scenarios/charger-recharges-and-allows-passage.txt
```

Chargers do not block movement. Each robot ending a tick on a charger gains 10
battery, up to 100. In the UI, enable **Charger edit mode** and click any cell
to add or remove a charger; turn edit mode off to place robots.

The selected depth modules are **A (Pathfinding)** and **B (Battery and
chargers)**. Pathfinding reuses the shared tick resolver, and the battery
module adds an independent floor-cell type plus battery accounting.

The UI supports creating floors, placing robots, queueing `MOVE`, `LEFT`,
`RIGHT`, and `GOTO`, and stepping or playing the simulation. The NestJS API stores the
current world snapshot and an event history in SQLite. The UI loads
the saved world when opened and records floor creation, robot placement,
queued commands, obstacle and charger changes, and completed ticks. Starting a new floor
resets the current world but preserves the event history. Use **Clear history**
in the UI to delete only history entries; it preserves the current floor,
robots, queues, and tick count.

Robots start with 100 battery, and successful moves consume one. A robot at
zero battery cannot move.
