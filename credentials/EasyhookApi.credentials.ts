import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from "n8n-workflow";

export class EasyhookApi implements ICredentialType {
  name = "easyhookApi";

  displayName = "Easyhook API";

  icon: Icon = {
    light: "file:../nodes/Easyhook/easyhook.svg",
    dark: "file:../nodes/Easyhook/easyhook.dark.svg",
  };

  documentationUrl = "https://docs.easyhook.dev/n8n";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description: "Your Easyhook API key from the Easyhook portal.",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://api.easyhook.dev",
      url: "/v1/me",
      method: "GET",
    },
  };
}
