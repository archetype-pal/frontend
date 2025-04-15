'use client'

import * as React from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

const filterSections = [
  {
    id: 'image-availability',
    title: 'Image Availability (2)',
    items: [
      { label: 'Without Image', count: 580 },
      { label: 'With Image', count: 132 },
    ],
  },
  {
    id: 'text-date',
    title: 'Text Date',
    items: [],
  },
  {
    id: 'document-type',
    title: 'Document Type (14)',
    items: [
      { label: 'Charter', count: 367 },
      { label: 'Agreement', count: 29 },
      { label: 'Brieve', count: 24 },
      { label: 'Settlement', count: 20 },
      { label: 'Letter', count: 13 },
    ],
  },
  {
    id: 'repository-city',
    title: 'Repository City (3)',
    items: [
      { label: 'Durham', count: 341 },
      { label: 'Edinburgh', count: 294 },
      { label: 'London', count: 77 },
    ],
  },
  {
    id: 'repository',
    title: 'Repository (5)',
    items: [
      { label: 'Durham, Durham Cathedral Archives', count: 341 },
      { label: 'Edinburgh, National Records of Scotland', count: 294 },
      { label: 'Edinburgh, British Library', count: 47 },
      { label: 'Edinburgh, National Library of Scotland', count: 32 },
      { label: 'London, The National Archives', count: 30 },
    ],
  },
]

export function ManuscriptsFilters() {
  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >(Object.fromEntries(filterSections.map((section) => [section.id, true])))

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  return (
    <div className='w-64 bg-white border-r flex flex-col'>
      <div className='p-4 border-b'>
        <div className='space-y-2'>
          <h3 className='font-medium text-sm'>Keywords</h3>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-gray-400' />
            <Input className='pl-8' placeholder='Search...' />
          </div>
        </div>
      </div>
      <ScrollArea className='flex-1'>
        <div className='p-4'>
          {filterSections.map((section) => (
            <div key={section.id} className='mb-4'>
              <button
                onClick={() => toggleSection(section.id)}
                className='flex items-center justify-between w-full text-sm font-medium text-left mb-2'
              >
                <span>{section.title}</span>
                {section.items.length > 0 &&
                  (expandedSections[section.id] ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </button>
              {expandedSections[section.id] && section.items.length > 0 && (
                <div className='space-y-2 ml-2'>
                  {section.items.map((item) => (
                    <label
                      key={item.label}
                      className='flex items-center justify-between text-sm'
                    >
                      <div className='flex items-center gap-2'>
                        <input
                          type='checkbox'
                          className='rounded border-gray-300'
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className='text-gray-500'>{item.count}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
