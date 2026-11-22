# Refactor plan

- **Created:** 2026-11-21
- **Based on:** [code-review.md](code-review.md)

Each step is meant to be done and committed on its own. A step is finished only when its "Done when" checks pass.

| Step | Title | Status |
|---|---|---|
| 1 | Consolidate the tests on Vitest | Done (2026-11-21) |
| 2 | Fix the compilation | Done (2026-11-22) |
| 3 | Restructure the program and the test layout | Done (2026-11-22) |
| 4 | Verify and close the test coverage | Done (2026-11-22) |
| 5 | Refactor `updateQuality` | Done (2026-11-22) |
| 6 | Implement Conjured items | Done (2026-11-22) |
| 7 | Test the remaining edge cases and finish the tooling | Done (2026-11-22) |

## Step 1 — Consolidate the tests on Vitest

### Goal

Have one test runner, Vitest, with the same coverage as today and no dependency on Jest, Mocha or `ts-node`.

### Why first

- The three runners repeat the same two scenarios, so removing two of them loses no coverage (code review, section 3.6).
- The "thirtyDays" snapshot is the safety net for every later change to `updateQuality`. It should run from one place, with one command, before the application code is touched.
- Removing Jest and Mocha fixes the global type collision that breaks `tsc` (code review, section 1.2).

### Tasks

1. **Upgrade Vitest.** Move `vitest` and `@vitest/coverage-istanbul` from 0.28.5 to the current major version, and adjust `vitest.config.ts` if the new version requires it.
2. **Run the "thirtyDays" test in-process.**
   - Move the body of `test/golden-master-text-test.ts` into an exported function that takes the number of days and returns the output text.
   - Keep the file runnable from the command line with the same output.
   - Change `test/vitest/approvals.spec.ts` to call that function instead of `execSync` and `ts-node`.
3. **Delete the Jest and Mocha tests and configs.**
   - `test/jest/` (including its snapshot)
   - `test/mocha/`
   - `jest.config.ts`, `.mocharc.js`, `.nycrc.js`
4. **Remove the packages that are no longer used.**
   - Jest: `jest`, `ts-jest`, `@types/jest`
   - Mocha: `mocha`, `@types/mocha`, `chai`, `@types/chai`, `nyc`, `source-map-support`, `tsconfig-paths`
   - `ts-node`, once task 2 is done and the command-line run has another way to execute
5. **Simplify the npm scripts.**
   - Add `test` running `vitest run`.
   - Keep a watch script and a coverage script.
   - Remove `test:jest`, `test:jest:watch`, `test:mocha` and the `pretest` hook.
6. **Update `README.md`.** Describe the single runner and its commands, and remove the Jest and Mocha instructions.

### Done when

- `npm test` runs Vitest once and exits, with the placeholder test as its only failure (see below).
- The "thirtyDays" snapshot passes **without being regenerated**. Its recorded data must stay identical to the current one; only the snapshot header may change with the Vitest version.
- No file in the repo references Jest, Mocha, Chai or nyc.
- `app/gilded-rose.ts` is unchanged.

### Out of scope

- Any change to `app/gilded-rose.ts`.
- Writing new tests per rule.
- Upgrading TypeScript, committing the lockfile, adding a linter or CI.

### Known failing test

`test/vitest/gilded-rose.spec.ts` is a placeholder that fails by design (it expects the name `'fixme'`). It is kept as it is in this step, so `npm test` will report exactly one failure, this one, when the step is done. It is replaced in step 4.

### Outcome (2026-11-21)

All "Done when" checks pass:

- `npm test` runs Vitest 5.1.1 once and exits, with the `'fixme'` placeholder as its only failure.
- The snapshot file is byte-identical to the one before the step, and the test passes with `CI=1` (no snapshot can be written).
- `npm start -- 30` prints output identical to the previous `ts-node` run.
- `app/gilded-rose.ts` is unchanged.
- The coverage report now sees the 30-day run: 100% statements, 97.14% branches on `app/gilded-rose.ts` (it was 48.38% and 25.71%). The missed branch is the constructor default on line 16.
- `npm audit` reports 3 moderate vulnerabilities, all through `rimraf` (it was 14, including 3 critical).

Changes that the tasks above did not spell out:

- **`@types/node` 18 → 26.** Vite 8, which Vitest 5 requires, does not accept the Node 18 typings.
- **`tsx` replaces `ts-node`** for the command-line run, exposed as `npm start`. Plain `node` cannot run the script because the imports have no file extension.
- **The golden master is split in two files.** `test/golden-master.ts` exports the function that builds the report; `test/golden-master-text-test.ts` is the command-line entry point.
- **`vite-tsconfig-paths` is removed.** Vite resolves the `@/` alias itself with `resolve.tsconfigPaths`.
- **`vitest.config.ts` is renamed `vitest.config.mts`** to remove a Vite warning about ESM syntax in a CommonJS file.
- **Coverage is limited to `app/` and printed even when a test fails.** Without that, the failing placeholder hides the report.
- **`tsconfig.json` declares the `vitest/globals` types.**
- **The leftover `.nyc_output/` folder is deleted**, along with its `.gitignore` line.

