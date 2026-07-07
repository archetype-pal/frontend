'use client';

interface ReadOnlyIdentityFieldProps {
  label: string;
  value: string;
  title?: string;
}

/**
 * Compact read-only presentation of an identity field (Allograph / Hand) for the
 * annotation popup. Used by both the logged-in standard editor and the anonymous
 * demo editor so a locked field looks identical across them, and so Allograph and
 * Hand share one layout. Small font by design — a locked value should not crowd
 * the popup the way an editable selector does.
 */
export function ReadOnlyIdentityField({ label, value, title }: ReadOnlyIdentityFieldProps) {
  return (
    <p className="text-xs text-muted-foreground" title={title}>
      {label}: <span className="font-medium text-foreground">{value}</span>
    </p>
  );
}
