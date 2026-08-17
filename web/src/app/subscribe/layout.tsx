import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe • The Island",
  description:
    "Subscribe to The Island's podcast feed — get every new episode in your podcast app automatically.",
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
