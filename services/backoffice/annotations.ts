import { createCrudService } from './crud-factory'
import type {
  PaginatedResponse,
  GraphItem,
} from '@/types/backoffice'

// ── Graphs ───────────────────────────────────────────────────────────────

const graphsCrud = createCrudService<
  PaginatedResponse<GraphItem>,
  GraphItem
>('/annotations/graphs/')

export function getGraphs(
  token: string,
  params?: {
    item_image?: number
    annotation_type?: string
    hand?: number
    allograph?: number
    limit?: number
    offset?: number
  }
) {
  return graphsCrud.list(token, params)
}

export const getGraph = graphsCrud.get
export const updateGraph = graphsCrud.update
export const deleteGraph = graphsCrud.remove