Still open after this step:

- **`tsc` still fails.** The Jest/Mocha collision is gone, but TypeScript 4.9 cannot parse the typings of Vitest 5 and `@types/node` 26. It needs the TypeScript upgrade, which is out of scope here.
- **`texttest_rig.py` still calls `ts-node`.** It was already broken (wrong path) and is listed for removal in the code review.

## Step 2 — Fix the compilation

### Goal

Have `npm run typecheck` type-check the application code, the tests and the config with a current TypeScript version, and pass.

### Why now

- Vitest and `tsx` run the code without type-checking it, so type errors currently go unnoticed.
- The next steps write new tests and restructure `updateQuality`. Both are safer with a working compiler.
- Step 1 removed the Jest/Mocha type collision; what remains is an outdated compiler, which is a contained change.

### Current state

- `tsc` fails with errors located only in `node_modules`: TypeScript 4.9.5 cannot parse the type definitions of Vitest 5 and `@types/node` 26.
- `tsc` writes JavaScript files next to the sources even when it reports errors. A run of `npm run typecheck` leaves `vitest.config.mjs`, `vitest.config.mjs.map` and `.js` files under `app/` and `test/`.
- Those generated files break the test run: Vitest also collects `test/vitest/*.spec.js`, which fail to load, so `npm test` reports 3 failed files instead of 1 until they are deleted.
- `tsconfig.json` has no `include`, targets `es5`, and sets `noImplicitAny: false`.
- The `precompile` script calls `rimraf` with unquoted globs, which likely removes nothing.

### Tasks

1. **Upgrade TypeScript** from 4.9.5 to the current major version (7.0.2 at the time of writing).
2. **Update `tsconfig.json`.**
   - Replace the options the new version no longer accepts. Expected candidates: `target: es5`, `baseUrl`, and the module settings.
   - Add `noEmit: true`. Nothing consumes compiled JavaScript: Vitest and `tsx` run the TypeScript files directly, so `compile` becomes a pure type-check.
   - Add `include` for `app`, `test` and `vitest.config.mts`.
3. **Restrict the Vitest `include` pattern to `.ts` files** in `vitest.config.mts`, so a stray `.js` file can never be collected as a test.
4. **Fix the type errors reported in project files**, if any appear once the compiler can read the dependencies. Errors in `app/gilded-rose.ts` are fixed only if that does not change behaviour or touch the `Item` class.
5. **Simplify the scripts.** Remove `precompile`, and remove the `rimraf` package, which nothing else uses.
6. **Delete the generated files** left by earlier compile runs (`vitest.config.mjs`, `vitest.config.mjs.map`, and any `.js` or `.js.map` under `app/` and `test/`).

### Done when

- `npm run typecheck` exits without error and writes no file.
- `npm test` gives the same result as after step 1: the `'fixme'` placeholder is the only failure, and the snapshot file is unchanged.
- `npm start -- 30` prints the same output as before.
- The runtime behaviour of `app/gilded-rose.ts` is unchanged.
- `npm audit` reports no vulnerability (the 3 remaining ones come through `rimraf`).

### Out of scope

- Turning `noImplicitAny` on. It would flag the untyped `Item` constructor, and the kata forbids altering that class.
- Adding a linter, a formatter or CI.
- Committing `package-lock.json` and pinning the Node version.
- Removing `texttest_rig.py`.

### Outcome (2026-11-22)

All "Done when" checks pass:

- `npm run typecheck` runs TypeScript 7.0.2, exits without error and writes no file. A deliberately wrong test file was rejected, which confirms the tests are type-checked.
- `npm test` gives the same result as after step 1: 2 approval tests pass, the `'fixme'` placeholder is the only failure.
- The snapshot file and `app/gilded-rose.ts` are byte-identical to before the step.
- `npm start -- 30` prints the same output as before.
- Coverage is unchanged: 100% statements, 97.14% branches, line 16 uncovered.
- `npm audit` reports 0 vulnerabilities.

What was changed:

- **`typescript` 4.9.5 → 7.0.2.**
- **`tsconfig.json`:**
  - `target` goes from `es5` to `es2022`, and `baseUrl` is removed; TypeScript 7 rejects both old settings.
  - `module: preserve` and `moduleResolution: bundler` replace `module: commonjs`, to match how Vitest and `tsx` load the files.
  - `noEmit` and `include` are added, and `sourceMap` is removed since nothing is emitted.
  - The `@/*` path is written `./app/*`, as required once `baseUrl` is gone.
- **`vitest.config.mts`:** only `.ts` test files are collected.
- **`package.json`:** the `precompile` script and the `rimraf` package are removed. Five dev dependencies remain.
- **Generated files deleted:** `vitest.config.mjs`, its map, and the `.js` and `.js.map` files under `app/` and `test/`.

No type error was found in the project files, so task 4 needed no change.

## Step 3 — Restructure the program and the test layout

### Goal

Treat the 30-day report as the program of the project, not as a test helper: put it in `app/` with a real entry point, and simplify the test folder and the npm scripts accordingly.

### Why

