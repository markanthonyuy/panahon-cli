/**
 * @file Terminal rendering layer.
 * Formats a {@link WeatherData} response as a colour-coded, emoji-decorated,
 * column-aligned report using `chalk` for styling and `string-width` to keep
 * columns aligned in the presence of wide characters (emojis) and ANSI escapes.
 */

import chalk, { type ChalkInstance } from "chalk";
import stringWidth from "string-width";
import type { WeatherData, HistoricalData, AirQualityData } from "./weather.js";
import { padR, padL } from "./utils.js";
import { weatherArt, ART_WIDTH, ART_HEIGHT } from "./ascii.js";

// ─── LAYOUT CONSTANTS ────────────────────────────────────────────
const HR_WIDTH = 82;
const BAR_WIDTH = 16;

// ─── AQI CONSTANTS ───────────────────────────────────────────────
/** US EPA AQI upper bounds for each category (exclusive of the next). */
const AQI_GOOD = 50;
const AQI_MODERATE = 100;
const AQI_SENSITIVE = 150;
const AQI_UNHEALTHY = 200;
const AQI_VERY_UNHEALTHY = 300;

/** US EPA "Unhealthy" thresholds used as bar maxes for PM2.5 and PM10. */
const PM25_BAR_MAX = 75;
const PM10_BAR_MAX = 150;

/**
 * Lookup table mapping WMO weather interpretation codes to a
 * `[emoji, humanLabel]` tuple.
 *
 * See: https://open-meteo.com/en/docs (WMO Weather interpretation codes table)
 */
const WMO_CODES: Record<number, [string, string]> = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Foggy"],
  48: ["🌫️", "Icy fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Moderate drizzle"],
  55: ["🌧️", "Dense drizzle"],
  61: ["🌧️", "Slight rain"],
  63: ["🌧️", "Moderate rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Slight snow"],
  73: ["🌨️", "Moderate snow"],
  75: ["❄️", "Heavy snow"],
  77: ["🌨️", "Snow grains"],
  80: ["🌦️", "Slight showers"],
  81: ["🌧️", "Moderate showers"],
  82: ["⛈️", "Violent showers"],
  85: ["🌨️", "Snow showers"],
  86: ["🌨️", "Heavy snow showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm w/ hail"],
  99: ["⛈️", "Thunderstorm w/ heavy hail"],
};

/**
 * Resolve a WMO code to its `[emoji, label]` pair, falling back to a generic
 * "Unknown" entry for codes that aren't in {@link WMO_CODES}.
 *
 * @param code - WMO weather interpretation code from the API.
 * @returns `[emoji, label]` tuple ready for rendering.
 */
function wmo(code: number): [string, string] {
  return WMO_CODES[code] ?? ["🌡️", "Unknown"];
}

/**
 * Convert a compass bearing in degrees to one of 8 cardinal/intercardinal
 * directions (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`).
 *
 * @param deg - Bearing in degrees clockwise from north (0–360).
 * @returns Two-letter compass abbreviation.
 */
function windDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Pick a chalk colour for a temperature value, scaling from cold (blue) to
 * hot (red). Thresholds are tuned for °C.
 *
 * @param t - Temperature in °C.
 * @returns A `ChalkInstance` to wrap the rendered temperature with.
 */
function tempColor(t: number): ChalkInstance {
  if (t >= 35) return chalk.red.bold;
  if (t >= 28) return chalk.yellow;
  if (t >= 18) return chalk.green;
  if (t >= 8) return chalk.cyan;
  return chalk.blue.bold;
}

/**
 * Render a horizontal progress bar using filled (█) and empty (░) blocks.
 *
 * @param value - Current value.
 * @param max   - Value that fills the bar.
 * @param width - Bar width in characters (default 20).
 * @param color - Chalk style applied to the filled portion (default blue).
 * @returns The styled bar string.
 */
