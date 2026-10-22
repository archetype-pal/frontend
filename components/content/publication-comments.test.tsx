import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/types';
import type { PublicationComment } from '@/utils/api';
import PublicationComments from './publication-comments';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

const { authState, routerRefresh } = vi.hoisted(() => ({
  authState: { user: null as UserProfile | null },
  routerRefresh: vi.fn(),
}));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: authState.user !== null }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: routerRefresh }) }));

const account = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 1,
  username: 'ada',
  email: 'ada@example.org',
  first_name: 'Ada',
  last_name: 'Lovelace',
  is_staff: true,
  is_superuser: false,
  ...overrides,
});

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

const pretendLongTextIsTallerThanEightLines = () => {
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(200);
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
    return (this.textContent?.length ?? 0) > 1000 ? 600 : 200;
  });
};

describe('PublicationComments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('renders nothing when comments are closed and there are none', () => {
    const { container } = render(
      <PublicationComments slug="a-post" allowComments={false} comments={[]} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('keeps showing the comments after comments are closed, without the form or Reply', () => {
    render(
      <PublicationComments
        slug="a-post"
        allowComments={false}
        comments={[comment(1, null, '<p>Question</p>'), comment(2, 1, '<p>Answer</p>')]}
      />
    );

    expect(screen.getByRole('heading', { name: '2 Comments' })).not.toBeNull();
    expect(screen.getByText('Answer')).not.toBeNull();
    expect(screen.getByText('Comments are closed.')).not.toBeNull();
    expect(screen.queryByRole('form', { name: 'Leave a comment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
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

  it('shows Read more only on a comment taller than 8 lines and opens it', () => {
    pretendLongTextIsTallerThanEightLines();
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[
          comment(1, null, '<p>Short one</p>'),
          comment(2, null, `<p>Start ${'word '.repeat(250)}Finale</p>`),
        ]}
      />
    );

    const text = screen.getByText(/^Start/).closest('.publication-body');
    expect(screen.getByText('Short one').closest('.publication-body')?.className).toContain(
      'line-clamp-8'
    );
    expect(text?.className).toContain('line-clamp-8');
    const readMore = screen.getByRole('button', { name: 'Read more' });
    expect(readMore.getAttribute('aria-describedby')).toBe('comment-2-byline');
    expect(readMore.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(readMore);

    expect(text?.className).not.toContain('line-clamp-8');
    const showLess = screen.getByRole('button', { name: 'Show less' });
    expect(showLess.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(showLess);

    expect(text?.className).toContain('line-clamp-8');
  });

  it('scrolls back to the top of a long comment when Show less leaves it above the screen', async () => {
    pretendLongTextIsTallerThanEightLines();
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: -500,
    } as DOMRect);
    render(
      <PublicationComments
        slug="a-post"
        allowComments
        comments={[comment(1, null, `<p>${'word '.repeat(250)}</p>`)]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
    );
  });
});

describe('PublicationComments form', () => {
  afterEach(() => {
    authState.user = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const stubFetch = (status: number, body = '{}') => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, { status }));
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

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        'Thank you. Your comment will appear once a moderator approves it.'
      )
    );
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
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        'Thank you. Your comment will appear once a moderator approves it.'
      )
    );
    expect(sentBody(fetchMock).parent).toBe(2);
    expect(screen.queryByText('Replying to Author 2')).toBeNull();
  });

  it('sends a top level comment after the reply is cancelled', async () => {
    const fetchMock = stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reply', description: /Author 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }));
    fillAndSend();
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        'Thank you. Your comment will appear once a moderator approves it.'
      )
    );

    expect(sentBody(fetchMock).parent).toBeNull();
  });

  it('puts the cursor back in the comment box after Cancel reply', () => {
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reply', description: /Author 1/ }));
    const cancel = screen.getByRole('button', { name: 'Cancel reply' });
    cancel.focus();
    fireEvent.click(cancel);

    expect(document.activeElement).toBe(screen.getByLabelText('Comment'));
  });

  it('puts the cursor back in the comment box after the comment is sent', async () => {
    stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'B. Reader' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    screen.getByRole('button', { name: 'Post comment' }).focus();
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(document.activeElement).toBe(screen.getByLabelText('Comment'));
  });

  it('asks to wait when too many comments were sent', async () => {
    stubFetch(429);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'You have sent several comments recently. Please try again later.'
      )
    );
  });

  it('keeps the text and says so when the comment cannot be sent', async () => {
    stubFetch(400);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'Your comment could not be sent. Please try again.'
      )
    );
    expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('Thanks');
  });

  it('shows a refused email address as an error on the email field', async () => {
    stubFetch(400, JSON.stringify({ author_email: ['Enter a valid email address.'] }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(
      screen.getByRole('textbox', {
        name: 'Email',
        description: /Please enter a valid email address/,
      })
    ).toBe(email);
    expect(document.activeElement).toBe(email);
    expect(toastMock.error).not.toHaveBeenCalled();

    fireEvent.change(email, { target: { value: 'reader@example.com' } });

    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByText('Please enter a valid email address.')).toBeNull();
  });

  it('says comments are closed when the post closed them after the page loaded', async () => {
    stubFetch(403, JSON.stringify({ detail: 'Comments are closed on this publication.' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    fillAndSend();

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Comments are closed.'));
  });

  it('lets a guest send a comment without an email', async () => {
    const fetchMock = stubFetch(201);
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    const email = screen.getByRole('textbox', {
      name: 'Email',
      description: 'Optional, never published.',
    }) as HTMLInputElement;
    expect(email.required).toBe(false);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'B. Reader' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        'Thank you. Your comment will appear once a moderator approves it.'
      )
    );
    expect(sentBody(fetchMock).author_email).toBe('');
  });

  it('comments as the signed in account, without asking for a name or email', async () => {
    authState.user = account();
    const fetchMock = stubFetch(201, JSON.stringify({ is_approved: false }));
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    expect(screen.queryByText('Commenting as Ada Lovelace')).not.toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.queryByLabelText('Email')).toBeNull();
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        'Thank you. Your comment will appear once a moderator approves it.'
      )
    );
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      '/api/proxy/api/v1/media/publications/a-post/comments'
    );
    expect(sentBody(fetchMock)).toEqual({ parent: null, content: 'Thanks' });
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('asks a signed in account with no email for an optional one, but not for a name', async () => {
    authState.user = account({ email: '' });
    const fetchMock = stubFetch(201, JSON.stringify({ is_approved: false }));
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    expect(screen.queryByText('Commenting as Ada Lovelace')).not.toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
    const email = screen.getByRole('textbox', {
      name: 'Email',
      description: 'Optional, never published.',
    }) as HTMLInputElement;
    expect(email.required).toBe(false);
    fireEvent.change(email, { target: { value: 'ada@example.org' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(sentBody(fetchMock)).toEqual({
      parent: null,
      author_email: 'ada@example.org',
      content: 'Thanks',
    });
  });

  it('says a comment the server approved at once is published and shows it', async () => {
    authState.user = account({ first_name: '', last_name: '', is_superuser: true });
    stubFetch(201, JSON.stringify({ is_approved: true }));
    render(<PublicationComments slug="a-post" allowComments comments={thread} />);

    expect(screen.queryByText('Commenting as ada')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Thanks' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Leave a comment' }));

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Thank you. Your comment is published.')
    );
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
