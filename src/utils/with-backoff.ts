export interface BackoffOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export const withBackoff = async <T>(
  fn: () => Promise<T>,
  { maxAttempts = 5, initialDelayMs = 500, shouldRetry = () => true }: BackoffOptions = {},
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts - 1 || !shouldRetry(e)) throw e;
      await new Promise(resolve => setTimeout(resolve, initialDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
};
