# deal-metrics-round

This project is the Gilded Rose refactoring kata in TypeScript. The rules of the kata are in [doc/GildedRoseRequirements.md](doc/GildedRoseRequirements.md).

## Requirements

Node.js 22.12 or later (24 and 26 are supported). The version used for development is in `.nvmrc`:

```sh
nvm use
```

## Getting started

Install the dependencies

```sh
npm i
```

Or install the exact versions from the lockfile, without modifying it

```sh
npm ci
```

## Project layout

```
app/
  gilded-rose.ts   Item, GildedRose and the updateQuality rules
  report.ts        buildReport(days): runs a sample inventory and returns the report text
  program.ts       command-line entry point
test/
  approvals.spec.ts     snapshot tests, including the 30-day report
  gilded-rose.spec.ts   unit tests
  __snapshots__/        expected output of the snapshot tests
doc/                    requirements, code review and refactor plan
```

## Run the program

Print the inventory report for 2 days (the default)

```sh
npm start
```

Print it for a given number of days

```sh
npm start -- 30
```

## Check the types

TypeScript is used as a type-checker only; it writes no file.

```sh
npm run typecheck
```

Re-check on every file save

```sh
npx tsc --watch
```

## Run the tests

The tests run with [Vitest](https://vitest.dev/).

Run all tests once

```sh
npm test
```

Run all tests in watch mode (re-runs on every file save, `q` to quit)

```sh
npm run test:watch
```

Run one test file

```sh
npx vitest run test/approvals.spec.ts
```

Run the tests whose name matches a text, here the 30-day report

```sh
npx vitest run -t thirtyDays
```

Do not update the snapshot (`-u`, or `u` in watch mode) unless the change of behaviour is intended.

## Measure the coverage

Run all tests once and print the coverage of `app/`

```sh
npm run test:coverage
```

The same run writes an HTML report, line by line

```sh
open coverage/index.html
```

## All commands

| Command | What it does |
|---|---|
| `npm i` | Installs the dependencies |
| `npm ci` | Installs the exact dependency versions from the lockfile |
| `npm start` | Prints the inventory report for 2 days |
| `npm start -- <days>` | Prints the inventory report for the given number of days |
| `npm run typecheck` | Type-checks the application, the tests and the config |
| `npm test` | Runs all tests once |
| `npm run test:watch` | Runs the tests on every file save |
| `npm run test:coverage` | Runs all tests once with a coverage report |
