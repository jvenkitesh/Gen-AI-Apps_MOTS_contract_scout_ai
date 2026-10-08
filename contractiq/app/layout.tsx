import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

// docs/design.md specifies "Inter Display" as the sole typeface; Google Fonts
// serves this family as "Inter" -- same type family, used throughout.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MOTS_contract_scout.ai",
  description: "AI-powered NDA and MSA review -- know what you're signing in minutes, not hours.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
