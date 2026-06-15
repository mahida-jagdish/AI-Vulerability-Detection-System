import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AppShellWrapper } from "@/components/app-shell-wrapper";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"]
});

export const metadata: Metadata = {
  title: "ExploitronAI — AI Web Security Platform",
  description: "Automated AI-powered web vulnerability assessment with real Kali Linux tools"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable}`}>
        <AppShellWrapper>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
