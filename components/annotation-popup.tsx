'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, Link2, Plus, Star, Users, ChevronDown } from 'lucide-react'

interface Annotation {
  id: string
  type: 'editorial'
  x: number
  y: number
  width: number
  height: number
  content: string
  components?: {
    head?: {
      brokenArc?: boolean
      horizontallyExtended?: boolean
      looped?: boolean
      ruched?: boolean
      swellingTapering?: boolean
    }
    stem?: {
      crossed?: boolean
      extended?: boolean
      onBaseline?: boolean
    }
  }
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
  const [expandedSections, setExpandedSections] = React.useState({
    head: true,
    stem: true,
  })

  const toggleSection = (section: 'head' | 'stem') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateComponent = (
    section: 'head' | 'stem',
    field: string,
    value: boolean
  ) => {
    const newAnnotation = {
      ...annotation,
      components: {
        ...annotation.components,
        [section]: {
          ...annotation.components?.[section],
          [field]: value,
        },
      },
    }
    onUpdate(newAnnotation)
  }

  return (
    <Card className='absolute z-50 w-[500px] bg-white shadow-lg' style={style}>
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
            <div className='space-y-2'>
              <button
                onClick={() => toggleSection('head')}
                className='flex w-full items-center justify-between text-lg font-bold'
              >
                <span>Head</span>
                <ChevronDown
                  className={`h-5 w-5 transform transition-transform ${
                    expandedSections.head ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.head && (
                <div className='grid grid-cols-2 gap-4 pl-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='broken-arc'
                        checked={annotation.components?.head?.brokenArc}
                        onCheckedChange={(checked) =>
                          updateComponent(
                            'head',
                            'brokenArc',
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor='broken-arc'>broken arc</label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='horizontally-extended'
                        checked={
                          annotation.components?.head?.horizontallyExtended
                        }
                        onCheckedChange={(checked) =>
                          updateComponent(
                            'head',
                            'horizontallyExtended',
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor='horizontally-extended'>
                        horizontally extended
                      </label>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='looped'
                        checked={annotation.components?.head?.looped}
                        onCheckedChange={(checked) =>
                          updateComponent('head', 'looped', checked as boolean)
                        }
                      />
                      <label htmlFor='looped'>looped</label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='ruched'
                        checked={annotation.components?.head?.ruched}
                        onCheckedChange={(checked) =>
                          updateComponent('head', 'ruched', checked as boolean)
                        }
                      />
                      <label htmlFor='ruched'>ruched</label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='swelling-tapering'
                        checked={annotation.components?.head?.swellingTapering}
                        onCheckedChange={(checked) =>
                          updateComponent(
                            'head',
                            'swellingTapering',
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor='swelling-tapering'>
                        swelling/tapering
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <button
                onClick={() => toggleSection('stem')}
                className='flex w-full items-center justify-between text-lg font-bold'
              >
                <span>Stem</span>
                <ChevronDown
                  className={`h-5 w-5 transform transition-transform ${
                    expandedSections.stem ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.stem && (
                <div className='grid grid-cols-2 gap-4 pl-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='crossed'
                        checked={annotation.components?.stem?.crossed}
                        onCheckedChange={(checked) =>
                          updateComponent('stem', 'crossed', checked as boolean)
                        }
                      />
                      <label htmlFor='crossed'>crossed</label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='extended'
                        checked={annotation.components?.stem?.extended}
                        onCheckedChange={(checked) =>
                          updateComponent(
                            'stem',
                            'extended',
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor='extended'>extended</label>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='on-baseline'
                        checked={annotation.components?.stem?.onBaseline}
                        onCheckedChange={(checked) =>
                          updateComponent(
                            'stem',
                            'onBaseline',
                            checked as boolean
                          )
                        }
                      />
                      <label htmlFor='on-baseline'>on the baseline</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
