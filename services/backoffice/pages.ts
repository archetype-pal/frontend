import { backofficeDelete, backofficeGet, backofficePatch, backofficePost } from './api-client';
import type { MenuHeading, Page, PageListItem } from '@/lib/pages';

const PAGES_PATH = '/api/v1/management/pages/';
const MENU_HEADINGS_PATH = '/api/v1/management/menu-headings/';

const pagePath = (slug: string) => `${PAGES_PATH}${encodeURIComponent(slug)}/`;
const headingPath = (slug: string) => `${MENU_HEADINGS_PATH}${encodeURIComponent(slug)}/`;

export function getPages(): Promise<PageListItem[]> {
  return backofficeGet<PageListItem[]>(PAGES_PATH);
}

export function getPage(slug: string): Promise<Page> {
  return backofficeGet<Page>(pagePath(slug));
}

export type PageWritePayload = Partial<
  Pick<
    Page,
    'slug' | 'title' | 'content' | 'status' | 'menu_heading' | 'order' | 'include_in_quick_link'
  >
>;

export function createPage(data: PageWritePayload): Promise<Page> {
  return backofficePost<Page>(PAGES_PATH, data);
}

export function updatePage(slug: string, data: PageWritePayload): Promise<Page> {
  return backofficePatch<Page>(pagePath(slug), data);
}

export function deletePage(slug: string): Promise<void> {
  return backofficeDelete(pagePath(slug));
}

export function getMenuHeadings(): Promise<MenuHeading[]> {
  return backofficeGet<MenuHeading[]>(MENU_HEADINGS_PATH);
}

export type MenuHeadingWritePayload = Partial<Pick<MenuHeading, 'slug' | 'title'>>;

export function createMenuHeading(data: MenuHeadingWritePayload): Promise<MenuHeading> {
  return backofficePost<MenuHeading>(MENU_HEADINGS_PATH, data);
}

export function updateMenuHeading(
  slug: string,
  data: MenuHeadingWritePayload
): Promise<MenuHeading> {
  return backofficePatch<MenuHeading>(headingPath(slug), data);
}

export function deleteMenuHeading(slug: string): Promise<void> {
  return backofficeDelete(headingPath(slug));
}
