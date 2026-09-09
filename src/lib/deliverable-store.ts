import type { Evidence } from "./domain";

/**
 * In-memory demo store. Replace with a persistent KV/DB for production; on
 * Vercel serverless this does NOT persist across invocations, and it is not
 * shared with the seller-runner (a separate long-running process). This exists
 * so the deliverable API route has a concrete read path to wire up now.
 */
const store = new Map<string, Evidence>();

export function putDeliverable(jobId: string, evidence: Evidence): void {
  store.set(jobId, evidence);
}

export function getDeliverable(jobId: string): Evidence | undefined {
  return store.get(jobId);
}

