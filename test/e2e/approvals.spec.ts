import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end tests: they launch the program as a separate process, the same
 * way `npm start` does, and check what it prints.
 *
 * "thirtyDays" compares the output to the snapshot stored in the
 * __snapshots__ folder; any difference fails the test.
 */

const program = fileURLToPath(new URL('../../app/program.ts', import.meta.url));

function runProgram(...args: string[]): string {
  return execFileSync(process.execPath, ['--import', 'tsx', program, ...args], {
    encoding: 'utf-8',
  });
}

describe('Gilded Rose Approval', () => {
  it('should thirtyDays', () => {
    const consoleOutput = runProgram('30');

    expect(consoleOutput).toMatchSnapshot();
  });

  it('prints days 0 to 2 when no number of days is given', () => {
    const consoleOutput = runProgram();

    expect(consoleOutput).toContain('-------- day 2 --------');
    expect(consoleOutput).not.toContain('-------- day 3 --------');
  });
});
