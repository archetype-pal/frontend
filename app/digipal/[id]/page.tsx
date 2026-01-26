import ManuscriptViewer from '@/components/ManuscriptViewer'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ManuscriptViewer imageId={id} />
}
