/**
 * Unit tests for the visual-width-aware padding helpers. These are the
 * load-bearing primitives for every aligned column in the output, so they
 * must handle ANSI escapes (chalk-styled strings) and wide chars (emojis)
 * correctly.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import chalk from "chalk";
import stringWidth from "string-width";
import { padR, padL, startSpinner } from "../src/utils.ts";

describe("padR (right-pad to visual width)", () => {
  it("pads short ASCII strings with spaces", () => {
    assert.equal(padR("a", 5), "a    ");
    assert.equal(padR("", 3), "   ");
  });

  it("returns the input unchanged when it already meets the width", () => {
    assert.equal(padR("hello", 5), "hello");
    assert.equal(padR("hello", 3), "hello"); // never truncates
  });

  it("ignores ANSI escape codes when measuring width", () => {
    const styled = chalk.red("error");
    const padded = padR(styled, 10);
    // Visible width is 5 ("error") so 5 trailing spaces are added.
    assert.equal(stringWidth(padded), 10);
    assert.ok(padded.endsWith("     "));
  });

  it("treats wide chars (emoji) as 2 columns", () => {
    // "⛅" renders 2 columns. Pad to 5 → expect 3 trailing spaces.
    const padded = padR("⛅", 5);
    assert.equal(stringWidth(padded), 5);
  });
});

describe("startSpinner", () => {
  it("returns a callable stop function", () => {
    // In a non-TTY test environment the spinner writes the message once and
    // returns a no-op. Calling stop() must not throw.
    const stop = startSpinner("Loading…");
    assert.equal(typeof stop, "function");
    assert.doesNotThrow(() => stop());
  });

  it("stop() is idempotent — calling it twice does not throw", () => {
    const stop = startSpinner("Test…");
    assert.doesNotThrow(() => {
      stop();
      stop();
    });
  });
});

describe("padL (left-pad to visual width)", () => {
  it("pads short ASCII strings with leading spaces", () => {
    assert.equal(padL("a", 5), "    a");
    assert.equal(padL("42", 4), "  42");
  });

  it("returns the input unchanged when it already meets the width", () => {
    assert.equal(padL("hello", 5), "hello");
    assert.equal(padL("hello", 3), "hello");
  });

  it("ignores ANSI escape codes when measuring width", () => {
    const styled = chalk.blue("99%");
    const padded = padL(styled, 8);
    assert.equal(stringWidth(padded), 8);
    assert.ok(padded.startsWith("     "));
  });
});
