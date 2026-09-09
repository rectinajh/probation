import { runSellerRunner } from "../src/lib/seller-runner";

runSellerRunner().catch((err) => {
  console.error("[seller-runner] fatal", err);
  process.exit(1);
});

