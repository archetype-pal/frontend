'use client';

import * as React from 'react';

interface HighlightProps {
  text: string;
  keyword: string;
}

function HighlightComponent({ text, keyword }: HighlightProps) {
  const trimmedKeyword = keyword.trim();
  const parts = React.useMemo(() => {
    if (!trimmedKeyword) return [text];
    const escaped = trimmedKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.split(regex);
  }, [text, trimmedKeyword]);

  if (!trimmedKeyword) return <>{text}</>;
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
