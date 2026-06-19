import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusOC — AI Code Assistant",
  description: "Next-generation AI-powered code assistant with workspace management",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="aurora-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
