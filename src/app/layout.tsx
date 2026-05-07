import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BgMusic from "@/components/BgMusic";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omni-Verse — Competitive Trivia",
  description: "A bilingual competitive trivia gaming platform. Challenge your knowledge across categories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased" style={{ backgroundColor: "#120d1f", color: "#e8d5a0" }}>
        {children}
        <BgMusic />
      </body>
    </html>
  );
}
