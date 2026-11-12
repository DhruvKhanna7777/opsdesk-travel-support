# OpsDesk: hosted demo and submission handoff

**Checkpoint: 12 November 2026.** Repository: `DhruvKhanna7777/opsdesk-travel-support`. Main is `4a03781` after PRs #72, #74, #75 and #76. The two-iteration finish plan's feature items 1-4 are implemented and merged: editable supplier recipients, case themes and linked Insights, full filtered CSV export, TBOH/LCD labels, saved-intent filtering, and audited EM escalation with manager acknowledgment. See the [Iteration 1 guide](OPSDESK_ITERATION_ONE.md), [TBO guide](OPSDESK_TBO_WORKFLOW.md), and [demo/submission guide](OPSDESK_SUBMISSION.md).

PR #74 and its post-merge Linux workflow passed API, recovery, load, Chromium, Firefox and production dependency checks. PRs #75 and #76 passed their hosted workflows. Check the final post-#76 [main workflow](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43258615901) before describing it as passed. A fresh local embedded database with new secrets applied all 29 migrations, seeded the expected synthetic records, and returned 200 from web, API readiness and worker readiness. Iteration 1 passed 47 HTTP checks, TBO passed 39, and the five-role Chromium journey passed. Local Firefox failed to launch on Windows (`spawn UNKNOWN`); hosted Linux Firefox passed. A synthetic [case screenshot](assets/tbo-case-evidence.png) and a timed walkthrough script are saved. No hosted OpsDesk instance or walkthrough video exists yet.

The user wants the remaining submission work performed from a deployed demo where possible. Their deployment plugins are connected in another Codex account. **Use an isolated synthetic staging/demo environment first.** Production and live data remain paused. The current repository has no selected OpsDesk hosting target or approved live retention policy. The inherited release infrastructure belongs to the upstream IT Helpdesk and is not an OpsDesk deployment path. Local `ops:preview` uses demo settings and PostgreSQL-backed counters; production configuration requires managed PostgreSQL and Redis, HTTPS origins, real secrets and disabled demo/local-counter flags. Do not expose the local demo configuration as a public production service. See [production configuration](OPSDESK_PRODUCTION_CONFIG.md) and the [handoff](OPSDESK_HANDOFF.md).

## Copy-ready prompt for Codex on the connected account

> Continue `DhruvKhanna7777/opsdesk-travel-support` from the latest `main`. Fetch it, check open PRs and the final post-#76 CI run, and read `docs/OPSDESK_DEPLOYMENT_HANDOFF.md`, `docs/OPSDESK_SUBMISSION.md`, `docs/OPSDESK_PRODUCTION_CONFIG.md`, `docs/OPSDESK_TBO_WORKFLOW.md` and `docs/OPSDESK_HANDOFF.md` before editing.
>
> The two-iteration plan's feature items 1-4 are merged and tested. Complete item 5 from a **hosted synthetic demo** if the connected deployment account supports it: prepare an isolated staging target, deploy, verify web/API/worker health, run the five mapped demo journeys, capture a reliable walkthrough and screenshots, then update the submission evidence. The PDF names journeys A-E but does not define their steps; use the explicit provisional mapping in `docs/OPSDESK_SUBMISSION.md` and state that limitation. Do not invent original acceptance criteria.
>
> Inspect the deployment plugins and available account/region before choosing infrastructure. Ask me only for the hosting choice, budget, domain/access policy or credentials that the connected account cannot supply. Keep credentials and private exports out of Git. Make repository configuration and documentation changes on small PRs; run their CI and merge only after checks pass. Use Node 22.23.x and separate synthetic data. Do not enable real booking, mail or AI providers. Restrict access to the demo; do not publish shared demo accounts on an unrestricted public endpoint. Verify role/agency isolation, supplier privacy, sessions, deadlines, audit/idempotency and reset behavior after deployment.
>
> Record the exact URL/access method, deployment commit, provider/region, configuration shape (without secret values), health results, journey evidence, screenshots/video location, cost assumptions, CI links and remaining gaps in a reviewable PR. Keep **production deployment paused** until live retention, onboarding, provider integrations, monitoring, backups and authorized staging recovery have owners and acceptance evidence. Do not describe staging as production-ready.

## Staging acceptance record to fill

| Check | Evidence required |
| --- | --- |
| Target and access | Provider, region, staging URL, TLS and access restriction; no credential values in Git. |
| Build and startup | Exact commit, Node/runtime, migrations, isolated synthetic seed, web/API/worker health. |
| Data and roles | Manager, regional agent, agency, customer and supplier login; cross-scope denial. |
| Journeys | A-E mapping from the submission guide, actual actions/results and any mismatch with a later acceptance brief. |
| Evidence | 3-5 minute script, recorded screen capture or hosted demo access, screenshots and the saved artifact location. |
| Operations | Restart, reset procedure, backup/restore rehearsal, logs/alerts and disabled outbound integrations. |
| Cost | Actual staging services and estimated monthly spend, with date, region and workload assumptions. |

The [submission guide](OPSDESK_SUBMISSION.md) already contains the architecture and a published-price comparison. It is a planning comparison, not a quote for hosted OpsDesk. Live ticket/message/audit/export retention, external workspace compatibility, real booking and email, attachment scanner monitoring, representative performance targets, spoken screen-reader acceptance and staging recovery remain open under the repository backlog. Those are production gates, separate from the synthetic demo submission.
