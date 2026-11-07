'use client';

/**
 * What Ask Archetype can look up on this site, and what it cannot yet.
 *
 * Shown on the page rather than left for a visitor to discover. An agent that
 * lacks hand comparison and one that has it and found nothing look the same
 * from an answer, and only one of them is telling the visitor anything about
 * the corpus.
 */

import { useTranslations } from 'next-intl';
import { Check, Minus } from 'lucide-react';

import { hasKnownReason, isKnownTool, splitTools } from '@/lib/ask';
import type { AgentTool } from '@/types/agent';

export function AgentLimits({ tools }: { tools: AgentTool[] }) {
  const t = useTranslations('ask');
  const { can, cannot } = splitTools(tools);

  const label = (tool: AgentTool) =>
    isKnownTool(tool.name) ? t(`tools.${tool.name}`) : tool.description;
  const reason = (tool: AgentTool) => {
    if (!tool.granted) return t('notGranted');
    return hasKnownReason(tool.name) ? t(`reasons.${tool.name}`) : tool.unavailable_reason;
  };

  return (
    <section aria-labelledby="ask-limits" className="rounded-lg border bg-muted/30 p-5">
      <h2 id="ask-limits" className="text-base font-semibold">
        {t('limitsTitle')}
      </h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{t('canTitle')}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {can.map((tool) => (
              <li key={tool.name} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{label(tool)}</span>
              </li>
            ))}
          </ul>
        </div>
        {cannot.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{t('cannotTitle')}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {cannot.map((tool) => (
                <li key={tool.name} className="flex gap-2">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>
                    {label(tool)}
                    <span className="block text-xs text-muted-foreground">{reason(tool)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
