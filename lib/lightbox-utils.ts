import type { ImageListItem } from '@/types/image'
import type { GraphListItem } from '@/types/graph'
import type { CollectionItem } from '@/contexts/collection-context'

/**
 * Open lightbox with a single image
 */
export function openLightboxWithImage(imageId: number) {
  const url = `/lightbox?image=${imageId}`
  window.location.href = url
}

/**
 * Open lightbox with a single graph
 */
export function openLightboxWithGraph(graphId: number) {
  const url = `/lightbox?graph=${graphId}`
  window.location.href = url
}

/**
 * Open lightbox with selected items (images and/or graphs).
 */
export function openLightboxWithItems(items: (ImageListItem | GraphListItem | CollectionItem)[]) {
  const images: number[] = []
  const graphs: number[] = []
  
  items.forEach((item) => {
    const type = 'type' in item ? item.type : ('image' in item ? 'image' : 'graph')
    if (type === 'image') {
      images.push(item.id)
    } else {
      graphs.push(item.id)
    }
  })
  
  const params = new URLSearchParams()
  if (images.length > 0) {
    params.set('images', images.join(','))
  }
  if (graphs.length > 0) {
    params.set('graphs', graphs.join(','))
  }
  
  const url = `/lightbox?${params.toString()}`
  window.location.href = url
}
