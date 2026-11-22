import { buildReport } from './report';

const DEFAULT_DAYS = 2;

// Command-line entry point: prints the report for the number of days given
// as first argument (2 by default). The number of days must be written with
// digits only; anything else is refused with a message and exit code 1.
function main(): void {
  const argument = process.argv[2];

  if (argument === undefined) {
    process.stdout.write(buildReport(DEFAULT_DAYS));
    return;
  }

  if (!/^\d+$/.test(argument)) {
    process.stderr.write(`Invalid number of days: "${argument}". It must be a whole number, 0 or more.\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(buildReport(Number(argument)));
}

main();
