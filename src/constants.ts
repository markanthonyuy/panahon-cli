/**
 * @file Shared constants — external API endpoints and project metadata URLs.
 * Centralised here so each upstream service appears in exactly one place.
 */

/** Open-Meteo forecast endpoint. Returns current + daily weather data. */
export const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Open-Meteo historical archive endpoint. Returns past weather for an
 * arbitrary date range (data available from 1940 onward, with a ~2-day delay).
 */
export const HISTORICAL_API_URL = "https://archive-api.open-meteo.com/v1/archive";

/** Open-Meteo geocoding endpoint. Resolves a city name to lat/lon. */
export const GEOCODING_API_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

/** IP-based geolocation endpoint used by the `auto` command. */
export const IP_LOCATION_API_URL = "https://ipapi.co/json/";

/** Open-Meteo air quality endpoint. Returns current AQI and pollutant levels. */
export const AIR_QUALITY_API_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

// ─── REQUEST TIMEOUTS ────────────────────────────────────────────

/** Axios timeout for forecast and air quality requests (ms). */
export const TIMEOUT_FORECAST_MS = 10_000;
/** Axios timeout for historical archive requests (ms). */
export const TIMEOUT_HISTORICAL_MS = 15_000;
/** Axios timeout for geocoding requests (ms). */
export const TIMEOUT_GEOCODING_MS = 8_000;
/** Axios timeout for IP-based location detection (ms). */
export const TIMEOUT_IP_LOCATION_MS = 5_000;

/** Public GitHub repository — surfaced in `--help` and the runtime footer. */
export const GITHUB_REPO_URL = "https://github.com/markanthonyuy/panahon-cli";
