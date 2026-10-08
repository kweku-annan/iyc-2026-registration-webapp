/**
 * Contact section.
 *
 * Update CONTACTS below with the real organizer details before launch.
 */
import { Phone, Mail, Globe, Camera, Video, PlayCircle } from "lucide-react";

const CONTACTS = [
  {
    icon: <Phone size={20} />,
    label: "WhatsApp / Call",
    value: "+233 24 633 9623",
    href: "https://wa.me/233246339623",
    id: "contact-whatsapp-1",
  },
  {
    icon: <Phone size={20} />,
    label: "WhatsApp / Call",
    value: "+233 54 089 7779",
    href: "https://wa.me/233540897779",
    id: "contact-whatsapp-2",
  },
  {
    icon: <Phone size={20} />,
    label: "WhatsApp / Call",
    value: "+233 59 256 2930",
    href: "https://wa.me/233592562930",
    id: "contact-whatsapp-3",
  },
  {
    icon: <Mail size={20} />,
    label: "Email",
    value: "int.youthforchrist@gmail.com",
    href: "mailto:int.youthforchrist@gmail.com",
    id: "contact-email",
  },
];

export const SOCIAL = [
  { icon: <Globe size={20} />, label: "Facebook", href: "https://web.facebook.com/profile.php?id=61586402571201", id: "social-facebook" },
  { icon: <Camera size={20} />, label: "Instagram", href: "https://www.instagram.com/internationalyouthforchrist_", id: "social-instagram" },
  { icon: <Video size={20} />, label: "TikTok", href: "https://www.tiktok.com/@intlyouthforchrist", id: "social-tiktok" },
  { icon: <PlayCircle size={20} />, label: "YouTube", href: "https://www.youtube.com/@int.youthforchrist", id: "social-youtube" },
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
          className="font-sans text-sm mb-14"
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
        <div className="mt-12">
          <p
            className="font-sans text-xs uppercase tracking-widest mb-10"
            style={{ color: "var(--color-ice)" }}
          >
            Follow us on social media
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {SOCIAL.map((s) => (
              <a
                key={s.id}
                id={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex items-center gap-3 font-sans text-sm transition-all duration-300 hover:-translate-y-1 hover:opacity-100 rounded-full px-5 py-3 shadow-lg"
                style={{ 
                  color: "var(--color-ice)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(103,163,177,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(216,245,249,0.15)";
                  e.currentTarget.style.borderColor = "var(--color-ice)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(103,163,177,0.3)";
                }}
              >
                <span aria-hidden="true">{s.icon}</span>
                <span className="font-medium tracking-wide">{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
