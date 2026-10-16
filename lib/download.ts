/**
 * Save a blob as a file in the browser.
 *
 * The anchor is attached to the document before the click: older Firefox
 * versions and some mobile Safari builds silently ignore a click on a
 * detached anchor, so the user gets no file.
 */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
