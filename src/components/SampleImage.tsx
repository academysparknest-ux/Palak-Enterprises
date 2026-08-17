import { useState } from "react";
import { cn } from "../lib/utils";

export type SampleFallbackType =
  | "visiting-card"
  | "wedding-card"
  | "birthday-invitation"
  | "letterhead"
  | "brochure"
  | "flyer"
  | "banner"
  | "certificate"
  | "id-card"
  | "bill-book"
  | "passport-photo"
  | "photo"
  | "lamination"
  | "spiral-binding"
  | "hardcover-binding"
  | "resume"
  | "document-scan"
  | "form"
  | "document"
  | "invitation"
  | "pan-card"
  | "aadhaar-card"
  | "ayushman-card"
  | "rtps-certificate"
  | "pm-kisan"
  | "land-record"
  | "money-transfer"
  | "website-dev"
  | "logo-design"
  | "condolence-card"
  | "photocopy";

interface SampleImageProps {
  src: string;
  alt: string;
  title: string;
  fallbackType?: SampleFallbackType;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function SampleImage({
  src,
  alt,
  title,
  fallbackType = "document",
  className,
  width = 600,
  height = 400,
  priority = false,
}: SampleImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return <SampleProductMockup title={title} fallbackType={fallbackType} className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setHasError(true)}
      className={cn("object-cover transition-transform duration-300 group-hover:scale-105", className)}
    />
  );
}

/**
 * Product-First Visual Mockups
 * Renders an exact, high-fidelity printed product mockup filling 70-90% of the frame.
 */
export function SampleProductMockup({
  title,
  fallbackType,
  className,
}: {
  title: string;
  fallbackType: SampleFallbackType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 p-3 select-none",
        className
      )}
    >
      {renderProductMockup(fallbackType, title)}
    </div>
  );
}

