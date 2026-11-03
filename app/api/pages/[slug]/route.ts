import { revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import {
  MANAGEMENT_PAGES_PATH,
  readFromManagement,
  writeToManagement,
} from '@/lib/backoffice/management-route';
import { pageHref } from '@/lib/pages';

type RouteParams = { params: Promise<{ slug: string }> };

const pagePath = (slug: string) => `${MANAGEMENT_PAGES_PATH}${encodeURIComponent(slug)}/`;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  return readFromManagement(pagePath((await params).slug));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return writeToManagement(request, pagePath(slug), (saved) => {
    revalidatePath('/', 'layout');
    revalidatePath(pageHref(slug));
    // The slug itself may have just changed — revalidate the new one too.
    if (typeof saved.slug === 'string' && saved.slug !== slug) {
      revalidatePath(pageHref(saved.slug));
    }
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return writeToManagement(request, pagePath(slug), () => {
    revalidatePath('/', 'layout');
    revalidatePath(pageHref(slug));
  });
}
