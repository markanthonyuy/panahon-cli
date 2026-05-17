/**
 * @file Shared constants — external API endpoints and project metadata URLs.
 * Centralised here so each upstream service appears in exactly one place.
 */

/** Open-Meteo forecast endpoint. Returns current + daily weather data. */
export const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

/** Open-Meteo geocoding endpoint. Resolves a city name to lat/lon. */
export const GEOCODING_API_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

/** IP-based geolocation endpoint used by the `auto` command. */
export const IP_LOCATION_API_URL = "https://ipapi.co/json/";

/** Public GitHub repository — surfaced in `--help` and the runtime footer. */
export const GITHUB_REPO_URL = "https://github.com/markanthonyuy/panahon-cli";
