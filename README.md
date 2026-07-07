# n8n-nodes-easyhook

Community node for using Easyhook from n8n.

Easyhook is a lightweight messaging API for WhatsApp Business Platform and other Meta messaging channels. This node focuses on the workflows developers normally automate:

- Send WhatsApp text, media, templates, and Flows
- Schedule messages with Easyhook's `at` parameter
- Upload reusable media and send it later by `media_name`
- List/sync templates and media
- Cancel scheduled messages

## Install

In n8n, open **Settings > Community Nodes** and install:

```text
n8n-nodes-easyhook
```

For self-hosted n8n, you can also install it manually in your n8n custom nodes folder.

## Credentials

Create an **Easyhook API** credential:

- API Key: your `eh_live_...` key from Easyhook
- API Base URL: `https://api.easyhook.dev`

n8n validates the credential with `GET /v1/me`, so no WhatsApp number is needed just to test the API key.

## Common Examples

### Send Text

- Resource: `Message`
- Operation: `Send Text`
- From: `5218661479075`
- To: `5215660069997`
- Body: `Hello from n8n`

### Send Reusable Media

First upload media:

- Resource: `Media`
- Operation: `Upload`
- From: your WhatsApp sender number
- Name: `promo_image`
- Type: `Image`
- Source: `Binary Property`
- Binary Property: `data`

Then send it:

- Resource: `Message`
- Operation: `Send Media`
- From: your WhatsApp sender number
- To: customer WhatsApp ID
- Type: `Image`
- Media Reference Type: `Reusable Media Name`
- Media Name: `promo_image`

### Send Template

- Resource: `Message`
- Operation: `Send Template`
- Template JSON:

```json
{
  "name": "order_ready",
  "language": "es_MX"
}
```

Optional Parameters JSON:

```json
{
  "body": ["Benjamin"]
}
```

## Development

```bash
cd packages/n8n-nodes-easyhook
npm install
npm run build
npm pack --dry-run
```

Before submitting for n8n verification, publish through GitHub Actions with npm provenance as required by n8n's current community node guidelines.
