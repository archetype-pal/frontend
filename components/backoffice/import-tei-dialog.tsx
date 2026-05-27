'use client';

/**
 * Import a TEI file as a new Draft ImageText (Phase H.13).
 *
 * Flow: pick item_image / type / language, choose a .tei/.xml file, validate
 * its well-formedness against the H.10 endpoint, and on success create the
 * ImageText with the uploaded TEI as content, then open the editor. Replacing
 * an existing ImageText is deliberately out of scope.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { createImageText, validateTei, type TeiValidationError } from '@/services/image-texts';

type Kind = 'Transcription' | 'Translation';

export function ImportTeiDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [itemImage, setItemImage] = useState('');
  const [type, setType] = useState<Kind>('Transcription');
  const [language, setLanguage] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [errors, setErrors] = useState<TeiValidationError[] | null>(null);
  const [validating, setValidating] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !token) return;
    const text = await file.text();
    setFileName(file.name);
    setContent(text);
    setValidating(true);
    setErrors(null);
    try {
      const result = await validateTei(text, token);
      setErrors(result.errors);
    } catch {
      setErrors([{ line: 0, col: 0, message: 'Could not reach the validator' }]);
    } finally {
      setValidating(false);
    }
  }

  const createMut = useMutation({
    mutationFn: () =>
      createImageText(token!, {
        item_image: Number(itemImage),
        type,
        language,
        content: content ?? '',
      }),
    onSuccess: (saved) => {
      toast.success(`Imported ${saved.type.toLowerCase()} #${saved.id}`);
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
      onOpenChange(false);
      router.push(`/backoffice/image-texts/${saved.id}`);
    },
    onError: (err: Error) =>
      toast.error('Import failed', { description: err.message.slice(0, 240) }),
  });

  const itemImageNumber = Number(itemImage);
  const teiValid = errors !== null && errors.length === 0;
  const canSubmit =
    !!token &&
    Number.isFinite(itemImageNumber) &&
    itemImageNumber > 0 &&
    !!content &&
    teiValid &&
    !validating &&
    !createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import TEI file</DialogTitle>
          <DialogDescription>
            Creates a Draft image-text from a valid TEI document. You can edit it next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="import-tei-image">Item image id</Label>
            <Input
              id="import-tei-image"
              inputMode="numeric"
              value={itemImage}
              onChange={(e) => setItemImage(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 5504"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Kind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transcription">Transcription</SelectItem>
                  <SelectItem value="Translation">Translation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-tei-lang">Language</Label>
              <Input
                id="import-tei-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="la, en, enm…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-tei-file">TEI file</Label>
            <Input
              id="import-tei-file"
              type="file"
              accept=".tei,.xml,application/xml,text/xml"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            {fileName && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Upload className="h-3 w-3" /> {fileName}
              </p>
            )}
            {validating && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Validating…
              </p>
            )}
            {errors !== null &&
              !validating &&
              (teiValid ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Valid TEI
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {errors[0] ? `Line ${errors[0].line}: ${errors[0].message}` : 'Invalid TEI'}
                </p>
              ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Import draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
