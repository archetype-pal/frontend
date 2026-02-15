'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CHARACTER_TYPES = ['', 'Letter', 'Punctuation', 'Numeral', 'Symbol', 'Abbreviation']

interface AddCharacterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; type: string | null }) => void
  loading?: boolean
}

export function AddCharacterDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: AddCharacterDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), type: type || null })
    setName('')
    setType('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Character</DialogTitle>
          </DialogHeader>
          <div className='mt-4 space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='char-name'>Name</Label>
              <Input
                id='char-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. A, B, ampersand...'
                autoFocus
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='char-type'>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id='char-type'>
                  <SelectValue placeholder='None' />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_TYPES.map((t) => (
                    <SelectItem key={t || '__none'} value={t || '__none'}>
                      {t || 'None'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className='mt-6'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={!name.trim() || loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
