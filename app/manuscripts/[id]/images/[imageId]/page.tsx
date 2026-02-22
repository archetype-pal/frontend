import ManuscriptViewer from '@/components/manuscript/ManuscriptViewer';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; imageId: string }>;
}) {
  const { imageId } = await params;
  return <ManuscriptViewer imageId={imageId} />;
}
