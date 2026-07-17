import { AuthPanel } from "@/components/auth-panel";
import { safeInternalPath } from "@/lib/role-destination";
export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params?.next);
  const initialMode = params?.mode === "register" ? "register" : "signin";
  return <AuthPanel nextPath={nextPath} initialMode={initialMode} />;
}
