/**
 * @file Shared text/layout utilities. Kept tiny on purpose — only helpers
 * that need to be used by more than one module live here.
 */

import stringWidth from "string-width";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Start a terminal spinner with a message. Returns a `stop` function that
 * clears the spinner line. No-ops when stdout is not a TTY.
 */
export function startSpinner(message: string): () => void {
  if (!process.stdout.isTTY) {
    process.stdout.write(message + "\n");
    return () => {};
  }

  let i = 0;
  process.stdout.write(`  ${SPINNER_FRAMES[i]} ${message}`);

  const timer = setInterval(() => {
    i = (i + 1) % SPINNER_FRAMES.length;
    process.stdout.write(`\r  ${SPINNER_FRAMES[i]} ${message}`);
  }, 80);

  return () => {
    clearInterval(timer);
    process.stdout.write("\r\x1b[K");
  };
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
export function padR(str: string, len: number): string {
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
export function padL(str: string, len: number): string {
  const w = stringWidth(str);
  if (w >= len) return str;
  return " ".repeat(len - w) + str;
}
