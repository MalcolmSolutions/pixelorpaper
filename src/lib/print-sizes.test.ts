import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DELIVERY_PRICE,
  deliveryFor,
  DIGITAL_DOWNLOAD,
  describeFormat,
  formatLabel,
  FUJI_SIZES,
  getFormat,
  isDigital,
  PRINT_SIZES,
  priceFromCost,
  sizeLabel,
  vatIn,
} from "@/lib/print-sizes";

describe("formats", () => {
  it("knows the print sizes, the Fuji sizes and the download, and nothing else", () => {
    for (const size of PRINT_SIZES) assert.equal(getFormat(size.name), size);
    for (const size of FUJI_SIZES) assert.equal(getFormat(size.name), size);
    assert.equal(getFormat("DIGITAL"), DIGITAL_DOWNLOAD);
    for (const bad of ["", "a4", "DIGITAL2", "A6", "A1", "8x10", "4x30in", "60x60in", "__proto__"]) {
      assert.equal(getFormat(bad), undefined, bad);
    }
  });

  it("has every Fuji size once, none clashing with the main sizes", () => {
    const names = [...PRINT_SIZES, ...FUJI_SIZES].map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
    assert.equal(FUJI_SIZES.length, 17);
    for (const size of FUJI_SIZES) {
      assert.ok(size.widthMm <= size.heightMm, size.name);
    }
  });

  it("prices at theprintspace's cost excl. VAT + 50%, plus VAT, rounded up to .99", () => {
    // A4: dropship £9.684 excl. VAT, + 50% = £14.526, + VAT = £17.43.
    assert.equal(getFormat("A4")?.price, 1799);
    // 8 × 10 in: £8.352 → £12.528 → £15.03.
    assert.equal(getFormat("8x10in")?.price, 1599);
    assert.deepEqual(
      PRINT_SIZES.map((s) => s.price),
      [999, 1799, 2199, 4399],
    );
    for (const size of [...PRINT_SIZES, ...FUJI_SIZES]) {
      assert.equal(size.price % 100, 99, size.name);
      assert.ok(size.price >= size.cost * 1.5 * 1.2, size.name);
    }
  });

  it("rounds up, never down, to the next .99", () => {
    // £16.99 exactly stays; a penny over goes to the next pound.
    assert.equal(priceFromCost(1699 / 1.8), 1699);
    assert.equal(priceFromCost(1700 / 1.8), 1799);
    assert.equal(priceFromCost(1698.5 / 1.8), 1699);
  });

  it("works out the VAT included in a price", () => {
    assert.equal(vatIn(1799), 300);
    assert.equal(vatIn(500), 83);
    assert.equal(vatIn(999), 167);
  });

  it("labels sizes for customers", () => {
    assert.equal(formatLabel(getFormat("A4")!), "A4");
    assert.equal(formatLabel(getFormat("8x10in")!), "8 × 10 in");
    assert.equal(sizeLabel("DIGITAL"), "Digital download");
    assert.equal(sizeLabel("gone"), "gone");
  });

  it("charges one flat delivery for prints, none for downloads only", () => {
    // theprintspace's £6.45 excl. VAT, + 20% VAT.
    assert.equal(DELIVERY_PRICE, 774);
    const a4 = getFormat("A4")!;
    const big = getFormat("50x75in")!;
    assert.equal(deliveryFor([a4]), 774);
    assert.equal(deliveryFor([a4, big, DIGITAL_DOWNLOAD]), 774);
    assert.equal(deliveryFor([DIGITAL_DOWNLOAD]), 0);
    assert.equal(deliveryFor([]), 0);
  });

  it("prices the download at £5", () => {
    assert.equal(DIGITAL_DOWNLOAD.price, 500);
    assert.equal(isDigital(DIGITAL_DOWNLOAD), true);
    assert.equal(isDigital(getFormat("A5")!), false);
  });

  it("describes prints in cm and downloads in pixels", () => {
    const image = { width: 6000, height: 3376 };
    assert.equal(
      describeFormat(DIGITAL_DOWNLOAD, image),
      "Digital download · 6000 × 3376 px",
    );
    assert.equal(describeFormat(getFormat("A4")!, image), "A4 · 21 × 29.7 cm");
    assert.equal(
      describeFormat(getFormat("8x10in")!, image),
      "8 × 10 in · 20.3 × 25.4 cm",
    );
  });
});
