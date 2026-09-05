import React from "react";
import {
  FileText,
  CheckCircle2,
  ExternalLink,
  Layers,
  Bookmark,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface OrderItemsSummaryListProps {
  items: any[];
  rootPrintSnapshot?: any;
  currentLang?: "en" | "hi";
  compact?: boolean;
  className?: string;
  showPrices?: boolean;
}

/**
 * Safely parse JSON if value is a stringified JSON object
 */
function safeParse<T = any>(val: any): T {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val as unknown as T;
    }
  }
  return val as unknown as T;
}

/**
 * Helper to humanize binding keys
 */
function getBindingTitle(bindingKey?: string): string {
  if (!bindingKey || bindingKey === "none") return "";
  const map: Record<string, string> = {
    staple: "Corner / Saddle Staple",
    spiral: "Spiral Wire Binding",
    comb: "Comb Plastic Binding",
    soft: "Thermal Soft Binding",
    hard: "Hard Bound Cover",
  };
  return map[bindingKey] || `${bindingKey} Binding`;
}

/**
 * Helper to humanize cover types
 */
function getCoverTitle(coverKey?: string): string {
  if (!coverKey || coverKey === "none") return "";
  const map: Record<string, string> = {
    transparent: "Clear Transparent Sheet",
    matte: "Matte Translucent Sheet",
    cardstock: "Heavy Cardstock Sheet",
    opaque_blue: "Royal Blue Opaque Cover",
    opaque_black: "Black Opaque Sheet",
  };
  return map[coverKey] || `${coverKey} Cover`;
}

