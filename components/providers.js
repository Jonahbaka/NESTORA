"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const NestoraContext = createContext(null);
const initialState = {
  saved: [],
  bookings: [],
  inspections: [],
  joinedCommunities: [],
  following: [],
  reactions: [],
  notifications: 3,
};

export function NestoraProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [account, setAccount] = useState(null);
  const [accountReady, setAccountReady] = useState(false);
  const [toast, setToast] = useState(null);
  const stateRef = useRef(initialState);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("nestora-state-v1");
      if (stored) setState({ ...initialState, ...JSON.parse(stored), bookings: [], inspections: [] });
    } catch {
      window.localStorage.removeItem("nestora-state-v1");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("nestora-state-v1", JSON.stringify({ ...state, bookings: [], inspections: [] }));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;
    async function syncAccount() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) return;
        const { user } = await sessionResponse.json();
        if (!user || cancelled) return;
        setAccount(user);
        const stateResponse = await fetch("/api/account/state", { cache: "no-store" });
        if (!stateResponse.ok) return;
        const { state: serverState } = await stateResponse.json();
        if (cancelled) return;
        const localState = stateRef.current;
        const markKeys = ["saved", "following", "joinedCommunities", "reactions"];
        const mergedMarks = Object.fromEntries(markKeys.map((key) => [key, [...new Set([...(serverState[key] || []), ...(localState[key] || [])])]]));
        const missingMarks = markKeys.flatMap((key) => (localState[key] || []).filter((value) => !(serverState[key] || []).includes(value)).map((value) => ({ type: "mark", key, value, enabled: true })));
        await Promise.all(missingMarks.map((body) => writeAccountActivity(body).catch(() => null)));
        if (!cancelled) setState((current) => ({ ...current, ...serverState, ...mergedMarks, notifications: current.notifications }));
      } catch {
        // Guest and temporarily offline sessions retain their local discovery state.
      } finally {
        if (!cancelled) setAccountReady(true);
      }
    }
    syncAccount();
    return () => { cancelled = true; };
  }, [hydrated]);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const toggleIn = useCallback((key, value, labels, { guestAllowed = false } = {}) => {
    if (!account && !guestAllowed) {
      notify(accountReady ? "Sign in to keep this activity with your account." : "Checking your account access. Please try again in a moment.");
      return;
    }
    const exists = stateRef.current[key].includes(value);
    notify(exists ? labels.removed : labels.added);
    setState((current) => ({ ...current, [key]: exists ? current[key].filter((item) => item !== value) : [...new Set([...current[key], value])] }));
    if (account) {
      writeAccountActivity({ type: "mark", key, value, enabled: !exists }).catch(() => {
        setState((latest) => ({ ...latest, [key]: exists ? [...new Set([...latest[key], value])] : latest[key].filter((item) => item !== value) }));
        notify("We could not keep that change. Please try again.");
      });
    }
  }, [account, accountReady, notify]);

  const createRequest = useCallback(async (type, request) => {
    if (!account) {
      const error = new Error(accountReady ? "Sign in to send and track this request." : "Checking your account access. Please try again in a moment.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    const { record } = await writeAccountActivity({ type, ...request });
    const key = type === "booking" ? "bookings" : "inspections";
    setState((current) => ({ ...current, [key]: [record, ...current[key].filter((item) => item.id !== record.id)] }));
    notify(type === "booking" ? "Request sent. You can track it in My Nestora." : "Inspection requested. The advisor has been notified.");
    return record;
  }, [account, accountReady, notify]);

  const value = useMemo(() => ({
    ...state,
    account,
    accountReady,
    hydrated,
    toggleSaved: (id) => toggleIn("saved", id, { added: "Saved to your shortlist", removed: "Removed from your shortlist" }, { guestAllowed: true }),
    toggleFollow: (id) => toggleIn("following", id, { added: "You are now following this profile", removed: "Profile unfollowed" }),
    toggleCommunity: (id) => toggleIn("joinedCommunities", id, { added: "Community joined", removed: "You left the community" }),
    toggleReaction: (id) => toggleIn("reactions", id, { added: "Post appreciated", removed: "Reaction removed" }),
    addBooking: (booking) => createRequest("booking", booking),
    addInspection: (inspection) => createRequest("inspection", inspection),
    notify,
    clearNotifications: () => setState((current) => ({ ...current, notifications: 0 })),
  }), [account, accountReady, createRequest, hydrated, notify, state, toggleIn]);

  return (
    <NestoraContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={19} aria-hidden="true" />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={17} /></button>
        </div>
      ) : null}
    </NestoraContext.Provider>
  );
}

async function writeAccountActivity(body) {
  const response = await fetch("/api/account/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Account activity is temporarily unavailable.");
  return payload;
}

export function useNestora() {
  const context = useContext(NestoraContext);
  if (!context) throw new Error("useNestora must be used inside NestoraProvider");
  return context;
}
