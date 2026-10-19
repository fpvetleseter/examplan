import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { RouteAnnouncerRole } from "@/components/RouteAnnouncerRole";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamPlan: daily study plans for law and IR exams",
  description:
    "ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <RouteAnnouncerRole />
      </body>
    </html>
  );
}
