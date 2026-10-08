/**
 * Contact section.
 *
 * Update CONTACTS below with the real organizer details before launch.
 */
import { Phone, Mail, Facebook, Instagram } from "lucide-react";

const CONTACTS = [
  {
    icon: <Phone size={20} />,
    label: "WhatsApp / Call",
    value: "+233 XX XXX XXXX",
    href: "https://wa.me/233XXXXXXXXX",
    id: "contact-whatsapp",
  },
  {
    icon: <Mail size={20} />,
    label: "Email",
    value: "info@iyc2026.com",
    href: "mailto:info@iyc2026.com",
    id: "contact-email",
  },
];

const SOCIAL = [
  { icon: <Facebook size={20} />, label: "Facebook", href: "https://facebook.com", id: "social-facebook" },
  { icon: <Instagram size={20} />, label: "Instagram", href: "https://instagram.com", id: "social-instagram" },
];

export function ContactSection() {
  return (
    <section
      id="contact"
      className="py-20 px-5"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Heading */}
        <p
          className="font-sans text-xs uppercase tracking-[0.3em] mb-3"
          style={{ color: "var(--color-highlight)" }}
        >
          Get in touch
        </p>
        <h2
          className="font-serif mb-3"
          style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
        >
          Contact Us
        </h2>
        <p
          className="font-sans text-sm mb-10"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Have a question not answered in the FAQ? Reach out directly.
        </p>

        {/* Contact cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              id={c.id}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 rounded-2xl p-6 transition-all duration-200 no-underline group"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(103,163,177,0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(216,245,249,0.08)";
                e.currentTarget.style.borderColor = "rgba(103,163,177,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(103,163,177,0.2)";
              }}
            >
              <span className="text-3xl" aria-hidden="true">{c.icon}</span>
              <div>
                <p
                  className="font-sans text-xs uppercase tracking-widest mb-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {c.label}
                </p>
                <p
                  className="font-sans font-medium text-base"
                  style={{ color: "var(--color-ice)" }}
                >
                  {c.value}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-4">
          {SOCIAL.map((s) => (
            <a
              key={s.id}
              id={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex items-center gap-2 font-sans text-sm transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <span aria-hidden="true">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
