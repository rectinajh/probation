import { EVMWalletProvider, loadEnv } from "@bnbagent/sdk";
import { AgentEndpoint, ERC8004Agent } from "@bnbagent/sdk/erc8004";

/**
 * Register an ERC-8004 agent identity with the wallet in .env (PRIVATE_KEY).
 * Prints the agent id / address to put in PROVIDER_ADDRESS.
 */
async function main() {
  loadEnv();

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
    privateKey: process.env.PRIVATE_KEY,
  });

  const sdk = await ERC8004Agent.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
  });

  const agentUri = sdk.generateAgentUri({
    name: "probation-health-factor-monitor",
    description: "Bounded health-factor monitor for a lending position",
    endpoints: [
      new AgentEndpoint({
        name: "web",
        endpoint: process.env.ERC8183_AGENT_URL ?? "https://placeholder.example.com",
      }),
    ],
  });

  const result = await sdk.registerAgent(agentUri);
  console.log("agent_id:", result.agentId);
  console.log("tx:", result.transactionHash);
  console.log("Set PROVIDER_ADDRESS to the agent identity below:");
  console.log(result.agentId);
}

main().catch((err) => {
  console.error("[register-agent] fatal", err);
  process.exit(1);
});