- The former `test/golden-master*.ts` files are the only runnable part of the project. They build an inventory, run the shop day by day and print a report, which is what a program does.
- With a single test runner left, the `test/vitest/` folder level no longer separated anything.
- The script names `compile` and `e2e-test` did not describe what they did: the first type-checks without compiling, the second runs the program and tests nothing.

### What was done

1. **Moved the report to `app/report.ts`.** It exports `buildReport(days)`, which holds the sample inventory and returns the report text. It was `goldenMaster` in `test/golden-master.ts`.
2. **Created the entry point `app/program.ts`.** A `main()` function reads the number of days from the command line (2 by default) and prints the report. It was `test/golden-master-text-test.ts`.
3. **Moved the spec files and the snapshot up to `test/`.** `test/vitest/` no longer exists. The "thirtyDays" test imports `buildReport` from `@/report`.
4. **Renamed the npm scripts.**

   | Script | Command | Was |
   |---|---|---|
   | `start` | `tsx app/program.ts` | `e2e-test` |
   | `typecheck` | `tsc` | `compile` |
   | `test` | `vitest run` | unchanged |
   | `test:watch` | `vitest` | unchanged |
   | `test:coverage` | `vitest run --coverage` | unchanged |

5. **Updated the references:** the Vitest `include` pattern, and the README command that runs the approval file.

### Resulting layout

```
app/
  gilded-rose.ts      Item, GildedRose, updateQuality
  report.ts           buildReport(days): sample inventory and report text
  program.ts          main(): command-line entry point
test/
  approvals.spec.ts
  gilded-rose.spec.ts
  __snapshots__/approvals.spec.ts.snap
```

### Outcome (2026-11-22)

- `npm run typecheck` exits without error.
- `npm start` and `npm start -- 30` print output identical to the baselines recorded before step 1.
- `npm test` is unchanged: 2 approval tests pass, the `'fixme'` placeholder is the only failure.
- The snapshot file was moved, not regenerated: its recorded data is identical. Only its first line changed, because Vitest 5 rewrote the header comment (`// Vitest Snapshot v1` gained a documentation link) during a local run. `app/gilded-rose.ts` is unchanged.
- Coverage on `app/`: `gilded-rose.ts` and `report.ts` at 100% statements, `program.ts` at 0%, 91.66% overall.

Still open after this step:

- **`app/program.ts` is run by no test.** Step 4 decides whether to test it or exclude it from coverage.
- **The sample inventory is hard-coded in `app/report.ts`.** The snapshot pins it, so it is left as it is until Conjured is implemented in step 6.

## Step 4 — Verify and close the test coverage

### Goal

Have a coverage report that can be trusted, and tests for every behaviour of `updateQuality` that the current snapshot does not pin, before the application code is refactored.

### Why after the compilation fix

- It depends on step 1: the coverage report is only accurate once the "thirtyDays" test runs in-process.
- With step 2 done, the new tests written here are type-checked.
- With step 3 done, the tests and the code they exercise are in their final location.
- The refactor of `updateQuality` relies on the tests to catch regressions, so the gaps have to be closed first.

### Findings from the coverage analysis (2026-11-21)

| Measure | Statements | Branches | Comment |
|---|---|---|---|
| Vitest report | 48.38% | 25.71% | Understated: the "thirtyDays" test runs in a child process that the coverage tool cannot see. Lines 24-39 and 52-61 show as uncovered. |
| Jest report | 100% | 96.29% | Accurate for line coverage. The missed branch is the default argument of the constructor (line 16). |
| Mutation check on `updateQuality` | 53 of 55 changes detected | — | A one-off script altered each comparison, constant and item name, one at a time, and replayed the two test scenarios. |

The two changes the tests did not detect:

| Line | Change that goes unnoticed | Missing test case |
|---|---|---|
| 23 | `quality > 0` becomes `quality > 1` | A normal item with quality 1 before its sell date (should drop to 0) |
| 33 | `quality < 50` becomes `quality < 49` | A backstage pass at quality 48 with 10 days or less (should reach 50) |

Inputs that never appear in any test, and that no coverage tool reports because the code has no branch for them:

- quality above 50 or below 0 as input
- a Sulfuras item with a quality other than 80
- name variants (another backstage pass, different casing)

### Done ahead of this step (2026-11-22)

The two spec files were given one role each:

- **`test/unit/gilded-rose.spec.ts` holds unit tests**, which state the expected value in the test. The "should foo" snapshot test from the approval file was moved here and rewritten as a plain assertion (`foo`, sellIn 0, quality 0 becomes sellIn −1, quality 0). It replaces the `'fixme'` placeholder, so `npm test` now passes.
- **`test/e2e/approvals.spec.ts` holds only the "thirtyDays" snapshot test.** The "should foo" entry was removed from the snapshot file; the 30-day data is unchanged.

The files were then moved into one folder per kind: `test/unit/` and `test/e2e/` (the snapshot folder moved with the approval test).

The end-to-end test was then made fully end to end:

- **`test/e2e/approvals.spec.ts` launches `app/program.ts` as a separate process**, the way `npm start` does, and compares what it prints for 30 days to the snapshot. The snapshot file is unchanged. A second test checks the default of 2 days.
- **`test/unit/report.spec.ts` is new** and tests the layout of the text returned by `buildReport`.
- **`app/program.ts` is excluded from coverage.** It is exercised by the end-to-end tests, in a process the coverage tool cannot see. This settles the question left open by step 3.

