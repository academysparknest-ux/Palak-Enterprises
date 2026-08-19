import React, { useEffect, useRef, useState } from "react";

interface AnimatedPriceProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  durationMs?: number;
}

export const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  value,
  prefix = "₹",
  suffix = "",
  className = "",
  durationMs = 300,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplayValue(value);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || value === previousValueRef.current) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startVal = previousValueRef.current;
    const endVal = value;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic: 1 - (1-t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endVal);
        previousValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, durationMs]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
};
