import ManuscriptViewer from '@/components/manuscript/ManuscriptViewer';
import { resolveManuscriptViewerAccess } from '@/lib/manuscript-viewer-access';

interface PageProps {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { imageId } = await params;

  // keep current behaviour on the public baseline until real auth is wired.
  const viewerAccess = resolveManuscriptViewerAccess({
    isAuthenticated: false,
    isEditor: false,
    isAdmin: false,
  });

  return (
    <ManuscriptViewer
      imageId={imageId}
      mode={viewerAccess.mode}
      capabilities={viewerAccess.capabilities}
    />
  );
}
