export function readDocumentNonce(doc: Document = document): string | undefined {
  const nonce = doc.body?.dataset.cspNonce?.trim() || doc.documentElement?.dataset.cspNonce?.trim();
  return nonce || undefined;
}