function bar(
  value: number,
  max: number,
  width = 20,
  color: ChalkInstance = chalk.blue,
): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return (
    color("█".repeat(Math.max(0, filled))) +
    chalk.gray("░".repeat(Math.max(0, empty)))
  );
}

/**
 * Build a grey horizontal rule of repeated characters.
 *
 * @param char  - Character to repeat (default `─`).
 * @param width - Total visual width (default 64).
 */
function hr(char = "─", width = HR_WIDTH): string {
  return chalk.gray(char.repeat(width));
}

/**
 * Render an emoji inside a fixed 2-column cell so that subsequent text lines
 * up consistently across terminals. Without this, emojis like `⛅` (no
 * variation selector) and `🌡️` (with VS16) can render at different widths
 * depending on the terminal's emoji font.
 *
 * @param e - The emoji glyph to render.
 */
function emojiCell(e: string): string {
  return padR(e, 2);
}


/**
 * Print a full weather report (header, current conditions, 7-day forecast,
 * footer) to stdout for the given Open-Meteo response.
 *
 * Side-effect only: writes to `console.log`. The layout is tuned for an
 * 80-column monospace terminal with emoji support.
 *
 * @param data         - Parsed forecast response from {@link getWeather}.
 * @param locationName - Display name for the location (used in the header).
 *
 * @example
 * ```ts
 * const data = await getWeather(14.6, 121.0);
 * displayWeather(data, "Manila, Philippines");
 * ```
 */
