ALTER TABLE "TravelConversation" ADD COLUMN "recipientsConfigured" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TravelConversationRecipient" (
  "conversationId" TEXT NOT NULL REFERENCES "TravelConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('USER', 'EMAIL')),
  "target" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('TO', 'CC')),
  PRIMARY KEY ("conversationId", "kind", "target")
);

CREATE TABLE "TravelTicketTheme" (
  "ticketId" TEXT NOT NULL REFERENCES "TravelTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "theme" TEXT NOT NULL CHECK ("theme" IN ('REFUND', 'CANCELLATION', 'BOOKING_CHANGE', 'CHECK_IN', 'BAGGAGE', 'SUPPLIER_FOLLOW_UP')),
  PRIMARY KEY ("ticketId", "theme")
);
