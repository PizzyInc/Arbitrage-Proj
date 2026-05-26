import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arbitrage Card Trading App",
  description: "Pokemon card arbitrage dashboard for eBay US and eBay UK spreads."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
