"use client";
import { DirectorySelect } from "./directory-select";
import { Attachments } from "./attachments";
import { TicketSlaControls } from "./sla-settings";
import { useRef, useState } from "react";
import { useOpsResource, useOpsPage, PageControls } from "./paged-data";
import { classifyTravelIntent, TRAVEL_THEMES } from "@helpdesk/shared";
import { categories } from "./reports";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Layers3,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  AgencyContract,
  Booking,
  Person,
  CaseEvent,
  Conversation,
  Message,
  Ticket,
  Workspace,
} from "@/lib/opsdesk-types";
import {
  active,
  Badge,
  date,
  human,
  initials,
  Modal,
  remaining,
  type Mutation,
} from "./ui";

const scheduleFields = [
  ["checkInAt", "Check-in"],
  ["departureAt", "Departure"],
  ["cancellationCutoffAt", "Cancellation cutoff (LCD)"],
] as const;

function BookingSchedule({
  booking,
  manager,
  busy,
  mutate,
}: {
  booking: NonNullable<Ticket["booking"]>;
  manager: boolean;
  busy: boolean;
  mutate: Mutation;
}) {
  return (
    <>
      {scheduleFields.map(([field, label]) => {
        const value = booking[field];
        return (
          <div className="od-context-line" key={field}>
            <CalendarDays size={15} />
            <span>
              {label}
              <b>{value ? date(value, booking.timezone) : "Not recorded"}</b>
              {value && <small>{booking.timezone}</small>}
            </span>
          </div>
        );
      })}
      {manager && (
        <details>
          <summary>Edit booking schedule</summary>
          <form
            key={scheduleFields.map(([field]) => booking[field]).join("|")}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const changes = Object.fromEntries(
                scheduleFields.flatMap(([field]) => {
                  const value = String(form.get(field) ?? "");
                  if (value === (booking[field]?.slice(0, 16) ?? "")) return [];
                  return [[field, value ? `${value}:00Z` : null]];
                }),
              );
              if (Object.keys(changes).length)
                void mutate(
                  `bookings/${booking.id}/schedule`,
                  changes,
                  "Booking schedule updated.",
                  "PATCH",
                ).catch(() => {});
            }}
          >
            {scheduleFields.map(([field, label]) => (
              <label key={field}>
                {label} (UTC)
                <input
                  name={field}
                  type="datetime-local"
                  defaultValue={booking[field]?.slice(0, 16)}
                  required={field === "checkInAt"}
                />
              </label>
            ))}
            <button className="od-secondary" disabled={busy}>
              Save schedule
            </button>
          </form>
        </details>
      )}
    </>
  );
}
function IntakeContract({
  agencyId,
  refresh,
  value,
  onSelect,
}: {
  agencyId: string;
  refresh: string;
  value: string;
  onSelect: (id: string) => void;
}) {
  const path = `contracts?agencyId=${encodeURIComponent(agencyId)}`;
  const result = useOpsResource<{ selectionRequired: boolean }>(path, refresh);
  if (result.error)
    return (
      <p role="alert">
        {result.error}
        <button type="button" onClick={result.retry}>
          Retry contracts
        </button>
      </p>
    );
  if (!result.data) return <p role="status">Loading agency contracts...</p>;
  if (!result.data.selectionRequired)
    return <p>Agency default response policy applies.</p>;
  return (
    <div>
      <DirectorySelect<AgencyContract>
        path={path}
        label="Agency contract"
        refresh={refresh}
        value={value}
        onSelect={onSelect}
        required
        text={(c) => `${c.name}  -  ${c.responseTargetHours} service hours`}
      >
        <option value="">Select an active contract</option>
      </DirectorySelect>
      <small>
        A contract is required. Contact support if no active contract is
        available.
      </small>
    </div>
  );
}
export function NewTicket({
  data,
  busy,
  onClose,
  onCreate,
}: {
  data: Workspace;
  busy: boolean;
  onClose: () => void;
  onCreate: (body: unknown) => Promise<void>;
}) {
  const requestId = useRef<string | null>(null);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState(""),
    [priority, setPriority] = useState(""),
    [bookingId, setBookingId] = useState(""),
    [customerId, setCustomerId] = useState(""),
    [contractId, setContractId] = useState(""),
    [submittedReference, setSubmittedReference] = useState(""),
    [error, setError] = useState(""),
    [exampleUsed, setExampleUsed] = useState(false);
  async function sample() {
    try {
      const r = await fetch("/data/travel-examples.json");
      if (!r.ok)
        throw new Error(
          "Sample data is unavailable. You can write your own complaint.",
        );
      const d = await r.json();
      const options = (
        d.examples as { instruction: string; intent: string }[]
      ).filter((v) =>
        ["get_refund", "cancel_flight", "change_trip", "check_in"].includes(
          v.intent,
        ),
      );
      const example = options[Math.floor(Math.random() * options.length)];
      setTitle(example.instruction);
      setDescription(example.instruction);
      setExampleUsed(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const [booking, setBooking] = useState<Booking>();
  const agencyIntake = data.me.kind === "AGENCY";
  const allowUnlistedBooking = agencyIntake || data.me.kind === "CUSTOMER";
  const suggestedIntent =
    title.trim() || description.trim()
      ? classifyTravelIntent(`${title} ${description}`)
      : "";
  return (
    <Modal title="Start a conversation" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (agencyIntake && !booking && !customerId) {
            setError("Select the traveler in your agency.");
            return;
          }
          requestId.current ??= crypto.randomUUID();
          void onCreate({
            requestId: requestId.current,
            title,
            description,
            category: category || undefined,
            priority: priority || undefined,
            contractId: contractId || undefined,
            ...(booking
              ? {
                  bookingReference: booking.reference,
                  agencyId: booking.agencyId,
                  customerId: booking.customerId,
                }
              : {
                  bookingReference: submittedReference.trim() || undefined,
                  ...(agencyIntake ? { customerId } : {}),
                }),
          }).catch((e) => setError(e.message));
        }}
      >
        <div>
          Booking
          <DirectorySelect<Booking>
            path="bookings"
            label="Booking"
            refresh={data.now}
            value={bookingId}
            required={!allowUnlistedBooking}
            onSelect={(id, item) => {
              setBookingId(id);
              setBooking(item);
              setCustomerId("");
              setSubmittedReference("");
              if (item?.agencyId !== booking?.agencyId) setContractId("");
            }}
            text={(b) =>
              `${b.reference}  -  ${b.destination}  -  ${b.customerName || ""}`
            }
          >
            <option value="">
              {data.me.kind === "CUSTOMER"
                ? "My booking is not listed"
                : agencyIntake
                  ? "Booking is not listed"
                  : "Select a verified booking"}
            </option>
          </DirectorySelect>
        </div>
        {agencyIntake && !booking && data.me.agencyId && (
          <div>
            Traveler
            <DirectorySelect<{ id: string; name: string }>
              path={`booking-requests/customers/${encodeURIComponent(data.me.agencyId)}`}
              label="Traveler"
              refresh={data.now}
              value={customerId}
              onSelect={setCustomerId}
              text={(person) => person.name}
              required
            >
              <option value="">Select a traveler in your agency</option>
            </DirectorySelect>
          </div>
        )}
        {allowUnlistedBooking && !booking && (
          <label>
            Booking reference (TBOH, optional)
            <input
              aria-label="Booking reference (TBOH, optional)"
              maxLength={60}
              value={submittedReference}
              onChange={(e) => setSubmittedReference(e.target.value)}
            />
            <small>Support will review references we can’t match.</small>
          </label>
        )}
        {(booking?.agencyId || data.me.agencyId) && (
          <IntakeContract
            key={booking?.agencyId || data.me.agencyId}
            agencyId={(booking?.agencyId || data.me.agencyId)!}
            refresh={data.now}
            value={contractId}
            onSelect={setContractId}
          />
        )}
        <div className="od-flex od-space">
          <span className="od-eyebrow">DESCRIBE THE ISSUE</span>
          <button
            type="button"
            className="od-text-button"
            onClick={() => void sample()}
          >
            Load a travel example
          </button>
        </div>
        {exampleUsed && (
          <p className="od-info">
            Example wording from Bitext Travel, CDLA-Sharing-1.0. Review it
            before creating a ticket.
          </p>
        )}
        <label>
          Subject
          <input
            minLength={5}
            maxLength={180}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="What can we help with?"
          />
        </label>
        <label>
          Tell us what happened
          <textarea
            minLength={10}
            maxLength={10000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            placeholder="Include the issue and the outcome you need."
          />
        </label>
        <label>
          Intent
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">
              {suggestedIntent
                ? `Suggested: ${human(suggestedIntent)}`
                : "Suggest from subject and description"}
            </option>
            {categories.map((intent) => (
              <option key={intent} value={intent}>{human(intent)}</option>
            ))}
          </select>
        </label>
        {["AGENT", "MANAGER"].includes(data.me.kind) && (
          <label>
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Automatic</option>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((level) => (
                <option key={level} value={level}>{human(level)}</option>
              ))}
            </select>
            <small>Travel deadlines can raise the selected priority.</small>
          </label>
        )}
        {booking && (
          <p className="od-info">
            <Layers3 size={16} />
            Earlier cases for {booking.reference} will be linked automatically.
            Routing uses {human(booking.region)} team availability.
          </p>
        )}
        {error && (
          <p role="alert" className="od-error">
            {error}
          </p>
        )}
        <div className="od-modal-actions">
          <button type="button" className="od-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="od-primary" disabled={busy}>
            {busy ? "Saving…" : "Create & route ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Thread({ messages, data }: { messages: Message[]; data: Workspace }) {
  return (
    <div className="od-thread">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`od-message ${m.visibility === "INTERNAL" ? "internal" : ""}`}
        >
          <div className="od-flex">
            <span className="od-avatar small">
              {initials(
                m.senderName ||
                  data.people.find((p) => p.id === m.senderId)?.name ||
                  "Support team",
              )}
            </span>
            <b>
              {m.senderName ||
                data.people.find((p) => p.id === m.senderId)?.name ||
                "Support team"}
            </b>
            {m.visibility === "INTERNAL" && (
              <span className="od-pill">Internal note</span>
            )}
            <time>{date(m.createdAt)}</time>
          </div>
          <p>{m.content}</p>
          <Attachments messageId={m.id} author={m.senderId === data.me.id} />
        </div>
      ))}
    </div>
  );
}
export function OnDemandTicket({
  id,
  data,
  ...props
}: Omit<Parameters<typeof TicketDetail>[0], "ticket"> & { id: string }) {
  const detail = useOpsResource<Ticket>(`tickets/${encodeURIComponent(id)}`, data.now);
  if (detail.error)
    return (
      <p role="alert">
        {detail.error} <button onClick={detail.retry}>Retry case</button>
        <button onClick={props.onBack}>
          {props.backLabel ?? "Back to conversations"}
        </button>
      </p>
    );
  if (!detail.data) return <p role="status">Loading case…</p>;
  return (
    <TicketDetail
      ticket={detail.data}
      data={{
        ...data,
        people: detail.data.people ?? [],
        bookings: detail.data.booking ? [detail.data.booking as Booking] : [],
      }}
      {...props}
    />
  );
}
function EscalateToEm({
  id,
  busy,
  mutate,
}: {
  id: string;
  busy: boolean;
  mutate: Mutation;
}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="od-secondary"
        disabled={busy}
        onClick={() => {
          setError("");
          setReason("");
          setRequestId(crypto.randomUUID());
        }}
      >
        Escalate to EM
      </button>
      {requestId && (
        <Modal title="Escalate to EM" onClose={() => setRequestId(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              void mutate(
                `tickets/${id}/escalate-to-em`,
                { reason, requestId },
                "Escalated to EM.",
              )
                .then(() => setRequestId(null))
                .catch((cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : "Could not escalate this case."),
                );
            }}
          >
            <label>
              Escalation reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                required
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button
              type="submit"
              className="od-primary"
              disabled={busy || !reason.trim()}
            >
              Send escalation
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function TicketThemes({
  id,
  now,
  busy,
  mutate,
}: {
  id: string;
  now: string;
  busy: boolean;
  mutate: Mutation;
}) {
  const path = `tickets/${id}/themes`;
  const { data, error, retry } = useOpsResource<{
    themes: string[];
    suggestions: string[];
  }>(path, now);
  return (
    <details className="od-panel">
      <summary>Case themes</summary>
      {error ? (
        <p role="alert">{error}</p>
      ) : data ? (
        <form
          key={data.themes.join("|")}
          onSubmit={(event) => {
            event.preventDefault();
            const themes = new FormData(event.currentTarget).getAll("theme");
            void mutate(path, { themes }, "Case themes saved.", "PATCH")
              .then(retry)
              .catch(() => {});
          }}
        >
          <fieldset>
            <legend>Tags</legend>
            {TRAVEL_THEMES.map((theme) => (
              <label key={theme}>
                <input
                  type="checkbox"
                  name="theme"
                  value={theme}
                  defaultChecked={data.themes.includes(theme)}
                />
                {human(theme)}
                {data.suggestions.includes(theme) ? " (suggested)" : ""}
              </label>
            ))}
          </fieldset>
          <button className="od-secondary" disabled={busy}>
            Save themes
          </button>
        </form>
      ) : (
        <p role="status">Loading case themes…</p>
      )}
    </details>
  );
}

export function TicketDetail({
  ticket: t,
  data,
  onBack,
  backLabel = "Back to conversations",
  onSelect,
  mutate,
  busy,
}: {
  ticket: Ticket;
  data: Workspace;
  onBack: () => void;
  backLabel?: string;
  onSelect: (id: string) => void;
  mutate: Mutation;
  busy: boolean;
}) {
  const [tab, setTab] = useState("conversation"),
    [content, setContent] = useState(""),
    [visibility, setVisibility] = useState("CUSTOMER"),
    [supplierContent, setSupplierContent] = useState(""),
    [reason, setReason] = useState(""),
    [resolutionStatus, setResolutionStatus] = useState("RESOLVED"),
    [showResolve, setShowResolve] = useState(false),
    [newThread, setNewThread] = useState(false),
    [verifiedRef, setVerifiedRef] = useState("");
  const staff = ["AGENT", "MANAGER"].includes(data.me.kind),
    manager = data.me.kind === "MANAGER";
  const messages = useOpsPage<Message>(
    tab === "conversation" ? `tickets/${t.id}/messages` : null,
    data.now,
  );
  const activity = useOpsPage<CaseEvent>(
    tab === "activity" ? `tickets/${t.id}/events` : null,
    data.now,
  );
  const conversations = useOpsPage<Conversation>(
    staff && tab === "supplier" ? `tickets/${t.id}/conversations` : null,
    data.now,
  );
  const history = useOpsPage<Ticket>(`tickets/${t.id}/related`, data.now);
  const threads = conversations.data?.items ?? [],
    related = history.data?.items ?? [];
  const owner = data.people.find((p) => p.id === t.agentId),
    booking = data.bookings.find((b) => b.id === t.bookingId);
  const needsDraftDetails =
    visibility === "CUSTOMER" && content.includes("[add the confirmed details");
  function draftReply() {
    const supplierUpdate = t.supplierReplied;
    const reference = t.booking ? ` for booking ${t.booking.reference}` : "";
    setContent(
      [
        `Hello, thank you for contacting us about case ${t.reference}${reference}.`,
        !active(t)
          ? "Our records show this case is complete. Please let us know if anything still needs attention."
          : supplierUpdate
            ? "We received an update from the supplier. Here is what we can confirm: [add the confirmed details]."
            : "Here is the current status: [add the confirmed details and next steps].",
      ].join("\n\n"),
    );
  }
  return (
    <>
      <button className="od-back" onClick={onBack}>
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <div className="od-detail-heading">
        <div>
          <div className="od-ticket-sub">
            <span>{t.reference}</span>
            <span>·</span>
            <span>{human(t.category)}</span>
            <Badge value={t.priority} />
          </div>
          <h1>{t.title}</h1>
          <p>
            {data.people.find((p) => p.id === t.customerId)?.name}{" "}
            <span>via</span>{" "}
            {data.agencies.find((a) => a.id === t.agencyId)?.name}
          </p>
        </div>
        <button
          className="od-primary"
          onClick={() => {
            setResolutionStatus(staff ? "RESOLVED" : "CLOSED");
            setShowResolve(true);
          }}
        >
          <CheckCircle2 size={16} />
          {active(t) ? (staff ? "Resolve case" : "Close case") : "Reopen case"}
        </button>
      </div>
      {staff && (
        <TicketThemes id={t.id} now={data.now} busy={busy} mutate={mutate} />
      )}
      <section className="od-trajectory" aria-label="Case journey">
        <div className="od-trajectory-heading">
          <h2>Case journey</h2>
          <span>{t.reference} · saved case state</span>
        </div>
        <ol className="od-trajectory-stages">
          <li className="complete">
            <span className="od-stage-glyph" aria-hidden="true">1</span>
            <b>Intake recorded</b>
            <small>The request is saved in this workspace.</small>
          </li>
          <li className={owner ? "complete" : "pending"}>
            <span className="od-stage-glyph" aria-hidden="true">2</span>
            <b>Team ownership</b>
            <small>{owner ? owner.name : "Awaiting an eligible owner"}</small>
          </li>
          <li className={t.supplierReplied ? "complete" : "pending"}>
            <span className="od-stage-glyph" aria-hidden="true">3</span>
            <b>Supplier coordination</b>
            <small>{t.supplierReplied ? "Supplier reply recorded" : "Available when needed"}</small>
          </li>
          <li className={active(t) ? "pending" : "complete"}>
            <span className="od-stage-glyph" aria-hidden="true">4</span>
            <b>Outcome</b>
            <small>{active(t) ? "Case remains active" : human(t.status)}</small>
          </li>
        </ol>
      </section>
      <div className="od-detail-grid">
        <div>
          <section className="od-case-brief">
            <div className="od-flex">
              <Sparkles size={17} />
              <b>The story so far</b>
              <span className="od-pill">From saved records</span>
            </div>
            <p>{t.summary}</p>
            <small>
              Sources: {t.reference}
              {related.length > 0
                ? ` + ${related.map((v) => v.reference).join(", ")}`
                : ""}
              . No external AI generated this brief.
            </small>
          </section>
          <section className="od-panel">
            <div className="od-tabs">
              <button
                className={tab === "conversation" ? "active" : ""}
                onClick={() => setTab("conversation")}
              >
                Conversation
              </button>
              {staff && (
                <button
                  className={tab === "supplier" ? "active" : ""}
                  onClick={() => setTab("supplier")}
                >
                  Supplier threads
                </button>
              )}
              <button
                className={tab === "activity" ? "active" : ""}
                onClick={() => setTab("activity")}
              >
                Activity
              </button>
            </div>
            {tab === "conversation" ? (
              <>
                <PageControls resource={messages} label="messages" />
                <Thread
                  messages={[...(messages.data?.items ?? [])].reverse()}
                  data={data}
                />
                <form
                  className="od-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (needsDraftDetails) return;
                    void mutate(
                      `tickets/${t.id}/messages`,
                      { content, visibility },
                      visibility === "INTERNAL"
                        ? "Internal note saved."
                        : "Reply saved to the customer thread.",
                    )
                      .then(() => setContent(""))
                      .catch(() => {});
                  }}
                >
                  <div className="od-flex">
                    <MessageSquare size={16} />
                    {staff ? (
                      <select
                        aria-label="Message visibility"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        <option value="CUSTOMER">Customer reply</option>
                        <option value="INTERNAL">Internal note</option>
                      </select>
                    ) : (
                      <b>Reply to support</b>
                    )}
                    <span className="od-composer-hint">
                      {visibility === "INTERNAL"
                        ? "Only your support team can see this"
                        : "Visible to the customer and agency"}
                    </span>
                  </div>
                  <textarea
                    aria-label="Message content"
                    placeholder={
                      visibility === "INTERNAL"
                        ? "Leave a handover note for the team…"
                        : "Write a thoughtful reply…"
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    maxLength={10000}
                    rows={4}
                  />
                  <div className="od-composer-footer">
                    {staff && visibility === "CUSTOMER" && (
                      <button
                        type="button"
                        className="od-secondary"
                        disabled={busy || Boolean(content.trim())}
                        onClick={draftReply}
                      >
                        Draft reply
                      </button>
                    )}
                    <small>
                      {needsDraftDetails
                        ? "Replace the draft placeholder with confirmed details before sending."
                        : "Messages stay in this case. No external email is sent."}
                    </small>
                    <button
                      className="od-primary"
                      disabled={busy || !content.trim() || needsDraftDetails}
                    >
                      <Send size={14} />
                      Send reply
                    </button>
                  </div>
                </form>
              </>
            ) : tab === "activity" ? (
              <div className="od-activity">
                <PageControls resource={activity} label="events" />
                {(activity.data?.items ?? []).map((e) => (
                  <div key={e.id}>
                    <span className="od-event-dot" />
                    <div>
                      <b>{human(e.kind)}</b>
                      <p>{e.text}</p>
                      <small>
                        {date(e.createdAt)} ·{" "}
                        {e.actorId === "system"
                          ? "Deadline monitor"
                          : data.people.find((p) => p.id === e.actorId)?.name ||
                            "Support team"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="od-supplier-panel">
                <div className="od-flex od-space">
                  <p>Separate conversations with your booking supplier.</p>
                  <button
                    className="od-secondary"
                    disabled={!t.bookingId || !active(t)}
                    onClick={() => setNewThread(true)}
                  >
                    <Plus size={15} />
                    Contact supplier
                  </button>
                </div>
                <PageControls resource={conversations} label="threads" singularLabel="thread" />
                {threads.length ? (
                  threads.map((c) => (
                    <SupplierConversation
                      key={c.id}
                      conversation={c}
                      data={data}
                      mutate={mutate}
                      busy={busy}
                    />
                  ))
                ) : (
                  <div className="od-empty">
                    <MessageSquare size={28} />
                    <h3>No supplier conversations yet</h3>
                    <p>
                      Contact the supplier to keep their updates connected to
                      this case.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
        <aside className="od-context">
          <section className="od-panel">
            <h3>Case details</h3>
            <label>
              Status
              {staff ? (
                <select
                  aria-label="Ticket status"
                  value={t.status}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (["RESOLVED", "CLOSED"].includes(next)) {
                      setResolutionStatus(next);
                      setShowResolve(true);
                    } else
                      void mutate(
                        `tickets/${t.id}`,
                        { status: next },
                        "Case status updated.",
                        "PATCH",
                      ).catch(() => {});
                  }}
                >
                  {[
                    "OPEN",
                    "IN_PROGRESS",
                    "WAITING_SUPPLIER",
                    "WAITING_CUSTOMER",
                    "RESOLVED",
                    "CLOSED",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge value={t.status} />
              )}
            </label>
            <label>
              Priority
              {staff ? (
                <select
                  aria-label="Ticket priority"
                  value={t.priority}
                  disabled={busy}
                  onChange={(e) =>
                    void mutate(
                      `tickets/${t.id}`,
                      {
                        priority: e.target.value,
                        reason: "Agent review from case workspace.",
                      },
                      "Priority updated.",
                      "PATCH",
                    ).catch(() => {})
                  }
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge value={t.priority} />
              )}
            </label>
            <label>
              Owner
              {manager ? (
                <DirectorySelect<Person>
                  path="people?kind=AGENT"
                  label="Assign agent"
                  refresh={data.now}
                  disabled={busy}
                  value={t.agentId || ""}
                  text={(p) =>
                    `${p.name}  -  ${p.region || ""}${p.available ? "" : " (unavailable)"}`
                  }
                  onSelect={(id) =>
                    void mutate(
                      `tickets/${t.id}`,
                      { agentId: id, reason: "Manager reassignment." },
                      "Assignment updated.",
                      "PATCH",
                    ).catch(() => {})
                  }
                >
                  <option value="">Unassigned</option>
                </DirectorySelect>
              ) : (
                <span>
                  {owner?.name || "Unassigned"}
                  {staff && !t.agentId && (
                    <button
                      className="od-text-button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          `tickets/${t.id}`,
                          { agentId: data.me.id },
                          "Case assigned to you.",
                          "PATCH",
                        ).catch(() => {})
                      }
                    >
                      Assign to me
                    </button>
                  )}
                </span>
              )}
            </label>
            <div className="od-detail-deadline">
              <Clock3 size={17} />
              <div>
                <b>
                  {active(t)
                    ? remaining(t.deadline, data.now)
                    : "Case completed"}
                </b>
                <small>Case deadline · {date(t.deadline)}</small>
                {t.responseDeadline && t.responseDeadline !== t.deadline && (
                  <small>Response target · {date(t.responseDeadline)}</small>
                )}
              </div>
            </div>
            {staff && active(t) && (
              <EscalateToEm id={t.id} busy={busy} mutate={mutate} />
            )}
          </section>
          <section className="od-panel">
            <h3>
              <BookOpen size={16} />
              Booking context
            </h3>
            {t.booking ? (
              <>
                <span className="od-booking-ref">
                  TBOH {t.booking.reference}
                  <ShieldCheck size={14} />
                </span>
                <h4>{t.booking.destination}</h4>
                <p>
                  {t.booking.service} · {human(t.booking.region)}
                </p>
                <BookingSchedule
                  booking={t.booking}
                  manager={data.me.kind === "MANAGER"}
                  busy={busy}
                  mutate={mutate}
                />
                {booking && (
                  <div className="od-context-line">
                    <Globe2 size={15} />
                    <span>
                      Supplier<b>{booking.supplier.name}</b>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>This case needs a verified booking reference.</p>
                {staff && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        `tickets/${t.id}`,
                        { bookingReference: verifiedRef },
                        "Booking linked.",
                        "PATCH",
                      ).catch(() => {});
                    }}
                  >
                    <input
                      aria-label="Verify booking reference (TBOH)"
                      value={verifiedRef}
                      onChange={(e) => setVerifiedRef(e.target.value)}
                      placeholder="BK-1042"
                      required
                    />
                    <button className="od-secondary" disabled={busy}>
                      Verify booking
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
          <section className="od-panel">
            <h3>
              <Layers3 size={16} />
              Connected history{" "}
              <span className="od-count">{history.data?.total ?? 0}</span>
            </h3>
            <PageControls resource={history} label="related cases" singularLabel="related case" />
            {related.length ? (
              related.map((v) => (
                <button
                  className="od-related"
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                >
                  <small>
                    {v.reference} · {human(v.status)}
                  </small>
                  <b>{v.title}</b>
                  <span>
                    {date(v.createdAt)}
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))
            ) : (
              <p>No other linked cases in your authorized history.</p>
            )}
          </section>
        </aside>
      </div>
      {staff && (
        <TicketSlaControls
          key={`${t.id}:${t.escalationOwnerId}:${t.escalationManual}:${t.escalationOverrideUntil}`}
          ticket={t}
          manager={manager}
          refresh={data.now}
          busy={busy}
          mutate={mutate}
        />
      )}
      {showResolve && (
        <Modal
          title={active(t) ? "Record the outcome" : "Reopen this case"}
          onClose={() => setShowResolve(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(
                `tickets/${t.id}`,
                { status: active(t) ? resolutionStatus : "OPEN", reason },
                "Case updated and outcome recorded.",
                "PATCH",
              )
                .then(() => {
                  setShowResolve(false);
                  setReason("");
                })
                .catch(() => {});
            }}
          >
            <label>
              {active(t)
                ? "What was resolved?"
                : "Why does this need another look?"}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={1000}
                rows={4}
              />
            </label>
            <div className="od-modal-actions">
              <button className="od-primary" disabled={busy}>
                Save outcome
              </button>
            </div>
          </form>
        </Modal>
      )}
      {newThread && (
        <Modal title="Contact the supplier" onClose={() => setNewThread(false)}>
          <p>
            This starts a separate thread with {booking?.supplier.name}.
            Customer messages and internal notes are not included.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(
                `tickets/${t.id}/conversations`,
                {
                  subject: `${t.booking?.reference}: ${t.title}`,
                  content: supplierContent,
                },
                "Supplier conversation opened.",
              )
                .then(() => {
                  setNewThread(false);
                  setSupplierContent("");
                  setTab("supplier");
                })
                .catch(() => {});
            }}
          >
            <label>
              Message
              <textarea
                value={supplierContent}
                onChange={(e) => setSupplierContent(e.target.value)}
                required
                rows={5}
              />
            </label>
            <div className="od-modal-actions">
              <button className="od-primary" disabled={busy}>
                <Send size={15} />
                Send to supplier thread
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
type ThreadRecipient = {
  kind: "EMAIL" | "USER";
  target: string;
  role: "TO" | "CC";
};
type ThreadRecipients = {
  configured: boolean;
  recipients: ThreadRecipient[];
  supplierEmail: string;
  members: { id: string; name: string }[];
};

function EditRecipients({
  id,
  now,
  busy,
  mutate,
  close,
}: {
  id: string;
  now: string;
  busy: boolean;
  mutate: Mutation;
  close: () => void;
}) {
  const path = `conversations/${id}/recipients`;
  const { data, error } = useOpsResource<ThreadRecipients>(path, now);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading recipients…</p>;
  const options: {
    kind: ThreadRecipient["kind"];
    target: string;
    label: string;
  }[] = [
    { kind: "EMAIL", target: data.supplierEmail, label: data.supplierEmail },
    ...data.members.map(({ id, name }) => ({
      kind: "USER" as const,
      target: id,
      label: name,
    })),
  ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const recipients = options.flatMap(({ kind, target }, index) => {
          const role = fields.get(`recipient-${index}`);
          return role ? [{ kind, target, role }] : [];
        });
        void mutate(path, { recipients }, "Thread recipients saved.", "PATCH")
          .then(close)
          .catch(() => {});
      }}
    >
      <fieldset>
        <legend>Supplier thread recipients</legend>
        {!data.configured && (
          <p>
            This thread is shared with the booked supplier. Saving limits access
            to the listed recipients.
          </p>
        )}
        {data.recipients.some(
          (r) =>
            !options.some(
              (option) => option.kind === r.kind && option.target === r.target,
            ),
        ) && (
          <p>
            Previously selected recipients who are no longer eligible will be
            removed on save.
          </p>
        )}
        {options.map(({ kind, target, label }, index) => (
          <label key={`${kind}:${target}`}>
            {label}
            <select
              name={`recipient-${index}`}
              defaultValue={
                data.recipients.find(
                  (r) => r.kind === kind && r.target === target,
                )?.role ?? ""
              }
            >
              <option value="">Excluded</option>
              <option value="TO">To</option>
              <option value="CC">Cc</option>
            </select>
          </label>
        ))}
      </fieldset>
      <button className="od-secondary" disabled={busy}>
        Save recipients
      </button>
    </form>
  );
}

export function SupplierConversation({
  conversation: c,
  data,
  mutate,
  busy,
}: {
  conversation: Conversation;
  data: Workspace;
  mutate: Mutation;
  busy: boolean;
}) {
  const [content, setContent] = useState("");
  const [editingRecipients, setEditingRecipients] = useState(false);
  const messages = useOpsPage<Message>(
    `conversations/${c.id}/messages`,
    data.now,
  );
  return (
    <article className="od-supplier-conversation">
      <div className="od-flex od-space">
        <div>
          <span className="od-eyebrow">{c.supplier.name}</span>
          <h3>{c.subject}</h3>
        </div>
        <Badge value={c.status} />
        {data.me.kind !== "SUPPLIER" && (
          <button
            className="od-text-button"
            disabled={busy}
            onClick={() =>
              void mutate(
                `conversations/${c.id}`,
                { status: c.status === "CLOSED" ? "AWAITING_REPLY" : "CLOSED" },
                "Supplier conversation updated.",
                "PATCH",
              ).catch(() => {})
            }
          >
            {c.status === "CLOSED" ? "Reopen thread" : "Close thread"}
          </button>
        )}
      </div>
      <small className="od-flex">
        <Clock3 size={12} /> Reply target: {date(c.dueAt)} ·{" "}
        {c.status === "CLOSED"
          ? "Conversation closed"
          : c.status === "REPLIED"
            ? "Reply received"
            : remaining(c.dueAt, data.now)}
      </small>
      {["AGENT", "MANAGER"].includes(data.me.kind) && (
        <>
          <button
            type="button"
            className="od-secondary"
            aria-expanded={editingRecipients}
            onClick={() => setEditingRecipients((open) => !open)}
          >
            {editingRecipients ? "Hide recipients" : "Edit recipients"}
          </button>
          {editingRecipients && (
            <EditRecipients
              id={c.id}
              now={data.now}
              busy={busy}
              mutate={mutate}
              close={() => setEditingRecipients(false)}
            />
          )}
        </>
      )}
      <PageControls resource={messages} label="supplier messages" />
      <Thread
        messages={[...(messages.data?.items ?? [])].reverse()}
        data={data}
      />
      {c.status !== "CLOSED" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              `conversations/${c.id}/reply`,
              { content },
              "Supplier thread updated.",
            )
              .then(() => setContent(""))
              .catch(() => {});
          }}
        >
          <textarea
            aria-label="Supplier reply"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              data.me.kind === "SUPPLIER"
                ? "Reply to the support team…"
                : "Follow up with the supplier…"
            }
            required
            maxLength={10000}
          />
          <button className="od-primary" disabled={busy || !content.trim()}>
            <Send size={14} />
            Send reply
          </button>
        </form>
      )}
    </article>
  );
}
export function SupplierDesk({
  data,
  busy,
  mutate,
}: {
  data: Workspace;
  busy: boolean;
  mutate: Mutation;
}) {
  const conversations = useOpsPage<Conversation>("conversations", data.now);
  const threads = conversations.data?.items ?? [];
  return (
    <>
      <div className="od-page-heading">
        <div>
          <span className="od-eyebrow">A DIRECT LINE TO THE SUPPORT TEAM</span>
          <h1>Your supplier conversations</h1>
          <p>
            Reply to the booking conversations shared with your supplier
            account.
          </p>
        </div>
        <span className="od-pill">
          <ShieldCheck size={14} />
          Shared threads only
        </span>
      </div>
      <div className="od-supplier-desk">
        <PageControls resource={conversations} label="threads" singularLabel="thread" />
        {threads.length ? (
          threads.map((c) => (
            <SupplierConversation
              key={c.id}
              conversation={c}
              data={data}
              mutate={mutate}
              busy={busy}
            />
          ))
        ) : (
          <div className="od-panel od-empty">
            <MessageSquare size={32} />
            <h3>No conversations shared yet</h3>
            <p>
              Support agents can contact your supplier from their booking
              workspace.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
