"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BSC_TESTNET_CHAIN_ID,
  connectWallet,
  detectedAccount,
  onWalletChange,
  readChainId,
  signWalletMessage,
  switchToBscTestnet,
} from "@/lib/wallet";
import { EvidenceCard } from "./evidence-card";
import type { Category, ReportEvidence } from "@/lib/domain";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/category-meta";

type Phase =
  | "idle"
  | "connecting"
  | "signing"
  | "hiring"
  | "running"
  | "submitted"
  | "settling"
  | "done"
  | "error";

interface JobSnapshot {
  jobId: number;
  status: string;
  statusCode: number;
  budget: string;
  submittedAt: string;
  provider: string;
  client: string;
  subject: string;
  category: Category;
  mode: "observe" | "execute";
  execution: {
    txHash: string;
    amount: string;
    to: string;
    block: string;
  } | null;
  report: ReportEvidence | null;
}

const DISPUTE_WINDOW_S = 9;

export function LiveTrial({
  providerAddress,
  category,
  onCategoryChange,
}: {
  providerAddress: string;
  category: Category;
  onCategoryChange: (c: Category) => void;
}) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(DISPUTE_WINDOW_S);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const settleSent = useRef(false);

  const isConnected = !!address;
  const onBscTestnet = chainId === BSC_TESTNET_CHAIN_ID;

  // Pre-detect an already-connected wallet + subscribe to changes.
  useEffect(() => {
    let mounted = true;
    detectedAccount().then((a) => {
      if (!mounted) return;
      setAddress(a);
    });
    readChainId().then((id) => {
      if (mounted) setChainId(id);
    });
    const off = onWalletChange((a, id) => {
      setAddress(a);
      setChainId(id);
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

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
    setSettleTx(null);
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }),
      });
      const data = (await res.json()) as { error?: string; txHash?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "settle failed");
      if (data.txHash) setSettleTx(data.txHash);
      const after = await fetch(`/api/job/${job.jobId}`).then((r) => r.json());
      setJob(after);
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, [job]);

  async function connect() {
    setPhase("connecting");
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setChainId(await readChainId());
      setPhase("idle");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  async function switchChain() {
    try {
      await switchToBscTestnet();
      setChainId(BSC_TESTNET_CHAIN_ID);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function run() {
    if (!address) return;
    setError(null);
    setJob(null);
    settleSent.current = false;
    setPhase("signing");
    try {
      const meta = CATEGORY_META[category];
      const message = `PROBATION: authorize a bounded ${meta.label.toLowerCase()} trial (category=${category}) for ${address} on BSC testnet (fee 1 U, observe stage).`;
      const signature = await signWalletMessage(message, address);

      setPhase("hiring");
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: providerAddress,
          description: `PROBATION ${meta.label} trial (category=${category}, observe stage)`,
          category,
          budget: "1000000000000000000", // 1 U
          signer: address,
          signature,
          message,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "hire failed");

      setJob({
        jobId: Number(data.jobId),
        status: "FUNDED",
        statusCode: 1,
        budget: "1000000000000000000",
        submittedAt: "0",
        provider: providerAddress,
        client: address,
        subject: address,
        category,
        mode: "observe",
        execution: null,
        report: null,
      });
      setPhase("running");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  async function runExecute() {
    if (!address) return;
    setError(null);
    setJob(null);
    settleSent.current = false;
    setPhase("signing");
    try {
      const cap = "1000000000000000000"; // 1 U
      const expires = Math.floor(Date.now() / 1000) + 600;
      const message = `PROBATION: authorize LIMITED EXECUTE — transfer up to 1 U (cap=${cap}) to ${address} on BSC testnet, expiry ${expires}. mode=execute`;
      const signature = await signWalletMessage(message, address);

      setPhase("hiring");
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: providerAddress,
          description: `PROBATION limited-execute (mode=execute, observe stage complete)`,
          category,
          mode: "execute",
          execTo: address,
          execCap: cap,
          budget: "1000000000000000000",
          signer: address,
          signature,
          message,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "hire failed");

      setJob({
        jobId: Number(data.jobId),
        status: "FUNDED",
        statusCode: 1,
        budget: "1000000000000000000",
        submittedAt: "0",
        provider: providerAddress,
        client: address,
        subject: address,
        category,
        mode: "execute",
        execution: null,
        report: null,
      });
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

  const isFunded =
    phase === "running" ||
    phase === "submitted" ||
    phase === "settling" ||
    phase === "done";
  const isSubmitted =
    phase === "submitted" || phase === "settling" || phase === "done";
  const isDone = phase === "done";

  return (
    <div className="card" style={{ padding: "1.75rem" }}>
      <div className="cat-tabs" style={{ marginBottom: "1.5rem" }}>
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            className={`cat-tab ${category === c ? "active" : ""}`}
            onClick={() => {
              onCategoryChange(c);
              setJob(null);
              setError(null);
              settleSent.current = false;
              if (phase !== "idle" && phase !== "error") setPhase("idle");
            }}
          >
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>
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
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span className="pill">
              <span className="dot" />
              {CATEGORY_META[category].label}
            </span>
            <span className="pill">{CATEGORY_META[category].allowed}</span>
          </div>
          <h3 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.35rem" }}>
            {CATEGORY_META[category].agentId}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
            {CATEGORY_META[category].description}
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

      <div
        style={{
          marginTop: "1.5rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-soft)",
        }}
      >
        {!isConnected ? (
          <button className="btn btn-primary" onClick={connect} disabled={phase === "connecting"}>
            {phase === "connecting" ? "Connecting…" : "Connect wallet →"}
          </button>
        ) : !onBscTestnet ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            <span className="pill warn">
              <span className="dot" />
              Switch to BSC testnet
            </span>
            <button className="btn btn-ghost" onClick={switchChain}>
              Switch chain
            </button>
          </div>
        ) : phase === "idle" || phase === "error" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            <span className="pill ok">
              <span className="dot" />
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <button className="btn btn-primary" onClick={run}>
              Authorize &amp; run 1 U trial →
            </button>
            <button className="btn btn-ghost" onClick={() => setAddress(null)}>
              Disconnect
            </button>
          </div>
        ) : (
          <span className="pill ok">
            <span className="dot" />
            Signed &amp; authorized — {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
        )}
      </div>

      {phase === "signing" && (
        <div className="muted" style={{ marginTop: "1rem" }}>
          Signing the trial authorization in your wallet…
        </div>
      )}
      {phase === "hiring" && (
        <div className="muted" style={{ marginTop: "1rem" }}>
          Escrowing 1 U and creating the on-chain job…
        </div>
      )}

      {error && (
        <div className="verdict at-risk" style={{ marginTop: "1.25rem" }}>
          <div className="big">Something went wrong</div>
          <div className="muted" style={{ fontSize: "0.9rem" }}>{error}</div>
        </div>
      )}

      {isFunded && (
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

          <div className={`tstep ${isSubmitted ? "done" : "active"}`}>
            <div className="ring">{isSubmitted ? "✓" : "2"}</div>
            <div>
              <div className="t-title">
                {isSubmitted
                  ? job?.mode === "execute"
                    ? "Bounded execution done"
                    : "Evidence produced"
                  : job?.mode === "execute"
                    ? "Agent executing bounded action…"
                    : "Agent producing evidence…"}
              </div>
              <div className="t-sub">
                {isSubmitted
                  ? job?.mode === "execute"
                    ? "real on-chain transfer submitted (bounded by your authorization)"
                    : `${CATEGORY_META[category].label} read and submitted on-chain`
                  : job?.mode === "execute"
                    ? "transferring the authorized budget on-chain"
                    : `reading live on-chain ${CATEGORY_META[category].label.toLowerCase()} data`}
              </div>
            </div>
          </div>

          {isSubmitted && (
            <div className={`tstep ${isDone ? "done" : "active"}`}>
              <div className="ring">{isDone ? "✓" : "3"}</div>
              <div>
                <div className="t-title">
                  {isDone
                    ? "Settled — escrow released"
                    : phase === "settling"
                      ? "Settling…"
                      : `Optimistic window · ${countdown}s`}
                </div>
                <div className="t-sub">
                  {isDone
                    ? "Trial completed. Payment released to the agent."
                    : "no dispute → auto-approve and release"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {job?.report && isSubmitted && (
        <EvidenceCard report={job.report} account={job.subject || job.client} />
      )}

      {job?.mode === "execute" && job?.execution?.txHash && isSubmitted && (
        <div className="card" style={{ marginTop: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div className="faint" style={{ fontSize: "0.8rem" }}>
                BSC testnet · real on-chain execution
              </div>
              <div className="section-title" style={{ margin: "0.2rem 0 0" }}>
                Bounded transfer executed
              </div>
            </div>
            <span className="pill ok">
              <span className="dot" />
              Executed
            </span>
          </div>
          <div
            className="grid"
            style={{
              marginTop: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.6rem",
            }}
          >
            <div className="metric">
              <div className="k">Amount</div>
              <div className="v">{(Number(job.execution.amount) / 1e18).toFixed(2)} U</div>
            </div>
            <div className="metric">
              <div className="k">To</div>
              <div className="v" style={{ fontSize: "0.9rem" }}>
                {job.execution.to.slice(0, 6)}…{job.execution.to.slice(-4)}
              </div>
            </div>
            <div className="metric">
              <div className="k">Block</div>
              <div className="v">{job.execution.block}</div>
            </div>
          </div>
          <p
            className="faint"
            style={{ fontSize: "0.8rem", marginTop: "1rem", marginBottom: 0 }}
          >
            Executed within the bound you signed (cap 1 U, expiry 10 min).{" "}
            <a
              href={`https://testnet.bscscan.com/tx/${job.execution.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--blue)", textDecoration: "underline" }}
            >
              tx {job.execution.txHash.slice(0, 10)}…{job.execution.txHash.slice(-8)}
            </a>
          </p>
        </div>
      )}

      {isDone && (
        <div
          className="card"
          style={{ marginTop: "1.5rem", borderColor: "rgba(45, 212, 160, 0.3)" }}
        >
          <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
            Trial complete. Now it&apos;s your decision.
          </div>
          <p className="muted" style={{ margin: "0.4rem 0 1rem", fontSize: "0.95rem" }}>
            You authorized this with your wallet. Evidence first, trust second:
            stop here, run another bounded trial, or grant broader authority.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.6rem",
              marginBottom: "1rem",
            }}
          >
            <div className="metric">
              <div className="k">Stage</div>
              <div className="v">Observe (read-only)</div>
            </div>
            <div className="metric">
              <div className="k">Allowlist</div>
              <div className="v">empty</div>
            </div>
            <div className="metric">
              <div className="k">Spend cap</div>
              <div className="v">0 U</div>
            </div>
            <div className="metric">
              <div className="k">Expiry</div>
              <div className="v">single trial</div>
            </div>
          </div>
          <p className="faint" style={{ fontSize: "0.8rem", margin: "0 0 1rem" }}>
            This observe trial grants <strong>no</strong> asset-moving authority.
            The limited-execute stage (a real, bounded on-chain transfer you
            authorize) is code-complete but not live yet — the seller host
            redeploy is blocked. Observe trials are fully live.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={run}>
              Run another trial
            </button>
            <button
              className="btn btn-primary"
              disabled
              onClick={runExecute}
              title="Limited-execute is code-complete but the seller host redeploy is blocked (pending). Observe trials are live."
            >
              Grant limited authority →
            </button>
          </div>
          {settleTx && (
            <p
              className="faint"
              style={{ fontSize: "0.8rem", marginTop: "0.9rem", marginBottom: 0 }}
            >
              Settlement on-chain:{" "}
              <a
                href={`https://testnet.bscscan.com/tx/${settleTx}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--blue)", textDecoration: "underline" }}
              >
                tx {settleTx.slice(0, 10)}…{settleTx.slice(-8)}
              </a>{" "}
              (verifiable)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
