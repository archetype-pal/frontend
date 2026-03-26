import type { SearchResponse, Manuscript } from '@/types/manuscript';
import type { ManuscriptImage } from '@/types/manuscript-image';
import type { HandsResponse } from '@/types/hands';
import type { AllographsResponse } from '@/types/allographs';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

const MANUSCRIPTS_PAGE_SIZE = 20;

export async function fetchManuscripts(page = 1) {
  try {
    const offset = (page - 1) * MANUSCRIPTS_PAGE_SIZE;
    const response = await apiFetch(
      `/api/v1/search/item-parts/facets?limit=${MANUSCRIPTS_PAGE_SIZE}&offset=${offset}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch manuscripts');
    }
    const data: SearchResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching manuscripts:', error);
    throw error;
  }
}

export async function fetchManuscriptImage(id: string): Promise<ManuscriptImage> {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch manuscript image');
  }

  return response.json();
}

export async function fetchHands(itemImageId: string): Promise<HandsResponse> {
  const response = await apiFetch(`/api/v1/hands?item_image=${itemImageId}`);

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
