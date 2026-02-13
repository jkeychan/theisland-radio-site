import { RecordingsList } from "@/components/RecordingsList";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata = {
  title: "Recordings • The Island",
};

export default function RecordingsPage() {
  return (
    <ScrollReveal direction="up">
    <div className="space-y-12 py-12 sm:py-16 relative z-10">
      <header className="space-y-4 text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold section-heading section-heading-light">
          Show Recordings
        </h1>
        <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white/90 font-[family-name:var(--font-island-moments)]">
          Listen back to recent episodes.
        </p>
      </header>

      <RecordingsList />
    </div>
    </ScrollReveal>
  );
}


