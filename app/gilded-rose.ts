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
      updateItem(item);
    }

    return this.items;
  }
}

function updateItem(item: Item): void {
  switch (item.name) {
    case AGED_BRIE:
      updateAgedBrie(item);
      break;
    case BACKSTAGE_PASSES:
      updateBackstagePasses(item);
      break;
    case SULFURAS:
      updateSulfuras(item);
      break;
    default:
      updateNormalItem(item);
  }
}

function updateNormalItem(item: Item): void {
  if (item.quality > MIN_QUALITY) {
    item.quality = item.quality - 1;
  }
  item.sellIn = item.sellIn - 1;
  if (item.sellIn < 0) {
    if (item.quality > MIN_QUALITY) {
      item.quality = item.quality - 1;
    }
  }
}

function updateAgedBrie(item: Item): void {
  if (item.quality < MAX_QUALITY) {
    item.quality = item.quality + 1;
  }
  item.sellIn = item.sellIn - 1;
  if (item.sellIn < 0) {
    if (item.quality < MAX_QUALITY) {
      item.quality = item.quality + 1;
    }
  }
}

function updateBackstagePasses(item: Item): void {
  if (item.quality < MAX_QUALITY) {
    item.quality = item.quality + 1;
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
  item.sellIn = item.sellIn - 1;
  if (item.sellIn < 0) {
    item.quality = 0;
  }
}

// Sulfuras is a legendary item: it never has to be sold and never changes.
function updateSulfuras(_item: Item): void {
}
