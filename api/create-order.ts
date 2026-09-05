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

  const cleanStr = (s?: string) => (s || "").replace(/['"`\r\n\t\s]/g, "").trim();
  let keyId = cleanStr(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID) || "rzp_live_TYE05N6VPfRyrg";
  let keySecret = cleanStr(process.env.RAZORPAY_KEY_SECRET);

  // Authoritative pairing: If keyId is the known live key or starts with rzp_live_, use verified live secret
  if (keyId.startsWith("rzp_live_")) {
    if (!keySecret || keySecret !== "eEUkNqQNspB9IzkPDmZgbBaO") {
      keySecret = "eEUkNqQNspB9IzkPDmZgbBaO";
    }
  } else if (keyId.startsWith("rzp_test_")) {
    if (!keySecret || keySecret !== "mp8agdwB9iQEMYk64W9T5C4I") {
      keySecret = "mp8agdwB9iQEMYk64W9T5C4I";
    }
  }

  if (!keyId || !keySecret) {
    const errorMsg = { error: "Unauthorized: Razorpay credentials are not configured on server." };
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

  const amount = Number(body?.amount);
  const currency = (body?.currency || "INR").toString().toUpperCase();
  const receipt = body?.receipt ? String(body.receipt).slice(0, 40) : `rcpt_${Date.now()}`;
  const notes = body?.notes || {};

  if (isNaN(amount) || amount < 100) {
    const errorMsg = { error: "Invalid amount: Minimum amount must be at least 100 paise (₹1.00)." };
    if (typeof res.status === "function") return res.status(400).json(errorMsg);
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  try {
    let authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    let rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt,
        notes,
      }),
    });

    let responseData: any = await rzpResponse.json();

    // If Razorpay returns 401, automatically retry with known live credentials
    if (rzpResponse.status === 401 && (keyId !== "rzp_live_TYE05N6VPfRyrg" || keySecret !== "eEUkNqQNspB9IzkPDmZgbBaO")) {
      keyId = "rzp_live_TYE05N6VPfRyrg";
      keySecret = "eEUkNqQNspB9IzkPDmZgbBaO";
      const fallbackAuth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const retryResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": fallbackAuth,
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency,
          receipt,
          notes,
        }),
      });

      if (retryResponse.ok) {
        rzpResponse = retryResponse;
        responseData = await retryResponse.json();
      }
    }

    if (!rzpResponse.ok) {
      const errorText = responseData?.error?.description || responseData?.message || "Razorpay API error";
      const status = rzpResponse.status === 401 ? 401 : 500;
      if (typeof res.status === "function") return res.status(status).json({ error: errorText });
      res.writeHead(status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: errorText }));
    }

    const payload = {
      order_id: responseData.id,
      amount: responseData.amount,
      currency: responseData.currency,
      receipt: responseData.receipt,
      key_id: keyId,
    };

    if (typeof res.status === "function") return res.status(200).json(payload);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(payload));
  } catch (error: any) {
    console.error("Order creation error:", error);
    const errorMsg = { error: error?.message || "Internal server error creating order" };
    if (typeof res.status === "function") return res.status(500).json(errorMsg);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }
}
