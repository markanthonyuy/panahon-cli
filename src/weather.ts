import axios from "axios";
import { WEATHER_API_URL } from "./constants.js";

export interface CurrentUnits {
  temperature_2m: string;
  apparent_temperature: string;
  wind_speed_10m: string;
  precipitation: string;
}

export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation: number;
  is_day: number;
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
  relative_humidity_2m_max: number[];
  relative_humidity_2m_min: number[];
}

export interface WeatherData {
  current: CurrentWeather;
  current_units: CurrentUnits;
  daily: DailyWeather;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
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
    timeout: 10000,
  });

  return res.data;
}
