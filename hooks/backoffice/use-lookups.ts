import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  getDates,
  getFormats,
  getRepositories,
  getSources,
} from '@/services/backoffice/manuscripts';
import {
  getCharacters,
  getComponents,
  getFeatures,
  getPositions,
} from '@/services/backoffice/symbols';

/** A signed-in query for one of the small reference lists the backoffice forms pick from. */
function useLookup<T>(queryKey: QueryKey, queryFn: () => Promise<T>) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey, queryFn, enabled: isAuthenticated });
}

export const useRepositories = () => useLookup(backofficeKeys.repositories.all(), getRepositories);
export const useDates = () => useLookup(backofficeKeys.dates.all(), getDates);
export const useFormats = () => useLookup(backofficeKeys.formats.all(), getFormats);
export const useSources = () => useLookup(backofficeKeys.sources.all(), getSources);
export const useCharacters = () => useLookup(backofficeKeys.characters.all(), getCharacters);
export const useComponents = () => useLookup(backofficeKeys.components.all(), getComponents);
export const useFeatures = () => useLookup(backofficeKeys.features.all(), getFeatures);
export const usePositions = () => useLookup(backofficeKeys.positions.all(), getPositions);
