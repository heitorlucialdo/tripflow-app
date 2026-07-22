import { useState, useEffect, useRef } from "react";

export function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const steps = 40;
          const interval = duration / steps;
          let step = 0;
          const id = setInterval(() => {
            step++;
            setValue(Math.round((target / steps) * step));
            if (step >= steps) {
              clearInterval(id);
              setValue(target);
            }
          }, interval);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}
