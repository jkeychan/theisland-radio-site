import type { Metadata } from "next";
import { Nunito, DM_Mono, Exo_2 } from 'next/font/google'
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Script from "next/script";

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['200', '300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-exo2',
  display: 'swap',
})

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
        className={`${nunito.variable} ${dmMono.variable} ${exo2.variable} antialiased`}
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
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
