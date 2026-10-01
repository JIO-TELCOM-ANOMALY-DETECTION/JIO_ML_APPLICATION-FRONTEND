export class ApiError extends Error {
  constructor(message: string, readonly kind: 'http' | 'network' | 'timeout', readonly status?: number, readonly code?: string, readonly body?: unknown) { super(message); this.name = 'ApiError'; }
}
function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    if (typeof record.error === 'object' && record.error !== null && 'message' in record.error && typeof record.error.message === 'string') return record.error.message;
  }
  return `Request failed with status ${status}`;
}
function errorCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const error = (body as Record<string, unknown>).error;
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  const code = record.code ?? record.error_code;
  return typeof code === 'string' ? code : undefined;
}
export class HttpClient {
  constructor(private readonly baseUrl: string, private readonly timeoutMs = 5000) {}
  async request<T>(method: 'GET' | 'POST', path: string, requestBody?: unknown, timeoutMs = this.timeoutMs): Promise<T> {
    const controller = new AbortController(); let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Accept: 'application/json', ...(requestBody === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }), signal: controller.signal });
      const isJson = (response.headers.get('content-type') ?? '').includes('json'); let body: unknown;
      try { body = isJson ? await response.json() : await response.text(); } catch { body = undefined; }
      if (!response.ok) throw new ApiError(errorMessage(body, response.status), 'http', response.status, errorCode(body), body);
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError(`Request timed out after ${timeoutMs} ms`, 'timeout');
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 'network');
    } finally { window.clearTimeout(timeout); }
  }
  get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown, timeoutMs = this.timeoutMs): Promise<T> { return this.request<T>('POST', path, body, timeoutMs); }
}
