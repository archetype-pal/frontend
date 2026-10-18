import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
