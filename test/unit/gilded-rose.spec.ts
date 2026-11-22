import { GildedRose, Item } from '../../app/gilded-rose';

const AGED_BRIE = 'Aged Brie';
const BACKSTAGE = 'Backstage passes to a TAFKAL80ETC concert';
const SULFURAS = 'Sulfuras, Hand of Ragnaros';
const CONJURED = 'Conjured Mana Cake';

/** Runs one day on a single item and returns its [sellIn, quality]. */
function afterOneDay(name: string, sellIn: number, quality: number): [number, number] {
  const [item] = new GildedRose([new Item(name, sellIn, quality)]).updateQuality();
  return [item.sellIn, item.quality];
}

describe('Gilded Rose', () => {
  describe('normal item', () => {
    it.each([
      // description, sellIn, quality, expected sellIn, expected quality
      ['loses 1 quality before the sell date', 5, 10, 4, 9],
      ['loses 1 quality on the last day before the sell date', 1, 10, 0, 9],
      ['loses 2 quality once the sell date has passed', 0, 10, -1, 8],
      ['keeps losing 2 quality long after the sell date', -5, 10, -6, 8],
      ['drops from quality 1 to 0 before the sell date', 5, 1, 4, 0],
      ['stays at quality 0 before the sell date', 5, 0, 4, 0],
      ['drops from quality 2 to 0 after the sell date', 0, 2, -1, 0],
      ['drops from quality 1 to 0 after the sell date, not below', 0, 1, -1, 0],
      ['stays at quality 0 after the sell date', 0, 0, -1, 0],
    ])('%s', (_description, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay('foo', sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });
  });

  describe('Aged Brie', () => {
    it.each([
      ['gains 1 quality before the sell date', 5, 10, 4, 11],
      ['gains 1 quality on the last day before the sell date', 1, 10, 0, 11],
      ['gains 2 quality once the sell date has passed', 0, 10, -1, 12],
      ['goes from quality 49 to 50 before the sell date', 5, 49, 4, 50],
      ['stays at quality 50 before the sell date', 5, 50, 4, 50],
      ['goes from quality 48 to 50 after the sell date', 0, 48, -1, 50],
      ['goes from quality 49 to 50 after the sell date, not above', 0, 49, -1, 50],
      ['stays at quality 50 after the sell date', 0, 50, -1, 50],
    ])('%s', (_description, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(AGED_BRIE, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });
  });

  describe('Backstage passes', () => {
    it.each([
      ['gain 1 quality with 11 days left', 11, 10, 10, 11],
      ['gain 2 quality with 10 days left', 10, 10, 9, 12],
      ['gain 2 quality with 6 days left', 6, 10, 5, 12],
      ['gain 3 quality with 5 days left', 5, 10, 4, 13],
      ['gain 3 quality with 1 day left', 1, 10, 0, 13],
      ['drop to quality 0 after the concert', 0, 10, -1, 0],
      ['stay at quality 0 long after the concert', -5, 0, -6, 0],
      ['go from quality 49 to 50 with 11 days left', 11, 49, 10, 50],
      ['stay at quality 50 with 11 days left', 11, 50, 10, 50],
      ['go from quality 48 to 50 with 10 days left', 10, 48, 9, 50],
      ['go from quality 49 to 50 with 10 days left, not above', 10, 49, 9, 50],
      ['go from quality 47 to 50 with 5 days left', 5, 47, 4, 50],
      ['go from quality 48 to 50 with 5 days left, not above', 5, 48, 4, 50],
      ['go from quality 49 to 50 with 5 days left, not above', 5, 49, 4, 50],
      ['stay at quality 50 with 5 days left', 5, 50, 4, 50],
      ['drop from quality 50 to 0 after the concert', 0, 50, -1, 0],
    ])('%s', (_description, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(BACKSTAGE, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });
  });

  describe('Sulfuras', () => {
    it.each([
      ['keeps its sellIn and quality before the sell date', 5, 80],
      ['keeps its sellIn and quality on the sell date', 0, 80],
      ['keeps its sellIn and quality after the sell date', -1, 80],
    ])('%s', (_description, sellIn, quality) => {
      expect(afterOneDay(SULFURAS, sellIn, quality)).toEqual([sellIn, quality]);
    });
  });

  describe('Conjured item', () => {
    it.each([
      ['loses 2 quality before the sell date, twice a normal item', 3, 6, 2, 4],
      ['loses 2 quality on the last day before the sell date', 1, 6, 0, 4],
      ['loses 4 quality once the sell date has passed, twice a normal item', 0, 6, -1, 2],
      ['keeps losing 4 quality long after the sell date', -5, 10, -6, 6],
      ['drops from quality 2 to 0 before the sell date', 3, 2, 2, 0],
      ['drops from quality 1 to 0 before the sell date, not below', 3, 1, 2, 0],
      ['stays at quality 0 before the sell date', 3, 0, 2, 0],
      ['drops from quality 4 to 0 after the sell date', 0, 4, -1, 0],
      ['drops from quality 3 to 0 after the sell date, not below', 0, 3, -1, 0],
      ['drops from quality 1 to 0 after the sell date, not below', 0, 1, -1, 0],
      ['stays at quality 0 after the sell date', 0, 0, -1, 0],
    ])('%s', (_description, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(CONJURED, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });

    it.each([
      ['any name starting with "Conjured" is a Conjured item', 'Conjured Health Potion', 3, 6, 2, 4],
      ['the name "Conjured" alone is a Conjured item', 'Conjured', 3, 6, 2, 4],
      ['a conjured version of a special item degrades like any Conjured item', 'Conjured Aged Brie', 3, 6, 2, 4],
      ['"conjured" in lower case is a normal item', 'conjured mana cake', 3, 6, 2, 5],
      ['a name that only contains "Conjured" is a normal item', 'Mana Cake, Conjured', 3, 6, 2, 5],
    ])('%s', (_description, name, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(name, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });

    it('an item whose name is not text stays a normal item', () => {
      const [item] = new GildedRose([new Item(42, 3, 6)]).updateQuality();

      expect([item.sellIn, item.quality]).toEqual([2, 5]);
    });
  });

  describe('shop', () => {
    it('starts with no item when none is given', () => {
      const gildedRose = new GildedRose();

      expect(gildedRose.items).toEqual([]);
      expect(gildedRose.updateQuality()).toEqual([]);
    });

    it('updates every item, each with its own rule', () => {
      const gildedRose = new GildedRose([
        new Item('foo', 5, 10),
        new Item(AGED_BRIE, 5, 10),
        new Item(BACKSTAGE, 5, 10),
        new Item(SULFURAS, 5, 80),
        new Item(CONJURED, 5, 10),
      ]);

      expect(gildedRose.updateQuality()).toEqual([
        { name: 'foo', sellIn: 4, quality: 9 },
        { name: AGED_BRIE, sellIn: 4, quality: 11 },
        { name: BACKSTAGE, sellIn: 4, quality: 13 },
        { name: SULFURAS, sellIn: 5, quality: 80 },
        { name: CONJURED, sellIn: 4, quality: 8 },
      ]);
    });

    it('updates the items in place and returns the same array', () => {
      const item = new Item('foo', 5, 10);
      const items = [item];
      const gildedRose = new GildedRose(items);

      const result = gildedRose.updateQuality();

      expect(result).toBe(items);
      expect(result[0]).toBe(item);
      expect(item.quality).toBe(9);
    });

    it('keeps the item name unchanged', () => {
      const [item] = new GildedRose([new Item('foo', 5, 10)]).updateQuality();

      expect(item.name).toBe('foo');
    });
  });

  // These tests record what the code does today with inputs the requirements
  // do not allow or do not describe. They pin the behaviour so that a refactor
  // cannot change it by accident; they do not say it is the desired behaviour.
  describe('current behaviour outside the specified range', () => {
    it.each([
      ['a normal item above quality 50 loses 1 and is not brought back to 50', 'foo', 5, 60, 4, 59],
      ['a normal item above quality 50 loses 2 after the sell date', 'foo', 0, 60, -1, 58],
      ['a normal item with negative quality keeps it', 'foo', 5, -3, 4, -3],
      ['a normal item with negative quality keeps it after the sell date', 'foo', 0, -3, -1, -3],
      ['a Conjured item above quality 50 loses 2 and is not brought back to 50', CONJURED, 5, 60, 4, 58],
      ['a Conjured item with negative quality keeps it', CONJURED, 5, -3, 4, -3],
      ['Aged Brie above quality 50 keeps its quality', AGED_BRIE, 5, 60, 4, 60],
      ['Aged Brie above quality 50 keeps its quality after the sell date', AGED_BRIE, 0, 60, -1, 60],
      ['Aged Brie with negative quality gains 1', AGED_BRIE, 5, -3, 4, -2],
      ['Backstage passes above quality 50 keep their quality', BACKSTAGE, 5, 60, 4, 60],
      ['Backstage passes above quality 50 drop to 0 after the concert', BACKSTAGE, 0, 60, -1, 0],
      ['Sulfuras with a quality other than 80 keeps it', SULFURAS, 5, 40, 5, 40],
      ['Sulfuras with negative quality keeps it', SULFURAS, 5, -3, 5, -3],
      ['another backstage pass is treated as a normal item', 'Backstage passes to a Other concert', 5, 10, 4, 9],
      ['"aged brie" in lower case is treated as a normal item', 'aged brie', 5, 10, 4, 9],
      ['"Sulfuras" alone is treated as a normal item', 'Sulfuras', 5, 10, 4, 9],
    ])('%s', (_description, name, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(name, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });

    // sellIn is meant to be a whole number of days, but Item accepts any value.
    // The original code compares with "fewer than 11" and "fewer than 6", so
    // half days count as "10 days or less" and "5 days or less".
    it.each([
      ['Backstage passes with 10.5 days left gain 2, as with 10 days', BACKSTAGE, 10.5, 10, 9.5, 12],
      ['Backstage passes with 5.5 days left gain 3, as with 5 days', BACKSTAGE, 5.5, 10, 4.5, 13],
    ])('%s', (_description, name, sellIn, quality, expectedSellIn, expectedQuality) => {
      expect(afterOneDay(name, sellIn, quality)).toEqual([expectedSellIn, expectedQuality]);
    });
  });

  // Bug of the original code, now fixed.
  //
  // After the concert the quality of a backstage pass must be 0, whatever it
  // was. The original code computed "quality - quality" instead of setting 0,
  // which gave NaN when the quality was not a finite number.
  describe('backstage passes after the concert, whatever their quality was', () => {
    it.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
    ])('a quality of %s drops to 0 (the original code gave NaN)', (_label, quality) => {
      expect(afterOneDay(BACKSTAGE, 0, quality)).toEqual([-1, 0]);
    });

    it('a finite quality drops to 0', () => {
      expect(afterOneDay(BACKSTAGE, 0, 30)).toEqual([-1, 0]);
    });
  });
});
