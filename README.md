# n8n-nodes-easyhook

Community node for using Easyhook from n8n.

Easyhook is a lightweight messaging API for WhatsApp Business Platform and other Meta messaging channels. This node focuses on the workflows developers normally automate:

- Send WhatsApp text, media, templates, and Flows
- Schedule messages with Easyhook's `at` parameter
- Upload reusable media and send it later by `media_name`
- List/sync templates and media
- Cancel scheduled messages
- Receive Easyhook webhook events in n8n with the Easyhook Trigger node

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

### Receive Webhooks

Use **Easyhook Trigger** as the first node in a workflow.

1. Add the Easyhook Trigger node.
2. Copy the Production URL from n8n.
3. In the Easyhook portal, create an easyhook subscription and paste that URL.
4. Keep the portal auth type as `bearer` unless you need something else.
5. Copy the generated Easyhook secret into the trigger's **Bearer Secret** field.
6. Choose the Easyhook scope/events in the portal, for example `message.*`, `status.*`, `template.*`, or `flow.submission.*`.

The trigger outputs the webhook JSON exactly as Easyhook sends it, with optional headers/query if enabled.

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
- Template Source: `Choose From Easyhook`
- Template: select one of the approved templates loaded from Easyhook
- Template Variables: n8n loads the variables from the selected Easyhook template and shows them as fields, for example `BODY {{1}}` or `HEADER {{customer_name}}`.

If the template is not listed yet, use `Template Source: Enter Manually`, then enter the template name and language code. Manual mode uses repeatable Header, Body, and Button variable rows.

### Send WhatsApp Flow

- Resource: `Message`
- Operation: `Send Flow`
- From: your WhatsApp sender number
- To: customer WhatsApp number
- Flow Name: the Easyhook flow name
- Message Body: the text above the flow button
- Button Text: the flow button label
- Flow Data: optional key/value fields sent as the flow payload

### Webhook Automation

Easyhook webhooks are handled with **Easyhook Trigger**. The trigger is not a polling node; it gives n8n a webhook URL. Create the subscription in Easyhook and choose the event scope there.

Security options:

- `Bearer Secret`: recommended for n8n. Easyhook sends `Authorization: Bearer <secret>`.
- `Custom Header Secret`: validates the configured header name and secret.
- `HMAC Signature`: validates `X-Easyhook-Signature: sha256=<hex>` using the raw request body when n8n exposes it.
- `No Auth`: temporary tests only.

Useful event scopes:

- `message.*`: incoming WhatsApp/Messenger/Instagram messages
- `status.*`: message delivery/read/failure status
- `template.*`: template status changes
- `flow.submission.*`: WhatsApp Flow responses
- `smb_message_echo.*`: WhatsApp Business App coexistence message echoes
- `smb_app_state_sync.*`: WhatsApp Business App coexistence contact/app state sync
- `history.*`: coexistence history sync events
- `account_update.*`: WhatsApp account updates
- `media.*`: media lifecycle events, when enabled in Easyhook
- `message.text`, `message.image`, `status.failed`: narrower event filters matching the Easyhook portal

Messenger and Instagram hooks are configured in the Easyhook portal with the provider filter. In n8n you can also label a trigger as `messenger.message.*` or `instagram.message.*` for workflow clarity.

## Development

```bash
cd packages/n8n-nodes-easyhook
npm install
npm run build
npm pack --dry-run
```

Before submitting for n8n verification, publish through GitHub Actions with npm provenance as required by n8n's current community node guidelines.
