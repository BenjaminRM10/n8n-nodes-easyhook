import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

const messageOperations = ['sendText', 'sendMedia', 'sendTemplate', 'sendFlow'];
const mediaOperations = ['upload', 'list', 'delete'];
const templateOperations = ['list', 'sync'];
const scheduledMessageOperations = ['cancel'];

export class Easyhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Easyhook',
    name: 'easyhook',
    icon: 'file:easyhook.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Use Easyhook messaging APIs from n8n',
    defaults: {
      name: 'Easyhook',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'easyhookApi',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: '={{$credentials.baseUrl}}',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Media', value: 'media' },
          { name: 'Message', value: 'message' },
          { name: 'Scheduled Message', value: 'scheduledMessage' },
          { name: 'Template', value: 'template' },
        ],
        default: 'message',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['message'] } },
        options: [
          { name: 'Send Flow', value: 'sendFlow', action: 'Send a WhatsApp Flow' },
          { name: 'Send Media', value: 'sendMedia', action: 'Send media' },
          { name: 'Send Template', value: 'sendTemplate', action: 'Send a WhatsApp template' },
          { name: 'Send Text', value: 'sendText', action: 'Send a text message' },
        ],
        default: 'sendText',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['media'] } },
        options: [
          { name: 'Delete', value: 'delete', action: 'Delete reusable media' },
          { name: 'List', value: 'list', action: 'List reusable media' },
          { name: 'Upload', value: 'upload', action: 'Upload reusable media' },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['template'] } },
        options: [
          { name: 'List', value: 'list', action: 'List templates' },
          { name: 'Sync From Meta', value: 'sync', action: 'Sync templates from Meta' },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['scheduledMessage'] } },
        options: [
          { name: 'Cancel', value: 'cancel', action: 'Cancel a scheduled message' },
        ],
        default: 'cancel',
      },
      {
        displayName: 'From',
        name: 'from',
        type: 'string',
        default: '',
        required: true,
        description: 'Easyhook-connected WhatsApp sender number. Use digits when possible.',
        displayOptions: {
          show: {
            resource: ['message', 'media', 'template'],
            operation: [...messageOperations, 'upload', 'list', 'sync'],
          },
        },
      },
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        required: true,
        description: 'Customer WhatsApp number or channel recipient ID.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: messageOperations,
          },
        },
      },
      {
        displayName: 'Body',
        name: 'body',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendText'],
          },
        },
      },
      {
        displayName: 'Schedule At',
        name: 'at',
        type: 'string',
        default: '',
        placeholder: '2026-07-07T13:10:00-06:00',
        description: 'Optional ISO date/time. If empty, Easyhook sends immediately.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendText', 'sendMedia', 'sendTemplate'],
          },
        },
      },
      {
        displayName: 'Media Type',
        name: 'mediaType',
        type: 'options',
        options: [
          { name: 'Audio', value: 'audio' },
          { name: 'Document', value: 'document' },
          { name: 'Image', value: 'image' },
          { name: 'Sticker', value: 'sticker' },
          { name: 'Video', value: 'video' },
        ],
        default: 'image',
        displayOptions: {
          show: {
            resource: ['message', 'media'],
            operation: ['sendMedia', 'upload'],
          },
        },
      },
      {
        displayName: 'Media Reference Type',
        name: 'mediaReferenceType',
        type: 'options',
        options: [
          { name: 'Easyhook Media Name', value: 'media_name' },
          { name: 'Meta Media ID', value: 'id' },
          { name: 'Public Link', value: 'link' },
        ],
        default: 'media_name',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
          },
        },
      },
      {
        displayName: 'Media Name',
        name: 'mediaName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
            mediaReferenceType: ['media_name'],
          },
        },
      },
      {
        displayName: 'Meta Media ID',
        name: 'mediaId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
            mediaReferenceType: ['id'],
          },
        },
      },
      {
        displayName: 'Public Link',
        name: 'mediaLink',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
            mediaReferenceType: ['link'],
          },
        },
      },
      {
        displayName: 'Caption',
        name: 'caption',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
          },
        },
      },
      {
        displayName: 'Filename',
        name: 'filename',
        type: 'string',
        default: '',
        description: 'Optional filename for document messages.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendMedia'],
            mediaType: ['document'],
          },
        },
      },
      {
        displayName: 'Template JSON',
        name: 'templateJson',
        type: 'json',
        default: '{\n  "name": "order_ready",\n  "language": "es_MX"\n}',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
          },
        },
      },
      {
        displayName: 'Parameters JSON',
        name: 'parametersJson',
        type: 'json',
        default: '{}',
        description: 'Optional Easyhook parameters object, for example {"body":["Benjamin"]}.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
          },
        },
      },
      {
        displayName: 'Flow Name',
        name: 'flowName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendFlow'],
          },
        },
      },
      {
        displayName: 'Message Body',
        name: 'flowBody',
        type: 'string',
        default: 'Open this form',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendFlow'],
          },
        },
      },
      {
        displayName: 'Button Text',
        name: 'flowCta',
        type: 'string',
        default: 'Open',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendFlow'],
          },
        },
      },
      {
        displayName: 'Flow Payload JSON',
        name: 'flowPayloadJson',
        type: 'json',
        default: '{}',
        description: 'Optional data sent to the Flow.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendFlow'],
          },
        },
      },
      {
        displayName: 'Media Name',
        name: 'uploadName',
        type: 'string',
        default: '',
        required: true,
        description: 'Unique reusable media name inside the WABA.',
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
          },
        },
      },
      {
        displayName: 'Upload Source',
        name: 'uploadSource',
        type: 'options',
        options: [
          { name: 'Base64 Field', value: 'base64' },
          { name: 'Binary Property', value: 'binary' },
        ],
        default: 'binary',
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
          },
        },
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            uploadSource: ['binary'],
          },
        },
      },
      {
        displayName: 'File Base64',
        name: 'fileBase64',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            uploadSource: ['base64'],
          },
        },
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            uploadSource: ['base64'],
          },
        },
      },
      {
        displayName: 'File MIME Type',
        name: 'fileType',
        type: 'string',
        default: '',
        placeholder: 'image/png',
        required: true,
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            uploadSource: ['base64'],
          },
        },
      },
      {
        displayName: 'Media Asset ID',
        name: 'mediaAssetId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['delete'],
          },
        },
      },
      {
        displayName: 'Scheduled Message ID',
        name: 'scheduledMessageId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['scheduledMessage'],
            operation: ['cancel'],
          },
        },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Return Raw Response',
            name: 'returnRaw',
            type: 'boolean',
            default: false,
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;
        const response = await executeOperation.call(this, resource, operation, i);
        returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

