import type { Category } from "./domain";
import type { ServiceAdapter } from "./service-adapter";
import { healthFactorAdapter } from "./adapters/health-factor";

/** Only the observe-stage health-factor category has a real adapter yet. */
const registry: Partial<Record<Category, ServiceAdapter>> = {
  "health-factor-monitoring": healthFactorAdapter,
};

export function getAdapter(category: Category): ServiceAdapter {
  const adapter = registry[category];
  if (!adapter) {
    throw new Error(`No ServiceAdapter registered for category "${category}"`);
  }
  return adapter;
}

