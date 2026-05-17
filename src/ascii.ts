/**
 * @file ASCII weather art — multi-frame icons keyed by WMO weather code,
 * plus the helpers used to render and animate them in the terminal.
 *
 * The art is grouped into broad visual {@link ArtCategory categories} (sunny,
 * cloudy, rain, snow, etc.); multiple WMO codes can map onto the same
 * category. Each category has 2+ frames so {@link animateArt} can cycle
 * through them for a brief subtle motion effect.
 *
 * Frame layout: every frame is exactly {@link ART_HEIGHT} lines tall and
 * {@link ART_WIDTH} columns wide. If you redraw any of them, right-pad
 * with spaces so the side-by-side metrics column in `display.ts` stays
 * aligned.
 */

import chalk, { type ChalkInstance } from "chalk";
import { padR } from "./utils.js";

/** Visual width of one ASCII art frame, in monospace columns. */
export const ART_WIDTH = 12;
/** Number of rows in every ASCII art frame. */
export const ART_HEIGHT = 5;

/**
 * Broad visual categories the ASCII art is grouped by. Multiple WMO codes
 * map onto the same category (e.g. all rain intensities share `rain` /
 * `heavyRain`).
 */
export type ArtCategory =
  | "sunny"
  | "mostlyClear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavyRain"
  | "snow"
  | "heavySnow"
  | "showers"
  | "thunder"
  | "unknown";

/**
 * Map a WMO weather code to its ASCII art category.
 * See: https://open-meteo.com/en/docs (Weather variable documentation).
 */
export function artCategory(code: number): ArtCategory {
  switch (code) {
    case 0:
      return "sunny";
    case 1:
      return "mostlyClear";
    case 2:
      return "partlyCloudy";
    case 3:
      return "cloudy";
    case 45:
    case 48:
      return "fog";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 61:
    case 63:
      return "rain";
    case 65:
      return "heavyRain";
    case 71:
    case 73:
      return "snow";
    case 75:
    case 77:
      return "heavySnow";
    case 80:
    case 81:
      return "showers";
    case 82:
      return "heavyRain";
    case 85:
    case 86:
      return "snow";
    case 95:
    case 96:
    case 99:
      return "thunder";
    default:
      return "unknown";
  }
}

/**
 * Multi-frame ASCII art keyed by {@link ArtCategory}. Each category has 2+
 * frames; {@link weatherArt} returns frame 0 (the "resting" frame) and
 * {@link animateArt} cycles through the rest for a brief subtle animation.
 *
 * Every frame is exactly {@link ART_HEIGHT} lines × {@link ART_WIDTH} cols.
 */
const ART_FRAMES: Record<ArtCategory, string[][]> = {
  sunny: [
    // Rays at the cardinals
    [
      "    \\ | /   ",
      "     .-.    ",
      "  ‒ (   ) ‒ ",
      "     `-`    ",
      "    / | \\   ",
    ],
    // Rays at the diagonals (rotated)
    [
      "    . . .   ",
      "     .-.    ",
      "  . (   ) . ",
      "     `-`    ",
      "    . . .   ",
    ],
  ],
  mostlyClear: [
    [
      "   \\  /     ",
      '  _ /".-.   ',
      "    \\_(   ).",
      "    /(___(_)",
      "            ",
    ],
    // Cloud drifts right one column
    [
      "    \\  /    ",
      '   _ /".-.  ',
      "     \\_(   )",
      "     /(___(_",
      "            ",
    ],
  ],
  partlyCloudy: [
    [
      "    \\  /    ",
      '  _ /".-.   ',
      "    \\_(   ).",
      "    /(___(_)",
      "            ",
    ],
    [
      "     \\  /   ",
      '   _ /".-.  ',
      "     \\_(   )",
      "     /(___(_",
      "            ",
    ],
  ],
  cloudy: [
    [
      "            ",
      "     .--.   ",
      "  .-(    ). ",
      " (___.__)__)",
      "            ",
    ],
    // Drift right
    [
      "            ",
      "      .--.  ",
      "   .-(    ).",
      "  (___.__)_)",
      "            ",
    ],
  ],
  fog: [
    [
      "            ",
      "  _ - _ - _ ",
      "   _ - _ -  ",
      "  _ - _ - _ ",
      "            ",
    ],
    // Bands shift
    [
      "            ",
      "   - _ - _ -",
      "  _ - _ - _ ",
      "   - _ - _ -",
      "            ",
    ],
  ],
  drizzle: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "    , , , , ",
      "   , , , ,  ",
    ],
    // Drops shifted (falling)
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   , , , ,  ",
      "    , , , , ",
    ],
  ],
  rain: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "    | | | | ",
      "   | | | |  ",
    ],
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   | | | |  ",
      "    | | | | ",
    ],
  ],
  heavyRain: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   ||||||   ",
      "    ||||||  ",
    ],
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "    ||||||  ",
      "   ||||||   ",
    ],
  ],
  showers: [
    [
      '  _`/"".-.  ',
      "   ,\\_(   ).",
      "    /(___(_)",
      "      ' ' ' ",
      "     ' ' '  ",
    ],
    [
      '  _`/"".-.  ',
      "   ,\\_(   ).",
      "    /(___(_)",
      "     ' ' '  ",
      "      ' ' ' ",
    ],
  ],
  snow: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "    *  *  * ",
      "   *  *  *  ",
    ],
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   *  *  *  ",
      "    *  *  * ",
    ],
  ],
  heavySnow: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   * * * *  ",
      "  * * * *   ",
    ],
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "  * * * *   ",
      "   * * * *  ",
    ],
  ],
  thunder: [
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "    /_  /_  ",
      "     /    / ",
    ],
    // Lightning flashes — bolts in different positions
    [
      "     .-.    ",
      "    (   ).  ",
      "   (___(__) ",
      "   /_   /_  ",
      "    /    /  ",
    ],
  ],
  unknown: [
    [
      "            ",
      "     ?      ",
      "    ? ?     ",
      "     ?      ",
      "            ",
    ],
    [
      "            ",
      "      ?     ",
      "    ? ?     ",
      "      ?     ",
      "            ",
    ],
  ],
};

