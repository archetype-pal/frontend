import { getServerAuthToken } from '@/lib/auth-token-server';
import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { StaffEditLink } from '@/components/text/staff-edit-link';
import { TextStatusBadge } from '@/components/text/text-status-badge';
import { loadImageTexts } from '../image-texts';

interface PageProps {
  params: Promise<{ id: string; imageId: string }>;
}

export default async function TextsTabPage({ params }: PageProps) {
  const { imageId } = await params;
  const texts = await loadImageTexts(imageId, await getServerAuthToken());

  if (texts.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
          No texts have been recorded for this image.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {texts.map((text) => (
        <article key={text.id} className="rounded-md border bg-card">
          <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">{text.type}</h2>
              {text.language && (
                <span className="text-xs text-muted-foreground">{text.language}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <TextStatusBadge status={text.status} />
              <StaffEditLink textId={text.id} />
            </div>
          </header>
          <div className="px-4 py-4">
            <ImageTextViewer html={text.content} />
          </div>
        </article>
      ))}
    </div>
  );
}
