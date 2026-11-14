"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  Plane,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Skiper40Link } from "@/components/ui/skiper40-link";
export function OpsLogin({ onLogin }: { onLogin: () => Promise<void> }) {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("manager@opsdesk.demo"),
    [password, setPassword] = useState("OpsDeskDemo!2026"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Unable to sign in.");
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const roles = [
    [
      "Manager",
      "manager",
      "Full access",
      "Oversee response deadlines, team routing and escalations.",
    ],
    [
      "Asia agent",
      "asia",
      "Regional queue",
      "Handle assigned conversations and urgent travel support in Asia.",
    ],
    [
      "Agency",
      "agency",
      "Agency portal",
      "Manage your agency’s bookings, support cases and booking requests.",
    ],
    [
      "Traveler",
      "maya",
      "Maya Sen",
      "Find your bookings, follow your cases and contact the team.",
    ],
    [
      "Supplier",
      "supplier",
      "Partner desk",
      "Reply to the supplier conversations shared with your team.",
    ],
  ];
  return (
    <main className="od-login od-editorial-login">
      <section
        className="od-login-form"
        id="workspace-sign-in"
        aria-labelledby="workspace-sign-in-heading"
        tabIndex={-1}
      >
        <div className="od-login-masthead">
          <span className="od-editorial-wordmark">OpsDesk</span>
          <span className="od-eyebrow">TRAVEL SUPPORT</span>
          <span className="od-pill">Synthetic demo workspace</span>
        </div>
        <h1 id="workspace-sign-in-heading">
          Step into connected
          <br />
          travel operations.
        </h1>
        <p>
          Choose a role to explore booking-linked cases, supplier conversations
          and response deadlines.
        </p>
        <div className="od-demo-accounts">
          <span className="sr-only">Explore a role</span>
          <div>
            {roles.map(([label, id, badge, description], index) => (
              <button
                key={id}
                type="button"
                aria-pressed={email === `${id}@opsdesk.demo`}
                disabled={busy}
                onClick={() => {
                  setEmail(`${id}@opsdesk.demo`);
                  setPassword("OpsDeskDemo!2026");
                }}
              >
                <span className="od-role-dot" aria-hidden="true" />
                <span className="od-role-copy">
                  <span>
                    <b>{label}</b>
                    <em>{badge}</em>
                  </span>
                  <small>{description}</small>
                </span>
                <span className="od-role-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={login} aria-busy={busy}>
          <div className="od-login-fields">
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </div>
          {error && (
            <p className="od-error" role="alert">
              {error}
            </p>
          )}
          <div className="od-login-actions">
            <button className="od-primary" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="od-spin"
                    aria-hidden="true"
                  />{" "}
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to workspace{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
            <Skiper40Link href="/login">
              Use your account <ArrowUpRight size={15} aria-hidden="true" />
            </Skiper40Link>
          </div>
        </form>
      </section>
      <aside
        className="od-login-story"
        aria-label="Example connected support case"
      >
        <div className="od-login-preview-label">
          <span className="od-eyebrow">CONNECTED CASE PREVIEW</span>
          <span className="od-pill">Synthetic example</span>
        </div>
        <motion.div
          className="od-login-card"
          initial={reduceMotion ? false : { y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        >
          <div className="od-login-case-label">
            <Plane size={15} aria-hidden="true" /> BOOKING-LINKED SUPPORT
          </div>
          <h2>Case #BK-1042</h2>
          <div className="od-preview-message">
            <small>Traveler message · Maya Sen</small>
            <p>“We arrive tomorrow. Has the hotel confirmed our booking?”</p>
          </div>
          <div className="od-flex">
            <span className="od-avatar">MS</span>
            <div>
              <b>Maya Sen</b>
              <small>Bali · Booking BK-1042</small>
            </div>
          </div>
          <div className="od-preview-facts">
            <div>
              <small>Booking context</small>
              <b>Connected history</b>
            </div>
            <div>
              <small>Team ownership</small>
              <b>Assigned specialist</b>
            </div>
          </div>
          <div className="od-login-timeline">
            <CheckCircle2 size={16} aria-hidden="true" /> Previous conversations
            linked
          </div>
        </motion.div>
        <div className="od-login-proof">
          <div>
            <b>One case</b>
            <span>Booking and history</span>
          </div>
          <div>
            <b>Five roles</b>
            <span>Scoped workspaces</span>
          </div>
          <div>
            <b>One trail</b>
            <span>Audited activity</span>
          </div>
        </div>
        <p className="od-login-footnote">
          Great trips deserve connected support. Explore with fictional records;
          each role’s access is enforced by the server.
        </p>
      </aside>
    </main>
  );
}
