import { SupportPage } from "@/components/layout/support-page";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { TicketListView } from "./_components/ticket-list-view";
import { TICKET_LIST_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: TICKET_LIST_TEXT.META_TITLE,
};

export default function TicketsPage() {
  return (
    <SupportPage>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner label={TICKET_LIST_TEXT.LOADING} />
          </div>
        }
      >
        <TicketListView />
      </Suspense>
    </SupportPage>
  );
}