Consequence for this step: the 30-day run no longer counts towards coverage. Measured on the unit tests alone, `app/gilded-rose.ts` is at 87.09% statements and 82.85% branches (lines 34, 39 and 53-57 uncovered), and `app/report.ts` at 100%. The named tests per rule of task 2 are what brings `gilded-rose.ts` back to 100%.

### Tasks

1. **Check the coverage report.** Run the coverage script and note the starting point for `app/gilded-rose.ts` (87.09% statements on 2026-11-22, from the unit tests alone).
2. **Add named tests per rule** in `test/unit/gilded-rose.spec.ts`. Each test uses one item and one call to `updateQuality`. The `'fixme'` placeholder is already gone (see "Done ahead of this step").
   - Normal item: before the sell date, after the sell date, quality 1 before the sell date, quality 0.
   - Aged Brie: before and after the sell date, at quality 49 and 50.
   - Backstage passes: at 11, 10, 6, 5 and 0 days; at quality 48 and 49 with 10 days or less, and with 5 days or less.
   - Sulfuras: sellIn and quality unchanged.
   - Constructor called with no argument.
3. **Pin the current behaviour for out-of-range inputs** with tests that record what the code does today, without judging it:
   - quality above 50 and below 0
   - a Sulfuras item with a quality other than 80
   - another backstage pass name and a lower-case "aged brie"
4. **Set coverage thresholds** in `vitest.config.mts` (100% statements and branches for `app/gilded-rose.ts`) so a drop fails the test run.
5. **Re-run the mutation check** and confirm that no change goes undetected.

### Done when

- `npm test` passes with no failure.
- The coverage report shows 100% statements and branches for `app/gilded-rose.ts`.
- The mutation check detects all 55 changes.
- `app/gilded-rose.ts` is unchanged.

### Out of scope

- Any change to `app/gilded-rose.ts`, including fixing the out-of-range behaviour.
- Conjured items. The snapshot keeps pinning their current output until the feature is implemented.
- Adding a mutation-testing tool to the project. The check is run as a one-off script.

### Outcome (2026-11-22)

All "Done when" checks pass:

- `npm test` passes with no failure: 3 files, 61 tests (54 unit tests of `updateQuality`, 5 of `buildReport`, 2 end-to-end).
- The coverage report shows 100% statements and branches for `app/gilded-rose.ts`, up from 87.09% and 82.85%.
- The mutation check detects all 55 changes with the unit tests alone, without the help of the 30-day snapshot.
- `app/gilded-rose.ts` and the snapshot file are byte-identical to before the step.

What was done:

- **`test/unit/gilded-rose.spec.ts` holds 54 named tests**, one item and one call to `updateQuality` each, grouped by category:
  - normal item (9 tests), Aged Brie (8), Backstage passes (16) and Sulfuras (3), including the boundaries at 11, 10, 6, 5 and 0 days and at quality 0, 1, 48, 49 and 50
  - shop (4): no item given, several items updated together, items updated in place, name unchanged
  - current behaviour outside the specified range (14): quality above 50 or below 0, a Sulfuras item with a quality other than 80, and names close to the special ones
- **All 54 tests passed on their first run against the unchanged code.** No expected value had to be adjusted, so the code does what the requirements say for the cases they describe.
- **Coverage thresholds are set** in `vitest.config.mts`: `npm run test:coverage` fails if `app/gilded-rose.ts` drops below 100% statements, branches, functions or lines. This was checked by running coverage with most tests left out, which failed as expected. The thresholds apply to coverage runs, not to a plain `npm test`.
- **The mutation check now runs the real test files.** A one-off script copies the project to a scratch folder, applies each of the 55 changes to `updateQuality` in turn, and runs `test/unit`. It is not part of the repository.

Behaviour pinned by the "outside the specified range" tests, for reference in step 5:

| Input | Result today |
|---|---|
| Normal item at quality 60 | Loses 1 (or 2 after the sell date); never brought back to 50 |
| Normal item at quality −3 | Stays at −3 |
| Aged Brie or backstage pass at quality 60 | Stays at 60 (a pass still drops to 0 after the concert) |
| Aged Brie at quality −3 | Gains 1 |
| Sulfuras at any quality | Unchanged |
| "Backstage passes to a Other concert", "aged brie", "Sulfuras" | Treated as normal items |

### Addition after the step: grid test (2026-11-22)

The "outside the specified range" tests only sample the invalid inputs. A change that affects, say, a backstage pass with negative quality would pass every test of this step. The grid test closes that gap.

- **`test/unit/gilded-rose-grid.spec.ts`** runs one day for every combination of 5 item names, sellIn from −3 to 13 and quality from −3 to 53, which is 4,845 combinations, and compares the results to a snapshot.
- **The snapshot** is `test/unit/__snapshots__/gilded-rose-grid.spec.ts.snap`: one line per name and starting sellIn, 104 lines in total.
- **"Conjured Mana Cake" is one of the 5 names.** It is recorded with its current behaviour, that of a normal item.

