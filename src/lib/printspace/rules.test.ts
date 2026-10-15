import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { standardPrices } from "@/lib/print-sizes";
import {
  deliveryFields,
  fulfilmentMode,
  isUploadFor,
  jobStatusFor,
  passesCostCheck,
  penceFromPounds,
  variantSpecs,
} from "@/lib/printspace/rules";

describe("fulfilmentMode", () => {
  const live = "https://pixelorpaper.co.uk";

  it("is off unless set to quote or live", () => {
    assert.equal(fulfilmentMode(undefined, live), "off");
    assert.equal(fulfilmentMode("", live), "off");
    assert.equal(fulfilmentMode("LIVE", live), "off");
    assert.equal(fulfilmentMode("quote", live), "quote");
    assert.equal(fulfilmentMode("live", live), "live");
    assert.equal(fulfilmentMode("live", `${live}/`), "live");
  });

  it("never goes live anywhere but the live site", () => {
    const staging = "https://pixelorpaper-staging.malcolmrose.workers.dev";
    assert.equal(fulfilmentMode("live", staging), "quote");
    assert.equal(fulfilmentMode("live", "http://localhost:3000"), "quote");
    assert.equal(fulfilmentMode("live", undefined), "quote");
  });
});

describe("variantSpecs", () => {
  it("makes every A size on Fuji Matt, unframed, at our prices", () => {
    const specs = variantSpecs({ width: 2000, height: 3000 }, standardPrices());
    assert.deepEqual(
      specs.map((s) => s.size_label),
      ["A5", "A4", "A3", "A2"],
    );
    assert.ok(specs.every((s) => s.paper_id === "fuji-matt" && !s.is_framed));
    assert.equal(specs[1].price_gbp, 12.99);
    assert.deepEqual(
      [specs[1].print_width_mm, specs[1].print_height_mm],
      [210, 297],
    );
  });

  it("turns the paper to match a landscape image", () => {
    const [a5] = variantSpecs({ width: 3000, height: 2000 }, standardPrices());
    assert.deepEqual([a5.print_width_mm, a5.print_height_mm], [210, 148]);
  });
});

describe("penceFromPounds", () => {
  it("rounds to whole pence", () => {
    assert.equal(penceFromPounds(12.99), 1299);
    assert.equal(penceFromPounds(0.1 + 0.2), 30);
  });
});

describe("isUploadFor", () => {
  it("matches the file name, ignoring folders, case and extension", () => {
    assert.ok(isUploadFor("Misty-Hills.JPG", "landscapes/misty-hills.jpg"));
    assert.ok(isUploadFor("misty-hills.tif", "landscapes/misty-hills.jpg"));
    assert.ok(isUploadFor("misty-hills", "landscapes/misty-hills.jpg"));
  });

  it("doesn't match other files or empty names", () => {
    assert.ok(!isUploadFor("misty-hills-2.jpg", "landscapes/misty-hills.jpg"));
    assert.ok(!isUploadFor("", "landscapes/misty-hills.jpg"));
  });
});

describe("deliveryFields", () => {
  const shipping = {
    name: "Ada Lovelace",
    address: {
      line1: "1 High Street",
      line2: null,
      city: "Bath",
      state: "Somerset",
      postal_code: "BA1 1AA",
      country: "GB",
    },
  };

  it("maps Stripe's shipping details to theprintspace's fields", () => {
    assert.deepEqual(
      deliveryFields(JSON.stringify(shipping), "ada@example.com"),
      {
        delivery_name: "Ada Lovelace",
        delivery_line1: "1 High Street",
        delivery_city: "Bath",
        delivery_county: "Somerset",
        delivery_postcode: "BA1 1AA",
        delivery_country_code: "GB",
        delivery_email: "ada@example.com",
      },
    );
  });

  it("is null when the address is missing or incomplete", () => {
    assert.equal(deliveryFields(null, null), null);
    assert.equal(deliveryFields("not json", null), null);
    assert.equal(
      deliveryFields(
        JSON.stringify({ ...shipping, address: { ...shipping.address, city: "" } }),
        null,
      ),
      null,
    );
  });
});

describe("passesCostCheck", () => {
  it("passes only when the print cost is below what the customer paid", () => {
    assert.ok(passesCostCheck(900, 1299));
    assert.ok(!passesCostCheck(1299, 1299));
    assert.ok(!passesCostCheck(1500, 1299));
  });
});

describe("jobStatusFor", () => {
  it("recognises dispatched and cancelled orders", () => {
    assert.equal(jobStatusFor("Dispatched"), "dispatched");
    assert.equal(jobStatusFor("shipped"), "dispatched");
    assert.equal(jobStatusFor("Cancelled"), "cancelled");
  });

  it("leaves anything else as submitted", () => {
    assert.equal(jobStatusFor("In production"), "submitted");
    assert.equal(jobStatusFor("Complete"), "submitted");
    assert.equal(jobStatusFor(null), "submitted");
  });
});
