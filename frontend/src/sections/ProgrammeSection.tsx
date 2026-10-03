/**
 * Programme / Schedule section.
 *
 * Content is editable via the PROGRAMME constant below — no backend needed.
 * Days and sessions are clearly marked as placeholders until the organizer
 * provides the final schedule.
 */

const DAYS = [
  {
    date: "Tuesday, 23 December",
    shortDate: "23 Dec",
    sessions: [
      { time: "6:00 PM", title: "Opening & Welcome Night", speaker: "TBA" },
      { time: "8:00 PM", title: "Opening Service", speaker: "TBA" },
    ],
  },
  {
    date: "Wednesday, 24 December",
    shortDate: "24 Dec",
    sessions: [
      { time: "6:00 AM", title: "Morning Devotion", speaker: "TBA" },
      { time: "10:00 AM", title: "Morning Service", speaker: "TBA" },
      { time: "3:00 PM", title: "Afternoon Seminar", speaker: "TBA" },
      { time: "7:00 PM", title: "Evening Service", speaker: "TBA" },
    ],
  },
  {
    date: "Thursday, 25 December",
    shortDate: "25 Dec",
    sessions: [
      { time: "6:00 AM", title: "Morning Devotion", speaker: "TBA" },
      { time: "10:00 AM", title: "Morning Service", speaker: "TBA" },
      { time: "3:00 PM", title: "Afternoon Seminar", speaker: "TBA" },
      { time: "7:00 PM", title: "Christmas Night Service", speaker: "TBA" },
    ],
  },
  {
    date: "Friday, 26 December",
    shortDate: "26 Dec",
    sessions: [
      { time: "6:00 AM", title: "Morning Devotion", speaker: "TBA" },
      { time: "10:00 AM", title: "Closing Service", speaker: "TBA" },
      { time: "2:00 PM", title: "Closing & Departure", speaker: "" },
    ],
  },
];

import { useState } from "react";

export function ProgrammeSection() {
  const [activeDay, setActiveDay] = useState(0);

  return (
    <section
      id="programme"
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
            IYC Camp Meeting 2026
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            Programme
          </h2>
          <p
            className="font-sans text-sm mt-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Schedule subject to change. Final timetable will be announced closer to the event.
          </p>
        </div>

        {/* Day tabs */}
        <div
          className="flex gap-2 mb-6 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Programme days"
        >
          {DAYS.map((day, i) => (
            <button
              key={day.shortDate}
              role="tab"
              id={`prog-tab-${i}`}
              aria-selected={activeDay === i}
              aria-controls={`prog-panel-${i}`}
              onClick={() => setActiveDay(i)}
              className="shrink-0 rounded-full font-sans text-sm font-medium px-4 py-2 transition-all duration-200"
              style={{
                background: activeDay === i ? "var(--color-ice)" : "rgba(255,255,255,0.07)",
                color: activeDay === i ? "var(--color-primary)" : "rgba(255,255,255,0.6)",
                border: activeDay === i ? "none" : "1px solid rgba(103,163,177,0.2)",
                minHeight: 40,
              }}
            >
              {day.shortDate}
            </button>
          ))}
        </div>

        {/* Sessions */}
        <div
          id={`prog-panel-${activeDay}`}
          role="tabpanel"
          aria-labelledby={`prog-tab-${activeDay}`}
          className="flex flex-col gap-3"
        >
          <p
            className="font-sans text-xs mb-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {DAYS[activeDay].date}
          </p>
          {DAYS[activeDay].sessions.map((session, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl px-4 py-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(103,163,177,0.15)",
              }}
            >
              {/* Time */}
              <span
                className="font-sans text-xs font-medium shrink-0 w-16 text-right pt-0.5"
                style={{ color: "var(--color-highlight)" }}
              >
                {session.time}
              </span>

              {/* Divider dot */}
              <span
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ background: "var(--color-highlight)" }}
                aria-hidden="true"
              />

              {/* Content */}
              <div className="flex flex-col gap-0.5">
                <span
                  className="font-sans font-medium text-sm"
                  style={{ color: "white" }}
                >
                  {session.title}
                </span>
                {session.speaker && (
                  <span
                    className="font-sans text-xs"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {session.speaker}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
