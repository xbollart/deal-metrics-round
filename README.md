# Gilded Rose

This is the Gilded Rose kata in TypeScript.

## Getting started

Install dependencies

```sh
npm install
```

## Run the tests

The tests run with [Vitest](https://vitest.dev/).

Run all tests once

```sh
npx vitest run
```

Run only the approval tests

```sh
npx vitest run test/vitest/approvals.spec.ts
```

Run only the 30-day approval test

```sh
npx vitest run -t thirtyDays
```

Run all tests in watch mode, with coverage

```sh
npm run test:vitest
```

Do not update the snapshot (`-u`, or `u` in watch mode) unless the change of behaviour is intended.
