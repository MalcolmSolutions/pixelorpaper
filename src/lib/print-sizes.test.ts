import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIGITAL_DOWNLOAD,
  describeFormat,
  formatLabel,
  FUJI_SIZES,
  getFormat,
  isDigital,
  priceOf,
  PRINT_SIZES,
  sizeLabel,
  standardPrices,
} from "@/lib/print-sizes";

describe("formats", () => {
  it("knows the print sizes, the Fuji sizes and the download, and nothing else", () => {
    for (const size of PRINT_SIZES) assert.equal(getFormat(size.name), size);
    for (const size of FUJI_SIZES) assert.equal(getFormat(size.name), size);
    assert.equal(getFormat("DIGITAL"), DIGITAL_DOWNLOAD);
    for (const bad of ["", "a4", "DIGITAL2", "A6", "8x10", "60x60in", "__proto__"]) {
      assert.equal(getFormat(bad), undefined, bad);
    }
  });

  it("has every Fuji size once, none clashing with the main sizes", () => {
    const names = [...PRINT_SIZES, ...FUJI_SIZES].map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
    assert.equal(FUJI_SIZES.length, 36);
    for (const size of FUJI_SIZES) {
      assert.ok(size.widthMm <= size.heightMm, size.name);
    }
  });

  it("prices Fuji sizes at half again theprintspace's cost, ending .99", () => {
    // A1: lab £47.81, dropship £57.37, × 1.5 = £86.06.
    assert.equal(getFormat("A1")?.name, "A1");
    assert.equal(priceOf(standardPrices(), getFormat("A1")!), 8699);
    // 4 × 6 in: lab £3.71, dropship £4.45, × 1.5 = £6.68.
    assert.equal(priceOf(standardPrices(), getFormat("4x6in")!), 699);
    for (const size of FUJI_SIZES) assert.equal(size.price % 100, 99, size.name);
  });

  it("labels sizes for customers", () => {
    assert.equal(formatLabel(getFormat("A4")!), "A4");
    assert.equal(formatLabel(getFormat("8x10in")!), "8 × 10 in");
    assert.equal(sizeLabel("DIGITAL"), "Digital download");
    assert.equal(sizeLabel("gone"), "gone");
  });

  it("prices the download at £5 regardless of the print's prices", () => {
    const prices = { ...standardPrices(), A4: 1500 };
    assert.equal(priceOf(prices, DIGITAL_DOWNLOAD), 500);
    assert.equal(priceOf(prices, getFormat("A4")!), 1500);
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
