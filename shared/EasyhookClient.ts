import type {
  IDataObject,
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IRequestOptions,
} from 'n8n-workflow';

export type EasyhookRequestFunctions = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

export type EasyhookHttpMethod = 'GET' | 'POST' | 'DELETE';

export async function easyhookRequest(
  this: EasyhookRequestFunctions,
  method: EasyhookHttpMethod,
  endpoint: string,
  body?: IDataObject,
  qs?: IDataObject,
): Promise<IDataObject> {
  const credentials = await this.getCredentials('easyhookApi');
  const baseUrl = normalizeBaseUrl(typeof credentials.baseUrl === 'string' ? credentials.baseUrl : 'https://api.easyhook.dev');
  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    qs,
    body,
    json: true,
  };

  try {
    return await this.helpers.requestWithAuthentication.call(this, 'easyhookApi', options) as IDataObject;
  } catch (error) {
    throw new Error(formatEasyhookError(error));
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim() || 'https://api.easyhook.dev';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '').replace(/\/v1$/i, '');
}

function formatEasyhookError(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error);
  const record = error as Record<string, unknown>;
  const response = readRecord(record.response);
  const body = readRecordOrJson(response?.body) ?? readRecordOrJson(record.error) ?? readRecordOrJson(record.cause);
  const statusCode = response?.statusCode ?? response?.status ?? record.statusCode ?? record.httpCode;
  const code = readString(body?.error) ?? readString(body?.code) ?? readString(record.code);
  const message = readString(body?.message) ?? readString(record.message);
  const details = readString(body?.details) ?? readString(body?.description);
  return [
    statusCode ? `Easyhook API error ${statusCode}` : 'Easyhook API error',
    code,
    details ?? message,
  ].filter(Boolean).join(': ');
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readRecordOrJson(value: unknown): Record<string, unknown> | null {
  const record = readRecord(value);
  if (record) return record;
  if (typeof value !== 'string') return null;
  try {
    return readRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function cleanObject(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    output[key] = value;
  }
  return output;
}

export function readArray(value: unknown, key: string): IDataObject[] {
  if (!value || typeof value !== 'object') return [];
  const raw = (value as IDataObject)[key];
  return Array.isArray(raw) ? raw.filter((item): item is IDataObject => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
