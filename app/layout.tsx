import type { Metadata } from "next";
import { Pixelify_Sans, Archivo_Black, Zilla_Slab } from "next/font/google";
import "./globals.css";

const pixelifySans = Pixelify_Sans({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-pixelify-sans",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
});

const zillaSlab = Zilla_Slab({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zilla-slab",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arkee | Community for Independent Artists",
  description:
    "A Telugu-first platform for creative artists to publish 1 to 3 minute works, build an artistic profile, and connect.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pixelifySans.variable} ${archivoBlack.variable} ${zillaSlab.variable}`}
    >
      <body className="bg-[#000000] text-[#E6E6E6] antialiased selection:bg-[#0B1A4A] selection:text-[#6C86FF]">
        {/* Faint light film grain (4% opacity SVG noise with screen blend) */}
        <div className="film-grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
