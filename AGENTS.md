# AGENTS.md

Guidance for AI coding agents (Claude, Cursor, Aider, Copilot, etc.) working on this repository. Read this before making changes.

## What this project is

**Panahon** is a terminal weather CLI written in TypeScript. It fetches current conditions, 7-day forecasts, and historical data from the [Open-Meteo](https://open-meteo.com) APIs and renders a colour-coded report in the terminal. No API keys required.

This is a **portfolio project** by Mark Uy. Keep the code small, clean, and pleasant to read on GitHub — a recruiter or fellow engineer should be able to skim a single file and understand it immediately.

## Tech stack

- **Runtime**: Node.js 22 LTS (ESM, `"type": "module"`). Version is pinned via [`mise`](https://mise.jdx.dev) in `.mise.toml` and enforced by the `engines` field in `package.json`. Do not bump the runtime without the user's approval.
- **Language**: TypeScript (strict, NodeNext module resolution)
- **CLI**: [`commander`](https://github.com/tj/commander.js) v14+ (uses `configureHelp` style hooks)
- **HTTP**: [`axios`](https://axios-http.com)
- **Styling**: [`chalk`](https://github.com/chalk/chalk) v5 (ESM-only)
- **Layout**: [`string-width`](https://github.com/sindresorhus/string-width) — measures *visible* width so emoji + ANSI escapes don't break column alignment
- **Dev**: [`tsx`](https://github.com/privatenumber/tsx) for `npm run dev`

## Project structure

```
src/
├── index.ts        CLI entrypoint — commander setup, argument parsing, geocoding, dispatch
├── weather.ts      Open-Meteo API clients (forecast + archive) and response types
├── display.ts      Terminal rendering — chalk styling, column alignment, WMO emoji table
├── ascii.ts        Multi-frame ASCII weather art + the animation engine (animateArt)
├── dates.ts        Date parsing (yesterday / today / YYYY-MM-DD)
├── utils.ts        Tiny shared helpers (padR / padL — visual-width-aware padding)
└── constants.ts    API URLs and project metadata

tests/
├── dates.test.ts   parseDate / toISODate unit tests
├── utils.test.ts   padR / padL unit tests (ANSI + emoji width handling)
├── ascii.test.ts   artCategory / randomWeatherCode / weatherArt invariants
├── api.test.ts     Live health checks against Open-Meteo + ipapi.co (network)
└── cli.test.ts     End-to-end: spawns dist/index.js and asserts on stdout
```

Files are ordered above by likelihood of being touched. `constants.ts`, `dates.ts`, and `utils.ts` are rarely changed. Adding a new weather frame or category goes in `ascii.ts`; adding a new section to the report or tweaking layout goes in `display.ts`.

## Commands

Tasks are defined in `.mise.toml` and can be run with `mise run <task>` (or just `mise <task>`). They wrap the npm scripts so contributors get a single entry point regardless of package manager.

```bash
mise run setup       # first-time: install deps, build, npm link
mise run dev         # run from source via tsx — use this during iteration
mise run typecheck   # tsc --noEmit — run after any TS change
mise run build       # compile to dist/ and chmod +x the binary
mise run link        # build + npm link (depends on build)
mise run unlink      # remove the global symlink
mise run clean       # rm -rf dist
mise run try         # smoke-test against Manila
mise tasks           # list all available tasks with descriptions
```

The underlying `npm run *` scripts (`dev`, `typecheck`, `build`, `start`) also still work — pick whichever fits your habit.

### Tests

Tests use **Node's built-in test runner** (`node --test`) plus `tsx` as a TypeScript loader — no extra test framework dependency. Layout: pure unit tests run instantly; API and CLI tests are slower and hit live endpoints / the built binary.

```bash
mise run test         # all tests (unit + API + CLI). Requires a build.
mise run test:unit    # dates, utils, ascii — pure, fast, no network
mise run test:api     # live health checks for Open-Meteo + ipapi.co
mise run test:cli     # spawns dist/index.js, asserts on stdout / exit codes

PANAHON_SKIP_NETWORK=1 npm test   # skip API + network-dependent CLI tests
```

**Always run `mise run typecheck` and `mise run test:unit` after editing `.ts` files.** Add a test alongside any new exported function in `dates.ts`, `utils.ts`, or `ascii.ts`. For new CLI flags or commands, add a case to `tests/cli.test.ts`.

**Always run `npm run typecheck` after editing `.ts` files.** There is no test suite — the type checker is your safety net.

## Conventions

### Code style

- **Strict TypeScript** — no `any`, no implicit `any`. Add proper types for external API responses.
- **JSDoc comments** on every exported function, interface, and non-trivial helper. The user explicitly wants JSDoc — see existing files for the style (e.g. `@param`, `@returns`, `@throws`, `@example`).
- **Inline comments** only for non-obvious *why* — never narrate *what* the code is doing.
- **No emoji in source files** unless they're part of user-facing output (e.g. the WMO emoji table, status messages).
- Use ESM `import` syntax. Local imports must include the `.js` extension (NodeNext resolution): `import { foo } from "./bar.js"` even though the file is `bar.ts`.
- Imports go: built-ins → third-party → local. Group with blank lines if it improves readability.

### Date format

The CLI accepts **only ISO 8601 `YYYY-MM-DD`** for dates, plus the keywords `yesterday` and `today`. Do not add `MM/DD/YYYY` or `DD/MM/YYYY` — this was an intentional product decision (ambiguous internationally). The `parseDate()` helper in `src/index.ts` is the single source of truth.

### URL constants

All external URLs live in `src/constants.ts`. Never hardcode an Open-Meteo or geolocation URL elsewhere — import it from there.

### Terminal output

- Use `chalk` for all colours. Never write raw ANSI escape sequences.
- When padding output to align columns, use the `padR` / `padL` helpers in `display.ts` — they use `stringWidth` so emojis and ANSI codes are handled correctly. **Never use `String.prototype.padEnd` for styled or emoji-containing strings.**
- Render emojis through `emojiCell()` to force a fixed 2-column cell — terminals disagree on emoji width otherwise.
- Help output is styled via `program.configureHelp({...})` style hooks in `src/index.ts`. Section titles bold cyan, commands green, options yellow, args magenta, descriptions grey. Keep new help text consistent.
- Every successful CLI run ends with `printFooter()` (the "Created by Mark Uy" block). Add it after any new top-level command.

### Errors

User-facing errors should:
1. Print a clear message to **stderr** prefixed with `❌  Error: `.
2. Call `process.exit(1)`.
3. Suggest a fix when possible (see the ISO-date hint in `index.ts` for the pattern).

## Adding a new command

1. Add the route in `src/index.ts` via `program.command(...)`. Mirror the structure of existing commands (`now`, `auto`, `history`).
2. If it needs new API data, add a typed client to `src/weather.ts` (don't inline `axios.get` calls in the CLI layer).
3. If it needs new rendering, add a `displayX()` function to `src/display.ts` alongside the existing ones.
4. Add a row to the Examples or Historical block in `renderHelpFooter()` in `src/index.ts` using the same colour helpers (`cmd`, `sub`, `flag`, `arg`, `desc`).
5. Update the Commands table and Usage examples in `README.md`.
6. Run `npm run typecheck && npm run build` and manually exercise the new command.

## Things NOT to do

- **Do not add a linter, formatter config, or CI** unless explicitly asked. This is a small portfolio project — extra tooling muddies the impression. (Tests are in place using Node's built-in runner — extend them, don't add Jest/Vitest.)
- **Do not introduce another HTTP library, CLI framework, or styling library.** Stick with axios / commander / chalk.
- **Do not add backwards-compatibility shims** for the JS→TS migration. The repo is fully TypeScript; no `.js` source files exist (only built output in `dist/`).
- **Do not commit `dist/` or `node_modules/`.** Both are in `.gitignore`.
- **Do not change the licence** away from MIT.
- **Do not edit `dist/`** by hand — it's regenerated by `tsc`.

## When in doubt

The user prefers:
- Small focused changes over large refactors.
- Asking a clarifying question over guessing — especially for product decisions (which API to use, which date format, which UX flow).
- Explaining tradeoffs briefly before making a non-obvious choice.

If the user's request conflicts with anything in this file, follow the user's request and consider updating this file afterwards.
