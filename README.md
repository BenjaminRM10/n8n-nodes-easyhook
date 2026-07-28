# n8n-nodes-easyhook

Easyhook integration for n8n.

Easyhook is a lightweight multichannel messaging API for WhatsApp, Telegram,
Gmail, Outlook, and generic IMAP/SMTP email. This node focuses on the workflows
developers normally automate:

- `Message Action` groups cross-channel text and media actions.
- `WhatsApp Only` groups templates, Flows, consent, onboarding links, read receipts, and typing indicators.
- Use standard or humanized WhatsApp text delivery
- Schedule messages with Easyhook's `at` parameter
- Upload reusable media and send it later by `media_name`
- List/sync templates and media
- Cancel scheduled messages before processing begins
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

n8n validates the credential with `GET /v1/me`, so no WhatsApp number is needed just to test the API key.

## Common Examples

### Receive Webhooks

Use **Easyhook Trigger** as the first node in a workflow.

1. Add the Easyhook Trigger node.
2. Select your Easyhook API credential.
3. Choose a provider. Easyhook filters the available events and scope types automatically.
4. Choose a scope. For WABAs, WhatsApp numbers, Messenger Pages, or Instagram accounts, select a connected account from the list loaded with your API credential.
5. Activate the workflow.

n8n registers its Production URL in Easyhook automatically and stores the HMAC signing secret in the workflow's private static data. Deactivating or deleting the workflow removes the Easyhook subscription. No portal setup or secret copy/paste is required.

WhatsApp uses the same three levels as the Easyhook portal: **Entire Organization → WABA → WhatsApp Number**. Selecting a WABA receives matching events from all numbers connected to it. Meta Business Portfolios stay internal and never appear as n8n scopes.

The trigger outputs the normalized Easyhook webhook JSON directly.

### Send Text

- Resource: `Message Action`
- Operation: `Send Text`
- From: `5218661479075`
- To: `5215660069997`
- Body: `Hello from n8n`

Choose **Delivery: Humanized** when you want Easyhook to mark the latest inbound WhatsApp message as read, wait a human-like read/typing delay, show typing, and then send the text. Easyhook uses the latest inbound message from `To`.

For scheduled text, media, or templates, add:

- `Schedule At`: ISO 8601 execution time
- `Options > Client Reference`: optional identifier from your application
- `Options > Idempotency Key`: optional stable key used only when retrying the same scheduled send

Use resource **Cancel Scheduled Message** to cancel a pending delivery before processing begins.

### Send Email

- Resource: `Message Action`
- Operation: `Send Email`
- From Email: select a connected Gmail, Outlook, or IMAP/SMTP address
- To Email: recipient email address
- Subject: email subject
- Message: plain-text message
- HTML Message: optional rich body

To answer an existing email, choose `Reply to Email` instead. Map the inbound
Easyhook Trigger value `message.id` into `Original Email ID`. Easyhook resolves
the Gmail thread, Outlook reply, or IMAP headers automatically. You do not need
to configure Thread ID, In-Reply-To, or References in n8n.

All email providers use `POST /v1/messages/email` and return the same normalized
response. Treat inbound `message.html` as untrusted content.

### Send Read, Typing, Or Reaction

- Resource: `WhatsApp Only`
- Operation: `Send Read Receipt`, `Send Typing Indicator`, or `Send Reaction`
- From: your WhatsApp sender number
- Inbound Message ID: the inbound WhatsApp `wamid`

For a reaction, also set `To` and `Reaction`. Leave the reaction empty to remove it.

To send a contextual WhatsApp reply, choose **WhatsApp Only → Reply to Message** and provide the original
WhatsApp message ID, recipient, and reply text.

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

- Resource: `Message Action`
- Operation: `Send Media`
- From: your WhatsApp sender number
- To: customer WhatsApp ID
- Type: `Image`
- Media Reference Type: `Reusable Media Name`
- Media Name: `promo_image`

### Send Template

- Resource: `WhatsApp Only`
- Operation: `Send Template`
- Template Source: `Enter Manually`
- Template Name: the approved template name in Easyhook/Meta
- Language: select the Meta language code from the list, for example `es_MX` or `en_US`
- Template Data: choose `Map Automatically` to load the template definition by name and language, or `Custom Components (JSON)` to provide raw components.

Both template sources support the same data modes. `Choose From Easyhook` selects an approved template from a list; `Enter Manually` resolves the approved template using the typed name and selected language. `Map Automatically` then creates only the fields required at send time:

- Header text variables
- Header image, video, or document URL and optional document filename
- Header location fields
- Body variables, including named variables
- Dynamic URL button values
- Quick reply payloads
- Copy-code coupon values

Use `Custom Components (JSON)` when you need to provide raw Meta `components`. The value can be a components array or `{ "components": [...] }`. Template text itself remains fixed by the approved Meta template.

Text header, body variables, and dynamic URL button:

```json
[
  {
    "type": "header",
    "parameters": [{ "type": "text", "text": "PED-1048" }]
  },
  {
    "type": "body",
    "parameters": [
      { "type": "text", "text": "Benjamin" },
      { "type": "text", "text": "15 July" }
    ]
  },
  {
    "type": "button",
    "sub_type": "url",
    "index": "0",
    "parameters": [{ "type": "text", "text": "PED-1048" }]
  }
]
```

Media header and named body variable:

