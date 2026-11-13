CREATE TABLE "TravelTicketIntake" (
    "submitterId" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelTicketIntake_pkey" PRIMARY KEY ("submitterId", "requestId")
);

CREATE UNIQUE INDEX "TravelTicketIntake_ticketId_key" ON "TravelTicketIntake"("ticketId");

ALTER TABLE "TravelTicketIntake" ADD CONSTRAINT "TravelTicketIntake_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "TravelTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
