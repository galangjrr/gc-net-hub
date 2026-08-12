import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";

import PinGuard from "@/components/PinGuard";
import AuthButton from "@/components/auth-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GC Net Hub",
    template: "%s | GC Net Hub",
  },
  description: "Warnet Murah Tapi Gak Murahan! Spek PC OKe, harga mulai 4000/jam. Booking langsung dari web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-[100dvh] flex flex-col md:flex-row`}
        suppressHydrationWarning
      >
        <AuthButton />
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-[100dvh] overflow-x-hidden">
          <main className="flex-1">
            <PinGuard>{children}</PinGuard>
          </main>

        </div>
      </body>
    </html>
  );
}
