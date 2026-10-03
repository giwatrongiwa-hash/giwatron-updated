import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import { ScrollReset } from "@/components/os/ScrollReset";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Hard-edged bitmap display face for the wordmark and big system labels.
const pixel = Silkscreen({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Absolute base for OG/Twitter image URLs (Vercel sets this automatically).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GIWATRON",
  description: "GIWATRON — a pixel-art robot NFT collection. Unit #001 is online.",
  openGraph: {
    title: "GIWATRON",
    description: "A pixel-art robot NFT collection. Unit #001 is online.",
    images: [{ url: "/nft/giwatron-001.jpg", width: 1280, height: 1280, alt: "GIWATRON #001" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIWATRON",
    description: "A pixel-art robot NFT collection. Unit #001 is online.",
    images: ["/nft/giwatron-001.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${pixel.variable}`}>
      <body>
        <ScrollReset />
        {children}
      </body>
    </html>
  );
}
