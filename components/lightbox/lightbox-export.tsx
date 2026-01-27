'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  Image as ImageIcon,
  X,
  FileJson,
} from 'lucide-react'
import { useLightboxStore } from '@/stores/lightbox-store'
import { getAllWorkspaces, getWorkspaceImages } from '@/lib/lightbox-db'
import type { LightboxWorkspace, LightboxImage } from '@/lib/lightbox-db'

interface LightboxExportProps {
  onClose: () => void
}

export function LightboxExport({ onClose }: LightboxExportProps) {
  const { currentWorkspaceId, images, workspaces } = useLightboxStore()
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image' | 'json' | 'tei'>('pdf')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (!currentWorkspaceId) {
        alert('No workspace selected')
        return
      }

      const workspaceImages = Array.from(images.values()).filter(
        (img) => img.workspaceId === currentWorkspaceId
      )

      switch (exportFormat) {
        case 'pdf':
          await exportAsPDF(workspaceImages)
          break
        case 'image':
          await exportAsImage(workspaceImages)
          break
        case 'json':
          await exportAsJSON(workspaceImages)
          break
        case 'tei':
          await exportAsTEI(workspaceImages)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
      onClose()
    }
  }

  const exportAsPDF = async (workspaceImages: LightboxImage[]) => {
    if (workspaceImages.length === 0) {
      alert('No images to export')
      return
    }

    // Ensure we're in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      alert('PDF export is only available in the browser')
      return
    }

    try {
      // Lazy load jsPDF only when needed (client-side only)
      const jsPDFModule = await import('jspdf')
      const jsPDF = (jsPDFModule as any).default || jsPDFModule
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const imageWidth = pageWidth - 2 * margin
      const imageHeight = pageHeight - 2 * margin

      for (let i = 0; i < workspaceImages.length; i++) {
        if (i > 0) {
          pdf.addPage()
        }

        const image = workspaceImages[i]
        if (!image.imageUrl) continue

        try {
          // Fetch image and convert to base64
          const response = await fetch(image.imageUrl)
          const blob = await response.blob()
          const reader = new FileReader()
          
          await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
              try {
                const base64 = reader.result as string
                pdf.addImage(base64, 'JPEG', margin, margin, imageWidth, imageHeight)
                
                // Add metadata
                pdf.setFontSize(10)
                pdf.text(
                  image.metadata.shelfmark || image.metadata.locus || 'Image',
                  margin,
                  pageHeight - 5
                )
                resolve()
              } catch (err) {
                reject(err)
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (err) {
          console.error(`Failed to add image ${i + 1}:`, err)
        }
      }

      pdf.save(`lightbox-export-${Date.now()}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const exportAsImage = async (workspaceImages: LightboxImage[]) => {
    if (workspaceImages.length === 0) {
      alert('No images to export')
      return
    }

    // Export first selected image or first image in workspace
    const image = workspaceImages[0]
    if (!image.imageUrl) {
      alert('Image URL not available')
      return
    }

    try {
      const response = await fetch(image.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${image.metadata.shelfmark || 'image'}-${image.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Image export failed:', error)
      alert('Failed to export image')
    }
  }

  const exportAsJSON = async (workspaceImages: LightboxImage[]) => {
    const workspace = workspaces.find((w) => w.id === currentWorkspaceId)
    const { getImageAnnotations } = await import('@/lib/lightbox-db')
    
    // Include annotations if available
    const imagesWithAnnotations = await Promise.all(
      workspaceImages.map(async (img) => {
        const annotations = await getImageAnnotations(img.id)
        return {
          id: img.id,
          originalId: img.originalId,
          type: img.type,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          metadata: img.metadata,
          position: img.position,
          size: img.size,
          transform: img.transform,
          annotations: annotations.map((a) => a.annotation),
        }
      })
    )
    
    const exportData = {
      workspace: workspace ? { id: workspace.id, name: workspace.name } : null,
      images: imagesWithAnnotations,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lightbox-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportAsTEI = async (workspaceImages: LightboxImage[]) => {
    const { getImageAnnotations } = await import('@/lib/lightbox-db')
    
    // Basic TEI XML export structure with annotations
    const teiHeader = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Lightbox Export</title>
      </titleStmt>
      <publicationStmt>
        <p>Exported from Digital Lightbox</p>
      </publicationStmt>
      <sourceDesc>
        <p>Digital images from Models of Authority</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <facsimile>
`

    const surfaceElements = await Promise.all(
      workspaceImages.map(async (img) => {
        const annotations = await getImageAnnotations(img.id)
        const annotationElements = annotations
          .map((ann) => {
            const annotation = ann.annotation
            return `      <zone>
        <graphic url="${annotation.target?.selector?.value || ''}"/>
        <note>${annotation.body?.[0]?.value || ''}</note>
      </zone>`
          })
          .join('\n')
        
        return `    <surface>
      <graphic url="${img.imageUrl}"/>
      <desc>${img.metadata.shelfmark || img.metadata.locus || 'Image'}</desc>
${annotationElements ? annotationElements + '\n' : ''}    </surface>`
      })
    )

    const teiFooter = `  </facsimile>
</TEI>`

    const teiContent = teiHeader + surfaceElements.join('\n') + '\n' + teiFooter

    const blob = new Blob([teiContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lightbox-export-${Date.now()}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Workspace
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat('pdf')}
                className={`
                  p-3 border rounded-md text-left transition-colors
                  ${exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                `}
              >
                <FileText className="h-5 w-5 mb-1" />
                <div className="text-sm font-medium">PDF</div>
                <div className="text-xs text-muted-foreground">Document</div>
              </button>
              <button
                onClick={() => setExportFormat('image')}
                className={`
                  p-3 border rounded-md text-left transition-colors
                  ${exportFormat === 'image' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                `}
              >
                <ImageIcon className="h-5 w-5 mb-1" />
                <div className="text-sm font-medium">Image</div>
                <div className="text-xs text-muted-foreground">Single image</div>
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`
                  p-3 border rounded-md text-left transition-colors
                  ${exportFormat === 'json' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                `}
              >
                <FileJson className="h-5 w-5 mb-1" />
                <div className="text-sm font-medium">JSON</div>
                <div className="text-xs text-muted-foreground">Data export</div>
              </button>
              <button
                onClick={() => setExportFormat('tei')}
                className={`
                  p-3 border rounded-md text-left transition-colors
                  ${exportFormat === 'tei' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                `}
              >
                <FileText className="h-5 w-5 mb-1" />
                <div className="text-sm font-medium">TEI XML</div>
                <div className="text-xs text-muted-foreground">TEI format</div>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  )
}