Checked in a scratch copy of the project:

- A change that only affects out-of-range input (no second increment for a backstage pass with quality at or below 0) passes the 54 rule tests and the end-to-end snapshot, and fails the grid test.
- The grid test alone detects all 55 changes of the mutation check.

## Step 5 — Refactor `updateQuality`

### Goal

Make the rules of each item category readable in one place, without changing any behaviour, so that Conjured becomes a small addition in step 6.

### Why before Conjured

- In the current code the degradation logic sits in two separate blocks (before and after the sell date). Adding Conjured there means writing the rule twice, in code that this step rewrites anyway.
- With the behaviour frozen, the snapshot and the tests from step 4 must pass untouched. That is the clearest possible check for a structural change.

### Target structure

- One function per category: normal, Aged Brie, Backstage passes, Sulfuras.
- A single place that decides the category of an item from its name.
- Named constants for the three item names, the maximum quality (50) and the backstage thresholds (10 and 5 days).
- `updateQuality` reduced to a loop that, for each item, picks the category and applies its function.
- The normal-item rule written with a degradation rate, so that step 6 can express Conjured as "twice the normal rate".

### Tasks

Each task is a separate commit, and the full test suite passes after each one.

1. **Simplify without restructuring.** Use a local `item` variable and a `for...of` loop, strict equality, and `quality = 0` instead of `quality - quality`.
2. **Introduce the named constants.**
3. **Split the rules by category.** Move the logic into one function per category and reduce `updateQuality` to the dispatch.
4. **Remove what is left of the nested conditions** and re-read each category function against `GildedRoseRequirements.md`.
5. **Re-run the mutation check** on the new code and confirm that no change goes undetected.

### Constraints

- The `Item` class and the `items` property are not altered (requirement of the kata).
- No test and no snapshot is modified in this step. If one has to change, the refactor has changed behaviour and must be corrected.
- The grid snapshot in particular must stay byte-identical: it is the proof that no combination of name, sellIn and quality gives a different result.
- The behaviour pinned in step 4 for out-of-range inputs is preserved. In particular, a helper that clamps quality to 0–50 would change it (quality 60 on a normal item gives 59 today, not 50).
- Item categories keep being matched on the exact, full name.

### Done when

- `npm test` passes with no test or snapshot change since step 4.
- Coverage is still 100% statements and branches on `app/`.
- The mutation check detects every change.
- `updateQuality` has no nested condition deeper than two levels, and no item name or threshold appears as an inline literal.

### Out of scope

- Conjured items.
- Fixing out-of-range inputs or matching categories by partial name. These are behaviour changes and need their own decision.

### Outcome (2026-11-22)

All "Done when" checks pass:

- `npm test` passes, 68 tests. No existing test and no snapshot was modified; 6 tests were added (see the correction below).
- Coverage is still 100% statements and branches on `app/gilded-rose.ts`.
- `updateQuality` is a three-line loop. No function has a condition nested inside another, and no item name or threshold appears as an inline literal.
- The `Item` class and the `items` property are untouched.

The four tasks are four commits, each verified with the type-check, the full test suite, the coverage thresholds and the checksums of the test files:

| Commit | Task |
|---|---|
| `c4b66fe` | Loop over a local `item`, strict equality, `quality = 0` |
| `c94164a` | Named constants for the item names, the quality bounds and the backstage thresholds |
| `c487048` | One function per category, with a single `switch` on the item name |
| `81bb147` | Flat category functions built on `increaseQuality`, `decreaseQuality` and `degrade(item, rate)` |

Resulting structure of `app/gilded-rose.ts`:

- `updateItem` picks the category from the exact item name.
- `updateNormalItem`, `updateAgedBrie`, `updateBackstagePasses` and `updateSulfuras` each hold the rules of one category.
- `degrade(item, rate)` lowers quality by `rate` per day and by twice that after the sell date. A normal item uses the rate 1; step 6 can give Conjured the rate 2.
- `increaseQuality` and `decreaseQuality` change quality by one point and check the bound first. `degrade` removes one point at a time through `decreaseQuality`, which is what keeps the out-of-range behaviour of step 4 (quality 60 gives 59, quality −3 stays −3).

Two checks beyond the test suite:

- **Direct comparison of the original and the refactored code**, with a one-off script: 197,109 one-day cases (9 names, sellIn −60 to 60, quality −60 to 120) and 17,920 shop-days of multi-day sequences. No difference.
- **A new mutation check written for the new code**: 76 changes (comparisons, constants, names, deleted statements, forced conditions). The rule tests detect 74. The other 2 cannot be detected because they change nothing: deleting the call to `updateSulfuras`, which is an empty function, and deleting the `break` after the backstage case, which then falls through to that same empty function.

Correction made after the four commits: two changes of behaviour were removed.

The comparison script also tried decimals, `NaN`, infinities, `null`, `undefined` and strings. At first 36 of these 1,050 cases differed, all for backstage passes, because tasks 1 and 2 had replaced two expressions of the original code. A refactor must not change behaviour, even for values nobody intended, so both expressions were put back and are now pinned by tests:

