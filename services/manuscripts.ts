import type { Manuscript } from '@/types/manuscript';
import type { ManuscriptImage } from '@/types/manuscript-image';
import type { HandsResponse } from '@/types/hands';
import type { AllographsResponse, Position as SymbolPosition } from '@/types/allographs';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

export async function fetchManuscriptImage(id: string): Promise<ManuscriptImage> {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch manuscript image');
  }

  return response.json();
}

export async function fetchHands(itemPartId: string | number): Promise<HandsResponse> {
  const response = await apiFetch(`/api/v1/hands/?item_part=${itemPartId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch hands');
  }

  return response.json();
}

export async function fetchAllographs(): Promise<AllographsResponse> {
  const response = await apiFetch(`/api/v1/symbols_structure/allographs/`);

  if (!response.ok) {
    throw new Error('Failed to fetch allographs');
  }

  return response.json();
}

export async function fetchManuscript(id: number): Promise<Manuscript> {
  const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }
    throw new Error('Failed to fetch manuscript');
  }

  return response.json();
}

export async function fetchPositions(): Promise<SymbolPosition[]> {
  const response = await apiFetch(`/api/v1/symbols_structure/positions/`);

  if (!response.ok) {
    throw new Error('Failed to fetch positions');
  }

  return response.json();
}
