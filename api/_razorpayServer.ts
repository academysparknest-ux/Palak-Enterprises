import Razorpay from "razorpay";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Helper to ensure .env is loaded if process.env values are not already populated
function loadEnvIfNeeded() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        for (const line of envContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Ignore env load failure if not accessible
    }
  }
}

export function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  loadEnvIfNeeded();
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  return { keyId, keySecret };
}

export function getRazorpayInstance(): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function parseJsonBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}

export function sendJson(res: any, statusCode: number, data: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }

  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function handleCreateOrder(req: any, res: any) {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") {
      return res.status(204).end();
    }
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed. Use POST." });
  }

  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) {
    return sendJson(res, 401, {
      error: "Unauthorized: Razorpay credentials are missing or unconfigured.",
    });
  }

  const body = await parseJsonBody(req);
  const amount = Number(body.amount);
  const currency = (body.currency || "INR").toString().toUpperCase();
  const receipt = body.receipt ? String(body.receipt).slice(0, 40) : `rcpt_${Date.now()}`;
  const notes = body.notes || {};

  // Minimum amount validation: 100 paise (₹1.00)
  if (isNaN(amount) || amount < 100) {
    return sendJson(res, 400, {
      error: "Invalid amount: Minimum amount must be at least 100 paise (₹1.00).",
    });
  }

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
    });

    return sendJson(res, 200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    const statusCode = error?.statusCode || 500;
    const errorMessage = error?.error?.description || error?.message || "Failed to create Razorpay order.";
    return sendJson(res, statusCode, { error: errorMessage });
  }
}

export async function handleVerifyPayment(req: any, res: any) {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") {
      return res.status(204).end();
    }
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed. Use POST." });
  }

  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) {
    return sendJson(res, 401, {
      error: "Unauthorized: RAZORPAY_KEY_SECRET is not configured.",
    });
  }

  const body = await parseJsonBody(req);
  const orderId = (body.razorpay_order_id || body.order_id || "").toString().trim();
  const paymentId = (body.razorpay_payment_id || body.payment_id || "").toString().trim();
  const signature = (body.razorpay_signature || body.signature || "").toString().trim();

  // Validate missing fields
  if (!orderId || !paymentId || !signature) {
    return sendJson(res, 400, {
      success: false,
      error: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
    });
  }

  try {
    // Verification algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const receivedBuffer = Buffer.from(signature, "utf-8");

    const isMatch =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isMatch) {
      return sendJson(res, 400, {
        success: false,
        error: "Invalid signature: Payment verification failed.",
      });
    }

    return sendJson(res, 200, {
      success: true,
      message: "Payment verified successfully.",
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (error: any) {
    console.error("Razorpay signature verification error:", error);
    return sendJson(res, 500, {
      success: false,
      error: error?.message || "Internal server error during signature verification.",
    });
  }
}
