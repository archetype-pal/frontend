import { revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import {
  MANAGEMENT_HEADINGS_PATH,
  readFromManagement,
  writeToManagement,
} from '@/lib/backoffice/management-route';

export function GET() {
  return readFromManagement(MANAGEMENT_HEADINGS_PATH);
}

// Headings render in the header on every page of the site.
export function POST(request: NextRequest) {
  return writeToManagement(request, MANAGEMENT_HEADINGS_PATH, () => revalidatePath('/', 'layout'));
}
