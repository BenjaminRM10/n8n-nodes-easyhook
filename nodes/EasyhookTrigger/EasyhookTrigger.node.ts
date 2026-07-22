import { createHmac, timingSafeEqual } from "crypto";
import type {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  IWebhookFunctions,
  IWebhookResponseData,
} from "n8n-workflow";
import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow";
import { easyhookRequest, readArray } from "../../shared/EasyhookClient";

export class EasyhookTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Easyhook Trigger",
    name: "easyhookTrigger",
    icon: {
      light: "file:easyhook.svg",
      dark: "file:easyhook.dark.svg",
    },
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["providers"]}}',
    description: "Starts a workflow when Easyhook sends a webhook event",
    eventTriggerDescription: "Waiting for Easyhook webhook events",
    defaults: {
      name: "Easyhook Trigger",
    },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: "easyhookApi", required: true }],
    webhooks: [
      {
        name: "default",
        httpMethod: "POST",
        responseMode: "onReceived",
        responseData: "firstEntryJson",
        path: "easyhook",
      },
    ],
    properties: [
      {
        displayName: "Provider",
        name: "providers",
        type: "options",
        options: [
          { name: "All Providers", value: "*" },
          { name: "Instagram", value: "instagram" },
          { name: "Messenger", value: "messenger" },
          { name: "WhatsApp", value: "whatsapp" },
        ],
        default: "*",
        required: true,
      },
      {
        displayName: "Event Names or IDs",
        name: "events",
        type: "multiOptions",
        typeOptions: {
          loadOptionsMethod: "getWebhookEvents",
          loadOptionsDependsOn: ["providers"],
        },
        default: ["*"],
        description:
          'Events that Easyhook will deliver to this workflow. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: "Scope Name or ID",
        name: "scopeType",
        type: "options",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        typeOptions: {
          loadOptionsMethod: "getWebhookScopeTypes",
          loadOptionsDependsOn: ["providers"],
        },
        default: "organization",
      },
      {
        displayName: "Account Name or ID",
        name: "scopeFrom",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getWebhookScopeIdentifiers",
          loadOptionsDependsOn: ["providers", "scopeType"],
        },
        default: "",
        required: true,
        description:
          'Connected accounts available to this Easyhook API credential. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        displayOptions: {
          show: {
            scopeType: ["waba", "phone", "channel"],
          },
        },
      },
    ],
    usableAsTool: true,
  };

  methods = {
    loadOptions: {
      async getWebhookEvents(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        return loadWebhookOptions.call(this, "events");
      },
      async getWebhookScopeTypes(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        return loadWebhookOptions.call(this, "scope_types");
      },
      async getWebhookScopeIdentifiers(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        return loadWebhookOptions.call(this, "scope_identifiers");
      },
    },
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData("node");
        const hookId =
          typeof data.easyhookWebhookId === "string"
            ? data.easyhookWebhookId
            : "";
        if (!hookId) return false;
        const response = await easyhookRequest.call(
          this,
          "GET",
          "/v1/webhooks",
        );
        const exists = readArray(response, "webhooks").some(
          (hook) => hook.id === hookId,
        );
        if (!exists) clearWebhookData(data);
        return exists;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl("default");
        if (!webhookUrl) {
          throw new NodeOperationError(
            this.getNode(),
            "n8n did not provide a production webhook URL",
          );
        }
        const data = this.getWorkflowStaticData("node");
        const workflow = this.getWorkflow();
        const node = this.getNode();
        const name = `n8n:${workflow.id ?? "workflow"}:${node.id ?? node.name}`;

        const existing = await easyhookRequest.call(
          this,
          "GET",
          "/v1/webhooks",
        );
        for (const hook of readArray(existing, "webhooks")) {
          if (
            hook.name === name &&
            hook.url === webhookUrl &&
            typeof hook.id === "string"
          ) {
            await easyhookRequest.call(
              this,
              "DELETE",
              `/v1/webhooks/${hook.id}`,
            );
          }
        }

        const provider = normalizeProvider(
          this.getNodeParameter("providers", "*"),
        );
        const requestedScopeType = this.getNodeParameter(
          "scopeType",
          "organization",
        ) as string;
        const options = await easyhookRequest.call(
          this,
          "GET",
          "/v1/webhooks/options",
          undefined,
          {
            provider,
            scope_type: requestedScopeType,
          },
        );
        const allowedEvents = new Set(readOptionValues(options, "events"));
        const selectedEvents = this.getNodeParameter("events", [
          "*",
        ]) as string[];
        const events = selectedEvents.filter((event) =>
          allowedEvents.has(event),
        );
        const allowedScopes = new Set(readOptionValues(options, "scope_types"));
        const scopeType = allowedScopes.has(requestedScopeType)
          ? requestedScopeType
          : "organization";
        const scopeFrom = this.getNodeParameter("scopeFrom", "") as string;
        if (
          scopeType !== "organization" &&
          !readOptionValues(options, "scope_identifiers").includes(scopeFrom)
        ) {
          throw new NodeOperationError(
            this.getNode(),
            "Select a connected Easyhook account for the chosen provider and scope",
          );
        }
        const response = await easyhookRequest.call(
          this,
          "POST",
          "/v1/webhooks",
          {
            name,
            url: webhookUrl,
            providers: [provider],
            events: events.length ? events : ["*"],
            auth_type: "hmac",
            scope:
              scopeType === "organization"
                ? { type: "organization" }
                : { type: scopeType, from: scopeFrom },
          },
        );
        const webhook = response.webhook as IDataObject | undefined;
        if (
          !webhook ||
          typeof webhook.id !== "string" ||
          typeof response.secret !== "string"
        ) {
          throw new NodeOperationError(
            this.getNode(),
            "Easyhook did not return the webhook ID and signing secret",
          );
        }
        data.easyhookWebhookId = webhook.id;
        data.easyhookWebhookSecret = response.secret;
        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData("node");
        const hookId =
          typeof data.easyhookWebhookId === "string"
            ? data.easyhookWebhookId
            : "";
        if (!hookId) return true;
        await easyhookRequest.call(this, "DELETE", `/v1/webhooks/${hookId}`);
        clearWebhookData(data);
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    if (!validateEasyhookAuth.call(this)) {
      const response = this.getResponseObject();
      response
        .status(401)
        .json({ ok: false, error: "invalid_easyhook_webhook_secret" });
      return { noWebhookResponse: true };
    }

    const body = this.getBodyData();
    const sync = isDataObject(body.sync) ? body.sync : {};
    const batchEvents = Array.isArray(body.events)
      ? body.events.filter(isDataObject)
      : [];
    const items: INodeExecutionData[] = batchEvents.length
      ? batchEvents.map((event) => ({
          json: {
            ...event,
            _sync: {
              batch_id: typeof body.id === "string" ? body.id : null,
              ...sync,
            },
          },
        }))
      : [{ json: { ...body } }];

    const workflowData: INodeExecutionData[][] = [items];
    return {
      workflowData,
      webhookResponse: { ok: true },
    };
  }
}

