/**
 * @file Terminal rendering layer.
 * Formats a {@link WeatherData} response as a colour-coded, emoji-decorated,
 * column-aligned report using `chalk` for styling and `string-width` to keep
 * columns aligned in the presence of wide characters (emojis) and ANSI escapes.
 */

import chalk, { type ChalkInstance } from "chalk";
import stringWidth from "string-width";
import type { WeatherData, HistoricalData } from "./weather.js";

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
function hr(char = "─", width = 64): string {
  return chalk.gray(char.repeat(width));
}

/**
 * Right-pad a string to a target visual width.
 *
 * Uses {@link stringWidth} so ANSI escape sequences count as 0 columns and
 * wide CJK/emoji characters count as 2. Strings already at or beyond `len`
 * are returned unchanged (never truncated).
 *
 * @param str - Input string (may contain ANSI codes / wide chars).
 * @param len - Target visual column count.
 */
function padR(str: string, len: number): string {
  const w = stringWidth(str);
  if (w >= len) return str;
  return str + " ".repeat(len - w);
}

/**
 * Left-pad a string to a target visual width. Mirror of {@link padR};
 * useful for right-aligning numeric columns.
 *
 * @param str - Input string.
 * @param len - Target visual column count.
 */
function padL(str: string, len: number): string {
  const w = stringWidth(str);
  if (w >= len) return str;
  return " ".repeat(len - w) + str;
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
export function displayWeather(data: WeatherData, locationName: string): void {
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

  // Condition row
  console.log(
    "  " +
      emojiCell(emoji) +
      "  " +
      padR(chalk.gray("Condition"), labelW) +
      chalk.bold(desc),
  );

  // Temperature row (with "feels like" suffix)
  console.log(
    "  " +
      emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("Temperature"), labelW) +
      tempFn(`${c.temperature_2m}${unit.temperature_2m}`) +
      chalk.gray(
        `  (feels like ${c.apparent_temperature}${unit.apparent_temperature})`,
      ),
  );

  // Wind row (speed + cardinal direction)
  console.log(
    "  " +
      emojiCell("💨") +
      "  " +
      padR(chalk.gray("Wind"), labelW) +
      chalk.yellow(
        `${c.wind_speed_10m} ${unit.wind_speed_10m} ${windDir(c.wind_direction_10m)}`,
      ),
  );

  // Humidity row (bar + percentage)
  console.log(
    "  " +
      emojiCell("💧") +
      "  " +
      padR(chalk.gray("Humidity"), labelW) +
      bar(c.relative_humidity_2m, 100, 16, chalk.blue) +
      "  " +
      chalk.blue(`${c.relative_humidity_2m}%`),
  );

  // Precipitation row
  console.log(
    "  " +
      emojiCell("🌧️") +
      "  " +
      padR(chalk.gray("Precipitation"), labelW) +
      chalk.cyan(`${c.precipitation} ${unit.precipitation}`),
  );

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
  console.log(
    chalk.gray("  Data: Open-Meteo.com (open-source, no API key required)"),
  );
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
): void {
  const d = data.daily;
  const u = data.daily_units;

  if (!d.time?.length) {
    console.log(chalk.yellow(`\n  No historical data available for ${dateStr}.\n`));
    return;
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

  console.log(
    "  " +
      emojiCell(emoji) +
      "  " +
      padR(chalk.gray("Condition"), labelW) +
      chalk.bold(desc),
  );

  console.log(
    "  " +
      emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("High / Low"), labelW) +
      hiFn(`${hi}${u.temperature_2m_max}`) +
      chalk.gray("  /  ") +
      loFn(`${lo}${u.temperature_2m_min}`),
  );

  console.log(
    "  " +
      emojiCell("🌡️") +
      "  " +
      padR(chalk.gray("Mean"), labelW) +
      meanFn(`${mean}${u.temperature_2m_mean}`),
  );

  console.log(
    "  " +
      emojiCell("💨") +
      "  " +
      padR(chalk.gray("Wind (peak)"), labelW) +
      chalk.yellow(
        `${windSpd} ${u.wind_speed_10m_max} ${windDir(windDeg)}`,
      ),
  );

  console.log(
    "  " +
      emojiCell("🌧️") +
      "  " +
      padR(chalk.gray("Precipitation"), labelW) +
      chalk.cyan(`${rain} ${u.precipitation_sum}`),
  );

  // Sunrise / sunset (formatted as HH:MM in the location's local time).
  const fmtTime = (iso: string): string => {
    const t = new Date(iso);
    return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  };

  console.log(
    "  " +
      emojiCell("🌅") +
      "  " +
      padR(chalk.gray("Sunrise / Sunset"), labelW) +
      chalk.yellow(fmtTime(sunrise)) +
      chalk.gray("  /  ") +
      chalk.magenta(fmtTime(sunset)),
  );

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
}
