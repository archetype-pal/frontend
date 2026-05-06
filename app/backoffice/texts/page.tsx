'use client';

import dynamic from 'next/dynamic';

const TextsMonitor = dynamic(
  () => import('@/components/backoffice/texts-monitor').then((m) => m.TextsMonitor),
  { ssr: false }
);

export default function TextsPage() {
  return <TextsMonitor />;
}
