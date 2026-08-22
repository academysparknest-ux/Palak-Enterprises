import React, { useState, useEffect, useMemo } from "react";
import type { StoredInvoice } from "../../lib/invoice/types";
import { getInvoiceQRConfig, generateInvoiceVerificationQr } from "../../lib/invoice/qrUtils";
import { QrCode, ShieldCheck, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

export interface InvoiceQRCodeProps {
  invoice: StoredInvoice;
  size?: number; // Approximate 55-65px (default: 58px)
  className?: string;
}

export const InvoiceQRCode: React.FC<InvoiceQRCodeProps> = ({
  invoice,
  size = 58,
  className,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  // Compute QR configuration based on invoice state
  const config = useMemo(() => {
    try {
      return getInvoiceQRConfig(invoice);
    } catch (e) {
      console.warn("Failed to determine invoice QR configuration:", e);
      return null;
    }
  }, [invoice]);

  // Generate high-DPI verification QR code whenever configuration/url changes
  useEffect(() => {
    let isMounted = true;

    if (!config || !config.isPermanent || !config.verificationUrl) {
      setQrDataUrl(null);
      setHasError(false);
      return;
    }

    setHasError(false);

    generateInvoiceVerificationQr(config.verificationUrl, {
      width: 256, // High internal resolution ensures razor sharpness in PDF and A4 print
      margin: 1,  // Minimal clean quiet-zone
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setHasError(false);
        }
      })
      .catch((err) => {
        console.warn("Invoice verification QR generation failed:", err);
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [config]);

  const label = "SCAN TO VERIFY";
  const caption = config?.caption || invoice.invoiceNumber || "Invoice Info";
  const isPermanent = Boolean(config?.isPermanent);

  return (
    <div
      className={cn(
        "palak-invoice-qr-container flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-center select-none",
        className
      )}
    >
      {/* QR Box with protective padding and quiet-zone */}
      <div
        className="p-1 border border-slate-300 rounded bg-white shadow-2xs flex items-center justify-center overflow-hidden"
        style={{ width: size + 8, height: size + 8 }}
      >
        {!isPermanent ? (
          <div
            className="flex flex-col items-center justify-center text-slate-400 bg-slate-50 w-full h-full p-1"
            title="Official verification QR will be generated upon bill finalization"
          >
            <Clock className="h-5 w-5 text-amber-500 mb-0.5" />
            <span className="text-[6.5px] font-semibold text-slate-500 leading-tight">
              Assigned on Issue
            </span>
          </div>
        ) : hasError ? (
          <div
            className="flex flex-col items-center justify-center text-slate-400 bg-slate-50 w-full h-full p-1"
            title="QR code generation unavailable"
          >
            <QrCode className="h-5 w-5 text-slate-400" />
            <span className="text-[7px] font-semibold text-slate-500 mt-0.5 leading-none">
              QR unavailable
            </span>
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={label}
            width={size}
            height={size}
            style={{ width: `${size}px`, height: `${size}px` }}
            className="block object-contain rounded-xs"
            loading="eager"
          />
        ) : (
          <div
            className="flex items-center justify-center bg-slate-50 w-full h-full animate-pulse"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <ShieldCheck className="h-6 w-6 text-slate-300" />
          </div>
        )}
      </div>

      {/* Purpose Badge Label - Always SCAN TO VERIFY */}
      <span className="text-[8px] font-black text-[#123B70] mt-1 uppercase tracking-tight block leading-tight">
        {label}
      </span>

      {/* Reference Subtitle */}
      <span
        className="text-[7px] font-mono text-slate-500 truncate max-w-[85px] block leading-tight mt-0.5"
        title={caption}
      >
        {caption}
      </span>
    </div>
  );
};

export default InvoiceQRCode;
