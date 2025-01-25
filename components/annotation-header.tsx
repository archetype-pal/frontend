'use client'

import * as React from 'react'
import { Wrench, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AnnotationHeaderProps {
  annotationsEnabled: boolean
  onToggleAnnotations: (enabled: boolean) => void
  unsavedCount: number
}

export function AnnotationHeader({
  annotationsEnabled,
  onToggleAnnotations,
  unsavedCount = 0,
}: AnnotationHeaderProps) {
  return (
    <div className='flex items-center justify-between px-4 py-2 bg-white border-b'>
      <div className='flex items-center space-x-2'>
        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium text-gray-700'>Annotations</span>
          <div className='flex'>
            <button
              onClick={() => onToggleAnnotations(!annotationsEnabled)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                annotationsEnabled
                  ? 'bg-slate-600 text-white'
                  : 'bg-white text-gray-900 border shadow-sm'
              }`}
              style={{
                borderTopLeftRadius: '4px',
                borderBottomLeftRadius: '4px',
                borderTopRightRadius: '4px',
                borderBottomRightRadius: '4px',
              }}
            >
              {annotationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className='flex items-center space-x-1'>
          <span className='text-sm text-gray-600'>Unsaved</span>
          <span className='inline-flex items-center justify-center w-6 h-6 text-sm font-medium text-gray-600 bg-gray-100 rounded'>
            {unsavedCount}
          </span>
        </div>

        <div className='flex items-center space-x-1'>
          <Button variant='outline' size='icon' className='h-8 w-8'>
            <Wrench className='h-4 w-4' />
          </Button>
          <Button variant='outline' size='icon' className='h-8 w-8'>
            <Star className='h-4 w-4' />
          </Button>
          <Button variant='outline' size='icon' className='h-8 w-8'>
            <Star className='h-4 w-4' />
            <Plus className='h-3 w-3 absolute -top-1 -right-1' />
          </Button>
        </div>
      </div>

      <div className='flex items-center space-x-2'>
        <Select defaultValue='main-hand'>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Main Hand' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='main-hand'>Main Hand</SelectItem>
            <SelectItem value='o'>o</SelectItem>
            <SelectItem value='p'>p</SelectItem>
            <SelectItem value='q'>q</SelectItem>
            <SelectItem value='r-2-shaped'>r, 2-shaped</SelectItem>
          </SelectContent>
        </Select>

        <Input className='w-[100px]' placeholder='R' />

        <div className='flex items-center space-x-1 bg-white rounded-md border px-2 py-1'>
          <Eye className='h-4 w-4 text-gray-500' />
          <span className='text-sm'>7</span>
        </div>
      </div>
    </div>
  )
}
