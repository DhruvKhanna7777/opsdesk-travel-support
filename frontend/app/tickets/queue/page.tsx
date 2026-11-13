import { SupportPage } from "@/components/layout/support-page";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { TicketQueueView } from "./_components/ticket-queue-view";
import { TICKET_QUEUE_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: TICKET_QUEUE_TEXT.META_TITLE,
};

export default function TicketQueuePage() {
  return (
    <SupportPage>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner label={TICKET_QUEUE_TEXT.LOADING} />
          </div>
        }
      >
        <TicketQueueView />
      </Suspense>
    </SupportPage>
  );
}
