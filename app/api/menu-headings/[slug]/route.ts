import { revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import { MANAGEMENT_HEADINGS_PATH, writeToManagement } from '@/lib/backoffice/management-route';

type RouteParams = { params: Promise<{ slug: string }> };

// The layout covers the header and, through it, every page's sidebar; a
// deleted heading's pages fall back under About.
async function write(request: NextRequest, { params }: RouteParams) {
  const path = `${MANAGEMENT_HEADINGS_PATH}${encodeURIComponent((await params).slug)}/`;
  return writeToManagement(request, path, () => revalidatePath('/', 'layout'));
}

export { write as PATCH, write as DELETE };
