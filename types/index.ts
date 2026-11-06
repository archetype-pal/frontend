/** What the signed-in user may do, computed by the API from the rules it enforces. */
export interface UserCapabilities {
  /** Draw and edit image and text annotations in the viewer. */
  annotate: boolean;
  /** Create and change editorial annotations. */
  annotate_editorially: boolean;
  /** Read texts in every status, not just the published ones. */
  read_drafts: boolean;
  /** Use the management API, and so the backoffice. */
  manage: boolean;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  /** Gate on `capabilities`; the flags stay until the API drops them from the profile. */
  is_staff: boolean;
  is_superuser: boolean;
  /** Absent only from an API that predates it; every gate then stays closed. */
  capabilities?: UserCapabilities;
}
