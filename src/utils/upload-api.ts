import { NestableLogger } from '@went.tf/discord-bot-framework/logger';
import { env } from '../env.js';

/**
 * Generic, provider-agnostic client for uploading sticker files to a remote HTTP
 * API instead of the local filesystem. It works against *any* API that:
 *   - accepts a `multipart/form-data` POST at UPLOAD_API_POST_URL, with the file
 *     under the field name UPLOAD_API_FILE_FIELD (default "file"),
 *   - returns a JSON body containing at least a full-size image URL under the
 *     key UPLOAD_API_RESPONSE_FIELD,
 *   - optionally returns a one-time deletion URL under UPLOAD_API_DELETE_URL_FIELD.
 * No authentication headers are ever sent - if the target API needs auth, bake
 * it into UPLOAD_API_POST_URL itself (e.g. a key embedded in the path, the way
 * a pre-signed URL works).
 *
 * The shared framework ApiClient always JSON-encodes its request body, so it
 * can't do multipart/form-data uploads - this uses the global fetch/FormData
 * APIs directly instead.
 */

export interface UploadResult {
  url: string;
  deleteUrl: string | null;
}

export class UploadApiError extends Error {
  status: number;
  /** Parsed from a `Retry-After` response header, if present (delta-seconds or HTTP-date). */
  retryAfterMs: number | null;

  constructor(message: string, status: number, retryAfterMs: number | null) {
    super(message);
    this.name = 'UploadApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const parseRetryAfterMs = (response: Response): number | null => {
  const header = response.headers.get('retry-after');
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
};

export const isUploadApiEnabled = (): boolean => env.UPLOAD_API_ENABLED;

const assertConfigured = (): { postUrl: string; responseField: string } => {
  if (!env.UPLOAD_API_POST_URL || !env.UPLOAD_API_RESPONSE_FIELD) {
    throw new Error(
      'UPLOAD_API_ENABLED is true but UPLOAD_API_POST_URL/UPLOAD_API_RESPONSE_FIELD are not configured',
    );
  }
  return { postUrl: env.UPLOAD_API_POST_URL, responseField: env.UPLOAD_API_RESPONSE_FIELD };
};

export const uploadFile = async (logger: NestableLogger, fileName: string, data: Buffer): Promise<UploadResult> => {
  const { postUrl, responseField } = assertConfigured();
  const fileFieldName = env.UPLOAD_API_FILE_FIELD ?? 'file';

  const form = new FormData();
  form.append(fileFieldName, new Blob([new Uint8Array(data)]), fileName);

  logger.info(`Uploading ${fileName} (${data.byteLength} bytes) to upload API`);
  const response = await fetch(postUrl, { method: 'POST', body: form });
  const responseText = await response.text();
  if (!response.ok) {
    throw new UploadApiError(
      `Upload API request failed with HTTP status ${response.status} ${response.statusText}\n${responseText}`,
      response.status,
      parseRetryAfterMs(response),
    );
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse upload API response as JSON\n${responseText}`, { cause: e });
  }

  const url = json[responseField];
  if (typeof url !== 'string') {
    throw new Error(`Upload API response is missing a string "${responseField}" field\n${responseText}`);
  }

  let deleteUrl: string | null = null;
  if (env.UPLOAD_API_DELETE_URL_FIELD) {
    const rawDeleteUrl = json[env.UPLOAD_API_DELETE_URL_FIELD];
    deleteUrl = typeof rawDeleteUrl === 'string' ? rawDeleteUrl : null;
  }

  return { url, deleteUrl };
};

export const deleteUploadedFile = async (logger: NestableLogger, deleteUrl: string): Promise<void> => {
  logger.info(`Deleting uploaded file via ${deleteUrl}`);
  const response = await fetch(deleteUrl, { method: 'DELETE' });
  if (!response.ok) {
    const responseText = await response.text();
    throw new UploadApiError(
      `Delete request failed with HTTP status ${response.status} ${response.statusText}\n${responseText}`,
      response.status,
      parseRetryAfterMs(response),
    );
  }
};
