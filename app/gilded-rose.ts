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

// Quality a normal item loses per day before its sell date.
const NORMAL_DEGRADATION_RATE = 1;

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
  degrade(item, NORMAL_DEGRADATION_RATE);
}

function updateAgedBrie(item: Item): void {
  item.sellIn -= 1;
  increaseQuality(item);
  if (sellDateHasPassed(item)) {
    increaseQuality(item);
  }
}

function updateBackstagePasses(item: Item): void {
  increaseQuality(item);
  if (item.sellIn <= BACKSTAGE_DOUBLE_INCREASE_DAYS) {
    increaseQuality(item);
  }
  if (item.sellIn <= BACKSTAGE_TRIPLE_INCREASE_DAYS) {
    increaseQuality(item);
  }
  item.sellIn -= 1;
  if (sellDateHasPassed(item)) {
    item.quality = MIN_QUALITY;
  }
}

// Sulfuras is a legendary item: it never has to be sold and never changes.
function updateSulfuras(_item: Item): void {
}

// Lowers quality by `rate` per day, and twice as fast once the sell date has passed.
function degrade(item: Item, rate: number): void {
  item.sellIn -= 1;
  const loss = sellDateHasPassed(item) ? rate * 2 : rate;
  // One point at a time, so that the lower bound is checked before each point,
  // exactly as the original code did.
  for (let point = 0; point < loss; point++) {
    decreaseQuality(item);
  }
}

// To be called after the sellIn of the day has been lowered.
function sellDateHasPassed(item: Item): boolean {
  return item.sellIn < 0;
}

function increaseQuality(item: Item): void {
  if (item.quality < MAX_QUALITY) {
    item.quality += 1;
  }
}

function decreaseQuality(item: Item): void {
  if (item.quality > MIN_QUALITY) {
    item.quality -= 1;
  }
}
