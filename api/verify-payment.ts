import crypto from "node:crypto";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST") {
    const errorMsg = { error: "Method Not Allowed. Use POST." };
    if (typeof res.status === "function") return res.status(405).json(errorMsg);
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keySecret) {
    const errorMsg = { error: "Unauthorized: RAZORPAY_KEY_SECRET is not configured on server." };
    if (typeof res.status === "function") return res.status(401).json(errorMsg);
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  // Parse body safely
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk: any) => { data += chunk; });
      req.on("end", () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
      });
      req.on("error", () => resolve({}));
    });
  }

  const orderId = (body?.razorpay_order_id || body?.order_id || "").toString().trim();
  const paymentId = (body?.razorpay_payment_id || body?.payment_id || "").toString().trim();
  const signature = (body?.razorpay_signature || body?.signature || "").toString().trim();

  if (!orderId || !paymentId || !signature) {
    const errorMsg = {
      success: false,
      error: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
    };
    if (typeof res.status === "function") return res.status(400).json(errorMsg);
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  try {
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
      const errorMsg = {
        success: false,
        error: "Invalid signature: Payment verification failed.",
      };
      if (typeof res.status === "function") return res.status(400).json(errorMsg);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(errorMsg));
    }

    const payload = {
      success: true,
      message: "Payment verified successfully.",
      order_id: orderId,
      payment_id: paymentId,
    };
    if (typeof res.status === "function") return res.status(200).json(payload);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(payload));
  } catch (error: any) {
    console.error("Verification error:", error);
    const errorMsg = {
      success: false,
      error: error?.message || "Internal server error during verification",
    };
    if (typeof res.status === "function") return res.status(500).json(errorMsg);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }
}
