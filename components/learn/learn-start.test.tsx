/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LearnStart } from './learn-start';
import { lessonKey } from '@/lib/learn';
import { renderWithQueryClient } from '@/test/render';
import type { LearnPage, LearnStatus, TutorSession } from '@/types/learn';

const state = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isReady: true },
  push: vi.fn(),
  replace: vi.fn(),
}));

const services = vi.hoisted(() => ({
  getLearnStatus: vi.fn(),
  getLearnPages: vi.fn(),
  startLesson: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => state.auth }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push, replace: state.replace }),
}));
vi.mock('@/services/learn', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/learn')>()),
  ...services,
}));

const { LearnError } = await import('@/services/learn');

const STATUS: LearnStatus = {
  enabled: true,
  uploads: 'signed-in',
  may_upload: false,
  daily_sessions: 5,
  questions_per_session: 10,
  retention_days: 30,
  languages: ['en', 'de', 'fr'],
};

const PAGES: LearnPage[] = [
  {
    id: 64,
    label: 'NLS Adv. MS 15.1.18, no. 16',
    charter: 'Charter of King William to Arbroath',
    date: '1178 x 1182',
    thumbnail_url: 'http://sipi:1024/no_16.jp2/full/!400,400/0/default.jpg',
  },
  { id: 65, label: 'NLS Adv. MS 15.1.18, no. 12', charter: '', date: '', thumbnail_url: null },
];

const SESSION = {
  id: 'dd6a7786-4b32-4203-ba04-91c96a461cec',
  status: 'queued',
} as TutorSession;

function picture(name: string, type: string, size = 2048): File {
  const file = new File([], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  state.auth = { isAuthenticated: false, isReady: true };
  state.push.mockReset();
  state.replace.mockReset();
  services.getLearnStatus.mockReset().mockResolvedValue(STATUS);
  services.getLearnPages.mockReset().mockResolvedValue(PAGES);
  services.startLesson.mockReset().mockResolvedValue(SESSION);
});

