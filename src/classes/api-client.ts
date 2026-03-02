import { Readable } from 'node:stream';
import { URL } from 'node:url';
import { IValidation } from 'typia';
import { env } from '../env.js';
import { ApiHttpException } from './api-http-exception.class.js';

export enum ApiAuthType {
  QUERY_PARAM = 'query_param',
  AUTHORIZATION_HEADER = 'bearer',
  CUSTOM_HEADER = 'custom_header',
  PATH_SEGMENT = 'path_segment',
}

export interface BaseApiAuthMethod {
  type: ApiAuthType;
}

export interface QueryParamApiAuthMethod extends BaseApiAuthMethod {
  type: ApiAuthType.QUERY_PARAM;
  paramName: string;
  /**
   * Key in the process.env object that contains the param value
   */
  paramValueEnvKey: keyof typeof env;
}

export interface BearerTokenApiAuthMethod extends BaseApiAuthMethod {
  type: ApiAuthType.AUTHORIZATION_HEADER;
  /**
   * @default 'Bearer'
   */
  tokenType?: string;
  /**
   * Key in the process.env object that contains the token
   */
  tokenEnvKey: keyof typeof env;
}

export interface CustomHeaderApiAuthMethod extends BaseApiAuthMethod {
  type: ApiAuthType.CUSTOM_HEADER;
  headerName: string;
  /**
   * Key in the process.env object that contains the header value
   */
  headerValueEnvKey: keyof typeof env;
}

export interface PathSegmentApiAuthMethod extends BaseApiAuthMethod {
  type: ApiAuthType.PATH_SEGMENT;
  /**
   * Key in the process.env object that contains the token
   */
  tokenEnvKey: keyof typeof env;
}

export type ApiAuthMethods =
  | QueryParamApiAuthMethod
  | BearerTokenApiAuthMethod
  | PathSegmentApiAuthMethod
  | CustomHeaderApiAuthMethod;

export interface ApiRequest<T> {
  path: string;
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  /**
   * If true, the response will not be JSON parsed
   */
  raw?: boolean;
  validator: (data: unknown) => IValidation<T>;
  /**
   * Throw an error if the response does not pass validation
   * @default true
   */
  failOnInvalidResponse?: boolean;
}

export interface ApiResponse<T> {
  responseText: string | undefined;
  response: T;
  validation: IValidation<T>;
  ok: boolean;
}

export class ApiClient {
  constructor(
    private logger: Console,
    public readonly options: Readonly<{
      readonly baseUrl: string;
      readonly authentication?: Readonly<ApiAuthMethods>;
      readonly fixedHeaders?: Readonly<Record<string, string>>;
    }>,
    private fetchImpl: typeof fetch = globalThis.fetch,
  ) {
  }

  public async request<T>(params: ApiRequest<T>): Promise<ApiResponse<T>> {
    const {
      failOnInvalidResponse = true,
      query,
      path,
      body,
      method = 'GET',
      raw,
      validator,
    } = params;
    let responseText: string | undefined;
    let response: unknown;
    let r: Response | undefined;
    const queryParams = new URLSearchParams();
    if (this.options.authentication?.type === ApiAuthType.QUERY_PARAM) {
      queryParams.set(
        this.options.authentication.paramName,
        this.getEnv(this.options.authentication.paramValueEnvKey),
      );
    }
    if (query) {
      Object.keys(query).forEach((key) => {
        queryParams.set(key, query?.[key] ?? '');
      });
    }
    let requestUrlRaw = this.options.baseUrl + this.normalizePath(path);
    if (this.options.authentication?.type === ApiAuthType.PATH_SEGMENT) {
      requestUrlRaw = requestUrlRaw.replace(/:token/, this.getEnv(this.options.authentication.tokenEnvKey));
    }
    const requestUrlBuilder = new URL(requestUrlRaw);
    requestUrlBuilder.search = this.normalizeQueryParams(queryParams);
    const errorPrefix = `fetch ${method} ${String(requestUrlBuilder)}:`;

    try {
      const requestHeaders: Record<string, string> = {
        ...this.options.fixedHeaders,
      };
      if (!raw) {
        requestHeaders['Accept'] = 'application/json';
      }
      const requestBody =
        typeof body !== 'undefined' ? JSON.stringify(body) : undefined;
      if (body) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      if (this.options.authentication?.type === ApiAuthType.AUTHORIZATION_HEADER) {
        requestHeaders['Authorization'] =
          `${this.options.authentication.tokenType ?? 'Bearer'} ${this.getEnv(this.options.authentication.tokenEnvKey)}`;
      } else if (this.options.authentication?.type === ApiAuthType.CUSTOM_HEADER) {
        requestHeaders[this.options.authentication.headerName] = this.getEnv(this.options.authentication.headerValueEnvKey);
      }
      r = await this.fetchImpl(requestUrlBuilder, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });
      if (r.ok && !raw) {
        responseText = await r.text();
      }
    } catch (e) {
      const errorMessage = `${errorPrefix} Failed API request`;
      this.logger.error(errorMessage, e);
      throw new ApiHttpException(errorMessage, 500, e);
    }
    if (!r.ok) {
      const clientSideMessage = `API request failed with HTTP status ${r.status} ${r.statusText}`;
      const errorMessage = `${errorPrefix} ${clientSideMessage}\n${responseText}`;
      this.logger.error(errorMessage);
      throw new ApiHttpException(clientSideMessage, r.status);
    }

    if (raw) {
      const requestBody = r.body;
      if (requestBody !== null) {
        response = Readable.fromWeb(requestBody as never);
      }
    } else {
      try {
        if (responseText) {
          response = JSON.parse(responseText);
        }
      } catch (e) {
        const clientSideMessage = 'Failed to parse response as JSON';
        const errorMessage = `${errorPrefix} Failed to parse response as JSON\n${responseText}`;
        this.logger.error(errorMessage, e);
        throw new ApiHttpException(clientSideMessage, 500, e);
      }
    }

    const validation = validator(response);
    if (!validation.success) {
      const clientSideMessage = 'Response validation failed';
      const errorMessage = `${errorPrefix} ${clientSideMessage}\n${responseText}\n${['', ...validation.errors.map((err) => JSON.stringify(err))].join('\n- ')}`;
      if (failOnInvalidResponse) {
        throw new ApiHttpException(clientSideMessage, 500, validation.errors);
      }
      this.logger.warn(errorMessage);
    }

    return {
      responseText,
      response: response as T,
      validation,
      ok: r?.ok ?? false,
    };
  }

  public normalizePath(path: string | undefined): string {
    if (!path || path.length === 0) {
      return '/';
    }
    return path.replace(/^([^/])/, '/$1');
  }

  public getEnv(envVarName: keyof typeof env): string {
    const envVar = env[envVarName] as unknown;
    if (typeof envVar !== 'string' || envVar.length === 0) {
      throw new Error(`${envVarName} environment variable is not set`);
    }
    return envVar;
  }

  public normalizeQueryParams(queryParams: URLSearchParams): string {
    return queryParams.size > 0 ? `?${queryParams.toString()}` : '';
  }
}
