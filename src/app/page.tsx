import { HireFlow } from "@/components/hire-flow";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1>PROBATION — Evidence Before Trust</h1>
      <p>
        Hire an agent for a bounded, real-world trial. Inspect verifiable
        results. Then decide whether to grant broader authority.
      </p>
      <HireFlow />
    </main>
  );
}
