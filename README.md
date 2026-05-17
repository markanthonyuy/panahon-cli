# Panahon 🌤

A terminal weather forecast tool written in TypeScript — current conditions, 7-day forecast, wind & humidity. Powered by [Open-Meteo](https://open-meteo.com/) (no API key required).

> _Panahon_ (Tagalog) — weather, season, or time.

---

## Features

- 🌍 Look up any city worldwide by name
- 📍 Auto-detect your location via IP
- 📅 7-day forecast with highs, lows, humidity, wind & rain
- 🎨 Colour-coded temperatures, emoji weather icons, and aligned monospace tables
- ⚡ Single binary, no API keys, no config

## Install

```bash
git clone https://github.com/markanthonyuy/panahon-cli.git
cd panahon
npm install
npm run build
npm link
```

## Usage

```bash
# Show help
panahon

# Look up a city
panahon "Las Pinas"
panahon "Tokyo"
panahon "New York"

# Auto-detect location from your IP
panahon auto

# Use raw coordinates
panahon now --lat 14.5 --lon 121.0

# Explicit subcommand
panahon now Manila
```

### Commands

| Command                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `panahon <location>`    | Show forecast for the given city                       |
| `panahon now [loc]`     | Same as above, with `--lat` / `--lon` coordinate flags |
| `panahon auto`          | Detect location via IP and show forecast               |
| `panahon -h, --help`    | Show help                                              |
| `panahon -v, --version` | Show version                                           |

## Example output

```
════════════════════════════════════════════════════════════════
  🌍  Las Piñas, National Capital Region, Philippines   •   5/17/2026, 8:54 AM
════════════════════════════════════════════════════════════════

  CURRENT CONDITIONS

  ☁️  Condition       Overcast
  🌡️  Temperature     29.3°C  (feels like 35.4°C)
  💨  Wind            2.3 km/h S
  💧  Humidity        ████████████░░░░  72%
  🌧️  Precipitation   0 mm

────────────────────────────────────────────────────────────────

  7-DAY FORECAST

  Day   Condition             High     Low     Hum  Wind            Rain
────────────────────────────────────────────────────────────────
  Today ⛈️ Thunderstorm       32.5°   25.6°    78%  11.6 km/h NE   8.4 mm
  Mon   ⛈️ Thunderstorm       32.7°   25.1°    78%  15 km/h NE     3.9 mm
  Tue   ⛈️ Thunderstorm       31.9°   25.7°    77%  9.6 km/h NE    7.1 mm
  ...
```

## Development

```bash
npm install          # install deps
npm run dev          # run with tsx (no build step)
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
npm start            # alias for dev
```

### Project structure

```
src/
├── index.ts        CLI entrypoint (commander)
├── weather.ts      Open-Meteo forecast client + types
├── display.ts      Terminal rendering (chalk + string-width)
└── constants.ts    API URLs
```

## How it works

- **Weather data** — [Open-Meteo Forecast API](https://api.open-meteo.com)
- **Geocoding** — [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com) converts city names to coordinates
- **IP location** — [ipapi.co](https://ipapi.co) for the `auto` command

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
