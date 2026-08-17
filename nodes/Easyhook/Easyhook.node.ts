import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  ResourceMapperFields,
} from "n8n-workflow";
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";
import {
  cleanObject,
  easyhookDownload,
  easyhookRequest,
  readArray,
} from "../../shared/EasyhookClient";

const messageOperations = [
  "sendText",
  "sendMedia",
  "sendInteractive",
  "sendQuickReplies",
];
const messageControlOperations = [
  "sendRead",
  "sendTyping",
  "sendReaction",
  "sendReply",
];
const whatsappOperations = [
  "getConsentStatus",
  "sendTemplate",
  "sendFlow",
  "sendConsent",
  "recordConsent",
];
const recipientMessageOperations = [
  "sendText",
  "sendMedia",
  "sendInteractive",
  "sendQuickReplies",
  "sendRead",
  "sendTyping",
  "sendReaction",
  "sendReply",
  "sendTemplate",
  "sendFlow",
  "sendConsent",
  "recordConsent",
  "getConsentStatus",
  "sendOnboarding",
];
const emailOperations = [
  "sendEmail",
  "replyEmail",
  "forwardEmail",
  "updateEmail",
  "createEmailDraft",
  "updateEmailDraft",
  "sendEmailDraft",
];
const emailContentOperations = [
  "sendEmail",
  "replyEmail",
  "createEmailDraft",
  "updateEmailDraft",
];
const templateLanguageOptions: INodePropertyOptions[] = [
  ["af", "Afrikaans"],
  ["sq", "Albanian"],
  ["ar", "Arabic"],
  ["az", "Azerbaijani"],
  ["bn", "Bengali"],
  ["bg", "Bulgarian"],
  ["ca", "Catalan"],
  ["zh_CN", "Chinese (China)"],
  ["zh_HK", "Chinese (Hong Kong)"],
  ["zh_TW", "Chinese (Taiwan)"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["en", "English"],
  ["en_GB", "English (UK)"],
  ["en_US", "English (US)"],
  ["et", "Estonian"],
  ["fil", "Filipino"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["de", "German"],
  ["el", "Greek"],
  ["gu", "Gujarati"],
  ["ha", "Hausa"],
  ["he", "Hebrew"],
  ["hi", "Hindi"],
  ["hu", "Hungarian"],
  ["id", "Indonesian"],
  ["ga", "Irish"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["kn", "Kannada"],
  ["kk", "Kazakh"],
  ["ko", "Korean"],
  ["lo", "Lao"],
  ["lv", "Latvian"],
  ["lt", "Lithuanian"],
  ["mk", "Macedonian"],
  ["ms", "Malay"],
  ["ml", "Malayalam"],
  ["mr", "Marathi"],
  ["nb", "Norwegian"],
  ["fa", "Persian"],
  ["pl", "Polish"],
  ["pt_BR", "Portuguese (Brazil)"],
  ["pt_PT", "Portuguese (Portugal)"],
  ["pa", "Punjabi"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sr", "Serbian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["es", "Spanish"],
  ["es_AR", "Spanish (Argentina)"],
  ["es_ES", "Spanish (Spain)"],
  ["es_MX", "Spanish (Mexico)"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["uz", "Uzbek"],
  ["vi", "Vietnamese"],
  ["zu", "Zulu"],
].map(([value, label]) => ({ name: `${value} · ${label}`, value }));

export class Easyhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Easyhook",
    name: "easyhook",
    icon: {
      light: "file:easyhook.svg",
      dark: "file:easyhook.dark.svg",
    },
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: "Use Easyhook messaging APIs from n8n",
    usableAsTool: true,
    defaults: {
      name: "Easyhook",
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "easyhookApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Cancel Scheduled Message",
            value: "scheduledMessage",
          },
          { name: "Comment", value: "comment" },
          { name: "Email Only", value: "email" },
          { name: "Media", value: "media" },
          { name: "Message Action", value: "message" },
          { name: "Message Control", value: "messageControl" },
          { name: "Onboarding", value: "onboarding" },
          { name: "Review", value: "review" },
          { name: "Template", value: "template" },
          { name: "WhatsApp Only", value: "whatsapp" },
        ],
        default: "message",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["comment"] } },
        options: [
          { name: "List", value: "listComments", action: "List comments on a post or media object" },
          { name: "Reply", value: "replyComment", action: "Reply publicly to a comment" },
        ],
        default: "listComments",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["review"] } },
        options: [
          {
            name: "Get Rating",
            value: "getReviewRating",
            action: "Get the location rating",
          },
          {
            name: "List Reviews",
            value: "listReviews",
            action: "List reviews for a location",
          },
          {
            name: "Reply to Review",
            value: "replyToReview",
            action: "Reply publicly to a review",
          },
        ],
        default: "listReviews",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["email"] } },
        options: [
          {
            name: "Create Email Draft",
            value: "createEmailDraft",
            action: "Create an email draft",
          },
          {
            name: "Edit Email Draft",
            value: "updateEmailDraft",
            action: "Edit an email draft",
          },
          {
            name: "Forward Email",
            value: "forwardEmail",
            action: "Forward an email",
          },
          {
            name: "Reply to Email",
            value: "replyEmail",
            action: "Reply to an email",
          },
          {
            name: "Send Email",
            value: "sendEmail",
            action: "Send an email",
          },
          {
            name: "Send Email Draft",
            value: "sendEmailDraft",
            action: "Send an email draft",
          },
          {
            name: "Update Email",
            value: "updateEmail",
            action: "Mark an email as read unread or archived",
          },
        ],
        default: "sendEmail",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["messageControl"] } },
        options: [
          {
            name: "Mark as Read",
            value: "sendRead",
            action: "Mark a message as read",
          },
          {
            name: "React",
            value: "sendReaction",
            action: "React to a message",
          },
          {
            name: "Reply",
            value: "sendReply",
            action: "Reply to a message",
          },
          {
            name: "Show Typing",
            value: "sendTyping",
            action: "Show a typing indicator",
          },
        ],
        default: "sendRead",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["message"] } },
        options: [
          {
            name: "Send Buttons",
            value: "sendInteractive",
            action: "Send interactive buttons",
          },
          { name: "Send Media", value: "sendMedia", action: "Send media" },
          {
            name: "Send Quick Replies",
            value: "sendQuickReplies",
            action: "Send quick reply buttons",
          },
          {
            name: "Send Text",
            value: "sendText",
            action: "Send a text message",
          },
        ],
        default: "sendText",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["whatsapp"] } },
        options: [
          {
            name: "Get Consent Status",
            value: "getConsentStatus",
            action: "Get consent status for a contact",
          },
          {
            name: "Record Opt-In or Opt-Out",
            value: "recordConsent",
            action: "Record consent collected externally",
          },
          {
            name: "Send Flow",
            value: "sendFlow",
            action: "Send an interactive flow",
          },
          {
            name: "Send Opt-In or Opt-Out",
            value: "sendConsent",
            action: "Send a consent flow",
          },
          {
            name: "Send Template",
            value: "sendTemplate",
            action: "Send an approved template",
          },
        ],
        default: "sendTemplate",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["onboarding"] } },
        options: [
          {
            name: "Get URL",
            value: "createOnboarding",
            action: "Get a hosted onboarding URL",
          },
          {
            name: "Send URL",
            value: "sendOnboarding",
            action: "Create and send a hosted onboarding link",
          },
        ],
        default: "createOnboarding",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["media"] } },
        options: [
          { name: "Delete", value: "delete", action: "Delete reusable media" },
          {
            name: "Download",
            value: "download",
            action: "Download private easyhook media",
          },
          { name: "List", value: "list", action: "List reusable media" },
          { name: "Upload", value: "upload", action: "Upload reusable media" },
        ],
        default: "list",
      },
      {
        displayName: "Template Name",
        name: "templateCreateName",
        type: "string",
        default: "",
        required: true,
        description: "Lowercase template name using letters numbers and underscores",
        displayOptions: {
          show: { resource: ["template"], operation: ["create"] },
        },
      },
      {
        displayName: "Language",
        name: "templateCreateLanguage",
        type: "options",
        options: templateLanguageOptions,
        default: "es_MX",
        required: true,
        displayOptions: {
          show: { resource: ["template"], operation: ["create"] },
        },
      },
      {
        displayName: "Category",
        name: "templateCreateCategory",
        type: "options",
        options: [
          { name: "Authentication", value: "AUTHENTICATION" },
          { name: "Marketing", value: "MARKETING" },
          { name: "Utility", value: "UTILITY" },
        ],
        default: "UTILITY",
        required: true,
        displayOptions: {
          show: {
            resource: ["template"],
            operation: ["classify", "create"],
          },
        },
      },
      {
        displayName: "Components (JSON)",
        name: "templateCreateComponents",
        type: "json",
        default:
          '[\n  {\n    "type": "BODY",\n    "text": "Tu pedido {{1}} fue enviado."\n  }\n]',
        required: true,
        description: "Meta template components array",
        displayOptions: {
          show: {
            resource: ["template"],
            operation: ["classify", "create"],
          },
        },
      },
      {
        displayName: "Parameter Format",
        name: "templateParameterFormat",
        type: "options",
        options: [
          { name: "Named", value: "NAMED" },
          { name: "Positional", value: "POSITIONAL" },
        ],
        default: "POSITIONAL",
        displayOptions: {
          show: { resource: ["template"], operation: ["create"] },
        },
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["template"] } },
        options: [
          {
            name: "Check Category",
            value: "classify",
            action: "Check a template category",
          },
          {
            name: "Create",
            value: "create",
            action: "Send a template to meta for approval",
          },
          { name: "List", value: "list", action: "List templates" },
          {
            name: "Sync From Meta",
            value: "sync",
            action: "Sync templates from meta",
          },
        ],
        default: "list",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["scheduledMessage"] } },
        options: [
          {
            name: "Cancel",
            value: "cancel",
            action: "Cancel a scheduled message",
          },
        ],
        default: "cancel",
      },
      {
        displayName: "Channel Name or ID",
        name: "commentFrom",
        type: "options",
        typeOptions: { loadOptionsMethod: "getSenders", loadOptionsDependsOn: ["resource", "operation"] },
        default: "",
        required: true,
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: { show: { resource: ["comment"] } },
      },
      {
        displayName: "Post or Media ID",
        name: "commentObjectId",
        type: "string",
        default: "",
        required: true,
        description: "Facebook post ID or Instagram media ID from the incoming comment event",
        displayOptions: { show: { resource: ["comment"], operation: ["listComments"] } },
      },
      {
        displayName: "Comment ID",
        name: "socialCommentId",
        type: "string",
        default: "",
        required: true,
        description: "ID of the incoming Easyhook comment event",
        displayOptions: { show: { resource: ["comment"], operation: ["replyComment"] } },
      },
      {
        displayName: "Reply",
        name: "commentReply",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        required: true,
        displayOptions: { show: { resource: ["comment"], operation: ["replyComment"] } },
      },
      {
        displayName: "Limit",
        name: "commentLimit",
        type: "number",
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ["comment"], operation: ["listComments"] } },
      },
      {
        displayName: "After Cursor",
        name: "commentAfter",
        type: "string",
        default: "",
        description: "Optional paging.after cursor returned by the previous request",
        displayOptions: { show: { resource: ["comment"], operation: ["listComments"] } },
      },
      {
        displayName: "Location Name or ID",
        name: "reviewLocation",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getReviewLocations",
        },
        default: "",
        required: true,
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: {
          show: {
            resource: ["review"],
          },
        },
      },
      {
        displayName: "Review ID",
        name: "reviewId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["review"],
            operation: ["replyToReview"],
          },
        },
      },
      {
        displayName: "Reply",
        name: "reviewReply",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        description: "Public reply that will appear on the Google Business Profile",
        displayOptions: {
          show: {
            resource: ["review"],
            operation: ["replyToReview"],
          },
        },
      },
      {
        displayName: "Page Size",
        name: "reviewPageSize",
        type: "number",
        typeOptions: { minValue: 1, maxValue: 50 },
        default: 20,
        displayOptions: {
          show: {
            resource: ["review"],
            operation: ["listReviews"],
          },
        },
      },
      {
        displayName: "Next Page Cursor",
        name: "reviewPageCursor",
        type: "string",
        default: "",
        description: "Optional next page cursor returned by the previous request",
        displayOptions: {
          show: {
            resource: ["review"],
            operation: ["listReviews"],
          },
        },
      },
      {
        displayName: "Channel Name or ID",
        name: "from",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getSenders",
          loadOptionsDependsOn: ["resource", "operation", "humanizedDelivery"],
        },
        default: "",
        required: true,
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: {
          show: {
            resource: ["message", "messageControl", "whatsapp", "template", "onboarding"],
            operation: [
              ...messageOperations,
              ...messageControlOperations,
              ...whatsappOperations,
              "sendOnboarding",
              "create",
              "sync",
            ],
          },
        },
      },
      {
        displayName: "Email Name or ID",
        name: "from",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getEmailSenders",
        },
        default: "",
        required: true,
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailOperations,
          },
        },
      },
      {
        displayName: "To",
        name: "to",
        type: "string",
        default: "",
        required: true,
        description: "Customer WhatsApp number or channel recipient ID",
        displayOptions: {
          show: {
            resource: ["message", "messageControl", "whatsapp", "onboarding"],
            operation: recipientMessageOperations,
          },
        },
      },
      {
        displayName: "To Email",
        name: "to",
        type: "string",
        default: "",
        required: true,
        placeholder: "customer@example.com",
        description: "Recipient email address",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailContentOperations,
          },
        },
      },
      {
        displayName: "Body",
        name: "body",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendText", "sendInteractive", "sendQuickReplies"],
          },
        },
      },
      {
        displayName: "Buttons",
        name: "interactiveButtons",
        type: "fixedCollection",
        typeOptions: { multipleValues: true },
        default: {},
        placeholder: "Add Button",
        required: true,
        options: [
          {
            displayName: "Button",
            name: "button",
            values: [
              {
                displayName: "Type",
                name: "type",
                type: "options",
                options: [
                  { name: "Reply", value: "reply" },
                  { name: "Open URL", value: "url" },
                ],
                default: "reply",
              },
              {
                displayName: "Title",
                name: "title",
                type: "string",
                default: "",
                required: true,
                description: "Visible button text, up to 20 characters",
              },
              {
                displayName: "Payload",
                name: "payload",
                type: "string",
                default: "",
                required: true,
                description:
                  "Stable value returned in message.quick_reply.payload",
                displayOptions: { show: { type: ["reply"] } },
              },
              {
                displayName: "URL",
                name: "url",
                type: "string",
                default: "",
                required: true,
                placeholder: "https://example.com/map",
                displayOptions: { show: { type: ["url"] } },
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendInteractive"],
          },
        },
      },
      {
        displayName: "Quick Replies",
        name: "quickReplies",
        type: "fixedCollection",
        typeOptions: { multipleValues: true },
        default: {},
        placeholder: "Add Quick Reply",
        required: true,
        options: [
          {
            displayName: "Quick Reply",
            name: "reply",
            values: [
              {
                displayName: "Title",
                name: "title",
                type: "string",
                default: "",
                required: true,
                description: "Visible button text, up to 20 characters",
              },
              {
                displayName: "Payload",
                name: "payload",
                type: "string",
                default: "",
                required: true,
                description:
                  "Stable value returned when the contact selects this reply",
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendQuickReplies"],
          },
        },
      },
      {
        displayName: "Subject",
        name: "emailSubject",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailContentOperations,
          },
        },
      },
      {
        displayName: "Message",
        name: "emailBody",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailContentOperations,
          },
        },
      },
      {
        displayName: "HTML Message",
        name: "emailHtml",
        type: "string",
        typeOptions: { rows: 6 },
        default: "",
        description: "Optional HTML version of the email",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailOperations,
          },
        },
      },
      {
        displayName: "Original Email ID",
        name: "emailReplyToMessageId",
        type: "string",
        default: "",
        required: true,
        description:
          "Use message.ID from the inbound Easyhook Trigger item. Easyhook preserves the Gmail, Outlook, or IMAP thread automatically.",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["replyEmail", "forwardEmail", "updateEmail"],
          },
        },
      },
      {
        displayName: "Draft ID",
        name: "emailDraftId",
        type: "string",
        default: "",
        required: true,
        description: "ID returned when the draft was created",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["updateEmailDraft", "sendEmailDraft"],
          },
        },
      },
      {
        displayName: "Action",
        name: "emailAction",
        type: "options",
        options: [
          { name: "Archive", value: "archive" },
          { name: "Mark as Read", value: "mark_read" },
          { name: "Mark as Unread", value: "mark_unread" },
        ],
        default: "mark_read",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["updateEmail"],
          },
        },
      },
      {
        displayName: "Forward Note",
        name: "emailForwardNote",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        description: "Optional note shown above the forwarded email",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["forwardEmail"],
          },
        },
      },
      {
        displayName: "Attachments",
        name: "emailAttachments",
        type: "fixedCollection",
        typeOptions: { multipleValues: true },
        default: {},
        options: [
          {
            displayName: "Attachment",
            name: "attachment",
            values: [
              {
                displayName: "Input Binary Field",
                name: "binaryPropertyName",
                type: "string",
                default: "data",
                required: true,
                description: "Name of the binary field containing the file",
              },
              {
                displayName: "File Name",
                name: "filename",
                type: "string",
                default: "",
                description: "Optional file name override",
              },
              {
                displayName: "Content Type",
                name: "contentType",
                type: "string",
                default: "",
                description: "Optional MIME type override",
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ["email"],
            operation: emailContentOperations,
          },
        },
      },
      {
        displayName: "Legacy Thread ID",
        name: "emailThreadId",
        type: "string",
        default: "",
        description:
          "Optional provider thread ID when replying to an existing email",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["_legacyEmailReply"],
          },
        },
      },
      {
        displayName: "Legacy In-Reply-To",
        name: "emailInReplyTo",
        type: "string",
        default: "",
        description: "Optional Message-ID header from the email being answered",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["_legacyEmailReply"],
          },
        },
      },
      {
        displayName: "Legacy References",
        name: "emailReferences",
        type: "string",
        default: "",
        description:
          "Optional space-separated Message-ID headers that identify the email thread",
        displayOptions: {
          show: {
            resource: ["email"],
            operation: ["_legacyEmailReply"],
          },
        },
      },
      {
        displayName: "Delivery",
        name: "humanizedDelivery",
        type: "options",
        options: [
          { name: "Humanized", value: "humanized" },
          { name: "Standard", value: "standard" },
        ],
        default: "standard",
        description:
          "For WhatsApp, Messenger, Instagram, Telegram, and TikTok Business Messaging. Presence indicators are applied when supported; the message still sends if an indicator is unavailable.",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendText"],
          },
        },
      },
      {
        displayName: "Inbound Message ID",
        name: "messageId",
        type: "string",
        default: "",
        description:
          "Message ID received in message.ID. Required for read, reply, and reaction; typing support varies by channel.",
        displayOptions: {
          show: {
            resource: ["messageControl"],
            operation: ["sendRead", "sendTyping", "sendReaction", "sendReply"],
          },
        },
      },
      {
        displayName: "Reply",
        name: "replyBody",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        required: true,
        description: "Text sent as a contextual reply to the selected message",
        displayOptions: {
          show: {
            resource: ["messageControl"],
            operation: ["sendReply"],
          },
        },
      },
      {
        displayName: "Reaction",
        name: "reactionEmoji",
        type: "string",
        default: "👍",
        description:
          "Emoji to add. Leave empty to remove the current reaction.",
        displayOptions: {
          show: {
            resource: ["messageControl"],
            operation: ["sendReaction"],
          },
        },
      },
      {
        displayName: "Schedule At",
        name: "at",
        type: "string",
        default: "",
        placeholder: "2026-07-07T13:10:00-06:00",
        description:
          "Optional ISO date/time. If empty, Easyhook sends immediately.",
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendText", "sendMedia", "sendTemplate"],
          },
          hide: {
            humanizedDelivery: [true, "humanized"],
          },
        },
      },
      {
        displayName: "Media Type",
        name: "mediaType",
        type: "options",
        options: [
          { name: "Audio", value: "audio" },
          { name: "Document", value: "document" },
          { name: "Image", value: "image" },
          { name: "Sticker", value: "sticker" },
          { name: "Video", value: "video" },
        ],
        default: "image",
        displayOptions: {
          show: {
            resource: ["message", "media"],
            operation: ["sendMedia", "upload"],
          },
        },
      },
      {
        displayName: "Media Reference Type",
        name: "mediaReferenceType",
        type: "options",
        options: [
          { name: "Easyhook Media Name", value: "media_name" },
          { name: "Meta Media ID", value: "id" },
          { name: "Public Link", value: "link" },
        ],
        default: "media_name",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
          },
        },
      },
      {
        displayName: "Media Name or ID",
        name: "mediaName",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getMedia",
          loadOptionsDependsOn: ["from"],
        },
        default: "",
        required: true,
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
            mediaReferenceType: ["media_name"],
          },
        },
      },
      {
        displayName: "Meta Media ID",
        name: "mediaId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
            mediaReferenceType: ["id"],
          },
        },
      },
      {
        displayName: "Public Link",
        name: "mediaLink",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
            mediaReferenceType: ["link"],
          },
        },
      },
      {
        displayName: "Caption",
        name: "caption",
        type: "string",
        default: "",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
          },
        },
      },
      {
        displayName: "Filename",
        name: "filename",
        type: "string",
        default: "",
        description: "Optional filename for document messages",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendMedia"],
            mediaType: ["document"],
          },
        },
      },
      {
        displayName: "Template Source",
        name: "templateSource",
        type: "options",
        options: [
          { name: "Choose From Easyhook", value: "list" },
          { name: "Enter Manually", value: "manual" },
        ],
        default: "manual",
        description:
          "Choose a synchronized template or enter its approved name and language manually",
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
          },
        },
      },
      {
        displayName: "Template Name or ID",
        name: "templateSelection",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getTemplates",
          loadOptionsDependsOn: ["from"],
        },
        default: "",
        required: true,
        description:
          'Templates are loaded from Easyhook for the WABA behind From. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateSource: ["list"],
          },
        },
      },
      {
        displayName: "Template Name",
        name: "templateName",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateSource: ["manual"],
          },
        },
      },
      {
        displayName: "Language",
        name: "templateLanguage",
        type: "options",
        options: templateLanguageOptions,
        default: "es_MX",
        required: true,
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateSource: ["manual"],
          },
        },
      },
      {
        displayName: "Template Data",
        name: "templateDataMode",
        type: "options",
        options: [
          { name: "Custom Components (JSON)", value: "custom" },
          { name: "Map Automatically", value: "mapped" },
        ],
        default: "mapped",
        description:
          "Automatic mode reads the approved template definition. Custom mode sends raw Meta components.",
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
          },
        },
      },
      {
        displayName: "Template Variables",
        name: "templateVariableMapping",
        type: "resourceMapper",
        noDataExpression: true,
        default: {
          mappingMode: "defineBelow",
          value: null,
        },
        typeOptions: {
          loadOptionsDependsOn: [
            "from",
            "templateSource",
            "templateSelection",
            "templateName",
            "templateLanguage",
          ],
          resourceMapper: {
            resourceMapperMethod: "getTemplateVariables",
            mode: "add",
            valuesLabel: "Template Values",
            fieldWords: {
              singular: "variable",
              plural: "variables",
            },
            addAllFields: true,
            supportAutoMap: false,
            noFieldsError: "This template does not require runtime values.",
          },
        },
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateDataMode: ["mapped"],
          },
        },
      },
      {
        displayName: "Custom Components (JSON)",
        name: "templateCustomComponents",
        type: "json",
        default: "[]",
        required: true,
        description:
          "Raw Meta components array, or an object containing a components array. This cannot change the approved template text.",
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateDataMode: ["custom"],
          },
        },
      },
      {
        displayName: "Template Variables",
        name: "templateVariables",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        placeholder: "Add Variable",
        options: [
          {
            displayName: "Header Variable",
            name: "header",
            values: [
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
                description: "One header variable value",
              },
            ],
          },
          {
            displayName: "Body Variable",
            name: "body",
            values: [
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
                description: "One body variable value, in template order",
              },
            ],
          },
          {
            displayName: "Button Variable",
            name: "button",
            values: [
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
                description: "One button variable value",
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendTemplate"],
            templateSource: ["legacy_manual"],
          },
        },
      },
      {
        displayName: "Flow Name",
        name: "flowName",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendFlow"],
          },
        },
      },
      {
        displayName: "Message Body",
        name: "flowBody",
        type: "string",
        default: "Open this form",
        required: true,
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendFlow"],
          },
        },
      },
      {
        displayName: "Button Text",
        name: "flowCta",
        type: "string",
        default: "Open",
        required: true,
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendFlow"],
          },
        },
      },
      {
        displayName: "Flow Data",
        name: "flowData",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        placeholder: "Add Field",
        options: [
          {
            displayName: "Field",
            name: "field",
            values: [
              {
                displayName: "Name",
                name: "name",
                type: "string",
                default: "",
              },
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
              },
            ],
          },
        ],
        description: "Optional data sent to the Flow as key/value pairs",
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendFlow"],
          },
        },
      },
      {
        displayName: "Consent Flow",
        name: "consentMode",
        type: "options",
        options: [
          { name: "Opt-In", value: "opt_in" },
          { name: "Opt-Out", value: "opt_out" },
        ],
        default: "opt_in",
        displayOptions: {
          show: {
            resource: ["whatsapp"],
            operation: ["recordConsent", "sendConsent"],
          },
        },
      },
      {
        displayName: "Consent Scope",
        name: "consentScope",
        type: "options",
        options: [
          { name: "Marketing", value: "marketing" },
          { name: "Service", value: "service" },
        ],
        default: "marketing",
        displayOptions: {
          show: {
            resource: ["whatsapp"],
            operation: ["recordConsent"],
          },
        },
      },
      {
        displayName: "Evidence Source",
        name: "consentSource",
        type: "string",
        default: "customer_form",
        required: true,
        description:
          "Where consent was collected, for example customer_form or crm",
        displayOptions: {
          show: {
            resource: ["whatsapp"],
            operation: ["recordConsent"],
          },
        },
      },
      {
        displayName: "Evidence JSON",
        name: "consentEvidence",
        type: "json",
        default:
          '{\n  "form_id": "form_123",\n  "accepted_at": "2026-07-02T18:00:00.000Z"\n}',
        required: true,
        description:
          "Auditable evidence such as form version, accepted_at, source URL, or external submission ID",
        displayOptions: {
          show: {
            resource: ["whatsapp"],
            operation: ["recordConsent"],
          },
        },
      },
      {
        displayName: "Channel to Connect",
        name: "onboardingProvider",
        type: "options",
        options: [
          { name: "Email (IMAP/SMTP)", value: "imap_smtp" },
          { name: "Facebook Comments", value: "facebook_comments" },
          { name: "Gmail", value: "gmail" },
          { name: "Instagram", value: "instagram" },
          { name: "Instagram Comments", value: "instagram_comments" },
          { name: "Mercado Libre", value: "mercadolibre" },
          { name: "Messenger", value: "messenger" },
          { name: "Outlook", value: "outlook" },
          { name: "Telegram", value: "telegram" },
          { name: "TikTok Business Messaging", value: "tiktok" },
          { name: "WhatsApp", value: "whatsapp" },
        ],
        default: "whatsapp",
        displayOptions: {
          show: {
            resource: ["onboarding", "whatsapp"],
            operation: ["createOnboarding", "sendOnboarding"],
          },
        },
      },
      {
        displayName: "Connection",
        name: "onboardingSignupMode",
        type: "options",
        options: [
          { name: "WhatsApp Business API", value: "cloud_api" },
          { name: "WhatsApp Coexistence", value: "coexistence" },
        ],
        default: "coexistence",
        displayOptions: {
          show: {
            resource: ["onboarding", "whatsapp"],
            operation: ["createOnboarding", "sendOnboarding"],
            onboardingProvider: ["whatsapp"],
          },
        },
      },
      {
        displayName: "Language",
        name: "onboardingLanguage",
        type: "options",
        options: [
          { name: "English", value: "en" },
          { name: "Spanish", value: "es" },
        ],
        default: "es",
        displayOptions: {
          show: {
            resource: ["onboarding", "whatsapp"],
            operation: ["createOnboarding", "sendOnboarding"],
          },
        },
      },
      {
        displayName: "Return URL",
        name: "onboardingReturnUrl",
        type: "string",
        default: "",
        placeholder: "https://app.example.com/settings/whatsapp",
        description:
          "Optional HTTPS URL used after the customer completes onboarding",
        displayOptions: {
          show: {
            resource: ["onboarding", "whatsapp"],
            operation: ["createOnboarding", "sendOnboarding"],
          },
        },
      },
      {
        displayName: "Media Name",
        name: "uploadName",
        type: "string",
        default: "",
        required: true,
        description:
          "Unique reusable media name inside the Easyhook organization",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
          },
        },
      },
      {
        displayName: "Upload Source",
        name: "uploadSource",
        type: "options",
        options: [
          { name: "Base64 Field", value: "base64" },
          { name: "Binary Property", value: "binary" },
        ],
        default: "binary",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
          },
        },
      },
      {
        displayName: "Binary Property",
        name: "binaryPropertyName",
        type: "string",
        default: "data",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
            uploadSource: ["binary"],
          },
        },
      },
      {
        displayName: "File Base64",
        name: "fileBase64",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
            uploadSource: ["base64"],
          },
        },
      },
      {
        displayName: "File Name",
        name: "fileName",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
            uploadSource: ["base64"],
          },
        },
      },
      {
        displayName: "File MIME Type",
        name: "fileType",
        type: "string",
        default: "",
        placeholder: "image/png",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["upload"],
            uploadSource: ["base64"],
          },
        },
      },
      {
        displayName: "Media URL",
        name: "mediaDownloadUrl",
        type: "string",
        default: "",
        required: true,
        placeholder: "https://api.easyhook.dev/v1/media/.../download",
        description: "Authenticated Easyhook link from an incoming media event",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["download"],
          },
        },
      },
      {
        displayName: "Output Binary Field",
        name: "downloadBinaryProperty",
        type: "string",
        default: "data",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["download"],
          },
        },
      },
      {
        displayName: "Media Asset ID",
        name: "mediaAssetId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["delete"],
          },
        },
      },
      {
        displayName: "Scheduled Message ID",
        name: "scheduledMessageId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["scheduledMessage"],
            operation: ["cancel"],
          },
        },
      },
      {
        displayName: "Options",
        name: "options",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        displayOptions: {
          show: {
            resource: ["message", "whatsapp"],
            operation: ["sendText", "sendMedia", "sendTemplate"],
          },
        },
        options: [
          {
            displayName: "Client Reference",
            name: "clientReference",
            type: "string",
            default: "",
            description:
              "Optional application identifier returned in scheduled-message lifecycle and delivery-status events",
          },
          {
            displayName: "Idempotency Key",
            name: "idempotencyKey",
            type: "string",
            default: "",
            description:
              "Stable key for safely retrying a scheduled send. Reusing it returns the original scheduled message instead of creating another task.",
          },
        ],
      },
    ],
  };

  // n8n uses this method while rendering the sender selector, so unsupported
  // providers never appear for the selected operation.
  methods = {
    loadOptions: {
      async getSenders(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const response = await easyhookRequest.call(this, "GET", "/v1/senders");
        const resource = String(this.getCurrentNodeParameter("resource") ?? "");
        const operation = String(
          this.getCurrentNodeParameter("operation") ?? "",
        );
        const humanizedDelivery = String(
          this.getCurrentNodeParameter("humanizedDelivery") ?? "standard",
        );
        const seen = new Set<string>();
        return readArray(response, "senders").flatMap((option) => {
          const provider =
            typeof option.provider === "string" ? option.provider : "";
          if (!senderSupportsNodeOperation(provider, resource, operation))
            return [];
          if (
            resource === "message" &&
            operation === "sendText" &&
            humanizedDelivery === "humanized" &&
            !["whatsapp", "messenger", "instagram", "telegram"].includes(provider)
          )
            return [];
          const label = typeof option.name === "string" ? option.name : "";
          const address =
            typeof option.address === "string" ? option.address : "";
          const value =
            typeof option.account_id === "string" ? option.account_id : "";
          const name = [label, address, provider].filter(Boolean).join(" · ");
          if (!name || !value || seen.has(value)) return [];
          seen.add(value);
          return [{ name, value }];
        });
      },
      async getEmailSenders(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const response = await easyhookRequest.call(this, "GET", "/v1/senders");
        const seen = new Set<string>();
        return readArray(response, "senders").flatMap((option) => {
          const provider =
            typeof option.provider === "string" ? option.provider : "";
          if (!["gmail", "outlook", "imap_smtp"].includes(provider)) return [];
          const label = typeof option.name === "string" ? option.name : "";
          const address =
            typeof option.address === "string" ? option.address : "";
          const value =
            typeof option.account_id === "string" ? option.account_id : "";
          const name = [label, address, provider].filter(Boolean).join(" · ");
          if (!name || !value || seen.has(value)) return [];
          seen.add(value);
          return [{ name, value }];
        });
      },
      async getReviewLocations(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const response = await easyhookRequest.call(this, "GET", "/v1/senders");
        return readArray(response, "senders").flatMap((option) => {
          if (option.provider !== "google_business_profile") return [];
          const name = typeof option.name === "string" ? option.name : "";
          const value =
            typeof option.account_id === "string" ? option.account_id : "";
          return name && value ? [{ name, value }] : [];
        });
      },
      async getMedia(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const response = await easyhookRequest.call(this, "GET", "/v1/media");
        return readArray(response, "media").flatMap((item) => {
          const name = typeof item.name === "string" ? item.name : "";
          const type = typeof item.type === "string" ? item.type : "";
          return name
            ? [
                {
                  name: [name, type].filter(Boolean).join(" · "),
                  value: name,
                },
              ]
            : [];
        });
      },
      async getTemplates(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const from = this.getCurrentNodeParameter("from") as string | undefined;
        if (!from) return [];
        const syncResponse = await easyhookRequest.call(
          this,
          "POST",
          "/v1/templates/sync",
          { from },
        );
        const response = Object.prototype.hasOwnProperty.call(
          syncResponse,
          "templates",
        )
          ? syncResponse
          : await easyhookRequest.call(
              this,
              "GET",
              "/v1/templates",
              undefined,
              { from },
            );
        const templates = readArray(response, "templates").filter(
          isApprovedTemplate,
        );
        return templates
          .map((template) => {
            const name = readTemplateString(template, "name");
            const language = readTemplateLanguage(template);
            const category = readTemplateString(template, "category");
            return {
              name: [name, language, category].filter(Boolean).join(" · "),
              value: JSON.stringify({ name, language }),
              description: "Easyhook WhatsApp template",
            };
          })
          .filter((option) => option.name && option.value);
      },
    },
    resourceMapping: {
      async getTemplateVariables(
        this: ILoadOptionsFunctions,
      ): Promise<ResourceMapperFields> {
        const from = this.getCurrentNodeParameter("from") as string | undefined;
        const source = this.getCurrentNodeParameter("templateSource") as
          | string
          | undefined;
        if (!from) return { fields: [] };

        const selected =
          source === "manual"
            ? {
                name: String(
                  this.getCurrentNodeParameter("templateName") ?? "",
                ).trim(),
                language: String(
                  this.getCurrentNodeParameter("templateLanguage") ?? "",
                ).trim(),
              }
            : parseTemplateSelection(
                String(this.getCurrentNodeParameter("templateSelection") ?? ""),
              );
        if (!readTemplateString(selected, "name")) {
          return {
            fields: [],
            emptyFieldsNotice: "Enter or select a template to load its values.",
          };
        }

        const syncResponse = await easyhookRequest.call(
          this,
          "POST",
          "/v1/templates/sync",
          { from },
        );
        const response = Object.prototype.hasOwnProperty.call(
          syncResponse,
          "templates",
        )
          ? syncResponse
          : await easyhookRequest.call(
              this,
              "GET",
              "/v1/templates",
              undefined,
              { from },
            );
        const templates = readArray(response, "templates");
        const template = templates.find(
          (item) =>
            isApprovedTemplate(item) &&
            templateMatchesSelection(item, selected),
        );
        if (!template) {
          return {
            fields: [],
            emptyFieldsNotice:
              "No approved template matches this name and language for the selected sender.",
          };
        }

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
        const resource = this.getNodeParameter("resource", i) as string;
        const operation = this.getNodeParameter("operation", i) as string;
        if (resource === "media" && operation === "download") {
          const url = this.getNodeParameter("mediaDownloadUrl", i) as string;
          const property = this.getNodeParameter(
            "downloadBinaryProperty",
            i,
            "data",
          ) as string;
          const buffer = await easyhookDownload.call(this, url);
          returnData.push({
            json: {
              downloaded: true,
              bytes: buffer.byteLength,
              source_url: url,
            },
            binary: {
              [property]: await this.helpers.prepareBinaryData(buffer),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        const response = await executeOperation.call(
          this,
          resource,
          operation,
          i,
        );
        returnData.push({
          json: response as IDataObject,
          pairedItem: { item: i },
        });
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
        if (error instanceof NodeApiError) {
          throw new NodeApiError(
            this.getNode(),
            error as unknown as JsonObject,
            { itemIndex: i },
          );
        }
        throw new NodeOperationError(
          this.getNode(),
          error instanceof Error ? error.message : String(error),
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}

function senderSupportsNodeOperation(
  provider: string,
  resource: string,
  operation: string,
): boolean {
  const emailProviders = new Set(["gmail", "outlook", "imap_smtp"]);
  if (resource === "comment") return ["facebook_comments", "instagram_comments"].includes(provider);
  if (resource === "email") return emailProviders.has(provider);
  if (resource === "onboarding") return provider === "whatsapp";
  if (resource === "whatsapp" || resource === "template")
    return provider === "whatsapp";
  if (resource === "message") {
    if (operation === "sendInteractive")
      return ["whatsapp", "messenger", "instagram", "telegram", "tiktok"].includes(
        provider,
      );
    if (operation === "sendQuickReplies")
      return ["messenger", "instagram"].includes(provider);
    if (operation === "sendMedia")
      return ["whatsapp", "messenger", "instagram", "telegram", "tiktok"].includes(
        provider,
      );
    return [
      "whatsapp",
      "messenger",
      "instagram",
      "telegram",
      "mercadolibre",
      "tiktok",
    ].includes(provider);
  }
  if (resource === "messageControl") {
    if (operation === "sendRead")
      return ["whatsapp", "messenger", "instagram", "tiktok"].includes(provider);
    if (operation === "sendTyping")
      return ["whatsapp", "messenger", "instagram", "telegram", "tiktok"].includes(
        provider,
      );
    if (operation === "sendReaction")
      return ["whatsapp", "telegram"].includes(provider);
    if (operation === "sendReply")
      return ["whatsapp", "messenger", "instagram", "telegram", "tiktok"].includes(
        provider,
      );
  }
  return true;
}

async function executeOperation(
  this: IExecuteFunctions,
  resource: string,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  if (
    resource === "message" ||
    resource === "messageControl" ||
    resource === "whatsapp" ||
    resource === "onboarding"
  )
    return executeMessageOperation.call(this, operation, itemIndex);
  if (resource === "email")
    return executeMessageOperation.call(this, operation, itemIndex);
  if (resource === "media")
    return executeMediaOperation.call(this, operation, itemIndex);
  if (resource === "template")
    return executeTemplateOperation.call(this, operation, itemIndex);
  if (resource === "review")
    return executeReviewOperation.call(this, operation, itemIndex);
  if (resource === "comment")
    return executeCommentOperation.call(this, operation, itemIndex);
  if (resource === "scheduledMessage")
    return executeScheduledMessageOperation.call(this, operation, itemIndex);
  throw new NodeOperationError(
    this.getNode(),
    `Unsupported resource: ${resource}`,
    { itemIndex },
  );
}

async function executeCommentOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  const from = this.getNodeParameter("commentFrom", itemIndex) as string;
  if (operation === "listComments") {
    return easyhookRequest.call(this, "GET", "/v1/comments", undefined, {
      from,
      object_id: this.getNodeParameter("commentObjectId", itemIndex) as string,
      limit: this.getNodeParameter("commentLimit", itemIndex, 50) as number,
      after: this.getNodeParameter("commentAfter", itemIndex, "") as string,
    });
  }
  if (operation === "replyComment") {
    const commentId = this.getNodeParameter("socialCommentId", itemIndex) as string;
    return easyhookRequest.call(this, "POST", `/v1/comments/${encodeURIComponent(commentId)}/reply`, {
      from,
      message: this.getNodeParameter("commentReply", itemIndex) as string,
    });
  }
  throw new NodeOperationError(this.getNode(), `Unsupported comment operation: ${operation}`, { itemIndex });
}

async function executeReviewOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  const from = this.getNodeParameter("reviewLocation", itemIndex) as string;
  if (operation === "getReviewRating") {
    return easyhookRequest.call(
      this,
      "GET",
      "/v1/reviews/summary",
      undefined,
      { from },
    );
  }
  if (operation === "listReviews") {
    return easyhookRequest.call(
      this,
      "GET",
      "/v1/reviews",
      undefined,
      cleanObject({
        from,
        page_size: this.getNodeParameter("reviewPageSize", itemIndex, 20) as number,
        page_token: this.getNodeParameter("reviewPageCursor", itemIndex, "") as string,
      }),
    );
  }
  if (operation === "replyToReview") {
    const reviewId = this.getNodeParameter("reviewId", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "PUT",
      `/v1/reviews/${encodeURIComponent(reviewId)}/reply`,
      {
        from,
        comment: this.getNodeParameter("reviewReply", itemIndex) as string,
      },
    );
  }
  throw new NodeOperationError(
    this.getNode(),
    `Unsupported review operation: ${operation}`,
    { itemIndex },
  );
}

async function executeMessageOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  if (operation === "createOnboarding") {
    const provider = this.getNodeParameter(
      "onboardingProvider",
      itemIndex,
      "whatsapp",
    ) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/onboarding/sessions",
      cleanObject({
        provider,
        signup_mode: provider === "whatsapp"
          ? this.getNodeParameter("onboardingSignupMode", itemIndex) as string
          : undefined,
        language: this.getNodeParameter(
          "onboardingLanguage",
          itemIndex,
          "es",
        ) as string,
        return_url: this.getNodeParameter(
          "onboardingReturnUrl",
          itemIndex,
          "",
        ) as string,
      }),
    );
  }

  const from = this.getNodeParameter("from", itemIndex) as string;
  const requestOptions = this.getNodeParameter(
    "options",
    itemIndex,
    {},
  ) as IDataObject;
  const clientReference =
    typeof requestOptions.clientReference === "string"
      ? requestOptions.clientReference
      : "";
  const requestHeaders = idempotencyHeaders(requestOptions);

  if (operation === "sendText") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const body = this.getNodeParameter("body", itemIndex) as string;
    const humanizedDelivery = this.getNodeParameter(
      "humanizedDelivery",
      itemIndex,
      "standard",
    ) as boolean | string;
    const messageId = this.getNodeParameter(
      "messageId",
      itemIndex,
      "",
    ) as string;
    if (humanizedDelivery === true || humanizedDelivery === "humanized") {
      return easyhookRequest.call(
        this,
        "POST",
        "/v1/messages/humanized-text",
        cleanObject({ from, to, body, message_id: messageId }),
      );
    }
    const at = this.getNodeParameter("at", itemIndex, "") as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/text",
      cleanObject({
        from,
        to,
        body,
        at,
        client_reference: clientReference,
      }),
      undefined,
      at ? requestHeaders : undefined,
    );
  }

  if (operation === "sendQuickReplies") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const body = this.getNodeParameter("body", itemIndex) as string;
    const collection = this.getNodeParameter(
      "quickReplies",
      itemIndex,
      {},
    ) as IDataObject;
    const quickReplies = Array.isArray(collection.reply)
      ? collection.reply.map((value) => {
          const reply = value as IDataObject;
          return {
            title: String(reply.title ?? ""),
            payload: String(reply.payload ?? ""),
          };
        })
      : [];
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/quick-replies",
      { from, to, body, quick_replies: quickReplies },
    );
  }

  if (operation === "sendInteractive") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const body = this.getNodeParameter("body", itemIndex) as string;
    const collection = this.getNodeParameter(
      "interactiveButtons",
      itemIndex,
      {},
    ) as IDataObject;
    const buttons = Array.isArray(collection.button)
      ? collection.button.map((value) => {
          const button = value as IDataObject;
          const type = String(button.type ?? "reply");
          return cleanObject({
            type,
            title: String(button.title ?? ""),
            payload:
              type === "reply" ? String(button.payload ?? "") : undefined,
            url: type === "url" ? String(button.url ?? "") : undefined,
          });
        })
      : [];
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/interactive",
      { from, to, body, buttons },
    );
  }

  if (emailOperations.includes(operation)) {
    const draftId = this.getNodeParameter(
      "emailDraftId",
      itemIndex,
      "",
    ) as string;
    if (operation === "sendEmailDraft") {
      return easyhookRequest.call(
        this,
        "POST",
        `/v1/email/drafts/${encodeURIComponent(draftId)}/send`,
        { from },
      );
    }
    const originalMessageId = this.getNodeParameter(
      "emailReplyToMessageId",
      itemIndex,
      "",
    ) as string;
    if (operation === "updateEmail") {
      return easyhookRequest.call(this, "POST", "/v1/email/actions", {
        from,
        message_id: originalMessageId,
        action: this.getNodeParameter("emailAction", itemIndex) as string,
      });
    }
    const to = this.getNodeParameter("to", itemIndex) as string;
    if (operation === "forwardEmail") {
      return easyhookRequest.call(
        this,
        "POST",
        "/v1/messages/email/forward",
        cleanObject({
          from,
          to,
          message_id: originalMessageId,
          note: this.getNodeParameter(
            "emailForwardNote",
            itemIndex,
            "",
          ) as string,
        }),
      );
    }
    const replyToMessageId =
      operation === "replyEmail"
        ? originalMessageId
        : (this.getNodeParameter(
            "emailReplyToMessageId",
            itemIndex,
            "",
          ) as string);
    const attachmentConfig = this.getNodeParameter(
      "emailAttachments.attachment",
      itemIndex,
      [],
    ) as IDataObject[];
    const inputItem = this.getInputData()[itemIndex];
    const attachments = await Promise.all(
      attachmentConfig.map(async (attachment) => {
        const binaryPropertyName = String(
          attachment.binaryPropertyName ?? "data",
        );
        const bytes = await this.helpers.getBinaryDataBuffer(
          itemIndex,
          binaryPropertyName,
        );
        const binary = inputItem.binary?.[binaryPropertyName];
        return {
          filename: String(
            attachment.filename || binary?.fileName || "attachment",
          ),
          content_type: String(
            attachment.contentType ||
              binary?.mimeType ||
              "application/octet-stream",
          ),
          content_base64: bytes.toString("base64"),
        };
      }),
    );
    const endpoint =
      operation === "createEmailDraft"
        ? "/v1/email/drafts"
        : operation === "updateEmailDraft"
          ? `/v1/email/drafts/${encodeURIComponent(draftId)}`
          : "/v1/messages/email";
    return easyhookRequest.call(
      this,
      operation === "updateEmailDraft" ? "PUT" : "POST",
      endpoint,
      cleanObject({
        from,
        to,
        subject: this.getNodeParameter("emailSubject", itemIndex) as string,
        body: this.getNodeParameter("emailBody", itemIndex) as string,
        html: this.getNodeParameter("emailHtml", itemIndex, "") as string,
        reply_to_message_id: replyToMessageId,
        thread_id: this.getNodeParameter(
          "emailThreadId",
          itemIndex,
          "",
        ) as string,
        in_reply_to: this.getNodeParameter(
          "emailInReplyTo",
          itemIndex,
          "",
        ) as string,
        references: this.getNodeParameter(
          "emailReferences",
          itemIndex,
          "",
        ) as string,
        attachments,
      }),
    );
  }

  if (operation === "sendMedia") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const type = this.getNodeParameter("mediaType", itemIndex) as string;
    const referenceType = this.getNodeParameter(
      "mediaReferenceType",
      itemIndex,
    ) as string;
    const caption = this.getNodeParameter("caption", itemIndex, "") as string;
    const filename = this.getNodeParameter("filename", itemIndex, "") as string;
    const at = this.getNodeParameter("at", itemIndex, "") as string;
    const body: IDataObject = cleanObject({
      from,
      to,
      type,
      caption,
      filename,
      at,
      client_reference: clientReference,
    });
    if (referenceType === "media_name")
      body.media_name = this.getNodeParameter("mediaName", itemIndex) as string;
    if (referenceType === "id")
      body.id = this.getNodeParameter("mediaId", itemIndex) as string;
    if (referenceType === "link")
      body.link = this.getNodeParameter("mediaLink", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/media",
      body,
      undefined,
      at ? requestHeaders : undefined,
    );
  }

  if (operation === "sendTemplate") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const at = this.getNodeParameter("at", itemIndex, "") as string;
    const templateSource = this.getNodeParameter(
      "templateSource",
      itemIndex,
      "list",
    ) as string;
    const template =
      templateSource === "manual"
        ? {
            name: this.getNodeParameter("templateName", itemIndex) as string,
            language: this.getNodeParameter(
              "templateLanguage",
              itemIndex,
            ) as string,
          }
        : parseTemplateSelection(
            this.getNodeParameter("templateSelection", itemIndex) as string,
          );
    const templateDataMode = this.getNodeParameter(
      "templateDataMode",
      itemIndex,
      "mapped",
    ) as string;
    const components =
      templateDataMode === "custom"
        ? parseCustomTemplateComponents(
            this.getNodeParameter("templateCustomComponents", itemIndex, "[]"),
            this,
            itemIndex,
          )
        : buildTemplateComponentsFromMapper(
            this.getNodeParameter(
              "templateVariableMapping.value",
              itemIndex,
              {},
            ) as IDataObject,
          );
    const legacyParameters =
      templateSource === "manual" &&
      templateDataMode === "mapped" &&
      components.length === 0
        ? buildTemplateParameters(
            this.getNodeParameter(
              "templateVariables",
              itemIndex,
              {},
            ) as IDataObject,
          )
        : undefined;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/template",
      cleanObject({
        from,
        to,
        template,
        components:
          legacyParameters && Object.keys(legacyParameters).length > 0
            ? undefined
            : components,
        parameters:
          legacyParameters && Object.keys(legacyParameters).length > 0
            ? legacyParameters
            : undefined,
        at,
        client_reference: clientReference,
      }),
      undefined,
      at ? requestHeaders : undefined,
    );
  }

  if (operation === "sendFlow") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/flow",
      cleanObject({
        from,
        to,
        flow_name: this.getNodeParameter("flowName", itemIndex) as string,
        body: this.getNodeParameter("flowBody", itemIndex) as string,
        cta: this.getNodeParameter("flowCta", itemIndex) as string,
        payload: buildKeyValueObject(
          this.getNodeParameter("flowData", itemIndex, {}) as IDataObject,
        ),
      }),
    );
  }

  if (operation === "sendConsent") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const mode = this.getNodeParameter("consentMode", itemIndex) as string;
    return easyhookRequest.call(this, "POST", "/v1/consent", {
      from,
      to,
      mode,
    });
  }

  if (operation === "getConsentStatus") {
    const contact = this.getNodeParameter("to", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "GET",
      "/v1/consent/status",
      undefined,
      { from, contact },
    );
  }

  if (operation === "recordConsent") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const evidence = parseJsonObject(
      this.getNodeParameter("consentEvidence", itemIndex) as string,
      this,
      itemIndex,
      "Evidence JSON",
    );
    return easyhookRequest.call(this, "POST", "/v1/consent", {
      from,
      to,
      scope: this.getNodeParameter("consentScope", itemIndex) as string,
      status: this.getNodeParameter("consentMode", itemIndex) as string,
      source: this.getNodeParameter("consentSource", itemIndex) as string,
      evidence,
    });
  }

  if (operation === "sendReaction") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const messageId = this.getNodeParameter("messageId", itemIndex) as string;
    const emoji = this.getNodeParameter(
      "reactionEmoji",
      itemIndex,
      "",
    ) as string;
    return easyhookRequest.call(this, "POST", "/v1/messages/reaction", {
      from,
      to,
      message_id: messageId,
      emoji,
    });
  }

  if (operation === "sendReply") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const messageId = this.getNodeParameter("messageId", itemIndex) as string;
    const body = this.getNodeParameter("replyBody", itemIndex) as string;
    return easyhookRequest.call(this, "POST", "/v1/messages/reply", {
      from,
      to,
      message_id: messageId,
      body,
    });
  }

  if (operation === "sendOnboarding") {
    const to = this.getNodeParameter("to", itemIndex) as string;
    const provider = this.getNodeParameter(
      "onboardingProvider",
      itemIndex,
      "whatsapp",
    ) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/onboarding/sessions/send",
      cleanObject({
        from,
        to,
        provider,
        signup_mode: provider === "whatsapp"
          ? this.getNodeParameter("onboardingSignupMode", itemIndex) as string
          : undefined,
        language: this.getNodeParameter(
          "onboardingLanguage",
          itemIndex,
          "es",
        ) as string,
        return_url: this.getNodeParameter(
          "onboardingReturnUrl",
          itemIndex,
          "",
        ) as string,
      }),
    );
  }

  if (operation === "sendRead") {
    const messageId = this.getNodeParameter("messageId", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/read",
      cleanObject({ from, message_id: messageId }),
    );
  }

  if (operation === "sendTyping") {
    const messageId = this.getNodeParameter("messageId", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "POST",
      "/v1/messages/typing",
      cleanObject({ from, message_id: messageId }),
    );
  }

  throw new NodeOperationError(
    this.getNode(),
    `Unsupported message operation: ${operation}`,
    { itemIndex },
  );
}

