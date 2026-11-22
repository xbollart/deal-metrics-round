# Code review

- **Date:** 2026-11-21
- **Commit reviewed:** `a8ef519` (Repo initialization)
- **Scope:** the tooling stack, the application code in `app/`, and the tests in `test/`
- **Environment used:** Node 26.8.1, npm 11.19.0

This is an analysis only. No fix described here has been applied.

## Status on 2026-11-22

The review below describes the repository as it was at commit `a8ef519`. Since then, all 7 steps of the [refactor plan](refactor-plan.md) and some housekeeping have been done. This section says where each finding stands; the findings themselves are left as written, as a record.

Files and commands named in the findings have changed:

| At the time of the review | Now |
|---|---|
| `test/jest/`, `test/mocha/`, `test/vitest/` | `test/unit/` and `test/e2e/` (Vitest only) |
| `test/golden-master-text-test.ts` | `app/report.ts` (the report) and `app/program.ts` (the entry point) |
| `npx ts-node test/golden-master-text-test.ts` | `npm start` |
| `npm run compile` | `npm run typecheck` |
| `jest.config.ts`, `.mocharc.js`, `.nycrc.js`, `texttest_rig.py` | Deleted |
| `vitest.config.ts` | `vitest.config.mts` |

### Stack findings

| Finding | Status |
|---|---|
| 1.1 Installs are not reproducible | Resolved: `package-lock.json` is versioned, and Node is pinned with `engines` and `.nvmrc` |
| 1.2 The type-check is broken | Resolved in step 2: `npm run typecheck` passes with TypeScript 7 |
| 1.3 Three test runners | Resolved in step 1: Vitest only |
| 1.4 Dependencies are far behind | Resolved in steps 1 and 2: five dev dependencies, all on their current major version |
| 1.5 The npm scripts have gaps | Resolved in steps 1 to 3: `start`, `typecheck`, `test`, `test:watch`, `test:coverage` |
| 1.6 Strictness is undermined | Partly resolved: the target is `es2022` and `include` is set. `noImplicitAny` stays `false`, because turning it on would flag the `Item` constructor, which the kata forbids changing |
| 1.7 No linter, formatter or CI | Resolved in step 7: Biome for linting and formatting, and a GitHub Actions workflow (not run yet, since the commits are not pushed) |
| 1.8 Leftovers from the upstream repository | Resolved: `texttest_rig.py` is deleted and the README is rewritten |
| 1.9 The upstream TextTest setup adds no coverage | Closed: nothing in the repo refers to TextTest any more |

`npm audit` now reports no vulnerability (it reported 14).

### Application code findings

| Finding | Status |
|---|---|
| 2.1 Conjured items are missing | Resolved in step 6: Conjured items lose quality twice as fast as normal items |
| 2.2 Item types matched by exact, full name | Partly resolved in step 6: Conjured items are matched on the prefix `Conjured`. Aged Brie, Backstage passes and Sulfuras are still matched on their exact name |
| 2.3 `updateQuality` is one nested block | Resolved in step 5: one flat function per category |
| 2.4 Bounds applied per step, not enforced | Open: the behaviour is pinned by tests since step 4, including a grid test over 4,845 combinations, but not fixed by the plan |
| 2.5 Magic numbers | Resolved in step 5: named constants, with thresholds written as 10 and 5 days |
| 2.6 Small code smells | Resolved in step 5 |
| 2.7 `Item` constructor parameters are untyped | Mitigated in step 7: the class is unchanged, but `updateQuality` now refuses a sellIn or quality that is not a whole number |
| 2.8 `updateQuality` mutates the items in place | Open: not addressed by the plan |

`app/gilded-rose.ts` was refactored in step 5 without changing its behaviour for whole-number inputs. The line numbers quoted in the findings refer to the original version.

### Test findings

| Finding | Status |
|---|---|
| 3.1 The unit tests are placeholders | Resolved in step 4: `test/unit/gilded-rose.spec.ts` holds 54 named tests |
| 3.2 All real coverage comes from one 30-day run | Resolved in step 4: the unit tests alone cover `app/gilded-rose.ts` at 100% and detect all 55 mutations |
| 3.3 Cases the snapshot does not cover | Resolved in step 4 for out-of-range inputs and name variants, which are pinned by tests. Correct Conjured behaviour is tested since step 6 |
| 3.4 The approval tests are fragile | Resolved: the end-to-end test launches the program as a separate process and reads its output, with no patching of `console.log` or `process.argv` |
| 3.5 The golden-master script has side effects | Resolved: the report is a function that returns text (`buildReport` in `app/report.ts`), and since step 7 the program refuses an invalid number of days with an error message and exit code 1 |
| 3.6 The three runners repeat the same scenarios | Resolved in step 1 |

