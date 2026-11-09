import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MatchSnippet } from './highlight';

const START = '__hl_start__';
const END = '__hl_end__';

function twoMatches(gap: number, word: string) {
  return `${START}x${END}${'b'.repeat(gap)}${START}${word}${END}tail`;
}

describe('MatchSnippet', () => {
  it('marks the cut when a long text has no match', () => {
    const { container } = render(<MatchSnippet formatted={'a'.repeat(300)} />);

    expect(container.textContent).toBe(`${'a'.repeat(220)}…`);
  });

  it.each([190, 180])('never shows a highlight marker as text (gap of %i)', (gap) => {
    const { container } = render(<MatchSnippet formatted={twoMatches(gap, 'longword')} />);

    expect(container.textContent).toBe(`x${'b'.repeat(gap)}longwordtail`);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('closes a highlight the cut runs through', () => {
    const { container } = render(<MatchSnippet formatted={twoMatches(217, 'word')} />);

    const marks = container.querySelectorAll('mark');
    expect(container.textContent).toBe(`x${'b'.repeat(217)}wo…`);
    expect(marks).toHaveLength(2);
    expect(marks[1].textContent).toBe('wo');
  });
});
