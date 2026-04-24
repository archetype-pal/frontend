'use client';

import * as React from 'react';
import { Wrench, Star, Plus, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { HandType } from '@/types/hands';
import type { Allograph } from '@/types/allographs';

interface AnnotationHeaderProps {
  annotationsEnabled: boolean;
  onToggleAnnotations: () => void;
  unsavedCount: number;
  selectedAnnotationsCount?: number;
  showUnsavedCount?: boolean;
  onAllographSelect: (allograph: Allograph | undefined) => void;
  onHandSelect: (hand: HandType | undefined) => void;
  allographs: Allograph[];
  hands: HandType[];
  onAllographHover?: (allograph: Allograph | undefined) => void;
  activeAllographCount?: number;
  activeAllographLabel?: string;
  onOpenAllographModal?: () => void;
  selectedAllographId?: number | null;
  selectedHandId?: number | null;
  onOpenFilterPanel?: () => void;
  isVisibilityFilterActive?: boolean;
  onOpenSettingsPanel?: () => void;
  isSettingsActive?: boolean;
  showSettingsButton?: boolean;
}

export function AnnotationHeader({
  annotationsEnabled,
  onToggleAnnotations,
  unsavedCount = 0,
  selectedAnnotationsCount = 0,
  showUnsavedCount = true,
  onAllographSelect,
  onHandSelect,
  allographs,
  hands,
  onAllographHover,
  activeAllographCount,
  activeAllographLabel,
  onOpenAllographModal,
  selectedAllographId,
  selectedHandId,
  onOpenFilterPanel,
  isVisibilityFilterActive = false,
  onOpenSettingsPanel,
  isSettingsActive = false,
  showSettingsButton = true,
}: AnnotationHeaderProps) {
  const [selectedAllograph, setSelectedAllograph] = React.useState<string>('');

  React.useEffect(() => {
    setSelectedAllograph(selectedAllographId != null ? selectedAllographId.toString() : '');
  }, [selectedAllographId]);

  React.useEffect(() => {
    if (!selectedAllograph) return;
    const exists = allographs.some((a) => a.id.toString() === selectedAllograph);
    if (!exists) {
      setSelectedAllograph('');
      onAllographSelect(undefined);
      onAllographHover?.(undefined);
    }
  }, [allographs, selectedAllograph, onAllographSelect, onAllographHover]);

  const handleAllographChange = (allographId: string) => {
    onAllographHover?.(undefined);

    if (allographId === '__all__') {
      setSelectedAllograph('');
      onAllographSelect(undefined);
      return;
    }

    setSelectedAllograph(allographId);
    const selectedAllographData = allographs.find((a) => a.id.toString() === allographId);
    onAllographSelect(selectedAllographData);
  };

  const handleAllographHover = (allographId: string) => {
    const a = allographs.find((x) => x.id.toString() === allographId);
    onAllographHover?.(a);
  };

  const handleHandChange = (handId: string) => {
    if (handId === '__all__') {
      onHandSelect(undefined);
      return;
    }

    const selectedHandData = hands.find((h) => h.id.toString() === handId);
    onHandSelect(selectedHandData);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Annotations</span>
          <div className="flex">
            <button
              onClick={onToggleAnnotations}
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
        {onOpenFilterPanel && (
          <Button
            variant={isVisibilityFilterActive ? 'default' : 'outline'}
            className="h-8 px-3 flex items-center gap-2"
            onClick={() => onOpenFilterPanel()}
            type="button"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter Annotations</span>
          </Button>
        )}
        {showUnsavedCount && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">Unsaved</span>
            <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-medium text-gray-600 bg-gray-100 rounded">
              {unsavedCount}
            </span>
          </div>
        )}
        {selectedAnnotationsCount > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">Selected</span>
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded">
              {selectedAnnotationsCount}
            </span>
          </div>
        )}

        <div className="flex items-center space-x-1">
          {showSettingsButton && (
            <Button
              variant={isSettingsActive ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenSettingsPanel?.()}
              type="button"
              title="Settings"
            >
              <Wrench className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" size="icon" className="h-8 w-8">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Star className="h-4 w-4" />
            <Plus className="h-3 w-3 absolute -top-1 -right-1" />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Select
          value={selectedHandId != null ? selectedHandId.toString() : '__all__'}
          onValueChange={handleHandChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Hand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Select Hand</SelectItem>
            {hands.map((hand) => (
              <SelectItem key={hand.id} value={hand.id.toString()}>
                {hand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-[200px]">
          <SearchableSelect
            options={allographs.map((allograph) => ({
              value: allograph.id.toString(),
              label: allograph.name,
            }))}
            value={selectedAllograph || null}
            onValueChange={(value) => handleAllographChange(value ?? '__all__')}
            onOptionHover={(value) => {
              if (!value) {
                onAllographHover?.(undefined);
                return;
              }
              handleAllographHover(value);
            }}
            placeholder="Select Allograph"
            searchPlaceholder="Search allographs..."
            emptyText="No allographs found."
            clearLabel="All allographs"
            triggerClassName="w-full"
            contentClassName="z-[250]"
          />
        </div>

        <Button
          variant="outline"
          className="h-8 px-2 flex items-center gap-2"
          onClick={() => onOpenAllographModal?.()}
          disabled={!activeAllographLabel}
          title={
            activeAllographLabel
              ? `${activeAllographLabel}: ${activeAllographCount ?? 0}`
              : 'Select an allograph first'
          }
        >
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{activeAllographCount ?? 0}</span>
        </Button>
      </div>
    </div>
  );
}
