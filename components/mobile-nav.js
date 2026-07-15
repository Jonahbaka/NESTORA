"use client";

import Link from "next/link";
import { Compass, Heart, MessageCircle, UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/social", label: "Social", icon: UsersRound },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/my-nestora", label: "Profile", icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="App navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link href={href} key={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>;
      })}
    </nav>
  );
}
