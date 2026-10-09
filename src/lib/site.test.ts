import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { siteUrl } from "@/lib/site";

const original = process.env.SITE_URL;

describe("siteUrl", () => {
  afterEach(() => {
    if (original === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = original;
  });

  it("tidies spaces, quotes and a trailing slash", () => {
    for (const value of [
      "https://pixelorpaper.co.uk",
      "https://pixelorpaper.co.uk/",
      "  https://pixelorpaper.co.uk\r\n",
      '"https://pixelorpaper.co.uk"',
    ]) {
      process.env.SITE_URL = value;
      assert.equal(siteUrl(), "https://pixelorpaper.co.uk");
    }
  });

  it("rejects an address without a scheme", () => {
    process.env.SITE_URL = "pixelorpaper.co.uk";
    assert.throws(siteUrl, /SITE_URL must be a full address/);
  });
});
