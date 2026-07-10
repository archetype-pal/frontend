'use client';

import * as React from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { readDocumentNonce } from '@/lib/csp-nonce';
import { buildCollectionPrintHtml } from '@/lib/collection-print';
import type { NamedCollection } from '@/lib/collection-storage';

function writePrintDocument(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function PrintCollectionButton({ collection }: { collection: NamedCollection }) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Pop-up blocked. Allow pop-ups for this site to print.');
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
        await buildCollectionPrintHtml(collection, { nonce: readDocumentNonce() })
      );
    } catch {
      win.close();
      toast.error('Could not prepare collection print view.');
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
      {isPrinting ? 'Preparing...' : 'Print'}
    </Button>
  );
}
