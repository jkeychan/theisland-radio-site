export const metadata = {
  title: "Contact • The Island",
};

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Contact</h1>
        <p className="text-theme-gold">Reach out to The Island on WART 95.5 FM.</p>
        <dl className="mt-2 text-sm flex flex-wrap gap-x-8 gap-y-1">
          <div>
            <dt className="font-medium text-white">Text or Call the Request Line</dt>
            <dd className="text-theme-gold">828-222-6317</dd>
          </div>
          <div>
            <dt className="font-medium text-white">Station Website</dt>
            <dd className="text-theme-gold">
              <a className="underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <form
          className="rounded-lg border card-dark p-4 shadow-sm h-full"
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

        <section className="relative overflow-hidden rounded-lg border card-dark p-0 shadow-sm h-full" aria-label="Station art">
          <div className="absolute inset-0 -z-0 opacity-90" style={{ backgroundImage: "url(/images/dub-tractor-theisland-logo-transparent-2.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} aria-hidden></div>
        </section>
      </div>
    </div>
  );
}


