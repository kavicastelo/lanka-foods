/**
 * Safely escapes special regex characters in user search strings
 * to prevent Regular Expression Denial of Service (ReDoS) or regex injection attacks.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
