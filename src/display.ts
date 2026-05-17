import chalk, { type ChalkInstance } from "chalk";
import stringWidth from "string-width";
import type { WeatherData } from "./weather.js";

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

function wmo(code: number): [string, string] {
  return WMO_CODES[code] ?? ["🌡️", "Unknown"];
}

function windDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function tempColor(t: number): ChalkInstance {
  if (t >= 35) return chalk.red.bold;
  if (t >= 28) return chalk.yellow;
  if (t >= 18) return chalk.green;
  if (t >= 8) return chalk.cyan;
  return chalk.blue.bold;
}

function bar(value: number, max: number, width = 20, color: ChalkInstance = chalk.blue): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return color("█".repeat(Math.max(0, filled))) + chalk.gray("░".repeat(Math.max(0, empty)));
}

function hr(char = "─", width = 64): string {
  return chalk.gray(char.repeat(width));
}

// Pad/truncate to a visual width (counts ANSI escapes as 0, wide chars as 2).
function padR(str: string, len: number): string {
  const w = stringWidth(str);
  if (w >= len) return str;
  return str + " ".repeat(len - w);
}

function padL(str: string, len: number): string {
  const w = stringWidth(str);
  if (w >= len) return str;
  return " ".repeat(len - w) + str;
}

// Render an emoji in a fixed 2-column cell so columns line up across terminals.
function emojiCell(e: string): string {
  return padR(e, 2);
}

export function displayWeather(data: WeatherData, locationName: string): void {
  const c = data.current;
  const d = data.daily;
  const unit = data.current_units;

  const [emoji, desc] = wmo(c.weather_code);

  // ── HEADER ────────────────────────────────────────────────
  console.log(hr("═"));
  console.log(
    "  " +
      emojiCell("🌍") + "  " +
      chalk.bold.white(locationName) +
      chalk.gray(`   •   ${new Date().toLocaleString()}`)
  );
  console.log(hr("═"));

  // ── CURRENT CONDITIONS ────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("CURRENT CONDITIONS"));
  console.log();

  const labelW = 16;
  const tempFn = tempColor(c.temperature_2m);

  // Condition
  console.log(
    "  " + emojiCell(emoji) + "  " +
      padR(chalk.gray("Condition"), labelW) +
      chalk.bold(desc)
  );

  // Temperature
  console.log(
    "  " + emojiCell("🌡️") + "  " +
      padR(chalk.gray("Temperature"), labelW) +
      tempFn(`${c.temperature_2m}${unit.temperature_2m}`) +
      chalk.gray(`  (feels like ${c.apparent_temperature}${unit.apparent_temperature})`)
  );

  // Wind
  console.log(
    "  " + emojiCell("💨") + "  " +
      padR(chalk.gray("Wind"), labelW) +
      chalk.yellow(`${c.wind_speed_10m} ${unit.wind_speed_10m} ${windDir(c.wind_direction_10m)}`)
  );

  // Humidity
  console.log(
    "  " + emojiCell("💧") + "  " +
      padR(chalk.gray("Humidity"), labelW) +
      bar(c.relative_humidity_2m, 100, 16, chalk.blue) + "  " +
      chalk.blue(`${c.relative_humidity_2m}%`)
  );

  // Precipitation
  console.log(
    "  " + emojiCell("🌧️") + "  " +
      padR(chalk.gray("Precipitation"), labelW) +
      chalk.cyan(`${c.precipitation} ${unit.precipitation}`)
  );

  console.log();
  console.log(hr());

  // ── 7-DAY FORECAST ────────────────────────────────────────
  console.log();
  console.log("  " + chalk.bold.cyan("7-DAY FORECAST"));
  console.log();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Column widths (visual columns)
  const W = {
    day: 6,
    icon: 3,       // 2-wide emoji + 1 space
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
          padL("High", W.hi) + "  " +
          padL("Low", W.lo) + "  " +
          padL("Hum", W.hum) + "  " +
          padR("Wind", W.wind) +
          padL("Rain", W.rain)
      )
  );
  console.log(hr());

  for (let i = 0; i < d.time.length; i++) {
    const date = new Date(d.time[i] + "T12:00:00");
    const dayLabel = i === 0 ? "Today" : days[date.getDay()];
    const dayCell = i === 0 ? chalk.bold.white(padR(dayLabel, W.day)) : chalk.white(padR(dayLabel, W.day));

    const [ico, label] = wmo(d.weather_code[i]);

    const hi = d.temperature_2m_max[i];
    const lo = d.temperature_2m_min[i];
    const hiFn = tempColor(hi);
    const loFn = tempColor(lo);

    const humAvg = Math.round(
      (d.relative_humidity_2m_max[i] + d.relative_humidity_2m_min[i]) / 2
    );
    const wind = `${d.wind_speed_10m_max[i]} km/h ${windDir(d.wind_direction_10m_dominant[i])}`;
    const rain = d.precipitation_sum[i] > 0
      ? chalk.cyan(`${d.precipitation_sum[i]} mm`)
      : chalk.gray("—");

    console.log(
      "  " +
        dayCell +
        emojiCell(ico) + " " +
        chalk.white(padR(label, W.cond)) +
        hiFn(padL(`${hi}°`, W.hi)) + "  " +
        loFn(padL(`${lo}°`, W.lo)) + "  " +
        chalk.blue(padL(`${humAvg}%`, W.hum)) + "  " +
        chalk.yellow(padR(wind, W.wind)) +
        padL(rain, W.rain)
    );
  }

  console.log();
  console.log(hr("═"));
  console.log(chalk.gray("  Data: Open-Meteo.com (open-source, no API key required)"));
  console.log(hr("═"));
  console.log();
}
