'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, Link2, Plus, Star, Users, ChevronDown } from 'lucide-react'
import type { Allograph } from '@/types/allographs'

interface Annotation {
  id: string
  type: 'editorial'
  x: number
  y: number
  width: number
  height: number
  content: string
  selectedAllograph?: Allograph
  components?: Record<string, Record<string, boolean>>
}

interface AnnotationPopupProps {
  annotation: Annotation
  onClose: () => void
  onUpdate: (annotation: Annotation) => void
  style?: React.CSSProperties
}

export function AnnotationPopup({
  annotation,
  onClose,
  onUpdate,
  style,
}: AnnotationPopupProps) {
  const [expandedSections, setExpandedSections] = React.useState(() => {
    if (annotation.selectedAllograph) {
      return Object.fromEntries(
        annotation.selectedAllograph.components.map((component) => [
          component.component_name,
          true,
        ])
      )
    }
    return {}
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateComponent = (
    componentName: string,
    featureName: string,
    value: boolean
  ) => {
    const newAnnotation = {
      ...annotation,
      components: {
        ...annotation.components,
        [componentName]: {
          ...annotation.components?.[componentName],
          [featureName]: value,
        },
      },
    }
    onUpdate(newAnnotation)
  }

  // Add this function to prevent click propagation
  const handlePopupClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <Card
      className='absolute z-50 w-[500px] bg-white shadow-lg'
      style={style}
      onClick={handlePopupClick}
    >
      <div className='flex items-center justify-between border-b p-2'>
        <div className='flex items-center gap-1'>
          <span className='text-lg font-bold'>{annotation.id.slice(0, 8)}</span>
          <div className='flex gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='bg-green-500 hover:bg-green-600'
            >
              <Check className='h-4 w-4 text-white' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='bg-red-500 hover:bg-red-600'
            >
              <X className='h-4 w-4 text-white' />
            </Button>
            <Button variant='ghost' size='icon' className='bg-gray-100'>
              <Link2 className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon' className='bg-gray-100'>
              <Plus className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon' className='bg-gray-100'>
              <Star className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon' className='bg-gray-100'>
              <Users className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <Tabs defaultValue='components'>
        <TabsList className='w-full justify-start rounded-none border-b'>
          <TabsTrigger value='components' className='flex-1'>
            Components
          </TabsTrigger>
          <TabsTrigger value='aspects' className='flex-1'>
            Aspects
          </TabsTrigger>
          <TabsTrigger value='notes' className='flex-1'>
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value='components' className='p-4'>
          <div className='space-y-4'>
            {annotation.selectedAllograph?.components.map((component) => (
              <div key={component.component_id} className='space-y-2'>
                <button
                  onClick={() => toggleSection(component.component_name)}
                  className='flex w-full items-center justify-between text-lg font-bold'
                >
                  <span>{component.component_name}</span>
                  <ChevronDown
                    className={`h-5 w-5 transform transition-transform ${
                      expandedSections[component.component_name]
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                <div className='grid grid-cols-2 gap-4 pl-4'>
                  {component.features.map((feature) => (
                    <div
                      key={feature.id}
                      className='flex items-center space-x-2'
                    >
                      <Checkbox
                        id={`feature-${feature.id}`}
                        checked={
                          annotation.components?.[component.component_name]?.[
                            feature.name
                          ] ?? feature.set_by_default
                        }
                        onCheckedChange={(checked) =>
                          updateComponent(
                            component.component_name,
                            feature.name,
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor={`feature-${feature.id}`}>
                        {feature.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='aspects' className='p-4'>
          <p>Aspects editing coming soon...</p>
        </TabsContent>

        <TabsContent value='notes' className='p-4'>
          <textarea
            className='h-32 w-full rounded border p-2'
            value={annotation.content}
            onChange={(e) =>
              onUpdate({ ...annotation, content: e.target.value })
            }
            placeholder='Add notes here...'
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
