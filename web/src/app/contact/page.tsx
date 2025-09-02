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
          className="rounded-lg border card-dark p-4 shadow-sm"
          action="https://formspree.io/f/movnkqbe"
          method="POST"
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-white">Name</span>
              <input name="name" required className="w-full rounded-md border px-3 py-2 bg-white/90" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-white">Email</span>
              <input name="email" type="email" required className="w-full rounded-md border px-3 py-2 bg-white/90" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-white">Subject</span>
              <input name="subject" required className="w-full rounded-md border px-3 py-2 bg-white/90" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-white">Message</span>
              <textarea name="message" required rows={6} className="w-full rounded-md border px-3 py-2 bg-white/90" />
            </label>
            <button className="btn btn-primary" type="submit">Send</button>
            {/* Silent recipient routing without exposing address */}
            <input type="hidden" name="_subject" value="Contact Form Submission — The Island" />
            <input type="hidden" name="_gotcha" />
          </div>
          {/* Email intentionally hidden from the page to avoid indexing */}
        </form>

        <section className="rounded-lg border card-dark p-4 shadow-sm text-sm text-theme-gold">
          <h2 className="text-xl font-medium text-white">Station Info</h2>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="font-medium">Request Line</dt>
              <dd>828-222-6317</dd>
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


