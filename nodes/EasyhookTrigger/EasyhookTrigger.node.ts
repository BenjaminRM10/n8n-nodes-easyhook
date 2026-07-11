import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHookFunctions,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';
import { easyhookRequest, readArray } from '../../shared/EasyhookClient';

const eventOptions = [
  { name: 'All Events', value: '*' },
  { name: 'Account Updates', value: 'account_update.*' },
  { name: 'Coexistence App State', value: 'smb_app_state_sync.*' },
  { name: 'Coexistence Message Echoes', value: 'smb_message_echo.*' },
  { name: 'Flow Submissions', value: 'flow.submission.*' },
  { name: 'History Sync', value: 'history.*' },
  { name: 'Instagram Messages', value: 'instagram.message.*' },
  { name: 'Media Events', value: 'media.*' },
  { name: 'Messages', value: 'message.*' },
  { name: 'Messages: Images', value: 'message.image' },
  { name: 'Messages: Text', value: 'message.text' },
  { name: 'Messenger Messages', value: 'messenger.message.*' },
  { name: 'Status: Failed', value: 'status.failed' },
  { name: 'Status Updates', value: 'status.*' },
  { name: 'Template Updates', value: 'template.*' },
];

export class EasyhookTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Easyhook Trigger',
    name: 'easyhookTrigger',
    icon: 'file:easyhook.png',
    group: ['trigger'],
    version: 1,
    description: 'Starts a workflow when Easyhook sends a webhook event',
    eventTriggerDescription: 'Waiting for Easyhook webhook events',
    defaults: {
      name: 'Easyhook Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'easyhookApi', required: true }],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        responseData: 'firstEntryJson',
        path: 'easyhook',
      },
    ],
    properties: [
      {
        displayName: 'Provider',
        name: 'providers',
        type: 'multiOptions',
        options: [
          { name: 'All Providers', value: '*' },
          { name: 'WhatsApp', value: 'whatsapp' },
          { name: 'Messenger', value: 'messenger' },
          { name: 'Instagram', value: 'instagram' },
        ],
        default: ['*'],
        required: true,
      },
      {
        displayName: 'Expected Events',
        name: 'events',
        type: 'multiOptions',
        options: eventOptions,
        default: ['*'],
        description: 'Events that Easyhook will deliver to this workflow.',
      },
      {
        displayName: 'Scope',
        name: 'scopeType',
        type: 'options',
        options: [
          { name: 'Entire Organization', value: 'organization' },
          { name: 'WhatsApp Business Account', value: 'waba' },
          { name: 'WhatsApp Number', value: 'phone' },
          { name: 'Messenger or Instagram Channel', value: 'channel' },
        ],
        default: 'organization',
      },
      {
        displayName: 'Scope Identifier',
        name: 'scopeFrom',
        type: 'string',
        default: '',
        required: true,
        placeholder: '5218661479075 or channel alias',
        description: 'Use a WhatsApp number for a phone or WABA scope, or a Messenger/Instagram channel alias for a channel scope.',
        displayOptions: {
          show: {
            scopeType: ['waba', 'phone', 'channel'],
          },
        },
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData('node');
        const hookId = typeof data.easyhookWebhookId === 'string' ? data.easyhookWebhookId : '';
        if (!hookId) return false;
        const response = await easyhookRequest.call(this, 'GET', '/v1/webhooks');
        const exists = readArray(response, 'webhooks').some((hook) => hook.id === hookId);
        if (!exists) clearWebhookData(data);
        return exists;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        if (!webhookUrl) throw new Error('n8n did not provide a production webhook URL');
        const data = this.getWorkflowStaticData('node');
        const workflow = this.getWorkflow();
        const node = this.getNode();
        const name = `n8n:${workflow.id ?? 'workflow'}:${node.id ?? node.name}`;

        const existing = await easyhookRequest.call(this, 'GET', '/v1/webhooks');
        for (const hook of readArray(existing, 'webhooks')) {
          if (hook.name === name && hook.url === webhookUrl && typeof hook.id === 'string') {
            await easyhookRequest.call(this, 'DELETE', `/v1/webhooks/${hook.id}`);
          }
        }

        const scopeType = this.getNodeParameter('scopeType', 'organization') as string;
        const scopeFrom = this.getNodeParameter('scopeFrom', '') as string;
        const response = await easyhookRequest.call(this, 'POST', '/v1/webhooks', {
          name,
          url: webhookUrl,
          providers: this.getNodeParameter('providers', ['*']) as string[],
          events: this.getNodeParameter('events', ['*']) as string[],
          auth_type: 'hmac',
          scope: scopeType === 'organization' ? { type: 'organization' } : { type: scopeType, from: scopeFrom },
        });
        const webhook = response.webhook as IDataObject | undefined;
        if (!webhook || typeof webhook.id !== 'string' || typeof response.secret !== 'string') {
          throw new Error('Easyhook did not return the webhook ID and signing secret');
        }
        data.easyhookWebhookId = webhook.id;
        data.easyhookWebhookSecret = response.secret;
        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData('node');
        const hookId = typeof data.easyhookWebhookId === 'string' ? data.easyhookWebhookId : '';
        if (!hookId) return true;
        await easyhookRequest.call(this, 'DELETE', `/v1/webhooks/${hookId}`);
        clearWebhookData(data);
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    if (!validateEasyhookAuth.call(this)) {
      const response = this.getResponseObject();
      response.status(401).json({ ok: false, error: 'invalid_easyhook_webhook_secret' });
      return { noWebhookResponse: true };
    }

    const body = this.getBodyData();
    const json: IDataObject = {
      ...body,
    };

    const workflowData: INodeExecutionData[][] = [[{ json }]];
    return {
      workflowData,
      webhookResponse: { ok: true },
    };
  }
}

function validateEasyhookAuth(this: IWebhookFunctions): boolean {
  const headers = this.getHeaderData();
  const data = this.getWorkflowStaticData('node');
  const secret = typeof data.easyhookWebhookSecret === 'string' ? data.easyhookWebhookSecret : '';
  const signature = readHeader(headers, 'x-easyhook-signature');
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const provided = signature.slice('sha256='.length);
  const rawBody = readRawBody(this.getRequestObject(), this.getBodyData());
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeCompare(provided, expected);
}

function clearWebhookData(data: IDataObject): void {
  delete data.easyhookWebhookId;
  delete data.easyhookWebhookSecret;
}

function readHeader(headers: Record<string, string | string[] | undefined>, name: string): string | null {
  const needle = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === needle);
  const value = entry?.[1];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
}

function readRawBody(request: { rawBody?: unknown }, fallbackBody: IDataObject): Buffer | string {
  const rawBody = request.rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (typeof rawBody === 'string') return rawBody;
  if (rawBody !== undefined) return JSON.stringify(rawBody);
  return JSON.stringify(fallbackBody);
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}
