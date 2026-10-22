'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { PublicationComment } from '@/utils/api';

interface CommentNode extends PublicationComment {
  replies: CommentNode[];
}

function buildCommentTree(comments: PublicationComment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>(
    comments.map((comment) => [comment.id, { ...comment, replies: [] }])
  );
  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent === null) roots.push(node);
    else nodes.get(node.parent)?.replies.push(node);
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
  onReply: (comment: CommentNode) => void;
  nested?: boolean;
}) {
  const t = useTranslations('content');
  return (
    <ol className={nested ? 'mt-4 space-y-4 border-l border-border pl-3 sm:pl-6' : 'space-y-6'}>
      {comments.map((comment) => (
        <li key={comment.id}>
          <article>
            <p id={`comment-${comment.id}-byline`} className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{comment.author_name}</span>
              <span className="mx-1">·</span>
              <time dateTime={comment.created_at}>{formatCommentDate(comment.created_at)}</time>
            </p>
            <div
              className="publication-body text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content) }}
            />
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              aria-describedby={`comment-${comment.id}-byline`}
              onClick={() => onReply(comment)}
            >
              {t('blog.reply')}
            </Button>
          </article>
          {comment.replies.length > 0 && (
            <CommentList comments={comment.replies} onReply={onReply} nested />
          )}
        </li>
      ))}
    </ol>
  );
}

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

function CommentForm({
  slug,
  replyTo,
  onCancelReply,
  textareaRef,
}: {
  slug: string;
  replyTo: CommentNode | null;
  onCancelReply: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const t = useTranslations('content');
  const [state, setState] = useState<SendState>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState('sending');
    try {
      const res = await apiFetch(`/api/v1/media/publications/${slug}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent: replyTo?.id ?? null,
          author_name: data.get('author_name'),
          author_email: data.get('author_email'),
          content: data.get('content'),
        }),
      });
      if (!res.ok) {
        setState('failed');
        return;
      }
      form.reset();
      onCancelReply();
      setState('sent');
    } catch {
      setState('failed');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="comment-form-heading"
      aria-busy={state === 'sending'}
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
            onClick={onCancelReply}
          >
            {t('blog.cancelReply')}
          </Button>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="space-y-1.5">
          <Label htmlFor="comment-email">{t('blog.commentEmail')}</Label>
          <Input
            id="comment-email"
            name="author_email"
            type="email"
            required
            autoComplete="email"
            aria-describedby="comment-email-hint"
          />
          <p id="comment-email-hint" className="text-xs text-muted-foreground">
            {t('blog.commentEmailHint')}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="comment-content">{t('blog.commentText')}</Label>
        <textarea
          id="comment-content"
          name="content"
          ref={textareaRef}
          required
          rows={5}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('blog.sendingComment') : t('blog.postComment')}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {state === 'sent' && t('blog.commentSent')}
        {state === 'failed' && t('blog.commentFailed')}
      </p>
    </form>
  );
}

export default function PublicationComments({
  slug,
  comments,
  allowComments,
}: {
  slug: string;
  comments: PublicationComment[];
  allowComments: boolean;
}) {
  const t = useTranslations('content');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  if (!allowComments) return null;

  const startReply = (comment: CommentNode) => {
    setReplyTo(comment);
    textareaRef.current?.focus();
  };

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-10 border-t border-border pt-6"
    >
      <h2 id="comments-heading" className="mb-4 font-serif text-lg font-semibold text-foreground">
        {t('blog.comments', { count: comments.length })}
      </h2>
      {comments.length > 0 && (
        <CommentList comments={buildCommentTree(comments)} onReply={startReply} />
      )}
      <CommentForm
        slug={slug}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        textareaRef={textareaRef}
      />
    </section>
  );
}
