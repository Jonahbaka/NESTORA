import { AuthPanel } from "@/components/auth-panel";
export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const requested = typeof params?.next === "string" ? params.next : "";
  const nextPath = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/my-nestora";
  return <AuthPanel nextPath={nextPath} />;
}
