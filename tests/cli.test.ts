/**
 * End-to-end tests for the `panahon` CLI binary. Spawns the built artifact
 * at `dist/index.js`, so a build is required before running these. Network
 * checks are skipped when `PANAHON_SKIP_NETWORK=1` is set.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const exec = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, "..", "dist", "index.js");

interface Result {
  stdout: string;
  stderr: string;
  code: number;
}

/** Run the CLI with the given args and capture stdout/stderr/exit code. */
async function run(...args: string[]): Promise<Result> {
  try {
    const { stdout, stderr } = await exec("node", [CLI, ...args], {
      timeout: 20000,
      // Disable animation work and any chalk colour autodetection so
      // assertions can match plain strings.
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

const skipNetwork = process.env.PANAHON_SKIP_NETWORK === "1";

describe("panahon CLI", () => {
  before(() => {
    assert.ok(
      existsSync(CLI),
      `Built binary not found at ${CLI}. Run \`npm run build\` first.`,
    );
  });

  describe("--version", () => {
    it("prints the version and exits 0", async () => {
      const { stdout, code } = await run("--version");
      assert.equal(code, 0);
      assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
    });
  });

  describe("--help", () => {
    it("prints usage, commands, examples, and historical sections", async () => {
      const { stdout, code } = await run("--help");
      assert.equal(code, 0);
      assert.match(stdout, /Usage:\s+panahon/);
      assert.match(stdout, /Commands:/);
      assert.match(stdout, /Examples:/);
      assert.match(stdout, /Historical:/);
      assert.match(stdout, /history\|on/);
      assert.match(stdout, /auto/);
      assert.match(stdout, /Created by Mark Uy/);
    });
  });

  describe("invalid date format", () => {
    it("rejects MM/DD/YYYY with a helpful ISO hint and exits 1", async () => {
      const { stderr, code } = await run("12/25/2024");
      assert.equal(code, 1);
      assert.match(stderr, /looks like a date but is not in ISO format/);
      assert.match(stderr, /YYYY-MM-DD/);
    });
  });

  describe("history subcommand with bad date", () => {
    it("rejects unparseable date and exits 1", async () => {
      const { stderr, code } = await run("history", "garbage-date");
      assert.equal(code, 1);
      assert.match(stderr, /Could not parse date/);
    });
  });

  describe("forecast for a known city", { skip: skipNetwork }, () => {
    it("renders the current-conditions report for Manila", async () => {
      const { stdout, code } = await run("Manila");
      assert.equal(code, 0);
      assert.match(stdout, /Fetching weather for Manila/);
      assert.match(stdout, /CURRENT CONDITIONS/);
      assert.match(stdout, /7-DAY FORECAST/);
      assert.match(stdout, /Created by Mark Uy/);
    });
  });

  describe("historical lookup with ISO date", { skip: skipNetwork }, () => {
    it("renders the historical summary for a past date", async () => {
      const { stdout, code } = await run("2024-12-25", "Manila");
      assert.equal(code, 0);
      assert.match(stdout, /Fetching historical weather for Manila/);
      assert.match(stdout, /HISTORICAL SUMMARY/);
      assert.match(stdout, /High \/ Low/);
      assert.match(stdout, /Sunrise \/ Sunset/);
    });
  });

  describe("unknown city", { skip: skipNetwork }, () => {
    it("prints a helpful error and exits 1", async () => {
      const { stderr, code } = await run("Atlantis-The-Lost-City-Definitely-Not-Real");
      assert.equal(code, 1);
      assert.match(stderr, /not found/i);
    });
  });

  describe("air quality flag", { skip: skipNetwork }, () => {
    it("renders the air quality report for a named city", async () => {
      const { stdout, code } = await run("Manila", "--air");
      assert.equal(code, 0);
      assert.match(stdout, /Fetching air quality for Manila/);
      assert.match(stdout, /AIR QUALITY/);
      assert.match(stdout, /AQI \(US\)/);
      assert.match(stdout, /PM2\.5/);
      assert.match(stdout, /Created by Mark Uy/);
    });

    it("renders air quality via the now subcommand with --air", async () => {
      const { stdout, code } = await run("now", "Tokyo", "--air");
      assert.equal(code, 0);
      assert.match(stdout, /AIR QUALITY/);
      assert.match(stdout, /AQI \(US\)/);
    });
  });

  describe("country forecast", { skip: skipNetwork }, () => {
    it("renders a multi-city table for a single-word country", async () => {
      const { stdout, code } = await run("Japan");
      assert.equal(code, 0);
      assert.match(stdout, /Fetching weather across Japan/);
      assert.match(stdout, /WEATHER ACROSS JAPAN/);
      assert.match(stdout, /Tokyo/);
      assert.match(stdout, /Osaka/);
      // Must NOT show single-city output
      assert.doesNotMatch(stdout, /CURRENT CONDITIONS/);
      assert.doesNotMatch(stdout, /7-DAY FORECAST/);
    });

    it("renders a multi-city table for a multi-word country", async () => {
      const { stdout, code } = await run("United Kingdom");
      assert.equal(code, 0);
      assert.match(stdout, /WEATHER ACROSS UNITED KINGDOM/);
      assert.match(stdout, /London/);
    });

    it("shows the Data: Open-Meteo.com footer", async () => {
      const { stdout, code } = await run("Germany");
      assert.equal(code, 0);
      assert.match(stdout, /Data: Open-Meteo\.com/);
    });
  });
});
