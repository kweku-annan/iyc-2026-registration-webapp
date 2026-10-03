/**
 * Venue section.
 *
 * Update VENUE below when the organizer confirms the location.
 * The Google Maps link opens in the browser/Maps app on mobile.
 */

const VENUE = {
  name: "TBA — Venue to be announced",
  address: "Location details will be shared with registered attendees.",
  // Set to a real Google Maps URL once confirmed, e.g.:
  // mapUrl: "https://maps.google.com/?q=5.6037,−0.1870",
  mapUrl: null as string | null,
  notes: [
    "Accommodation is provided at the camp. Bring personal toiletries and bedding.",
    "Transport arrangements will be communicated via the WhatsApp broadcast group.",
    "For special assistance or travel enquiries, see the Contact section below.",
  ],
};

export function VenueSection() {
  return (
    <section
      id="venue"
      className="py-20 px-5"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="font-sans text-xs uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-highlight)" }}
          >
            Getting here
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            Venue
          </h2>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(103,163,177,0.2)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {/* Map placeholder / link */}
          <div
            className="w-full flex items-center justify-center"
            style={{
              height: 220,
              background: "linear-gradient(135deg, rgba(28,110,134,0.6) 0%, rgba(71,140,161,0.4) 100%)",
              borderBottom: "1px solid rgba(103,163,177,0.15)",
            }}
          >
            {VENUE.mapUrl ? (
              <a
                href={VENUE.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="venue-map-link"
                className="flex flex-col items-center gap-2 font-sans text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "var(--color-ice)" }}
              >
                <span className="text-4xl" aria-hidden="true">📍</span>
                View on Google Maps ↗
              </a>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <span className="text-4xl" aria-hidden="true">📍</span>
                <p
                  className="font-serif text-xl"
                  style={{ color: "var(--color-ice)" }}
                >
                  Venue to be announced
                </p>
                <p
                  className="font-sans text-sm"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Map will appear here once the location is confirmed.
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <p
                className="font-serif text-xl mb-1"
                style={{ color: "var(--color-ice)" }}
              >
                {VENUE.name}
              </p>
              <p
                className="font-sans text-sm"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {VENUE.address}
              </p>
            </div>

            <ul className="flex flex-col gap-2">
              {VENUE.notes.map((note, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 font-sans text-sm"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  <span
                    className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(103,163,177,0.2)", color: "var(--color-highlight)" }}
                    aria-hidden="true"
                  >
                    ℹ
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
