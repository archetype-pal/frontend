'use client';

import * as React from 'react';

interface HighlightProps {
  text: string;
  keyword: string;
  formattedText?: string;
}

const HIGHLIGHT_START_TOKEN = '__hl_start__';
const HIGHLIGHT_END_TOKEN = '__hl_end__';

function renderTokenized(text: string) {
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const start = text.indexOf(HIGHLIGHT_START_TOKEN, cursor);
    if (start === -1) {
      segments.push(<span key={key++}>{text.slice(cursor)}</span>);
      break;
    }
    if (start > cursor) {
      segments.push(<span key={key++}>{text.slice(cursor, start)}</span>);
    }
    const markStart = start + HIGHLIGHT_START_TOKEN.length;
    const end = text.indexOf(HIGHLIGHT_END_TOKEN, markStart);
    if (end === -1) {
      segments.push(<span key={key++}>{text.slice(start)}</span>);
      break;
    }
    segments.push(<mark key={key++}>{text.slice(markStart, end)}</mark>);
    cursor = end + HIGHLIGHT_END_TOKEN.length;
  }

  return <>{segments}</>;
}

function HighlightComponent({ text, keyword, formattedText }: HighlightProps) {
  if (formattedText?.includes(HIGHLIGHT_START_TOKEN)) {
    return renderTokenized(formattedText);
  }

  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return <>{text}</>;

  const escaped = trimmedKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const lowKeyword = trimmedKeyword.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lowKeyword ? (
          <mark key={i}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export const Highlight = React.memo(HighlightComponent);
