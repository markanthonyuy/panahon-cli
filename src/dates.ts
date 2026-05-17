/**
 * @file Date parsing helpers.
 *
 * Kept in its own module so the parser is testable without importing
 * `index.ts` (which calls `program.parse()` at the top level and would
 * therefore execute the CLI on import).
 */

/**
 * Parse a user-supplied date token into a canonical ISO `YYYY-MM-DD` string.
 *
 * Accepted forms:
 *  - Keywords: `yesterday`, `today` (case-insensitive)
 *  - `YYYY-MM-DD` — ISO 8601 date (the only numeric format supported)
 *
 * @param s - Raw input token.
 * @returns ISO date string, or `null` if the input is not a recognised date.
 */
export function parseDate(s: string): string | null {
  const lower = s.toLowerCase();

  if (lower === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  }
  if (lower === "today") {
    return toISODate(new Date());
  }

  // YYYY-MM-DD (ISO 8601)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
}

/** Format a Date as a local `YYYY-MM-DD` string (no timezone shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
