import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createCollectionMock, loadWorksetPayloadMock, routerPushMock } = vi.hoisted(() => ({
  createCollectionMock: vi.fn(() => true),
  loadWorksetPayloadMock: vi.fn(async () => undefined),
  routerPushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/components/lightbox/lightbox-viewer', () => ({
  LightboxViewer: () => <div>Lightbox viewer</div>,
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    collections: [{ id: 'existing', name: 'Research', items: [] }],
    canManageCollections: true,
    createCollection: createCollectionMock,
  }),
}));

vi.mock('@/stores/lightbox-store', () => ({
  useLightboxStore: {
    getState: () => ({ loadWorksetPayload: loadWorksetPayloadMock }),
  },
}));

import { WorksetViewerClient } from './workset-viewer-client';
import type { WorksetDetail } from '@/types/workset';

const sharedWorkset: WorksetDetail = {
  public_id: 'shared',
  title: 'Research',
  description: '',
  visibility: 'Public',
  created_at: '2026-06-02T00:00:00Z',
  updated_at: '2026-06-02T00:00:00Z',
  owner: {
    id: 1,
    username: 'editor',
    first_name: '',
    last_name: '',
  },
  payload: {
    schema_version: 2,
    workspaces: [],
    images: [],
    collection: {
      schema_version: 1,
      name: 'Research',
      items: [{ id: 10, type: 'image' }],
    },
  },
};

describe('WorksetViewerClient shared collection snapshots', () => {
  beforeEach(() => {
    createCollectionMock.mockClear();
    loadWorksetPayloadMock.mockClear();
    routerPushMock.mockClear();
  });

  it('saves a non-conflicting local collection copy without replacing existing collections', () => {
    render(<WorksetViewerClient workset={sharedWorkset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save collection copy' }));

    expect(createCollectionMock).toHaveBeenCalledWith('Research (2)', [{ id: 10, type: 'image' }]);
    expect(routerPushMock).toHaveBeenCalledWith('/collection');
  });

  it('does not show a collection import action for legacy lightbox-only worksets', () => {
    render(
      <WorksetViewerClient
        workset={{ ...sharedWorkset, payload: { schema_version: 2, workspaces: [], images: [] } }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Save collection copy' })).toBeNull();
  });
});
