/**
 * Data-integrity tests for the COUNTRY_CITIES map.
 * Every entry is used directly as weather API coordinates, so bad values
 * produce silent wrong results rather than errors — catch them here.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_CITIES, COUNTRY_FLAGS } from "../src/countries.ts";

const entries = Object.entries(COUNTRY_CITIES);

describe("COUNTRY_CITIES", () => {
  it("covers at least 100 countries", () => {
    assert.ok(
      entries.length >= 100,
      `Expected ≥ 100 countries, got ${entries.length}`,
    );
  });

  it("all keys are lowercase (used for case-insensitive lookup)", () => {
    for (const [key] of entries) {
      assert.equal(key, key.toLowerCase(), `Key "${key}" must be lowercase`);
    }
  });

  it("every country has between 3 and 8 cities", () => {
    for (const [country, cities] of entries) {
      assert.ok(
        cities.length >= 3,
        `"${country}" has only ${cities.length} cities (minimum 3)`,
      );
      assert.ok(
        cities.length <= 8,
        `"${country}" has ${cities.length} cities (maximum 8)`,
      );
    }
  });

  it("all latitudes are in the valid range −90 to 90", () => {
    for (const [country, cities] of entries) {
      for (const city of cities) {
        assert.ok(
          city.lat >= -90 && city.lat <= 90,
          `${country}/${city.name}: lat ${city.lat} out of range`,
        );
      }
    }
  });

  it("all longitudes are in the valid range −180 to 180", () => {
    for (const [country, cities] of entries) {
      for (const city of cities) {
        assert.ok(
          city.lon >= -180 && city.lon <= 180,
          `${country}/${city.name}: lon ${city.lon} out of range`,
        );
      }
    }
  });

  it("all city names are non-empty strings", () => {
    for (const [country, cities] of entries) {
      for (const city of cities) {
        assert.equal(typeof city.name, "string");
        assert.ok(
          city.name.length > 0,
          `${country} has a city with an empty name`,
        );
      }
    }
  });

  it("no duplicate city names within the same country", () => {
    for (const [country, cities] of entries) {
      const names = cities.map((c) => c.name.toLowerCase());
      const unique = new Set(names);
      assert.equal(
        unique.size,
        names.length,
        `"${country}" has duplicate city names`,
      );
    }
  });

  it("every country in COUNTRY_CITIES has a flag in COUNTRY_FLAGS", () => {
    for (const key of Object.keys(COUNTRY_CITIES)) {
      assert.ok(
        key in COUNTRY_FLAGS,
        `"${key}" is in COUNTRY_CITIES but missing from COUNTRY_FLAGS`,
      );
    }
  });

  it("all flag values are non-empty strings", () => {
    for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
      assert.equal(typeof flag, "string");
      assert.ok(flag.length > 0, `Flag for "${key}" is empty`);
    }
  });

  it("spot-checks capitals and major cities for key countries", () => {
    const checks: Array<[string, string]> = [
      ["philippines", "Manila"],
      ["japan", "Tokyo"],
      ["united states", "New York"],
      ["united kingdom", "London"],
      ["germany", "Berlin"],
      ["france", "Paris"],
      ["india", "Mumbai"],
      ["china", "Beijing"],
      ["brazil", "São Paulo"],
      ["australia", "Sydney"],
      ["south africa", "Johannesburg"],
      ["egypt", "Cairo"],
      ["nigeria", "Lagos"],
      ["russia", "Moscow"],
    ];

    for (const [country, expectedCity] of checks) {
      const cities = COUNTRY_CITIES[country];
      assert.ok(cities, `"${country}" not found in COUNTRY_CITIES`);
      assert.ok(
        cities.some((c) => c.name === expectedCity),
        `"${country}" should include "${expectedCity}"`,
      );
    }
  });

  it("all coordinates are numbers (not strings or undefined)", () => {
    for (const [country, cities] of entries) {
      for (const city of cities) {
        assert.equal(
          typeof city.lat,
          "number",
          `${country}/${city.name}: lat is not a number`,
        );
        assert.equal(
          typeof city.lon,
          "number",
          `${country}/${city.name}: lon is not a number`,
        );
        assert.ok(
          !isNaN(city.lat) && !isNaN(city.lon),
          `${country}/${city.name}: coordinates contain NaN`,
        );
      }
    }
  });
});
