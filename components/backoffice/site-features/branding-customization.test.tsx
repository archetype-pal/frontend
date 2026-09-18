import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BrandingCustomization } from './branding-customization';

const uploadBrandingLogo = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/backoffice/branding', () => ({
  uploadBrandingLogo: (...args: unknown[]) => uploadBrandingLogo(...args),
}));
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { rich: (k: string) => k }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const renderComponent = (logoUrl = '') =>
  render(<BrandingCustomization branding={{ logoUrl }} token="tok" onChange={onChange} />);

const onChange = vi.fn();

function selectFile(file: File) {
  const input = screen.getByLabelText('imageUpload.uploadAria') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('BrandingCustomization', () => {
  it('uploads a selected file and stores the returned URL', async () => {
    uploadBrandingLogo.mockResolvedValueOnce('/media/branding/logo.png');
    renderComponent();

    const file = new File(['bytes'], 'logo.png', { type: 'image/png' });
    selectFile(file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/media/branding/logo.png'));
    expect(uploadBrandingLogo).toHaveBeenCalledWith('tok', file);
  });

  it('shows an error toast and leaves the config untouched when the upload fails', async () => {
    uploadBrandingLogo.mockRejectedValueOnce(new Error('offline'));
    renderComponent();

    selectFile(new File(['bytes'], 'logo.png', { type: 'image/png' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the logo via the Clear button', () => {
    renderComponent('https://example.org/logo.png');
    fireEvent.click(screen.getByText('siteFeatures.branding.clearButton'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('applies a manually typed URL', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText('siteFeatures.branding.logoUrlLabel'), {
      target: { value: 'https://example.org/logo.png' },
    });
    expect(onChange).toHaveBeenCalledWith('https://example.org/logo.png');
  });
});
