import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SWRegister } from "@/components/pwa/SWRegister";
import { SITE_URL } from "@/lib/site";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kaap: everything worth doing in the Cape",
    template: "%s · Kaap",
  },
  description:
    "Discover the best of Cape Town: restaurants, bars, outdoor adventures, classes, arts and lowkey local gems, with honest Rand prices and live opening hours.",
  applicationName: "Kaap",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kaap" },
  openGraph: {
    type: "website",
    siteName: "Kaap",
    title: "Kaap: everything worth doing in the Cape",
    description:
      "Cape Town's restaurants, bars, outdoor adventures, classes, arts and lowkey local gems, mapped, priced and ready when you are.",
  },
};

export const viewport: Viewport = {
  themeColor: "#efe8d8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hanken.variable} ${instrument.variable} antialiased`}>
      <body className="min-h-screen">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
