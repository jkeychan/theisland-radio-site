import { RecordingsList } from "@/components/RecordingsList";

export const metadata = {
  title: "Recordings • The Island",
};

export default function RecordingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Show Recordings</h1>
        <p className="text-theme-gold">Listen back to recent episodes.</p>
      </header>

      <RecordingsList />
    </div>
  );
}


