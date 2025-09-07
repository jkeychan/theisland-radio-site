"use client";

import { useState, useRef } from "react";
import Script from "next/script";

const RECAPTCHA_SITE_KEY = "6LdDWMErAAAAAHXrUTKEYmc_WpT_VQPdG0mCnBTy";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
      const response = await fetch("https://formspree.io/f/movnkqbe", {
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
      {/* reCAPTCHA v3 Script - Standard API for Formspree compatibility */}
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
        onLoad={handleRecaptchaLoad}
      />
      
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
          {/* On mobile, show the art between details and the form by ordering first in DOM for lg, and below header via responsive order classes */}
          <section className="rounded-lg border card-dark p-2 shadow-sm h-48 sm:h-64 lg:h-full order-2 lg:order-none flex items-center justify-center" aria-label="Station art">
            <img
              src="/images/dub-tractor-theisland-logo-transparent-2.png"
              alt="Dub Tractor artwork"
              className="max-h-full w-auto object-contain"
            />
          </section>

          <form
            ref={formRef}
            className="rounded-lg border card-dark p-4 shadow-sm h-full order-3 lg:order-none"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-white">Name</span>
                <input 
                  name="name" 
                  required 
                  className="w-full rounded-md border px-3 py-2 bg-white/90" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-white">Email</span>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  className="w-full rounded-md border px-3 py-2 bg-white/90" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-white">Subject</span>
                <input 
                  name="subject" 
                  required 
                  className="w-full rounded-md border px-3 py-2 bg-white/90" 
                  disabled={isSubmitting}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-white">Message</span>
                <textarea 
                  name="message" 
                  required 
                  rows={6} 
                  className="w-full rounded-md border px-3 py-2 bg-white/90" 
                  disabled={isSubmitting}
                />
              </label>
              
              {/* Status Messages */}
              {submitStatus === "success" && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                  Message sent successfully! We&apos;ll get back to you soon.
                </div>
              )}
              {submitStatus === "error" && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
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
        </div>
      </div>
    </>
  );
}