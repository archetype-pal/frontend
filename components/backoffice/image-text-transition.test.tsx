/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransitionPopover } from './image-text-transition';

describe('<TransitionPopover>', () => {
  it('offers the next step, keeps the note when the move fails, and closes once it lands', async () => {
    const onTransition = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce({});
    render(<TransitionPopover currentStatus="Draft" label="Move" onTransition={onTransition} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    fireEvent.change(screen.getByPlaceholderText('What changed?'), { target: { value: 'ready' } });
    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));

    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({ to_status: 'Review', note: 'ready' })
    );
    expect((await screen.findByDisplayValue('ready')).isConnected).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));
    await waitFor(() => expect(screen.queryByDisplayValue('ready')).toBeNull());
    expect(onTransition).toHaveBeenCalledTimes(2);
  });

  it('moves a selection to Review by default when there is no current status', async () => {
    const onTransition = vi.fn().mockResolvedValue({});
    render(<TransitionPopover label="Move" onTransition={onTransition} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(screen.queryByText('Current')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));

    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({ to_status: 'Review', note: undefined })
    );
  });
});
