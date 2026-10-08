import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewEdge } from "@/lib/preview-size";

describe("previewEdge", () => {
  it("caps large originals at 2000 px", () => {
    assert.equal(previewEdge(6000), 2000);
  });
  it("halves smaller originals, but not below 600 px", () => {
    assert.equal(previewEdge(2000), 1000);
    assert.equal(previewEdge(1000), 600);
  });
});
