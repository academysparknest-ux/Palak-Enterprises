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
  return envKey || "rzp_live_TYE05N6VPfRyrg";
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

  // STEP 1: Call Backend to Create Order
  let orderData: { order_id: string; amount: number; currency: string };
  try {
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: options.currency || "INR",
        receipt: options.orderCode || `rcpt_${Date.now()}`,
        notes: {
          order_code: options.orderCode || "",
        },
      }),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to create payment order (Status ${orderRes.status})`);
    }

    orderData = await orderRes.json();
  } catch (err: any) {
    if (options.onError) {
      options.onError(err);
    }
    throw err;
  }

  // STEP 2: Configure Razorpay modal with order_id
  const rzpOptions = {
    key: key,
    order_id: orderData.order_id,
    amount: orderData.amount || amountInPaise,
    currency: orderData.currency || "INR",
    name: options.name || "Palak Enterprises",
    description: options.description || `Payment #${options.orderCode || ""}`.trim(),
    image: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/printer.svg",
    handler: async function (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) {
      try {
        // STEP 3: Verify payment signature on backend
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verifyData.success) {
          const verifyMsg = verifyData.error || verifyData.message || "Payment verification failed. Invalid signature.";
          throw new Error(verifyMsg);
        }

        // Only fire success callback if signature was verified successfully
        options.onSuccess(response.razorpay_payment_id, {
          ...response,
          verification: verifyData,
        });
      } catch (verifyErr: any) {
        console.error("Razorpay signature verification error:", verifyErr);
        if (options.onError) {
          options.onError(verifyErr);
        }
      }
    },
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    notes: {
      order_code: options.orderCode || "",
      razorpay_order_id: orderData.order_id,
    },
    theme: {
      color: "#123B70",
      hide_topbar: false,
    },
    config: {
      display: {
        blocks: {
          upi: {
            name: "Pay via UPI / QR",
            instruments: [
              {
                method: "upi",
              },
            ],
          },
          other: {
            name: "Other Payment Modes",
            instruments: [
              {
                method: "card",
              },
              {
                method: "netbanking",
              },
              {
                method: "wallet",
              },
            ],
          },
        },
        sequence: ["block.upi", "block.other"],
        preferences: {
          show_default_blocks: true,
        },
      },
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
      console.error("Razorpay payment failed event:", resp.error);
      if (options.onError) {
        options.onError(resp.error || new Error("Payment transaction failed."));
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
