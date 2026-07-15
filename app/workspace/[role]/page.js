import { notFound } from "next/navigation";
import { ProWorkspace } from "@/components/pro-workspace";
const roles = ["agent", "host", "developer", "agency"];
export function generateStaticParams() { return roles.map((role) => ({ role })); }
export async function generateMetadata({ params }) { const { role } = await params; return { title: `${role.replace(/^./, (letter) => letter.toUpperCase())} workspace` }; }
export default async function RoleWorkspace({ params }) { const { role } = await params; if (!roles.includes(role)) notFound(); return <ProWorkspace role={role} />; }
