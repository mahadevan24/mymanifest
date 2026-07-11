import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import AuthGate from "@/components/auth-gate";
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyManifest — Premium Digital Vision Boards",
  description: "Visualize your goals, manifest your desires, and track your dreams with multiple high-quality boards and image grids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-neutral-800 selection:text-white"
        suppressHydrationWarning
      >
        <main className="flex-grow flex flex-col relative z-10">
          <AuthGate>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
