'use client'

import * as React from 'react'
import { Wrench, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchHands, /* fetchAllographs */ } from '@/services/manuscripts'
import type { HandType } from '@/types/hands'
import type { Allograph } from '@/types/allographs'
// import { toast } from "sonner"

interface AnnotationHeaderProps {
  annotationsEnabled: boolean
  onToggleAnnotations: (enabled: boolean) => void
  unsavedCount: number
  imageId?: string
  onAllographSelect: (allograph: Allograph | undefined) => void
  onHandSelect: (hand: HandType | undefined) => void
  allographs: Allograph[]
}

export function AnnotationHeader({
  annotationsEnabled,
  onToggleAnnotations,
  unsavedCount = 0,
  imageId,
  onAllographSelect,
  onHandSelect,
  allographs,
}: AnnotationHeaderProps) {
  const [hands, setHands] = React.useState<HandType[]>([])
  // const [allographs, setAllographs] = React.useState<Allograph[]>([])
  const [selectedHand, setSelectedHand] = React.useState<string>('')
  const [selectedAllograph, setSelectedAllograph] = React.useState<string>('')
  const [, setLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        setLoading(true)
        if (!imageId) {
          if (isMounted) setHands([])
          return
        }
        const handsData = await fetchHands(imageId)
        if (isMounted) setHands(handsData.results)
      } catch {
        if (isMounted) setHands([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [imageId])

  const handleAllographChange = (allographId: string) => {
    setSelectedAllograph(allographId)
    const selectedAllographData = allographs.find(
      (a) => a.id.toString() === allographId
    )
    onAllographSelect(selectedAllographData)
  }

  const handleHandChange = (handId: string) => {
    setSelectedHand(handId)
    const selectedHandData = hands.find((h) => h.id.toString() === handId)
    onHandSelect(selectedHandData)
  }

  return (
    <div className='flex items-center justify-between px-4 py-2 bg-white border-b'>
      <div className='flex items-center space-x-2'>
        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium text-gray-700'>Annotations</span>
          <div className='flex'>
            <button
              onClick={() => onToggleAnnotations(!annotationsEnabled)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${annotationsEnabled
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
        <Select value={selectedHand} onValueChange={handleHandChange}>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select Hand' />
          </SelectTrigger>
          <SelectContent>
            {hands.map((hand) => (
              <SelectItem key={hand.id} value={hand.id.toString()}>
                {hand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedAllograph} onValueChange={handleAllographChange}>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select Allograph' />
          </SelectTrigger>
          <SelectContent>
            {allographs.map((allograph) => (
              <SelectItem key={allograph.id} value={allograph.id.toString()}>
                {allograph.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='flex items-center space-x-1 bg-white rounded-md border px-2 py-1'>
          <Eye className='h-4 w-4 text-gray-500' />
          <span className='text-sm'>7</span>
        </div>
      </div>
    </div>
  )
}
