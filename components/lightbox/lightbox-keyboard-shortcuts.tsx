'use client'

import * as React from 'react'
import { useLightboxStore } from '@/stores/lightbox-store'

export function LightboxKeyboardShortcuts() {
  const {
    selectedImageIds,
    images,
    currentWorkspaceId,
    removeImage,
    updateImage,
    selectAll,
    deselectAll,
    zoom,
    setZoom,
    undo,
    redo,
  } = useLightboxStore()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      // Don't handle shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      // Delete selected images
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIds.size > 0) {
        e.preventDefault()
        selectedImageIds.forEach((id) => {
          removeImage(id)
        })
        return
      }

      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      // Deselect all
      if (e.key === 'Escape') {
        e.preventDefault()
        deselectAll()
        return
      }

      // Zoom with +/-
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom(Math.min(zoom * 1.1, 10))
        return
      }

      if (e.key === '-') {
        e.preventDefault()
        setZoom(Math.max(zoom / 1.1, 0.1))
        return
      }

      // Rotate with R
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        selectedImageIds.forEach((id) => {
          const img = images.get(id)
          if (img) {
            updateImage(id, {
              transform: {
                ...img.transform,
                rotation: (img.transform.rotation + 90) % 360,
              },
            })
          }
        })
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedImageIds, images, zoom, setZoom, removeImage, selectAll, deselectAll, updateImage, undo, redo])

  return null // This component doesn't render anything
}
