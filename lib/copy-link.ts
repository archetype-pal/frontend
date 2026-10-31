import { toast } from 'sonner';

/**
 * Copy `url` to the clipboard and say so. When the clipboard is unavailable
 * (insecure context, denied permission) the failure toast carries the URL so
 * the user can still select and copy it by hand.
 */
export async function copyLink(url: string, messages: { copied: string; failed: string }) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(messages.copied);
  } catch {
    toast.error(messages.failed, { description: url });
  }
}
