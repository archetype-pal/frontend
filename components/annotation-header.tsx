'use client'

import * as React from 'react'
import { Wrench, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [hands, setHands] = React.useState<{ id: string; name: string }[]>([])
  const [allographs, setAllographs] = React.useState<
    { id: string; name: string }[]
  >([])

  React.useEffect(() => {
    async function fetchHands() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hands/`
        )
        const data = await response.json()
        setHands(data.results)
      } catch (error) {
        console.error('Failed to fetch hands:', error)
      }
    }

    async function fetchAllographs() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/symbols_structure/allographs/`
        )
        const data = await response.json()

        setAllographs(data)
      } catch (error) {
        console.error('Failed to fetch allographs:', error)
      }
    }

    fetchHands()
    fetchAllographs()
  }, [])

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
        <Select>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select Hand' />
          </SelectTrigger>
          <SelectContent>
            {hands.map((hand) => (
              <SelectItem key={hand.id} value={hand.name}>
                {hand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select Allograph' />
          </SelectTrigger>
          <SelectContent>
            {allographs.map((allograph) => (
              <SelectItem key={allograph.id} value={allograph.name}>
                {allograph.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
