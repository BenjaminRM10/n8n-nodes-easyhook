import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { cleanObject, easyhookRequest, readArray } from '../../shared/EasyhookClient';

const messageOperations = ['sendText', 'sendMedia', 'sendTemplate', 'sendFlow', 'sendRead', 'sendTyping'];
const recipientMessageOperations = ['sendText', 'sendMedia', 'sendTemplate', 'sendFlow'];
const templateLanguageOptions: INodePropertyOptions[] = [
  ['af', 'Afrikaans'], ['sq', 'Albanian'], ['ar', 'Arabic'], ['az', 'Azerbaijani'], ['bn', 'Bengali'], ['bg', 'Bulgarian'], ['ca', 'Catalan'], ['zh_CN', 'Chinese (China)'], ['zh_HK', 'Chinese (Hong Kong)'], ['zh_TW', 'Chinese (Taiwan)'],
  ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'], ['nl', 'Dutch'], ['en', 'English'], ['en_GB', 'English (UK)'], ['en_US', 'English (US)'], ['et', 'Estonian'], ['fil', 'Filipino'], ['fi', 'Finnish'],
  ['fr', 'French'], ['de', 'German'], ['el', 'Greek'], ['gu', 'Gujarati'], ['ha', 'Hausa'], ['he', 'Hebrew'], ['hi', 'Hindi'], ['hu', 'Hungarian'], ['id', 'Indonesian'], ['ga', 'Irish'],
  ['it', 'Italian'], ['ja', 'Japanese'], ['kn', 'Kannada'], ['kk', 'Kazakh'], ['ko', 'Korean'], ['lo', 'Lao'], ['lv', 'Latvian'], ['lt', 'Lithuanian'], ['mk', 'Macedonian'], ['ms', 'Malay'],
  ['ml', 'Malayalam'], ['mr', 'Marathi'], ['nb', 'Norwegian'], ['fa', 'Persian'], ['pl', 'Polish'], ['pt_BR', 'Portuguese (Brazil)'], ['pt_PT', 'Portuguese (Portugal)'], ['pa', 'Punjabi'], ['ro', 'Romanian'], ['ru', 'Russian'],
  ['sr', 'Serbian'], ['sk', 'Slovak'], ['sl', 'Slovenian'], ['es', 'Spanish'], ['es_AR', 'Spanish (Argentina)'], ['es_ES', 'Spanish (Spain)'], ['es_MX', 'Spanish (Mexico)'], ['sw', 'Swahili'], ['sv', 'Swedish'], ['ta', 'Tamil'],
  ['te', 'Telugu'], ['th', 'Thai'], ['tr', 'Turkish'], ['uk', 'Ukrainian'], ['ur', 'Urdu'], ['uz', 'Uzbek'], ['vi', 'Vietnamese'], ['zu', 'Zulu'],
].map(([value, label]) => ({ name: `${value} · ${label}`, value }));

