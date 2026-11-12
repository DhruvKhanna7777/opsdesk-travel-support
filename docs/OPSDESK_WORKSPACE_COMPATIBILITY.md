# Workspace response compatibility

## Decision

Keep `GET /ops/workspace` available. Repository callers have been inventoried,
but external caller compatibility is **unconfirmed**. A source search and passing
synthetic tests cannot establish that no external clients exist. No retirement
date, changed default or production rollout is authorized. Deployment stays paused.

PR #69 is merged at main `169d4be66146a210b334280602a7de2e3fea4d1b`.
[Post-merge validation](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43222335689)
passed API, Chromium, Firefox, synthetic recovery, load/startup and audit. The
owner reported that no access-log format or external caller inventory is
available. Optional observation below prepares future evidence collection;
external compatibility remains unconfirmed.

PR #70 is now merged at `c99ca5b360827b79ebf6732ebcd4d042fafa3400`.
[Its post-merge CI](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43226554929)
passed builds, API, Chromium, Firefox, synthetic recovery, load/startup and audit.
The continuation below adds an offline summary of the emitted records; it does
not establish external usage or consumer acceptance.

This follow-up starts from main `527931d27471971405d5aa7b48c9487532b1f34b`,
with PRs #65–#68 merged and zero open PRs at the initial check. Main run
[43187098916](https://github.com/DhruvKhanna7777/opsdesk-travel-support/actions/runs/43187098916)
passed the API suite, Chromium, Firefox, synthetic recovery and dependency audit.
Earlier documents describing these PRs as open are historical.

## Repository caller inventory

Reproduce from the repository root with
`rg -n 'ops/workspace|workspace\?compact|request\("workspace' .github scripts frontend backend/src`.
Also inspect the frontend request helper and backend controller: the browser uses
a relative route through the BFF rather than a literal `/ops/workspace` URL.

| Caller                                       | Mode and migration status                                                                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/components/opsdesk/workspace.tsx`  | `workspace?compact=1`; case and directory content comes from separate paged routes.                                                                                                             |
| `.github/workflows/opsdesk-ci.yml`           | Authentication readiness probe now uses `?compact=1`, still requiring HTTP 401. Separate health and worker probes remain.                                                                       |
| `scripts/smoke-test.mjs`                     | Compact metadata plus paged/case-specific reads, including unauthenticated denial and session refresh checks.                                                                                   |
| Pagination, directory and membership scripts | Compact metadata; pagination/directory expectations come from independent synthetic database fixtures.                                                                                          |
| Browser and membership-browser scripts       | Verify compact browser requests and session authorization.                                                                                                                                      |
| `scripts/rotation-smoke.mjs`                 | Intentional full-response compatibility test for requester escalation-field redaction. Keep until replacement compatibility policy is approved. Detail and queue redaction also remain covered. |
| `scripts/workspace-compatibility-smoke.mjs`  | Intentional compatibility consumer. Tests full and compact HTTP behavior against independent fixture IDs for nine identities, including both suppliers. Included sequentially in `ops:test`.    |
| External clients, scripts or integrations    | Unknown. No owner inventory, access-log observation or consumer migration acceptance was supplied.                                                                                              |

## Supported behavior and migration map

The controller opts into compact mode only for `compact=1`. An omitted flag or
`compact=0` still returns the legacy authorized arrays. Do not silently change
that default. Both modes require an active authenticated travel profile.

Compact metadata retains identity, effective time/demo-clock fields, assistant
mode, scoped agencies, counts and notifications. Its `tickets`, `conversations`,
`bookings` and `people` arrays stay empty. Full-response counts currently contain
zero placeholders; consumers needing counts must use compact metadata. Full
arrays are compatibility data, not a substitute for bounded paged reads.

| Full response dependency                         | Supported replacement                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Identity, clock, counts, agencies, notifications | `/ops/workspace?compact=1`                                                                |
| Cases and case context                           | `/ops/queue`, `/ops/tickets/:id`                                                          |
| Customer messages, activity and related history  | `/ops/tickets/:id/messages`, `/ops/tickets/:id/events`, `/ops/tickets/:id/related`        |
| Bookings and people                              | `/ops/bookings`, `/ops/people`                                                            |
| Booking case history                             | `/ops/bookings/:id/tickets`                                                               |
| Supplier threads and messages                    | `/ops/conversations`, `/ops/tickets/:id/conversations`, `/ops/conversations/:id/messages` |

Walk each paged response using its returned page metadata; do not assume page one
contains the full workspace. Continue to enforce authorization on every read.
Requester messages/events and escalation fields remain redacted. Supplier
identities receive only their shared conversations, with no case or booking
snapshot. People directories retain their existing staff/context visibility;
this increment does not redefine that policy.

## Optional workspace usage observation

`OPSDESK_WORKSPACE_OBSERVATION=true` enables one structured Nest log message
after each successful authorized workspace read. It is **off by default**; only
the exact string `true` enables it. The response and `compact=1` selection stay
unchanged. It creates no database record or new endpoint.

The event has exactly five fields:

```json
{
  "event": "opsdesk.workspace.response",
  "version": 1,
  "at": "2026-11-12T12:00:00.000Z",
  "mode": "full",
  "role": "MANAGER"
}
```

`mode` is `full` or `compact`. `role` is one of MANAGER, AGENT, AGENCY,
CUSTOMER or SUPPLIER; an unexpected value becomes UNKNOWN. There are no user,
agency, booking, ticket or session IDs, tokens, IP addresses, headers, user-agent
strings, query values or response content in this event. Other application or
proxy logs have their own data-handling policies.

For a dedicated synthetic PowerShell preview, set the variable only in that
terminal before launching. Keep the resulting local log outside Git:

```powershell
$env:OPSDESK_WORKSPACE_OBSERVATION = 'true'
New-Item -ItemType Directory -Force .opsdesk | Out-Null
npm run ops:preview *> .opsdesk/workspace-observation.log
```

Stop the preview and remove the terminal setting with
`Remove-Item Env:OPSDESK_WORKSPACE_OBSERVATION` to disable it for the next start.
Do not start a second preview on occupied ports. Match known local test times
and count events by mode/role; for example:

```powershell
rg -c 'opsdesk\.workspace\.response.*"mode":"full"' .opsdesk/workspace-observation.log
rg -c 'opsdesk\.workspace\.response.*"mode":"compact"' .opsdesk/workspace-observation.log
```

Nest adds its normal log prefix. The JSON event records successful handler
results, before HTTP serialization/delivery. Authentication failures and denied
or failed reads produce no successful-response event. Serialization failures or
disconnections can occur after an event is emitted. Other endpoints are outside
this observation. Logging is best effort: filtered log levels, sink failure,
process termination or collection gaps can lose events, and sink failure does
not fail an authorized response. Ensure Nest's `log` level is collected when
using this feature. No sampling or per-user state is added by the hook.

These events identify response mode and role, **not individual external clients**.
A full event establishes a legacy read, but cannot identify its owner. Zero full
events alone cannot prove that no consumers exist. Record approved observation
dates, environments, collector availability and known synthetic traffic, then
combine that evidence with the owner-attested inventory and consumer acceptance
below. This increment only exercises synthetic local traffic; it does not enable
logging in a deployed environment or approve retention, deployment or retirement.

## Summarize a frozen observation log

After stopping collection, keep a frozen local copy and run:

```powershell
npm run --silent ops:summarize-workspace-observations -- --input .opsdesk/workspace-observation.log > .opsdesk/workspace-observation-summary.json
```

Use `--silent` when redirecting npm output so the report contains only JSON.
The equivalent direct command is
`node scripts/workspace-observation-summary.mjs --input LOG`.
This tool reads a local file without starting the application or contacting a
database/service. Keep raw logs and generated reports under ignored `.opsdesk/`;
they are not automatically published or committed.

To select a UTC interval, supply both bounds in canonical millisecond ISO form:

```powershell
npm run --silent ops:summarize-workspace-observations -- --input .opsdesk/workspace-observation.log --from 2026-11-12T12:00:00.000Z --to 2026-11-13T12:00:00.000Z > .opsdesk/workspace-observation-window.json
```

The start is inclusive, the end exclusive, and the start must precede the end.
All recognized records are validated, including records outside the selected
interval. Without bounds, all valid recognized records are included. The report
gives included/excluded/invalid counts, full/compact counts by allowlisted role,
earliest/latest included timestamps, encoding, line/byte counts and a SHA-256 of
the original file bytes. It contains no filename, raw event, request or error
content. Diagnostics contain only line numbers and fixed error codes, capped at
50 entries while retaining the total invalid-record count.

Supported input is one producer JSON object per line, either plain or with the
standard Nest prefix/ANSI colors. CRLF and UTF-8 (with or without BOM) work;
UTF-16 LE/BE requires a BOM. Invalid encoding, NUL-containing input and lines
over 1,048,576 decoded code units fail without a partial report. Collector JSON
wrappers with nested events need local normalization into this supported format;
unrelated lines are ignored. Recognized malformed JSON, duplicate/extra fields,
unknown versions, invalid UTC timestamps, modes or roles mark the report invalid.
Future event versions need explicit parser support.

| Result                                                                    | Status / exit code                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Full-mode records included                                                | `legacy-reads-observed` / 0                                             |
| Only compact records included                                             | `compact-only-observed` / 0                                             |
| No records included, including an empty or out-of-window file             | `no-events` / 0                                                         |
| Any invalid recognized record                                             | `invalid-input` / 1; do not use its partial counts as accepted evidence |
| Invalid arguments/window, unreadable file, encoding or line-limit failure | No JSON report / 2; redacted fixed-code diagnostic on stderr            |

Exit 0 means the summary was usable, **not compatibility acceptance**. Every
report fixes `retirement` to `not-assessed` and `collectionCoverage` to
`unverified`. Counts describe log rows, not proven delivered requests or unique
clients. Identical rows are retained because the event has no request ID; a
collector replay or duplicated export can inflate counts. The hash identifies
the bytes read, not their authenticity or completeness. Freeze the export before
reading and verify collector coverage/duplicates separately. Empty or compact-only
reports cannot establish that external full-response consumers are absent.

Run `npm run ops:test:workspace-observations` for the standalone offline tests.
The same tests run first in `npm run ops:test`; existing authorization/redaction
and mutating suites remain sequential. [Verified summary checks](OPSDESK_VALIDATION.md#workspace-observation-summary).

## Evidence required before retirement

1. Have the application/integration owner identify callers and environments,
   response fields used, maintainer, replacement routes and migration state.
   Record an explicit owner attestation even if the inventory is empty.
2. In an authorized environment, agree an observation period covering normal and
   infrequent jobs. Review existing access logs or approved instrumentation for
   requests without `compact=1`. The current repository has no verified
   production observation; do not treat local test traffic as evidence.
3. Obtain each consumer owner's acceptance of paging, empty compact arrays,
   scoped counts, authorization/session handling and redaction. Preserve saved
   deadlines, idempotency and audit behavior through end-to-end workflows.
4. Record the inventory, observation dates/environment, evidence location,
   consumer acceptance and owner decision in the handoff. Keep credentials,
   customer content and private logs out of Git.
5. Propose retirement separately with an approved compatibility notice, rollback
   procedure and retained positive/negative authorization and redaction tests.
   Full-response removal is blocked until the preceding evidence exists.

The compatibility suite adds resolved synthetic cases with customer/internal
messages, private status reasons, escalation fields and separate threads for both
supplier login accounts. Expectations come from database rows rather than API
parity. It removes its cases and verifies cascading case/thread/message/event
cleanup in `finally`, including after a failed assertion.

Run `node scripts/workspace-compatibility-smoke.mjs` only against the isolated
synthetic preview, or run `npm run ops:test` for this test plus the session,
rotation, paged-read and other regression suites. Run mutating API, browser and
load commands sequentially. See [verified results](OPSDESK_VALIDATION.md#workspace-compatibility-continuation).
