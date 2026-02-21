import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import GoogleMapsLoader from "@/components/GoogleMapsLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyMaps — Share Your Favorite Restaurants",
  description: "Track every restaurant you visit, share your favorites, and discover new spots from friends.",
  metadataBase: new URL("https://my-maps-d00.pages.dev"),
  openGraph: {
    title: "MyMaps — Your Restaurants. Your Map.",
    description: "Track every restaurant you visit, share your favorites, and discover new spots from friends.",
    url: "https://my-maps-d00.pages.dev",
    siteName: "MyMaps",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "MyMaps — Your Restaurants. Your Map." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyMaps — Your Restaurants. Your Map.",
    description: "Track every restaurant you visit, share your favorites, and discover new spots from friends.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased grain`}>
        <AuthProvider>
          <ToastProvider>
            <GoogleMapsLoader>
              <Navbar />
              <main className="min-h-screen">{children}</main>
            </GoogleMapsLoader>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
