# Hosted OpsDesk demo: reviewer walkthrough

Open **https://opsdesk-synthetic-demo.vercel.app/**. Anyone with the link can open the site. The login screen has role buttons that fill the corresponding demo email and password. All accounts below use **`OpsDeskDemo!2026`**. These credentials and all records are synthetic; do not enter real customer, booking, supplier or payment information.

| Choose on login | Email | What the account can see |
| --- | --- | --- |
| Manager | `manager@opsdesk.demo` | All 60 seeded cases, bookings, Insights and manager controls |
| Asia agent | `asia@opsdesk.demo` | Asia support queue and staff case controls |
| Agency | `agency@opsdesk.demo` | Atlas Travel cases and bookings |
| Traveler | `maya@opsdesk.demo` | Maya Sen's cases and bookings |
| Supplier | `supplier@opsdesk.demo` | Aster Hotels threads explicitly shared with that supplier |

Additional synthetic logins are listed in [the account guide](../OPSDESK_README.md#demo-accounts). Sign out between roles. The website is public, but the Render API still requires a server-only demo gate; registration is disabled in hosted-demo mode. No real booking, email or external AI provider is enabled.

## Five mapped journeys

These A–E labels are a provisional mapping from [the submission guide](OPSDESK_SUBMISSION.md), because the two-iteration brief did not define their steps.

1. **A · Intake and booking context.** Sign in as Manager. Open **All conversations**, search `OPS-1042`, then open **Hotel voucher not recognized at check-in**. Read the saved brief, verified TBOH booking `BK-1042`, Bali check-in, cancellation cutoff, earlier case `OPS-1072`, and customer conversation.
2. **B · Supplier coordination.** In `OPS-1042`, open **Supplier threads** and **Contact supplier**. The manager sent a synthetic voucher question to Aster Hotels. Sign out and choose **Supplier**; its desk shows that shared thread and the supplier reply. Sign in as Agency or Traveler to see that the supplier thread and staff-only handover note are absent from their case view.
3. **C · Ownership and deadlines.** In the manager or Asia agent view of `OPS-1042`, read owner **Riya Sharma**, priority, case deadline, booking check-in and LCD. **Activity** shows saved changes. The **Demo clock** is manager-only and changes shared workspace time; do not advance it during a shared review.
4. **D · EM escalation.** The Asia agent used **Escalate to EM** with a synthetic reason. The case became **Urgent**, retained Riya as owner and retained its deadline. **Activity** recorded the escalation. The Manager saw it under **Needs attention → EM escalations**, then acknowledged its notification; that filtered queue cleared. The demo case remains escalated in the shared workspace.
5. **E · Insights and export.** As Manager, filter **All conversations** by intent, then open **Insights → Top themes this week** and its linked `OPS-1042` example. Return to **All conversations → All cases → Export all**. The hosted CSV contained 60 case rows plus a header while the queue displayed 20 rows per page. The Atlas agency's **All cases → Export all** contained 22 rows plus a header while its queue displayed 20 rows per page.

## Hosted observations and evidence

On 12 November 2026, Vercel served the public URL with HTTP 200; Render `/health/ready` and `/health/worker` returned HTTP 200. A direct Render case request without the demo gate returned HTTP 401. The five demo roles signed in through the web UI. The manager saw 60 cases; the Asia agent and Atlas agency each saw 22 scoped cases; Maya saw 4; Aster saw its single shared thread. Agency and traveler views of `OPS-1042` omitted the internal note and supplier conversation. The manager/supplier exchange, EM escalation and acknowledgement, Insights theme link, and manager/agency CSV row counts were observed. The [post-merge main CI run](https://github.com/KrishChadha001/opsdesk-travel-support/actions/runs/43266598103) passed. After transfer, Vercel and Render were connected to the owned repository at `94e61f5`; web and API/worker health returned HTTP 200, and an ungated API case request returned HTTP 401.

Screenshots: [manager queue](assets/hosted-manager-queue.jpg), [booking context](assets/hosted-booking-context.jpg), [supplier question](assets/hosted-supplier-thread.jpg), [supplier reply](assets/hosted-supplier-reply.jpg), [agency scope](assets/hosted-agency-scope.jpg), [traveler scope](assets/hosted-traveler-scope.jpg), [EM audit](assets/hosted-em-audit.jpg), and [Insights](assets/hosted-insights.jpg).

The browser walkthrough stopped at the user's request. There is no video recording or hosted reset rehearsal. Exact cross-agency denial, session revocation and duplicate EM retry were covered by local/CI checks, not repeated against this hosted deployment. Do not describe those hosted checks as passed.

## Reset and operations

This is a disposable free-tier deployment. Render PostgreSQL expires after 30 days and free Key Value can lose data on restart. The seed is additive, so restarting the service does **not** restore the original 60 cases. To reset, provision a fresh isolated database and Key Value instance, apply the same merged commit and migrations, seed synthetic data, repoint the demo API, then recheck web/API/worker health and role scopes before retiring old resources. The inherited generic reset endpoint must not be used. This hosted reset procedure has not been rehearsed.

Source/configuration: [deployment record](OPSDESK_SUBMISSION.md#hosted-synthetic-demo-12-november-2026) and [hosted runbook](OPSDESK_HOSTED_DEMO.md). The frontend uses Vercel Hobby; the API, PostgreSQL and Key Value use Render free plans. Current plan price is $0 subject to provider limits. Production deployment remains paused.

## Copy/paste prompt for a reviewer

> Open https://opsdesk-synthetic-demo.vercel.app/ and use the synthetic demo accounts in `docs/OPSDESK_HOSTED_WALKTHROUGH.md` to give me a concise tour of journeys A–E. Show booking `BK-1042`, case `OPS-1042`, the supplier thread, owner and deadline, the existing EM audit, Insights and the scoped export. Explain what Manager, Asia agent, Atlas agency, Maya and Aster can see. Use read-only actions on the shared hosted workspace: do not send messages, escalate again, advance the demo clock, reset data, add real customer information, or enable live providers. Distinguish the hosted checks already observed from anything you newly verify, and list remaining gaps.
