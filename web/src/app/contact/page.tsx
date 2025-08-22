export const metadata = {
  title: "Contact • The Island",
};

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Contact</h1>
        <p className="text-theme-gold">Reach out to The Island on WART 95.5 FM.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          className="rounded-lg border bg-white/80 p-4 shadow-sm"
          action="https://formspree.io/f/xbldkqvr"
          method="POST"
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Name</span>
              <input name="name" required className="w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input name="email" type="email" required className="w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Subject</span>
              <input name="subject" required className="w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Message</span>
              <textarea name="message" required rows={6} className="w-full rounded-md border px-3 py-2" />
            </label>
            <button className="btn btn-primary" type="submit">Send</button>
          </div>
          {/* Email intentionally hidden from the page to avoid indexing */}
        </form>

        <section className="rounded-lg border bg-white/80 p-4 shadow-sm text-sm text-theme-gold">
          <h2 className="text-xl font-medium text-[--rasta-green]">Station Info</h2>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="font-medium">Request Line</dt>
              <dd>(555) 123-4567</dd>
            </div>
            <div>
              <dt className="font-medium">Station Website</dt>
              <dd><a className="underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a></dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}


