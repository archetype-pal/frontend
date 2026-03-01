import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2 } from 'lucide-react';

export function EntityEditorActions({
  dirty,
  isSaving,
  onSave,
  onDelete,
}: {
  dirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Delete
      </Button>
      <Button size="sm" onClick={onSave} disabled={!dirty || isSaving}>
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5 mr-1" />
        )}
        Save
      </Button>
    </div>
  );
}
