import { Item, GildedRose } from './gilded-rose';

/**
 * Runs the shop for the given number of days and returns the text report:
 * one block per day, listing every item before that day's update.
 */
export function buildReport(days: number): string {
  const lines: string[] = [];

  lines.push("OMGHAI!");

  const items = [
    new Item("+5 Dexterity Vest", 10, 20), //
    new Item("Aged Brie", 2, 0), //
    new Item("Elixir of the Mongoose", 5, 7), //
    new Item("Sulfuras, Hand of Ragnaros", 0, 80), //
    new Item("Sulfuras, Hand of Ragnaros", -1, 80),
    new Item("Backstage passes to a TAFKAL80ETC concert", 15, 20),
    new Item("Backstage passes to a TAFKAL80ETC concert", 10, 49),
    new Item("Backstage passes to a TAFKAL80ETC concert", 5, 49),
    new Item("Conjured Mana Cake", 3, 6)];

  const gildedRose = new GildedRose(items);

  for (let i = 0; i < days + 1; i++) {
    lines.push("-------- day " + i + " --------");
    lines.push("name, sellIn, quality");
    items.forEach(element => {
      lines.push(element.name + ', ' + element.sellIn + ', ' + element.quality);
    });
    lines.push("");
    gildedRose.updateQuality();
  }

  return lines.join("\n") + "\n";
}
