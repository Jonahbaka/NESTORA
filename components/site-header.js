"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, LogOut, Menu, MessageCircle, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/site-content";
import { Brand } from "@/components/brand";
import { useNestora } from "@/components/providers";
import { roleDestination } from "@/lib/role-destination";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { account, accountReady, saved, notifications, clearNotifications, logout } = useNestora();
  const authReady = mounted && accountReady;
  const visibleAccount = authReady ? account : null;
  const savedCount = mounted ? saved.length : 0;
  const unreadCount = mounted ? notifications : 0;
  const accountPath = visibleAccount ? roleDestination(visibleAccount.role) : "/my-nestora";
  const professionalPath = visibleAccount && visibleAccount.role !== "member" ? roleDestination(visibleAccount.role) : "/workspace";

  useEffect(() => { setMounted(true); }, []);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setOpen(false);
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
      setSigningOut(false);
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="icon-button hide-mobile" href="/search" aria-label="Search"><Search size={19} /></Link>
          <Link className="icon-button hide-mobile badge-wrap" href="/saved" aria-label={`${savedCount} saved homes`}><Heart size={19} /><span>{savedCount}</span></Link>
          <Link className="icon-button hide-mobile" href="/messages" aria-label="Messages"><MessageCircle size={19} /></Link>
          <button className="icon-button hide-mobile badge-wrap" type="button" onClick={clearNotifications} aria-label={`${unreadCount} unread notifications`} disabled={!mounted}><Bell size={19} />{unreadCount ? <span>{unreadCount}</span> : null}</button>
          {!authReady ? null : visibleAccount ? (
            <>
              <Link className="button button--ink hide-tablet" href={professionalPath}>{visibleAccount.role !== "member" ? "Dashboard" : "My Nestora"}</Link>
              <button className="button button--outline hide-tablet" type="button" onClick={handleLogout} disabled={signingOut}><LogOut size={17} />{signingOut ? "Logging out…" : "Logout"}</button>
              <Link className="icon-button hide-mobile" href={accountPath} aria-label="Account"><UserRound size={20} /></Link>
            </>
          ) : (
            <>
              <Link className="button button--outline hide-tablet" href="/login">Login</Link>
              <Link className="button button--coral hide-tablet" href="/login?mode=register">Sign up</Link>
              <Link className="icon-button hide-mobile" href="/login" aria-label="Login"><UserRound size={20} /></Link>
            </>
          )}
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      {logoutError ? <p className="header-auth-error" role="alert">{logoutError}</p> : null}
      {open ? (
        <div className="mobile-menu" id="mobile-menu">
          <nav aria-label="Mobile menu">
            {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
            <Link href="/nora" onClick={() => setOpen(false)}>Ask Nora</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Plans and pricing</Link>
            {visibleAccount ? (
              <>
                <Link href={professionalPath} onClick={() => setOpen(false)}>Dashboard</Link>
                <Link href={accountPath} onClick={() => setOpen(false)}>My Nestora</Link>
                <button type="button" onClick={handleLogout} disabled={signingOut}><LogOut size={17} />{signingOut ? "Logging out…" : "Logout"}</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
                <Link href="/login?mode=register" onClick={() => setOpen(false)}>Sign up</Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
