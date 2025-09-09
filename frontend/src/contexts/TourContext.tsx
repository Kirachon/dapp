"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type TourCtx = {
  active: boolean;
  step: number;
  startTour: () => void;
  next: () => void;
  stop: () => void;
};

const Ctx = createContext<TourCtx | null>(null);

const steps = [
  { id: "photos", title: "Add Photos", body: "Upload your best photos from the Photos section." },
  { id: "about", title: "Complete About", body: "Tell others about yourself to get better matches." },
  { id: "filters", title: "Set Preferences", body: "Adjust age and distance to refine your feed." },
];

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem("tour_completed");
    if (!completed) {
      // show nudge later via Start button; do not auto-start
    }
  }, []);

  const startTour = () => { setActive(true); setStep(0); };
  const next = () => {
    if (step + 1 < steps.length) setStep(step + 1);
    else { setActive(false); localStorage.setItem("tour_completed", "1"); }
  };
  const stop = () => { setActive(false); };

  return (
    <Ctx.Provider value={{ active, step, startTour, next, stop }}>
      {children}
      {active && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={stop} aria-label="Close tour overlay"></div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-4 rounded-xl shadow-xl w-[90%] max-w-md">
            <div className="font-semibold">{steps[step].title}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">{steps[step].body}</div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={stop} className="px-3 py-2 rounded border">Skip</button>
              <button onClick={next} className="px-3 py-2 rounded bg-[var(--color-primary-500)] text-white">{step+1<steps.length?"Next":"Finish"}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