| Original expression, restored | Input it matters for | Result | Test |
|---|---|---|---|
| `sellIn < 11` and `sellIn < 6`, written as `hasAtMostDaysLeft(item, 10)` and `(item, 5)` | A pass with a decimal sellIn between 10 and 11, or between 5 and 6 | Counts as "10 days or less" (or 5) | Two cases in "current behaviour outside the specified range" |
| `quality - quality`, not `quality = 0` | A pass after the concert whose quality is `NaN` or infinite | `NaN` instead of 0 | The "known bug" block |

- **The `NaN` result is a bug** of the original code: after the concert the quality should be 0. Commit `e7b6644` keeps the bug and exposes it with tests that assert what the code did. It is fixed in the next commit (see "Bug fix" below).
- **6 tests were added** to `test/unit/gilded-rose.spec.ts` for this, which is the only change to a test file in this step. No existing test and no snapshot was modified.
- **After the correction the comparison shows no difference at all**: 0 of 197,109 one-day cases, 0 of the multi-day sequences, and 0 of the 1,050 unusual values.
- **The mutation check was run again** on the corrected code: 76 changes, 74 detected, and the same 2 undetectable ones around the empty `updateSulfuras`.

Bug fix, done after the correction (2026-11-22):

- **The bug:** a backstage pass whose quality is `NaN`, infinite or `undefined` kept a `NaN` quality after the concert, instead of dropping to 0.
- **The tests first:** the three tests that exposed the bug were changed to expect 0, and failed against the code.
- **The fix:** `item.quality = MIN_QUALITY` replaces `item.quality - item.quality` in `updateBackstagePasses`. The three tests then pass.
- **This is the only intended difference with the original code.** The comparison script confirms it: 0 differences on the 197,109 whole-number cases and the multi-day sequences, and 24 on the 1,050 unusual values, all of them expired backstage passes with a `NaN`, infinite or `undefined` quality, now at 0.
- The decimal sellIn behaviour is unchanged and stays pinned.

## Step 6 — Implement Conjured items

### Goal

Implement the one feature the requirements ask for: "Conjured" items degrade in quality twice as fast as normal items.

### Rule

| Situation | Normal item | Conjured item |
|---|---|---|
| Before the sell date | quality − 1 | quality − 2 |
| After the sell date | quality − 2 | quality − 4 |
| Lower bound | 0 | 0 |

`sellIn` decreases by 1 per day, as for a normal item.

### Tasks

1. **Write the tests first** in `test/unit/gilded-rose.spec.ts`; they fail until the rule exists.
   - Before the sell date: (3, 6) becomes (2, 4).
   - After the sell date: (0, 6) becomes (−1, 2).
   - Never below 0: (3, 1) becomes (2, 0), and (0, 3) becomes (−1, 0).
2. **Add the Conjured category** next to the others, reusing the normal rule with a doubled rate.
3. **Update the "thirtyDays" snapshot deliberately** and review its diff. Only the "Conjured Mana Cake" lines may change: (3, 6) → (2, 4) → (1, 2) → (0, 0), then quality stays at 0.
4. **Update the grid snapshot deliberately** and review its diff. Only the lines of the "Conjured Mana Cake" block may change.
5. **Remove the comment** "this conjured item does not work properly yet" from `app/report.ts`.
6. **Re-run coverage and the mutation check.**

### Done when

- The new Conjured tests pass, and every other test passes unchanged.
- The diffs of the "thirtyDays" snapshot and of the grid snapshot contain only "Conjured Mana Cake" lines.
- Coverage is still 100% on `app/`, and the mutation check detects every change.

### Decision on the open point (2026-11-22)

A Conjured item is any item whose name starts with `Conjured`. The requirements name a category, and this covers "Conjured Mana Cake" as well as any future conjured item. The alternative, the exact name "Conjured Mana Cake" only, was not retained.

Consequences, each pinned by a test:

- The match is case-sensitive: "conjured mana cake" is a normal item.
- The prefix must be at the start: "Mana Cake, Conjured" is a normal item.
- "Conjured" alone is a Conjured item.
- "Conjured Aged Brie" is a Conjured item, not an Aged Brie: the special names are still matched exactly, and this name is not one of them.

### Outcome (2026-11-22)

All "Done when" checks pass:

- The new Conjured tests pass, and every other test passes unchanged: 87 tests in total.
- The diff of the "thirtyDays" snapshot has 8 changed lines, all "Conjured Mana Cake": the item goes (3, 6) → (2, 4) → (1, 2) → (0, 0) and stays at 0, where it went (2, 5) → (1, 4) → (0, 3) → (−1, 1) → 0 before.
- The diff of the grid snapshot touches lines 86 to 102 only, the 17 rows of the "Conjured Mana Cake" block.
- Coverage is 100% statements and branches on `app/gilded-rose.ts`.
- The mutation check tried 88 changes and the rule tests detect 86. The other 2 are the undetectable ones around the empty `updateSulfuras`, as in step 5.

How it was done:

