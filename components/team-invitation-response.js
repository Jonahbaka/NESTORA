"use client";

import Link from "next/link";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function TeamInvitationResponse({ token }) {
  const [state, setState] = useState({ status: "loading", invitation: null, error: "" });

  useEffect(() => {
    if (!token) { setState({ status: "error", invitation: null, error: "Invitation not found." }); return; }
    fetch(`/api/team-invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, status: response.status, payload: await response.json().catch(() => ({})) }))
      .then(({ ok, status, payload }) => setState(ok ? { status: "ready", invitation: payload.invitation, error: "" } : { status: status === 401 ? "signin" : "error", invitation: null, error: payload.error || "Invitation not found." }))
      .catch(() => setState({ status: "error", invitation: null, error: "Team invitations are temporarily unavailable." }));
  }, [token]);

  async function respond(action) {
    setState((current) => ({ ...current, status: "submitting" }));
    const response = await fetch("/api/team-invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setState((current) => ({ ...current, status: response.status === 401 ? "signin" : "error", error: payload.error || "The invitation could not be updated." })); return; }
    if (action === "accept") { window.location.assign(payload.destination); return; }
    setState({ status: "declined", invitation: state.invitation, error: "" });
  }

  const next = `/team/invitations?token=${encodeURIComponent(token)}`;
  return <section className="invitation-card"><span className="invitation-card__icon"><Building2 size={25} /></span><p className="eyebrow">Nestora team access</p>{state.status === "loading" ? <><h1>Checking your invitation</h1><p>Please wait while Nestora verifies the secure invitation.</p></> : state.status === "signin" ? <><h1>Sign in to continue</h1><p>Use the email address that received this team invitation.</p><Link className="button button--ink" href={`/login?next=${encodeURIComponent(next)}`}>Sign in securely</Link></> : state.status === "declined" ? <><CheckCircle2 size={25} /><h1>Invitation declined</h1><p>No team access was added to your account.</p><Link className="button button--outline" href="/">Return home</Link></> : state.status === "error" ? <><h1>Invitation unavailable</h1><p role="alert">{state.error}</p><Link className="button button--outline" href="/help">Get support</Link></> : <><h1>Join {state.invitation.organizationName}</h1><p>You were invited as <strong>{humanize(state.invitation.role)}</strong> using {state.invitation.email}.</p><div className="invitation-card__assurance"><ShieldCheck size={18} />Access is tenant-scoped and every administrative change is audited.</div><div className="invitation-card__actions"><button className="button button--ink" type="button" disabled={state.status === "submitting"} onClick={() => respond("accept")}>Accept invitation</button><button className="button button--outline" type="button" disabled={state.status === "submitting"} onClick={() => respond("decline")}>Decline</button></div></>}</section>;
}

function humanize(value) { return String(value || "").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
