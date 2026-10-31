// `vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'))`:
// labels resolve to their own key, so assertions read the key instead of the copy.
export const useModelLabels = () => ({
  config: {},
  getLabel: (key: string) => key,
  getPluralLabel: (key: string) => key,
});
