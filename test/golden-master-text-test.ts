import { goldenMaster } from './golden-master';

// Command-line entry point: prints the report for the number of days given
// as first argument (2 by default).
let days: number = 2;
if (process.argv.length > 2) {
  days = +process.argv[2];
}

process.stdout.write(goldenMaster(days));
