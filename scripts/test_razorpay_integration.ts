import { handleCreateOrder, handleVerifyPayment, getRazorpayCredentials } from "../api/_razorpayServer.ts";
import crypto from "crypto";

// Mock helper to simulate HTTP request and response objects
function createMockReqRes({
  method = "POST",
  body = {},
  headers = {},
}: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}) {
  const req = {
    method,
    headers,
    body,
  };

  let statusCode = 200;
  let responseHeaders: Record<string, string> = {};
  let responseData: any = null;

  const res = {
    setHeader(name: string, value: string) {
      responseHeaders[name] = value;
      return res;
    },
    writeHead(code: number, headers?: Record<string, string>) {
      statusCode = code;
      if (headers) {
        responseHeaders = { ...responseHeaders, ...headers };
      }
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    end(data?: string) {
      if (data && !responseData) {
        try {
          responseData = JSON.parse(data);
        } catch {
          responseData = data;
        }
      }
      return res;
    },
    getStatus: () => statusCode,
    getData: () => responseData,
    getHeaders: () => responseHeaders,
  };

  return { req, res };
}

async function runTests() {
  console.log("==========================================");
  console.log("   RAZORPAY INTEGRATION VERIFICATION TEST ");
  console.log("==========================================\n");

  const { keyId, keySecret } = getRazorpayCredentials();
  console.log("✓ Loaded credentials from environment:");
  console.log(`  KEY_ID: ${keyId}`);
  console.log(`  KEY_SECRET: ${keySecret ? "********" + keySecret.slice(-4) : "MISSING"}\n`);

  if (!keyId || !keySecret) {
    throw new Error("Credentials missing from .env!");
  }

  // TEST 1: Reject order with amount < 100 paise
  console.log("Test 1: Validating minimum amount check (< 100 paise)...");
  {
    const { req, res } = createMockReqRes({
      method: "POST",
      body: { amount: 50, currency: "INR" },
    });
    await handleCreateOrder(req, res);
    const status = res.getStatus();
    const data = res.getData();
    if (status === 400 && data.error?.includes("100 paise")) {
      console.log(`  ✓ PASSED: Correctly returned 400 for amount < 100 paise (${JSON.stringify(data.error)})\n`);
    } else {
      throw new Error(`Test 1 failed: status=${status}, data=${JSON.stringify(data)}`);
    }
  }

  // TEST 2: Create order with valid amount (₹50 = 5000 paise) via Razorpay API
  console.log("Test 2: Creating valid order via POST /api/create-order...");
  let createdOrderId = "";
  {
    const { req, res } = createMockReqRes({
      method: "POST",
      body: {
        amount: 5000, // 5000 paise = ₹50
        currency: "INR",
        receipt: `test_receipt_${Date.now()}`,
      },
    });
    await handleCreateOrder(req, res);
    const status = res.getStatus();
    const data = res.getData();

    if (status === 200 && data.order_id && data.order_id.startsWith("order_") && data.amount === 5000) {
      createdOrderId = data.order_id;
      console.log(`  ✓ PASSED: Order created successfully!`);
      console.log(`    Order ID: ${data.order_id}`);
      console.log(`    Amount: ${data.amount} paise`);
      console.log(`    Currency: ${data.currency}\n`);
    } else {
      throw new Error(`Test 2 failed: status=${status}, data=${JSON.stringify(data)}`);
    }
  }

  // TEST 3: Verify payment signature - missing fields check
  console.log("Test 3: Signature verification with missing fields...");
  {
    const { req, res } = createMockReqRes({
      method: "POST",
      body: { razorpay_order_id: createdOrderId }, // missing payment_id and signature
    });
    await handleVerifyPayment(req, res);
    const status = res.getStatus();
    const data = res.getData();
    if (status === 400 && data.error?.includes("Missing required fields")) {
      console.log(`  ✓ PASSED: Correctly rejected missing fields with 400\n`);
    } else {
      throw new Error(`Test 3 failed: status=${status}, data=${JSON.stringify(data)}`);
    }
  }

  // TEST 4: Verify payment signature - invalid/tampered signature check
  console.log("Test 4: Signature verification with tampered signature...");
  {
    const fakePaymentId = "pay_TEST_FAKE_123456";
    const fakeSignature = "invalid_tampered_signature_hex_1234567890abcdef1234567890abcdef12345678";
    const { req, res } = createMockReqRes({
      method: "POST",
      body: {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: fakeSignature,
      },
    });
    await handleVerifyPayment(req, res);
    const status = res.getStatus();
    const data = res.getData();
    if (status === 400 && data.success === false && data.error?.includes("Invalid signature")) {
      console.log(`  ✓ PASSED: Correctly rejected invalid signature with 400 and success: false\n`);
    } else {
      throw new Error(`Test 4 failed: status=${status}, data=${JSON.stringify(data)}`);
    }
  }

  // TEST 5: Verify payment signature - authentic HMAC-SHA256 signature
  console.log("Test 5: Signature verification with authentic HMAC-SHA256 signature...");
  {
    const testPaymentId = "pay_TEST_REAL_987654";
    const authenticSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${createdOrderId}|${testPaymentId}`)
      .digest("hex");

    const { req, res } = createMockReqRes({
      method: "POST",
      body: {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: authenticSignature,
      },
    });
    await handleVerifyPayment(req, res);
    const status = res.getStatus();
    const data = res.getData();
    if (status === 200 && data.success === true) {
      console.log(`  ✓ PASSED: Authentic signature successfully verified!`);
      console.log(`    Status: ${status}`);
      console.log(`    Message: ${data.message}`);
      console.log(`    Order ID: ${data.order_id}`);
      console.log(`    Payment ID: ${data.payment_id}\n`);
    } else {
      throw new Error(`Test 5 failed: status=${status}, data=${JSON.stringify(data)}`);
    }
  }

  console.log("==========================================");
  console.log(" ALL 5 RAZORPAY INTEGRATION TESTS PASSED! ");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("\n❌ Test suite failed:", err);
  process.exit(1);
});
