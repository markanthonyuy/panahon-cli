/**
 * @file Open-Meteo forecast client.
 * Defines the response shape for the forecast endpoint and exposes a single
 * `getWeather(lat, lon)` helper used by the CLI.
 *
 * API reference: https://open-meteo.com/en/docs
 */

import axios from "axios";
import {
  WEATHER_API_URL,
  HISTORICAL_API_URL,
  AIR_QUALITY_API_URL,
  TIMEOUT_FORECAST_MS,
  TIMEOUT_HISTORICAL_MS,
} from "./constants.js";

/**
 * Unit labels returned alongside the `current` block (e.g. `"°C"`, `"km/h"`).
 * Used by the renderer so units stay consistent with what the API returned.
 */
export interface CurrentUnits {
  /** Unit for temperature_2m, e.g. "°C". */
  temperature_2m: string;
  /** Unit for apparent_temperature, e.g. "°C". */
  apparent_temperature: string;
  /** Unit for wind_speed_10m, e.g. "km/h". */
  wind_speed_10m: string;
  /** Unit for precipitation, e.g. "mm". */
  precipitation: string;
}

/**
 * Current-conditions snapshot from Open-Meteo.
 * All numeric fields are in the units described by {@link CurrentUnits}.
 */
export interface CurrentWeather {
  /** Air temperature at 2 m above ground. */
  temperature_2m: number;
  /** "Feels like" temperature, adjusted for wind and humidity. */
  apparent_temperature: number;
  /** Relative humidity at 2 m, as a percentage (0–100). */
  relative_humidity_2m: number;
  /** WMO weather interpretation code. See {@link https://open-meteo.com/en/docs}. */
  weather_code: number;
  /** Wind speed at 10 m above ground. */
  wind_speed_10m: number;
  /** Wind direction at 10 m, in degrees clockwise from north. */
  wind_direction_10m: number;
  /** Precipitation amount in the current hour. */
  precipitation: number;
  /** 1 during daylight, 0 at night. */
  is_day: number;
}

/**
 * 7-day forecast block. Each property is a parallel array aligned by index
 * with `time` — `time[i]` corresponds to all the `*[i]` entries.
 */
export interface DailyWeather {
  /** ISO date strings (YYYY-MM-DD), one per day. */
  time: string[];
  /** Dominant WMO weather code for each day. */
  weather_code: number[];
  /** Daily high temperature. */
  temperature_2m_max: number[];
  /** Daily low temperature. */
  temperature_2m_min: number[];
  /** Total precipitation for the day. */
  precipitation_sum: number[];
  /** Peak wind speed for the day. */
  wind_speed_10m_max: number[];
  /** Dominant wind direction (degrees clockwise from north). */
  wind_direction_10m_dominant: number[];
  /** Highest hourly humidity reading for the day, as a percentage. */
  relative_humidity_2m_max: number[];
  /** Lowest hourly humidity reading for the day, as a percentage. */
  relative_humidity_2m_min: number[];
}

/** Top-level response shape returned by the Open-Meteo forecast endpoint. */
export interface WeatherData {
  current: CurrentWeather;
  current_units: CurrentUnits;
  daily: DailyWeather;
}

/**
 * Fetch current conditions and a 7-day forecast for the given coordinates.
 *
 * @param lat - Latitude in decimal degrees (−90 to 90).
 * @param lon - Longitude in decimal degrees (−180 to 180).
 * @returns The parsed Open-Meteo response.
 * @throws {Error} If the request fails or times out (10 s).
 *
 * @example
 * ```ts
 * const data = await getWeather(14.5995, 120.9842); // Manila
 * console.log(data.current.temperature_2m);
 * ```
 */
export async function getWeather(
  lat: number,
  lon: number,
): Promise<WeatherData> {
  const res = await axios.get<WeatherData>(WEATHER_API_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "precipitation",
        "is_day",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max",
        "wind_direction_10m_dominant",
        "relative_humidity_2m_max",
        "relative_humidity_2m_min",
      ].join(","),
      timezone: "auto",
      forecast_days: 7,
    },
    timeout: TIMEOUT_FORECAST_MS,
  });

  return res.data;
}

