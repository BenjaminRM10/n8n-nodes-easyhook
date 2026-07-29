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

export type EasyhookHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export async function easyhookRequest(
  this: EasyhookRequestFunctions,
  method: EasyhookHttpMethod,
  endpoint: string,
  body?: IDataObject,
  qs?: IDataObject,
  headers?: IDataObject,
): Promise<IDataObject> {
  const baseUrl = "https://api.easyhook.dev";
  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
    qs,
    body,
    headers,
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

export async function easyhookDownload(
  this: IExecuteFunctions,
  mediaUrl: string,
): Promise<Buffer> {
  const parsed = new URL(mediaUrl, "https://api.easyhook.dev");
  if (
    parsed.origin !== "https://api.easyhook.dev" ||
    !/^\/v1\/media\/[^/]+\/download\/?$/.test(parsed.pathname)
  ) {
    throw new NodeApiError(this.getNode(), {
      message: "Invalid Easyhook media URL",
      description:
        "Use the download_url delivered by Easyhook or /v1/media/{id}/download.",
    } as JsonObject);
  }
  const options: IHttpRequestOptions = {
    method: "GET",
    url: parsed.toString(),
    encoding: "arraybuffer",
  };

  try {
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      "easyhookApi",
      options,
    );
    if (Buffer.isBuffer(response)) return response;
    return Buffer.from(response as ArrayBuffer);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
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
