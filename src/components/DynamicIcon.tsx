import React from "react";
import {
  Printer,
  Camera,
  Globe,
  Briefcase,
  FileCheck,
  Code2,
  Code,
  ShieldCheck,
  Newspaper,
  UserCheck,
  Image,
  CreditCard,
  FileText,
  Gift,
  Award,
  IdCard,
  HeartPulse,
  GraduationCap,
  FilePlus,
  Users,
  FolderCheck,
  Tractor,
  MapPin,
  IndianRupee,
  Contact,
  Receipt,
  Mail,
  Globe2,
  Sparkles,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Printer,
  Camera,
  Globe,
  Briefcase,
  FileCheck,
  Code2,
  Code,
  ShieldCheck,
  Newspaper,
  UserCheck,
  Image,
  CreditCard,
  FileText,
  Gift,
  Award,
  IdCard,
  HeartPulse,
  GraduationCap,
  FilePlus,
  Users,
  FolderCheck,
  Tractor,
  MapPin,
  IndianRupee,
  Contact,
  Receipt,
  Mail,
  Globe2,
  Sparkles,
  HelpCircle,
};

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = "w-6 h-6", size }) => {
  const IconComponent = ICON_MAP[name] || HelpCircle;
  return <IconComponent className={className} size={size} aria-hidden="true" />;
};