1. **Tests first.** 19 tests were added to `test/unit/gilded-rose.spec.ts`: 11 for the rule, 6 for how the name is recognised, and 2 pinning out-of-range quality. Run before any change to the code, 12 of them failed, along with the "every item" shop test extended with a Conjured item.
2. **The implementation is four additions** in `app/gilded-rose.ts`: the prefix constant, `CONJURED_DEGRADATION_RATE` defined as twice the normal rate, `isConjured`, and `updateConjuredItem`, which calls `degrade` with that rate. No existing rule was edited.
3. **The two snapshots were updated on purpose,** by running only their two test files with the update flag, and both diffs were reviewed line by line.
4. **The comment** "this conjured item does not work properly yet" is removed from `app/report.ts`.

Two points worth knowing:

- **A name that is not text stays a normal item.** `isConjured` checks the type before looking at the prefix. Without that check, an item created with a number as name would make `updateQuality` fail, where the code before this step treated it as a normal item. A test pins this.
- **Out-of-range quality follows the normal-item behaviour,** since both use `degrade`: a Conjured item at quality 60 goes to 58, and one at −3 stays at −3.

A direct comparison of the code before and after this step, over 21,901 combinations of sellIn and quality per name, shows no difference for any name other than a Conjured one.

## Step 7 — Test the remaining edge cases and finish the tooling

The step has two parts: part A covers the edge cases that are still untested, part B closes the gaps left in the tooling.

### Part A — Edge cases

#### Goal

Cover the cases that are still untested after step 4. They are all outside what the requirements describe, so each one needs a decision first: accept the current behaviour and pin it with a test, or define a better behaviour and implement it.

#### Why last

- None of these cases is needed to refactor `updateQuality` safely or to implement Conjured.
- Several of them are about input validation, which the requirements do not ask for. Deciding them is easier once the code has its final structure.

#### Cases

1. **Unusual value types.** `Item` accepts anything, since its constructor is untyped. Nothing tests:
   - decimals, such as quality 0.5
   - `NaN`
   - numbers passed as strings. These would misbehave for Aged Brie, where `+ 1` concatenates instead of adding.

   Already handled in step 5: a decimal sellIn for a backstage pass is pinned by tests, and a `NaN` or infinite quality for a pass after the concert, which was a bug, is fixed and tested.
2. **Program arguments.** The end-to-end tests cover `30` and no argument. Not covered:
   - a non-numeric argument: `npm start -- abc` prints only the greeting line, with no error
   - a negative number of days
   - a decimal number of days
3. **Several days in a row at unit level.** Each unit test runs one day. Sequences over many days are covered only by the end-to-end snapshot, for its nine sample items.
4. **Shop edge cases.**
   - the same `Item` object listed twice in the inventory
   - items added to the array after the shop is created
5. **Name edge cases.**
   - an empty name
   - a special name with a trailing space

#### Tasks

1. **Observe the current behaviour** of each case and record it in this document. The negative and decimal numbers of days have not been run yet.
2. **Decide, case by case,** between pinning the current behaviour and changing it. Changing it means rejecting or correcting the input, for example an error message for a non-numeric number of days.
3. **Write the tests.**
   - Cases 1, 3, 4 and 5 go in `test/unit/gilded-rose.spec.ts`.
   - Case 2 goes in `test/e2e/approvals.spec.ts`, since it concerns the program's command line.
4. **Implement the changes decided in task 2,** if any, each with its test written first.
5. **Re-run coverage and the mutation check.**

#### Constraints

- The `Item` class is not altered (requirement of the kata). Validation of item values, if any is decided, lives outside it.
- A test that pins a behaviour nobody chose says so, in the same way as the "current behaviour outside the specified range" tests of step 4.

#### Done when

- Each of the five cases has at least one test, and this document records the decision taken for it.
- `npm test` passes, coverage is still 100% on `app/gilded-rose.ts`, and the mutation check detects every change.
- The 30-day snapshot is unchanged, unless a decision of task 2 changes the report on purpose.

#### Out of scope

- The out-of-range combinations of sellIn and quality. They are covered by the grid test added after step 4.

### Part B — Tooling

#### Goal

Close the gaps found by the stack review of 2026-11-22. At that date the stack was current and minimal (Node pinned, TypeScript 7, Vitest 5, five dev dependencies, no outdated or vulnerable package), and what was missing was automation around it.

Three small points from the same review were fixed on the spot (2026-11-22): the unused `lcov` coverage output is dropped, the `.gitignore` rules for generated `.js` files are removed since nothing emits JavaScript any more, and `engines` now requires Node 26, the only version the project has been run on.

#### Gaps, ordered by how much closing them would help

1. **Nothing runs automatically.** There is no CI. The type-check, the tests and the coverage only run when someone types the commands.
2. **No linter or formatter.** Only `.editorconfig` exists. The style is consistent today because one author wrote the code in two days; it will not stay that way by itself.
3. **`noImplicitAny` is still `false`.** It stays off because turning it on flags the untyped `Item` constructor, which the kata forbids changing. The cost is that a forgotten type anywhere else also goes unnoticed.
4. **Coverage thresholds only cover one file.** `app/report.ts` is at 100% but has no threshold, so it could drop silently.
5. **The mutation check lives outside the repository.** It is a script in a temporary folder, already rewritten once. A proper tool or a committed script would make it repeatable.

