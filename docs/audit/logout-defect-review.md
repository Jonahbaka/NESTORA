# Logout Defect Review

**Date:** 2026-07-17

---

## Reported Issue

Manual testing found:
1. No clear logout control
2. Clicking the gear icon logs the user out unexpectedly

---

## Code Analysis

### The Gear Icon

**File:** `components/my-nestora.js`, lines 20-21

```jsx
<button type="button" onClick={() => setTab("Account")} aria-label="Account settings">
  <Settings size={18} />
</button>
```

The gear icon is rendered inside the "My Nestora" header. Its `onClick` handler calls `setTab("Account")`, which switches the main content area to the Account tab. This is correct behavior - it does NOT log the user out.

### The Account Tab

**File:** `components/my-nestora.js`, lines 25-35 (`AccountSettings` function)

The Account tab contains:
1. A profile preferences form (name, home city, property interests, notification settings)
2. A "Security" link to `/trust`
3. A "Sign out" button that calls `signOut()`

### The signOut Function

**File:** `components/my-nestora.js`, lines 29-32

```jsx
async function signOut() {
  setSigningOut(true);
  try { await logout(); } catch (error) { notify(error.message); setSigningOut(false); }
}
```

### The logout Function (from Provider)

**File:** `components/providers.js`, lines 108-114

```jsx
const logout = useCallback(async () => {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("We could not sign you out. Please try again.");
  setAccount(null);
  setState(initialState);
  window.location.assign("/login");
}, []);
```

### The Logout API

**File:** `app/api/auth/logout/route.js`

```jsx
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }
}
```

---

## Root Cause Analysis

### Finding 1: No explicit logout in main navigation

The "My Nestora" page has no "Sign out" button in the header, sidebar, or main navigation. The only way to sign out is:
1. Navigate to the Account tab (by clicking the gear icon)
2. Click the "Sign out" button inside the Account tab

This is poor UX but not a defect.

### Finding 2: Gear icon does NOT log users out

The gear icon's `onClick` handler is `() => setTab("Account")`. This is a simple state change that switches the visible tab. It does NOT call `logout()` or `signOut()`.

**The gear icon does not log users out.** The reported behavior may be caused by:
1. The user clicking the "Sign out" button inside the Account tab (which appears after clicking the gear icon)
2. A session timeout or middleware redirect
3. A browser extension or caching issue

### Finding 3: Workspace has explicit sign-out

The professional workspace (`components/pro-workspace.js`, line 70) has an explicit "Sign out" button in the sidebar:

```jsx
<button type="button" onClick={() => logout()}>
  <LogOut size={17} />Sign out
</button>
```

This is correctly implemented and visible.

---

## Recommended Fixes

### Fix 1: Add explicit logout to My Nestora header

In `components/my-nestora.js`, add a "Sign out" button to the header area, alongside the gear icon:

```jsx
<button type="button" onClick={() => {
  if (window.confirm("Sign out of Nestora?")) logout();
}} aria-label="Sign out">
  <LogOut size={18} />
</button>
```

### Fix 2: Add logout to the user dropdown/avatar

The user avatar area in the My Nestora header could include a dropdown with "Sign out" option.

### Fix 3: Ensure gear icon is clearly labeled

The gear icon's `aria-label` is "Account settings" which is correct. No change needed.

---

## Conclusion

**The gear icon does NOT log users out.** It correctly opens the Account tab. The reported behavior is likely caused by:
1. User confusion between the Account tab and the sign-out button within it
2. The sign-out button being the most prominent action in the Account tab

The primary defect is the **lack of an explicit, clearly labeled "Sign out" control in the main navigation** of the My Nestora page. The professional workspace pages already have this control in the sidebar.