import type { Metadata } from "next";
import { Geist, Geist_Mono, Righteous } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const righteous = Righteous({
  variable: "--font-righteous",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "The Island • WART 95.5 FM",
  description:
    "The Island on WART 95.5 FM — DJ Dub Tractor. Fridays 6:30–8pm ET.",
  openGraph: {
    title: "The Island • WART 95.5 FM",
    description:
      "The Island on WART 95.5 FM — DJ Dub Tractor. Fridays 6:30–8pm ET.",
    type: "website",
    url: "https://theisland.radio.fm/",
  },
  metadataBase: new URL("https://theisland.radio.fm"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${righteous.variable} antialiased bg-[--island-sand] text-[--foreground]`}
      >
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        ) : null}
        <Header />
        <main className="pb-16 pt-6">
          <div className="container">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
