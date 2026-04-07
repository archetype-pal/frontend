'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type FilterOption = {
  id: number;
  name: string;
};

interface AnnotationFilterPanelProps {
  isOpen: boolean;
  transform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  allographs: FilterOption[];
  hands: FilterOption[];
  selectedAllographIds: number[];
  selectedHandIds: number[];
  showEditorialToggle: boolean;
  showEditorial: boolean;
  showPublicAnnotations: boolean;
  onClose: () => void;
  onToggleAllAllographs: () => void;
  onToggleAllHands: () => void;
  onToggleAllograph: (allographId: number) => void;
  onToggleHand: (handId: number) => void;
  onToggleEditorial: () => void;
  onTogglePublicAnnotations: () => void;
}

export function AnnotationFilterPanel({
  isOpen,
  transform,
  dragHandleProps,
  allographs,
  hands,
  selectedAllographIds,
  selectedHandIds,
  showEditorialToggle,
  showEditorial,
  showPublicAnnotations,
  onClose,
  onToggleAllAllographs,
  onToggleAllHands,
  onToggleAllograph,
  onToggleHand,
  onToggleEditorial,
  onTogglePublicAnnotations,
}: AnnotationFilterPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed top-24 right-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-lg"
      style={{ transform }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
        {...dragHandleProps}
      >
        <h3 className="text-base font-semibold">Filter Annotations</h3>
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto px-4 py-4">
        <div className="grid gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Allographs</h4>
              <Button variant="outline" size="sm" type="button" onClick={onToggleAllAllographs}>
                Toggle All
              </Button>
            </div>

            <Separator className="mb-3" />

            <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
              {allographs.length ? (
                allographs.map((allograph) => (
                  <label
                    key={allograph.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAllographIds.includes(allograph.id)}
                      onChange={() => onToggleAllograph(allograph.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-foreground">{allograph.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No allographs available.</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Hands</h4>
              <Button variant="outline" size="sm" type="button" onClick={onToggleAllHands}>
                Toggle All
              </Button>
            </div>

            <Separator className="mb-3" />

            <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
              {hands.length ? (
                hands.map((hand) => (
                  <label
                    key={hand.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedHandIds.includes(hand.id)}
                      onChange={() => onToggleHand(hand.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-foreground">{hand.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hands available.</p>
              )}
            </div>

            <div className="pt-4">
              <Separator className="mb-3" />

              {showEditorialToggle && (
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={showEditorial}
                    onChange={onToggleEditorial}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-foreground">[Digipal Editor]</span>
                </label>
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={showPublicAnnotations}
                  onChange={onTogglePublicAnnotations}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-foreground">Public Annotations</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
