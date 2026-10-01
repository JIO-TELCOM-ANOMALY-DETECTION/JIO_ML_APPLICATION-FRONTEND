const tracebackPattern = /traceback \(most recent call last\)|\bFile ["'][^"']+["'],\s*line\s+\d+|\n\s*at\s+\S+/i;
const absolutePathPattern = /(?:\b[A-Za-z]:[\\/](?:[^\\/\s:*?"<>|]+[\\/]?)+|\\\\[^\\/\s]+\\[^\\/\s]+(?:\\[^\\/\s]+)*|(?<![:\w])\/(?:[^/\s]+\/)+[^/\s]+)/g;
export function reportErrorMessage(message: string): string {
  if (tracebackPattern.test(message)) return 'The reporting request failed. Check the reporting service logs for details.';
  const safe = message.replace(absolutePathPattern, '[internal path]');
  return safe || 'The reporting request could not be completed.';
}
