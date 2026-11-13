import { SITE_NAME } from "./common.text";

/** Copy for /tickets, /tickets/new, /tickets/[id], and their components. */

export const TICKET_QUEUE_TEXT = {
  META_TITLE: `Queue — ${SITE_NAME}`,
  LOADING: "Loading queue",
  HEADING: "Ticket queue",
  SUBHEADING:
    "Every ticket, across every customer — filter, sort, and open one to work it.",
  NOT_AVAILABLE: "The queue is only available to agents and admins.",
  NO_RESULTS: "No tickets match these filters.",
} as const;

export const TICKET_QUEUE_FILTERS_TEXT = {
  STATUS_LABEL: "Status",
  PRIORITY_LABEL: "Priority",
  ASSIGNED_TO_LABEL: "Assigned to",
  ALL_STATUSES: "All statuses",
  ALL_PRIORITIES: "All priorities",
  ALL_ASSIGNEES: "Everyone",
  ME: "Me",
  UNASSIGNED: "Unassigned",
} as const;

/** Assignment indicator shown on TicketRow, queue view only (see
 * TicketRowProps.currentUserId). */
export const TICKET_ROW_TEXT = {
  UNASSIGNED: "Unassigned",
  ASSIGNED_TO_YOU: "You",
  ASSIGNED: "Assigned",
  NOT_ASSIGNED_TO_YOU_TOAST: "This ticket is assigned to another agent.",
} as const;

export const TICKET_LIST_TEXT = {
  META_TITLE: `My tickets — ${SITE_NAME}`,
  LOADING: "Loading tickets",
  HEADING: "My tickets",
  SUBHEADING: "Everything you've filed, newest first by default.",
  NEW_TICKET_LINK: "New ticket",
  AI_CHAT_LINK: "Open AI Assistant",
  NO_RESULTS_ON_PAGE: "No tickets on this page.",
  NO_TICKETS_YET: "You haven't filed any tickets yet.",
  FILE_FIRST_TICKET: "File your first ticket",
  // Mirrors TICKET_QUEUE_TEXT.NOT_AVAILABLE's role-mismatch pattern, just
  // the other direction: this page is for filing/viewing your own
  // tickets, which isn't a thing for an AGENT/ADMIN account (Step 9.6.3).
  NOT_AVAILABLE: "This page is for your own tickets. Agents and admins use the queue instead.",
  GO_TO_QUEUE: "Go to queue",
} as const;

export const TICKET_PAGINATION_TEXT = {
  ARIA_LABEL: "Ticket list pagination",
  PREVIOUS: "Previous",
  NEXT: "Next",
  summary: (page: number, totalPages: number, total: number) =>
    `Page ${page} of ${totalPages} · ${total} ticket${total === 1 ? "" : "s"}`,
} as const;

export const TICKET_SORT_CONTROLS_TEXT = {
  SORT_LABEL: "Sort",
  ASC: "Ascending",
  DESC: "Descending",
  FIELD_LABELS: {
    createdAt: "Created",
    updatedAt: "Updated",
    priority: "Priority",
    status: "Status",
  },
} as const;

export const TICKET_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const TICKET_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;

export const NEW_TICKET_TEXT = {
  META_TITLE: `New ticket — ${SITE_NAME}`,
  HEADING: "New ticket",
  SUBHEADING: "Describe the issue and we'll get it to the right person.",
  TITLE_LABEL: "Title",
  TITLE_PLACEHOLDER: "Short summary of the issue",
  DESCRIPTION_LABEL: "Description",
  DESCRIPTION_PLACEHOLDER:
    "What's happening? Include steps to reproduce, error messages, and when it started.",
  PRIORITY_LABEL: "Priority",
  SUBMIT: "Submit ticket",
  CANCEL: "Cancel",
  charactersHint: (length: number, max: number) =>
    `${length}/${max} characters`,
  rateLimitedMessage: (countdown: string) =>
    `You're creating tickets too quickly. Try again in ${countdown}.`,
  AI_CHAT_LINK: "Or ask the AI Assistant to help instead",
} as const;

