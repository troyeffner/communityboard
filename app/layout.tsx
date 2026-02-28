import type { Metadata } from "next";
import "./globals.css";
import "./ui-alignment.css";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "UticaCommunityBoard",
  description: "UticaCommunityBoard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
  </body>
    </html>
  );
}