function isDataObject(value: unknown): value is IDataObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadWebhookOptions(
  this: ILoadOptionsFunctions,
  key: "events" | "scope_types" | "scope_identifiers",
): Promise<INodePropertyOptions[]> {
  const provider = normalizeProvider(this.getCurrentNodeParameter("providers"));
  const scopeType = String(
    this.getCurrentNodeParameter("scopeType") ?? "organization",
  );
  const response = await easyhookRequest.call(
    this,
    "GET",
    "/v1/webhooks/options",
    undefined,
    {
      provider,
      scope_type: scopeType,
    },
  );
  return readArray(response, key).flatMap((option) => {
    const name = typeof option.name === "string" ? option.name : "";
    const value = typeof option.value === "string" ? option.value : "";
    return name && value ? [{ name, value }] : [];
  });
}

function normalizeProvider(value: unknown): string {
  if (Array.isArray(value))
    return typeof value[0] === "string" ? value[0] : "*";
  return typeof value === "string" && value ? value : "*";
}

function readOptionValues(response: IDataObject, key: string): string[] {
  return readArray(response, key).flatMap((option) =>
    typeof option.value === "string" ? [option.value] : [],
  );
}

function validateEasyhookAuth(this: IWebhookFunctions): boolean {
  const headers = this.getHeaderData();
  const data = this.getWorkflowStaticData("node");
  const secret =
    typeof data.easyhookWebhookSecret === "string"
      ? data.easyhookWebhookSecret
      : "";
  const signature = readHeader(headers, "x-easyhook-signature");
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const provided = signature.slice("sha256=".length);
  const rawBody = readRawBody(this.getRequestObject(), this.getBodyData());
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(provided, expected);
}

function clearWebhookData(data: IDataObject): void {
  delete data.easyhookWebhookId;
  delete data.easyhookWebhookSecret;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const needle = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === needle,
  );
  const value = entry?.[1];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function readRawBody(
  request: { rawBody?: unknown },
  fallbackBody: IDataObject,
): Buffer | string {
  const rawBody = request.rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (typeof rawBody === "string") return rawBody;
  if (rawBody !== undefined) return JSON.stringify(rawBody);
  return JSON.stringify(fallbackBody);
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}
