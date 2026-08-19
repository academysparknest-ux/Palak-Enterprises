import React from "react";
import { cn } from "../../../lib/utils";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "amber" | "emerald";
  size?: "sm" | "md" | "lg";
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
  className?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  iconRight,
  iconLeft,
  className = "",
  ...props
}) => {
  const variantStyles = {
    primary: "bg-[#123B70] text-white hover:bg-[#0c274c] shadow-xs hover:shadow-md",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400",
    ghost: "text-slate-700 hover:bg-slate-100",
    amber: "bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold shadow-xs hover:shadow-md",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs hover:shadow-md",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2.5 text-sm rounded-xl gap-2",
    lg: "px-6 py-3 text-base rounded-xl gap-2.5",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-bold tracking-tight active-press btn-hover-arrow cursor-pointer transition-all duration-200",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {iconLeft && <span className="btn-icon-left transition-transform duration-200">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="btn-icon-right transition-transform duration-200">{iconRight}</span>}
    </button>
  );
};
