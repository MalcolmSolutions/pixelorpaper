import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { standardPrices } from "@/lib/print-sizes";
import {
  jsonLdScript,
  matchOldProductId,
  metaDescription,
  productJsonLd,
} from "@/lib/seo";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

const product: Product = {
  id: "landscapes/misty-hills.jpg",
  slug: "misty-hills",
  name: "Misty Hills",
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

/** The markup as search engines read it (plain JSON, loosely typed). */
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("metaDescription", () => {
  it("keeps short text and tidies spaces", () => {
    assert.equal(metaDescription("  A  short\nline. "), "A short line.");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const out = metaDescription("word ".repeat(60));
    assert.ok(out.length <= 155);
    assert.match(out, /word…$/);
  });
});

describe("productJsonLd", () => {
  it("marks up the default A4 price, stock, free UK delivery and breadcrumbs", () => {
    const [item, crumbs] = asJson(productJsonLd(product, category));
    assert.equal(item["@type"], "Product");
    assert.equal(item.url, "https://pixelorpaper.co.uk/products/misty-hills");
    assert.equal(item.offers.price, "12.99");
    assert.equal(item.offers.priceCurrency, "GBP");
    assert.equal(item.offers.availability, "https://schema.org/InStock");
    assert.equal(item.offers.shippingDetails.shippingRate.value, "0");
    assert.deepEqual(
      crumbs.itemListElement.map((c: { item: string }) => c.item),
      [
        "https://pixelorpaper.co.uk/products",
        "https://pixelorpaper.co.uk/collections/landscapes",
        "https://pixelorpaper.co.uk/products/misty-hills",
      ],
    );
  });

  it("marks prints taken off sale as out of stock", () => {
    const [item] = asJson(productJsonLd({ ...product, available: false }));
    assert.equal(item.offers.availability, "https://schema.org/OutOfStock");
  });
});

describe("jsonLdScript", () => {
  it("escapes < so a description can't close the script tag", () => {
    assert.equal(jsonLdScript({ d: "</script>" }), '{"d":"\\u003c/script>"}');
  });
});

describe("matchOldProductId", () => {
  const products = [
    { id: "landscapes/misty-hills.jpg" },
    { id: "hills.jpg" },
    { id: "cityscapes/venice-at-night.png" },
  ];

  it("finds the product the old site's slugged key pointed to", () => {
    assert.equal(
      matchOldProductId("landscapes-misty-hills-jpg", products),
      products[0],
    );
    assert.equal(
      matchOldProductId("cityscapes-venice-at-night-png", products),
      products[2],
    );
  });

  it("allows a folder prefix and the old -2 repeat suffix", () => {
    assert.equal(
      matchOldProductId("previews-landscapes-misty-hills-jpg", products),
      products[0],
    );
    assert.equal(
      matchOldProductId("landscapes-misty-hills-jpg-2", products),
      products[0],
    );
  });

  it("prefers the exact key over a shorter one it ends with", () => {
    assert.equal(matchOldProductId("hills-jpg", products), products[1]);
  });

  it("returns nothing for unknown ids", () => {
    assert.equal(matchOldProductId("nothing-here-jpg", products), undefined);
  });
});
