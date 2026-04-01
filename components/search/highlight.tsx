'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface HighlightProps {
  text: string;
  keyword: string;
  formattedText?: string;
}

const HIGHLIGHT_START_TOKEN = '__hl_start__';
const HIGHLIGHT_END_TOKEN = '__hl_end__';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turn Meilisearch highlight markers into safe HTML with <mark> only. */
function highlightMarkersToHtml(formatted: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < formatted.length) {
    const start = formatted.indexOf(HIGHLIGHT_START_TOKEN, i);
    if (start === -1) {
      parts.push(escapeHtml(formatted.slice(i)));
      break;
    }
    if (start > i) {
      parts.push(escapeHtml(formatted.slice(i, start)));
    }
    const markStart = start + HIGHLIGHT_START_TOKEN.length;
    const end = formatted.indexOf(HIGHLIGHT_END_TOKEN, markStart);
    if (end === -1) {
      parts.push(escapeHtml(formatted.slice(start)));
      break;
    }
    const inner = formatted.slice(markStart, end);
    parts.push(
      `<mark class="bg-yellow-200/70 dark:bg-yellow-500/30 rounded px-0.5">${escapeHtml(inner)}</mark>`
    );
    i = end + HIGHLIGHT_END_TOKEN.length;
  }
  return parts.join('');
}

const SNIPPET_RADIUS = 110;

function truncateAroundFirstHighlight(formatted: string, maxLen = 220): string {
  const idx = formatted.indexOf(HIGHLIGHT_START_TOKEN);
  if (idx === -1) return formatted.slice(0, maxLen);
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  let slice = formatted.slice(start, start + maxLen);
  if (start > 0) slice = `…${slice}`;
  if (start + maxLen < formatted.length) slice = `${slice}…`;
  return slice;
}

export function MatchSnippet({ formatted, className }: { formatted: string; className?: string }) {
  const truncated = truncateAroundFirstHighlight(formatted);
  const html = highlightMarkersToHtml(truncated);
  return (
    <span className={cn('leading-relaxed', className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

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
