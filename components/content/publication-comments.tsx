'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Reply } from 'lucide-react';
import { toast } from 'sonner';
import { CommentText } from '@/components/common/comment-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { optionalAuthFetch } from '@/lib/api-fetch';
import type { PublicationComment, RemovedPublicationComment } from '@/utils/api';

type ThreadComment = PublicationComment | RemovedPublicationComment;

type CommentNode = ThreadComment & { replies: CommentNode[] };

function buildCommentTree(comments: ThreadComment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>(
    comments.map((comment) => [comment.id, { ...comment, replies: [] }])
  );
  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    // A reply whose parent is not in the list (an admin can move a comment to
    // another post) shows as a top-level comment rather than vanishing.
    const parent = node.parent === null ? undefined : nodes.get(node.parent);
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots.reverse();
}

const formatCommentDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function CommentList({
  comments,
  onReply,
  nested = false,
}: {
  comments: CommentNode[];
  onReply?: (comment: PublicationComment) => void;
  nested?: boolean;
}) {
  const t = useTranslations('content');
  return (
    <ol className={nested ? 'mt-4 space-y-4 border-l border-border pl-3 sm:pl-6' : 'space-y-6'}>
      {comments.map((comment) => (
        <li key={comment.id}>
          {comment.removed ? (
            <p className="text-sm italic text-muted-foreground">{t('blog.commentNotShown')}</p>
          ) : (
            <article>
              <p id={`comment-${comment.id}-byline`} className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium text-primary">{comment.author_name}</span>
                <span className="mx-1">·</span>
                <time dateTime={comment.created_at}>{formatCommentDate(comment.created_at)}</time>
              </p>
              <CommentText html={comment.content} describedBy={`comment-${comment.id}-byline`}>
                {onReply && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 cursor-pointer gap-1 rounded-full px-3 hover:bg-primary hover:text-primary-foreground"
                    aria-describedby={`comment-${comment.id}-byline`}
                    onClick={() => onReply(comment)}
                  >
                    <Reply className="h-3.5 w-3.5" />
                    {t('blog.reply')}
                  </Button>
                )}
              </CommentText>
            </article>
          )}
          {comment.replies.length > 0 && (
            <CommentList comments={comment.replies} onReply={onReply} nested />
          )}
        </li>
      ))}
    </ol>
  );
}

async function failureOf(res: Response) {
  if (res.status === 403) return 'closed';
  if (res.status === 429) return 'tooMany';
  if (res.status === 400) {
    const body: unknown = await res.json().catch(() => null);
    if (body && typeof body === 'object' && 'author_email' in body) return 'badEmail';
  }
  return 'failed';
}

function CommentForm({
  slug,
  replyTo,
  onCancelReply,
  textareaRef,
}: {
  slug: string;
  replyTo: PublicationComment | null;
  onCancelReply: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const t = useTranslations('content');
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      const res = await optionalAuthFetch(
        `/api/v1/media/publications/${slug}/comments/`,
        isAuthenticated,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...Object.fromEntries(data), parent: replyTo?.id ?? null }),
        }
      );
      if (!res.ok) {
        const failure = await failureOf(res);
        if (failure === 'badEmail') {
          setEmailInvalid(true);
          emailRef.current?.focus();
        } else {
          toast.error(
            t(
              failure === 'closed'
                ? 'blog.commentsClosed'
                : failure === 'tooMany'
                  ? 'blog.commentTooMany'
                  : 'blog.commentFailed'
            )
          );
        }
        return;
      }
      const created: { is_approved?: boolean } = await res.json();
      form.reset();
      onCancelReply();
      textareaRef.current?.focus();
      if (created.is_approved) {
        toast.success(t('blog.commentPublished'));
        router.refresh();
      } else {
        toast.success(t('blog.commentSent'));
      }
    } catch {
      toast.error(t('blog.commentFailed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="comment-form-heading"
      aria-busy={sending}
      className="mt-8 space-y-4"
    >
      <h3 id="comment-form-heading" className="font-serif text-base font-semibold text-foreground">
        {t('blog.leaveComment')}
      </h3>
      {replyTo && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {t('blog.replyingTo', { name: replyTo.author_name })}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              onCancelReply();
              textareaRef.current?.focus();
            }}
          >
            {t('blog.cancelReply')}
          </Button>
        </p>
      )}
      {user && (
        <p className="text-sm text-muted-foreground">
          {t('blog.commentingAs', {
            name: `${user.first_name} ${user.last_name}`.trim() || user.username,
          })}
        </p>
      )}
      {!user?.email && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="comment-name">{t('blog.commentName')}</Label>
              <Input
                id="comment-name"
                name="author_name"
                required
                maxLength={150}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="comment-email">{t('blog.commentEmail')}</Label>
            <Input
              ref={emailRef}
              id="comment-email"
              name="author_email"
              type="email"
              autoComplete="email"
              aria-invalid={emailInvalid}
              aria-describedby={
                emailInvalid ? 'comment-email-error comment-email-hint' : 'comment-email-hint'
              }
              onChange={() => setEmailInvalid(false)}
            />
            {emailInvalid && (
              <p id="comment-email-error" className="text-xs text-destructive">
                {t('blog.commentBadEmail')}
              </p>
            )}
            <p id="comment-email-hint" className="text-xs text-muted-foreground">
              {t('blog.commentEmailHint')}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="comment-content">{t('blog.commentText')}</Label>
        <textarea
          id="comment-content"
          name="content"
          ref={textareaRef}
          required
          maxLength={10000}
          rows={5}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button type="submit" disabled={sending}>
        {sending ? t('blog.sendingComment') : t('blog.postComment')}
      </Button>
    </form>
  );
}

export default function PublicationComments({
  slug,
  comments,
  allowComments,
}: {
  slug: string;
  comments: ThreadComment[];
  allowComments: boolean;
}) {
  const t = useTranslations('content');
  const [replyTo, setReplyTo] = useState<PublicationComment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shownCount = comments.filter((comment) => !comment.removed).length;
  if (!allowComments && shownCount === 0) return null;

  const startReply = (comment: PublicationComment) => {
    setReplyTo(comment);
    textareaRef.current?.focus();
  };

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-10 scroll-mt-[var(--site-header-h,0px)] border-t border-border pt-6 wrap-anywhere"
    >
      <h2 id="comments-heading" className="mb-4 font-serif text-lg font-semibold text-foreground">
        {t('blog.comments', { count: shownCount })}
      </h2>
      {comments.length > 0 && (
        <CommentList
          comments={buildCommentTree(comments)}
          onReply={allowComments ? startReply : undefined}
        />
      )}
      {allowComments ? (
        <CommentForm
          slug={slug}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          textareaRef={textareaRef}
        />
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">{t('blog.commentsClosed')}</p>
      )}
    </section>
  );
}