export const TICKET_DETAIL_TEXT = {
  META_TITLE: `Ticket — ${SITE_NAME}`,
  LOADING: "Loading ticket",
  BACK_TO_TICKETS: "← Back to tickets",
  BACK_TO_TICKETS_SIMPLE: "Back to tickets",
  // Shown instead of the two above when the viewer is an AGENT/ADMIN --
  // they came from the queue (Step 9.6.1), not the customer-only /tickets
  // list, which they no longer have access to (see NOT_AVAILABLE below).
  BACK_TO_QUEUE: "← Back to queue",
  BACK_TO_QUEUE_SIMPLE: "Back to queue",
  NOT_FOUND: "That ticket doesn't exist, or isn't yours.",
  REOPEN_BUTTON: "Reopen ticket",
  CLOSE_BUTTON: "Close ticket",
  MESSAGES_HEADING: "Messages",
  filedUpdated: (filedDate: string, updatedDate: string) =>
    `Filed ${filedDate} · Updated ${updatedDate}`,
  closedNote: (date: string, reason: string) => `Closed ${date}: ${reason}`,
  reopenedNote: (date: string, reason: string) => `Reopened ${date}: ${reason}`,
} as const;

export const TICKET_CLOSE_MODAL_TEXT = {
  TITLE: "Close this ticket?",
  DESCRIPTION:
    "Let us know why you're closing it. You can reopen it later if needed.",
  REASON_LABEL: "Reason",
  REASON_PLACEHOLDER: "e.g. Resolved myself, no longer needed…",
  CONFIRM_LABEL: "Close ticket",
  SUCCESS_TOAST: "Ticket closed.",
} as const;

export const TICKET_REOPEN_MODAL_TEXT = {
  TITLE: "Reopen this ticket?",
  DESCRIPTION: "Let us know why you're reopening it.",
  REASON_LABEL: "Reason",
  REASON_PLACEHOLDER: "e.g. Issue came back, wasn't actually fixed…",
  CONFIRM_LABEL: "Reopen ticket",
  SUCCESS_TOAST: "Ticket reopened.",
} as const;

export const TICKET_STATUS_MODAL_TEXT = {
  CANCEL: "Cancel",
} as const;

/** Agent/admin-only controls on the ticket detail page (Step 9.6.2) --
 * assignment (claim/reassign) and agent-driven status transitions. Hidden
 * entirely from a CUSTOMER viewer. */
export const TICKET_AGENT_CONTROLS_TEXT = {
  HEADING: "Agent controls",
  UNASSIGNED: "Unassigned",
  ASSIGNED_TO_YOU: "Assigned to you",
  ASSIGNED_TO_OTHER: "Assigned to another agent",
  CLAIM_BUTTON: "Claim ticket",
  REASSIGN_TO_ME_BUTTON: "Reassign to me",
  ASSIGN_SUCCESS_TOAST: "Ticket assigned.",
  STATUS_LABEL: "Move to",
  REASON_LABEL: "Reason for closing",
  REASON_PLACEHOLDER: "Why is this ticket being closed?",
  REOPEN_REASON_LABEL: "Reason for reopening",
  REOPEN_REASON_PLACEHOLDER: "Why is this ticket being reopened?",
  UPDATE_STATUS_BUTTON: "Update status",
  STATUS_SUCCESS_TOAST: "Status updated.",
} as const;

export const MESSAGE_COMPOSER_TEXT = {
  FIELD_LABEL: "Add a message",
  PLACEHOLDER: "Share an update or ask a question…",
  SUBMIT: "Send message",
  CLOSED_NOTICE: "This ticket is closed. Reopen it above to add a new message.",
  charactersHint: (length: number, max: number) =>
    `${length}/${max} characters`,
  rateLimitedMessage: (countdown: string) =>
    `You're sending messages too quickly. Try again in ${countdown}.`,
} as const;

export const MESSAGE_ITEM_TEXT = {
  AI_SENDER_LABEL: "AI Assistant",
  YOU_SENDER_LABEL: "You",
  SUPPORT_SENDER_LABEL: "Support",
  AI_BADGE: "AI",
} as const;

export const MESSAGE_THREAD_TEXT = {
  LOADING: "Loading messages",
  EMPTY: "No messages yet. Add one below.",
} as const;
