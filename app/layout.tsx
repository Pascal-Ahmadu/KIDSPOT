import type { Metadata } from "next";
import { DM_Sans, Fredoka, Lobster_Two, Mulish } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { STORE_NAME } from "@/lib/format";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["700", "800"],
});

// Chunky rounded display face for the Kid's Spot wordmark (closest Google font to the logo lettering).
const logoFont = Fredoka({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Script display face used in the hero ("SALE OFF", "Anything for your baby").
const lobster = Lobster_Two({
  variable: "--font-lobster",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: {
    default: `${STORE_NAME} · Kids fashion & essentials`,
    template: `%s · ${STORE_NAME}`,
  },
  description: "Clothes, accessories and more for kids of every age.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${mulish.variable} ${logoFont.variable} ${lobster.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MotionProvider />
        {children}
      </body>
    </html>
  );
}
