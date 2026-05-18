# Panahon 🌤

A terminal weather forecast tool written in TypeScript — current conditions, 7-day forecast, wind & humidity. Powered by [Open-Meteo](https://open-meteo.com/).

> _Panahon_ (Tagalog) — weather, season, or time.

---

## Features

- 🌍 Look up any city worldwide by name
- 🗺️ Pass a **country name** to get weather across its 5–8 major cities at once
- 📍 Auto-detect your location via IP
- 📅 7-day forecast with highs, lows, humidity, wind & rain
- 🕰️ Historical weather for any past date back to 1940
- 🌬️ Air quality (US AQI + PM2.5, PM10, O3, NO2, SO2, CO) via `--air`
- ⏳ Loading spinner while fetching data
- 🎨 Colour-coded temperatures, emoji weather icons, and aligned monospace tables
- ⚡ Single binary, no API keys, no config

## Install

Requires **Node.js 22+**. If you use [`mise`](https://mise.jdx.dev) (recommended), it will auto-install the right version from `.mise.toml`:

```bash
git clone https://github.com/markanthonyuy/panahon-cli.git
cd panahon-cli
mise trust && mise install   # optional: pins Node 22 LTS for this project
npm install
npm run build
npm link
```

This installs two binaries — `panahon` and the shorter alias `pan`. Use whichever you prefer.

## Usage

```bash
# Show help
panahon        # or: pan

# Look up a city
panahon Manila
pan "New York"
pan Tokyo

# Look up a whole country — shows weather across major cities
pan Philippines
pan Japan
pan "United States"
pan "United Kingdom"

# Auto-detect location from your IP
pan auto

# Use raw coordinates
pan now --lat 14.5 --lon 121.0

# Explicit subcommand
pan now Manila

# Historical weather (yesterday or any past ISO date)
pan yesterday
pan 2024-12-25
pan 2024-12-25 "Las Pinas"
pan history yesterday Tokyo

# Air quality (US AQI + pollutants)
pan Manila --air
pan auto --air
pan now Tokyo --air
```

> Multi-word names (cities or countries) must be quoted: `pan "New York"`, `pan "South Korea"`.
>
> Dates must be in ISO 8601 format: **`YYYY-MM-DD`**. The keywords `yesterday` and `today` are also accepted.

### Commands

| Command                                 | Description                                            |
| --------------------------------------- | ------------------------------------------------------ |
| `panahon <city>` / `pan <city>`         | Show forecast for the given city                       |
| `pan <country>`                         | Show weather across the country's major cities         |
| `pan now [loc]`                         | Same as above, with `--lat` / `--lon` coordinate flags |
| `pan auto`                              | Detect location via IP and show forecast               |
| `pan <date> [loc]`                      | Historical weather for a past date (`YYYY-MM-DD`)      |
| `pan history <date> [loc]`              | Explicit historical subcommand (alias: `on`)           |
| `pan <city> --air`                      | Air quality report (US AQI + key pollutants)           |
| `pan -h, --help`                        | Show help                                              |
| `pan -v, --version`                     | Show version                                           |

### Supported countries

128 countries are supported for country-mode lookups, covering all major regions:

**Africa** — Algeria, Angola, Cameroon, DR Congo, Egypt, Ethiopia, Ghana, Ivory Coast, Kenya, Libya, Madagascar, Mali, Morocco, Mozambique, Niger, Nigeria, Rwanda, Senegal, South Africa, Sudan, Tanzania, Tunisia, Uganda, Zambia, Zimbabwe

**Americas** — Argentina, Bolivia, Brazil, Canada, Chile, Colombia, Costa Rica, Cuba, Dominican Republic, Ecuador, El Salvador, Guatemala, Honduras, Jamaica, Mexico, Nicaragua, Panama, Paraguay, Peru, Trinidad and Tobago, United States, Uruguay, Venezuela

**Asia** — Afghanistan, Armenia, Azerbaijan, Bahrain, Bangladesh, Cambodia, China, Georgia, India, Indonesia, Iran, Iraq, Israel, Japan, Jordan, Kazakhstan, Kuwait, Kyrgyzstan, Laos, Lebanon, Malaysia, Mongolia, Myanmar, Nepal, Oman, Pakistan, Philippines, Qatar, Russia, Saudi Arabia, Singapore, South Korea, Sri Lanka, Syria, Taiwan, Tajikistan, Thailand, Turkey, United Arab Emirates, Uzbekistan, Vietnam, Yemen

**Europe** — Albania, Austria, Belarus, Belgium, Bosnia and Herzegovina, Bulgaria, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Ireland, Italy, Latvia, Lithuania, Moldova, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Russia, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Ukraine, United Kingdom

**Oceania** — Australia, New Zealand, Papua New Guinea

## Example output

### City forecast

```
════════════════════════════════════════════════════════════════════════════════════
  🌍  Manila, National Capital Region, Philippines   •   5/17/2026, 1:01:46 PM
════════════════════════════════════════════════════════════════════════════════════

  CURRENT CONDITIONS

       .-.      ⛈️  Condition       Thunderstorm
      (   ).    🌡️  Temperature     33°C  (feels like 39.4°C)
     (___(__)   💨  Wind            8.8 km/h SW
      /_  /_    💧  Humidity        ██████████░░░░░░  62%
       /    /   🌧️  Precipitation   0 mm

────────────────────────────────────────────────────────────────────────────────────

  7-DAY FORECAST

  Day   Condition             High     Low     Hum  Wind            Rain
────────────────────────────────────────────────────────────────────────────────────
  Today ⛈️ Thunderstorm       33°    25.1°    74%  11.6 km/h NE   8.4 mm
  Mon   🌧️ Moderate rain      32.7°   25.1°    78%  15 km/h NE     3.9 mm
  ...
```

### Country forecast

```
════════════════════════════════════════════════════════════════════════════════════
  🇵🇭  Philippines   •   5/17/2026, 1:13:10 PM
════════════════════════════════════════════════════════════════════════════════════

  WEATHER ACROSS PHILIPPINES

  City                   Condition              Temp    Feels     Hum  Wind
────────────────────────────────────────────────────────────────────────────────────
  Manila              ⛈️ Thunderstorm           33°C   39.4°C     62%  8.8 km/h SW
  Quezon City         ☁️ Overcast             33.3°C   38.8°C     59%  5.1 km/h W
  Davao               ☁️ Overcast             27.5°C   33.5°C     85%  3.5 km/h E
  Cebu City           🌦️ Light drizzle        33.4°C     39°C     51%  9 km/h E
  Zamboanga           🌦️ Moderate drizzle     30.5°C   36.1°C     64%  7.6 km/h SE
  Antipolo            🌦️ Moderate drizzle       31°C   35.6°C     65%  8.3 km/h NE
  Taguig              ☁️ Overcast               34°C   40.9°C     57%  9.1 km/h SE
  Pasig               ☁️ Overcast             34.2°C   40.1°C     53%  4.2 km/h E

════════════════════════════════════════════════════════════════════════════════════
  Data: Open-Meteo.com
════════════════════════════════════════════════════════════════════════════════════
```

### Air quality

```
════════════════════════════════════════════════════════════════════════════════════
  🌍  Manila, National Capital Region, Philippines   •   5/17/2026, 11:27:20 PM
════════════════════════════════════════════════════════════════════════════════════

  AIR QUALITY

      \ | /     🌬️  AQI (US)              75  Moderate
       .-.      🔬  PM2.5                 26.7 μg/m³  ██████░░░░░░░░░░
    ‒ (   ) ‒   🔬  PM10                  27.5 μg/m³  ███░░░░░░░░░░░░░
       `-`      🌿  O3 (Ozone)            57 μg/m³
      / | \     🏭  NO2                   23.7 μg/m³
                ⚗️  SO2                   14.4 μg/m³
                🚗  CO                    368 μg/m³

  💡  Unusually sensitive people should consider limiting prolonged outdoor exertion.

════════════════════════════════════════════════════════════════════════════════════
  Data: Open-Meteo Air Quality (no API key required)
════════════════════════════════════════════════════════════════════════════════════
```

## Development

Requires [`mise`](https://mise.jdx.dev) to manage tasks and tooling.

```bash
mise run setup       # first-time: install deps, build, npm link
mise run dev         # run from source via tsx (no build step)
mise run typecheck   # tsc --noEmit
mise run build       # compile to dist/
mise run test        # all tests (unit + API + CLI; requires build)
mise run test:unit   # fast pure unit tests, no network
mise run test:api    # live Open-Meteo + ipapi health checks
mise run test:cli    # end-to-end CLI tests against dist/index.js
mise run try         # smoke-test against Manila
```

Set `PANAHON_SKIP_NETWORK=1` to skip the network-dependent tests in CI / offline.

### Project structure

```
src/
├── index.ts        CLI entrypoint (commander, routing)
├── weather.ts      Open-Meteo forecast + historical API client
├── display.ts      Terminal rendering (chalk + string-width)
├── ascii.ts        Animated ASCII weather art
├── countries.ts    Country → major cities map with coordinates and flags
├── dates.ts        Date parsing helpers
├── utils.ts        Padding helpers + loading spinner
└── constants.ts    API URLs
```

## How it works

- **Weather data** — [Open-Meteo Forecast API](https://api.open-meteo.com) — current conditions and 7-day forecasts
- **Historical data** — [Open-Meteo Archive API](https://archive-api.open-meteo.com) — reanalysis data back to 1940
- **Air quality** — [Open-Meteo Air Quality API](https://air-quality-api.open-meteo.com) — US AQI, PM2.5, PM10, O3, NO2, SO2, CO
- **Geocoding** — [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com) — city name → coordinates
- **IP location** — [ipapi.co](https://ipapi.co) — used by the `auto` command
- **Country mode** — resolved entirely from a local hardcoded map; no extra API calls

## Stack

- **TypeScript** (strict, NodeNext ESM)
- [`axios`](https://axios-http.com) — HTTP requests
- [`chalk`](https://github.com/chalk/chalk) — terminal colours
- [`commander`](https://github.com/tj/commander.js) — CLI argument parsing
- [`string-width`](https://github.com/sindresorhus/string-width) — visual width measurement for proper column alignment with emojis

## Created by

**Mark Uy** — [macmac.uy@gmail.com](mailto:macmac.uy@gmail.com)

Built as a portfolio piece to demonstrate TypeScript CLI design, terminal UX, and API integration. Feedback and ideas welcome.

## License

[MIT](./LICENSE) © Mark Uy
