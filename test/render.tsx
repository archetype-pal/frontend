import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import { createTestQueryClient } from '@/test/query-client';

type Providers = { modelLabels?: boolean; tooltip?: boolean };

/** Render `ui` under a fresh test QueryClient, plus whichever other providers the page reads. */
export function renderWithQueryClient(ui: ReactElement, { modelLabels, tooltip }: Providers = {}) {
  const client = createTestQueryClient();
  let tree = ui;
  if (tooltip) tree = <TooltipProvider>{tree}</TooltipProvider>;
  if (modelLabels) tree = <ModelLabelsProvider>{tree}</ModelLabelsProvider>;
  return { client, ...render(<QueryClientProvider client={client}>{tree}</QueryClientProvider>) };
}
