import { getPool, query } from "@/lib/server/db";
import { recordMonitoringEvent } from "@/lib/server/audit";

export async function processDeliveryQueue({ limit = 20 } = {}) {
  const database = getPool();
  const client = await database.connect();
  let jobs = [];
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, user_id, organization_id, channel, destination, template_key, payload, attempts
       FROM delivery_jobs
       WHERE status IN ('queued', 'failed') AND next_attempt_at <= NOW() AND attempts < 6
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [limit],
    );
    jobs = result.rows;
    if (jobs.length) await client.query("UPDATE delivery_jobs SET status = 'processing', updated_at = NOW() WHERE id = ANY($1::uuid[])", [jobs.map((job) => job.id)]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }

  const results = [];
  for (const job of jobs) {
    try {
      const providerReference = await deliver(job);
      await query("UPDATE delivery_jobs SET status = 'sent', attempts = attempts + 1, provider_reference = $1, last_error = NULL, updated_at = NOW() WHERE id = $2", [providerReference, job.id]);
      results.push({ id: job.id, status: "sent" });
    } catch (error) {
      const attempts = Number(job.attempts) + 1;
      const delayMinutes = Math.min(60, 2 ** attempts);
      await query(
        `UPDATE delivery_jobs SET status = 'failed', attempts = attempts + 1, last_error = $1,
          next_attempt_at = NOW() + ($2 * INTERVAL '1 minute'), updated_at = NOW() WHERE id = $3`,
        [String(error.message).slice(0, 1000), delayMinutes, job.id],
      );
      await recordMonitoringEvent({ level: attempts >= 5 ? "critical" : "warning", source: "delivery-worker", eventKey: "external_delivery_failed", message: error.message, userId: job.user_id, organizationId: job.organization_id, metadata: { jobId: job.id, channel: job.channel, attempts } });
      results.push({ id: job.id, status: "failed" });
    }
  }
  return { claimed: jobs.length, sent: results.filter((item) => item.status === "sent").length, failed: results.filter((item) => item.status === "failed").length };
}

async function deliver(job) {
  const endpoint = process.env.NESTORA_DELIVERY_WEBHOOK_URL;
  if (!endpoint) {
    if (process.env.NODE_ENV !== "production" && process.env.NESTORA_CAPTURE_DELIVERY === "true") return "local-capture";
    throw new Error("External delivery provider is not configured");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.NESTORA_DELIVERY_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.NESTORA_DELIVERY_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ id: job.id, channel: job.channel, destination: job.destination, template: job.template_key, data: job.payload }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Delivery provider returned HTTP ${response.status}`);
  const payload = await response.json().catch(() => ({}));
  return String(payload.id || payload.reference || `http-${response.status}`).slice(0, 500);
}
