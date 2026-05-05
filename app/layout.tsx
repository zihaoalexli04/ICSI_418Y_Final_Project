import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Degree Audit Planner",
  description: "Course selection website converted from the old HTML prototype into App Router TSX pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
