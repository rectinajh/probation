"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EvidenceCard, type HealthEvidence } from "./evidence-card";

type Phase = "idle" | "hiring" | "running" | "submitted" | "settling" | "done" | "error";

interface JobSnapshot {
  jobId: number;
  status: string;
  statusCode: number;
  budget: string;
  submittedAt: string;
  provider: string;
  client: string;
  evidence: HealthEvidence | null;
}

const DISPUTE_WINDOW_S = 9;

function fmtU(raw: string): string {
  const n = Number(raw) / 1e18;
  return `${n} U`;
}

export function LiveTrial({ providerAddress }: { providerAddress: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(DISPUTE_WINDOW_S);
  const settleSent = useRef(false);

  const poll = useCallback(async () => {
    if (!job) return;
    try {
      const res = await fetch(`/api/job/${job.jobId}`);
      const data = (await res.json()) as JobSnapshot & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "poll failed");
      setJob(data);

      if (data.statusCode >= 3) {
        setPhase("done");
        return;
      }
      if (data.statusCode === 2) {
        setPhase("submitted");
        return;
      }
      setPhase("running");
    } catch {
      /* transient — retry next tick */
    }
  }, [job]);

  const settle = useCallback(async () => {
    if (!job || settleSent.current) return;
    settleSent.current = true;
    setPhase("settling");
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "settle failed");
      const after = await fetch(`/api/job/${job.jobId}`).then((r) => r.json());
      setJob(after);
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, [job]);

  async function run() {
    setPhase("hiring");
    setError(null);
    setJob(null);
    settleSent.current = false;
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: providerAddress,
          description:
            "Monitor this lending position's health factor (observe stage)",
          budget: "1000000000000000000", // 1 U
        }),
      });
      const data = (await res.json()) as { jobId?: number; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "hire failed");
      }
      const initial: JobSnapshot = {
        jobId: data.jobId,
        status: "FUNDED",
        statusCode: 1,
        budget: "1000000000000000000",
        submittedAt: "0",
        provider: providerAddress,
        client: providerAddress,
        evidence: null,
      };
      setJob(initial);
      setPhase("running");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  useEffect(() => {
    if (!job || (phase !== "running" && phase !== "submitted")) return;
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [job, phase, poll]);

  useEffect(() => {
    if (phase !== "submitted" || !job) return;
    const submittedAt = Number(job.submittedAt);
    const tick = setInterval(() => {
      const remain = Math.max(
        0,
        submittedAt + DISPUTE_WINDOW_S - Math.floor(Date.now() / 1000),
      );
      setCountdown(remain);
      if (remain === 0) settle();
    }, 500);
    return () => clearInterval(tick);
  }, [phase, job, settle]);

  const funded = phase !== "idle" && phase !== "hiring" && phase !== "error";
  const submitted = phase === "submitted" || phase === "settling" || phase === "done";
  const completed = phase === "done";

  return (
    <div className="card" style={{ padding: "1.75rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <span className="pill">
              <span className="dot" />
              Health Factor Monitoring
            </span>
            <span className="pill">observe · read-only</span>
          </div>
          <h3 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.35rem" }}>
            probation-health-factor-monitor
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
            Watches a lending position and reports its live Venus health
            factor — flagging it at-risk the moment shortfall exceeds zero.
            Self-custodial; no funds move in the observe stage.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="faint" style={{ fontSize: "0.8rem" }}>Service fee</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>1 U</div>
          <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
            execution budget · 0 U
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="btn btn-primary" onClick={run} style={{ marginTop: "1.25rem" }}>
          Run a 1 U trial →
        </button>
      )}

      {phase === "hiring" && (
        <div className="muted" style={{ marginTop: "1.25rem" }}>
          Escrowing 1 U and creating the on-chain job…
        </div>
      )}

      {error && (
        <div className="verdict at-risk" style={{ marginTop: "1.25rem" }}>
          <div className="big">Something went wrong</div>
          <div className="muted" style={{ fontSize: "0.9rem" }}>{error}</div>
        </div>
      )}

      {funded && (
        <div className="timeline" style={{ marginTop: "1.5rem" }}>
          <div className="tstep done">
            <div className="ring">✓</div>
            <div>
              <div className="t-title">1 U escrowed on-chain</div>
              <div className="t-sub">
                ERC-8183 job {job?.jobId ?? ""} · funds locked in escrow
              </div>
            </div>
          </div>

          <div className={`tstep ${submitted ? "done" : "active"}`}>
            <div className="ring">{submitted ? "✓" : "2"}</div>
            <div>
              <div className="t-title">
                {submitted ? "Evidence produced" : "Agent producing evidence…"}
              </div>
              <div className="t-sub">
                {submitted
                  ? "Venus health factor read and submitted on-chain"
                  : "reading live Venus account liquidity"}
              </div>
            </div>
          </div>

          {submitted && (
            <div className={`tstep ${completed ? "done" : "active"}`}>
              <div className="ring">{completed ? "✓" : "3"}</div>
              <div>
                <div className="t-title">
                  {completed
                    ? "Settled — escrow released"
                    : phase === "settling"
                      ? "Settling…"
                      : `Optimistic window · ${countdown}s`}
                </div>
                <div className="t-sub">
                  {completed
                    ? "Trial completed. Payment released to the agent."
                    : "no dispute → auto-approve and release"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {job?.evidence && submitted && (
        <EvidenceCard evidence={job.evidence} account={job.client} />
      )}

      {completed && (
        <div
          className="card"
          style={{
            marginTop: "1.5rem",
            borderColor: "rgba(45, 212, 160, 0.3)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
            Trial complete. Now it&apos;s your decision.
          </div>
          <p className="muted" style={{ margin: "0.4rem 0 1rem", fontSize: "0.95rem" }}>
            Evidence first, trust second: you can stop here, keep the agent on
            another bounded trial, or explicitly grant broader authority.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={run}>
              Run another trial
            </button>
            <button className="btn btn-primary" disabled>
              Grant limited authority →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
