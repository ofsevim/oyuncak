/**
 * Triggers a browser file download using a temporary anchor attached to `document.body`,
 * which is required by iOS Safari, Firefox, and older WebViews.
 */
export function triggerFileDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
