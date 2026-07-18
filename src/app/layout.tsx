import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handsel | Every promise, made verifiable",
  description:
    "Handsel turns creator-brand partnerships into clear contracts, tracked milestones, and confident payouts. A product under C4T Center For Transformation.",
  icons: {
    icon: "/handsel-mark.png",
    shortcut: "/handsel-mark.png",
    apple: "/handsel-mark.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
