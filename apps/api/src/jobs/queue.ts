// BullMQ/Redis removed — background jobs run synchronously in-process.
// Exported queue refs are kept as null so call-sites don't need changes.

export const schemaSyncQueue = null;
export const reportDeliveryQueue = null;
export const alertQueue = null;

export async function startWorkers(): Promise<void> {
  // No-op: background job workers removed (no Redis/BullMQ in dev mode).
}