describe('<LearnStart> while the tutor is off', () => {
  it('says so, and offers nothing to start', async () => {
    services.getLearnStatus.mockResolvedValue({ ...STATUS, enabled: false });
    renderWithQueryClient(<LearnStart />);

    expect(await screen.findByRole('heading', { name: 'The tutor is switched off' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Choose a page from the corpus' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Start a lesson on/ })).toBeNull();
  });

  it('does not start a lesson from the link either', async () => {
    services.getLearnStatus.mockResolvedValue({ ...STATUS, enabled: false });
    renderWithQueryClient(<LearnStart pageId={64} />);

    await screen.findByRole('heading', { name: 'The tutor is switched off' });
    expect(services.startLesson).not.toHaveBeenCalled();
  });
});

describe('<LearnStart> the suggested pages', () => {
  it('lists each page, with its charter and date, in the language of the site', async () => {
    renderWithQueryClient(<LearnStart />);

    const card = await screen.findByRole('button', {
      name: 'Start a lesson on NLS Adv. MS 15.1.18, no. 16',
    });
    expect(card.getAttribute('aria-describedby')).toBe('learn-page-64-details');
    expect(within(card).getByText('Charter of King William to Arbroath')).toBeTruthy();
    expect(within(card).getByText('1178 x 1182')).toBeTruthy();
    // A page with no picture still has a card, with a placeholder.
    const bare = screen.getByRole('button', {
      name: 'Start a lesson on NLS Adv. MS 15.1.18, no. 12',
    });
    expect(within(bare).getByText('No picture')).toBeTruthy();
    expect(screen.getByText(/Lessons here are in English\./)).toBeTruthy();
    expect(
      screen.getByText('You can start 5 lessons a day, and ask each lesson up to 10 questions.')
    ).toBeTruthy();
  });

  it('starts a lesson on the page chosen, then opens it', async () => {
    const { client } = renderWithQueryClient(<LearnStart />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start a lesson on NLS Adv. MS 15.1.18, no. 16' })
    );

    await waitFor(() => expect(state.push).toHaveBeenCalledWith(`/learn/${SESSION.id}`));
    expect(services.startLesson).toHaveBeenCalledWith({ itemImage: 64 }, 'en', false);
    // The lesson's page shows the session at once, rather than loading it again.
    expect(client.getQueryData(lessonKey(SESSION.id, false))).toEqual(SESSION);
  });

  it("shows why a page's lesson could not start", async () => {
    services.startLesson.mockRejectedValue(
      new LearnError(429, 'You have started 5 lessons today; try again tomorrow.')
    );
    renderWithQueryClient(<LearnStart />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start a lesson on NLS Adv. MS 15.1.18, no. 16' })
    );

    expect(await screen.findByText('You have reached the limit for now.')).toBeTruthy();
    expect(screen.getByText('You have started 5 lessons today; try again tomorrow.')).toBeTruthy();
    expect(state.push).not.toHaveBeenCalled();
  });

  it('says when the pages could not be loaded, or there are none', async () => {
    services.getLearnPages.mockRejectedValueOnce(new LearnError(502, ''));
    const { unmount } = renderWithQueryClient(<LearnStart />);
    expect(await screen.findByText('Could not load the suggested pages.')).toBeTruthy();
    unmount();

    services.getLearnPages.mockResolvedValueOnce([]);
    renderWithQueryClient(<LearnStart />);
    expect(await screen.findByText('No pages are ready to learn from yet.')).toBeTruthy();
  });

  it('waits to know who is asking before reading what they may do', async () => {
    state.auth = { isAuthenticated: false, isReady: false };
    renderWithQueryClient(<LearnStart />);

    const card = await screen.findByRole('button', {
      name: 'Start a lesson on NLS Adv. MS 15.1.18, no. 16',
    });
    expect(services.getLearnStatus).not.toHaveBeenCalled();
    expect((card as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('<LearnStart> a picture of your own', () => {
  it('asks an anonymous student to sign in, where only signed-in students may', async () => {
    renderWithQueryClient(<LearnStart />);

    expect(await screen.findByText('Sign in to use a picture of your own.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
    expect(screen.queryByLabelText(/Choose a picture/)).toBeNull();
  });

  it('says so where nobody may', async () => {
    services.getLearnStatus.mockResolvedValue({ ...STATUS, uploads: 'nobody' });
    renderWithQueryClient(<LearnStart />);

    expect(await screen.findByText(/This site does not take pictures of your own/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  describe('when the student may', () => {
    beforeEach(() => {
      state.auth = { isAuthenticated: true, isReady: true };
      services.getLearnStatus.mockResolvedValue({ ...STATUS, may_upload: true });
    });

    it('says where the picture goes and how long it stays, before anything is sent', async () => {
      renderWithQueryClient(<LearnStart />);

      expect(await screen.findByText(/it is kept here for 30 days/)).toBeTruthy();
      expect(services.getLearnStatus).toHaveBeenCalledWith(true);
    });

    it('refuses a file the tutor could not read, without sending it', async () => {
      renderWithQueryClient(<LearnStart />);
      const input = await screen.findByLabelText(/Choose a picture/);

      fireEvent.change(input, { target: { files: [picture('charter.pdf', 'application/pdf')] } });
      expect(screen.getByRole('alert').textContent).toBe(
        'That file is not a JPEG, PNG, WebP or TIFF picture.'
      );

      fireEvent.change(input, {
        target: { files: [picture('huge.jpg', 'image/jpeg', 16 * 1024 * 1024)] },
      });
      expect(screen.getByRole('alert').textContent).toBe('That picture is larger than 15 MB.');

      expect(screen.queryByRole('button', { name: 'Start the lesson' })).toBeNull();
      expect(services.startLesson).not.toHaveBeenCalled();
    });

    it('starts a lesson on the picture chosen, then opens it', async () => {
      renderWithQueryClient(<LearnStart />);
      const file = picture('charter.jpg', 'image/jpeg');

      fireEvent.change(await screen.findByLabelText(/Choose a picture/), {
        target: { files: [file] },
      });
      expect(screen.getByText('charter.jpg')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Start the lesson' }));

      await waitFor(() => expect(state.push).toHaveBeenCalledWith(`/learn/${SESSION.id}`));
      expect(services.startLesson).toHaveBeenCalledWith({ picture: file }, 'en', true);
    });

    it('lets the student choose another picture', async () => {
      renderWithQueryClient(<LearnStart />);

      fireEvent.change(await screen.findByLabelText(/Choose a picture/), {
        target: { files: [picture('charter.png', 'image/png')] },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Choose another' }));

      expect(screen.queryByText('charter.png')).toBeNull();
      expect(screen.getByLabelText(/Choose a picture/)).toBeTruthy();
    });

    it("shows the tutor's refusal beside the picture", async () => {
      services.startLesson.mockRejectedValue(
        new LearnError(400, 'The picture is too small to read.')
      );
      renderWithQueryClient(<LearnStart />);

      fireEvent.change(await screen.findByLabelText(/Choose a picture/), {
        target: { files: [picture('charter.webp', 'image/webp')] },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Start the lesson' }));

      const section = screen.getByRole('region', { name: 'Or bring a picture of your own' });
      expect(await within(section).findByText('The tutor could not take that.')).toBeTruthy();
      expect(within(section).getByText('The picture is too small to read.')).toBeTruthy();
    });
  });
});

describe('<LearnStart> from a link to a page', () => {
  const start = async () => {
    const button = await screen.findByRole('button', { name: 'Start the lesson' });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
  };

  it('asks first, and spends nothing until it is told to', async () => {
    renderWithQueryClient(<LearnStart pageId={64} />);

    expect(
      await screen.findByText(
        'Start a lesson on NLS Adv. MS 15.1.18, no. 16? It takes a few minutes.'
      )
    ).toBeTruthy();
    expect(services.startLesson).not.toHaveBeenCalled();
  });

  it('starts once when told to, and replaces the link in the history', async () => {
    renderWithQueryClient(<LearnStart pageId={64} />);

    await start();

    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/learn/${SESSION.id}`));
    expect(services.startLesson).toHaveBeenCalledTimes(1);
    expect(services.startLesson).toHaveBeenCalledWith({ itemImage: 64 }, 'en', false);
    expect(state.push).not.toHaveBeenCalled();
  });

  it('names the page while it starts', async () => {
    services.startLesson.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<LearnStart pageId={64} />);

    await start();

    expect(
      await screen.findByText('Starting a lesson on NLS Adv. MS 15.1.18, no. 16…')
    ).toBeTruthy();
  });

  it('says why it could not start, and tries again when asked', async () => {
    services.startLesson
      .mockRejectedValueOnce(new LearnError(503, 'The tutor is busy; try again in a minute.'))
      .mockResolvedValueOnce(SESSION);
    renderWithQueryClient(<LearnStart pageId={64} />);

    await start();

    expect(await screen.findByText('The tutor is not available just now.')).toBeTruthy();
    expect(screen.getByText('The tutor is busy; try again in a minute.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/learn/${SESSION.id}`));
    expect(services.startLesson).toHaveBeenCalledTimes(2);
  });

  it('can still start when what the tutor can do could not be read', async () => {
    services.getLearnStatus.mockRejectedValue(new LearnError(502, ''));
    renderWithQueryClient(<LearnStart pageId={64} />);

    await start();

    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/learn/${SESSION.id}`));
    expect(screen.getByText('Could not find out what the tutor can do just now.')).toBeTruthy();
  });
});
