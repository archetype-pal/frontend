import { revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import {
  MANAGEMENT_PAGES_PATH,
  readFromManagement,
  writeToManagement,
} from '@/lib/backoffice/management-route';

export function GET() {
  return readFromManagement(MANAGEMENT_PAGES_PATH);
}

// A new Page can appear in the About menu and sidebar on every page of the site.
export function POST(request: NextRequest) {
  return writeToManagement(request, MANAGEMENT_PAGES_PATH, () => revalidatePath('/', 'layout'));
}
