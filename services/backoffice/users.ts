import { createCrudService } from './crud-factory';
import { backofficePost } from './api-client';
import type { PaginatedResponse, UserListItem, UserDetail } from '@/types/backoffice';

const USERS_BASE_PATH = '/api/v1/auth/management/users/';

const usersCrud = createCrudService<PaginatedResponse<UserListItem>, UserDetail>(USERS_BASE_PATH);

export const getUsers = usersCrud.list;
export const getUser = usersCrud.get;
export const createUser = usersCrud.create;
export const updateUser = usersCrud.update;
export const deleteUser = usersCrud.remove;

/**
 * Support-style impersonation: mint (or reuse) the target user's own auth
 * token so the caller can swap its stored bearer token and browse as them.
 * Superuser-only; the backend 400s for self-impersonation and 403s for
 * staff/superuser targets (see apps.users.services.impersonate_user).
 */
export function impersonateUser(
  token: string,
  id: UserListItem['id']
): Promise<{ auth_token: string }> {
  return backofficePost<{ auth_token: string }>(`${USERS_BASE_PATH}${id}/impersonate/`, token, {});
}