async function executeMediaOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  if (operation === "list") {
    return easyhookRequest.call(this, "GET", "/v1/media");
  }

  if (operation === "delete") {
    const id = this.getNodeParameter("mediaAssetId", itemIndex) as string;
    return easyhookRequest.call(
      this,
      "DELETE",
      `/v1/media/${encodeURIComponent(id)}`,
    );
  }

  if (operation === "upload") {
    const name = this.getNodeParameter("uploadName", itemIndex) as string;
    const type = this.getNodeParameter("mediaType", itemIndex) as string;
    const uploadSource = this.getNodeParameter(
      "uploadSource",
      itemIndex,
    ) as string;
    const body: IDataObject = { name, type };

    if (uploadSource === "binary") {
      const binaryPropertyName = this.getNodeParameter(
        "binaryPropertyName",
        itemIndex,
      ) as string;
      const binaryData = this.helpers.assertBinaryData(
        itemIndex,
        binaryPropertyName,
      );
      const buffer = await this.helpers.getBinaryDataBuffer(
        itemIndex,
        binaryPropertyName,
      );
      body.file_name = binaryData.fileName ?? name;
      body.file_type = binaryData.mimeType ?? "application/octet-stream";
      body.file_base64 = buffer.toString("base64");
    } else {
      body.file_name = this.getNodeParameter("fileName", itemIndex) as string;
      body.file_type = this.getNodeParameter("fileType", itemIndex) as string;
      body.file_base64 = this.getNodeParameter(
        "fileBase64",
        itemIndex,
      ) as string;
    }

    return easyhookRequest.call(this, "POST", "/v1/media", body);
  }

  throw new NodeOperationError(
    this.getNode(),
    `Unsupported media operation: ${operation}`,
    { itemIndex },
  );
}

