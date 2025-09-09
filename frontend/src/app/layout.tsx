import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import BottomNav from "@/components/navigation/BottomNav";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "LoveConnect - Find Your Perfect Match",
  description: "Connect with people who share your interests and values. Join thousands finding love every day.",
  keywords: "dating, relationships, love, matches, singles",
};

// Fast loading component that doesn't block rendering
function FastLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading LoveConnect...</p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        <Suspense fallback={<FastLoader />}>
          <Providers>
            <main className="min-h-screen pb-16 lg:pb-0">
              {children}
            </main>
            <BottomNav />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
