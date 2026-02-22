'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, X, FileJson, FileText } from 'lucide-react';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { CollectionItem } from '@/contexts/collection-context';
import { saveImage } from '@/lib/lightbox-db';
import type { LightboxImage } from '@/lib/lightbox-db';

interface LightboxImportProps {
  onClose: () => void;
}

export function LightboxImport({ onClose }: LightboxImportProps) {
  const { loadImages, createWorkspace } = useLightboxStore();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();

      if (file.name.endsWith('.json')) {
        await importJSON(text);
      } else if (file.name.endsWith('.xml')) {
        await importTEI(text);
      } else {
        toast.error('Unsupported file format. Please use JSON or TEI XML.');
      }

      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import file. Please check the format.');
    } finally {
      setIsImporting(false);
    }
  };

  const importJSON = async (jsonText: string) => {
    const data = JSON.parse(jsonText);

    if (data.workspace) {
      // Import workspace
      const workspaceId = await createWorkspace(data.workspace.name || 'Imported Workspace');

      if (data.images && Array.isArray(data.images)) {
        const { saveAnnotation } = await import('@/lib/lightbox-db');
        const base = Date.now();
        for (let i = 0; i < data.images.length; i++) {
          const imgData = data.images[i] as Record<string, unknown>;
          const lightboxImage: LightboxImage = {
            id: `image-${base}-${i}-${Math.random().toString(36).slice(2, 11)}`,
            originalId: (imgData.originalId as number) ?? 0,
            type: ((imgData.type as string) || 'image') as 'image' | 'graph',
            imageUrl: (imgData.imageUrl as string) || '',
            thumbnailUrl: imgData.thumbnailUrl as string | undefined,
            metadata: (imgData.metadata as LightboxImage['metadata']) || {},
            workspaceId,
            position: (imgData.position as LightboxImage['position']) || { x: 0, y: 0, zIndex: 1 },
            size: (imgData.size as LightboxImage['size']) || { width: 400, height: 400 },
            transform: (imgData.transform as LightboxImage['transform']) || {
              opacity: 1,
              brightness: 100,
              contrast: 100,
              rotation: 0,
              flipX: false,
              flipY: false,
              grayscale: false,
            },
            createdAt: (imgData.createdAt as number) || Date.now(),
            updatedAt: Date.now(),
          };
          await saveImage(lightboxImage);
          if (Array.isArray(imgData.annotations)) {
            for (const annotation of imgData.annotations as Array<{ id?: string }>) {
              await saveAnnotation({
                id:
                  annotation.id ||
                  `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                imageId: lightboxImage.id,
                annotation,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          }
        }
      }
    } else if (data.images) {
      // Just images array
      await loadImages(data.images);
    }
  };

  const importTEI = async (xmlText: string) => {
    // Basic TEI XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const surfaces = doc.querySelectorAll('surface');

    if (surfaces.length === 0) {
      toast.error('No images found in TEI XML file');
      return;
    }

    await createWorkspace('Imported from TEI XML');
    const images: Array<{ id: number; type: string; image_iiif: string; shelfmark: string }> = [];

    surfaces.forEach((surface) => {
      const graphic = surface.querySelector('graphic');
      const url = graphic?.getAttribute('url');
      const desc = surface.querySelector('desc')?.textContent || 'Imported image';

      if (url) {
        images.push({
          id: 0,
          type: 'image',
          image_iiif: url,
          shelfmark: desc,
        });
      }
    });

    if (images.length > 0) {
      await loadImages(images as CollectionItem[]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Workspace
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Import Format</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <FileJson className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">
                    Workspace data, images, annotations
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <FileText className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">TEI XML</div>
                  <div className="text-xs text-muted-foreground">
                    TEI format with facsimile surfaces
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Choose File'}
            </Button>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
