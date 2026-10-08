import type { Metadata } from "next";
import { Anton, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source-sans-3",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Filmmaker Platform",
  description: "A platform for creatives to publish 1 to 3 minute microfilms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${sourceSans3.variable}`}>
      <body className="bg-[#000000] text-[#E6E6E6] antialiased">
        {/* Faint light film grain (4% opacity SVG noise with screen blend) */}
        <div className="film-grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
