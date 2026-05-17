#!/usr/bin/env node

/**
 * @file Panahon CLI entrypoint.
 *
 * Wires up `commander` argument parsing, resolves a location (via city name,
 * IP lookup, or raw lat/lon), calls the Open-Meteo client, and hands the
 * response to the terminal renderer.
 *
 * Commands:
 *  - `panahon <location>`             — direct forecast lookup
 *  - `panahon now [loc] -l … -L …`    — forecast with optional coordinates
 *  - `panahon auto`                   — IP-based location detection
 *  - `panahon` (no args)              — prints help
 */

import { program } from "commander";
import axios from "axios";
import chalk from "chalk";
import stringWidth from "string-width";
import { getWeather, getHistoricalWeather } from "./weather.js";
import { displayWeather, displayHistorical } from "./display.js";
import {
  GEOCODING_API_URL,
  IP_LOCATION_API_URL,
  GITHUB_REPO_URL,
} from "./constants.js";

/**
 * Build the attribution footer shown both in `--help` output and at the end
 * of every forecast run.
 *
 * @returns Plain (unstyled) multi-line footer string.
 */
function footer(): string {
  return (
    "Created by Mark Uy <macmac.uy@gmail.com>\n" +
    "A portfolio project — " +
    GITHUB_REPO_URL
  );
}

/**
 * Print the {@link footer} to stdout in grey, followed by a trailing blank
 * line. Used after a successful forecast render.
 */
function printFooter(): void {
  console.log(chalk.gray(footer()));
  console.log();
}

/**
 * Build the styled "Examples" + "Historical" + attribution block appended to
 * the help output. Colours match the rest of the help screen:
 * section titles in bold cyan, the `panahon` command name in bold green,
 * subcommands in green, flags in yellow, dates / locations in magenta,
 * descriptions in grey.
 *
 * @returns The fully styled multi-line string ready to be printed by Commander.
 */
function renderHelpFooter(): string {
  // Helpers so the example rows stay readable below.
  const cmd = chalk.bold.green("panahon");
  const sub = (s: string) => chalk.green(s);
  const flag = (s: string) => chalk.yellow(s);
  const arg = (s: string) => chalk.magenta(s);
  const desc = (s: string) => chalk.gray(s);
  const title = (s: string) => chalk.bold.cyan(s);

  const examples = [
    [`$ ${cmd} ${arg('"Las Pinas"')}`,         "Show forecast for a city"],
    [`$ ${cmd} ${sub("now")} ${arg("Tokyo")}`,  "Same as above (explicit subcommand)"],
    [`$ ${cmd} ${sub("auto")}`,                 "Detect location from your IP"],
    [`$ ${cmd} ${sub("now")} ${flag("-l")} ${arg("14.5")} ${flag("-L")} ${arg("121")}`, "Use raw latitude/longitude"],
  ];

  const historical = [
    [`$ ${cmd} ${arg("yesterday")}`,                          "Yesterday's weather for your IP location"],
    [`$ ${cmd} ${arg("2024-12-25")}`,                         "Specific date (ISO YYYY-MM-DD)"],
    [`$ ${cmd} ${arg("2024-12-25")} ${arg('"Las Pinas"')}`,   "Specific date for a city"],
    [`$ ${cmd} ${sub("history")} ${arg("yesterday")} ${arg("Tokyo")}`, "Explicit history subcommand"],
  ];

  // stringWidth ignores ANSI escape codes, so coloured rows still line up.
  const allRows = [...examples, ...historical];
  const widest = Math.max(...allRows.map(([ex]) => stringWidth(ex)));

  const formatRow = ([ex, d]: string[]): string =>
    `  ${ex}${" ".repeat(widest - stringWidth(ex) + 2)}${desc(d)}`;

  return [
    "",
    title("Examples:"),
    ...examples.map(formatRow),
    "",
    title("Historical:"),
    ...historical.map(formatRow),
    "",
    desc(`Run '${chalk.bold.green("panahon")} ${chalk.green("<command>")} ${chalk.yellow("--help")}' for command-specific help.`),
    "",
    chalk.gray(footer()),
  ].join("\n");
}

/** Resolved geographic location used to make a forecast request. */
interface GeoResult {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lon: number;
  /** Human-readable display name (e.g. "Manila, Philippines"). */
  name: string;
}

