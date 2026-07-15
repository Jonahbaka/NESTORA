import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({ eyebrow, title, copy, href, action = "View all" }) {
  return (
    <div className="section-heading">
      <div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2>{copy ? <p>{copy}</p> : null}</div>
      {href ? <Link href={href}>{action}<ArrowRight size={17} /></Link> : null}
    </div>
  );
}
