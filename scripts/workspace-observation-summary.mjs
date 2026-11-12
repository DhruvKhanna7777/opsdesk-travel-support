import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EVENT = "opsdesk.workspace.response";
const ROLES = ["MANAGER", "AGENT", "AGENCY", "CUSTOMER", "SUPPLIER", "UNKNOWN"];
const KEYS = ["at", "event", "mode", "role", "version"];
const MAX_LINE = 1024 * 1024;
const MAX_DIAGNOSTICS = 50;
class SummaryError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function utc(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
function windowBounds({ from, to }) {
  if (from === undefined && to === undefined) return null;
  if (!utc(from) || !utc(to) || from >= to)
    throw new SummaryError("invalid-window");
  return { from, to, endExclusive: true };
}
function observation(line) {
  const clean = line.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "").trim();
  if (!clean.includes(EVENT)) return null;
  const start = clean.indexOf("{");
  let value;
  const json = clean.slice(start);
  try {
    if (start < 0) throw new Error();
    value = JSON.parse(json);
  } catch {
    return { error: "malformed-json" };
  }
  if (value && !Array.isArray(value) && value.event !== EVENT) return null;
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(KEYS) ||
    (json.match(/"(?:[^"\\]|\\.)*"\s*:/g) || []).length !== KEYS.length
  )
    return { error: "invalid-schema" };
  if (value.version !== 1) return { error: "unsupported-version" };
  if (!utc(value.at)) return { error: "invalid-timestamp" };
  if (!["full", "compact"].includes(value.mode) || !ROLES.includes(value.role))
    return { error: "invalid-dimension" };
  return { value };
}

export async function summarizeWorkspaceObservations(input, options = {}) {
  const window = windowBounds(options);
  const report = {
    version: 1,
    status: "no-events",
    evidenceType: "workspace-handler-log-records",
    retirement: "not-assessed",
    collectionCoverage: "unverified",
    source: { sha256: null, bytes: 0, encoding: null, lines: 0 },
    window,
    events: { valid: 0, included: 0, excluded: 0, invalid: 0, ignoredLines: 0 },
    counts: {
      full: 0,
      compact: 0,
      byRole: Object.fromEntries(
        ROLES.map((role) => [role, { full: 0, compact: 0 }]),
      ),
    },
    observed: { firstAt: null, lastAt: null },
    diagnostics: [],
    diagnosticsTruncated: false,
  };
  function line(value) {
    report.source.lines++;
    const result = observation(value.replace(/\r$/, ""));
    if (!result) {
      report.events.ignoredLines++;
      return;
    }
    if (result.error) {
      report.events.invalid++;
      if (report.diagnostics.length < MAX_DIAGNOSTICS)
        report.diagnostics.push({
          line: report.source.lines,
          code: result.error,
        });
      else report.diagnosticsTruncated = true;
      return;
    }
    const event = result.value;
    report.events.valid++;
    if (window && (event.at < window.from || event.at >= window.to)) {
      report.events.excluded++;
      return;
    }
    report.events.included++;
    report.counts[event.mode]++;
    report.counts.byRole[event.role][event.mode]++;
    if (!report.observed.firstAt || event.at < report.observed.firstAt)
      report.observed.firstAt = event.at;
    if (!report.observed.lastAt || event.at > report.observed.lastAt)
      report.observed.lastAt = event.at;
  }
  let pending = "";
  function text(value) {
    if (value.includes("\0")) throw new SummaryError("invalid-encoding");
    let start = 0,
      end;
    while ((end = value.indexOf("\n", start)) >= 0) {
      if (pending.length + end - start > MAX_LINE)
        throw new SummaryError("line-too-long");
      line(pending + value.slice(start, end));
      pending = "";
      start = end + 1;
    }
    if (pending.length + value.length - start > MAX_LINE)
      throw new SummaryError("line-too-long");
    pending += value.slice(start);
  }
  try {
    const handle = await open(input, "r");
    const header = Buffer.alloc(3);
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }
    const encoding =
      header[0] === 0xff && header[1] === 0xfe
        ? "utf-16le"
        : header[0] === 0xfe && header[1] === 0xff
          ? "utf-16be"
          : "utf-8";
    report.source.encoding = encoding;
    const decoder = new TextDecoder(encoding, { fatal: true });
    const hash = createHash("sha256");
    function decode(bytes, stream) {
      let value;
      try {
        value = decoder.decode(bytes, { stream });
      } catch {
        throw new SummaryError("invalid-encoding");
      }
      text(value);
    }
    for await (const bytes of createReadStream(input, {
      highWaterMark: 64 * 1024,
    })) {
      hash.update(bytes);
      report.source.bytes += bytes.length;
      decode(bytes, true);
    }
    decode(undefined, false);
    if (pending.length) line(pending);
    report.source.sha256 = hash.digest("hex");
  } catch (error) {
    if (error instanceof SummaryError) throw error;
    throw new SummaryError("read-error");
  }
  report.status = report.events.invalid
    ? "invalid-input"
    : report.counts.full
      ? "legacy-reads-observed"
      : report.counts.compact
        ? "compact-only-observed"
        : "no-events";
  return report;
}

async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Usage: node scripts/workspace-observation-summary.mjs --input LOG [--from UTC_ISO --to UTC_ISO]\nCounts log records only; retirement is never assessed. Exit 0: usable summary, 1: invalid events, 2: arguments/read/encoding error.",
    );
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.slice(2);
    if (
      !["--input", "--from", "--to"].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith("--") ||
      Object.hasOwn(options, key)
    )
      throw new SummaryError("invalid-arguments");
    options[key] = args[i + 1];
  }
  if (!options.input) throw new SummaryError("invalid-arguments");
  const report = await summarizeWorkspaceObservations(options.input, options);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === "invalid-input" ? 1 : 0;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(
      `Workspace observation summary failed (${error instanceof SummaryError ? error.code : "io-error"}).`,
    );
    process.exitCode = 2;
  });
}