export const OrderItemsSummaryList: React.FC<OrderItemsSummaryListProps> = ({
  items = [],
  rootPrintSnapshot,
  currentLang = "en",
  compact = false,
  className = "",
  showPrices = true,
}) => {
  const parsedItems = safeParse<any[]>(items);
  const itemsList = Array.isArray(parsedItems) ? parsedItems : [];

  if (itemsList.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
        {currentLang === "hi" ? "कोई सामग्री विवरण उपलब्ध नहीं है" : "No item details available"}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {itemsList.map((item, idx) => {
        const selectedOpts = safeParse(item.selectedOptions || {});
        const selectedLabels = safeParse(item.selectedOptionsLabels || {});

        // Check for document printing snapshot
        const itemSnap = safeParse(selectedOpts?.printSnapshot || item?.printSnapshot || rootPrintSnapshot);
        const docList = Array.isArray(itemSnap?.documents) && itemSnap.documents.length > 0
          ? itemSnap.documents
          : null;

        // Extract any finishing flags on doc or item level
        const rootFinishing = safeParse(selectedOpts?.finishing || item?.finishing || {});
        const hasRootLami = Boolean(rootFinishing?.lamination);
        const hasRootHole = Boolean(rootFinishing?.holePunching);
        const hasRootBooklet = Boolean(rootFinishing?.bookletMode);

        // Filter and humanize standard options/labels for non-document items or general specs
        const internalKeysToSkip = new Set([
          "storagePath",
          "clientSubmissionId",
          "uploadedFileUrl",
          "uploadedFileName",
          "files",
          "templateData",
          "priceBreakdown",
          "pricingSnapshot",
          "subtotal",
          "isStandardPricing",
          "breakdown",
          "printSnapshot",
          "finishingTotal",
          "finishing",
        ]);

        const formattedSpecs: Array<{ label: string; value: string; isAddon?: boolean }> = [];

        // 1. First add labels from selectedOptionsLabels if present
        if (selectedLabels && typeof selectedLabels === "object") {
          Object.entries(selectedLabels).forEach(([key, val]) => {
            if (val && typeof val !== "object" && !internalKeysToSkip.has(key)) {
              const strVal = String(val).trim();
              if (strVal) {
                const isAddon = /lamination|finish|lanyard|holder|eyelet|binding|cover|mode|premium|uv/i.test(key + " " + strVal);
                formattedSpecs.push({ label: key, value: strVal, isAddon });
              }
            }
          });
        }

        // 2. If no labels, extract from selectedOptions
        if (formattedSpecs.length === 0 && selectedOpts && typeof selectedOpts === "object") {
          Object.entries(selectedOpts).forEach(([key, val]) => {
            if (val !== undefined && val !== null && typeof val !== "object" && !internalKeysToSkip.has(key)) {
              const strVal = String(val).trim();
              if (strVal) {
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .replace(/^\w/, (c) => c.toUpperCase())
                  .trim();
                const isAddon = /lamination|finish|lanyard|holder|eyelet|binding|cover|mode|premium|uv/i.test(key + " " + strVal);
                formattedSpecs.push({ label, value: strVal, isAddon });
              }
            }
          });
        }

        // 3. Extract finishing options if it's a map of booleans
        const addOnBadges: string[] = [];
        if (typeof rootFinishing === "object") {
          if (rootFinishing.lamination) addOnBadges.push("Thermal Lamination");
          if (rootFinishing.holePunching) addOnBadges.push("2/4 Hole Punching");
          if (rootFinishing.bookletMode) addOnBadges.push("Booklet Fold & Saddle");
          if (rootFinishing.cornerStaple) addOnBadges.push("Corner Stapling");
        }

        const unitPriceNum = Number(item.unitPrice || 0);
        const qtyNum = Number(item.quantity || 1);
        const totalPriceNum = Number(item.totalPrice || unitPriceNum * qtyNum);

        return (
          <div
            key={idx}
            className={cn(
              "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs hover:border-slate-300 transition-all",
              compact && "p-3 space-y-2 rounded-xl"
            )}
          >
            {/* Header: Item Title, Qty & Price */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">
                    {item.productName || item.serviceName || "Printing Item"}
                  </h4>
                  {item.productId && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {item.productId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {currentLang === "hi" ? "मात्रा:" : "Qty:"}{" "}
                  <strong className="text-slate-800 font-bold">{qtyNum}</strong>
                  {unitPriceNum > 0 && ` × ₹${unitPriceNum}`}
                </p>
              </div>

              {showPrices && totalPriceNum > 0 && (
                <span className="font-black text-sm sm:text-base text-[#123B70] font-mono shrink-0">
                  ₹{totalPriceNum}
                </span>
              )}
            </div>

            {/* Document Printing Snapshot Breakdown */}
            {docList && docList.length > 0 ? (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <Layers className="h-3.5 w-3.5 text-[#123B70]" />
                  <span>
                    {currentLang === "hi" ? "दस्तावेज विनिर्देश एवं फिनिशिंग" : "Print Specifications & Finishing"}
                  </span>
                </div>

                {docList.map((doc: any, dIdx: number) => {
                  const docFin = (doc.finishing || {}) as Record<string, boolean>;
                  const docFinList = [
                    docFin.lamination || hasRootLami ? "Thermal Lamination" : null,
                    docFin.holePunching || hasRootHole ? "2/4 Hole Punching" : null,
                    docFin.bookletMode || hasRootBooklet ? "Booklet Fold & Saddle" : null,
                    docFin.cornerStaple ? "Corner Stapling" : null,
                  ].filter(Boolean) as string[];

                  const bindingTitle = getBindingTitle(doc.binding);
                  const frontCoverTitle = getCoverTitle(doc.frontCover);
                  const backCoverTitle = getCoverTitle(doc.backCover);

                  return (
                    <div
                      key={dIdx}
                      className="rounded-xl bg-slate-50/80 border border-slate-200/90 p-3 space-y-2 text-xs"
                    >
                      {/* Document file name */}
                      {(docList.length > 1 || doc.fileName) && (
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60">
                          <span className="font-bold text-slate-800 text-[11px] truncate flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span>{doc.fileName || `Document ${dIdx + 1}`}</span>
                          </span>
                          {doc.pageCount && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {doc.pageCount} pages
                            </span>
                          )}
                        </div>
                      )}

                      {/* Technical Specs Tags */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                          {String(doc.paperSize || "A4").toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                          {doc.gsm || 75} GSM
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300">
                          {doc.colorMode === "bw"
                            ? "Black & White (B/W)"
                            : doc.colorMode === "color"
                            ? "Full Color"
                            : "Mixed Color"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300">
                          {doc.sides === "single" ? "Single Sided" : "Double Sided (Duplex)"}
                        </span>
                        {doc.orientation && (
                          <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300 capitalize">
                            {doc.orientation}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.copies || qtyNum} {doc.copies === 1 ? "Copy" : "Copies"}
                        </span>
                      </div>

                      {/* Binding & Cover Options */}
                      {(bindingTitle || frontCoverTitle || backCoverTitle) && (
                        <div className="pt-1.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-600">
                          {bindingTitle && (
                            <div className="flex items-center gap-1.5">
                              <Bookmark className="h-3 w-3 text-indigo-600 shrink-0" />
                              <span>
                                <strong className="text-slate-700">Binding:</strong> {bindingTitle}
                              </span>
                            </div>
                          )}
                          {frontCoverTitle && (
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3 w-3 text-teal-600 shrink-0" />
                              <span>
                                <strong className="text-slate-700">Front Cover:</strong> {frontCoverTitle}
                              </span>
                            </div>
                          )}
                          {backCoverTitle && (
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3 w-3 text-teal-600 shrink-0" />
                              <span>
                                <strong className="text-slate-700">Back Cover:</strong> {backCoverTitle}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Add-ons & Finishing (Badges with Checkmarks) */}
                      {docFinList.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                            {currentLang === "hi" ? "चयनित ऐड-ऑन्स व फिनिशिंग:" : "Configured Add-ons & Finishing:"}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {docFinList.map((fin, fIdx) => (
                              <span
                                key={fIdx}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>{fin}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Non-Document Specs & Add-ons Grid */}
            {!docList && formattedSpecs.length > 0 && (
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <Tag className="h-3.5 w-3.5 text-[#123B70]" />
                  <span>
                    {currentLang === "hi" ? "उत्पाद विनिर्देश व ऐड-ऑन्स" : "Specifications & Selected Add-ons"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  {formattedSpecs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className={cn(
                        "flex items-baseline justify-between gap-2 p-1 rounded-md",
                        spec.isAddon && "bg-emerald-50/60 border border-emerald-200/70 px-2 text-emerald-950 font-medium"
                      )}
                    >
                      <span className={cn("font-bold text-slate-700 capitalize text-[11px]", spec.isAddon && "text-emerald-900 flex items-center gap-1")}>
                        {spec.isAddon && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 inline" />}
                        {spec.label}:
                      </span>
                      <span className={cn("text-slate-900 text-right truncate text-xs", spec.isAddon && "font-black text-emerald-950")}>
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Finishing Add-ons Badges if not attached to docList */}
            {!docList && addOnBadges.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  {currentLang === "hi" ? "चयनित ऐड-ऑन्स:" : "Selected Add-ons:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {addOnBadges.map((addon, aIdx) => (
                    <span
                      key={aIdx}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{addon}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded File Link */}
            {item.uploadedFileName && (
              <div className="flex items-center justify-between text-xs text-slate-700 bg-blue-50/70 border border-blue-200/70 rounded-xl px-3 py-1.5">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileText className="h-4 w-4 text-[#123B70] shrink-0" />
                  <span className="truncate text-xs font-semibold text-slate-800">
                    {item.uploadedFileName}
                  </span>
                </div>
                {item.uploadedFileUrl && (
                  <a
                    href={item.uploadedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#123B70] font-bold hover:underline inline-flex items-center gap-1 shrink-0 ml-2 text-xs"
                  >
                    <span>View File</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Customer Special Notes / Design Notes */}
            {(item.designNotes || item.specialInstructions) && (
              <div className="text-[11px] text-slate-600 bg-amber-50/60 border border-amber-200/70 rounded-xl p-2.5 space-y-0.5">
                <strong className="text-amber-950 font-bold block">
                  {currentLang === "hi" ? "विशेष निर्देश (Notes):" : "Custom Instructions / Notes:"}
                </strong>
                <p className="italic text-slate-700">
                  {item.designNotes || item.specialInstructions}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Compact preview chips for order cards in Account page
 */
export function getOrderAddonsPreviewBadges(order: any): string[] {
  if (!order) return [];
  const badges: string[] = [];
  const items = safeParse<any[]>(order.items || []);
  const printSnapshot = safeParse(order.printSnapshot);

  // Check items
  if (Array.isArray(items)) {
    for (const item of items) {
      const opts = safeParse(item.selectedOptions || {});
      const labels = safeParse(item.selectedOptionsLabels || {});
      const itemSnap = safeParse(opts.printSnapshot || item.printSnapshot || printSnapshot);

      // Check document specs
      if (itemSnap?.documents && Array.isArray(itemSnap.documents)) {
        for (const doc of itemSnap.documents) {
          if (doc.gsm && !badges.includes(`${doc.gsm} GSM`)) {
            badges.push(`${doc.gsm} GSM`);
          }
          if (doc.binding && doc.binding !== "none") {
            const b = getBindingTitle(doc.binding);
            if (b && !badges.includes(b)) badges.push(b);
          }
          const docFin = doc.finishing || {};
          if (docFin.lamination && !badges.includes("Thermal Lamination")) badges.push("Thermal Lamination");
          if (docFin.holePunching && !badges.includes("Hole Punching")) badges.push("Hole Punching");
          if (docFin.bookletMode && !badges.includes("Booklet Fold")) badges.push("Booklet Fold");
        }
      }

      // Check options labels
      if (labels && typeof labels === "object") {
        if (labels.Finish && !badges.includes(labels.Finish)) badges.push(labels.Finish);
        if (labels.Paper && !badges.includes(labels.Paper)) badges.push(labels.Paper);
        if (labels.Lanyard && !badges.includes(labels.Lanyard)) badges.push(labels.Lanyard);
        if (labels.Sides && !badges.includes(labels.Sides)) badges.push(labels.Sides);
      } else if (opts && typeof opts === "object") {
        if (opts.finish && !badges.includes(`${opts.finish} finish`)) badges.push(`${opts.finish} finish`);
        if (opts.paperType && !badges.includes(opts.paperType)) badges.push(opts.paperType);
        if (opts.binding && opts.binding !== "none") {
          const b = getBindingTitle(opts.binding);
          if (b && !badges.includes(b)) badges.push(b);
        }
        if (opts.finishing?.lamination && !badges.includes("Lamination")) badges.push("Lamination");
      }
    }
  }

  return badges.slice(0, 4);
}
