import ManuscriptViewerAuthGate from '@/components/manuscript/manuscript-viewer-auth-gate';

interface PageProps {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
}

export default async function ManuscriptImagePage({ params }: PageProps) {
  const { imageId } = await params;

  return <ManuscriptViewerAuthGate imageId={imageId} />;
}
