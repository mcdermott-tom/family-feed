import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fagan Family Feed",
  description: "Internal family updates",
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