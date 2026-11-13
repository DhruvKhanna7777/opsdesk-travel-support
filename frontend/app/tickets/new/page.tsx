import { SupportPage } from "@/components/layout/support-page";
import type { Metadata } from "next";
import { NewTicketView } from "./_components/new-ticket-view";
import { NEW_TICKET_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: NEW_TICKET_TEXT.META_TITLE,
};

export default function NewTicketPage() {
  return (
    <SupportPage>
      <NewTicketView />
    </SupportPage>
  );
}