async function executeOperation(this: IExecuteFunctions, resource: string, operation: string, itemIndex: number): Promise<IDataObject> {
  if (resource === 'message') return executeMessageOperation.call(this, operation, itemIndex);
  if (resource === 'media') return executeMediaOperation.call(this, operation, itemIndex);
  if (resource === 'template') return executeTemplateOperation.call(this, operation, itemIndex);
  if (resource === 'scheduledMessage') return executeScheduledMessageOperation.call(this, operation, itemIndex);
  throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, { itemIndex });
}

async function executeMessageOperation(this: IExecuteFunctions, operation: string, itemIndex: number): Promise<IDataObject> {
  const from = this.getNodeParameter('from', itemIndex) as string;
  const to = this.getNodeParameter('to', itemIndex) as string;

  if (operation === 'sendText') {
    const body = this.getNodeParameter('body', itemIndex) as string;
    const at = this.getNodeParameter('at', itemIndex, '') as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/text', cleanObject({ from, to, body, at }));
  }

  if (operation === 'sendMedia') {
    const type = this.getNodeParameter('mediaType', itemIndex) as string;
    const referenceType = this.getNodeParameter('mediaReferenceType', itemIndex) as string;
    const caption = this.getNodeParameter('caption', itemIndex, '') as string;
    const filename = this.getNodeParameter('filename', itemIndex, '') as string;
    const at = this.getNodeParameter('at', itemIndex, '') as string;
    const body: IDataObject = cleanObject({ from, to, type, caption, filename, at });
    if (referenceType === 'media_name') body.media_name = this.getNodeParameter('mediaName', itemIndex) as string;
    if (referenceType === 'id') body.id = this.getNodeParameter('mediaId', itemIndex) as string;
    if (referenceType === 'link') body.link = this.getNodeParameter('mediaLink', itemIndex) as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/media', body);
  }

  if (operation === 'sendTemplate') {
    const at = this.getNodeParameter('at', itemIndex, '') as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/template', cleanObject({
      from,
      to,
      template: parseJsonParameter.call(this, 'templateJson', itemIndex),
      parameters: parseJsonParameter.call(this, 'parametersJson', itemIndex, {}),
      at,
    }));
  }

  if (operation === 'sendFlow') {
    return easyhookRequest.call(this, 'POST', '/v1/messages/flow', cleanObject({
      from,
      to,
      flow_name: this.getNodeParameter('flowName', itemIndex) as string,
      body: this.getNodeParameter('flowBody', itemIndex) as string,
      cta: this.getNodeParameter('flowCta', itemIndex) as string,
      payload: parseJsonParameter.call(this, 'flowPayloadJson', itemIndex, {}),
    }));
  }

  throw new NodeOperationError(this.getNode(), `Unsupported message operation: ${operation}`, { itemIndex });
}

