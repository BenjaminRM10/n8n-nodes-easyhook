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
  const options: IRequestOptions = {
    method,
    uri: endpoint,
    qs,
    body,
    json: true,
  };

  return await this.helpers.requestWithAuthentication.call(this, 'easyhookApi', options) as IDataObject;
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