export function displayWeather(
  data: WeatherData,
  locationName: string,
): { linesBelowArtTop: number } {
  const c = data.current;
  const d = data.daily;
  const unit = data.current_units;

  const [emoji, desc] = wmo(c.weather_code);

  // ── HEADER ────────────────────────────────────────────────
  console.log(hr("═"));
  console.log(
    "  " +
      emojiCell("🌍") +
      "  " +
      chalk.bold.white(locationName) +
      chalk.gray(`   •   ${new Date().toLocaleString()}`),
  );
  console.log(hr("═"));

  // ── CURRENT CONDITIONS ────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("CURRENT CONDITIONS"));
  console.log();

  /** Width of the metric label column ("Condition", "Temperature", ...). */
  const labelW = 16;
  const tempFn = tempColor(c.temperature_2m);

  // Build the 5 metric rows once, then render them side-by-side with the
  // ASCII art so we keep the art's row count exactly aligned to the metrics.
  const metrics: string[] = [
    emojiCell(emoji) +
      "  " +
      padR(chalk.gray("Condition"), labelW) +
      chalk.bold(desc),

    emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("Temperature"), labelW) +
      tempFn(`${c.temperature_2m}${unit.temperature_2m}`) +
      chalk.gray(
        `  (feels like ${c.apparent_temperature}${unit.apparent_temperature})`,
      ),

    emojiCell("💨") +
      "  " +
      padR(chalk.gray("Wind"), labelW) +
      chalk.yellow(
        `${c.wind_speed_10m} ${unit.wind_speed_10m} ${windDir(c.wind_direction_10m)}`,
      ),

    emojiCell("💧") +
      "  " +
      padR(chalk.gray("Humidity"), labelW) +
      bar(c.relative_humidity_2m, 100, BAR_WIDTH, chalk.blue) +
      "  " +
      chalk.blue(`${c.relative_humidity_2m}%`),

    emojiCell("🌧️") +
      "  " +
      padR(chalk.gray("Precipitation"), labelW) +
      chalk.cyan(`${c.precipitation} ${unit.precipitation}`),
  ];

  // Print art + metrics side by side. Art is fixed-height (ART_HEIGHT) and
  // metrics also has 5 rows, so the zip is 1:1.
  const art = weatherArt(c.weather_code);
  for (let i = 0; i < ART_HEIGHT; i++) {
    console.log("  " + art[i] + "  " + (metrics[i] ?? ""));
  }

  console.log();
  console.log(hr());

  // ── 7-DAY FORECAST ────────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("7-DAY FORECAST"));
  console.log();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /** Fixed visual column widths for the forecast table. */
  const W = {
    day: 6,
    icon: 3, // 2-wide emoji + 1 trailing space
    cond: 22,
    hi: 7,
    lo: 7,
    hum: 7,
    wind: 14,
    rain: 8,
  };

  // Header row
  console.log(
    "  " +
      chalk.gray(
        padR("Day", W.day) +
          padR("", W.icon) +
          padR("Condition", W.cond) +
          padL("High", W.hi) +
          "  " +
          padL("Low", W.lo) +
          "  " +
          padL("Hum", W.hum) +
          "  " +
          padR("Wind", W.wind) +
          padL("Rain", W.rain),
      ),
  );
  console.log(hr());

  // One row per forecast day. Index 0 is today, so we label it "Today".
  for (let i = 0; i < d.time.length; i++) {
    const date = new Date(d.time[i] + "T12:00:00");
    const dayLabel = i === 0 ? "Today" : days[date.getDay()];
    const dayCell =
      i === 0
        ? chalk.bold.white(padR(dayLabel, W.day))
        : chalk.white(padR(dayLabel, W.day));

    const [ico, label] = wmo(d.weather_code[i]);

    const hi = d.temperature_2m_max[i];
    const lo = d.temperature_2m_min[i];
    const hiFn = tempColor(hi);
    const loFn = tempColor(lo);

    // Humidity is summarised as the midpoint of the day's max/min readings.
    const humAvg = Math.round(
      (d.relative_humidity_2m_max[i] + d.relative_humidity_2m_min[i]) / 2,
    );
    const wind = `${d.wind_speed_10m_max[i]} km/h ${windDir(d.wind_direction_10m_dominant[i])}`;
    const rain =
      d.precipitation_sum[i] > 0
        ? chalk.cyan(`${d.precipitation_sum[i]} mm`)
        : chalk.gray("—");

    console.log(
      "  " +
        dayCell +
        emojiCell(ico) +
        " " +
        chalk.white(padR(label, W.cond)) +
        hiFn(padL(`${hi}°`, W.hi)) +
        "  " +
        loFn(padL(`${lo}°`, W.lo)) +
        "  " +
        chalk.blue(padL(`${humAvg}%`, W.hum)) +
        "  " +
        chalk.yellow(padR(wind, W.wind)) +
        padL(rain, W.rain),
    );
  }

  // ── DATA SOURCE FOOTER ────────────────────────────────────
  console.log();
  console.log(hr("═"));
  console.log(chalk.gray("  Data: Open-Meteo.com"));
  console.log(hr("═"));
  console.log();

  // Lines from the cursor (now at the line below the trailing blank) up to
  // the top art row. Used by the CLI to position the animation correctly.
  //   ART_HEIGHT             : art rows
  //   + 1 blank, 1 hr, 1 blank, 1 "7-DAY FORECAST", 1 blank, 1 header, 1 hr
  //   + d.time.length        : forecast rows
  //   + 1 blank, 1 hr══, 1 "Data:", 1 hr══, 1 blank
  const linesBelowArtTop =
    ART_HEIGHT + 7 + d.time.length + 5;
  return { linesBelowArtTop };
}

/**
 * Render a compact multi-city weather table for a country query.
 *
 * @param entries     - City name + weather data pairs, in order.
 * @param countryName - The country name used as the page header.
 */