async function executeTemplateOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  if (operation === "classify") {
    const category = this.getNodeParameter(
      "templateCreateCategory",
      itemIndex,
    ) as string;
    const components = parseCustomTemplateComponents(
      this.getNodeParameter("templateCreateComponents", itemIndex, "[]"),
      this,
      itemIndex,
    );
    return easyhookRequest.call(this, "POST", "/v1/templates/classify", {
      category,
      components,
    });
  }

  const from = this.getNodeParameter("from", itemIndex) as string;
  if (operation === "create") {
    const components = parseCustomTemplateComponents(
      this.getNodeParameter("templateCreateComponents", itemIndex, "[]"),
      this,
      itemIndex,
    );
    return easyhookRequest.call(this, "POST", "/v1/templates", {
      from,
      name: this.getNodeParameter("templateCreateName", itemIndex) as string,
      language: this.getNodeParameter(
        "templateCreateLanguage",
        itemIndex,
      ) as string,
      category: this.getNodeParameter(
        "templateCreateCategory",
        itemIndex,
      ) as string,
      parameter_format: this.getNodeParameter(
        "templateParameterFormat",
        itemIndex,
      ) as string,
      components,
    });
  }
  if (operation === "list")
    return easyhookRequest.call(this, "GET", "/v1/templates", undefined, {
      from,
    });
  if (operation === "sync")
    return easyhookRequest.call(this, "POST", "/v1/templates/sync", { from });
  throw new NodeOperationError(
    this.getNode(),
    `Unsupported template operation: ${operation}`,
    { itemIndex },
  );
}

