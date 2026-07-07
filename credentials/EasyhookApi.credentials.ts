import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class EasyhookApi implements ICredentialType {
  name = 'easyhookApi';

  displayName = 'Easyhook API';

  documentationUrl = 'https://easyhook.dev/docs';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Easyhook API key from the Easyhook portal.',
    },
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.easyhook.dev',
      required: true,
      description: 'Use the default production URL unless Easyhook support gives you another one.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/me',
      method: 'GET',
    },
  };
}