export function displayCountryWeather(
  entries: Array<{ city: string; data: WeatherData }>,
  countryName: string,
  flag = "",
): void {
  const headerEmoji = flag || "🌍";
  console.log(hr("═"));
  console.log(
    "  " +
      emojiCell(headerEmoji) +
      "  " +
      chalk.bold.white(countryName) +
      chalk.gray(`   •   ${new Date().toLocaleString()}`),
  );
  console.log(hr("═"));
  console.log();
  console.log("  " + chalk.bold.cyan(`WEATHER ACROSS ${countryName.toUpperCase()}`));
  console.log();

  const W = { city: 20, icon: 3, cond: 20, temp: 7, feels: 7, hum: 6, wind: 14 };

  const truncate = (s: string, max: number): string =>
    stringWidth(s) <= max ? s : s.slice(0, max - 1) + "…";

  console.log(
    "  " +
      chalk.gray(
        padR("City", W.city) +
          padR("", W.icon) +
          padR("Condition", W.cond) +
          padL("Temp", W.temp) +
          "  " +
          padL("Feels", W.feels) +
          "  " +
          padL("Hum", W.hum) +
          "  " +
          padR("Wind", W.wind),
      ),
  );
  console.log(hr());

  for (const { city, data } of entries) {
    const c = data.current;
    const unit = data.current_units;
    const [ico, label] = wmo(c.weather_code);
    const tempFn = tempColor(c.temperature_2m);

    console.log(
      "  " +
        chalk.white(padR(truncate(city, W.city), W.city)) +
        emojiCell(ico) +
        " " +
        chalk.white(padR(label, W.cond)) +
        tempFn(padL(`${c.temperature_2m}${unit.temperature_2m}`, W.temp)) +
        "  " +
        chalk.gray(padL(`${c.apparent_temperature}${unit.apparent_temperature}`, W.feels)) +
        "  " +
        chalk.blue(padL(`${c.relative_humidity_2m}%`, W.hum)) +
        "  " +
        chalk.yellow(`${c.wind_speed_10m} ${unit.wind_speed_10m} ${windDir(c.wind_direction_10m)}`),
    );
  }

  console.log();
  console.log(hr("═"));
  console.log(chalk.gray("  Data: Open-Meteo.com"));
  console.log(hr("═"));
  console.log();
}

/**
 * Render a single-day historical archive report.
 *
 * Layout mirrors {@link displayWeather} but omits the live "current conditions"
 * block (there is no live snapshot for a past date) and the 7-day outlook —
 * instead it shows the day's high, low, mean, precipitation, wind, and
 * sunrise/sunset times.
 *
 * @param data         - Parsed archive response from `getHistoricalWeather`.
 * @param locationName - Display name for the location.
 * @param dateStr      - The date being reported, in ISO `YYYY-MM-DD` format.
 */
