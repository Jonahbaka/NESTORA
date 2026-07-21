import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { recordMonitoringEvent } from "@/lib/server/audit";
import { hasDatabase } from "@/lib/server/db";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";
import { readAdministration, writeAdministration } from "@/lib/server/workspace-operations";

export const dynamic = "force-dynamic";

const createPlanSchema = z.object({ action: z.literal("createPlan"), planId: z.string().trim().min(1).max(80), name: z.string().trim().min(2).max(100), audience: z.string().trim().max(200).optional(), monthlyPriceNgn: z.number().int().nonnegative(), annualPriceNgn: z.number().int().nonnegative().nullable().optional(), limits: z.record(z.any()), features: z.array(z.string()), isActive: z.boolean().optional() });
const updatePlanSchema = z.object({ action: z.literal("updatePlan"), planId: z.string().trim().min(1).max(80), name: z.string().trim().min(2).max(100), audience: z.string().trim().max(200).optional(), monthlyPriceNgn: z.number().int().nonnegative(), annualPriceNgn: z.number().int().nonnegative().nullable().optional(), limits: z.record(z.any()), features: z.array(z.string()), isActive: z.boolean().optional() });
const adminWriteSchema = z.discriminatedUnion("action", [createPlanSchema, updatePlanSchema, z.object({ action: z.literal("subscription"), subjectType: z.enum(["user", "organization"]), subjectId: z.string().trim().min(1), planId: z.string().trim().min(1).max(80), status: z.string().trim().min(1).max(40), reason: z.string().trim().min(5).max(2000) }), z.object({ action: z.literal("suspendWebsite"), websiteId: z.string().trim().min(1), reason: z.string().trim().min(5).max(2000) }), z.object({ action: z.literal("reinstateWebsite"), websiteId: z.string().trim().min(1) })]);

export async function GET(request, { params }) {
  const { resource } = await params;
  if (!hasDatabase()) return unavailable();
  try {
    const workspace = new URL(request.url).searchParams.get("workspace") || undefined;
    const context = await getWorkspaceContext({ workspace });
    const data = await readAdministration(context);
    return NextResponse.json({ ...data, account: publicContext(context) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, { source: `workspace.${resource}.read` });
  }
}

export async function POST(request, { params }) {
  const { resource } = await params;
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, `workspace-${resource}`, { limit: 90, windowMs: 60_000 });
    const parsed = adminWriteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the submitted details and try again.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
    const workspace = new URL(request.url).searchParams.get("workspace") || undefined;
    const context = await getWorkspaceContext({ workspace });
    const data = await writeAdministration(parsed.data, context);
    return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error, { source: `workspace.${resource}.write` });
  }
}

function publicContext(context) {
  return { id: context.user.id, name: context.user.name, email: context.user.email, role: context.user.role, workspace: context.workspace, organization: context.organization ? { id: context.organization.id, name: context.organization.name, kind: context.organization.kind, role: context.membership?.role } : null, canModerate: context.canModerate };
}

function unavailable() {
  return NextResponse.json({ error: "Workspace data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function routeError(error, { source }) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  if (error?.code === "23505") return NextResponse.json({ error: "That code or identifier is already in use." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  console.error("Workspace operation failed", { source, message: error.message });
  await recordMonitoringEvent({ level: "error", source, eventKey: "workspace_operation_failed", message: error.message }).catch(() => null);
  return unavailable();
}