/**
 * Per-deployment brand palette. Archetype runs as several differently-branded
 * sites (MoA, DigiPal, Exon, VisigothicPal, ...) from the same codebase —
 * before this, the brand colours in globals.css were a single hardcoded
 * "MoA Blue" with no way to vary them per deployment.
 *
 * `NEXT_PUBLIC_SITE_THEME` picks a preset at build time; each preset only
 * overrides the small set of tokens that carry brand identity (primary,
 * accent, ring). Everything else — layout, editorial/status/annotation
 * colours — stays shared across sites.
 */

export type SiteThemeName = 'moa' | 'digipal' | 'exon' | 'visigothicpal';

type ThemeVars = Record<string, string>;

// `moa` intentionally has no overrides: it matches the defaults already in
// `:root` in globals.css.
const SITE_THEME_PRESETS: Record<SiteThemeName, ThemeVars> = {
  moa: {},
  digipal: {
    '--primary': 'hsl(142 40% 26%)',
    '--ring': 'hsl(142 40% 26%)',
    '--accent': 'hsl(38 92% 50%)',
  },
  exon: {
    '--primary': 'hsl(4 60% 34%)',
    '--ring': 'hsl(4 60% 34%)',
    '--accent': 'hsl(38 85% 48%)',
  },
  visigothicpal: {
    '--primary': 'hsl(266 40% 32%)',
    '--ring': 'hsl(266 40% 32%)',
    '--accent': 'hsl(38 85% 48%)',
  },
};

function isSiteThemeName(value: string): value is SiteThemeName {
  return value in SITE_THEME_PRESETS;
}

export function getSiteThemeName(): SiteThemeName {
  const raw = process.env.NEXT_PUBLIC_SITE_THEME?.trim();
  return raw && isSiteThemeName(raw) ? raw : 'moa';
}

/** CSS custom-property overrides for the active site theme, ready to spread onto a `style` prop. */
export function getSiteThemeVars(): ThemeVars {
  return SITE_THEME_PRESETS[getSiteThemeName()];
}

const HSL_VAR_RE = /^hsl\(\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*\)$/;

/**
 * Converts one of this module's `hsl(H S% L%)` preset values to a `#rrggbb`
 * hex string, for callers (the backoffice colour pickers) that need a value
 * an `<input type="color">` can render. Returns null for anything that isn't
 * this exact preset format rather than guessing.
 */
export function siteThemeVarToHex(value: string): string | null {
  const match = HSL_VAR_RE.exec(value.trim());
  if (!match) return null;
  const [, hStr, sStr, lStr] = match;
  const h = Number(hStr);
  const s = Number(sStr) / 100;
  const l = Number(lStr) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
