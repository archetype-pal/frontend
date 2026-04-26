import { fetchImageTextsForImage, type ImageTextDetail } from '@/services/image-texts';
import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { StaffEditLink } from '@/components/text/staff-edit-link';

interface PageProps {
  params: Promise<{ id: string; imageId: string }>;
}

const STATUS_PALETTE: Record<ImageTextDetail['status'], string> = {
  Live: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  Reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Draft: 'bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: ImageTextDetail['status'] }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_PALETTE[status]}`}>
      {status}
    </span>
  );
}

export default async function TextsTabPage({ params }: PageProps) {
  const { imageId } = await params;
  const texts = await fetchImageTextsForImage(imageId);

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
              <StatusBadge status={text.status} />
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
