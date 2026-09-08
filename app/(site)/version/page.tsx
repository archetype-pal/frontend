import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Version',
};

// The stamp is set in the runner stage, after `next build` has already run, so
// a prerendered page would capture the builder stage's empty env instead.
export const dynamic = 'force-dynamic';

export default function VersionPage() {
  const version = process.env.APP_VERSION || 'dev';
  const commit = process.env.APP_COMMIT || 'unknown';

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Version</h1>
      <dl className="space-y-4">
        <div>
          <dt className="text-muted-foreground mb-2">Release:</dt>
          <dd>
            <code className="inline-block rounded bg-muted px-3 py-2 text-sm">{version}</code>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-2">Commit:</dt>
          <dd>
            <code className="inline-block rounded bg-muted px-3 py-2 text-sm">{commit}</code>
          </dd>
        </div>
      </dl>
    </main>
  );
}
