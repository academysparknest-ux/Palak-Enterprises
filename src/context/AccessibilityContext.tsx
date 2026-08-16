import React, { createContext, useContext, useState, useEffect } from "react";

type FontSize = "normal" | "large" | "xlarge";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (active: boolean) => void;
  toggleHighContrast: () => void;
  seniorMode: boolean;
  setSeniorMode: (active: boolean) => void;
  toggleSeniorMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      return (localStorage.getItem("palak_fontSize") as FontSize) || "normal";
    } catch {
      return "normal";
    }
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("palak_contrast") === "true";
    } catch {
      return false;
    }
  });

  const [seniorMode, setSeniorModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("palak_senior") === "true";
    } catch {
      return false;
    }
  });

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    try {
      localStorage.setItem("palak_fontSize", size);
    } catch {
      // Safe fallback
    }
  };

  const setHighContrast = (active: boolean) => {
    setHighContrastState(active);
    try {
      localStorage.setItem("palak_contrast", String(active));
    } catch {
      // Safe fallback
    }
  };

  const toggleHighContrast = () => setHighContrast(!highContrast);

  const setSeniorMode = (active: boolean) => {
    setSeniorModeState(active);
    try {
      localStorage.setItem("palak_senior", String(active));
    } catch {
      // Safe fallback
    }
    if (active) {
      setFontSizeState("large");
    } else {
      setFontSizeState("normal");
    }
  };

  const toggleSeniorMode = () => setSeniorMode(!seniorMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-size-normal", "text-size-large", "text-size-xlarge");
    root.classList.add(`text-size-${fontSize}`);

    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    if (seniorMode) {
      root.classList.add("senior-mode");
    } else {
      root.classList.remove("senior-mode");
    }
  }, [fontSize, highContrast, seniorMode]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        toggleHighContrast,
        seniorMode,
        setSeniorMode,
        toggleSeniorMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
