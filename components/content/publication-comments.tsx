import { useTranslations } from 'next-intl';
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
  return roots;
}

const formatCommentDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function CommentList({ comments, nested = false }: { comments: CommentNode[]; nested?: boolean }) {
  return (
    <ol className={nested ? 'mt-4 space-y-4 border-l border-border pl-3 sm:pl-6' : 'space-y-6'}>
      {comments.map((comment) => (
        <li key={comment.id}>
          <article>
            <p className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{comment.author_name}</span>
              <span className="mx-1">·</span>
              <time dateTime={comment.created_at}>{formatCommentDate(comment.created_at)}</time>
            </p>
            <div
              className="publication-body text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content) }}
            />
          </article>
          {comment.replies.length > 0 && <CommentList comments={comment.replies} nested />}
        </li>
      ))}
    </ol>
  );
}

export default function PublicationComments({
  comments,
  allowComments,
}: {
  comments: PublicationComment[];
  allowComments: boolean;
}) {
  const t = useTranslations('content');
  if (!allowComments) return null;

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-10 border-t border-border pt-6"
    >
      <h2 id="comments-heading" className="mb-4 font-serif text-lg font-semibold text-foreground">
        {t('blog.comments', { count: comments.length })}
      </h2>
      {comments.length > 0 && <CommentList comments={buildCommentTree(comments)} />}
    </section>
  );
}
