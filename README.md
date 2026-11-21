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

The runner currently supports `FLOOR W,H` and `REPORT`. The floor defaults to
5×5 when no `FLOOR` command is provided. Robot commands and ticks are not yet
supported by the scenario runner.

```sh
npm run scenario -- scenarios/floor-only.txt
```

Expected output:

```text
EMPTY
```

The UI supports creating floors, placing robots, queueing `MOVE`, `LEFT`, and
`RIGHT`, and stepping or playing the simulation. The NestJS API stores the
current world snapshot and an append-only event history in SQLite. The UI loads
the saved world when opened and records floor creation, robot placement,
queued commands, obstacle changes, and completed ticks. Starting a new floor
resets the current world but preserves the event history.
