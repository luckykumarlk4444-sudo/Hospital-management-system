import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseQueue | Hospital Queue Management System",
  description: "Next-generation outpatient queue orchestration, triage, and real-time patient status tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
