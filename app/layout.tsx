import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source-sans-3",
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
      className={`${newsreader.variable} ${sourceSans3.variable}`}
    >
      <body className="bg-[#000000] text-[#E6E6E6] antialiased selection:bg-[#0B1A4A] selection:text-[#6C86FF]">
        {/* Faint light film grain (4% opacity SVG noise with screen blend) */}
        <div className="film-grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
