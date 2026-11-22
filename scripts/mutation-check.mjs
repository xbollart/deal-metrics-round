// Mutation check for app/gilded-rose.ts.
//
// It changes the business rules in small ways, one change at a time (a
// comparison, a constant, a name, a deleted statement, a forced condition),
// and runs the unit tests against each changed version. A change that no test
// notices is a gap in the tests.
//
// The project files are never modified: the work is done on a copy in a
// temporary folder, which is deleted at the end.
//
// Usage: npm run test:mutation

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const TARGET = 'app/gilded-rose.ts';
// The Item class comes first in the file and must not be altered, so the
// changes start at the first line after it.
const START_MARKER = 'const AGED_BRIE';

// Each rule is [pattern, replacement]. Every match of every rule gives one change.
const RULES = [
  // comparisons and logic
  [/ <= /g, ' < '],
  [/ <= /g, ' > '],
  [/ < /g, ' <= '],
  [/ < /g, ' >= '],
  [/ > /g, ' >= '],
  [/ > /g, ' < '],
  [/ === /g, ' !== '],
  [/ && /g, ' || '],
  [/!Number\.isInteger/g, 'Number.isInteger'],
  [/startsWith/g, 'endsWith'],
  // arithmetic
  [/\+= 1/g, '+= 2'],
  [/\+= 1/g, '+= 0'],
  [/-= 1/g, '-= 2'],
  [/-= 1/g, '-= 0'],
  [/ \* 2/g, ' * 1'],
  [/ \* 2/g, ' * 3'],
  [/point = 0/g, 'point = 1'],
  [/\? (.+?) : (.+?);/g, '? $2 : $1;'],
  // constants
  [/= (\d+);$/gm, (_match, digits) => `= ${Number(digits) + 1};`],
  [/= (\d+);$/gm, (_match, digits) => `= ${Number(digits) - 1};`],
  [/^(const \w+ = )'.*';$/gm, "$1'X';"],
  // forced conditions
  [/if \(.+\) \{$/gm, 'if (true) {'],
  [/if \(.+\) \{$/gm, 'if (false) {'],
  // deleted statements: calls, assignments to an item, break and throw
  [/^ +[\w.]+\(.*\);$/gm, ''],
  [/^ +item\.\w+ [-+]?= .*;$/gm, ''],
  [/^ +break;$/gm, ''],
  [/^ +throw .*;$/gm, ''],
];

// Changes that no test can notice because they do not change what the code
// does. Both come from updateSulfuras being an empty function: not calling it,
// or falling through to it after the backstage case, has no effect.
const EXPECTED_UNDETECTED = [
  'case SULFURAS: | updateSulfuras(item); -> (deleted)',
  'updateBackstagePasses(item); | break; -> (deleted)',
];

function lineAt(lines, number) {
  return (lines[number - 1] ?? '').trim();
}

function buildChanges(source) {
  const start = source.indexOf(START_MARKER);
  if (start === -1) {
    throw new Error(`"${START_MARKER}" not found in ${TARGET}: update START_MARKER in this script.`);
  }
  const lines = source.split('\n');
  const changes = [];
  const seen = new Set();

  for (const [pattern, replacement] of RULES) {
    for (const match of source.matchAll(pattern)) {
      if (match.index < start) continue;

      const lineNumber = source.slice(0, match.index).split('\n').length;
      const lineText = lineAt(lines, lineNumber);
      if (lineText.startsWith('//')) continue;

      const replaced = match[0].replace(new RegExp(pattern.source, pattern.flags.replace('g', '')), replacement);
      const changed = source.slice(0, match.index) + replaced + source.slice(match.index + match[0].length);
      if (changed === source || seen.has(changed)) continue;
      seen.add(changed);

      const shown = replaced.trim() === '' ? '(deleted)' : replaced.trim();
      changes.push({
        changed,
        lineNumber,
        description: `${match[0].trim()} -> ${shown}`,
        key: `${lineAt(lines, lineNumber - 1)} | ${match[0].trim()} -> ${shown}`,
      });
    }
  }
  return changes;
}

function testsFail(workDir) {
  const result = spawnSync(join('node_modules', '.bin', 'vitest'), ['run', 'test/unit'], {
    cwd: workDir,
    env: { ...process.env, CI: '1' },
    encoding: 'utf-8',
  });
  return result.status !== 0;
}

const source = readFileSync(join(projectRoot, TARGET), 'utf-8');
const changes = buildChanges(source);

const workDir = mkdtempSync(join(tmpdir(), 'mutation-check-'));
let exitCode = 0;
try {
  for (const entry of ['app', 'test', 'vitest.config.mts', 'tsconfig.json', 'package.json']) {
    cpSync(join(projectRoot, entry), join(workDir, entry), { recursive: true });
  }
  symlinkSync(join(projectRoot, 'node_modules'), join(workDir, 'node_modules'));

  if (testsFail(workDir)) {
    throw new Error('The unit tests fail on the unchanged code. Fix them before running the mutation check.');
  }

  console.log(`Trying ${changes.length} changes of ${TARGET} against the unit tests...`);
  const undetected = [];
  for (const change of changes) {
    writeFileSync(join(workDir, TARGET), change.changed);
    if (testsFail(workDir)) {
      process.stdout.write('.');
    } else {
      process.stdout.write('!');
      undetected.push(change);
    }
  }
  process.stdout.write('\n\n');

  const unexpected = undetected.filter((change) => !EXPECTED_UNDETECTED.includes(change.key));
  const expected = undetected.filter((change) => EXPECTED_UNDETECTED.includes(change.key));

  console.log(`Changes tried:            ${changes.length}`);
  console.log(`Detected by the tests:    ${changes.length - undetected.length}`);
  console.log(`Undetected, no effect:    ${expected.length} (expected, see EXPECTED_UNDETECTED in this script)`);
  console.log(`Undetected, unexpected:   ${unexpected.length}`);

  if (unexpected.length > 0) {
    console.log('\nThese changes were not noticed by any unit test:');
    for (const change of unexpected) {
      console.log(`  ${TARGET}:${change.lineNumber}  ${change.description}`);
      console.log(`      after the line: ${change.key.split(' | ')[0]}`);
    }
    exitCode = 1;
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
process.exit(exitCode);
