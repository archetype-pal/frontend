import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveWorkspaceMock = vi.fn();
const saveImageMock = vi.fn();
// loadWorksetPayload dynamically imports these only on the persist path; mock so
// we can assert the read-only path never touches Dexie.
vi.mock('@/lib/lightbox-db', () => ({
  saveWorkspace: (...args: unknown[]) => saveWorkspaceMock(...args),
  saveImage: (...args: unknown[]) => saveImageMock(...args),
}));

import { useLightboxStore } from './lightbox-store';
import type { WorksetPayload } from '@/types/workset';

function makePayload(): WorksetPayload {
  return {
    schema_version: 2,
    workspaces: [
      {
        id: 'ws-1',
        name: 'Charters',
        images: ['img-1'],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    images: [
      {
        id: 'img-1',
        originalId: 42,
        type: 'image',
        imageUrl: 'http://x/full/max/0/default.jpg',
        metadata: {},
        workspaceId: 'ws-1',
        position: { x: 0, y: 0, zIndex: 1 },
        size: { width: 100, height: 100 },
        transform: {
          opacity: 1,
          brightness: 100,
          contrast: 100,
          rotation: 0,
          flipX: false,
          flipY: false,
          grayscale: false,
        },
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

beforeEach(() => {
  saveWorkspaceMock.mockReset();
  saveImageMock.mockReset();
  useLightboxStore.setState({ workspaces: [], images: new Map(), currentWorkspaceId: null });
});

describe('loadWorksetPayload', () => {
  it('hydrates workspaces/images/currentWorkspaceId from the payload', async () => {
    await useLightboxStore.getState().loadWorksetPayload(makePayload());
    const state = useLightboxStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.currentWorkspaceId).toBe('ws-1');
    expect(state.images.get('img-1')?.originalId).toBe(42);
    expect(state.isLoading).toBe(false);
  });

  it('does NOT write Dexie on the default (read-only) path', async () => {
    await useLightboxStore.getState().loadWorksetPayload(makePayload());
    expect(saveWorkspaceMock).not.toHaveBeenCalled();
    expect(saveImageMock).not.toHaveBeenCalled();
  });

  it('persists to Dexie when persist: true', async () => {
    await useLightboxStore.getState().loadWorksetPayload(makePayload(), { persist: true });
    expect(saveWorkspaceMock).toHaveBeenCalledTimes(1);
    expect(saveImageMock).toHaveBeenCalledTimes(1);
  });

  it('handles an empty payload without throwing', async () => {
    await useLightboxStore
      .getState()
      .loadWorksetPayload({ schema_version: 2, workspaces: [], images: [] });
    const state = useLightboxStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.currentWorkspaceId).toBeNull();
  });
});
