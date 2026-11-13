# Case navigation and browser history

Opening a case now adds a browser-history entry instead of replacing the inbox entry. Browser Back returns to the previous list or case, and Forward reopens the selected case. Selecting the same location does not add a duplicate entry.

The URL retains the workspace view as well as the case ID. A case opened from Bookings therefore still offers **Back to bookings** after refresh. Existing `?case=...` links continue to open in the inbox context; unknown view values fall back to the inbox. Sign-out replaces the current location with the inbox URL. API authorization still governs every case read.

Opening an existing case preserves the current in-memory filters when returning from it. Creating a new case explicitly resets the inbox filters and selects the new case in a single navigation action, so the URL and visible return destination agree and stale source-view filters cannot hide the case. Search/filter/page state is not serialized into shareable links or preserved through a full reload.

## Verification - 13 November 2026

`node scripts/case-history-browser.mjs` reproduced browser Back leaving the app for `about:blank` before the fix. After the fix, Chromium and Firefox passed inbox Back/Forward, related-case history, booking return context after refresh, in-app return, duplicate-location prevention and unknown-view fallback. The history segment reads existing synthetic cases; its appended intake segment creates and removes only its own temporary cases.

The existing five-role browser workflow runs this regression after its temporary fixtures are cleaned, so both CI browser engines cover it. Hosted release verification remains pending after merge and deployment.

`node scripts/intake-return-browser.mjs` extends that sequence with ticket creation from Bookings, Insights, Needs attention and a filtered inbox. It checks the created-case URL, native Back/Forward, return label across refresh and searchability from the cleared inbox, then removes only its own synthetic cases.
