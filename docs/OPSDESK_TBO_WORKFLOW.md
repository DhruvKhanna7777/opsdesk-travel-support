# TBO case workflow

Booking reference (TBOH) labels the existing verified booking reference in intake, booking requests, the directory and case context. Cancellation cutoff (LCD) labels the existing cutoff in case context and the UTC schedule editor. The display still uses the saved booking timezone where applicable. These terms describe the stored fields in the synthetic demo. Live provider acceptance remains pending.

## Intent and manager escalation

Use **Filter intent** in the case queue to filter by the saved issue category. It combines with the current status, scope and other filters. **Export all** applies the same filter.

Scoped agents and managers can open an active case, choose **Escalate to EM**, and enter a reason. The action records the actor, prior priority and reason, sets the priority to Urgent and uses the existing manager coverage policy. Case assignment, status, booking, SLA snapshot and due dates stay in place. If coverage is unavailable, the alert stays outstanding for manager review.

The **EM escalations** filter in **Needs attention** shows active cases with an unacknowledged EM alert. Managers can acknowledge the alert from **Notifications**. Acknowledgment removes the case from the EM filter and preserves the alert in staff activity. The same request can be retried without a second event. A different request for the same case can be submitted after acknowledgment. The reason is staff-visible. Requesters and suppliers retain their existing scoped views.

## Ticket retention policy for the prototype

Resolved and closed tickets remain in PostgreSQL with their messages, supplier thread links and audit history. Closing a case records the outcome and retains the record for authorized history and reopening. The app has no scheduled ticket expiry. The demo uses synthetic data, and resetting a disposable demo is the cleanup mechanism.

Attachments follow the separate [attachment expiry policy](OPSDESK_ATTACHMENTS.md). Database backups and downloaded CSVs can retain data beyond an attachment's application expiry. Before live data is authorized, the owner must approve retention periods for cases, messages, audit events, backups and exports, name the deletion and legal-hold owners, and verify deletion and restore procedures in authorized staging. No live retention period is approved here.

## Verification

Run `node scripts/tbo-workflow-smoke.mjs` on the isolated synthetic preview, or run the sequential `npm run ops:test` suite. The browser journey in `npm run ops:test:browser` covers the terminology, intent filter, escalation and acknowledgment.
