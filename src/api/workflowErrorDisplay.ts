const traceback = /traceback \(most recent call last\)|\bFile ["'][^"']+["'],\s*line\s+\d+|\n\s+at\s+\S+/i;
const paths = /(?:\b[A-Za-z]:[\\/]+(?:[^\\/\s:*?"<>|]+[\\/]+)*[^\\/\s:*?"<>|]+|\\\\[^\\/\s]+\\[^\\/\s]+(?:\\[^\\/\s]+)*|(?<![:\w])[/](?:[^/\s]+[/])+[^/\s]+)/g;
export function safeWorkflowMessage(message: string): string { return traceback.test(message) ? 'The ML workflow failed. Check the ML service logs for diagnostics.' : message.replace(paths, '[internal path]'); }
export function safeWorkflowValue(value: unknown): unknown {
  if (typeof value === 'string') return safeWorkflowMessage(value);
  if (Array.isArray(value)) return value.map(safeWorkflowValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[safeWorkflowMessage(key),safeWorkflowValue(item)]));
  return value;
}