/** Subset of the ipapi.co response used by the `auto` command. */
interface IpApiResponse {
  latitude: number;
  longitude: number;
  city: string;
  country_name: string;
}

/** A single geocoding hit returned by the Open-Meteo geocoding API. */
interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  /** First-level administrative area (state / region), when available. */
  admin1?: string;
  /** Country name, when available. */
  country?: string;
}

/** Response envelope from the Open-Meteo geocoding API. */
interface GeocodingResponse {
  results?: GeocodingResult[];
}

/**
 * Parse a user-supplied date token into a canonical ISO `YYYY-MM-DD` string.
 *
 * Accepted forms:
 *  - Keywords: `yesterday`, `today` (case-insensitive)
 *  - `YYYY-MM-DD` — ISO 8601 date (the only numeric format supported)
 *
 * @param s - Raw input token.
 * @returns ISO date string, or `null` if the input is not a recognised date.
 */
function parseDate(s: string): string | null {
  const lower = s.toLowerCase();

  if (lower === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  }
  if (lower === "today") {
    return toISODate(new Date());
  }

  // YYYY-MM-DD (ISO 8601)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
}

/** Format a Date as a local `YYYY-MM-DD` string (no timezone shift). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolve a location, fetch historical archive data for the given date,
 * render it, and append the footer.
 *
 * @param dateStr  - Date in ISO `YYYY-MM-DD` (already validated/normalised).
 * @param location - City name, `"auto"`, or `undefined` (treated as `"auto"`).
 * @param opts     - Optional raw coordinate overrides.
 */
