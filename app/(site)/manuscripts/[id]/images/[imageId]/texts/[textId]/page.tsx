import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchImageText } from '@/services/image-texts';
import { ImageTextViewer } from '@/components/text/image-text-viewer';

interface PageProps {
  params: Promise<{ id: string; imageId: string; textId: string }>;
}

export default async function ImageTextDetailPage({ params }: PageProps) {
  const { id, imageId, textId } = await params;
  const text = await fetchImageText(textId);

  if (!text) {
    return (
      <div className="px-4 py-6">
        <p className="text-muted-foreground">Text not found.</p>
        <Link
          href={`/manuscripts/${id}/images/${imageId}/texts`}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to texts
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/manuscripts/${id}/images/${imageId}/texts`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to texts
          </Link>
          <h2 className="mt-2 text-lg font-semibold">{text.type}</h2>
          {text.language && <p className="text-sm text-muted-foreground">{text.language}</p>}
        </div>
      </div>

      <article className="rounded-md border bg-card p-6">
        <ImageTextViewer html={text.content} />
      </article>
    </div>
  );
}
