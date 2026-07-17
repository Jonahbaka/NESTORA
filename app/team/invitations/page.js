import { TeamInvitationResponse } from "@/components/team-invitation-response";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TeamInvitationPage({ searchParams }) {
  const token = String((await searchParams).token || "");
  return <main className="invitation-page"><TeamInvitationResponse token={token} /></main>;
}
