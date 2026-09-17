import { backofficePostFormData } from './api-client';

const BRANDING_LOGO_UPLOAD_PATH = '/api/v1/app-settings/branding/logo/';

/**
 * Upload a logo image file and return its stored URL, for the caller to save
 * into `branding.logoUrl` via the site-features PUT. Immediate — unlike the
 * rest of the site-features form, there's no model row to attach the file to
 * (see `BrandingLogoUploadView`), so the upload can't be deferred to the
 * page's own Save button the way Partners defers its logo file.
 */
export async function uploadBrandingLogo(token: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('logo', file);
  const { url } = await backofficePostFormData<{ url: string }>(
    BRANDING_LOGO_UPLOAD_PATH,
    token,
    fd
  );
  return url;
}
