import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstSentence } from "@/lib/utils";

describe("firstSentence", () => {
  it("keeps only the first sentence", () => {
    assert.equal(
      firstSentence("Prints of the sea. Orcas surface close to shore."),
      "Prints of the sea.",
    );
  });

  it("joins lines and paragraphs", () => {
    assert.equal(
      firstSentence("Prints of\nthe sea.\n\nMore."),
      "Prints of the sea.",
    );
  });

  it("returns text with no full stop unchanged", () => {
    assert.equal(firstSentence("Parks and pathways"), "Parks and pathways");
  });

  it("doesn't split inside abbreviations like St", () => {
    assert.equal(
      firstSentence("Prints of St Peter's Basilica. More."),
      "Prints of St Peter's Basilica.",
    );
  });
});
