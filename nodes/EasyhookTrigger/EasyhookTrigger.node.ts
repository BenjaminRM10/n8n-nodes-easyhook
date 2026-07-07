import type {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';

const eventOptions = [
  { name: 'All Events', value: '*' },
  { name: 'Flow Submissions', value: 'flow.submission.*' },
  { name: 'Messages', value: 'message.*' },
  { name: 'Status Updates', value: 'status.*' },
  { name: 'Template Updates', value: 'template.*' },
];

export class EasyhookTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Easyhook Trigger',
    name: 'easyhookTrigger',
    icon: 'file:easyhook.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts a workflow when Easyhook sends a webhook event',
    eventTriggerDescription: 'Waiting for Easyhook webhook events',
    defaults: {
      name: 'Easyhook Trigger',
    },
    inputs: [],
    outputs: ['main'],
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
        displayName: 'Easyhook Webhook URL',
        name: 'webhookUrl',
        type: 'notice',
        default: 'Copy the Production URL from this trigger and paste it in Easyhook as the destination URL for an easyhook subscription.',
      },
      {
        displayName: 'Expected Events',
        name: 'events',
        type: 'multiOptions',
        options: eventOptions,
        default: ['*'],
        description: 'Documentation-only filter for this workflow. Configure the real event filter in the Easyhook portal subscription.',
      },
      {
        displayName: 'Include Headers',
        name: 'includeHeaders',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Include Query',
        name: 'includeQuery',
        type: 'boolean',
        default: false,
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const body = this.getBodyData();
    const includeHeaders = this.getNodeParameter('includeHeaders', false) as boolean;
    const includeQuery = this.getNodeParameter('includeQuery', false) as boolean;

    const json: IDataObject = {
      ...body,
    };
    if (includeHeaders) json.headers = this.getHeaderData() as IDataObject;
    if (includeQuery) json.query = this.getQueryData() as IDataObject;

    const workflowData: INodeExecutionData[][] = [[{ json }]];
    return {
      workflowData,
      webhookResponse: { ok: true },
    };
  }
}