async function executeScheduledMessageOperation(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<IDataObject> {
  const id = this.getNodeParameter("scheduledMessageId", itemIndex) as string;
  if (operation === "cancel") {
    return easyhookRequest.call(
      this,
      "DELETE",
      `/v1/scheduled-messages/${encodeURIComponent(id)}`,
    );
  }
  throw new NodeOperationError(
    this.getNode(),
    `Unsupported scheduled message operation: ${operation}`,
    { itemIndex },
  );
}

function idempotencyHeaders(options: IDataObject): IDataObject | undefined {
  const key =
    typeof options.idempotencyKey === "string"
      ? options.idempotencyKey.trim()
      : "";
  return key ? { "Idempotency-Key": key } : undefined;
}

function parseTemplateSelection(value: string): IDataObject {
  try {
    return JSON.parse(value) as IDataObject;
  } catch {
    return { name: value };
  }
}

function parseJsonObject(
  value: string,
  context: IExecuteFunctions,
  itemIndex: number,
  fieldName: string,
): IDataObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch (error) {
    throw new NodeOperationError(
      context.getNode(),
      `${fieldName} must be a valid JSON object: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { itemIndex },
    );
  }
  if (!isRecord(parsed)) {
    throw new NodeOperationError(
      context.getNode(),
      `${fieldName} must be a JSON object`,
      { itemIndex },
    );
  }
  return parsed;
}

function templateMatchesSelection(
  template: IDataObject,
  selected: IDataObject,
): boolean {
  const selectedName = readTemplateString(selected, "name");
  const selectedLanguage = readTemplateLanguage(selected);
  if (!selectedName) return false;
  const name = readTemplateString(template, "name");
  const language =
    readTemplateLanguage(template) || readTemplateString(template, "lang");
  return (
    name === selectedName &&
    (!selectedLanguage || language === selectedLanguage)
  );
}

function isApprovedTemplate(template: IDataObject): boolean {
  const status =
    readTemplateString(template, "status") ||
    readTemplateString(template, "meta_status");
  return status?.toUpperCase() === "APPROVED";
}

export function extractTemplateVariableFields(
  components: unknown,
): ResourceMapperFields["fields"] {
  if (!Array.isArray(components)) return [];
  const fields: ResourceMapperFields["fields"] = [];
  for (const component of components) {
    if (!isRecord(component)) continue;
    const type = String(component.type ?? "").toUpperCase();
    if (type === "HEADER") {
      const format = String(component.format ?? "").toUpperCase();
      if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) {
        const mediaType = format.toLowerCase();
        fields.push(
          templateVariableField(
            `header.media.${mediaType}`,
            `Header ${titleCase(mediaType)} URL`,
            true,
          ),
        );
        if (format === "DOCUMENT") {
          fields.push(
            templateVariableField(
              "header.media.filename",
              "Header Document Filename",
              false,
            ),
          );
        }
      }
      if (format === "LOCATION") {
        fields.push(
          templateVariableField(
            "header.location.latitude",
            "Header Location Latitude",
            true,
          ),
        );
        fields.push(
          templateVariableField(
            "header.location.longitude",
            "Header Location Longitude",
            true,
          ),
        );
        fields.push(
          templateVariableField(
            "header.location.name",
            "Header Location Name",
            true,
          ),
        );
        fields.push(
          templateVariableField(
            "header.location.address",
            "Header Location Address",
            true,
          ),
        );
      }
    }
    if (type === "HEADER" || type === "BODY") {
      const section = type.toLowerCase();
      const text = typeof component.text === "string" ? component.text : "";
      for (const placeholder of extractPlaceholders(text)) {
        fields.push(
          templateVariableField(
            `${section}.text.${placeholder}`,
            `${titleCase(section)} {{${placeholder}}}`,
            true,
          ),
        );
      }
    }
    if (type === "BUTTONS" && Array.isArray(component.buttons)) {
      component.buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const buttonType = String(button.type ?? "URL").toUpperCase();
        const source = [button.text, button.url]
          .filter((value): value is string => typeof value === "string")
          .join(" ");
        if (buttonType === "URL") {
          for (const placeholder of extractPlaceholders(source)) {
            fields.push(
              templateVariableField(
                `button.${index}.url.text.${placeholder}`,
                `Button ${index + 1} URL {{${placeholder}}}`,
                true,
              ),
            );
          }
        }
        if (buttonType === "QUICK_REPLY") {
          fields.push(
            templateVariableField(
              `button.${index}.quick_reply.payload`,
              `Button ${index + 1} Quick Reply Payload`,
              true,
            ),
          );
        }
        if (buttonType === "COPY_CODE") {
          fields.push(
            templateVariableField(
              `button.${index}.copy_code.coupon_code`,
              `Button ${index + 1} Coupon Code`,
              true,
            ),
          );
        }
        if (buttonType === "OTP") {
          fields.push(
            templateVariableField(
              `button.${index}.url.text.1`,
              `Button ${index + 1} Authentication Code`,
              true,
            ),
          );
        }
      });
    }
  }
  return fields;
}

function templateVariableField(
  id: string,
  displayName: string,
  required: boolean,
): ResourceMapperFields["fields"][number] {
  return {
    id,
    displayName,
    required,
    defaultMatch: false,
    canBeUsedToMatch: false,
    display: true,
    type: "string",
  };
}

function extractPlaceholders(value: string): string[] {
  const seen = new Set<string>();
  const matches = value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g);
  for (const match of matches) {
    if (match[1]) seen.add(match[1]);
  }
  return [...seen].sort((a, b) =>
    parameterSortKey(a).localeCompare(parameterSortKey(b)),
  );
}

export function buildTemplateComponentsFromMapper(
  input: IDataObject,
): IDataObject[] {
  const sections: Record<"header" | "body", Record<string, string>> = {
    header: {},
    body: {},
  };
  const buttons = new Map<
    string,
    { index: string; subType: string; values: Record<string, string> }
  >();
  const headerMedia: Record<string, string> = {};
  const headerLocation: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (!["string", "number", "boolean"].includes(typeof rawValue)) continue;
    const value = String(rawValue);
    if (!value) continue;
    const parts = key.split(".");
    const section = parts[0];
    if (section === "header" && parts[1] === "media" && parts[2]) {
      headerMedia[parts[2]] = value;
      continue;
    }
    if (section === "header" && parts[1] === "location" && parts[2]) {
      headerLocation[parts[2]] = value;
      continue;
    }
    if (
      (section === "header" || section === "body") &&
      parts[1] === "text" &&
      parts[2]
    ) {
      sections[section][parts.slice(2).join(".")] = value;
      continue;
    }
    if ((section === "header" || section === "body") && parts[1]) {
      sections[section][parts.slice(1).join(".")] = value;
      continue;
    }
    if (section === "button" && parts.length >= 4) {
      const [, index, subType, parameterType, ...placeholderParts] = parts;
      const placeholder = placeholderParts.join(".") || parameterType;
      const buttonKey = `${index}.${subType}`;
      const current = buttons.get(buttonKey) ?? { index, subType, values: {} };
      current.values[`${parameterType}.${placeholder}`] = value;
      buttons.set(buttonKey, current);
    }
  }

  const components: IDataObject[] = [];
  const header = buildHeaderComponent(
    headerMedia,
    headerLocation,
    sections.header,
  );
  const body = buildTextComponentFromNamedValues("body", sections.body);
  if (header) components.push(header);
  if (body) components.push(body);

  for (const button of [...buttons.values()].sort(
    (a, b) => Number(a.index) - Number(b.index),
  )) {
    const parameters = buildButtonParameters(button.values);
    if (parameters.length === 0) continue;
    components.push({
      type: "button",
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
  const mediaType = ["image", "video", "document"].find((type) => media[type]);
  if (mediaType) {
    const mediaValue = cleanObject({
      link: media[mediaType],
      filename: mediaType === "document" ? media.filename : undefined,
    });
    return {
      type: "header",
      parameters: [{ type: mediaType, [mediaType]: mediaValue }],
    };
  }
  if (
    location.latitude &&
    location.longitude &&
    location.name &&
    location.address
  ) {
    return {
      type: "header",
      parameters: [
        {
          type: "location",
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name,
            address: location.address,
          },
        },
      ],
    };
  }
  return buildTextComponentFromNamedValues("header", text);
}

function buildButtonParameters(values: Record<string, string>): IDataObject[] {
  return Object.entries(values)
    .sort(([a], [b]) =>
      parameterSortKey(a.split(".").slice(1).join(".")).localeCompare(
        parameterSortKey(b.split(".").slice(1).join(".")),
      ),
    )
    .map(([key, value]) => {
      const [type, ...nameParts] = key.split(".");
      const name = nameParts.join(".");
      if (type === "payload") return { type: "payload", payload: value };
      if (type === "coupon_code")
        return { type: "coupon_code", coupon_code: value };
      return cleanObject({
        type: "text",
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
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new NodeOperationError(
        context.getNode(),
        "Custom template components must be valid JSON.",
        { itemIndex },
      );
    }
  }
  if (isRecord(parsed) && Array.isArray(parsed.components))
    parsed = parsed.components;
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new NodeOperationError(
      context.getNode(),
      "Custom template components must be an array or an object with a components array.",
      { itemIndex },
    );
  }
  return parsed;
}

function buildTextComponentFromNamedValues(
  type: "header" | "body",
  values: Record<string, string>,
): IDataObject | null {
  const parameters = buildTextParametersFromNamedValues(values);
  return parameters.length ? { type, parameters } : null;
}

function buildTextParametersFromNamedValues(
  values: Record<string, string>,
): IDataObject[] {
  return Object.entries(values)
    .sort(([a], [b]) => parameterSortKey(a).localeCompare(parameterSortKey(b)))
    .map(([key, value]) =>
      cleanObject({
        type: "text",
        text: value,
        parameter_name: /^\d+$/.test(key) ? undefined : key,
      }),
    );
}

function buildTemplateParameters(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  const header = readCollectionValues(input, "header");
  const body = readCollectionValues(input, "body");
  const button = readCollectionValues(input, "button");
  if (header.length) output.header = header;
  if (body.length) output.body = body;
  if (button.length) output.button = button;
  return output;
}

function parameterSortKey(value: string): string {
  return /^\d+$/.test(value) ? value.padStart(6, "0") : `z_${value}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isRecord(value: unknown): value is IDataObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildKeyValueObject(input: IDataObject): IDataObject {
  const output: IDataObject = {};
  const fields = input.field;
  if (!Array.isArray(fields)) return output;
  for (const field of fields) {
    if (!field || typeof field !== "object" || Array.isArray(field)) continue;
    const name = (field as IDataObject).name;
    if (typeof name !== "string" || !name.trim()) continue;
    output[name.trim()] = (field as IDataObject).value ?? "";
  }
  return output;
}

function readCollectionValues(input: IDataObject, section: string): string[] {
  const value = input[section];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const raw = (item as IDataObject).value;
      return typeof raw === "string" ? raw.trim() : "";
    })
    .filter(Boolean);
}

function readTemplateString(template: IDataObject, key: string): string {
  const value = template[key];
  return typeof value === "string" ? value : "";
}

function readTemplateLanguage(template: IDataObject): string {
  const direct = readTemplateString(template, "language");
  if (direct) return direct;
  const language = template.language;
  if (language && typeof language === "object" && !Array.isArray(language)) {
    const code = (language as IDataObject).code;
    return typeof code === "string" ? code : "";
  }
  return "";
}
