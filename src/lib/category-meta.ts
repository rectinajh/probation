import type { Category } from "./domain";

export interface CategoryMeta {
  label: string;
  agentId: string;
  tagline: string;
  description: string;
  allowed: string;
  query: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  "health-factor-monitoring": {
    label: "Health Factor",
    agentId: "probation-health-factor-monitor",
    tagline: "observe · read-only",
    description:
      "Watches a lending position and reports its live Venus health factor — flagging it at-risk the moment shortfall exceeds zero. Self-custodial; no funds move in the observe stage.",
    allowed: "observe · read-only",
    query: "lending health factor monitoring",
  },
  "yield-optimisation": {
    label: "Yield Optimisation",
    agentId: "probation-yield-optimiser",
    tagline: "observe · read-only",
    description:
      "Scans every live Venus market, ranks them by real supply APY, and shows where your collateral is earning today. No funds move in the observe stage.",
    allowed: "observe · read-only",
    query: "yield optimisation vault",
  },
  rebalancing: {
    label: "Rebalancing",
    agentId: "probation-rebalancer",
    tagline: "observe · read-only",
    description:
      "Reads your real on-chain balance, prices it live, and states exactly what a rebalance would move to hit your target allocation. No funds move in the observe stage.",
    allowed: "observe · read-only",
    query: "portfolio rebalancing defi",
  },
  "grid-trading": {
    label: "Grid Trading",
    agentId: "probation-grid-trader",
    tagline: "observe · read-only",
    description:
      "Computes a bounded, budget-capped grid plan from a live BNB price and your available stable capital. No orders placed in the observe stage.",
    allowed: "observe · read-only",
    query: "grid trading bot",
  },
};

export const CATEGORY_ORDER: Category[] = [
  "health-factor-monitoring",
  "rebalancing",
  "grid-trading",
  "yield-optimisation",
];

export const CATEGORIES = CATEGORY_ORDER;
