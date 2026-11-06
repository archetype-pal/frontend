import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  getDates,
  getFormats,
  getRepositories,
  getSources,
} from '@/services/backoffice/manuscripts';
import { getScripts } from '@/services/backoffice/scribes';
import {
  getCharacters,
  getComponents,
  getFeatures,
  getPositions,
} from '@/services/backoffice/symbols';
import { listUsers } from '@/services/backoffice/users';
import type { UserListItem } from '@/types/backoffice';

/** A signed-in query for one of the small reference lists the backoffice forms pick from. */
function useLookup<T>(queryKey: QueryKey, queryFn: () => Promise<T>) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey, queryFn, enabled: isAuthenticated });
}

export const useRepositories = () => useLookup(backofficeKeys.repositories.all(), getRepositories);
export const useDates = () => useLookup(backofficeKeys.dates.all(), getDates);
export const useFormats = () => useLookup(backofficeKeys.formats.all(), getFormats);
export const useSources = () => useLookup(backofficeKeys.sources.all(), getSources);
export const useScripts = () => useLookup(backofficeKeys.scripts.all(), getScripts);
export const useCharacters = () => useLookup(backofficeKeys.characters.all(), getCharacters);
export const useComponents = () => useLookup(backofficeKeys.components.all(), getComponents);
export const useFeatures = () => useLookup(backofficeKeys.features.all(), getFeatures);
export const usePositions = () => useLookup(backofficeKeys.positions.all(), getPositions);

/**
 * The accounts a text can be sent to for review: the active ones that can use
 * the backoffice, where reviews are approved (superusers, the API's
 * `can_manage`), by username.
 */
export function reviewersOf(users: UserListItem[]): UserListItem[] {
  return users
    .filter((u) => u.is_active && u.is_superuser)
    .sort((a, b) => a.username.localeCompare(b.username));
}

/** The reviewers, read only while `enabled` (the picker is showing). */
export function useReviewers(enabled: boolean) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: backofficeKeys.users.all(),
    queryFn: listUsers,
    enabled: isAuthenticated && enabled,
    select: reviewersOf,
  });
}
