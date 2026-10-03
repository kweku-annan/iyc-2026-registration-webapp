/**
 * Countdown — live timer to the event start: 23 December 2026 00:00 WAT (UTC+0).
 * Updates every second. Hides itself once the event has started.
 */

import { useEffect, useState } from "react";

// 23 Dec 2026 00:00:00 UTC  (WAT = UTC+0, so no offset needed)
const EVENT_START = new Date("2026-12-23T00:00:00Z").getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function compute(): TimeLeft | null {
  const diff = EVENT_START - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return { days, hours, minutes, seconds };
}

function Digit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-xl px-3 py-2 sm:px-5 sm:py-3 font-serif tabular-nums min-w-[3rem] sm:min-w-[4.5rem] text-center"
        style={{
          fontSize: "clamp(1.6rem, 5vw, 3rem)",
          color: "var(--color-ice)",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(103,163,177,0.2)",
          textShadow: "0 0 20px rgba(216,245,249,0.3)",
          letterSpacing: "0.05em",
        }}
      >
        {display}
      </div>
      <span
        className="font-sans text-[10px] sm:text-xs uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
    </div>
  );
}

export function CountdownSection() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(compute);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(compute()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) return null; // hide after event starts

  return (
    <section
      id="countdown"
      className="py-20 px-5 text-center"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
    >
      <p
        className="font-sans text-xs uppercase tracking-[0.3em] mb-5"
        style={{ color: "var(--color-highlight)" }}
      >
        Camp Meeting begins in
      </p>
      <div
        className="flex items-start justify-center gap-3 sm:gap-5"
        role="timer"
        aria-live="off"
        aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds until the camp meeting`}
      >
        <Digit value={timeLeft.days} label="Days" />
        <span
          className="font-serif mt-2 sm:mt-3"
          style={{ fontSize: "clamp(1.4rem,4vw,2.5rem)", color: "rgba(216,245,249,0.5)" }}
          aria-hidden="true"
        >
          :
        </span>
        <Digit value={timeLeft.hours} label="Hours" />
        <span
          className="font-serif mt-2 sm:mt-3"
          style={{ fontSize: "clamp(1.4rem,4vw,2.5rem)", color: "rgba(216,245,249,0.5)" }}
          aria-hidden="true"
        >
          :
        </span>
        <Digit value={timeLeft.minutes} label="Minutes" />
        <span
          className="font-serif mt-2 sm:mt-3"
          style={{ fontSize: "clamp(1.4rem,4vw,2.5rem)", color: "rgba(216,245,249,0.5)" }}
          aria-hidden="true"
        >
          :
        </span>
        <Digit value={timeLeft.seconds} label="Seconds" />
      </div>
    </section>
  );
}
