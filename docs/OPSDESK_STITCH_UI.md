# Stitch UI reference

13 November 2026. This increment targets `KrishChadha001/opsdesk-travel-support`, from main `3e05c84f2aa3fac89fef2c57edca0ec7413eb601` (PR #90). The user supplied [Stitch project 17554885696707810205](https://stitch.google.com/projects/17554885696707810205) and requested its appearance on the app’s existing elements.

## Reference and implementation

The exported project contains Homepage, Demo Sign-in, Support Inbox and Ticket Detail desktop frames, plus an Editorial Travel design system. There are no completed mobile, booking, Insights or account frames in that export. The generated HTML uses **Newsreader and Inter**; these actual exported fonts take precedence over the earlier prompt mentioning Instrument Serif. The fonts are served locally, with their SIL Open Font Licences included under `frontend/public/fonts`.

The demo sign-in uses the reference’s 7:5 split, numbered role cards, selected-role indicator, serif title, peach case preview, 24px case corners and rounded primary action. Existing editable credentials, five server-authenticated accounts, pending/error states and account sign-in remain available. The workspace uses the reference’s warm surfaces, 256px desktop navigation rail, full-width masthead, 24px gutters, 40px page headings, compact filter buttons, table typography, priority highlighting, conversation panels and booking inspector. Shared tokens also apply to existing booking, Insights, account and management screens. Dark mode, narrow-screen layouts, focus indicators and reduced-motion behavior remain supported.

This is a React/CSS adaptation to the existing product, not an embedded static prototype. Backend data and authorization remain authoritative. Unsupported sample claims (live Amadeus/Sabre, WhatsApp, flight telemetry, supplier counts and performance statistics) and nonfunctional prototype controls are not introduced. No database, API, dependency, deployment or live-integration changes are included. The repository starts at the demo sign-in; the separate marketing homepage in Stitch is not substituted for that route.

## Review

Compare the available desktop references at 1440px, then check the existing app at 390px and the automated reflow widths. Additional controls needed for the existing app remain visible even where the static reference omits them. Exact pixel equivalence for different record content and screens without supplied frames is not claimed. Check the dated validation entry for actual runs and limitations.

Deployment remains paused. Merge decisions belong to collaborators.
