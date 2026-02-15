'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { Loader2, Type } from 'lucide-react'
import { SymbolTreeSidebar } from '@/components/admin/symbols/symbol-tree-sidebar'
import { CharacterDetail } from '@/components/admin/symbols/character-detail'
import {
  getCharacters,
  getComponents,
  getFeatures,
  createCharacter,
} from '@/services/admin/symbols'

export default function SymbolsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const characters = useQuery({
    queryKey: ['admin', 'characters'],
    queryFn: () => getCharacters(token!),
    enabled: !!token,
  })

  const components = useQuery({
    queryKey: ['admin', 'components'],
    queryFn: () => getComponents(token!),
    enabled: !!token,
  })

  const features = useQuery({
    queryKey: ['admin', 'features'],
    queryFn: () => getFeatures(token!),
    enabled: !!token,
  })

  const createMut = useMutation({
    mutationFn: (data: { name: string; type: string | null }) =>
      createCharacter(token!, data),
    onSuccess: (newChar) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'characters'] })
      setSelectedId(newChar.id)
    },
  })

  const isLoading =
    characters.isLoading || components.isLoading || features.isLoading

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>
            Loading symbols structure...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-8rem)] -m-6'>
      {/* Left: tree sidebar */}
      <div className='w-72 shrink-0 border-r bg-card'>
        <SymbolTreeSidebar
          characters={characters.data ?? []}
          components={components.data ?? []}
          features={features.data ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreateCharacter={(data) => createMut.mutate(data)}
          creating={createMut.isPending}
        />
      </div>

      {/* Right: detail panel */}
      <div className='flex-1 overflow-y-auto p-6'>
        {selectedId ? (
          <CharacterDetail
            key={selectedId}
            characterId={selectedId}
            allComponents={components.data ?? []}
            allFeatures={features.data ?? []}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center space-y-3'>
              <Type className='h-12 w-12 mx-auto text-muted-foreground/30' />
              <div>
                <p className='text-lg font-medium text-muted-foreground'>
                  Symbols Structure Editor
                </p>
                <p className='text-sm text-muted-foreground/70 mt-1'>
                  Select a character from the left panel to view and edit its
                  allographs, components, and features.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
