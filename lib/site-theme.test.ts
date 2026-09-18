import { afterEach, describe, expect, it } from 'vitest';

import { getSiteThemeName, getSiteThemeVars } from './site-theme';

const ORIGINAL_SITE_THEME = process.env.NEXT_PUBLIC_SITE_THEME;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_THEME = ORIGINAL_SITE_THEME;
});

describe('getSiteThemeName', () => {
  it('defaults to moa when unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_THEME;
    expect(getSiteThemeName()).toBe('moa');
  });

  it('defaults to moa for an unknown value rather than crashing', () => {
    process.env.NEXT_PUBLIC_SITE_THEME = 'not-a-real-project';
    expect(getSiteThemeName()).toBe('moa');
  });

  it('accepts a known preset name', () => {
    process.env.NEXT_PUBLIC_SITE_THEME = 'digipal';
    expect(getSiteThemeName()).toBe('digipal');
  });
});

describe('getSiteThemeVars', () => {
  it('moa has no overrides (matches the existing :root defaults)', () => {
    process.env.NEXT_PUBLIC_SITE_THEME = 'moa';
    expect(getSiteThemeVars()).toEqual({});
  });

  it('digipal/exon/visigothicpal each override the same brand tokens', () => {
    for (const theme of ['digipal', 'exon', 'visigothicpal']) {
      process.env.NEXT_PUBLIC_SITE_THEME = theme;
      const vars = getSiteThemeVars();
      expect(Object.keys(vars).sort()).toEqual(['--accent', '--primary', '--ring']);
    }
  });

  it('every preset gives --primary and --ring the same hue (brand identity, not just accent)', () => {
    process.env.NEXT_PUBLIC_SITE_THEME = 'digipal';
    const vars = getSiteThemeVars();
    expect(vars['--primary']).toBe(vars['--ring']);
  });
});
