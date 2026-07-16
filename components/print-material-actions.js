"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintMaterialActions() {
  return (
    <nav className="material-actions" aria-label="Marketing material actions">
      <Link className="button button--outline" href="/workspace/agent"><ArrowLeft size={17} /> Back to workspace</Link>
      <button className="button button--ink" type="button" onClick={() => window.print()}><Printer size={17} /> Print or save PDF</button>
    </nav>
  );
}