function renderProductMockup(type: SampleFallbackType, _title: string) {
  switch (type) {
    case "visiting-card":
      return (
        <div className="relative w-full max-w-[280px] aspect-[1.75/1] flex items-center justify-center">
          <div className="absolute inset-0 translate-y-2 translate-x-1.5 bg-slate-300/80 rounded-md shadow-sm" />
          <div className="absolute inset-0 translate-y-1 translate-x-0.5 bg-slate-200 rounded-md shadow" />
          <div className="relative z-10 w-full h-full bg-gradient-to-br from-slate-900 via-navy to-slate-800 rounded-md p-4 text-white shadow-xl flex flex-col justify-between border border-amber-400/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300">PALAK ENTERPRISES</span>
              </div>
              <span className="text-[9px] font-medium tracking-widest text-slate-300 uppercase">PRINTING PRESS</span>
            </div>
            <div className="my-auto py-1">
              <div className="text-sm font-extrabold text-white tracking-wide">Pankaj Kumar</div>
              <div className="text-[10px] text-amber-400 font-medium">Proprietor / Managing Director</div>
            </div>
            <div className="flex items-center justify-between text-[8px] text-slate-300 border-t border-white/10 pt-1.5">
              <span>+91 9905238015</span>
              <span>Chakia, East Champaran</span>
            </div>
          </div>
        </div>
      );

    case "wedding-card":
    case "invitation":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.4/1] flex items-center justify-center">
          <div className="absolute -right-2 -bottom-2 w-full h-full bg-amber-100 rounded-lg border border-amber-300/70 shadow-sm rotate-2" />
          <div className="relative z-10 w-full h-full bg-gradient-to-br from-brandred via-red-700 to-rose-900 rounded-lg p-3.5 text-amber-100 shadow-xl border-2 border-amber-300 flex flex-col items-center justify-between text-center">
            <div className="flex items-center justify-center gap-2 w-full border-b border-amber-300/40 pb-1">
              <span className="text-[10px] font-serif text-amber-300 font-bold">॥ श्री गणेशाय नमः ॥</span>
            </div>
            <div className="my-1">
              <span className="text-[10px] uppercase tracking-widest text-amber-200/90 font-serif">Wedding Invitation</span>
              <div className="font-serif text-base font-bold text-amber-300 my-0.5">Rahul &amp; Priya</div>
              <span className="text-[9px] text-amber-100/90 font-serif">Cordially invite you to celebrate</span>
            </div>
            <div className="w-full border-t border-amber-300/40 pt-1 flex items-center justify-between text-[8px] text-amber-200 font-serif">
              <span>Auspicious Wedding</span>
              <span>Sample Design</span>
            </div>
          </div>
        </div>
      );

    case "birthday-invitation":
      return (
        <div className="relative w-full max-w-[260px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-gradient-to-br from-amber-50 via-white to-pink-50 rounded-xl p-3.5 text-navy shadow-lg border-2 border-dashed border-pink-400 flex flex-col items-center justify-between text-center">
            <div className="flex items-center justify-between w-full text-[9px] font-bold text-pink-500">
              <span>★ YOU&apos;RE INVITED ★</span>
              <span>🎉</span>
            </div>
            <div className="my-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Let&apos;s Celebrate</div>
              <div className="text-base font-extrabold text-brandred">AARAV&apos;S 5TH BIRTHDAY</div>
              <div className="text-[9px] font-semibold text-slate-600 mt-0.5">Sunday, 4:00 PM • Fun &amp; Games</div>
            </div>
            <div className="w-full bg-pink-100/80 rounded-md py-1 px-2 text-[8px] font-bold text-pink-700">
              Custom Theme Birthday Card • Printed Sample
            </div>
          </div>
        </div>
      );

    case "letterhead":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-md p-3 text-slate-800 shadow-lg border border-slate-300 flex flex-col justify-between">
            <div className="border-b-2 border-navy pb-1 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-navy uppercase tracking-wider">PALAK ENTERPRISES</div>
                <div className="text-[7px] text-slate-500">Official Business Letterhead • Reg No: 845412</div>
              </div>
              <div className="h-5 w-5 rounded bg-amber-100 border border-amber-400 flex items-center justify-center text-[8px] font-bold text-navy">
                PE
              </div>
            </div>
            <div className="space-y-1 my-1 opacity-40">
              <div className="h-1 w-3/4 bg-slate-400 rounded" />
              <div className="h-1 w-full bg-slate-300 rounded" />
              <div className="h-1 w-5/6 bg-slate-300 rounded" />
              <div className="h-1 w-2/3 bg-slate-300 rounded" />
            </div>
            <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[7px] text-slate-400">
              <span>Chakia, Bihar - 845412</span>
              <span>info@palakenterprises.com</span>
            </div>
          </div>
        </div>
      );

    case "brochure":
      return (
        <div className="relative w-full max-w-[280px] aspect-[1.4/1] flex items-center justify-center">
          <div className="w-full h-full grid grid-cols-3 gap-1 bg-slate-200 p-1.5 rounded-lg shadow-md border border-slate-300">
            <div className="bg-white rounded p-2 flex flex-col justify-between border-r border-slate-200 shadow-sm">
              <div className="text-[7px] font-bold text-navy uppercase">About Us</div>
              <div className="space-y-1 opacity-50">
                <div className="h-1 w-full bg-slate-400 rounded" />
                <div className="h-1 w-4/5 bg-slate-300 rounded" />
              </div>
              <div className="text-[6px] text-slate-400">Panel 1</div>
            </div>
            <div className="bg-navy rounded p-2 flex flex-col justify-between text-white shadow-sm">
              <div className="text-[8px] font-extrabold uppercase text-amber-300">Our Services</div>
              <div className="space-y-1 opacity-70">
                <div className="h-1 w-full bg-white rounded" />
                <div className="h-1 w-3/4 bg-white rounded" />
              </div>
              <div className="text-[6px] text-slate-300">Panel 2</div>
            </div>
            <div className="bg-gradient-to-b from-brandred to-red-800 rounded p-2 flex flex-col justify-between text-white shadow-sm">
              <div className="text-[8px] font-bold uppercase">Contact</div>
              <div className="text-[7px] text-amber-200 font-bold">Chakia, Bihar</div>
              <div className="text-[6px] text-white/80">Panel 3 (Cover)</div>
            </div>
          </div>
        </div>
      );

    case "flyer":
      return (
        <div className="relative w-full max-w-[260px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-lg p-3 text-navy shadow-lg border-2 border-white flex flex-col justify-between text-center">
            <div className="bg-navy text-white text-[8px] font-extrabold py-0.5 px-2 rounded-full uppercase tracking-wider mx-auto">
              MEGA PROMOTION FLYER
            </div>
            <div>
              <div className="text-sm font-black text-white drop-shadow">SPECIAL OFFER</div>
              <div className="text-[9px] font-bold text-slate-900">Printing &amp; Digital Services</div>
            </div>
            <div className="bg-white/95 rounded-md p-1.5 text-[8px] font-bold text-navy flex items-center justify-around shadow-sm">
              <span>⚡ Fast Print</span>
              <span>⭐ Best Quality</span>
              <span>💰 Best Rate</span>
            </div>
          </div>
        </div>
      );

    case "banner":
      return (
        <div className="relative w-full max-w-[290px] aspect-[1.6/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-gradient-to-r from-red-600 via-brandred to-orange-600 rounded-md p-2.5 text-white shadow-xl border-2 border-yellow-300 flex flex-col justify-between text-center">
            <div className="absolute top-1 left-1 h-2 w-2 rounded-full bg-slate-300 border border-slate-700 shadow-inner" />
            <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-slate-300 border border-slate-700 shadow-inner" />
            <div className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-slate-300 border border-slate-700 shadow-inner" />
            <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-slate-300 border border-slate-700 shadow-inner" />

            <div className="text-[8px] font-bold uppercase tracking-widest text-yellow-200">High-Resolution Flex Print</div>
            <div>
              <div className="text-base font-black tracking-wide text-yellow-300 drop-shadow-md">पलक प्रिंटिंग प्रेस</div>
              <div className="text-[9px] font-bold text-white">बैनर • होर्डिंग • पोस्टर • बोर्ड</div>
            </div>
            <div className="text-[8px] font-semibold text-yellow-100 bg-black/30 py-0.5 rounded">
              Near Block Gate, Chakia • 9905238015
            </div>
          </div>
        </div>
      );

    case "certificate":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-amber-50/90 rounded-md p-3 text-slate-800 shadow-lg border-4 border-double border-amber-600 flex flex-col items-center justify-between text-center">
            <div className="text-[8px] font-serif uppercase tracking-widest font-bold text-amber-900">Certificate of Achievement</div>
            <div className="my-0.5">
              <div className="text-[8px] italic text-slate-600 font-serif">This is proudly presented to</div>
              <div className="text-sm font-bold font-serif text-navy border-b border-slate-400 pb-0.5 px-4 inline-block">SAMPLE NAME</div>
              <div className="text-[7px] text-slate-600 font-serif mt-0.5">For outstanding performance and excellence</div>
            </div>
            <div className="w-full flex items-center justify-between pt-1 text-[7px] font-serif text-slate-700">
              <span className="border-t border-slate-400 pt-0.5 px-2">Authorized Sign</span>
              <div className="h-5 w-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[7px] shadow">★ SEAL</div>
              <span className="border-t border-slate-400 pt-0.5 px-2">Date: 2026</span>
            </div>
          </div>
        </div>
      );

    case "id-card":
      return (
        <div className="relative w-full max-w-[240px] aspect-[1.45/1] flex items-center justify-center">
          <div className="absolute -top-3 h-3 w-8 bg-blue-600 rounded-t shadow" />
          <div className="relative z-10 w-full h-full bg-white rounded-lg p-2.5 shadow-xl border border-slate-300 flex flex-col justify-between">
            <div className="bg-navy text-white text-center py-1 rounded text-[8px] font-bold uppercase tracking-wider">
              Student / Staff Identity Card
            </div>
            <div className="flex items-center gap-2 my-1">
              <div className="h-12 w-10 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-[7px] text-slate-500 font-bold">
                PHOTO
              </div>
              <div className="flex-1 text-[8px] space-y-0.5 text-slate-700">
                <div className="font-bold text-navy text-[9px]">SAMPLE STUDENT</div>
                <div>ID: STU-2026-089</div>
                <div>Class / Dept: 10th - A</div>
                <div>Blood Group: O+</div>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[6px] text-slate-400">
              <span>PVC Smart Card</span>
              <span className="tracking-widest font-mono">||||||||||||||||</span>
            </div>
          </div>
        </div>
      );

    case "bill-book":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-md p-2.5 text-slate-800 shadow-lg border-2 border-slate-400 flex flex-col justify-between">
            <div className="border-b border-dashed border-red-400 pb-1 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-navy uppercase">CASH MEMO / ESTIMATE</div>
                <div className="text-[7px] text-slate-500">Duplicate Bill Book No. 1042</div>
              </div>
              <span className="text-[8px] font-bold text-red-600 border border-red-300 px-1 rounded">ORIGINAL</span>
            </div>
            <div className="my-1 border border-slate-300 rounded text-[7px]">
              <div className="grid grid-cols-4 bg-slate-100 font-bold p-0.5 border-b border-slate-300 text-center">
                <span>S.N.</span>
                <span className="col-span-2">Description</span>
                <span>Amount</span>
              </div>
              <div className="p-0.5 text-center text-slate-500 space-y-0.5">
                <div className="grid grid-cols-4">
                  <span>1.</span>
                  <span className="col-span-2 text-left">Printing Work</span>
                  <span>₹ 500</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[7px] text-slate-600 border-t border-slate-200 pt-0.5">
              <span>Palak Enterprises, Chakia</span>
              <span className="font-bold">Total: ₹ 500.00</span>
            </div>
          </div>
        </div>
      );

    case "passport-photo":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-md p-2 shadow-lg border border-slate-300 flex flex-col justify-between">
            <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Glossy Photo Sheet • 8 Passport Photos
            </div>
            <div className="grid grid-cols-4 gap-1.5 my-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-[3.5/4.5] bg-gradient-to-b from-blue-100 via-sky-200 to-blue-300 rounded-sm border border-slate-400 flex flex-col items-center justify-center p-0.5 shadow-sm"
                >
                  <div className="h-4 w-4 rounded-full bg-slate-600 mb-0.5" />
                  <div className="h-2 w-5 bg-slate-700 rounded-t" />
                </div>
              ))}
            </div>
            <div className="text-[6px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>HD Studio Print</span>
              <span>Clean White/Blue Background</span>
            </div>
          </div>
        </div>
      );

    case "photo":
      return (
        <div className="relative w-full max-w-[260px] aspect-[1.35/1] flex items-center justify-center">
          <div className="absolute inset-0 rotate-3 bg-white rounded-md shadow-md border border-slate-200" />
          <div className="relative z-10 w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-700 rounded-md p-2 shadow-xl border-4 border-white flex flex-col justify-between text-white">
            <div className="text-[7px] font-semibold tracking-wider text-amber-300 uppercase">HD Glossy Studio Photo</div>
            <div className="text-center my-auto">
              <div className="text-xs font-black tracking-wide">Studio Photo Enlargement</div>
              <div className="text-[8px] text-rose-200">Vivid 300 DPI Color Print</div>
            </div>
            <div className="text-[7px] text-slate-300 flex justify-between">
              <span>8x10 / 12x18 Sizes</span>
              <span>Waterproof Finish</span>
            </div>
          </div>
        </div>
      );

    case "lamination":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-white/95 rounded-lg p-2.5 shadow-2xl border-4 border-sky-300/80 ring-2 ring-sky-200 flex flex-col justify-between">
            <div className="bg-amber-100 border border-amber-300 p-2 rounded flex-1 flex flex-col justify-between text-center">
              <div className="text-[8px] font-bold text-amber-900 uppercase">Official Laminated Document</div>
              <div className="text-xs font-extrabold text-navy">PROTECTED DOCUMENT</div>
              <div className="text-[7px] text-slate-600">125-Micron Hot Thermal Pouch Lamination</div>
            </div>
            <div className="mt-1 flex items-center justify-between text-[7px] font-bold text-sky-700 px-1">
              <span>✓ 100% Waterproof</span>
              <span>✓ Anti-Tear Protection</span>
            </div>
          </div>
        </div>
      );

    case "spiral-binding":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-r-lg shadow-xl border border-slate-300 flex pl-5 p-3 flex-col justify-between">
            <div className="absolute left-1 top-2 bottom-2 w-3 flex flex-col justify-between items-center">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-1.5 w-3.5 bg-slate-800 rounded-full shadow-sm" />
              ))}
            </div>
            <div className="border-b border-navy pb-1">
              <div className="text-[9px] font-extrabold text-navy uppercase">PROJECT REPORT / THESIS</div>
              <div className="text-[7px] text-slate-500">Spiral Bound Document Sample</div>
            </div>
            <div className="my-auto py-1">
              <div className="text-xs font-bold text-slate-800">Academic &amp; Business Binding</div>
              <div className="text-[8px] text-slate-500">Transparent Sheet Cover + Strong Backing</div>
            </div>
            <div className="text-[7px] text-slate-400 border-t border-slate-200 pt-0.5 flex justify-between">
              <span>Up to 500 Pages</span>
              <span>Palak Enterprises</span>
            </div>
          </div>
        </div>
      );

    case "hardcover-binding":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-navy to-slate-900 rounded-r-lg p-3 text-amber-200 shadow-2xl border-l-8 border-amber-500 flex flex-col justify-between text-center">
            <div className="text-[8px] tracking-widest font-serif uppercase text-amber-300 font-bold">Hardcover Project Binding</div>
            <div className="my-auto">
              <div className="text-xs font-serif font-black text-amber-300 tracking-wider">PROJECT REPORT / THESIS</div>
              <div className="text-[8px] font-serif text-amber-100/80 mt-0.5">Golden Foil Embossing on Spine &amp; Cover</div>
            </div>
            <div className="border-t border-amber-400/40 pt-1 text-[7px] font-serif text-amber-200 flex justify-between">
              <span>Degree / Thesis</span>
              <span>Chakia, Bihar</span>
            </div>
          </div>
        </div>
      );

    case "resume":
      return (
        <div className="relative w-full max-w-[260px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-md p-2.5 text-slate-800 shadow-lg border border-slate-300 flex flex-col justify-between">
            <div className="border-b border-navy pb-1">
              <div className="text-[10px] font-black text-navy uppercase">CURRICULUM VITAE</div>
              <div className="text-[7px] text-slate-500">Professional Resume / Matrimonial Biodata</div>
            </div>
            <div className="space-y-1 text-[7px] text-slate-600 my-1">
              <div className="font-bold text-navy">EDUCATION &amp; EXPERIENCE</div>
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-5/6 bg-slate-200 rounded" />
              <div className="font-bold text-navy pt-0.5">KEY SKILLS &amp; STRENGTHS</div>
              <div className="h-1 w-3/4 bg-slate-200 rounded" />
            </div>
            <div className="border-t border-slate-200 pt-0.5 text-[6px] text-slate-400 flex justify-between">
              <span>Laser Clean Print</span>
              <span>Format &amp; Typing Support</span>
            </div>
          </div>
        </div>
      );

    case "document-scan":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-slate-900 rounded-lg p-3 text-white shadow-xl border border-slate-700 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[8px] text-sky-400 font-bold uppercase">
              <span>Document → Digital PDF</span>
              <span>HD 600 DPI</span>
            </div>
            <div className="flex items-center justify-center gap-3 my-auto">
              <div className="bg-white text-navy p-1.5 rounded text-[8px] font-bold shadow text-center w-16">
                📄 Paper Doc
              </div>
              <span className="text-sky-400 font-black text-sm">➔</span>
              <div className="bg-red-600 text-white p-1.5 rounded text-[8px] font-bold shadow text-center w-16">
                📑 Multi-PDF
              </div>
            </div>
            <div className="text-[7px] text-slate-400 text-center border-t border-slate-800 pt-1">
              Fast Document Scanning • Compressed • Clear Text
            </div>
          </div>
        </div>
      );

    case "pan-card":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.45/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-gradient-to-br from-sky-100 to-sky-200 rounded-lg p-2.5 shadow-xl border border-sky-400 flex flex-col justify-between">
            <div className="bg-sky-800 text-white text-center py-0.5 rounded text-[7px] font-bold">
              INCOME TAX DEPARTMENT • GOVT. OF INDIA
            </div>
            <div className="flex items-center gap-2 my-1">
              <div className="h-10 w-9 bg-white rounded border border-slate-300 flex items-center justify-center text-[6px] text-slate-500 font-bold">
                PHOTO
              </div>
              <div className="flex-1 text-[7px] space-y-0.5 text-slate-800">
                <div className="font-bold text-navy text-[8px]">CARD HOLDER NAME</div>
                <div>FATHER&apos;S NAME</div>
                <div>DOB: 01/01/1995</div>
              </div>
            </div>
            <div className="bg-white rounded py-0.5 px-2 border border-sky-400 text-center font-mono font-bold text-[9px] text-sky-900">
              ABCDE1234F
            </div>
          </div>
        </div>
      );

    case "aadhaar-card":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.45/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-lg p-2.5 shadow-xl border border-slate-300 flex flex-col justify-between">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600 rounded-t" />
            <div className="text-center text-[7px] font-bold text-red-600">भारत सरकार / GOVT. OF INDIA</div>
            <div className="flex items-center gap-2 my-1">
              <div className="h-10 w-9 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[6px] text-slate-500">
                PHOTO
              </div>
              <div className="flex-1 text-[7px] space-y-0.5 text-slate-800">
                <div className="font-bold text-navy text-[8px]">NAME / नाम</div>
                <div>DOB: 1998 • Male/Female</div>
                <div className="text-[6px] text-red-600 font-semibold">मेरा आधार, मेरी पहचान</div>
              </div>
            </div>
            <div className="bg-red-50 rounded py-0.5 text-center font-mono font-bold text-[9px] text-red-700 border border-red-200">
              XXXX XXXX 1234
            </div>
          </div>
        </div>
      );

    case "ayushman-card":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.45/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-lg p-2.5 shadow-xl border-2 border-amber-400 flex flex-col justify-between">
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-center py-0.5 rounded text-[7px] font-extrabold">
              AYUSHMAN BHARAT • PM-JAY
            </div>
            <div className="flex items-center justify-between my-1">
              <div className="text-[7px] space-y-0.5 text-slate-800">
                <div className="font-bold text-emerald-800 text-[8px]">BENEFICIARY NAME</div>
                <div>PMJAY ID: 91-XXXX-XXXX</div>
              </div>
              <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-1 py-0.5 text-[7px] font-bold text-center">
                ₹ 5 LAKH<br/>COVER
              </div>
            </div>
            <div className="bg-emerald-700 text-white rounded text-center text-[7px] font-bold py-0.5">
              Free Treatment at Empanelled Hospitals
            </div>
          </div>
        </div>
      );

    case "rtps-certificate":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-amber-50/90 rounded-md p-2.5 text-slate-800 shadow-lg border-2 border-amber-600 flex flex-col justify-between text-center">
            <div className="text-[7px] font-bold text-amber-900 uppercase">BIHAR RTPS CERTIFICATE</div>
            <div className="my-auto py-0.5">
              <div className="text-[9px] font-extrabold text-navy">जाति / आय / निवास प्रमाण पत्र</div>
              <div className="text-[7px] text-slate-600">Govt. of Bihar • Digitally Signed</div>
            </div>
            <div className="flex items-center justify-between text-[6px] text-slate-500 border-t border-amber-300 pt-0.5">
              <span>QR Verified</span>
              <span>CO Office Chakia</span>
            </div>
          </div>
        </div>
      );

    case "pm-kisan":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-md p-2.5 text-slate-800 shadow-lg border-2 border-emerald-600 flex flex-col justify-between">
            <div className="bg-emerald-700 text-white text-center py-0.5 rounded text-[7px] font-bold">
              DBT AGRICULTURE &amp; PM-KISAN
            </div>
            <div className="my-auto py-0.5 space-y-0.5 text-[7px]">
              <div className="font-bold text-emerald-800 text-[8px]">किसान पंजीकरण व सम्मान निधि</div>
              <div className="text-slate-600">✓ e-KYC Verified &amp; DBT Linked</div>
              <div className="text-slate-600">✓ फसल बीमा व सरकारी योजनाएँ</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded text-center text-[7px] font-bold text-emerald-800 py-0.5">
              ₹ 2,000 Installment / DBT Portal
            </div>
          </div>
        </div>
      );

    case "land-record":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-amber-50/90 rounded-md p-2.5 text-slate-800 shadow-lg border-2 border-amber-700 flex flex-col justify-between">
            <div className="bg-amber-800 text-white text-center py-0.5 rounded text-[7px] font-bold">
              BIHAR BHUMI • REVENUE &amp; LAND
            </div>
            <div className="my-auto py-0.5 space-y-0.5 text-[7px]">
              <div className="font-bold text-amber-900 text-[8px]">ऑनलाइन भू-लगान व दाखिल-खारिज</div>
              <div className="text-slate-600">खाता / खेसरा / जमाबंदी नकल</div>
              <div className="text-slate-600">Chakia, East Champaran</div>
            </div>
            <div className="bg-emerald-100 border border-emerald-300 rounded text-center text-[7px] font-bold text-emerald-900 py-0.5">
              ✓ Online Lagan Paid Receipt
            </div>
          </div>
        </div>
      );

    case "money-transfer":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-indigo-900 text-white rounded-lg p-2.5 shadow-xl border border-indigo-400 flex flex-col justify-between">
            <div className="text-[7px] font-bold text-indigo-200 uppercase text-center">MONEY TRANSFER &amp; BILL PAY</div>
            <div className="flex items-center justify-center gap-2 my-auto">
              <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">Sender</span>
              <span className="text-emerald-400 font-bold text-sm">➔</span>
              <span className="text-[10px] font-bold bg-emerald-600 px-2 py-1 rounded">Instant ₹</span>
            </div>
            <div className="text-[6px] text-indigo-200 text-center border-t border-indigo-700 pt-0.5">
              AEPS • Recharge • BBPS Electricity Bill
            </div>
          </div>
        </div>
      );

    case "website-dev":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-slate-900 rounded-lg p-2 text-white shadow-xl border border-slate-700 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[7px] text-sky-400 font-bold">
              <span>🌐 Web Dev</span>
              <span>Responsive UI</span>
            </div>
            <div className="bg-white rounded p-1.5 text-navy text-[7px] my-auto space-y-1">
              <div className="bg-slate-900 text-white p-1 rounded font-bold text-[7px]">School / Business Portal</div>
              <div className="flex gap-1">
                <div className="bg-sky-100 rounded p-0.5 flex-1 text-center font-semibold">Web</div>
                <div className="bg-amber-100 rounded p-0.5 flex-1 text-center font-semibold">Mobile</div>
                <div className="bg-emerald-100 rounded p-0.5 flex-1 text-center font-semibold">Google</div>
              </div>
            </div>
            <div className="text-[6px] text-slate-400 text-center">
              Schools, Coaching &amp; Shops Website Setup
            </div>
          </div>
        </div>
      );

    case "logo-design":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-slate-950 rounded-lg p-2.5 text-white shadow-xl border border-purple-500/40 flex flex-col justify-between text-center">
            <div className="text-[7px] font-bold text-purple-400 uppercase">GRAPHIC DESIGN &amp; BRANDING</div>
            <div className="my-auto">
              <div className="h-8 w-8 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-md">
                PE
              </div>
              <div className="text-[9px] font-extrabold text-white mt-1">Custom Logo &amp; Creatives</div>
            </div>
            <div className="text-[6px] text-slate-400">
              Vector Graphics • Social Media • Branding
            </div>
          </div>
        </div>
      );

    case "condolence-card":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-md p-2.5 text-slate-800 shadow-lg border-2 border-slate-400 flex flex-col justify-between text-center">
            <div className="text-[8px] font-serif font-bold text-slate-800">॥ ॐ शान्तिः ॥</div>
            <div className="my-auto py-0.5">
              <div className="text-[10px] font-serif font-bold text-navy">शोक-संदेश एवं श्रद्धांजलि</div>
              <div className="text-[7px] font-serif text-slate-600">दशगात्र / ब्रह्मभोज कार्यक्रम निमंत्रण</div>
            </div>
            <div className="text-[6px] text-slate-500 border-t border-slate-200 pt-0.5">
              पलक प्रिंटिंग प्रेस, चकिया
            </div>
          </div>
        </div>
      );

    case "photocopy":
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="relative w-full h-full bg-white rounded-md p-2.5 text-slate-800 shadow-lg border border-slate-300 flex flex-col justify-between">
            <div className="bg-sky-700 text-white text-center py-0.5 rounded text-[7px] font-bold">
              LASER PHOTOCOPY &amp; COLOR PRINT
            </div>
            <div className="my-auto py-0.5 text-[7px] space-y-0.5 text-slate-700">
              <div className="font-bold text-navy text-[8px]">High-Speed B&amp;W &amp; Color Xerox</div>
              <div>Single &amp; Double Sided Document Print</div>
              <div>75/100 GSM Sharp Printing</div>
            </div>
            <div className="text-[6px] text-slate-400 border-t border-slate-200 pt-0.5 flex justify-between">
              <span>Clear &amp; Crisp</span>
              <span>Palak Enterprises</span>
            </div>
          </div>
        </div>
      );

    case "form":
    case "document":
    default:
      return (
        <div className="relative w-full max-w-[270px] aspect-[1.35/1] flex items-center justify-center">
          <div className="w-full h-full bg-slate-900 rounded-lg p-3 text-white shadow-xl border border-slate-700 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[8px] text-amber-400 font-bold uppercase">
              <span>Online Service Flow</span>
              <span>Verified Entry</span>
            </div>
            <div className="flex items-center justify-center gap-2 my-auto">
              <div className="bg-white text-navy p-1.5 rounded text-[7px] font-bold shadow text-center w-14">
                📝 Form
              </div>
              <span className="text-amber-400 font-bold">➔</span>
              <div className="bg-navy border border-amber-400 text-amber-300 p-1.5 rounded text-[7px] font-bold shadow text-center w-16">
                🌐 Portal Entry
              </div>
              <span className="text-amber-400 font-bold">➔</span>
              <div className="bg-emerald-600 text-white p-1.5 rounded text-[7px] font-bold shadow text-center w-14">
                ✓ Receipt
              </div>
            </div>
            <div className="text-[7px] text-slate-400 text-center border-t border-slate-800 pt-1">
              Accurate Online Application &amp; Form Submission Assistance
            </div>
          </div>
        </div>
      );
  }
}