export class Easyhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Easyhook',
    name: 'easyhook',
    icon: 'file:easyhook.png',
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
          { name: 'Send Read Receipt', value: 'sendRead', action: 'Mark a WhatsApp message as read' },
          { name: 'Send Flow', value: 'sendFlow', action: 'Send a WhatsApp Flow' },
          { name: 'Send Media', value: 'sendMedia', action: 'Send media' },
          { name: 'Send Template', value: 'sendTemplate', action: 'Send a WhatsApp template' },
          { name: 'Send Text', value: 'sendText', action: 'Send a text message' },
          { name: 'Send Typing Indicator', value: 'sendTyping', action: 'Show WhatsApp typing indicator' },
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
            operation: recipientMessageOperations,
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
        displayName: 'Delivery',
        name: 'humanizedDelivery',
        type: 'options',
        options: [
          { name: 'Standard', value: 'standard' },
          { name: 'Humanized', value: 'humanized' },
        ],
        default: 'standard',
        description: 'Mark the latest inbound message as read, wait a human-like read/typing delay, show typing, then send the text.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendText'],
          },
        },
      },
      {
        displayName: 'Inbound Message ID',
        name: 'messageId',
        type: 'string',
        default: '',
        description: 'Optional WhatsApp wamid to mark as read/typing. If empty for humanized delivery, Easyhook uses the latest inbound message from To.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendText', 'sendRead', 'sendTyping'],
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
          hide: {
            humanizedDelivery: [true, 'humanized'],
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
        displayName: 'Template Source',
        name: 'templateSource',
        type: 'options',
        options: [
          { name: 'Enter Manually', value: 'manual' },
          { name: 'Choose From Easyhook', value: 'list' },
        ],
        default: 'manual',
        description: 'Manual mode is the most reliable option. Choose From Easyhook loads approved templates and variables when your n8n instance can reach Easyhook.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
          },
        },
      },
      {
        displayName: 'Template',
        name: 'templateSelection',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getTemplates',
          loadOptionsDependsOn: ['from'],
        },
        default: '',
        required: true,
        description: 'Templates are loaded from Easyhook for the WABA behind From.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['list'],
          },
        },
      },
      {
        displayName: 'Template Name',
        name: 'templateName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['manual'],
          },
        },
      },
      {
        displayName: 'Language',
        name: 'templateLanguage',
        type: 'options',
        options: templateLanguageOptions,
        default: 'es_MX',
        required: true,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['manual'],
          },
        },
      },
      {
        displayName: 'Template Data',
        name: 'templateDataMode',
        type: 'options',
        options: [
          { name: 'Map Automatically', value: 'mapped' },
          { name: 'Custom Components (JSON)', value: 'custom' },
        ],
        default: 'mapped',
        description: 'Automatic mode reads the approved template definition. Custom mode sends raw Meta components.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['list'],
          },
        },
      },
      {
        displayName: 'Template Variables',
        name: 'templateVariableMapping',
        type: 'resourceMapper',
        noDataExpression: true,
        default: {
          mappingMode: 'defineBelow',
          value: null,
        },
        required: false,
        typeOptions: {
          loadOptionsDependsOn: ['from', 'templateSelection'],
          resourceMapper: {
            resourceMapperMethod: 'getTemplateVariables',
            mode: 'add',
            valuesLabel: 'Template Values',
            fieldWords: {
              singular: 'variable',
              plural: 'variables',
            },
            addAllFields: true,
            supportAutoMap: false,
            noFieldsError: 'This template does not require runtime values.',
          },
        },
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['list'],
            templateDataMode: ['mapped'],
          },
        },
      },
      {
        displayName: 'Custom Components (JSON)',
        name: 'templateCustomComponents',
        type: 'json',
        default: '[]',
        required: true,
        description: 'Raw Meta components array, or an object containing a components array. This cannot change the approved template text.',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['list'],
            templateDataMode: ['custom'],
          },
        },
      },
      {
        displayName: 'Template Variables',
        name: 'templateVariables',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        placeholder: 'Add Variable',
        options: [
          {
            displayName: 'Header Variable',
            name: 'header',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'One header variable value.',
              },
            ],
          },
          {
            displayName: 'Body Variable',
            name: 'body',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'One body variable value, in template order.',
              },
            ],
          },
          {
            displayName: 'Button Variable',
            name: 'button',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'One button variable value.',
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendTemplate'],
            templateSource: ['manual'],
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
        displayName: 'Flow Data',
        name: 'flowData',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        placeholder: 'Add Field',
        options: [
          {
            displayName: 'Field',
            name: 'field',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
              },
            ],
          },
        ],
        description: 'Optional data sent to the Flow as key/value pairs.',
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

  methods = {
    loadOptions: {
      async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const from = this.getCurrentNodeParameter('from') as string | undefined;
        if (!from) return [];
        const syncResponse = await easyhookRequest.call(this, 'POST', '/v1/templates/sync', { from });
        const response = Object.prototype.hasOwnProperty.call(syncResponse, 'templates')
          ? syncResponse
          : await easyhookRequest.call(this, 'GET', '/v1/templates', undefined, { from });
        const templates = readArray(response, 'templates').filter(isApprovedTemplate);
        return templates.map((template) => {
          const name = readTemplateString(template, 'name');
          const language = readTemplateLanguage(template);
          const category = readTemplateString(template, 'category');
          return {
            name: [name, language, category].filter(Boolean).join(' · '),
            value: JSON.stringify({ name, language }),
            description: 'Easyhook WhatsApp template',
          };
        }).filter((option) => option.name && option.value);
      },
    },
    resourceMapping: {
      async getTemplateVariables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
        const from = this.getCurrentNodeParameter('from') as string | undefined;
        const rawSelection = this.getCurrentNodeParameter('templateSelection') as string | undefined;
        if (!from || !rawSelection) return { fields: [] };

        const selected = parseTemplateSelection(rawSelection);
        const response = await easyhookRequest.call(this, 'GET', '/v1/templates', undefined, { from });
        const templates = readArray(response, 'templates');
        const template = templates.find((item) => templateMatchesSelection(item, selected));
        if (!template) return { fields: [], emptyFieldsNotice: 'Select a template to load its variables.' };

        return {
          fields: extractTemplateVariableFields(template.components),
        };
      },
    },
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

  if (operation === 'sendText') {
    const to = this.getNodeParameter('to', itemIndex) as string;
    const body = this.getNodeParameter('body', itemIndex) as string;
    const humanizedDelivery = this.getNodeParameter('humanizedDelivery', itemIndex, 'standard') as boolean | string;
    const messageId = this.getNodeParameter('messageId', itemIndex, '') as string;
    if (humanizedDelivery === true || humanizedDelivery === 'humanized') {
      return easyhookRequest.call(this, 'POST', '/v1/messages/humanized-text', cleanObject({ from, to, body, message_id: messageId }));
    }
    const at = this.getNodeParameter('at', itemIndex, '') as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/text', cleanObject({ from, to, body, at }));
  }

  if (operation === 'sendMedia') {
    const to = this.getNodeParameter('to', itemIndex) as string;
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
    const to = this.getNodeParameter('to', itemIndex) as string;
    const at = this.getNodeParameter('at', itemIndex, '') as string;
    const templateSource = this.getNodeParameter('templateSource', itemIndex, 'list') as string;
    const template = templateSource === 'manual'
      ? {
        name: this.getNodeParameter('templateName', itemIndex) as string,
        language: this.getNodeParameter('templateLanguage', itemIndex) as string,
      }
      : parseTemplateSelection(this.getNodeParameter('templateSelection', itemIndex) as string);
    if (templateSource === 'list') {
      const templateDataMode = this.getNodeParameter('templateDataMode', itemIndex, 'mapped') as string;
      const components = templateDataMode === 'custom'
        ? parseCustomTemplateComponents(this.getNodeParameter('templateCustomComponents', itemIndex, '[]'), this, itemIndex)
        : buildTemplateComponentsFromMapper(
          this.getNodeParameter('templateVariableMapping.value', itemIndex, {}) as IDataObject,
        );
      return easyhookRequest.call(this, 'POST', '/v1/messages/template', cleanObject({
        from,
        to,
        template,
        components,
        at,
      }));
    }
    const visualParameters = buildTemplateParameters(this.getNodeParameter('templateVariables', itemIndex, {}) as IDataObject);
    return easyhookRequest.call(this, 'POST', '/v1/messages/template', cleanObject({
      from,
      to,
      template,
      parameters: visualParameters,
      at,
    }));
  }

  if (operation === 'sendFlow') {
    const to = this.getNodeParameter('to', itemIndex) as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/flow', cleanObject({
      from,
      to,
      flow_name: this.getNodeParameter('flowName', itemIndex) as string,
      body: this.getNodeParameter('flowBody', itemIndex) as string,
      cta: this.getNodeParameter('flowCta', itemIndex) as string,
      payload: buildKeyValueObject(this.getNodeParameter('flowData', itemIndex, {}) as IDataObject),
    }));
  }

  if (operation === 'sendRead') {
    const messageId = this.getNodeParameter('messageId', itemIndex) as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/read', cleanObject({ from, message_id: messageId }));
  }

  if (operation === 'sendTyping') {
    const messageId = this.getNodeParameter('messageId', itemIndex) as string;
    return easyhookRequest.call(this, 'POST', '/v1/messages/typing', cleanObject({ from, message_id: messageId }));
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

function parseTemplateSelection(value: string): IDataObject {
  try {
    return JSON.parse(value) as IDataObject;
  } catch {
    return { name: value };
  }
}

function templateMatchesSelection(template: IDataObject, selected: IDataObject): boolean {
  const selectedName = readTemplateString(selected, 'name');
  const selectedLanguage = readTemplateLanguage(selected);
  if (!selectedName) return false;
  const name = readTemplateString(template, 'name');
  const language = readTemplateLanguage(template) || readTemplateString(template, 'lang');
  return name === selectedName && (!selectedLanguage || language === selectedLanguage);
}

function isApprovedTemplate(template: IDataObject): boolean {
  const status = readTemplateString(template, 'status') || readTemplateString(template, 'meta_status');
  return status?.toUpperCase() === 'APPROVED';
}

export function extractTemplateVariableFields(components: unknown): ResourceMapperFields['fields'] {
  if (!Array.isArray(components)) return [];
  const fields: ResourceMapperFields['fields'] = [];
  for (const component of components) {
    if (!isRecord(component)) continue;
    const type = String(component.type ?? '').toUpperCase();
    if (type === 'HEADER') {
      const format = String(component.format ?? '').toUpperCase();
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
        const mediaType = format.toLowerCase();
        fields.push(templateVariableField(
          `header.media.${mediaType}`,
          `Header ${titleCase(mediaType)} URL`,
          true,
        ));
        if (format === 'DOCUMENT') {
          fields.push(templateVariableField('header.media.filename', 'Header Document Filename', false));
        }
      }
      if (format === 'LOCATION') {
        fields.push(templateVariableField('header.location.latitude', 'Header Location Latitude', true));
        fields.push(templateVariableField('header.location.longitude', 'Header Location Longitude', true));
        fields.push(templateVariableField('header.location.name', 'Header Location Name', true));
        fields.push(templateVariableField('header.location.address', 'Header Location Address', true));
      }
    }
    if (type === 'HEADER' || type === 'BODY') {
      const section = type.toLowerCase();
      const text = typeof component.text === 'string' ? component.text : '';
      for (const placeholder of extractPlaceholders(text)) {
        fields.push(templateVariableField(`${section}.text.${placeholder}`, `${titleCase(section)} {{${placeholder}}}`, true));
      }
    }
    if (type === 'BUTTONS' && Array.isArray(component.buttons)) {
      component.buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const buttonType = String(button.type ?? 'URL').toUpperCase();
        const source = [button.text, button.url].filter((value): value is string => typeof value === 'string').join(' ');
        if (buttonType === 'URL') {
          for (const placeholder of extractPlaceholders(source)) {
            fields.push(templateVariableField(
              `button.${index}.url.text.${placeholder}`,
              `Button ${index + 1} URL {{${placeholder}}}`,
              true,
            ));
          }
        }
        if (buttonType === 'QUICK_REPLY') {
          fields.push(templateVariableField(
            `button.${index}.quick_reply.payload`,
            `Button ${index + 1} Quick Reply Payload`,
            true,
          ));
        }
        if (buttonType === 'COPY_CODE') {
          fields.push(templateVariableField(
            `button.${index}.copy_code.coupon_code`,
            `Button ${index + 1} Coupon Code`,
            true,
          ));
        }
        if (buttonType === 'OTP') {
          fields.push(templateVariableField(
            `button.${index}.url.text.1`,
            `Button ${index + 1} Authentication Code`,
            true,
          ));
        }
      });
    }
  }
  return fields;
}

