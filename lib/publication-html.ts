import { sanitizeHtml } from './sanitize-html';

const HEADING_RE = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi;
const NOTE_PARAGRAPH_RE = /<p\b[^>]*>\s*\[(\d{1,3})\]/gi;
const NOTE_MARKER_RE = /\[(\d{1,3})\]/g;
const TAG_RE = /(<[^>]+>)/g;

function textContent(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function findNotesSectionStart(html: string): number {
  for (const match of html.matchAll(HEADING_RE)) {
    if (textContent(match[0]).toLowerCase() === 'notes') {
      return (match.index ?? 0) + match[0].length;
    }
  }

  return -1;
}

function collectLegacyNoteIds(notesHtml: string): Set<string> {
  const noteIds = new Set<string>();

  for (const match of notesHtml.matchAll(NOTE_PARAGRAPH_RE)) {
    noteIds.add(match[1]);
  }

  return noteIds;
}

function linkReferenceMarkers(html: string, noteIds: Set<string>): string {
  if (noteIds.size === 0) return html;

  let anchorDepth = 0;
  const refCounts = new Map<string, number>();

  return html
    .split(TAG_RE)
    .map((part) => {
      if (part.startsWith('<')) {
        const lower = part.toLowerCase();

        if (/^<a\b/.test(lower)) {
          anchorDepth += 1;
        } else if (/^<\/a\s*>/.test(lower)) {
          anchorDepth = Math.max(0, anchorDepth - 1);
        }

        return part;
      }

      if (anchorDepth > 0) return part;

      return part.replace(NOTE_MARKER_RE, (marker, id: string) => {
        if (!noteIds.has(id)) return marker;

        const nextCount = (refCounts.get(id) ?? 0) + 1;
        refCounts.set(id, nextCount);
        const refId = nextCount === 1 ? `refnote${id}` : `refnote${id}-${nextCount}`;

        return `<a id="${refId}" href="#footnote${id}" class="publication-footnote-ref" title="See note ${id}">${marker}</a>`;
      });
    })
    .join('');
}

function linkNoteMarkers(notesHtml: string, noteIds: Set<string>): string {
  return notesHtml.replace(NOTE_PARAGRAPH_RE, (match, id: string) => {
    if (!noteIds.has(id)) return match;

    return match.replace(
      `[${id}]`,
      `<a id="footnote${id}" href="#refnote${id}" class="publication-footnote-backref" title="Return to reference ${id}">[${id}]</a>`
    );
  });
}

function linkLegacyPublicationFootnotes(html: string): string {
  const notesStart = findNotesSectionStart(html);
  if (notesStart === -1) return html;

  const bodyHtml = html.slice(0, notesStart);
  const notesHtml = html.slice(notesStart);
  const noteIds = collectLegacyNoteIds(notesHtml);

  if (noteIds.size === 0) return html;

  return linkReferenceMarkers(bodyHtml, noteIds) + linkNoteMarkers(notesHtml, noteIds);
}

export function renderPublicationHtml(dirty: string): string {
  const cleanHtml = sanitizeHtml(dirty, { allowLegacyPublicationStyles: true });
  return linkLegacyPublicationFootnotes(cleanHtml);
}
