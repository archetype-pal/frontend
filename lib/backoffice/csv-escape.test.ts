import { describe, expect, it } from 'vitest';

import { escapeCsvField } from './csv-escape';

describe('escapeCsvField', () => {
  it('passes through plain text untouched', () => {
    expect(escapeCsvField('hello world')).toBe('hello world');
    expect(escapeCsvField('Add. 1234')).toBe('Add. 1234');
  });

  it('quotes when the field contains a comma', () => {
    expect(escapeCsvField('a, b')).toBe('"a, b"');
  });

  it('quotes and escapes embedded double quotes', () => {
    expect(escapeCsvField('a "b" c')).toBe('"a ""b"" c"');
  });

  it('quotes when the field contains a newline OR a carriage return', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('split\rhere')).toBe('"split\rhere"');
  });

  it('neutralizes formula-injection prefixes by inserting a leading single quote', () => {
    // OWASP CSV-injection: a malicious description like `=HYPERLINK(...)` or
    // `+cmd|...` would execute as a formula when opened in Excel/Sheets.
    expect(escapeCsvField('=HYPERLINK("evil")')).toBe(`"'=HYPERLINK(""evil"")"`);
    expect(escapeCsvField('+1+1')).toBe(`'+1+1`);
    expect(escapeCsvField('-1')).toBe(`'-1`);
    expect(escapeCsvField('@SUM(A1)')).toBe(`'@SUM(A1)`);
    // Tab gets the prefix but isn't a CSV-structural character, so the cell
    // stays unquoted.
    expect(escapeCsvField('\tTab')).toBe(`'\tTab`);
    // CR is structural, so the CR-prefixed cell DOES quote.
    expect(escapeCsvField('\rCR')).toBe(`"'\rCR"`);
  });

  it('does NOT prefix safe characters that resemble formulas mid-string', () => {
    expect(escapeCsvField('1+1=2')).toBe('1+1=2');
    expect(escapeCsvField('foo@bar')).toBe('foo@bar');
  });
});
