import type { CollectionItem, NamedCollection } from './collection-storage';
import {
  getCollectionDisplaySectionLabel,
  getCollectionDisplaySectionType,
  getCollectionAllographLabel,
  getCollectionHandLabel,
  getCollectionItemCaption,
  getCollectionItemTypeLabel,
  getCollectionManuscriptLabel,
  isCollectionEditorialAnnotation,
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
    return getIiifImageUrl(infoUrl, { thumbnail: true });
  }

  const coordinates = coordinatesFromGeoJson(item.coordinates);
  if (!coordinates) {
    return getIiifImageUrl(infoUrl, { thumbnail: true });
  }

  return getIiifImageUrlWithBounds(infoUrl, {
    coordinates,
    thumbnail: true,
    flipY: true,
  });
}

function buildPrintStartupScript(): string {
  return `
    <script>
      (function () {
        function retryUrl(src) {
          try {
            var url = new URL(src, window.location.href);
            url.searchParams.set('printRetry', String(Date.now()));
            return url.href;
          } catch (error) {
            return src;
          }
        }

        function waitForImage(image) {
          return new Promise(function (resolve) {
            var retried = false;

            function decodeAndResolve() {
              if (typeof image.decode === 'function') {
                image.decode().catch(function () {}).then(resolve);
                return;
              }
              resolve();
            }

            function retryOrResolve() {
              if (retried || !image.src) {
                resolve();
                return;
              }

              retried = true;
              image.src = retryUrl(image.src);
            }

            image.addEventListener('load', decodeAndResolve, { once: true });
            image.addEventListener('error', retryOrResolve);

            if (image.complete) {
              if (image.naturalWidth > 0) {
                decodeAndResolve();
                return;
              }

              retryOrResolve();
            }
          });
        }

        Promise.all(Array.from(document.images).map(waitForImage)).then(function () {
          requestAnimationFrame(function () {
            window.focus();
            window.print();
          });
        });
      })();
    </script>
  `;
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

function getPrintItemMetadata(item: CollectionItem): string {
  const parts = [getCollectionItemTypeLabel(item)];

  if (item.type === 'graph' && !isCollectionEditorialAnnotation(item)) {
    parts.push(getCollectionAllographLabel(item));

    const hand = getCollectionHandLabel(item);
    if (hand) parts.push(hand);
  }

  return parts.map(escapeHtml).join(' <span aria-hidden="true">·</span> ');
}

async function buildPrintTableRow(item: CollectionItem, index: number): Promise<string> {
  const caption = escapeHtml(getCollectionItemCaption(item));
  const manuscriptLabel = escapeHtml(getCollectionManuscriptLabel(item));
  let imageUrl = '';
  try {
    imageUrl = escapeHtml(getSafePrintImageUrl(await getPrintImageUrl(item)));
  } catch {
    // Preserve the rest of the printout if one IIIF URL cannot be resolved.
  }
  const image = imageUrl
    ? `<img class="thumb" src="${imageUrl}" alt="${caption}" loading="eager" decoding="sync" fetchpriority="high" />`
    : `<div class="missing-image">No image available</div>`;

  return (
    `<tr>` +
    `<td class="num-cell">${index + 1}</td>` +
    `<td class="thumb-cell">${image}</td>` +
    `<td class="item-cell">` +
    `<div class="item-title">${manuscriptLabel}</div>` +
    `<div class="item-meta">${getPrintItemMetadata(item)}</div>` +
    `</td>` +
    `</tr>`
  );
}

export async function buildCollectionPrintHtml(
  collection: NamedCollection,
  siteTitle: string
): Promise<string> {
  const sections = await Promise.all(
    groupItemsBySection(collection).map(async ([sectionType, items]) => {
      const rows = await Promise.all(items.map(buildPrintTableRow));
      const sectionLabel = escapeHtml(getCollectionDisplaySectionLabel(sectionType));
      const count = items.length;

      return (
        `<section>` +
        `<h2>${sectionLabel} <span>${count} ${count === 1 ? 'item' : 'items'}</span></h2>` +
        `<table class="print-table">` +
        `<thead><tr><th class="num-cell">#</th><th class="thumb-cell">Image</th><th>Item</th></tr></thead>` +
        `<tbody>${rows.join('')}</tbody>` +
        `</table>` +
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
    `.print-table { border-collapse: collapse; table-layout: fixed; width: 100%; }` +
    `th { color: #555; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; }` +
    `th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; vertical-align: middle; }` +
    `tr { break-inside: avoid; page-break-inside: avoid; }` +
    `.num-cell { color: #555; font-size: 10px; text-align: right; width: 24px; }` +
    `.thumb-cell { width: 86px; }` +
    `.thumb { background: #f4f4f4; border: 1px solid #ddd; display: block; height: 64px; object-fit: contain; width: 80px; }` +
    `.missing-image { align-items: center; background: #f4f4f4; border: 1px solid #ddd; color: #666; display: flex; font-size: 10px; height: 64px; justify-content: center; text-align: center; width: 80px; }` +
    `.item-title { font-size: 12px; font-weight: 600; }` +
    `.item-meta { color: #555; font-size: 11px; margin-top: 2px; }` +
    `</style></head>` +
    `<body>` +
    `<h1>${escapeHtml(collection.name)}</h1>` +
    `<p class="summary">${escapeHtml(siteTitle)} collection · ${count} ${count === 1 ? 'item' : 'items'}</p>` +
    `${sections.join('')}` +
    `${buildPrintStartupScript()}` +
    `</body></html>`
  );
}
