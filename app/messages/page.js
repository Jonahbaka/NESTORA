import { Suspense } from "react";
import { MessagesWorkspace } from "@/components/messages-workspace";

export const metadata = { title: "Messages" };
export default function MessagesPage() { return <Suspense fallback={<div className="page-loading">Opening your conversations…</div>}><MessagesWorkspace /></Suspense>; }
