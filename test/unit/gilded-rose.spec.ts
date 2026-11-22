import { Item, GildedRose } from '../../app/gilded-rose';

describe('Gilded Rose', () => {
  it('lowers sellIn and keeps quality at 0 for a normal item with no quality left', () => {
    const gildedRose = new GildedRose([new Item('foo', 0, 0)]);
    const items = gildedRose.updateQuality();

    expect(items[0]).toEqual({ name: 'foo', sellIn: -1, quality: 0 });
  });
});
