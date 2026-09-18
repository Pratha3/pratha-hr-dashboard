/**
 * HTML sanitization utility to prevent HTML injection and XSS in transactional emails and templates.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes HTML and safely converts newlines to <br/> tags for multi-line user content.
 */
export function formatMultilineText(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  const escaped = escapeHtml(input);
  return escaped.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
}
