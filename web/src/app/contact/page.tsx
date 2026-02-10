"use client";

import { useState, useRef, useEffect } from "react";
import Script from "next/script";

const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "6LdDWMErAAAAAHXrUTKEYmc_WpT_VQPdG0mCnBTy";
const FORMSPREE_ENDPOINT =
  process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT ??
  (process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID
    ? `https://formspree.io/f/${process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID}`
    : "https://formspree.io/f/movnkqbe");
const contactFormConfigured = Boolean(RECAPTCHA_SITE_KEY && FORMSPREE_ENDPOINT);

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Cleanup reCAPTCHA elements when component unmounts
  useEffect(() => {
    return () => {
      // Remove reCAPTCHA badge and any other reCAPTCHA elements
      const recaptchaBadge = document.querySelector('.grecaptcha-badge');
      if (recaptchaBadge) {
        recaptchaBadge.remove();
      }
      
      // Remove any reCAPTCHA iframes
      const recaptchaIframes = document.querySelectorAll('iframe[src*="recaptcha"]');
      recaptchaIframes.forEach(iframe => iframe.remove());
      
      // Remove any reCAPTCHA scripts
      const recaptchaScripts = document.querySelectorAll('script[src*="recaptcha"]');
      recaptchaScripts.forEach(script => script.remove());
      
      // Remove any reCAPTCHA containers or overlays
      const recaptchaContainers = document.querySelectorAll('[id*="recaptcha"]');
      recaptchaContainers.forEach(container => container.remove());
      
      // Clear the global grecaptcha object
      if (typeof window !== 'undefined' && window.grecaptcha) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).grecaptcha = undefined;
      }
      
      // Reset the ready state
      setRecaptchaReady(false);
    };
  }, []);

  // Initialize reCAPTCHA when script loads
  const handleRecaptchaLoad = () => {
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setRecaptchaReady(true);
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Check if reCAPTCHA is loaded and ready
      if (!window.grecaptcha || !recaptchaReady) {
        console.error("reCAPTCHA not ready");
        setSubmitStatus("error");
        return;
      }

      // Get reCAPTCHA token
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "contact_form" });
      
      // Get form data using ref
      const form = formRef.current;
      
      if (!form) {
        console.error("Form ref is null");
        setSubmitStatus("error");
        return;
      }
      
      const formData = new FormData(form);
      
      // Manually add form fields to ensure they're included
      const nameField = form.elements.namedItem('name') as HTMLInputElement;
      const emailField = form.elements.namedItem('email') as HTMLInputElement;
      const subjectField = form.elements.namedItem('subject') as HTMLInputElement;
      const messageField = form.elements.namedItem('message') as HTMLTextAreaElement;
      
      if (nameField?.value) formData.set('name', nameField.value);
      if (emailField?.value) formData.set('email', emailField.value);
      if (subjectField?.value) formData.set('subject', subjectField.value);
      if (messageField?.value) formData.set('message', messageField.value);
      
      formData.append("g-recaptcha-response", token);

      // Submit to Formspree
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });


      if (response.ok) {
        setSubmitStatus("success");
        form.reset();
      } else {
        const errorText = await response.text();
        console.error("Formspree error response:", errorText);
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      {contactFormConfigured && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
          onLoad={handleRecaptchaLoad}
        />
      )}

      <div className="space-y-12 py-12 sm:py-16 relative z-10">
        <header className="space-y-4 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold section-heading section-heading-light">
            Contact
          </h1>
          <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white/90 font-[family-name:var(--font-island-moments)]">
            Reach out to The Island on WART 95.5 FM.
          </p>
          <dl className="mt-6 text-base sm:text-lg flex flex-wrap justify-center gap-x-8 gap-y-3">
            <div>
              <dt className="font-semibold text-white">Text or Call the Request Line</dt>
              <dd className="text-theme-gold font-medium">828-222-6317</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Station Website</dt>
              <dd className="text-theme-gold">
                <a className="underline font-medium hover:text-theme-red transition-colors" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a>
              </dd>
            </div>
          </dl>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
          <div className="order-2 lg:order-none flex items-start justify-center lg:justify-start" aria-label="Station art">
            <picture>
              <source srcSet="/images/hero-animation-trimmed.webp" type="image/webp" />
              <img
                src="/images/hero-animation-trimmed.gif"
                alt="Dub Tractor animation"
                className="w-auto h-auto"
              />
            </picture>
          </div>

          {!contactFormConfigured ? (
            <div className="rounded-lg border card-dark p-6 flex items-center justify-center">
              <p className="text-theme-gold text-center">
                Contact form is not configured. Set <code className="text-white">NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code> and <code className="text-white">NEXT_PUBLIC_FORMSPREE_FORM_ID</code> in your environment (see <code className="text-white">.env.example</code>).
              </p>
            </div>
          ) : (
          <form
            ref={formRef}
            className="card h-full order-3 lg:order-none"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-5">
              <label className="block">
                <span className="mb-2 block font-semibold text-white">Name</span>
                <input 
                  name="name" 
                  required 
                  className="w-full rounded-lg border-2 border-white/30 px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:border-theme-gold focus:outline-none transition-colors" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold text-white">Email</span>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  className="w-full rounded-lg border-2 border-white/30 px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:border-theme-gold focus:outline-none transition-colors" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold text-white">Subject</span>
                <input 
                  name="subject" 
                  required 
                  className="w-full rounded-lg border-2 border-white/30 px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:border-theme-gold focus:outline-none transition-colors" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold text-white">Message</span>
                <textarea 
                  name="message" 
                  required 
                  rows={6} 
                  className="w-full rounded-lg border-2 border-white/30 px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:border-theme-gold focus:outline-none transition-colors" 
                  disabled={isSubmitting}
                />
              </label>
              
              {/* Status Messages */}
              {submitStatus === "success" && (
                <div
                  className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  Message sent successfully! We&apos;ll get back to you soon.
                </div>
              )}
              {submitStatus === "error" && (
                <div
                  className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  There was an error sending your message. Please try again.
                </div>
              )}
              
              <button 
                className="btn btn-primary" 
                type="submit" 
                disabled={isSubmitting || !recaptchaReady}
              >
                {isSubmitting ? "Sending..." : !recaptchaReady ? "Loading..." : "Send"}
              </button>
              
              {/* Hidden fields for Formspree */}
              <input type="hidden" name="_subject" value="Contact Form Submission — The Island" />
              <input type="hidden" name="_gotcha" />
            </div>
          </form>
          )}
        </div>
      </div>
    </>
  );
}