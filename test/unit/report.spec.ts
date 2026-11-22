import { buildReport } from '../../app/report';

describe('buildReport', () => {
  it('starts with the greeting line', () => {
    const lines = buildReport(0).split('\n');

    expect(lines[0]).toBe('OMGHAI!');
  });

  it('prints one block per day, starting at day 0', () => {
    const report = buildReport(2);

    expect(report.match(/^-------- day \d+ --------$/gm)).toEqual([
      '-------- day 0 --------',
      '-------- day 1 --------',
      '-------- day 2 --------',
    ]);
  });

  it('lists each item as "name, sellIn, quality" under a column header', () => {
    const lines = buildReport(0).split('\n');

    expect(lines[2]).toBe('name, sellIn, quality');
    expect(lines[3]).toBe('+5 Dexterity Vest, 10, 20');
  });

  it('shows the items as they are before the update of that day', () => {
    const report = buildReport(1);
    const dayOne = report.slice(report.indexOf('-------- day 1 --------'));

    expect(dayOne).toContain('+5 Dexterity Vest, 9, 19');
  });

  it('ends each day block with an empty line', () => {
    expect(buildReport(0).endsWith('Conjured Mana Cake, 3, 6\n\n')).toBe(true);
  });
});
