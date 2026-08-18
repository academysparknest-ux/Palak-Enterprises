export interface RazorpayOptions {
  amount: number; // in Rupees (will be converted to paise)
  currency?: string;
  name?: string;
  description?: string;
  orderCode?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (paymentId: string, response: any) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    if (typeof document === "undefined") {
      resolve(false);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

export const getRazorpayKey = (): string => {
  const envKey = (import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();
  return envKey || "rzp_test_TQq5XDAdzNen1K";
};

export const initiateRazorpayPayment = async (options: RazorpayOptions): Promise<boolean> => {
  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    throw new Error("Razorpay payment gateway failed to load. Please check your internet connection or try again.");
  }

  const key = getRazorpayKey();
  if (!key) {
    throw new Error("Razorpay Key ID is not configured.");
  }

  // Razorpay minimum transaction amount is 100 paise (₹1.00)
  const amountInPaise = Math.max(100, Math.round(Number(options.amount || 0) * 100));

  const rzpOptions = {
    key: key,
    amount: amountInPaise,
    currency: options.currency || "INR",
    name: options.name || "Palak Enterprises",
    description: options.description || `Payment #${options.orderCode || ""}`.trim(),
    image: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/printer.svg",
    handler: function (response: any) {
      if (response && response.razorpay_payment_id) {
        options.onSuccess(response.razorpay_payment_id, response);
      } else {
        options.onSuccess(`pay_test_${Date.now()}`, response);
      }
    },
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    notes: {
      order_code: options.orderCode || "",
    },
    theme: {
      color: "#123B70",
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
  };

  try {
    const razorpayInstance = new (window as any).Razorpay(rzpOptions);
    razorpayInstance.on("payment.failed", function (resp: any) {
      if (options.onError) {
        options.onError(resp.error);
      }
    });

    razorpayInstance.open();
    return true;
  } catch (err: any) {
    if (options.onError) {
      options.onError(err);
    }
    throw err;
  }
};

