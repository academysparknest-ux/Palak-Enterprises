import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";

export interface BrandItem {
  prefix: string;
  highlight: string;
  full?: string;
}

export interface AnimatedBrandHeadlineProps {
  items?: BrandItem[];
  names?: string[];
  intervalMs?: number;
  intervalDuration?: number;
  transitionMs?: number;
  transitionDuration?: number;
  className?: string;
  isHindi?: boolean;
  as?: React.ElementType;
}

const DEFAULT_ITEMS_EN: BrandItem[] = [
  { prefix: "Palak Printing ", highlight: "Press", full: "Palak Printing Press" },
  { prefix: "Palak ", highlight: "Enterprises", full: "Palak Enterprises" },
];

const DEFAULT_ITEMS_HI: BrandItem[] = [
  { prefix: "पलक प्रिंटिंग ", highlight: "प्रेस", full: "पलक प्रिंटिंग प्रेस" },
  { prefix: "पलक ", highlight: "एंटरप्राइजेज", full: "पलक एंटरप्राइजेज" },
];

export const AnimatedBrandHeadline: React.FC<AnimatedBrandHeadlineProps> = ({
  items,
  names,
  intervalMs,
  intervalDuration = 2800,
  transitionMs,
  transitionDuration = 700,
  className,
  isHindi = false,
  as: Component = "h1",
}) => {
  const brandList: BrandItem[] = items
    ? items
    : names
    ? names.map((name) => {
        const parts = name.trim().split(" ");
        if (parts.length > 1) {
          const highlight = parts.pop() || "";
          const prefix = parts.join(" ") + " ";
          return { prefix, highlight, full: name };
        }
        return { prefix: name, highlight: "", full: name };
      })
    : isHindi
    ? DEFAULT_ITEMS_HI
    : DEFAULT_ITEMS_EN;

  const finalInterval = intervalMs ?? intervalDuration;
  const finalTransition = transitionMs ?? transitionDuration;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("visible");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
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

    const timer = setTimeout(() => {
      if (reducedMotion) {
        setIndex((prev) => (prev + 1) % brandList.length);
      } else {
        setPhase("exit");
      }
    }, finalInterval);

    return () => clearTimeout(timer);
  }, [index, brandList.length, finalInterval, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

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
  }, [phase, brandList.length, finalTransition, reducedMotion]);

  const longestItem = brandList.reduce((max, curr) => {
    const currLen = (curr.prefix + curr.highlight).length;
    const maxLen = (max.prefix + max.highlight).length;
    return currLen > maxLen ? curr : max;
  }, brandList[0] || { prefix: "", highlight: "" });

  const currentItem = brandList[index] || brandList[0] || { prefix: "", highlight: "" };

  return (
    <Component
      className={cn(
        "font-display text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.65rem] xl:text-5xl leading-tight",
        isHindi && "font-hindi",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="relative block w-full max-w-full overflow-hidden py-0.5">
        {/* Invisible sizing reservation to prevent layout shift */}
        <span
          className="invisible select-none pointer-events-none block"
          aria-hidden="true"
        >
          <span>{longestItem.prefix}</span>
          <span>{longestItem.highlight}</span>
        </span>

        {/* Animated Brand Name Element */}
        <span
          className={cn(
            "absolute inset-0 block transition-all ease-in-out",
            phase === "visible" && "translate-y-0 opacity-100 filter-none",
            phase === "enter" && "translate-y-2.5 opacity-0 blur-[0.5px]",
            phase === "exit" && "-translate-y-2.5 opacity-0 blur-[0.5px]",
            "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:filter-none motion-reduce:transition-none"
          )}
          style={{
            transitionDuration: reducedMotion ? "0ms" : `${finalTransition}ms`,
          }}
        >
          <span className="text-white drop-shadow-sm select-none">
            {currentItem.prefix}
          </span>
          <span className="text-amber-400 drop-shadow-sm select-none">
            {currentItem.highlight}
          </span>
        </span>
      </span>
    </Component>
  );
};

export default AnimatedBrandHeadline;