async function executeMediaOperation(this: IExecuteFunctions, operation: string, itemIndex: number): Promise<IDataObject> {
  if (operation === 'list') {
    const from = this.getNodeParameter('from', itemIndex) as string;
    return easyhookRequest.call(this, 'GET', '/v1/media', undefined, { from });
  }

  if (operation === 'delete') {
    const id = this.getNodeParameter('mediaAssetId', itemIndex) as string;
    return easyhookRequest.call(this, 'DELETE', `/v1/media/${encodeURIComponent(id)}`);
  }

  if (operation === 'upload') {
    const from = this.getNodeParameter('from', itemIndex) as string;
    const name = this.getNodeParameter('uploadName', itemIndex) as string;
    const type = this.getNodeParameter('mediaType', itemIndex) as string;
    const uploadSource = this.getNodeParameter('uploadSource', itemIndex) as string;
    const body: IDataObject = { from, name, type };

    if (uploadSource === 'binary') {
      const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
      const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
      const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
      body.file_name = binaryData.fileName ?? name;
      body.file_type = binaryData.mimeType ?? 'application/octet-stream';
      body.file_base64 = buffer.toString('base64');
    } else {
      body.file_name = this.getNodeParameter('fileName', itemIndex) as string;
      body.file_type = this.getNodeParameter('fileType', itemIndex) as string;
      body.file_base64 = this.getNodeParameter('fileBase64', itemIndex) as string;
    }

    return easyhookRequest.call(this, 'POST', '/v1/media', body);
  }

  throw new NodeOperationError(this.getNode(), `Unsupported media operation: ${operation}`, { itemIndex });
}

async function executeTemplateOperation(this: IExecuteFunctions, operation: string, itemIndex: number): Promise<IDataObject> {
  const from = this.getNodeParameter('from', itemIndex) as string;
  if (operation === 'list') return easyhookRequest.call(this, 'GET', '/v1/templates', undefined, { from });
  if (operation === 'sync') return easyhookRequest.call(this, 'POST', '/v1/templates/sync', { from });
  throw new NodeOperationError(this.getNode(), `Unsupported template operation: ${operation}`, { itemIndex });
}

async function executeScheduledMessageOperation(this: IExecuteFunctions, operation: string, itemIndex: number): Promise<IDataObject> {
  if (operation === 'cancel') {
    const id = this.getNodeParameter('scheduledMessageId', itemIndex) as string;
    return easyhookRequest.call(this, 'DELETE', `/v1/scheduled-messages/${encodeURIComponent(id)}`);
  }
  throw new NodeOperationError(this.getNode(), `Unsupported scheduled message operation: ${operation}`, { itemIndex });
}

async function easyhookRequest(
  this: IExecuteFunctions,
  method: HttpMethod,
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

function parseJsonParameter(this: IExecuteFunctions, name: string, itemIndex: number, fallback?: IDataObject): IDataObject {
  const value = this.getNodeParameter(name, itemIndex, fallback ?? {}) as IDataObject | string;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as IDataObject;
  } catch (error) {
    throw new NodeOperationError(this.getNode(), `${name} must be valid JSON`, { itemIndex });
  }
}

function cleanObject(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    output[key] = value;
  }
  return output;
}
