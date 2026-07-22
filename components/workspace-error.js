"use client";

import { ShieldCheck, LogIn, AlertCircle, Building2 } from "lucide-react";
import Link from "next/link";

export function WorkspaceError({ message, retry }) {
  const errorState = classifyError(message);

  if (errorState.type === "auth") {
    return (
      <div className="workspace-placeholder error-state">
        <LogIn size={27} />
        <h2>Sign in required</h2>
        <p>Create a professional account to access the workspace.</p>
        <div className="workspace-error-actions">
          <Link className="button button--coral" href="/login?mode=register&next=/workspace">Create account</Link>
          <Link className="button button--outline" href="/login?next=/workspace">Sign in</Link>
        </div>
      </div>
    );
  }

  if (errorState.type === "onboarding") {
    return (
      <div className="workspace-placeholder onboarding-state">
        <Building2 size={27} />
        <h2>Set up your workspace</h2>
        <p>{errorState.description}</p>
        <div className="workspace-error-actions">
          <Link className="button button--coral" href="/pricing">See plans and pricing</Link>
          <button className="button button--outline" type="button" onClick={retry}>Refresh</button>
        </div>
      </div>
    );
  }

  if (errorState.type === "access") {
    return (
      <div className="workspace-placeholder error-state">
        <AlertCircle size={27} />
        <h2>Access required</h2>
        <p>{message}</p>
        <div className="workspace-error-actions">
          <button className="button button--ink" type="button" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-placeholder error-state">
      <ShieldCheck size={27} />
      <h2>Workspace unavailable</h2>
      <p>{message}</p>
      {retry && <button className="button button--ink" type="button" onClick={retry}>Try again</button>}
    </div>
  );
}

function classifyError(message) {
  const lower = message?.toLowerCase() || "";
  if (lower.includes("sign in") || lower.includes("sign in required") || lower.includes("account is not active")) {
    return { type: "auth", description: "Access to this workspace requires an active professional account." };
  }
  if (lower.includes("organization membership") || lower.includes("professional account")) {
    return { type: "onboarding", description: "Create or join an organization to use professional workspace features." };
  }
  if (lower.includes("do not have access") || lower.includes("forbidden")) {
    return { type: "access", description: "You do not have permission to access this resource." };
  }
  return { type: "generic", description: message };
}
