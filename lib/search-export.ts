import type { ResultType } from '@/lib/search-types';

/**
 * Maps column display headers → raw Meilisearch field keys per result type.
 * Used to extract values from search hits for formatted CSV export.
 */
const COLUMN_FIELD_MAP: Record<ResultType, Record<string, string>> = {
  manuscripts: {
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Catalogue Num.': 'catalogue_numbers',
    'Text Date': 'date',
    'Doc. Type': 'type',
    Images: 'number_of_images',
    Format: 'format',
    'Display Label': 'display_label',
  },
  images: {
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Category Number': 'locus',
    'Doc. Type': 'type',
    'Ann.': 'number_of_annotations',
    Date: 'date',
    Locus: 'locus',
  },
  scribes: {
    'Scribe Name': 'name',
    Date: 'period',
    Scriptorium: 'scriptorium',
    Period: 'period',
  },
  hands: {
    'Hand Title': 'name',
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    Place: 'place',
    Date: 'date',
    'Catalogue Num.': 'catalogue_numbers',
    Description: 'description',
  },
  graphs: {
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Document Date': 'date',
    Allograph: 'allograph',
    Character: 'character',
    'Character Type': 'character_type',
    'Hand Name': 'hand_name',
  },
  texts: {
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Text Type': 'text_type',
    'MS Date': 'date',
    Locus: 'locus',
    Status: 'status',
    Language: 'language',
  },
  clauses: {
    'Cat. Num.': 'catalogue_numbers',
    'Document Type': 'type',
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Text Date': 'date',
    'Text Type': 'text_type',
    'Clause Type': 'clause_type',
    Locus: 'locus',
    Status: 'status',
  },
  people: {
    'Cat. Num.': 'catalogue_numbers',
    'Document Type': 'type',
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Text Date': 'date',
    'Text Type': 'text_type',
    Category: 'person_type',
    Name: 'name',
    Locus: 'locus',
    Status: 'status',
  },
  places: {
    'Cat. Num.': 'catalogue_numbers',
    'Document Type': 'type',
    'Repository City': 'repository_city',
    Repository: 'repository_name',
    Shelfmark: 'shelfmark',
    'Text Date': 'date',
    'Text Type': 'text_type',
    'Place Type': 'place_type',
    Name: 'name',
    Locus: 'locus',
    Status: 'status',
  },
};

function formatCell(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildFormattedCsv(
  resultType: ResultType,
  rows: Record<string, unknown>[],
  visibleColumns: string[]
): string {
  const fieldMap = COLUMN_FIELD_MAP[resultType];
  const columns = visibleColumns.filter((col) => col in fieldMap);
  if (columns.length === 0) return '';

  const headerLine = columns.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCsvField(formatCell(row[fieldMap[col]]))).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export function buildFormattedJson(
  resultType: ResultType,
  rows: Record<string, unknown>[],
  visibleColumns: string[]
): string {
  const fieldMap = COLUMN_FIELD_MAP[resultType];
  const columns = visibleColumns.filter((col) => col in fieldMap);
  const mapped = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      out[col] = row[fieldMap[col]] ?? null;
    }
    return out;
  });
  return JSON.stringify(mapped, null, 2);
}
