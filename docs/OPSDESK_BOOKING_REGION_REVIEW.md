# Reviewing a booking in a different region

An unverified case initially uses the traveler's default region. Previously the verification lookup required that provisional region to match the booking, so even a manager could not link a valid overseas trip for the same agency and traveler.

Managers can now verify an unlinked case against its exact booking reference across regions. The agency and traveler must still match. Existing linked cases cannot be moved to another region through this path, and regional agents cannot perform a cross-region correction.

Verification updates the region and travel deadline atomically, preserves the response-policy clock, and records the region/ownership change. An eligible global owner may retain the case; otherwise active cases use the existing region, specialty, duty, availability, workload and capacity rules. No eligible destination agent leaves the case unassigned. Explicit assignment is validated against the destination region, including when the requested owner was already assigned. Outstanding escalation coverage is refreshed using the new region.

## Verification

`node scripts/booking-verification-region-smoke.mjs` runs only against an isolated local synthetic workspace. It creates and removes its own cases/booking and restores changed agent settings. The regression reproduced the original manager rejection and checks manager correction, regional/customer denial, wrong-traveler/agency denial, transaction rollback, old/new team visibility, audit, unchanged response deadline, booking cutoff, explicit ownership, existing escalation and unavailable/full-capacity fallback.

The standard HTTP smoke runs this regression after cleaning its original fixtures. No database migration is needed. Hosted verification remains pending after review, merge and deployment.