// ─── HISTORICAL ──────────────────────────────────────────────────

/**
 * Daily summary fields returned by the historical archive API.
 * Each array contains one entry per day in the requested date range.
 */
export interface HistoricalDaily {
  /** ISO date strings (YYYY-MM-DD), one per day in the range. */
  time: string[];
  /** Dominant WMO weather code for each day. */
  weather_code: number[];
  /** Daily high temperature. */
  temperature_2m_max: number[];
  /** Daily low temperature. */
  temperature_2m_min: number[];
  /** Daily mean temperature. */
  temperature_2m_mean: number[];
  /** Total precipitation for the day. */
  precipitation_sum: number[];
  /** Peak wind speed for the day. */
  wind_speed_10m_max: number[];
  /** Dominant wind direction (degrees clockwise from north). */
  wind_direction_10m_dominant: number[];
  /** Sunrise time (ISO string) for the day. */
  sunrise: string[];
  /** Sunset time (ISO string) for the day. */
  sunset: string[];
}

/** Unit labels for fields in {@link HistoricalDaily}. */
export interface HistoricalDailyUnits {
  temperature_2m_max: string;
  temperature_2m_min: string;
  temperature_2m_mean: string;
  precipitation_sum: string;
  wind_speed_10m_max: string;
}

/** Top-level response shape returned by the Open-Meteo archive endpoint. */
export interface HistoricalData {
  daily: HistoricalDaily;
  daily_units: HistoricalDailyUnits;
}

/**
 * Fetch the historical daily summary for a single date.
 *
 * @param lat  - Latitude in decimal degrees.
 * @param lon  - Longitude in decimal degrees.
 * @param date - Target date in ISO format (YYYY-MM-DD).
 * @returns    The parsed archive response, containing a single day's data.
 * @throws {Error} If the request fails, times out (15 s), or the API rejects
 *                 the date (e.g. future date / before 1940).
 *
 * @example
 * ```ts
 * const data = await getHistoricalWeather(14.6, 121.0, "2024-12-25");
 * console.log(data.daily.temperature_2m_max[0]);
 * ```
 */
// ─── AIR QUALITY ─────────────────────────────────────────────────

/** Current pollutant levels and US AQI returned by the air quality endpoint. */
export interface AirQualityCurrent {
  us_aqi: number;
  pm2_5: number;
  pm10: number;
  ozone: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  carbon_monoxide: number;
}

/** Unit labels for each field in {@link AirQualityCurrent}. */
export interface AirQualityUnits {
  us_aqi: string;
  pm2_5: string;
  pm10: string;
  ozone: string;
  nitrogen_dioxide: string;
  sulphur_dioxide: string;
  carbon_monoxide: string;
}

/** Top-level response shape returned by the Open-Meteo air quality endpoint. */
export interface AirQualityData {
  current: AirQualityCurrent;
  current_units: AirQualityUnits;
}

/**
 * Fetch current air quality data for the given coordinates.
 *
 * @param lat - Latitude in decimal degrees.
 * @param lon - Longitude in decimal degrees.
 * @returns The parsed Open-Meteo air quality response.
 * @throws {Error} If the request fails or times out (10 s).
 */
export async function getAirQuality(
  lat: number,
  lon: number,
): Promise<AirQualityData> {
  const res = await axios.get<AirQualityData>(AIR_QUALITY_API_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      current: [
        "us_aqi",
        "pm2_5",
        "pm10",
        "ozone",
        "nitrogen_dioxide",
        "sulphur_dioxide",
        "carbon_monoxide",
      ].join(","),
      timezone: "auto",
    },
    timeout: TIMEOUT_FORECAST_MS,
  });

  return res.data;
}

export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: string,
): Promise<HistoricalData> {
  const res = await axios.get<HistoricalData>(HISTORICAL_API_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: date,
      end_date: date,
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "temperature_2m_mean",
        "precipitation_sum",
        "wind_speed_10m_max",
        "wind_direction_10m_dominant",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: "auto",
    },
    timeout: TIMEOUT_HISTORICAL_MS,
  });

  return res.data;
}
