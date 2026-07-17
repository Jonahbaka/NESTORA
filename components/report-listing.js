"use client";

import Link from "next/link";
import { Flag, X } from "lucide-react";
import { useState } from "react";

export function ReportListing({ listingId }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/listing-reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId, reason: form.get("reason") }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("idle");
      setError(payload.error || "This report could not be submitted.");
      return;
    }
    setStatus("sent");
  }

  if (!open) return <button className="report-listing__trigger" type="button" onClick={() => setOpen(true)}><Flag size={16} />Report listing</button>;
  return (
    <section className="report-listing" aria-live="polite">
      <button className="report-listing__close" type="button" onClick={() => setOpen(false)} aria-label="Close report form"><X size={16} /></button>
      {status === "sent" ? <><strong>Report received</strong><p>Nestora&apos;s moderation team will review the listing and the context you provided.</p></> : <form onSubmit={submit}><strong>Report this listing</strong><label>What should our moderation team review?<textarea name="reason" minLength={10} maxLength={2000} required /></label><button className="button button--outline" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Submitting..." : "Submit report"}</button>{error ? <p className="inquiry-error" role="alert">{error} {error.toLowerCase().includes("sign in") ? <Link href={`/login?next=/properties/${listingId}`}>Sign in</Link> : null}</p> : null}</form>}
    </section>
  );
}
