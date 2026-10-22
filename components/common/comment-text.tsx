'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { scrollUpToElement } from '@/lib/scroll-utils';
import { cn } from '@/lib/utils';

type Props = {
  html: string;
  describedBy: string;
  className?: string;
  children?: ReactNode;
};

export function CommentText({ html, describedBy, className, children }: Props) {
  const t = useTranslations('content');
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const content = useMemo(() => sanitizeHtml(html), [html]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || expanded) return;
    const measure = () => setOverflowing(body.scrollHeight > body.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [content, expanded]);

  return (
    <div ref={rootRef} className={cn('scroll-mt-[calc(var(--site-header-h,0px)+2rem)]', className)}>
      <div
        ref={bodyRef}
        className={cn(
          'publication-body text-sm',
          !expanded && 'line-clamp-8',
          !expanded &&
            overflowing &&
            '[mask-image:linear-gradient(to_bottom,black_calc(100%_-_4rem),transparent)]'
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className={cn('flex items-center gap-2', overflowing && 'mt-2')}>
        {overflowing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 cursor-pointer gap-1 rounded-full px-3"
            aria-expanded={expanded}
            aria-describedby={describedBy}
            onClick={() => {
              setExpanded(!expanded);
              if (expanded) requestAnimationFrame(() => scrollUpToElement(rootRef.current));
            }}
          >
            {expanded ? t('blog.showLess') : t('blog.readMore')}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
