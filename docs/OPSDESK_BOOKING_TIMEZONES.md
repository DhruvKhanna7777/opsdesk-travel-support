# Booking time display

Check-in and cancellation-cutoff displays use the booking's saved IANA timezone. The booking directory, traveler booking cards, case context, cancellation form and creation-request review show a formatted time with that zone. UTC schedule-entry fields remain explicitly labelled UTC. Other timestamps continue to use the viewer's local time.

The directory previously formatted check-in in the browser's timezone and printed the booking's timezone below it. A reviewer in India could therefore read a time 2.5 hours earlier than the same booking's Asia/Makassar case context. The shared date formatter now accepts an optional timezone, and booking screens supply the stored zone.

## Regression checks

`node scripts/booking-timezone-browser.mjs` uses an isolated local synthetic database and removes its own fixtures. It checks the directory, case context, traveler cards and cancellation LCD under Asia/Kolkata and America/Los_Angeles browser timezones. America/New_York winter and summer fixtures verify daylight-saving conversion. The test reproduced the directory mismatch before the fix and passed in Chromium and Firefox afterward.

The existing booking-request browser test also checks a pending proposal's localized check-in and then runs the timezone suite, so both CI browser engines cover it through `ops:test:browser`. No database records, deadline calculations or stored UTC values are changed by the display fix. Hosted deployment verification remains pending.
