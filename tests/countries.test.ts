/**
 * Data-integrity tests for the COUNTRY_CITIES map.
 * Every entry is used directly as weather API coordinates, so bad values
 * produce silent wrong results rather than errors — catch them here.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_CITIES, COUNTRY_FLAGS, COUNTRY_CODES } from "../src/countries.ts";

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

  it("city coordinates are geographically correct (within 0.5° of known values)", () => {
    // Tolerance of 0.5° ≈ 55 km. Tight enough to catch wrong-city mistakes,
    // loose enough to survive minor precision differences.
    const TOLERANCE = 0.5;

    const known: Array<[string, string, number, number]> = [
      // [country, city, lat, lon]
      ["philippines", "Manila",           14.5995,  120.9842],
      ["philippines", "Cebu City",        10.3157,  123.8854],
      ["philippines", "Davao",             7.1907,  125.4553],
      ["japan",       "Tokyo",            35.6762,  139.6503],
      ["japan",       "Osaka",            34.6937,  135.5023],
      ["japan",       "Sapporo",          43.0618,  141.3545],
      ["united states", "New York",       40.7128,  -74.0060],
      ["united states", "Los Angeles",    34.0522, -118.2437],
      ["united states", "Chicago",        41.8781,  -87.6298],
      ["united states", "Houston",        29.7604,  -95.3698],
      ["united kingdom", "London",        51.5074,   -0.1278],
      ["united kingdom", "Edinburgh",     55.9533,   -3.1883],
      ["germany",     "Berlin",           52.5200,   13.4050],
      ["germany",     "Munich",           48.1351,   11.5820],
      ["france",      "Paris",            48.8566,    2.3522],
      ["france",      "Marseille",        43.2965,    5.3698],
      ["india",       "Mumbai",           19.0760,   72.8777],
      ["india",       "Delhi",            28.7041,   77.1025],
      ["india",       "Bangalore",        12.9716,   77.5946],
      ["china",       "Beijing",          39.9042,  116.4074],
      ["china",       "Shanghai",         31.2304,  121.4737],
      ["brazil",      "São Paulo",       -23.5505,  -46.6333],
      ["brazil",      "Rio de Janeiro",  -22.9068,  -43.1729],
      ["australia",   "Sydney",          -33.8688,  151.2093],
      ["australia",   "Melbourne",       -37.8136,  144.9631],
      ["south africa","Johannesburg",    -26.2041,   28.0473],
      ["south africa","Cape Town",       -33.9249,   18.4241],
      ["egypt",       "Cairo",            30.0444,   31.2357],
      ["nigeria",     "Lagos",             6.5244,    3.3792],
      ["russia",      "Moscow",           55.7558,   37.6173],
      ["russia",      "Saint Petersburg", 59.9343,   30.3351],
      ["mexico",      "Mexico City",      19.4326,  -99.1332],
      ["indonesia",   "Jakarta",          -6.2088,  106.8456],
      ["saudi arabia","Riyadh",           24.6877,   46.7219],
      ["turkey",      "Istanbul",         41.0082,   28.9784],
      ["argentina",   "Buenos Aires",    -34.6037,  -58.3816],
      ["south korea", "Seoul",            37.5665,  126.9780],
      ["ukraine",     "Kyiv",             50.4501,   30.5234],
      ["kenya",       "Nairobi",          -1.2921,   36.8219],
      ["new zealand", "Auckland",        -36.8485,  174.7633],
    ];

    for (const [country, cityName, expectedLat, expectedLon] of known) {
      const cities = COUNTRY_CITIES[country];
      assert.ok(cities, `"${country}" not found in COUNTRY_CITIES`);

      const city = cities.find((c) => c.name === cityName);
      assert.ok(city, `"${cityName}" not found in "${country}"`);

      assert.ok(
        Math.abs(city.lat - expectedLat) <= TOLERANCE,
        `${country}/${cityName}: lat ${city.lat} is more than ${TOLERANCE}° from expected ${expectedLat}`,
      );
      assert.ok(
        Math.abs(city.lon - expectedLon) <= TOLERANCE,
        `${country}/${cityName}: lon ${city.lon} is more than ${TOLERANCE}° from expected ${expectedLon}`,
      );
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

  it("every COUNTRY_CODES value resolves to a key in COUNTRY_CITIES", () => {
    for (const [code, name] of Object.entries(COUNTRY_CODES)) {
      assert.ok(
        name in COUNTRY_CITIES,
        `COUNTRY_CODES["${code}"] = "${name}" has no entry in COUNTRY_CITIES`,
      );
    }
  });

  it("all COUNTRY_CODES keys are exactly 2 uppercase letters", () => {
    for (const code of Object.keys(COUNTRY_CODES)) {
      assert.match(code, /^[A-Z]{2}$/, `"${code}" is not a valid ISO 3166-1 alpha-2 code`);
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
