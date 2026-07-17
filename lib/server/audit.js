import { query } from "@/lib/server/db";

export async function recordAuditEvent({ actorId, action, targetType, targetId, metadata = {}, runQuery = query }) {
  await runQuery(
    "INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [actorId, action, targetType, String(targetId), JSON.stringify(metadata)],
  );
}

export async function recordMonitoringEvent({ level = "error", source, eventKey, message, userId = null, organizationId = null, metadata = {}, runQuery = query }) {
  try {
    await runQuery(
      `INSERT INTO monitoring_events (level, source, event_key, user_id, organization_id, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [level, source, eventKey, userId, organizationId, message, JSON.stringify(metadata)],
    );
  } catch (error) {
    console.error("Monitoring event could not be recorded", { source, eventKey, message: error.message });
  }
}
