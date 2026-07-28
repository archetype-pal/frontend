'use client';

import * as React from 'react';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { readDocumentNonce } from '@/lib/csp-nonce';
import { buildCollectionPrintHtml } from '@/lib/collection-print';
import type { NamedCollection } from '@/lib/collection-storage';
import { useModelLabels } from '@/contexts/model-labels-context';

function writePrintDocument(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function PrintCollectionButton({ collection }: { collection: NamedCollection }) {
  const t = useTranslations('collection');
  const { getLabel } = useModelLabels();
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error(t('print.popupBlocked'));
      return;
    }

    setIsPrinting(true);
    writePrintDocument(
      win,
      '<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:16px">Preparing collection print view...</body></html>'
    );

    try {
      writePrintDocument(
        win,
        await buildCollectionPrintHtml(collection, getLabel('siteTitle'), {
          nonce: readDocumentNonce(),
        })
      );
    } catch {
      win.close();
      toast.error(t('print.failed'));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handlePrint()}
      disabled={isPrinting}
    >
      <Printer className="mr-2 h-4 w-4" />
      {isPrinting ? t('print.preparing') : t('print.print')}
    </Button>
  );
}
