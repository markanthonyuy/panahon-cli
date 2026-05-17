/**
 * Integration tests that hit the live Open-Meteo and ipapi.co endpoints to
 * verify they're reachable and the response shape still matches what the
 * CLI expects. Skipped automatically when `PANAHON_SKIP_NETWORK=1` is set
 * (useful for offline / air-gapped CI).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  WEATHER_API_URL,
  HISTORICAL_API_URL,
  IP_LOCATION_API_URL,
} from "../src/constants.ts";

const skip = process.env.PANAHON_SKIP_NETWORK === "1";

describe("Open-Meteo forecast API", { skip }, () => {
  it("returns 200 with current+daily blocks for a valid location", async () => {
    const res = await axios.get(WEATHER_API_URL, {
      params: {
        latitude: 14.5995,
        longitude: 120.9842,
        current: "temperature_2m,weather_code",
        daily: "temperature_2m_max,temperature_2m_min",
        timezone: "auto",
        forecast_days: 1,
      },
      timeout: 10000,
    });

    assert.equal(res.status, 200);
    assert.ok(res.data.current, "response is missing `current` block");
    assert.ok(res.data.daily, "response is missing `daily` block");
    assert.equal(typeof res.data.current.temperature_2m, "number");
    assert.equal(typeof res.data.current.weather_code, "number");
    assert.ok(Array.isArray(res.data.daily.time));
  });
});

describe("Open-Meteo archive API", { skip }, () => {
  it("returns 200 with daily block for a past date", async () => {
    const res = await axios.get(HISTORICAL_API_URL, {
      params: {
        latitude: 14.5995,
        longitude: 120.9842,
        start_date: "2024-01-15",
        end_date: "2024-01-15",
        daily: "temperature_2m_max,temperature_2m_min,weather_code",
        timezone: "auto",
      },
      timeout: 15000,
    });

    assert.equal(res.status, 200);
    assert.ok(res.data.daily, "response is missing `daily` block");
    assert.ok(Array.isArray(res.data.daily.time));
    assert.equal(res.data.daily.time.length, 1);
    assert.equal(typeof res.data.daily.temperature_2m_max[0], "number");
  });
});

describe("ipapi.co IP-location API", { skip }, () => {
  it("returns 200 with latitude / longitude / city", async () => {
    const res = await axios.get(IP_LOCATION_API_URL, { timeout: 5000 });
    assert.equal(res.status, 200);
    assert.equal(typeof res.data.latitude, "number");
    assert.equal(typeof res.data.longitude, "number");
    assert.equal(typeof res.data.city, "string");
  });
});
