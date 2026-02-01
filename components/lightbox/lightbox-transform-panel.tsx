'use client'

import * as React from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useLightboxStore, useSelectedImages } from '@/stores/lightbox-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LightboxTransformPanel() {
  const { updateImage, saveHistory } = useLightboxStore()
  const selectedImages = useSelectedImages()
  const firstImage = selectedImages[0]

  const handleOpacityChange = (value: number[]) => {
    saveHistory()
    const opacity = value[0] / 100
    selectedImages.forEach((img) =>
      updateImage(img.id, { transform: { ...img.transform, opacity } })
    )
  }

  const handleBrightnessChange = (value: number[]) => {
    saveHistory()
    const brightness = value[0]
    selectedImages.forEach((img) =>
      updateImage(img.id, { transform: { ...img.transform, brightness } })
    )
  }

  const handleContrastChange = (value: number[]) => {
    saveHistory()
    const contrast = value[0]
    selectedImages.forEach((img) =>
      updateImage(img.id, { transform: { ...img.transform, contrast } })
    )
  }

  const handleGrayscaleToggle = () => {
    saveHistory()
    selectedImages.forEach((img) =>
      updateImage(img.id, {
        transform: { ...img.transform, grayscale: !img.transform.grayscale },
      })
    )
  }

  const handleReset = () => {
    saveHistory()
    selectedImages.forEach((img) =>
      updateImage(img.id, {
        transform: {
          opacity: 1,
          brightness: 100,
          contrast: 100,
          rotation: 0,
          flipX: false,
          flipY: false,
          grayscale: false,
        },
      })
    )
  }

  if (selectedImages.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Adjust
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="opacity">Opacity</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round((firstImage?.transform.opacity || 1) * 100)}%
              </span>
            </div>
            <Slider
              id="opacity"
              value={[(firstImage?.transform.opacity || 1) * 100]}
              onValueChange={handleOpacityChange}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="brightness">Brightness</Label>
              <span className="text-sm text-muted-foreground">
                {firstImage?.transform.brightness || 100}%
              </span>
            </div>
            <Slider
              id="brightness"
              value={[firstImage?.transform.brightness || 100]}
              onValueChange={handleBrightnessChange}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="contrast">Contrast</Label>
              <span className="text-sm text-muted-foreground">
                {firstImage?.transform.contrast || 100}%
              </span>
            </div>
            <Slider
              id="contrast"
              value={[firstImage?.transform.contrast || 100]}
              onValueChange={handleContrastChange}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGrayscaleToggle}
            >
              {firstImage?.transform.grayscale ? 'Color' : 'Grayscale'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
