import { events } from "@/data/events";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata = {
  title: "Community Events • The Island",
};

export default function EventsPage() {
  return (
    <ScrollReveal direction="up">
    <div className="space-y-12 py-12 sm:py-16 relative z-10">
      <header className="space-y-4 text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold section-heading section-heading-light">
          Community Events
        </h1>
        <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white/90 font-[family-name:var(--font-island-moments)]">
          Local Madison County music and community happenings.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card card-accent card-dark p-6">
            <h2 className="text-xl font-medium text-white font-[family-name:var(--font-reggae-one)]">Marshall, NC Community Events Calendar</h2>
            <p className="mt-2 text-theme-gold">
              <a 
                href="https://exploremarshallnc.com/event-calendar/" 
                target="_blank" 
                rel="noreferrer noopener"
                className="text-[--island-red] underline underline-offset-4 hover:text-[--island-gold] transition-colors duration-200"
                aria-label="Visit Marshall, NC Community Events Calendar (opens in new tab)"
              >
                https://exploremarshallnc.com/event-calendar/
              </a>
            </p>
          </div>
          
          <div className="card card-accent card-dark p-6">
            <h2 className="text-xl font-medium text-white font-[family-name:var(--font-reggae-one)]">Madison County Community Learning Centers</h2>
            <p className="mt-2 text-theme-gold">
              <a 
                href="https://www.madisoncclc.org/upcoming-events" 
                target="_blank" 
                rel="noreferrer noopener"
                className="text-[--island-red] underline underline-offset-4 hover:text-[--island-gold] transition-colors duration-200"
                aria-label="Visit Madison County Community Learning Centers Events (opens in new tab)"
              >
                https://www.madisoncclc.org/upcoming-events
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((e) => (
            <article key={e.id} className="card card-accent p-4">
              <h2 className="text-xl font-medium font-[family-name:var(--font-reggae-one)]">{e.title}</h2>
              <p className="text-sm text-theme-gold">{e.date}</p>
              <div className="text-sm text-theme-gold">
                {e.venue ? <span>{e.venue}</span> : null}
                {e.location ? <span> · {e.location}</span> : null}
              </div>
              {e.description ? <p className="mt-2">{e.description}</p> : null}
              {e.url ? (
                <a className="mt-3 inline-block text-[--island-red] underline underline-offset-4" href={e.url} target="_blank" rel="noreferrer noopener">
                  More info
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
    </ScrollReveal>
  );
}


