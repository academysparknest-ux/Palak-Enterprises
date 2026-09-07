import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isFirstMount = useRef(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translate3d(0, 0, 0)" : "translate3d(0, 8px, 0)",
        transition: "opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
};
