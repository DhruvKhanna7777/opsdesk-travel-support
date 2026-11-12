# Iteration 1 core workflows

The project workflow governs booking linkage, visibility, deadline handling, and audit. These three additions use the same ticket, supplier, and role boundaries.

## Supplier thread recipients

Open a case's **Supplier threads**, then select **Edit recipients** on a thread. Scoped agents and managers can choose active portal users from the thread's supplier, or its existing supplier contact address, and set each to **To** or **Cc**. At least one To is required. The first explicit save limits access to matching recipients. Before that save, a thread uses its existing supplier sharing rule.

Both roles can read and reply through the portal when they match an active supplier account. The contact address is the supplier's stored address. Existing mail delivery remains limited to that authorized address under the current provider, allowlist and reply rules. Selecting portal users does not add external mail destinations. The recipient list lives on the thread independently of case ownership. Updates leave the supplier and saved response target intact and record a staff-visible event without email addresses. An identical retry creates no new event.

## Case themes and weekly Insights

Scoped staff can open **Case themes** and save tags independently of the routing category. Suggestions come from deterministic intake classification and supplier keywords. The agent confirms tags before saving. The first two fresh demo cases include Supplier follow up and Refund examples.

**Top themes this week** counts tagged cases opened since Monday at 00:00 UTC, through the workspace clock. It shows up to five themes and three recent examples each. Select an example to open its authorized case. Regional agents see only cases in scope. Suggestions and edits do not change deadlines or assignment.

## Full case CSV

Select **Export all** in the case inbox or manager queue. The download uses the same filters and role scope as the displayed queue and includes every matching case regardless of the current page. Columns include reference, subject, booking reference, region, category, priority, status, and UTC deadline. The endpoint streams in stable case-ID order with bounded keyset batches. The result reflects reads during export, so concurrent edits can change which rows match. The download quotes CSV fields and prefixes formula-like values for spreadsheet safety. Customers receive only their own cases, agency users receive their own agency's cases, and suppliers have no case export.

## Verification

Run the isolated synthetic preview with Node 22.23.x and `npm ci`. Execute the following sequentially:

```powershell
npm run ops:test
$env:OPSDESK_ITERATION_EXPORT_ROWS = '50000'
node scripts/iteration-one-smoke.mjs
Remove-Item Env:OPSDESK_ITERATION_EXPORT_ROWS
npm run ops:test:browser
$env:OPSDESK_BROWSER_ENGINE = 'firefox'
npm run ops:test:browser
Remove-Item Env:OPSDESK_BROWSER_ENGINE
```

The focused HTTP fixture verifies ownership transfer, role and supplier boundaries, repeat-safe audits, theme suggestions/counts/examples, and exports beyond the queue page limit. The browser journey verifies the editor, linked Insights examples, and the filtered download through the frontend proxy. Keep deployment paused.
