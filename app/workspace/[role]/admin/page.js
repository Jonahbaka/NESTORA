import { AdminConsole } from "@/components/admin-console";

export const dynamic = "force-dynamic";

export default async function WorkspaceAdmin({ params }) {
  const { role } = await params;
  const data = await fetchData(role);
  return <AdminConsole role={role} data={data} />;
}

async function fetchData(role) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
    const response = await fetch(`${base}/api/workspace/admin?workspace=${role}`, { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}