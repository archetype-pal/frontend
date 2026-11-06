import { createCrudService } from './crud-factory';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import type { PaginatedResponse, UserListItem, UserDetail } from '@/types/backoffice';

/** Every account. A small list, so the backoffice reads it whole. */
export const listUsers = () =>
  walkPaginated<UserListItem>('/api/v1/auth/management/users/?limit=100');

const usersCrud = createCrudService<PaginatedResponse<UserListItem>, UserDetail>(
  '/api/v1/auth/management/users/'
);

export const createUser = usersCrud.create;
export const updateUser = usersCrud.update;
export const deleteUser = usersCrud.remove;
