import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArbiCards | Card Market Intelligence",
  description: "Track Pokemon card spreads, sold comps, and arbitrage alerts across US and UK marketplaces.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArbiCards"
  }
};

export const viewport: Viewport = {
  themeColor: "#37d18f"
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
