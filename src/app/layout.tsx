import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toaster";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const display = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["400", "600", "800"] });

export const metadata: Metadata = {
  title: "Git Galaxy — learn Git by actually understanding it",
  description:
    "An interactive journey from your first commit to rebasing like a wizard. Type real Git commands and watch your repository come alive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-screen">
        <Background />
        <Navbar />
        <main className="relative z-10">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
