# Agency intake without a listed booking

Agencies can choose **Booking is not listed**, select an active traveler in their own agency, and enter an optional booking reference. The existing API saves the complaint and original message, leaves unmatched booking links empty, and records unknown references for manual review. Staff can verify the booking later. A known booking still supplies its saved agency and traveler identity.

The traveler selector uses the existing agency-scoped active-customer directory. The API derives the agency from the authenticated profile and rejects a traveler from another agency. No schema or authorization changes are needed.

## Verification - 13 November 2026

`node scripts/agency-intake-browser.mjs` reproduced the required-booking failure before the fix. After the fix, Chromium and Firefox passed unknown-reference and omitted-reference creation, persistence after refresh, traveler scope, required traveler selection, verified/unlisted booking switching and cross-agency traveler rejection. A direct foreign-agency directory request returned 403. The standard five-role Chromium browser flow and 143 HTTP workflow checks passed. Frontend TypeScript and changed-component ESLint passed.

The focused regression is included in `ops:test:browser` for both CI browser engines. Use an isolated local seeded database; the test deletes only its own temporary cases. Hosted deployment acceptance remains separate.
