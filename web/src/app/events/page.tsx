import { events } from "@/data/events";

export const metadata = {
  title: "Community Events • The Island",
};

export default function EventsPage() {
  return (
    <div>
      {/* Page header band */}
      <div style={{
        background: 'var(--gold-dark)',
        padding: '40px 44px 32px',
        position: 'relative',
      }}>
        {/* Three-stripe bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
          background: 'linear-gradient(90deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%)'
        }} />
        <h1 style={{ fontWeight: 900, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
          Events
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44 }}>
        {events.length === 0 ? (
          <div style={{
            background: 'var(--gold-cream)',
            borderLeft: '4px solid var(--green)',
            padding: '20px 20px 20px 26px',
          }}>
            <p style={{ color: 'var(--gold-dark)', margin: 0 }}>
              No upcoming events. Stay tuned.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {events.map((e) => (
              <article key={e.id} style={{
                background: 'var(--gold-cream)',
                borderLeft: '4px solid var(--green)',
                padding: '20px 20px 20px 26px',
              }}>
                <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--gold-dark)', margin: '0 0 4px' }}>{e.title}</h2>
                <p style={{ fontSize: 15, color: 'var(--gold-dark)', margin: '0 0 4px' }}>{e.date}</p>
                <div style={{ fontSize: 15, color: 'var(--gold-dark)' }}>
                  {[e.venue, e.location].filter(Boolean).join(", ")}
                </div>
                {e.description ? (
                  <p style={{ fontSize: 14, color: 'var(--gold-dark)', marginTop: 8 }}>{e.description}</p>
                ) : null}
                {e.url ? (
                  <a
                    style={{ display: 'inline-block', marginTop: 12, fontSize: 15, color: 'var(--red)', textDecoration: 'underline' }}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    More info
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
