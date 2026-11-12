import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { summarizeWorkspaceObservations } from "./workspace-observation-summary.mjs";

const script = fileURLToPath(
  new URL("./workspace-observation-summary.mjs", import.meta.url),
);
const base = resolve(fileURLToPath(new URL("../.opsdesk", import.meta.url)));
const times = [
  "2026-11-12T12:00:00.000Z",
  "2026-11-12T12:01:00.000Z",
  "2026-11-12T12:02:00.000Z",
];
const event = (mode = "full", role = "MANAGER", at = times[0]) => ({
  event: "opsdesk.workspace.response",
  version: 1,
  at,
  mode,
  role,
});
function fixture(t, bytes) {
  mkdirSync(base, { recursive: true });
  const folder = mkdtempSync(join(base, "observation-summary-test-"));
  t.after(() => {
    assert.equal(dirname(folder), base);
    rmSync(folder, { recursive: true, force: true });
  });
  const input = join(folder, "private-caller.log");
  writeFileSync(input, bytes);
  return input;
}
const cli = (args) =>
  spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("aggregates prefixed/ANSI/NDJSON records, preserves repeated rows and omits private content", async (t) => {
  const rows = [
    "Unrelated private-caller startup text 日本語",
    JSON.stringify({
      event: "other",
      message: "opsdesk.workspace.response",
      private: "private-caller",
    }),
    `[Nest] 1 LOG [TravelController] ${JSON.stringify(event("full", "MANAGER", times[2]))}`,
    JSON.stringify(event("full", "MANAGER", times[2])),
    `\u001b[32m[Nest] 1 LOG [TravelController] ${JSON.stringify(event("compact", "AGENT"))}\u001b[0m`,
    JSON.stringify(event("full", "UNKNOWN", times[1])),
    JSON.stringify(event("compact", "AGENCY", times[1])),
    JSON.stringify(event("compact", "CUSTOMER", times[2])),
    JSON.stringify(event("compact", "SUPPLIER", times[2])),
  ];
  const bytes = Buffer.from(rows.join("\r\n") + "\r\n");
  const report = await summarizeWorkspaceObservations(fixture(t, bytes));
  assert.equal(report.status, "legacy-reads-observed");
  assert.equal(report.retirement, "not-assessed");
  assert.equal(report.collectionCoverage, "unverified");
  assert.deepEqual(report.events, {
    valid: 7,
    included: 7,
    excluded: 0,
    invalid: 0,
    ignoredLines: 2,
  });
  assert.equal(report.counts.full, 3);
  assert.equal(report.counts.compact, 4);
  assert.deepEqual(report.counts.byRole.UNKNOWN, { full: 1, compact: 0 });
  assert.deepEqual(report.observed, { firstAt: times[0], lastAt: times[2] });
  assert.deepEqual(report.source, {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    encoding: "utf-8",
    lines: 9,
  });
  assert(!JSON.stringify(report).includes("private-caller"));
});

test("empty, unrelated and compact-only inputs never assess retirement", async (t) => {
  for (const [text, status] of [
    ["", "no-events"],
    ["Startup only\n", "no-events"],
    [JSON.stringify(event("compact")), "compact-only-observed"],
  ]) {
    const report = await summarizeWorkspaceObservations(fixture(t, text));
    assert.equal(report.status, status);
    assert.equal(report.retirement, "not-assessed");
    assert.equal(report.collectionCoverage, "unverified");
    assert.equal(report.counts.full, 0);
  }
});

test("filters inclusive start / exclusive end and exposes excluded events", async (t) => {
  const input = fixture(
    t,
    [
      event("full", "MANAGER", times[2]),
      event("compact", "AGENT", times[1]),
      event("full"),
    ]
      .map(JSON.stringify)
      .join("\n"),
  );
  const report = await summarizeWorkspaceObservations(input, {
    from: times[1],
    to: times[2],
  });
  assert.deepEqual(report.window, {
    from: times[1],
    to: times[2],
    endExclusive: true,
  });
  assert.equal(report.events.valid, 3);
  assert.equal(report.events.included, 1);
  assert.equal(report.events.excluded, 2);
  assert.equal(report.status, "compact-only-observed");
  assert.equal(report.retirement, "not-assessed");
  assert.deepEqual(report.observed, { firstAt: times[1], lastAt: times[1] });
  const empty = await summarizeWorkspaceObservations(input, {
    from: "2026-11-13T00:00:00.000Z",
    to: "2026-11-14T00:00:00.000Z",
  });
  assert.equal(empty.status, "no-events");
  assert.equal(empty.events.excluded, 3);
  assert.deepEqual(empty.observed, { firstAt: null, lastAt: null });
});

