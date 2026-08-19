import React from "react";
import { cn } from "../../../lib/utils";

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hasGoldFoil?: boolean;
  elevation?: "none" | "low" | "medium" | "high";
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className = "",
  hasGoldFoil = false,
  elevation = "medium",
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white transition-all duration-300",
        elevation === "low" && "shadow-xs hover:shadow-md hover:border-slate-300",
        elevation === "medium" && "shadow-xs hover:shadow-lg hover:border-slate-300/90",
        elevation === "high" && "shadow-sm hover:shadow-xl hover:border-slate-300",
        "hover:-translate-y-1 hover:scale-[1.012]",
        hasGoldFoil && "gold-foil-sheen",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
