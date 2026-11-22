import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end tests: they launch the program as a separate process, the same
 * way `npm start` does, and check what it prints and how it exits.
 *
 * "thirtyDays" compares the output to the snapshot stored in the
 * __snapshots__ folder; any difference fails the test.
 */

const program = fileURLToPath(new URL('../../app/program.ts', import.meta.url));

function runProgram(...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', program, ...args], {
    encoding: 'utf-8',
  });
  return { exitCode: result.status, output: result.stdout, errorOutput: result.stderr };
}

describe('Gilded Rose Approval', () => {
  it('should thirtyDays', () => {
    const consoleOutput = runProgram('30').output;

    expect(consoleOutput).toMatchSnapshot();
  });

  it('prints days 0 to 2 when no number of days is given', () => {
    const { exitCode, output } = runProgram();

    expect(exitCode).toBe(0);
    expect(output).toContain('-------- day 2 --------');
    expect(output).not.toContain('-------- day 3 --------');
  });

  it('prints day 0 only when the number of days is 0', () => {
    const { exitCode, output } = runProgram('0');

    expect(exitCode).toBe(0);
    expect(output).toContain('-------- day 0 --------');
    expect(output).not.toContain('-------- day 1 --------');
  });

  it('exits with code 0 and prints nothing on the error output for a valid number of days', () => {
    const { exitCode, errorOutput } = runProgram('30');

    expect(exitCode).toBe(0);
    expect(errorOutput).toBe('');
  });

  it.each([
    ['text', 'abc'],
    ['a negative number', '-3'],
    ['a decimal number', '2.5'],
    ['a number followed by text', '10abc'],
    ['a number in scientific notation', '1e1'],
    ['a number with a space', ' 3'],
    ['an empty argument', ''],
  ])('refuses %s as number of days', (_description, argument) => {
    const { exitCode, output, errorOutput } = runProgram(argument);

    expect(exitCode).toBe(1);
    expect(output).toBe('');
    expect(errorOutput).toBe(`Invalid number of days: "${argument}". It must be a whole number, 0 or more.\n`);
  });
});
