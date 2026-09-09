import type { Category } from "./domain";
import type { ServiceAdapter } from "./service-adapter";
import { healthFactorAdapter } from "./adapters/health-factor";
import { rebalancingAdapter } from "./adapters/rebalancing";
import { gridTradingAdapter } from "./adapters/grid-trading";
import { yieldOptimisationAdapter } from "./adapters/yield-optimisation";

/** All four observe-stage categories are wired to real, read-only data. */
const registry: Record<Category, ServiceAdapter> = {
  rebalancing: rebalancingAdapter,
  "grid-trading": gridTradingAdapter,
  "yield-optimisation": yieldOptimisationAdapter,
  "health-factor-monitoring": healthFactorAdapter,
};

export const CATEGORIES = Object.keys(registry) as Category[];
export function hasAdapter(category: Category): boolean {
  return category in registry;
}

export function getAdapter(category: Category): ServiceAdapter {
  const adapter = registry[category];
  if (!adapter) {
    throw new Error(`No ServiceAdapter registered for category "${category}"`);
  }
  return adapter;
}
