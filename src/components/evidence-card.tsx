"use client";

function usd(raw: string): string {
  const n = Number(raw) / 1e18;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface HealthEvidence {
  liquidity: string;
  shortfall: string;
  status: "healthy" | "at-risk";
}

export function EvidenceCard({
  evidence,
  account,
}: {
  evidence: HealthEvidence;
  account: string;
}) {
  const healthy = evidence.status === "healthy";
  return (
    <div className="card" style={{ marginTop: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div className="faint" style={{ fontSize: "0.8rem" }}>
            Venus · live on-chain read
          </div>
          <div className="section-title" style={{ margin: "0.2rem 0 0" }}>
            Health factor
          </div>
        </div>
        <span className={`pill ${healthy ? "ok" : "bad"}`}>
          <span className="dot" />
          {healthy ? "Healthy" : "At risk"}
        </span>
      </div>

      <div
        className={`verdict ${healthy ? "healthy" : "at-risk"}`}
        style={{ marginTop: "1rem" }}
      >
        <div>
          <div className="big">
            {healthy ? "Position is safe" : "Position is at risk of liquidation"}
          </div>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {healthy
              ? "Shortfall is 0 — the account is above its borrow limit."
              : "Shortfall is greater than 0 — the account is below its borrow limit."}
          </div>
        </div>
      </div>

      <div
        className="grid grid-3"
        style={{ marginTop: "1rem", gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="metric">
          <div className="k">Liquidity</div>
          <div className="v">{usd(evidence.liquidity)}</div>
        </div>
        <div className="metric">
          <div className="k">Shortfall</div>
          <div className="v">{usd(evidence.shortfall)}</div>
        </div>
        <div className="metric">
          <div className="k">Account</div>
          <div className="v" style={{ fontSize: "0.9rem" }}>
            {account.slice(0, 6)}…{account.slice(-4)}
          </div>
        </div>
      </div>

      <p className="faint" style={{ fontSize: "0.8rem", marginTop: "1rem", marginBottom: 0 }}>
        Read from the Venus Unitroller <code>getAccountLiquidity</code> — an
        on-chain call, not a screenshot or a claimed number.
      </p>
    </div>
  );
}
