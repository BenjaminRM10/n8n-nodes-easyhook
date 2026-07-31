# Changelog

## 0.2.28

- Add `Get Consent Status` under WhatsApp Only for reading a contact's service
  and marketing consent within the selected sender's WABA.

## 0.2.26

- Distinguish WhatsApp documents from Messenger and Instagram files in the
  trigger event selector.
- Remove duplicate webhook options defensively when loading dynamic events.

## 0.2.25

- Use provider-native `account.id` values in channel selectors, including Meta
  Phone Number IDs for WhatsApp, without requiring `page_` or `ig_` prefixes.
- Add multichannel message controls for read, typing, contextual replies, and
  reactions, filtered by provider capability.
- Support humanized and scheduled delivery across supported messaging channels.
- Group Gmail, Outlook, and IMAP/SMTP actions under `Email Only`.
- Scope reusable media to the organization and add authenticated incoming-media
  downloads to n8n binary fields.
- Add direct opt-in and opt-out recording with auditable external evidence.

## 0.2.24

- Add Mercado Libre to trigger provider filters and connected sender options.
- Document replies to questions and post-sale conversations.

## 0.2.17

- Add contextual WhatsApp replies.
- Remove the obsolete custom onboarding message field so sent onboarding messages always include the hosted URL.
- Document the one-hour, one-time-use onboarding link contract.

## 0.2.16

- Add WhatsApp reactions as a first-class action.
- Add separate operations to get or send a hosted onboarding URL.
- Select WhatsApp API or Coexistence when creating onboarding.
- Use the canonical consent endpoint.

## 0.2.12

- Add stable client references and idempotency keys for scheduled sends.
- Add scheduled-message lookup for reconciling the Easyhook state, Meta WAMID, and provider delivery status.

## 0.2.11

- Document coexistence sync lifecycle events, per-number concurrency, App State ordering, media policies, and retry-safe consumption.

## 0.2.10

- Expand signed coexistence History and App State batches into individual n8n items.
- Document batching, idempotency, progress metadata, and asynchronous historical media.

All notable changes to `n8n-nodes-easyhook` are documented here.

## 0.2.9 - 2026-07-21

- Align the package identity wording with n8n community package verification requirements.

## 0.2.7 - 2026-07-14

- Document the complete WhatsApp coexistence history trigger setup, normalized payload, and disabled-history error.

## 0.2.6 - 2026-07-14

- Use the official `WhatsApp` spelling consistently in node action labels.

## 0.2.5 - 2026-07-14

- Explain sender ownership errors clearly when `From` is not connected to the organization that owns the selected API credential.

## 0.2.4 - 2026-07-14

- Embed the official icon artwork in the themed SVG assets so it renders reliably in isolated n8n package views.

## 0.2.3 - 2026-07-14

- Replace the provisional SVG artwork with the optimized official Easyhook brand icon across nodes and credentials.

## 0.2.2 - 2026-07-14

- Exclude generated TypeScript declarations from the runtime package so the current n8n community package scanner only analyzes executable node files.

## 0.2.1 - 2026-07-14

- Correct the package author email used for n8n Creator Portal ownership verification.

## 0.2.0 - 2026-07-13

- Move the package to its dedicated public repository.
- Add automated checks and npm provenance publishing through GitHub Actions.
- Keep generic messaging actions separate from WhatsApp-only actions.
- Adopt n8n strict mode, current HTTP helpers, typed node errors, and themed SVG icons.

## 0.1.12 - 2026-07-13

- Add the `WhatsApp Only` resource for templates, Flows, read receipts, and typing indicators.
- Expand template custom-component examples.
