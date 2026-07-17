import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { recordMonitoringEvent } from "@/lib/server/audit";
import { hasDatabase } from "@/lib/server/db";
import { blockConversationParticipant, getConversation, listConversations, reportConversation, sendMessage, startListingConversation } from "@/lib/server/message-operations";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const writeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), conversationId: z.uuid(), body: z.string().trim().min(1).max(5000), clientNonce: z.uuid() }),
  z.object({ action: z.literal("startListing"), listingId: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(5000), clientNonce: z.uuid() }),
  z.object({ action: z.literal("report"), conversationId: z.uuid(), reason: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal("block"), conversationId: z.uuid(), reason: z.string().trim().max(500).optional() }),
]);

export async function GET(request) {
  if (!hasDatabase()) return unavailable();
  try {
    const context = await getWorkspaceContext();
    const conversationId = new URL(request.url).searchParams.get("conversation");
    if (conversationId) {
      const parsed = z.uuid().safeParse(conversationId);
      if (!parsed.success) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      return NextResponse.json(await getConversation({ userId: context.user.id, conversationId: parsed.data }), { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ conversations: await listConversations(context.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "messages.read");
  }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "messages", { limit: 120, windowMs: 60_000 });
    const parsed = writeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the message details and try again." }, { status: 400 });
    const context = await getWorkspaceContext();
    const input = parsed.data;
    const data = input.action === "send"
      ? { message: await sendMessage({ user: context.user, ...input }) }
      : input.action === "startListing"
        ? await startListingConversation({ user: context.user, ...input })
        : input.action === "report"
          ? { report: await reportConversation({ userId: context.user.id, ...input }) }
          : await blockConversationParticipant({ userId: context.user.id, ...input });
    return NextResponse.json(data, { status: input.action === "startListing" || input.action === "report" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error, "messages.write");
  }
}

function unavailable() {
  return NextResponse.json({ error: "Messaging is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function routeError(error, source) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  console.error("Messaging operation failed", { source, message: error.message });
  await recordMonitoringEvent({ level: "error", source, eventKey: "messaging_operation_failed", message: error.message }).catch(() => null);
  return unavailable();
}
