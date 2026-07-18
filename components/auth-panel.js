"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export function AuthPanel({ nextPath = null, initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode === "register" ? "register" : "signin");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (nextPath) body.next = nextPath;
    try {
      const response = await fetch(`/api/auth/${mode === "signin" ? "login" : "register"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "We could not complete that request.");
      setStatus({ ok: true, text: mode === "signin" ? "Welcome back. Opening your workspace..." : "Your account is ready. Opening My Nestora..." });
      window.setTimeout(() => { window.location.assign(payload.destination || "/my-nestora"); }, 500);
    } catch (error) {
      setStatus({ ok: false, text: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual__media"><Image src="/images/nestora/hero-abuja-residence.webp" alt="A welcoming contemporary Abuja home at sunset" fill priority sizes="(max-width: 850px) 100vw, 54vw" /></div>
        <span />
        <div>
          <p className="eyebrow">Find your place. Feel at home.</p>
          <p className="auth-visual__title">Your next chapter,<br />kept together.</p>
          <ul><li><Check size={17} />Save and compare places</li><li><Check size={17} />Track bookings and inspections</li><li><Check size={17} />Message verified professionals</li></ul>
        </div>
      </div>
      <div className="auth-main">
        <Link className="auth-back" href="/">Nestora</Link>
        <div className="auth-card">
          <span className="auth-lock"><LockKeyhole size={22} /></span>
          <p className="eyebrow">Secure account access</p>
          <h1>{mode === "signin" ? "Welcome back." : "Create your Nestora account."}</h1>
          <p>{mode === "signin" ? "Sign in to continue your property journey." : "One account for stays, homes, saved places and conversations."}</p>
          <div className="auth-switch">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" ? <label><span><UserRound size={15} />Full name</span><input name="name" autoComplete="name" required minLength="2" /></label> : null}
            <label><span><Mail size={15} />Email address</span><input name="email" type="email" autoComplete="email" required /></label>
            <label><span><LockKeyhole size={15} />Password</span><div><input name="password" type={show ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength="10" required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {mode === "signin" ? <div className="auth-options"><label><input type="checkbox" name="remember" />Keep me signed in</label><Link href="/help">Forgot password?</Link></div> : <p className="password-hint">Use at least 10 characters. A long, unique passphrase works best.</p>}
            {status ? <p className={`auth-status ${status.ok ? "success" : "error"}`} role="status">{status.text}</p> : null}
            <button className="button button--coral auth-submit" type="submit" disabled={!mounted || loading}>{loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}<ArrowRight size={17} /></button>
          </form>
          <div className="auth-trust"><ShieldCheck size={17} /><span><strong>Protected access</strong>Your password is hashed and sensitive account actions require fresh authentication.</span></div>
          <small>By continuing, you agree to Nestora&apos;s <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Notice</Link>.</small>
        </div>
      </div>
    </div>
  );
}
