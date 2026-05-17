#!/usr/bin/env node

import { program } from "commander";
import axios from "axios";
import { getWeather } from "./weather.js";
import { displayWeather } from "./display.js";
import { GEOCODING_API_URL, IP_LOCATION_API_URL } from "./constants.js";

interface GeoResult {
  lat: number;
  lon: number;
  name: string;
}

interface IpApiResponse {
  latitude: number;
  longitude: number;
  city: string;
  country_name: string;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

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
  } catch (err) {
    console.error(`\n❌  Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

program
  .name("panahon")
  .description(
    "🌤  Terminal weather forecast — current conditions, 7-day forecast, wind & humidity.\n" +
      "Powered by Open-Meteo (no API key required)."
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

Created by Mark Uy <macmac.uy@gmail.com>
A portfolio project — https://github.com/markuy/panahon`
  );

program
  .command("now [location]")
  .alias("current")
  .description("Show current conditions + 7-day forecast for a location")
  .option("-l, --lat <latitude>", "Latitude coordinate")
  .option("-L, --lon <longitude>", "Longitude coordinate")
  .action((location: string | undefined, opts: { lat?: string; lon?: string }) =>
    runForecast(location, opts),
  );

program
  .command("auto")
  .description("Detect your location via IP and show the forecast")
  .action(() => runForecast("auto", {}));

program
  .argument("[location]", "City name to look up (omit to see help)")
  .action((location: string | undefined) => {
    if (!location) {
      program.help();
    }
    return runForecast(location, {});
  });

program.parse();

async function geocode(query: string): Promise<GeoResult> {
  if (query === "auto") {
    try {
      const res = await axios.get<IpApiResponse>(IP_LOCATION_API_URL, { timeout: 5000 });
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

  const res = await axios.get<GeocodingResponse>(
    GEOCODING_API_URL,
    {
      params: { name: query, count: 1, language: "en", format: "json" },
      timeout: 8000,
    },
  );

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
