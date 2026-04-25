import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIG — AI Python Debugger",
  description:
    "Automated bug detection, fixing, and documentation for Python code powered by multi-agent AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${spaceGrotesk.variable} ${dmSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-bg text-t-1 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
