import type { Evidence, OnchainJobState, Session } from "./domain";

export type AppState =
  | "draft"
  | "quoted"
  | "user-confirmed"
  | "paid"
  | "running"
  | "delivered"
  | "verifying"
  | "accepted"
  | "needs-review"
  | "failed"
  | "expired";

/**
 * Application flow is not an SDK's native state. This is the explicit
 * mapping so the UI never claims "running" while the chain says otherwise.
 */
export const APP_TO_ONCHAIN: Record<AppState, OnchainJobState | "—"> = {
  draft: "—",
  quoted: "—",
  "user-confirmed": "—",
  paid: "funded",
  running: "funded",
  delivered: "submitted",
  verifying: "submitted",
  accepted: "settled",
  "needs-review": "disputed",
  failed: "expired",
  expired: "expired",
};

export interface Transition {
  from: AppState;
  to: AppState;
}

const ALLOWED: Transition[] = [
  { from: "draft", to: "quoted" },
  { from: "quoted", to: "user-confirmed" },
  { from: "user-confirmed", to: "paid" },
  { from: "paid", to: "running" },
  { from: "running", to: "delivered" },
  { from: "delivered", to: "verifying" },
  { from: "verifying", to: "accepted" },
  { from: "delivered", to: "needs-review" },
  { from: "running", to: "failed" },
  { from: "running", to: "expired" },
];

/**
 * Evidence guard: Delivered → Verifying → Accepted requires a real onchain
 * reference. No transaction === no "completed". This is enforced in code, not
 * just documented.
 */
export function canTransition(
  from: AppState,
  to: AppState,
  evidence?: Evidence,
): boolean {
  const allowed = ALLOWED.some((t) => t.from === from && t.to === to);
  if (!allowed) return false;

  if (
    (from === "delivered" && to === "verifying") ||
    (from === "delivered" && to === "needs-review") ||
    (from === "verifying" && to === "accepted")
  ) {
    return Boolean(evidence && evidence.chainRef);
  }
  return true;
}

/** Rough parent-child session check: a spent session cannot be reused. */
export function sessionActive(session: Session, nowSec: bigint): boolean {
  return !session.revoked && session.expiry > nowSec;
}

