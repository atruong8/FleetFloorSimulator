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

The remaining scenario commands and the simulation engine will be added
incrementally.
