import React, { useState } from "react";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { initiateRazorpayPayment } from "../lib/razorpay";

export interface RazorpayCheckoutButtonProps {
  amount: number; // in Rupees
  orderCode?: string;
  buttonText?: string;
  name?: string;
  description?: string;
  className?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess?: (paymentId: string, response: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  orderCode,
  buttonText = "Pay with Razorpay",
  name = "Palak Enterprises",
  description,
  className = "",
  prefill,
  onSuccess,
  onError,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    if (loading || disabled) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      await initiateRazorpayPayment({
        amount,
        orderCode,
        name,
        description: description || `Payment for ₹${amount.toFixed(2)}`,
        prefill,
        onSuccess: (paymentId, response) => {
          setLoading(false);
          if (onSuccess) {
            onSuccess(paymentId, response);
          }
        },
        onDismiss: () => {
          setLoading(false);
        },
        onError: (err) => {
          setLoading(false);
          const msg = err?.message || err?.description || "Payment was cancelled or failed.";
          setErrorMessage(msg);
          if (onError) {
            onError(err);
          }
        },
      });
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || "Failed to initialize payment gateway.";
      setErrorMessage(msg);
      if (onError) {
        onError(err);
      }
    }
  };

  return (
    <div className="inline-flex flex-col gap-1.5 w-full sm:w-auto">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] px-6 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <CreditCard className="h-4 w-4 text-white" />
        )}
        <span>{loading ? "Opening Payment Modal..." : `${buttonText} (₹${amount.toFixed(2)})`}</span>
      </button>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] font-medium text-rose-700 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default RazorpayCheckoutButton;
