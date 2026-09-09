import { getAddress, toHex } from "viem";

export const BSC_TESTNET_CHAIN_ID = 0x61; // 97

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  removeListener?(event: string, cb: (...args: unknown[]) => void): void;
}

function provider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

/** Connect the injected wallet (MetaMask / Rabby / etc.) without prompting if
 * it is already connected. Returns the connected address. */
export async function connectWallet(): Promise<`0x${string}`> {
  const p = provider();
  if (!p) {
    throw new Error(
      "No injected wallet found. Install MetaMask or a wallet extension.",
    );
  }
  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) throw new Error("No account returned by the wallet.");
  return getAddress(accounts[0]);
}

/** Read the current chain id without prompting. */
export async function readChainId(): Promise<number> {
  const p = provider();
  if (!p) return 0;
  const hex = (await p.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(hex, 16);
}

export async function switchToBscTestnet(): Promise<void> {
  const p = provider();
  if (!p) throw new Error("No wallet found.");
  await p.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x61" }],
  });
}

/** Personal-sign a UTF-8 message from the connected account. */
export async function signWalletMessage(
  message: string,
  address: `0x${string}`,
): Promise<`0x${string}`> {
  const p = provider();
  if (!p) throw new Error("No wallet found.");
  const sig = (await p.request({
    method: "personal_sign",
    params: [toHex(message), address],
  })) as string;
  return sig as `0x${string}`;
}

/** Pre-detect an already-connected account (no prompt). */
export async function detectedAccount(): Promise<`0x${string}` | null> {
  const p = provider();
  if (!p) return null;
  const accounts = (await p.request({ method: "eth_accounts" })) as string[];
  return accounts[0] ? getAddress(accounts[0]) : null;
}

/** Subscribe to wallet account + chain changes for a live-updating header. */
export function onWalletChange(
  cb: (address: `0x${string}` | null, chainId: number) => void,
): () => void {
  const p = provider();
  if (!p?.on) return () => {};
  const onAccounts = async () => cb(await detectedAccount(), await readChainId());
  const onChain = async () => cb(await detectedAccount(), await readChainId());
  p.on("accountsChanged", onAccounts);
  p.on("chainChanged", onChain);
  return () => {
    p.removeListener?.("accountsChanged", onAccounts);
    p.removeListener?.("chainChanged", onChain);
  };
}
