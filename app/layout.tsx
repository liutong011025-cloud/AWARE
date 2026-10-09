import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWARE · Writing workspace",
  description: "A considered space for reading, writing, and working with AI.",
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
