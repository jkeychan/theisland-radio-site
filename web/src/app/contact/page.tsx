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
          Contact
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {!contactFormConfigured ? (
            <div style={{ background: 'var(--gold-cream)', padding: '16px 20px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gold-mid)' }}>
              Contact form is not configured. Set <code>NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code> and <code>NEXT_PUBLIC_FORMSPREE_FORM_ID</code> in your environment (see <code>.env.example</code>).
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-mid)', display: 'block', marginBottom: 6 }}>
                  Name
                </label>
                <input
                  name="name"
                  required
                  disabled={isSubmitting}
                  style={{ width: '100%', background: 'var(--gold-cream)', border: '1.5px solid var(--gold-deep)', borderRadius: 0, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-mid)', display: 'block', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={isSubmitting}
                  style={{ width: '100%', background: 'var(--gold-cream)', border: '1.5px solid var(--gold-deep)', borderRadius: 0, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-mid)', display: 'block', marginBottom: 6 }}>
                  Subject
                </label>
                <input
                  name="subject"
                  required
                  disabled={isSubmitting}
                  style={{ width: '100%', background: 'var(--gold-cream)', border: '1.5px solid var(--gold-deep)', borderRadius: 0, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-mid)', display: 'block', marginBottom: 6 }}>
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  disabled={isSubmitting}
                  style={{ width: '100%', background: 'var(--gold-cream)', border: '1.5px solid var(--gold-deep)', borderRadius: 0, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                />
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div
                  style={{ background: 'var(--gold-cream)', borderLeft: '6px solid var(--green)', padding: '16px 20px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--green)', marginBottom: 20 }}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  Message sent successfully! We&apos;ll get back to you soon.
                </div>
              )}
              {submitStatus === "error" && (
                <div
                  style={{ background: 'var(--gold-cream)', borderLeft: '6px solid var(--red)', padding: '16px 20px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--red)', marginBottom: 20 }}
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  There was an error sending your message. Please try again.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !recaptchaReady}
                style={{
                  background: 'var(--red)',
                  color: 'var(--gold-cream)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  border: 'none',
                  borderRadius: 0,
                  padding: '12px 28px',
                  cursor: isSubmitting || !recaptchaReady ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !recaptchaReady ? 0.6 : 1,
                }}
              >
                {isSubmitting ? "Sending..." : !recaptchaReady ? "Loading..." : "Send"}
              </button>

              {/* Hidden fields for Formspree */}
              <input type="hidden" name="_subject" value="Contact Form Submission — The Island" />
              <input type="hidden" name="_gotcha" />
            </form>
          )}
        </div>
      </div>
    </>
  );
}
