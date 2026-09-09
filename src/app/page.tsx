import { Marketplace } from "@/components/marketplace";

export default function Home() {
  const providerAddress =
    process.env.PROVIDER_ADDRESS ??
    "0xB675d67909185f5E983EC51b2AED14667eA31b33";

  return (
    <main>
      <header className="container hero">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            marginBottom: "2.5rem",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
              d="M16 2 27 6v8c0 7.2-4.6 12.7-11 16C9.6 26.7 5 21.2 5 14V6l11-4Z"
              fill="rgba(240,185,11,0.14)"
              stroke="#F0B90B"
              strokeWidth="1.8"
            />
            <path
              d="m11.5 15.8 3 3 6-6.5"
              stroke="#F0B90B"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontWeight: 800, letterSpacing: "0.04em", fontSize: "1.05rem" }}>
            PROBATION
          </span>
        </div>
        <span className="eyebrow">BNB Chain · Smart Money Era</span>
        <h1>
          Hire an agent with <em>evidence first</em>, trust second.
        </h1>
        <p className="lede">
          PROBATION inverts the agent economy: buy a bounded, real-world trial,
          inspect verifiable results on-chain, then decide whether to grant
          broader authority. No deposit-before-proof, no trust-me-first.
        </p>
        <a className="btn btn-primary" href="#trial">
          Run a live trial →
        </a>

        <div className="hero-stats">
          <div className="stat">
            <div className="num">200k+</div>
            <div className="label">ERC-8004 agents live on 8004scan</div>
          </div>
          <div className="stat">
            <div className="num">4</div>
            <div className="label">DeFi trial categories</div>
          </div>
          <div className="stat">
            <div className="num">9s</div>
            <div className="label">optimistic settlement window</div>
          </div>
        </div>
      </header>

      <section className="container block">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">
          A trial is a contract, not a chat. Authority never silently expands.
        </p>
        <div className="steps">
          <div className="step">
            <div className="idx">01 · State your limits</div>
            <h3>Fix the task and the bounds</h3>
            <p>
              Fee, execution budget, allowed actions, acceptance criteria, and
              the failure/refund policy are agreed up front.
            </p>
          </div>
          <div className="step">
            <div className="idx">02 · Buy a bounded trial</div>
            <h3>Escrow, then real work</h3>
            <p>
              Funds are held in ERC-8183 escrow. The agent does the actual work
              against live protocols — starting read-only.
            </p>
          </div>
          <div className="step">
            <div className="idx">03 · Verify & decide</div>
            <h3>Evidence, not screenshots</h3>
            <p>
              Inspect verifiable on-chain evidence, then explicitly choose to
              stop, continue, or grant more authority.
            </p>
          </div>
        </div>
      </section>

      <Marketplace providerAddress={providerAddress} />

      <section className="container block">
        <h2 className="section-title">Built honest by design</h2>
        <p className="section-sub">
          The guardrails that make evidence trustworthy.
        </p>
        <div className="grid grid-3">
          <div className="card">
            <span className="pill ok">
              <span className="dot" />
              Provenance labelled
            </span>
            <p className="muted" style={{ marginBottom: 0 }}>
              Provider claim, platform live-test, and third-party history are
              labelled differently. Missing data shows as missing — never
              fabricated.
            </p>
          </div>
          <div className="card">
            <span className="pill ok">
              <span className="dot" />
              No tx = not completed
            </span>
            <p className="muted" style={{ marginBottom: 0 }}>
              A trial cannot reach “completed” without a real on-chain
              reference. Claims without a transaction stay claims.
            </p>
          </div>
          <div className="card">
            <span className="pill ok">
              <span className="dot" />
              Authority follows you
            </span>
            <p className="muted" style={{ marginBottom: 0 }}>
              Observe → limited-execute → ongoing, each with explicit
              confirmation. A trial never becomes silent, permanent access.
            </p>
          </div>
        </div>
      </section>

      <footer className="container block">
        <p className="faint" style={{ fontSize: "0.85rem" }}>
          PROBATION · Evidence Before Trust · Built for the BNB Chain “Smart
          Money Era” hackathon.
        </p>
      </footer>
    </main>
  );
}
