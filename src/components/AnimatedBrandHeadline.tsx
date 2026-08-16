import React, { useEffect, useState, useRef } from "react";
import { cn } from "../lib/utils";

export interface AnimatedBrandHeadlineProps {
  items?: string[];
  names?: string[];
  intervalMs?: number;
  intervalDuration?: number;
  transitionMs?: number;
  transitionDuration?: number;
  className?: string;
  isHindi?: boolean;
  as?: React.ElementType;
}

export default function AnimatedBrandHeadline({
  items,
  names,
  intervalMs,
  intervalDuration = 2600,
  transitionMs,
  transitionDuration = 450,
  className,
  isHindi = false,
  as: Component = "h1",
}: AnimatedBrandHeadlineProps) {
  const brandList = items || names || ["Palak Enterprises", "Palak Printing Press"];
  const finalInterval = intervalMs ?? intervalDuration;
  const finalTransition = transitionMs ?? transitionDuration;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("visible");
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = () => {
      prefersReducedMotion.current = mediaQuery.matches;
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (brandList.length <= 1) return;

    const displayTimer = setTimeout(() => {
      if (prefersReducedMotion.current) {
        setIndex((prev) => (prev + 1) % brandList.length);
      } else {
        setPhase("exit");
      }
    }, finalInterval);

    return () => clearTimeout(displayTimer);
  }, [index, brandList.length, finalInterval]);

  useEffect(() => {
    if (phase === "exit") {
      const exitTimer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % brandList.length);
        setPhase("enter");
      }, finalTransition);

      return () => clearTimeout(exitTimer);
    } else if (phase === "enter") {
      const frame = requestAnimationFrame(() => {
        setPhase("visible");
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [phase, brandList.length, finalTransition]);

  const currentItem = brandList[index] || brandList[0];
  const longestItem = brandList.reduce(
    (max, item) => (item.length > max.length ? item : max),
    brandList[0] || ""
  );

  return (
    <Component
      className={cn(
        "font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl",
        isHindi ? "font-hindi leading-snug tracking-normal" : "leading-tight",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="relative inline-block max-w-full overflow-hidden align-middle py-1">
        {/* Invisible sizing element reserves width/height for zero layout shift */}
        <span
          className="invisible block select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true"
        >
          {longestItem}
        </span>

        {/* Animated brand headline element */}
        <span
          className={cn(
            "absolute inset-0 flex items-center transition-all cubic-bezier(0.16,1,0.3,1)",
            phase === "visible" && "translate-y-0 opacity-100",
            phase === "enter" && "translate-y-2.5 opacity-0",
            phase === "exit" && "-translate-y-2.5 opacity-0",
            "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100"
          )}
          style={{ transitionDuration: `${finalTransition}ms` }}
        >
          <span className="text-white drop-shadow-md select-none">{currentItem}</span>
        </span>
      </span>
    </Component>
  );
}

export { AnimatedBrandHeadline };