Coverage as measured now, on the unit tests alone: 100% statements and branches on `app/gilded-rose.ts` and `app/report.ts`. The end-to-end test runs the program in a separate process, so it does not count towards coverage, and `app/program.ts` is excluded for that reason.

## Summary

The project is the Gilded Rose refactoring kata in TypeScript: 69 lines of application code and about 150 lines of tests.

- The existing business rules behave as the requirements describe.
- The one feature the requirements ask for, "Conjured" items, is not implemented.
- The only real test is a 30-day snapshot run; the unit tests are placeholders that fail by design.
- The stack is old and triplicated: three test runners, a type-check that fails, and installs that are not reproducible.

## What was run

| Check | Result |
|---|---|
| `tsc --noEmit` | Fails, with errors only in `node_modules` type definitions |
| Jest | 2 approval tests pass, placeholder `fixme` test fails |
| Vitest | 2 approval tests pass, placeholder `fixme` test fails |
| Mocha | Placeholder `fixme` test fails (it has no approval test) |
| Golden-master script via `ts-node` | Runs and prints the expected output |
| `npm audit` | 14 vulnerabilities (3 critical, 2 high), all in dev dependencies |
| Edge-case probe of `updateQuality` | See [Behaviour against the requirements](#behaviour-against-the-requirements) |

## Part 1 — Stack

Findings are ordered by importance.

### 1.1 Installs are not reproducible

- `.gitignore` excludes `package-lock.json`, so each install can resolve different versions.
- There is no `engines` field and no `.nvmrc`.
- The runtime is Node 26 while `@types/node` is at 18.

### 1.2 The type-check is broken

`tsconfig.json` has no `skipLibCheck` and no `types` restriction.

- Jest and Mocha both declare the globals `describe`, `it` and `beforeEach`, and their typings collide.
- TypeScript 4.9 cannot parse the typings of some newer dependencies.
- As a result `npm run compile` cannot pass.

### 1.3 Three test runners do the same job

Jest, Mocha + Chai + nyc, and Vitest each have their own config and their own coverage provider (v8, nyc and istanbul), all writing to `coverage/`. This causes finding 1.2 and most of the dependency weight.

### 1.4 Dependencies are far behind

| Package | Installed | Latest |
|---|---|---|
| vitest | 0.28.5 | 5.1.1 |
| @vitest/coverage-istanbul | 0.28.5 | 5.1.1 |
| typescript | 4.9.5 | 7.0.2 |
| jest | 29.7.0 | 30.5.2 |
| mocha | 10.8.2 | 12.0.3 |
| nyc | 15.1.0 | 18.0.0 |
| chai | 4.5.0 | 6.3.0 |
| rimraf | 4.4.1 | 6.1.4 |
| @types/node | 18.19.130 | 26.6.6 |

The `^0.28.5` range on Vitest only allows 0.28.x, so it blocks any upgrade.

### 1.5 The npm scripts have gaps

- There is no `test` script, so the `pretest` hook never fires.
- `test:vitest` starts in watch mode, which would hang in CI.
- The `rimraf app/**/*.js` globs are unquoted, and rimraf 4 does not expand globs by default, so the clean step likely does nothing.

### 1.6 Strictness is undermined

- `noImplicitAny: false` cancels part of `strict`.
- The compile target is `es5`.
- There is no `include`, so `tsc` also compiles the tests and the config files.

### 1.7 No linter, formatter or CI

Only `.editorconfig` exists.

### 1.8 Leftovers from the upstream repository

- `texttest_rig.py` points to a `TypeScript/` subfolder that does not exist in this repo.
- `README.md` links to `../texttests/README.md` and `../texttests/config.gr`, which only exist in the upstream repo.
- `README.md` says there are two test frameworks and omits Vitest.

### 1.9 The upstream TextTest setup adds no coverage

The upstream `texttests/` folder holds a single test case, `ThirtyDays`, which runs the golden-master script with the argument `30`. Its expected output (373 lines) is byte-identical to what `npx ts-node test/golden-master-text-test.ts 30` prints here. The "should thirtyDays" snapshot tests in Jest and Vitest already cover the same run, so the TextTest section of the README and `texttest_rig.py` can be removed without losing coverage.

## Part 2 — Application code

File reviewed: [`app/gilded-rose.ts`](../app/gilded-rose.ts).

### Behaviour against the requirements

Each row is one call to `updateQuality` on a single item.

| Case | Input (sellIn, quality) | Result | Verdict |
|---|---|---|---|
| Conjured Mana Cake | 3, 6 | 2, 5 | Wrong: should lose 2, treated as a normal item |
| Conjured Mana Cake, expired | 0, 6 | -1, 4 | Wrong: should lose 4 |
| Normal item above the cap | 5, 60 | 4, 59 | Quality over 50 is never clamped |
| Normal item, negative quality | 5, -3 | 4, -3 | Negative quality is never corrected |
| Normal item, expired | 0, 1 | -1, 0 | Correct |
| Backstage passes, 11 days | 11, 10 | 10, 11 | Correct |
| Backstage passes, 10 days | 10, 10 | 9, 12 | Correct |
| Backstage passes, 5 days | 5, 10 | 4, 13 | Correct |
| Backstage passes, concert day | 0, 10 | -1, 0 | Correct |
| Aged Brie, expired | 0, 49 | -1, 50 | Rises by 2 after the sell date and caps at 50; the spec does not state the doubling |
| Aged Brie above the cap | 5, 60 | 4, 60 | Stays above 50 |
| Sulfuras | 5, 40 | 5, 40 | Never changes, but nothing enforces the "always 80" rule |
| "Backstage passes to a Other concert" | 5, 10 | 4, 9 | Treated as a normal item |
| "aged brie" (lower case) | 5, 10 | 4, 9 | Treated as a normal item |

### 2.1 Conjured items are missing

This is the one feature the requirements ask for. The golden-master script carries the comment "this conjured item does not work properly yet".

### 2.2 Item types are matched by exact, full name

The three names are string literals repeated ten times in `updateQuality`. The requirements talk about categories ("Backstage passes", "Sulfuras", "Conjured"), so any other pass or a different casing silently falls through to the normal-item rules.

### 2.3 `updateQuality` is one 45-line block nested five levels deep

- The rules for each item type are spread across three separate sections of the method, so no single place shows how one type behaves.
- Most conditions are negative (`name != X`), which makes them harder to follow.
- `this.items[i]` is repeated about 30 times instead of using a local variable.

### 2.4 The bounds are applied per step, not enforced

The code checks `quality < 50` and `quality > 0` before each change, so out-of-range input stays out of range.

### 2.5 Magic numbers

50, 11 and 6 are inline. The thresholds are written as `< 11` and `< 6` where the requirements say "10 days or less" and "5 days or less".

### 2.6 Small code smells

- Loose `==` / `!=` throughout.
- `quality = quality - quality` instead of `= 0` (line 57).
- Inconsistent semicolons.

### 2.7 `Item` constructor parameters are untyped

The parameters on line 6 are implicitly `any`. Passing strings is accepted and gives coerced results. The requirements forbid altering the `Item` class, so this has to be handled at the call sites or left alone.

### 2.8 `updateQuality` mutates the items in place

It returns the same array it was given. A caller holding the original array sees it change, and the snapshot tests rely on this.

## Part 3 — Tests

### 3.1 The unit tests are placeholders

`test/jest/gilded-rose.spec.ts`, `test/vitest/gilded-rose.spec.ts` and `test/mocha/gilded-rose.spec.ts` each assert that the item name equals `'fixme'` and fail by design.

### 3.2 All real coverage comes from one 30-day run

The approval tests run nine items for 30 days and compare the output to a snapshot. Statement coverage is 100% and branch coverage 96.55%, but when something breaks the snapshot shows a text diff with no named rule.

### 3.3 Cases the snapshot does not cover

- Input quality above 50 or below 0.
- Name variants (other passes, casing).
- A Sulfuras item with a quality other than 80.
- Correct Conjured behaviour. The snapshot pins the current wrong output instead, so implementing Conjured will require updating the snapshot on purpose.

### 3.4 The approval tests are fragile

- The Jest version replaces `console.log` and `process.argv`, and relies on `require` running the script once.
- The Vitest version shells out to `ts-node` through `execSync`.

### 3.5 The golden-master script has side effects

`test/golden-master-text-test.ts` runs on import and prints to the console. A non-numeric days argument becomes `NaN`, and the script then prints nothing without an error.

### 3.6 The three runners repeat the same scenarios

Across the seven test cases there are only two distinct scenarios.

| Scenario | Jest | Vitest | Mocha |
|---|---|---|---|
| Placeholder: one item `foo` (0, 0), asserts the name is `'fixme'` (fails by design) | `gilded-rose.spec.ts` | `gilded-rose.spec.ts` | `gilded-rose.spec.ts` |
| Approval "foo": the same single item, compared to a snapshot | `approvals.spec.ts` | `approvals.spec.ts` | none |
| Approval "thirtyDays": nine items run for 30 days, compared to a snapshot | `approvals.spec.ts` | `approvals.spec.ts` | none |

- **Placeholder tests:** the Jest and Vitest files are byte-identical. The Mocha one differs only in assertion syntax (Chai's `to.equal` instead of `toBe`).
- **Snapshots:** the Jest and Vitest snapshot files differ only in the header line and the test-name separator. The recorded data is the same.
- **Approval tests:** the two versions differ in how they capture the output, not in what they test (see 3.4).

The only test with real coverage is "thirtyDays", and it exists twice. Keeping one runner loses no coverage.

## Recommendations

### Which test runner to keep

Keep Vitest and remove Jest and Mocha.

| Criterion | Vitest | Jest | Mocha |
|---|---|---|---|
| Runs TypeScript without an extra layer | Yes | No, needs `ts-jest` | No, needs `ts-node` |
| Snapshot (approval) tests built in | Yes | Yes | No |
| Coverage | Built in, one extra package | Built in | Needs `nyc` |
| Assertions and mocks built in | Yes | Yes | No, needs `chai` |
| Has the approval tests today | Yes | Yes | No |
| Packages it needs in this repo | 3 | 3 | 7 |

- **Why not Mocha:** it has no approval test today and no snapshot support, and it needs the most packages (`mocha`, `chai`, `nyc`, `ts-node`, `tsconfig-paths`, `source-map-support` and two `@types` packages).
- **Why Vitest over Jest:** both cover the need. Vitest compiles TypeScript itself and resolves the `@/` path alias through one plugin, where Jest needs `ts-jest` and a path mapping in its config. The Vitest API is the same as Jest's (`describe`, `it`, `expect`, `toMatchSnapshot`), so nothing has to be relearned.
- **Cost of choosing Vitest:** it is the most outdated of the three (0.28.5 against 5.1.1), so the upgrade has to happen as part of the consolidation.

Steps the consolidation involves:

1. Upgrade `vitest` and `@vitest/coverage-istanbul` to the current major version.
2. Delete `test/jest/`, `test/mocha/`, `jest.config.ts`, `.mocharc.js` and `.nycrc.js`.
3. Remove the packages only Jest and Mocha use: `jest`, `ts-jest`, `@types/jest`, `mocha`, `@types/mocha`, `chai`, `@types/chai`, `nyc`, `source-map-support` and `tsconfig-paths`.
4. Rewrite the Vitest "thirtyDays" test to call the golden-master logic in-process instead of through `execSync` and `ts-node`. `ts-node` can then be removed as well.
5. Replace the npm scripts with a single `test` script that runs `vitest run`.

Removing Jest and Mocha also removes the global type collision described in 1.2.

### Stack

1. Commit `package-lock.json` and pin the Node version.
2. Keep a single test runner, Vitest (see above).
3. Upgrade TypeScript and the remaining dependencies, and add `skipLibCheck` and an `include` to `tsconfig.json`.
4. Add a `test` script, a linter and a CI workflow.
5. Remove `texttest_rig.py` and the TextTest section of the README.

### Code and tests

1. Replace the placeholder tests with named tests per rule, including the boundary days (11, 10, 6, 5, 0).
2. Refactor `updateQuality` into one function per item category, with the snapshot as the safety net.
3. Add Conjured last and update the snapshot deliberately.
