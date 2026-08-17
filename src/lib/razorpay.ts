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

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const getRazorpayKey = (): string => {
  return import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TQq5XDAdzNen1K";
};

export const initiateRazorpayPayment = async (options: RazorpayOptions): Promise<boolean> => {
  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
  }

  const key = getRazorpayKey();
  if (!key) {
    throw new Error("Razorpay Key ID is not configured.");
  }

  const amountInPaise = Math.round(options.amount * 100);

  const rzpOptions = {
    key: key,
    amount: amountInPaise,
    currency: options.currency || "INR",
    name: options.name || "Palak Enterprises",
    description: options.description || `Order Payment #${options.orderCode || ""}`.trim(),
    image: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/printer.svg",
    handler: function (response: any) {
      if (response && response.razorpay_payment_id) {
        options.onSuccess(response.razorpay_payment_id, response);
      } else {
        options.onSuccess("pay_simulated", response);
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

  const razorpayInstance = new (window as any).Razorpay(rzpOptions);
  razorpayInstance.on("payment.failed", function (resp: any) {
    if (options.onError) {
      options.onError(resp.error);
    }
  });

  razorpayInstance.open();
  return true;
};
