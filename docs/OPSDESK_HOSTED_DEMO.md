# Hosted synthetic demo setup

This is a disposable demonstration, separate from production. The Render Blueprint
creates an API (including its in-process deadline worker), PostgreSQL, and Key
Value in Singapore on free plans. Vercel runs the Next.js frontend on Hobby.
Only synthetic records are seeded. Booking, email, and AI provider credentials
must stay unset. Production deployment remains paused.

## Access and secrets

The demo was initially deployed with Vercel Authentication. At the user's
request it is now accessible to anyone with the link. The shared demo password
is published in the repository; visitors can use the synthetic role accounts.
Do not enter live customer information or configure live providers. The Render
API has a separate server-to-server gate: set the
same random, at least 32-character `OPSDESK_HOSTED_DEMO_GATE_SECRET` in the
Render API and the Vercel frontend. Set it only in provider secret stores, never
in Git or a client-visible `NEXT_PUBLIC_` variable. The API leaves only
`/health/ready` and `/health/worker` reachable without it. Registration is
disabled in hosted-demo mode. Keep `ADMIN_RESET_SECRET` unset.

Set `FRONTEND_URL` in Render to the exact Vercel HTTPS origin. Set
`BACKEND_API_URL` in Vercel to the Render API HTTPS origin. Configure the
Vercel project's root directory as `frontend`, include source files outside
that root for the shared npm workspace, and use Node 22.x. Keep the generated
JWT and attachment secrets and database/Key Value internal URLs in Render.
The Render web URL remains publicly addressable, but application endpoints
return 401 without the server-to-server secret. Render's free workspace plan
does not provide a web-service IP allow list.

## Deployment and verification order

1. Validate the latest `main` CI, then deploy a reviewed commit. The first
   frontend build used Vercel Authentication; the current public access setting
   was requested after deployment.
2. Create the Vercel project and its origin, set the server-only variables,
   then provision the Render Blueprint with `FRONTEND_URL` and its matching
   gate secret. Disable automatic deployment on the Render API.
3. The API start command applies migrations and seeds only an empty travel
   database. Check web access, API unauthorized responses without the gate,
   API `/health/ready`, and `/health/worker`. Record the commit and URLs.
4. Exercise journeys A-E from [the submission mapping](OPSDESK_SUBMISSION.md),
   the five roles, agency and supplier isolation, sessions, audit/idempotency,
   and the scoped export. Capture screenshots and the walkthrough in a
   reviewer-accessible evidence location.
5. Record exact outcomes and the access method in the submission guide. The
   deployment record was pushed to `main` at the user's request.

## Reset and limits

Restarting the API preserves PostgreSQL records; the travel seeder exits if
cases already exist. Never run the inherited generic reset endpoint. To reset
this shared demo, retire its disposable resources and provision a new isolated
database, Key Value, API, and frontend deployment from a reviewed
commit, then repeat health and role checks. Do not delete a database until its
owner has confirmed that the synthetic instance can be discarded. Free Render
Postgres has no managed backups and expires after 30 days; free Key Value loses
state on restart. This setup cannot supply a backup/restore acceptance claim.

The intended direct provider cost is $0/month within free usage limits, with
no custom domain. Usage caps, cold starts, and the existing Render workspace's
other free service may affect availability. Confirm the final provider billing
view and resource plans before provisioning; this is not a production estimate.