async function runHistorical(
  dateStr: string,
  location: string | undefined,
  opts: { lat?: string; lon?: string },
): Promise<void> {
  try {
    let lat: number, lon: number, locationName: string;

    if (opts.lat && opts.lon) {
      lat = parseFloat(opts.lat);
      lon = parseFloat(opts.lon);
      locationName = `${lat}, ${lon}`;
    } else {
      const geo = await geocode(location ?? "auto");
      lat = geo.lat;
      lon = geo.lon;
      locationName = geo.name;
    }

    console.log(
      `\nFetching historical weather for ${locationName} on ${dateStr}...\n`,
    );
    const data = await getHistoricalWeather(lat, lon, dateStr);
    displayHistorical(data, locationName, dateStr);
    printFooter();
  } catch (err) {
    console.error(`\n❌  Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

/**
 * Resolve a location, fetch its forecast, render it, and append the footer.
 *
 * Exits the process with code 1 on any error (network failure, unknown city,
 * etc.) after printing a human-readable message to stderr.
 *
 * @param location - City name, the literal string `"auto"`, or `undefined`
 *                   (which is treated as `"auto"`).
 * @param opts     - Raw coordinate overrides. When both `lat` and `lon` are
 *                   provided they short-circuit the geocoding step.
 */
async function runForecast(
  location: string | undefined,
  opts: { lat?: string; lon?: string },
): Promise<void> {
  try {
    let lat: number, lon: number, locationName: string;

    if (opts.lat && opts.lon) {
      lat = parseFloat(opts.lat);
      lon = parseFloat(opts.lon);
      locationName = `${lat}, ${lon}`;
    } else {
      const geo = await geocode(location ?? "auto");
      lat = geo.lat;
      lon = geo.lon;
      locationName = geo.name;
    }

    console.log(`\nFetching weather for ${locationName}...\n`);
    const data = await getWeather(lat, lon);
    displayWeather(data, locationName);
    printFooter();
  } catch (err) {
    console.error(`\n❌  Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

// ─── COMMANDER SETUP ────────────────────────────────────────────

// Colour-code the help output. Each hook receives a raw text segment and
// returns the styled version. Disabled automatically when stdout is not a TTY
// (so piping `panahon --help | less` stays clean).
program.configureHelp({
  styleTitle: (s) => chalk.bold.cyan(s),
  styleCommandText: (s) => chalk.bold.green(s),
  styleCommandDescription: (s) => chalk.white(s),
  styleDescriptionText: (s) => chalk.gray(s),
  styleOptionText: (s) => chalk.yellow(s),
  styleArgumentText: (s) => chalk.magenta(s),
  styleSubcommandText: (s) => chalk.green(s),
  styleOptionTerm: (s) => chalk.yellow(s),
  styleArgumentTerm: (s) => chalk.magenta(s),
  styleSubcommandTerm: (s) => chalk.green(s),
});

program
  .name("panahon")
  .description(
    "🌤  Terminal weather forecast — current conditions, 7-day forecast, wind & humidity.\n" +
      "Powered by Open-Meteo (no API key required).",
  )
  .version("0.1.0", "-v, --version", "Show version number")
  .helpOption("-h, --help", "Show help")
  .addHelpText("after", () => renderHelpFooter());

// `panahon now [location]` — explicit subcommand, also aliased as `current`.
// Supports `-l/--lat` and `-L/--lon` to skip geocoding entirely.
program
  .command("now [location]")
  .alias("current")
  .description("Show current conditions + 7-day forecast for a location")
  .option("-l, --lat <latitude>", "Latitude coordinate")
  .option("-L, --lon <longitude>", "Longitude coordinate")
  .action(
    (location: string | undefined, opts: { lat?: string; lon?: string }) =>
      runForecast(location, opts),
  );

// `panahon auto` — IP-based location detection via ipapi.co.
program
  .command("auto")
  .description("Detect your location via IP and show the forecast")
  .action(() => runForecast("auto", {}));

// `panahon history <date> [location]` — historical archive lookup.
// Accepts `yesterday`, `MM/DD/YYYY`, or `YYYY-MM-DD`.
program
  .command("history <date> [location]")
  .alias("on")
  .description(
    "Show historical weather for a past date (yesterday | YYYY-MM-DD)",
  )
  .option("-l, --lat <latitude>", "Latitude coordinate")
  .option("-L, --lon <longitude>", "Longitude coordinate")
  .action(
    (
      date: string,
      location: string | undefined,
      opts: { lat?: string; lon?: string },
    ) => {
      const iso = parseDate(date);
      if (!iso) {
        console.error(
          `\n❌  Error: Could not parse date "${date}". ` +
            `Use 'yesterday' or ISO format YYYY-MM-DD (e.g. 2024-12-25).\n`,
        );
        process.exit(1);
      }
      return runHistorical(iso, location, opts);
    },
  );

// Default command: `panahon [arg1] [arg2]`.
//   - No args                → show help
//   - First arg is a date    → historical lookup (arg2 = optional location)
//   - First arg is a string  → forecast lookup for that city
program
  .argument(
    "[arg1]",
    "City name, or a date (yesterday | YYYY-MM-DD)",
  )
  .argument("[arg2]", "Location, when arg1 is a date")
  .action((arg1: string | undefined, arg2: string | undefined) => {
    if (!arg1) {
      program.help();
    }
    const iso = parseDate(arg1!);
    if (iso) {
      return runHistorical(iso, arg2, {});
    }
    // Looks like a numeric date but not ISO — give a clear hint instead of
    // letting it fall through to the geocoder and produce a "not found" error.
    if (/^\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}$/.test(arg1!)) {
      console.error(
        `\n❌  Error: "${arg1}" looks like a date but is not in ISO format. ` +
          `Use YYYY-MM-DD (e.g. 2024-12-25).\n`,
      );
      process.exit(1);
    }
    return runForecast(arg1, {});
  });

program.parse();

/**
 * Resolve a free-form query to a {@link GeoResult}.
 *
 * - When `query === "auto"`, calls ipapi.co for IP-based geolocation.
 * - Otherwise calls the Open-Meteo geocoding API and uses the top result.
 *
 * @param query - A city name, or the literal string `"auto"`.
 * @returns The resolved coordinates and display name.
 * @throws {Error} If auto-detection fails, or no geocoding match is found.
 */
async function geocode(query: string): Promise<GeoResult> {
  if (query === "auto") {
    try {
      const res = await axios.get<IpApiResponse>(IP_LOCATION_API_URL, {
        timeout: 5000,
      });
      return {
        lat: res.data.latitude,
        lon: res.data.longitude,
        name: `${res.data.city}, ${res.data.country_name}`,
      };
    } catch {
      throw new Error(
        "Could not auto-detect location. Please provide a city name.",
      );
    }
  }

  const res = await axios.get<GeocodingResponse>(GEOCODING_API_URL, {
    params: { name: query, count: 1, language: "en", format: "json" },
    timeout: 8000,
  });

  if (!res.data.results?.length) {
    throw new Error(`Location "${query}" not found. Try a different spelling.`);
  }

  const r = res.data.results[0];
  return {
    lat: r.latitude,
    lon: r.longitude,
    name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  };
}
