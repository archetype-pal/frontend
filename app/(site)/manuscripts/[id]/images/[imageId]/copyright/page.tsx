import { Construction } from 'lucide-react';

export default function CopyrightTabPage() {
  return (
    <div className="px-4 py-6">
      <div className="flex max-w-3xl items-start gap-3 rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        <Construction className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">Under construction</p>
          <p className="mt-1">
            Image copyright information will be available here in a future release.
          </p>
        </div>
      </div>
    </div>
  );
}
