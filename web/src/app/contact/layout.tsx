import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact • The Island",
  description: "Get in touch with DJ Dub Tractor and The Island radio show on WART 95.5 FM.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