function templateVariableField(id: string, displayName: string, required: boolean): ResourceMapperFields['fields'][number] {
  return {
    id,
    displayName,
    required,
    defaultMatch: false,
    canBeUsedToMatch: false,
    display: true,
    type: 'string',
  };
}

function extractPlaceholders(value: string): string[] {
  const seen = new Set<string>();
  const matches = value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g);
  for (const match of matches) {
    if (match[1]) seen.add(match[1]);
  }
  return [...seen].sort((a, b) => parameterSortKey(a).localeCompare(parameterSortKey(b)));
}

export function buildTemplateComponentsFromMapper(input: IDataObject): IDataObject[] {
  const sections: Record<'header' | 'body', Record<string, string>> = { header: {}, body: {} };
  const buttons = new Map<string, { index: string; subType: string; values: Record<string, string> }>();
  const headerMedia: Record<string, string> = {};
  const headerLocation: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (!['string', 'number', 'boolean'].includes(typeof rawValue)) continue;
    const value = String(rawValue);
    if (!value) continue;
    const parts = key.split('.');
    const section = parts[0];
    if (section === 'header' && parts[1] === 'media' && parts[2]) {
      headerMedia[parts[2]] = value;
      continue;
    }
    if (section === 'header' && parts[1] === 'location' && parts[2]) {
      headerLocation[parts[2]] = value;
      continue;
    }
    if ((section === 'header' || section === 'body') && parts[1] === 'text' && parts[2]) {
      sections[section][parts.slice(2).join('.')] = value;
      continue;
    }
    if ((section === 'header' || section === 'body') && parts[1]) {
      sections[section][parts.slice(1).join('.')] = value;
      continue;
    }
    if (section === 'button' && parts.length >= 4) {
      const [, index, subType, parameterType, ...placeholderParts] = parts;
      const placeholder = placeholderParts.join('.') || parameterType;
      const buttonKey = `${index}.${subType}`;
      const current = buttons.get(buttonKey) ?? { index, subType, values: {} };
      current.values[`${parameterType}.${placeholder}`] = value;
      buttons.set(buttonKey, current);
    }
  }

  const components: IDataObject[] = [];
  const header = buildHeaderComponent(headerMedia, headerLocation, sections.header);
  const body = buildTextComponentFromNamedValues('body', sections.body);
  if (header) components.push(header);
  if (body) components.push(body);

  for (const button of [...buttons.values()].sort((a, b) => Number(a.index) - Number(b.index))) {
    const parameters = buildButtonParameters(button.values);
    if (parameters.length === 0) continue;
    components.push({
      type: 'button',
      sub_type: button.subType,
      index: button.index,
      parameters,
    });
  }

  return components;
}

