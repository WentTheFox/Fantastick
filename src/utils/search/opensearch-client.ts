import { env } from '../../env.js';

// Autocomplete must answer within Discord's 3s window, so fail fast and let callers fall
// back to the Postgres search instead of hanging the interaction on a slow cluster.
const requestTimeoutMs = 1500;

export const isSearchEnabled = () => Boolean(env.OPENSEARCH_URL);

export class OpenSearchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const openSearchRequest = async <T = unknown>(method: string, path: string, body?: unknown, { ndjson = false, timeoutMs = requestTimeoutMs }: { ndjson?: boolean; timeoutMs?: number } = {}): Promise<T> => {
  if (!env.OPENSEARCH_URL) throw new Error('OpenSearch is not configured');
  const headers: Record<string, string> = {
    'content-type': ndjson ? 'application/x-ndjson' : 'application/json',
  };
  if (env.OPENSEARCH_USERNAME) {
    headers.authorization = `Basic ${Buffer.from(`${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD ?? ''}`).toString('base64')}`;
  }
  const response = await fetch(new URL(path, env.OPENSEARCH_URL), {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new OpenSearchError(`OpenSearch ${method} ${path} failed with ${response.status}: ${text.slice(0, 300)}`, response.status);
  }
  return (text ? JSON.parse(text) : {}) as T;
};
