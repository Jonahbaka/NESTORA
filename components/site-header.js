"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, Menu, MessageCircle, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/site-content";
import { Brand } from "@/components/brand";
import { useNestora } from "@/components/providers";
import { roleDestination } from "@/lib/role-destination";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { account, saved, notifications, clearNotifications } = useNestora();
  const visibleAccount = mounted ? account : null;
  const savedCount = mounted ? saved.length : 0;
  const unreadCount = mounted ? notifications : 0;
  const accountPath = visibleAccount ? roleDestination(visibleAccount.role) : "/my-nestora";
  const professionalPath = visibleAccount && visibleAccount.role !== "member" ? roleDestination(visibleAccount.role) : "/workspace";

  useEffect(() => { setMounted(true); }, []);

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
          <Link className="button button--ink hide-tablet" href={professionalPath}>{visibleAccount && visibleAccount.role !== "member" ? "Open workspace" : "List your space"}</Link>
          <Link className="icon-button hide-mobile" href={accountPath} aria-label={visibleAccount ? "Open account" : "Sign in"}><UserRound size={20} /></Link>
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      {open ? (
        <div className="mobile-menu" id="mobile-menu">
          <nav aria-label="Mobile menu">
            {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
            <Link href="/nora" onClick={() => setOpen(false)}>Ask Nora</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Plans and pricing</Link>
            <Link href={professionalPath} onClick={() => setOpen(false)}>Professional workspace</Link>
            <Link href={accountPath} onClick={() => setOpen(false)}>{visibleAccount && visibleAccount.role !== "member" ? "Open workspace" : "My Nestora"}</Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