function buildHeaderComponent(
  media: Record<string, string>,
  location: Record<string, string>,
  text: Record<string, string>,
): IDataObject | null {
  const mediaType = ['image', 'video', 'document'].find((type) => media[type]);
  if (mediaType) {
    const mediaValue = cleanObject({
      link: media[mediaType],
      filename: mediaType === 'document' ? media.filename : undefined,
    });
    return { type: 'header', parameters: [{ type: mediaType, [mediaType]: mediaValue }] };
  }
  if (location.latitude && location.longitude && location.name && location.address) {
    return {
      type: 'header',
      parameters: [{
        type: 'location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
        },
      }],
    };
  }
  return buildTextComponentFromNamedValues('header', text);
}

function buildButtonParameters(values: Record<string, string>): IDataObject[] {
  return Object.entries(values)
    .sort(([a], [b]) => parameterSortKey(a.split('.').slice(1).join('.')).localeCompare(parameterSortKey(b.split('.').slice(1).join('.'))))
    .map(([key, value]) => {
      const [type, ...nameParts] = key.split('.');
      const name = nameParts.join('.');
      if (type === 'payload') return { type: 'payload', payload: value };
      if (type === 'coupon_code') return { type: 'coupon_code', coupon_code: value };
      return cleanObject({
        type: 'text',
        text: value,
        parameter_name: /^\d+$/.test(name) ? undefined : name,
      });
    });
}

