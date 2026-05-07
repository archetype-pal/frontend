'use client';

import dynamic from 'next/dynamic';

const QualityDashboard = dynamic(
  () => import('@/components/backoffice/quality-dashboard').then((m) => m.QualityDashboard),
  { ssr: false }
);

export default function QualityPage() {
  return <QualityDashboard />;
}
