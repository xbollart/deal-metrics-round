# Refactor plan

- **Created:** 2026-11-21
- **Based on:** [code-review.md](code-review.md)

Each step is meant to be done and committed on its own. A step is finished only when its "Done when" checks pass.

| Step | Title | Status |
|---|---|---|
| 1 | Consolidate the tests on Vitest | Done (2026-11-21) |
| 2 | Verify and close the test coverage | Not started |
| 3 | Refactor `updateQuality` | Not started |
| 4 | Implement Conjured items | Not started |

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

`test/vitest/gilded-rose.spec.ts` is a placeholder that fails by design (it expects the name `'fixme'`). It is kept as it is in this step, so `npm test` will report exactly one failure, this one, when the step is done. It is replaced in step 2.

### Outcome (2026-11-21)

All "Done when" checks pass:

- `npm test` runs Vitest 5.1.1 once and exits, with the `'fixme'` placeholder as its only failure.
- The snapshot file is byte-identical to the one before the step, and the test passes with `CI=1` (no snapshot can be written).
- `npm run golden-master -- 30` prints output identical to the previous `ts-node` run.
- `app/gilded-rose.ts` is unchanged.
- The coverage report now sees the 30-day run: 100% statements, 97.14% branches on `app/gilded-rose.ts` (it was 48.38% and 25.71%). The missed branch is the constructor default on line 16.
- `npm audit` reports 3 moderate vulnerabilities, all through `rimraf` (it was 14, including 3 critical).

Changes that the tasks above did not spell out:

- **`@types/node` 18 → 26.** Vite 8, which Vitest 5 requires, does not accept the Node 18 typings.
- **`tsx` replaces `ts-node`** for the command-line run, exposed as `npm run golden-master`. Plain `node` cannot run the script because the imports have no file extension.
- **The golden master is split in two files.** `test/golden-master.ts` exports the function that builds the report; `test/golden-master-text-test.ts` is the command-line entry point.
- **`vite-tsconfig-paths` is removed.** Vite resolves the `@/` alias itself with `resolve.tsconfigPaths`.
- **`vitest.config.ts` is renamed `vitest.config.mts`** to remove a Vite warning about ESM syntax in a CommonJS file.
- **Coverage is limited to `app/` and printed even when a test fails.** Without that, the failing placeholder hides the report.
- **`tsconfig.json` declares the `vitest/globals` types.**
- **The leftover `.nyc_output/` folder is deleted**, along with its `.gitignore` line.

Still open after this step:

- **`tsc` still fails.** The Jest/Mocha collision is gone, but TypeScript 4.9 cannot parse the typings of Vitest 5 and `@types/node` 26. It needs the TypeScript upgrade, which is out of scope here.
- **`texttest_rig.py` still calls `ts-node`.** It was already broken (wrong path) and is listed for removal in the code review.

## Step 2 — Verify and close the test coverage

### Goal

Have a coverage report that can be trusted, and tests for every behaviour of `updateQuality` that the current snapshot does not pin, before the application code is refactored.

### Why second

- It depends on step 1: the coverage report is only accurate once the "thirtyDays" test runs in-process.
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

### Tasks

1. **Check the coverage report after step 1.** Run the coverage script and confirm `app/gilded-rose.ts` reports 100% statements. If it does not, fix the setup before going further.
2. **Replace the placeholder test with named tests per rule** in `test/vitest/gilded-rose.spec.ts`. Each test uses one item and one call to `updateQuality`.
   - Normal item: before the sell date, after the sell date, quality 1 before the sell date, quality 0.
   - Aged Brie: before and after the sell date, at quality 49 and 50.
   - Backstage passes: at 11, 10, 6, 5 and 0 days; at quality 48 and 49 with 10 days or less, and with 5 days or less.
   - Sulfuras: sellIn and quality unchanged.
   - Constructor called with no argument.
3. **Pin the current behaviour for out-of-range inputs** with tests that record what the code does today, without judging it:
   - quality above 50 and below 0
   - a Sulfuras item with a quality other than 80
   - another backstage pass name and a lower-case "aged brie"
4. **Set coverage thresholds** in `vitest.config.ts` (100% statements and branches for `app/`) so a drop fails the test run.
5. **Re-run the mutation check** and confirm that no change goes undetected.

### Done when

- `npm test` passes with no failure; the `'fixme'` placeholder is gone.
- The coverage report shows 100% statements and branches for `app/gilded-rose.ts`.
- The mutation check detects all 55 changes.
- `app/gilded-rose.ts` is unchanged.

### Out of scope

- Any change to `app/gilded-rose.ts`, including fixing the out-of-range behaviour.
- Conjured items. The snapshot keeps pinning their current output until the feature is implemented.
- Adding a mutation-testing tool to the project. The check is run as a one-off script.

## Step 3 — Refactor `updateQuality`

### Goal

Make the rules of each item category readable in one place, without changing any behaviour, so that Conjured becomes a small addition in step 4.

### Why before Conjured

- In the current code the degradation logic sits in two separate blocks (before and after the sell date). Adding Conjured there means writing the rule twice, in code that this step rewrites anyway.
- With the behaviour frozen, the snapshot and the tests from step 2 must pass untouched. That is the clearest possible check for a structural change.

### Target structure

- One function per category: normal, Aged Brie, Backstage passes, Sulfuras.
- A single place that decides the category of an item from its name.
- Named constants for the three item names, the maximum quality (50) and the backstage thresholds (10 and 5 days).
- `updateQuality` reduced to a loop that, for each item, picks the category and applies its function.
- The normal-item rule written with a degradation rate, so that step 4 can express Conjured as "twice the normal rate".

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
- The behaviour pinned in step 2 for out-of-range inputs is preserved. In particular, a helper that clamps quality to 0–50 would change it (quality 60 on a normal item gives 59 today, not 50).
- Item categories keep being matched on the exact, full name.

### Done when

- `npm test` passes with no test or snapshot change since step 2.
- Coverage is still 100% statements and branches on `app/`.
- The mutation check detects every change.
- `updateQuality` has no nested condition deeper than two levels, and no item name or threshold appears as an inline literal.

### Out of scope

- Conjured items.
- Fixing out-of-range inputs or matching categories by partial name. These are behaviour changes and need their own decision.

## Step 4 — Implement Conjured items

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

1. **Write the tests first** in `test/vitest/gilded-rose.spec.ts`; they fail until the rule exists.
   - Before the sell date: (3, 6) becomes (2, 4).
   - After the sell date: (0, 6) becomes (−1, 2).
   - Never below 0: (3, 1) becomes (2, 0), and (0, 3) becomes (−1, 0).
2. **Add the Conjured category** next to the others, reusing the normal rule with a doubled rate.
3. **Update the "thirtyDays" snapshot deliberately** and review its diff. Only the "Conjured Mana Cake" lines may change: (3, 6) → (2, 4) → (1, 2) → (0, 0), then quality stays at 0.
4. **Remove the comment** "this conjured item does not work properly yet" from `test/golden-master-text-test.ts`.
5. **Re-run coverage and the mutation check.**

### Done when

- The new Conjured tests pass, and every other test passes unchanged.
- The snapshot diff contains only "Conjured Mana Cake" lines.
- Coverage is still 100% on `app/`, and the mutation check detects every change.

### Open point

How a Conjured item is recognised. The requirements name a category ("Conjured" items), while the existing categories are matched on the exact name. The proposal is to match any name starting with `Conjured`, which covers "Conjured Mana Cake" and any future conjured item. The alternative is the exact name "Conjured Mana Cake" only.