test("rejects malformed, private, duplicate, unsupported and invalid events even outside the window", async (t) => {
  const invalid = [
    '{"event":"opsdesk.workspace.response",private-caller',
    JSON.stringify({ ...event(), userId: "private-caller" }),
    JSON.stringify({ ...event(), version: 2 }),
    JSON.stringify({ ...event(), at: "2026-02-30T12:00:00.000Z" }),
    JSON.stringify({ ...event(), mode: "private-caller" }),
    JSON.stringify({ ...event(), role: "private-caller" }),
    JSON.stringify(event()).replace(
      '"mode":"full"',
      '"mode":"compact","mode":"full"',
    ),
    JSON.stringify([event()]),
  ];
  const input = fixture(
    t,
    [...invalid, JSON.stringify(event("compact"))].join("\n"),
  );
  const report = await summarizeWorkspaceObservations(input, {
    from: times[1],
    to: times[2],
  });
  assert.equal(report.status, "invalid-input");
  assert.equal(report.events.invalid, invalid.length);
  assert.equal(report.events.excluded, 1);
  assert.equal(report.events.included, 0);
  assert.equal(report.retirement, "not-assessed");
  assert.deepEqual(
    report.diagnostics.map((d) => d.line),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert(!JSON.stringify(report).includes("private-caller"));
  assert(
    report.diagnostics.every(
      (d) => Object.keys(d).sort().join() === "code,line",
    ),
  );
});

test("bounds diagnostics while retaining the total invalid-event count", async (t) => {
  const report = await summarizeWorkspaceObservations(
    fixture(
      t,
      Array(60)
        .fill('{"event":"opsdesk.workspace.response",private-caller')
        .join("\n"),
    ),
  );
  assert.equal(report.events.invalid, 60);
  assert.equal(report.diagnostics.length, 50);
  assert.equal(report.diagnosticsTruncated, true);
  assert.equal(report.status, "invalid-input");
  assert(!JSON.stringify(report).includes("private-caller"));
});

test("reads BOM-tagged UTF-8 and UTF-16 in both byte orders and hashes original bytes", async (t) => {
  const text = JSON.stringify(event()) + "\r\n";
  const le = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, "utf16le"),
  ]);
  const cases = [
    [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]),
      "utf-8",
    ],
    [le, "utf-16le"],
    [Buffer.from(le).swap16(), "utf-16be"],
  ];
  for (const [bytes, encoding] of cases) {
    const report = await summarizeWorkspaceObservations(fixture(t, bytes));
    assert.equal(report.source.encoding, encoding);
    assert.equal(report.source.bytes, bytes.length);
    assert.equal(
      report.source.sha256,
      createHash("sha256").update(bytes).digest("hex"),
    );
    assert.equal(report.counts.full, 1);
    assert.equal(report.source.lines, 1);
  }
});

test("rejects invalid encodings, untagged UTF-16 and overlong lines", async (t) => {
  for (const bytes of [
    Buffer.from([0xff]),
    Buffer.from(JSON.stringify(event()), "utf16le"),
    Buffer.from([0xff, 0xfe, 0x7b]),
  ])
    await assert.rejects(summarizeWorkspaceObservations(fixture(t, bytes)), {
      message: "invalid-encoding",
    });
  await assert.rejects(
    summarizeWorkspaceObservations(fixture(t, "x".repeat(1024 * 1024 + 1))),
    { message: "line-too-long" },
  );
});

test("requires a complete canonical UTC interval with start before end", async (t) => {
  const input = fixture(t, "");
  for (const options of [
    { from: times[0] },
    { to: times[2] },
    { from: times[1], to: times[1] },
    { from: times[2], to: times[0] },
    { from: "private-time", to: times[2] },
    { from: "2026-11-12T12:00:00+00:00", to: times[2] },
  ])
    await assert.rejects(summarizeWorkspaceObservations(input, options), {
      message: "invalid-window",
    });
});

test("CLI distinguishes usable summaries, invalid events and redacted usage/read errors", (t) => {
  const good = fixture(t, JSON.stringify(event("compact")));
  const usable = cli(["--input", good]);
  assert.equal(usable.status, 0, usable.stderr);
  assert.equal(JSON.parse(usable.stdout).retirement, "not-assessed");
  assert.equal(JSON.parse(usable.stdout).status, "compact-only-observed");
  const invalid = cli([
    "--input",
    fixture(t, JSON.stringify({ ...event(), token: "private-caller" })),
  ]);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).status, "invalid-input");
  assert(!(invalid.stdout + invalid.stderr).includes("private-caller"));
  for (const args of [
    [],
    ["--input"],
    ["--input", good, "--input", good],
    ["--input", good, "--unknown", "private-caller"],
    ["--input", good, "--from", "private-time"],
    ["--input", good + "-missing-private-caller"],
  ]) {
    const failed = cli(args);
    assert.equal(failed.status, 2);
    assert.equal(failed.stdout, "");
    assert(!failed.stderr.includes("private-caller"));
    assert(!failed.stderr.includes("private-time"));
  }
  assert.equal(cli(["--help"]).status, 0);
});
