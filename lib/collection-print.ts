import type { CollectionItem, NamedCollection } from './collection-storage';
import {
  getCollectionDisplaySectionLabel,
  getCollectionDisplaySectionType,
  getCollectionItemCaption,
  type CollectionDisplaySectionType,
} from './collection-display';
import { coordinatesFromGeoJson, getIiifImageUrl, getIiifImageUrlWithBounds } from '@/utils/iiif';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] as string
  );
}

function getSafePrintImageUrl(value: string): string {
  if (value.startsWith('/')) return value;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
}

async function getPrintImageUrl(item: CollectionItem): Promise<string> {
  const infoUrl = item.image_iiif?.trim() ?? '';
  if (!infoUrl) return '';

  if (item.type === 'image') {
    return getIiifImageUrl(infoUrl, { maxSize: 1200 });
  }

  const coordinates = coordinatesFromGeoJson(item.coordinates);
  return getIiifImageUrlWithBounds(infoUrl, {
    coordinates: coordinates ?? undefined,
    flipY: true,
    maxSize: 1200,
  });
}

function groupItemsBySection(collection: NamedCollection) {
  const sections = new Map<CollectionDisplaySectionType, CollectionItem[]>([
    ['image', []],
    ['annotation', []],
    ['editorial', []],
  ]);

  for (const item of collection.items) {
    sections.get(getCollectionDisplaySectionType(item))?.push(item);
  }

  return Array.from(sections.entries()).filter(([, items]) => items.length > 0);
}

export async function buildCollectionPrintHtml(collection: NamedCollection): Promise<string> {
  const sections = await Promise.all(
    groupItemsBySection(collection).map(async ([sectionType, items]) => {
      const figures = await Promise.all(
        items.map(async (item) => {
          const caption = escapeHtml(getCollectionItemCaption(item));
          let imageUrl = '';
          try {
            imageUrl = escapeHtml(getSafePrintImageUrl(await getPrintImageUrl(item)));
          } catch {
            // Preserve the rest of the printout if one IIIF URL cannot be resolved.
          }
          const image = imageUrl
            ? `<img src="${imageUrl}" alt="${caption}" />`
            : `<div class="missing-image">No image available</div>`;

          return `<figure>${image}<figcaption>${caption}</figcaption></figure>`;
        })
      );
      const sectionLabel = escapeHtml(getCollectionDisplaySectionLabel(sectionType));
      const count = items.length;

      return (
        `<section>` +
        `<h2>${sectionLabel} <span>${count} ${count === 1 ? 'item' : 'items'}</span></h2>` +
        `<div class="grid">${figures.join('')}</div>` +
        `</section>`
      );
    })
  );
  const count = collection.items.length;

  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<title>${escapeHtml(collection.name)} · Collection print</title>` +
    `<style>` +
    `@page { margin: 12mm; }` +
    `body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; color: #111; }` +
    `h1 { font-size: 18px; margin: 0; }` +
    `.summary { color: #555; font-size: 12px; margin: 4px 0 14px; }` +
    `section { margin-top: 16px; }` +
    `h2 { align-items: baseline; display: flex; gap: 8px; font-size: 14px; margin: 0 0 8px; }` +
    `h2 span { color: #666; font-size: 11px; font-weight: 400; }` +
    `.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }` +
    `figure { margin: 0; break-inside: avoid; page-break-inside: avoid; border: 1px solid #ddd; padding: 8px; }` +
    `img { display: block; width: 100%; max-height: 112mm; object-fit: contain; }` +
    `.missing-image { display: grid; min-height: 54mm; place-items: center; background: #f4f4f4; color: #666; font-size: 12px; }` +
    `figcaption { color: #333; font-size: 11px; margin-top: 6px; }` +
    `</style></head>` +
    `<body onload="window.focus();window.print();">` +
    `<h1>${escapeHtml(collection.name)}</h1>` +
    `<p class="summary">Models of Authority collection · ${count} ${count === 1 ? 'item' : 'items'}</p>` +
    `${sections.join('')}` +
    `</body></html>`
  );
}
