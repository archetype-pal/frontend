// import ManuscriptViewer from '@/components/manuscript/ManuscriptViewer';

// export default async function Page({
//   params,
// }: {
//   params: Promise<{ id: string; imageId: string }>;
// }) {
//   const { imageId } = await params;
//   return <ManuscriptViewer imageId={imageId} />;
// }
import ManuscriptViewer from '@/components/manuscript/ManuscriptViewer';
import { getViewerCapabilities } from '@/lib/viewer-capabilities';
import type { ViewerMode } from '@/types/annotation-viewer';

interface PageProps {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { imageId } = await params;

  // Step 1: keep the current page explicitly on the public baseline.
  // Later this will be resolved from authentication/session.
  const mode: ViewerMode = 'public';
  const capabilities = getViewerCapabilities(mode);

  return <ManuscriptViewer imageId={imageId} mode={mode} capabilities={capabilities} />;
}
