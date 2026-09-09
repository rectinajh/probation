"use client";

import type { ReportEvidence } from "@/lib/domain";

export function EvidenceCard({
  report,
  account,
}: {
  report: ReportEvidence;
  account: string;
}) {
  const classFor =
    report.verdict === "ok" ? "ok" : report.verdict === "warn" ? "bad" : "neutral";
  const label =
    report.verdict === "ok" ? "Verified" : report.verdict === "warn" ? "Action needed" : "Info";

  return (
    <div className="card" style={{ marginTop: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div className="faint" style={{ fontSize: "0.8rem" }}>
            {report.source} · live on-chain read
          </div>
          <div className="section-title" style={{ margin: "0.2rem 0 0" }}>
            {report.title}
          </div>
        </div>
        <span className={`pill ${classFor}`}>
          <span className="dot" />
          {label}
        </span>
      </div>

      <div
        className={`verdict ${classFor === "bad" ? "at-risk" : "healthy"}`}
        style={{ marginTop: "1rem" }}
      >
        <div>
          <div className="big">
            {report.headline}
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          marginTop: "1rem",
          gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
          gap: "0.6rem",
        }}
      >
        {report.metrics.map((m) => (
          <div className="metric" key={m.label}>
            <div className="k">{m.label}</div>
            <div className="v">
              {m.value}
              {m.unit ? ` ${m.unit}` : ""}
            </div>
          </div>
        ))}
        <div className="metric">
          <div className="k">Account</div>
          <div className="v" style={{ fontSize: "0.9rem" }}>
            {account.slice(0, 6)}…{account.slice(-4)}
          </div>
        </div>
      </div>

      <p className="faint" style={{ fontSize: "0.8rem", marginTop: "1rem", marginBottom: 0 }}>
        {report.method} · block {report.block}. {report.note}
      </p>
    </div>
  );
}
