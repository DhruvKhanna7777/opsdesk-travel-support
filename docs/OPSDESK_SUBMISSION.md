# OpsDesk demo and submission

## Hosted synthetic demo (12 November 2026)

- URL: [opsdesk-synthetic-demo.vercel.app](https://opsdesk-synthetic-demo.vercel.app/). Anyone with the link can open it. Use a seeded role and the password in the [hosted walkthrough](OPSDESK_HOSTED_WALKTHROUGH.md). All data is synthetic. Vercel Authentication was disabled at the user's request; the Render API gate remains enabled.
- Source: deployment commit `94e61f57bb27f63d4787d1b47ce2ef235c092127` on `main` in the [owned repository](https://github.com/KrishChadha001/opsdesk-travel-support), following transfer from Dhruv. [Post-merge CI for the initial hosted demo](https://github.com/KrishChadha001/opsdesk-travel-support/actions/runs/43266598103) passed.
- Hosting: Vercel Hobby frontend (`opsdesk-synthetic-demo`, `iad1` deployment region) connected directly to the owned repository; Render free API, PostgreSQL 18 and Key Value in Singapore under [the paused Blueprint](https://dashboard.render.com/blueprint/exs-dbqv1q4ipgvc73cso96g). The API has automatic deploys disabled. This is separate from production.
- Configuration: HTTPS frontend origin and server-only API URL; matching generated gate secrets in Vercel and Render environment settings; Render-generated JWT and attachment secrets; internal database and Key Value connections with no external IP allowlist. Secrets are absent from Git. Live booking, email and AI providers are disabled; the database contains synthetic seed data.
- Observed: the public web URL, API and worker health returned HTTP 200; direct case API access without the gate returned HTTP 401. All five roles signed in. Manager, Asia agent, Atlas agency, Maya and Aster showed role-scoped views. The manager and supplier exchanged synthetic messages; the agency/traveler views hid supplier and staff-only content. The Asia agent escalated `OPS-1042`, the manager acknowledged its alert, Insights linked a weekly theme, and manager/agency exports contained 60/22 case rows respectively. See the [step-by-step hosted walkthrough and screenshots](OPSDESK_HOSTED_WALKTHROUGH.md).
- Remaining acceptance work: exact hosted cross-agency denial, session revocation, duplicate EM retry, reset rehearsal and a video recording were not completed. Local and CI checks described below do not replace those hosted checks.
- Cost: current services use $0 Hobby/free tiers, subject to usage limits. Render free PostgreSQL expires after 30 days and has no managed backups; free Key Value is memory-only and loses data on restart. The shared Render workspace also has an unrelated free web service, so free compute hours are shared. Reset by provisioning a new isolated database and Key Value instance, applying the same merged commit and synthetic seed, switching the demo service to them, and rechecking health before retiring the old resources; do not use the inherited generic reset endpoint. This reset procedure remains untested on the hosted deployment.

Production deployment remains paused. This hosted demo is disposable and does not establish production readiness.

To run a separate local synthetic copy, start from a fresh clone with Node.js 22.23.x:

```sh
npm ci
npm run ops:preview
```

Open `http://127.0.0.1:3000` and sign in as `manager@opsdesk.demo` with the password in the [demo account guide](../OPSDESK_README.md#demo-accounts). The first launch creates local secrets, initializes PostgreSQL, applies migrations and seeds 60 cases. It can take longer than later starts. Wait for both `/health/ready` and `/health/worker` to return 200 before testing.

## Reset and verification

Use a **new disposable clone** to reset the demo. The launcher intentionally preserves an existing `.opsdesk/postgres` database, so restarting the app does not reset records. Do not run the inherited generic reset endpoint; it refuses travel profiles. Keep any existing checkout or local database until its owner has explicitly decided whether to retain it.

The Linux validation workflow starts from a fresh GitHub checkout with Node 22.23.x and an isolated PostgreSQL 18 service. It applies migrations, seeds synthetic data and runs recovery, API, load, Chromium, Firefox and production dependency checks. [TBO integration run](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43251910212) and [merged TBO main run](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43255006203) passed all of those steps. The local fresh checkout passed `npm ci` under the host's Node 24; application and focused checks ran under Node 22.23.0.

After extending the readiness window to 60 seconds, a reset local workspace with new secrets and an empty embedded PostgreSQL directory started successfully. All 29 migrations applied, the seed created 3 agencies, 20 customers, 30 bookings, 60 cases, 4 agents, 1 manager and 5 suppliers, and web/API/worker readiness returned HTTP 200. The fresh database passed the Iteration 1 smoke (47 HTTP checks), TBO smoke (39 HTTP checks) and the five-role Chromium browser journey. Local Firefox could not launch on this Windows host (`spawn UNKNOWN`); the fresh Linux CI Firefox step passed. The local `npm ci` was not a Node 22 install, so the hosted workflow is the Node 22 fresh-install evidence.

## Demo journeys

The TBO Zendesk brief defines journeys A–E. Use the hosted walkthrough to inspect the saved example. Use an isolated synthetic workspace to run the creation, reassignment, and escalation steps below.

| Journey | Show | Observable check |
| --- | --- | --- |
| A. Intake and booking context | Create a refund case for `BK-1043` and review the suggested intent before submitting. | The new case shows both earlier cases for the booking and the saved intent. |
| B. Routing and ownership | Create a case on the isolated seed, then open **Activity** and inspect the routing reason and owner. | The recorded assignment explains regional eligibility and availability. |
| C. Supplier conversation and transfer | Open a supplier thread, record its recipients, reassign the case as manager, and reopen the thread. | The recipient list stays the same after transfer and the requester cannot see the exchange. |
| D. EM escalation | On the isolated seed, advance the clock until a cancellation case reaches six hours before its controlling LCD. Open **Activity**, then use **Escalate to EM** with a reason. Manager filters **Needs attention** to EM escalations and acknowledges the notification. | The cutoff raises the case to Urgent before it passes. The EM alert appears in the queue and leaves it after acknowledgment. |
| E. Insights and export | Filter the queue by intent, open a weekly theme example, then use **Export all**. | Filtered, role-scoped rows extend beyond the visible page. |

The [TBO workflow](OPSDESK_TBO_WORKFLOW.md) and [Iteration 1 workflow](OPSDESK_ITERATION_ONE.md) give the exact role and data boundaries. The browser and HTTP suites automate parts of each path. A hosted browser walkthrough is recorded as written observations and screenshots above; a video remains to be captured.

## 3-5 minute walkthrough script

| Time | Narration and action |
| --- | --- |
| 0:00-0:35 | On the isolated seed, sign in as manager and enter a refund complaint for `BK-1043`. Review the suggested intent and create the case. |
| 0:35-1:15 | Show TBOH and the two earlier cases. Open **Activity** and show the routing reason and resulting owner. |
| 1:15-2:00 | Open a seeded supplier thread, show its recipients, reassign the case, then reopen the recipient list and compare it. |
| 2:00-2:45 | Return as staff. Escalate to EM with a reason; open the manager's EM queue and acknowledge the notification. Point to the activity record and unchanged case owner/deadline. |
| 2:45-3:30 | Filter by intent, open Insights and a linked weekly theme example, then export all matching cases. Explain agency scope and streamed rows beyond one page. |
| 3:30-4:10 | Switch to Maya or the agency account and show the requester-visible conversation. Close by explaining that the hosted demo uses synthetic data and production rollout remains paused. |

Record this on a reset synthetic clone. Do not advance the demo clock on a shared workspace. A screen recording has not been produced in this increment.

## Architecture and cost comparison

```text
Browser (Next.js) -> /api/backend proxy -> NestJS /ops routes
                                      -> PostgreSQL (cases, sessions, audit, mail outbox)
                                      -> optional Redis in production
```

The local demo runs Next.js, NestJS and embedded PostgreSQL on one machine. It uses records-based summaries and keyword suggestions; no LLM, booking provider or outbound email fee is required. The optional mail pilot remains disabled by default. A live deployment would need managed database and Redis, HTTPS hosting, secrets, mail, monitoring, backups and the owner approvals listed in the [handoff](OPSDESK_HANDOFF.md). No provider or workload has been approved, so a hosted OpsDesk monthly estimate is not yet defensible.

| Option | Published or known cost basis | What the comparison includes |
| --- | --- | --- |
| Local OpsDesk demo | No paid API or hosted service is required; machine, electricity and staff time are excluded. | Synthetic workflow demonstration only. |
| Hosted OpsDesk | Application compute, PostgreSQL, Redis, storage, mail, monitoring and support labor must be quoted for a chosen workload and region. | Custom TBO workflow and operational ownership; no production price claim. |
| Zendesk Support Team | [Zendesk lists $19 per agent/month, paid yearly](https://www.zendesk.com/pricing/), as viewed 12 Nov 2026. Five agent seats would be $95/month before add-ons and taxes. | Vendor ticketing baseline, not a feature-equivalent TBO implementation or a migration quote. |
| Zendesk Suite Team | [Zendesk lists $55 per agent/month, paid yearly](https://www.zendesk.com/pricing/), as viewed 12 Nov 2026. Five agent seats would be $275/month before add-ons and taxes. | Broader vendor support channels; custom integration and data migration are separate. |

## Evidence and open decisions

- [Synthetic case screenshot](assets/tbo-case-evidence.png) from the fresh local preview.
- [Linux TBO integration CI](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43251910212): fresh setup, API, recovery, load, Chromium, Firefox and audit passed.
- [Local TBO/API and browser detail](OPSDESK_VALIDATION.md#tbo-workflow).
- A recorded A-E walkthrough and acceptance against any separate A-E brief remain open. The five paths above are the repository's mapping, not definitions supplied by the finish plan.
- Live retention approval, external workspace compatibility, live booking/mail, scanner monitoring and authorized staging recovery remain open. Deployment stays paused.
