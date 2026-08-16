import React from "react";
import * as Icons from "lucide-react";

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = "w-6 h-6", size }) => {
  // @ts-expect-error dynamic access
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent className={className} size={size} aria-hidden="true" />;
};
