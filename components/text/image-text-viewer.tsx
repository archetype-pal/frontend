import * as React from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface ImageTextViewerProps {
  html: string;
  className?: string;
}

export function ImageTextViewer({ html, className }: ImageTextViewerProps) {
  const safeHtml = React.useMemo(() => sanitizeHtml(html, { allowDataAttr: true }), [html]);
  return (
    <div
      className={className ?? 'prose prose-sm dark:prose-invert max-w-none'}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
