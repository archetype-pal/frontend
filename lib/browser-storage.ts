/** False during SSR and in browsers that block storage (e.g. some private modes). */
export function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
