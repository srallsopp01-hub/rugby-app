import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Archivo_Black,
  Instrument_Serif,
  Bebas_Neue,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  weight: "400",
  variable: "--font-archivo-black",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FYNL Whistle",
    template: "%s | FYNL Whistle",
  },
  description:
    "Coach-first rugby match tagging, review, and analysis.",
  openGraph: {
    title: "FYNL Whistle",
    description: "Coach-first rugby match tagging, review, and analysis.",
    siteName: "FYNL Whistle",
    url: "https://fynlwhistle.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FYNL Whistle",
    description: "Coach-first rugby match tagging, review, and analysis.",
  },
  metadataBase: new URL("https://fynlwhistle.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function() {
      try {
        var key = "fynlwhistle-theme-scheme";
        var saved = window.localStorage.getItem(key);
        var scheme = saved === "bright" ? "bright" : "dark";
        document.documentElement.setAttribute("data-theme-scheme", scheme);
      } catch (error) {
        document.documentElement.setAttribute("data-theme-scheme", "dark");
      }
    })();
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} ${instrumentSerif.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
