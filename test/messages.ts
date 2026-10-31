import en from '@/messages/en.json';

/** The value at a dotted `path` in a message catalogue, or undefined. */
export const lookupMessage = (root: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      root
    );

/**
 * The English `backoffice.*` copy, or the key itself when it is missing — so a
 * renderer that resolves a key the catalogue lacks shows the dotted key and fails
 * the assertion instead of passing silently.
 */
export const tBackoffice = (key: string): string => {
  const value = lookupMessage(en.backoffice, key);
  return typeof value === 'string' ? value : key;
};
