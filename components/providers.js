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
  notifications: 0,
  notificationItems: [],
};

const guestStorageKey = "nestora-guest-state-v2";

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
      window.localStorage.removeItem("nestora-state-v1");
      const stored = window.localStorage.getItem(guestStorageKey);
      if (stored) setState({ ...initialState, ...JSON.parse(stored), bookings: [], inspections: [] });
    } catch {
      window.localStorage.removeItem(guestStorageKey);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && accountReady && !account) window.localStorage.setItem(guestStorageKey, JSON.stringify({ ...state, bookings: [], inspections: [] }));
  }, [account, accountReady, hydrated, state]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;

    function scheduleSync() {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(syncAccount, { timeout: 1500 });
      } else {
        timeoutHandle = window.setTimeout(syncAccount, 0);
      }
    }

    async function syncAccount() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) return;
        const { user } = await sessionResponse.json();
        if (!user || cancelled) return;
        setAccount(user);
        const [stateResponse, notificationResponse] = await Promise.all([
          fetch("/api/account/state", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
        ]);
        if (!stateResponse.ok) return;
        const { state: serverState } = await stateResponse.json();
        const notificationPayload = notificationResponse.ok ? await notificationResponse.json() : { notifications: [], unread: 0 };
        if (cancelled) return;
        if (!cancelled) setState({ ...initialState, ...serverState, notifications: notificationPayload.unread, notificationItems: notificationPayload.notifications });
      } catch {
        // Guest and temporarily offline sessions retain their local discovery state.
      } finally {
        if (!cancelled) setAccountReady(true);
      }
    }

    if (document.readyState === "complete") scheduleSync();
    else window.addEventListener("load", scheduleSync, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleSync);
      if (idleHandle != null) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
    };
  }, [hydrated]);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const toggleIn = useCallback((key, value, labels, { guestAllowed = false } = {}) => {
    if (!accountReady) {
      notify("Checking your account access. Please try again in a moment.");
      return;
    }
    if (!account && !guestAllowed) {
      notify("Sign in to keep this activity with your account.");
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

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("We could not sign you out. Please try again.");
    setAccount(null);
    setState(initialState);
    window.location.assign("/login");
  }, []);

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
    logout,
    clearNotifications: async () => {
      if (account) await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
      setState((current) => ({ ...current, notifications: 0, notificationItems: current.notificationItems.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })) }));
    },
  }), [account, accountReady, createRequest, hydrated, logout, notify, state, toggleIn]);

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
