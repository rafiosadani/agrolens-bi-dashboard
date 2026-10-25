import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgroLens - Executive Business Intelligence & Analytics Hub",
  description:
    "AgroFarm Business Intelligence & Executive Analytics Dashboard: Order-to-Cash Funnel, Risk Audit, Affiliation Segmentation, and Cash Realization Monitoring.",
  keywords: [
    "AgroLens",
    "AgroFarm BI",
    "Order-to-Cash",
    "Executive Analytics",
    "Outstanding SJ Audit",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
