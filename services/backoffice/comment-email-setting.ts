import { backofficeGet, backofficePatch } from './api-client';

const ENDPOINT = '/api/v1/media/management/comments/email-setting/';

export interface CommentEmailSetting {
  email_enabled: boolean;
}

export function getCommentEmailSetting(): Promise<CommentEmailSetting> {
  return backofficeGet<CommentEmailSetting>(ENDPOINT, { cache: 'no-store' });
}

export function setCommentEmailSetting(enabled: boolean): Promise<CommentEmailSetting> {
  return backofficePatch<CommentEmailSetting>(ENDPOINT, { email_enabled: enabled });
}

export function getUserCommentEmailSetting(userId: number): Promise<CommentEmailSetting> {
  return backofficeGet<CommentEmailSetting>(`${ENDPOINT}?user=${userId}`, { cache: 'no-store' });
}

export function setUserCommentEmailSetting(
  userId: number,
  enabled: boolean
): Promise<CommentEmailSetting> {
  return backofficePatch<CommentEmailSetting>(`${ENDPOINT}?user=${userId}`, {
    email_enabled: enabled,
  });
}
