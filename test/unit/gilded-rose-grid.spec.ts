import { Item, GildedRose } from '../../app/gilded-rose';

/**
 * Grid test: runs one day for every combination of item name, sellIn and
 * quality in the ranges below, and compares all the results to the snapshot
 * stored in the __snapshots__ folder.
 *
 * It records what the code does today, including for values the requirements
 * do not allow (quality below 0 or above 50) and for "Conjured Mana Cake",
 * which is not implemented yet. Its purpose is to prove that a refactor
 * changes nothing; it does not say that every recorded result is desired.
 *
 * How to read the snapshot: one line per item name and starting sellIn. The
 * line gives the sellIn after one day, then the quality after one day for
 * each starting quality, in the order of the "quality before" header.
 */

const NAMES = [
  'foo',
  'Aged Brie',
  'Backstage passes to a TAFKAL80ETC concert',
  'Sulfuras, Hand of Ragnaros',
  'Conjured Mana Cake',
];
const SELL_IN_FROM = -3;
const SELL_IN_TO = 13;
const QUALITY_FROM = -3;
const QUALITY_TO = 53;

function range(from: number, to: number): number[] {
  const values: number[] = [];
  for (let value = from; value <= to; value++) {
    values.push(value);
  }
  return values;
}

function column(value: number): string {
  return String(value).padStart(3);
}

describe('Gilded Rose grid', () => {
  it('gives the recorded result for every combination of name, sellIn and quality', () => {
    const qualities = range(QUALITY_FROM, QUALITY_TO);
    const lines: string[] = [];

    for (const name of NAMES) {
      lines.push(name);
      lines.push('  quality before         |' + qualities.map(column).join(''));

      for (const sellIn of range(SELL_IN_FROM, SELL_IN_TO)) {
        const results = qualities.map(quality => {
          const [item] = new GildedRose([new Item(name, sellIn, quality)]).updateQuality();
          return item;
        });
        const sellInsAfter = [...new Set(results.map(item => item.sellIn))].join('/');

        lines.push(
          '  sellIn ' + column(sellIn) + ' -> ' + sellInsAfter.padStart(3) + '      |' +
          results.map(item => column(item.quality)).join('')
        );
      }

      lines.push('');
    }

    expect(lines.join('\n')).toMatchSnapshot();
  });
});
