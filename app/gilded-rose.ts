export class Item {
  name: string;
  sellIn: number;
  quality: number;

  constructor(name, sellIn, quality) {
    this.name = name;
    this.sellIn = sellIn;
    this.quality = quality;
  }
}

const AGED_BRIE = 'Aged Brie';
const BACKSTAGE_PASSES = 'Backstage passes to a TAFKAL80ETC concert';
const SULFURAS = 'Sulfuras, Hand of Ragnaros';

const MIN_QUALITY = 0;
const MAX_QUALITY = 50;

// Backstage passes gain more quality when this many days or fewer are left.
const BACKSTAGE_DOUBLE_INCREASE_DAYS = 10;
const BACKSTAGE_TRIPLE_INCREASE_DAYS = 5;

export class GildedRose {
  items: Array<Item>;

  constructor(items = [] as Array<Item>) {
    this.items = items;
  }

  updateQuality() {
    for (const item of this.items) {
      if (item.name !== AGED_BRIE && item.name !== BACKSTAGE_PASSES) {
        if (item.quality > MIN_QUALITY) {
          if (item.name !== SULFURAS) {
            item.quality = item.quality - 1;
          }
        }
      } else {
        if (item.quality < MAX_QUALITY) {
          item.quality = item.quality + 1;
          if (item.name === BACKSTAGE_PASSES) {
            if (item.sellIn <= BACKSTAGE_DOUBLE_INCREASE_DAYS) {
              if (item.quality < MAX_QUALITY) {
                item.quality = item.quality + 1;
              }
            }
            if (item.sellIn <= BACKSTAGE_TRIPLE_INCREASE_DAYS) {
              if (item.quality < MAX_QUALITY) {
                item.quality = item.quality + 1;
              }
            }
          }
        }
      }
      if (item.name !== SULFURAS) {
        item.sellIn = item.sellIn - 1;
      }
      if (item.sellIn < 0) {
        if (item.name !== AGED_BRIE) {
          if (item.name !== BACKSTAGE_PASSES) {
            if (item.quality > MIN_QUALITY) {
              if (item.name !== SULFURAS) {
                item.quality = item.quality - 1;
              }
            }
          } else {
            item.quality = 0;
          }
        } else {
          if (item.quality < MAX_QUALITY) {
            item.quality = item.quality + 1;
          }
        }
      }
    }

    return this.items;
  }
}
