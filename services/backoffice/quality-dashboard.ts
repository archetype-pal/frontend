import { z } from 'zod';

import { backofficeGet } from './api-client';

const QualityCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
  sample: z.array(z.record(z.string(), z.unknown())),
});

export const QualityResponseSchema = z.object({
  generated_at: z.string(),
  cards: z.array(QualityCardSchema),
});

export type QualityCard = z.infer<typeof QualityCardSchema>;
export type QualityResponse = z.infer<typeof QualityResponseSchema>;

export async function fetchQualityDashboard(token: string): Promise<QualityResponse> {
  const data = await backofficeGet<unknown>('/api/v1/search/management/quality/', token, {
    cache: 'no-store',
  });
  return QualityResponseSchema.parse(data);
}
