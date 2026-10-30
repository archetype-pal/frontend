'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  getCommentEmailSetting,
  setCommentEmailSetting,
} from '@/services/backoffice/comment-email-setting';

export function CommentEmailSetting() {
  const { user } = useAuth();
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();
  const isSuperuser = Boolean(user?.is_superuser);

  const { data, error } = useQuery({
    queryKey: backofficeKeys.commentEmailSetting(),
    queryFn: getCommentEmailSetting,
    enabled: isSuperuser,
  });

  const save = useMutation({
    mutationFn: setCommentEmailSetting,
    onSuccess: (saved) => queryClient.setQueryData(backofficeKeys.commentEmailSetting(), saved),
    onError: (err) =>
      toast.error(t('comments.emailSettingFailed'), { description: formatApiError(err) }),
  });

  if (!isSuperuser) return null;
  const email = user?.email;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <Label htmlFor="comment-email-setting" className="cursor-pointer text-sm">
          {t('comments.emailSettingLabel')}
        </Label>
        <p id="comment-email-setting-hint" className="text-xs text-muted-foreground">
          {error
            ? t('comments.emailSettingUnavailable', { reason: formatApiError(error) })
            : email
              ? t('comments.emailSettingTo', { email })
              : t('comments.emailSettingNoAddress')}
        </p>
      </div>
      <Switch
        id="comment-email-setting"
        checked={save.isPending ? save.variables : (data?.email_enabled ?? false)}
        onCheckedChange={(checked) => {
          if (!save.isPending) save.mutate(checked);
        }}
        disabled={!data || !email}
        aria-describedby="comment-email-setting-hint"
      />
    </div>
  );
}
