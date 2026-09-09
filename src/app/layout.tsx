import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROBATION — Evidence Before Trust",
  description:
    "A BNB Chain agent marketplace where users hire agents for bounded real-world trials, inspect verifiable results, and choose whether to grant broader authority.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
