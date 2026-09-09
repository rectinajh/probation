"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/domain";
import type { Agent } from "@/lib/discovery";
import {
  CATEGORIES,
  CATEGORY_META,
} from "@/lib/category-meta";
import { LiveTrial } from "./live-trial";

function shortAddr(a: string): string {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="scorebar">
      <div className="scorebar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Marketplace({ providerAddress }: { providerAddress: string }) {
  const [category, setCategory] = useState<Category>("health-factor-monitoring");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Agent | null>(null);

  const load = useCallback(async (cat: Category) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents?category=${encodeURIComponent(cat)}`);
      const data = (await res.json()) as {
        agents?: Agent[];
        error?: string;
      };
      if (!res.ok || !data.agents) throw new Error(data.error ?? "failed to load");
      setAgents(data.agents);
    } catch (err) {
      setError((err as Error).message);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(category);
    setSelected(null);
  }, [category, load]);

  function pickCategory(c: Category) {
    setCategory(c);
    setSelected(null);
  }

  function runTrial() {
    document.getElementById("trial")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <section id="marketplace" className="container block">
        <h2 className="section-title">Discover agents</h2>
        <p className="section-sub">
          Find real ERC-8004 agents by task. Every category ships a bounded,
          read-only PROBATION trial so you can prove the capability before you
          pay or grant authority.
        </p>

        <div className="cat-tabs" style={{ margin: "1.5rem 0" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`cat-tab ${category === c ? "active" : ""}`}
              onClick={() => pickCategory(c)}
            >
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>

        {error && (
          <div className="verdict at-risk" style={{ marginTop: "1rem" }}>
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              Could not load agent listings: {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="muted">Loading live agent listings…</div>
        ) : agents.length === 0 ? (
          <div className="muted">No real agents matched this category yet.</div>
        ) : (
          <div className="agent-grid">
            {agents.map((a) => (
              <div
                key={a.id || a.agentId}
                className="card agent-card"
                onClick={() => setSelected(a)}
                style={{ cursor: "pointer" }}
              >
                <div className="agent-head">
                  {a.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.imageUrl} alt="" className="agent-avatar" />
                  ) : (
                    <div className="agent-avatar agent-avatar-fallback">
                      {a.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="agent-title">
                    <div className="agent-name">
                      {a.name}
                      {a.isVerified && (
                        <span className="pill ok" style={{ marginLeft: "0.5rem" }}>
                          <span className="dot" />
                          verified
                        </span>
                      )}
                    </div>
                    <div className="faint" style={{ fontSize: "0.8rem" }}>
                      chain {a.chainId} · id {a.tokenId}
                    </div>
                  </div>
                </div>

                <p className="agent-desc">
                  {a.description || "No description provided."}
                </p>

                <div className="agent-stats">
                  <div className="metric">
                    <div className="k">Trust</div>
                    <div className="v">{a.totalScore.toFixed(2)}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Feedback</div>
                    <div className="v">{a.totalFeedbacks}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Avg</div>
                    <div className="v">{a.averageScore.toFixed(2)}</div>
                  </div>
                </div>

                <ScoreBar value={a.totalScore} />

                <div
                  className="faint"
                  style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}
                >
                  owner {shortAddr(a.ownerAddress)} ·{" "}
                  {a.supportedProtocols.length
                    ? a.supportedProtocols.join(", ")
                    : "no protocols listed"}
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="card agent-detail" style={{ marginTop: "1.5rem" }}>
            <div className="agent-head" style={{ marginBottom: "1rem" }}>
              {selected.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.imageUrl} alt="" className="agent-avatar" />
              ) : (
                <div className="agent-avatar agent-avatar-fallback">
                  {selected.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="agent-title">
                <div className="agent-name">{selected.name}</div>
                <div className="faint" style={{ fontSize: "0.8rem" }}>
                  {selected.agentId}
                </div>
              </div>
            </div>
            <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.95rem" }}>
              {selected.description}
            </p>
            <div className="grid grid-3" style={{ gap: "0.6rem" }}>
              <div className="metric">
                <div className="k">Total score</div>
                <div className="v">{selected.totalScore.toFixed(2)}</div>
              </div>
              <div className="metric">
                <div className="k">Feedback</div>
                <div className="v">{selected.totalFeedbacks}</div>
              </div>
              <div className="metric">
                <div className="k">Avg score</div>
                <div className="v">{selected.averageScore.toFixed(2)}</div>
              </div>
              <div className="metric">
                <div className="k">Owner</div>
                <div className="v" style={{ fontSize: "0.9rem" }}>
                  {shortAddr(selected.ownerAddress)}
                </div>
              </div>
              <div className="metric">
                <div className="k">Chain</div>
                <div className="v">{selected.chainId}</div>
              </div>
              <div className="metric">
                <div className="k">x402</div>
                <div className="v">{selected.x402Supported ? "yes" : "no"}</div>
              </div>
            </div>
            <p
              className="faint"
              style={{ fontSize: "0.8rem", marginTop: "1rem" }}
            >
              Protocols:{" "}
              {selected.supportedProtocols.length
                ? selected.supportedProtocols.join(", ")
                : "none listed"}{" "}
              · testnet: {selected.isTestnet ? "yes" : "no"} · updated{" "}
              {selected.updatedAt}
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                marginTop: "1rem",
              }}
            >
              <button className="btn btn-primary" onClick={runTrial}>
                Run a bounded {CATEGORY_META[category].label.toLowerCase()} trial →
              </button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </section>

      <section id="trial" className="container block">
        <h2 className="section-title">Live trial · {CATEGORY_META[category].label}</h2>
        <p className="section-sub">
          A real, self-custodial, read-only {CATEGORY_META[category].label.toLowerCase()} trial.
          It reads live on-chain data and settles through the optimistic window.
          Runs on BSC testnet with real $U escrow.
        </p>
        <LiveTrial
          providerAddress={providerAddress}
          category={category}
          onCategoryChange={pickCategory}
        />
      </section>
    </>
  );
}
