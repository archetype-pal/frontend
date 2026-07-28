'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FeatureCheckboxProps {
  featureId: number;
  name: string;
  checked: boolean;
  setByDefault: boolean;
  onToggle: (featureId: number, checked: boolean) => void;
  onToggleDefault: (featureId: number, setByDefault: boolean) => void;
  disabled?: boolean;
}

export function FeatureCheckbox({
  featureId,
  name,
  checked,
  setByDefault,
  onToggle,
  onToggleDefault,
  disabled = false,
}: FeatureCheckboxProps) {
  const t = useTranslations('backoffice');
  const checkboxId = `feature-${featureId}`;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={(v) => onToggle(featureId, !!v)}
          disabled={disabled}
        />
        <Label
          htmlFor={checkboxId}
          className={cn(
            'text-sm font-normal cursor-pointer select-none',
            !checked && 'text-muted-foreground'
          )}
        >
          {name}
        </Label>
      </div>
      {checked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onToggleDefault(featureId, !setByDefault)}
              disabled={disabled}
            >
              <Badge
                variant={setByDefault ? 'default' : 'outline'}
                className={cn(
                  'text-[10px] px-1.5 py-0 cursor-pointer',
                  !setByDefault && 'text-muted-foreground'
                )}
              >
                {setByDefault ? t('symbols.badgeDefault') : t('symbols.badgeOptional')}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {setByDefault ? t('symbols.clickToMakeOptional') : t('symbols.clickToSetDefault')}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
