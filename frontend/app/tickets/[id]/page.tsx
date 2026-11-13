import { SupportPage } from "@/components/layout/support-page";
import type { Metadata } from "next";
import { TicketDetailView } from "./_components/ticket-detail-view";
import { TICKET_DETAIL_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: TICKET_DETAIL_TEXT.META_TITLE,
};

// Next 16: dynamic route `params` is a Promise, must be awaited before use
// (a real breaking change from older Next knowledge, same one already
// noted for proxy.ts/middleware.ts in Step 5.3's architecture notes).
interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  return (
    <SupportPage>
      <TicketDetailView ticketId={id} />
    </SupportPage>
  );
}
