import type { Metadata } from 'next';
import { promises as fs } from 'fs';

export const metadata: Metadata = {
  title: 'Version',
};

export const dynamic = 'force-dynamic';

async function readDockerImageHash() {
  try {
    const value = await fs.readFile('/app/.docker-image-hash', 'utf8');
    return value.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export default async function VersionPage() {
  const dockerImageHash = await readDockerImageHash();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Version</h1>
      <p className="text-muted-foreground mb-2">Running docker image hash:</p>
      <code className="inline-block rounded bg-muted px-3 py-2 text-sm">{dockerImageHash}</code>
    </main>
  );
}
