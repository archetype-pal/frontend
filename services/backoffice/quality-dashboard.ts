import { z } from 'zod';

import { authFetch } from '@/lib/api-fetch';

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
  const response = await authFetch('/api/v1/search/management/quality/', token, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  return QualityResponseSchema.parse(await response.json());
}
