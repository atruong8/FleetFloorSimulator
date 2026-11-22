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

The runner currently supports `FLOOR W,H`, `PLACE`, `QUEUE`, `TICK`, and
`REPORT`. The floor defaults to 5×5 when no `FLOOR` command is provided.
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

It reports `R1 1,1,EAST`, `R2 2,1,WEST`, and `R3 3,1,WEST`. `OBSTACLE` and the
assessment's remaining scenario cases are not implemented yet.

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

The UI supports creating floors, placing robots, queueing `MOVE`, `LEFT`, and
`RIGHT`, and stepping or playing the simulation. The NestJS API stores the
current world snapshot and an append-only event history in SQLite. The UI loads
the saved world when opened and records floor creation, robot placement,
queued commands, obstacle changes, and completed ticks. Starting a new floor
resets the current world but preserves the event history.