export function displayHistorical(
  data: HistoricalData,
  locationName: string,
  dateStr: string,
): { linesBelowArtTop: number } | null {
  const d = data.daily;
  const u = data.daily_units;

  if (!d.time?.length) {
    console.log(
      chalk.yellow(`\n  No historical data available for ${dateStr}.\n`),
    );
    return null;
  }

  const [emoji, desc] = wmo(d.weather_code[0]);
  const hi = d.temperature_2m_max[0];
  const lo = d.temperature_2m_min[0];
  const mean = d.temperature_2m_mean[0];
  const rain = d.precipitation_sum[0];
  const windSpd = d.wind_speed_10m_max[0];
  const windDeg = d.wind_direction_10m_dominant[0];
  const sunrise = d.sunrise[0];
  const sunset = d.sunset[0];

  // Pretty-print the target date (e.g. "Wed, Dec 25 2024").
  const niceDate = new Date(dateStr + "T12:00:00").toLocaleDateString(
    undefined,
    { weekday: "short", year: "numeric", month: "short", day: "numeric" },
  );

  // ── HEADER ────────────────────────────────────────────────
  console.log(hr("═"));
  console.log(
    "  " +
      emojiCell("🕰️") +
      "  " +
      chalk.bold.white(locationName) +
      chalk.gray(`   •   ${niceDate}`),
  );
  console.log(hr("═"));

  // ── DAILY SUMMARY ─────────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("HISTORICAL SUMMARY"));
  console.log();

  const labelW = 18;
  const hiFn = tempColor(hi);
  const loFn = tempColor(lo);
  const meanFn = tempColor(mean);

  // Sunrise / sunset (formatted as HH:MM in the location's local time).
  const fmtTime = (iso: string): string => {
    const t = new Date(iso);
    return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  };

  // 6 metric rows. Rendered side-by-side with the ART_HEIGHT (5) art rows,
  // with the overflow metric printed under a blank art column.
  const metrics: string[] = [
    emojiCell(emoji) +
      "  " +
      padR(chalk.gray("Condition"), labelW) +
      chalk.bold(desc),

    emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("High / Low"), labelW) +
      hiFn(`${hi}${u.temperature_2m_max}`) +
      chalk.gray("  /  ") +
      loFn(`${lo}${u.temperature_2m_min}`),

    emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("Mean"), labelW) +
      meanFn(`${mean}${u.temperature_2m_mean}`),

    emojiCell("💨") +
      "  " +
      padR(chalk.gray("Wind (peak)"), labelW) +
      chalk.yellow(`${windSpd} ${u.wind_speed_10m_max} ${windDir(windDeg)}`),

    emojiCell("🌧️") +
      "  " +
      padR(chalk.gray("Precipitation"), labelW) +
      chalk.cyan(`${rain} ${u.precipitation_sum}`),

    emojiCell("🌅") +
      "  " +
      padR(chalk.gray("Sunrise / Sunset"), labelW) +
      chalk.yellow(fmtTime(sunrise)) +
      chalk.gray("  /  ") +
      chalk.magenta(fmtTime(sunset)),
  ];

  const art = weatherArt(d.weather_code[0]);
  const blank = " ".repeat(ART_WIDTH);
  for (let i = 0; i < Math.max(ART_HEIGHT, metrics.length); i++) {
    const left = i < ART_HEIGHT ? art[i] : blank;
    const right = metrics[i] ?? "";
    console.log("  " + left + "  " + right);
  }

  // ── DATA SOURCE FOOTER ────────────────────────────────────
  console.log();
  console.log(hr("═"));
  console.log(
    chalk.gray(
      "  Data: Open-Meteo Archive (historical reanalysis, no API key required)",
    ),
  );
  console.log(hr("═"));
  console.log();

  // Distance from cursor (now) up to the top art row.
  //   max(ART_HEIGHT, metrics.length) : lines of art-or-metric rows
  //   + 1 blank, 1 hr══, 1 "Data:", 1 hr══, 1 blank
  const rowsPrinted = Math.max(ART_HEIGHT, metrics.length);
  const linesBelowArtTop = rowsPrinted + 5;
  return { linesBelowArtTop };
}

// ─── AQI HELPERS ─────────────────────────────────────────────────

/** US AQI category metadata: label, chalk colour fn, and health tip. */
interface AqiCategory {
  label: string;
  color: ChalkInstance;
  tip: string;
}

/**
 * Resolve a US AQI value to its category label, display colour, and health tip.
 * Breakpoints follow the official US EPA scale.
 */
export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= AQI_GOOD)
    return { label: "Good", color: chalk.green, tip: "No health precautions needed." };
  if (aqi <= AQI_MODERATE)
    return { label: "Moderate", color: chalk.yellow, tip: "Unusually sensitive people should consider limiting prolonged outdoor exertion." };
  if (aqi <= AQI_SENSITIVE)
    return { label: "Unhealthy for Sensitive Groups", color: chalk.rgb(255, 126, 0), tip: "Sensitive groups should reduce prolonged outdoor exertion." };
  if (aqi <= AQI_UNHEALTHY)
    return { label: "Unhealthy", color: chalk.red, tip: "Everyone should reduce prolonged outdoor exertion." };
  if (aqi <= AQI_VERY_UNHEALTHY)
    return { label: "Very Unhealthy", color: chalk.magenta, tip: "Everyone should avoid prolonged outdoor exertion." };
  return { label: "Hazardous", color: chalk.red.bold, tip: "Everyone should avoid all outdoor exertion." };
}

