import type {
  IDataObject,
  IExecuteFunctions,
  IHookFunctions,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  JsonObject,
} from "n8n-workflow";
import { NodeApiError } from "n8n-workflow";

export type EasyhookRequestFunctions =
  | IExecuteFunctions
  | ILoadOptionsFunctions
  | IHookFunctions;

export type EasyhookHttpMethod = "GET" | "POST" | "DELETE";

export async function easyhookRequest(
  this: EasyhookRequestFunctions,
  method: EasyhookHttpMethod,
  endpoint: string,
  body?: IDataObject,
  qs?: IDataObject,
): Promise<IDataObject> {
  const credentials = await this.getCredentials("easyhookApi");
  const baseUrl = normalizeBaseUrl(
    typeof credentials.baseUrl === "string"
      ? credentials.baseUrl
      : "https://api.easyhook.dev",
  );
  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
    qs,
    body,
    json: true,
  };

  try {
    return (await this.helpers.httpRequestWithAuthentication.call(
      this,
      "easyhookApi",
      options,
    )) as IDataObject;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim() || "https://api.easyhook.dev";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

export function cleanObject(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    output[key] = value;
  }
  return output;
}

export function readArray(value: unknown, key: string): IDataObject[] {
  if (!value || typeof value !== "object") return [];
  const raw = (value as IDataObject)[key];
  return Array.isArray(raw)
    ? raw.filter(
        (item): item is IDataObject =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}