#### Tasks

1. **Add a CI workflow** (GitHub Actions) that runs `npm ci`, `npm run typecheck` and `npm run test:coverage` on every push and pull request.
2. **Add a linter and a formatter**, with one script each, and run the linter in CI.
3. **Decide on `noImplicitAny`.** The options are to keep it off, or to turn it on and exempt the `Item` constructor alone, without altering the class.
4. **Extend the coverage thresholds** to `app/report.ts`.
5. **Make the mutation check repeatable**, either with a mutation-testing tool such as Stryker or by committing the script, and document how to run it in the README.

#### Done when

- A push to GitHub runs the type-check, the tests and the coverage thresholds, and a failure is visible on the commit.
- `npm run lint` passes, and the README lists the new commands.
- The `noImplicitAny` decision is recorded in this document.
- A coverage run fails if `app/report.ts` drops below 100%.
- The mutation check can be run with one documented command.

#### Out of scope

- Any change of behaviour in `app/`.

### Outcome (2026-11-22)

All "Done when" checks of both parts pass.

#### Part A — what the code did, and what was decided

| Case | What the code did | Decision |
|---|---|---|
| 1. Values that are not whole numbers | Broke its own rules silently: quality 0.5 became −0.5, 49.5 became 50.5, a quality given as the text "10" became "101" for Aged Brie, `NaN` stayed `NaN` | **Changed.** `updateQuality` refuses any item whose sellIn or quality is not a whole number, with an error naming the item, the field and the value |
| 2. Program arguments | `abc`, `-3` and `10abc` printed only the greeting and exited with success; `2.5` printed days 0 to 3; an empty argument printed day 0 only | **Changed.** An argument that is not made of digits only prints an error message and exits with code 1 |
| 3. Several days in a row | Nothing to observe | **Tested.** Five sequences, one per category |
| 4. Shop edge cases | An item listed twice is updated twice a day; items added after the shop was created, and a replaced list, are updated | **Pinned** as it is |
| 5. Name edge cases | An empty name, a space, or a special name with a space before or after it is a normal item | **Pinned** as it is |

Details of the two changes:

- **Refusing values that are not whole numbers.**
  - Every item is checked before any item is updated, so a refused item leaves the whole inventory untouched.
  - Whole numbers outside 0 to 50 are still accepted, with the behaviour pinned in step 4.
  - The check lives in `app/gilded-rose.ts`, outside the `Item` class, which is byte-identical.
  - It replaces two things from step 5: the tests that pinned a decimal sellIn for backstage passes, and the fix for a `NaN` quality after the concert. Both inputs are now refused, and `hasAtMostDaysLeft` is back to a plain `sellIn <= days`.
  - For whole-number inputs the code gives the same results as before this step: 0 differences over 21,901 combinations for each of 9 names.
- **Refusing an invalid number of days.** Only `app/program.ts` changed. A valid argument and the absence of argument behave as before. `1e1` and ` 3`, which used to be read as 10 and 3, are now refused: the rule is "digits only".

Not handled: a `null` entry in the list of items still fails with a generic `TypeError`, and a very large number of days is not capped.

Tests: 126 in total, up from 87. The unit tests gained the several-days, shop, name and whole-number blocks; the end-to-end tests now check the exit code and the error output, with 7 invalid arguments. The two snapshots are unchanged.

#### Part B — tooling

| Gap | What was done |
|---|---|
| 1. Nothing runs automatically | `.github/workflows/ci.yml` runs `npm ci`, the type-check, the linter and the tests with coverage on every push and pull request |
| 2. No linter or formatter | Biome is added, with `npm run lint` (check only) and `npm run format` (apply fixes). The code was formatted once with it |
| 3. `noImplicitAny` | **Decision: kept off.** Turning it on would need a comment line inside the `Item` class to exempt its constructor, which bends the rule of the kata |
| 4. Coverage thresholds on one file | `app/report.ts` has the same 100% thresholds as `app/gilded-rose.ts` |
| 5. Mutation check outside the repository | `scripts/mutation-check.mjs`, run with `npm run test:mutation`. It tries 87 changes; the unit tests detect 85, and the 2 others are the no-effect ones around the empty `updateSulfuras`, listed in the script |

Choices made along the way:

- **Biome, not ESLint with Prettier.** It is one package for both jobs, and it does not depend on the TypeScript compiler's JavaScript interface, which TypeScript 7 no longer provides.
- **A script, not Stryker, for the mutation check.** Stryker was tried first: it failed on the same missing TypeScript interface, and it brought 219 packages and 5 moderate vulnerabilities. It was uninstalled. The script has no dependency.
- **The formatting pass changed layout only**: import order, quotes, template strings in place of string concatenation, and line wrapping. The `Item` class is byte-identical, the snapshots are unchanged, and all tests pass.

The exception was lifted the same day: **the CI workflow ran on GitHub and passed.** The commits were pushed on 2026-11-22, and the first run passed its four steps (install, type-check, lint, tests with coverage). It reported one warning, that `actions/checkout@v4` and `actions/setup-node@v4` target a deprecated Node version; both were then moved to `v7`.

