import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicationComment } from '@/utils/api';
import PublicationComments from './publication-comments';

const comment = (
  id: number,
  parent: number | null,
  content: string,
  createdAt = '2015-05-03T11:05:11Z'
): PublicationComment => ({
  id,
  parent,
  author_name: `Author ${id}`,
  content,
  created_at: createdAt,
  removed: false,
});

describe('PublicationComments', () => {
  it('nests a reply inside the comment it answers', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[comment(1, null, '<p>Question</p>'), comment(2, 1, '<p>Answer</p>')]}
      />
    );

    const questionItem = screen.getByText('Question').closest('li');
    expect(questionItem?.contains(screen.getByText('Answer'))).toBe(true);
  });

  it('shows newer comments first and keeps replies in the order they were written', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[
          comment(1, null, '<p>Older</p>', '2012-01-01T10:00:00Z'),
          comment(3, 1, '<p>First reply</p>', '2012-02-01T10:00:00Z'),
          comment(4, 1, '<p>Second reply</p>', '2012-03-01T10:00:00Z'),
          comment(2, null, '<p>Newer</p>', '2013-01-01T10:00:00Z'),
        ]}
      />
    );

    expect(
      screen.getAllByText(/^(Older|Newer|First reply|Second reply)$/).map((p) => p.textContent)
    ).toEqual(['Newer', 'Older', 'First reply', 'Second reply']);
  });

  it('leaves out a reply whose parent is not shown', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[comment(1, null, '<p>Shown</p>'), comment(3, 99, '<p>Orphan</p>')]}
      />
    );

    expect(screen.queryByText('Shown')).not.toBeNull();
    expect(screen.queryByText('Orphan')).toBeNull();
  });

  it('renders nothing when the publication does not allow comments', () => {
    const { container } = render(
      <PublicationComments
        slug="a-post"
        allowComments={false}
        comments={[comment(1, null, '<p>Hidden</p>')]}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows a hidden comment that has replies as a placeholder with its replies under it', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[
          comment(1, null, '<p>Question</p>'),
          { id: 2, parent: 1, removed: true },
          comment(3, 2, '<p>Answer</p>'),
        ]}
      />
    );

    const placeholder = screen.getByText('This comment is no longer shown.');
    expect(placeholder.closest('li')?.contains(screen.getByText('Answer'))).toBe(true);
    expect(screen.getByRole('heading', { name: '2 Comments' })).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'Reply' })).toHaveLength(2);
  });

  it('keeps comment formatting but strips scripts and event handlers', () => {
    const { container } = render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[
          comment(
            1,
            null,
            '<p><i>Kept</i></p><script>window.x = 1</script><img src="x" onerror="alert(1)">'
          ),
        ]}
      />
    );

    expect(container.querySelector('i')?.textContent).toBe('Kept');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
  });

  it('counts a single comment in the singular', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[comment(1, null, '<p>One</p>')]}
      />
    );

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('1 Comment');
  });

  it('shows the author and the UTC date of each comment', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[comment(1, null, '<p>Late</p>', '2015-05-03T23:30:00Z')]}
      />
    );

    expect(screen.queryByText('Author 1')).not.toBeNull();
    expect(screen.getByText('3 May 2015').getAttribute('datetime')).toBe('2015-05-03T23:30:00Z');
  });
});

describe('PublicationComments form', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const stubFetch = (status: number) => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}', { status }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const sentBody = (fetchMock: ReturnType<typeof stubFetch>) =>
    JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

  const fillAndSend = () => {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'B. Reader' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'reader@example.org' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));
  };

  const thread = [comment(1, null, '<p>Question</p>'), comment(2, 1, '<p>Answer</p>')];

  it('posts a comment to the post and says it waits for moderation', async () => {
    const fetchMock = stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    expect(
      await screen.findByText('Thank you. Your comment will appear once a moderator approves it.')
    ).not.toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/media/publications/a-post/comments/'
    );
    expect(sentBody(fetchMock)).toEqual({
      parent: null,
      author_name: 'B. Reader',
      author_email: 'reader@example.org',
      content: 'Thanks',
    });
    expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('');
  });

  it('replies to the comment whose Reply button was pressed', async () => {
    const fetchMock = stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reply', description: /Author 2/ }));

    expect(screen.queryByText('Replying to Author 2')).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Comment'));
    fillAndSend();
    await screen.findByText('Thank you. Your comment will appear once a moderator approves it.');
    expect(sentBody(fetchMock).parent).toBe(2);
    expect(screen.queryByText('Replying to Author 2')).toBeNull();
  });

  it('sends a top level comment after the reply is cancelled', async () => {
    const fetchMock = stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reply', description: /Author 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }));
    fillAndSend();
    await screen.findByText('Thank you. Your comment will appear once a moderator approves it.');

    expect(sentBody(fetchMock).parent).toBeNull();
  });

  it('keeps the text and says so when the comment cannot be sent', async () => {
    stubFetch(400);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    expect(
      await screen.findByText('Your comment could not be sent. Please try again.')
    ).not.toBeNull();
    expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('Thanks');
  });
});
