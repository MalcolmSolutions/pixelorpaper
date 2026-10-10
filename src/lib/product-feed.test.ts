import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRINT_SIZES, standardPrices } from "@/lib/print-sizes";
import { feedId, feedPrice, productFeedXml } from "@/lib/product-feed";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

const product: Product = {
  id: "landscapes/misty-hills.jpg",
  slug: "misty-hills",
  name: "Misty Hills & Dales",
  description: "Morning mist over rolling hills.",
  category: "landscapes",
  image: {
    src: "https://img.example/landscapes/misty-hills.jpg",
    width: 3,
    height: 2,
    alt: "",
  },
  orientation: "landscape",
  keywords: [],
  available: true,
  prices: standardPrices(),
};
const category: Category = {
  slug: "landscapes",
  name: "Landscapes",
  description: "",
  wall: "sand",
  count: 1,
};

const items = (feed: string) => feed.match(/<item>[\s\S]*?<\/item>/g) ?? [];

describe("productFeedXml", () => {
  const feed = productFeedXml([product], [category]);

  it("lists one item per print size, grouped by print", () => {
    const list = items(feed);
    assert.equal(list.length, PRINT_SIZES.length);
    for (const entry of list) {
      assert.match(entry, /<g:item_group_id>misty-hills<\/g:item_group_id>/);
    }
    assert.match(feed, /<g:id>misty-hills-a3<\/g:id>/);
  });

  it("links each size to the page opened at that size, with its price", () => {
    const a3 = items(feed).find((i) => i.includes("<g:size>A3</g:size>"))!;
    assert.match(
      a3,
      /<link>https:\/\/pixelorpaper\.co\.uk\/products\/misty-hills\?size=A3<\/link>/,
    );
    assert.match(a3, /<g:price>18\.99 GBP<\/g:price>/);
    assert.match(a3, /<g:product_type>Photographic Prints &gt; Landscapes</);
  });

  it("escapes text for XML", () => {
    assert.match(feed, /Misty Hills &amp; Dales Photographic Print, A4/);
    assert.doesNotMatch(feed, /Hills & Dales/);
  });

  it("leaves out prints that aren't for sale", () => {
    const off = productFeedXml([{ ...product, available: false }], [category]);
    assert.equal(items(off).length, 0);
  });
});

describe("feedId", () => {
  it("keeps short ids", () => {
    assert.equal(feedId("misty-hills-a4"), "misty-hills-a4");
  });

  it("trims long ids to 50 characters and keeps them unique", () => {
    const a = feedId(`${"x".repeat(60)}-a4`);
    const b = feedId(`${"x".repeat(60)}-a3`);
    assert.equal(a.length, 50);
    assert.equal(b.length, 50);
    assert.notEqual(a, b);
  });
});

describe("feedPrice", () => {
  it("formats pence as pounds with the currency", () => {
    assert.equal(feedPrice(1299), "12.99 GBP");
    assert.equal(feedPrice(500), "5.00 GBP");
  });
});
