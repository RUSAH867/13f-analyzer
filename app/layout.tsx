import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "13F Holdings Analyzer",
  description: "Analyze hedge fund 13F filings and holding overlaps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
      >
        <div className="min-h-screen">
          <nav className="border-b bg-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold">
                    13F Analyzer
                  </Link>
                  <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                    <Link
                      href="/"
                      className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/funds"
                      className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
                    >
                      Funds
                    </Link>
                    <Link
                      href="/overlap"
                      className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium"
                    >
                      Overlap Analysis
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
