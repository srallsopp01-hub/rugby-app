import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FYNL Whistle",
    template: "%s | FYNL Whistle",
  },
  description:
    "Coach-first rugby match tagging, review, and analysis.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