/** Chalk colour applied to each ASCII art frame (whole-frame tint). */
const ART_COLOR: Record<ArtCategory, ChalkInstance> = {
  sunny: chalk.yellow.bold,
  mostlyClear: chalk.yellow,
  partlyCloudy: chalk.white,
  cloudy: chalk.gray,
  fog: chalk.gray,
  drizzle: chalk.cyan,
  rain: chalk.blue,
  heavyRain: chalk.blue.bold,
  showers: chalk.cyan,
  snow: chalk.white,
  heavySnow: chalk.white.bold,
  thunder: chalk.magenta.bold,
  unknown: chalk.gray,
};

/**
 * One representative WMO code per {@link ArtCategory}. Used by
 * {@link randomWeatherCode} so the "random" art shown on the help screen
 * cycles through visually distinct weather types rather than picking, say,
 * two near-identical rain frames in a row.
 */
const REPRESENTATIVE_CODES: readonly number[] = [
  0,  // sunny
  1,  // mostlyClear
  2,  // partlyCloudy
  3,  // cloudy
  45, // fog
  51, // drizzle
  61, // rain
  65, // heavyRain
  80, // showers
  71, // snow
  75, // heavySnow
  95, // thunder
];

/**
 * Return a random WMO weather code, drawn from one representative per art
 * category. Cosmetic only — used by the help-screen banner.
 */
export function randomWeatherCode(): number {
  const i = Math.floor(Math.random() * REPRESENTATIVE_CODES.length);
  return REPRESENTATIVE_CODES[i];
}

/**
 * Return the resting (frame 0) ASCII art for a WMO weather code, fully
 * styled and padded so that each line occupies exactly {@link ART_WIDTH}
 * visible columns. Always returns {@link ART_HEIGHT} lines.
 *
 * @param code - WMO weather interpretation code.
 */
export function weatherArt(code: number): string[] {
  const cat = artCategory(code);
  const tint = ART_COLOR[cat];
  return ART_FRAMES[cat][0].map((row) => tint(padR(row, ART_WIDTH)));
}

/**
 * Play a brief, subtle animation of the ASCII art region after the report
 * has already been printed.
 *
 * Works by moving the cursor up `linesBelowArtTop` lines back to the first
 * art row, then overwriting *only* the 12-column art region (column 3 → 14)
 * for each of the {@link ART_HEIGHT} art lines. The metric column to the
 * right of the art is left untouched.
 *
 * Skipped when stdout is not a TTY (e.g. piping to `less` or a file), so
 * scripts and pipes still see clean output. Safe to await: it resolves
 * after `durationMs`, leaving the resting frame as the final state.
 *
 * @param code             - WMO weather code (selects which frames to play).
 * @param linesBelowArtTop - Distance from the current cursor position back
 *                           up to the top art row. Caller must compute this
 *                           based on what was printed after the art.
 * @param durationMs       - Total animation duration in ms (default 2500).
 * @param frameMs          - Time between frame swaps in ms (default 500).
 */
export async function animateArt(
  code: number,
  linesBelowArtTop: number,
  durationMs = 2500,
  frameMs = 500,
): Promise<void> {
  if (!process.stdout.isTTY) return;

  const cat = artCategory(code);
  const frames = ART_FRAMES[cat];
  if (frames.length <= 1) return;

  const tint = ART_COLOR[cat];
  const out = process.stdout;

  // Hide the cursor and ensure it's restored on exit (including Ctrl+C).
  const showCursor = () => out.write("\x1b[?25h");
  out.write("\x1b[?25l");
  const onExit = () => {
    showCursor();
    process.exit(130);
  };
  process.once("SIGINT", onExit);

  const start = Date.now();
  let idx = 0;
  try {
    while (Date.now() - start < durationMs) {
      idx = (idx + 1) % frames.length;
      const frame = frames[idx];

      // Move up to the first art row.
      out.write(`\x1b[${linesBelowArtTop}A`);

      for (let i = 0; i < ART_HEIGHT; i++) {
        // Jump to column 3 (after the "  " indent) and overwrite the
        // 12-column art region only. The metrics column on the right side
        // of the same line is untouched.
        out.write("\x1b[3G");
        out.write(tint(padR(frame[i], ART_WIDTH)));
        if (i < ART_HEIGHT - 1) out.write("\n");
      }

      // After ART_HEIGHT writes the cursor has descended (ART_HEIGHT - 1)
      // lines. Move back to the bottom of the report.
      const remaining = linesBelowArtTop - (ART_HEIGHT - 1);
      if (remaining > 0) out.write(`\x1b[${remaining}B`);
      out.write("\r");

      await new Promise((r) => setTimeout(r, frameMs));
    }

    // Settle on the resting frame (frame 0) when the animation ends.
    out.write(`\x1b[${linesBelowArtTop}A`);
    for (let i = 0; i < ART_HEIGHT; i++) {
      out.write("\x1b[3G");
      out.write(tint(padR(frames[0][i], ART_WIDTH)));
      if (i < ART_HEIGHT - 1) out.write("\n");
    }
    const remaining = linesBelowArtTop - (ART_HEIGHT - 1);
    if (remaining > 0) out.write(`\x1b[${remaining}B`);
    out.write("\r");
  } finally {
    process.removeListener("SIGINT", onExit);
    showCursor();
  }
}
