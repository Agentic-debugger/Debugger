import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

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
      className={`dark scroll-smooth ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-bg text-t-1 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
