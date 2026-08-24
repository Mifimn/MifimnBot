import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alchemist Scanner",
  description: "Smart Money Concepts & AMDX Algorithmic Trading Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 
        The darkBg color (#0B0E14) matches your tailwind.config.js 
        and the TradingView chart background for a seamless UI.
      */}
      <body className="bg-darkBg text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