```json
{
  "components": [
    {
      "type": "header",
      "parameters": [
        {
          "type": "document",
          "document": {
            "link": "https://cdn.example.com/invoice.pdf",
            "filename": "invoice.pdf"
          }
        }
      ]
    },
    {
      "type": "body",
      "parameters": [
        {
          "type": "text",
          "parameter_name": "customer_name",
          "text": "Benjamin"
        }
      ]
    }
  ]
}
```

Media links must use HTTPS and be downloadable by Meta without authentication. A dynamic URL button value is the variable suffix, not the complete URL. Use `[]` when the template has no runtime components.

### Send WhatsApp Flow

- Resource: `WhatsApp Only`
- Operation: `Send Flow`
- From: your WhatsApp sender number
- To: customer WhatsApp number
- Flow Name: the Easyhook flow name
- Message Body: the text above the flow button
- Button Text: the flow button label
- Flow Data: optional key/value fields sent as the flow payload

### Send Consent

- Resource: `WhatsApp Only`
- Operation: `Send Opt-In or Opt-Out`
- From: your WhatsApp sender number
- To: customer WhatsApp number
- Consent Flow: `Opt-In` or `Opt-Out`

### Hosted Onboarding

- Resource: `WhatsApp Only`
- Operation: `Get Onboarding URL` or `Send Onboarding Link`
- Connection: `WhatsApp Coexistence` or `WhatsApp Business API`
- Language: `Spanish` or `English`
- Return URL: optional HTTPS destination after completion

`Get Onboarding URL` returns the hosted URL without sending a message. `Send Onboarding Link` creates the same session and sends its URL from the selected Easyhook WhatsApp number to `To`. Subscribe with **Easyhook Trigger** to onboarding events when the workflow must continue after the customer connects a number.

Hosted links expire after one hour and are consumed after a successful connection. The sent message is
localized by Easyhook and always includes the hosted URL.

### Webhook Automation

Easyhook webhooks are handled with **Easyhook Trigger**. It is not a polling node: activation creates a `/v1/webhooks` subscription for the n8n Production URL and deactivation removes it. Deliveries are authenticated automatically with `X-Easyhook-Signature: sha256=<hex>`.

Useful event scopes:

- `message.*`: incoming messages from the selected provider, including
  WhatsApp, Messenger, Instagram, Telegram, Gmail, Outlook, and IMAP/SMTP
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

### Receive Coexistence History

Configure the **Easyhook Trigger** before connecting the WhatsApp Business App number or requesting coexistence sync:

1. Select `Provider: WhatsApp`.
2. Select `Event: Coexistence history (history.*)`.
3. Choose the organization, WABA, or WhatsApp number scope.
4. Activate the workflow.
5. Allow history sharing in the WhatsApp Business App and keep the app open while synchronization starts.

Easyhook creates the webhook subscription and stores its HMAC secret in n8n automatically. Do not create a second portal webhook. `message.*` only covers live messages; it does not include history imports.

Easyhook delivers History and App State in signed batches of at most 100 events. One batch starts one workflow execution, and the trigger expands every normalized event into a separate n8n item. This keeps large imports fast without creating one execution per historical message. Historical inbound messages use `type: message.received`; historical outbound messages use `type: message.echo`. Both include `message.source: history`, and every item includes `_sync` with its batch and progress metadata:

```json
{
  "id": "event_uuid",
  "type": "message.echo",
  "channel": "whatsapp",
  "account": { "id": "980912725115744", "phone": "5218661479075" },
  "contact": { "id": "5214445087305" },
  "message": {
    "id": "wamid...",
    "direction": "out",
    "source": "history",
    "type": "text",
    "text": "Previous reply",
    "history": {
      "thread_id": "5214445087305",
      "status": "READ",
      "phase": 1,
      "chunk_order": 2,
      "progress": 80
    }
  },
  "_sync": {
    "batch_id": "delivery_uuid",
    "source": "history",
    "progress": 80,
    "count": 100
  }
}
```

Use `message.id` for idempotency because deliveries are at-least-once. Keep live auto-replies disabled when `message.source` is `history`. Media does not block the import: a historical message can first include `message.media.storage_status: pending`, followed later by `type: message.media_available` with the same `message.id` and a protected download URL.

The same `history.*` trigger receives `sync.started`, `sync.progress`, `sync.completed`, and `sync.failed` lifecycle items. Wait for `sync.completed` instead of inferring completion from Meta's progress value. App State contact records are delivered under `smb_app_state_sync.*`; they can arrive before or after History, so use `contact.id` and `message.id` rather than array position to join and deduplicate records.

History covers up to approximately 180 days and excludes group conversations. Historical media availability is normally limited to recent messages (approximately 14 days). Easyhook offers three import policies in the portal: messages only, recent media without video, and recent media including video. Missing or expired media never fails the message import.

Only one synchronization runs per WhatsApp number. An organization may have any number of connected numbers, with up to two numbers importing concurrently for fair capacity sharing. Failed webhook deliveries retry five times and can be replayed without changing the original message IDs or idempotency keys.

If the business disables history sharing, Meta can return error `2593109`; the trigger receives it as `type: sync.failed` under the same `history.*` selection.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm pack --dry-run
```

Releases are published from GitHub Actions with npm provenance. See [CONTRIBUTING.md](CONTRIBUTING.md) for the validation and release workflow.
