# Safe retries for ticket intake

Each open New ticket form generates a UUID on its first submission and reuses it for retries. If the server saves the case but its response is lost, submitting the original details again opens the same saved case. A deliberately new form gets a fresh ID, so separate complaints with identical wording remain separate cases.

The API accepts an optional UUIDv4 `requestId` on `POST /ops/tickets`. It stores a normalized payload fingerprint and the resulting case ID in `TravelTicketIntake`, scoped to the authenticated submitter. The existing routing lock and database composite primary key serialize concurrent retries. The request record, case, first message and audit events commit in one transaction. A replay checks current workspace access and returns the existing case without rewriting its deadline, status or audit. Different details with a saved key return HTTP 409, including when the form is edited after a lost response. Validation failures before a successful save do not reserve the key.

Normalization trims subject/description, normalizes the booking reference, and includes effective agency/traveler identity, explicit intent, priority and contract selection. One user's key cannot replay another user's case. Metadata is retained with its case and removed by the case foreign-key cascade; it is not exposed in case responses.

## Compatibility and deployment

Apply migration `20261113100000_ticket_intake_idempotency` before starting the updated API; the local launcher applies it automatically. Existing cases remain valid without intake metadata. Existing API clients that omit `requestId` retain their previous create-every-call behavior; clients needing safe retries must keep and resend a key. The UI always supplies one. Closing the form or reloading the page starts a new form; this increment does not add persisted draft recovery.

## Verification

`node scripts/ticket-intake-retry-smoke.mjs` checks concurrent identical submissions, conflicting concurrent payloads, normalized retries, invalid IDs, per-actor isolation, access denial after a regional handoff, validation correction, fresh-service/database-client replay, closed-case replay, one initial message/creation/routing event, legacy compatibility and metadata cleanup. The standard HTTP smoke runs it after existing fixtures are cleaned.

`node scripts/ticket-intake-retry-browser.mjs` commits a request and deliberately drops the response. It verifies the same key is retained through a changed-details conflict and successful original-details retry, then proves a fresh form creates a separate complaint. The agency browser sequence includes it for both CI engines. Tests use only isolated local synthetic data and remove their own records. The original duplicate was reproduced before the fix; Chromium and Firefox passed against the production frontend afterward.
