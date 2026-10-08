import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIGITAL_DOWNLOAD,
  describeFormat,
  getFormat,
  isDigital,
  priceOf,
  PRINT_SIZES,
  standardPrices,
} from "@/lib/print-sizes";

describe("formats", () => {
  it("knows the four print sizes and the download, and nothing else", () => {
    for (const size of PRINT_SIZES) assert.equal(getFormat(size.name), size);
    assert.equal(getFormat("DIGITAL"), DIGITAL_DOWNLOAD);
    for (const bad of ["", "a4", "DIGITAL2", "A1", "__proto__"]) {
      assert.equal(getFormat(bad), undefined, bad);
    }
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
  });
});
