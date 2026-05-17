/**
 * Unit tests for the date parser. Covers the three accepted forms
 * (`yesterday`, `today`, `YYYY-MM-DD`) and the failure cases that the
 * CLI relies on to redirect users towards ISO format.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDate, toISODate } from "../src/dates.ts";

describe("toISODate", () => {
  it("formats a Date as zero-padded YYYY-MM-DD", () => {
    assert.equal(toISODate(new Date(2024, 0, 5)), "2024-01-05");
    assert.equal(toISODate(new Date(2024, 11, 31)), "2024-12-31");
  });

  it("uses local (not UTC) calendar fields", () => {
    // Constructed via Date(y, m, d) which is local-time — no timezone shift.
    const d = new Date(2024, 5, 15);
    assert.equal(toISODate(d), "2024-06-15");
  });
});

describe("parseDate", () => {
  it("returns yesterday's ISO date for 'yesterday'", () => {
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    assert.equal(parseDate("yesterday"), toISODate(expected));
  });

  it("returns today's ISO date for 'today'", () => {
    assert.equal(parseDate("today"), toISODate(new Date()));
  });

  it("is case-insensitive for keywords", () => {
    assert.equal(parseDate("Yesterday"), parseDate("yesterday"));
    assert.equal(parseDate("YESTERDAY"), parseDate("yesterday"));
    assert.equal(parseDate("ToDaY"), parseDate("today"));
  });

  it("accepts valid ISO 8601 strings as-is", () => {
    assert.equal(parseDate("2024-12-25"), "2024-12-25");
    assert.equal(parseDate("2000-01-01"), "2000-01-01");
    assert.equal(parseDate("1999-06-15"), "1999-06-15");
  });

  it("rejects MM/DD/YYYY (US format)", () => {
    assert.equal(parseDate("12/25/2024"), null);
    assert.equal(parseDate("1/5/2024"), null);
  });

  it("rejects DD/MM/YYYY and other slash formats", () => {
    assert.equal(parseDate("25/12/2024"), null);
  });

  it("rejects dot-separated dates", () => {
    assert.equal(parseDate("25.12.2024"), null);
  });

  it("rejects garbage input", () => {
    assert.equal(parseDate("Manila"), null);
    assert.equal(parseDate(""), null);
    assert.equal(parseDate("tomorrow"), null);
    assert.equal(parseDate("2024"), null);
    assert.equal(parseDate("2024-12"), null);
  });
});
