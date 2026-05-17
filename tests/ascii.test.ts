/**
 * Unit tests for the ASCII weather art module: category mapping, the random
 * code picker, and the shape/width invariants that the side-by-side layout
 * in `display.ts` depends on.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import stringWidth from "string-width";
import {
  artCategory,
  randomWeatherCode,
  weatherArt,
  ART_WIDTH,
  ART_HEIGHT,
} from "../src/ascii.ts";

describe("artCategory", () => {
  it("maps each WMO code to its expected category", () => {
    assert.equal(artCategory(0), "sunny");
    assert.equal(artCategory(1), "mostlyClear");
    assert.equal(artCategory(2), "partlyCloudy");
    assert.equal(artCategory(3), "cloudy");
    assert.equal(artCategory(45), "fog");
    assert.equal(artCategory(48), "fog");
    assert.equal(artCategory(51), "drizzle");
    assert.equal(artCategory(61), "rain");
    assert.equal(artCategory(65), "heavyRain");
    assert.equal(artCategory(71), "snow");
    assert.equal(artCategory(75), "heavySnow");
    assert.equal(artCategory(80), "showers");
    assert.equal(artCategory(82), "heavyRain");
    assert.equal(artCategory(95), "thunder");
    assert.equal(artCategory(99), "thunder");
  });

  it("falls back to 'unknown' for unrecognised codes", () => {
    assert.equal(artCategory(999), "unknown");
    assert.equal(artCategory(-1), "unknown");
    assert.equal(artCategory(42), "unknown");
  });
});

describe("randomWeatherCode", () => {
  it("only returns codes that map to a real (non-unknown) category", () => {
    // Sample heavily so we catch any out-of-band values from the picker.
    for (let i = 0; i < 200; i++) {
      const code = randomWeatherCode();
      assert.notEqual(artCategory(code), "unknown");
    }
  });

  it("returns integers (no floats / strings)", () => {
    const code = randomWeatherCode();
    assert.equal(typeof code, "number");
    assert.equal(Number.isInteger(code), true);
  });
});

describe("weatherArt", () => {
  it("always returns ART_HEIGHT lines", () => {
    for (const code of [0, 1, 2, 3, 45, 51, 61, 65, 71, 80, 95, 999]) {
      const art = weatherArt(code);
      assert.equal(
        art.length,
        ART_HEIGHT,
        `code ${code} should produce ${ART_HEIGHT} lines`,
      );
    }
  });

  it("each line has the same fixed visual width (ART_WIDTH)", () => {
    // The side-by-side layout in display.ts depends on this invariant.
    for (const code of [0, 2, 65, 95]) {
      const art = weatherArt(code);
      for (const line of art) {
        assert.equal(
          stringWidth(line),
          ART_WIDTH,
          `code ${code}: expected width ${ART_WIDTH}, got ${stringWidth(line)} ("${line}")`,
        );
      }
    }
  });
});
