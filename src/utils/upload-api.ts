import { ApiAuthType, ApiClient } from '@wentthefox-org/discord-bot-framework/api-client';
import { NestableLogger } from '@wentthefox-org/discord-bot-framework/logger';
import { env } from '../env.js';

export const createUploadApiClient = (logger: NestableLogger) => new ApiClient(logger, {
  baseUrl: env.UPLOAD_API_HOST,
  authentication: {
    type: ApiAuthType.CUSTOM_HEADER,
    headerName: 'upload_key',
    getValue: () => env.UPLOAD_KEY,
  },
  fixedHeaders: {
    domain: env.UPLOAD_API_DOMAIN,
  },
});
