export interface NavLink {
  href: string;
  labelKey: "home" | "services" | "businessPrinting" | "websiteDev" | "about" | "gallery" | "contact";
}

export const navLinks: NavLink[] = [
  { href: "#home", labelKey: "home" },
  { href: "#services", labelKey: "services" },
  { href: "#business-printing", labelKey: "businessPrinting" },
  { href: "#website-dev", labelKey: "websiteDev" },
  { href: "#about", labelKey: "about" },
  { href: "#gallery", labelKey: "gallery" },
  { href: "#contact", labelKey: "contact" },
];
