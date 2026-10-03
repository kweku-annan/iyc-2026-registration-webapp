/**
 * FAQ — accordion section.
 *
 * Add, remove, or edit questions in the FAQS array below.
 * One item open at a time; keyboard-accessible.
 */

import { useState } from "react";

const FAQS = [
  {
    q: "Who can attend IYC Camp Meeting 2026?",
    a: "The camp meeting is open to everyone — young people, families, and anyone who wants to experience the power of the Holy Spirit. There are no age restrictions.",
  },
  {
    q: "Is registration free?",
    a: "Yes, registration is completely free. Accommodation and meals at the camp are provided at no cost to registered attendees.",
  },
  {
    q: "Do I need to bring anything?",
    a: "Please bring personal toiletries, a Bible, a notebook, and comfortable clothing. Bedding will be provided but you are welcome to bring your own if you prefer. Full packing details will be sent to registered attendees closer to the event.",
  },
  {
    q: "What if I can't make it all four days?",
    a: "You are still welcome to register and attend for as many days as you can. Please let the organizing team know so they can plan catering accordingly.",
  },
  {
    q: "I registered but lost my ticket link. What do I do?",
    a: "Your ticket link was sent to your phone via SMS when you registered. Try searching for the message. If you can't find it, register again with the same phone number and we will resend the link automatically.",
  },
  {
    q: "How does check-in work on the day?",
    a: "Show the QR code on your ticket page to a volunteer at the entrance. They will scan it with their phone to confirm your attendance. If you don't have a smartphone, simply give the volunteer your alphanumeric ticket code (XXXX-XXXX) and they can look you up.",
  },
  {
    q: "Can I register for someone else?",
    a: "Each registration is linked to a unique phone number. The person attending should use their own phone number so they receive the ticket SMS directly.",
  },
  {
    q: "I need special assistance or accommodation. Who do I contact?",
    a: "Please reach out to the organizing team using the contact details in the Contact section below. We are happy to assist.",
  },
  {
    q: "Will there be transport from Accra?",
    a: "Transport arrangements are being planned. Details will be announced through our WhatsApp broadcast group and on this page as the event approaches.",
  },
];

function FaqItem({
  q,
  a,
  isOpen,
  onToggle,
  id,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${isOpen ? "rgba(103,163,177,0.4)" : "rgba(103,163,177,0.15)"}`,
        background: isOpen ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
      }}
    >
      <button
        id={`faq-btn-${id}`}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${id}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-sans font-medium text-sm transition-colors"
        style={{ color: isOpen ? "var(--color-ice)" : "rgba(255,255,255,0.8)", minHeight: 56 }}
      >
        <span>{q}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform duration-300"
          style={{
            background: "rgba(103,163,177,0.2)",
            color: "var(--color-highlight)",
            transform: isOpen ? "rotate(45deg)" : "none",
          }}
          aria-hidden="true"
        >
          +
        </span>
      </button>

      <div
        id={`faq-answer-${id}`}
        role="region"
        aria-labelledby={`faq-btn-${id}`}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? 400 : 0 }}
      >
        <p
          className="px-5 pb-5 font-sans text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="py-20 px-5"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="font-sans text-xs uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-highlight)" }}
          >
            Got questions?
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <FaqItem
              key={i}
              id={String(i)}
              q={faq.q}
              a={faq.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
