'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Loader2, Type, Layers, Tag, ChevronRight } from 'lucide-react';
import { SymbolTreeSidebar } from '@/components/backoffice/symbols/symbol-tree-sidebar';
import { CharacterDetail } from '@/components/backoffice/symbols/character-detail';
import {
  getCharacters,
  getComponents,
  getFeatures,
  getPositions,
  createCharacter,
} from '@/services/backoffice/symbols';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';

export default function SymbolsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState('characters');

  const characters = useQuery({
    queryKey: backofficeKeys.characters.all(),
    queryFn: () => getCharacters(token!),
    enabled: !!token,
  });

  const components = useQuery({
    queryKey: backofficeKeys.components.all(),
    queryFn: () => getComponents(token!),
    enabled: !!token,
  });

  const features = useQuery({
    queryKey: backofficeKeys.features.all(),
    queryFn: () => getFeatures(token!),
    enabled: !!token,
  });

  const positions = useQuery({
    queryKey: backofficeKeys.positions.all(),
    queryFn: () => getPositions(token!),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: (data: { name: string; type: string | null }) => createCharacter(token!, data),
    onSuccess: (newChar) => {
      toast.success('Character created');
      queryClient.invalidateQueries({ queryKey: backofficeKeys.characters.all() });
      setSelectedId(newChar.id);
    },
    onError: (err) => {
      toast.error('Failed to create character', {
        description: formatApiError(err),
      });
    },
  });

  const isLoading =
    characters.isLoading || components.isLoading || features.isLoading || positions.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading symbols structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* Left: tabbed sidebar */}
      <div className="w-80 shrink-0 border-r bg-card">
        <SymbolTreeSidebar
          characters={characters.data ?? []}
          components={components.data ?? []}
          features={features.data ?? []}
          positions={positions.data ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreateCharacter={(data) => createMut.mutate(data)}
          creating={createMut.isPending}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
        />
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedId ? (
          <CharacterDetail
            key={selectedId}
            characterId={selectedId}
            allComponents={components.data ?? []}
            allFeatures={features.data ?? []}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (characters.data ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-6">
              <h2 className="text-xl font-semibold text-foreground text-center">
                Getting Started with Palaeographic Structure
              </h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSidebarTab('components')}
                  className="w-full flex items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground text-sm font-medium">
                    1
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">Create Components</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Define the structural parts of a letter (e.g., ascender, body, descender)
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(components.data ?? []).length} component
                      {(components.data ?? []).length !== 1 ? 's' : ''} so far
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('features')}
                  className="w-full flex items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground text-sm font-medium">
                    2
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">Create Features</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Define the visual characteristics (e.g., straight, curved, split)
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(features.data ?? []).length} feature
                      {(features.data ?? []).length !== 1 ? 's' : ''} so far
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('characters')}
                  className="w-full flex items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground text-sm font-medium">
                    3
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">Create Characters</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add characters and assign allographs with their component-feature combinations
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(characters.data ?? []).length} character
                      {(characters.data ?? []).length !== 1 ? 's' : ''} so far
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <Type className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Palaeographic Structure Editor
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Select a character from the left panel to view and edit its allographs,
                  components, and features.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {(characters.data ?? []).length} characters · {(components.data ?? []).length}{' '}
                components · {(features.data ?? []).length} features
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
