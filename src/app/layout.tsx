import type { Metadata, Viewport } from "next";
import { Gloock, Literata } from "next/font/google";
import { RouteAnnouncerRole } from "@/components/RouteAnnouncerRole";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const gloock = Gloock({
  variable: "--font-gloock",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExamPlan: daily study plans for law and IR exams",
  description:
    "ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gloock.variable} ${literata.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-serif">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <RouteAnnouncerRole />
      </body>
    </html>
  );
}
