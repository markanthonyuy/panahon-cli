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
import { getWeather } from "./weather.js";
import { displayWeather } from "./display.js";
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
program
  .name("panahon")
  .description(
    "🌤  Terminal weather forecast — current conditions, 7-day forecast, wind & humidity.\n" +
      "Powered by Open-Meteo (no API key required).",
  )
  .version("0.1.0", "-v, --version", "Show version number")
  .helpOption("-h, --help", "Show help")
  .addHelpText(
    "after",
    `
Examples:
  $ panahon "Las Pinas"         Show forecast for a city
  $ panahon now Tokyo           Same as above (explicit subcommand)
  $ panahon auto                Detect location from your IP
  $ panahon now -l 14.5 -L 121  Use raw latitude/longitude

Run 'panahon <command> --help' for command-specific help.

${footer()}`,
  );

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

// Default command: `panahon <location>` or `panahon` (no args, shows help).
program
  .argument("[location]", "City name to look up (omit to see help)")
  .action((location: string | undefined) => {
    if (!location) {
      program.help();
    }
    return runForecast(location, {});
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