function parseCustomTemplateComponents(
  value: unknown,
  context: IExecuteFunctions,
  itemIndex: number,
): IDataObject[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new NodeOperationError(context.getNode(), 'Custom template components must be valid JSON.', { itemIndex });
    }
  }
  if (isRecord(parsed) && Array.isArray(parsed.components)) parsed = parsed.components;
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new NodeOperationError(
      context.getNode(),
      'Custom template components must be an array or an object with a components array.',
      { itemIndex },
    );
  }
  return parsed;
}

function buildTextComponentFromNamedValues(type: 'header' | 'body', values: Record<string, string>): IDataObject | null {
  const parameters = buildTextParametersFromNamedValues(values);
  return parameters.length ? { type, parameters } : null;
}

function buildTextParametersFromNamedValues(values: Record<string, string>): IDataObject[] {
  return Object.entries(values)
    .sort(([a], [b]) => parameterSortKey(a).localeCompare(parameterSortKey(b)))
    .map(([key, value]) => cleanObject({
      type: 'text',
      text: value,
      parameter_name: /^\d+$/.test(key) ? undefined : key,
    }));
}

function buildTemplateParameters(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  const header = readCollectionValues(input, 'header');
  const body = readCollectionValues(input, 'body');
  const button = readCollectionValues(input, 'button');
  if (header.length) output.header = header;
  if (body.length) output.body = body;
  if (button.length) output.button = button;
  return output;
}

function parameterSortKey(value: string): string {
  return /^\d+$/.test(value) ? value.padStart(6, '0') : `z_${value}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isRecord(value: unknown): value is IDataObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildKeyValueObject(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  const fields = input.field;
  if (!Array.isArray(fields)) return output;
  for (const field of fields) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) continue;
    const name = (field as IDataObject).name;
    if (typeof name !== 'string' || !name.trim()) continue;
    output[name.trim()] = (field as IDataObject).value ?? '';
  }
  return output;
}

function readCollectionValues(input: IDataObject, section: string): string[] {
  const value = input[section];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
      const raw = (item as IDataObject).value;
      return typeof raw === 'string' ? raw.trim() : '';
    })
    .filter(Boolean);
}

function readTemplateString(template: IDataObject, key: string): string {
  const value = template[key];
  return typeof value === 'string' ? value : '';
}

function readTemplateLanguage(template: IDataObject): string {
  const direct = readTemplateString(template, 'language');
  if (direct) return direct;
  const language = template.language;
  if (language && typeof language === 'object' && !Array.isArray(language)) {
    const code = (language as IDataObject).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}
