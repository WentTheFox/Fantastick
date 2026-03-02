import { ApiAuthType, ApiClient } from '../classes/api-client.js';
import { env } from '../env.js';

export const createUploadApiClient = () => new ApiClient(console, {
  baseUrl: env.UPLOAD_API_HOST,
  authentication: {
    type: ApiAuthType.CUSTOM_HEADER,
    headerName: 'upload_key',
    headerValueEnvKey: 'UPLOAD_KEY',
  },
  fixedHeaders: {
    domain: env.UPLOAD_API_DOMAIN,
  },
});
