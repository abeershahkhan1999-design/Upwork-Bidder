import type { Metadata } from "next";
import { Sora, Figtree } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qualix Bid Tracker",
  description: "Internal Upwork bidding tracker for Qualix Solutions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${figtree.variable} h-full`}>
      <body className="min-h-full">
        <div className="bg-decoration" aria-hidden="true" />
        <div className="relative z-[1] min-h-full">{children}</div>
      </body>
    </html>
  );
}
