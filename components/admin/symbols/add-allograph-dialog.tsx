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

interface AddAllographDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  characterName: string
  onSubmit: (name: string) => void
  loading?: boolean
}

export function AddAllographDialog({
  open,
  onOpenChange,
  characterName,
  onSubmit,
  loading = false,
}: AddAllographDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim())
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              New Allograph for &ldquo;{characterName}&rdquo;
            </DialogTitle>
          </DialogHeader>
          <div className='mt-4 space-y-1.5'>
            <Label htmlFor='allo-name'>Allograph Name</Label>
            <Input
              id='allo-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. a (minuscule), A (majuscule)...'
              autoFocus
            />
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
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
