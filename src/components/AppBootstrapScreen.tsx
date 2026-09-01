import React from "react";
import { business } from "../config/business";

interface AppBootstrapScreenProps {
  message?: string;
}

export const AppBootstrapScreen: React.FC<AppBootstrapScreenProps> = ({
  message = "Loading your workspace...",
}) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] p-4 text-center font-sans antialiased selection:bg-[#123B70] selection:text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading application"
    >
      {/* Subtle Background Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(18, 59, 112, 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 max-w-xs w-full">
        {/* Brand Logo with subtle pulse ring */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#123B70]/10 animate-ping opacity-30" />
          <img
            src={business.logoPath}
            alt="Palak Enterprises"
            className="relative h-14 w-14 rounded-2xl object-cover shadow-md ring-2 ring-white/80"
          />
        </div>

        {/* Company Title */}
        <div className="space-y-1">
          <h1 className="text-base font-extrabold tracking-tight text-slate-900">
            Palak Enterprises
          </h1>
          <p className="text-xs font-medium text-slate-500">
            {message}
          </p>
        </div>

        {/* Subtle Brand Spinner */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#123B70] animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#123B70] animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default AppBootstrapScreen;