/**
 * Render an air quality report to stdout for the given Open-Meteo air quality
 * response. Layout mirrors {@link displayHistorical}: header, metric block
 * side-by-side with ASCII art, health tip, footer.
 *
 * @param data         - Parsed air quality response from {@link getAirQuality}.
 * @param locationName - Display name for the location (used in the header).
 * @returns `{ linesBelowArtTop }` for use with {@link animateArt}.
 */
export function displayAirQuality(
  data: AirQualityData,
  locationName: string,
): { linesBelowArtTop: number } {
  const c = data.current;
  const u = data.current_units;
  const cat = aqiCategory(c.us_aqi);

  // ── HEADER ────────────────────────────────────────────────
  console.log(hr("═"));
  console.log(
    "  " +
      emojiCell("🌍") +
      "  " +
      chalk.bold.white(locationName) +
      chalk.gray(`   •   ${new Date().toLocaleString()}`),
  );
  console.log(hr("═"));

  // ── AIR QUALITY BLOCK ────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("AIR QUALITY"));
  console.log();

  const labelW = 22;

  // PM2.5 bar: US "Unhealthy" threshold = 75 μg/m³
  // PM10 bar:  US "Unhealthy" threshold = 150 μg/m³
  const pm25Bar = bar(c.pm2_5, PM25_BAR_MAX, BAR_WIDTH, chalk.magenta);
  const pm10Bar = bar(c.pm10, PM10_BAR_MAX, BAR_WIDTH, chalk.blue);

  const metrics: string[] = [
    emojiCell("🌬️") +
      "  " +
      padR(chalk.gray("AQI (US)"), labelW) +
      cat.color.bold(`${c.us_aqi}`) +
      "  " +
      cat.color(cat.label),

    emojiCell("🔬") +
      "  " +
      padR(chalk.gray("PM2.5"), labelW) +
      chalk.magenta(`${c.pm2_5} ${u.pm2_5}`) +
      "  " +
      pm25Bar,

    emojiCell("🔬") +
      "  " +
      padR(chalk.gray("PM10"), labelW) +
      chalk.blue(`${c.pm10} ${u.pm10}`) +
      "  " +
      pm10Bar,

    emojiCell("🌿") +
      "  " +
      padR(chalk.gray("O3 (Ozone)"), labelW) +
      chalk.green(`${c.ozone} ${u.ozone}`),

    emojiCell("🏭") +
      "  " +
      padR(chalk.gray("NO2"), labelW) +
      chalk.yellow(`${c.nitrogen_dioxide} ${u.nitrogen_dioxide}`),

    emojiCell("⚗️") +
      "  " +
      padR(chalk.gray("SO2"), labelW) +
      chalk.cyan(`${c.sulphur_dioxide} ${u.sulphur_dioxide}`),

    emojiCell("🚗") +
      "  " +
      padR(chalk.gray("CO"), labelW) +
      chalk.gray(`${c.carbon_monoxide} ${u.carbon_monoxide}`),
  ];

  // Render art + metrics side-by-side. Art has ART_HEIGHT (5) rows; metrics
  // has 7 rows. Rows beyond ART_HEIGHT use a blank art column.
  const art = weatherArt(0); // clear-sky art as a neutral backdrop
  const blank = " ".repeat(ART_WIDTH);
  for (let i = 0; i < metrics.length; i++) {
    const left = i < ART_HEIGHT ? art[i] : blank;
    console.log("  " + left + "  " + metrics[i]);
  }

  // ── HEALTH TIP ────────────────────────────────────────────
  console.log();
  console.log("  " + cat.color(`💡  ${cat.tip}`));

  // ── FOOTER ────────────────────────────────────────────────
  console.log();
  console.log(hr("═"));
  console.log(
    chalk.gray("  Data: Open-Meteo Air Quality (no API key required)"),
  );
  console.log(hr("═"));
  console.log();

  //   metrics.length             : art-or-metric rows
  //   + 1 blank, 1 tip, 1 blank, 1 hr══, 1 "Data:", 1 hr══, 1 blank
  const linesBelowArtTop = metrics.length + 7;
  return { linesBelowArtTop };
}
