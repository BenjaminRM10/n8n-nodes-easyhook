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
    throw easyhookApiError(this, error);
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
    throw easyhookApiError(this, error);
  }
}

function errorObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try { return errorObject(JSON.parse(value)); } catch { return undefined; }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function easyhookApiError(context: EasyhookRequestFunctions, error: unknown): NodeApiError {
  const outer = errorObject(error) ?? {};
  const reason = errorObject(outer.reason) ?? outer;
  const response = errorObject(reason.response) ?? {};
  const body = [response.data, response.body, reason.error, reason.body, reason]
    .map(errorObject)
    .find((value) => typeof value?.error === "string" && /^[a-z][a-z0-9_]{1,120}$/.test(value.error));
  if (!body) return new NodeApiError(context.getNode(), error as JsonObject);

  // Keep actionable diagnostics, never the HTTP request/config (API credentials)
  // or arbitrary provider payloads in workflow output.
  const diagnostic: IDataObject = { error_code: body.error as string };
  for (const key of ["request_id", "delivery_state", "required_action"] as const) {
    if (typeof body[key] === "string" && /^[a-zA-Z0-9_.:-]{1,200}$/.test(body[key])) {
      diagnostic[key] = body[key];
    }
  }
  if (typeof body.retryable === "boolean") diagnostic.retryable = body.retryable;
  const status = Number(response.status ?? response.statusCode ?? reason.statusCode ?? outer.httpCode);
  if (Number.isInteger(status) && status >= 400 && status <= 599) diagnostic.http_status = status;
  const message = `${body.error}${diagnostic.request_id ? ` · request_id: ${diagnostic.request_id}` : ""}`;
  const normalized = new NodeApiError(context.getNode(), { message }, {
    message,
    httpCode: diagnostic.http_status ? String(diagnostic.http_status) : undefined,
  });
  normalized.context.easyhook = diagnostic;
  return normalized;
}

export function easyhookErrorOutput(error: unknown): IDataObject {
  return {
    error: error instanceof Error ? error.message : String(error),
    ...(error instanceof NodeApiError ? errorObject(error.context.easyhook) : {}),
  };
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
