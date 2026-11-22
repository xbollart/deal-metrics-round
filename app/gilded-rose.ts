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
// Any item whose name starts with this prefix is a Conjured item.
const CONJURED_PREFIX = 'Conjured';

const MIN_QUALITY = 0;
const MAX_QUALITY = 50;

// Backstage passes gain more quality when this many days or fewer are left.
const BACKSTAGE_DOUBLE_INCREASE_DAYS = 10;
const BACKSTAGE_TRIPLE_INCREASE_DAYS = 5;

// Quality a normal item loses per day before its sell date.
const NORMAL_DEGRADATION_RATE = 1;
// Conjured items degrade twice as fast as normal items.
const CONJURED_DEGRADATION_RATE = NORMAL_DEGRADATION_RATE * 2;

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
      if (isConjured(item)) {
        updateConjuredItem(item);
      } else {
        updateNormalItem(item);
      }
  }
}

// The type check keeps an item whose name is not text a normal item, as it
// was before Conjured items existed, instead of failing on it.
function isConjured(item: Item): boolean {
  return typeof item.name === 'string' && item.name.startsWith(CONJURED_PREFIX);
}

function updateNormalItem(item: Item): void {
  degrade(item, NORMAL_DEGRADATION_RATE);
}

function updateConjuredItem(item: Item): void {
  degrade(item, CONJURED_DEGRADATION_RATE);
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
  if (hasAtMostDaysLeft(item, BACKSTAGE_DOUBLE_INCREASE_DAYS)) {
    increaseQuality(item);
  }
  if (hasAtMostDaysLeft(item, BACKSTAGE_TRIPLE_INCREASE_DAYS)) {
    increaseQuality(item);
  }
  item.sellIn -= 1;
  if (sellDateHasPassed(item)) {
    item.quality = MIN_QUALITY;
  }
}

// Sulfuras is a legendary item: it never has to be sold and never changes.
function updateSulfuras(_item: Item): void {}

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

// To be called before the sellIn of the day is lowered. Written as "fewer than
// days + 1" because the original code did it this way: a sellIn that is not a
// whole number, such as 10.5, counts as "10 days or less" (see the tests).
function hasAtMostDaysLeft(item: Item, days: number): boolean {
  return item.sellIn < days + 1;
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
