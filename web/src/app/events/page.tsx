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
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-mid)', marginBottom: 8 }}>
          The Island · WART 95.5 FM
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
          Events
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44 }}>
        {events.length === 0 ? (
          <div style={{
            background: 'var(--gold-cream)',
            borderLeft: '6px solid transparent',
            borderImage: 'linear-gradient(180deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%) 1',
            padding: '20px 20px 20px 26px',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--gold-mid)', margin: 0 }}>
              No upcoming events. Stay tuned.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {events.map((e) => (
              <article key={e.id} style={{
                background: 'var(--gold-cream)',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderImage: 'linear-gradient(180deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%) 1',
                padding: '20px 20px 20px 26px',
              }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--gold-dark)', margin: '0 0 4px' }}>{e.title}</h2>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gold-mid)', margin: '0 0 4px' }}>{e.date}</p>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gold-mid)' }}>
                  {e.venue ? <span>{e.venue}</span> : null}
                  {e.location ? <span> · {e.location}</span> : null}
                </div>
                {e.description ? (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', marginTop: 8 }}>{e.description}</p>
                ) : null}
                {e.url ? (
                  <a
                    style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--red)', textDecoration: 'underline' }}
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
