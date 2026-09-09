"use client";

import { useState } from "react";

export function HireFlow() {
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("0");
  const [jobId, setJobId] = useState("");
  const [hire, setHire] = useState<Record<string, unknown> | null>(null);
  const [deliverable, setDeliverable] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onHire(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHire(null);
    setDeliverable(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, description, budget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "hire failed");
        return;
      }
      setHire(data);
      if (data.jobId != null) setJobId(String(data.jobId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onCheckDeliverable() {
    setError(null);
    setDeliverable(null);
    try {
      const res = await fetch(`/api/deliverable/${encodeURIComponent(jobId)}`);
      const data = await res.json();
      setDeliverable(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <h2>Try a trial</h2>
      <form onSubmit={onHire} style={{ display: "grid", gap: "0.75rem", maxWidth: 480 }}>
        <label>
          Agent address
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="0xB675d67909185f5E983EC51b2AED14667eA31b33"
            required
          />
        </label>
        <label>
          Task description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Monitor this lending position's health factor"
            required
          />
        </label>
        <label>
          Budget (0 = free trial)
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Hiring…" : "Hire (create + fund job)"}
        </button>
      </form>

      {error && <p style={{ color: "#ff8a8a" }}>Error: {error}</p>}
      {hire && (
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(hire, null, 2)}</pre>
      )}

      <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem", maxWidth: 480 }}>
        <label>
          Job id
          <input value={jobId} onChange={(e) => setJobId(e.target.value)} />
        </label>
        <button onClick={onCheckDeliverable} disabled={!jobId}>
          Check deliverable
        </button>
        {deliverable && (
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(deliverable, null, 2)}</pre>
        )}
      </div>
    </section>
  );
}

