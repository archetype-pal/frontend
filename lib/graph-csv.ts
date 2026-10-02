import type { BackendGraph } from '@/services/annotations';
import { escapeCsvField } from '@/lib/backoffice/csv-escape';
import { isGraphDescribed } from '@/lib/annotation-gallery-filters';

export interface GraphCsvRow {
  graph: BackendGraph;
  allograph: string;
  hand: string;
}

export interface GraphCsvColumn<R> {
  header: string;
  value: (row: R) => string;
}

/** The graph columns shared by every graph export, followed by any `extra` columns. */
export function graphsToCsv<R extends GraphCsvRow>(
  rows: R[],
  extra: GraphCsvColumn<R>[] = []
): string {
  const columns: GraphCsvColumn<R>[] = [
    { header: 'id', value: (r) => String(r.graph.id) },
    { header: 'allograph', value: (r) => r.allograph },
    { header: 'hand', value: (r) => r.hand },
    { header: 'described', value: (r) => (isGraphDescribed(r.graph) ? 'yes' : 'no') },
    {
      header: 'components',
      value: (r) =>
        (r.graph.graphcomponent_set ?? [])
          .map((c) => c.component_name ?? `#${c.component}`)
          .join('; '),
    },
    {
      header: 'features',
      value: (r) =>
        (r.graph.graphcomponent_set ?? [])
          .flatMap((c) => (c.feature_details ?? []).map((f) => f.name))
          .join('; '),
    },
    {
      header: 'positions',
      value: (r) => (r.graph.position_details ?? []).map((p) => p.name).join('; '),
    },
    ...extra,
  ];
  const lines = rows.map((r) => columns.map((c) => escapeCsvField(c.value(r))).join(','));
  return [columns.map((c) => escapeCsvField(c.header)).join(','), ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
