'use client'

import * as React from 'react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Folder,
  X,
} from 'lucide-react'
import { useLightboxStore } from '@/stores/lightbox-store'
import { useCollection } from '@/contexts/collection-context'
import { cn } from '@/lib/utils'

export function LightboxSidebar() {
  const {
    currentWorkspaceId,
    workspaces,
    images,
    createWorkspace,
    setCurrentWorkspace,
    deleteWorkspace,
    loadImages,
    removeImage,
    selectedImageIds,
    selectImage,
    deselectImage,
  } = useLightboxStore()
  const { items: collectionItems } = useCollection()
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const workspaceImages = React.useMemo(() => {
    if (!currentWorkspaceId) return []
    return Array.from(images.values()).filter(
      (img) => img.workspaceId === currentWorkspaceId
    )
  }, [currentWorkspaceId, images])

  const handleCreateWorkspace = async () => {
    await createWorkspace()
  }

  const handleLoadFromCollection = async () => {
    if (collectionItems.length > 0) {
      await loadImages(collectionItems)
    }
  }

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-white flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="mb-2"
        >
          <Folder className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Workspaces</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Workspace List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === currentWorkspaceId
            // Count images for this specific workspace
            const workspaceImageCount = Array.from(images.values()).filter(
              (img) => img.workspaceId === workspace.id
            ).length

            return (
              <div
                key={workspace.id}
                className={cn(
                  'p-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between group',
                  isActive && 'bg-blue-50 border border-blue-200'
                )}
                onClick={() => setCurrentWorkspace(workspace.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {workspace.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {workspaceImageCount} image{workspaceImageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteWorkspace(workspace.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleCreateWorkspace}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </Button>
        </div>
      </ScrollArea>

      {/* Image List */}
      {currentWorkspaceId && (
        <>
          <div className="p-4 border-t border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Images</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadFromCollection}
                disabled={collectionItems.length === 0}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {`${workspaceImages.length} image${workspaceImages.length !== 1 ? 's' : ''} in workspace`}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {workspaceImages.map((image) => {
                const isSelected = selectedImageIds.has(image.id)

                return (
                  <div
                    key={image.id}
                    className={cn(
                      'p-2 rounded-md border cursor-pointer hover:bg-gray-50',
                      isSelected && 'bg-blue-50 border-blue-300'
                    )}
                    onClick={() => {
                      if (isSelected) {
                        deselectImage(image.id)
                      } else {
                        selectImage(image.id)
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="relative w-16 h-16 bg-gray-100 rounded shrink-0">
                        {image.thumbnailUrl || image.imageUrl ? (
                          <NextImage
                            src={image.thumbnailUrl || image.imageUrl}
                            alt={image.metadata.shelfmark || 'Image'}
                            fill
                            className="object-cover rounded"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {image.metadata.locus || image.metadata.shelfmark || 'Untitled'}
                        </div>
                        {image.metadata.repository_name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {image.metadata.repository_name}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(image.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {workspaceImages.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No images in workspace</p>
                  <p className="text-xs mt-1">
                    Add images from your collection
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}
