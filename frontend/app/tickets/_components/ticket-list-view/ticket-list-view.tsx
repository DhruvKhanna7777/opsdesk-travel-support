"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_ORDER,
  DEFAULT_TICKET_SORT_BY,
  SORT_ORDERS,
  TICKET_SORTABLE_FIELDS,
  type SortOrder,
  type TicketSortableField,
} from "@helpdesk/shared";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useProfile } from "@/lib/queries/use-profile";
import { useTickets } from "@/lib/queries/use-tickets";
import { useAiAssistant } from "@/lib/context/ai-assistant-context";
import { cn } from "@/lib/utils";
import { TICKET_LIST_TEXT } from "@/lib/constants/text/tickets.text";
import { ROUTES } from "@/lib/constants/routes.constants";
import { TicketRow } from "../ticket-row";
import { TicketPagination } from "../ticket-pagination";
import { TicketSortControls } from "../ticket-sort-controls";

/**
 * Button (components/ui/button) always renders a native <button> -- there's
 * no asChild/slot support for wrapping a Next <Link> and getting an <a>
 * out the other end. These two spots need a real link (so ⌘-click/middle-
 * click/"open in new tab" work), so they mirror Button's primary/secondary
 * classes directly rather than nesting a button inside an anchor.
 */
const LINK_BUTTON_CLASSES = {
  primary:
    "inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors bg-action text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-done",
  secondary:
    "inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors bg-surface-raised text-text border border-border-strong hover:border-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-secondary",
};

const SORTABLE_FIELD_SET = new Set<string>(TICKET_SORTABLE_FIELDS);
const SORT_ORDER_SET = new Set<string>(SORT_ORDERS);

/**
 * page/sortBy/sortOrder all live in the URL (?page=&sortBy=&sortOrder=),
 * same reasoning as the account page's ?tab= -- a specific page/sort is
 * linkable and survives a refresh, and the query key useTickets builds
 * from these params is what actually drives caching, not local state.
 */
function readQueryParams(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawSortBy = searchParams.get("sortBy");
  const sortBy: TicketSortableField = SORTABLE_FIELD_SET.has(rawSortBy ?? "")
    ? (rawSortBy as TicketSortableField)
    : DEFAULT_TICKET_SORT_BY;

  const rawSortOrder = searchParams.get("sortOrder");
  const sortOrder: SortOrder = SORT_ORDER_SET.has(rawSortOrder ?? "")
    ? (rawSortOrder as SortOrder)
    : DEFAULT_SORT_ORDER;

  return { page, sortBy, sortOrder };
}

export function TicketListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { open: openAiAssistant } = useAiAssistant();
  const { page, sortBy, sortOrder } = readQueryParams(searchParams);
  // Not currently exposed as a user-facing control (no page-size picker),
  // so this stays a plain constant rather than a URL param like page/sortBy
  // -- but it's pinned to the shared default so it can't drift from what
  // the backend DTO falls back to when a request omits `limit` entirely.
  const limit = DEFAULT_LIMIT;

  const updateParams = (updates: Record<string, string>, resetPage = false) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value);
    }
    if (resetPage) params.set("page", String(DEFAULT_PAGE));
    router.replace(`/tickets?${params.toString()}`, { scroll: false });
  };

  // Same client-side role check as TicketQueueView, just the opposite
  // direction -- this page is for a customer's own tickets, which isn't a
  // thing for an AGENT/ADMIN account (Step 9.6.3; POST /tickets is now
  // also CUSTOMER-only server-side, so this is UX, not the real boundary).
  const canViewList = !(profile?.role === "AGENT" || profile?.role === "ADMIN");

  const ticketsQuery = useTickets({ page, limit, sortBy, sortOrder }, { enabled: canViewList });

  if (isProfileLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={TICKET_LIST_TEXT.LOADING} />
      </div>
    );
  }

  if (!canViewList) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-text-secondary">{TICKET_LIST_TEXT.NOT_AVAILABLE}</p>
        <Link href={ROUTES.TICKET_QUEUE} className="text-sm font-medium text-accent-done hover:underline">
          {TICKET_LIST_TEXT.GO_TO_QUEUE}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">{TICKET_LIST_TEXT.HEADING}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {TICKET_LIST_TEXT.SUBHEADING}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <Link href={ROUTES.NEW_TICKET} className={cn(LINK_BUTTON_CLASSES.primary, "shrink-0")}>
            {TICKET_LIST_TEXT.NEW_TICKET_LINK}
          </Link>
          <button
            type="button"
            onClick={openAiAssistant}
            className="cursor-pointer px-1 py-1 text-xs font-medium text-text-secondary hover:text-text hover:underline"
          >
            {TICKET_LIST_TEXT.AI_CHAT_LINK}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <TicketSortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByChange={(nextSortBy) => updateParams({ sortBy: nextSortBy }, true)}
          onSortOrderChange={(nextSortOrder) => updateParams({ sortOrder: nextSortOrder }, true)}
        />
      </div>

      <Card>
        {ticketsQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label={TICKET_LIST_TEXT.LOADING} />
          </div>
        ) : ticketsQuery.isError ? (
          <Alert tone="danger">{ticketsQuery.error.message}</Alert>
        ) : !ticketsQuery.data ? null : ticketsQuery.data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-text-secondary">
              {page > DEFAULT_PAGE
                ? TICKET_LIST_TEXT.NO_RESULTS_ON_PAGE
                : TICKET_LIST_TEXT.NO_TICKETS_YET}
            </p>
            {page === DEFAULT_PAGE && (
              <Link href={ROUTES.NEW_TICKET} className={LINK_BUTTON_CLASSES.secondary}>
                {TICKET_LIST_TEXT.FILE_FIRST_TICKET}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {ticketsQuery.data.data.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>

            <TicketPagination
              page={ticketsQuery.data.page}
              totalPages={ticketsQuery.data.totalPages}
              total={ticketsQuery.data.total}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
