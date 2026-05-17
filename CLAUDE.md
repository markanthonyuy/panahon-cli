# CLAUDE.md

Guidance for Claude Code working on this repository.

## What this is

**Panahon** (Tagalog: weather/time) is a terminal weather CLI in TypeScript. No API keys required. This is a **portfolio project** — keep the code small, clean, and readable at a glance.

## Tech stack

- **Node.js 22 LTS** — ESM (`"type": "module"`). Do not bump without approval.
- **TypeScript** — strict, NodeNext module resolution
- **commander** v14+ — CLI parsing (uses `configureHelp` style hooks)
- **axios** — HTTP
- **chalk** v5 — terminal colours (ESM-only)
- **string-width** — visual-width measurement for emoji + ANSI-safe column alignment

## Project structure

```
src/
├── index.ts        CLI entrypoint — commander setup, routing, geocoding
├── weather.ts      Open-Meteo API clients (forecast, archive, air quality) + types
├── display.ts      Terminal rendering — chalk, column alignment, WMO emoji table
├── ascii.ts        ASCII weather art frames + animateArt() engine
├── dates.ts        Date parsing (yesterday / today / YYYY-MM-DD)
├── utils.ts        padR / padL (visual-width-aware), startSpinner
└── constants.ts    All external API URLs — never hardcode elsewhere

tests/
├── dates.test.ts   parseDate / toISODate unit tests
├── utils.test.ts   padR / padL unit tests
├── ascii.test.ts   artCategory / randomWeatherCode / weatherArt invariants
├── countries.test.ts  COUNTRY_CITIES data integrity
├── api.test.ts     Live health checks (Open-Meteo + ipapi.co + air quality)
└── cli.test.ts     End-to-end: spawns dist/index.js, asserts stdout/exit codes
```

## Commands

```bash
mise run setup       # first-time: install deps, build, npm link
mise run dev         # run from source via tsx
mise run typecheck   # tsc --noEmit
mise run build       # compile to dist/
mise run test        # all tests (unit + API + CLI); requires a build
mise run test:unit   # fast pure unit tests, no network
mise run test:api    # live endpoint health checks
mise run test:cli    # spawns dist/index.js, asserts on stdout
mise run try         # smoke-test against Manila
```

`PANAHON_SKIP_NETWORK=1` skips network-dependent tests.

**Always run `mise run typecheck` and `mise run test:unit` after editing `.ts` files.**

## API endpoints (all in constants.ts)

| Constant | URL | Used for |
|---|---|---|
| `WEATHER_API_URL` | api.open-meteo.com/v1/forecast | Current conditions + 7-day forecast |
| `HISTORICAL_API_URL` | archive-api.open-meteo.com/v1/archive | Past weather back to 1940 |
| `AIR_QUALITY_API_URL` | air-quality-api.open-meteo.com/v1/air-quality | US AQI + pollutants |
| `GEOCODING_API_URL` | geocoding-api.open-meteo.com/v1/search | City name → lat/lon |
| `IP_LOCATION_API_URL` | ipapi.co/json/ | Auto-detect location |

## Conventions

### TypeScript
- No `any`, no implicit `any`. Add proper types for all API responses.
- JSDoc on every exported function, interface, and non-trivial helper (`@param`, `@returns`, `@throws`, `@example`). The user explicitly wants JSDoc — see existing files for the style.
- ESM `import` syntax only. Local imports must use the `.js` extension even though the source is `.ts` (NodeNext): `import { foo } from "./bar.js"`.

### Terminal output
- All colours through `chalk`. Never raw ANSI escape sequences.
- Column alignment: use `padR` / `padL` from `utils.ts` — they use `stringWidth` so emojis and ANSI codes don't break layout. **Never use `String.prototype.padEnd` for styled or emoji-containing strings.**
- Render emojis through `emojiCell()` to force a fixed 2-column cell.
- Help text: section titles bold cyan, commands green, options yellow, args magenta, descriptions grey. Keep new additions consistent.
- Every successful run ends with `printFooter()` (the "Created by Mark Uy" block).

### Dates
- Accept only **ISO 8601 `YYYY-MM-DD`** plus `yesterday` / `today`. No `MM/DD/YYYY` — this is intentional (internationally ambiguous).

### Errors
- Print to **stderr** prefixed with `❌  Error: `, call `process.exit(1)`, suggest a fix when possible.

## Adding a new command

1. Add a `runX()` function in `index.ts` — mirror `runForecast` / `runHistorical` / `runAirQuality`.
2. New API data → typed client function in `weather.ts`.
3. New rendering → `displayX()` function in `display.ts`, return `{ linesBelowArtTop }` so `animateArt` works.
4. Register with `program.command(...)` in `index.ts`.
5. Add examples to `renderHelpFooter()` using the colour helpers (`cmd`, `sub`, `flag`, `arg`, `desc`).
6. Add a case to `tests/cli.test.ts` and (if new API) a health check to `tests/api.test.ts`.
7. Update the Commands table in `README.md`.

## Do NOT

- Add a linter, formatter config, or CI. Node's built-in test runner is the test framework — extend it, don't replace it.
- Introduce another HTTP library, CLI framework, or styling library.
- Commit `dist/` or `node_modules/` — both are gitignored.
- Edit `dist/` by hand.
- Change the licence from MIT.

## Planning documents

Write specs, plans, and agent working files to `.memory/` at the repo root (git-ignored). Keep the repo root clean.

## Preferences

- Small focused changes over large refactors.
- Ask before guessing on product decisions (UX flows, API choices, date formats).
- Briefly explain tradeoffs before non-obvious choices.
- If a user request conflicts with this file, follow the request and update this file afterwards.
