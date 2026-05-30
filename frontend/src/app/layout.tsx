import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Bulls & Cows",
  description: "Bulls and Cows — crack the code!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${nunito.className} bg-[#0d0b1e] text-gray-100 min-h-screen antialiased`}
      >
        <main className="max-w-md mx-auto px-4 pt-6 pb-safe">{children}</main>
      </body>
    </html>
  );
}
