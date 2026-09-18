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
