"use client";

import { useState } from "react";

export function DiscoverAgents() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/agents");
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "load failed");
        return;
      }
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <h2>Discover agents</h2>
      <p>
        Pulls live ERC-8004 agents from 8004scan. The raw response is shown so
        the field shape can be confirmed before rendering a table.
      </p>
      <button onClick={load} disabled={loading}>
        {loading ? "Loading…" : "Load from 8004scan"}
      </button>
      {error && <p style={{ color: "#ff8a8a" }}>Error: {error}</p>}
      {data != null && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            maxHeight: 320,
            overflow: "auto",
            background: "#0d1322",
            padding: "1rem",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}
