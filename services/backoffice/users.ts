import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import type { PaginatedResponse, UserListItem, UserDetail, UserSummary } from '@/types/backoffice';

const usersCrud = createCrudService<PaginatedResponse<UserListItem>, UserDetail>(
  '/api/v1/auth/management/users/'
);

export const getUsers = usersCrud.list;
export const getUser = usersCrud.get;
export const createUser = usersCrud.create;
export const updateUser = usersCrud.update;
export const deleteUser = usersCrud.remove;

export function getUserSummary() {
  return backofficeGet<UserSummary>('/api/v1/auth/management/users/summary/');
}
