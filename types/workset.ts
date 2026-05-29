import type { LightboxImage, LightboxWorkspace } from '@/lib/lightbox-db';

export type WorksetVisibility = 'Private' | 'Public';

/**
 * The lightbox serialization persisted server-side. Matches the shape the
 * session manager already builds for local Dexie sessions (workspaces + images),
 * plus a schema_version so the payload can be migrated later.
 */
export interface WorksetPayload {
  schema_version: number;
  workspaces: LightboxWorkspace[];
  images: LightboxImage[];
}

export interface WorksetOwner {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface WorksetSummary {
  public_id: string;
  title: string;
  description: string;
  visibility: WorksetVisibility;
  created_at: string;
  updated_at: string;
}

export interface WorksetDetail extends WorksetSummary {
  payload: WorksetPayload;
  owner: WorksetOwner;
}

/** The payload schema version the client currently writes. */
export const WORKSET_SCHEMA_VERSION = 2;
