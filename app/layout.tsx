import type { Metadata, Viewport } from "next";
import "./globals.css";

// RATIONAL: Separate Viewport export for Next.js 14+ best practices.
// 'user-scalable=0' is the secret sauce that makes it feel like a real app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Fagan Family Feed",
  description: "Internal family updates",
  manifest: "/manifest.json", // This links to the file we'll create in /public
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Folk",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark:bg-black">
      <body className="min-h-full bg-zinc-50 dark:bg-black text-black dark:text-white">
        {children}
      </body>
    </html>
  );
}