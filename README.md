# Fleet Floor Simulator

## Setup

```sh
npm install
npm run dev
```

## Tests

```sh
npm run test:engine
```

## Scenario runner

The runner currently supports `FLOOR W,H` and `REPORT`. The floor defaults to
5×5 when no `FLOOR` command is provided. Since robot commands are not
implemented yet, each `REPORT` prints `EMPTY`.

```sh
npm run scenario -- scenarios/floor-only.txt
```

Expected output:

```text
EMPTY
```

The UI currently supports creating a floor, placing and selecting robots,
queueing `MOVE`, `LEFT`, and `RIGHT`, and stepping or playing the simulation.
The tick engine resolves simultaneous movement and records tick results in
memory for the current page session.

The scenario runner does not yet support robot commands or ticks. Persistence
and saving tick history are also not implemented yet.
