import { events } from "@/data/events";

export const metadata = {
  title: "Community Events • The Island",
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Community Events</h1>
        <p className="text-theme-gold">Local Madison County music and community happenings.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {events.map((e) => (
          <article key={e.id} className="card card-accent p-4">
            <h2 className="text-xl font-medium">{e.title}</h2>
            <p className="text-sm text-theme-gold">{e.date}</p>
            <div className="text-sm text-theme-gold">
              {e.venue ? <span>{e.venue}</span> : null}
              {e.location ? <span> · {e.location}</span> : null}
            </div>
            {e.description ? <p className="mt-2">{e.description}</p> : null}
            {e.url ? (
              <a className="mt-3 inline-block text-[--rasta-red] underline underline-offset-4" href={e.url} target="_blank" rel="noreferrer noopener">
                More info
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}


