import type { Metadata } from "next";
import { Geist, Geist_Mono, Reggae_One, Island_Moments, Exo_2 } from "next/font/google";
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

const reggaeOne = Reggae_One({
  variable: "--font-reggae-one",
  subsets: ["latin"],
  weight: "400",
});

const islandMoments = Island_Moments({
  variable: "--font-island-moments",
  subsets: ["latin"],
  weight: "400",
});

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["100", "200", "300"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${reggaeOne.variable} ${islandMoments.variable} ${exo2.variable} antialiased text-[--foreground]`}
      >
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Header />
        <main id="main-content" className="pb-0 min-h-[calc(100vh-200px)]">
          <div className="container">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
